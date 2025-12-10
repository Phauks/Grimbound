/**
 * Cache module - Pre-rendering cache system with Hexagonal Architecture.
 * Exports all cache types, interfaces, implementations, and utilities.
 */

// Core types and interfaces (Domain layer - Ports)
export type {
  CacheEntry,
  CacheStats,
  CacheOptions,
  CacheEventType,
  CacheEvent,
  PreRenderContextType,
  PreRenderContext,
  PreRenderResult,
  ICacheStrategy,
  IEvictionPolicy,
  IPreRenderStrategy
} from './core/index.js'

// Adapters (Infrastructure layer)
export { LRUCacheAdapter } from './adapters/LRUCacheAdapter.js'
export type { LRUCacheAdapterOptions } from './adapters/LRUCacheAdapter.js'

// Eviction policies (Infrastructure layer)
export { LRUEvictionPolicy } from './policies/LRUEvictionPolicy.js'
export type { LRUEvictionPolicyOptions } from './policies/LRUEvictionPolicy.js'

// Strategies (Domain services)
export { GalleryPreRenderStrategy } from './strategies/GalleryPreRenderStrategy.js'
export type { GalleryStrategyOptions } from './strategies/GalleryPreRenderStrategy.js'

export { CustomizePreRenderStrategy } from './strategies/CustomizePreRenderStrategy.js'
export type {
  CustomizeStrategyOptions,
  CustomizePreRenderEntry
} from './strategies/CustomizePreRenderStrategy.js'

export { ProjectPreRenderStrategy } from './strategies/ProjectPreRenderStrategy.js'
export type { ProjectStrategyOptions } from './strategies/ProjectPreRenderStrategy.js'

// Manager (Application layer)
export { PreRenderCacheManager } from './manager/PreRenderCacheManager.js'
export type { PreRenderCacheManagerEvents } from './manager/PreRenderCacheManager.js'

// Utilities
export {
  estimateSize,
  estimateMapMemory,
  formatBytes
} from './utils/memoryEstimator.js'
