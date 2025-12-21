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

/**
 * Extract character IDs from night order entries.
 * Includes special entries (dusk, dawn, minioninfo, demoninfo) and character entries.
 * Only includes characters that have night actions (order > 0).
 */
function extractIdsFromEntries(entries: NightOrderEntry[]): string[] {
  return entries
    .filter((entry) => {
      // Include special entries
      if (isSpecialEntry(entry.id)) {
        return true;
      }
      // Include character entries (type === 'character')
      if (entry.type === 'character') {
        return true;
      }
      return false;
    })
    .map((entry) => entry.id);
}

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
 * @param entries - Night order entries in display order
 * @returns Map of character ID (lowercase) to calculated order number
 */
function calculateCustomCharacterNumbers(entries: NightOrderEntry[]): Map<string, number> {
  const result = new Map<string, number>();

  // Extract only character entries (skip special entries like dusk/dawn)
  const characterEntries = entries.filter((e) => e.type === 'character');

  for (let i = 0; i < characterEntries.length; i++) {
    const entry = characterEntries[i];

    // Official characters keep their existing order number
    if (isEntryOfficial(entry)) {
      result.set(entry.id.toLowerCase(), entry.order);
      continue;
    }

    // For custom characters, find surrounding official characters
    let prevOfficialOrder = 0; // Start of night
    let nextOfficialOrder = 1000; // End of night (dawn)

    // Look backwards for previous official character
    for (let j = i - 1; j >= 0; j--) {
      if (isEntryOfficial(characterEntries[j])) {
        prevOfficialOrder = characterEntries[j].order;
        break;
      }
    }

    // Look forwards for next official character
    for (let j = i + 1; j < characterEntries.length; j++) {
      if (isEntryOfficial(characterEntries[j])) {
        nextOfficialOrder = characterEntries[j].order;
        break;
      }
    }

    // Count how many custom characters are between these two officials
    let customsBetween = 0;
    let customIndex = 0;
    for (let j = 0; j < characterEntries.length; j++) {
      const e = characterEntries[j];
      if (!isEntryOfficial(e)) {
        // Check if this custom is between the same officials
        let thisPrevOfficial = 0;
        let thisNextOfficial = 1000;
        for (let k = j - 1; k >= 0; k--) {
          if (isEntryOfficial(characterEntries[k])) {
            thisPrevOfficial = characterEntries[k].order;
            break;
          }
        }
        for (let k = j + 1; k < characterEntries.length; k++) {
          if (isEntryOfficial(characterEntries[k])) {
            thisNextOfficial = characterEntries[k].order;
            break;
          }
        }
        if (thisPrevOfficial === prevOfficialOrder && thisNextOfficial === nextOfficialOrder) {
          if (j === i) {
            customIndex = customsBetween;
          }
          customsBetween++;
        }
      }
    }

    // Calculate order number: evenly distribute between prev and next
    const gap = nextOfficialOrder - prevOfficialOrder;
    const step = gap / (customsBetween + 1);
    const newOrder = prevOfficialOrder + step * (customIndex + 1);

    // Round to 1 decimal place for cleaner numbers
    result.set(entry.id.toLowerCase(), Math.round(newOrder * 10) / 10);
  }

  return result;
}

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

      // Insert minioninfo before characters with order > 92.5
      if (!insertedMinionInfo && order > 92.5) {
        result.push('minioninfo');
        insertedMinionInfo = true;
      }

      // Insert demoninfo before characters with order > 95.5
      if (!insertedDemonInfo && order > 95.5) {
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
