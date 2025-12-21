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

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useDataSync } from '@/contexts/DataSyncContext';
import { useTokenContext } from '@/contexts/TokenContext';
import styles from '@/styles/components/shared/OfficialCharacterDrawer.module.css';
import type { Character, ScriptMeta, Team } from '@/ts/types/index.js';
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

type EditionFilter = 'all' | 'base3' | 'experimental';
type TeamFilter = Team | 'all';

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

const BASE_3_EDITIONS = ['tb', 'snv', 'bmr'];

// ============================================
// Helper Functions
// ============================================

function filterByEdition(char: Character, filter: EditionFilter): boolean {
  if (filter === 'all') return true;
  const isBase3 = BASE_3_EDITIONS.includes(char.edition || '');
  return filter === 'base3' ? isBase3 : !isBase3;
}

function filterByTeam(char: Character, filter: TeamFilter): boolean {
  if (filter === 'all') return true;
  return char.team === filter;
}

function filterBySearch(char: Character, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  return (
    char.name.toLowerCase().includes(q) ||
    (char.ability?.toLowerCase().includes(q) ?? false) ||
    char.id.toLowerCase().includes(q)
  );
}

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
        {character.ability && (
          <p className={styles.abilityText}>{character.ability}</p>
        )}
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
      <button
        type="button"
        className={styles.teamHeader}
        onClick={onToggleExpand}
      >
        <span
          className={`${styles.teamChevron} ${isExpanded ? styles.teamChevronExpanded : ''}`}
        >
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
// Helper: Convert characters array to JSON
// ============================================

function charactersToJson(characters: Character[], scriptMeta: ScriptMeta | null): string {
  // Build the JSON array
  const jsonArray: unknown[] = [];

  // Add meta first if present
  if (scriptMeta) {
    const metaEntry: Record<string, unknown> = { id: '_meta' };
    if (scriptMeta.name) metaEntry.name = scriptMeta.name;
    if (scriptMeta.author) metaEntry.author = scriptMeta.author;
    if (scriptMeta.logo) metaEntry.logo = scriptMeta.logo;
    jsonArray.push(metaEntry);
  }

  // Add characters
  for (const char of characters) {
    if (char.source === 'official') {
      // Official characters: just use the ID string
      jsonArray.push(char.id);
    } else {
      // Custom characters: include full definition
      const charEntry: Record<string, unknown> = {
        id: char.id,
        name: char.name,
      };
      if (char.team && char.team !== 'townsfolk') charEntry.team = char.team;
      if (char.ability) charEntry.ability = char.ability;
      if (char.image) charEntry.image = char.image;
      if (char.reminders?.length) charEntry.reminders = char.reminders;
      if (char.remindersGlobal?.length) charEntry.remindersGlobal = char.remindersGlobal;
      if (char.setup !== undefined) charEntry.setup = char.setup;
      if (char.firstNight !== undefined) charEntry.firstNight = char.firstNight;
      if (char.firstNightReminder) charEntry.firstNightReminder = char.firstNightReminder;
      if (char.otherNight !== undefined) charEntry.otherNight = char.otherNight;
      if (char.otherNightReminder) charEntry.otherNightReminder = char.otherNightReminder;
      jsonArray.push(charEntry);
    }
  }

  return JSON.stringify(jsonArray, null, 2);
}

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

  // State
  const [officialCharacters, setOfficialCharacters] = useState<Character[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editionFilter, setEditionFilter] = useState<EditionFilter>('all');
  const [teamFilter, setTeamFilter] = useState<TeamFilter>('all');
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [imageUrls, setImageUrls] = useState<Map<string, string | null>>(new Map());
  const [expandedTeams, setExpandedTeams] = useState<Set<Team>>(new Set());

  // Track blob URLs for cleanup
  const blobUrlsRef = useRef<string[]>([]);

  // For animation - keep in DOM during close
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Load official characters when drawer opens
  useEffect(() => {
    if (!isOpen || !isInitialized) return;

    let isMounted = true;

    async function loadCharacters() {
      setIsLoading(true);
      try {
        const chars = await getCharacters();
        if (!isMounted) return;

        setOfficialCharacters(chars);

        // Load images from IndexedDB cache and convert to blob URLs
        const urlMap = new Map<string, string | null>();
        const newBlobUrls: string[] = [];

        // Load images in batches to avoid overwhelming the browser
        const BATCH_SIZE = 20;
        for (let i = 0; i < chars.length; i += BATCH_SIZE) {
          const batch = chars.slice(i, i + BATCH_SIZE);
          await Promise.all(
            batch.map(async (char) => {
              try {
                const blob = await getCharacterImage(char.id);
                if (blob && isMounted) {
                  const blobUrl = URL.createObjectURL(blob);
                  urlMap.set(char.id, blobUrl);
                  newBlobUrls.push(blobUrl);
                } else {
                  urlMap.set(char.id, null);
                }
              } catch {
                urlMap.set(char.id, null);
              }
            })
          );

          // Update state progressively for smoother UX
          if (isMounted) {
            setImageUrls(new Map(urlMap));
          }
        }

        // Store blob URLs for cleanup
        blobUrlsRef.current = newBlobUrls;

        logger.debug('OfficialCharacterDrawer', `Loaded ${chars.length} characters, ${newBlobUrls.length} images`);
      } catch (error) {
        logger.error('OfficialCharacterDrawer', 'Failed to load official characters', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadCharacters();

    // Cleanup blob URLs when drawer closes or unmounts
    return () => {
      isMounted = false;
      blobUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      blobUrlsRef.current = [];
    };
  }, [isOpen, isInitialized, getCharacters, getCharacterImage]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Compute which official characters are on script
  const onScriptIds = useMemo(() => {
    return new Set(
      characters
        .filter((c) => c.source === 'official')
        .map((c) => c.id)
    );
  }, [characters]);

  // Filter characters
  const filteredCharacters = useMemo(() => {
    return officialCharacters
      .filter((c) => filterByEdition(c, editionFilter))
      .filter((c) => filterByTeam(c, teamFilter))
      .filter((c) => filterBySearch(c, searchQuery))
      .filter((c) => !showSelectedOnly || onScriptIds.has(c.id));
  }, [officialCharacters, editionFilter, teamFilter, searchQuery, showSelectedOnly, onScriptIds]);

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

  // Handle overlay click
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // Clear filters
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

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
  const allExpanded = teamsWithCharacters.length > 0 && teamsWithCharacters.every((team) => expandedTeams.has(team));

  // Toggle all teams
  const toggleAllTeams = useCallback(() => {
    if (allExpanded) {
      // Collapse all
      setExpandedTeams(new Set());
    } else {
      // Expand all teams that have characters
      setExpandedTeams(new Set(teamsWithCharacters));
    }
  }, [allExpanded, teamsWithCharacters]);

  if (!shouldRender) return null;

  const drawerContent = (
    <>
      {/* Overlay */}
      <div
        className={`${styles.overlay} ${isOpen ? styles.overlayVisible : ''}`}
        onClick={handleOverlayClick}
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
          <div className={styles.headerButtons}>
            <button
              type="button"
              className={styles.expandCollapseButton}
              onClick={toggleAllTeams}
              aria-label={allExpanded ? 'Collapse all sections' : 'Expand all sections'}
              title={allExpanded ? 'Collapse all' : 'Expand all'}
            >
              {allExpanded ? '▲' : '▼'}
            </button>
            <button
              type="button"
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Close drawer"
            >
              &times;
            </button>
          </div>
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
              autoFocus={isOpen}
            />
            {searchQuery && (
              <button
                type="button"
                className={styles.clearButton}
                onClick={handleClearSearch}
              >
                Clear
              </button>
            )}
          </div>

          {/* Filters */}
          <div className={styles.filterRow}>
            <select
              className={styles.filterSelect}
              value={editionFilter}
              onChange={(e) => setEditionFilter(e.target.value as EditionFilter)}
            >
              <option value="all">All Editions</option>
              <option value="base3">Base 3 (TB, SV, BMR)</option>
              <option value="experimental">Experimental</option>
            </select>

            <select
              className={styles.filterSelect}
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value as TeamFilter)}
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
            <button
              type="button"
              className={`${styles.selectedToggle} ${showSelectedOnly ? styles.selectedToggleActive : ''}`}
              onClick={() => setShowSelectedOnly(!showSelectedOnly)}
              title={showSelectedOnly ? 'Show all characters' : 'Show only selected characters'}
            >
              {showSelectedOnly ? '✓ Selected Only' : 'Selected Only'}
            </button>
          </div>
        </div>

        {/* Character List */}
        <div className={styles.characterList}>
          {isLoading ? (
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
