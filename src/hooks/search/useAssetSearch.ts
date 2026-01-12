/**
 * useAssetSearch Hook
 *
 * Asset-specific search hook for filtering assets in Asset Manager.
 * Searches filename, type, and tags.
 *
 * @module hooks/search/useAssetSearch
 */

import type { SearchConfig, SearchMatch } from '@/ts/utils/searchUtils.js';
import { useSearch } from './useSearch.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Asset shape for search (subset of DBAsset from services/upload/types)
 */
export interface SearchableAsset {
  id: string;
  metadata: {
    filename: string;
    originalFilename?: string;
  };
  type: string;
  tags?: string[];
  description?: string;
}

export interface UseAssetSearchOptions {
  /** Assets to search */
  assets: SearchableAsset[];
  /** Search query string */
  searchTerm: string;
  /** Enable search (default: true) */
  enabled?: boolean;
}

export interface UseAssetSearchResult {
  /** Filtered assets matching the search query */
  filteredAssets: SearchableAsset[];
  /** Get match data for highlighting a text field */
  getMatch: (text: string) => SearchMatch;
  /** Is search currently active (non-empty query)? */
  isSearching: boolean;
  /** Number of results */
  resultCount: number;
}

// ============================================================================
// Configuration
// ============================================================================

const assetSearchConfig: SearchConfig<SearchableAsset> = {
  fields: (asset) => [
    asset.metadata.filename,
    asset.metadata.originalFilename,
    asset.type,
    asset.tags?.join(' '),
    asset.description,
  ],
  getName: (asset) => asset.metadata.filename,
};

// ============================================================================
// Hook
// ============================================================================

/**
 * Asset-specific search hook for Asset Manager.
 *
 * Searches across:
 * - Filename
 * - Original filename
 * - Asset type
 * - Tags
 * - Description
 *
 * @example
 * ```tsx
 * const { filteredAssets, getMatch } = useAssetSearch({
 *   assets: userAssets,
 *   searchTerm: 'background'
 * });
 *
 * // Render with highlighting
 * {filteredAssets.map(asset => (
 *   <div key={asset.id}>
 *     <SearchHighlight match={getMatch(asset.metadata.filename)} />
 *   </div>
 * ))}
 * ```
 */
export function useAssetSearch(options: UseAssetSearchOptions): UseAssetSearchResult {
  const { assets, searchTerm, enabled = true } = options;

  const { filteredItems, getMatch, isSearching, resultCount } = useSearch({
    items: assets,
    query: searchTerm,
    config: assetSearchConfig,
    enabled,
  });

  return {
    filteredAssets: filteredItems,
    getMatch,
    isSearching,
    resultCount,
  };
}
