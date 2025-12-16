/**
 * Cache Manager - Unified Facade for All Cache Layers
 *
 * Provides a single, simplified API for accessing all caching functionality:
 * - Pre-rendered tokens (PreRenderCacheManager)
 * - Character images (ImageCache)
 * - Font strings (FontCache)
 * - Cache invalidation (CacheInvalidationService)
 *
 * This facade follows the Facade pattern to hide complexity and provide
 * a clean, unified interface for components and services.
 *
 * Architecture: Application Service (Facade Pattern)
 */

import { PreRenderCacheManager } from './manager/PreRenderCacheManager.js'
import { globalImageCache } from '../utils/imageCache.js'
import { fontCache, getFontCacheStats } from './instances/fontCache.js'
import { cacheInvalidationService } from './CacheInvalidationService.js'
import type {
  PreRenderContext,
  PreRenderResult,
  CacheStats,
  ICacheStrategy,
  IPreRenderStrategy
} from './core/index.js'
import type { InvalidationScope } from './CacheInvalidationService.js'
import type { Token } from '../types/index.js'

// ============================================================================
// Types
// ============================================================================

/**
 * Combined statistics from all cache layers
 */
export interface CombinedCacheStats {
  /** Pre-render cache statistics by strategy name */
  preRender: Record<string, CacheStats>
  /** Image cache statistics */
  image: {
    entries: number
    sizeMB: number
    maxSizeMB: number
  }
  /** Font cache statistics */
  font: {
    size: number
    memoryUsage: number
    maxSize: number
    maxMemory: number
    hitCount: number
    missCount: number
    evictionCount: number
    hitRate: number
  }
  /** Total cache summary */
  total: {
    layers: number
    totalEntries: number
    totalSizeMB: number
  }
}

/**
 * Options for cache warming
 */
export interface CacheWarmingOptions {
  /** Whether to warm image cache */
  warmImages?: boolean
  /** Whether to warm pre-render cache */
  warmPreRender?: boolean
  /** Progress callback (loaded, total) */
  onProgress?: (loaded: number, total: number) => void
}

// ============================================================================
// Cache Manager Facade
// ============================================================================

/**
 * Unified facade for all cache operations.
 *
 * Simplifies cache access by providing a single API instead of requiring
 * direct interaction with multiple cache layers.
 *
 * @example
 * ```typescript
 * // Get character image (checks cache, loads if needed)
 * const image = await cacheManager.getCharacterImage('washerwoman')
 *
 * // Get pre-rendered token
 * const dataUrl = await cacheManager.getPreRenderedToken('washerwoman.png', 'tokens')
 *
 * // Invalidate all caches when asset changes
 * await cacheManager.invalidateAsset('asset-123')
 *
 * // Get combined statistics
 * const stats = cacheManager.getStats()
 * console.log(`Total cache size: ${stats.total.totalSizeMB} MB`)
 * ```
 */
export class CacheManager {
  private preRenderManager: PreRenderCacheManager
  private imageCache: typeof globalImageCache
  private fontCacheInstance: typeof fontCache
  private invalidationService: typeof cacheInvalidationService

  constructor() {
    this.preRenderManager = new PreRenderCacheManager()
    this.imageCache = globalImageCache
    this.fontCacheInstance = fontCache
    this.invalidationService = cacheInvalidationService
  }

  // ==========================================================================
  // Character Image Access
  // ==========================================================================

  /**
   * Get character image from cache, loading if not present.
   *
   * @param url - Image URL or character ID
   * @param isLocal - Whether image is a local file path
   * @returns HTMLImageElement ready for rendering
   *
   * @example
   * ```typescript
   * const img = await cacheManager.getCharacterImage('icons/washerwoman.webp')
   * ctx.drawImage(img, x, y, width, height)
   * ```
   */
  async getCharacterImage(url: string, isLocal: boolean = false): Promise<HTMLImageElement> {
    return this.imageCache.get(url, isLocal)
  }

  /**
   * Preload multiple character images in parallel.
   *
   * @param urls - Array of image URLs to preload
   * @param isLocal - Whether images are local file paths
   * @param onProgress - Optional progress callback
   *
   * @example
   * ```typescript
   * const urls = characters.map(c => c.image)
   * await cacheManager.preloadImages(urls, false, (loaded, total) => {
   *   console.log(`Loaded ${loaded}/${total} images`)
   * })
   * ```
   */
  async preloadImages(
    urls: string[],
    isLocal: boolean = false,
    onProgress?: (loaded: number, total: number) => void
  ): Promise<void> {
    return this.imageCache.preloadMany(urls, isLocal, onProgress)
  }

  /**
   * Check if image is already cached.
   *
   * @param url - Image URL to check
   * @returns True if image is in cache
   */
  hasImage(url: string): boolean {
    return this.imageCache.has(url)
  }

  // ==========================================================================
  // Pre-Rendered Token Access
  // ==========================================================================

  /**
   * Get pre-rendered token from cache.
   *
   * @param filename - Token filename to retrieve
   * @param strategyName - Strategy name ('tokens', 'characters', 'project')
   * @returns Data URL of cached token, or null if not cached
   *
   * @example
   * ```typescript
   * const dataUrl = await cacheManager.getPreRenderedToken('washerwoman.png', 'tokens')
   * if (dataUrl) {
   *   img.src = dataUrl
   * }
   * ```
   */
  async getPreRenderedToken(filename: string, strategyName?: string): Promise<string | null> {
    // If strategy specified, use that cache
    if (strategyName) {
      const cache = this.preRenderManager.getCache(strategyName)
      if (cache) {
        const entry = await cache.get(filename)
        return entry?.value ?? null
      }
      return null
    }

    // Try all caches (gallery, customize, project)
    for (const cacheName of this.preRenderManager.getCacheNames()) {
      const cache = this.preRenderManager.getCache(cacheName)
      if (cache) {
        const entry = await cache.get(filename)
        if (entry?.value) return entry.value
      }
    }

    return null
  }

  /**
   * Trigger pre-rendering for a batch of tokens.
   *
   * @param context - Pre-render context with tokens and settings
   * @returns Result of pre-rendering operation
   *
   * @example
   * ```typescript
   * const result = await cacheManager.preRender({
   *   type: 'tokens-hover',
   *   tokens: visibleTokens,
   *   characters: allCharacters,
   *   generationOptions: options
   * })
   * console.log(`Pre-rendered ${result.rendered} tokens`)
   * ```
   */
  async preRender(context: PreRenderContext): Promise<PreRenderResult> {
    return this.preRenderManager.preRender(context)
  }

  /**
   * Cache a batch of tokens (convenience method for pre-rendering).
   *
   * @param tokens - Array of tokens to cache
   * @param type - Context type ('tokens-hover', 'characters-hover', etc.)
   *
   * @example
   * ```typescript
   * await cacheManager.cacheTokenBatch(allTokens, 'tokens-hover')
   * ```
   */
  async cacheTokenBatch(tokens: Token[], type: string = 'manual'): Promise<void> {
    const result = await this.preRender({
      type: type as any,
      tokens,
      characters: tokens.map(t => t.characterData).filter(Boolean) as any[]
    })

    if (!result.success) {
      throw new Error(`Failed to cache token batch: ${result.error}`)
    }
  }

  // ==========================================================================
  // Cache Invalidation
  // ==========================================================================

  /**
   * Invalidate cache when an asset changes.
   *
   * @param assetId - Asset ID that changed
   * @param reason - Reason for invalidation
   *
   * @example
   * ```typescript
   * await cacheManager.invalidateAsset('asset-123', 'update')
   * ```
   */
  async invalidateAsset(
    assetId: string,
    reason: 'update' | 'delete' | 'manual' = 'manual'
  ): Promise<void> {
    await this.invalidationService.invalidateAsset(assetId, reason)
  }

  /**
   * Invalidate cache when a character changes.
   *
   * @param characterId - Character ID that changed
   * @param reason - Reason for invalidation
   */
  async invalidateCharacter(
    characterId: string,
    reason: 'update' | 'delete' | 'manual' = 'manual'
  ): Promise<void> {
    await this.invalidationService.invalidateCharacter(characterId, reason)
  }

  /**
   * Invalidate cache when a project changes.
   *
   * @param projectId - Project ID that changed
   * @param reason - Reason for invalidation
   */
  async invalidateProject(
    projectId: string,
    reason: 'update' | 'delete' | 'manual' = 'manual'
  ): Promise<void> {
    await this.invalidationService.invalidateProject(projectId, reason)
  }

  /**
   * Invalidate caches by scope.
   *
   * @param scope - Invalidation scope ('asset', 'character', 'project', 'global')
   *
   * @example
   * ```typescript
   * // Clear all caches
   * await cacheManager.invalidate('global')
   *
   * // Clear only asset-related caches
   * await cacheManager.invalidate('asset')
   * ```
   */
  async invalidate(scope: InvalidationScope): Promise<void> {
    if (scope === 'global') {
      await this.invalidationService.invalidateAll('manual')
    } else {
      // For other scopes, trigger appropriate invalidation
      // The listeners will handle clearing the right caches
      const event = {
        scope,
        entityIds: [],
        reason: 'manual' as const,
        timestamp: Date.now()
      }
      await (this.invalidationService as any).emit(event)
    }
  }

  // ==========================================================================
  // Cache Management
  // ==========================================================================

  /**
   * Clear a specific cache by name.
   *
   * @param name - Cache name ('tokens', 'characters', 'project', 'image', 'font')
   *
   * @example
   * ```typescript
   * await cacheManager.clearCache('tokens')
   * ```
   */
  async clearCache(name: string): Promise<void> {
    if (name === 'image') {
      this.imageCache.clear()
    } else if (name === 'font') {
      this.fontCacheInstance.clear()
    } else {
      await this.preRenderManager.clearCache(name)
    }
  }

  /**
   * Clear all caches (pre-render, image, font).
   *
   * @example
   * ```typescript
   * await cacheManager.clearAll()
   * ```
   */
  async clearAll(): Promise<void> {
    await this.preRenderManager.clearAllCaches()
    this.imageCache.clear()
    this.fontCacheInstance.clear()
  }

  // ==========================================================================
  // Statistics
  // ==========================================================================

  /**
   * Get combined statistics from all cache layers.
   *
   * @returns Comprehensive cache statistics
   *
   * @example
   * ```typescript
   * const stats = cacheManager.getStats()
   * console.log(`Total cache size: ${stats.total.totalSizeMB.toFixed(2)} MB`)
   * console.log(`Image cache hit rate: ${(stats.image.entries / stats.image.maxSizeMB * 100).toFixed(1)}%`)
   * ```
   */
  getStats(): CombinedCacheStats {
    const preRenderStats = this.preRenderManager.getAllCacheStats()
    const imageStats = this.imageCache.getStats()
    const fontStats = getFontCacheStats()

    // Calculate totals
    const preRenderEntries = Object.values(preRenderStats).reduce(
      (sum, stats) => sum + stats.size,
      0
    )
    const totalEntries = preRenderEntries + imageStats.entries + fontStats.size
    const totalSizeMB = imageStats.sizeMB + (fontStats.memoryUsage / 1024 / 1024)

    return {
      preRender: preRenderStats,
      image: imageStats,
      font: fontStats,
      total: {
        layers: 3, // pre-render, image, font
        totalEntries,
        totalSizeMB: Math.round(totalSizeMB * 100) / 100
      }
    }
  }

  /**
   * Get statistics for all pre-render caches.
   *
   * @returns Map of cache name to statistics
   */
  getAllCacheStats(): Record<string, CacheStats> {
    return this.preRenderManager.getAllCacheStats()
  }

  /**
   * Get statistics for a specific cache.
   *
   * @param name - Cache name
   * @returns Cache statistics or null if not found
   */
  getCacheStats(name: string): CacheStats | null {
    return this.preRenderManager.getCacheStats(name)
  }

  /**
   * Check if a strategy is currently rendering.
   *
   * @param strategyName - Strategy name to check
   * @returns True if strategy is rendering
   */
  isStrategyRendering(strategyName: string): boolean {
    return this.preRenderManager.isStrategyRendering(strategyName)
  }

  // ==========================================================================
  // Advanced Access (for hooks and components that need direct access)
  // ==========================================================================

  /**
   * Get direct access to pre-render cache manager.
   * For advanced use cases that need full manager API.
   */
  get preRenderCacheManager(): PreRenderCacheManager {
    return this.preRenderManager
  }

  /**
   * Get specific cache instance by name.
   *
   * @param name - Cache name
   * @returns Cache instance or undefined
   */
  getCache(name: string): ICacheStrategy | undefined {
    return this.preRenderManager.getCache(name)
  }

  /**
   * Register a new pre-render strategy.
   * Delegates to PreRenderCacheManager.
   */
  registerStrategy(strategy: IPreRenderStrategy): void {
    this.preRenderManager.registerStrategy(strategy)
  }

  /**
   * Register a new cache instance.
   * Delegates to PreRenderCacheManager.
   */
  registerCache(name: string, cache: ICacheStrategy): void {
    this.preRenderManager.registerCache(name, cache)
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Global cache manager singleton.
 * Provides unified access to all cache layers across the application.
 *
 * @example
 * ```typescript
 * import { cacheManager } from './ts/cache/CacheManager.js'
 *
 * // Get character image
 * const img = await cacheManager.getCharacterImage('icons/washerwoman.webp')
 *
 * // Get pre-rendered token
 * const dataUrl = await cacheManager.getPreRenderedToken('washerwoman.png', 'tokens')
 *
 * // Invalidate when asset changes
 * await cacheManager.invalidateAsset('asset-123', 'update')
 *
 * // Get statistics
 * const stats = cacheManager.getStats()
 * ```
 */
export const cacheManager = new CacheManager()

export default cacheManager
