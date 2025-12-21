/**
 * Auto-Save Telemetry Hook
 *
 * Privacy-friendly telemetry tracking for auto-save operations.
 * Stores metrics locally in localStorage - never sent externally.
 *
 * @module hooks/autosave/useAutoSaveTelemetry
 */

import { useCallback, useRef } from 'react';
import { logger } from '@/ts/utils/index.js';

// ============================================================================
// Constants
// ============================================================================

const TELEMETRY_STORAGE_KEY = 'botc-autosave-telemetry';

// ============================================================================
// Types
// ============================================================================

/**
 * Auto-save telemetry metrics (privacy-friendly, stored locally)
 */
export interface AutoSaveTelemetry {
  totalSaves: number; // Successful saves
  totalErrors: number; // Failed saves
  totalAttempts: number; // Total attempts (saves + errors)
  totalDurationMs: number; // Sum of all save durations
  lastSaveDurationMs: number; // Duration of most recent save
  firstSaveAt: number; // Timestamp of first save (session start)
  lastUpdatedAt: number; // Last metrics update
}

/**
 * Computed telemetry stats (includes derived values)
 */
export interface AutoSaveTelemetryStats extends AutoSaveTelemetry {
  successRate: number; // Percentage of successful saves
  avgSaveDurationMs: number; // Average save duration
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Load telemetry from localStorage
 */
function loadTelemetry(): AutoSaveTelemetry {
  try {
    const stored = localStorage.getItem(TELEMETRY_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    logger.warn('AutoSaveTelemetry', 'Failed to load telemetry from localStorage', { error });
  }

  // Return default telemetry
  return {
    totalSaves: 0,
    totalErrors: 0,
    totalAttempts: 0,
    totalDurationMs: 0,
    lastSaveDurationMs: 0,
    firstSaveAt: Date.now(),
    lastUpdatedAt: Date.now(),
  };
}

/**
 * Save telemetry to localStorage
 */
function saveTelemetry(telemetry: AutoSaveTelemetry): void {
  try {
    localStorage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify(telemetry));
  } catch (error) {
    logger.warn('AutoSaveTelemetry', 'Failed to save telemetry to localStorage', { error });
  }
}

/**
 * Get computed telemetry stats (includes derived values)
 */
export function computeTelemetryStats(telemetry: AutoSaveTelemetry): AutoSaveTelemetryStats {
  const successRate =
    telemetry.totalAttempts > 0 ? (telemetry.totalSaves / telemetry.totalAttempts) * 100 : 0;

  const avgSaveDurationMs =
    telemetry.totalSaves > 0 ? telemetry.totalDurationMs / telemetry.totalSaves : 0;

  return {
    ...telemetry,
    successRate,
    avgSaveDurationMs,
  };
}

// ============================================================================
// Hook
// ============================================================================

export interface UseAutoSaveTelemetryReturn {
  /** Record a save attempt (success or failure) */
  recordSaveAttempt: (success: boolean, durationMs: number) => void;
  /** Get current telemetry stats */
  getStats: () => AutoSaveTelemetryStats;
  /** Reset all telemetry data */
  reset: () => void;
}

/**
 * Hook for tracking auto-save telemetry
 *
 * @example
 * ```tsx
 * const { recordSaveAttempt, getStats } = useAutoSaveTelemetry();
 *
 * // After a save operation:
 * const startTime = performance.now();
 * try {
 *   await saveProject();
 *   recordSaveAttempt(true, performance.now() - startTime);
 * } catch (error) {
 *   recordSaveAttempt(false, performance.now() - startTime);
 * }
 *
 * // Get stats for logging:
 * console.log(getStats()); // { totalSaves: 5, successRate: 100, ... }
 * ```
 */
export function useAutoSaveTelemetry(): UseAutoSaveTelemetryReturn {
  // Load telemetry once on mount
  const telemetryRef = useRef<AutoSaveTelemetry>(loadTelemetry());

  const recordSaveAttempt = useCallback((success: boolean, durationMs: number) => {
    const current = telemetryRef.current;

    const updated: AutoSaveTelemetry = {
      ...current,
      totalAttempts: current.totalAttempts + 1,
      lastSaveDurationMs: durationMs,
      lastUpdatedAt: Date.now(),
    };

    if (success) {
      updated.totalSaves = current.totalSaves + 1;
      updated.totalDurationMs = current.totalDurationMs + durationMs;
    } else {
      updated.totalErrors = current.totalErrors + 1;
    }

    telemetryRef.current = updated;
    saveTelemetry(updated);
  }, []);

  const getStats = useCallback((): AutoSaveTelemetryStats => {
    return computeTelemetryStats(telemetryRef.current);
  }, []);

  const reset = useCallback(() => {
    const fresh: AutoSaveTelemetry = {
      totalSaves: 0,
      totalErrors: 0,
      totalAttempts: 0,
      totalDurationMs: 0,
      lastSaveDurationMs: 0,
      firstSaveAt: Date.now(),
      lastUpdatedAt: Date.now(),
    };
    telemetryRef.current = fresh;
    saveTelemetry(fresh);
    logger.info('AutoSaveTelemetry', 'Telemetry reset');
  }, []);

  return {
    recordSaveAttempt,
    getStats,
    reset,
  };
}

export default useAutoSaveTelemetry;
