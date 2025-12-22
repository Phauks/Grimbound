/**
 * Character List View
 *
 * Alternative display mode showing characters in a compact table format:
 * [Icon | Name | Ability]
 *
 * Grouped by team with colored headers that can be collapsed.
 * Shows the raw character icon (not the rendered token).
 * Designed for quick scanning of script contents.
 */

import { memo, useCallback, useMemo, useState } from 'react';
import { useCharacterImageResolver } from '@/hooks';
import styles from '@/styles/components/projects/CharacterListView.module.css';
import { TEAM_COLORS, TEAM_LABELS } from '@/ts/config.js';
import type { Character, CharacterMetadata, Team, Token } from '@/ts/types/index.js';
import { isCharacterEnabled } from '@/ts/utils/characterFiltering.js';

// ============================================================================
// Types & Interfaces
// ============================================================================

interface CharacterListViewProps {
  /** Characters to display directly (preferred - instant loading) */
  characters?: Character[];
  /** Tokens to display - extracts character data (fallback for backward compatibility) */
  tokens?: Token[];
  /** Whether to show the ability text column */
  showAbility?: boolean;
  /** Whether to show the first night reminder column */
  showFirstNightReminder?: boolean;
  /** Whether to show the other night reminder column */
  showOtherNightReminder?: boolean;
  /** Whether to show the reminders column */
  showReminders?: boolean;
  /** Whether to show selection checkboxes */
  showSelection?: boolean;
  /** Character metadata map (required if showSelection is true) */
  characterMetadata?: Map<string, CharacterMetadata>;
  /** Callback when a character is toggled (required if showSelection is true) */
  onToggleCharacter?: (uuid: string, enabled: boolean) => void;
  /** Callback to toggle all characters (optional) */
  onToggleAll?: (enabled: boolean) => void;
}

/** Visibility options for character info columns */
interface InfoVisibility {
  showAbility: boolean;
  showFirstNightReminder: boolean;
  showOtherNightReminder: boolean;
  showReminders: boolean;
}

/** Selection mode configuration */
interface SelectionConfig {
  enabled: boolean;
  metadata?: Map<string, CharacterMetadata>;
  onToggle?: (uuid: string, enabled: boolean) => void;
}

interface CharacterRowData {
  uuid: string;
  id: string;
  name: string;
  team: Team;
  ability: string;
  order: number;
  firstNightReminder?: string;
  otherNightReminder?: string;
  reminders?: string[];
  isOfficial: boolean;
}

interface SelectionSummary {
  enabled: number;
  disabled: number;
  total: number;
}

// ============================================================================
// Constants
// ============================================================================

const TEAM_ORDER: Team[] = [
  'townsfolk',
  'outsider',
  'minion',
  'demon',
  'traveller',
  'fabled',
  'loric',
];

// ============================================================================
// Helper Functions
// ============================================================================

/** Deduplicate characters by ID, preserving order */
function deduplicateCharacters<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

/** Extract characters from tokens (backward compatibility) */
function extractCharactersFromTokens(tokens: Token[]): Character[] {
  return deduplicateCharacters(
    tokens
      .filter((t) => t.type === 'character' && t.characterData)
      .map((t) => t.characterData as Character)
  );
}

/** Convert Characters to CharacterRowData */
function toCharacterRows(characters: Character[]): CharacterRowData[] {
  return deduplicateCharacters(characters).map((char, index) => ({
    uuid: char.uuid || char.id,
    id: char.id,
    name: char.name,
    team: char.team as Team,
    ability: char.ability || '',
    order: index,
    firstNightReminder: char.firstNightReminder,
    otherNightReminder: char.otherNightReminder,
    reminders: char.reminders,
    isOfficial: char.source === 'official',
  }));
}

/** Group characters by team in predefined order */
function groupByTeam(rows: CharacterRowData[]): Map<Team, CharacterRowData[]> {
  const grouped = new Map<Team, CharacterRowData[]>();

  for (const team of TEAM_ORDER) {
    const teamChars = rows.filter((c) => c.team === team).sort((a, b) => a.order - b.order);
    if (teamChars.length > 0) {
      grouped.set(team, teamChars);
    }
  }

  return grouped;
}

/** Calculate selection summary from grouped characters */
function calculateSelectionSummary(
  grouped: Map<Team, CharacterRowData[]>,
  metadata: Map<string, CharacterMetadata> | undefined,
  totalCount: number
): SelectionSummary {
  if (!metadata) {
    return { enabled: totalCount, disabled: 0, total: totalCount };
  }

  let enabled = 0;
  for (const chars of grouped.values()) {
    for (const char of chars) {
      if (isCharacterEnabled(char.uuid, metadata)) {
        enabled++;
      }
    }
  }

  return { enabled, disabled: totalCount - enabled, total: totalCount };
}

// ============================================================================
// Sub-Components
// ============================================================================

interface SelectionHeaderProps {
  summary: SelectionSummary;
  onToggleAll?: (enabled: boolean) => void;
}

/** Header with selection summary and bulk action buttons */
const SelectionHeader = memo(function SelectionHeader({
  summary,
  onToggleAll,
}: SelectionHeaderProps) {
  return (
    <div className={styles.selectionHeader}>
      <span className={styles.selectionSummary}>
        {summary.enabled} of {summary.total} characters included
      </span>
      {onToggleAll && (
        <div className={styles.bulkActions}>
          <button
            type="button"
            className={styles.bulkButton}
            onClick={() => onToggleAll(true)}
            disabled={summary.disabled === 0}
          >
            Enable All
          </button>
          <button
            type="button"
            className={styles.bulkButton}
            onClick={() => onToggleAll(false)}
            disabled={summary.enabled === 0}
          >
            Disable All
          </button>
        </div>
      )}
    </div>
  );
});

interface CharacterIconProps {
  character: CharacterRowData;
  iconUrl: string | undefined;
  isLoading: boolean;
  selection: SelectionConfig;
  isEnabled: boolean;
}

/** Character icon with optional selection toggle */
const CharacterIcon = memo(function CharacterIcon({
  character,
  iconUrl,
  isLoading,
  selection,
  isEnabled,
}: CharacterIconProps) {
  const handleClick =
    selection.enabled && selection.onToggle
      ? () => selection.onToggle?.(character.uuid, !isEnabled)
      : undefined;

  const buttonStyle = selection.enabled
    ? ({
        '--team-color': TEAM_COLORS[character.team],
        '--team-color-glow': `${TEAM_COLORS[character.team]}40`,
      } as React.CSSProperties)
    : undefined;

  const className = [
    styles.characterIcon,
    selection.enabled && styles.characterIconSelectable,
    selection.enabled && !isEnabled && styles.characterIconDisabled,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={className}
      onClick={handleClick}
      disabled={!selection.enabled}
      aria-label={
        selection.enabled
          ? isEnabled
            ? `Exclude ${character.name}`
            : `Include ${character.name}`
          : undefined
      }
      title={selection.enabled ? (isEnabled ? 'Click to exclude' : 'Click to include') : undefined}
      style={buttonStyle}
    >
      {iconUrl ? (
        <img src={iconUrl} alt={character.name} className={styles.iconImage} />
      ) : (
        <div
          className={styles.iconPlaceholder}
          style={{ backgroundColor: TEAM_COLORS[character.team] }}
        >
          {isLoading ? '...' : character.name.charAt(0)}
        </div>
      )}
      {selection.enabled && !isEnabled && (
        <div className={styles.disabledOverlay}>
          <span className={styles.disabledIcon}>+</span>
        </div>
      )}
    </button>
  );
});

interface CharacterInfoProps {
  character: CharacterRowData;
  visibility: InfoVisibility;
}

/** Character info section (ability, reminders, etc.) */
const CharacterInfo = memo(function CharacterInfo({ character, visibility }: CharacterInfoProps) {
  const hasContent =
    (visibility.showAbility && character.ability) ||
    (visibility.showFirstNightReminder && character.firstNightReminder) ||
    (visibility.showOtherNightReminder && character.otherNightReminder) ||
    (visibility.showReminders && character.reminders && character.reminders.length > 0);

  const hasAnyVisible =
    visibility.showAbility ||
    visibility.showFirstNightReminder ||
    visibility.showOtherNightReminder ||
    visibility.showReminders;

  if (!hasAnyVisible) return null;

  return (
    <div className={styles.characterRight}>
      {visibility.showAbility && character.ability && (
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Ability:</span>
          <span className={styles.infoText}>{character.ability}</span>
        </div>
      )}

      {visibility.showFirstNightReminder && character.firstNightReminder && (
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>First Night:</span>
          <span className={styles.infoText}>{character.firstNightReminder}</span>
        </div>
      )}

      {visibility.showOtherNightReminder && character.otherNightReminder && (
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Other Nights:</span>
          <span className={styles.infoText}>{character.otherNightReminder}</span>
        </div>
      )}

      {visibility.showReminders && character.reminders && character.reminders.length > 0 && (
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Reminders:</span>
          <div className={styles.reminderTagsContainer}>
            {character.reminders.map((reminder, idx) => (
              <span key={`${character.uuid}-reminder-${idx}`} className={styles.reminderTag}>
                {reminder}
              </span>
            ))}
          </div>
        </div>
      )}

      {!hasContent && <div className={styles.noContent}>—</div>}
    </div>
  );
});

interface CharacterRowProps {
  character: CharacterRowData;
  iconUrl: string | undefined;
  isLoading: boolean;
  visibility: InfoVisibility;
  selection: SelectionConfig;
}

/** Single character row with icon, name, and info */
const CharacterRow = memo(function CharacterRow({
  character,
  iconUrl,
  isLoading,
  visibility,
  selection,
}: CharacterRowProps) {
  const isEnabled = selection.metadata
    ? isCharacterEnabled(character.uuid, selection.metadata)
    : true;

  const rowClassName = [
    styles.characterRow,
    selection.enabled && !isEnabled && styles.characterRowDisabled,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div key={character.id} className={rowClassName}>
      <div className={styles.characterLeft}>
        <CharacterIcon
          character={character}
          iconUrl={iconUrl}
          isLoading={isLoading}
          selection={selection}
          isEnabled={isEnabled}
        />
        <div className={styles.characterNameCell}>
          <span className={styles.characterName}>{character.name}</span>
          {character.isOfficial && <span className={styles.officialBadge}>Official</span>}
        </div>
      </div>
      <CharacterInfo character={character} visibility={visibility} />
    </div>
  );
});

interface TeamSectionProps {
  team: Team;
  characters: CharacterRowData[];
  resolvedUrls: Map<string, string>;
  isLoading: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  visibility: InfoVisibility;
  selection: SelectionConfig;
}

/** Collapsible team section with header and character list */
const TeamSection = memo(function TeamSection({
  team,
  characters,
  resolvedUrls,
  isLoading,
  isCollapsed,
  onToggleCollapse,
  visibility,
  selection,
}: TeamSectionProps) {
  return (
    <div className={styles.teamSection}>
      <button
        type="button"
        className={styles.teamHeader}
        style={{ backgroundColor: TEAM_COLORS[team] }}
        onClick={onToggleCollapse}
        aria-expanded={!isCollapsed}
      >
        <span className={styles.collapseIcon}>{isCollapsed ? '▶' : '▼'}</span>
        <span className={styles.teamName}>{TEAM_LABELS[team]}</span>
        <span className={styles.teamCount}>{characters.length}</span>
      </button>

      {!isCollapsed && (
        <div className={styles.characterList}>
          {characters.map((character) => (
            <CharacterRow
              key={character.id}
              character={character}
              iconUrl={resolvedUrls.get(character.uuid)}
              isLoading={isLoading}
              visibility={visibility}
              selection={selection}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// ============================================================================
// Main Component
// ============================================================================

export function CharacterListView({
  characters: charactersProp,
  tokens,
  showAbility = true,
  showFirstNightReminder = false,
  showOtherNightReminder = false,
  showReminders = false,
  showSelection = false,
  characterMetadata,
  onToggleCharacter,
  onToggleAll,
}: CharacterListViewProps) {
  // Track which team sections are collapsed
  const [collapsedTeams, setCollapsedTeams] = useState<Set<Team>>(new Set());

  // Get characters from props or extract from tokens (backward compatibility)
  const characters = useMemo(() => {
    if (charactersProp && charactersProp.length > 0) {
      return charactersProp;
    }
    return tokens ? extractCharactersFromTokens(tokens) : [];
  }, [charactersProp, tokens]);

  // Resolve character images asynchronously
  const { resolvedUrls, isLoading } = useCharacterImageResolver({ characters });

  // Group characters by team
  const groupedCharacters = useMemo(() => {
    const rows = toCharacterRows(characters);
    return groupByTeam(rows);
  }, [characters]);

  // Total character count
  const totalCharacters = useMemo(
    () => Array.from(groupedCharacters.values()).reduce((sum, chars) => sum + chars.length, 0),
    [groupedCharacters]
  );

  // Selection summary for header
  const selectionSummary = useMemo(
    () =>
      showSelection
        ? calculateSelectionSummary(groupedCharacters, characterMetadata, totalCharacters)
        : { enabled: totalCharacters, disabled: 0, total: totalCharacters },
    [showSelection, groupedCharacters, characterMetadata, totalCharacters]
  );

  // Memoized visibility config to prevent unnecessary re-renders
  const visibility: InfoVisibility = useMemo(
    () => ({
      showAbility,
      showFirstNightReminder,
      showOtherNightReminder,
      showReminders,
    }),
    [showAbility, showFirstNightReminder, showOtherNightReminder, showReminders]
  );

  // Memoized selection config
  const selection: SelectionConfig = useMemo(
    () => ({
      enabled: showSelection,
      metadata: characterMetadata,
      onToggle: onToggleCharacter,
    }),
    [showSelection, characterMetadata, onToggleCharacter]
  );

  // Toggle team collapse state
  const toggleTeamCollapse = useCallback((team: Team) => {
    setCollapsedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(team)) {
        next.delete(team);
      } else {
        next.add(team);
      }
      return next;
    });
  }, []);

  // Empty state
  if (totalCharacters === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No characters to display</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {showSelection && <SelectionHeader summary={selectionSummary} onToggleAll={onToggleAll} />}

      {Array.from(groupedCharacters.entries()).map(([team, teamCharacters]) => (
        <TeamSection
          key={team}
          team={team}
          characters={teamCharacters}
          resolvedUrls={resolvedUrls}
          isLoading={isLoading}
          isCollapsed={collapsedTeams.has(team)}
          onToggleCollapse={() => toggleTeamCollapse(team)}
          visibility={visibility}
          selection={selection}
        />
      ))}
    </div>
  );
}
