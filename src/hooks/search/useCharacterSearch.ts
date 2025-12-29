/**
 * useCharacterSearch Hook
 *
 * Character-specific search hook with pre-configured fields.
 * Searches name, ability, reminders, and other character text.
 *
 * @module hooks/search/useCharacterSearch
 */

import type { Character } from '@/ts/types/index.js';
import type { SearchConfig, SearchMatch } from '@/ts/utils/searchUtils.js';
import { useSearch } from './useSearch.js';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Fields to include in character search.
 * Order by priority (name is most important).
 */
export type CharacterSearchField =
  | 'name'
  | 'ability'
  | 'reminders'
  | 'firstNightReminder'
  | 'otherNightReminder'
  | 'team'
  | 'edition'
  | 'flavor';

const DEFAULT_FIELDS: CharacterSearchField[] = ['name', 'ability', 'reminders'];

/**
 * Extract searchable text from character based on selected fields.
 */
function getCharacterFields(
  character: Character,
  fields: CharacterSearchField[]
): (string | undefined)[] {
  const fieldGetters: Record<CharacterSearchField, () => string | undefined> = {
    name: () => character.name,
    ability: () => character.ability,
    reminders: () => character.reminders?.join(' '),
    firstNightReminder: () => character.firstNightReminder,
    otherNightReminder: () => character.otherNightReminder,
    team: () => character.team,
    edition: () => character.edition,
    flavor: () => character.flavor,
  };

  return fields.map((field) => fieldGetters[field]());
}

// ============================================================================
// Types
// ============================================================================

export interface UseCharacterSearchOptions {
  /** Characters to search */
  characters: Character[];
  /** Search query string */
  searchTerm: string;
  /** Which fields to search (default: name, ability, reminders) */
  fields?: CharacterSearchField[];
  /** Enable search (default: true) */
  enabled?: boolean;
}

export interface UseCharacterSearchResult {
  /** Filtered characters matching the search query */
  filteredCharacters: Character[];
  /** Get match data for highlighting a text field */
  getMatch: (text: string) => SearchMatch;
  /** Is search currently active (non-empty query)? */
  isSearching: boolean;
  /** Number of results */
  resultCount: number;
  /** Search terms parsed from query */
  searchTerms: string[];
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Character-specific search hook with sensible defaults.
 *
 * Searches across multiple character fields by default:
 * - Name (highest priority)
 * - Ability text
 * - Reminders
 *
 * Supports:
 * - Fuzzy matching (1-2 typo tolerance)
 * - Multi-term AND logic ("night demon" finds chars with both)
 * - Special characters ("*" in "Each Night*")
 * - Search highlighting
 *
 * @example
 * ```tsx
 * const { filteredCharacters, getMatch } = useCharacterSearch({
 *   characters: officialCharacters,
 *   searchTerm: 'night demon'
 * });
 *
 * // Render with highlighting
 * {filteredCharacters.map(char => (
 *   <div key={char.id}>
 *     <SearchHighlight match={getMatch(char.name)} />
 *     <SearchHighlight match={getMatch(char.ability)} variant="subtle" />
 *   </div>
 * ))}
 * ```
 */
export function useCharacterSearch(options: UseCharacterSearchOptions): UseCharacterSearchResult {
  const { characters, searchTerm, fields = DEFAULT_FIELDS, enabled = true } = options;

  // Build search config for selected fields
  const config: SearchConfig<Character> = {
    fields: (char) => getCharacterFields(char, fields),
    getName: (char) => char.name,
  };

  const { filteredItems, getMatch, isSearching, resultCount, queryInfo } = useSearch({
    items: characters,
    query: searchTerm,
    config,
    enabled,
  });

  return {
    filteredCharacters: filteredItems,
    getMatch,
    isSearching,
    resultCount,
    searchTerms: queryInfo.terms,
  };
}

export default useCharacterSearch;
