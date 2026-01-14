/**
 * DecorativesSettingsSelector Component
 *
 * A unified settings selector for token decorative elements (Setup and Accents).
 * Opens a drawer for asset selection (Setup and Accent image pickers).
 *
 * @module components/Shared/Selectors/DecorativesSettingsSelector
 */

import { useEffect, useRef, useState } from 'react';
import { AssetManagerModal } from '@/components/Modals/AssetManagerModal';
import { EditableSlider } from '@/components/Shared/Controls/EditableSlider';
import { DecorativesDrawer } from '@/components/Shared/Drawer/DecorativesDrawer';
import { useCoordinatedPanel } from '@/contexts/PanelCoordinationContext';
import { useDrawerState } from '@/hooks';
import styles from '@/styles/components/shared/DecorativesSettingsSelector.module.css';
import drawerStyles from '@/styles/components/shared/SettingsDrawer.module.css';
import { CONFIG } from '@/ts/config';
import { ACCENT_LAYOUT } from '@/ts/constants';
import type { GenerationOptions, ReminderCountStyle, SetupPlacement } from '@/ts/types/index';
import { InfoSection, PreviewBox, SettingsSelectorBase } from './SettingsSelectorBase';

// ============================================================================
// Types
// ============================================================================

export interface DecorativesSettingsSelectorProps {
  generationOptions: GenerationOptions;
  onOptionChange: (options: Partial<GenerationOptions>) => void;
  projectId?: string;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  ariaLabel?: string;
}

interface DecorativeSettings {
  // Setup
  setupStyle: string;
  setupEnabled: boolean;
  setupPlacement: SetupPlacement;
  // Accents
  accentGeneration: string;
  accentEnabled: boolean;
  accentRadialOffset: number;
  accentRotate180: boolean;
  accentFlip: boolean;
  accentLayer: 'under' | 'over';
}

// ============================================================================
// Setup Overlay Section Component
// ============================================================================

interface SetupOverlaySectionProps {
  displaySettings: DecorativeSettings;
  setupPreviewSrc: string | null;
  onSetupToggle: (enabled: boolean) => void;
  onSetupPlacementChange: (placement: SetupPlacement) => void;
  onBrowseClick: () => void;
}

function SetupOverlaySection({
  displaySettings,
  setupPreviewSrc,
  onSetupToggle,
  onSetupPlacementChange,
  onBrowseClick,
}: SetupOverlaySectionProps) {
  return (
    <div className={drawerStyles.column}>
      <div className={drawerStyles.sectionHeader}>Setup Overlay</div>
      <div className={styles.assetRow}>
        <button
          type="button"
          className={`${styles.enableBtn} ${displaySettings.setupEnabled ? styles.enableBtnActive : ''}`}
          onClick={() => onSetupToggle(!displaySettings.setupEnabled)}
        >
          {displaySettings.setupEnabled ? 'Enabled' : 'Enable'}
        </button>
        <button
          type="button"
          className={styles.browseButton}
          onClick={onBrowseClick}
          disabled={!displaySettings.setupEnabled}
        >
          Browse
        </button>
        {displaySettings.setupEnabled && setupPreviewSrc && (
          <img
            src={setupPreviewSrc}
            alt="Setup overlay"
            className={styles.assetThumb}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
      </div>

      {displaySettings.setupEnabled && (
        <div className={styles.settingGroup}>
          <div className={styles.settingGroupLabel}>Placement</div>
          <div className={styles.buttonGroup}>
            <button
              type="button"
              className={`${styles.styleButton} ${displaySettings.setupPlacement === 'left' ? styles.styleButtonActive : ''}`}
              onClick={() => onSetupPlacementChange('left')}
            >
              Left
            </button>
            <button
              type="button"
              className={`${styles.styleButton} ${displaySettings.setupPlacement === 'right' ? styles.styleButtonActive : ''}`}
              onClick={() => onSetupPlacementChange('right')}
            >
              Right
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Accents Section Component
// ============================================================================

interface AccentsSectionProps {
  displaySettings: DecorativeSettings;
  accentPreviewSrc: string | null;
  showReminderCount: boolean;
  reminderCountStyle: ReminderCountStyle;
  reminderCountUniformLayout: boolean;
  onAccentToggle: (enabled: boolean) => void;
  onAccentRadialOffsetChange: (value: number) => void;
  onAccentRotate180Change: (checked: boolean) => void;
  onAccentFlipChange: (checked: boolean) => void;
  onAccentLayerChange: (layer: 'under' | 'over') => void;
  onBrowseClick: () => void;
  onShowReminderCountChange: (enabled: boolean) => void;
  onReminderCountStyleChange: (style: ReminderCountStyle) => void;
  onReminderCountUniformLayoutChange: (enabled: boolean) => void;
}

function AccentsSection({
  displaySettings,
  accentPreviewSrc,
  showReminderCount,
  reminderCountStyle,
  reminderCountUniformLayout,
  onAccentToggle,
  onAccentRadialOffsetChange,
  onAccentRotate180Change,
  onAccentFlipChange,
  onAccentLayerChange,
  onBrowseClick,
  onShowReminderCountChange,
  onReminderCountStyleChange,
  onReminderCountUniformLayoutChange,
}: AccentsSectionProps) {
  return (
    <div className={drawerStyles.column}>
      <div className={drawerStyles.sectionHeader}>Accents</div>
      <div className={styles.assetRow}>
        <button
          type="button"
          className={`${styles.enableBtn} ${displaySettings.accentEnabled ? styles.enableBtnActive : ''}`}
          onClick={() => onAccentToggle(!displaySettings.accentEnabled)}
        >
          {displaySettings.accentEnabled ? 'Enabled' : 'Enable'}
        </button>
        <button
          type="button"
          className={styles.browseButton}
          onClick={onBrowseClick}
          disabled={!displaySettings.accentEnabled}
        >
          Browse
        </button>
        {displaySettings.accentEnabled && accentPreviewSrc && (
          <img
            src={accentPreviewSrc}
            alt="Accent"
            className={styles.assetThumb}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
      </div>

      {displaySettings.accentEnabled && (
        <div className={styles.settingGroup}>
          <EditableSlider
            label="Distance"
            value={Math.round(displaySettings.accentRadialOffset * 100)}
            onChange={(val) => onAccentRadialOffsetChange(val / 100)}
            min={50}
            max={100}
            step={1}
            suffix="%"
            defaultValue={Math.round(ACCENT_LAYOUT.DEFAULT_RADIAL_OFFSET * 100)}
            ariaLabel="Accent distance from center"
          />
        </div>
      )}

      {displaySettings.accentEnabled && (
        <div className={styles.checkboxRow}>
          <label className={styles.checkboxOption}>
            <input
              type="checkbox"
              checked={displaySettings.accentRotate180}
              onChange={(e) => onAccentRotate180Change(e.target.checked)}
            />
            <span>Rotate 180°</span>
          </label>
          <label className={styles.checkboxOption}>
            <input
              type="checkbox"
              checked={displaySettings.accentFlip}
              onChange={(e) => onAccentFlipChange(e.target.checked)}
            />
            <span>Flip</span>
          </label>
        </div>
      )}

      {displaySettings.accentEnabled && (
        <div className={styles.settingGroup}>
          <div className={styles.settingGroupLabel}>Layer</div>
          <div className={styles.buttonGroup}>
            <button
              type="button"
              className={`${styles.styleButton} ${displaySettings.accentLayer === 'under' ? styles.styleButtonActive : ''}`}
              onClick={() => onAccentLayerChange('under')}
            >
              Under
            </button>
            <button
              type="button"
              className={`${styles.styleButton} ${displaySettings.accentLayer === 'over' ? styles.styleButtonActive : ''}`}
              onClick={() => onAccentLayerChange('over')}
            >
              Over
            </button>
          </div>
        </div>
      )}

      {/* Reminder Count Settings */}
      <div className={styles.sectionDivider} />
      <div className={drawerStyles.sectionHeader}>Reminder Count</div>

      <div className={styles.buttonGroup}>
        <button
          type="button"
          className={`${styles.styleButton} ${showReminderCount ? '' : styles.styleButtonActive}`}
          onClick={() => onShowReminderCountChange(false)}
        >
          None
        </button>
        <button
          type="button"
          className={`${styles.styleButton} ${showReminderCount && reminderCountStyle === 'arabic' ? styles.styleButtonActive : ''}`}
          onClick={() => {
            onShowReminderCountChange(true);
            onReminderCountStyleChange('arabic');
          }}
        >
          123
        </button>
        <button
          type="button"
          className={`${styles.styleButton} ${showReminderCount && reminderCountStyle === 'roman' ? styles.styleButtonActive : ''}`}
          onClick={() => {
            onShowReminderCountChange(true);
            onReminderCountStyleChange('roman');
          }}
        >
          III
        </button>
      </div>

      <label className={styles.checkboxOption}>
        <input
          type="checkbox"
          checked={reminderCountUniformLayout}
          onChange={(e) => onReminderCountUniformLayoutChange(e.target.checked)}
        />
        <span>Uniform Layout</span>
      </label>
    </div>
  );
}

// ============================================================================
// Preview Component (for selector box)
// ============================================================================

function DecorativesPreview({
  setupStyle,
  accentGeneration,
  setupEnabled,
  accentEnabled,
}: {
  setupStyle: string;
  accentGeneration: string;
  setupEnabled: boolean;
  accentEnabled: boolean;
}) {
  const getSetupPreviewSrc = () => {
    if (!(setupEnabled && setupStyle) || setupStyle === 'none') return null;
    return `${CONFIG.ASSETS.SETUP_OVERLAYS}${setupStyle}.webp`;
  };

  const getAccentPreviewSrc = () => {
    if (!(accentEnabled && accentGeneration) || accentGeneration === 'none') return null;
    return `${CONFIG.ASSETS.ACCENTS}leaves/${accentGeneration}/leaf_1.webp`;
  };

  const setupSrc = getSetupPreviewSrc();
  const accentSrc = getAccentPreviewSrc();
  const bothDisabled = !(setupEnabled || accentEnabled);

  return (
    <div className={`${styles.previewStack} ${bothDisabled ? styles.previewDisabledState : ''}`}>
      {setupSrc && (
        <img
          src={setupSrc}
          alt="Setup overlay"
          className={styles.previewSetup}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
      {accentSrc && (
        <img
          src={accentSrc}
          alt="Accent"
          className={styles.previewAccent}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
      {!(setupSrc || accentSrc) && <span className={styles.previewFallback}>🎭</span>}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function DecorativesSettingsSelector({
  generationOptions,
  onOptionChange,
  projectId,
  size = 'medium',
  disabled = false,
  ariaLabel,
}: DecorativesSettingsSelectorProps) {
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showAccentModal, setShowAccentModal] = useState(false);

  // Current settings from generationOptions
  const currentSettings: DecorativeSettings = {
    setupStyle: generationOptions.setupStyle || 'setup_flower_1',
    setupEnabled: generationOptions.setupStyle !== 'none',
    setupPlacement: generationOptions.setupPlacement ?? 'right',
    accentGeneration: generationOptions.accentGeneration || 'classic',
    accentEnabled: generationOptions.accentEnabled !== false,
    accentRadialOffset: generationOptions.accentRadialOffset ?? ACCENT_LAYOUT.DEFAULT_RADIAL_OFFSET,
    accentRotate180: generationOptions.accentRotate180 ?? false,
    accentFlip: generationOptions.accentFlip ?? false,
    accentLayer: generationOptions.accentLayer ?? 'over',
  };

  const [lastSetup, setLastSetup] = useState(
    currentSettings.setupEnabled ? currentSettings.setupStyle : 'setup_flower_1'
  );

  // Default settings for reset
  const defaultSettings: DecorativeSettings = {
    setupStyle: 'setup_flower_1',
    setupEnabled: true,
    setupPlacement: 'right',
    accentGeneration: 'classic',
    accentEnabled: true,
    accentRadialOffset: ACCENT_LAYOUT.DEFAULT_RADIAL_OFFSET,
    accentRotate180: false,
    accentFlip: false,
    accentLayer: 'over',
  };

  // Panel coordination - get reference before drawer so we can pass it
  const drawerCloseRef = useRef<(() => void) | undefined>(undefined);
  const onWillOpen = useCoordinatedPanel('decoratives-settings', () => drawerCloseRef.current);

  // Handler to convert DecorativeSettings to GenerationOptions
  const handleSettingsChange = (value: DecorativeSettings) => {
    onOptionChange({
      setupStyle: value.setupEnabled ? value.setupStyle : 'none',
      setupPlacement: value.setupPlacement,
      accentGeneration: value.accentGeneration,
      accentEnabled: value.accentEnabled,
      accentRadialOffset: value.accentRadialOffset,
      accentRotate180: value.accentRotate180,
      accentFlip: value.accentFlip,
      accentLayer: value.accentLayer,
    });
  };

  // Drawer state with correct API
  const drawer = useDrawerState<DecorativeSettings>({
    value: currentSettings,
    onChange: handleSettingsChange,
    onPreviewChange: handleSettingsChange, // Enable live preview updates
    defaultValue: defaultSettings,
    onWillOpen,
  });

  useEffect(() => {
    drawerCloseRef.current = drawer.close;
  }, [drawer.close]);

  // Open drawer handler
  const handleOpenDrawer = () => {
    drawer.open();
  };

  // Handlers for pending value updates
  const handleSetupToggle = (enabled: boolean) => {
    if (enabled) {
      // Batch both updates together to avoid stale state issues
      drawer.updatePending({
        ...drawer.pendingValue,
        setupEnabled: true,
        setupStyle: lastSetup,
      });
    } else {
      if (drawer.pendingValue.setupStyle !== 'none') {
        setLastSetup(drawer.pendingValue.setupStyle);
      }
      drawer.updatePendingField('setupEnabled', false);
    }
  };

  const handleAccentToggle = (enabled: boolean) => {
    drawer.updatePendingField('accentEnabled', enabled);
  };

  const handleSetupAssetChange = (assetId: string) => {
    drawer.updatePendingField('setupStyle', assetId);
    drawer.updatePendingField('setupEnabled', true);
    setLastSetup(assetId);
    setShowSetupModal(false);
  };

  const handleAccentAssetChange = (assetId: string) => {
    drawer.updatePendingField('accentGeneration', assetId);
    drawer.updatePendingField('accentEnabled', true);
    setShowAccentModal(false);
  };

  // Display values
  const displaySettings = drawer.isOpen ? drawer.pendingValue : currentSettings;

  // Reminder count settings (stored directly in generationOptions, not in DecorativeSettings)
  const showReminderCount = generationOptions.tokenCount !== false;
  const reminderCountStyle = generationOptions.reminderCountStyle || 'arabic';
  const reminderCountUniformLayout = generationOptions.reminderCountUniformLayout ?? false;

  // Handlers for reminder count settings
  const handleShowReminderCountChange = (enabled: boolean) => {
    onOptionChange({ tokenCount: enabled });
  };

  const handleReminderCountStyleChange = (style: ReminderCountStyle) => {
    onOptionChange({ reminderCountStyle: style });
  };

  const handleReminderCountUniformLayoutChange = (enabled: boolean) => {
    onOptionChange({ reminderCountUniformLayout: enabled });
  };

  // Preview sources
  const setupPreviewSrc = displaySettings.setupEnabled
    ? `${CONFIG.ASSETS.SETUP_OVERLAYS}${displaySettings.setupStyle}.webp`
    : null;
  const accentPreviewSrc = displaySettings.accentEnabled
    ? `${CONFIG.ASSETS.ACCENTS}leaves/${displaySettings.accentGeneration}/leaf_1.webp`
    : null;

  return (
    <>
      <SettingsSelectorBase
        preview={
          <PreviewBox shape="square" size={size}>
            <DecorativesPreview
              setupStyle={currentSettings.setupStyle}
              accentGeneration={currentSettings.accentGeneration}
              setupEnabled={currentSettings.setupEnabled}
              accentEnabled={currentSettings.accentEnabled}
            />
          </PreviewBox>
        }
        info={<InfoSection label="Decoratives" />}
        actionLabel="Customize"
        onAction={handleOpenDrawer}
        isExpanded={drawer.isOpen}
        disabled={disabled}
        size={size}
        ariaLabel={ariaLabel ?? 'Decorative settings'}
      />

      <DecorativesDrawer
        isOpen={drawer.isOpen}
        onClose={drawer.close}
        onApply={drawer.apply}
        onReset={drawer.reset}
      >
        <SetupOverlaySection
          displaySettings={displaySettings}
          setupPreviewSrc={setupPreviewSrc}
          onSetupToggle={handleSetupToggle}
          onSetupPlacementChange={(placement) =>
            drawer.updatePendingField('setupPlacement', placement)
          }
          onBrowseClick={() => setShowSetupModal(true)}
        />

        <AccentsSection
          displaySettings={displaySettings}
          accentPreviewSrc={accentPreviewSrc}
          showReminderCount={showReminderCount}
          reminderCountStyle={reminderCountStyle}
          reminderCountUniformLayout={reminderCountUniformLayout}
          onAccentToggle={handleAccentToggle}
          onAccentRadialOffsetChange={(val) => drawer.updatePendingField('accentRadialOffset', val)}
          onAccentRotate180Change={(checked) =>
            drawer.updatePendingField('accentRotate180', checked)
          }
          onAccentFlipChange={(checked) => drawer.updatePendingField('accentFlip', checked)}
          onAccentLayerChange={(layer) => drawer.updatePendingField('accentLayer', layer)}
          onBrowseClick={() => setShowAccentModal(true)}
          onShowReminderCountChange={handleShowReminderCountChange}
          onReminderCountStyleChange={handleReminderCountStyleChange}
          onReminderCountUniformLayoutChange={handleReminderCountUniformLayoutChange}
        />

        {/* Column 3: Empty - maintains 3-column layout */}
        <div className={drawerStyles.column} />
      </DecorativesDrawer>

      {showSetupModal && (
        <AssetManagerModal
          isOpen={showSetupModal}
          onClose={() => setShowSetupModal(false)}
          onSelectAsset={handleSetupAssetChange}
          initialAssetType="setup"
          selectionMode={true}
          includeBuiltIn={true}
          projectId={projectId}
          generationOptions={generationOptions}
        />
      )}

      {showAccentModal && (
        <AssetManagerModal
          isOpen={showAccentModal}
          onClose={() => setShowAccentModal(false)}
          onSelectAsset={handleAccentAssetChange}
          initialAssetType="accent"
          selectionMode={true}
          includeBuiltIn={true}
          projectId={projectId}
          generationOptions={generationOptions}
        />
      )}
    </>
  );
}
