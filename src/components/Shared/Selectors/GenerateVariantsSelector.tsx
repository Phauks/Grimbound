/**
 * GenerateVariantsSelector Component
 *
 * A simple one-panel settings selector for generating token variants.
 * Controls character and reminder token variant generation.
 *
 * @module components/Shared/GenerateVariantsSelector
 */

import { memo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useExpandablePanel } from '@/hooks/useExpandablePanel';
import optionStyles from '@/styles/components/options/OptionsPanel.module.css';
import baseStyles from '@/styles/components/shared/SettingsSelectorBase.module.css';
import styles from '@/styles/components/shared/SimplePanelSelector.module.css';
import type { GenerationOptions } from '@/ts/types/index';
import { InfoSection, PreviewBox, SettingsSelectorBase } from './SettingsSelectorBase';

export interface GenerateVariantsSelectorProps {
  generationOptions: GenerationOptions;
  onOptionChange: (options: Partial<GenerationOptions>) => void;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  ariaLabel?: string;
}

interface PendingVariantSettings {
  characterVariants: boolean;
  reminderVariants: boolean;
}

// ============================================================================
// Preview Component
// ============================================================================

const VariantPreview = memo(function VariantPreview({ isEnabled }: { isEnabled: boolean }) {
  return (
    <div className={`${styles.previewContainer} ${!isEnabled ? styles.previewDisabled : ''}`}>
      <span className={styles.previewIcon}>🎭</span>
    </div>
  );
});

// ============================================================================
// Component
// ============================================================================

export const GenerateVariantsSelector = memo(function GenerateVariantsSelector({
  generationOptions,
  onOptionChange,
  size = 'medium',
  disabled = false,
  ariaLabel,
}: GenerateVariantsSelectorProps) {
  const characterVariantsEnabled = generationOptions.generateImageVariants ?? false;
  const reminderVariantsEnabled = generationOptions.generateReminderVariants ?? false;
  const isEnabled = characterVariantsEnabled || reminderVariantsEnabled;

  const currentSettings: PendingVariantSettings = {
    characterVariants: characterVariantsEnabled,
    reminderVariants: reminderVariantsEnabled,
  };

  const handleToggle = useCallback(
    (enabled: boolean) => {
      onOptionChange({
        generateImageVariants: enabled,
        generateReminderVariants: enabled,
      });
    },
    [onOptionChange]
  );

  const handlePanelChange = useCallback(
    (settings: PendingVariantSettings) => {
      onOptionChange({
        generateImageVariants: settings.characterVariants,
        generateReminderVariants: settings.reminderVariants,
      });
    },
    [onOptionChange]
  );

  const panel = useExpandablePanel<PendingVariantSettings>({
    value: currentSettings,
    onChange: handlePanelChange,
    onPreviewChange: handlePanelChange,
    disabled,
    panelHeight: 150,
    minPanelWidth: 220,
  });

  const displaySettings = panel.isExpanded ? panel.pendingValue : currentSettings;

  const getSummary = () => {
    if (!(displaySettings.characterVariants || displaySettings.reminderVariants)) {
      return 'Disabled';
    }
    const parts: string[] = [];
    if (displaySettings.characterVariants) parts.push('Character');
    if (displaySettings.reminderVariants) parts.push('Reminder');
    return parts.join(' + ');
  };

  const defaultSettings: PendingVariantSettings = {
    characterVariants: false,
    reminderVariants: false,
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
          <div className={styles.panelTitle}>Variants</div>

          {/* Character Variants */}
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={panel.pendingValue.characterVariants}
              onChange={(e) => panel.updatePendingField('characterVariants', e.target.checked)}
            />
            <span>Character Variants</span>
          </label>

          {/* Reminder Variants */}
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={panel.pendingValue.reminderVariants}
              onChange={(e) => panel.updatePendingField('reminderVariants', e.target.checked)}
            />
            <span>Reminder Variants</span>
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
          <VariantPreview isEnabled={isEnabled} />
        </PreviewBox>
      }
      info={<InfoSection label="Variants" />}
      headerSlot={EnableToggle}
      actionLabel="Customize"
      onAction={panel.toggle}
      isExpanded={panel.isExpanded}
      disabled={disabled}
      visuallyDisabled={!isEnabled}
      size={size}
      ariaLabel={ariaLabel ?? 'Generate variants settings'}
      onKeyDown={panel.handleKeyDown}
    >
      {renderPanel()}
    </SettingsSelectorBase>
  );
});

export default GenerateVariantsSelector;
