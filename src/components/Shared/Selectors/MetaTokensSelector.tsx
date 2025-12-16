/**
 * MetaTokensSelector Component
 *
 * A simple one-panel settings selector for meta token generation.
 * Controls which meta tokens to include: Pandemonium, Script Name.
 *
 * Note: QR-based tokens (Almanac, Shareable Script) are managed separately
 * in QRCodeSettingsSelector.
 *
 * @module components/Shared/MetaTokensSelector
 */

import { memo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useExpandablePanel } from '../../../hooks/useExpandablePanel';
import optionStyles from '../../../styles/components/options/OptionsPanel.module.css';
import baseStyles from '../../../styles/components/shared/SettingsSelectorBase.module.css';
import styles from '../../../styles/components/shared/SimplePanelSelector.module.css';
import type { GenerationOptions } from '../../../ts/types/index';
import { InfoSection, PreviewBox, SettingsSelectorBase } from './SettingsSelectorBase';

export interface MetaTokensSelectorProps {
  generationOptions: GenerationOptions;
  onOptionChange: (options: Partial<GenerationOptions>) => void;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  ariaLabel?: string;
}

interface PendingMetaSettings {
  pandemonium: boolean;
  scriptName: boolean;
  showAuthor: boolean;
}

// ============================================================================
// Preview Component
// ============================================================================

const MetaPreview = memo(function MetaPreview({ enabledCount }: { enabledCount: number }) {
  return (
    <div
      className={`${styles.previewContainer} ${enabledCount === 0 ? styles.previewDisabled : ''}`}
    >
      <span className={styles.previewIcon}>📋</span>
      {enabledCount > 0 && <span className={styles.previewBadge}>{enabledCount}</span>}
    </div>
  );
});

// ============================================================================
// Component
// ============================================================================

export const MetaTokensSelector = memo(function MetaTokensSelector({
  generationOptions,
  onOptionChange,
  size = 'medium',
  disabled = false,
  ariaLabel,
}: MetaTokensSelectorProps) {
  const currentSettings: PendingMetaSettings = {
    pandemonium: generationOptions.pandemoniumToken !== false,
    scriptName: generationOptions.scriptNameToken !== false,
    showAuthor: !(generationOptions.hideScriptNameAuthor ?? false),
  };

  const countEnabled = (settings: PendingMetaSettings) => {
    let count = 0;
    if (settings.pandemonium) count++;
    if (settings.scriptName) count++;
    return count;
  };

  const enabledCount = countEnabled(currentSettings);
  const isEnabled = enabledCount > 0;

  const handleToggle = useCallback(
    (enabled: boolean) => {
      onOptionChange({
        pandemoniumToken: enabled,
        scriptNameToken: enabled,
      });
    },
    [onOptionChange]
  );

  const handlePanelChange = useCallback(
    (settings: PendingMetaSettings) => {
      onOptionChange({
        pandemoniumToken: settings.pandemonium,
        scriptNameToken: settings.scriptName,
        hideScriptNameAuthor: !settings.showAuthor,
      });
    },
    [onOptionChange]
  );

  const panel = useExpandablePanel<PendingMetaSettings>({
    value: currentSettings,
    onChange: handlePanelChange,
    onPreviewChange: handlePanelChange,
    disabled,
    panelHeight: 180,
    minPanelWidth: 220,
  });

  const displaySettings = panel.isExpanded ? panel.pendingValue : currentSettings;
  const displayCount = countEnabled(displaySettings);

  const getSummary = () => {
    if (displayCount === 0) return 'None';
    const parts: string[] = [];
    if (displaySettings.pandemonium) parts.push('Pandemonium');
    if (displaySettings.scriptName) parts.push('Script');
    return parts.join(', ');
  };

  const defaultSettings: PendingMetaSettings = {
    pandemonium: true,
    scriptName: true,
    showAuthor: true,
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
          <div className={styles.panelTitle}>Meta Tokens</div>

          {/* Pandemonium */}
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={panel.pendingValue.pandemonium}
              onChange={(e) => panel.updatePendingField('pandemonium', e.target.checked)}
            />
            <span>Pandemonium Institute</span>
          </label>

          {/* Script Name */}
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={panel.pendingValue.scriptName}
              onChange={(e) => panel.updatePendingField('scriptName', e.target.checked)}
            />
            <span>Script Name</span>
          </label>

          {/* Show Author (sub-option) */}
          <label
            className={`${styles.checkboxRow} ${styles.subOption} ${!panel.pendingValue.scriptName ? styles.optionDisabled : ''}`}
          >
            <input
              type="checkbox"
              checked={panel.pendingValue.showAuthor}
              onChange={(e) => panel.updatePendingField('showAuthor', e.target.checked)}
              disabled={!panel.pendingValue.scriptName}
            />
            <span>Show Author</span>
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
          <MetaPreview enabledCount={displayCount} />
        </PreviewBox>
      }
      info={<InfoSection label="Meta Tokens" summary={getSummary()} />}
      headerSlot={EnableToggle}
      actionLabel="Customize"
      onAction={panel.toggle}
      isExpanded={panel.isExpanded}
      disabled={disabled}
      visuallyDisabled={!isEnabled}
      size={size}
      ariaLabel={ariaLabel ?? 'Meta tokens settings'}
      onKeyDown={panel.handleKeyDown}
    >
      {renderPanel()}
    </SettingsSelectorBase>
  );
});

export default MetaTokensSelector;
