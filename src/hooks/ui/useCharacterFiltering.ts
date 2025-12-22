/**
 * useCharacterFiltering Hook
 *
 * Manages character filtering state and logic for search, edition,
 * team, and selected-only filters.
 *
 * @module hooks/ui/useCharacterFiltering
 */

import { useCallback, useMemo, useState } from 'react';
import type { Character, Team } from '@/ts/types/index.js';

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

function filterBySearch(char: Character, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  return (
    char.name.toLowerCase().includes(q) ||
    (char.ability?.toLowerCase().includes(q) ?? false) ||
    char.id.toLowerCase().includes(q)
  );
}

// ============================================
// Hook
// ============================================

/**
 * Hook for managing character filtering state and logic
 *
 * @example
 * ```tsx
 * const {
 *   searchQuery, setSearchQuery,
 *   editionFilter, setEditionFilter,
 *   teamFilter, setTeamFilter,
 *   showSelectedOnly, toggleShowSelectedOnly,
 *   filteredCharacters,
 * } = useCharacterFiltering({
 *   characters: officialCharacters,
 *   onScriptIds: currentScriptIds,
 * });
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

  const toggleShowSelectedOnly = useCallback(() => {
    setShowSelectedOnly((prev) => !prev);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const filteredCharacters = useMemo(() => {
    return characters
      .filter((c) => filterByEdition(c, editionFilter))
      .filter((c) => filterByTeam(c, teamFilter))
      .filter((c) => filterBySearch(c, searchQuery))
      .filter((c) => !showSelectedOnly || onScriptIds.has(c.id));
  }, [characters, editionFilter, teamFilter, searchQuery, showSelectedOnly, onScriptIds]);

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
  };
}

export default useCharacterFiltering;
