// src/__tests__/unit/hooks/ui/useControlledField.test.ts
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useControlledField } from '@/hooks/ui/useControlledField';

describe('useControlledField', () => {
  describe('initialization', () => {
    it('should initialize with prop value', () => {
      const onChange = vi.fn();
      const { result } = renderHook(() => useControlledField({ value: 'initial', onChange }));

      expect(result.current.localValue).toBe('initial');
      expect(result.current.isDirty).toBe(false);
    });
  });

  describe('debounce behavior', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should call onChange after debounce delay', () => {
      const onChange = vi.fn();
      const { result } = renderHook(
        ({ value }) => useControlledField({ value, onChange, debounceMs: 500 }),
        { initialProps: { value: 'initial' } }
      );

      act(() => {
        result.current.handleChange('modified');
      });

      // Not called yet
      expect(onChange).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(onChange).toHaveBeenCalledWith('modified');
    });

    it('should cancel pending debounce when new change occurs', () => {
      const onChange = vi.fn();
      const { result } = renderHook(
        ({ value }) => useControlledField({ value, onChange, debounceMs: 500 }),
        { initialProps: { value: 'initial' } }
      );

      act(() => {
        result.current.handleChange('first');
      });

      // Advance partially
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // New change before debounce completes
      act(() => {
        result.current.handleChange('second');
      });

      // Complete the full debounce time from second change
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Should only have called onChange once with 'second'
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('second');
    });

    it('should cleanup timer on unmount', () => {
      const onChange = vi.fn();
      const { result, unmount } = renderHook(
        ({ value }) => useControlledField({ value, onChange, debounceMs: 500 }),
        { initialProps: { value: 'initial' } }
      );

      act(() => {
        result.current.handleChange('modified');
      });

      unmount();

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // onChange should NOT be called after unmount
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('blur behavior', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should call onChange immediately on blur with pending changes', () => {
      const onChange = vi.fn();
      const { result } = renderHook(
        ({ value }) => useControlledField({ value, onChange, debounceMs: 500 }),
        { initialProps: { value: 'initial' } }
      );

      // First change
      act(() => {
        result.current.handleChange('modified');
      });

      // Allow state to settle, then blur
      act(() => {
        result.current.handleBlur();
      });

      // Should have been called with the modified value
      expect(onChange).toHaveBeenCalled();
    });

    it('should not commit on blur when disabled', () => {
      const onChange = vi.fn();
      const { result } = renderHook(() =>
        useControlledField({ value: 'initial', onChange, disabled: true })
      );

      act(() => {
        result.current.handleBlur();
      });

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('external prop sync', () => {
    it('should sync from external prop change', () => {
      const onChange = vi.fn();
      const { result, rerender } = renderHook(
        ({ value }) => useControlledField({ value, onChange }),
        { initialProps: { value: 'initial' } }
      );

      // External value changes
      rerender({ value: 'external-update' });

      expect(result.current.localValue).toBe('external-update');
    });

    it('should NOT sync from prop when change originated from this hook', () => {
      const onChange = vi.fn();
      let propValue = 'initial';

      const { result, rerender } = renderHook(
        ({ value }) => useControlledField({ value, onChange }),
        { initialProps: { value: propValue } }
      );

      // User types
      act(() => {
        result.current.handleChange('user-typing');
      });

      // Simulate parent updating prop after onChange callback
      // (this happens when parent re-renders with our value)
      propValue = 'user-typing';
      rerender({ value: propValue });

      // Should still be 'user-typing', not reset
      expect(result.current.localValue).toBe('user-typing');
    });

    it('should use custom equality function', () => {
      const onChange = vi.fn();
      // Custom equality: case-insensitive comparison
      const isEqual = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

      const { result, rerender } = renderHook(
        ({ value }) => useControlledField({ value, onChange, isEqual }),
        { initialProps: { value: 'Hello' } }
      );

      // User types lowercase version
      act(() => {
        result.current.handleChange('hello');
      });

      // Parent sends back uppercase (considered equal by our function)
      rerender({ value: 'HELLO' });

      // Should NOT sync because custom isEqual says they're the same
      expect(result.current.localValue).toBe('hello');
    });
  });

  describe('disabled state', () => {
    it('should not update when disabled', () => {
      const onChange = vi.fn();
      const { result } = renderHook(() =>
        useControlledField({ value: 'initial', onChange, disabled: true })
      );

      act(() => {
        result.current.handleChange('modified');
      });

      expect(result.current.localValue).toBe('initial');
    });
  });

  describe('forceSync', () => {
    it('should force sync from prop value', () => {
      const onChange = vi.fn();
      const { result, rerender } = renderHook(
        ({ value }) => useControlledField({ value, onChange }),
        { initialProps: { value: 'initial' } }
      );

      // User types
      act(() => {
        result.current.handleChange('modified');
      });

      // Update prop to something different
      rerender({ value: 'new-external' });

      // Force sync should reset to prop value
      act(() => {
        result.current.forceSync();
      });

      expect(result.current.localValue).toBe('new-external');
    });
  });
});
