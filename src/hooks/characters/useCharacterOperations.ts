/**
 * useCharacterOperations Hook
 *
 * Manages character CRUD operations:
 * - Add new character
 * - Delete character
 * - Duplicate character
 * - Change character team
 *
 * This is an orchestrator hook that composes:
 * - useCharacterCRUD: Add, delete, duplicate operations
 * - useCharacterMetadata: Team changes, metadata updates
 *
 * Extracted from CharactersView for better separation of concerns.
 *
 * @module hooks/characters/useCharacterOperations
 */

import type {
  Character,
  CharacterMetadata,
  GenerationOptions,
  Team,
  Token,
} from '@/ts/types/index.js';
import { useCharacterCRUD } from './useCharacterCRUD.js';
import { useCharacterMetadata } from './useCharacterMetadata.js';

// ============================================================================
// Types
// ============================================================================

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
  // CRUD operations (add, delete, duplicate)
  const crud = useCharacterCRUD({
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
  });

  // Metadata operations (team change, etc.)
  const metadata = useCharacterMetadata({
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
  });

  return {
    handleAddCharacter: crud.handleAddCharacter,
    handleDeleteCharacter: crud.handleDeleteCharacter,
    handleDuplicateCharacter: crud.handleDuplicateCharacter,
    handleChangeTeam: metadata.handleChangeTeam,
  };
}

export default useCharacterOperations;
