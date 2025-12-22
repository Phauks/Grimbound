/**
 * Cache module - Pre-rendering cache system with Hexagonal Architecture.
 * Exports all cache types, interfaces, implementations, and utilities.
 */

export type { EvictionEvent, LRUCacheAdapterOptions } from './adapters/LRUCacheAdapter.js';

// Adapters (Infrastructure layer)
export { LRUCacheAdapter } from './adapters/LRUCacheAdapter.js';
export type {
  InvalidationEvent,
  InvalidationListener,
  InvalidationScope,
  InvalidationSubscription,
} from './CacheInvalidationService.js';
// Invalidation Coordinator (Application layer)
export { CacheInvalidationService, cacheInvalidationService } from './CacheInvalidationService.js';
export type { CacheManagerDeps, CacheWarmingOptions, CombinedCacheStats } from './CacheManager.js';
// Cache Manager Facade (Application layer)
export { CacheManager, cacheManager } from './CacheManager.js';
// Characters Pre-Render Helpers (Convenience API)
export {
  getPreRenderedTokens,
  hashOptions,
  preRenderFirstCharacter,
} from './charactersPreRenderHelpers.js';
// Core types and interfaces (Domain layer - Ports)
export type {
  CacheEntry,
  CacheEvent,
  CacheEventType,
  CacheOptions,
  CacheStats,
  ICacheStrategy,
  IEvictionPolicy,
  IPreRenderStrategy,
  PreRenderContext,
  PreRenderContextType,
  PreRenderResult,
} from './core/index.js';
// Cache Manager Interface
export type { ICacheManager } from './ICacheManager.js';
export type { PreRenderCacheManagerEvents } from './manager/PreRenderCacheManager.js';
// Manager (Application layer)
export { PreRenderCacheManager } from './manager/PreRenderCacheManager.js';
export type { LRUEvictionPolicyOptions } from './policies/LRUEvictionPolicy.js';
// Eviction policies (Infrastructure layer)
export { LRUEvictionPolicy } from './policies/LRUEvictionPolicy.js';
export type {
  CharactersPreRenderEntry,
  CharactersStrategyOptions,
} from './strategies/CharactersPreRenderStrategy.js';
export { CharactersPreRenderStrategy } from './strategies/CharactersPreRenderStrategy.js';
export type { ProjectStrategyOptions } from './strategies/ProjectPreRenderStrategy.js';
export { ProjectPreRenderStrategy } from './strategies/ProjectPreRenderStrategy.js';
export type { TokensStrategyOptions } from './strategies/TokensPreRenderStrategy.js';
// Strategies (Domain services)
export { TokensPreRenderStrategy } from './strategies/TokensPreRenderStrategy.js';
// Tab Pre-Render Service (unified tab hover pre-rendering)
export type {
  PreRenderableTab,
  TabPreRenderContext,
  TabPreRenderResult,
} from './TabPreRenderService.js';
export { TabPreRenderService, tabPreRenderService } from './TabPreRenderService.js';
export type { CachePerformanceMetrics } from './utils/CacheLogger.js';
export { CacheLogger, CacheLogLevel } from './utils/CacheLogger.js';
export {
  combineHashes,
  hashArray,
  hashGenerationOptions,
  hashObject,
  simpleHash,
} from './utils/hashUtils.js';
// Utilities
export {
  estimateMapMemory,
  estimateSize,
  formatBytes,
} from './utils/memoryEstimator.js';
