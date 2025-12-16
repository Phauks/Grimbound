/**
 * LRU (Least Recently Used) eviction policy.
 * Evicts entries that haven't been accessed recently when cache limits are exceeded.
 */

import type { CacheEntry, CacheStats, IEvictionPolicy } from '../core/index.js';

/**
 * Configuration options for LRU eviction policy.
 */
export interface LRUEvictionPolicyOptions {
  /** Evict when entries exceed this (optional) */
  maxSize?: number;
  /** Evict when bytes exceed this (optional) */
  maxMemory?: number;
  /** Percent of cache to evict when limit reached (default: 0.1 = 10%) */
  evictionRatio?: number;
}

/**
 * Adapter: LRU (Least Recently Used) eviction policy.
 * Tracks access order and evicts least recently used entries first.
 */
export class LRUEvictionPolicy implements IEvictionPolicy {
  private accessOrder = new Map<string, number>(); // key -> last access timestamp
  private accessCounter = 0;

  constructor(private options: LRUEvictionPolicyOptions) {
    // Default eviction ratio to 10% if not specified
    this.options.evictionRatio ??= 0.1;
  }

  shouldEvict(stats: CacheStats): boolean {
    // Check size limit
    if (this.options.maxSize && stats.size >= this.options.maxSize) {
      return true;
    }

    // Check memory limit
    if (this.options.maxMemory && stats.memoryUsage >= this.options.maxMemory) {
      return true;
    }

    return false;
  }

  selectVictims<V>(entries: Map<string, CacheEntry<V>>): string[] {
    // Calculate how many to evict (default 10% of cache)
    const targetEvictions = Math.max(
      1, // Evict at least 1 entry
      Math.ceil(entries.size * (this.options.evictionRatio || 0.1))
    );

    // Sort entries by last accessed time (oldest first)
    const sorted = Array.from(entries.entries())
      .map(([key, entry]) => ({
        key,
        accessTime: this.accessOrder.get(key) ?? entry.lastAccessed,
      }))
      .sort((a, b) => a.accessTime - b.accessTime);

    // Return oldest N entries
    return sorted.slice(0, targetEvictions).map((item) => item.key);
  }

  recordAccess(key: string): void {
    // Update access order with monotonically increasing counter
    this.accessOrder.set(key, ++this.accessCounter);
  }

  recordInsertion(key: string, _size: number): void {
    // New entries get current access counter
    this.accessOrder.set(key, ++this.accessCounter);
  }

  recordRemoval(key: string): void {
    // Remove from access tracking
    this.accessOrder.delete(key);
  }

  reset(): void {
    this.accessOrder.clear();
    this.accessCounter = 0;
  }
}
