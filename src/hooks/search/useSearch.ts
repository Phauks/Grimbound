/**
 * useSearch Hook
 *
 * Generic search hook providing filtering, highlighting, and query parsing.
 * Used as a base for entity-specific search hooks.
 *
 * @module hooks/search/useSearch
 */

import {
  getSearchMatch,
  parseSearchQuery,
  type SearchConfig,
  type SearchMatch,
  type SearchQuery,
  searchFilter,
} from '@/ts/utils/searchUtils.js';

// ============================================================================
// Types
// ============================================================================

export interface UseSearchOptions<T> {
  /** Items to search */
  items: T[];
  /** Search query string */
  query: string;
  /** Search configuration (which fields to search) */
  config: SearchConfig<T>;
  /** Enable search (default: true) */
  enabled?: boolean;
}

export interface UseSearchResult<T> {
  /** Filtered items matching the search query */
  filteredItems: T[];
  /** Parsed query info (terms, flags) */
  queryInfo: SearchQuery;
  /** Get match data for highlighting a text field */
  getMatch: (text: string) => SearchMatch;
  /** Is search currently active (non-empty query)? */
  isSearching: boolean;
  /** Number of results */
  resultCount: number;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Generic search hook with filtering and highlighting.
 *
 * Features:
 * - Multi-term AND logic ("night demon" matches items with both terms)
 * - Fuzzy matching with typo tolerance
 * - Special character support ("*" matches "*")
 * - Highlight position calculation for UI
 *
 * @example
 * ```tsx
 * const { filteredItems, getMatch, isSearching } = useSearch({
 *   items: characters,
 *   query: searchTerm,
 *   config: { fields: (c) => [c.name, c.ability] }
 * });
 *
 * // Render with highlighting
 * {filteredItems.map(char => (
 *   <SearchHighlight match={getMatch(char.name)} />
 * ))}
 * ```
 */
export function useSearch<T>(options: UseSearchOptions<T>): UseSearchResult<T> {
  const { items, query, config, enabled = true } = options;

  // Parse query into normalized terms
  const queryInfo = parseSearchQuery(query);

  // Filter items based on search query
  const filteredItems = !enabled || queryInfo.isEmpty ? items : searchFilter(items, query, config);

  // Match function for highlighting
  const getMatch = (text: string): SearchMatch => {
    if (!text || queryInfo.isEmpty) {
      return {
        text: text ?? '',
        matches: [],
        isMatch: true,
        score: 1,
      };
    }
    return getSearchMatch(text, queryInfo.terms);
  };

  return {
    filteredItems,
    queryInfo,
    getMatch,
    isSearching: !queryInfo.isEmpty,
    resultCount: filteredItems.length,
  };
}
