/**
 * Cache Hooks Module
 *
 * Provides React hooks for cache management, statistics, and warming.
 *
 * @module hooks/cache
 */

// Cache Manager Hook
export {
  useCacheManager,
  useCombinedCacheStats,
  useAnyStrategyRendering,
  type UseCacheManagerReturn,
} from './useCacheManager';

// Pre-Render Cache Hook
export {
  usePreRenderCache,
  useAllCacheStats,
  useIsStrategyRendering,
  type UsePreRenderCacheReturn,
} from './usePreRenderCache';

// Cache Statistics Hook
export {
  useCacheStats,
  type CacheLayerStats,
  type AllCacheStats,
  type UseCacheStatsOptions,
} from './useCacheStats';

// Project Cache Warming Hook
export { useProjectCacheWarming } from './useProjectCacheWarming';
