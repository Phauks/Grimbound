/**
 * useCacheStats Hook - Aggregate cache statistics from all layers
 *
 * Collects real-time stats from:
 * - Pre-render cache (canvas tokens)
 * - Image cache (character images)
 * - Font cache (loaded fonts)
 * - Asset URL cache (blob URLs)
 *
 * @module hooks/cache/useCacheStats
 */

import { useCallback, useEffect, useState } from 'react';
import { useAssetStorageService } from '@/contexts/ServiceContext';
import { globalImageCache } from '@/ts/utils/imageCache.js';
import { logger } from '@/ts/utils/logger.js';

/**
 * Cache statistics for a single layer
 */
export interface CacheLayerStats {
  name: string;
  entryCount: number;
  maxSize?: number;
  hitCount?: number;
  missCount?: number;
  hitRate?: number;
  evictionCount?: number;
  memoryUsageMB?: number;
  lastAccessed?: number;
}

/**
 * Aggregated cache statistics
 */
export interface AllCacheStats {
  preRender: CacheLayerStats;
  imageCache: CacheLayerStats;
  fontCache: CacheLayerStats;
  assetUrls: CacheLayerStats;
  totalMemoryMB: number;
  recommendations: string[];
}

/**
 * Hook options
 */
export interface UseCacheStatsOptions {
  /** Auto-refresh interval in ms (0 = disabled, default: 1000) */
  refreshInterval?: number;
  /** Include detailed recommendations */
  includeRecommendations?: boolean;
}

/**
 * Get statistics from the image cache
 */
function getImageCacheStats(): CacheLayerStats {
  const stats = globalImageCache.getStats();

  return {
    name: 'Image Cache',
    entryCount: stats.entries,
    maxSize: stats.maxSizeMB,
    memoryUsageMB: stats.sizeMB,
  };
}

/**
 * Get statistics from the asset URL cache
 */
async function getAssetUrlCacheStats(
  assetStorageService: ReturnType<typeof useAssetStorageService>
): Promise<CacheLayerStats> {
  const stats = assetStorageService.getUrlCacheStats();

  return {
    name: 'Asset URLs',
    entryCount: stats.cachedUrls,
    memoryUsageMB: stats.estimatedSizeMB,
  };
}

/**
 * Get statistics from font cache (if available)
 */
function getFontCacheStats(): CacheLayerStats {
  // Check if fonts are loaded
  const loadedFonts = document.fonts ? Array.from(document.fonts.values()) : [];

  return {
    name: 'Font Cache',
    entryCount: loadedFonts.length,
    memoryUsageMB: loadedFonts.length * 0.1, // Rough estimate: ~100KB per font
  };
}

/**
 * Get statistics from pre-render cache (if available)
 */
function getPreRenderCacheStats(): CacheLayerStats {
  // This would integrate with PreRenderCacheManager if available
  // For now, return basic structure
  return {
    name: 'Pre-Render Cache',
    entryCount: 0,
    maxSize: 50,
    hitCount: 0,
    missCount: 0,
    hitRate: 0,
    memoryUsageMB: 0,
  };
}

/**
 * Generate cache recommendations based on stats
 */
function generateRecommendations(stats: AllCacheStats): string[] {
  const recommendations: string[] = [];

  // Image cache recommendations
  if (stats.imageCache.hitRate !== undefined && stats.imageCache.hitRate < 0.5) {
    recommendations.push(
      `Image cache hit rate is low (${(stats.imageCache.hitRate * 100).toFixed(0)}%). Consider increasing maxSize.`
    );
  }

  if (stats.imageCache.entryCount === stats.imageCache.maxSize) {
    recommendations.push(
      'Image cache is at maximum capacity. Increase maxSize to reduce evictions.'
    );
  }

  // Memory recommendations
  if (stats.totalMemoryMB > 100) {
    recommendations.push(
      `High memory usage (${stats.totalMemoryMB.toFixed(1)} MB). Consider clearing caches or reducing maxSize.`
    );
  }

  // Asset URL recommendations
  if (stats.assetUrls.entryCount > 100) {
    recommendations.push(
      `Many asset URLs cached (${stats.assetUrls.entryCount}). Consider releasing unused URLs.`
    );
  }

  // Pre-render cache recommendations
  if (stats.preRender.hitRate !== undefined && stats.preRender.hitRate < 0.3) {
    recommendations.push(
      'Pre-render cache hit rate is very low. Cache may not be effective for current usage pattern.'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('✓ All caches operating efficiently');
  }

  return recommendations;
}

/**
 * Hook for monitoring cache statistics across all layers
 *
 * @param options - Hook configuration
 * @returns Cache statistics and control functions
 *
 * @example
 * ```tsx
 * function CacheDebugPanel() {
 *   const { stats, refresh, clearAllCaches } = useCacheStats({
 *     refreshInterval: 2000,
 *     includeRecommendations: true
 *   });
 *
 *   return (
 *     <div>
 *       <h3>Image Cache: {stats.imageCache.entryCount} entries</h3>
 *       <p>Hit Rate: {(stats.imageCache.hitRate * 100).toFixed(1)}%</p>
 *       <button onClick={clearAllCaches}>Clear All</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useCacheStats(options: UseCacheStatsOptions = {}) {
  // Get service from DI context
  const assetStorageService = useAssetStorageService();

  const { refreshInterval = 1000, includeRecommendations = true } = options;

  const [stats, setStats] = useState<AllCacheStats>({
    preRender: getPreRenderCacheStats(),
    imageCache: getImageCacheStats(),
    fontCache: getFontCacheStats(),
    assetUrls: {
      name: 'Asset URLs',
      entryCount: 0,
      memoryUsageMB: 0,
    },
    totalMemoryMB: 0,
    recommendations: [],
  });

  const [isLoading, setIsLoading] = useState(false);

  /**
   * Refresh all cache statistics
   */
  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [preRender, imageCache, fontCache, assetUrls] = await Promise.all([
        Promise.resolve(getPreRenderCacheStats()),
        Promise.resolve(getImageCacheStats()),
        Promise.resolve(getFontCacheStats()),
        getAssetUrlCacheStats(assetStorageService),
      ]);

      const totalMemoryMB =
        (preRender.memoryUsageMB || 0) +
        (imageCache.memoryUsageMB || 0) +
        (fontCache.memoryUsageMB || 0) +
        (assetUrls.memoryUsageMB || 0);

      const newStats: AllCacheStats = {
        preRender,
        imageCache,
        fontCache,
        assetUrls,
        totalMemoryMB,
        recommendations: [],
      };

      if (includeRecommendations) {
        newStats.recommendations = generateRecommendations(newStats);
      }

      setStats(newStats);
    } catch (error) {
      logger.error('useCacheStats', 'Failed to refresh stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [assetStorageService, includeRecommendations]);

  /**
   * Clear all caches
   */
  const clearAllCaches = useCallback(async () => {
    try {
      // Clear image cache
      globalImageCache.clear();

      // Clear asset URL cache
      assetStorageService.clearUrlCache();

      // Refresh stats after clearing
      await refresh();
    } catch (error) {
      logger.error('useCacheStats', 'Failed to clear caches:', error);
    }
  }, [assetStorageService, refresh]);

  /**
   * Export cache report as JSON
   */
  const exportReport = useCallback(() => {
    const report = {
      timestamp: new Date().toISOString(),
      stats,
      userAgent: navigator.userAgent,
      memory: (() => {
        // Chrome-specific memory API
        const perfWithMemory = performance as Performance & {
          memory?: {
            usedJSHeapSize: number;
            totalJSHeapSize: number;
            jsHeapSizeLimit: number;
          };
        };
        return perfWithMemory.memory
          ? {
              usedJSHeapSize: perfWithMemory.memory.usedJSHeapSize,
              totalJSHeapSize: perfWithMemory.memory.totalJSHeapSize,
              jsHeapSizeLimit: perfWithMemory.memory.jsHeapSizeLimit,
            }
          : null;
      })(),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cache-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [stats]);

  // Auto-refresh on interval
  useEffect(() => {
    if (refreshInterval > 0) {
      const intervalId = setInterval(refresh, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [refresh, refreshInterval]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    stats,
    isLoading,
    refresh,
    clearAllCaches,
    exportReport,
  };
}
