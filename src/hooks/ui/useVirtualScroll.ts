/**
 * useVirtualScroll Hook
 *
 * React hook for virtual scrolling using @tanstack/react-virtual.
 * Optimized for grid layouts with asset thumbnails.
 *
 * @module hooks/ui/useVirtualScroll
 *
 * @example
 * ```tsx
 * const { virtualRows, totalHeight, containerRef, measureElement } = useVirtualScroll({
 *   itemCount: 100,
 *   itemHeight: 150,
 *   overscan: 5,
 * });
 * ```
 */

import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual';
import { useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface UseVirtualScrollOptions {
  /** Total number of items */
  itemCount: number;
  /** Estimated height of each item (used for initial render) */
  itemHeight: number;
  /** Number of items to render outside visible area */
  overscan?: number;
  /** Whether to enable horizontal virtualization */
  horizontal?: boolean;
  /** Custom getScrollElement function */
  getScrollElement?: () => HTMLElement | null;
}

export interface UseVirtualScrollReturn {
  /** Reference to attach to scrollable container */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Virtual items to render */
  virtualItems: VirtualItem[];
  /** Total height/width of virtualized content */
  totalSize: number;
  /** Function to measure an element for dynamic sizing */
  measureElement: (el: HTMLElement | null) => void;
  /** Scroll to a specific index */
  scrollToIndex: (index: number, options?: { align?: 'start' | 'center' | 'end' }) => void;
  /** Check if an item is in view */
  isItemInView: (index: number) => boolean;
  /** Get virtual row range */
  range: { startIndex: number; endIndex: number } | null;
}

// ============================================================================
// Hook
// ============================================================================

export function useVirtualScroll(options: UseVirtualScrollOptions): UseVirtualScrollReturn {
  const { itemCount, itemHeight, overscan = 5, horizontal = false, getScrollElement } = options;

  const containerRef = useRef<HTMLDivElement>(null);

  // Create virtualizer
  const virtualizer = useVirtualizer({
    count: itemCount,
    getScrollElement: getScrollElement ?? (() => containerRef.current),
    estimateSize: () => itemHeight,
    overscan,
    horizontal,
  });

  // Get virtual items
  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  // Measure element for dynamic sizing
  const measureElement = (el: HTMLElement | null) => {
    if (el) {
      virtualizer.measureElement(el);
    }
  };

  // Scroll to index
  const scrollToIndex = (index: number, scrollOptions?: { align?: 'start' | 'center' | 'end' }) => {
    virtualizer.scrollToIndex(index, scrollOptions);
  };

  // Check if item is in view
  const isItemInView = (index: number) => {
    const item = virtualItems.find((v) => v.index === index);
    return !!item;
  };

  // Get virtual row range
  const range = ((): { startIndex: number; endIndex: number } | null => {
    if (virtualItems.length === 0) return null;
    return {
      startIndex: virtualItems[0].index,
      endIndex: virtualItems[virtualItems.length - 1].index,
    };
  })();

  return {
    containerRef,
    virtualItems,
    totalSize,
    measureElement,
    scrollToIndex,
    isItemInView,
    range,
  };
}

// ============================================================================
// Grid Virtual Scroll Hook
// ============================================================================

export interface UseVirtualGridOptions {
  /** Total number of items */
  itemCount: number;
  /** Number of columns in the grid */
  columnCount: number;
  /** Height of each row */
  rowHeight: number;
  /** Gap between items */
  gap?: number;
  /** Number of rows to render outside visible area */
  overscan?: number;
}

export interface UseVirtualGridReturn {
  /** Reference to attach to scrollable container */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Virtual rows to render */
  virtualRows: VirtualItem[];
  /** Total height of virtualized content */
  totalHeight: number;
  /** Get items for a specific row */
  getRowItems: (rowIndex: number) => number[];
  /** Scroll to a specific item index */
  scrollToItem: (itemIndex: number) => void;
  /** Get the row index for an item */
  getRowForItem: (itemIndex: number) => number;
}

/**
 * Hook for virtual scrolling in a grid layout
 */
export function useVirtualGrid(options: UseVirtualGridOptions): UseVirtualGridReturn {
  const { itemCount, columnCount, rowHeight, gap = 0, overscan = 3 } = options;

  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate row count
  const rowCount = Math.ceil(itemCount / columnCount);

  // Create virtualizer for rows
  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => containerRef.current,
    estimateSize: () => rowHeight + gap,
    overscan,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const totalHeight = virtualizer.getTotalSize();

  // Get items for a specific row
  const getRowItems = (rowIndex: number): number[] => {
    const startIndex = rowIndex * columnCount;
    const endIndex = Math.min(startIndex + columnCount, itemCount);
    const items: number[] = [];
    for (let i = startIndex; i < endIndex; i++) {
      items.push(i);
    }
    return items;
  };

  // Get row for an item
  const getRowForItem = (itemIndex: number): number => Math.floor(itemIndex / columnCount);

  // Scroll to item
  const scrollToItem = (itemIndex: number) => {
    const rowIndex = getRowForItem(itemIndex);
    virtualizer.scrollToIndex(rowIndex, { align: 'start' });
  };

  return {
    containerRef,
    virtualRows,
    totalHeight,
    getRowItems,
    scrollToItem,
    getRowForItem,
  };
}
