/**
 * Blood on the Clocktower Token Generator
 * Character Lookup Service - Fast character validation and search
 *
 * Features:
 * - Character ID validation against official data
 * - Fuzzy search by name or ID
 * - Caches results for performance
 * - Integrates with DataSync service
 */

import type { Character } from '@/ts/types/index.js';
import { logger } from '@/ts/utils/logger.js';

/**
 * Character Lookup Service
 * Provides fast validation and search against official character data
 */
export class CharacterLookupService {
  private characters: Character[] = [];
  private characterMap: Map<string, Character> = new Map();
  private lastUpdate: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Initialize or update the character data
   * @param characters - Array of official characters
   */
  updateCharacters(characters: Character[]): void {
    this.characters = characters;
    this.characterMap.clear();

    // Build fast lookup map (case-insensitive)
    for (const character of characters) {
      this.characterMap.set(character.id.toLowerCase(), character);
    }

    this.lastUpdate = Date.now();
    logger.info('CharacterLookup', `Updated with ${characters.length} characters`);
  }

  /**
   * Check if a character ID is valid
   * @param id - Character ID to validate
   * @returns true if character exists
   */
  isValidCharacterId(id: string): boolean {
    if (!id || typeof id !== 'string') return false;
    return this.characterMap.has(id.toLowerCase());
  }

  /**
   * Get character by ID
   * @param id - Character ID
   * @returns Character object or null
   */
  getCharacter(id: string): Character | null {
    if (!id || typeof id !== 'string') return null;
    return this.characterMap.get(id.toLowerCase()) || null;
  }

  /**
   * Search characters by name or ID (fuzzy)
   * @param query - Search query
   * @param limit - Maximum results to return (default: 10)
   * @returns Array of matching characters
   */
  search(query: string, limit: number = 10): Character[] {
    if (!query || typeof query !== 'string') return [];

    const lowerQuery = query.toLowerCase();
    const results: Array<{ character: Character; score: number }> = [];

    for (const character of this.characters) {
      const score = this.calculateMatchScore(character, lowerQuery);
      if (score > 0) {
        results.push({ character, score });
      }
    }

    // Sort by score (highest first) and return top N
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit).map((r) => r.character);
  }

  /**
   * Calculate match score for a character against a query
   * Higher score = better match
   */
  private calculateMatchScore(character: Character, lowerQuery: string): number {
    const id = character.id.toLowerCase();
    const name = character.name.toLowerCase();

    // Exact ID match (highest priority)
    if (id === lowerQuery) return 1000;

    // Exact name match
    if (name === lowerQuery) return 900;

    // ID starts with query
    if (id.startsWith(lowerQuery)) return 800;

    // Name starts with query
    if (name.startsWith(lowerQuery)) return 700;

    // ID contains query
    if (id.includes(lowerQuery)) return 600;

    // Name contains query
    if (name.includes(lowerQuery)) return 500;

    // Word boundary match in name
    const words = name.split(/\s+/);
    for (const word of words) {
      if (word.startsWith(lowerQuery)) return 400;
    }

    return 0; // No match
  }

  /**
   * Get all characters
   * @returns Array of all characters
   */
  getAllCharacters(): Character[] {
    return [...this.characters];
  }

  /**
   * Get character count
   * @returns Number of characters in cache
   */
  getCount(): number {
    return this.characters.length;
  }

  /**
   * Check if cache needs update
   * @returns true if cache is stale
   */
  isStale(): boolean {
    if (this.characters.length === 0) return true;
    return Date.now() - this.lastUpdate > this.CACHE_TTL;
  }

  /**
   * Clear the character cache
   */
  clear(): void {
    this.characters = [];
    this.characterMap.clear();
    this.lastUpdate = 0;
  }
}

// Export singleton instance
export const characterLookup = new CharacterLookupService();

export default characterLookup;
