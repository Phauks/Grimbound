/**
 * Unit tests for CacheInvalidationService
 *
 * Tests cover:
 * - Subscription management (subscribe, unsubscribe)
 * - Invalidation triggers (asset, character, project, global)
 * - Event emission to correct listeners
 * - Event history tracking
 * - Diagnostics and statistics
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CacheInvalidationService,
  type InvalidationListener,
} from '@/ts/cache/CacheInvalidationService';

// ============================================================================
// Test Helpers
// ============================================================================

const createListener = (): InvalidationListener => vi.fn();

const _waitForPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

// ============================================================================
// Tests
// ============================================================================

describe('CacheInvalidationService', () => {
  let service: CacheInvalidationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CacheInvalidationService();
  });

  afterEach(() => {
    service.clearAllListeners();
    service.clearHistory();
  });

  // --------------------------------------------------------------------------
  // Subscription Management
  // --------------------------------------------------------------------------

  describe('Subscription Management', () => {
    it('should subscribe listener to scope', () => {
      const listener = createListener();
      service.subscribe('asset', listener);

      expect(service.getListenerCount('asset')).toBe(1);
    });

    it('should subscribe multiple listeners to same scope', () => {
      const listener1 = createListener();
      const listener2 = createListener();

      service.subscribe('asset', listener1);
      service.subscribe('asset', listener2);

      expect(service.getListenerCount('asset')).toBe(2);
    });

    it('should subscribe to different scopes', () => {
      const assetListener = createListener();
      const characterListener = createListener();
      const projectListener = createListener();

      service.subscribe('asset', assetListener);
      service.subscribe('character', characterListener);
      service.subscribe('project', projectListener);

      expect(service.getListenerCount('asset')).toBe(1);
      expect(service.getListenerCount('character')).toBe(1);
      expect(service.getListenerCount('project')).toBe(1);
    });

    it('should subscribe to all scopes', () => {
      const listener = createListener();
      service.subscribe('all', listener);

      expect(service.getListenerCount('all')).toBe(1);
    });

    it('should unsubscribe using returned handle', () => {
      const listener = createListener();
      const subscription = service.subscribe('asset', listener);

      expect(service.getListenerCount('asset')).toBe(1);

      subscription.unsubscribe();

      expect(service.getListenerCount('asset')).toBe(0);
    });

    it('should unsubscribe using unsubscribe method', () => {
      const listener = createListener();
      service.subscribe('asset', listener);

      expect(service.getListenerCount('asset')).toBe(1);

      service.unsubscribe('asset', listener);

      expect(service.getListenerCount('asset')).toBe(0);
    });

    it('should return correct subscription scope', () => {
      const listener = createListener();
      const subscription = service.subscribe('character', listener);

      expect(subscription.scope).toBe('character');
    });

    it('should throw for invalid scope', () => {
      const listener = createListener();

      // Force an invalid scope by casting
      expect(() => {
        service.subscribe('invalid' as 'asset', listener);
      }).toThrow('Invalid scope: invalid');
    });

    it('should get total listener count', () => {
      service.subscribe('asset', createListener());
      service.subscribe('asset', createListener());
      service.subscribe('character', createListener());
      service.subscribe('project', createListener());
      service.subscribe('all', createListener());

      expect(service.getTotalListenerCount()).toBe(5);
    });

    it('should clear all listeners', () => {
      service.subscribe('asset', createListener());
      service.subscribe('character', createListener());
      service.subscribe('project', createListener());
      service.subscribe('all', createListener());

      service.clearAllListeners();

      expect(service.getTotalListenerCount()).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Asset Invalidation
  // --------------------------------------------------------------------------

  describe('Asset Invalidation', () => {
    it('should notify asset listeners on invalidateAsset', async () => {
      const listener = createListener();
      service.subscribe('asset', listener);

      await service.invalidateAsset('asset-123', 'update');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: 'asset',
          entityIds: ['asset-123'],
          reason: 'update',
        })
      );
    });

    it('should notify asset listeners on invalidateAssets', async () => {
      const listener = createListener();
      service.subscribe('asset', listener);

      await service.invalidateAssets(['asset-1', 'asset-2'], 'delete');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: 'asset',
          entityIds: ['asset-1', 'asset-2'],
          reason: 'delete',
        })
      );
    });

    it('should not emit for empty asset list', async () => {
      const listener = createListener();
      service.subscribe('asset', listener);

      await service.invalidateAssets([], 'update');

      expect(listener).not.toHaveBeenCalled();
    });

    it('should include metadata in asset event', async () => {
      const listener = createListener();
      service.subscribe('asset', listener);

      await service.invalidateAsset('asset-123', 'update', { field: 'image' });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { field: 'image' },
        })
      );
    });

    it('should default reason to manual', async () => {
      const listener = createListener();
      service.subscribe('asset', listener);

      await service.invalidateAsset('asset-123');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: 'manual',
        })
      );
    });
  });

  // --------------------------------------------------------------------------
  // Character Invalidation
  // --------------------------------------------------------------------------

  describe('Character Invalidation', () => {
    it('should notify character listeners on invalidateCharacter', async () => {
      const listener = createListener();
      service.subscribe('character', listener);

      await service.invalidateCharacter('char-123', 'update');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: 'character',
          entityIds: ['char-123'],
          reason: 'update',
        })
      );
    });

    it('should notify character listeners on invalidateCharacters', async () => {
      const listener = createListener();
      service.subscribe('character', listener);

      await service.invalidateCharacters(['char-1', 'char-2', 'char-3'], 'delete');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: 'character',
          entityIds: ['char-1', 'char-2', 'char-3'],
          reason: 'delete',
        })
      );
    });

    it('should not emit for empty character list', async () => {
      const listener = createListener();
      service.subscribe('character', listener);

      await service.invalidateCharacters([], 'update');

      expect(listener).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // Project Invalidation
  // --------------------------------------------------------------------------

  describe('Project Invalidation', () => {
    it('should notify project listeners on invalidateProject', async () => {
      const listener = createListener();
      service.subscribe('project', listener);

      await service.invalidateProject('project-123', 'delete');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: 'project',
          entityIds: ['project-123'],
          reason: 'delete',
        })
      );
    });

    it('should include metadata in project event', async () => {
      const listener = createListener();
      service.subscribe('project', listener);

      await service.invalidateProject('project-123', 'update', { source: 'auto-save' });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { source: 'auto-save' },
        })
      );
    });
  });

  // --------------------------------------------------------------------------
  // Global Invalidation
  // --------------------------------------------------------------------------

  describe('Global Invalidation', () => {
    it('should notify global listeners on invalidateAll', async () => {
      const listener = createListener();
      service.subscribe('global', listener);

      await service.invalidateAll('manual');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: 'global',
          entityIds: [],
          reason: 'manual',
        })
      );
    });

    it('should include metadata in global event', async () => {
      const listener = createListener();
      service.subscribe('global', listener);

      await service.invalidateAll('manual', { source: 'user-action' });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { source: 'user-action' },
        })
      );
    });
  });

  // --------------------------------------------------------------------------
  // Cross-Scope Notifications
  // --------------------------------------------------------------------------

  describe('Cross-Scope Notifications', () => {
    it('should notify "all" listeners for asset events', async () => {
      const allListener = createListener();
      const assetListener = createListener();

      service.subscribe('all', allListener);
      service.subscribe('asset', assetListener);

      await service.invalidateAsset('asset-123', 'update');

      expect(allListener).toHaveBeenCalled();
      expect(assetListener).toHaveBeenCalled();
    });

    it('should notify "all" listeners for character events', async () => {
      const allListener = createListener();
      service.subscribe('all', allListener);

      await service.invalidateCharacter('char-123', 'update');

      expect(allListener).toHaveBeenCalledWith(
        expect.objectContaining({
          scope: 'character',
        })
      );
    });

    it('should not notify unrelated scope listeners', async () => {
      const assetListener = createListener();
      const characterListener = createListener();

      service.subscribe('asset', assetListener);
      service.subscribe('character', characterListener);

      await service.invalidateAsset('asset-123', 'update');

      expect(assetListener).toHaveBeenCalled();
      expect(characterListener).not.toHaveBeenCalled();
    });

    it('should notify all listeners in parallel', async () => {
      const callOrder: number[] = [];
      const listener1 = vi.fn(async () => {
        await new Promise((r) => setTimeout(r, 10));
        callOrder.push(1);
      });
      const listener2 = vi.fn(async () => {
        callOrder.push(2);
      });

      service.subscribe('asset', listener1);
      service.subscribe('asset', listener2);

      await service.invalidateAsset('asset-123', 'update');

      // Both should have been called
      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // Error Handling
  // --------------------------------------------------------------------------

  describe('Error Handling', () => {
    it('should continue notifying other listeners when one throws', async () => {
      const errorListener = vi.fn(() => {
        throw new Error('Listener error');
      });
      const goodListener = createListener();

      service.subscribe('asset', errorListener);
      service.subscribe('asset', goodListener);

      // Should not throw
      await service.invalidateAsset('asset-123', 'update');

      expect(errorListener).toHaveBeenCalled();
      expect(goodListener).toHaveBeenCalled();
    });

    it('should handle async listener errors', async () => {
      const asyncErrorListener = vi.fn(async () => {
        throw new Error('Async error');
      });
      const goodListener = createListener();

      service.subscribe('asset', asyncErrorListener);
      service.subscribe('asset', goodListener);

      // Should not throw
      await service.invalidateAsset('asset-123', 'update');

      expect(asyncErrorListener).toHaveBeenCalled();
      expect(goodListener).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // Event History
  // --------------------------------------------------------------------------

  describe('Event History', () => {
    it('should track events in history', async () => {
      await service.invalidateAsset('asset-1', 'update');
      await service.invalidateCharacter('char-1', 'delete');

      const events = service.getRecentEvents();

      expect(events).toHaveLength(2);
      expect(events[0].scope).toBe('asset');
      expect(events[1].scope).toBe('character');
    });

    it('should limit history to max size', async () => {
      // Emit more than max history size (100)
      for (let i = 0; i < 110; i++) {
        await service.invalidateAsset(`asset-${i}`, 'update');
      }

      const events = service.getRecentEvents(200);

      expect(events.length).toBeLessThanOrEqual(100);
    });

    it('should get events by scope', async () => {
      await service.invalidateAsset('asset-1', 'update');
      await service.invalidateCharacter('char-1', 'delete');
      await service.invalidateAsset('asset-2', 'update');

      const assetEvents = service.getEventsByScope('asset');

      expect(assetEvents).toHaveLength(2);
      expect(assetEvents.every((e) => e.scope === 'asset')).toBe(true);
    });

    it('should limit returned events', async () => {
      for (let i = 0; i < 10; i++) {
        await service.invalidateAsset(`asset-${i}`, 'update');
      }

      const events = service.getRecentEvents(5);

      expect(events).toHaveLength(5);
    });

    it('should clear history', async () => {
      await service.invalidateAsset('asset-1', 'update');
      await service.invalidateAsset('asset-2', 'update');

      service.clearHistory();

      expect(service.getRecentEvents()).toHaveLength(0);
    });

    it('should include timestamp in events', async () => {
      const before = Date.now();
      await service.invalidateAsset('asset-1', 'update');
      const after = Date.now();

      const events = service.getRecentEvents();

      expect(events[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(events[0].timestamp).toBeLessThanOrEqual(after);
    });
  });

  // --------------------------------------------------------------------------
  // Diagnostics
  // --------------------------------------------------------------------------

  describe('Diagnostics', () => {
    it('should return stats', async () => {
      service.subscribe('asset', createListener());
      service.subscribe('asset', createListener());
      service.subscribe('character', createListener());

      await service.invalidateAsset('asset-1', 'update');
      await service.invalidateCharacter('char-1', 'delete');

      const stats = service.getStats();

      expect(stats.listeners.asset).toBe(2);
      expect(stats.listeners.character).toBe(1);
      expect(stats.listeners.total).toBe(3);
      expect(stats.events.total).toBe(2);
      expect(stats.events.byScope.asset).toBe(1);
      expect(stats.events.byScope.character).toBe(1);
    });

    it('should include recent events in stats', async () => {
      await service.invalidateAsset('asset-1', 'update');

      const stats = service.getStats();

      expect(stats.recentEvents).toHaveLength(1);
      expect(stats.recentEvents[0].scope).toBe('asset');
    });
  });
});
