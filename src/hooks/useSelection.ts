/**
 * useSelection Hook
 *
 * Generic selection state management for lists.
 * Handles single select, multi-select, select all, and clear operations.
 *
 * @module hooks/useSelection
 */

import { useState, useCallback, useMemo } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface UseSelectionOptions<T> {
  /** Function to get unique ID from an item */
  getItemId?: (item: T) => string;
  /** Initial selected IDs */
  initialSelection?: string[];
  /** Maximum number of items that can be selected (undefined = unlimited) */
  maxSelection?: number;
  /** Callback when selection changes */
  onSelectionChange?: (selectedIds: Set<string>) => void;
}

export interface UseSelectionReturn {
  /** Set of currently selected IDs */
  selectedIds: Set<string>;
  /** Number of selected items */
  selectedCount: number;
  /** Toggle selection of a single item */
  toggleSelect: (id: string) => void;
  /** Select a single item (deselects others if not multi-select) */
  select: (id: string) => void;
  /** Deselect a single item */
  deselect: (id: string) => void;
  /** Select all items from a list of IDs */
  selectAll: (allIds: string[]) => void;
  /** Clear all selections */
  clearSelection: () => void;
  /** Check if an item is selected */
  isSelected: (id: string) => boolean;
  /** Check if all items are selected */
  isAllSelected: (allIds: string[]) => boolean;
  /** Check if some (but not all) items are selected */
  isPartiallySelected: (allIds: string[]) => boolean;
  /** Set selection directly (replaces current selection) */
  setSelection: (ids: string[]) => void;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Generic selection hook for managing selected items in a list
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { selectedIds, toggleSelect, clearSelection } = useSelection();
 *
 * // With items array
 * const items = [{ id: '1', name: 'Item 1' }, { id: '2', name: 'Item 2' }];
 * const { selectAll, isAllSelected } = useSelection();
 *
 * // Select all
 * selectAll(items.map(item => item.id));
 *
 * // Check selection state
 * if (isAllSelected(items.map(item => item.id))) {
 *   console.log('All selected!');
 * }
 * ```
 */
export function useSelection<T = unknown>(
  options: UseSelectionOptions<T> = {}
): UseSelectionReturn {
  const { initialSelection = [], maxSelection, onSelectionChange } = options;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(initialSelection)
  );

  // Notify on selection change
  const updateSelection = useCallback(
    (updater: (prev: Set<string>) => Set<string>) => {
      setSelectedIds((prev) => {
        const next = updater(prev);
        onSelectionChange?.(next);
        return next;
      });
    },
    [onSelectionChange]
  );

  const toggleSelect = useCallback(
    (id: string) => {
      updateSelection((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          // Check max selection limit
          if (maxSelection !== undefined && next.size >= maxSelection) {
            return prev; // Don't add if at limit
          }
          next.add(id);
        }
        return next;
      });
    },
    [updateSelection, maxSelection]
  );

  const select = useCallback(
    (id: string) => {
      updateSelection((prev) => {
        if (prev.has(id)) return prev;
        if (maxSelection !== undefined && prev.size >= maxSelection) {
          return prev;
        }
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    },
    [updateSelection, maxSelection]
  );

  const deselect = useCallback(
    (id: string) => {
      updateSelection((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    [updateSelection]
  );

  const selectAll = useCallback(
    (allIds: string[]) => {
      updateSelection(() => {
        const idsToSelect = maxSelection !== undefined
          ? allIds.slice(0, maxSelection)
          : allIds;
        return new Set(idsToSelect);
      });
    },
    [updateSelection, maxSelection]
  );

  const clearSelection = useCallback(() => {
    updateSelection(() => new Set());
  }, [updateSelection]);

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  const isAllSelected = useCallback(
    (allIds: string[]) => {
      if (allIds.length === 0) return false;
      return allIds.every((id) => selectedIds.has(id));
    },
    [selectedIds]
  );

  const isPartiallySelected = useCallback(
    (allIds: string[]) => {
      if (allIds.length === 0) return false;
      const selectedCount = allIds.filter((id) => selectedIds.has(id)).length;
      return selectedCount > 0 && selectedCount < allIds.length;
    },
    [selectedIds]
  );

  const setSelection = useCallback(
    (ids: string[]) => {
      updateSelection(() => {
        const idsToSelect = maxSelection !== undefined
          ? ids.slice(0, maxSelection)
          : ids;
        return new Set(idsToSelect);
      });
    },
    [updateSelection, maxSelection]
  );

  const selectedCount = useMemo(() => selectedIds.size, [selectedIds]);

  return {
    selectedIds,
    selectedCount,
    toggleSelect,
    select,
    deselect,
    selectAll,
    clearSelection,
    isSelected,
    isAllSelected,
    isPartiallySelected,
    setSelection,
  };
}

export default useSelection;
