/**
 * Asset Suggestion Service
 *
 * Suggests relevant assets for characters using intelligent ranking algorithms.
 * Combines exact matching, fuzzy matching, usage frequency, and recency.
 *
 * @module services/upload/AssetSuggestionService
 */

import { assetStorageService } from './AssetStorageService.js';
import type { AssetWithUrl, AssetType } from './types.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Scored asset suggestion with ranking details
 */
export interface AssetSuggestion {
  /** The suggested asset */
  asset: AssetWithUrl;
  /** Total relevance score (0-100) */
  score: number;
  /** Breakdown of score components */
  scoreBreakdown: {
    exactMatch: number;
    fuzzyMatch: number;
    recency: number;
    frequency: number;
  };
  /** Reason for suggestion (for debugging/display) */
  reason: string;
}

/**
 * Options for asset suggestions
 */
export interface SuggestionOptions {
  /** Maximum number of suggestions to return (default: 10) */
  limit?: number;
  /** Minimum score threshold (0-100, default: 10) */
  minScore?: number;
  /** Asset type filter (default: 'character-icon') */
  assetType?: AssetType;
  /** Project ID context (for scoped suggestions) */
  projectId?: string | null;
  /** Include usage stats in scoring (default: true) */
  includeUsageStats?: boolean;
}

// ============================================================================
// Scoring Constants
// ============================================================================

const SCORE_WEIGHTS = {
  EXACT_MATCH: 100,        // Perfect filename match
  FUZZY_MATCH_HIGH: 80,    // Very close match (>80% similarity)
  FUZZY_MATCH_MEDIUM: 50,  // Moderate match (50-80% similarity)
  FUZZY_MATCH_LOW: 30,     // Weak match (30-50% similarity)
  RECENT_USE_MAX: 30,      // Most recently used
  FREQUENT_USE_MAX: 20,    // Most frequently used
};

const RECENCY_DECAY_DAYS = 30; // After 30 days, recency bonus decays to 0

// ============================================================================
// AssetSuggestionService
// ============================================================================

/**
 * Service for suggesting relevant assets based on context
 */
export class AssetSuggestionService {
  /**
   * Suggest assets for a character by name
   *
   * @param characterName - Character name to match against
   * @param options - Suggestion options
   * @returns Ranked array of suggested assets
   */
  async suggestForCharacter(
    characterName: string,
    options: SuggestionOptions = {}
  ): Promise<AssetSuggestion[]> {
    const {
      limit = 10,
      minScore = 10,
      assetType = 'character-icon',
      projectId,
      includeUsageStats = true,
    } = options;

    // Fetch all assets of the specified type
    const assets = await assetStorageService.listWithUrls({
      type: assetType,
      projectId: projectId === undefined ? 'all' : projectId,
    });

    if (assets.length === 0) {
      return [];
    }

    // Score each asset
    const scored: AssetSuggestion[] = assets.map((asset) => {
      const score = this.scoreAsset(asset, characterName, includeUsageStats);
      return score;
    });

    // Filter by minimum score, sort by score descending, and limit
    return scored
      .filter((suggestion) => suggestion.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Score an asset's relevance to a character name
   *
   * @param asset - Asset to score
   * @param characterName - Target character name
   * @param includeUsageStats - Whether to include usage in scoring
   * @returns Scored suggestion
   */
  private scoreAsset(
    asset: AssetWithUrl,
    characterName: string,
    includeUsageStats: boolean
  ): AssetSuggestion {
    const breakdown = {
      exactMatch: 0,
      fuzzyMatch: 0,
      recency: 0,
      frequency: 0,
    };

    const filename = asset.metadata.filename.toLowerCase();
    const searchTerm = characterName.toLowerCase();

    // 1. Exact match scoring
    if (filename.includes(searchTerm)) {
      breakdown.exactMatch = SCORE_WEIGHTS.EXACT_MATCH;
    }

    // 2. Fuzzy match scoring (only if no exact match)
    if (breakdown.exactMatch === 0) {
      const similarity = this.calculateSimilarity(filename, searchTerm);
      if (similarity > 0.8) {
        breakdown.fuzzyMatch = SCORE_WEIGHTS.FUZZY_MATCH_HIGH;
      } else if (similarity > 0.5) {
        breakdown.fuzzyMatch = SCORE_WEIGHTS.FUZZY_MATCH_MEDIUM;
      } else if (similarity > 0.3) {
        breakdown.fuzzyMatch = SCORE_WEIGHTS.FUZZY_MATCH_LOW;
      }
    }

    // 3. Recency scoring (if usage tracking enabled)
    if (includeUsageStats && asset.lastUsedAt) {
      const daysSinceUse = (Date.now() - asset.lastUsedAt) / (1000 * 60 * 60 * 24);
      const recencyFactor = Math.max(0, 1 - daysSinceUse / RECENCY_DECAY_DAYS);
      breakdown.recency = recencyFactor * SCORE_WEIGHTS.RECENT_USE_MAX;
    }

    // 4. Frequency scoring (if usage tracking enabled)
    if (includeUsageStats && asset.usageCount) {
      // Logarithmic scale: 1 use = 0, 10 uses = ~50%, 100 uses = 100%
      const frequencyFactor = Math.min(1, Math.log10(asset.usageCount + 1) / 2);
      breakdown.frequency = frequencyFactor * SCORE_WEIGHTS.FREQUENT_USE_MAX;
    }

    // Calculate total score
    const score = Math.round(
      breakdown.exactMatch + breakdown.fuzzyMatch + breakdown.recency + breakdown.frequency
    );

    // Determine reason
    let reason = '';
    if (breakdown.exactMatch > 0) {
      reason = 'Exact filename match';
    } else if (breakdown.fuzzyMatch > 0) {
      reason = 'Similar filename';
    } else if (breakdown.recency > 0) {
      reason = 'Recently used';
    } else if (breakdown.frequency > 0) {
      reason = 'Frequently used';
    } else {
      reason = 'Available asset';
    }

    return {
      asset,
      score,
      scoreBreakdown: breakdown,
      reason,
    };
  }

  /**
   * Calculate string similarity using Levenshtein distance
   * Returns a value between 0 (completely different) and 1 (identical)
   *
   * @param str1 - First string
   * @param str2 - Second string
   * @returns Similarity score (0-1)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    // Handle edge cases
    if (str1 === str2) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;

    // Check if one string contains the other
    if (str1.includes(str2) || str2.includes(str1)) {
      return Math.max(str2.length / str1.length, str1.length / str2.length);
    }

    // Calculate Levenshtein distance
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);

    // Convert distance to similarity (1 = identical, 0 = completely different)
    return 1 - distance / maxLength;
  }

  /**
   * Calculate Levenshtein distance between two strings
   * (minimum number of single-character edits needed to transform one string into another)
   *
   * @param str1 - First string
   * @param str2 - Second string
   * @returns Edit distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;

    // Create a 2D array for dynamic programming
    const matrix: number[][] = Array.from({ length: len1 + 1 }, () =>
      Array(len2 + 1).fill(0)
    );

    // Initialize first column and row
    for (let i = 0; i <= len1; i++) {
      matrix[i][0] = i;
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,      // deletion
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return matrix[len1][len2];
  }

  /**
   * Get top N most used assets (for general suggestions)
   *
   * @param assetType - Type of assets to fetch
   * @param limit - Number of assets to return
   * @param projectId - Optional project scope
   * @returns Top used assets with URLs
   */
  async getMostUsedAssets(
    assetType: AssetType = 'character-icon',
    limit: number = 10,
    projectId?: string | null
  ): Promise<AssetWithUrl[]> {
    const assets = await assetStorageService.listWithUrls({
      type: assetType,
      projectId: projectId === undefined ? 'all' : projectId,
      sortBy: 'usageCount',
      sortDirection: 'desc',
    });

    return assets.slice(0, limit);
  }

  /**
   * Get recently used assets (for quick access)
   *
   * @param assetType - Type of assets to fetch
   * @param limit - Number of assets to return
   * @param projectId - Optional project scope
   * @returns Recently used assets with URLs
   */
  async getRecentlyUsedAssets(
    assetType: AssetType = 'character-icon',
    limit: number = 10,
    projectId?: string | null
  ): Promise<AssetWithUrl[]> {
    const assets = await assetStorageService.listWithUrls({
      type: assetType,
      projectId: projectId === undefined ? 'all' : projectId,
      sortBy: 'lastUsedAt',
      sortDirection: 'desc',
    });

    // Filter out assets that have never been used
    return assets.filter((a) => a.lastUsedAt !== undefined).slice(0, limit);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Singleton instance of AssetSuggestionService
 */
export const assetSuggestionService = new AssetSuggestionService();
