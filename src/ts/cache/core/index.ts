/**
 * Core cache module - exports all types and interfaces.
 */

export type {
  ICacheStrategy,
  IEvictionPolicy,
  IPreRenderStrategy,
} from './interfaces.js';
export type {
  CacheEntry,
  CacheEvent,
  CacheEventType,
  CacheOptions,
  CacheStats,
  PreRenderContext,
  PreRenderContextType,
  PreRenderResult,
} from './types.js';
