/**
 * useFontFiltering Hook
 *
 * Manages font filtering state and logic for FontSettingsSelector.
 * Handles search, source filtering, category filtering, and view mode.
 *
 * @module hooks/fonts/useFontFiltering
 */

import { useCallback, useMemo, useState } from 'react';
import type { FontCategory, FontDefinition, FontSource } from '@/ts/types/fonts.js';

// ============================================================================
// Types
// ============================================================================

export type SourceTab = FontSource | 'all';
export type ViewMode = 'list' | 'grid';

export interface UseFontFilteringOptions {
  /** All available fonts from FontContext */
  fonts: FontDefinition[];
  /** Restrict to specific sources (from props) */
  allowedSources?: FontSource[];
  /** Restrict to specific categories (from props) */
  allowedCategories?: FontCategory[];
}

export interface UseFontFilteringResult {
  /** Current search query */
  searchQuery: string;
  /** Update search query */
  setSearchQuery: (query: string) => void;
  /** Active source tab filter */
  activeSource: SourceTab;
  /** Update source filter */
  setActiveSource: (source: SourceTab) => void;
  /** Set of active category filters */
  activeCategories: Set<FontCategory>;
  /** Toggle a category filter on/off */
  toggleCategory: (category: FontCategory) => void;
  /** Current view mode (list/grid) */
  viewMode: ViewMode;
  /** Update view mode */
  setViewMode: (mode: ViewMode) => void;
  /** Filtered fonts based on all active filters */
  filteredFonts: FontDefinition[];
  /** Fonts grouped by category for list view */
  groupedFonts: Map<FontCategory, FontDefinition[]>;
  /** Available categories from current fonts */
  availableCategories: FontCategory[];
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useFontFiltering({
  fonts,
  allowedSources,
  allowedCategories,
}: UseFontFilteringOptions): UseFontFilteringResult {
  // Local state for filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSource, setActiveSource] = useState<SourceTab>('all');
  const [activeCategories, setActiveCategories] = useState<Set<FontCategory>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Toggle category filter
  const toggleCategory = useCallback((category: FontCategory) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  // Filter fonts based on all active filters
  const filteredFonts = useMemo(() => {
    let result = fonts;

    // Apply allowed sources from props
    if (allowedSources && allowedSources.length > 0) {
      result = result.filter((f) => allowedSources.includes(f.source));
    }

    // Apply allowed categories from props
    if (allowedCategories && allowedCategories.length > 0) {
      result = result.filter((f) => allowedCategories.includes(f.category));
    }

    // Apply source tab filter
    if (activeSource !== 'all') {
      result = result.filter((f) => f.source === activeSource);
    }

    // Apply category chip filter
    if (activeCategories.size > 0) {
      result = result.filter((f) => activeCategories.has(f.category));
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (f) => f.name.toLowerCase().includes(query) || f.family.toLowerCase().includes(query)
      );
    }

    return result;
  }, [fonts, allowedSources, allowedCategories, activeSource, activeCategories, searchQuery]);

  // Group fonts by category for list view display
  const groupedFonts = useMemo(() => {
    const groups = new Map<FontCategory, FontDefinition[]>();
    for (const font of filteredFonts) {
      const list = groups.get(font.category) ?? [];
      list.push(font);
      groups.set(font.category, list);
    }
    return groups;
  }, [filteredFonts]);

  // Get available categories from all fonts (not filtered)
  const availableCategories = useMemo(() => {
    const categories = new Set<FontCategory>();
    for (const font of fonts) {
      categories.add(font.category);
    }
    return Array.from(categories);
  }, [fonts]);

  return {
    searchQuery,
    setSearchQuery,
    activeSource,
    setActiveSource,
    activeCategories,
    toggleCategory,
    viewMode,
    setViewMode,
    filteredFonts,
    groupedFonts,
    availableCategories,
  };
}

export default useFontFiltering;
