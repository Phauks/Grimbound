/**
 * QuickFilterBar Component
 *
 * Compact filter bar for the Asset Manager with search,
 * starred/recent toggles, and clear filters button.
 * Type filtering is handled by the left sidebar.
 *
 * @module components/Shared/Assets/QuickFilterBar
 */

import styles from '@/styles/components/shared/QuickFilterBar.module.css';
import { cn } from '@/ts/utils/classNames.js';

// ============================================================================
// Types
// ============================================================================

export interface QuickFilterBarProps {
  /** Current search query */
  searchQuery: string;
  /** Called when search query changes */
  onSearchChange: (query: string) => void;
  /** Whether starred filter is active */
  showStarred?: boolean;
  /** Whether recent filter is active */
  showRecent?: boolean;
  /** Toggle starred filter */
  onToggleStarred?: () => void;
  /** Toggle recent filter */
  onToggleRecent?: () => void;
  /** Number of results currently shown */
  resultCount?: number;
  /** Total number of assets */
  totalCount?: number;
  /** Called when clear all filters is clicked */
  onClearFilters?: () => void;
  /** Called when upload button is clicked */
  onUploadClick?: () => void;
  /** Whether to show the upload button */
  showUploadButton?: boolean;
  /** Current tile scale (0.5 to 2) */
  tileScale?: number;
  /** Called when tile scale changes */
  onTileScaleChange?: (scale: number) => void;
  /** Additional CSS class */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function QuickFilterBar({
  searchQuery,
  onSearchChange,
  showStarred = false,
  showRecent = false,
  onToggleStarred,
  onToggleRecent,
  resultCount,
  totalCount,
  onClearFilters,
  onUploadClick,
  showUploadButton = true,
  tileScale = 1,
  onTileScaleChange,
  className,
}: QuickFilterBarProps) {
  const handleClearSearch = () => {
    onSearchChange('');
  };

  // Check if any filters are active
  const hasActiveFilters = searchQuery || showStarred || showRecent;

  return (
    <div className={cn(styles.container, className)}>
      {/* Left side: Buttons */}
      <div className={styles.leftControls}>
        {/* Upload button */}
        {showUploadButton && onUploadClick && (
          <button type="button" className={styles.uploadButton} onClick={onUploadClick}>
            + Upload
          </button>
        )}

        {/* Quick filter pills */}
        {onToggleStarred && (
          <button
            type="button"
            className={cn(styles.filterPill, showStarred && styles.active)}
            onClick={onToggleStarred}
            aria-pressed={showStarred}
          >
            <span className={styles.filterPillIcon}>⭐</span>
            Starred
          </button>
        )}
        {onToggleRecent && (
          <button
            type="button"
            className={cn(styles.filterPill, showRecent && styles.active)}
            onClick={onToggleRecent}
            aria-pressed={showRecent}
          >
            <span className={styles.filterPillIcon}>🕐</span>
            Recent
          </button>
        )}

        {/* Clear filters */}
        {onClearFilters && hasActiveFilters && (
          <button
            type="button"
            className={styles.clearButton}
            onClick={onClearFilters}
            title="Clear all filters"
          >
            Clear
          </button>
        )}
      </div>

      <div className={styles.spacer} />

      {/* Right side: Results, Scale, Search */}
      <div className={styles.rightControls}>
        {/* Results count */}
        {resultCount !== undefined && (
          <span className={styles.resultsCount}>
            {resultCount}
            {totalCount !== undefined && ` / ${totalCount}`}
          </span>
        )}

        {/* Scale slider */}
        {onTileScaleChange && (
          <div className={styles.scaleControl}>
            <span className={styles.scaleIcon}>🔍</span>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={tileScale}
              onChange={(e) => onTileScaleChange(Number(e.target.value))}
              className={styles.scaleSlider}
              aria-label="Tile size"
              title={`Scale: ${Math.round(tileScale * 100)}%`}
            />
          </div>
        )}

        {/* Search input */}
        <div className={styles.searchWrapper}>
          <input
            type="text"
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
            aria-label="Search"
          />
          {searchQuery && (
            <button
              type="button"
              className={styles.searchClear}
              onClick={handleClearSearch}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
