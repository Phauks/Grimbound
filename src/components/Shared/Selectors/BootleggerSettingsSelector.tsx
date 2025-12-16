/**
 * BootleggerSettingsSelector Component
 *
 * A simple one-panel settings selector for bootlegger token generation.
 * Controls icon type, normalize icons, and hide name options.
 *
 * @module components/Shared/BootleggerSettingsSelector
 */

import { memo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useExpandablePanel } from '../../../hooks/useExpandablePanel';
import optionStyles from '../../../styles/components/options/OptionsPanel.module.css';
import baseStyles from '../../../styles/components/shared/SettingsSelectorBase.module.css';
import styles from '../../../styles/components/shared/SimplePanelSelector.module.css';
import type { BootleggerIconType, GenerationOptions } from '../../../ts/types/index';
import { InfoSection, PreviewBox, SettingsSelectorBase } from './SettingsSelectorBase';

export interface BootleggerSettingsSelectorProps {
  generationOptions: GenerationOptions;
  onOptionChange: (options: Partial<GenerationOptions>) => void;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  ariaLabel?: string;
}

interface PendingBootleggerSettings {
  enabled: boolean;
  iconType: BootleggerIconType;
  normalizeIcons: boolean;
  hideName: boolean;
}

// ============================================================================
// Preview Component
// ============================================================================

const BootleggerPreview = memo(function BootleggerPreview({
  enabled,
  iconType,
}: {
  enabled: boolean;
  iconType: BootleggerIconType;
}) {
  return (
    <div className={`${styles.previewContainer} ${!enabled ? styles.previewDisabled : ''}`}>
      <span className={styles.previewIcon}>{iconType === 'script' ? '📜' : '🥃'}</span>
    </div>
  );
});

// ============================================================================
// Component
// ============================================================================

export const BootleggerSettingsSelector = memo(function BootleggerSettingsSelector({
  generationOptions,
  onOptionChange,
  size = 'medium',
  disabled = false,
  ariaLabel,
}: BootleggerSettingsSelectorProps) {
  const currentSettings: PendingBootleggerSettings = {
    enabled: generationOptions.generateBootleggerRules ?? true,
    iconType: generationOptions.bootleggerIconType ?? 'bootlegger',
    normalizeIcons: generationOptions.bootleggerNormalizeIcons ?? false,
    hideName: generationOptions.bootleggerHideName ?? false,
  };

  const isEnabled = currentSettings.enabled;

  const handleToggle = useCallback(
    (enabled: boolean) => {
      onOptionChange({ generateBootleggerRules: enabled });
    },
    [onOptionChange]
  );

  const handlePanelChange = useCallback(
    (settings: PendingBootleggerSettings) => {
      onOptionChange({
        generateBootleggerRules: settings.enabled,
        bootleggerIconType: settings.iconType,
        bootleggerNormalizeIcons: settings.normalizeIcons,
        bootleggerHideName: settings.hideName,
      });
    },
    [onOptionChange]
  );

  const panel = useExpandablePanel<PendingBootleggerSettings>({
    value: currentSettings,
    onChange: handlePanelChange,
    onPreviewChange: handlePanelChange,
    disabled,
    panelHeight: 200,
    minPanelWidth: 240,
  });

  const displaySettings = panel.isExpanded ? panel.pendingValue : currentSettings;

  const getSummary = () => {
    if (!displaySettings.enabled) return 'Disabled';
    return displaySettings.iconType === 'script' ? 'Script icon' : 'Bootlegger icon';
  };

  const defaultSettings: PendingBootleggerSettings = {
    enabled: true,
    iconType: 'bootlegger',
    normalizeIcons: false,
    hideName: false,
  };

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
          <div className={styles.panelTitle}>Bootlegger</div>

          {/* Icon Type */}
          <div className={styles.settingRow}>
            <span className={styles.settingLabel}>Icon</span>
            <div className={styles.toggleGroup}>
              <button
                type="button"
                className={`${styles.toggleBtn} ${panel.pendingValue.iconType === 'bootlegger' ? styles.toggleBtnActive : ''}`}
                onClick={() => panel.updatePendingField('iconType', 'bootlegger')}
                disabled={!panel.pendingValue.enabled}
              >
                Bootlegger
              </button>
              <button
                type="button"
                className={`${styles.toggleBtn} ${panel.pendingValue.iconType === 'script' ? styles.toggleBtnActive : ''}`}
                onClick={() => panel.updatePendingField('iconType', 'script')}
                disabled={!panel.pendingValue.enabled}
              >
                Script
              </button>
            </div>
          </div>

          {/* Normalize Icons */}
          <label
            className={`${styles.checkboxRow} ${!panel.pendingValue.enabled ? styles.optionDisabled : ''}`}
          >
            <input
              type="checkbox"
              checked={panel.pendingValue.normalizeIcons}
              onChange={(e) => panel.updatePendingField('normalizeIcons', e.target.checked)}
              disabled={!panel.pendingValue.enabled}
            />
            <span>Normalize Icon Sizes</span>
          </label>

          {/* Hide Name */}
          <label
            className={`${styles.checkboxRow} ${!panel.pendingValue.enabled ? styles.optionDisabled : ''}`}
          >
            <input
              type="checkbox"
              checked={panel.pendingValue.hideName}
              onChange={(e) => panel.updatePendingField('hideName', e.target.checked)}
              disabled={!panel.pendingValue.enabled}
            />
            <span>Hide "Bootlegger" Name</span>
          </label>
        </div>

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

  return (
    <SettingsSelectorBase
      ref={panel.containerRef}
      preview={
        <PreviewBox shape="square" size={size}>
          <BootleggerPreview
            enabled={displaySettings.enabled}
            iconType={displaySettings.iconType}
          />
        </PreviewBox>
      }
      info={<InfoSection label="Bootlegger" summary={getSummary()} />}
      headerSlot={EnableToggle}
      actionLabel="Customize"
      onAction={panel.toggle}
      isExpanded={panel.isExpanded}
      disabled={disabled}
      visuallyDisabled={!isEnabled}
      size={size}
      ariaLabel={ariaLabel ?? 'Bootlegger token settings'}
      onKeyDown={panel.handleKeyDown}
    >
      {renderPanel()}
    </SettingsSelectorBase>
  );
});

export default BootleggerSettingsSelector;
