/**
 * Pre-Render Cache Manager - Central orchestrator for all caching operations.
 * Coordinates multiple caches and strategies, provides unified API.
 */

import { cacheInvalidationService } from '@/ts/cache/CacheInvalidationService.js';
import type {
  CacheStats,
  ICacheStrategy,
  IPreRenderStrategy,
  PreRenderContext,
  PreRenderResult,
} from '@/ts/cache/core/index.js';
import { CacheLogger } from '@/ts/cache/utils/CacheLogger.js';
import { EventEmitter } from '@/ts/cache/utils/EventEmitter.js';

/**
 * Events emitted by PreRenderCacheManager.
 */
export interface PreRenderCacheManagerEvents {
  'prerender:start': { strategy: string; context: PreRenderContext };
  'prerender:complete': { strategy: string; result: PreRenderResult };
  'prerender:error': { strategy: string; error: Error };
  'cache:cleared': { name: string };
}

/**
 * Application Service: Orchestrates pre-rendering across strategies.
 * Central manager that coordinates multiple caches and strategies.
 */
export class PreRenderCacheManager extends EventEmitter {
  private strategies = new Map<string, IPreRenderStrategy>();
  private caches = new Map<string, ICacheStrategy>();
  private isRendering = new Set<string>(); // Prevent concurrent renders
  private inProgressOperations = new Map<string, Promise<PreRenderResult>>(); // Request deduplication

  constructor() {
    super();

    // Subscribe to cache invalidation events
    this.setupInvalidationListeners();
  }

  /**
   * Setup listeners for cache invalidation events.
   * Automatically clears relevant caches when assets/characters/projects change.
   */
  private setupInvalidationListeners(): void {
    // Asset invalidation - clear all caches (asset changes affect rendering)
    cacheInvalidationService.subscribe('asset', async (event) => {
      CacheLogger.debug('Asset invalidation received', {
        assetIds: event.entityIds,
        reason: event.reason,
      });

      // Clear all pre-render caches since we don't know which tokens use which assets
      await this.clearAllCaches();
    });

    // Character invalidation - clear customize and project caches
    cacheInvalidationService.subscribe('character', async (event) => {
      CacheLogger.debug('Character invalidation received', {
        characterIds: event.entityIds,
        reason: event.reason,
      });

      // Clear characters cache (affected by character changes)
      await this.clearCache('characters');
      // Clear tokens cache (might contain affected characters)
      await this.clearCache('tokens');
    });

    // Project invalidation - clear project cache
    cacheInvalidationService.subscribe('project', async (event) => {
      CacheLogger.debug('Project invalidation received', {
        projectIds: event.entityIds,
        reason: event.reason,
      });

      // Clear project-specific cache
      await this.clearCache('project');
    });

    // Global invalidation - clear everything
    cacheInvalidationService.subscribe('global', async () => {
      CacheLogger.info('Global invalidation received, clearing all caches');
      await this.clearAllCaches();
    });
  }

  /**
   * Register a pre-render strategy.
   * @param strategy - Strategy to register
   */
  registerStrategy(strategy: IPreRenderStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  /**
   * Unregister a strategy by name.
   * @param name - Strategy name
   */
  unregisterStrategy(name: string): void {
    this.strategies.delete(name);
    this.isRendering.delete(name);
  }

  /**
   * Register a cache instance.
   * @param name - Cache name (e.g., 'tokens', 'characters', 'project')
   * @param cache - Cache implementation
   */
  registerCache(name: string, cache: ICacheStrategy): void {
    this.caches.set(name, cache);
  }

  /**
   * Unregister a cache by name.
   * @param name - Cache name
   */
  unregisterCache(name: string): void {
    this.caches.delete(name);
  }

  /**
   * Trigger pre-rendering based on context.
   * Selects appropriate strategy and executes it.
   * Implements request deduplication - returns existing Promise for duplicate requests.
   *
   * @param context - Pre-render context (type, tokens, etc.)
   * @returns Result of pre-rendering operation
   */
  async preRender(context: PreRenderContext): Promise<PreRenderResult> {
    // Find matching strategy
    const strategy = this.findStrategy(context);
    if (!strategy) {
      CacheLogger.warn('No matching strategy found', { contextType: context.type });
      return {
        success: false,
        rendered: 0,
        skipped: 0,
        error: 'No matching strategy found',
      };
    }

    // Generate unique key for this render operation
    const operationKey = this.getOperationKey(strategy.name, context);

    // Return existing promise if already rendering this exact operation (request deduplication)
    if (this.inProgressOperations.has(operationKey)) {
      CacheLogger.debug('Request deduplicated', {
        operation: operationKey,
        strategy: strategy.name,
      });
      return this.inProgressOperations.get(operationKey)!;
    }

    // Create new render operation
    const renderPromise = this.executePreRender(strategy, context);

    // Store promise for deduplication
    this.inProgressOperations.set(operationKey, renderPromise);

    // Clean up after completion
    renderPromise.finally(() => {
      this.inProgressOperations.delete(operationKey);
      this.isRendering.delete(strategy.name);
    });

    return renderPromise;
  }

  /**
   * Execute the actual pre-rendering operation.
   * Separated from preRender() to enable proper promise tracking.
   *
   * @param strategy - Strategy to execute
   * @param context - Pre-render context
   * @returns Result of pre-rendering
   */
  private async executePreRender(
    strategy: IPreRenderStrategy,
    context: PreRenderContext
  ): Promise<PreRenderResult> {
    // Prevent concurrent renders for same strategy (optional additional check)
    if (this.isRendering.has(strategy.name)) {
      CacheLogger.warn('Strategy already rendering', { strategy: strategy.name });
      return {
        success: false,
        rendered: 0,
        skipped: 0,
        error: `Strategy '${strategy.name}' already rendering`,
      };
    }

    // Start performance timing
    const timingLabel = `prerender:${strategy.name}`;
    CacheLogger.startTiming(timingLabel);
    CacheLogger.info('Pre-render started', {
      strategy: strategy.name,
      contextType: context.type,
      tokenCount: context.tokens.length,
      characterCount: context.characters?.length || 0,
    });

    try {
      this.isRendering.add(strategy.name);
      this.emit('prerender:start', { strategy: strategy.name, context });

      const result = await strategy.preRender(context);

      // End timing with result metadata
      CacheLogger.endTiming(timingLabel, {
        rendered: result.rendered,
        skipped: result.skipped,
        success: result.success,
      });

      CacheLogger.info('Pre-render completed', {
        strategy: strategy.name,
        rendered: result.rendered,
        skipped: result.skipped,
        success: result.success,
      });

      this.emit('prerender:complete', { strategy: strategy.name, result });
      return result;
    } catch (error) {
      CacheLogger.error('Pre-render failed', {
        strategy: strategy.name,
        error: error instanceof Error ? error.message : String(error),
      });

      this.emit('prerender:error', { strategy: strategy.name, error });
      return {
        success: false,
        rendered: 0,
        skipped: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Generate unique key for render operation (for deduplication).
   * Key includes strategy name and context-specific identifiers.
   *
   * @param strategyName - Name of strategy
   * @param context - Pre-render context
   * @returns Unique operation key
   */
  private getOperationKey(strategyName: string, context: PreRenderContext): string {
    // Build key from strategy name + context-specific data
    const parts = [strategyName, context.type];

    // Add first token filename if present (for gallery/customize)
    if (context.tokens.length > 0) {
      parts.push(context.tokens[0].filename);
    }

    // Add project ID if present
    if (context.projectId) {
      parts.push(context.projectId);
    }

    // Add character ID if present (for customize)
    if (context.characters && context.characters.length > 0) {
      const firstChar = context.characters[0];
      parts.push(firstChar.id || firstChar.name || 'unknown');
    }

    return parts.join(':');
  }

  /**
   * Get cache instance by name.
   * @param name - Cache name
   * @returns Cache instance or undefined if not found
   */
  getCache(name: string): ICacheStrategy | undefined {
    return this.caches.get(name);
  }

  /**
   * Get strategy instance by name.
   * @param name - Strategy name
   * @returns Strategy instance or undefined if not found
   */
  getStrategy(name: string): IPreRenderStrategy | undefined {
    return this.strategies.get(name);
  }

  /**
   * Get statistics for specific cache.
   * @param name - Cache name
   * @returns Cache statistics or null if cache not found
   */
  getCacheStats(name: string): CacheStats | null {
    const cache = this.caches.get(name);
    return cache ? cache.getStats() : null;
  }

  /**
   * Get statistics for all caches.
   * @returns Map of cache name to statistics
   */
  getAllCacheStats(): Record<string, CacheStats> {
    const stats: Record<string, CacheStats> = {};
    for (const [name, cache] of this.caches) {
      stats[name] = cache.getStats();
    }
    return stats;
  }

  /**
   * Clear specific cache.
   * @param name - Cache name
   */
  async clearCache(name: string): Promise<void> {
    const cache = this.caches.get(name);
    if (cache) {
      CacheLogger.info('Clearing cache', { name });
      await cache.clear();
      this.emit('cache:cleared', { name });
      CacheLogger.debug('Cache cleared', { name });
    } else {
      CacheLogger.warn('Cache not found', { name });
    }
  }

  /**
   * Clear all caches.
   */
  async clearAllCaches(): Promise<void> {
    CacheLogger.info('Clearing all caches', { count: this.caches.size });
    for (const [name, cache] of this.caches) {
      await cache.clear();
      this.emit('cache:cleared', { name });
    }
    CacheLogger.debug('All caches cleared');
  }

  /**
   * Check if a strategy is currently rendering.
   * @param strategyName - Strategy name
   * @returns True if strategy is rendering
   */
  isStrategyRendering(strategyName: string): boolean {
    return this.isRendering.has(strategyName);
  }

  /**
   * Get list of all registered strategy names.
   * @returns Array of strategy names
   */
  getStrategyNames(): string[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Get list of all registered cache names.
   * @returns Array of cache names
   */
  getCacheNames(): string[] {
    return Array.from(this.caches.keys());
  }

  /**
   * Find best strategy for given context.
   * Strategies with higher priority are preferred.
   *
   * @param context - Pre-render context
   * @returns Matching strategy or null
   */
  private findStrategy(context: PreRenderContext): IPreRenderStrategy | null {
    const candidates = Array.from(this.strategies.values())
      .filter((s) => s.shouldTrigger(context))
      .sort((a, b) => b.priority - a.priority);

    return candidates[0] ?? null;
  }
}
