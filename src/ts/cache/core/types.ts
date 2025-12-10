/**
 * Core type definitions for the cache system.
 * These types are used across all cache implementations.
 */

import type { Token, Character, GenerationOptions } from '../../types/index.js'

/**
 * Cache entry wrapper - stores value with metadata.
 */
export interface CacheEntry<V = any> {
  /** The cached value */
  value: V
  /** Cache key for this entry */
  key: string
  /** Estimated size in bytes */
  size: number
  /** Timestamp when entry was created */
  createdAt: number
  /** Timestamp when entry was last accessed */
  lastAccessed: number
  /** Number of times this entry has been accessed */
  accessCount: number
  /** Time-to-live in milliseconds (optional) */
  ttl?: number
  /** Tags for selective invalidation (optional) */
  tags?: string[]
  /** Additional metadata (optional) */
  metadata?: Record<string, any>
}

/**
 * Cache statistics for observability.
 */
export interface CacheStats {
  /** Current number of entries in cache */
  size: number
  /** Estimated memory usage in bytes */
  memoryUsage: number
  /** Maximum number of entries (undefined = unlimited) */
  maxSize?: number
  /** Maximum memory in bytes (undefined = unlimited) */
  maxMemory?: number
  /** Number of cache hits */
  hitCount: number
  /** Number of cache misses */
  missCount: number
  /** Number of entries evicted */
  evictionCount: number
  /** Cache hit rate (0.0 to 1.0) */
  hitRate: number
}

/**
 * Options for setting cache entries.
 */
export interface CacheOptions {
  /** Time-to-live in milliseconds */
  ttl?: number
  /** Eviction priority (higher = keep longer) */
  priority?: number
  /** Tags for selective invalidation */
  tags?: string[]
  /** Additional metadata to store with entry */
  metadata?: Record<string, any>
}

/**
 * Cache event types for observability.
 */
export type CacheEventType =
  | 'hit'          // Cache hit
  | 'miss'         // Cache miss
  | 'set'          // Entry added/updated
  | 'evict'        // Entry evicted
  | 'clear'        // Cache cleared
  | 'error'        // Error occurred

/**
 * Cache event structure.
 */
export interface CacheEvent<V = any> {
  /** Event type */
  type: CacheEventType
  /** Cache key involved in event */
  key: string
  /** Value (if applicable) */
  value?: V
  /** Timestamp of event */
  timestamp: number
  /** Additional metadata */
  metadata?: Record<string, any>
}

/**
 * Pre-render context types.
 */
export type PreRenderContextType =
  | 'gallery-hover'      // User hovered over gallery tab
  | 'customize-hover'    // User hovered over customize tab
  | 'project-hover'      // User hovered over project card
  | 'manual'             // Manually triggered
  | 'auto'               // Automatically triggered

/**
 * Context passed to pre-render strategies.
 */
export interface PreRenderContext {
  /** Type of pre-render trigger */
  type: PreRenderContextType
  /** Tokens to pre-render (if applicable) */
  tokens: Token[]
  /** Characters involved (if applicable) */
  characters?: Character[]
  /** Generation options (if applicable) */
  generationOptions?: GenerationOptions
  /** Project ID (if applicable) */
  projectId?: string
  /** Additional metadata */
  metadata?: Record<string, any>
}

/**
 * Result from pre-render operation.
 */
export interface PreRenderResult {
  /** Whether pre-render was successful */
  success: boolean
  /** Number of items pre-rendered */
  rendered: number
  /** Number of items skipped (already cached) */
  skipped: number
  /** Error message (if failed) */
  error?: string
  /** Additional metadata about the operation */
  metadata?: Record<string, any>
}
