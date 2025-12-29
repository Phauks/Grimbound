/**
 * useCharacterFiltering Hook
 *
 * Manages character filtering state and logic for search, edition,
 * team, and selected-only filters.
 *
 * Uses the modular search system for fuzzy matching, special character
 * support, multi-term AND logic, and search highlighting.
 *
 * @module hooks/ui/useCharacterFiltering
 */

import { useCallback, useMemo, useState } from 'react';
import { useCharacterSearch } from '@/hooks/search/useCharacterSearch.js';
import type { Character, Team } from '@/ts/types/index.js';
import type { SearchMatch } from '@/ts/utils/searchUtils.js';

// ============================================
// Types
// ============================================

export type EditionFilter = 'all' | 'base3' | 'experimental';
export type TeamFilter = Team | 'all';

interface UseCharacterFilteringOptions {
  /** All characters to filter */
  characters: Character[];
  /** Set of character IDs currently on the script */
  onScriptIds: Set<string>;
}

interface UseCharacterFilteringReturn {
  /** Current search query */
  searchQuery: string;
  /** Set search query */
  setSearchQuery: (query: string) => void;
  /** Current edition filter */
  editionFilter: EditionFilter;
  /** Set edition filter */
  setEditionFilter: (filter: EditionFilter) => void;
  /** Current team filter */
  teamFilter: TeamFilter;
  /** Set team filter */
  setTeamFilter: (filter: TeamFilter) => void;
  /** Whether to show only selected characters */
  showSelectedOnly: boolean;
  /** Toggle show selected only */
  toggleShowSelectedOnly: () => void;
  /** Clear search query */
  clearSearch: () => void;
  /** Filtered characters */
  filteredCharacters: Character[];
  /** Get search match data for highlighting a text field */
  getSearchMatch: (text: string) => SearchMatch;
  /** Is search currently active (non-empty query)? */
  isSearching: boolean;
}

// ============================================
// Constants
// ============================================

const BASE_3_EDITIONS = ['tb', 'snv', 'bmr'];

// ============================================
// Filter Functions
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

// ============================================
// Hook
// ============================================

/**
 * Hook for managing character filtering state and logic.
 *
 * Features:
 * - Fuzzy matching with typo tolerance (1-2 characters)
 * - Special character support ('*' in "Each Night*")
 * - Multi-term AND logic ("night demon" finds both terms)
 * - Search highlighting via getSearchMatch()
 *
 * @example
 * ```tsx
 * const {
 *   searchQuery, setSearchQuery,
 *   editionFilter, setEditionFilter,
 *   teamFilter, setTeamFilter,
 *   showSelectedOnly, toggleShowSelectedOnly,
 *   filteredCharacters,
 *   getSearchMatch,
 * } = useCharacterFiltering({
 *   characters: officialCharacters,
 *   onScriptIds: currentScriptIds,
 * });
 *
 * // With highlighting
 * <SearchHighlight match={getSearchMatch(char.name)} />
 * ```
 */
export function useCharacterFiltering({
  characters,
  onScriptIds,
}: UseCharacterFilteringOptions): UseCharacterFilteringReturn {
  const [searchQuery, setSearchQuery] = useState('');
  const [editionFilter, setEditionFilter] = useState<EditionFilter>('all');
  const [teamFilter, setTeamFilter] = useState<TeamFilter>('all');
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);

  // Use the modular character search for fuzzy matching and highlighting
  const {
    filteredCharacters: searchFiltered,
    getMatch,
    isSearching,
  } = useCharacterSearch({
    characters,
    searchTerm: searchQuery,
    fields: ['name', 'ability', 'reminders'],
  });

  const toggleShowSelectedOnly = useCallback(() => {
    setShowSelectedOnly((prev) => !prev);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  // Apply additional filters (edition, team, selected-only) on top of search results
  const filteredCharacters = useMemo(
    () =>
      searchFiltered
        .filter((c) => filterByEdition(c, editionFilter))
        .filter((c) => filterByTeam(c, teamFilter))
        .filter((c) => !showSelectedOnly || onScriptIds.has(c.id)),
    [searchFiltered, editionFilter, teamFilter, showSelectedOnly, onScriptIds]
  );

  return {
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
    getSearchMatch: getMatch,
    isSearching,
  };
}

export default useCharacterFiltering;
