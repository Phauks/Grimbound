/**
 * Unit tests for useSelection hook
 *
 * Tests cover:
 * - Initial state management with and without options
 * - Toggle, select, and deselect operations
 * - Select all and clear operations
 * - Selection queries (isSelected, isAllSelected, isPartiallySelected)
 * - Direct selection setting
 * - maxSelection limit enforcement
 * - onSelectionChange callback invocation
 * - Edge cases (empty selections, empty arrays, single items)
 */

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSelection } from '@/hooks/ui/useSelection';

describe('useSelection', () => {
  describe('Initial State', () => {
    it('should initialize with empty selection when no options provided', () => {
      const { result } = renderHook(() => useSelection());

      expect(result.current.selectedIds.size).toBe(0);
      expect(result.current.selectedCount).toBe(0);
    });

    it('should initialize with empty selection when empty initialSelection provided', () => {
      const { result } = renderHook(() => useSelection({ initialSelection: [] }));

      expect(result.current.selectedIds.size).toBe(0);
      expect(result.current.selectedCount).toBe(0);
    });

    it('should initialize with provided initialSelection', () => {
      const { result } = renderHook(() =>
        useSelection({ initialSelection: ['id-1', 'id-2', 'id-3'] })
      );

      expect(result.current.selectedIds.size).toBe(3);
      expect(result.current.selectedCount).toBe(3);
      expect(result.current.isSelected('id-1')).toBe(true);
      expect(result.current.isSelected('id-2')).toBe(true);
      expect(result.current.isSelected('id-3')).toBe(true);
    });

    it('should initialize with single item in initialSelection', () => {
      const { result } = renderHook(() => useSelection({ initialSelection: ['id-1'] }));

      expect(result.current.selectedIds.size).toBe(1);
      expect(result.current.selectedCount).toBe(1);
      expect(result.current.isSelected('id-1')).toBe(true);
    });

    it('should initialize without triggering onSelectionChange', () => {
      const onSelectionChange = vi.fn();
      renderHook(() => useSelection({ initialSelection: ['id-1'], onSelectionChange }));

      expect(onSelectionChange).not.toHaveBeenCalled();
    });
  });

  describe('toggleSelect Operation', () => {
    it('should add unselected item when toggled', () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.toggleSelect('id-1');
      });

      expect(result.current.isSelected('id-1')).toBe(true);
      expect(result.current.selectedCount).toBe(1);
    });

    it('should remove selected item when toggled', () => {
      const { result } = renderHook(() => useSelection({ initialSelection: ['id-1'] }));

      act(() => {
        result.current.toggleSelect('id-1');
      });

      expect(result.current.isSelected('id-1')).toBe(false);
      expect(result.current.selectedCount).toBe(0);
    });

    it('should toggle multiple items independently', () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.toggleSelect('id-1');
        result.current.toggleSelect('id-2');
        result.current.toggleSelect('id-1');
      });

      expect(result.current.isSelected('id-1')).toBe(false);
      expect(result.current.isSelected('id-2')).toBe(true);
      expect(result.current.selectedCount).toBe(1);
    });

    it('should respect maxSelection limit when adding', () => {
      const { result } = renderHook(() => useSelection({ maxSelection: 2 }));

      act(() => {
        result.current.toggleSelect('id-1');
        result.current.toggleSelect('id-2');
      });

      expect(result.current.selectedCount).toBe(2);

      act(() => {
        result.current.toggleSelect('id-3');
      });

      expect(result.current.selectedCount).toBe(2);
      expect(result.current.isSelected('id-3')).toBe(false);
    });

    it('should allow removing when at maxSelection limit', () => {
      const { result } = renderHook(() =>
        useSelection({ initialSelection: ['id-1', 'id-2'], maxSelection: 2 })
      );

      act(() => {
        result.current.toggleSelect('id-1');
      });

      expect(result.current.selectedCount).toBe(1);
      expect(result.current.isSelected('id-1')).toBe(false);
    });

    it('should trigger onSelectionChange callback when toggling', () => {
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() => useSelection({ onSelectionChange }));

      act(() => {
        result.current.toggleSelect('id-1');
      });

      expect(onSelectionChange).toHaveBeenCalledTimes(1);
      expect(onSelectionChange).toHaveBeenCalledWith(expect.any(Set));
    });
  });

  describe('select Operation', () => {
    it('should add unselected item', () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.select('id-1');
      });

      expect(result.current.isSelected('id-1')).toBe(true);
      expect(result.current.selectedCount).toBe(1);
    });

    it('should not duplicate already selected item', () => {
      const { result } = renderHook(() => useSelection({ initialSelection: ['id-1'] }));

      act(() => {
        result.current.select('id-1');
      });

      expect(result.current.selectedCount).toBe(1);
    });

    it('should not change selection state when selecting already selected item', () => {
      const { result } = renderHook(() => useSelection({ initialSelection: ['id-1'] }));
      const initialSet = result.current.selectedIds;

      act(() => {
        result.current.select('id-1');
      });

      // Selection remains unchanged - returns the same Set reference
      expect(result.current.selectedIds).toBe(initialSet);
      expect(result.current.selectedCount).toBe(1);
    });

    it('should select multiple items cumulatively', () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.select('id-1');
        result.current.select('id-2');
        result.current.select('id-3');
      });

      expect(result.current.selectedCount).toBe(3);
      expect(result.current.isSelected('id-1')).toBe(true);
      expect(result.current.isSelected('id-2')).toBe(true);
      expect(result.current.isSelected('id-3')).toBe(true);
    });

    it('should respect maxSelection limit', () => {
      const { result } = renderHook(() => useSelection({ maxSelection: 2 }));

      act(() => {
        result.current.select('id-1');
        result.current.select('id-2');
      });

      expect(result.current.selectedCount).toBe(2);

      act(() => {
        result.current.select('id-3');
      });

      expect(result.current.selectedCount).toBe(2);
      expect(result.current.isSelected('id-3')).toBe(false);
    });

    it('should trigger onSelectionChange callback when selecting new item', () => {
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() => useSelection({ onSelectionChange }));

      act(() => {
        result.current.select('id-1');
      });

      expect(onSelectionChange).toHaveBeenCalledTimes(1);
    });

    it('should allow selecting when below maxSelection limit', () => {
      const { result } = renderHook(() =>
        useSelection({ maxSelection: 3, initialSelection: ['id-1'] })
      );

      act(() => {
        result.current.select('id-2');
      });

      expect(result.current.selectedCount).toBe(2);
      expect(result.current.isSelected('id-2')).toBe(true);
    });
  });

  describe('deselect Operation', () => {
    it('should remove selected item', () => {
      const { result } = renderHook(() => useSelection({ initialSelection: ['id-1'] }));

      act(() => {
        result.current.deselect('id-1');
      });

      expect(result.current.isSelected('id-1')).toBe(false);
      expect(result.current.selectedCount).toBe(0);
    });

    it('should be no-op for unselected item', () => {
      const { result } = renderHook(() => useSelection({ initialSelection: ['id-1'] }));

      act(() => {
        result.current.deselect('id-2');
      });

      expect(result.current.selectedCount).toBe(1);
      expect(result.current.isSelected('id-1')).toBe(true);
    });

    it('should not change selection state when deselecting unselected item', () => {
      const { result } = renderHook(() => useSelection());
      const initialSet = result.current.selectedIds;

      act(() => {
        result.current.deselect('id-1');
      });

      // Selection remains unchanged - returns the same Set reference
      expect(result.current.selectedIds).toBe(initialSet);
      expect(result.current.selectedCount).toBe(0);
    });

    it('should deselect from multiple selections', () => {
      const { result } = renderHook(() =>
        useSelection({ initialSelection: ['id-1', 'id-2', 'id-3'] })
      );

      act(() => {
        result.current.deselect('id-2');
      });

      expect(result.current.selectedCount).toBe(2);
      expect(result.current.isSelected('id-1')).toBe(true);
      expect(result.current.isSelected('id-2')).toBe(false);
      expect(result.current.isSelected('id-3')).toBe(true);
    });

    it('should trigger onSelectionChange callback when deselecting', () => {
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() =>
        useSelection({ initialSelection: ['id-1'], onSelectionChange })
      );

      act(() => {
        result.current.deselect('id-1');
      });

      expect(onSelectionChange).toHaveBeenCalledTimes(1);
    });

    it('should deselect all items sequentially', () => {
      const { result } = renderHook(() => useSelection({ initialSelection: ['id-1', 'id-2'] }));

      act(() => {
        result.current.deselect('id-1');
        result.current.deselect('id-2');
      });

      expect(result.current.selectedCount).toBe(0);
    });
  });

  describe('selectAll Operation', () => {
    it('should select all provided items', () => {
      const { result } = renderHook(() => useSelection());
      const allIds = ['id-1', 'id-2', 'id-3'];

      act(() => {
        result.current.selectAll(allIds);
      });

      expect(result.current.selectedCount).toBe(3);
      expect(result.current.isAllSelected(allIds)).toBe(true);
    });

    it('should select all items when starting from empty', () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.selectAll(['id-1', 'id-2']);
      });

      expect(result.current.selectedCount).toBe(2);
    });

    it('should replace selection when selectAll is called', () => {
      const { result } = renderHook(() => useSelection({ initialSelection: ['id-1', 'id-2'] }));

      act(() => {
        result.current.selectAll(['id-3', 'id-4']);
      });

      expect(result.current.selectedCount).toBe(2);
      expect(result.current.isSelected('id-1')).toBe(false);
      expect(result.current.isSelected('id-2')).toBe(false);
      expect(result.current.isSelected('id-3')).toBe(true);
      expect(result.current.isSelected('id-4')).toBe(true);
    });

    it('should respect maxSelection limit', () => {
      const { result } = renderHook(() => useSelection({ maxSelection: 2 }));
      const allIds = ['id-1', 'id-2', 'id-3', 'id-4'];

      act(() => {
        result.current.selectAll(allIds);
      });

      expect(result.current.selectedCount).toBe(2);
      expect(result.current.isSelected('id-1')).toBe(true);
      expect(result.current.isSelected('id-2')).toBe(true);
      expect(result.current.isSelected('id-3')).toBe(false);
    });

    it('should handle empty array', () => {
      const { result } = renderHook(() => useSelection({ initialSelection: ['id-1'] }));

      act(() => {
        result.current.selectAll([]);
      });

      expect(result.current.selectedCount).toBe(0);
    });

    it('should trigger onSelectionChange callback', () => {
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() => useSelection({ onSelectionChange }));

      act(() => {
        result.current.selectAll(['id-1', 'id-2']);
      });

      expect(onSelectionChange).toHaveBeenCalledTimes(1);
    });

    it('should select single item via selectAll', () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.selectAll(['id-1']);
      });

      expect(result.current.selectedCount).toBe(1);
      expect(result.current.isSelected('id-1')).toBe(true);
    });
  });

  describe('clearSelection Operation', () => {
    it('should clear all selections', () => {
      const { result } = renderHook(() =>
        useSelection({ initialSelection: ['id-1', 'id-2', 'id-3'] })
      );

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedCount).toBe(0);
      expect(result.current.isSelected('id-1')).toBe(false);
      expect(result.current.isSelected('id-2')).toBe(false);
      expect(result.current.isSelected('id-3')).toBe(false);
    });

    it('should be no-op when already empty', () => {
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() => useSelection({ onSelectionChange }));

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedCount).toBe(0);
    });

    it('should trigger onSelectionChange callback when clearing non-empty selection', () => {
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() =>
        useSelection({ initialSelection: ['id-1'], onSelectionChange })
      );

      act(() => {
        result.current.clearSelection();
      });

      expect(onSelectionChange).toHaveBeenCalledTimes(1);
    });

    it('should allow subsequent selections after clearing', () => {
      const { result } = renderHook(() => useSelection({ initialSelection: ['id-1', 'id-2'] }));

      act(() => {
        result.current.clearSelection();
        result.current.select('id-3');
      });

      expect(result.current.selectedCount).toBe(1);
      expect(result.current.isSelected('id-3')).toBe(true);
    });
  });

  describe('isSelected Query', () => {
    it('should return true for selected item', () => {
      const { result } = renderHook(() => useSelection({ initialSelection: ['id-1'] }));

      expect(result.current.isSelected('id-1')).toBe(true);
    });

    it('should return false for unselected item', () => {
      const { result } = renderHook(() => useSelection({ initialSelection: ['id-1'] }));

      expect(result.current.isSelected('id-2')).toBe(false);
    });

    it('should return false for empty selection', () => {
      const { result } = renderHook(() => useSelection());

      expect(result.current.isSelected('id-1')).toBe(false);
    });

    it('should reflect selection changes', () => {
      const { result } = renderHook(() => useSelection());

      expect(result.current.isSelected('id-1')).toBe(false);

      act(() => {
        result.current.select('id-1');
      });

      expect(result.current.isSelected('id-1')).toBe(true);

      act(() => {
        result.current.deselect('id-1');
      });

      expect(result.current.isSelected('id-1')).toBe(false);
    });
  });

  describe('isAllSelected Query', () => {
    it('should return true when all items are selected', () => {
      const allIds = ['id-1', 'id-2', 'id-3'];
      const { result } = renderHook(() => useSelection({ initialSelection: allIds }));

      expect(result.current.isAllSelected(allIds)).toBe(true);
    });

    it('should return false when some items are not selected', () => {
      const { result } = renderHook(() => useSelection({ initialSelection: ['id-1', 'id-2'] }));

      expect(result.current.isAllSelected(['id-1', 'id-2', 'id-3'])).toBe(false);
    });

    it('should return false when no items are selected', () => {
      const { result } = renderHook(() => useSelection());

      expect(result.current.isAllSelected(['id-1', 'id-2'])).toBe(false);
    });

    it('should return false for empty array', () => {
      const { result } = renderHook(() => useSelection({ initialSelection: ['id-1'] }));

      expect(result.current.isAllSelected([])).toBe(false);
    });

    it('should return true for single item array when item is selected', () => {
      const { result } = renderHook(() => useSelection({ initialSelection: ['id-1'] }));

      expect(result.current.isAllSelected(['id-1'])).toBe(true);
    });

    it('should return false for single item array when item is not selected', () => {
      const { result } = renderHook(() => useSelection());

      expect(result.current.isAllSelected(['id-1'])).toBe(false);
    });
  });

  describe('isPartiallySelected Query', () => {
    it('should return true when some items are selected', () => {
      const { result } = renderHook(() => useSelection({ initialSelection: ['id-1'] }));

      expect(result.current.isPartiallySelected(['id-1', 'id-2', 'id-3'])).toBe(true);
    });

    it('should return false when all items are selected', () => {
      const allIds = ['id-1', 'id-2'];
      const { result } = renderHook(() => useSelection({ initialSelection: allIds }));

      expect(result.current.isPartiallySelected(allIds)).toBe(false);
    });

    it('should return false when no items are selected', () => {
      const { result } = renderHook(() => useSelection());

      expect(result.current.isPartiallySelected(['id-1', 'id-2'])).toBe(false);
    });

    it('should return false for empty array', () => {
      const { result } = renderHook(() => useSelection({ initialSelection: ['id-1'] }));

      expect(result.current.isPartiallySelected([])).toBe(false);
    });

    it('should return true when exactly one of two items is selected', () => {
      const { result } = renderHook(() => useSelection({ initialSelection: ['id-1'] }));

      expect(result.current.isPartiallySelected(['id-1', 'id-2'])).toBe(true);
    });

    it('should return true when two of three items are selected', () => {
      const { result } = renderHook(() => useSelection({ initialSelection: ['id-1', 'id-3'] }));

      expect(result.current.isPartiallySelected(['id-1', 'id-2', 'id-3'])).toBe(true);
    });

    it('should return false for single item array', () => {
      const { result } = renderHook(() => useSelection({ initialSelection: ['id-1'] }));

      expect(result.current.isPartiallySelected(['id-1'])).toBe(false);
    });
  });

  describe('setSelection Operation', () => {
    it('should set selection directly', () => {
      const { result } = renderHook(() => useSelection());
      const newSelection = ['id-1', 'id-2', 'id-3'];

      act(() => {
        result.current.setSelection(newSelection);
      });

      expect(result.current.selectedCount).toBe(3);
      expect(result.current.isAllSelected(newSelection)).toBe(true);
    });

    it('should replace existing selection', () => {
      const { result } = renderHook(() => useSelection({ initialSelection: ['id-1', 'id-2'] }));

      act(() => {
        result.current.setSelection(['id-3', 'id-4']);
      });

      expect(result.current.selectedCount).toBe(2);
      expect(result.current.isSelected('id-1')).toBe(false);
      expect(result.current.isSelected('id-2')).toBe(false);
      expect(result.current.isSelected('id-3')).toBe(true);
      expect(result.current.isSelected('id-4')).toBe(true);
    });

    it('should clear selection with empty array', () => {
      const { result } = renderHook(() => useSelection({ initialSelection: ['id-1', 'id-2'] }));

      act(() => {
        result.current.setSelection([]);
      });

      expect(result.current.selectedCount).toBe(0);
    });

    it('should respect maxSelection limit', () => {
      const { result } = renderHook(() => useSelection({ maxSelection: 2 }));

      act(() => {
        result.current.setSelection(['id-1', 'id-2', 'id-3', 'id-4']);
      });

      expect(result.current.selectedCount).toBe(2);
      expect(result.current.isSelected('id-1')).toBe(true);
      expect(result.current.isSelected('id-2')).toBe(true);
      expect(result.current.isSelected('id-3')).toBe(false);
    });

    it('should trigger onSelectionChange callback', () => {
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() => useSelection({ onSelectionChange }));

      act(() => {
        result.current.setSelection(['id-1', 'id-2']);
      });

      expect(onSelectionChange).toHaveBeenCalledTimes(1);
    });

    it('should handle single item selection', () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.setSelection(['id-1']);
      });

      expect(result.current.selectedCount).toBe(1);
      expect(result.current.isSelected('id-1')).toBe(true);
    });

    it('should handle duplicate IDs in selection array', () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.setSelection(['id-1', 'id-2', 'id-1']);
      });

      expect(result.current.selectedCount).toBe(2);
      expect(result.current.isSelected('id-1')).toBe(true);
      expect(result.current.isSelected('id-2')).toBe(true);
    });
  });

  describe('selectedCount Property', () => {
    it('should initialize to zero', () => {
      const { result } = renderHook(() => useSelection());

      expect(result.current.selectedCount).toBe(0);
    });

    it('should equal initial selection size', () => {
      const { result } = renderHook(() => useSelection({ initialSelection: ['id-1', 'id-2'] }));

      expect(result.current.selectedCount).toBe(2);
    });

    it('should update when selection changes', () => {
      const { result } = renderHook(() => useSelection());

      act(() => {
        result.current.select('id-1');
      });

      expect(result.current.selectedCount).toBe(1);

      act(() => {
        result.current.select('id-2');
      });

      expect(result.current.selectedCount).toBe(2);

      act(() => {
        result.current.deselect('id-1');
      });

      expect(result.current.selectedCount).toBe(1);
    });
  });

  describe('selectedIds Set', () => {
    it('should return a Set object', () => {
      const { result } = renderHook(() => useSelection());

      expect(result.current.selectedIds).toBeInstanceOf(Set);
    });

    it('should contain selected IDs', () => {
      const { result } = renderHook(() => useSelection({ initialSelection: ['id-1', 'id-2'] }));

      expect(result.current.selectedIds.has('id-1')).toBe(true);
      expect(result.current.selectedIds.has('id-2')).toBe(true);
      expect(result.current.selectedIds.has('id-3')).toBe(false);
    });

    it('should be a new Set instance on updates', () => {
      const { result } = renderHook(() => useSelection());
      const initialSet = result.current.selectedIds;

      act(() => {
        result.current.select('id-1');
      });

      expect(result.current.selectedIds).not.toBe(initialSet);
    });
  });

  describe('maxSelection Enforcement', () => {
    it('should prevent adding items beyond maxSelection limit', () => {
      const { result } = renderHook(() => useSelection({ maxSelection: 2 }));

      act(() => {
        result.current.select('id-1');
        result.current.select('id-2');
        result.current.select('id-3');
      });

      expect(result.current.selectedCount).toBe(2);
    });

    it('should allow selecting when below limit after deselect', () => {
      const { result } = renderHook(() =>
        useSelection({ maxSelection: 2, initialSelection: ['id-1', 'id-2'] })
      );

      act(() => {
        result.current.deselect('id-1');
        result.current.select('id-3');
      });

      expect(result.current.selectedCount).toBe(2);
      expect(result.current.isSelected('id-3')).toBe(true);
    });

    it('should not enforce limit when maxSelection is undefined', () => {
      const { result } = renderHook(() => useSelection({ maxSelection: undefined }));

      act(() => {
        result.current.select('id-1');
        result.current.select('id-2');
        result.current.select('id-3');
        result.current.select('id-4');
        result.current.select('id-5');
      });

      expect(result.current.selectedCount).toBe(5);
    });

    it('should enforce limit of 1', () => {
      const { result } = renderHook(() => useSelection({ maxSelection: 1 }));

      act(() => {
        result.current.select('id-1');
        result.current.select('id-2');
      });

      expect(result.current.selectedCount).toBe(1);
      expect(result.current.isSelected('id-1')).toBe(true);
      expect(result.current.isSelected('id-2')).toBe(false);
    });

    it('should enforce limit when selecting via selectAll', () => {
      const { result } = renderHook(() => useSelection({ maxSelection: 2 }));

      act(() => {
        result.current.selectAll(['id-1', 'id-2', 'id-3', 'id-4']);
      });

      expect(result.current.selectedCount).toBe(2);
    });

    it('should enforce limit when setting selection', () => {
      const { result } = renderHook(() => useSelection({ maxSelection: 3 }));

      act(() => {
        result.current.setSelection(['id-1', 'id-2', 'id-3', 'id-4', 'id-5']);
      });

      expect(result.current.selectedCount).toBe(3);
    });
  });

  describe('onSelectionChange Callback', () => {
    it('should be called with Set of selected IDs', () => {
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() => useSelection({ onSelectionChange }));

      act(() => {
        result.current.select('id-1');
      });

      expect(onSelectionChange).toHaveBeenCalledWith(expect.any(Set));
      const callArg = onSelectionChange.mock.calls[0][0];
      expect(callArg.has('id-1')).toBe(true);
    });

    it('should be called on each selection change', () => {
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() => useSelection({ onSelectionChange }));

      act(() => {
        result.current.select('id-1');
        result.current.select('id-2');
        result.current.deselect('id-1');
      });

      expect(onSelectionChange).toHaveBeenCalledTimes(3);
    });

    it('should handle operations that return prev state without changing Set reference', () => {
      const { result } = renderHook(() => useSelection());
      const initialSet = result.current.selectedIds;

      act(() => {
        result.current.deselect('id-1');
      });

      // Operation returned prev, so Set reference stays the same
      expect(result.current.selectedIds).toBe(initialSet);
    });

    it('should be called on clearSelection when non-empty', () => {
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() =>
        useSelection({ initialSelection: ['id-1'], onSelectionChange })
      );

      act(() => {
        result.current.clearSelection();
      });

      expect(onSelectionChange).toHaveBeenCalledTimes(1);
    });

    it('should pass final selection state to callback', () => {
      const onSelectionChange = vi.fn();
      const { result } = renderHook(() => useSelection({ onSelectionChange }));

      act(() => {
        result.current.select('id-1');
        result.current.select('id-2');
      });

      const lastCall = onSelectionChange.mock.calls[1][0];
      expect(lastCall.size).toBe(2);
      expect(lastCall.has('id-1')).toBe(true);
      expect(lastCall.has('id-2')).toBe(true);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete workflow: select, toggle, clear, selectAll', () => {
      const { result } = renderHook(() => useSelection());

      // Select individual items
      act(() => {
        result.current.select('id-1');
        result.current.select('id-2');
      });
      expect(result.current.selectedCount).toBe(2);

      // Toggle one out
      act(() => {
        result.current.toggleSelect('id-1');
      });
      expect(result.current.selectedCount).toBe(1);

      // Clear
      act(() => {
        result.current.clearSelection();
      });
      expect(result.current.selectedCount).toBe(0);

      // Select all
      act(() => {
        result.current.selectAll(['id-1', 'id-2', 'id-3']);
      });
      expect(result.current.selectedCount).toBe(3);
    });

    it('should handle mixed operations respecting maxSelection', () => {
      const { result } = renderHook(() => useSelection({ maxSelection: 2 }));

      act(() => {
        result.current.select('id-1');
        result.current.select('id-2');
      });

      // At limit, cannot select more
      act(() => {
        result.current.select('id-3');
      });
      expect(result.current.selectedCount).toBe(2);

      // Can toggle to remove
      act(() => {
        result.current.toggleSelect('id-1');
      });
      expect(result.current.selectedCount).toBe(1);

      // Now can select
      act(() => {
        result.current.select('id-3');
      });
      expect(result.current.selectedCount).toBe(2);
      expect(result.current.isSelected('id-3')).toBe(true);
    });

    it('should track selection state through complex operation sequence', () => {
      const { result } = renderHook(() => useSelection({ initialSelection: ['id-1', 'id-2'] }));

      const allIds = ['id-1', 'id-2', 'id-3'];

      expect(result.current.isPartiallySelected(allIds)).toBe(true);

      act(() => {
        result.current.select('id-3');
      });

      expect(result.current.isAllSelected(allIds)).toBe(true);
      expect(result.current.isPartiallySelected(allIds)).toBe(false);

      act(() => {
        result.current.deselect('id-2');
      });

      expect(result.current.isPartiallySelected(allIds)).toBe(true);
      expect(result.current.isAllSelected(allIds)).toBe(false);
    });
  });
});
