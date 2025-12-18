/**
 * Cache Testing Utilities
 *
 * Mock factories and helpers for testing cache layers.
 * Provides easy setup for unit and integration tests.
 *
 * @module ts/cache/__tests__/testUtils
 */

import type { ICacheStrategy } from '@/ts/cache/core/interfaces.js';
import type { CacheEntry, CacheOptions, CacheStats } from '@/ts/cache/core/types.js';

// ============================================================================
// Mock Cache Implementation
// ============================================================================

/**
 * Create a mock cache for testing.
 * Implements ICacheStrategy with in-memory Map storage.
 *
 * @param entries - Optional initial entries as [key, value] pairs
 * @returns Mock cache instance
 *
 * @example
 * ```typescript
 * const cache = createMockCache<string, string>([
 *   ['key1', 'value1'],
 *   ['key2', 'value2']
 * ]);
 * ```
 */
export function createMockCache<K extends string = string, V = unknown>(
  entries?: [K, V][]
): ICacheStrategy<K, V> {
  const storage = new Map<K, CacheEntry<V>>();
  let hitCount = 0;
  let missCount = 0;
  let evictionCount = 0;

  // Initialize with entries
  if (entries) {
    for (const [key, value] of entries) {
      storage.set(key, {
        key: key as string,
        value,
        size: 0,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        accessCount: 0,
      });
    }
  }

  return {
    async get(key: K): Promise<CacheEntry<V> | null> {
      const entry = storage.get(key);
      if (entry) {
        hitCount++;
        entry.lastAccessed = Date.now();
        entry.accessCount++;
        return entry;
      }
      missCount++;
      return null;
    },

    async set(key: K, value: V, options?: CacheOptions): Promise<void> {
      storage.set(key, {
        key: key as string,
        value,
        size: 0,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        accessCount: 0,
        ttl: options?.ttl,
        tags: options?.tags,
        metadata: options?.metadata,
      });
    },

    has(key: K): boolean {
      return storage.has(key);
    },

    async delete(key: K): Promise<void> {
      if (storage.has(key)) {
        storage.delete(key);
        evictionCount++;
      }
    },

    async clear(): Promise<void> {
      storage.clear();
    },

    getStats(): CacheStats {
      const totalCount = hitCount + missCount;
      return {
        size: storage.size,
        hitCount,
        missCount,
        hitRate: totalCount > 0 ? hitCount / totalCount : 0,
        evictionCount,
        memoryUsage: 0,
      };
    },

    async evict(): Promise<number> {
      // Simple LRU eviction - remove oldest entry
      if (storage.size === 0) return 0;

      let oldestKey: K | null = null;
      let oldestTime = Infinity;

      for (const [key, entry] of storage.entries()) {
        if (entry.lastAccessed < oldestTime) {
          oldestTime = entry.lastAccessed;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        storage.delete(oldestKey);
        evictionCount++;
        return 1;
      }

      return 0;
    },

    keys(): K[] {
      return Array.from(storage.keys());
    },

    async invalidateByTag(tag: string): Promise<number> {
      let invalidated = 0;

      for (const [key, entry] of storage.entries()) {
        if (entry.tags?.includes(tag)) {
          storage.delete(key);
          invalidated++;
          evictionCount++;
        }
      }

      return invalidated;
    },

    async getByTag(tag: string): Promise<Array<CacheEntry<V>>> {
      const results: Array<CacheEntry<V>> = [];

      for (const entry of storage.values()) {
        if (entry.tags?.includes(tag)) {
          results.push(entry);
        }
      }

      return results;
    },
  };
}

// ============================================================================
// Mock Data Factories
// ============================================================================

/**
 * Create mock cache entries for testing.
 *
 * @param count - Number of entries to create
 * @param valueFactory - Optional factory function for values (default: `value-${index}`)
 * @returns Array of [key, value] pairs
 *
 * @example
 * ```typescript
 * const entries = createMockCacheEntries(10, (i) => ({ id: i, data: 'test' }));
 * const cache = createMockCache(entries);
 * ```
 */
export function createMockCacheEntries<V = string>(
  count: number,
  valueFactory?: (index: number) => V
): [string, V][] {
  const defaultFactory = (i: number) => `value-${i}` as unknown as V;
  const factory = valueFactory || defaultFactory;

  return Array.from({ length: count }, (_, i) => [`key-${i}`, factory(i)]);
}

/**
 * Create mock token data URLs for cache testing.
 *
 * @param count - Number of token data URLs to generate
 * @returns Array of [filename, dataUrl] pairs
 *
 * @example
 * ```typescript
 * const tokens = createMockTokenUrls(5);
 * const cache = createMockCache(tokens);
 * ```
 */
export function createMockTokenUrls(count: number): [string, string][] {
  return Array.from({ length: count }, (_, i) => [
    `token-${i}.png`,
    `data:image/png;base64,mock-base64-data-${i}`,
  ]);
}

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Populate a cache with mock entries and return stats.
 * Useful for setting up test scenarios quickly.
 *
 * @param cache - Cache instance to populate
 * @param entries - Entries to add
 * @returns Promise resolving when complete
 *
 * @example
 * ```typescript
 * const cache = createMockCache();
 * await populateCache(cache, createMockCacheEntries(100));
 * const stats = cache.getStats();
 * expect(stats.size).toBe(100);
 * ```
 */
export async function populateCache<K extends string, V>(
  cache: ICacheStrategy<K, V>,
  entries: [K, V][]
): Promise<void> {
  for (const [key, value] of entries) {
    await cache.set(key, value);
  }
}

/**
 * Simulate cache hits by accessing keys in order.
 * Updates hit/miss statistics for testing.
 *
 * @param cache - Cache instance
 * @param keys - Keys to access
 * @returns Array of retrieved values (null for misses)
 *
 * @example
 * ```typescript
 * const cache = createMockCache([['key1', 'value1']]);
 * const values = await simulateCacheAccess(cache, ['key1', 'key2', 'key1']);
 * // values: ['value1', null, 'value1']
 * // stats: { hits: 2, misses: 1 }
 * ```
 */
export async function simulateCacheAccess<K extends string, V>(
  cache: ICacheStrategy<K, V>,
  keys: K[]
): Promise<(V | null)[]> {
  const results: (V | null)[] = [];

  for (const key of keys) {
    const entry = await cache.get(key);
    results.push(entry?.value ?? null);
  }

  return results;
}

/**
 * Wait for condition to be true (polling helper).
 * Useful for testing async cache updates.
 *
 * @param condition - Function that returns true when done
 * @param timeout - Max time to wait in ms (default: 1000)
 * @param interval - Polling interval in ms (default: 50)
 * @returns Promise resolving when condition is met
 *
 * @example
 * ```typescript
 * await waitForCondition(async () => {
 *   const stats = cache.getStats();
 *   return stats.size === 10;
 * });
 * ```
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 1000,
  interval: number = 50
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Measure execution time of a function.
 * Useful for performance testing.
 *
 * @param fn - Function to measure
 * @returns Object with result and duration in ms
 *
 * @example
 * ```typescript
 * const { result, duration } = await measureDuration(async () => {
 *   return await cache.get('key');
 * });
 * expect(duration).toBeLessThan(100);
 * ```
 */
export async function measureDuration<T>(
  fn: () => T | Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;

  return { result, duration };
}

/**
 * Create a cache spy that tracks all method calls.
 * Useful for verifying cache behavior in tests.
 *
 * @param baseCache - Cache to wrap with spy
 * @returns Wrapped cache with call tracking
 *
 * @example
 * ```typescript
 * const { cache, calls } = createCacheSpy(createMockCache());
 * await cache.get('key');
 * expect(calls.get).toHaveLength(1);
 * ```
 */
export function createCacheSpy<K extends string, V>(
  baseCache: ICacheStrategy<K, V>
): {
  cache: ICacheStrategy<K, V>;
  calls: Record<string, unknown[]>;
} {
  const calls: Record<string, unknown[]> = {
    get: [],
    set: [],
    delete: [],
    clear: [],
    evict: [],
    invalidateByTag: [],
    getByTag: [],
  };

  const cache: ICacheStrategy<K, V> = {
    async get(key: K): Promise<CacheEntry<V> | null> {
      calls.get.push({ key, timestamp: Date.now() });
      return baseCache.get(key);
    },

    async set(key: K, value: V, options?: CacheOptions): Promise<void> {
      calls.set.push({ key, value, options, timestamp: Date.now() });
      return baseCache.set(key, value, options);
    },

    has(key: K): boolean {
      return baseCache.has(key);
    },

    async delete(key: K): Promise<void> {
      calls.delete.push({ key, timestamp: Date.now() });
      return baseCache.delete(key);
    },

    async clear(): Promise<void> {
      calls.clear.push({ timestamp: Date.now() });
      return baseCache.clear();
    },

    getStats(): CacheStats {
      return baseCache.getStats();
    },

    async evict(): Promise<number> {
      calls.evict.push({ timestamp: Date.now() });
      return baseCache.evict();
    },

    keys(): K[] {
      return baseCache.keys();
    },

    async invalidateByTag(tag: string): Promise<number> {
      calls.invalidateByTag.push({ tag, timestamp: Date.now() });
      return baseCache.invalidateByTag(tag);
    },

    async getByTag(tag: string): Promise<Array<CacheEntry<V>>> {
      calls.getByTag.push({ tag, timestamp: Date.now() });
      return baseCache.getByTag(tag);
    },
  };

  return { cache, calls };
}
