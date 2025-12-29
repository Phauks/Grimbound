/**
 * FontSelectionColumn Component
 *
 * Column 1 of FontDrawer: Font family selection with search,
 * source/category filtering, and list/grid view toggle.
 *
 * @module components/Shared/Selectors/FontSettings/FontSelectionColumn
 */

import { memo } from 'react';
import type { SourceTab, ViewMode } from '@/hooks/fonts/useFontFiltering';
import styles from '@/styles/components/shared/FontDrawer.module.css';
import type { FontCategory, FontDefinition } from '@/ts/types/fonts.js';
import { FontGridItem, FontListItem } from './FontItem';

// ============================================================================
// Constants
// ============================================================================

const SOURCE_TAB_LABELS: Record<SourceTab, string> = {
  all: 'All',
  builtin: 'Built-in',
  google: 'Google',
  custom: 'My Fonts',
};

const CATEGORY_LABELS: Record<FontCategory, string> = {
  Display: 'Display',
  'Sans Serif': 'Sans',
  Serif: 'Serif',
  Script: 'Script',
  Monospace: 'Mono',
  Custom: 'Custom',
};

const SOURCE_TABS: SourceTab[] = ['all', 'builtin', 'google', 'custom'];

// ============================================================================
// Types
// ============================================================================

export interface FontSelectionColumnProps {
  /** Current search query */
  searchQuery: string;
  /** Update search query */
  onSearchChange: (query: string) => void;
  /** Active source tab filter */
  activeSource: SourceTab;
  /** Update source filter */
  onSourceChange: (source: SourceTab) => void;
  /** Set of active category filters */
  activeCategories: Set<FontCategory>;
  /** Toggle a category filter */
  onCategoryToggle: (category: FontCategory) => void;
  /** Available categories for filter chips */
  availableCategories: FontCategory[];
  /** Current view mode */
  viewMode: ViewMode;
  /** Update view mode */
  onViewModeChange: (mode: ViewMode) => void;
  /** Filtered fonts to display */
  filteredFonts: FontDefinition[];
  /** Fonts grouped by category (for list view) */
  groupedFonts: Map<FontCategory, FontDefinition[]>;
  /** Currently selected font family */
  selectedFontFamily: string;
  /** Set of fonts currently loading */
  loadingFonts: Set<string>;
  /** Whether fonts are loading from context */
  isLoading: boolean;
  /** Whether an upload is in progress */
  isUploading: boolean;
  /** Handle font selection */
  onFontSelect: (font: FontDefinition) => void;
  /** Handle font hover for preloading */
  onFontHover: (font: FontDefinition) => void;
  /** Handle file upload */
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Ref for file input */
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

// ============================================================================
// Component
// ============================================================================

export const FontSelectionColumn = memo(function FontSelectionColumn({
  searchQuery,
  onSearchChange,
  activeSource,
  onSourceChange,
  activeCategories,
  onCategoryToggle,
  availableCategories,
  viewMode,
  onViewModeChange,
  filteredFonts,
  groupedFonts,
  selectedFontFamily,
  loadingFonts,
  isLoading,
  isUploading,
  onFontSelect,
  onFontHover,
  onUpload,
  fileInputRef,
}: FontSelectionColumnProps) {
  return (
    <div className={`${styles.column} ${styles.fontSelectionColumn}`}>
      <div className={styles.sectionHeader}>Font Family</div>

      {/* Search Input */}
      <div className={styles.searchContainer}>
        <input
          type="search"
          className={styles.searchInput}
          placeholder="Search fonts..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          data-font-search
          aria-label="Search fonts"
        />
      </div>

      {/* Source Tabs */}
      <div className={styles.sourceTabs}>
        {SOURCE_TABS.map((source) => (
          <button
            key={source}
            type="button"
            className={`${styles.sourceTab} ${activeSource === source ? styles.sourceTabActive : ''}`}
            onClick={() => onSourceChange(source)}
          >
            {SOURCE_TAB_LABELS[source]}
          </button>
        ))}
      </div>

      {/* Category Filter Chips */}
      <div className={styles.categoryFilters}>
        {availableCategories.map((category) => (
          <button
            key={category}
            type="button"
            className={`${styles.categoryChip} ${activeCategories.has(category) ? styles.categoryChipActive : ''}`}
            onClick={() => onCategoryToggle(category)}
          >
            {CATEGORY_LABELS[category] || category}
          </button>
        ))}
      </div>

      {/* View Toggle and Count */}
      <div className={styles.viewToggle}>
        <span className={styles.fontCount}>{filteredFonts.length} fonts</span>
        <div className={styles.viewToggleButtons}>
          <button
            type="button"
            className={`${styles.viewToggleButton} ${viewMode === 'list' ? styles.viewToggleButtonActive : ''}`}
            onClick={() => onViewModeChange('list')}
            title="List view"
          >
            ☰
          </button>
          <button
            type="button"
            className={`${styles.viewToggleButton} ${viewMode === 'grid' ? styles.viewToggleButtonActive : ''}`}
            onClick={() => onViewModeChange('grid')}
            title="Grid view"
          >
            ⊞
          </button>
        </div>
      </div>

      {/* Upload Section - Only for My Fonts tab */}
      {activeSource === 'custom' && (
        <div className={styles.uploadSection} style={{ marginTop: 0, marginBottom: '0.5rem' }}>
          <label className={styles.uploadButton}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".ttf,.otf,.woff,.woff2"
              onChange={onUpload}
              disabled={isUploading}
              hidden
            />
            {isUploading ? 'Uploading...' : '+ Upload Font'}
          </label>
        </div>
      )}

      {/* Font List/Grid */}
      <div className={styles.fontListContainer}>
        {isLoading ? (
          <div className={styles.loadingState}>Loading fonts...</div>
        ) : filteredFonts.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyStateIcon}>🔤</span>
            <span className={styles.emptyStateText}>
              {searchQuery
                ? 'No fonts match your search'
                : activeSource === 'custom'
                  ? 'No custom fonts yet'
                  : 'No fonts available'}
            </span>
          </div>
        ) : viewMode === 'list' ? (
          <div className={styles.fontList}>
            {Array.from(groupedFonts.entries()).map(([category, categoryFonts]) => (
              <div key={category}>
                <div className={styles.categoryHeader}>{category}</div>
                {categoryFonts.map((font) => (
                  <FontListItem
                    key={font.id}
                    font={font}
                    isSelected={font.family === selectedFontFamily}
                    isLoading={loadingFonts.has(font.family)}
                    onSelect={onFontSelect}
                    onHover={onFontHover}
                  />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.fontGrid}>
            {filteredFonts.map((font) => (
              <FontGridItem
                key={font.id}
                font={font}
                isSelected={font.family === selectedFontFamily}
                isLoading={loadingFonts.has(font.family)}
                onSelect={onFontSelect}
                onHover={onFontHover}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default FontSelectionColumn;
