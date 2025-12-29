/**
 * QRCodeDrawer Component
 *
 * A slide-out drawer for QR code token settings with three columns:
 * - Left column: Token options (Almanac toggle, labels)
 * - Middle column: QR styling (dots, corner squares, corner dots)
 * - Right column: Background and center image options
 *
 * Manages internal pending state - changes are only applied on "Apply" click.
 *
 * @module components/Shared/Drawer/QRCodeDrawer
 */

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { EditableSlider } from '@/components/Shared/Controls/EditableSlider';
import { ColorPreviewSelector } from '@/components/Shared/Selectors/ColorPreviewSelector';
import styles from '@/styles/components/shared/QRCodeSettingsSelector.module.css';
import drawerStyles from '@/styles/components/shared/SettingsDrawer.module.css';
import { QR_COLORS } from '@/ts/constants.js';
import type {
  GenerationOptions,
  QRCodeOptions,
  QRCornerDotType,
  QRCornerSquareType,
  QRDotType,
  QRGradientType,
} from '@/ts/types/index';
import { SettingsDrawer } from './SettingsDrawer';

// ============================================================================
// Types
// ============================================================================

export interface QRCodeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  generationOptions: GenerationOptions;
  onOptionChange: (options: Partial<GenerationOptions>) => void;
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
 * Filter out undefined values from an object, keeping only defined properties.
 * This allows spread to work correctly with defaults.
 */
function filterDefined<T extends object>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(obj) as (keyof T)[]) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Merge QRCodeOptions with defaults to create PendingQRSettings.
 * Uses spread with filtered defined values for cleaner merging.
 */
function createSettingsFromOptions(
  qrOptions: QRCodeOptions | undefined,
  almanacEnabled: boolean
): PendingQRSettings {
  // Start with defaults, override with any defined values from qrOptions
  const base: PendingQRSettings = {
    ...DEFAULT_QR_SETTINGS,
    almanac: almanacEnabled,
  };

  if (!qrOptions) {
    return base;
  }

  // Map QRCodeOptions fields to PendingQRSettings fields (they're 1:1 except almanac)
  const optionsOverrides = filterDefined({
    showAlmanacLabel: qrOptions.showAlmanacLabel,
    showLogo: qrOptions.showLogo,
    showAuthor: qrOptions.showAuthor,
    dotType: qrOptions.dotType,
    dotsUseGradient: qrOptions.dotsUseGradient,
    dotsGradientType: qrOptions.dotsGradientType,
    dotsGradientRotation: qrOptions.dotsGradientRotation,
    dotsColorStart: qrOptions.dotsColorStart,
    dotsColorEnd: qrOptions.dotsColorEnd,
    cornerSquareType: qrOptions.cornerSquareType,
    cornerSquareUseGradient: qrOptions.cornerSquareUseGradient,
    cornerSquareGradientType: qrOptions.cornerSquareGradientType,
    cornerSquareGradientRotation: qrOptions.cornerSquareGradientRotation,
    cornerSquareColorStart: qrOptions.cornerSquareColorStart,
    cornerSquareColorEnd: qrOptions.cornerSquareColorEnd,
    cornerDotType: qrOptions.cornerDotType,
    cornerDotUseGradient: qrOptions.cornerDotUseGradient,
    cornerDotGradientType: qrOptions.cornerDotGradientType,
    cornerDotGradientRotation: qrOptions.cornerDotGradientRotation,
    cornerDotColorStart: qrOptions.cornerDotColorStart,
    cornerDotColorEnd: qrOptions.cornerDotColorEnd,
    backgroundUseGradient: qrOptions.backgroundUseGradient,
    backgroundGradientType: qrOptions.backgroundGradientType,
    backgroundGradientRotation: qrOptions.backgroundGradientRotation,
    backgroundColorStart: qrOptions.backgroundColorStart,
    backgroundColorEnd: qrOptions.backgroundColorEnd,
    backgroundOpacity: qrOptions.backgroundOpacity,
    backgroundRoundedCorners: qrOptions.backgroundRoundedCorners,
    imageSource: qrOptions.imageSource,
    imageHideBackgroundDots: qrOptions.imageHideBackgroundDots,
    imageSize: qrOptions.imageSize,
    imageMargin: qrOptions.imageMargin,
  });

  return { ...base, ...optionsOverrides };
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
// Unified Color Section Component
// ============================================================================

interface ColorSectionProps {
  label: string;
  styleOptions?: { value: string; label: string }[];
  styleValue?: string;
  onStyleChange?: (value: string) => void;
  useGradient: boolean;
  onGradientToggle: (value: boolean) => void;
  gradientType: QRGradientType;
  onGradientTypeChange: (value: QRGradientType) => void;
  colorStart: string;
  colorEnd: string;
  onColorStartChange: (value: string) => void;
  onColorEndChange: (value: string) => void;
  rotation?: number;
  onRotationChange?: (value: number) => void;
  showRotation?: boolean;
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
      {/* Row 1: Style dropdown */}
      {hasStyleDropdown && (
        <div className={styles.compactRow}>
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
        </div>
      )}
      {/* Row 2: Color pickers */}
      <div className={styles.compactRow}>
        <ColorPreviewSelector
          label={useGradient ? 'Start' : 'Color'}
          value={colorStart}
          onChange={onColorStartChange}
          onPreviewChange={onColorStartChange}
          size="small"
        />
        {useGradient && (
          <>
            <span className={styles.colorArrow}>→</span>
            <ColorPreviewSelector
              label="End"
              value={colorEnd}
              onChange={onColorEndChange}
              onPreviewChange={onColorEndChange}
              size="small"
            />
          </>
        )}
      </div>
      {/* Row 3: Gradient toggle + type + rotation */}
      <div className={styles.compactRow}>
        <label className={styles.gradientToggle}>
          <input
            type="checkbox"
            checked={useGradient}
            onChange={(e) => onGradientToggle(e.target.checked)}
          />
          <span>Gradient</span>
        </label>
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
  updateField: <K extends keyof PendingQRSettings>(field: K, value: PendingQRSettings[K]) => void;
}

/**
 * Left Panel - Token Options (almanac toggle, labels)
 */
const TokenOptionsPanel = memo(function TokenOptionsPanel({
  pendingValue,
  updateField,
}: PanelSectionProps) {
  return (
    <div className={drawerStyles.column}>
      <div className={drawerStyles.sectionHeader}>Token Options</div>

      {/* Almanac */}
      <label className={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={pendingValue.almanac}
          onChange={(e) => updateField('almanac', e.target.checked)}
        />
        <span>Almanac</span>
      </label>

      {/* Show Label (sub-option) */}
      <label
        className={`${styles.checkboxRow} ${styles.subOption} ${pendingValue.almanac ? '' : styles.optionDisabled}`}
      >
        <input
          type="checkbox"
          checked={pendingValue.showAlmanacLabel}
          onChange={(e) => updateField('showAlmanacLabel', e.target.checked)}
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
  updateField,
}: PanelSectionProps) {
  return (
    <div className={drawerStyles.column}>
      {/* Dots Section */}
      <ColorSection
        label="Dots (Modules)"
        styleOptions={DOT_TYPES}
        styleValue={pendingValue.dotType}
        onStyleChange={(v) => updateField('dotType', v as QRDotType)}
        useGradient={pendingValue.dotsUseGradient}
        onGradientToggle={(v) => updateField('dotsUseGradient', v)}
        gradientType={pendingValue.dotsGradientType}
        onGradientTypeChange={(v) => updateField('dotsGradientType', v)}
        colorStart={pendingValue.dotsColorStart}
        colorEnd={pendingValue.dotsColorEnd}
        onColorStartChange={(v) => updateField('dotsColorStart', v)}
        onColorEndChange={(v) => updateField('dotsColorEnd', v)}
        rotation={pendingValue.dotsGradientRotation}
        onRotationChange={(v) => updateField('dotsGradientRotation', v)}
        showRotation={true}
      />

      <div className={styles.sectionDivider} />

      {/* Corner Squares Section */}
      <ColorSection
        label="Corner Squares"
        styleOptions={CORNER_SQUARE_TYPES}
        styleValue={pendingValue.cornerSquareType}
        onStyleChange={(v) => updateField('cornerSquareType', v as QRCornerSquareType)}
        useGradient={pendingValue.cornerSquareUseGradient}
        onGradientToggle={(v) => updateField('cornerSquareUseGradient', v)}
        gradientType={pendingValue.cornerSquareGradientType}
        onGradientTypeChange={(v) => updateField('cornerSquareGradientType', v)}
        colorStart={pendingValue.cornerSquareColorStart}
        colorEnd={pendingValue.cornerSquareColorEnd}
        onColorStartChange={(v) => updateField('cornerSquareColorStart', v)}
        onColorEndChange={(v) => updateField('cornerSquareColorEnd', v)}
        rotation={pendingValue.cornerSquareGradientRotation}
        onRotationChange={(v) => updateField('cornerSquareGradientRotation', v)}
        showRotation={true}
      />

      <div className={styles.sectionDivider} />

      {/* Corner Dots Section */}
      <ColorSection
        label="Corner Dots"
        styleOptions={CORNER_DOT_TYPES}
        styleValue={pendingValue.cornerDotType}
        onStyleChange={(v) => updateField('cornerDotType', v as QRCornerDotType)}
        useGradient={pendingValue.cornerDotUseGradient}
        onGradientToggle={(v) => updateField('cornerDotUseGradient', v)}
        gradientType={pendingValue.cornerDotGradientType}
        onGradientTypeChange={(v) => updateField('cornerDotGradientType', v)}
        colorStart={pendingValue.cornerDotColorStart}
        colorEnd={pendingValue.cornerDotColorEnd}
        onColorStartChange={(v) => updateField('cornerDotColorStart', v)}
        onColorEndChange={(v) => updateField('cornerDotColorEnd', v)}
        rotation={pendingValue.cornerDotGradientRotation}
        onRotationChange={(v) => updateField('cornerDotGradientRotation', v)}
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
  updateField,
}: PanelSectionProps) {
  return (
    <div className={drawerStyles.column}>
      {/* Background Section */}
      <div className={styles.colorSection}>
        <div className={styles.sectionHeader}>Background</div>
        {/* Row 1: Shape dropdown */}
        <div className={styles.compactRow}>
          <select
            value={pendingValue.backgroundRoundedCorners ? 'round' : 'square'}
            onChange={(e) => updateField('backgroundRoundedCorners', e.target.value === 'round')}
            className={styles.styleSelect}
          >
            <option value="square">Square</option>
            <option value="round">Rounded</option>
          </select>
        </div>
        {/* Row 2: Color pickers */}
        <div className={styles.compactRow}>
          <ColorPreviewSelector
            label={pendingValue.backgroundUseGradient ? 'Start' : 'Color'}
            value={pendingValue.backgroundColorStart}
            onChange={(color) => updateField('backgroundColorStart', color)}
            onPreviewChange={(color) => updateField('backgroundColorStart', color)}
            size="small"
          />
          {pendingValue.backgroundUseGradient && (
            <>
              <span className={styles.colorArrow}>→</span>
              <ColorPreviewSelector
                label="End"
                value={pendingValue.backgroundColorEnd}
                onChange={(color) => updateField('backgroundColorEnd', color)}
                onPreviewChange={(color) => updateField('backgroundColorEnd', color)}
                size="small"
              />
            </>
          )}
        </div>
        {/* Row 3: Gradient toggle + type + rotation */}
        <div className={styles.compactRow}>
          <label className={styles.gradientToggle}>
            <input
              type="checkbox"
              checked={pendingValue.backgroundUseGradient}
              onChange={(e) => updateField('backgroundUseGradient', e.target.checked)}
            />
            <span>Gradient</span>
          </label>
          {pendingValue.backgroundUseGradient && (
            <select
              value={pendingValue.backgroundGradientType}
              onChange={(e) =>
                updateField('backgroundGradientType', e.target.value as QRGradientType)
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
                onChange={(v) => updateField('backgroundGradientRotation', v)}
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
        {/* Row 4: Opacity slider */}
        <div className={styles.sliderRow}>
          <EditableSlider
            label="Opacity"
            value={pendingValue.backgroundOpacity}
            onChange={(v) => updateField('backgroundOpacity', v)}
            min={0}
            max={100}
            step={5}
            suffix="%"
            defaultValue={100}
          />
        </div>
      </div>

      <div className={styles.sectionDivider} />

      {/* Image Options Section */}
      <div className={styles.colorSection}>
        <div className={styles.sectionHeader}>Center Image</div>
        <div className={styles.compactRow}>
          <select
            value={pendingValue.imageSource}
            onChange={(e) =>
              updateField('imageSource', e.target.value as 'none' | 'script-name' | 'script-logo')
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
                onChange={(e) => updateField('imageHideBackgroundDots', e.target.checked)}
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
                onChange={(v) => updateField('imageSize', v)}
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
                onChange={(v) => updateField('imageMargin', v)}
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

export const QRCodeDrawer = memo(function QRCodeDrawer({
  isOpen,
  onClose,
  generationOptions,
  onOptionChange,
}: QRCodeDrawerProps) {
  // Create initial settings from generation options
  const initialSettings = useMemo(
    () =>
      createSettingsFromOptions(
        generationOptions.qrCodeOptions,
        generationOptions.almanacToken !== false
      ),
    [generationOptions.qrCodeOptions, generationOptions.almanacToken]
  );

  // Internal pending state
  const [pendingSettings, setPendingSettings] = useState<PendingQRSettings>(initialSettings);

  // Sync pending settings when drawer opens (reset to current values)
  useEffect(() => {
    if (isOpen) {
      setPendingSettings(initialSettings);
    }
  }, [isOpen, initialSettings]);

  // Update a single field in pending settings
  const updateField = useCallback(
    <K extends keyof PendingQRSettings>(field: K, value: PendingQRSettings[K]) => {
      setPendingSettings((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // Apply changes and close
  const handleApply = useCallback(() => {
    onOptionChange({
      almanacToken: pendingSettings.almanac,
      qrCodeOptions: settingsToQROptions(pendingSettings),
    });
    onClose();
  }, [onOptionChange, onClose, pendingSettings]);

  // Reset to defaults
  const handleReset = useCallback(() => {
    setPendingSettings(DEFAULT_QR_SETTINGS);
  }, []);

  // QR icon for title (decorative, aria-hidden)
  const qrTitleIcon = (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      style={{ fill: 'currentColor' }}
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="3" height="3" rx="0.5" />
      <rect x="18" y="14" width="3" height="3" rx="0.5" />
      <rect x="14" y="18" width="3" height="3" rx="0.5" />
      <rect x="18" y="18" width="3" height="3" rx="0.5" />
    </svg>
  );

  return (
    <SettingsDrawer
      isOpen={isOpen}
      onClose={onClose}
      onApply={handleApply}
      onReset={handleReset}
      title="QR Tokens"
      titleIcon={qrTitleIcon}
      ariaLabel="QR code token settings"
    >
      <TokenOptionsPanel pendingValue={pendingSettings} updateField={updateField} />
      <QRStylingPanel pendingValue={pendingSettings} updateField={updateField} />
      <BackgroundImagePanel pendingValue={pendingSettings} updateField={updateField} />
    </SettingsDrawer>
  );
});

export default QRCodeDrawer;
