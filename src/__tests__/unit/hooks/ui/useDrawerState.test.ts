// src/__tests__/unit/hooks/ui/useDrawerState.test.ts
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useDrawerState } from '@/hooks/ui/useDrawerState';

describe('useDrawerState', () => {
  it('should sync pendingValue when drawer opens', () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(({ value }) => useDrawerState({ value, onChange }), {
      initialProps: { value: 'initial' },
    });

    // Update value while drawer is closed
    rerender({ value: 'updated' });

    // Open drawer
    act(() => {
      result.current.open();
    });

    // pendingValue should match the updated value
    expect(result.current.pendingValue).toBe('updated');
    expect(result.current.isOpen).toBe(true);
  });

  it('should preserve pending changes while editing', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useDrawerState({ value: 'initial', onChange }));

    // Open drawer
    act(() => {
      result.current.open();
    });

    // Make changes
    act(() => {
      result.current.updatePending('modified');
    });

    // pendingValue should be modified
    expect(result.current.pendingValue).toBe('modified');
    expect(result.current.hasChanges).toBe(true);
  });

  it('should apply changes on close', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useDrawerState({ value: 'initial', onChange }));

    // Open drawer first
    act(() => {
      result.current.open();
    });

    // Update pending value (needs its own act to process state update)
    act(() => {
      result.current.updatePending('modified');
    });

    // Verify pending value was updated
    expect(result.current.pendingValue).toBe('modified');

    // Apply changes (uses the updated pendingValue after rerender)
    act(() => {
      result.current.apply();
    });

    expect(onChange).toHaveBeenCalledWith('modified');
    expect(result.current.isOpen).toBe(false);
  });

  it('should revert on cancel', () => {
    const onChange = vi.fn();
    const onPreviewChange = vi.fn();
    const { result } = renderHook(() =>
      useDrawerState({ value: 'initial', onChange, onPreviewChange })
    );

    act(() => {
      result.current.open();
      result.current.updatePending('modified');
      result.current.cancel();
    });

    // Should revert preview to original
    expect(onPreviewChange).toHaveBeenLastCalledWith('initial');
    expect(result.current.isOpen).toBe(false);
    // onChange should NOT have been called
    expect(onChange).not.toHaveBeenCalled();
  });

  it('should NOT auto-sync pending value when external value changes while open', () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(({ value }) => useDrawerState({ value, onChange }), {
      initialProps: { value: 'initial' },
    });

    // Open drawer and make changes
    act(() => {
      result.current.open();
      result.current.updatePending('user-edit');
    });

    // External value changes
    rerender({ value: 'external-update' });

    // User's pending changes should be preserved
    expect(result.current.pendingValue).toBe('user-edit');
  });

  it('should toggle drawer open and closed', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useDrawerState({ value: 'initial', onChange }));

    // Toggle open
    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(true);

    // Toggle closed (should apply)
    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(false);
    expect(onChange).toHaveBeenCalledWith('initial');
  });

  it('should reset to default value', () => {
    const onChange = vi.fn();
    const onPreviewChange = vi.fn();
    const { result } = renderHook(() =>
      useDrawerState({
        value: 'current',
        onChange,
        onPreviewChange,
        defaultValue: 'default',
      })
    );

    act(() => {
      result.current.open();
      result.current.reset();
    });

    expect(result.current.pendingValue).toBe('default');
    expect(onPreviewChange).toHaveBeenCalledWith('default');
    // Drawer should still be open after reset
    expect(result.current.isOpen).toBe(true);
  });

  it('should not open when disabled', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useDrawerState({ value: 'initial', onChange, disabled: true })
    );

    act(() => {
      result.current.open();
    });

    expect(result.current.isOpen).toBe(false);
  });

  it('should call onWillOpen when opening', () => {
    const onChange = vi.fn();
    const onWillOpen = vi.fn();
    const { result } = renderHook(() => useDrawerState({ value: 'initial', onChange, onWillOpen }));

    act(() => {
      result.current.open();
    });

    expect(onWillOpen).toHaveBeenCalled();
  });

  it('should update a single field with updatePendingField', () => {
    const onChange = vi.fn();
    const onPreviewChange = vi.fn();
    const { result } = renderHook(() =>
      useDrawerState({
        value: { name: 'John', age: 30 },
        onChange,
        onPreviewChange,
      })
    );

    act(() => {
      result.current.open();
      result.current.updatePendingField('name', 'Jane');
    });

    expect(result.current.pendingValue).toEqual({ name: 'Jane', age: 30 });
    expect(onPreviewChange).toHaveBeenCalledWith({ name: 'Jane', age: 30 });
  });
});
