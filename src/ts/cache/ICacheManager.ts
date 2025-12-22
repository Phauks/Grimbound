/**
 * Cache Manager Interface
 *
 * Defines the contract for the unified cache facade.
 * Enables dependency injection and testing.
 *
 * @module cache/ICacheManager
 */

import type { Token } from '@/ts/types/index.js';
import type { InvalidationScope } from './CacheInvalidationService.js';
import type {
  CacheStats,
  ICacheStrategy,
  IPreRenderStrategy,
  PreRenderContext,
  PreRenderResult,
} from './core/index.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Combined statistics from all cache layers
 */
export interface CombinedCacheStats {
  /** Pre-render cache statistics by strategy name */
  preRender: Record<string, CacheStats>;
  /** Image cache statistics */
  image: {
    entries: number;
    sizeMB: number;
    maxSizeMB: number;
  };
  /** Font cache statistics */
  font: {
    size: number;
    memoryUsage: number;
    maxSize: number;
    maxMemory: number;
    hitCount: number;
    missCount: number;
    evictionCount: number;
    hitRate: number;
  };
  /** Total cache summary */
  total: {
    layers: number;
    totalEntries: number;
    totalSizeMB: number;
  };
}

/**
 * Options for cache warming
 */
export interface CacheWarmingOptions {
  /** Whether to warm image cache */
  warmImages?: boolean;
  /** Whether to warm pre-render cache */
  warmPreRender?: boolean;
  /** Progress callback (loaded, total) */
  onProgress?: (loaded: number, total: number) => void;
}

// ============================================================================
// Cache Manager Interface
// ============================================================================

/**
 * Unified facade for all cache operations
 */
export interface ICacheManager {
  // ==========================================================================
  // Character Image Access
  // ==========================================================================

  /**
   * Get character image from cache, loading if not present
   */
  getCharacterImage(url: string, isLocal?: boolean): Promise<HTMLImageElement>;

  /**
   * Preload multiple character images in parallel
   */
  preloadImages(
    urls: string[],
    isLocal?: boolean,
    onProgress?: (loaded: number, total: number) => void
  ): Promise<void>;

  /**
   * Check if image is already cached
   */
  hasImage(url: string): boolean;

  // ==========================================================================
  // Pre-Rendered Token Access
  // ==========================================================================

  /**
   * Get pre-rendered token from cache
   */
  getPreRenderedToken(filename: string, strategyName?: string): Promise<string | null>;

  /**
   * Trigger pre-rendering for a batch of tokens
   */
  preRender(context: PreRenderContext): Promise<PreRenderResult>;

  /**
   * Cache a batch of tokens
   */
  cacheTokenBatch(tokens: Token[], type?: string): Promise<void>;

  // ==========================================================================
  // Cache Invalidation
  // ==========================================================================

  /**
   * Invalidate cache when an asset changes
   */
  invalidateAsset(assetId: string, reason?: 'update' | 'delete' | 'manual'): Promise<void>;

  /**
   * Invalidate cache when a character changes
   */
  invalidateCharacter(characterId: string, reason?: 'update' | 'delete' | 'manual'): Promise<void>;

  /**
   * Invalidate cache when a project changes
   */
  invalidateProject(projectId: string, reason?: 'update' | 'delete' | 'manual'): Promise<void>;

  /**
   * Invalidate caches by scope
   */
  invalidate(scope: InvalidationScope): Promise<void>;

  // ==========================================================================
  // Cache Management
  // ==========================================================================

  /**
   * Clear a specific cache by name
   */
  clearCache(name: string): Promise<void>;

  /**
   * Clear all caches
   */
  clearAll(): Promise<void>;

  // ==========================================================================
  // Statistics
  // ==========================================================================

  /**
   * Get combined statistics from all cache layers
   */
  getStats(): CombinedCacheStats;

  /**
   * Get statistics for all pre-render caches
   */
  getAllCacheStats(): Record<string, CacheStats>;

  /**
   * Get statistics for a specific cache
   */
  getCacheStats(name: string): CacheStats | null;

  /**
   * Check if a strategy is currently rendering
   */
  isStrategyRendering(strategyName: string): boolean;

  // ==========================================================================
  // Advanced Access
  // ==========================================================================

  /**
   * Get specific cache instance by name
   */
  getCache(name: string): ICacheStrategy | undefined;

  /**
   * Register a new pre-render strategy
   */
  registerStrategy(strategy: IPreRenderStrategy): void;

  /**
   * Register a new cache instance
   */
  registerCache(name: string, cache: ICacheStrategy): void;
}
