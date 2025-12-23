/**
 * GenerateVariantsSelector Component
 *
 * A dual-panel settings selector for generating token variants.
 * Left panel: Image variant controls (for characters with multiple images)
 * Right panel: Auto-generation controls (apply team color filters)
 *
 * @module components/Shared/GenerateVariantsSelector
 */

import { memo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useExpandablePanel } from '@/hooks';
import optionStyles from '@/styles/components/options/OptionsPanel.module.css';
import baseStyles from '@/styles/components/shared/SettingsSelectorBase.module.css';
import styles from '@/styles/components/shared/SimplePanelSelector.module.css';
import { TEAM_COLORS, TEAM_LABELS } from '@/ts/constants.js';
import type { AutoGenerateTeam, GenerationOptions } from '@/ts/types/index';
import { DEFAULT_AUTO_GENERATE_TEAMS } from '@/ts/types/index';
import { InfoSection, PreviewBox, SettingsSelectorBase } from './SettingsSelectorBase';

export interface GenerateVariantsSelectorProps {
  generationOptions: GenerationOptions;
  onOptionChange: (options: Partial<GenerationOptions>) => void;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  ariaLabel?: string;
}

interface PendingVariantSettings {
  // Image variants (left panel)
  characterVariants: boolean;
  reminderVariants: boolean;
  // Auto-generation (right panel)
  autoGenerateCharacters: boolean;
  autoGenerateReminders: boolean;
  autoGenerateTeams: AutoGenerateTeam[];
}

// Team configuration for the auto-generation panel
interface TeamOption {
  id: AutoGenerateTeam;
  label: string;
  color: string;
  /** Split colors for teams like Traveler (blue left, red right) */
  split?: { left: { hue: number }; right: { hue: number } };
}

/**
 * Get the background style for a team swatch.
 * Returns a gradient for split-color teams (e.g., Traveler), solid color otherwise.
 */
function getTeamSwatchStyle(team: TeamOption): React.CSSProperties {
  if (team.split) {
    // Use gradient matching studio's TeamColorPreview
    const { left, right } = team.split;
    return {
      background: `linear-gradient(90deg, hsl(${left.hue}, 60%, 45%) 50%, hsl(${right.hue}, 70%, 40%) 50%)`,
    };
  }
  return { backgroundColor: team.color };
}

const TEAM_OPTIONS: TeamOption[] = [
  { id: 'townsfolk', label: 'Townsfolk/Good', color: TEAM_COLORS.townsfolk.hex },
  { id: 'outsider', label: TEAM_LABELS.outsider, color: TEAM_COLORS.outsider.hex },
  { id: 'minion', label: TEAM_LABELS.minion, color: TEAM_COLORS.minion.hex },
  { id: 'demon', label: 'Demon/Evil', color: TEAM_COLORS.demon.hex },
  {
    id: 'traveller',
    label: TEAM_LABELS.traveler,
    color: TEAM_COLORS.traveler.hex,
    // Pull split colors from TEAM_COLORS constants (SSOT)
    split: TEAM_COLORS.traveler.split,
  },
  { id: 'fabled', label: TEAM_LABELS.fabled, color: TEAM_COLORS.fabled.hex },
  { id: 'loric', label: TEAM_LABELS.loric, color: TEAM_COLORS.loric.hex },
];

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
  // Image variants state
  const characterVariantsEnabled = generationOptions.generateImageVariants ?? false;
  const reminderVariantsEnabled = generationOptions.generateReminderVariants ?? false;

  // Auto-generation state
  const autoCharactersEnabled = generationOptions.autoGenerateCharacterVariants ?? false;
  const autoRemindersEnabled = generationOptions.autoGenerateReminderVariants ?? false;
  const autoTeams = generationOptions.autoGenerateTeams ?? DEFAULT_AUTO_GENERATE_TEAMS;

  // Combined enabled state
  const isEnabled =
    characterVariantsEnabled ||
    reminderVariantsEnabled ||
    autoCharactersEnabled ||
    autoRemindersEnabled;

  const currentSettings: PendingVariantSettings = {
    characterVariants: characterVariantsEnabled,
    reminderVariants: reminderVariantsEnabled,
    autoGenerateCharacters: autoCharactersEnabled,
    autoGenerateReminders: autoRemindersEnabled,
    autoGenerateTeams: autoTeams,
  };

  const handleToggle = useCallback(
    (enabled: boolean) => {
      onOptionChange({
        generateImageVariants: enabled,
        generateReminderVariants: enabled,
        autoGenerateCharacterVariants: enabled,
        autoGenerateReminderVariants: enabled,
      });
    },
    [onOptionChange]
  );

  const handlePanelChange = useCallback(
    (settings: PendingVariantSettings) => {
      onOptionChange({
        generateImageVariants: settings.characterVariants,
        generateReminderVariants: settings.reminderVariants,
        autoGenerateCharacterVariants: settings.autoGenerateCharacters,
        autoGenerateReminderVariants: settings.autoGenerateReminders,
        autoGenerateTeams: settings.autoGenerateTeams,
      });
    },
    [onOptionChange]
  );

  const panel = useExpandablePanel<PendingVariantSettings>({
    value: currentSettings,
    onChange: handlePanelChange,
    onPreviewChange: handlePanelChange,
    disabled,
    panelHeight: 280,
    minPanelWidth: 400,
  });

  const defaultSettings: PendingVariantSettings = {
    characterVariants: false,
    reminderVariants: false,
    autoGenerateCharacters: false,
    autoGenerateReminders: false,
    autoGenerateTeams: [...DEFAULT_AUTO_GENERATE_TEAMS],
  };

  const handleTeamToggle = useCallback(
    (teamId: AutoGenerateTeam, checked: boolean) => {
      const currentTeams = panel.pendingValue.autoGenerateTeams;
      const newTeams = checked
        ? [...currentTeams, teamId]
        : currentTeams.filter((t) => t !== teamId);
      panel.updatePendingField('autoGenerateTeams', newTeams);
    },
    [panel]
  );

  const isAutoGenEnabled =
    panel.pendingValue.autoGenerateCharacters || panel.pendingValue.autoGenerateReminders;

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
        <div className={styles.dualPanelContent}>
          {/* Left Panel - Image Variants */}
          <div className={styles.panelColumn}>
            <div className={styles.panelTitle}>Image Variants</div>

            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={panel.pendingValue.characterVariants}
                onChange={(e) => panel.updatePendingField('characterVariants', e.target.checked)}
              />
              <span>Character Variants</span>
            </label>

            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={panel.pendingValue.reminderVariants}
                onChange={(e) => panel.updatePendingField('reminderVariants', e.target.checked)}
              />
              <span>Reminder Variants</span>
            </label>
          </div>

          {/* Right Panel - Auto-Generation */}
          <div className={styles.panelColumn}>
            <div className={styles.panelTitle}>Auto-Generation</div>

            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={panel.pendingValue.autoGenerateCharacters}
                onChange={(e) =>
                  panel.updatePendingField('autoGenerateCharacters', e.target.checked)
                }
              />
              <span>Auto-generate Characters</span>
            </label>

            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={panel.pendingValue.autoGenerateReminders}
                onChange={(e) =>
                  panel.updatePendingField('autoGenerateReminders', e.target.checked)
                }
              />
              <span>Auto-generate Reminders</span>
            </label>

            <div className={styles.sectionSubtitle}>Team Variants</div>

            <div
              className={`${styles.teamList} ${!isAutoGenEnabled ? styles.teamListDisabled : ''}`}
            >
              {TEAM_OPTIONS.map((team) => (
                <label key={team.id} className={styles.teamCheckboxRow}>
                  <input
                    type="checkbox"
                    checked={panel.pendingValue.autoGenerateTeams.includes(team.id)}
                    onChange={(e) => handleTeamToggle(team.id, e.target.checked)}
                    disabled={!isAutoGenEnabled}
                  />
                  <span className={styles.teamColorSwatch} style={getTeamSwatchStyle(team)} />
                  <span className={styles.teamLabel}>{team.label}</span>
                </label>
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
