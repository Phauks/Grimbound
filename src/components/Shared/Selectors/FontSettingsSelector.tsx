/**
 * FontSettingsSelector Component
 *
 * A comprehensive typography control that combines font family, color,
 * letter spacing, and text shadow into a unified, easy-to-use component.
 *
 * Features:
 * - Live preview with all settings applied (font, color, spacing, shadow)
 * - Two-panel expandable design (fonts left, settings right)
 * - Portal-based panel to avoid overflow clipping
 * - Smart upward/downward opening based on viewport space
 * - Reusable configuration via FontSettings object
 *
 * Uses SettingsSelectorBase for consistent styling and useExpandablePanel
 * for panel management.
 *
 * @module components/Shared/FontSettingsSelector
 */

import { memo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useExpandablePanel } from '@/hooks/useExpandablePanel';
import styles from '@/styles/components/shared/FontSettingsSelector.module.css';
import baseStyles from '@/styles/components/shared/SettingsSelectorBase.module.css';
import panelStyles from '@/styles/components/shared/SimplePanelSelector.module.css';
import { EditableSlider } from '@/components/Shared/Controls/EditableSlider';
import { InfoSection, PreviewBox, SettingsSelectorBase } from './SettingsSelectorBase';

// ============================================================================
// Types
// ============================================================================

export interface FontOption {
  /** Font family value (as used in CSS/canvas) */
  value: string;
  /** Display label for the font */
  label: string;
  /** Category for grouping (e.g., 'Display', 'Sans Serif') */
  category?: string;
}

export interface FontSettings {
  /** Font family name */
  fontFamily: string;
  /** Font color in hex format */
  color: string;
  /** Letter spacing in pixels */
  letterSpacing: number;
  /** Text shadow blur radius in pixels */
  shadowBlur: number;
}

export interface FontSettingsSelectorProps {
  /** Current font settings */
  value: FontSettings;
  /** Called when settings are confirmed (on Apply or panel close) */
  onChange: (settings: FontSettings) => void;
  /** Called on every change for live preview (optional) */
  onPreviewChange?: (settings: FontSettings) => void;
  /** Available font options */
  fontOptions: FontOption[];
  /** Preview text to display */
  previewText?: string;
  /** Display title for the selector (e.g., "Character Name", "Ability Text") */
  title?: string;
  /** Component size variant */
  size?: 'small' | 'medium' | 'large';
  /** Disabled state */
  disabled?: boolean;
  /** Visual disabled state (grayed out but not truly disabled) */
  visuallyDisabled?: boolean;
  /** Aria label for accessibility */
  ariaLabel?: string;
  /** Default values for reset */
  defaults?: Partial<FontSettings>;
  /** Slot for header content (e.g., toggle buttons) - rendered between info and button */
  headerSlot?: React.ReactNode;
}

// ============================================================================
// Color Presets for Text
// ============================================================================

const TEXT_COLOR_PRESETS = [
  { value: '#FFFFFF', name: 'White' },
  { value: '#F5F5F5', name: 'Off White' },
  { value: '#E0E0E0', name: 'Light Gray' },
  { value: '#000000', name: 'Black' },
  { value: '#1A1A1A', name: 'Charcoal' },
  { value: '#C9A227', name: 'Gold' },
  { value: '#8B0000', name: 'Blood Red' },
  { value: '#E74C3C', name: 'Red' },
  { value: '#3498DB', name: 'Blue' },
  { value: '#27AE60', name: 'Green' },
];

// ============================================================================
// Utility Functions
// ============================================================================

function isLightColor(hex: string): boolean {
  const color = hex.replace('#', '');
  const r = parseInt(color.slice(0, 2), 16);
  const g = parseInt(color.slice(2, 4), 16);
  const b = parseInt(color.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

// ============================================================================
// Preview Component
// ============================================================================

const FontPreview = memo(function FontPreview({
  settings,
  isLightText,
}: {
  settings: FontSettings;
  isLightText: boolean;
}) {
  const previewStyle: React.CSSProperties = {
    fontFamily: settings.fontFamily,
    color: settings.color,
    letterSpacing: `${settings.letterSpacing}px`,
    textShadow:
      settings.shadowBlur > 0
        ? `0 0 ${settings.shadowBlur}px rgba(0,0,0,0.8), 0 1px ${Math.ceil(settings.shadowBlur / 2)}px rgba(0,0,0,0.6)`
        : 'none',
  };

  return (
    <div className={styles.previewContainer}>
      <div className={styles.previewText} style={previewStyle}>
        Aa
      </div>
      {/* Color indicator dot */}
      <div
        className={`${styles.colorDot} ${isLightText ? styles.colorDotLight : ''}`}
        style={{ backgroundColor: settings.color }}
      />
    </div>
  );
});

// ============================================================================
// Component
// ============================================================================

export const FontSettingsSelector = memo(function FontSettingsSelector({
  value,
  onChange,
  onPreviewChange,
  fontOptions,
  previewText: _previewText = 'Sample Text',
  title,
  size = 'medium',
  disabled = false,
  visuallyDisabled = false,
  ariaLabel,
  defaults = { letterSpacing: 0, shadowBlur: 4 },
  headerSlot,
}: FontSettingsSelectorProps) {
  const colorInputRef = useRef<HTMLInputElement>(null);

  // Default settings for reset
  const defaultSettings: FontSettings = {
    fontFamily: fontOptions[0]?.value || value.fontFamily,
    color: '#FFFFFF',
    letterSpacing: defaults.letterSpacing ?? 0,
    shadowBlur: defaults.shadowBlur ?? 4,
  };

  // Use the shared expandable panel hook
  const panel = useExpandablePanel<FontSettings>({
    value,
    onChange,
    onPreviewChange,
    disabled: disabled || visuallyDisabled,
    panelHeight: 240,
    minPanelWidth: 380,
  });

  const displaySettings = panel.isExpanded ? panel.pendingValue : value;
  const isLightText = isLightColor(displaySettings.color);

  // Get current font option for display
  const currentFontOption =
    fontOptions.find((f) => f.value === displaySettings.fontFamily) || fontOptions[0];

  // Render the expandable panel via portal
  const renderPanel = () => {
    if (!(panel.isExpanded && panel.panelPosition)) return null;

    const panelStyle: React.CSSProperties = {
      position: 'fixed',
      top: panel.panelPosition.openUpward ? 'auto' : panel.panelPosition.top,
      bottom: panel.panelPosition.openUpward
        ? window.innerHeight - panel.panelPosition.top
        : 'auto',
      left: panel.panelPosition.left,
      width: panel.panelPosition.width,
      zIndex: 10000,
    };

    return createPortal(
      <div
        ref={panel.panelRef}
        className={`${baseStyles.panel} ${panel.panelPosition.openUpward ? baseStyles.panelUpward : ''}`}
        style={panelStyle}
      >
        <div className={styles.twoPanelLayout}>
          {/* Left Panel: Font Family */}
          <div className={styles.leftPanel}>
            <div className={panelStyles.panelTitle}>Font</div>
            <div className={styles.fontList}>
              {fontOptions.map((font) => {
                const isSelected = font.value === panel.pendingValue.fontFamily;
                return (
                  <button
                    key={font.value}
                    type="button"
                    className={`${styles.fontOption} ${isSelected ? styles.fontOptionSelected : ''}`}
                    onClick={() => panel.updatePendingField('fontFamily', font.value)}
                    style={{ fontFamily: font.value }}
                  >
                    <span className={styles.fontOptionPreview}>Aa</span>
                    <span className={styles.fontOptionName}>{font.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Style Settings */}
          <div className={styles.rightPanel}>
            <div className={panelStyles.panelTitle}>Style</div>

            {/* Color Section */}
            <div className={styles.settingGroup}>
              <div className={styles.colorRow}>
                <div className={styles.colorSwatches}>
                  {TEXT_COLOR_PRESETS.slice(0, 5).map((preset) => {
                    const isSelected =
                      preset.value.toUpperCase() === panel.pendingValue.color.toUpperCase();
                    const presetIsLight = isLightColor(preset.value);
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        className={`${styles.colorSwatch} ${isSelected ? styles.colorSwatchSelected : ''} ${presetIsLight ? styles.colorSwatchLight : ''}`}
                        style={{ backgroundColor: preset.value }}
                        onClick={() => panel.updatePendingField('color', preset.value)}
                        title={preset.name}
                      >
                        {isSelected && <span className={styles.colorCheck}>✓</span>}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className={styles.customColorButton}
                  onClick={() => colorInputRef.current?.click()}
                  title="Custom color"
                >
                  🎨
                </button>
                <input
                  ref={colorInputRef}
                  type="color"
                  value={panel.pendingValue.color}
                  onChange={(e) => panel.updatePendingField('color', e.target.value)}
                  className={styles.hiddenColorInput}
                />
              </div>
              <div className={styles.colorSwatches}>
                {TEXT_COLOR_PRESETS.slice(5).map((preset) => {
                  const isSelected =
                    preset.value.toUpperCase() === panel.pendingValue.color.toUpperCase();
                  const presetIsLight = isLightColor(preset.value);
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      className={`${styles.colorSwatch} ${isSelected ? styles.colorSwatchSelected : ''} ${presetIsLight ? styles.colorSwatchLight : ''}`}
                      style={{ backgroundColor: preset.value }}
                      onClick={() => panel.updatePendingField('color', preset.value)}
                      title={preset.name}
                    >
                      {isSelected && <span className={styles.colorCheck}>✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Letter Spacing Slider */}
            <div className={styles.sliderGroup}>
              <EditableSlider
                label="Spacing"
                value={panel.pendingValue.letterSpacing}
                onChange={(v) => panel.updatePendingField('letterSpacing', v)}
                min={0}
                max={20}
                suffix="px"
                defaultValue={defaults.letterSpacing ?? 0}
              />
            </div>

            {/* Shadow Slider */}
            <div className={styles.sliderGroup}>
              <EditableSlider
                label="Shadow"
                value={panel.pendingValue.shadowBlur}
                onChange={(v) => panel.updatePendingField('shadowBlur', v)}
                min={0}
                max={20}
                suffix="px"
                defaultValue={defaults.shadowBlur ?? 4}
              />
            </div>
          </div>
        </div>

        {/* Panel Footer */}
        <div className={baseStyles.panelFooter}>
          <button
            type="button"
            className={baseStyles.resetLink}
            onClick={() => panel.reset(defaultSettings)}
          >
            Reset
          </button>
          <div className={baseStyles.panelActions}>
            <button type="button" className={baseStyles.cancelButton} onClick={panel.cancel}>
              Cancel
            </button>
            <button type="button" className={baseStyles.confirmButton} onClick={panel.apply}>
              Apply
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // Display label: use title if provided, otherwise fall back to font name
  const displayLabel = title || currentFontOption?.label || 'Select font';

  return (
    <SettingsSelectorBase
      ref={panel.containerRef}
      preview={
        <PreviewBox shape="square" size={size} className={styles.previewBox}>
          <FontPreview settings={displaySettings} isLightText={isLightText} />
        </PreviewBox>
      }
      info={<InfoSection label={displayLabel} />}
      headerSlot={headerSlot}
      actionLabel="Customize"
      onAction={panel.toggle}
      isExpanded={panel.isExpanded}
      disabled={disabled}
      visuallyDisabled={visuallyDisabled}
      size={size}
      ariaLabel={ariaLabel ?? title ?? 'Font settings'}
      onKeyDown={panel.handleKeyDown}
    >
      {renderPanel()}
    </SettingsSelectorBase>
  );
});

export default FontSettingsSelector;
