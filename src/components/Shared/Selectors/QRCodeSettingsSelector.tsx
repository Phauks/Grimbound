/**
 * QRCodeSettingsSelector Component
 *
 * A comprehensive three-panel settings selector for QR code tokens.
 * Left panel: Token options (Almanac, labels, logo)
 * Middle panel: QR styling (dots, corner squares, corner dots)
 * Right panel: Background and image options
 *
 * All styling sections use the same ColorSection component for consistency
 * and maintainability.
 *
 * @module components/Shared/QRCodeSettingsSelector
 */

import { memo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useExpandablePanel } from '../../../hooks/useExpandablePanel';
import optionStyles from '../../../styles/components/options/OptionsPanel.module.css';
import styles from '../../../styles/components/shared/QRCodeSettingsSelector.module.css';
import baseStyles from '../../../styles/components/shared/SettingsSelectorBase.module.css';
import { QR_COLORS } from '../../../ts/constants.js';
import type {
  GenerationOptions,
  QRCodeOptions,
  QRCornerDotType,
  QRCornerSquareType,
  QRDotType,
  QRGradientType,
} from '../../../ts/types/index';
import { EditableSlider } from '../Controls/EditableSlider';
import { EditableSliderValue } from '../Controls/EditableSliderValue';
import { InfoSection, PreviewBox, SettingsSelectorBase } from './SettingsSelectorBase';

// ============================================================================
// Types
// ============================================================================

export interface QRCodeSettingsSelectorProps {
  generationOptions: GenerationOptions;
  onOptionChange: (options: Partial<GenerationOptions>) => void;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  ariaLabel?: string;
}

// Full pending settings structure
interface PendingQRSettings {
  // Token options
  almanac: boolean;
  showAlmanacLabel: boolean;
  showLogo: boolean;
  showAuthor: boolean;
  // Dots
  dotType: QRDotType;
  dotsUseGradient: boolean;
  dotsGradientType: QRGradientType;
  dotsGradientRotation: number;
  dotsColorStart: string;
  dotsColorEnd: string;
  // Corner squares
  cornerSquareType: QRCornerSquareType;
  cornerSquareUseGradient: boolean;
  cornerSquareGradientType: QRGradientType;
  cornerSquareGradientRotation: number;
  cornerSquareColorStart: string;
  cornerSquareColorEnd: string;
  // Corner dots
  cornerDotType: QRCornerDotType;
  cornerDotUseGradient: boolean;
  cornerDotGradientType: QRGradientType;
  cornerDotGradientRotation: number;
  cornerDotColorStart: string;
  cornerDotColorEnd: string;
  // Background
  backgroundUseGradient: boolean;
  backgroundGradientType: QRGradientType;
  backgroundGradientRotation: number;
  backgroundColorStart: string;
  backgroundColorEnd: string;
  backgroundOpacity: number;
  backgroundRoundedCorners: boolean;
  // Image
  imageSource: 'none' | 'script-name' | 'script-logo';
  imageHideBackgroundDots: boolean;
  imageSize: number;
  imageMargin: number;
}

// ============================================================================
// Constants
// ============================================================================

const DOT_TYPES: { value: QRDotType; label: string }[] = [
  { value: 'extra-rounded', label: 'Extra Round' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'classy', label: 'Classy' },
  { value: 'classy-rounded', label: 'Classy Round' },
  { value: 'square', label: 'Square' },
  { value: 'dots', label: 'Dots' },
];

const CORNER_SQUARE_TYPES: { value: QRCornerSquareType; label: string }[] = [
  { value: 'extra-rounded', label: 'Extra Round' },
  { value: 'square', label: 'Square' },
  { value: 'dot', label: 'Dot' },
];

const CORNER_DOT_TYPES: { value: QRCornerDotType; label: string }[] = [
  { value: 'dot', label: 'Dot' },
  { value: 'square', label: 'Square' },
];

const DEFAULT_QR_SETTINGS: PendingQRSettings = {
  almanac: true,
  showAlmanacLabel: true,
  showLogo: true,
  showAuthor: true,
  dotType: 'extra-rounded',
  dotsUseGradient: true,
  dotsGradientType: 'linear',
  dotsGradientRotation: 45,
  dotsColorStart: QR_COLORS.GRADIENT_START,
  dotsColorEnd: QR_COLORS.GRADIENT_END,
  cornerSquareType: 'extra-rounded',
  cornerSquareUseGradient: false,
  cornerSquareGradientType: 'linear',
  cornerSquareGradientRotation: 45,
  cornerSquareColorStart: QR_COLORS.GRADIENT_START,
  cornerSquareColorEnd: QR_COLORS.GRADIENT_START,
  cornerDotType: 'dot',
  cornerDotUseGradient: false,
  cornerDotGradientType: 'linear',
  cornerDotGradientRotation: 45,
  cornerDotColorStart: QR_COLORS.GRADIENT_END,
  cornerDotColorEnd: QR_COLORS.GRADIENT_END,
  backgroundUseGradient: false,
  backgroundGradientType: 'linear',
  backgroundGradientRotation: 45,
  backgroundColorStart: '#FFFFFF',
  backgroundColorEnd: '#FFFFFF',
  backgroundOpacity: 100,
  backgroundRoundedCorners: false,
  imageSource: 'script-logo',
  imageHideBackgroundDots: true,
  imageSize: 30,
  imageMargin: 4,
};

// ============================================================================
// Preview Component
// ============================================================================

const QRPreview = memo(function QRPreview({
  colorStart,
  colorEnd,
  isEnabled,
}: {
  colorStart: string;
  colorEnd: string;
  isEnabled: boolean;
}) {
  return (
    <div className={`${styles.previewContainer} ${!isEnabled ? styles.previewDisabled : ''}`}>
      <svg viewBox="0 0 24 24" className={styles.qrIcon} aria-hidden="true">
        <defs>
          <linearGradient id="qrGradientPreview" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colorStart} />
            <stop offset="100%" stopColor={colorEnd} />
          </linearGradient>
        </defs>
        <rect x="3" y="3" width="7" height="7" rx="1" fill="url(#qrGradientPreview)" />
        <rect x="14" y="3" width="7" height="7" rx="1" fill="url(#qrGradientPreview)" />
        <rect x="3" y="14" width="7" height="7" rx="1" fill="url(#qrGradientPreview)" />
        <rect x="14" y="14" width="3" height="3" rx="0.5" fill="url(#qrGradientPreview)" />
        <rect x="18" y="14" width="3" height="3" rx="0.5" fill="url(#qrGradientPreview)" />
        <rect x="14" y="18" width="3" height="3" rx="0.5" fill="url(#qrGradientPreview)" />
        <rect x="18" y="18" width="3" height="3" rx="0.5" fill="url(#qrGradientPreview)" />
        <circle cx="6.5" cy="6.5" r="1.5" fill="white" />
        <circle cx="17.5" cy="6.5" r="1.5" fill="white" />
        <circle cx="6.5" cy="17.5" r="1.5" fill="white" />
      </svg>
    </div>
  );
});

// ============================================================================
// Unified Color Section Component
// All QR styling sections use this same component for consistency
// ============================================================================

interface ColorSectionProps {
  /** Section label */
  label: string;
  /** Style dropdown options (optional - if not provided, no style dropdown) */
  styleOptions?: { value: string; label: string }[];
  /** Current style value */
  styleValue?: string;
  /** Style change handler */
  onStyleChange?: (value: string) => void;
  /** Whether gradient is enabled */
  useGradient: boolean;
  /** Gradient toggle handler */
  onGradientToggle: (value: boolean) => void;
  /** Gradient type (linear/radial) */
  gradientType: QRGradientType;
  /** Gradient type change handler */
  onGradientTypeChange: (value: QRGradientType) => void;
  /** Start color */
  colorStart: string;
  /** End color (used when gradient enabled) */
  colorEnd: string;
  /** Start color change handler */
  onColorStartChange: (value: string) => void;
  /** End color change handler */
  onColorEndChange: (value: string) => void;
  /** Rotation angle (only for linear gradients with rotation support) */
  rotation?: number;
  /** Rotation change handler */
  onRotationChange?: (value: number) => void;
  /** Whether to show rotation control */
  showRotation?: boolean;
  /** Compact mode - no style dropdown, smaller padding */
  compact?: boolean;
}

const ColorSection = memo(function ColorSection({
  label,
  styleOptions,
  styleValue,
  onStyleChange,
  useGradient,
  onGradientToggle,
  gradientType,
  onGradientTypeChange,
  colorStart,
  colorEnd,
  onColorStartChange,
  onColorEndChange,
  rotation,
  onRotationChange,
  showRotation = false,
  compact = false,
}: ColorSectionProps) {
  const hasStyleDropdown = styleOptions && styleOptions.length > 0 && onStyleChange;

  return (
    <div className={`${styles.colorSection} ${compact ? styles.colorSectionCompact : ''}`}>
      <div className={styles.sectionHeader}>{label}</div>
      {/* Row 1: Style dropdown + color pickers */}
      <div className={styles.compactRow}>
        {/* Style dropdown (optional) */}
        {hasStyleDropdown && (
          <select
            value={styleValue}
            onChange={(e) => onStyleChange(e.target.value)}
            className={styles.styleSelect}
          >
            {styleOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
        {/* Color pickers */}
        <input
          type="color"
          value={colorStart}
          onChange={(e) => onColorStartChange(e.target.value)}
          className={styles.colorInput}
          title={useGradient ? 'Start color' : 'Color'}
        />
        {useGradient && (
          <>
            <span className={styles.colorArrow}>→</span>
            <input
              type="color"
              value={colorEnd}
              onChange={(e) => onColorEndChange(e.target.value)}
              className={styles.colorInput}
              title="End color"
            />
          </>
        )}
      </div>
      {/* Row 2: Gradient toggle + type + rotation */}
      <div className={styles.compactRow}>
        {/* Gradient toggle */}
        <label className={styles.gradientToggle}>
          <input
            type="checkbox"
            checked={useGradient}
            onChange={(e) => onGradientToggle(e.target.checked)}
          />
          <span>Gradient</span>
        </label>
        {/* Gradient type selector - only shows when gradient enabled */}
        {useGradient && (
          <select
            value={gradientType}
            onChange={(e) => onGradientTypeChange(e.target.value as QRGradientType)}
            className={styles.typeSelect}
          >
            <option value="linear">Linear</option>
            <option value="radial">Radial</option>
          </select>
        )}
        {/* Rotation control for linear gradients */}
        {showRotation && useGradient && gradientType === 'linear' && onRotationChange && (
          <div className={styles.rotationControl}>
            <input
              type="range"
              min="0"
              max="360"
              step="15"
              value={rotation}
              onChange={(e) => onRotationChange(Number(e.target.value))}
              className={styles.rotationSlider}
            />
            <EditableSliderValue
              value={rotation ?? 0}
              onChange={onRotationChange}
              min={0}
              max={360}
              step={15}
              suffix="°"
              className={styles.rotationValue}
            />
          </div>
        )}
      </div>
    </div>
  );
});

// ============================================================================
// Main Component
// ============================================================================

export const QRCodeSettingsSelector = memo(function QRCodeSettingsSelector({
  generationOptions,
  onOptionChange,
  size = 'medium',
  disabled = false,
  ariaLabel,
}: QRCodeSettingsSelectorProps) {
  // Extract current settings from generationOptions
  const qrOptions = generationOptions.qrCodeOptions;
  const currentSettings: PendingQRSettings = {
    almanac: generationOptions.almanacToken !== false,
    showAlmanacLabel: qrOptions?.showAlmanacLabel ?? DEFAULT_QR_SETTINGS.showAlmanacLabel,
    showLogo: qrOptions?.showLogo ?? DEFAULT_QR_SETTINGS.showLogo,
    showAuthor: qrOptions?.showAuthor ?? DEFAULT_QR_SETTINGS.showAuthor,
    dotType: qrOptions?.dotType ?? DEFAULT_QR_SETTINGS.dotType,
    dotsUseGradient: qrOptions?.dotsUseGradient ?? DEFAULT_QR_SETTINGS.dotsUseGradient,
    dotsGradientType: qrOptions?.dotsGradientType ?? DEFAULT_QR_SETTINGS.dotsGradientType,
    dotsGradientRotation:
      qrOptions?.dotsGradientRotation ?? DEFAULT_QR_SETTINGS.dotsGradientRotation,
    dotsColorStart: qrOptions?.dotsColorStart ?? DEFAULT_QR_SETTINGS.dotsColorStart,
    dotsColorEnd: qrOptions?.dotsColorEnd ?? DEFAULT_QR_SETTINGS.dotsColorEnd,
    cornerSquareType: qrOptions?.cornerSquareType ?? DEFAULT_QR_SETTINGS.cornerSquareType,
    cornerSquareUseGradient:
      qrOptions?.cornerSquareUseGradient ?? DEFAULT_QR_SETTINGS.cornerSquareUseGradient,
    cornerSquareGradientType:
      qrOptions?.cornerSquareGradientType ?? DEFAULT_QR_SETTINGS.cornerSquareGradientType,
    cornerSquareGradientRotation:
      qrOptions?.cornerSquareGradientRotation ?? DEFAULT_QR_SETTINGS.cornerSquareGradientRotation,
    cornerSquareColorStart:
      qrOptions?.cornerSquareColorStart ?? DEFAULT_QR_SETTINGS.cornerSquareColorStart,
    cornerSquareColorEnd:
      qrOptions?.cornerSquareColorEnd ?? DEFAULT_QR_SETTINGS.cornerSquareColorEnd,
    cornerDotType: qrOptions?.cornerDotType ?? DEFAULT_QR_SETTINGS.cornerDotType,
    cornerDotUseGradient:
      qrOptions?.cornerDotUseGradient ?? DEFAULT_QR_SETTINGS.cornerDotUseGradient,
    cornerDotGradientType:
      qrOptions?.cornerDotGradientType ?? DEFAULT_QR_SETTINGS.cornerDotGradientType,
    cornerDotGradientRotation:
      qrOptions?.cornerDotGradientRotation ?? DEFAULT_QR_SETTINGS.cornerDotGradientRotation,
    cornerDotColorStart: qrOptions?.cornerDotColorStart ?? DEFAULT_QR_SETTINGS.cornerDotColorStart,
    cornerDotColorEnd: qrOptions?.cornerDotColorEnd ?? DEFAULT_QR_SETTINGS.cornerDotColorEnd,
    backgroundUseGradient:
      qrOptions?.backgroundUseGradient ?? DEFAULT_QR_SETTINGS.backgroundUseGradient,
    backgroundGradientType:
      qrOptions?.backgroundGradientType ?? DEFAULT_QR_SETTINGS.backgroundGradientType,
    backgroundGradientRotation:
      qrOptions?.backgroundGradientRotation ?? DEFAULT_QR_SETTINGS.backgroundGradientRotation,
    backgroundColorStart:
      qrOptions?.backgroundColorStart ?? DEFAULT_QR_SETTINGS.backgroundColorStart,
    backgroundColorEnd: qrOptions?.backgroundColorEnd ?? DEFAULT_QR_SETTINGS.backgroundColorEnd,
    backgroundOpacity: qrOptions?.backgroundOpacity ?? DEFAULT_QR_SETTINGS.backgroundOpacity,
    backgroundRoundedCorners:
      qrOptions?.backgroundRoundedCorners ?? DEFAULT_QR_SETTINGS.backgroundRoundedCorners,
    imageSource: qrOptions?.imageSource ?? DEFAULT_QR_SETTINGS.imageSource,
    imageHideBackgroundDots:
      qrOptions?.imageHideBackgroundDots ?? DEFAULT_QR_SETTINGS.imageHideBackgroundDots,
    imageSize: qrOptions?.imageSize ?? DEFAULT_QR_SETTINGS.imageSize,
    imageMargin: qrOptions?.imageMargin ?? DEFAULT_QR_SETTINGS.imageMargin,
  };

  const isEnabled = generationOptions.almanacToken !== false;

  // Convert settings to QRCodeOptions for saving
  const settingsToQROptions = useCallback(
    (settings: PendingQRSettings): QRCodeOptions => ({
      showAlmanacLabel: settings.showAlmanacLabel,
      showLogo: settings.showLogo,
      showAuthor: settings.showAuthor,
      dotType: settings.dotType,
      dotsUseGradient: settings.dotsUseGradient,
      dotsGradientType: settings.dotsGradientType,
      dotsGradientRotation: settings.dotsGradientRotation,
      dotsColorStart: settings.dotsColorStart,
      dotsColorEnd: settings.dotsColorEnd,
      cornerSquareType: settings.cornerSquareType,
      cornerSquareUseGradient: settings.cornerSquareUseGradient,
      cornerSquareGradientType: settings.cornerSquareGradientType,
      cornerSquareGradientRotation: settings.cornerSquareGradientRotation,
      cornerSquareColorStart: settings.cornerSquareColorStart,
      cornerSquareColorEnd: settings.cornerSquareColorEnd,
      cornerDotType: settings.cornerDotType,
      cornerDotUseGradient: settings.cornerDotUseGradient,
      cornerDotGradientType: settings.cornerDotGradientType,
      cornerDotGradientRotation: settings.cornerDotGradientRotation,
      cornerDotColorStart: settings.cornerDotColorStart,
      cornerDotColorEnd: settings.cornerDotColorEnd,
      backgroundUseGradient: settings.backgroundUseGradient,
      backgroundGradientType: settings.backgroundGradientType,
      backgroundGradientRotation: settings.backgroundGradientRotation,
      backgroundColorStart: settings.backgroundColorStart,
      backgroundColorEnd: settings.backgroundColorEnd,
      backgroundOpacity: settings.backgroundOpacity,
      backgroundRoundedCorners: settings.backgroundRoundedCorners,
      imageSource: settings.imageSource,
      imageHideBackgroundDots: settings.imageHideBackgroundDots,
      imageSize: settings.imageSize,
      imageMargin: settings.imageMargin,
      errorCorrectionLevel: 'H', // Fixed at 30% - highest error correction for logo support
    }),
    []
  );

  // Handle master enable/disable toggle
  const handleToggle = useCallback(
    (enabled: boolean) => {
      onOptionChange({ almanacToken: enabled });
    },
    [onOptionChange]
  );

  // Handle panel changes
  const handlePanelChange = useCallback(
    (settings: PendingQRSettings) => {
      onOptionChange({
        almanacToken: settings.almanac,
        qrCodeOptions: settingsToQROptions(settings),
      });
    },
    [onOptionChange, settingsToQROptions]
  );

  // Use the expandable panel hook
  const panel = useExpandablePanel<PendingQRSettings>({
    value: currentSettings,
    onChange: handlePanelChange,
    onPreviewChange: handlePanelChange,
    disabled,
    panelHeight: 420,
    minPanelWidth: 720,
  });

  const displaySettings = panel.isExpanded ? panel.pendingValue : currentSettings;

  // Format summary text
  const getSummary = () => {
    if (!isEnabled) return 'Disabled';
    const dotLabel =
      DOT_TYPES.find((d) => d.value === displaySettings.dotType)?.label ?? 'Extra Round';
    const gradientText = displaySettings.dotsUseGradient ? 'gradient' : 'solid';
    return `${dotLabel} · ${gradientText}`;
  };

  // Enable toggle component
  const EnableToggle = (
    <div className={optionStyles.inboxToggle}>
      <button
        type="button"
        className={`${optionStyles.inboxToggleButton} ${!isEnabled ? optionStyles.inboxToggleButtonActive : ''}`}
        onClick={() => handleToggle(false)}
      >
        Off
      </button>
      <button
        type="button"
        className={`${optionStyles.inboxToggleButton} ${isEnabled ? optionStyles.inboxToggleButtonActive : ''}`}
        onClick={() => handleToggle(true)}
      >
        On
      </button>
    </div>
  );

  // Render three-panel expandable content
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
        <div className={styles.threePanelLayout}>
          {/* LEFT PANEL - Token Options */}
          <div className={styles.leftPanel}>
            <div className={styles.panelTitle}>Token Options</div>

            {/* Almanac */}
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={panel.pendingValue.almanac}
                onChange={(e) => panel.updatePendingField('almanac', e.target.checked)}
              />
              <span>Almanac</span>
            </label>

            {/* Show Label (sub-option) */}
            <label
              className={`${styles.checkboxRow} ${styles.subOption} ${!panel.pendingValue.almanac ? styles.optionDisabled : ''}`}
            >
              <input
                type="checkbox"
                checked={panel.pendingValue.showAlmanacLabel}
                onChange={(e) => panel.updatePendingField('showAlmanacLabel', e.target.checked)}
                disabled={!panel.pendingValue.almanac}
              />
              <span>Show Label</span>
            </label>

            {/* Shareable Script - not yet implemented */}
            <label
              className={`${styles.checkboxRow} ${styles.optionDisabled}`}
              title="Coming soon - shareable script links"
            >
              <input type="checkbox" checked={false} onChange={() => {}} disabled={true} />
              <span>Shareable Script</span>
            </label>
          </div>

          {/* MIDDLE PANEL - QR Styling (dots, corners) */}
          <div className={styles.middlePanel}>
            <div className={styles.panelTitle}>QR Styling</div>

            {/* Dots Section */}
            <ColorSection
              label="Dots (Modules)"
              styleOptions={DOT_TYPES}
              styleValue={panel.pendingValue.dotType}
              onStyleChange={(v) => panel.updatePendingField('dotType', v as QRDotType)}
              useGradient={panel.pendingValue.dotsUseGradient}
              onGradientToggle={(v) => panel.updatePendingField('dotsUseGradient', v)}
              gradientType={panel.pendingValue.dotsGradientType}
              onGradientTypeChange={(v) => panel.updatePendingField('dotsGradientType', v)}
              colorStart={panel.pendingValue.dotsColorStart}
              colorEnd={panel.pendingValue.dotsColorEnd}
              onColorStartChange={(v) => panel.updatePendingField('dotsColorStart', v)}
              onColorEndChange={(v) => panel.updatePendingField('dotsColorEnd', v)}
              rotation={panel.pendingValue.dotsGradientRotation}
              onRotationChange={(v) => panel.updatePendingField('dotsGradientRotation', v)}
              showRotation={true}
            />

            {/* Corner Squares Section */}
            <ColorSection
              label="Corner Squares"
              styleOptions={CORNER_SQUARE_TYPES}
              styleValue={panel.pendingValue.cornerSquareType}
              onStyleChange={(v) =>
                panel.updatePendingField('cornerSquareType', v as QRCornerSquareType)
              }
              useGradient={panel.pendingValue.cornerSquareUseGradient}
              onGradientToggle={(v) => panel.updatePendingField('cornerSquareUseGradient', v)}
              gradientType={panel.pendingValue.cornerSquareGradientType}
              onGradientTypeChange={(v) => panel.updatePendingField('cornerSquareGradientType', v)}
              colorStart={panel.pendingValue.cornerSquareColorStart}
              colorEnd={panel.pendingValue.cornerSquareColorEnd}
              onColorStartChange={(v) => panel.updatePendingField('cornerSquareColorStart', v)}
              onColorEndChange={(v) => panel.updatePendingField('cornerSquareColorEnd', v)}
              rotation={panel.pendingValue.cornerSquareGradientRotation}
              onRotationChange={(v) => panel.updatePendingField('cornerSquareGradientRotation', v)}
              showRotation={true}
            />

            {/* Corner Dots Section */}
            <ColorSection
              label="Corner Dots"
              styleOptions={CORNER_DOT_TYPES}
              styleValue={panel.pendingValue.cornerDotType}
              onStyleChange={(v) => panel.updatePendingField('cornerDotType', v as QRCornerDotType)}
              useGradient={panel.pendingValue.cornerDotUseGradient}
              onGradientToggle={(v) => panel.updatePendingField('cornerDotUseGradient', v)}
              gradientType={panel.pendingValue.cornerDotGradientType}
              onGradientTypeChange={(v) => panel.updatePendingField('cornerDotGradientType', v)}
              colorStart={panel.pendingValue.cornerDotColorStart}
              colorEnd={panel.pendingValue.cornerDotColorEnd}
              onColorStartChange={(v) => panel.updatePendingField('cornerDotColorStart', v)}
              onColorEndChange={(v) => panel.updatePendingField('cornerDotColorEnd', v)}
              rotation={panel.pendingValue.cornerDotGradientRotation}
              onRotationChange={(v) => panel.updatePendingField('cornerDotGradientRotation', v)}
              showRotation={true}
            />
          </div>

          {/* RIGHT PANEL - Background & Image Options */}
          <div className={styles.rightPanel}>
            <div className={styles.panelTitle}>Background & Image</div>

            {/* Background Section */}
            <div className={styles.colorSection}>
              <div className={styles.sectionHeader}>Background</div>
              {/* Row 1: Shape dropdown + color pickers */}
              <div className={styles.compactRow}>
                {/* Shape dropdown */}
                <select
                  value={panel.pendingValue.backgroundRoundedCorners ? 'round' : 'square'}
                  onChange={(e) =>
                    panel.updatePendingField('backgroundRoundedCorners', e.target.value === 'round')
                  }
                  className={styles.styleSelect}
                >
                  <option value="square">Square</option>
                  <option value="round">Rounded</option>
                </select>
                {/* Color pickers */}
                <input
                  type="color"
                  value={panel.pendingValue.backgroundColorStart}
                  onChange={(e) => panel.updatePendingField('backgroundColorStart', e.target.value)}
                  className={styles.colorInput}
                  title={panel.pendingValue.backgroundUseGradient ? 'Start color' : 'Color'}
                />
                {panel.pendingValue.backgroundUseGradient && (
                  <>
                    <span className={styles.colorArrow}>→</span>
                    <input
                      type="color"
                      value={panel.pendingValue.backgroundColorEnd}
                      onChange={(e) =>
                        panel.updatePendingField('backgroundColorEnd', e.target.value)
                      }
                      className={styles.colorInput}
                      title="End color"
                    />
                  </>
                )}
              </div>
              {/* Row 2: Gradient toggle + type + rotation */}
              <div className={styles.compactRow}>
                {/* Gradient toggle */}
                <label className={styles.gradientToggle}>
                  <input
                    type="checkbox"
                    checked={panel.pendingValue.backgroundUseGradient}
                    onChange={(e) =>
                      panel.updatePendingField('backgroundUseGradient', e.target.checked)
                    }
                  />
                  <span>Gradient</span>
                </label>
                {/* Gradient type selector */}
                {panel.pendingValue.backgroundUseGradient && (
                  <select
                    value={panel.pendingValue.backgroundGradientType}
                    onChange={(e) =>
                      panel.updatePendingField(
                        'backgroundGradientType',
                        e.target.value as QRGradientType
                      )
                    }
                    className={styles.typeSelect}
                  >
                    <option value="linear">Linear</option>
                    <option value="radial">Radial</option>
                  </select>
                )}
                {/* Rotation control for linear gradients */}
                {panel.pendingValue.backgroundUseGradient &&
                  panel.pendingValue.backgroundGradientType === 'linear' && (
                    <div className={styles.rotationControl}>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        step="15"
                        value={panel.pendingValue.backgroundGradientRotation}
                        onChange={(e) =>
                          panel.updatePendingField(
                            'backgroundGradientRotation',
                            Number(e.target.value)
                          )
                        }
                        className={styles.rotationSlider}
                      />
                      <EditableSliderValue
                        value={panel.pendingValue.backgroundGradientRotation}
                        onChange={(v) => panel.updatePendingField('backgroundGradientRotation', v)}
                        min={0}
                        max={360}
                        step={15}
                        suffix="°"
                        className={styles.rotationValue}
                      />
                    </div>
                  )}
              </div>
              {/* Row 3: Opacity slider */}
              <div className={styles.sliderRow}>
                <EditableSlider
                  label="Opacity"
                  value={panel.pendingValue.backgroundOpacity}
                  onChange={(v) => panel.updatePendingField('backgroundOpacity', v)}
                  min={0}
                  max={100}
                  step={5}
                  suffix="%"
                  defaultValue={100}
                />
              </div>
            </div>

            {/* Image Options Section */}
            <div className={styles.colorSection}>
              <div className={styles.sectionHeader}>Center Image</div>
              <div className={styles.compactRow}>
                {/* Image source dropdown */}
                <select
                  value={panel.pendingValue.imageSource}
                  onChange={(e) =>
                    panel.updatePendingField(
                      'imageSource',
                      e.target.value as 'none' | 'script-name' | 'script-logo'
                    )
                  }
                  className={styles.styleSelect}
                >
                  <option value="none">None</option>
                  <option value="script-name">Script Name</option>
                  <option value="script-logo">Script Logo</option>
                </select>
                {/* Hide background dots toggle */}
                {panel.pendingValue.imageSource !== 'none' && (
                  <label className={styles.gradientToggle}>
                    <input
                      type="checkbox"
                      checked={panel.pendingValue.imageHideBackgroundDots}
                      onChange={(e) =>
                        panel.updatePendingField('imageHideBackgroundDots', e.target.checked)
                      }
                    />
                    <span>Hide Dots</span>
                  </label>
                )}
              </div>
              {/* Image size and margin sliders (only show when image is enabled) */}
              {panel.pendingValue.imageSource !== 'none' && (
                <>
                  <div className={styles.sliderRow}>
                    <EditableSlider
                      label="Size"
                      value={panel.pendingValue.imageSize}
                      onChange={(v) => panel.updatePendingField('imageSize', v)}
                      min={5}
                      max={70}
                      step={5}
                      suffix="%"
                      defaultValue={30}
                    />
                  </div>
                  <div className={styles.sliderRow}>
                    <EditableSlider
                      label="Margin"
                      value={panel.pendingValue.imageMargin}
                      onChange={(v) => panel.updatePendingField('imageMargin', v)}
                      min={0}
                      max={20}
                      step={1}
                      suffix="px"
                      defaultValue={4}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Panel Footer */}
        <div className={baseStyles.panelFooter}>
          <button
            type="button"
            className={baseStyles.resetLink}
            onClick={() => panel.reset(DEFAULT_QR_SETTINGS)}
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

  return (
    <SettingsSelectorBase
      ref={panel.containerRef}
      preview={
        <PreviewBox shape="square" size={size}>
          <QRPreview
            colorStart={displaySettings.dotsColorStart}
            colorEnd={displaySettings.dotsColorEnd}
            isEnabled={isEnabled}
          />
        </PreviewBox>
      }
      info={<InfoSection label="QR Tokens" summary={getSummary()} />}
      headerSlot={EnableToggle}
      actionLabel="Customize"
      onAction={panel.toggle}
      isExpanded={panel.isExpanded}
      disabled={disabled}
      visuallyDisabled={!isEnabled}
      size={size}
      ariaLabel={ariaLabel ?? 'QR code settings'}
      onKeyDown={panel.handleKeyDown}
    >
      {renderPanel()}
    </SettingsSelectorBase>
  );
});

export default QRCodeSettingsSelector;
