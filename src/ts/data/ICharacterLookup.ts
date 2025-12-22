/**
 * Character Lookup Service Interface
 *
 * Defines the contract for character validation and search services.
 * Enables dependency injection and testing.
 *
 * @module data/ICharacterLookup
 */

import type { Character } from '@/ts/types/index.js';

// ============================================================================
// Character Lookup Service Interface
// ============================================================================

/**
 * Service for validating and searching character data
 */
export interface ICharacterLookupService {
  /**
   * Initialize or update the character data
   * @param characters - Array of official characters
   */
  updateCharacters(characters: Character[]): void;

  /**
   * Check if a character ID is valid
   * @param id - Character ID to validate
   * @returns true if character exists
   */
  isValidCharacterId(id: string): boolean;

  /**
   * Get character by ID
   * @param id - Character ID
   * @returns Character object or null
   */
  getCharacter(id: string): Character | null;

  /**
   * Search characters by name or ID (fuzzy)
   * @param query - Search query
   * @param limit - Maximum results to return (default: 10)
   * @returns Array of matching characters
   */
  search(query: string, limit?: number): Character[];

  /**
   * Get all characters
   * @returns Array of all characters
   */
  getAllCharacters(): Character[];

  /**
   * Get character count
   * @returns Number of characters in cache
   */
  getCount(): number;

  /**
   * Check if cache needs update
   * @returns true if cache is stale
   */
  isStale(): boolean;

  /**
   * Clear the character cache
   */
  clear(): void;
}
