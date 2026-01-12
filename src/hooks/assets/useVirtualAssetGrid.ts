/**
 * useVirtualAssetGrid Hook
 *
 * Provides virtualized grid layout for large asset collections.
 * Uses @tanstack/react-virtual for efficient rendering of large lists.
 *
 * @module hooks/assets/useVirtualAssetGrid
 *
 * @example
 * ```tsx
 * const {
 *   virtualizer,
 *   rowVirtualizer,
 *   getVirtualItems,
 *   getTotalSize,
 *   columnCount,
 *   gridItems,
 * } = useVirtualAssetGrid({
 *   items: assets,
 *   containerRef,
 *   itemWidth: 80,
 *   itemHeight: 100,
 *   gap: 8,
 * });
 * ```
 */

import type { Virtualizer } from '@tanstack/react-virtual';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface UseVirtualAssetGridOptions<T> {
  /** Items to display in the grid */
  items: T[];
  /** Ref to the scrollable container element */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Width of each item including padding (default: 80) */
  itemWidth?: number;
  /** Height of each item including padding (default: 100) */
  itemHeight?: number;
  /** Gap between items (default: 8) */
  gap?: number;
  /** Minimum columns (default: 2) */
  minColumns?: number;
  /** Maximum columns (default: 12) */
  maxColumns?: number;
  /** Overscan rows for smoother scrolling (default: 3) */
  overscan?: number;
}

export interface VirtualGridItem<T> {
  /** Index in the original items array */
  index: number;
  /** The item data */
  item: T;
  /** Row index in the grid */
  row: number;
  /** Column index in the grid */
  column: number;
}

export interface UseVirtualAssetGridReturn<T> {
  /** The row virtualizer instance */
  rowVirtualizer: Virtualizer<HTMLElement, Element>;
  /** Number of columns based on container width */
  columnCount: number;
  /** Get items for a specific row */
  getRowItems: (rowIndex: number) => VirtualGridItem<T>[];
  /** Total number of rows */
  rowCount: number;
  /** Total grid height for the scrollable area */
  totalHeight: number;
  /** Container width for calculations */
  containerWidth: number;
  /** Scroll to a specific item index */
  scrollToItem: (index: number) => void;
}

// ============================================================================
// Hook
// ============================================================================

export function useVirtualAssetGrid<T>({
  items,
  containerRef,
  itemWidth = 80,
  itemHeight = 100,
  gap = 8,
  minColumns = 2,
  maxColumns = 12,
  overscan = 3,
}: UseVirtualAssetGridOptions<T>): UseVirtualAssetGridReturn<T> {
  const [containerWidth, setContainerWidth] = useState(0);

  // Observe container size changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(container);
    // Initial measurement
    setContainerWidth(container.clientWidth);

    return () => {
      resizeObserver.disconnect();
    };
  }, [containerRef]);

  // Calculate column count based on container width
  const columnCount = (() => {
    if (containerWidth === 0) return minColumns;

    // Calculate how many items fit (item width + gap)
    const effectiveItemWidth = itemWidth + gap;
    const calculatedColumns = Math.floor((containerWidth + gap) / effectiveItemWidth);

    return Math.max(minColumns, Math.min(maxColumns, calculatedColumns));
  })();

  // Calculate row count
  const rowCount = Math.ceil(items.length / columnCount);

  // Create row virtualizer
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => containerRef.current,
    estimateSize: () => itemHeight + gap,
    overscan,
  });

  // Get items for a specific row
  const getRowItems = (rowIndex: number): VirtualGridItem<T>[] => {
    const startIndex = rowIndex * columnCount;
    const rowItems: VirtualGridItem<T>[] = [];

    for (let col = 0; col < columnCount; col++) {
      const index = startIndex + col;
      if (index < items.length) {
        rowItems.push({
          index,
          item: items[index],
          row: rowIndex,
          column: col,
        });
      }
    }

    return rowItems;
  };

  // Scroll to a specific item
  const scrollToItem = (index: number) => {
    const rowIndex = Math.floor(index / columnCount);
    rowVirtualizer.scrollToIndex(rowIndex, { align: 'start' });
  };

  // Total height for the grid
  const totalHeight = rowVirtualizer.getTotalSize();

  return {
    rowVirtualizer,
    columnCount,
    getRowItems,
    rowCount,
    totalHeight,
    containerWidth,
    scrollToItem,
  };
}
