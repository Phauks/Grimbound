/**
 * FontStyleColumn Component
 *
 * Column 2 of FontDrawer: Style settings including render style toggle,
 * fill/stroke colors, stroke width, letter spacing, shadow, and font size.
 *
 * @module components/Shared/Selectors/FontSettings/FontStyleColumn
 */

import { EditableSlider } from '@/components/Shared/Controls/EditableSlider';
import { ColorPreviewSelector } from '@/components/Shared/Selectors/ColorPreviewSelector';
import styles from '@/styles/components/shared/FontDrawer.module.css';
import type { TextRenderStyle } from '@/ts/types/index.js';
import type { FontSettings } from '../FontSettingsSelector';

// ============================================================================
// Constants
// ============================================================================

const RENDER_STYLE_OPTIONS: { value: TextRenderStyle; label: string }[] = [
  { value: 'filled', label: 'Filled' },
  { value: 'outlined', label: 'Outlined' },
  { value: 'both', label: 'Both' },
];

// ============================================================================
// Types
// ============================================================================

export interface FontStyleColumnProps {
  /** Current font settings */
  settings: FontSettings;
  /** Update settings partially */
  onUpdate: (updates: Partial<FontSettings>) => void;
  /** Default values for sliders */
  defaults: {
    letterSpacing: number;
    shadowBlur: number;
  };
}

// ============================================================================
// Component
// ============================================================================

export function FontStyleColumn({ settings, onUpdate, defaults }: FontStyleColumnProps) {
  const renderStyle = settings.renderStyle ?? 'filled';
  const isFillDisabled = renderStyle === 'outlined';
  const isStrokeDisabled = renderStyle === 'filled';

  return (
    <div className={`${styles.column} ${styles.styleColumn}`}>
      <div className={styles.sectionHeader}>Style</div>

      {/* Text Render Style Toggle */}
      <div
        className={styles.textStyleSection}
        style={{ marginTop: 0, borderTop: 'none', paddingTop: 0 }}
      >
        <div className={styles.textStyleButtons}>
          {RENDER_STYLE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`${styles.textStyleButton} ${renderStyle === option.value ? styles.textStyleButtonActive : ''}`}
              onClick={() => onUpdate({ renderStyle: option.value })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fill and Stroke color pickers */}
      <div className={styles.colorPickersRow}>
        {/* Fill Color */}
        <div
          className={`${styles.colorPickerItem} ${isFillDisabled ? styles.colorPickerDisabled : ''}`}
        >
          <ColorPreviewSelector
            label="Fill"
            value={settings.color}
            onChange={(color) => onUpdate({ color })}
            onPreviewChange={(color) => onUpdate({ color })}
            disabled={isFillDisabled}
            size="small"
          />
        </div>

        {/* Stroke Color */}
        <div
          className={`${styles.colorPickerItem} ${isStrokeDisabled ? styles.colorPickerDisabled : ''}`}
        >
          <ColorPreviewSelector
            label="Stroke"
            value={settings.strokeColor ?? '#000000'}
            onChange={(color) => onUpdate({ strokeColor: color })}
            onPreviewChange={(color) => onUpdate({ strokeColor: color })}
            disabled={isStrokeDisabled}
            size="small"
          />
        </div>
      </div>

      {/* Stroke Width - only shown when stroke is enabled */}
      {(renderStyle === 'outlined' || renderStyle === 'both') && (
        <div className={styles.sliderSection}>
          <EditableSlider
            label="Stroke Width"
            value={settings.strokeWidth ?? 2}
            onChange={(v) => onUpdate({ strokeWidth: v })}
            min={1}
            max={10}
            suffix="px"
            defaultValue={2}
          />
        </div>
      )}

      {/* Separator between color settings and other settings */}
      <div className={styles.settingsSeparator} />

      {/* Letter Spacing Slider */}
      <div className={styles.sliderSection}>
        <EditableSlider
          label="Spacing"
          value={settings.letterSpacing}
          onChange={(v) => onUpdate({ letterSpacing: v })}
          min={0}
          max={20}
          suffix="px"
          defaultValue={defaults.letterSpacing}
        />
      </div>

      {/* Shadow Slider */}
      <div className={styles.sliderSection}>
        <EditableSlider
          label="Shadow"
          value={settings.shadowBlur}
          onChange={(v) => onUpdate({ shadowBlur: v })}
          min={0}
          max={20}
          suffix="px"
          defaultValue={defaults.shadowBlur}
        />
      </div>

      {/* Font Size Slider */}
      <div className={styles.sliderSection}>
        <EditableSlider
          label="Size"
          value={settings.fontSize ?? 0}
          onChange={(v) => onUpdate({ fontSize: v })}
          min={0}
          max={72}
          suffix="pt"
          defaultValue={0}
        />
        <span className={styles.sliderHint}>0 = Auto (ratio-based)</span>
      </div>
    </div>
  );
}
