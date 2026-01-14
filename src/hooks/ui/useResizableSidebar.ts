/**
 * useResizableSidebar Hook
 *
 * Provides drag-to-resize functionality for sidebar panels.
 * Handles mouse events, enforces min/max constraints, and persists width to localStorage.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getStorageItem,
  STORAGE_KEYS,
  type StorageKey,
  setStorageItem,
} from '@/ts/utils/storageKeys.js';

/** Configuration options for the resizable sidebar */
export interface UseResizableSidebarOptions {
  /** Minimum width in pixels (default: 250) */
  minWidth?: number;
  /** Maximum width in pixels (default: 450) */
  maxWidth?: number;
  /** Default width in pixels (default: 350) */
  defaultWidth?: number;
  /** Storage key for persisting width (uses SIDEBAR_WIDTH_LEFT by default) */
  storageKey?: StorageKey;
  /** Position of the resize handle ('left' | 'right') */
  position?: 'left' | 'right';
}

/** Return value from useResizableSidebar hook */
export interface UseResizableSidebarResult {
  /** Current sidebar width in pixels */
  width: number;
  /** Whether the user is currently dragging */
  isDragging: boolean;
  /** Props to spread on the resize handle element */
  handleProps: {
    onMouseDown: (e: React.MouseEvent) => void;
    style: React.CSSProperties;
  };
  /** Reset width to default */
  resetWidth: () => void;
  /** Set width programmatically */
  setWidth: (width: number) => void;
}

const DEFAULT_MIN_WIDTH = 250;
const DEFAULT_MAX_WIDTH = 450;
const DEFAULT_WIDTH = 350;

/**
 * Hook for creating a resizable sidebar
 *
 * @example
 * ```tsx
 * const { width, isDragging, handleProps } = useResizableSidebar({
 *   minWidth: 250,
 *   maxWidth: 450,
 *   defaultWidth: 350,
 * });
 *
 * return (
 *   <aside style={{ width }}>
 *     {children}
 *     <div className={styles.resizeHandle} {...handleProps} />
 *   </aside>
 * );
 * ```
 */
export function useResizableSidebar(
  options: UseResizableSidebarOptions = {}
): UseResizableSidebarResult {
  const {
    minWidth = DEFAULT_MIN_WIDTH,
    maxWidth = DEFAULT_MAX_WIDTH,
    defaultWidth = DEFAULT_WIDTH,
    storageKey = STORAGE_KEYS.SIDEBAR_WIDTH_LEFT,
    position = 'left',
  } = options;

  // Load initial width from storage or use default
  const [width, setWidthState] = useState<number>(() => {
    const stored = getStorageItem(storageKey);
    if (stored) {
      const parsed = Number.parseInt(stored, 10);
      if (!Number.isNaN(parsed) && parsed >= minWidth && parsed <= maxWidth) {
        return parsed;
      }
    }
    return defaultWidth;
  });

  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // Clamp width within bounds
  const clampWidth = useCallback(
    (w: number) => Math.min(maxWidth, Math.max(minWidth, w)),
    [minWidth, maxWidth]
  );

  // Set width with clamping and persistence
  const setWidth = (newWidth: number) => {
    const clamped = clampWidth(newWidth);
    setWidthState(clamped);
    setStorageItem(storageKey, String(clamped));
  };

  // Reset to default width
  const resetWidth = () => {
    setWidth(defaultWidth);
  };

  // Handle mouse down on resize handle
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  };

  // Handle mouse move during drag
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startXRef.current;
      // For left sidebar, dragging right increases width
      // For right sidebar, dragging left increases width
      const newWidth =
        position === 'left' ? startWidthRef.current + deltaX : startWidthRef.current - deltaX;
      setWidthState(clampWidth(newWidth));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // Persist final width
      setStorageItem(storageKey, String(width));
    };

    // Add global listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, clampWidth, position, storageKey, width]);

  // Handle props for the resize handle element
  const handleProps = {
    onMouseDown: handleMouseDown,
    style: {
      cursor: 'col-resize',
    } as React.CSSProperties,
  };

  return {
    width,
    isDragging,
    handleProps,
    resetWidth,
    setWidth,
  };
}
