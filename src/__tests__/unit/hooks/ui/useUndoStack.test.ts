/**
 * Unit tests for useUndoStack hook
 *
 * Tests cover:
 * - Initial state management
 * - Push/undo/redo stack operations
 * - History size limiting
 * - Clear and set operations
 * - Multiple data types (primitives, objects, arrays)
 */

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useUndoStack } from '@/hooks/ui/useUndoStack';

// Test factories for various data types
const createMockObject = (overrides = {}) => ({ value: 'test', ...overrides });
const createMockArray = (items = [1, 2, 3]) => [...items];

describe('useUndoStack', () => {
  describe('Initial State', () => {
    it('should initialize with provided initial value', () => {
      const { result } = renderHook(() => useUndoStack('initial'));

      expect(result.current.current).toBe('initial');
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
      expect(result.current.undoCount).toBe(0);
      expect(result.current.redoCount).toBe(0);
    });

    it('should initialize with numeric value', () => {
      const { result } = renderHook(() => useUndoStack(0));

      expect(result.current.current).toBe(0);
    });

    it('should initialize with object value', () => {
      const initialObj = createMockObject();
      const { result } = renderHook(() => useUndoStack(initialObj));

      expect(result.current.current).toBe(initialObj);
    });

    it('should initialize with array value', () => {
      const initialArray = createMockArray();
      const { result } = renderHook(() => useUndoStack(initialArray));

      expect(result.current.current).toBe(initialArray);
    });

    it('should initialize with null value', () => {
      const { result } = renderHook(() => useUndoStack<string | null>(null));

      expect(result.current.current).toBeNull();
    });
  });

  describe('Push Operation', () => {
    it('should push new state onto history', () => {
      const { result } = renderHook(() => useUndoStack('initial'));

      act(() => {
        result.current.push('second');
      });

      expect(result.current.current).toBe('second');
      expect(result.current.canUndo).toBe(true);
      expect(result.current.undoCount).toBe(1);
    });

    it('should not push if value is same as present', () => {
      const { result } = renderHook(() => useUndoStack('initial'));

      act(() => {
        result.current.push('second');
        result.current.push('second'); // Same as present
      });

      expect(result.current.current).toBe('second');
      expect(result.current.undoCount).toBe(1); // Still 1, not 2
    });

    it('should clear redo stack when pushing', () => {
      const { result } = renderHook(() => useUndoStack('state1'));

      act(() => {
        result.current.push('state2');
        result.current.push('state3');
      });

      // Undo to state2
      act(() => {
        result.current.undo();
      });

      expect(result.current.canRedo).toBe(true);

      // Push new state
      act(() => {
        result.current.push('state4');
      });

      // Redo should be cleared
      expect(result.current.canRedo).toBe(false);
      expect(result.current.redoCount).toBe(0);
    });

    it('should work with object values', () => {
      const obj1 = createMockObject({ value: 'first' });
      const obj2 = createMockObject({ value: 'second' });

      const { result } = renderHook(() => useUndoStack(obj1));

      act(() => {
        result.current.push(obj2);
      });

      expect(result.current.current).toBe(obj2);
      expect(result.current.canUndo).toBe(true);
    });

    it('should work with array values', () => {
      const arr1 = createMockArray([1, 2]);
      const arr2 = createMockArray([1, 2, 3]);

      const { result } = renderHook(() => useUndoStack(arr1));

      act(() => {
        result.current.push(arr2);
      });

      expect(result.current.current).toBe(arr2);
      expect(result.current.canUndo).toBe(true);
    });
  });

  describe('History Size Limiting (MAX_HISTORY_SIZE = 50)', () => {
    it('should truncate past when exceeding MAX_HISTORY_SIZE', () => {
      const { result } = renderHook(() => useUndoStack(0));

      // Push 51 states (0 is initial, so push 51 times)
      act(() => {
        for (let i = 1; i <= 51; i++) {
          result.current.push(i);
        }
      });

      // Current should be 51
      expect(result.current.current).toBe(51);

      // undoCount should be 50 (MAX_HISTORY_SIZE), not 51
      expect(result.current.undoCount).toBe(50);

      // Undo 50 times should get us to state 1 (the oldest kept)
      for (let i = 0; i < 50; i++) {
        act(() => {
          result.current.undo();
        });
      }

      expect(result.current.current).toBe(1);
      expect(result.current.canUndo).toBe(false);
    });

    it('should maintain correct history after truncation and redo', () => {
      const { result } = renderHook(() => useUndoStack(0));

      // Push 52 states to trigger truncation
      act(() => {
        for (let i = 1; i <= 52; i++) {
          result.current.push(i);
        }
      });

      // Undo twice
      act(() => {
        result.current.undo();
        result.current.undo();
      });

      expect(result.current.current).toBe(50);
      expect(result.current.canRedo).toBe(true);
      expect(result.current.redoCount).toBe(2);
    });
  });

  describe('Undo Operation', () => {
    it('should move to previous state', () => {
      const { result } = renderHook(() => useUndoStack('state1'));

      act(() => {
        result.current.push('state2');
        result.current.push('state3');
      });

      act(() => {
        result.current.undo();
      });

      expect(result.current.current).toBe('state2');
    });

    it('should return previous value', () => {
      const { result } = renderHook(() => useUndoStack('state1'));

      act(() => {
        result.current.push('state2');
      });

      let undidValue: string | undefined;
      act(() => {
        undidValue = result.current.undo();
      });

      expect(undidValue).toBe('state1');
    });

    it('should be no-op when canUndo is false', () => {
      const { result } = renderHook(() => useUndoStack('initial'));

      act(() => {
        result.current.undo();
      });

      expect(result.current.current).toBe('initial');
      expect(result.current.canUndo).toBe(false);
    });

    it('should return undefined when nothing to undo', () => {
      const { result } = renderHook(() => useUndoStack('initial'));

      let undidValue: string | undefined;
      act(() => {
        undidValue = result.current.undo();
      });

      expect(undidValue).toBeUndefined();
    });

    it('should update canRedo after undo', () => {
      const { result } = renderHook(() => useUndoStack('state1'));

      act(() => {
        result.current.push('state2');
      });

      expect(result.current.canRedo).toBe(false);

      act(() => {
        result.current.undo();
      });

      expect(result.current.canRedo).toBe(true);
    });

    it('should update redoCount after undo', () => {
      const { result } = renderHook(() => useUndoStack('state1'));

      act(() => {
        result.current.push('state2');
        result.current.push('state3');
      });

      act(() => {
        result.current.undo();
      });

      expect(result.current.redoCount).toBe(1);
    });

    it('should undo multiple times', () => {
      const { result } = renderHook(() => useUndoStack('state1'));

      act(() => {
        result.current.push('state2');
        result.current.push('state3');
        result.current.push('state4');
      });

      expect(result.current.current).toBe('state4');

      act(() => {
        result.current.undo();
        result.current.undo();
      });

      expect(result.current.current).toBe('state2');
      expect(result.current.undoCount).toBe(1);
      expect(result.current.redoCount).toBe(2);
    });

    it('should work with object values', () => {
      const obj1 = createMockObject({ value: 'first' });
      const obj2 = createMockObject({ value: 'second' });

      const { result } = renderHook(() => useUndoStack(obj1));

      act(() => {
        result.current.push(obj2);
      });

      act(() => {
        result.current.undo();
      });

      expect(result.current.current).toBe(obj1);
    });
  });

  describe('Redo Operation', () => {
    it('should move to next state', () => {
      const { result } = renderHook(() => useUndoStack('state1'));

      act(() => {
        result.current.push('state2');
        result.current.push('state3');
      });

      act(() => {
        result.current.undo();
      });

      expect(result.current.current).toBe('state2');

      act(() => {
        result.current.redo();
      });

      expect(result.current.current).toBe('state3');
    });

    it('should return next value', () => {
      const { result } = renderHook(() => useUndoStack('state1'));

      act(() => {
        result.current.push('state2');
        result.current.push('state3');
      });

      // Undo once to move to state2
      act(() => {
        result.current.undo();
      });

      expect(result.current.current).toBe('state2');
      expect(result.current.canRedo).toBe(true);

      // Redo should return state3 (what we're redoing to)
      let redidValue: string | undefined;
      act(() => {
        redidValue = result.current.redo();
      });

      // The redo function returns future[0] captured when it closes over state
      // If the captured state at redo call had state3, it returns it
      expect(result.current.current).toBe('state3');
      // redo() reads future[0] when the callback is executed
      expect(redidValue).toBe('state3');
    });

    it('should be no-op when canRedo is false', () => {
      const { result } = renderHook(() => useUndoStack('initial'));

      act(() => {
        result.current.redo();
      });

      expect(result.current.current).toBe('initial');
      expect(result.current.canRedo).toBe(false);
    });

    it('should return undefined when nothing to redo', () => {
      const { result } = renderHook(() => useUndoStack('initial'));

      let redidValue: string | undefined;
      act(() => {
        redidValue = result.current.redo();
      });

      expect(redidValue).toBeUndefined();
    });

    it('should update canUndo after redo', () => {
      const { result } = renderHook(() => useUndoStack('state1'));

      act(() => {
        result.current.push('state2');
        result.current.undo();
      });

      expect(result.current.canUndo).toBe(true);

      act(() => {
        result.current.redo();
      });

      expect(result.current.canUndo).toBe(true);
    });

    it('should update undoCount after redo', () => {
      const { result } = renderHook(() => useUndoStack('state1'));

      act(() => {
        result.current.push('state2');
        result.current.push('state3');
      });

      act(() => {
        result.current.undo();
        result.current.undo();
      });

      expect(result.current.current).toBe('state1');
      expect(result.current.undoCount).toBe(0);
      expect(result.current.redoCount).toBe(2);

      act(() => {
        result.current.redo();
      });

      expect(result.current.current).toBe('state2');
      expect(result.current.undoCount).toBe(1);
      expect(result.current.redoCount).toBe(1);
    });

    it('should redo multiple times', () => {
      const { result } = renderHook(() => useUndoStack('state1'));

      act(() => {
        result.current.push('state2');
        result.current.push('state3');
        result.current.push('state4');
      });

      // Undo 3 times to get back to initial
      act(() => {
        result.current.undo();
        result.current.undo();
        result.current.undo();
      });

      expect(result.current.current).toBe('state1');

      act(() => {
        result.current.redo();
        result.current.redo();
      });

      expect(result.current.current).toBe('state3');
      expect(result.current.redoCount).toBe(1);
    });

    it('should work with array values', () => {
      const arr1 = createMockArray([1, 2]);
      const arr2 = createMockArray([1, 2, 3]);

      const { result } = renderHook(() => useUndoStack(arr1));

      act(() => {
        result.current.push(arr2);
        result.current.undo();
      });

      act(() => {
        result.current.redo();
      });

      expect(result.current.current).toBe(arr2);
    });
  });

  describe('Clear Operation', () => {
    it('should reset to new initial state and clear history', () => {
      const { result } = renderHook(() => useUndoStack('state1'));

      act(() => {
        result.current.push('state2');
        result.current.push('state3');
      });

      expect(result.current.canUndo).toBe(true);
      expect(result.current.canRedo).toBe(false);

      act(() => {
        result.current.clear('cleared');
      });

      expect(result.current.current).toBe('cleared');
      expect(result.current.canUndo).toBe(false);
      expect(result.current.canRedo).toBe(false);
      expect(result.current.undoCount).toBe(0);
      expect(result.current.redoCount).toBe(0);
    });

    it('should clear with same initial value', () => {
      const { result } = renderHook(() => useUndoStack('initial'));

      act(() => {
        result.current.push('state2');
      });

      act(() => {
        result.current.clear('initial');
      });

      expect(result.current.current).toBe('initial');
      expect(result.current.canUndo).toBe(false);
    });

    it('should work with object values', () => {
      const obj1 = createMockObject({ value: 'first' });
      const obj2 = createMockObject({ value: 'second' });
      const obj3 = createMockObject({ value: 'cleared' });

      const { result } = renderHook(() => useUndoStack(obj1));

      act(() => {
        result.current.push(obj2);
      });

      act(() => {
        result.current.clear(obj3);
      });

      expect(result.current.current).toBe(obj3);
      expect(result.current.canUndo).toBe(false);
    });

    it('should clear when in middle of undo/redo cycle', () => {
      const { result } = renderHook(() => useUndoStack(1));

      act(() => {
        result.current.push(2);
        result.current.push(3);
        result.current.push(4);
      });

      // Verify we're at state 4 with history
      expect(result.current.current).toBe(4);
      expect(result.current.undoCount).toBe(3);

      act(() => {
        result.current.clear(99);
      });

      expect(result.current.current).toBe(99);
      expect(result.current.undoCount).toBe(0);
      expect(result.current.redoCount).toBe(0);
    });
  });

  describe('Set Operation', () => {
    it('should set current value without adding to history', () => {
      const { result } = renderHook(() => useUndoStack('initial'));

      act(() => {
        result.current.push('state2');
      });

      expect(result.current.undoCount).toBe(1);

      act(() => {
        result.current.set('synced');
      });

      expect(result.current.current).toBe('synced');
      expect(result.current.undoCount).toBe(1); // Still 1, not 2
      expect(result.current.canUndo).toBe(true);
    });

    it('should preserve redo stack when setting', () => {
      const { result } = renderHook(() => useUndoStack('state1'));

      act(() => {
        result.current.push('state2');
        result.current.push('state3');
      });

      // Undo once to get redoable state
      act(() => {
        result.current.undo();
      });

      expect(result.current.current).toBe('state2');
      expect(result.current.canRedo).toBe(true);
      expect(result.current.redoCount).toBe(1);

      act(() => {
        result.current.set('external');
      });

      expect(result.current.current).toBe('external');
      expect(result.current.canRedo).toBe(true);
      expect(result.current.redoCount).toBe(1);
    });

    it('should work with object values', () => {
      const obj1 = createMockObject({ value: 'first' });
      const obj2 = createMockObject({ value: 'second' });
      const obj3 = createMockObject({ value: 'synced' });

      const { result } = renderHook(() => useUndoStack(obj1));

      act(() => {
        result.current.push(obj2);
      });

      act(() => {
        result.current.set(obj3);
      });

      expect(result.current.current).toBe(obj3);
      expect(result.current.canUndo).toBe(true); // History preserved
    });

    it('should work with array values', () => {
      const arr1 = createMockArray([1]);
      const arr2 = createMockArray([1, 2]);
      const arr3 = createMockArray([1, 2, 3, 4, 5]);

      const { result } = renderHook(() => useUndoStack(arr1));

      act(() => {
        result.current.push(arr2);
      });

      act(() => {
        result.current.set(arr3);
      });

      expect(result.current.current).toBe(arr3);
      expect(result.current.undoCount).toBe(1);
    });

    it('should allow undo to earlier state after set', () => {
      const { result } = renderHook(() => useUndoStack('state1'));

      act(() => {
        result.current.push('state2');
      });

      act(() => {
        result.current.set('external-update');
      });

      act(() => {
        result.current.undo();
      });

      expect(result.current.current).toBe('state1');
    });
  });

  describe('Status Flags', () => {
    describe('canUndo', () => {
      it('should be true when past has states', () => {
        const { result } = renderHook(() => useUndoStack('initial'));

        expect(result.current.canUndo).toBe(false);

        act(() => {
          result.current.push('state2');
        });

        expect(result.current.canUndo).toBe(true);
      });

      it('should be false when past is empty', () => {
        const { result } = renderHook(() => useUndoStack('initial'));

        expect(result.current.canUndo).toBe(false);
      });

      it('should reflect past length correctly', () => {
        const { result } = renderHook(() => useUndoStack(0));

        act(() => {
          result.current.push(1);
          result.current.push(2);
          result.current.push(3);
        });

        expect(result.current.canUndo).toBe(true);
        expect(result.current.undoCount).toBe(3);

        act(() => {
          result.current.undo();
        });

        expect(result.current.canUndo).toBe(true);
        expect(result.current.undoCount).toBe(2);
      });
    });

    describe('canRedo', () => {
      it('should be true when future has states', () => {
        const { result } = renderHook(() => useUndoStack('initial'));

        expect(result.current.canRedo).toBe(false);

        act(() => {
          result.current.push('state2');
        });

        act(() => {
          result.current.undo();
        });

        expect(result.current.canRedo).toBe(true);
      });

      it('should be false when future is empty', () => {
        const { result } = renderHook(() => useUndoStack('initial'));

        expect(result.current.canRedo).toBe(false);
      });

      it('should be false after push', () => {
        const { result } = renderHook(() => useUndoStack('initial'));

        act(() => {
          result.current.push('state2');
        });

        act(() => {
          result.current.undo();
        });

        expect(result.current.canRedo).toBe(true);

        act(() => {
          result.current.push('state3');
        });

        expect(result.current.canRedo).toBe(false);
      });
    });

    describe('undoCount', () => {
      it('should reflect past length', () => {
        const { result } = renderHook(() => useUndoStack('state1'));

        expect(result.current.undoCount).toBe(0);

        act(() => {
          result.current.push('state2');
        });

        expect(result.current.undoCount).toBe(1);

        act(() => {
          result.current.push('state3');
        });

        expect(result.current.undoCount).toBe(2);
      });

      it('should decrease on undo', () => {
        const { result } = renderHook(() => useUndoStack('state1'));

        act(() => {
          result.current.push('state2');
          result.current.push('state3');
        });

        expect(result.current.undoCount).toBe(2);

        act(() => {
          result.current.undo();
        });

        expect(result.current.undoCount).toBe(1);
      });

      it('should increase on redo', () => {
        const { result } = renderHook(() => useUndoStack('state1'));

        act(() => {
          result.current.push('state2');
          result.current.push('state3');
        });

        act(() => {
          result.current.undo();
          result.current.undo();
        });

        expect(result.current.undoCount).toBe(0);

        act(() => {
          result.current.redo();
        });

        expect(result.current.undoCount).toBe(1);
      });
    });

    describe('redoCount', () => {
      it('should reflect future length', () => {
        const { result } = renderHook(() => useUndoStack('state1'));

        expect(result.current.redoCount).toBe(0);

        act(() => {
          result.current.push('state2');
        });

        act(() => {
          result.current.undo();
        });

        expect(result.current.redoCount).toBe(1);
      });

      it('should be zero after push', () => {
        const { result } = renderHook(() => useUndoStack('state1'));

        act(() => {
          result.current.push('state2');
          result.current.push('state3');
        });

        act(() => {
          result.current.undo();
        });

        expect(result.current.redoCount).toBe(1);

        act(() => {
          result.current.push('state4');
        });

        expect(result.current.redoCount).toBe(0);
      });

      it('should decrease on redo', () => {
        const { result } = renderHook(() => useUndoStack('state1'));

        act(() => {
          result.current.push('state2');
          result.current.push('state3');
        });

        act(() => {
          result.current.undo();
          result.current.undo();
        });

        expect(result.current.redoCount).toBe(2);

        act(() => {
          result.current.redo();
        });

        expect(result.current.redoCount).toBe(1);
      });
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle multiple undo/redo cycles correctly', () => {
      const { result } = renderHook(() => useUndoStack('A'));

      act(() => {
        result.current.push('B');
        result.current.push('C');
        result.current.push('D');
      });

      expect(result.current.current).toBe('D');

      // Undo twice
      act(() => {
        result.current.undo();
        result.current.undo();
      });

      expect(result.current.current).toBe('B');
      expect(result.current.undoCount).toBe(1);
      expect(result.current.redoCount).toBe(2);

      // Redo once
      act(() => {
        result.current.redo();
      });

      expect(result.current.current).toBe('C');
      expect(result.current.undoCount).toBe(2);
      expect(result.current.redoCount).toBe(1);

      // Push new state (should clear redo)
      act(() => {
        result.current.push('E');
      });

      expect(result.current.current).toBe('E');
      expect(result.current.canRedo).toBe(false);
      expect(result.current.undoCount).toBe(3);
    });

    it('should handle alternating push/undo correctly', () => {
      const { result } = renderHook(() => useUndoStack(0));

      // Initial state: past=[], present=0, future=[]
      act(() => {
        result.current.push(1);
      });
      // After push(1): past=[0], present=1, future=[]
      expect(result.current.current).toBe(1);
      expect(result.current.undoCount).toBe(1);

      act(() => {
        result.current.undo();
      });
      // After undo: past=[], present=0, future=[1]
      expect(result.current.current).toBe(0);
      expect(result.current.undoCount).toBe(0);
      expect(result.current.redoCount).toBe(1);

      act(() => {
        result.current.push(2);
      });
      // After push(2): past=[0], present=2, future=[] (redo cleared)
      expect(result.current.current).toBe(2);
      expect(result.current.undoCount).toBe(1);

      act(() => {
        result.current.undo();
      });
      // After undo: past=[], present=0, future=[2]
      expect(result.current.current).toBe(0);
      expect(result.current.undoCount).toBe(0);

      act(() => {
        result.current.push(3);
      });
      // After push(3): past=[0], present=3, future=[] (redo cleared)
      expect(result.current.current).toBe(3);
      expect(result.current.canRedo).toBe(false);
      expect(result.current.undoCount).toBe(1); // Only [0] in past, not 2
    });

    it('should handle rapid state changes', () => {
      const { result } = renderHook(() => useUndoStack('initial'));

      // Push 10 states rapidly
      act(() => {
        for (let i = 1; i <= 10; i++) {
          result.current.push(`state${i}`);
        }
      });

      expect(result.current.current).toBe('state10');
      expect(result.current.undoCount).toBe(10);
      expect(result.current.redoCount).toBe(0);

      // Undo 5 times - need separate act blocks for state updates
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.undo();
        });
      }

      // After 5 undos from state10: initial -> state1 -> state2 -> state3 -> state4 -> state5
      expect(result.current.current).toBe('state5');
      expect(result.current.undoCount).toBe(5); // [initial, state1, state2, state3, state4] in past
      expect(result.current.redoCount).toBe(5); // [state6, state7, state8, state9, state10] in future
    });

    it('should handle set followed by undo', () => {
      const { result } = renderHook(() => useUndoStack('A'));

      act(() => {
        result.current.push('B');
        result.current.push('C');
        result.current.set('external'); // No history change
      });

      expect(result.current.current).toBe('external');
      expect(result.current.undoCount).toBe(2); // Still A, B in past

      act(() => {
        result.current.undo();
      });

      expect(result.current.current).toBe('B');
    });

    it('should work with mixed data types across operations', () => {
      const { result } = renderHook(() =>
        useUndoStack<string | number | object>(createMockObject({ id: 0 }))
      );

      act(() => {
        result.current.push('string value');
        result.current.push(42);
        result.current.push(createMockObject({ id: 3 }));
      });

      act(() => {
        result.current.undo();
      });

      expect(result.current.current).toBe(42);

      act(() => {
        result.current.undo();
      });

      expect(result.current.current).toBe('string value');
    });

    it('should correctly limit history with many operations', () => {
      const { result } = renderHook(() => useUndoStack(0));

      // Push 100 states (more than MAX_HISTORY_SIZE of 50)
      act(() => {
        for (let i = 1; i <= 100; i++) {
          result.current.push(i);
        }
      });

      expect(result.current.current).toBe(100);
      expect(result.current.undoCount).toBe(50); // Limited to MAX_HISTORY_SIZE

      // Undo all available
      act(() => {
        for (let i = 0; i < 50; i++) {
          result.current.undo();
        }
      });

      expect(result.current.current).toBe(50);
      expect(result.current.canUndo).toBe(false);
    });

    it('should handle undo/redo at boundaries', () => {
      const { result } = renderHook(() => useUndoStack('only'));

      // Try to undo when can't
      let undoResult: string | undefined;
      act(() => {
        undoResult = result.current.undo();
      });

      expect(undoResult).toBeUndefined();
      expect(result.current.current).toBe('only');

      // Try to redo when can't
      let redoResult: string | undefined;
      act(() => {
        redoResult = result.current.redo();
      });

      expect(redoResult).toBeUndefined();
      expect(result.current.current).toBe('only');
    });
  });

  describe('Callbacks Return Values', () => {
    it('undo should return the state being restored', () => {
      const { result } = renderHook(() => useUndoStack('A'));

      act(() => {
        result.current.push('B');
        result.current.push('C');
      });

      let returned: string | undefined;
      act(() => {
        returned = result.current.undo();
      });

      expect(returned).toBe('B');
    });

    it('redo should return the state being restored', () => {
      const { result } = renderHook(() => useUndoStack('A'));

      act(() => {
        result.current.push('B');
        result.current.push('C');
      });

      act(() => {
        result.current.undo();
      });

      let returned: string | undefined;
      act(() => {
        returned = result.current.redo();
      });

      expect(returned).toBe('C');
    });

    it('undo should return undefined when no history', () => {
      const { result } = renderHook(() => useUndoStack('initial'));

      let returned: string | undefined;
      act(() => {
        returned = result.current.undo();
      });

      expect(returned).toBeUndefined();
    });

    it('redo should return undefined when no future', () => {
      const { result } = renderHook(() => useUndoStack('initial'));

      let returned: string | undefined;
      act(() => {
        returned = result.current.redo();
      });

      expect(returned).toBeUndefined();
    });
  });
});
