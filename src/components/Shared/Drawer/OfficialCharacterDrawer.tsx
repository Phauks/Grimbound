/**
 * OfficialCharacterDrawer Component
 *
 * A slide-out drawer for selecting official characters to add/remove from the script.
 * Characters are displayed grouped by team with checkboxes indicating script membership.
 *
 * Features:
 * - Full-height side panel sliding from right
 * - Search by name or ability text
 * - Filter by edition (Base 3 vs Experimental)
 * - Filter by team
 * - Toggle characters on/off the script with real-time sync
 * - Collapsible team sections
 * - Escape key to close
 *
 * @module components/Shared/Drawer/OfficialCharacterDrawer
 */

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDataSync } from '@/contexts/DataSyncContext';
import { useTokenContext } from '@/contexts/TokenContext';
import { useOfficialCharacterImages } from '@/hooks/sync/useOfficialCharacterImages';
import { useCharacterFiltering } from '@/hooks/ui/useCharacterFiltering';
import { useDrawerAnimation } from '@/hooks/ui/useDrawerAnimation';
import { useModalBehavior } from '@/hooks/ui/useModalBehavior';
import styles from '@/styles/components/shared/OfficialCharacterDrawer.module.css';
import type { Character, Team } from '@/ts/types/index.js';
import { charactersToJson } from '@/ts/utils/jsonUtils.js';
import { logger } from '@/ts/utils/logger.js';
import { generateStableUuid } from '@/ts/utils/nameGenerator';

// ============================================
// Types
// ============================================

export interface OfficialCharacterDrawerProps {
  /** Whether the drawer is open */
  isOpen: boolean;
  /** Called when the drawer should close */
  onClose: () => void;
}

// ============================================
// Constants
// ============================================

const TEAM_ORDER: Team[] = [
  'townsfolk',
  'outsider',
  'minion',
  'demon',
  'traveller',
  'fabled',
  'loric',
];

const TEAM_DISPLAY_NAMES: Record<Team, string> = {
  townsfolk: 'Townsfolk',
  outsider: 'Outsiders',
  minion: 'Minions',
  demon: 'Demons',
  traveller: 'Travellers',
  fabled: 'Fabled',
  loric: 'Loric',
  meta: 'Meta',
};

// ============================================
// Helper Functions
// ============================================

function groupByTeam(chars: Character[]): Record<Team, Character[]> {
  return TEAM_ORDER.reduce(
    (acc, team) => {
      acc[team] = chars.filter((c) => c.team === team);
      return acc;
    },
    {} as Record<Team, Character[]>
  );
}

// ============================================
// CharacterRow Component
// ============================================

interface CharacterRowProps {
  character: Character;
  isOnScript: boolean;
  imageUrl: string | null;
  onToggle: () => void;
}

const CharacterRow = memo(function CharacterRow({
  character,
  isOnScript,
  imageUrl,
  onToggle,
}: CharacterRowProps) {
  return (
    <button
      type="button"
      className={`${styles.characterRow} ${isOnScript ? styles.characterRowSelected : ''}`}
      onClick={onToggle}
    >
      <input
        type="checkbox"
        className={styles.checkbox}
        checked={isOnScript}
        onChange={onToggle}
        onClick={(e) => e.stopPropagation()}
      />
      <div
        className={`${styles.characterIcon} ${isOnScript ? styles.characterIconSelected : ''}`}
        style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
      />
      <div className={styles.characterInfo}>
        <h4 className={styles.characterName}>{character.name}</h4>
        {character.ability && <p className={styles.abilityText}>{character.ability}</p>}
      </div>
    </button>
  );
});

// ============================================
// TeamSection Component
// ============================================

interface TeamSectionProps {
  team: Team;
  characters: Character[];
  onScriptIds: Set<string>;
  imageUrls: Map<string, string | null>;
  onToggleCharacter: (char: Character) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const TeamSection = memo(function TeamSection({
  team,
  characters,
  onScriptIds,
  imageUrls,
  onToggleCharacter,
  isExpanded,
  onToggleExpand,
}: TeamSectionProps) {
  if (characters.length === 0) return null;

  const teamClassName = styles[`team${team.charAt(0).toUpperCase() + team.slice(1)}`] || '';
  const onScriptCount = characters.filter((c) => onScriptIds.has(c.id)).length;

  return (
    <div className={`${styles.teamSection} ${teamClassName}`}>
      <button type="button" className={styles.teamHeader} onClick={onToggleExpand}>
        <span className={`${styles.teamChevron} ${isExpanded ? styles.teamChevronExpanded : ''}`}>
          &#9654;
        </span>
        <span className={styles.teamName}>{TEAM_DISPLAY_NAMES[team]}</span>
        <span className={styles.teamCount}>
          ({onScriptCount}/{characters.length})
        </span>
      </button>
      <div
        className={`${styles.teamContent} ${isExpanded ? styles.teamContentExpanded : styles.teamContentCollapsed}`}
      >
        {characters.map((char) => (
          <CharacterRow
            key={char.id}
            character={char}
            isOnScript={onScriptIds.has(char.id)}
            imageUrl={imageUrls.get(char.id) ?? null}
            onToggle={() => onToggleCharacter(char)}
          />
        ))}
      </div>
    </div>
  );
});

// ============================================
// Main Component
// ============================================

export const OfficialCharacterDrawer = memo(function OfficialCharacterDrawer({
  isOpen,
  onClose,
}: OfficialCharacterDrawerProps) {
  // Context
  const { getCharacters, getCharacterImage, isInitialized } = useDataSync();
  const { characters, setCharacters, setJsonInput, scriptMeta } = useTokenContext();

  // Drawer animation lifecycle
  const { shouldRender } = useDrawerAnimation({ isOpen });

  // Modal behavior (escape key, body scroll lock)
  const { handleBackdropClick } = useModalBehavior({
    isOpen,
    onClose,
    closeOnEscape: true,
    closeOnBackdrop: true,
  });

  // State
  const [officialCharacters, setOfficialCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedTeams, setExpandedTeams] = useState<Set<Team>>(new Set());

  // Compute which official characters are on script
  const onScriptIds = useMemo(() => {
    return new Set(characters.filter((c) => c.source === 'official').map((c) => c.id));
  }, [characters]);

  // Character filtering
  const {
    searchQuery,
    setSearchQuery,
    editionFilter,
    setEditionFilter,
    teamFilter,
    setTeamFilter,
    showSelectedOnly,
    toggleShowSelectedOnly,
    clearSearch,
    filteredCharacters,
  } = useCharacterFiltering({
    characters: officialCharacters,
    onScriptIds,
  });

  // Image loading
  const { imageUrls, isLoading: imagesLoading } = useOfficialCharacterImages({
    characters: officialCharacters,
    isActive: isOpen && isInitialized,
    getCharacterImage,
  });

  // Load official characters when drawer opens
  useEffect(() => {
    if (!(isOpen && isInitialized)) return;

    let isMounted = true;

    async function loadCharacters() {
      setIsLoading(true);
      try {
        const chars = await getCharacters();
        if (!isMounted) return;
        setOfficialCharacters(chars);
        logger.debug('OfficialCharacterDrawer', `Loaded ${chars.length} characters`);
      } catch (error) {
        logger.error('OfficialCharacterDrawer', 'Failed to load official characters', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadCharacters();

    return () => {
      isMounted = false;
    };
  }, [isOpen, isInitialized, getCharacters]);

  // Group by team
  const charactersByTeam = useMemo(() => {
    return groupByTeam(filteredCharacters);
  }, [filteredCharacters]);

  // Stats
  const totalOnScript = characters.filter((c) => c.source === 'official').length;
  const totalOfficial = officialCharacters.length;

  // Toggle character on/off script
  const toggleCharacter = useCallback(
    async (officialChar: Character) => {
      let updated: Character[];

      if (onScriptIds.has(officialChar.id)) {
        // Remove from script
        updated = characters.filter((c) => c.id !== officialChar.id);
      } else {
        // Add to script
        const uuid = await generateStableUuid(officialChar.id, officialChar.name);
        const newChar: Character = {
          ...officialChar,
          uuid,
          source: 'official',
        };
        updated = [...characters, newChar];
      }

      // Update state
      setCharacters(updated);
      setJsonInput(charactersToJson(updated, scriptMeta));
    },
    [characters, onScriptIds, setCharacters, setJsonInput, scriptMeta]
  );

  // Toggle individual team expansion
  const toggleTeamExpand = useCallback((team: Team) => {
    setExpandedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(team)) {
        next.delete(team);
      } else {
        next.add(team);
      }
      return next;
    });
  }, []);

  // Check if all teams with characters are expanded
  const teamsWithCharacters = TEAM_ORDER.filter((team) => charactersByTeam[team].length > 0);
  const allExpanded =
    teamsWithCharacters.length > 0 && teamsWithCharacters.every((team) => expandedTeams.has(team));

  // Toggle all teams
  const toggleAllTeams = useCallback(() => {
    if (allExpanded) {
      setExpandedTeams(new Set());
    } else {
      setExpandedTeams(new Set(teamsWithCharacters));
    }
  }, [allExpanded, teamsWithCharacters]);

  if (!shouldRender) return null;

  const showLoadingState = isLoading || imagesLoading;

  const drawerContent = (
    <>
      {/* Overlay for backdrop click handling */}
      <div
        className={`${styles.overlay} ${isOpen ? styles.overlayVisible : ''}`}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Official Characters"
      >
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Official Characters</h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close drawer"
          >
            &times;
          </button>
        </div>

        {/* Toolbar */}
        <div className={styles.toolbar}>
          {/* Search */}
          <div className={styles.searchRow}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search by name or ability..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button type="button" className={styles.clearButton} onClick={clearSearch}>
                Clear
              </button>
            )}
          </div>

          {/* Filters */}
          <div className={styles.filterRow}>
            <select
              className={styles.filterSelect}
              value={editionFilter}
              onChange={(e) => setEditionFilter(e.target.value as typeof editionFilter)}
            >
              <option value="all">All Editions</option>
              <option value="base3">Base 3 (TB, SV, BMR)</option>
              <option value="experimental">Experimental</option>
            </select>

            <select
              className={styles.filterSelect}
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value as typeof teamFilter)}
            >
              <option value="all">All Teams</option>
              {TEAM_ORDER.map((team) => (
                <option key={team} value={team}>
                  {TEAM_DISPLAY_NAMES[team]}
                </option>
              ))}
            </select>
          </div>

          {/* Stats and Selected Toggle */}
          <div className={styles.statsRow}>
            <span>
              On Script: <span className={styles.statHighlight}>{totalOnScript}</span> of{' '}
              {totalOfficial}
            </span>
            <div className={styles.statsRowActions}>
              <button
                type="button"
                className={`${styles.selectedToggle} ${showSelectedOnly ? styles.selectedToggleActive : ''}`}
                onClick={toggleShowSelectedOnly}
                title={showSelectedOnly ? 'Show all characters' : 'Show only selected characters'}
              >
                {showSelectedOnly ? '✓ Selected Only' : 'Selected Only'}
              </button>
              <button
                type="button"
                className={styles.expandCollapseButton}
                onClick={toggleAllTeams}
                aria-label={allExpanded ? 'Collapse all sections' : 'Expand all sections'}
                title={allExpanded ? 'Collapse all' : 'Expand all'}
              >
                {allExpanded ? '▲' : '▼'}
              </button>
            </div>
          </div>
        </div>

        {/* Character List */}
        <div className={styles.characterList}>
          {showLoadingState ? (
            <div className={styles.loadingState}>Loading characters...</div>
          ) : filteredCharacters.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>&#128269;</div>
              <p className={styles.emptyText}>No characters match your filters</p>
            </div>
          ) : (
            TEAM_ORDER.map((team) => (
              <TeamSection
                key={team}
                team={team}
                characters={charactersByTeam[team]}
                onScriptIds={onScriptIds}
                imageUrls={imageUrls}
                onToggleCharacter={toggleCharacter}
                isExpanded={expandedTeams.has(team)}
                onToggleExpand={() => toggleTeamExpand(team)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button type="button" className={styles.doneButton} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </>
  );

  return createPortal(drawerContent, document.body);
});

export default OfficialCharacterDrawer;
