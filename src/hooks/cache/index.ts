/**
 * Cache Hooks Module
 *
 * Provides React hooks for cache management, statistics, and warming.
 *
 * @module hooks/cache
 */

// Cache Manager Hook
export {
  type UseCacheManagerReturn,
  useAnyStrategyRendering,
  useCacheManager,
  useCombinedCacheStats,
} from './useCacheManager';
// Cache Statistics Hook
export {
  type AllCacheStats,
  type CacheLayerStats,
  type UseCacheStatsOptions,
  useCacheStats,
} from './useCacheStats';
// Pre-Render Cache Hook
export {
  type UsePreRenderCacheReturn,
  useAllCacheStats,
  useIsStrategyRendering,
  usePreRenderCache,
} from './usePreRenderCache';
