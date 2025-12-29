/**
 * FontItem Components
 *
 * Reusable font item renderers for list and grid views.
 * Handles font preview styling, loading states, and selection.
 *
 * @module components/Shared/Selectors/FontSettings/FontItem
 */

import { memo } from 'react';
import styles from '@/styles/components/shared/FontDrawer.module.css';
import type { FontDefinition } from '@/ts/types/fonts.js';

// ============================================================================
// Types
// ============================================================================

export interface FontItemProps {
  /** Font definition to display */
  font: FontDefinition;
  /** Whether this font is currently selected */
  isSelected: boolean;
  /** Whether the font is currently being loaded */
  isLoading: boolean;
  /** Called when font is clicked */
  onSelect: (font: FontDefinition) => void;
  /** Called when font is hovered (for preloading) */
  onHover: (font: FontDefinition) => void;
}

// ============================================================================
// FontListItem Component
// ============================================================================

export const FontListItem = memo(function FontListItem({
  font,
  isSelected,
  isLoading,
  onSelect,
  onHover,
}: FontItemProps) {
  const showFontPreview = font.status === 'loaded' && !isLoading;

  return (
    <button
      type="button"
      className={`${styles.fontListItem} ${isSelected ? styles.fontListItemSelected : ''}`}
      onClick={() => onSelect(font)}
      onMouseEnter={() => onHover(font)}
    >
      <span
        className={styles.fontListPreview}
        style={{ fontFamily: showFontPreview ? font.family : 'inherit' }}
      >
        {isLoading ? '...' : 'Aa'}
      </span>
      <div className={styles.fontListInfo}>
        <span className={styles.fontListName}>{font.name}</span>
        <div className={styles.fontListMeta}>
          {font.source === 'google' && <span className={styles.fontListBadge}>G</span>}
          {font.source === 'custom' && <span className={styles.fontListBadge}>Custom</span>}
        </div>
      </div>
      {isSelected && <span className={styles.fontListCheck}>✓</span>}
    </button>
  );
});

// ============================================================================
// FontGridItem Component
// ============================================================================

export const FontGridItem = memo(function FontGridItem({
  font,
  isSelected,
  isLoading,
  onSelect,
  onHover,
}: FontItemProps) {
  const showFontPreview = font.status === 'loaded' && !isLoading;

  return (
    <button
      type="button"
      className={`${styles.fontGridItem} ${isSelected ? styles.fontGridItemSelected : ''}`}
      onClick={() => onSelect(font)}
      onMouseEnter={() => onHover(font)}
    >
      <span
        className={styles.fontGridPreview}
        style={{ fontFamily: showFontPreview ? font.family : 'inherit' }}
      >
        {isLoading ? '...' : 'Aa'}
      </span>
      <span className={styles.fontGridName}>{font.name}</span>
    </button>
  );
});
