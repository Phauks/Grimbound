/**
 * SetupSettingsSelector Component
 *
 * A simple settings selector for setup flower display on tokens.
 * Shows flower asset preview with On/Off toggle.
 * Clicking "Customize" opens the asset manager modal directly.
 *
 * @module components/Shared/SetupSettingsSelector
 */

import { memo, useCallback, useState } from 'react';
import optionStyles from '../../../styles/components/options/OptionsPanel.module.css';
import styles from '../../../styles/components/shared/SimplePanelSelector.module.css';
import { CONFIG } from '../../../ts/config';
import { BUILT_IN_FLOWERS } from '../../../ts/constants/builtInAssets';
import type { GenerationOptions } from '../../../ts/types/index';
import { AssetManagerModal } from '../../Modals/AssetManagerModal';
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

const FlowerPreview = memo(function FlowerPreview({
  flowerStyle,
  isEnabled,
}: {
  flowerStyle: string;
  isEnabled: boolean;
}) {
  const getFlowerPreviewSrc = () => {
    if (!flowerStyle || flowerStyle === 'none') return null;
    return `${CONFIG.ASSETS.SETUP_FLOWERS}${flowerStyle}.webp`;
  };

  const previewSrc = getFlowerPreviewSrc();

  return (
    <div className={`${styles.previewContainer} ${!isEnabled ? styles.previewDisabled : ''}`}>
      {previewSrc ? (
        <img
          src={previewSrc}
          alt={`${flowerStyle} setup flower`}
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

  const currentFlower = generationOptions.setupFlowerStyle || 'setup_flower_1';
  const isEnabled = currentFlower !== 'none';

  // Store last selected flower for when toggling back on
  const [lastFlower, setLastFlower] = useState(isEnabled ? currentFlower : 'setup_flower_1');

  const handleToggle = useCallback(
    (enabled: boolean) => {
      if (enabled) {
        onOptionChange({ setupFlowerStyle: lastFlower });
      } else {
        if (currentFlower !== 'none') {
          setLastFlower(currentFlower);
        }
        onOptionChange({ setupFlowerStyle: 'none' });
      }
    },
    [onOptionChange, currentFlower, lastFlower]
  );

  const handleAssetChange = useCallback(
    (assetId: string) => {
      onOptionChange({ setupFlowerStyle: assetId });
      setLastFlower(assetId);
      setShowAssetModal(false);
    },
    [onOptionChange]
  );

  const getFlowerLabel = () => {
    if (!isEnabled) return 'Disabled';
    const flower = BUILT_IN_FLOWERS.find((f) => f.id === currentFlower);
    return flower?.label || currentFlower.replace('setup_flower_', 'Flower ');
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

  return (
    <>
      <SettingsSelectorBase
        preview={
          <PreviewBox shape="square" size={size}>
            <FlowerPreview flowerStyle={isEnabled ? currentFlower : 'none'} isEnabled={isEnabled} />
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
        ariaLabel={ariaLabel ?? 'Setup flower settings'}
      />

      {showAssetModal && (
        <AssetManagerModal
          isOpen={showAssetModal}
          onClose={() => setShowAssetModal(false)}
          onSelectAsset={handleAssetChange}
          initialAssetType="setup-flower"
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
