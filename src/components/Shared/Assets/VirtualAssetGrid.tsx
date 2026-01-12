/**
 * VirtualAssetGrid Component
 *
 * Virtualized grid for displaying large collections of assets efficiently.
 * Uses @tanstack/react-virtual for windowing to handle 100+ items smoothly.
 *
 * @module components/Shared/Assets/VirtualAssetGrid
 */

import { type KeyboardEvent, useRef } from 'react';
import { useVirtualAssetGrid } from '@/hooks/assets/useVirtualAssetGrid.js';
import styles from '@/styles/components/shared/VirtualAssetGrid.module.css';
import { TAG_TYPE_ICONS } from '@/ts/services/upload/constants.js';
import { getTypeFromTags } from '@/ts/services/upload/tagUtils.js';
import type { AssetWithUrl } from '@/ts/services/upload/types.js';
import { cn } from '@/ts/utils/classNames.js';

// ============================================================================
// Types
// ============================================================================

export interface VirtualAssetGridProps {
  /** Assets to display */
  assets: AssetWithUrl[];
  /** Currently selected asset IDs */
  selectedIds: Set<string>;
  /** Called when selection changes */
  onSelectionChange: (ids: Set<string>) => void;
  /** Called when an asset is clicked (single select or preview) */
  onAssetClick?: (asset: AssetWithUrl) => void;
  /** Called when an asset is double-clicked (apply in selection mode) */
  onAssetDoubleClick?: (asset: AssetWithUrl) => void;
  /** Enable multi-select mode */
  multiSelect?: boolean;
  /** Show selection checkboxes */
  showCheckboxes?: boolean;
  /** Loading state */
  isLoading?: boolean;
  /** Empty state message */
  emptyMessage?: string;
  /** Empty state subtext */
  emptySubtext?: string;
  /** Additional CSS class */
  className?: string;
}

// ============================================================================
// Sub-components
// ============================================================================

interface AssetGridItemProps {
  asset: AssetWithUrl;
  isSelected: boolean;
  showCheckbox: boolean;
  onSelect: (shiftKey: boolean, ctrlKey: boolean) => void;
  onDoubleClick?: () => void;
  onCheckboxChange: (checked: boolean) => void;
}

function AssetGridItem({
  asset,
  isSelected,
  showCheckbox,
  onSelect,
  onDoubleClick,
  onCheckboxChange,
}: AssetGridItemProps) {
  const assetType = getTypeFromTags(asset.tags);
  const typeIcon = assetType ? TAG_TYPE_ICONS[assetType] : null;
  const isStarred = asset.tags.includes('starred');

  const handleClick = (e: React.MouseEvent) => {
    onSelect(e.shiftKey, e.ctrlKey || e.metaKey);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(e.shiftKey, e.ctrlKey || e.metaKey);
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onCheckboxChange(e.target.checked);
  };

  return (
    <button
      type="button"
      className={cn(styles.itemWrapper, isSelected && styles.selected)}
      onClick={handleClick}
      onDoubleClick={onDoubleClick}
      onKeyDown={handleKeyDown}
      aria-pressed={isSelected}
      title={asset.metadata?.filename ?? asset.id}
    >
      <div className={styles.thumbnail}>
        {showCheckbox && (
          <div className={styles.selectionOverlay}>
            <input
              type="checkbox"
              className={styles.selectionCheckbox}
              checked={isSelected}
              onChange={handleCheckboxChange}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Select ${asset.metadata?.filename ?? 'asset'}`}
            />
          </div>
        )}
        {isStarred && <span className={styles.starIndicator}>⭐</span>}
        <img
          src={asset.thumbnailUrl ?? asset.url}
          alt={asset.metadata?.filename ?? 'Asset'}
          className={styles.thumbnailImage}
          loading="lazy"
        />
        {typeIcon && <span className={styles.typeBadge}>{typeIcon}</span>}
      </div>
      <span className={cn(styles.assetName, !asset.metadata?.filename && styles.muted)}>
        {asset.metadata?.filename ?? 'Untitled'}
      </span>
    </button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function VirtualAssetGrid({
  assets,
  selectedIds,
  onSelectionChange,
  onAssetClick,
  onAssetDoubleClick,
  multiSelect = false,
  showCheckboxes = false,
  isLoading = false,
  emptyMessage = 'No assets found',
  emptySubtext,
  className,
}: VirtualAssetGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastSelectedIndex = useRef<number | null>(null);

  const { rowVirtualizer, columnCount, getRowItems, totalHeight } = useVirtualAssetGrid({
    items: assets,
    containerRef,
    itemWidth: 80,
    itemHeight: 90,
    gap: 8,
  });

  // Handle selection with shift/ctrl modifiers
  const handleSelect = (index: number, shiftKey: boolean, ctrlKey: boolean) => {
    const asset = assets[index];
    if (!asset) return;

    // Notify parent of click
    onAssetClick?.(asset);

    if (!multiSelect) {
      // Single select mode
      onSelectionChange(new Set([asset.id]));
      lastSelectedIndex.current = index;
      return;
    }

    const newSelection = new Set(selectedIds);

    if (shiftKey && lastSelectedIndex.current !== null) {
      // Range selection
      const start = Math.min(lastSelectedIndex.current, index);
      const end = Math.max(lastSelectedIndex.current, index);
      for (let i = start; i <= end; i++) {
        const rangeAsset = assets[i];
        if (rangeAsset) {
          newSelection.add(rangeAsset.id);
        }
      }
    } else if (ctrlKey) {
      // Toggle selection
      if (newSelection.has(asset.id)) {
        newSelection.delete(asset.id);
      } else {
        newSelection.add(asset.id);
      }
      lastSelectedIndex.current = index;
    } else {
      // Single select (clear others in multi-select mode)
      newSelection.clear();
      newSelection.add(asset.id);
      lastSelectedIndex.current = index;
    }

    onSelectionChange(newSelection);
  };

  // Handle checkbox toggle
  const handleCheckboxChange = (index: number, checked: boolean) => {
    const asset = assets[index];
    if (!asset) return;

    const newSelection = new Set(selectedIds);
    if (checked) {
      newSelection.add(asset.id);
    } else {
      newSelection.delete(asset.id);
    }
    onSelectionChange(newSelection);
    lastSelectedIndex.current = index;
  };

  // Handle double-click
  const handleDoubleClick = (asset: AssetWithUrl) => {
    onAssetDoubleClick?.(asset);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={cn(styles.container, className)}>
        <div className={styles.loadingState}>
          <div className={styles.loadingSpinner} />
        </div>
      </div>
    );
  }

  // Empty state
  if (assets.length === 0) {
    return (
      <div className={cn(styles.container, className)}>
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>📂</span>
          <span className={styles.emptyText}>{emptyMessage}</span>
          {emptySubtext && <span className={styles.emptySubtext}>{emptySubtext}</span>}
        </div>
      </div>
    );
  }

  const virtualRows = rowVirtualizer.getVirtualItems();

  return (
    <div ref={containerRef} className={cn(styles.container, className)}>
      <div className={styles.virtualContent} style={{ height: `${totalHeight}px` }}>
        {virtualRows.map((virtualRow) => {
          const rowItems = getRowItems(virtualRow.index);
          return (
            <div
              key={virtualRow.key}
              className={styles.row}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {rowItems.map(({ item, index }) => (
                <AssetGridItem
                  key={item.id}
                  asset={item}
                  isSelected={selectedIds.has(item.id)}
                  showCheckbox={showCheckboxes}
                  onSelect={(shiftKey, ctrlKey) => handleSelect(index, shiftKey, ctrlKey)}
                  onDoubleClick={() => handleDoubleClick(item)}
                  onCheckboxChange={(checked) => handleCheckboxChange(index, checked)}
                />
              ))}
              {/* Fill empty cells for consistent layout */}
              {Array.from({ length: columnCount - rowItems.length }).map((_, col) => (
                <div
                  key={`${virtualRow.key}-empty-${col}`}
                  className={styles.itemWrapper}
                  style={{ visibility: 'hidden' }}
                  aria-hidden="true"
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
