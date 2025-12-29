/**
 * IconSettingsSelector Component
 *
 * A unified icon positioning control that manages scale, horizontal offset,
 * and vertical offset for token types (Character, Reminder, Meta).
 *
 * Features:
 * - Token type tabs in drawer header for switching between types
 * - 3-column layout: Sizing | Variants | (empty)
 * - Visual preview with icon positioning applied
 * - Reset/Cancel/Apply workflow
 * - Live preview during editing
 * - Link toggle to sync Character and Meta settings
 * - Integrated variant options for Character/Reminder tokens
 *
 * Uses SettingsSelectorBase for consistent styling and IconDrawer
 * for the panel UI.
 *
 * @module components/Shared/IconSettingsSelector
 */

import { memo, useCallback, useMemo, useRef, useState } from 'react';
import { EditableSlider } from '@/components/Shared/Controls/EditableSlider';
import { MeasurementSlider } from '@/components/Shared/Controls/MeasurementSlider';
import { IconDrawer, type TokenType } from '@/components/Shared/Drawer/IconDrawer';
import { useCoordinatedPanel } from '@/contexts/PanelCoordinationContext';
import { useDrawerState } from '@/hooks/ui/useDrawerState';
import drawerStyles from '@/styles/components/shared/IconDrawer.module.css';
import iconStyles from '@/styles/components/shared/IconSettingsSelector.module.css';
import { TEAM_LABELS } from '@/ts/constants.js';
import type { AutoGenerateTeam, GenerationOptions } from '@/ts/types/index';
import { DEFAULT_AUTO_GENERATE_TEAMS } from '@/ts/types/index.js';
import type { MeasurementUnit } from '@/ts/types/measurement';
import { ICON_OFFSET_CONFIG } from '@/ts/utils/measurementUtils';
import { InfoSection, PreviewBox, SettingsSelectorBase } from './SettingsSelectorBase';

// Re-export TokenType for consumers
export type { TokenType } from '@/components/Shared/Drawer/IconDrawer';

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

export interface AllIconSettings {
  character: IconSettings;
  reminder: IconSettings;
  meta: IconSettings;
}

export interface IconSettingsSelectorProps {
  /** Generation options (primary interface) */
  generationOptions: GenerationOptions;
  /** Called when options change */
  onOptionChange: (options: Partial<GenerationOptions>) => void;
  /** User's preferred measurement unit */
  displayUnit?: MeasurementUnit;
  /** Component size variant */
  size?: 'small' | 'medium' | 'large';
  /** Disabled state */
  disabled?: boolean;
  /** Aria label for accessibility */
  ariaLabel?: string;
  /** Whether Character and Meta settings are linked */
  isLinked?: boolean;
  /** Called when link toggle is clicked */
  onLinkToggle?: () => void;
}

// ============================================================================
// Default Settings
// ============================================================================

const DEFAULT_ICON_SETTINGS: IconSettings = {
  scale: 1.0,
  offsetX: 0,
  offsetY: 0,
};

const DEFAULT_ALL_SETTINGS: AllIconSettings = {
  character: { ...DEFAULT_ICON_SETTINGS },
  reminder: { ...DEFAULT_ICON_SETTINGS },
  meta: { ...DEFAULT_ICON_SETTINGS },
};

// ============================================================================
// Compact Icon Preview for Selector
// ============================================================================

const IconPreviewCompact = memo(function IconPreviewCompact() {
  return (
    <div className={iconStyles.previewContainer}>
      <div className={iconStyles.iconPreview}>
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="7" r="4" />
          <path d="M12 14c-6 0-8 3-8 5v2h16v-2c0-2-2-5-8-5z" />
        </svg>
      </div>
    </div>
  );
});

// ============================================================================
// Settings Column Component
// ============================================================================

interface SettingsColumnProps {
  settings: IconSettings;
  displayUnit: MeasurementUnit;
  onSettingsChange: (settings: IconSettings) => void;
}

const SettingsColumn = memo(function SettingsColumn({
  settings,
  displayUnit,
  onSettingsChange,
}: SettingsColumnProps) {
  const handleScaleChange = useCallback(
    (val: number) => {
      onSettingsChange({ ...settings, scale: val });
    },
    [settings, onSettingsChange]
  );

  const handleOffsetXChange = useCallback(
    (val: number) => {
      onSettingsChange({ ...settings, offsetX: val });
    },
    [settings, onSettingsChange]
  );

  const handleOffsetYChange = useCallback(
    (val: number) => {
      onSettingsChange({ ...settings, offsetY: val });
    },
    [settings, onSettingsChange]
  );

  return (
    <div className={drawerStyles.column}>
      <div className={drawerStyles.columnHeader}>Sizing</div>

      {/* Scale */}
      <div className={iconStyles.sliderGroup}>
        <EditableSlider
          label="Scale"
          value={settings.scale}
          onChange={handleScaleChange}
          min={0.5}
          max={2.0}
          step={0.1}
          suffix="x"
          defaultValue={DEFAULT_ICON_SETTINGS.scale}
          ariaLabel="Icon Scale"
        />
      </div>

      {/* Offset X */}
      <div className={iconStyles.sliderGroup}>
        <MeasurementSlider
          label="Offset X"
          value={settings.offsetX}
          onChange={handleOffsetXChange}
          config={ICON_OFFSET_CONFIG}
          displayUnit={displayUnit}
          ariaLabel="Icon Horizontal Offset"
        />
      </div>

      {/* Offset Y */}
      <div className={iconStyles.sliderGroup}>
        <MeasurementSlider
          label="Offset Y"
          value={settings.offsetY}
          onChange={handleOffsetYChange}
          config={ICON_OFFSET_CONFIG}
          displayUnit={displayUnit}
          ariaLabel="Icon Vertical Offset"
        />
      </div>
    </div>
  );
});

// ============================================================================
// Team Configuration for Auto-generation
// ============================================================================

interface TeamOption {
  id: AutoGenerateTeam;
  label: string;
}

const TEAM_OPTIONS: TeamOption[] = [
  { id: 'townsfolk', label: 'Townsfolk/Good' },
  { id: 'outsider', label: TEAM_LABELS.outsider },
  { id: 'minion', label: TEAM_LABELS.minion },
  { id: 'demon', label: 'Demon/Evil' },
  { id: 'traveller', label: TEAM_LABELS.traveler },
  { id: 'fabled', label: TEAM_LABELS.fabled },
  { id: 'loric', label: TEAM_LABELS.loric },
];

// ============================================================================
// Variants Column Component
// ============================================================================

interface VariantsColumnProps {
  tokenType: TokenType;
  generationOptions?: GenerationOptions;
  onOptionChange?: (options: Partial<GenerationOptions>) => void;
}

const VariantsColumn = memo(function VariantsColumn({
  tokenType,
  generationOptions,
  onOptionChange,
}: VariantsColumnProps) {
  // For Meta tokens, show a simple message
  if (tokenType === 'meta') {
    return (
      <div className={drawerStyles.column}>
        <div className={drawerStyles.columnHeader}>Variants</div>
        <div className={iconStyles.noVariantsMessage}>No Variant Options for Meta Tokens</div>
      </div>
    );
  }

  // If no generation options provided, show disabled state
  if (!(generationOptions && onOptionChange)) {
    return (
      <div className={drawerStyles.column}>
        <div className={drawerStyles.columnHeader}>Variants</div>
        <div className={iconStyles.noVariantsMessage}>Variant options not available</div>
      </div>
    );
  }

  // Get current values based on token type
  const isCharacter = tokenType === 'character';
  const imageVariantsEnabled = isCharacter
    ? (generationOptions.generateImageVariants ?? false)
    : (generationOptions.generateReminderVariants ?? false);
  const autoGenerateEnabled = isCharacter
    ? (generationOptions.autoGenerateCharacterVariants ?? false)
    : (generationOptions.autoGenerateReminderVariants ?? false);
  const autoGenerateTeams = generationOptions.autoGenerateTeams ?? DEFAULT_AUTO_GENERATE_TEAMS;

  const handleTeamToggle = (teamId: AutoGenerateTeam, checked: boolean) => {
    const newTeams = checked
      ? [...autoGenerateTeams, teamId]
      : autoGenerateTeams.filter((t) => t !== teamId);
    onOptionChange({ autoGenerateTeams: newTeams });
  };

  return (
    <div className={drawerStyles.column}>
      <div className={drawerStyles.columnHeader}>Variants</div>

      {/* Image Variants Checkbox */}
      <label className={iconStyles.checkboxRow}>
        <input
          type="checkbox"
          checked={imageVariantsEnabled}
          onChange={(e) => {
            if (isCharacter) {
              onOptionChange({ generateImageVariants: e.target.checked });
            } else {
              onOptionChange({ generateReminderVariants: e.target.checked });
            }
          }}
        />
        <span>Image Variants</span>
      </label>

      {/* Divider */}
      <div className={iconStyles.sectionDivider} />

      {/* Auto-generate Checkbox */}
      <label className={iconStyles.checkboxRow}>
        <input
          type="checkbox"
          checked={autoGenerateEnabled}
          onChange={(e) => {
            if (isCharacter) {
              onOptionChange({ autoGenerateCharacterVariants: e.target.checked });
            } else {
              onOptionChange({ autoGenerateReminderVariants: e.target.checked });
            }
          }}
        />
        <span>Auto-generate Variants</span>
      </label>

      {/* Team Checkboxes - indented sub-options */}
      <div
        className={`${iconStyles.subOptions} ${autoGenerateEnabled ? '' : iconStyles.subOptionsDisabled}`}
      >
        {TEAM_OPTIONS.map((team) => (
          <label key={team.id} className={iconStyles.checkboxRow}>
            <input
              type="checkbox"
              checked={autoGenerateTeams.includes(team.id)}
              onChange={(e) => handleTeamToggle(team.id, e.target.checked)}
              disabled={!autoGenerateEnabled}
            />
            <span>{team.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
});

// ============================================================================
// Jinx Settings Column (for Meta tokens)
// ============================================================================

interface JinxSettingsColumnProps {
  generationOptions: GenerationOptions;
  onOptionChange: (options: Partial<GenerationOptions>) => void;
}

const JinxSettingsColumn = memo(function JinxSettingsColumn({
  generationOptions,
  onOptionChange,
}: JinxSettingsColumnProps) {
  // Internal value is decimal (0.15 = 15%), display as percentage
  const jinxIconSpacing = generationOptions.jinxIconSpacing ?? 0;
  const displayValue = Math.round(jinxIconSpacing * 100);

  const handleSpacingChange = useCallback(
    (percentValue: number) => {
      // Convert percentage to decimal for storage
      onOptionChange({ jinxIconSpacing: percentValue / 100 });
    },
    [onOptionChange]
  );

  return (
    <div className={drawerStyles.column}>
      <div className={drawerStyles.columnHeader}>Jinx Tokens</div>

      <div className={iconStyles.sliderGroup}>
        <EditableSlider
          label="Icon Spacing"
          value={displayValue}
          onChange={handleSpacingChange}
          min={-15}
          max={15}
          step={1}
          suffix="%"
          defaultValue={0}
          ariaLabel="Jinx Icon Spacing"
        />
      </div>

      <div className={iconStyles.helperText}>Adjusts distance between icons on jinx tokens</div>
    </div>
  );
});

// ============================================================================
// Empty Column Placeholder
// ============================================================================

const EmptyColumn = memo(function EmptyColumn() {
  return <div className={drawerStyles.column} />;
});

// ============================================================================
// Main Component
// ============================================================================

export const IconSettingsSelector = memo(function IconSettingsSelector({
  generationOptions,
  onOptionChange,
  displayUnit: displayUnitProp,
  size = 'medium',
  disabled = false,
  ariaLabel,
  isLinked = false,
  onLinkToggle,
}: IconSettingsSelectorProps) {
  // Track active token type for tabs
  const [activeTokenType, setActiveTokenType] = useState<TokenType>('character');

  // Extract displayUnit from generationOptions (prop overrides if provided)
  const displayUnit: MeasurementUnit =
    displayUnitProp ?? generationOptions.measurementUnit ?? 'inches';

  // Extract AllIconSettings from generationOptions (self-contained extraction)
  const allIconSettings: AllIconSettings = useMemo(
    () => ({
      character: generationOptions.iconSettings?.character ?? { ...DEFAULT_ICON_SETTINGS },
      reminder: generationOptions.iconSettings?.reminder ?? { ...DEFAULT_ICON_SETTINGS },
      meta: generationOptions.iconSettings?.meta ?? { ...DEFAULT_ICON_SETTINGS },
    }),
    [generationOptions.iconSettings]
  );

  // Convert AllIconSettings changes to GenerationOptions updates
  const handleSettingsChange = useCallback(
    (settings: AllIconSettings) => {
      onOptionChange({ iconSettings: settings });
    },
    [onOptionChange]
  );

  // Panel coordination - closes other panels when this one opens
  const drawerCloseRef = useRef<(() => void) | undefined>(undefined);
  const onWillOpen = useCoordinatedPanel('icon-settings', () => drawerCloseRef.current);

  // Use drawer state hook for open/close and pending value management
  const drawer = useDrawerState<AllIconSettings>({
    value: allIconSettings,
    onChange: handleSettingsChange,
    onPreviewChange: handleSettingsChange,
    disabled,
    defaultValue: DEFAULT_ALL_SETTINGS,
    onWillOpen,
  });

  // Keep ref updated for coordination
  drawerCloseRef.current = drawer.close;

  // Handle settings change for active token type
  // When linked and editing Character or Meta, syncs both
  const handleActiveSettingsChange = useCallback(
    (settings: IconSettings) => {
      if (isLinked && activeTokenType !== 'reminder') {
        drawer.updatePending({
          ...drawer.pendingValue,
          character: settings,
          meta: settings,
        });
      } else {
        drawer.updatePending({
          ...drawer.pendingValue,
          [activeTokenType]: settings,
        });
      }
    },
    [drawer, activeTokenType, isLinked]
  );

  return (
    <>
      <SettingsSelectorBase
        preview={
          <PreviewBox shape="square" size={size}>
            <IconPreviewCompact />
          </PreviewBox>
        }
        info={<InfoSection label="Icon" />}
        actionLabel="Customize"
        onAction={drawer.open}
        isExpanded={drawer.isOpen}
        disabled={disabled}
        size={size}
        ariaLabel={ariaLabel ?? 'Icon settings for all token types'}
      />

      <IconDrawer
        isOpen={drawer.isOpen}
        onClose={drawer.cancel}
        onApply={drawer.apply}
        onReset={drawer.reset}
        activeTokenType={activeTokenType}
        onTokenTypeChange={setActiveTokenType}
        isLinked={isLinked}
        onLinkToggle={onLinkToggle}
        title="Icon Settings"
      >
        {/* First column: Active token type settings */}
        <SettingsColumn
          settings={drawer.pendingValue[activeTokenType]}
          displayUnit={displayUnit}
          onSettingsChange={handleActiveSettingsChange}
        />
        {/* Second column: Variants */}
        <VariantsColumn
          tokenType={activeTokenType}
          generationOptions={generationOptions}
          onOptionChange={onOptionChange}
        />
        {/* Third column: Jinx settings for Meta, empty for others */}
        {activeTokenType === 'meta' ? (
          <JinxSettingsColumn
            generationOptions={generationOptions}
            onOptionChange={onOptionChange}
          />
        ) : (
          <EmptyColumn />
        )}
      </IconDrawer>
    </>
  );
});

export default IconSettingsSelector;
