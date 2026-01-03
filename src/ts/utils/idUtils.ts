/**
 * Blood on the Clocktower Token Generator
 * ID Uniqueness Utilities
 *
 * Ensures character IDs are unique across a script to prevent
 * collisions between official and custom characters.
 */

/**
 * Result of ensuring a unique ID
 */
export interface UniqueIdResult {
  /** The unique ID (may be modified from original) */
  id: string;
  /** Whether the ID was renamed to avoid collision */
  wasRenamed: boolean;
  /** The original ID before renaming (only set if wasRenamed is true) */
  originalId?: string;
}

/**
 * Ensures a proposed ID is unique among existing IDs.
 * If a collision exists, appends numeric suffixes (_1, _2, etc.) until unique.
 *
 * @param proposedId - The ID to check for uniqueness
 * @param existingIds - Array of IDs already in use
 * @returns UniqueIdResult with the unique ID and rename status
 *
 * @example
 * // No collision
 * ensureUniqueId('drunk', ['washerwoman', 'imp'])
 * // Returns: { id: 'drunk', wasRenamed: false }
 *
 * @example
 * // Collision - gets _1 suffix
 * ensureUniqueId('washerwoman', ['washerwoman', 'imp'])
 * // Returns: { id: 'washerwoman_1', wasRenamed: true, originalId: 'washerwoman' }
 *
 * @example
 * // Multiple collisions - increments suffix
 * ensureUniqueId('washerwoman', ['washerwoman', 'washerwoman_1', 'washerwoman_2'])
 * // Returns: { id: 'washerwoman_3', wasRenamed: true, originalId: 'washerwoman' }
 */
export function ensureUniqueId(proposedId: string, existingIds: string[]): UniqueIdResult {
  const normalizedProposed = proposedId.toLowerCase().trim();
  const normalizedExisting = new Set(existingIds.map((id) => id.toLowerCase().trim()));

  // No collision - return as-is
  if (!normalizedExisting.has(normalizedProposed)) {
    return { id: proposedId, wasRenamed: false };
  }

  // Find a unique suffix
  let suffix = 1;
  let candidateId = `${proposedId}_${suffix}`;

  while (normalizedExisting.has(candidateId.toLowerCase())) {
    suffix++;
    candidateId = `${proposedId}_${suffix}`;
  }

  return {
    id: candidateId,
    wasRenamed: true,
    originalId: proposedId,
  };
}

/**
 * Extracts the base ID without any numeric suffix.
 * Useful for identifying if two IDs are variants of the same base.
 *
 * @param id - The ID to extract base from
 * @returns The base ID without _N suffix
 *
 * @example
 * getBaseId('washerwoman_1') // Returns: 'washerwoman'
 * getBaseId('washerwoman_12') // Returns: 'washerwoman'
 * getBaseId('washerwoman') // Returns: 'washerwoman'
 * getBaseId('my_custom_char_3') // Returns: 'my_custom_char'
 */
export function getBaseId(id: string): string {
  // Match _N at the end where N is one or more digits
  const match = id.match(/^(.+)_(\d+)$/);
  return match ? match[1] : id;
}

/**
 * Checks if an ID would collide with any existing ID.
 *
 * @param proposedId - The ID to check
 * @param existingIds - Array of IDs already in use
 * @returns true if the ID would collide
 */
export function wouldCollide(proposedId: string, existingIds: string[]): boolean {
  const normalizedProposed = proposedId.toLowerCase().trim();
  return existingIds.some((id) => id.toLowerCase().trim() === normalizedProposed);
}

/**
 * Gets all IDs from a character array, excluding a specific UUID.
 * Useful when checking for collisions while editing a character.
 *
 * @param characters - Array of characters with id and uuid fields
 * @param excludeUuid - UUID to exclude from the result
 * @returns Array of character IDs, excluding the one with the given UUID
 */
export function getOtherCharacterIds<T extends { id: string; uuid?: string }>(
  characters: T[],
  excludeUuid?: string
): string[] {
  return characters.filter((c) => c.uuid !== excludeUuid).map((c) => c.id);
}
