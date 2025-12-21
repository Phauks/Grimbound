/**
 * useCharacterOperations Hook
 *
 * Manages character CRUD operations:
 * - Add new character
 * - Delete character
 * - Duplicate character
 * - Change character team
 *
 * Extracted from CharactersView for better separation of concerns.
 *
 * @module hooks/characters/useCharacterOperations
 */

import { useCallback, useEffect, useRef } from 'react';
import { createCharacterTemplate, isIdLinkedToName } from '@/ts/data/characterUtils.js';
import type { Character, CharacterMetadata, GenerationOptions, Team, Token } from '@/ts/types/index.js';
import { regenerateCharacterAndReminders, updateCharacterInJson } from '@/ts/ui/detailViewUtils.js';
import { logger } from '@/ts/utils/logger.js';
import { generateStableUuid, nameToId } from '@/ts/utils/nameGenerator.js';

export interface UseCharacterOperationsOptions {
  /** All characters in the script */
  characters: Character[];
  /** All tokens */
  tokens: Token[];
  /** Current JSON input string */
  jsonInput: string;
  /** Current generation options */
  generationOptions: GenerationOptions;
  /** Setter for characters array */
  setCharacters: (chars: Character[]) => void;
  /** Setter for tokens array */
  setTokens: (tokens: Token[]) => void;
  /** Setter for JSON input */
  setJsonInput: (json: string) => void;
  /** Set metadata for a character */
  setMetadata: (uuid: string, meta: Partial<CharacterMetadata>) => void;
  /** Delete metadata for a character */
  deleteMetadata: (uuid: string) => void;
  /** Get metadata for a character */
  getMetadata: (uuid: string) => CharacterMetadata | undefined;
  /** Toast notification function */
  addToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  /** Currently selected character UUID */
  selectedCharacterUuid: string;
  /** Setter for selected character UUID */
  setSelectedCharacterUuid: (uuid: string) => void;
  /** Setter for edited character */
  setEditedCharacter: (char: Character | null) => void;
  /** Callback when a new character is created (for tracking) */
  onCharacterCreated?: (uuid: string) => void;
  /** Whether to create a new character on mount */
  createNewCharacter?: boolean;
}

export interface UseCharacterOperationsResult {
  /** Add a new character */
  handleAddCharacter: () => Promise<void>;
  /** Delete a character by ID (or selected if not provided) */
  handleDeleteCharacter: (characterId?: string) => void;
  /** Duplicate a character by ID */
  handleDuplicateCharacter: (characterId: string) => Promise<void>;
  /** Change a character's team */
  handleChangeTeam: (characterId: string, newTeam: Team) => void;
}

// ============================================================================
// Helper: Update JSON with new character
// ============================================================================

function updateJsonWithNewCharacter(
  jsonInput: string,
  newCharacter: Character,
  setJsonInput: (json: string) => void
): void {
  try {
    if (jsonInput.trim()) {
      const parsed = JSON.parse(jsonInput);
      if (Array.isArray(parsed)) {
        parsed.push(newCharacter);
        setJsonInput(JSON.stringify(parsed, null, 2));
      }
    } else {
      setJsonInput(JSON.stringify([newCharacter], null, 2));
    }
  } catch {
    setJsonInput(JSON.stringify([newCharacter], null, 2));
  }
}

// ============================================================================
// Helper: Create and add a new character
// ============================================================================

interface CreateCharacterContext {
  characters: Character[];
  tokens: Token[];
  jsonInput: string;
  generationOptions: GenerationOptions;
  setCharacters: (chars: Character[]) => void;
  setTokens: (tokens: Token[]) => void;
  setJsonInput: (json: string) => void;
  setMetadata: (uuid: string, meta: Partial<CharacterMetadata>) => void;
}

async function createAndAddCharacter(ctx: CreateCharacterContext): Promise<Character> {
  const newCharacter = await createCharacterTemplate();

  // Initialize metadata
  ctx.setMetadata(newCharacter.uuid!, { idLinkedToName: isIdLinkedToName(newCharacter) });

  // Update characters array
  const updatedCharacters = [...ctx.characters, newCharacter];
  ctx.setCharacters(updatedCharacters);

  // Update JSON
  updateJsonWithNewCharacter(ctx.jsonInput, newCharacter, ctx.setJsonInput);

  // Generate tokens (fire and forget with error logging)
  regenerateCharacterAndReminders(newCharacter, ctx.generationOptions)
    .then(({ characterToken, reminderTokens: newReminderTokens }) => {
      ctx.setTokens([...ctx.tokens, characterToken, ...newReminderTokens]);
    })
    .catch((error) => {
      logger.error('createAndAddCharacter', 'Token generation failed', error);
    });

  return newCharacter;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing character CRUD operations.
 *
 * @example
 * ```tsx
 * const {
 *   handleAddCharacter,
 *   handleDeleteCharacter,
 *   handleDuplicateCharacter,
 *   handleChangeTeam,
 * } = useCharacterOperations({
 *   characters,
 *   tokens,
 *   jsonInput,
 *   generationOptions,
 *   setCharacters,
 *   setTokens,
 *   setJsonInput,
 *   setMetadata,
 *   deleteMetadata,
 *   getMetadata,
 *   addToast,
 *   selectedCharacterUuid,
 *   setSelectedCharacterUuid,
 *   setEditedCharacter,
 * });
 * ```
 */
export function useCharacterOperations({
  characters,
  tokens,
  jsonInput,
  generationOptions,
  setCharacters,
  setTokens,
  setJsonInput,
  setMetadata,
  deleteMetadata,
  getMetadata,
  addToast,
  selectedCharacterUuid,
  setSelectedCharacterUuid,
  setEditedCharacter,
  onCharacterCreated,
  createNewCharacter,
}: UseCharacterOperationsOptions): UseCharacterOperationsResult {
  // Track if we've created a new character on mount
  const hasCreatedNewCharacterRef = useRef(false);

  // Create context for character creation helper
  const getContext = useCallback((): CreateCharacterContext => ({
    characters,
    tokens,
    jsonInput,
    generationOptions,
    setCharacters,
    setTokens,
    setJsonInput,
    setMetadata,
  }), [characters, tokens, jsonInput, generationOptions, setCharacters, setTokens, setJsonInput, setMetadata]);

  // Create new character on mount if requested
  useEffect(() => {
    if (createNewCharacter && !hasCreatedNewCharacterRef.current) {
      hasCreatedNewCharacterRef.current = true;

      createAndAddCharacter(getContext())
        .then((newCharacter) => {
          setSelectedCharacterUuid(newCharacter.uuid!);
          setEditedCharacter(newCharacter);
          onCharacterCreated?.(newCharacter.uuid!);
          addToast('New character created', 'success');
        })
        .catch((error) => {
          logger.error('useCharacterOperations', 'Failed to create character on mount', error);
        });
    }
  }, [
    createNewCharacter,
    getContext,
    setSelectedCharacterUuid,
    setEditedCharacter,
    onCharacterCreated,
    addToast,
  ]);

  // Add a new character
  const handleAddCharacter = useCallback(async () => {
    try {
      const newCharacter = await createAndAddCharacter(getContext());
      setSelectedCharacterUuid(newCharacter.uuid!);
      setEditedCharacter(newCharacter);
      onCharacterCreated?.(newCharacter.uuid!);
      addToast('New character created', 'success');
    } catch (error) {
      logger.error('useCharacterOperations', 'Failed to add character', error);
      addToast('Failed to create character', 'error');
    }
  }, [getContext, setSelectedCharacterUuid, setEditedCharacter, onCharacterCreated, addToast]);

  // Delete a character
  const handleDeleteCharacter = useCallback(
    (characterId?: string) => {
      // If no characterId provided, delete the currently selected character
      const charToDelete = characterId
        ? characters.find((c) => c.id === characterId)
        : characters.find((c) => c.uuid === selectedCharacterUuid);

      if (!charToDelete) return;

      // Delete metadata for this character
      if (charToDelete.uuid) {
        deleteMetadata(charToDelete.uuid);
      }

      const updatedCharacters = characters.filter((c) => c.uuid !== charToDelete.uuid);
      setCharacters(updatedCharacters);

      // Filter tokens by UUID
      const updatedTokens = tokens.filter((t) => t.parentUuid !== charToDelete.uuid);
      setTokens(updatedTokens);

      // Update JSON
      try {
        const parsed = JSON.parse(jsonInput);
        if (Array.isArray(parsed)) {
          const updatedParsed = parsed.filter((item: Character | string) => {
            if (typeof item === 'string') return item !== charToDelete.id;
            if (typeof item === 'object') return item.id !== charToDelete.id;
            return true;
          });
          setJsonInput(JSON.stringify(updatedParsed, null, 2));
        }
      } catch (e) {
        logger.error('useCharacterOperations', 'Failed to update JSON', e);
      }

      // If we deleted the selected character, select another one
      if (charToDelete.uuid === selectedCharacterUuid) {
        if (updatedCharacters.length > 0) {
          setSelectedCharacterUuid(updatedCharacters[0].uuid || '');
        } else {
          setSelectedCharacterUuid('');
          setEditedCharacter(null);
        }
      }

      addToast(`Deleted ${charToDelete.name}`, 'success');
    },
    [
      characters,
      tokens,
      jsonInput,
      selectedCharacterUuid,
      setCharacters,
      setTokens,
      setJsonInput,
      deleteMetadata,
      setSelectedCharacterUuid,
      setEditedCharacter,
      addToast,
    ]
  );

  // Duplicate a character
  const handleDuplicateCharacter = useCallback(
    async (characterId: string) => {
      const charToDuplicate = characters.find((c) => c.id === characterId);
      if (!charToDuplicate) return;

      try {
        const newId = `${charToDuplicate.id}_copy_${Date.now()}`;
        const newName = `${charToDuplicate.name} (Copy)`;
        const newUuid = await generateStableUuid(newId, newName);
        const newCharacter: Character = {
          ...JSON.parse(JSON.stringify(charToDuplicate)),
          id: newId,
          name: newName,
          uuid: newUuid,
          source: 'custom', // Duplicates are always custom
        };

        // Copy metadata from original character, but verify idLinkedToName
        if (charToDuplicate.uuid) {
          const originalMetadata = getMetadata(charToDuplicate.uuid);
          setMetadata(newUuid, { ...originalMetadata, idLinkedToName: isIdLinkedToName(newCharacter) });
        } else {
          setMetadata(newUuid, { idLinkedToName: isIdLinkedToName(newCharacter) });
        }

        const charIndex = characters.findIndex((c) => c.id === characterId);
        const updatedCharacters = [...characters];
        updatedCharacters.splice(charIndex + 1, 0, newCharacter);
        setCharacters(updatedCharacters);

        // Update JSON
        try {
          const parsed = JSON.parse(jsonInput);
          if (Array.isArray(parsed)) {
            const jsonIndex = parsed.findIndex((item: Character | string) => {
              if (typeof item === 'string') return item === characterId;
              if (typeof item === 'object') return item.id === characterId;
              return false;
            });
            if (jsonIndex !== -1) {
              parsed.splice(jsonIndex + 1, 0, newCharacter);
              setJsonInput(JSON.stringify(parsed, null, 2));
            }
          }
        } catch (e) {
          logger.error('useCharacterOperations', 'Failed to update JSON', e);
        }

        setSelectedCharacterUuid(newUuid);
        addToast(`Duplicated ${charToDuplicate.name}`, 'success');

        // Generate tokens for the duplicated character
        regenerateCharacterAndReminders(newCharacter, generationOptions)
          .then(({ characterToken, reminderTokens: newReminderTokens }) => {
            const updatedTokens = [...tokens, characterToken, ...newReminderTokens];
            setTokens(updatedTokens);
          })
          .catch((error) => {
            logger.error('useCharacterOperations', 'Failed to generate tokens for duplicated character', error);
          });
      } catch (error) {
        logger.error('useCharacterOperations', 'Failed to duplicate character', error);
        addToast('Failed to duplicate character', 'error');
      }
    },
    [
      characters,
      tokens,
      jsonInput,
      generationOptions,
      setCharacters,
      setTokens,
      setJsonInput,
      setMetadata,
      getMetadata,
      setSelectedCharacterUuid,
      addToast,
    ]
  );

  // Change a character's team
  const handleChangeTeam = useCallback(
    (characterId: string, newTeam: Team) => {
      const char = characters.find((c) => c.id === characterId);
      if (!char) return;

      const updatedChar = { ...char, team: newTeam };
      const updatedCharacters = characters.map((c) => (c.id === characterId ? updatedChar : c));
      setCharacters(updatedCharacters);

      // Update JSON
      try {
        const updatedJson = updateCharacterInJson(jsonInput, characterId, updatedChar);
        setJsonInput(updatedJson);
      } catch (e) {
        logger.error('useCharacterOperations', 'Failed to update JSON', e);
      }

      // Regenerate tokens for this character
      regenerateCharacterAndReminders(updatedChar, generationOptions)
        .then(({ characterToken, reminderTokens: newReminderTokens }) => {
          const updatedTokens = tokens.filter((t) => {
            if (t.type === 'character' && t.name === char.name) return false;
            if (t.type === 'reminder' && t.parentCharacter === char.name) return false;
            return true;
          });
          updatedTokens.push(characterToken, ...newReminderTokens);
          setTokens(updatedTokens);
        })
        .catch((error) => {
          logger.error('useCharacterOperations', 'Failed to regenerate tokens', error);
        });

      // If this was the selected character (by UUID), update its edited state
      if (char.uuid === selectedCharacterUuid) {
        setEditedCharacter({ ...char, team: newTeam });
      }

      addToast(`Moved ${char.name} to ${newTeam}`, 'success');
    },
    [
      characters,
      tokens,
      jsonInput,
      generationOptions,
      selectedCharacterUuid,
      setCharacters,
      setTokens,
      setJsonInput,
      setEditedCharacter,
      addToast,
    ]
  );

  return {
    handleAddCharacter,
    handleDeleteCharacter,
    handleDuplicateCharacter,
    handleChangeTeam,
  };
}

export default useCharacterOperations;
