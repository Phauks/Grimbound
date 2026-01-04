/**
 * Batch Tag Utilities for Asset Management
 *
 * Provides helpers for analyzing and manipulating tags across multiple assets.
 *
 * @module services/upload/batchTagUtils
 */

import { addTag, removeTag } from './tagUtils.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Analysis of tags across a selection of assets
 */
export interface TagAnalysis {
  /** Tags present in ALL selected assets */
  common: string[];
  /** Tags present in SOME assets: tag → count */
  partial: Map<string, number>;
  /** All unique tags across selection */
  all: string[];
}

/**
 * Base type for assets with tags
 */
interface AssetWithTags {
  tags: string[];
}

// ============================================================================
// Analysis
// ============================================================================

/**
 * Analyze tags across a selection of assets
 */
export function analyzeSelectionTags<T extends AssetWithTags>(assets: T[]): TagAnalysis {
  if (assets.length === 0) {
    return { common: [], partial: new Map(), all: [] };
  }

  // Count occurrences of each tag
  const tagCounts = new Map<string, number>();
  for (const asset of assets) {
    for (const tag of asset.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  const common: string[] = [];
  const partial = new Map<string, number>();

  for (const [tag, count] of tagCounts) {
    if (count === assets.length) {
      common.push(tag);
    } else {
      partial.set(tag, count);
    }
  }

  return {
    common,
    partial,
    all: [...tagCounts.keys()],
  };
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Add a tag to all assets in the selection
 * @returns New array with updated assets (does not mutate)
 */
export function addTagToAll<T extends AssetWithTags>(assets: T[], tag: string): T[] {
  return assets.map((asset) => ({
    ...asset,
    tags: addTag(asset.tags, tag),
  }));
}

/**
 * Remove a tag from all assets in the selection
 * @returns New array with updated assets (does not mutate)
 */
export function removeTagFromAll<T extends AssetWithTags>(assets: T[], tag: string): T[] {
  return assets.map((asset) => ({
    ...asset,
    tags: removeTag(asset.tags, tag),
  }));
}

/**
 * Star all assets (add 'starred' tag)
 */
export function starAll<T extends AssetWithTags>(assets: T[]): T[] {
  return addTagToAll(assets, 'starred');
}

/**
 * Unstar all assets (remove 'starred' tag)
 */
export function unstarAll<T extends AssetWithTags>(assets: T[]): T[] {
  return removeTagFromAll(assets, 'starred');
}

/**
 * Get count of starred assets in selection
 */
export function countStarred<T extends AssetWithTags>(assets: T[]): number {
  return assets.filter((a) => a.tags.includes('starred')).length;
}
