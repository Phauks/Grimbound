/**
 * useCharacterEditor Hook
 *
 * Manages character editing state with:
 * - Edited character state isolated from source data
 * - Dirty tracking for unsaved changes
 * - Debounced auto-save to JSON and characters array
 * - Flush on unmount to prevent data loss
 * - Sync with selected character changes
 *
 * Extracted from CharactersView for better separation of concerns.
 *
 * @module hooks/characters/useCharacterEditor
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { SAVE_DEBOUNCE_MS, isIdLinkedToName } from '@/ts/data/characterUtils.js';
import type { Character, CharacterMetadata } from '@/ts/types/index.js';
import { updateCharacterInJson } from '@/ts/ui/detailViewUtils.js';
import { logger } from '@/ts/utils/logger.js';

export interface UseCharacterEditorOptions {
  /** Currently selected character UUID */
  selectedCharacterUuid: string;
  /** All characters in the script */
  characters: Character[];
  /** Current JSON input string */
  jsonInput: string;
  /** Setter for JSON input */
  setJsonInput: (json: string) => void;
  /** Setter for characters array */
  setCharacters: (chars: Character[]) => void;
  /** Set metadata for a character */
  setMetadata: (uuid: string, meta: Partial<CharacterMetadata>) => void;
  /** Callback when cache should be invalidated for a character */
  onCacheInvalidate?: (uuid: string) => void;
}

export interface UseCharacterEditorResult {
  /** The character being edited (isolated copy) */
  editedCharacter: Character | null;
  /** Whether there are unsaved changes */
  isDirty: boolean;
  /** Update a single field on the edited character */
  handleEditChange: <K extends keyof Character>(field: K, value: Character[K]) => void;
  /** Replace the entire edited character */
  handleReplaceCharacter: (char: Character) => void;
  /** Reset editor to a new character (used when selection changes externally) */
  resetToCharacter: (uuid: string) => void;
  /** The original UUID when editing started (for tracking ID changes) */
  originalCharacterUuid: string;
}

/**
 * Hook for managing character editing with auto-save.
 *
 * @example
 * ```tsx
 * const {
 *   editedCharacter,
 *   isDirty,
 *   handleEditChange,
 *   handleReplaceCharacter,
 * } = useCharacterEditor({
 *   selectedCharacterUuid,
 *   characters,
 *   jsonInput,
 *   setJsonInput,
 *   setCharacters,
 *   setMetadata,
 * });
 *
 * // Update a field
 * handleEditChange('name', 'New Name');
 *
 * // Replace entire character (e.g., from JSON editor)
 * handleReplaceCharacter(parsedCharacter);
 * ```
 */
export function useCharacterEditor({
  selectedCharacterUuid,
  characters,
  jsonInput,
  setJsonInput,
  setCharacters,
  setMetadata,
  onCacheInvalidate,
}: UseCharacterEditorOptions): UseCharacterEditorResult {
  // Edited character state (isolated copy for editing)
  const [editedCharacter, setEditedCharacter] = useState<Character | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Refs for tracking and avoiding dependency cycles
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const originalCharacterUuidRef = useRef<string>(selectedCharacterUuid);
  const justSavedRef = useRef(false);
  const pendingSaveRef = useRef<Character | null>(null);
  const jsonInputRef = useRef(jsonInput);
  const charactersRef = useRef(characters);

  // Keep refs in sync
  jsonInputRef.current = jsonInput;
  charactersRef.current = characters;

  // Sync editedCharacter when selected character changes
  useEffect(() => {
    // Skip if we just saved - the editedCharacter is already up to date
    if (justSavedRef.current) {
      justSavedRef.current = false;
      return;
    }

    if (selectedCharacterUuid && characters.length > 0) {
      const char = characters.find((c) => c.uuid === selectedCharacterUuid);
      if (char && editedCharacter?.uuid !== char.uuid) {
        // Deep clone to isolate from source
        setEditedCharacter(JSON.parse(JSON.stringify(char)));
        setIsDirty(false);
        originalCharacterUuidRef.current = selectedCharacterUuid;
      }
    }
  }, [selectedCharacterUuid, characters, editedCharacter?.uuid]);

  // Perform save operation
  const performSave = useCallback(
    (charToSave: Character) => {
      try {
        // Mark that we're saving to prevent sync effect from resetting editedCharacter
        justSavedRef.current = true;

        // Use originalCharacterUuidRef to find the character (in case ID was changed)
        const origUuid = originalCharacterUuidRef.current;
        const origChar = charactersRef.current.find((c) => c.uuid === origUuid);
        const origId = origChar?.id || charToSave.id;

        // Update JSON
        const updatedJson = updateCharacterInJson(jsonInputRef.current, origId, charToSave);
        setJsonInput(updatedJson);

        // Update characters array - match by UUID
        const updatedChars = charactersRef.current.map((c) =>
          c.uuid === origUuid ? charToSave : c
        );
        setCharacters(updatedChars);

        // Update metadata - check if ID still matches name-derived ID
        if (charToSave.uuid) {
          setMetadata(charToSave.uuid, { idLinkedToName: isIdLinkedToName(charToSave) });
        }

        setIsDirty(false);
        pendingSaveRef.current = null;
      } catch (error) {
        logger.error('useCharacterEditor', 'Save failed', error);
        justSavedRef.current = false;
      }
    },
    [setJsonInput, setCharacters, setMetadata]
  );

  // Debounced save effect
  useEffect(() => {
    if (!(isDirty && editedCharacter)) return;

    // Track pending save for flush on unmount
    pendingSaveRef.current = editedCharacter;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      performSave(editedCharacter);
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [isDirty, editedCharacter, performSave]);

  // Flush pending save on unmount to prevent data loss
  useEffect(() => {
    return () => {
      if (pendingSaveRef.current) {
        // Cancel the debounced timer
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
        }
        // Flush the save immediately
        const charToSave = pendingSaveRef.current;
        try {
          justSavedRef.current = true;
          const origUuid = originalCharacterUuidRef.current;
          const origChar = charactersRef.current.find((c) => c.uuid === origUuid);
          const origId = origChar?.id || charToSave.id;
          const updatedJson = updateCharacterInJson(jsonInputRef.current, origId, charToSave);
          setJsonInput(updatedJson);
          const updatedChars = charactersRef.current.map((c) =>
            c.uuid === origUuid ? charToSave : c
          );
          setCharacters(updatedChars);
        } catch (error) {
          logger.error('useCharacterEditor', 'Flush save failed on unmount', error);
        }
      }
    };
  }, [setJsonInput, setCharacters]);

  // Handle single field edit
  const handleEditChange = useCallback(
    <K extends keyof Character>(field: K, value: Character[K]) => {
      setEditedCharacter((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          [field]: value,
        };
      });
      setIsDirty(true);

      // Invalidate cache for this character since it changed
      if (onCacheInvalidate && selectedCharacterUuid) {
        onCacheInvalidate(selectedCharacterUuid);
      }
    },
    [onCacheInvalidate, selectedCharacterUuid]
  );

  // Handle full character replacement
  const handleReplaceCharacter = useCallback(
    (newCharacter: Character) => {
      setEditedCharacter(newCharacter);
      setIsDirty(true);

      // Invalidate cache
      if (onCacheInvalidate && newCharacter.uuid) {
        onCacheInvalidate(newCharacter.uuid);
      }
    },
    [onCacheInvalidate]
  );

  // Reset editor to a new character (for external selection changes)
  const resetToCharacter = useCallback(
    (uuid: string) => {
      const char = charactersRef.current.find((c) => c.uuid === uuid);
      if (char) {
        setEditedCharacter(JSON.parse(JSON.stringify(char)));
        setIsDirty(false);
        originalCharacterUuidRef.current = uuid;
      }
    },
    []
  );

  return {
    editedCharacter,
    isDirty,
    handleEditChange,
    handleReplaceCharacter,
    resetToCharacter,
    originalCharacterUuid: originalCharacterUuidRef.current,
  };
}

export default useCharacterEditor;
