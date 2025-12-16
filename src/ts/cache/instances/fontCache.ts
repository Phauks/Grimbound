/**
 * Font Cache Instance
 * Synchronous font string cache with LRU eviction
 *
 * Note: This cache is synchronous (unlike LRUCacheAdapter) because font strings
 * are needed during synchronous canvas rendering operations.
 */

/**
 * Configuration for font cache
 */
interface FontCacheConfig {
  maxSize: number;
  maxMemory: number;
  evictionRatio: number;
}

/**
 * Cache entry with LRU tracking
 */
interface CacheEntry {
  value: string;
  size: number;
  lastAccessed: number;
}

/**
 * Cache statistics
 */
interface CacheStats {
  size: number;
  memoryUsage: number;
  maxSize: number;
  maxMemory: number;
  hitCount: number;
  missCount: number;
  evictionCount: number;
  hitRate: number;
}

/**
 * Synchronous LRU cache for font strings
 * Prevents repeated string concatenation for font specifications
 */
class FontCache {
  private cache = new Map<string, CacheEntry>();
  private config: FontCacheConfig;
  private stats: CacheStats;

  constructor(config: FontCacheConfig) {
    this.config = config;
    this.stats = {
      size: 0,
      memoryUsage: 0,
      maxSize: config.maxSize,
      maxMemory: config.maxMemory,
      hitCount: 0,
      missCount: 0,
      evictionCount: 0,
      hitRate: 0,
    };
  }

  /**
   * Get cached font string
   */
  get(key: string): string | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.missCount++;
      this.updateHitRate();
      return null;
    }

    // Update LRU tracking
    entry.lastAccessed = Date.now();

    this.stats.hitCount++;
    this.updateHitRate();

    return entry.value;
  }

  /**
   * Set cached font string
   */
  set(key: string, value: string): void {
    // Estimate size (characters * 2 bytes + key size)
    const size = (value.length + key.length) * 2;

    // Check if we need to evict before adding
    if (this.shouldEvict(size)) {
      this.evict();
    }

    const entry: CacheEntry = {
      value,
      size,
      lastAccessed: Date.now(),
    };

    // If key exists, update memory usage
    const existingEntry = this.cache.get(key);
    if (existingEntry) {
      this.stats.memoryUsage -= existingEntry.size;
      this.stats.size--;
    }

    this.cache.set(key, entry);
    this.stats.size++;
    this.stats.memoryUsage += size;
  }

  /**
   * Check if eviction is needed
   */
  private shouldEvict(newEntrySize: number): boolean {
    const wouldExceedSize = this.stats.size >= this.config.maxSize;
    const wouldExceedMemory = this.stats.memoryUsage + newEntrySize > this.config.maxMemory;
    return wouldExceedSize || wouldExceedMemory;
  }

  /**
   * Evict least recently used entries based on eviction ratio
   */
  private evict(): void {
    const evictCount = Math.ceil(this.cache.size * this.config.evictionRatio);

    // Sort entries by last accessed (LRU first)
    const entries = Array.from(this.cache.entries()).sort(
      (a, b) => a[1].lastAccessed - b[1].lastAccessed
    );

    // Remove oldest entries
    for (let i = 0; i < evictCount && i < entries.length; i++) {
      const [key, entry] = entries[i];
      this.cache.delete(key);
      this.stats.size--;
      this.stats.memoryUsage -= entry.size;
      this.stats.evictionCount++;
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats.size = 0;
    this.stats.memoryUsage = 0;
    this.stats.evictionCount = 0;
    this.stats.hitCount = 0;
    this.stats.missCount = 0;
    this.stats.hitRate = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Update hit rate calculation
   */
  private updateHitRate(): void {
    const total = this.stats.hitCount + this.stats.missCount;
    this.stats.hitRate = total > 0 ? this.stats.hitCount / total : 0;
  }
}

/**
 * Global font string cache with LRU eviction
 *
 * Configuration:
 * - Max 200 font combinations (~10-20KB typical usage)
 * - Max 50KB memory (safety limit)
 * - 10% LRU eviction ratio when limits exceeded
 */
export const fontCache = new FontCache({
  maxSize: 200,
  maxMemory: 50000, // ~50KB (strings are ~50-80 bytes each)
  evictionRatio: 0.1,
});

/**
 * Get or create cached font string
 *
 * Font strings are formatted as: "weight size 'family', fallback"
 * Example: "bold 24px 'Georgia', serif"
 *
 * @param weight - Font weight (e.g., 'bold', 'normal', or empty string)
 * @param size - Font size in pixels
 * @param family - Font family name
 * @param fallback - Fallback font families (default: 'Georgia, serif')
 * @returns Formatted font string ready for ctx.font assignment
 *
 * @example
 * ```typescript
 * ctx.font = getCachedFont('bold', 24, 'Georgia', 'serif');
 * // Returns: "bold 24px \"Georgia\", serif"
 * ```
 */
export function getCachedFont(
  weight: string,
  size: number,
  family: string,
  fallback: string = 'Georgia, serif'
): string {
  // Create cache key from parameters
  const key = `${weight}-${size}-${family}-${fallback}`;

  // Check cache first
  let font = fontCache.get(key);

  if (!font) {
    // Cache miss - construct font string
    // Handle empty weight (for non-bold fonts like ability text)
    font = weight
      ? `${weight} ${size}px "${family}", ${fallback}`
      : `${size}px "${family}", ${fallback}`;

    // Store in cache for future use
    fontCache.set(key, font);
  }

  return font;
}

/**
 * Clear font cache
 * Useful for testing or memory pressure situations
 */
export function clearFontCache(): void {
  fontCache.clear();
}

/**
 * Get font cache statistics
 *
 * @returns Cache statistics including:
 * - size: Current number of entries
 * - memoryUsage: Estimated memory in bytes
 * - hitCount: Number of cache hits
 * - missCount: Number of cache misses
 * - hitRate: Cache hit percentage (0.0-1.0)
 * - evictionCount: Total evictions performed
 */
export function getFontCacheStats() {
  return fontCache.getStats();
}

export default {
  fontCache,
  getCachedFont,
  clearFontCache,
  getFontCacheStats,
};
