/**
 * useUndoStack Hook
 *
 * Manages undo/redo stack for state changes with history limit.
 *
 * @module hooks/ui/useUndoStack
 */

import { useCallback, useReducer } from 'react';

const MAX_HISTORY_SIZE = 50;

interface UndoState<T> {
  past: T[];
  present: T;
  future: T[];
}

type UndoAction<T> =
  | { type: 'PUSH'; payload: T }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'CLEAR'; payload: T }
  | { type: 'SET'; payload: T };

function undoReducer<T>(state: UndoState<T>, action: UndoAction<T>): UndoState<T> {
  switch (action.type) {
    case 'PUSH': {
      // Don't push if value is same as present
      if (action.payload === state.present) {
        return state;
      }
      const newPast = [...state.past, state.present];
      // Limit history size
      if (newPast.length > MAX_HISTORY_SIZE) {
        newPast.shift();
      }
      return {
        past: newPast,
        present: action.payload,
        future: [], // Clear redo stack on new action
      };
    }

    case 'UNDO': {
      if (state.past.length === 0) {
        return state;
      }
      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, -1);
      return {
        past: newPast,
        present: previous,
        future: [state.present, ...state.future],
      };
    }

    case 'REDO': {
      if (state.future.length === 0) {
        return state;
      }
      const next = state.future[0];
      const newFuture = state.future.slice(1);
      return {
        past: [...state.past, state.present],
        present: next,
        future: newFuture,
      };
    }

    case 'CLEAR': {
      return {
        past: [],
        present: action.payload,
        future: [],
      };
    }

    case 'SET': {
      // Set without adding to history (for external sync)
      return {
        ...state,
        present: action.payload,
      };
    }

    default:
      return state;
  }
}

export interface UseUndoStackReturn<T> {
  /** Current value */
  current: T;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether redo is available */
  canRedo: boolean;
  /** Number of undo steps available */
  undoCount: number;
  /** Number of redo steps available */
  redoCount: number;
  /** Push a new value onto the stack */
  push: (value: T) => void;
  /** Undo to previous value, returns the value or undefined if nothing to undo */
  undo: () => T | undefined;
  /** Redo to next value, returns the value or undefined if nothing to redo */
  redo: () => T | undefined;
  /** Clear all history and set to new value */
  clear: (value: T) => void;
  /** Set value without adding to history */
  set: (value: T) => void;
}

/**
 * Hook for managing undo/redo stack
 * @param initialValue - Initial value for the stack
 * @returns Undo stack state and actions
 */
export function useUndoStack<T>(initialValue: T): UseUndoStackReturn<T> {
  const [state, dispatch] = useReducer(undoReducer<T>, {
    past: [],
    present: initialValue,
    future: [],
  });

  const push = useCallback((value: T) => {
    dispatch({ type: 'PUSH', payload: value });
  }, []);

  const undo = useCallback((): T | undefined => {
    if (state.past.length === 0) return undefined;
    const previous = state.past[state.past.length - 1];
    dispatch({ type: 'UNDO' });
    return previous;
  }, [state.past]);

  const redo = useCallback((): T | undefined => {
    if (state.future.length === 0) return undefined;
    const next = state.future[0];
    dispatch({ type: 'REDO' });
    return next;
  }, [state.future]);

  const clear = useCallback((value: T) => {
    dispatch({ type: 'CLEAR', payload: value });
  }, []);

  const set = useCallback((value: T) => {
    dispatch({ type: 'SET', payload: value });
  }, []);

  return {
    current: state.present,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    undoCount: state.past.length,
    redoCount: state.future.length,
    push,
    undo,
    redo,
    clear,
    set,
  };
}
