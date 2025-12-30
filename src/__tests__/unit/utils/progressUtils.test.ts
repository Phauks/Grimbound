import { describe, expect, it, vi } from 'vitest';
import {
  createProgressState,
  getProgressPercentage,
  type ProgressCallback,
  resetProgress,
  updateProgress,
} from '@/ts/utils/progressUtils';

describe('progressUtils', () => {
  describe('createProgressState', () => {
    it('should create state with zero processed', () => {
      const state = createProgressState(10);
      expect(state.processed).toBe(0);
    });

    it('should set total from parameter', () => {
      const state = createProgressState(25);
      expect(state.total).toBe(25);
    });

    it('should set callback to null by default', () => {
      const state = createProgressState(10);
      expect(state.callback).toBeNull();
    });

    it('should accept custom callback', () => {
      const callback: ProgressCallback = vi.fn();
      const state = createProgressState(10, callback);
      expect(state.callback).toBe(callback);
    });

    it('should handle zero total', () => {
      const state = createProgressState(0);
      expect(state.total).toBe(0);
      expect(state.processed).toBe(0);
    });
  });

  describe('updateProgress', () => {
    it('should increment processed count', () => {
      const state = createProgressState(10);
      updateProgress(state);
      expect(state.processed).toBe(1);
    });

    it('should increment multiple times', () => {
      const state = createProgressState(10);
      updateProgress(state);
      updateProgress(state);
      updateProgress(state);
      expect(state.processed).toBe(3);
    });

    it('should call callback with current and total', () => {
      const callback = vi.fn();
      const state = createProgressState(10, callback);

      updateProgress(state);

      expect(callback).toHaveBeenCalledWith(1, 10);
    });

    it('should call callback with updated values each time', () => {
      const callback = vi.fn();
      const state = createProgressState(5, callback);

      updateProgress(state);
      updateProgress(state);
      updateProgress(state);

      expect(callback).toHaveBeenCalledTimes(3);
      expect(callback).toHaveBeenNthCalledWith(1, 1, 5);
      expect(callback).toHaveBeenNthCalledWith(2, 2, 5);
      expect(callback).toHaveBeenNthCalledWith(3, 3, 5);
    });

    it('should not throw if callback is null', () => {
      const state = createProgressState(10);
      expect(() => updateProgress(state)).not.toThrow();
    });

    it('should allow processed to exceed total', () => {
      const state = createProgressState(2);
      updateProgress(state);
      updateProgress(state);
      updateProgress(state);
      expect(state.processed).toBe(3);
    });
  });

  describe('resetProgress', () => {
    it('should reset processed to zero', () => {
      const state = createProgressState(10);
      state.processed = 5;

      resetProgress(state);

      expect(state.processed).toBe(0);
    });

    it('should keep total if not provided', () => {
      const state = createProgressState(10);
      state.processed = 5;

      resetProgress(state);

      expect(state.total).toBe(10);
    });

    it('should update total if provided', () => {
      const state = createProgressState(10);
      state.processed = 5;

      resetProgress(state, 20);

      expect(state.processed).toBe(0);
      expect(state.total).toBe(20);
    });

    it('should handle zero new total', () => {
      const state = createProgressState(10);

      resetProgress(state, 0);

      expect(state.total).toBe(0);
    });

    it('should preserve callback', () => {
      const callback = vi.fn();
      const state = createProgressState(10, callback);

      resetProgress(state, 20);

      expect(state.callback).toBe(callback);
    });
  });

  describe('getProgressPercentage', () => {
    it('should return 0 for no progress', () => {
      const state = createProgressState(10);
      expect(getProgressPercentage(state)).toBe(0);
    });

    it('should return 50 for half progress', () => {
      const state = createProgressState(10);
      state.processed = 5;
      expect(getProgressPercentage(state)).toBe(50);
    });

    it('should return 100 for complete progress', () => {
      const state = createProgressState(10);
      state.processed = 10;
      expect(getProgressPercentage(state)).toBe(100);
    });

    it('should return 100 for zero total', () => {
      const state = createProgressState(0);
      expect(getProgressPercentage(state)).toBe(100);
    });

    it('should round to nearest integer', () => {
      const state = createProgressState(3);
      state.processed = 1;
      expect(getProgressPercentage(state)).toBe(33);
    });

    it('should handle over 100%', () => {
      const state = createProgressState(10);
      state.processed = 15;
      expect(getProgressPercentage(state)).toBe(150);
    });

    it('should handle fractional percentages', () => {
      const state = createProgressState(7);
      state.processed = 3;
      // 3/7 = 42.857... should round to 43
      expect(getProgressPercentage(state)).toBe(43);
    });
  });
});
