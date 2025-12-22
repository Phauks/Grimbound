/**
 * Night Order Sync Utilities
 *
 * Functions for synchronizing night order state back to script JSON.
 * Handles bidirectional sync between NightOrderContext state and JSON _meta arrays.
 */

import type { Character, ScriptMeta } from '@/ts/types/index.js';
import { logger } from '@/ts/utils/logger.js';
import type { NightOrderEntry, NightOrderState } from './nightOrderTypes.js';
import { isSpecialEntry } from './specialEntries.js';

// ============================================================================
// Constants
// ============================================================================

/**
 * Boundary values for night order positioning.
 * Used when calculating custom character order numbers.
 */
const ORDER_BOUNDS = {
  /** Start of night (before any characters) */
  START: 0,
  /** End of night (dawn position) */
  END: 1000,
  /** Official order position for Minion Info special entry */
  MINION_INFO: 92.5,
  /** Official order position for Demon Info special entry */
  DEMON_INFO: 95.5,
} as const;

// ============================================================================
// ID Extraction
// ============================================================================

/**
 * Extract character IDs from night order entries.
 * Includes special entries (dusk, dawn, minioninfo, demoninfo) and character entries.
 */
function extractIdsFromEntries(entries: NightOrderEntry[]): string[] {
  return entries
    .filter((entry) => isSpecialEntry(entry.id) || entry.type === 'character')
    .map((entry) => entry.id);
}

// ============================================================================
// Meta Array Building
// ============================================================================

/**
 * Build _meta night order arrays from NightOrderEntry arrays.
 * Extracts IDs from the current order for persistence.
 */
export function buildMetaNightOrderArrays(
  firstNightEntries: NightOrderEntry[],
  otherNightEntries: NightOrderEntry[]
): { firstNight: string[]; otherNight: string[] } {
  return {
    firstNight: extractIdsFromEntries(firstNightEntries),
    otherNight: extractIdsFromEntries(otherNightEntries),
  };
}

// ============================================================================
// JSON Synchronization
// ============================================================================

/**
 * Sync night order state to JSON string.
 * Updates or creates _meta.firstNight and _meta.otherNight arrays.
 *
 * @param jsonString - Current JSON string of the script
 * @param firstNightState - Current first night order state
 * @param otherNightState - Current other night order state
 * @returns Updated JSON string with night order arrays in _meta
 */
export function syncNightOrderToJson(
  jsonString: string,
  firstNightState: NightOrderState,
  otherNightState: NightOrderState
): string {
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) {
      logger.warn('nightOrderSync', 'JSON is not an array, cannot sync night order');
      return jsonString;
    }

    const { firstNight, otherNight } = buildMetaNightOrderArrays(
      firstNightState.entries,
      otherNightState.entries
    );

    // Find existing _meta entry index
    const metaIndex = parsed.findIndex(
      (item: unknown) =>
        typeof item === 'object' && item !== null && (item as { id?: string }).id === '_meta'
    );

    if (metaIndex === -1) {
      // Create _meta at the beginning with night order arrays
      const newMeta: ScriptMeta = {
        id: '_meta',
        name: 'Custom Script',
        firstNight,
        otherNight,
      };
      parsed.unshift(newMeta);
      logger.info('nightOrderSync', 'Created _meta with night order arrays');
    } else {
      // Update existing _meta with night order arrays
      parsed[metaIndex] = {
        ...parsed[metaIndex],
        firstNight,
        otherNight,
      };
      logger.debug('nightOrderSync', 'Updated _meta night order arrays');
    }

    return JSON.stringify(parsed, null, 2);
  } catch (error) {
    logger.error('nightOrderSync', 'Failed to sync night order to JSON', error);
    return jsonString;
  }
}

// ============================================================================
// Order Number Calculation
// ============================================================================

/**
 * Represents a "gap" between two official characters where custom characters
 * can be placed. Used for efficient order number calculation.
 */
interface OrderGap {
  /** Order number of the previous official character (or START if none) */
  prevOrder: number;
  /** Order number of the next official character (or END if none) */
  nextOrder: number;
  /** IDs of custom characters that fall within this gap, in display order */
  customIds: string[];
}

/**
 * Helper to check if an entry represents an official character.
 * Uses the character reference stored on the entry.
 */
function isEntryOfficial(entry: NightOrderEntry): boolean {
  return entry.character?.source === 'official';
}

/**
 * Calculate night order numbers for custom characters based on their position
 * relative to official characters. Official characters keep their fixed numbers,
 * while custom characters get numbers that fit between surrounding officials.
 *
 * Algorithm: O(n) single pass to build gap structure, then O(n) to assign numbers.
 * This replaces the previous O(n³) triple-nested loop approach.
 *
 * @param entries - Night order entries in display order
 * @returns Map of character ID (lowercase) to calculated order number
 */
function calculateCustomCharacterNumbers(entries: NightOrderEntry[]): Map<string, number> {
  const result = new Map<string, number>();
  const characterEntries = entries.filter((e) => e.type === 'character');

  if (characterEntries.length === 0) {
    return result;
  }

  // Single pass: build gap structure and collect official positions
  const gaps: OrderGap[] = [];
  let currentGap: OrderGap = {
    prevOrder: ORDER_BOUNDS.START,
    nextOrder: ORDER_BOUNDS.END,
    customIds: [],
  };

  for (const entry of characterEntries) {
    const lowerId = entry.id.toLowerCase();

    if (isEntryOfficial(entry)) {
      // Official character: finalize current gap and start a new one
      currentGap.nextOrder = entry.order;

      if (currentGap.customIds.length > 0) {
        gaps.push(currentGap);
      }

      // Record official character's order
      result.set(lowerId, entry.order);

      // Start new gap after this official
      currentGap = {
        prevOrder: entry.order,
        nextOrder: ORDER_BOUNDS.END,
        customIds: [],
      };
    } else {
      // Custom character: add to current gap
      currentGap.customIds.push(lowerId);
    }
  }

  // Don't forget trailing customs after the last official
  if (currentGap.customIds.length > 0) {
    gaps.push(currentGap);
  }

  // Distribute custom characters within each gap
  for (const gap of gaps) {
    const totalCustoms = gap.customIds.length;
    const step = (gap.nextOrder - gap.prevOrder) / (totalCustoms + 1);

    gap.customIds.forEach((id, index) => {
      const order = gap.prevOrder + step * (index + 1);
      // Round to 1 decimal place for cleaner numbers
      result.set(id, Math.round(order * 10) / 10);
    });
  }

  return result;
}

// ============================================================================
// Character Update
// ============================================================================

/**
 * Update per-character night order numbers based on their position in the entries.
 * Official characters keep their fixed canonical numbers.
 * Custom characters get numbers that fit between surrounding official characters.
 *
 * @param characters - Array of characters to update
 * @param firstNightEntries - Current first night order entries
 * @param otherNightEntries - Current other night order entries
 * @returns Updated characters array with new night order numbers
 */
export function updateCharacterNightNumbers(
  characters: Character[],
  firstNightEntries: NightOrderEntry[],
  otherNightEntries: NightOrderEntry[]
): Character[] {
  // Calculate order numbers for each night type
  const firstNightNumbers = calculateCustomCharacterNumbers(firstNightEntries);
  const otherNightNumbers = calculateCustomCharacterNumbers(otherNightEntries);

  // Update only custom characters
  return characters.map((char) => {
    // Skip official characters - they keep their fixed numbers
    if (char.source === 'official') {
      return char;
    }

    const lowerId = char.id.toLowerCase();
    const newFirstNight = firstNightNumbers.get(lowerId);
    const newOtherNight = otherNightNumbers.get(lowerId);

    // Only update if there's a change
    if (
      (newFirstNight !== undefined && newFirstNight !== char.firstNight) ||
      (newOtherNight !== undefined && newOtherNight !== char.otherNight)
    ) {
      return {
        ...char,
        firstNight: newFirstNight ?? char.firstNight,
        otherNight: newOtherNight ?? char.otherNight,
      };
    }
    return char;
  });
}

// ============================================================================
// Initial Array Building
// ============================================================================

/**
 * Build initial night order arrays from characters when creating new _meta.
 * Sorts characters by their existing night order numbers.
 *
 * @param characters - Array of characters with night order numbers
 * @param nightType - Which night type to build for
 * @returns Array of character IDs in order, with dusk/dawn bookends
 */
export function buildInitialNightOrderArray(
  characters: Character[],
  nightType: 'first' | 'other'
): string[] {
  const orderKey = nightType === 'first' ? 'firstNight' : 'otherNight';

  // Filter and sort characters by night order number
  const orderedChars = characters
    .filter((char) => {
      const order = char[orderKey];
      return order !== undefined && order > 0;
    })
    .sort((a, b) => {
      const orderA = a[orderKey] ?? 0;
      const orderB = b[orderKey] ?? 0;
      return orderA - orderB;
    });

  // Build array with special entries
  const result: string[] = ['dusk'];

  // For first night, insert minioninfo and demoninfo at appropriate positions
  if (nightType === 'first') {
    let insertedMinionInfo = false;
    let insertedDemonInfo = false;

    for (const char of orderedChars) {
      const order = char[orderKey] ?? 0;

      // Insert minioninfo before characters with order > MINION_INFO threshold
      if (!insertedMinionInfo && order > ORDER_BOUNDS.MINION_INFO) {
        result.push('minioninfo');
        insertedMinionInfo = true;
      }

      // Insert demoninfo before characters with order > DEMON_INFO threshold
      if (!insertedDemonInfo && order > ORDER_BOUNDS.DEMON_INFO) {
        result.push('demoninfo');
        insertedDemonInfo = true;
      }

      result.push(char.id);
    }

    // Add any not-yet-inserted special entries at the end (before dawn)
    if (!insertedMinionInfo) {
      result.push('minioninfo');
    }
    if (!insertedDemonInfo) {
      result.push('demoninfo');
    }
  } else {
    // Other nights - just add characters in order
    for (const char of orderedChars) {
      result.push(char.id);
    }
  }

  result.push('dawn');
  return result;
}
