/**
 * Core cache module - exports all types and interfaces.
 */

export type {
  CacheEntry,
  CacheStats,
  CacheOptions,
  CacheEventType,
  CacheEvent,
  PreRenderContextType,
  PreRenderContext,
  PreRenderResult
} from './types.js'

export type {
  ICacheStrategy,
  IEvictionPolicy,
  IPreRenderStrategy
} from './interfaces.js'
