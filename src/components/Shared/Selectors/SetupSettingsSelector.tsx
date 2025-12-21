/**
 * SetupSettingsSelector Component
 *
 * A simple settings selector for setup overlay display on tokens.
 * Shows setup asset preview with On/Off toggle.
 * Clicking "Customize" opens the asset manager modal directly.
 *
 * @module components/Shared/SetupSettingsSelector
 */

import { memo, useCallback, useState } from 'react';
import optionStyles from '@/styles/components/options/OptionsPanel.module.css';
import styles from '@/styles/components/shared/SimplePanelSelector.module.css';
import { CONFIG } from '@/ts/config';
import { BUILT_IN_SETUP_OVERLAYS } from '@/ts/constants/builtInAssets';
import type { GenerationOptions } from '@/ts/types/index';
import { AssetManagerModal } from '@/components/Modals/AssetManagerModal';
import { InfoSection, PreviewBox, SettingsSelectorBase } from './SettingsSelectorBase';

export interface SetupSettingsSelectorProps {
  generationOptions: GenerationOptions;
  onOptionChange: (options: Partial<GenerationOptions>) => void;
  projectId?: string;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  ariaLabel?: string;
}

// ============================================================================
// Preview Component
// ============================================================================

const SetupPreview = memo(function SetupPreview({
  setupStyle,
  isEnabled,
}: {
  setupStyle: string;
  isEnabled: boolean;
}) {
  const getSetupPreviewSrc = () => {
    if (!setupStyle || setupStyle === 'none') return null;
    return `${CONFIG.ASSETS.SETUP_OVERLAYS}${setupStyle}.webp`;
  };

  const previewSrc = getSetupPreviewSrc();

  return (
    <div className={`${styles.previewContainer} ${!isEnabled ? styles.previewDisabled : ''}`}>
      {previewSrc ? (
        <img
          src={previewSrc}
          alt={`${setupStyle} setup overlay`}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <span className={styles.previewIcon}>🌸</span>
      )}
    </div>
  );
});

// ============================================================================
// Component
// ============================================================================

export const SetupSettingsSelector = memo(function SetupSettingsSelector({
  generationOptions,
  onOptionChange,
  projectId,
  size = 'medium',
  disabled = false,
  ariaLabel,
}: SetupSettingsSelectorProps) {
  const [showAssetModal, setShowAssetModal] = useState(false);

  const currentSetup = generationOptions.setupStyle || 'setup_flower_1';
  const isEnabled = currentSetup !== 'none';

  // Store last selected setup for when toggling back on
  const [lastSetup, setLastSetup] = useState(isEnabled ? currentSetup : 'setup_flower_1');

  const handleToggle = useCallback(
    (enabled: boolean) => {
      if (enabled) {
        onOptionChange({ setupStyle: lastSetup });
      } else {
        if (currentSetup !== 'none') {
          setLastSetup(currentSetup);
        }
        onOptionChange({ setupStyle: 'none' });
      }
    },
    [onOptionChange, currentSetup, lastSetup]
  );

  const handleAssetChange = useCallback(
    (assetId: string) => {
      onOptionChange({ setupStyle: assetId });
      setLastSetup(assetId);
      setShowAssetModal(false);
    },
    [onOptionChange]
  );

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

  return (
    <>
      <SettingsSelectorBase
        preview={
          <PreviewBox shape="square" size={size}>
            <SetupPreview setupStyle={isEnabled ? currentSetup : 'none'} isEnabled={isEnabled} />
          </PreviewBox>
        }
        info={<InfoSection label="Setup" />}
        headerSlot={EnableToggle}
        actionLabel="Change"
        onAction={() => setShowAssetModal(true)}
        isExpanded={false}
        disabled={disabled}
        visuallyDisabled={!isEnabled}
        size={size}
        ariaLabel={ariaLabel ?? 'Setup overlay settings'}
      />

      {showAssetModal && (
        <AssetManagerModal
          isOpen={showAssetModal}
          onClose={() => setShowAssetModal(false)}
          onSelectAsset={handleAssetChange}
          initialAssetType="setup-overlay"
          selectionMode={true}
          includeBuiltIn={true}
          projectId={projectId}
          generationOptions={generationOptions}
        />
      )}
    </>
  );
});

export default SetupSettingsSelector;
