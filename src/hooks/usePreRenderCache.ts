/**
 * React hook for accessing pre-render cache manager.
 * Provides convenient API for components to trigger pre-rendering and access caches.
 */

import { usePreRenderCacheManager } from '../contexts/PreRenderCacheContext.js'
import type {
  PreRenderContext,
  PreRenderResult,
  ICacheStrategy,
  CacheStats
} from '../ts/cache/index.js'

/**
 * Return type for usePreRenderCache hook.
 */
export interface UsePreRenderCacheReturn {
  /** Cache instance for this strategy */
  cache: ICacheStrategy | undefined
  /** Current cache statistics */
  stats: CacheStats | null
  /** Trigger pre-rendering with context */
  preRender: (context: Partial<PreRenderContext>) => Promise<PreRenderResult>
  /** Clear this cache */
  clearCache: () => Promise<void>
  /** Access to full manager (for advanced use) */
  manager: ReturnType<typeof usePreRenderCacheManager>
}

/**
 * React hook for accessing pre-render cache by strategy name.
 * Provides convenient API for components to:
 * - Access cache instances
 * - Trigger pre-rendering
 * - View cache statistics
 * - Clear caches
 *
 * @param strategyName - Name of the pre-render strategy ('tokens', 'characters', 'project')
 * @returns Cache API for the specified strategy
 *
 * @example
 * ```tsx
 * const { cache, stats, preRender } = usePreRenderCache('tokens')
 *
 * // Trigger pre-rendering on hover
 * const handleHover = () => {
 *   preRender({
 *     type: 'tokens-hover',
 *     tokens: allTokens
 *   })
 * }
 *
 * // Access cache directly
 * const dataUrl = await cache?.get(token.filename)
 * ```
 */
export function usePreRenderCache(strategyName: string): UsePreRenderCacheReturn {
  const manager = usePreRenderCacheManager()

  const cache = manager.getCache(strategyName)
  const stats = manager.getCacheStats(strategyName)

  /**
   * Trigger pre-rendering with given context.
   * Fills in defaults for convenience.
   */
  const preRender = async (context: Partial<PreRenderContext>): Promise<PreRenderResult> => {
    const fullContext: PreRenderContext = {
      type: context.type ?? 'manual',
      tokens: context.tokens ?? [],
      characters: context.characters,
      generationOptions: context.generationOptions,
      projectId: context.projectId,
      metadata: context.metadata
    }

    return manager.preRender(fullContext)
  }

  /**
   * Clear cache for this strategy.
   */
  const clearCache = async (): Promise<void> => {
    await manager.clearCache(strategyName)
  }

  return {
    cache,
    stats,
    preRender,
    clearCache,
    manager
  }
}

/**
 * Hook for accessing global cache statistics across all caches.
 * Useful for debug panels or cache monitoring UIs.
 *
 * @returns Map of cache name to statistics
 *
 * @example
 * ```tsx
 * const allStats = useAllCacheStats()
 *
 * return (
 *   <div>
 *     {Object.entries(allStats).map(([name, stats]) => (
 *       <div key={name}>
 *         {name}: {stats.hitRate * 100}% hit rate
 *       </div>
 *     ))}
 *   </div>
 * )
 * ```
 */
export function useAllCacheStats(): Record<string, CacheStats> {
  const manager = usePreRenderCacheManager()
  return manager.getAllCacheStats()
}

/**
 * Hook to check if a strategy is currently rendering.
 * Useful for showing loading indicators.
 *
 * @param strategyName - Strategy name to check
 * @returns True if strategy is currently rendering
 *
 * @example
 * ```tsx
 * const isRendering = useIsStrategyRendering('tokens')
 *
 * return (
 *   <button disabled={isRendering}>
 *     {isRendering ? 'Pre-rendering...' : 'Generate'}
 *   </button>
 * )
 * ```
 */
export function useIsStrategyRendering(strategyName: string): boolean {
  const manager = usePreRenderCacheManager()
  return manager.isStrategyRendering(strategyName)
}
