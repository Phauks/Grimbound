/**
 * useFontOptions Hook
 *
 * Provides font options from the FontContext in the format expected
 * by existing UI components (FontSettingsSelector, FontPreviewSelector).
 *
 * @module hooks/fonts/useFontOptions
 */

import { useFonts } from '@/contexts/FontContext';
import type { FontCategory } from '@/ts/types/fonts.js';

// ============================================================================
// Types
// ============================================================================

export interface FontOption {
  /** Font family value (as used in CSS/canvas) */
  value: string;
  /** Display label for the font */
  label: string;
  /** Category for grouping */
  category?: string;
}

export interface UseFontOptionsResult {
  /** All available fonts as options */
  allFonts: FontOption[];
  /** Display fonts (Dumbledor family + custom display fonts) */
  displayFonts: FontOption[];
  /** Sans-serif fonts (Trade Gothic + custom sans-serif) */
  sansSerifFonts: FontOption[];
  /** Serif fonts */
  serifFonts: FontOption[];
  /** Script/decorative fonts */
  scriptFonts: FontOption[];
  /** Custom user-uploaded fonts only */
  customFonts: FontOption[];
  /** Whether fonts are still loading */
  isLoading: boolean;
  /** Get fonts filtered by categories */
  getFontsByCategory: (...categories: FontCategory[]) => FontOption[];
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to get font options for UI selectors
 *
 * @returns Font options organized by category
 */
export function useFontOptions(): UseFontOptionsResult {
  const { fonts, isLoading } = useFonts();

  // Convert fonts to FontOption format
  const allFonts: FontOption[] = fonts.map((font) => ({
    value: font.family,
    label: font.name,
    category: font.category,
  }));

  // Filter by category
  const displayFonts = allFonts.filter((f) => f.category === 'Display');
  const sansSerifFonts = allFonts.filter((f) => f.category === 'Sans Serif');
  const serifFonts = allFonts.filter((f) => f.category === 'Serif');
  const scriptFonts = allFonts.filter((f) => f.category === 'Script');
  const customFonts = allFonts.filter((f) => f.category === 'Custom');

  // Helper to get fonts by multiple categories
  const getFontsByCategory = (...categories: FontCategory[]): FontOption[] => {
    if (categories.length === 0) return allFonts;
    return allFonts.filter((f) => categories.includes(f.category as FontCategory));
  };

  return {
    allFonts,
    displayFonts,
    sansSerifFonts,
    serifFonts,
    scriptFonts,
    customFonts,
    isLoading,
    getFontsByCategory,
  };
}

// ============================================================================
// Specialized Hooks for Common Use Cases
// ============================================================================

/**
 * Hook for character name font options
 * Returns Display fonts + Custom fonts
 */
export function useCharacterNameFontOptions(): FontOption[] {
  const { displayFonts, customFonts } = useFontOptions();
  return [...displayFonts, ...customFonts];
}

/**
 * Hook for ability text font options
 * Returns Sans Serif fonts + Custom fonts
 */
export function useAbilityTextFontOptions(): FontOption[] {
  const { sansSerifFonts, customFonts } = useFontOptions();
  return [...sansSerifFonts, ...customFonts];
}

/**
 * Hook for reminder text font options
 * Returns Sans Serif fonts + Custom fonts
 */
export function useReminderTextFontOptions(): FontOption[] {
  const { sansSerifFonts, customFonts } = useFontOptions();
  return [...sansSerifFonts, ...customFonts];
}

/**
 * Hook for meta token font options
 * Returns Display fonts + Custom fonts
 */
export function useMetaFontOptions(): FontOption[] {
  const { displayFonts, customFonts } = useFontOptions();
  return [...displayFonts, ...customFonts];
}
