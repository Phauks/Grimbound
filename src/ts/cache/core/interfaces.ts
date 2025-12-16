/**
 * Core interfaces (ports) for the cache system.
 * These define contracts that all implementations must follow.
 */

import type {
  CacheEntry,
  CacheOptions,
  CacheStats,
  PreRenderContext,
  PreRenderResult,
} from './types.js';

/**
 * Port: Main cache interface that all cache adapters must implement.
 * This is the hexagon's "port" - defines the contract without implementation.
 */
export interface ICacheStrategy<K = string, V = any> {
  /**
   * Retrieve cached value by key.
   * @param key - Cache key to look up
   * @returns Cached entry or null if not found/expired
   */
  get(key: K): Promise<CacheEntry<V> | null>;

  /**
   * Store value in cache with optional metadata.
   * @param key - Cache key
   * @param value - Value to cache
   * @param options - Optional cache options (TTL, priority, metadata)
   */
  set(key: K, value: V, options?: CacheOptions): Promise<void>;

  /**
   * Check if key exists in cache (without retrieving).
   * Synchronous for performance - useful for quick checks before async get().
   * @param key - Cache key to check
   * @returns True if key exists and not expired
   */
  has(key: K): boolean;

  /**
   * Remove specific entry from cache.
   * @param key - Cache key to remove
   */
  delete(key: K): Promise<void>;

  /**
   * Clear all entries from cache.
   */
  clear(): Promise<void>;

  /**
   * Get cache statistics for observability.
   * @returns Current cache statistics
   */
  getStats(): CacheStats;

  /**
   * Manually trigger eviction if needed.
   * @returns Number of entries evicted
   */
  evict(): Promise<number>;

  /**
   * Get all keys currently in cache (for debugging/inspection).
   * @returns Array of all cache keys
   */
  keys(): K[];

  /**
   * Invalidate all cache entries with a specific tag.
   * Enables selective cache clearing by category.
   * @param tag - Tag to match for invalidation
   * @returns Number of entries invalidated
   */
  invalidateByTag(tag: string): Promise<number>;

  /**
   * Get all cache entries with a specific tag.
   * Useful for debugging and inspection.
   * @param tag - Tag to filter by
   * @returns Array of matching cache entries
   */
  getByTag(tag: string): Promise<Array<CacheEntry<V>>>;
}

/**
 * Port: Eviction policy interface.
 * Separates "when to evict" logic from "what to evict" logic.
 */
export interface IEvictionPolicy {
  /**
   * Determine if cache should evict entries based on current stats.
   * @param stats - Current cache statistics
   * @returns True if eviction should occur
   */
  shouldEvict(stats: CacheStats): boolean;

  /**
   * Select which entries to evict.
   * @param entries - Map of all cache entries
   * @returns Array of keys to remove
   */
  selectVictims<V>(entries: Map<string, CacheEntry<V>>): string[];

  /**
   * Notify policy that an entry was accessed (for LRU tracking).
   * @param key - Key that was accessed
   */
  recordAccess(key: string): void;

  /**
   * Notify policy that an entry was inserted (for size tracking).
   * @param key - Key that was inserted
   * @param size - Size of the inserted entry in bytes
   */
  recordInsertion(key: string, size: number): void;

  /**
   * Notify policy that an entry was removed.
   * @param key - Key that was removed
   */
  recordRemoval(key: string): void;

  /**
   * Reset policy state.
   */
  reset(): void;
}

/**
 * Port: Pre-render strategy interface.
 * Defines how tokens should be pre-rendered for different contexts.
 */
export interface IPreRenderStrategy {
  /**
   * Unique identifier for this strategy.
   */
  readonly name: string;

  /**
   * Pre-render tokens based on strategy-specific logic.
   * @param context - Strategy-specific context (tokens, options, etc.)
   * @returns Promise resolving to pre-rendered results
   */
  preRender(context: PreRenderContext): Promise<PreRenderResult>;

  /**
   * Check if strategy should trigger for given context.
   * @param context - Pre-render context
   * @returns True if this strategy should handle the context
   */
  shouldTrigger(context: PreRenderContext): boolean;

  /**
   * Priority for strategy execution (higher = execute first).
   * Used when multiple strategies match the same context.
   */
  readonly priority: number;
}
