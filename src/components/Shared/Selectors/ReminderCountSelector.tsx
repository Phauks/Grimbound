/**
 * ReminderCountSelector Component
 *
 * A simple settings selector for reminder count display on character tokens.
 * Shows count preview with On/Off toggle and style selection (Arabic or Roman).
 *
 * Uses SimplePanelSelector pattern for consistent styling with other option panels.
 *
 * @module components/Shared/ReminderCountSelector
 */

import { memo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useExpandablePanel } from '@/hooks/useExpandablePanel';
import optionStyles from '@/styles/components/options/OptionsPanel.module.css';
import baseStyles from '@/styles/components/shared/SettingsSelectorBase.module.css';
import styles from '@/styles/components/shared/SimplePanelSelector.module.css';
import type { GenerationOptions, ReminderCountStyle } from '@/ts/types/index';
import { InfoSection, PreviewBox, SettingsSelectorBase } from './SettingsSelectorBase';

export interface ReminderCountSelectorProps {
  generationOptions: GenerationOptions;
  onOptionChange: (options: Partial<GenerationOptions>) => void;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  ariaLabel?: string;
}

// Simplified to just Arabic and Roman
const NUMBER_STYLES: { value: ReminderCountStyle; label: string; preview: string }[] = [
  { value: 'arabic', label: 'Arabic', preview: '3' },
  { value: 'roman', label: 'Roman', preview: 'III' },
];

interface PendingCountSettings {
  style: ReminderCountStyle;
}

// ============================================================================
// Preview Component
// ============================================================================

const CountPreview = memo(function CountPreview({
  style,
  isEnabled,
}: {
  style: ReminderCountStyle;
  isEnabled: boolean;
}) {
  const previewText = style === 'roman' ? 'III' : '3';

  return (
    <div className={`${styles.previewContainer} ${!isEnabled ? styles.previewDisabled : ''}`}>
      <span className={styles.previewIcon}>{previewText}</span>
    </div>
  );
});

// ============================================================================
// Component
// ============================================================================

export const ReminderCountSelector = memo(function ReminderCountSelector({
  generationOptions,
  onOptionChange,
  size = 'medium',
  disabled = false,
  ariaLabel,
}: ReminderCountSelectorProps) {
  const isEnabled = generationOptions.tokenCount !== false;
  // Map old styles to new ones (circled/dots -> arabic)
  let currentStyle = generationOptions.reminderCountStyle || 'arabic';
  if (currentStyle === 'circled' || currentStyle === 'dots') {
    currentStyle = 'arabic';
  }

  const currentSettings: PendingCountSettings = {
    style: currentStyle,
  };

  const handleToggle = useCallback(
    (enabled: boolean) => {
      onOptionChange({ tokenCount: enabled });
    },
    [onOptionChange]
  );

  const handlePanelChange = useCallback(
    (settings: PendingCountSettings) => {
      onOptionChange({ reminderCountStyle: settings.style });
    },
    [onOptionChange]
  );

  const panel = useExpandablePanel<PendingCountSettings>({
    value: currentSettings,
    onChange: handlePanelChange,
    onPreviewChange: handlePanelChange,
    disabled,
    panelHeight: 140,
    minPanelWidth: 200,
  });

  const displaySettings = panel.isExpanded ? panel.pendingValue : currentSettings;

  const getSummary = () => {
    if (!isEnabled) return 'Disabled';
    return displaySettings.style === 'roman' ? 'Roman' : 'Arabic';
  };

  const defaultSettings: PendingCountSettings = {
    style: 'arabic',
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
          <div className={styles.panelTitle}>Count Style</div>

          {/* Style Toggle */}
          <div className={styles.settingRow}>
            <span className={styles.settingLabel}>Format</span>
            <div className={styles.toggleGroup}>
              {NUMBER_STYLES.map((styleOption) => (
                <button
                  key={styleOption.value}
                  type="button"
                  className={`${styles.toggleBtn} ${
                    panel.pendingValue.style === styleOption.value ? styles.toggleBtnActive : ''
                  }`}
                  onClick={() => panel.updatePendingField('style', styleOption.value)}
                  disabled={!isEnabled}
                >
                  {styleOption.label}
                </button>
              ))}
            </div>
          </div>
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
          <CountPreview style={displaySettings.style} isEnabled={isEnabled} />
        </PreviewBox>
      }
      info={<InfoSection label="Count" />}
      headerSlot={EnableToggle}
      actionLabel="Customize"
      onAction={panel.toggle}
      isExpanded={panel.isExpanded}
      disabled={disabled}
      visuallyDisabled={!isEnabled}
      size={size}
      ariaLabel={ariaLabel ?? 'Reminder count settings'}
      onKeyDown={panel.handleKeyDown}
    >
      {renderPanel()}
    </SettingsSelectorBase>
  );
});

export default ReminderCountSelector;
