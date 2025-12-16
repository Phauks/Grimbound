/**
 * Unified Cache Invalidation Coordinator
 *
 * Coordinates cache invalidation across all cache layers using the Observer pattern.
 * When assets, characters, or projects change, this service notifies all subscribed
 * caches to invalidate relevant entries.
 *
 * Architecture: Domain Service (Application Layer)
 * Pattern: Observer (Publish-Subscribe)
 */

import { logger } from '../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Invalidation scopes - what entity changed
 */
export type InvalidationScope = 'asset' | 'character' | 'project' | 'global'

/**
 * Invalidation event with context
 */
export interface InvalidationEvent {
  /** What type of entity changed */
  scope: InvalidationScope
  /** Entity ID(s) that changed */
  entityIds: string[]
  /** Reason for invalidation */
  reason: 'update' | 'delete' | 'manual'
  /** Additional metadata */
  metadata?: Record<string, unknown>
  /** Timestamp */
  timestamp: number
}

/**
 * Invalidation listener function
 */
export type InvalidationListener = (event: InvalidationEvent) => void | Promise<void>

/**
 * Subscription handle for unsubscribing
 */
export interface InvalidationSubscription {
  /** Scope this subscription listens to */
  scope: InvalidationScope | 'all'
  /** Unsubscribe function */
  unsubscribe: () => void
}

// ============================================================================
// Cache Invalidation Service
// ============================================================================

/**
 * Central coordinator for cache invalidation across all layers.
 *
 * Uses the Observer pattern to decouple cache layers - when an asset/character/project
 * changes, this service notifies all subscribed caches without tight coupling.
 *
 * @example
 * ```typescript
 * // Subscribe to asset invalidations
 * const subscription = invalidationService.subscribe('asset', async (event) => {
 *   console.log(`Asset ${event.entityIds} changed, clearing cache`)
 *   await myCache.invalidateByTag(`asset:${event.entityIds[0]}`)
 * })
 *
 * // Emit invalidation when asset changes
 * await invalidationService.invalidateAsset('asset-123', 'update')
 *
 * // Unsubscribe when done
 * subscription.unsubscribe()
 * ```
 */
export class CacheInvalidationService {
  private listeners: Map<InvalidationScope | 'all', Set<InvalidationListener>> = new Map()
  private eventHistory: InvalidationEvent[] = []
  private readonly maxHistorySize = 100

  constructor() {
    // Initialize listener sets for each scope
    this.listeners.set('asset', new Set())
    this.listeners.set('character', new Set())
    this.listeners.set('project', new Set())
    this.listeners.set('global', new Set())
    this.listeners.set('all', new Set())
  }

  // ==========================================================================
  // Subscription Management
  // ==========================================================================

  /**
   * Subscribe to invalidation events for a specific scope.
   *
   * @param scope - Scope to listen to ('asset', 'character', 'project', 'global', or 'all')
   * @param listener - Callback function to handle invalidation events
   * @returns Subscription handle with unsubscribe method
   *
   * @example
   * ```typescript
   * const sub = invalidationService.subscribe('asset', (event) => {
   *   if (event.reason === 'delete') {
   *     cache.delete(event.entityIds[0])
   *   }
   * })
   * ```
   */
  subscribe(
    scope: InvalidationScope | 'all',
    listener: InvalidationListener
  ): InvalidationSubscription {
    const scopeListeners = this.listeners.get(scope)
    if (!scopeListeners) {
      throw new Error(`Invalid scope: ${scope}`)
    }

    scopeListeners.add(listener)

    return {
      scope,
      unsubscribe: () => {
        scopeListeners.delete(listener)
      }
    }
  }

  /**
   * Unsubscribe a listener from a specific scope.
   *
   * @param scope - Scope to unsubscribe from
   * @param listener - Listener function to remove
   */
  unsubscribe(scope: InvalidationScope | 'all', listener: InvalidationListener): void {
    const scopeListeners = this.listeners.get(scope)
    if (scopeListeners) {
      scopeListeners.delete(listener)
    }
  }

  /**
   * Get count of active listeners for a scope.
   *
   * @param scope - Scope to check
   * @returns Number of active listeners
   */
  getListenerCount(scope: InvalidationScope | 'all'): number {
    return this.listeners.get(scope)?.size ?? 0
  }

  /**
   * Get total count of all active listeners.
   */
  getTotalListenerCount(): number {
    let total = 0
    for (const listeners of this.listeners.values()) {
      total += listeners.size
    }
    return total
  }

  // ==========================================================================
  // Invalidation Triggers
  // ==========================================================================

  /**
   * Invalidate caches when an asset changes.
   *
   * @param assetId - Asset ID that changed
   * @param reason - Why invalidation occurred
   * @param metadata - Additional context
   *
   * @example
   * ```typescript
   * // In AssetStorageService.update()
   * await assetStorageService.update(assetId, data)
   * await invalidationService.invalidateAsset(assetId, 'update')
   * ```
   */
  async invalidateAsset(
    assetId: string,
    reason: 'update' | 'delete' | 'manual' = 'manual',
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const event: InvalidationEvent = {
      scope: 'asset',
      entityIds: [assetId],
      reason,
      metadata,
      timestamp: Date.now()
    }

    await this.emit(event)
  }

  /**
   * Invalidate caches when multiple assets change.
   *
   * @param assetIds - Asset IDs that changed
   * @param reason - Why invalidation occurred
   * @param metadata - Additional context
   */
  async invalidateAssets(
    assetIds: string[],
    reason: 'update' | 'delete' | 'manual' = 'manual',
    metadata?: Record<string, unknown>
  ): Promise<void> {
    if (assetIds.length === 0) return

    const event: InvalidationEvent = {
      scope: 'asset',
      entityIds: assetIds,
      reason,
      metadata,
      timestamp: Date.now()
    }

    await this.emit(event)
  }

  /**
   * Invalidate caches when a character changes.
   *
   * @param characterId - Character ID that changed
   * @param reason - Why invalidation occurred
   * @param metadata - Additional context
   *
   * @example
   * ```typescript
   * // When user updates character icon
   * await invalidationService.invalidateCharacter(character.id, 'update', {
   *   field: 'image'
   * })
   * ```
   */
  async invalidateCharacter(
    characterId: string,
    reason: 'update' | 'delete' | 'manual' = 'manual',
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const event: InvalidationEvent = {
      scope: 'character',
      entityIds: [characterId],
      reason,
      metadata,
      timestamp: Date.now()
    }

    await this.emit(event)
  }

  /**
   * Invalidate caches when multiple characters change.
   *
   * @param characterIds - Character IDs that changed
   * @param reason - Why invalidation occurred
   * @param metadata - Additional context
   */
  async invalidateCharacters(
    characterIds: string[],
    reason: 'update' | 'delete' | 'manual' = 'manual',
    metadata?: Record<string, unknown>
  ): Promise<void> {
    if (characterIds.length === 0) return

    const event: InvalidationEvent = {
      scope: 'character',
      entityIds: characterIds,
      reason,
      metadata,
      timestamp: Date.now()
    }

    await this.emit(event)
  }

  /**
   * Invalidate caches when a project changes.
   *
   * @param projectId - Project ID that changed
   * @param reason - Why invalidation occurred
   * @param metadata - Additional context
   *
   * @example
   * ```typescript
   * // When project is deleted
   * await projectService.delete(projectId)
   * await invalidationService.invalidateProject(projectId, 'delete')
   * ```
   */
  async invalidateProject(
    projectId: string,
    reason: 'update' | 'delete' | 'manual' = 'manual',
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const event: InvalidationEvent = {
      scope: 'project',
      entityIds: [projectId],
      reason,
      metadata,
      timestamp: Date.now()
    }

    await this.emit(event)
  }

  /**
   * Invalidate all caches globally.
   *
   * @param reason - Why invalidation occurred
   * @param metadata - Additional context
   *
   * @example
   * ```typescript
   * // When user clicks "Clear All Caches" button
   * await invalidationService.invalidateAll('manual', { source: 'user-action' })
   * ```
   */
  async invalidateAll(
    reason: 'update' | 'delete' | 'manual' = 'manual',
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const event: InvalidationEvent = {
      scope: 'global',
      entityIds: [],
      reason,
      metadata,
      timestamp: Date.now()
    }

    await this.emit(event)
  }

  // ==========================================================================
  // Event Emission
  // ==========================================================================

  /**
   * Emit invalidation event to all relevant listeners.
   *
   * @param event - Invalidation event to emit
   */
  private async emit(event: InvalidationEvent): Promise<void> {
    // Add to history
    this.addToHistory(event)

    // Get scope-specific listeners
    const scopeListeners = this.listeners.get(event.scope) ?? new Set()
    // Get global listeners (listen to all scopes)
    const allListeners = this.listeners.get('all') ?? new Set()

    // Combine both sets
    const listenersToNotify = new Set([...scopeListeners, ...allListeners])

    if (listenersToNotify.size === 0) {
      // No listeners registered - log for debugging
      logger.debug('CacheInvalidation', `No listeners for scope: ${event.scope}`)
      return
    }

    // Notify all listeners in parallel
    const notifications = Array.from(listenersToNotify).map(async (listener) => {
      try {
        await listener(event)
      } catch (error) {
        logger.error('CacheInvalidation', 'Listener error', error)
      }
    })

    await Promise.all(notifications)

    // Log successful invalidation
    logger.debug('CacheInvalidation',
      `${event.scope} invalidation: ${event.entityIds.join(', ')} (${listenersToNotify.size} listeners notified)`
    )
  }

  // ==========================================================================
  // Event History
  // ==========================================================================

  /**
   * Add event to history, maintaining max size.
   */
  private addToHistory(event: InvalidationEvent): void {
    this.eventHistory.push(event)

    // Trim history if it exceeds max size
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize)
    }
  }

  /**
   * Get recent invalidation events.
   *
   * @param limit - Maximum number of events to return (default: 50)
   * @returns Array of recent invalidation events
   */
  getRecentEvents(limit: number = 50): InvalidationEvent[] {
    return this.eventHistory.slice(-limit)
  }

  /**
   * Get events for a specific scope.
   *
   * @param scope - Scope to filter by
   * @param limit - Maximum number of events to return
   * @returns Array of events matching scope
   */
  getEventsByScope(scope: InvalidationScope, limit: number = 50): InvalidationEvent[] {
    return this.eventHistory
      .filter(event => event.scope === scope)
      .slice(-limit)
  }

  /**
   * Clear event history.
   */
  clearHistory(): void {
    this.eventHistory = []
  }

  // ==========================================================================
  // Diagnostics
  // ==========================================================================

  /**
   * Get service statistics for debugging.
   */
  getStats() {
    return {
      listeners: {
        asset: this.getListenerCount('asset'),
        character: this.getListenerCount('character'),
        project: this.getListenerCount('project'),
        global: this.getListenerCount('global'),
        all: this.getListenerCount('all'),
        total: this.getTotalListenerCount()
      },
      events: {
        total: this.eventHistory.length,
        byScope: {
          asset: this.eventHistory.filter(e => e.scope === 'asset').length,
          character: this.eventHistory.filter(e => e.scope === 'character').length,
          project: this.eventHistory.filter(e => e.scope === 'project').length,
          global: this.eventHistory.filter(e => e.scope === 'global').length
        }
      },
      recentEvents: this.getRecentEvents(10)
    }
  }

  /**
   * Clear all listeners (useful for cleanup/testing).
   */
  clearAllListeners(): void {
    for (const listeners of this.listeners.values()) {
      listeners.clear()
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Global cache invalidation service singleton.
 * Shared across the entire application.
 */
export const cacheInvalidationService = new CacheInvalidationService()

export default cacheInvalidationService
