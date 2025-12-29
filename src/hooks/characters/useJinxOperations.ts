/**
 * useJinxOperations Hook
 *
 * Handles jinx CRUD operations for a character.
 * Provides add, update, remove, and reorder functionality for jinxes.
 *
 * @module hooks/characters/useJinxOperations
 */

import { useCallback, useMemo } from 'react';
import type { Character, Jinx } from '@/ts/types/index.js';

// ============================================================================
// Types
// ============================================================================

export interface UseJinxOperationsOptions {
  /** The character being edited */
  character: Character;
  /** Callback to update character jinxes */
  onJinxesChange: (jinxes: Jinx[]) => void;
  /** Whether editing is disabled (e.g., official characters) */
  disabled?: boolean;
}

export interface UseJinxOperationsResult {
  /** Current jinxes array (never undefined) */
  jinxes: Jinx[];
  /** Add a new empty jinx */
  add: () => void;
  /** Update a jinx at the specified index */
  update: (index: number, updates: Partial<Jinx>) => void;
  /** Remove a jinx at the specified index */
  remove: (index: number) => void;
  /** Replace the entire jinxes array (for reordering) */
  reorder: (newJinxes: Jinx[]) => void;
  /** Whether operations are disabled */
  isDisabled: boolean;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useJinxOperations({
  character,
  onJinxesChange,
  disabled = false,
}: UseJinxOperationsOptions): UseJinxOperationsResult {
  // Memoize the jinxes array to avoid creating new references
  const jinxes = useMemo(() => character.jinxes ?? [], [character.jinxes]);

  // Add a new empty jinx
  const add = useCallback(() => {
    if (disabled) return;
    const newJinxes: Jinx[] = [...jinxes, { id: '', reason: '' }];
    onJinxesChange(newJinxes);
  }, [disabled, jinxes, onJinxesChange]);

  // Update a jinx at the specified index
  const update = useCallback(
    (index: number, updates: Partial<Jinx>) => {
      if (disabled) return;
      if (index < 0 || index >= jinxes.length) return;

      const newJinxes = [...jinxes];
      newJinxes[index] = { ...newJinxes[index], ...updates };
      onJinxesChange(newJinxes);
    },
    [disabled, jinxes, onJinxesChange]
  );

  // Remove a jinx at the specified index
  const remove = useCallback(
    (index: number) => {
      if (disabled) return;
      if (index < 0 || index >= jinxes.length) return;

      const newJinxes = [...jinxes];
      newJinxes.splice(index, 1);
      onJinxesChange(newJinxes);
    },
    [disabled, jinxes, onJinxesChange]
  );

  // Replace the entire jinxes array (for reordering via drag-and-drop)
  const reorder = useCallback(
    (newJinxes: Jinx[]) => {
      if (disabled) return;
      onJinxesChange(newJinxes);
    },
    [disabled, onJinxesChange]
  );

  return {
    jinxes,
    add,
    update,
    remove,
    reorder,
    isDisabled: disabled,
  };
}

export default useJinxOperations;
