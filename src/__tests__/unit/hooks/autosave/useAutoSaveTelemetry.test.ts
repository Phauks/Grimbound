/**
 * Unit tests for useAutoSaveTelemetry hook
 *
 * Tests telemetry tracking for auto-save operations:
 * - Recording successful and failed save attempts
 * - Computing statistics (success rate, average duration)
 * - Persisting telemetry to localStorage
 * - Resetting telemetry data
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type AutoSaveTelemetry,
  computeTelemetryStats,
  useAutoSaveTelemetry,
} from '@/hooks/autosave/useAutoSaveTelemetry';
import { STORAGE_KEYS } from '@/ts/utils/storageKeys';

/**
 * Mock logger to avoid console output during tests
 */
vi.mock('@/ts/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

/**
 * Mock localStorage
 */
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('useAutoSaveTelemetry', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe('Initial state', () => {
    it('should initialize with default telemetry when no stored data exists', () => {
      const { result } = renderHook(() => useAutoSaveTelemetry());

      const stats = result.current.getStats();

      expect(stats.totalSaves).toBe(0);
      expect(stats.totalErrors).toBe(0);
      expect(stats.totalAttempts).toBe(0);
      expect(stats.totalDurationMs).toBe(0);
      expect(stats.lastSaveDurationMs).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.avgSaveDurationMs).toBe(0);
    });

    it('should load existing telemetry from localStorage', () => {
      const storedTelemetry: AutoSaveTelemetry = {
        totalSaves: 10,
        totalErrors: 2,
        totalAttempts: 12,
        totalDurationMs: 5000,
        lastSaveDurationMs: 500,
        firstSaveAt: Date.now() - 60000,
        lastUpdatedAt: Date.now() - 1000,
      };
      localStorageMock.setItem(STORAGE_KEYS.AUTO_SAVE_TELEMETRY, JSON.stringify(storedTelemetry));

      const { result } = renderHook(() => useAutoSaveTelemetry());

      const stats = result.current.getStats();

      expect(stats.totalSaves).toBe(10);
      expect(stats.totalErrors).toBe(2);
      expect(stats.totalAttempts).toBe(12);
    });

    it('should handle corrupted localStorage data gracefully', () => {
      localStorageMock.setItem(STORAGE_KEYS.AUTO_SAVE_TELEMETRY, 'invalid-json');

      const { result } = renderHook(() => useAutoSaveTelemetry());

      const stats = result.current.getStats();

      // Should fall back to defaults
      expect(stats.totalSaves).toBe(0);
      expect(stats.totalErrors).toBe(0);
    });
  });

  describe('recordSaveAttempt', () => {
    it('should record a successful save attempt', () => {
      const { result } = renderHook(() => useAutoSaveTelemetry());

      act(() => {
        result.current.recordSaveAttempt(true, 100);
      });

      const stats = result.current.getStats();

      expect(stats.totalSaves).toBe(1);
      expect(stats.totalErrors).toBe(0);
      expect(stats.totalAttempts).toBe(1);
      expect(stats.totalDurationMs).toBe(100);
      expect(stats.lastSaveDurationMs).toBe(100);
      expect(stats.successRate).toBe(100);
    });

    it('should record a failed save attempt', () => {
      const { result } = renderHook(() => useAutoSaveTelemetry());

      act(() => {
        result.current.recordSaveAttempt(false, 50);
      });

      const stats = result.current.getStats();

      expect(stats.totalSaves).toBe(0);
      expect(stats.totalErrors).toBe(1);
      expect(stats.totalAttempts).toBe(1);
      expect(stats.totalDurationMs).toBe(0); // Duration not added for failures
      expect(stats.lastSaveDurationMs).toBe(50);
      expect(stats.successRate).toBe(0);
    });

    it('should accumulate multiple save attempts', () => {
      const { result } = renderHook(() => useAutoSaveTelemetry());

      act(() => {
        result.current.recordSaveAttempt(true, 100);
        result.current.recordSaveAttempt(true, 200);
        result.current.recordSaveAttempt(false, 50);
        result.current.recordSaveAttempt(true, 150);
      });

      const stats = result.current.getStats();

      expect(stats.totalSaves).toBe(3);
      expect(stats.totalErrors).toBe(1);
      expect(stats.totalAttempts).toBe(4);
      expect(stats.totalDurationMs).toBe(450); // 100 + 200 + 150
      expect(stats.lastSaveDurationMs).toBe(150);
    });

    it('should persist telemetry to localStorage', () => {
      const { result } = renderHook(() => useAutoSaveTelemetry());

      act(() => {
        result.current.recordSaveAttempt(true, 100);
      });

      const stored = localStorageMock.getItem(STORAGE_KEYS.AUTO_SAVE_TELEMETRY);
      expect(stored).not.toBeNull();

      if (stored) {
        const parsed = JSON.parse(stored);
        expect(parsed.totalSaves).toBe(1);
        expect(parsed.totalAttempts).toBe(1);
      }
    });

    it('should update lastUpdatedAt on each save', () => {
      const { result } = renderHook(() => useAutoSaveTelemetry());

      const beforeTime = Date.now();

      act(() => {
        result.current.recordSaveAttempt(true, 100);
      });

      const afterTime = Date.now();
      const stats = result.current.getStats();

      expect(stats.lastUpdatedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(stats.lastUpdatedAt).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('getStats', () => {
    it('should calculate correct success rate', () => {
      const { result } = renderHook(() => useAutoSaveTelemetry());

      act(() => {
        result.current.recordSaveAttempt(true, 100);
        result.current.recordSaveAttempt(true, 100);
        result.current.recordSaveAttempt(false, 100);
        result.current.recordSaveAttempt(true, 100);
      });

      const stats = result.current.getStats();

      expect(stats.successRate).toBe(75); // 3/4 = 75%
    });

    it('should calculate correct average save duration', () => {
      const { result } = renderHook(() => useAutoSaveTelemetry());

      act(() => {
        result.current.recordSaveAttempt(true, 100);
        result.current.recordSaveAttempt(true, 200);
        result.current.recordSaveAttempt(true, 300);
      });

      const stats = result.current.getStats();

      expect(stats.avgSaveDurationMs).toBe(200); // (100 + 200 + 300) / 3
    });

    it('should return 0 average when no successful saves', () => {
      const { result } = renderHook(() => useAutoSaveTelemetry());

      act(() => {
        result.current.recordSaveAttempt(false, 100);
        result.current.recordSaveAttempt(false, 200);
      });

      const stats = result.current.getStats();

      expect(stats.avgSaveDurationMs).toBe(0);
    });
  });

  describe('reset', () => {
    it('should reset all telemetry to defaults', () => {
      const { result } = renderHook(() => useAutoSaveTelemetry());

      // Record some data
      act(() => {
        result.current.recordSaveAttempt(true, 100);
        result.current.recordSaveAttempt(true, 200);
        result.current.recordSaveAttempt(false, 50);
      });

      // Verify data exists
      let stats = result.current.getStats();
      expect(stats.totalAttempts).toBe(3);

      // Reset
      act(() => {
        result.current.reset();
      });

      // Verify reset
      stats = result.current.getStats();
      expect(stats.totalSaves).toBe(0);
      expect(stats.totalErrors).toBe(0);
      expect(stats.totalAttempts).toBe(0);
      expect(stats.totalDurationMs).toBe(0);
      expect(stats.lastSaveDurationMs).toBe(0);
    });

    it('should update firstSaveAt on reset', () => {
      const { result } = renderHook(() => useAutoSaveTelemetry());

      act(() => {
        result.current.recordSaveAttempt(true, 100);
      });

      const beforeReset = Date.now();

      act(() => {
        result.current.reset();
      });

      const afterReset = Date.now();
      const stats = result.current.getStats();

      expect(stats.firstSaveAt).toBeGreaterThanOrEqual(beforeReset);
      expect(stats.firstSaveAt).toBeLessThanOrEqual(afterReset);
    });

    it('should persist reset to localStorage', () => {
      const { result } = renderHook(() => useAutoSaveTelemetry());

      act(() => {
        result.current.recordSaveAttempt(true, 100);
      });

      act(() => {
        result.current.reset();
      });

      const stored = localStorageMock.getItem(STORAGE_KEYS.AUTO_SAVE_TELEMETRY);
      expect(stored).not.toBeNull();

      if (stored) {
        const parsed = JSON.parse(stored);
        expect(parsed.totalSaves).toBe(0);
        expect(parsed.totalAttempts).toBe(0);
      }
    });
  });

  describe('computeTelemetryStats helper', () => {
    it('should compute stats correctly', () => {
      const telemetry: AutoSaveTelemetry = {
        totalSaves: 8,
        totalErrors: 2,
        totalAttempts: 10,
        totalDurationMs: 4000,
        lastSaveDurationMs: 500,
        firstSaveAt: Date.now() - 60000,
        lastUpdatedAt: Date.now(),
      };

      const stats = computeTelemetryStats(telemetry);

      expect(stats.successRate).toBe(80);
      expect(stats.avgSaveDurationMs).toBe(500); // 4000 / 8
    });

    it('should handle zero attempts', () => {
      const telemetry: AutoSaveTelemetry = {
        totalSaves: 0,
        totalErrors: 0,
        totalAttempts: 0,
        totalDurationMs: 0,
        lastSaveDurationMs: 0,
        firstSaveAt: Date.now(),
        lastUpdatedAt: Date.now(),
      };

      const stats = computeTelemetryStats(telemetry);

      expect(stats.successRate).toBe(0);
      expect(stats.avgSaveDurationMs).toBe(0);
    });
  });
});
