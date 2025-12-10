/**
 * LRU cache adapter implementation.
 * Implements ICacheStrategy with automatic eviction based on LRU policy.
 */

import type {
  ICacheStrategy,
  IEvictionPolicy,
  CacheEntry,
  CacheStats,
  CacheOptions
} from '../core/index.js'
import { estimateSize } from '../utils/memoryEstimator.js'

/**
 * Configuration options for LRU cache adapter.
 */
export interface LRUCacheAdapterOptions {
  /** Maximum number of entries (optional, unlimited if not set) */
  maxSize?: number
  /** Maximum memory in bytes (optional, unlimited if not set) */
  maxMemory?: number
  /** Eviction policy to use */
  evictionPolicy: IEvictionPolicy
}

/**
 * Adapter: LRU cache implementation using Map.
 * Implements ICacheStrategy port with automatic eviction.
 */
export class LRUCacheAdapter<K = string, V = any> implements ICacheStrategy<K, V> {
  private cache = new Map<K, CacheEntry<V>>()
  private tagIndex = new Map<string, Set<K>>()  // tag → keys mapping for selective invalidation
  private stats: CacheStats = {
    size: 0,
    memoryUsage: 0,
    maxSize: undefined,
    maxMemory: undefined,
    hitCount: 0,
    missCount: 0,
    evictionCount: 0,
    hitRate: 0
  }

  constructor(private options: LRUCacheAdapterOptions) {
    this.stats.maxSize = options.maxSize
    this.stats.maxMemory = options.maxMemory
  }

  async get(key: K): Promise<CacheEntry<V> | null> {
    const entry = this.cache.get(key)

    if (!entry) {
      this.stats.missCount++
      this.updateHitRate()
      return null
    }

    // Check if expired
    if (entry.ttl && Date.now() - entry.createdAt > entry.ttl) {
      await this.delete(key)
      this.stats.missCount++
      this.updateHitRate()
      return null
    }

    // Update access tracking
    entry.lastAccessed = Date.now()
    entry.accessCount++
    this.options.evictionPolicy.recordAccess(String(key))

    this.stats.hitCount++
    this.updateHitRate()

    return entry
  }

  async set(key: K, value: V, options?: CacheOptions): Promise<void> {
    const size = estimateSize(value)
    const entry: CacheEntry<V> = {
      value,
      key: String(key),
      size,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      accessCount: 0,
      ttl: options?.ttl,
      tags: options?.tags,
      metadata: options?.metadata
    }

    // If key exists, remove old tag associations
    const existingEntry = this.cache.get(key)
    if (existingEntry) {
      this.removeTagAssociations(key, existingEntry.tags)
      this.stats.memoryUsage -= existingEntry.size
      this.stats.size--
    }

    // Add new tag associations
    if (options?.tags) {
      this.addTagAssociations(key, options.tags)
    }

    this.cache.set(key, entry)
    this.stats.size++
    this.stats.memoryUsage += size

    this.options.evictionPolicy.recordInsertion(String(key), size)

    // Auto-evict if needed
    if (this.options.evictionPolicy.shouldEvict(this.stats)) {
      await this.evict()
    }
  }

  has(key: K): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    // Check expiration
    if (entry.ttl && Date.now() - entry.createdAt > entry.ttl) {
      // Don't await - let next get() handle it
      this.delete(key).catch(console.error)
      return false
    }

    return true
  }

  async delete(key: K): Promise<void> {
    const entry = this.cache.get(key)
    if (!entry) return

    // Remove tag associations
    this.removeTagAssociations(key, entry.tags)

    this.cache.delete(key)
    this.stats.size--
    this.stats.memoryUsage -= entry.size
    this.options.evictionPolicy.recordRemoval(String(key))
  }

  async clear(): Promise<void> {
    this.cache.clear()
    this.tagIndex.clear()
    this.stats.size = 0
    this.stats.memoryUsage = 0
    this.stats.evictionCount = 0
    this.stats.hitCount = 0
    this.stats.missCount = 0
    this.stats.hitRate = 0
    this.options.evictionPolicy.reset()
  }

  getStats(): CacheStats {
    return { ...this.stats }
  }

  async evict(): Promise<number> {
    // Convert Map<K, CacheEntry<V>> to Map<string, CacheEntry<V>> for policy
    const stringKeyedCache = new Map<string, CacheEntry<V>>()
    for (const [key, entry] of this.cache) {
      stringKeyedCache.set(String(key), entry)
    }

    const victims = this.options.evictionPolicy.selectVictims(stringKeyedCache)

    for (const key of victims) {
      await this.delete(key as K)
    }

    this.stats.evictionCount += victims.length
    return victims.length
  }

  keys(): K[] {
    return Array.from(this.cache.keys())
  }

  async invalidateByTag(tag: string): Promise<number> {
    const keys = this.tagIndex.get(tag)
    if (!keys || keys.size === 0) {
      return 0
    }

    let count = 0
    // Create array copy since delete modifies the set
    const keysToDelete = Array.from(keys)
    for (const key of keysToDelete) {
      await this.delete(key)
      count++
    }

    // Tag index entry is cleaned up by delete() method
    this.tagIndex.delete(tag)

    return count
  }

  async getByTag(tag: string): Promise<Array<CacheEntry<V>>> {
    const keys = this.tagIndex.get(tag)
    if (!keys || keys.size === 0) {
      return []
    }

    const entries: Array<CacheEntry<V>> = []
    for (const key of keys) {
      const entry = this.cache.get(key)
      if (entry) {
        entries.push(entry)
      }
    }

    return entries
  }

  /**
   * Add tag associations for a cache key.
   * @param key - Cache key
   * @param tags - Tags to associate with key
   */
  private addTagAssociations(key: K, tags?: string[]): void {
    if (!tags || tags.length === 0) return

    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set())
      }
      this.tagIndex.get(tag)!.add(key)
    }
  }

  /**
   * Remove tag associations for a cache key.
   * @param key - Cache key
   * @param tags - Tags to remove associations for
   */
  private removeTagAssociations(key: K, tags?: string[]): void {
    if (!tags || tags.length === 0) return

    for (const tag of tags) {
      const keys = this.tagIndex.get(tag)
      if (keys) {
        keys.delete(key)
        // Clean up empty tag sets
        if (keys.size === 0) {
          this.tagIndex.delete(tag)
        }
      }
    }
  }

  private updateHitRate(): void {
    const total = this.stats.hitCount + this.stats.missCount
    this.stats.hitRate = total > 0 ? this.stats.hitCount / total : 0
  }
}
