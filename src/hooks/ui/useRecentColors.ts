/**
 * useRecentColors Hook
 *
 * Manages a list of recently used colors with localStorage persistence.
 * Provides methods to add colors and automatically maintains the list size.
 *
 * @module hooks/ui/useRecentColors
 */

import { useCallback, useEffect, useState } from 'react';
import { STORAGE_KEYS } from '@/ts/utils/storageKeys.js';

/** Default maximum number of recent colors to store */
const DEFAULT_MAX_COLORS = 8;

/**
 * Get recent colors from localStorage
 *
 * @returns Array of hex color strings
 */
function getStoredRecentColors(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.RECENT_COLORS);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Add a color to the recent colors list and persist to localStorage
 *
 * @param color - Hex color string to add
 * @param maxColors - Maximum number of colors to store
 * @returns Updated array of recent colors
 */
function addColorToStorage(color: string, maxColors: number): string[] {
  const normalized = color.toUpperCase();
  const recent = getStoredRecentColors().filter((c) => c.toUpperCase() !== normalized);
  recent.unshift(normalized);
  const updated = recent.slice(0, maxColors);

  try {
    localStorage.setItem(STORAGE_KEYS.RECENT_COLORS, JSON.stringify(updated));
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }

  return updated;
}

/**
 * Clear all recent colors from localStorage
 */
function clearStoredRecentColors(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.RECENT_COLORS);
  } catch {
    // Ignore storage errors
  }
}

// ============================================================================
// Hook Interface
// ============================================================================

export interface UseRecentColorsOptions {
  /** Maximum number of recent colors to store (default: 8) */
  maxColors?: number;
}

export interface UseRecentColorsResult {
  /** Array of recent hex color strings */
  colors: string[];
  /** Add a color to the recent list (moves to front if already exists) */
  addColor: (color: string) => void;
  /** Clear all recent colors */
  clearColors: () => void;
  /** Whether the colors have been loaded from storage */
  isLoaded: boolean;
}

/**
 * Hook to manage recently used colors with localStorage persistence
 *
 * @example
 * ```tsx
 * const { colors, addColor } = useRecentColors({ maxColors: 10 });
 *
 * // Add a color when user selects it
 * const handleColorSelect = (color: string) => {
 *   addColor(color);
 *   onChange(color);
 * };
 *
 * // Display recent colors
 * return (
 *   <div>
 *     {colors.map(color => (
 *       <ColorSwatch key={color} color={color} onClick={() => onSelect(color)} />
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useRecentColors(options: UseRecentColorsOptions = {}): UseRecentColorsResult {
  const { maxColors = DEFAULT_MAX_COLORS } = options;

  const [colors, setColors] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load colors from localStorage on mount
  useEffect(() => {
    setColors(getStoredRecentColors());
    setIsLoaded(true);
  }, []);

  // Add a color to the recent list
  const addColor = useCallback(
    (color: string) => {
      const updated = addColorToStorage(color, maxColors);
      setColors(updated);
    },
    [maxColors]
  );

  // Clear all recent colors
  const clearColors = useCallback(() => {
    clearStoredRecentColors();
    setColors([]);
  }, []);

  return {
    colors,
    addColor,
    clearColors,
    isLoaded,
  };
}

// Export storage utilities for advanced use cases
export { getStoredRecentColors as getRecentColors, addColorToStorage as addRecentColor };
