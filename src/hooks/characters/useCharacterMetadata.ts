/**
 * useCharacterMetadata Hook
 *
 * Handles character metadata operations:
 * - Change character team
 * - Update character properties
 *
 * Extracted from useCharacterOperations for better separation of concerns.
 *
 * @module hooks/characters/useCharacterMetadata
 */

import { useCallback } from 'react';
import type { Character, GenerationOptions, Team, Token } from '@/ts/types/index.js';
import { regenerateCharacterAndReminders, updateCharacterInJson } from '@/ts/ui/detailViewUtils.js';
import { logger } from '@/ts/utils/logger.js';

// ============================================================================
// Types
// ============================================================================

export interface UseCharacterMetadataOptions {
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
  /** Currently selected character UUID */
  selectedCharacterUuid: string;
  /** Setter for edited character */
  setEditedCharacter: (char: Character | null) => void;
  /** Toast notification function */
  addToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export interface UseCharacterMetadataResult {
  /** Change a character's team */
  handleChangeTeam: (characterId: string, newTeam: Team) => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useCharacterMetadata({
  characters,
  tokens,
  jsonInput,
  generationOptions,
  setCharacters,
  setTokens,
  setJsonInput,
  selectedCharacterUuid,
  setEditedCharacter,
  addToast,
}: UseCharacterMetadataOptions): UseCharacterMetadataResult {
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
        logger.error('useCharacterMetadata', 'Failed to update JSON', e);
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
          logger.error('useCharacterMetadata', 'Failed to regenerate tokens', error);
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
    handleChangeTeam,
  };
}

export default useCharacterMetadata;
