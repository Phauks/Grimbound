/**
 * Unit tests for LRUEvictionPolicy
 *
 * Tests cover:
 * - shouldEvict based on maxSize and maxMemory
 * - selectVictims selects LRU entries
 * - recordAccess updates access order
 * - recordInsertion adds new entries
 * - recordRemoval cleans up tracking
 * - reset clears all state
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { CacheEntry, CacheStats } from '@/ts/cache/core/types';
import { LRUEvictionPolicy } from '@/ts/cache/policies/LRUEvictionPolicy';

// ============================================================================
// Test Helpers
// ============================================================================

const createCacheStats = (overrides: Partial<CacheStats> = {}): CacheStats => ({
  size: 0,
  memoryUsage: 0,
  hitCount: 0,
  missCount: 0,
  evictionCount: 0,
  hitRate: 0,
  ...overrides,
});

const createCacheEntry = <V>(
  key: string,
  value: V,
  lastAccessed: number = Date.now()
): CacheEntry<V> => ({
  key,
  value,
  size: 100,
  createdAt: Date.now(),
  lastAccessed,
  accessCount: 1,
});

const createEntryMap = <V>(entries: Array<{ key: string; value: V; lastAccessed?: number }>) => {
  const map = new Map<string, CacheEntry<V>>();
  entries.forEach(({ key, value, lastAccessed }) => {
    map.set(key, createCacheEntry(key, value, lastAccessed ?? Date.now()));
  });
  return map;
};

// ============================================================================
// Tests
// ============================================================================

describe('LRUEvictionPolicy', () => {
  let policy: LRUEvictionPolicy;

  beforeEach(() => {
    policy = new LRUEvictionPolicy({
      maxSize: 100,
      maxMemory: 10000,
      evictionRatio: 0.1,
    });
  });

  // --------------------------------------------------------------------------
  // shouldEvict
  // --------------------------------------------------------------------------

  describe('shouldEvict', () => {
    it('should return false when under limits', () => {
      const stats = createCacheStats({ size: 50, memoryUsage: 5000 });

      expect(policy.shouldEvict(stats)).toBe(false);
    });

    it('should return true when size exceeds maxSize', () => {
      const stats = createCacheStats({ size: 100, memoryUsage: 5000 });

      expect(policy.shouldEvict(stats)).toBe(true);
    });

    it('should return true when size is over maxSize', () => {
      const stats = createCacheStats({ size: 150, memoryUsage: 5000 });

      expect(policy.shouldEvict(stats)).toBe(true);
    });

    it('should return true when memory exceeds maxMemory', () => {
      const stats = createCacheStats({ size: 50, memoryUsage: 10000 });

      expect(policy.shouldEvict(stats)).toBe(true);
    });

    it('should return true when memory is over maxMemory', () => {
      const stats = createCacheStats({ size: 50, memoryUsage: 15000 });

      expect(policy.shouldEvict(stats)).toBe(true);
    });

    it('should return false when only maxSize is set and not exceeded', () => {
      const sizeOnlyPolicy = new LRUEvictionPolicy({ maxSize: 100 });
      const stats = createCacheStats({ size: 50, memoryUsage: 999999 });

      expect(sizeOnlyPolicy.shouldEvict(stats)).toBe(false);
    });

    it('should return false when only maxMemory is set and not exceeded', () => {
      const memoryOnlyPolicy = new LRUEvictionPolicy({ maxMemory: 10000 });
      const stats = createCacheStats({ size: 999999, memoryUsage: 5000 });

      expect(memoryOnlyPolicy.shouldEvict(stats)).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // selectVictims
  // --------------------------------------------------------------------------

  describe('selectVictims', () => {
    it('should select oldest entries based on access order', () => {
      // Record access in order: key1, key2, key3, key4, key5
      policy.recordInsertion('key1', 100);
      policy.recordInsertion('key2', 100);
      policy.recordInsertion('key3', 100);
      policy.recordInsertion('key4', 100);
      policy.recordInsertion('key5', 100);

      const entries = createEntryMap([
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2' },
        { key: 'key3', value: 'value3' },
        { key: 'key4', value: 'value4' },
        { key: 'key5', value: 'value5' },
      ]);

      const victims = policy.selectVictims(entries);

      // Should select 10% of 5 = 1 entry (minimum 1)
      expect(victims).toHaveLength(1);
      // Should be the oldest (key1)
      expect(victims[0]).toBe('key1');
    });

    it('should evict at least 1 entry', () => {
      policy.recordInsertion('key1', 100);

      const entries = createEntryMap([{ key: 'key1', value: 'value1' }]);

      const victims = policy.selectVictims(entries);

      expect(victims).toHaveLength(1);
    });

    it('should respect eviction ratio', () => {
      const highEvictionPolicy = new LRUEvictionPolicy({
        maxSize: 100,
        evictionRatio: 0.5, // 50%
      });

      for (let i = 0; i < 10; i++) {
        highEvictionPolicy.recordInsertion(`key${i}`, 100);
      }

      const entries = createEntryMap(
        Array.from({ length: 10 }, (_, i) => ({
          key: `key${i}`,
          value: `value${i}`,
        }))
      );

      const victims = highEvictionPolicy.selectVictims(entries);

      // 50% of 10 = 5 entries
      expect(victims).toHaveLength(5);
    });

    it('should select recently accessed entries last', () => {
      // Insert all entries
      policy.recordInsertion('key1', 100);
      policy.recordInsertion('key2', 100);
      policy.recordInsertion('key3', 100);

      // Access key1 again, making it more recent
      policy.recordAccess('key1');

      const entries = createEntryMap([
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2' },
        { key: 'key3', value: 'value3' },
      ]);

      const victims = policy.selectVictims(entries);

      // key2 is the oldest (inserted second, never accessed again)
      expect(victims[0]).toBe('key2');
    });

    it('should use entry lastAccessed when no access recorded', () => {
      // Don't record any access - will use entry.lastAccessed
      const entries = createEntryMap([
        { key: 'old', value: 'old', lastAccessed: 1000 },
        { key: 'new', value: 'new', lastAccessed: 2000 },
      ]);

      const victims = policy.selectVictims(entries);

      // 'old' has earlier lastAccessed
      expect(victims[0]).toBe('old');
    });
  });

  // --------------------------------------------------------------------------
  // recordAccess
  // --------------------------------------------------------------------------

  describe('recordAccess', () => {
    it('should update access order', () => {
      // Insert in order
      policy.recordInsertion('key1', 100);
      policy.recordInsertion('key2', 100);
      policy.recordInsertion('key3', 100);

      // Access key1, making it most recent
      policy.recordAccess('key1');

      const entries = createEntryMap([
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2' },
        { key: 'key3', value: 'value3' },
      ]);

      const victims = policy.selectVictims(entries);

      // key2 should be evicted first (oldest after key1 was accessed)
      expect(victims[0]).toBe('key2');
    });

    it('should handle multiple accesses', () => {
      policy.recordInsertion('key1', 100);
      policy.recordInsertion('key2', 100);
      policy.recordInsertion('key3', 100);

      // Access key2 multiple times
      policy.recordAccess('key2');
      policy.recordAccess('key2');
      policy.recordAccess('key2');

      const entries = createEntryMap([
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2' },
        { key: 'key3', value: 'value3' },
      ]);

      const victims = policy.selectVictims(entries);

      // key1 should be evicted first (oldest, key3 was inserted after)
      expect(victims[0]).toBe('key1');
    });
  });

  // --------------------------------------------------------------------------
  // recordInsertion
  // --------------------------------------------------------------------------

  describe('recordInsertion', () => {
    it('should track new entries', () => {
      policy.recordInsertion('key1', 100);
      policy.recordInsertion('key2', 100);

      const entries = createEntryMap([
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2' },
      ]);

      const victims = policy.selectVictims(entries);

      // key1 was inserted first
      expect(victims[0]).toBe('key1');
    });

    it('should give new entries current access counter', () => {
      // Access some entries first
      policy.recordInsertion('old1', 100);
      policy.recordInsertion('old2', 100);
      policy.recordAccess('old1');
      policy.recordAccess('old2');

      // Insert new entry
      policy.recordInsertion('new', 100);

      const entries = createEntryMap([
        { key: 'old1', value: 'old1' },
        { key: 'old2', value: 'old2' },
        { key: 'new', value: 'new' },
      ]);

      const victims = policy.selectVictims(entries);

      // old1 is oldest (inserted first, accessed early)
      expect(victims[0]).toBe('old1');
    });
  });

  // --------------------------------------------------------------------------
  // recordRemoval
  // --------------------------------------------------------------------------

  describe('recordRemoval', () => {
    it('should remove entry from tracking', () => {
      policy.recordInsertion('key1', 100);
      policy.recordInsertion('key2', 100);
      policy.recordInsertion('key3', 100);

      // Remove key1
      policy.recordRemoval('key1');

      // Now only key2 and key3 are tracked
      const entries = createEntryMap([
        { key: 'key2', value: 'value2' },
        { key: 'key3', value: 'value3' },
      ]);

      const victims = policy.selectVictims(entries);

      // key2 should be selected (oldest remaining)
      expect(victims[0]).toBe('key2');
    });

    it('should handle removing non-existent key gracefully', () => {
      policy.recordInsertion('key1', 100);

      // Should not throw
      expect(() => policy.recordRemoval('nonexistent')).not.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // reset
  // --------------------------------------------------------------------------

  describe('reset', () => {
    it('should clear all access tracking', () => {
      policy.recordInsertion('key1', 100);
      policy.recordInsertion('key2', 100);
      policy.recordAccess('key1');
      policy.recordAccess('key2');

      policy.reset();

      // After reset, will fall back to entry.lastAccessed
      const entries = createEntryMap([
        { key: 'key1', value: 'value1', lastAccessed: 2000 },
        { key: 'key2', value: 'value2', lastAccessed: 1000 },
      ]);

      const victims = policy.selectVictims(entries);

      // key2 has earlier lastAccessed (no access order to use)
      expect(victims[0]).toBe('key2');
    });

    it('should reset access counter', () => {
      // Record many accesses
      for (let i = 0; i < 100; i++) {
        policy.recordInsertion(`key${i}`, 100);
      }

      policy.reset();

      // New insertions should work normally
      policy.recordInsertion('new1', 100);
      policy.recordInsertion('new2', 100);

      const entries = createEntryMap([
        { key: 'new1', value: 'new1' },
        { key: 'new2', value: 'new2' },
      ]);

      const victims = policy.selectVictims(entries);

      expect(victims[0]).toBe('new1');
    });
  });

  // --------------------------------------------------------------------------
  // Default Options
  // --------------------------------------------------------------------------

  describe('Default Options', () => {
    it('should default evictionRatio to 0.1', () => {
      const defaultPolicy = new LRUEvictionPolicy({
        maxSize: 100,
      });

      // Insert 10 entries
      for (let i = 0; i < 10; i++) {
        defaultPolicy.recordInsertion(`key${i}`, 100);
      }

      const entries = createEntryMap(
        Array.from({ length: 10 }, (_, i) => ({
          key: `key${i}`,
          value: `value${i}`,
        }))
      );

      const victims = defaultPolicy.selectVictims(entries);

      // 10% of 10 = 1 entry
      expect(victims).toHaveLength(1);
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases
  // --------------------------------------------------------------------------

  describe('Edge Cases', () => {
    it('should handle empty entries map', () => {
      const entries = new Map<string, CacheEntry<string>>();

      const victims = policy.selectVictims(entries);

      expect(victims).toHaveLength(0);
    });

    it('should handle single entry', () => {
      policy.recordInsertion('only', 100);

      const entries = createEntryMap([{ key: 'only', value: 'only' }]);

      const victims = policy.selectVictims(entries);

      expect(victims).toHaveLength(1);
      expect(victims[0]).toBe('only');
    });

    it('should work with no maxSize or maxMemory', () => {
      const noLimitsPolicy = new LRUEvictionPolicy({});
      const stats = createCacheStats({ size: 999999, memoryUsage: 999999999 });

      expect(noLimitsPolicy.shouldEvict(stats)).toBe(false);
    });
  });
});
