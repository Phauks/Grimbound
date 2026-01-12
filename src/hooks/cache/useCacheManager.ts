/**
 * React hook for accessing the unified cache manager facade.
 * Provides simplified API for all cache operations across all layers.
 *
 * This hook is complementary to usePreRenderCache - use this when you need
 * simple, unified cache access, and usePreRenderCache when you need
 * strategy-specific functionality.
 *
 * @module hooks/cache/useCacheManager
 */

import type { InvalidationScope } from '@/ts/cache/CacheInvalidationService.js';
import type { CombinedCacheStats } from '@/ts/cache/CacheManager.js';
import { cacheManager } from '@/ts/cache/CacheManager.js';
import type { CacheStats, PreRenderContext, PreRenderResult } from '@/ts/cache/index.js';
import type { Token } from '@/ts/types/index.js';

/**
 * Return type for useCacheManager hook.
 */
export interface UseCacheManagerReturn {
  // Character images
  getCharacterImage: (url: string, isLocal?: boolean) => Promise<HTMLImageElement>;
  preloadImages: (
    urls: string[],
    isLocal?: boolean,
    onProgress?: (loaded: number, total: number) => void
  ) => Promise<void>;
  hasImage: (url: string) => boolean;

  // Pre-rendered tokens
  getPreRenderedToken: (filename: string, strategyName?: string) => Promise<string | null>;
  preRender: (context: PreRenderContext) => Promise<PreRenderResult>;
  cacheTokenBatch: (tokens: Token[], type?: string) => Promise<void>;

  // Invalidation
  invalidateAsset: (assetId: string, reason?: 'update' | 'delete' | 'manual') => Promise<void>;
  invalidateCharacter: (
    characterId: string,
    reason?: 'update' | 'delete' | 'manual'
  ) => Promise<void>;
  invalidateProject: (projectId: string, reason?: 'update' | 'delete' | 'manual') => Promise<void>;
  invalidate: (scope: InvalidationScope) => Promise<void>;

  // Cache management
  clearCache: (name: string) => Promise<void>;
  clearAll: () => Promise<void>;

  // Statistics
  getStats: () => CombinedCacheStats;
  getCacheStats: (name: string) => CacheStats | null;
  isStrategyRendering: (strategyName: string) => boolean;
}

/**
 * React hook for accessing the unified cache manager.
 *
 * This hook provides a simple, unified API for all cache operations:
 * - Character images
 * - Pre-rendered tokens
 * - Cache invalidation
 * - Statistics
 *
 * @returns Unified cache API
 *
 * @example
 * ```tsx
 * function TokenPreview({ token }) {
 *   const cache = useCacheManager()
 *
 *   const loadToken = async () => {
 *     // Simple unified API
 *     const dataUrl = await cache.getPreRenderedToken(token.filename)
 *     if (!dataUrl) {
 *       await cache.preRender({
 *         type: 'manual',
 *         tokens: [token]
 *       })
 *     }
 *   }
 *
 *   return <button onClick={loadToken}>Load</button>
 * }
 * ```
 *
 * @example
 * ```tsx
 * function AssetUploader({ assetId }) {
 *   const cache = useCacheManager()
 *
 *   const handleAssetUpdate = async () => {
 *     await updateAsset(assetId)
 *     // Invalidate all caches that use this asset
 *     await cache.invalidateAsset(assetId, 'update')
 *   }
 *
 *   return <button onClick={handleAssetUpdate}>Update</button>
 * }
 * ```
 */
export function useCacheManager(): UseCacheManagerReturn {
  const getCharacterImage = (url: string, isLocal: boolean = false) =>
    cacheManager.getCharacterImage(url, isLocal);

  const preloadImages = (
    urls: string[],
    isLocal: boolean = false,
    onProgress?: (loaded: number, total: number) => void
  ) => cacheManager.preloadImages(urls, isLocal, onProgress);

  const hasImage = (url: string) => cacheManager.hasImage(url);

  const getPreRenderedToken = (filename: string, strategyName?: string) =>
    cacheManager.getPreRenderedToken(filename, strategyName);

  const preRender = (context: PreRenderContext) => cacheManager.preRender(context);

  const cacheTokenBatch = (tokens: Token[], type: string = 'manual') =>
    cacheManager.cacheTokenBatch(tokens, type);

  const invalidateAsset = (assetId: string, reason: 'update' | 'delete' | 'manual' = 'manual') =>
    cacheManager.invalidateAsset(assetId, reason);

  const invalidateCharacter = (
    characterId: string,
    reason: 'update' | 'delete' | 'manual' = 'manual'
  ) => cacheManager.invalidateCharacter(characterId, reason);

  const invalidateProject = (
    projectId: string,
    reason: 'update' | 'delete' | 'manual' = 'manual'
  ) => cacheManager.invalidateProject(projectId, reason);

  const invalidate = (scope: InvalidationScope) => cacheManager.invalidate(scope);

  const clearCache = (name: string) => cacheManager.clearCache(name);

  const clearAll = () => cacheManager.clearAll();

  const getStats = () => cacheManager.getStats();

  const getCacheStats = (name: string) => cacheManager.getCacheStats(name);

  const isStrategyRendering = (strategyName: string) =>
    cacheManager.isStrategyRendering(strategyName);

  return {
    // Character images
    getCharacterImage,
    preloadImages,
    hasImage,

    // Pre-rendered tokens
    getPreRenderedToken,
    preRender,
    cacheTokenBatch,

    // Invalidation
    invalidateAsset,
    invalidateCharacter,
    invalidateProject,
    invalidate,

    // Cache management
    clearCache,
    clearAll,

    // Statistics
    getStats,
    getCacheStats,
    isStrategyRendering,
  };
}

/**
 * Hook for getting combined statistics from all cache layers.
 * Useful for debug panels or monitoring dashboards.
 *
 * @returns Combined cache statistics
 *
 * @example
 * ```tsx
 * function CacheMonitor() {
 *   const stats = useCombinedCacheStats()
 *
 *   return (
 *     <div>
 *       <h3>Cache Overview</h3>
 *       <p>Total Size: {stats.total.totalSizeMB.toFixed(2)} MB</p>
 *       <p>Total Entries: {stats.total.totalEntries}</p>
 *       <p>Layers: {stats.total.layers}</p>
 *
 *       <h4>Image Cache</h4>
 *       <p>Entries: {stats.image.entries}/{stats.image.maxSizeMB}MB</p>
 *
 *       <h4>Font Cache</h4>
 *       <p>Hit Rate: {(stats.font.hitRate * 100).toFixed(1)}%</p>
 *     </div>
 *   )
 * }
 * ```
 */
export function useCombinedCacheStats(): CombinedCacheStats {
  return cacheManager.getStats();
}

/**
 * Hook for checking if any strategy is currently rendering.
 * Useful for global loading indicators.
 *
 * @param strategyNames - Array of strategy names to check
 * @returns True if any strategy is rendering
 *
 * @example
 * ```tsx
 * function GlobalLoadingIndicator() {
 *   const isRendering = useAnyStrategyRendering(['tokens', 'characters', 'project'])
 *
 *   if (!isRendering) return null
 *
 *   return <div className="loading-spinner">Pre-rendering tokens...</div>
 * }
 * ```
 */
export function useAnyStrategyRendering(strategyNames: string[]): boolean {
  return strategyNames.some((name) => cacheManager.isStrategyRendering(name));
}
