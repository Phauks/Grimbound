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
import { EditableSlider } from '@/components/Shared/Controls/EditableSlider';
import { useExpandablePanel } from '@/hooks';
import optionStyles from '@/styles/components/options/OptionsPanel.module.css';
import styles from '@/styles/components/shared/QRCodeSettingsSelector.module.css';
import baseStyles from '@/styles/components/shared/SettingsSelectorBase.module.css';
import { QR_COLORS } from '@/ts/constants.js';
import type {
  GenerationOptions,
  QRCodeOptions,
  QRCornerDotType,
  QRCornerSquareType,
  QRDotType,
  QRGradientType,
} from '@/ts/types/index';
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

/** Default gradient rotation angle in degrees */
const DEFAULT_GRADIENT_ROTATION = 45;

/** Error correction level - 'H' provides 30% error correction, best for logos */
const ERROR_CORRECTION_LEVEL = 'H' as const;

const DEFAULT_QR_SETTINGS: PendingQRSettings = {
  almanac: true,
  showAlmanacLabel: true,
  showLogo: true,
  showAuthor: true,
  dotType: 'extra-rounded',
  dotsUseGradient: true,
  dotsGradientType: 'linear',
  dotsGradientRotation: DEFAULT_GRADIENT_ROTATION,
  dotsColorStart: QR_COLORS.GRADIENT_START,
  dotsColorEnd: QR_COLORS.GRADIENT_END,
  cornerSquareType: 'extra-rounded',
  cornerSquareUseGradient: false,
  cornerSquareGradientType: 'linear',
  cornerSquareGradientRotation: DEFAULT_GRADIENT_ROTATION,
  cornerSquareColorStart: QR_COLORS.GRADIENT_START,
  cornerSquareColorEnd: QR_COLORS.GRADIENT_START,
  cornerDotType: 'dot',
  cornerDotUseGradient: false,
  cornerDotGradientType: 'linear',
  cornerDotGradientRotation: DEFAULT_GRADIENT_ROTATION,
  cornerDotColorStart: QR_COLORS.GRADIENT_END,
  cornerDotColorEnd: QR_COLORS.GRADIENT_END,
  backgroundUseGradient: false,
  backgroundGradientType: 'linear',
  backgroundGradientRotation: DEFAULT_GRADIENT_ROTATION,
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
// Settings Helpers
// ============================================================================

/**
 * Merge QRCodeOptions with defaults to create PendingQRSettings
 * Reduces verbose property-by-property initialization
 */
function createSettingsFromOptions(
  qrOptions: QRCodeOptions | undefined,
  almanacEnabled: boolean
): PendingQRSettings {
  return {
    ...DEFAULT_QR_SETTINGS,
    almanac: almanacEnabled,
    ...(qrOptions && {
      showAlmanacLabel: qrOptions.showAlmanacLabel ?? DEFAULT_QR_SETTINGS.showAlmanacLabel,
      showLogo: qrOptions.showLogo ?? DEFAULT_QR_SETTINGS.showLogo,
      showAuthor: qrOptions.showAuthor ?? DEFAULT_QR_SETTINGS.showAuthor,
      dotType: qrOptions.dotType ?? DEFAULT_QR_SETTINGS.dotType,
      dotsUseGradient: qrOptions.dotsUseGradient ?? DEFAULT_QR_SETTINGS.dotsUseGradient,
      dotsGradientType: qrOptions.dotsGradientType ?? DEFAULT_QR_SETTINGS.dotsGradientType,
      dotsGradientRotation:
        qrOptions.dotsGradientRotation ?? DEFAULT_QR_SETTINGS.dotsGradientRotation,
      dotsColorStart: qrOptions.dotsColorStart ?? DEFAULT_QR_SETTINGS.dotsColorStart,
      dotsColorEnd: qrOptions.dotsColorEnd ?? DEFAULT_QR_SETTINGS.dotsColorEnd,
      cornerSquareType: qrOptions.cornerSquareType ?? DEFAULT_QR_SETTINGS.cornerSquareType,
      cornerSquareUseGradient:
        qrOptions.cornerSquareUseGradient ?? DEFAULT_QR_SETTINGS.cornerSquareUseGradient,
      cornerSquareGradientType:
        qrOptions.cornerSquareGradientType ?? DEFAULT_QR_SETTINGS.cornerSquareGradientType,
      cornerSquareGradientRotation:
        qrOptions.cornerSquareGradientRotation ?? DEFAULT_QR_SETTINGS.cornerSquareGradientRotation,
      cornerSquareColorStart:
        qrOptions.cornerSquareColorStart ?? DEFAULT_QR_SETTINGS.cornerSquareColorStart,
      cornerSquareColorEnd:
        qrOptions.cornerSquareColorEnd ?? DEFAULT_QR_SETTINGS.cornerSquareColorEnd,
      cornerDotType: qrOptions.cornerDotType ?? DEFAULT_QR_SETTINGS.cornerDotType,
      cornerDotUseGradient:
        qrOptions.cornerDotUseGradient ?? DEFAULT_QR_SETTINGS.cornerDotUseGradient,
      cornerDotGradientType:
        qrOptions.cornerDotGradientType ?? DEFAULT_QR_SETTINGS.cornerDotGradientType,
      cornerDotGradientRotation:
        qrOptions.cornerDotGradientRotation ?? DEFAULT_QR_SETTINGS.cornerDotGradientRotation,
      cornerDotColorStart: qrOptions.cornerDotColorStart ?? DEFAULT_QR_SETTINGS.cornerDotColorStart,
      cornerDotColorEnd: qrOptions.cornerDotColorEnd ?? DEFAULT_QR_SETTINGS.cornerDotColorEnd,
      backgroundUseGradient:
        qrOptions.backgroundUseGradient ?? DEFAULT_QR_SETTINGS.backgroundUseGradient,
      backgroundGradientType:
        qrOptions.backgroundGradientType ?? DEFAULT_QR_SETTINGS.backgroundGradientType,
      backgroundGradientRotation:
        qrOptions.backgroundGradientRotation ?? DEFAULT_QR_SETTINGS.backgroundGradientRotation,
      backgroundColorStart:
        qrOptions.backgroundColorStart ?? DEFAULT_QR_SETTINGS.backgroundColorStart,
      backgroundColorEnd: qrOptions.backgroundColorEnd ?? DEFAULT_QR_SETTINGS.backgroundColorEnd,
      backgroundOpacity: qrOptions.backgroundOpacity ?? DEFAULT_QR_SETTINGS.backgroundOpacity,
      backgroundRoundedCorners:
        qrOptions.backgroundRoundedCorners ?? DEFAULT_QR_SETTINGS.backgroundRoundedCorners,
      imageSource: qrOptions.imageSource ?? DEFAULT_QR_SETTINGS.imageSource,
      imageHideBackgroundDots:
        qrOptions.imageHideBackgroundDots ?? DEFAULT_QR_SETTINGS.imageHideBackgroundDots,
      imageSize: qrOptions.imageSize ?? DEFAULT_QR_SETTINGS.imageSize,
      imageMargin: qrOptions.imageMargin ?? DEFAULT_QR_SETTINGS.imageMargin,
    }),
  };
}

/**
 * Convert PendingQRSettings to QRCodeOptions for saving
 */
function settingsToQROptions(settings: PendingQRSettings): QRCodeOptions {
  return {
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
    errorCorrectionLevel: ERROR_CORRECTION_LEVEL,
  };
}

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
          <EditableSlider
            value={rotation ?? 0}
            onChange={onRotationChange}
            min={0}
            max={360}
            step={15}
            suffix="°"
            defaultValue={45}
            className={styles.rotationControl}
            ariaLabel={`${label} gradient rotation`}
          />
        )}
      </div>
    </div>
  );
});

// ============================================================================
// Panel Section Components
// ============================================================================

interface PanelSectionProps {
  pendingValue: PendingQRSettings;
  updatePendingField: <K extends keyof PendingQRSettings>(
    field: K,
    value: PendingQRSettings[K]
  ) => void;
}

/**
 * Left Panel - Token Options (almanac toggle, labels)
 */
const TokenOptionsPanel = memo(function TokenOptionsPanel({
  pendingValue,
  updatePendingField,
}: PanelSectionProps) {
  return (
    <div className={styles.leftPanel}>
      <div className={styles.panelTitle}>Token Options</div>

      {/* Almanac */}
      <label className={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={pendingValue.almanac}
          onChange={(e) => updatePendingField('almanac', e.target.checked)}
        />
        <span>Almanac</span>
      </label>

      {/* Show Label (sub-option) */}
      <label
        className={`${styles.checkboxRow} ${styles.subOption} ${!pendingValue.almanac ? styles.optionDisabled : ''}`}
      >
        <input
          type="checkbox"
          checked={pendingValue.showAlmanacLabel}
          onChange={(e) => updatePendingField('showAlmanacLabel', e.target.checked)}
          disabled={!pendingValue.almanac}
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
  );
});

/**
 * Middle Panel - QR Styling (dots, corner squares, corner dots)
 */
const QRStylingPanel = memo(function QRStylingPanel({
  pendingValue,
  updatePendingField,
}: PanelSectionProps) {
  return (
    <div className={styles.middlePanel}>
      <div className={styles.panelTitle}>QR Styling</div>

      {/* Dots Section */}
      <ColorSection
        label="Dots (Modules)"
        styleOptions={DOT_TYPES}
        styleValue={pendingValue.dotType}
        onStyleChange={(v) => updatePendingField('dotType', v as QRDotType)}
        useGradient={pendingValue.dotsUseGradient}
        onGradientToggle={(v) => updatePendingField('dotsUseGradient', v)}
        gradientType={pendingValue.dotsGradientType}
        onGradientTypeChange={(v) => updatePendingField('dotsGradientType', v)}
        colorStart={pendingValue.dotsColorStart}
        colorEnd={pendingValue.dotsColorEnd}
        onColorStartChange={(v) => updatePendingField('dotsColorStart', v)}
        onColorEndChange={(v) => updatePendingField('dotsColorEnd', v)}
        rotation={pendingValue.dotsGradientRotation}
        onRotationChange={(v) => updatePendingField('dotsGradientRotation', v)}
        showRotation={true}
      />

      {/* Corner Squares Section */}
      <ColorSection
        label="Corner Squares"
        styleOptions={CORNER_SQUARE_TYPES}
        styleValue={pendingValue.cornerSquareType}
        onStyleChange={(v) => updatePendingField('cornerSquareType', v as QRCornerSquareType)}
        useGradient={pendingValue.cornerSquareUseGradient}
        onGradientToggle={(v) => updatePendingField('cornerSquareUseGradient', v)}
        gradientType={pendingValue.cornerSquareGradientType}
        onGradientTypeChange={(v) => updatePendingField('cornerSquareGradientType', v)}
        colorStart={pendingValue.cornerSquareColorStart}
        colorEnd={pendingValue.cornerSquareColorEnd}
        onColorStartChange={(v) => updatePendingField('cornerSquareColorStart', v)}
        onColorEndChange={(v) => updatePendingField('cornerSquareColorEnd', v)}
        rotation={pendingValue.cornerSquareGradientRotation}
        onRotationChange={(v) => updatePendingField('cornerSquareGradientRotation', v)}
        showRotation={true}
      />

      {/* Corner Dots Section */}
      <ColorSection
        label="Corner Dots"
        styleOptions={CORNER_DOT_TYPES}
        styleValue={pendingValue.cornerDotType}
        onStyleChange={(v) => updatePendingField('cornerDotType', v as QRCornerDotType)}
        useGradient={pendingValue.cornerDotUseGradient}
        onGradientToggle={(v) => updatePendingField('cornerDotUseGradient', v)}
        gradientType={pendingValue.cornerDotGradientType}
        onGradientTypeChange={(v) => updatePendingField('cornerDotGradientType', v)}
        colorStart={pendingValue.cornerDotColorStart}
        colorEnd={pendingValue.cornerDotColorEnd}
        onColorStartChange={(v) => updatePendingField('cornerDotColorStart', v)}
        onColorEndChange={(v) => updatePendingField('cornerDotColorEnd', v)}
        rotation={pendingValue.cornerDotGradientRotation}
        onRotationChange={(v) => updatePendingField('cornerDotGradientRotation', v)}
        showRotation={true}
      />
    </div>
  );
});

/**
 * Right Panel - Background & Image Options
 */
const BackgroundImagePanel = memo(function BackgroundImagePanel({
  pendingValue,
  updatePendingField,
}: PanelSectionProps) {
  return (
    <div className={styles.rightPanel}>
      <div className={styles.panelTitle}>Background & Image</div>

      {/* Background Section */}
      <div className={styles.colorSection}>
        <div className={styles.sectionHeader}>Background</div>
        {/* Row 1: Shape dropdown + color pickers */}
        <div className={styles.compactRow}>
          <select
            value={pendingValue.backgroundRoundedCorners ? 'round' : 'square'}
            onChange={(e) =>
              updatePendingField('backgroundRoundedCorners', e.target.value === 'round')
            }
            className={styles.styleSelect}
          >
            <option value="square">Square</option>
            <option value="round">Rounded</option>
          </select>
          <input
            type="color"
            value={pendingValue.backgroundColorStart}
            onChange={(e) => updatePendingField('backgroundColorStart', e.target.value)}
            className={styles.colorInput}
            title={pendingValue.backgroundUseGradient ? 'Start color' : 'Color'}
          />
          {pendingValue.backgroundUseGradient && (
            <>
              <span className={styles.colorArrow}>→</span>
              <input
                type="color"
                value={pendingValue.backgroundColorEnd}
                onChange={(e) => updatePendingField('backgroundColorEnd', e.target.value)}
                className={styles.colorInput}
                title="End color"
              />
            </>
          )}
        </div>
        {/* Row 2: Gradient toggle + type + rotation */}
        <div className={styles.compactRow}>
          <label className={styles.gradientToggle}>
            <input
              type="checkbox"
              checked={pendingValue.backgroundUseGradient}
              onChange={(e) => updatePendingField('backgroundUseGradient', e.target.checked)}
            />
            <span>Gradient</span>
          </label>
          {pendingValue.backgroundUseGradient && (
            <select
              value={pendingValue.backgroundGradientType}
              onChange={(e) =>
                updatePendingField('backgroundGradientType', e.target.value as QRGradientType)
              }
              className={styles.typeSelect}
            >
              <option value="linear">Linear</option>
              <option value="radial">Radial</option>
            </select>
          )}
          {pendingValue.backgroundUseGradient &&
            pendingValue.backgroundGradientType === 'linear' && (
              <EditableSlider
                value={pendingValue.backgroundGradientRotation}
                onChange={(v) => updatePendingField('backgroundGradientRotation', v)}
                min={0}
                max={360}
                step={15}
                suffix="°"
                defaultValue={DEFAULT_GRADIENT_ROTATION}
                className={styles.rotationControl}
                ariaLabel="Background gradient rotation"
              />
            )}
        </div>
        {/* Row 3: Opacity slider */}
        <div className={styles.sliderRow}>
          <EditableSlider
            label="Opacity"
            value={pendingValue.backgroundOpacity}
            onChange={(v) => updatePendingField('backgroundOpacity', v)}
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
          <select
            value={pendingValue.imageSource}
            onChange={(e) =>
              updatePendingField(
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
          {pendingValue.imageSource !== 'none' && (
            <label className={styles.gradientToggle}>
              <input
                type="checkbox"
                checked={pendingValue.imageHideBackgroundDots}
                onChange={(e) => updatePendingField('imageHideBackgroundDots', e.target.checked)}
              />
              <span>Hide Dots</span>
            </label>
          )}
        </div>
        {pendingValue.imageSource !== 'none' && (
          <>
            <div className={styles.sliderRow}>
              <EditableSlider
                label="Size"
                value={pendingValue.imageSize}
                onChange={(v) => updatePendingField('imageSize', v)}
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
                value={pendingValue.imageMargin}
                onChange={(v) => updatePendingField('imageMargin', v)}
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
  // Extract current settings from generationOptions using helper
  const isEnabled = generationOptions.almanacToken !== false;
  const currentSettings = createSettingsFromOptions(generationOptions.qrCodeOptions, isEnabled);

  // Handle master enable/disable toggle
  const handleToggle = useCallback(
    (enabled: boolean) => {
      onOptionChange({ almanacToken: enabled });
    },
    [onOptionChange]
  );

  // Handle panel changes - uses module-level settingsToQROptions
  const handlePanelChange = useCallback(
    (settings: PendingQRSettings) => {
      onOptionChange({
        almanacToken: settings.almanac,
        qrCodeOptions: settingsToQROptions(settings),
      });
    },
    [onOptionChange]
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

  // Render three-panel expandable content using extracted components
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
          <TokenOptionsPanel
            pendingValue={panel.pendingValue}
            updatePendingField={panel.updatePendingField}
          />
          <QRStylingPanel
            pendingValue={panel.pendingValue}
            updatePendingField={panel.updatePendingField}
          />
          <BackgroundImagePanel
            pendingValue={panel.pendingValue}
            updatePendingField={panel.updatePendingField}
          />
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
      info={<InfoSection label="QR Tokens" />}
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
