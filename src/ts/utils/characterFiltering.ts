import type { Character, CharacterMetadata } from '@/ts/types/index.js';

/**
 * Check if a single character is enabled based on metadata
 * @param uuid - Character UUID or ID
 * @param metadata - Map of character metadata
 * @returns true if enabled (undefined or true), false if explicitly disabled
 */
export function isCharacterEnabled(
  uuid: string,
  metadata: Map<string, CharacterMetadata>
): boolean {
  const meta = metadata.get(uuid);
  return meta?.enabled !== false;
}

/**
 * Filter characters to only those that are enabled
 * @param characters - Array of characters to filter
 * @param metadata - Map of character metadata
 * @returns Array of enabled characters only
 */
export function filterEnabledCharacters(
  characters: Character[],
  metadata: Map<string, CharacterMetadata>
): Character[] {
  return characters.filter((char) => {
    const uuid = char.uuid || char.id;
    return isCharacterEnabled(uuid, metadata);
  });
}

/**
 * Get Set of enabled character UUIDs for fast lookup
 * Useful for filtering reminders by parent character
 * @param characters - Array of all characters
 * @param metadata - Map of character metadata
 * @returns Set of UUIDs for enabled characters
 */
export function getEnabledCharacterUuids(
  characters: Character[],
  metadata: Map<string, CharacterMetadata>
): Set<string> {
  const enabled = filterEnabledCharacters(characters, metadata);
  return new Set(enabled.map((c) => c.uuid || c.id));
}

/**
 * Count how many characters are disabled
 * @param characters - Array of all characters
 * @param metadata - Map of character metadata
 * @returns Number of disabled characters
 */
export function countDisabledCharacters(
  characters: Character[],
  metadata: Map<string, CharacterMetadata>
): number {
  return characters.filter((char) => {
    const uuid = char.uuid || char.id;
    return !isCharacterEnabled(uuid, metadata);
  }).length;
}

/**
 * Get enabled/disabled counts as a summary object
 * @param characters - Array of all characters
 * @param metadata - Map of character metadata
 * @returns Object with enabled, disabled, and total counts
 */
export function getCharacterSelectionSummary(
  characters: Character[],
  metadata: Map<string, CharacterMetadata>
): { enabled: number; disabled: number; total: number } {
  const disabled = countDisabledCharacters(characters, metadata);
  const total = characters.length;
  return {
    enabled: total - disabled,
    disabled,
    total,
  };
}
