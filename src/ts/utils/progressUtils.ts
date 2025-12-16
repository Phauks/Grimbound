/**
 * Blood on the Clocktower Token Generator
 * Progress Tracking Utilities
 */

/**
 * Progress callback function type
 */
export type ProgressCallback = (current: number, total: number) => void;

/**
 * Progress state for tracking async operations
 */
export interface ProgressState {
  processed: number;
  total: number;
  callback: ProgressCallback | null;
}

/**
 * Create a new progress state
 * @param total - Total number of items to process
 * @param callback - Optional progress callback
 * @returns Progress state object
 */
export function createProgressState(
  total: number,
  callback: ProgressCallback | null = null
): ProgressState {
  return {
    processed: 0,
    total,
    callback,
  };
}

/**
 * Update progress and call callback if provided
 * @param state - Progress state object
 */
export function updateProgress(state: ProgressState): void {
  state.processed++;
  if (state.callback) {
    state.callback(state.processed, state.total);
  }
}

/**
 * Reset progress state
 * @param state - Progress state object
 * @param newTotal - New total (optional, keeps current if not provided)
 */
export function resetProgress(state: ProgressState, newTotal?: number): void {
  state.processed = 0;
  if (newTotal !== undefined) {
    state.total = newTotal;
  }
}

/**
 * Get progress percentage
 * @param state - Progress state object
 * @returns Progress as percentage (0-100)
 */
export function getProgressPercentage(state: ProgressState): number {
  if (state.total === 0) return 100;
  return Math.round((state.processed / state.total) * 100);
}

export default {
  createProgressState,
  updateProgress,
  resetProgress,
  getProgressPercentage,
};
