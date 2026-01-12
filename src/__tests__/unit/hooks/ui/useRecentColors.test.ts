// src/__tests__/unit/hooks/ui/useRecentColors.test.ts
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRecentColors } from '@/hooks/ui/useRecentColors';
import { STORAGE_KEYS } from '@/ts/utils/storageKeys';

describe('useRecentColors', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should initialize with stored colors synchronously', () => {
    // Pre-populate localStorage
    const storedColors = ['#FF0000', '#00FF00', '#0000FF'];
    localStorage.setItem(STORAGE_KEYS.RECENT_COLORS, JSON.stringify(storedColors));

    const { result } = renderHook(() => useRecentColors());

    // Should have colors immediately (no loading state needed)
    expect(result.current.colors).toEqual(storedColors);
    expect(result.current.isLoaded).toBe(true);
  });

  it('should initialize with empty array when no stored colors', () => {
    const { result } = renderHook(() => useRecentColors());

    expect(result.current.colors).toEqual([]);
    expect(result.current.isLoaded).toBe(true);
  });

  it('should add color to front of list', () => {
    const { result } = renderHook(() => useRecentColors());

    act(() => {
      result.current.addColor('#FF0000');
    });

    expect(result.current.colors[0]).toBe('#FF0000');
  });

  it('should respect maxColors option', () => {
    const { result } = renderHook(() => useRecentColors({ maxColors: 3 }));

    act(() => {
      result.current.addColor('#111111');
      result.current.addColor('#222222');
      result.current.addColor('#333333');
      result.current.addColor('#444444'); // Should push out #111111
    });

    expect(result.current.colors).toHaveLength(3);
    expect(result.current.colors).not.toContain('#111111');
  });

  it('should clear all colors', () => {
    localStorage.setItem(STORAGE_KEYS.RECENT_COLORS, JSON.stringify(['#FF0000']));
    const { result } = renderHook(() => useRecentColors());

    act(() => {
      result.current.clearColors();
    });

    expect(result.current.colors).toEqual([]);
    expect(localStorage.getItem(STORAGE_KEYS.RECENT_COLORS)).toBeNull();
  });
});
