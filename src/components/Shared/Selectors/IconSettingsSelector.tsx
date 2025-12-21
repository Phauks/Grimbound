/**
 * IconSettingsSelector Component
 *
 * A comprehensive icon positioning control that combines scale, horizontal offset,
 * and vertical offset into a unified, easy-to-use component.
 *
 * Features:
 * - Visual preview with icon positioning applied
 * - Expandable panel with organized slider controls
 * - Portal-based panel to avoid overflow clipping
 * - Smart upward/downward opening based on viewport space
 * - Reset/Cancel/Apply workflow
 *
 * Uses SettingsSelectorBase for consistent styling and useExpandablePanel
 * for panel management.
 *
 * @module components/Shared/IconSettingsSelector
 */

import { memo } from 'react';
import { createPortal } from 'react-dom';
import { useExpandablePanel } from '@/hooks';
import iconStyles from '@/styles/components/shared/IconSettingsSelector.module.css';
import baseStyles from '@/styles/components/shared/SettingsSelectorBase.module.css';
import styles from '@/styles/components/shared/SimplePanelSelector.module.css';
import type { MeasurementUnit } from '@/ts/types/measurement';
import { ICON_OFFSET_CONFIG } from '@/ts/utils/measurementUtils';
import { EditableSlider } from '@/components/Shared/Controls/EditableSlider';
import { MeasurementSlider } from '@/components/Shared/Controls/MeasurementSlider';
import { InfoSection, PreviewBox, SettingsSelectorBase } from './SettingsSelectorBase';

// ============================================================================
// Types
// ============================================================================

export interface IconSettings {
  /** Icon scale multiplier (0.5x to 2.0x) */
  scale: number;
  /** Horizontal offset in inches */
  offsetX: number;
  /** Vertical offset in inches */
  offsetY: number;
}

export interface IconSettingsSelectorProps {
  /** Current icon settings */
  value: IconSettings;
  /** Called when settings are confirmed (on Apply or panel close) */
  onChange: (settings: IconSettings) => void;
  /** Called on every change for live preview (optional) */
  onPreviewChange?: (settings: IconSettings) => void;
  /** User's preferred measurement unit */
  displayUnit?: MeasurementUnit;
  /** Token type for labeling */
  tokenType?: 'character' | 'reminder' | 'meta';
  /** Optional URL for the preview icon image */
  previewIconUrl?: string;
  /** Component size variant */
  size?: 'small' | 'medium' | 'large';
  /** Disabled state */
  disabled?: boolean;
  /** Aria label for accessibility */
  ariaLabel?: string;
}

// ============================================================================
// Default Settings
// ============================================================================

const DEFAULT_SETTINGS: IconSettings = {
  scale: 1.0,
  offsetX: 0,
  offsetY: 0,
};

// ============================================================================
// Token Type Icons - Representative icons for each token type
// ============================================================================

const TokenTypeIcon = ({ tokenType }: { tokenType: 'character' | 'reminder' | 'meta' }) => {
  switch (tokenType) {
    case 'character':
      // Person/character silhouette - represents the main character icon
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="7" r="4" />
          <path d="M12 14c-6 0-8 3-8 5v2h16v-2c0-2-2-5-8-5z" />
        </svg>
      );
    case 'reminder':
      // Small reminder token - thought bubble/note
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="8" opacity="0.9" />
          <text
            x="12"
            y="16"
            textAnchor="middle"
            fontSize="10"
            fill="var(--bg-primary)"
            fontWeight="bold"
          >
            R
          </text>
        </svg>
      );
    case 'meta':
      // Scroll/script icon for meta tokens
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10" />
        </svg>
      );
  }
};

// ============================================================================
// Icon Preview Component
// ============================================================================

const IconPreview = memo(function IconPreview({
  settings,
  previewIconUrl,
  tokenType,
}: {
  settings: IconSettings;
  previewIconUrl?: string;
  tokenType: 'character' | 'reminder' | 'meta';
}) {
  return (
    <div className={iconStyles.previewContainer}>
      <div
        className={iconStyles.iconPreview}
        style={{
          transform: `scale(${settings.scale * 0.8}) translate(${settings.offsetX * 40}px, ${-settings.offsetY * 40}px)`,
        }}
      >
        {previewIconUrl ? (
          <img src={previewIconUrl} alt="Token icon" className={iconStyles.previewIconImg} />
        ) : (
          <TokenTypeIcon tokenType={tokenType} />
        )}
      </div>
    </div>
  );
});

// ============================================================================
// Component
// ============================================================================

export const IconSettingsSelector = memo(function IconSettingsSelector({
  value,
  onChange,
  onPreviewChange,
  displayUnit = 'inches',
  tokenType = 'character',
  previewIconUrl,
  size = 'medium',
  disabled = false,
  ariaLabel,
}: IconSettingsSelectorProps) {
  // Use the shared expandable panel hook
  const panel = useExpandablePanel<IconSettings>({
    value,
    onChange,
    onPreviewChange,
    disabled,
    panelHeight: 200,
    minPanelWidth: 240,
  });

  const displaySettings = panel.isExpanded ? panel.pendingValue : value;

  // Get token type display name
  const tokenTypeLabel = tokenType.charAt(0).toUpperCase() + tokenType.slice(1);

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
        <div className={styles.panelContent}>
          <div className={styles.panelTitle}>{tokenTypeLabel} Icon</div>

          {/* Scale */}
          <div className={iconStyles.sliderGroup}>
            <EditableSlider
              label="Scale"
              value={panel.pendingValue.scale}
              onChange={(val) => panel.updatePendingField('scale', val)}
              min={0.5}
              max={2.0}
              step={0.1}
              suffix="x"
              defaultValue={DEFAULT_SETTINGS.scale}
              ariaLabel={`${tokenTypeLabel} Icon Scale`}
            />
          </div>

          {/* Offset X */}
          <div className={iconStyles.sliderGroup}>
            <MeasurementSlider
              label="Offset X"
              value={panel.pendingValue.offsetX}
              onChange={(val) => panel.updatePendingField('offsetX', val)}
              config={ICON_OFFSET_CONFIG}
              displayUnit={displayUnit}
              ariaLabel={`${tokenTypeLabel} Icon Horizontal Offset`}
            />
          </div>

          {/* Offset Y */}
          <div className={iconStyles.sliderGroup}>
            <MeasurementSlider
              label="Offset Y"
              value={panel.pendingValue.offsetY}
              onChange={(val) => panel.updatePendingField('offsetY', val)}
              config={ICON_OFFSET_CONFIG}
              displayUnit={displayUnit}
              ariaLabel={`${tokenTypeLabel} Icon Vertical Offset`}
            />
          </div>
        </div>

        {/* Panel Footer */}
        <div className={baseStyles.panelFooter}>
          <button
            type="button"
            className={baseStyles.resetLink}
            onClick={() => panel.reset(DEFAULT_SETTINGS)}
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
          <IconPreview
            settings={displaySettings}
            previewIconUrl={previewIconUrl}
            tokenType={tokenType}
          />
        </PreviewBox>
      }
      info={<InfoSection label="Icon" />}
      actionLabel="Customize"
      onAction={panel.toggle}
      isExpanded={panel.isExpanded}
      disabled={disabled}
      size={size}
      ariaLabel={ariaLabel ?? `${tokenTypeLabel} icon settings`}
      onKeyDown={panel.handleKeyDown}
    >
      {renderPanel()}
    </SettingsSelectorBase>
  );
});

export default IconSettingsSelector;
