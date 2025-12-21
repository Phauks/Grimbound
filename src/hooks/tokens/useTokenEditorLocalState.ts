/**
 * useTokenEditorLocalState Hook
 *
 * Manages all local form state for the TokenEditor component.
 * Consolidates 15+ individual useState calls into a single cohesive state object
 * with proper sync to character prop changes.
 *
 * @module hooks/tokens/useTokenEditorLocalState
 */

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import type { Character } from '@/ts/types/index.js';

/**
 * Local state for all editable character fields
 */
export interface TokenEditorLocalState {
  // Basic info
  name: string;
  id: string;
  ability: string;

  // Almanac fields
  flavor: string;
  overview: string;
  examples: string;
  howToRun: string;
  tips: string;

  // Night order
  firstNightReminder: string;
  otherNightReminder: string;
  firstNight: number;
  otherNight: number;

  // Images
  images: string[];

  // UI state
  isIdLinked: boolean;
  previewVariantIndex: number | null;
}

type LocalStateAction =
  | { type: 'SET_FIELD'; field: keyof TokenEditorLocalState; value: TokenEditorLocalState[keyof TokenEditorLocalState] }
  | { type: 'SET_MULTIPLE'; updates: Partial<TokenEditorLocalState> }
  | { type: 'SYNC_FROM_CHARACTER'; character: Character; idLinkedToName: boolean }
  | { type: 'SET_IMAGES'; images: string[] }
  | { type: 'UPDATE_IMAGE'; index: number; value: string }
  | { type: 'ADD_IMAGE' }
  | { type: 'REMOVE_IMAGE'; index: number }
  | { type: 'REORDER_IMAGES'; newImages: string[] };

function localStateReducer(
  state: TokenEditorLocalState,
  action: LocalStateAction
): TokenEditorLocalState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };

    case 'SET_MULTIPLE':
      return { ...state, ...action.updates };

    case 'SYNC_FROM_CHARACTER': {
      const { character, idLinkedToName } = action;
      return {
        name: character.name || '',
        id: character.id || '',
        ability: character.ability || '',
        flavor: character.flavor || '',
        overview: character.overview || '',
        examples: character.examples || '',
        howToRun: character.howToRun || '',
        tips: character.tips || '',
        firstNightReminder: character.firstNightReminder || '',
        otherNightReminder: character.otherNightReminder || '',
        firstNight: character.firstNight ?? 0,
        otherNight: character.otherNight ?? 0,
        images: Array.isArray(character.image) ? character.image : [character.image || ''],
        isIdLinked: idLinkedToName,
        previewVariantIndex: null, // Reset when switching characters
      };
    }

    case 'SET_IMAGES':
      return { ...state, images: action.images };

    case 'UPDATE_IMAGE': {
      const newImages = [...state.images];
      newImages[action.index] = action.value;
      return { ...state, images: newImages };
    }

    case 'ADD_IMAGE':
      return { ...state, images: [...state.images, ''] };

    case 'REMOVE_IMAGE': {
      if (state.images.length <= 1) {
        return { ...state, images: [''] };
      }
      return { ...state, images: state.images.filter((_, i) => i !== action.index) };
    }

    case 'REORDER_IMAGES':
      return { ...state, images: action.newImages };

    default:
      return state;
  }
}

function createInitialState(character: Character, idLinkedToName: boolean): TokenEditorLocalState {
  return {
    name: character.name || '',
    id: character.id || '',
    ability: character.ability || '',
    flavor: character.flavor || '',
    overview: character.overview || '',
    examples: character.examples || '',
    howToRun: character.howToRun || '',
    tips: character.tips || '',
    firstNightReminder: character.firstNightReminder || '',
    otherNightReminder: character.otherNightReminder || '',
    firstNight: character.firstNight ?? 0,
    otherNight: character.otherNight ?? 0,
    images: Array.isArray(character.image) ? character.image : [character.image || ''],
    isIdLinked: idLinkedToName,
    previewVariantIndex: null,
  };
}

export interface UseTokenEditorLocalStateOptions {
  character: Character;
  idLinkedToName: boolean;
  onEditChange: (field: keyof Character, value: Character[keyof Character]) => void;
  onReplaceCharacter?: (character: Character) => void;
  isOfficial?: boolean;
  debounceMs?: number;
}

export interface UseTokenEditorLocalStateResult {
  /** Current local state */
  state: TokenEditorLocalState;

  /** Set a single field value */
  setField: <K extends keyof TokenEditorLocalState>(
    field: K,
    value: TokenEditorLocalState[K]
  ) => void;

  /** Set multiple field values at once */
  setMultiple: (updates: Partial<TokenEditorLocalState>) => void;

  /** Update name with automatic ID sync when linked */
  updateName: (newName: string) => void;

  /** Commit name change (on blur) */
  commitName: () => void;

  /** Toggle ID linking */
  toggleIdLink: (linked: boolean, setMetadata: (uuid: string, data: { idLinkedToName: boolean }) => void, charUuid: string) => void;

  /** Image management */
  images: {
    update: (index: number, value: string) => void;
    add: () => void;
    remove: (index: number) => void;
    reorder: (newImages: string[]) => void;
    commit: () => void;
  };

  /** Create a debounced field handler */
  createDebouncedHandler: (field: keyof Character) => (value: string) => void;

  /** Get the image value for onEditChange (single or array) */
  getImageValue: () => string | string[];
}

/**
 * Hook for managing TokenEditor local form state.
 *
 * Consolidates all local state management, provides debounced updates,
 * and syncs state when the character prop changes.
 */
export function useTokenEditorLocalState({
  character,
  idLinkedToName,
  onEditChange,
  onReplaceCharacter,
  isOfficial = false,
  debounceMs = 500,
}: UseTokenEditorLocalStateOptions): UseTokenEditorLocalStateResult {
  const [state, dispatch] = useReducer(
    localStateReducer,
    { character, idLinkedToName },
    ({ character, idLinkedToName }) => createInitialState(character, idLinkedToName)
  );

  // Debounce timer refs
  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Sync state when character changes
  useEffect(() => {
    dispatch({ type: 'SYNC_FROM_CHARACTER', character, idLinkedToName });
  }, [
    character.uuid,
    character.name,
    character.id,
    character.ability,
    character.flavor,
    character.overview,
    character.examples,
    character.howToRun,
    character.tips,
    character.firstNightReminder,
    character.otherNightReminder,
    character.firstNight,
    character.otherNight,
    character.image,
    idLinkedToName,
  ]);

  // Cleanup debounce timers on unmount
  useEffect(() => {
    return () => {
      debounceTimers.current.forEach((timer) => clearTimeout(timer));
      debounceTimers.current.clear();
    };
  }, []);

  const setField = useCallback(<K extends keyof TokenEditorLocalState>(
    field: K,
    value: TokenEditorLocalState[K]
  ) => {
    dispatch({ type: 'SET_FIELD', field, value });
  }, []);

  const setMultiple = useCallback((updates: Partial<TokenEditorLocalState>) => {
    dispatch({ type: 'SET_MULTIPLE', updates });
  }, []);

  // Helper to convert name to ID
  const nameToId = useCallback((name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '_')
      .replace(/-+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }, []);

  const updateName = useCallback(
    (newName: string) => {
      if (isOfficial) return;
      dispatch({ type: 'SET_FIELD', field: 'name', value: newName });

      // Clear existing timer
      const existingTimer = debounceTimers.current.get('name');
      if (existingTimer) clearTimeout(existingTimer);

      // Debounce the commit
      const timer = setTimeout(() => {
        if (state.isIdLinked && onReplaceCharacter) {
          onReplaceCharacter({
            ...character,
            name: newName,
            id: nameToId(newName),
          });
        } else {
          onEditChange('name', newName);
        }
      }, debounceMs);

      debounceTimers.current.set('name', timer);
    },
    [isOfficial, state.isIdLinked, onReplaceCharacter, character, onEditChange, nameToId, debounceMs]
  );

  const commitName = useCallback(() => {
    if (isOfficial) return;

    // Clear any pending debounce
    const existingTimer = debounceTimers.current.get('name');
    if (existingTimer) clearTimeout(existingTimer);

    if (state.isIdLinked && onReplaceCharacter) {
      onReplaceCharacter({
        ...character,
        name: state.name,
        id: nameToId(state.name),
      });
    } else {
      onEditChange('name', state.name);
    }
  }, [isOfficial, state.isIdLinked, state.name, onReplaceCharacter, character, onEditChange, nameToId]);

  const toggleIdLink = useCallback(
    (
      linked: boolean,
      setMetadata: (uuid: string, data: { idLinkedToName: boolean }) => void,
      charUuid: string
    ) => {
      if (isOfficial) return;

      dispatch({ type: 'SET_FIELD', field: 'isIdLinked', value: linked });

      if (charUuid) {
        setMetadata(charUuid, { idLinkedToName: linked });
      }

      if (linked) {
        const newId = nameToId(state.name);
        dispatch({ type: 'SET_FIELD', field: 'id', value: newId });
        onEditChange('id', newId);
      } else {
        dispatch({ type: 'SET_FIELD', field: 'id', value: nameToId(state.name) });
      }
    },
    [isOfficial, state.name, onEditChange, nameToId]
  );

  const getImageValue = useCallback((): string | string[] => {
    return state.images.length === 1 ? state.images[0] : state.images;
  }, [state.images]);

  const images = useMemo(
    () => ({
      update: (index: number, value: string) => {
        if (isOfficial) return;
        dispatch({ type: 'UPDATE_IMAGE', index, value });

        // Debounce the commit
        const existingTimer = debounceTimers.current.get('image');
        if (existingTimer) clearTimeout(existingTimer);

        const timer = setTimeout(() => {
          const newImages = [...state.images];
          newImages[index] = value;
          const imageValue = newImages.length === 1 ? newImages[0] : newImages;
          onEditChange('image', imageValue);
        }, 800);

        debounceTimers.current.set('image', timer);
      },
      add: () => {
        if (isOfficial) return;
        dispatch({ type: 'ADD_IMAGE' });
        onEditChange('image', [...state.images, '']);
      },
      remove: (index: number) => {
        if (isOfficial) return;
        if (state.images.length <= 1) {
          dispatch({ type: 'REMOVE_IMAGE', index });
          onEditChange('image', '');
        } else {
          const newImages = state.images.filter((_, i) => i !== index);
          dispatch({ type: 'SET_IMAGES', images: newImages });
          onEditChange('image', newImages.length === 1 ? newImages[0] : newImages);
        }
      },
      reorder: (newImages: string[]) => {
        if (isOfficial) return;
        dispatch({ type: 'REORDER_IMAGES', newImages });
        onEditChange('image', newImages.length === 1 ? newImages[0] : newImages);
      },
      commit: () => {
        if (isOfficial) return;
        const existingTimer = debounceTimers.current.get('image');
        if (existingTimer) clearTimeout(existingTimer);
        onEditChange('image', getImageValue());
      },
    }),
    [isOfficial, state.images, onEditChange, getImageValue]
  );

  const createDebouncedHandler = useCallback(
    (field: keyof Character) => {
      return (value: string) => {
        if (isOfficial) return;

        // Update local state immediately
        if (field in state) {
          dispatch({ type: 'SET_FIELD', field: field as keyof TokenEditorLocalState, value });
        }

        // Clear existing timer for this field
        const existingTimer = debounceTimers.current.get(field);
        if (existingTimer) clearTimeout(existingTimer);

        // Set new debounced commit
        const timer = setTimeout(() => {
          onEditChange(field, value);
        }, debounceMs);

        debounceTimers.current.set(field, timer);
      };
    },
    [isOfficial, state, onEditChange, debounceMs]
  );

  return {
    state,
    setField,
    setMultiple,
    updateName,
    commitName,
    toggleIdLink,
    images,
    createDebouncedHandler,
    getImageValue,
  };
}

export default useTokenEditorLocalState;
