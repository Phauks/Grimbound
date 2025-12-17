/**
 * Night Order Utilities
 *
 * Functions for building, sorting, and managing night order entries.
 * Supports both _meta array ordering and per-character number ordering.
 */

import { extractScriptMeta, isCharacter, isScriptMeta } from '../data/scriptParser.js';
import type { Character, ScriptEntry, Team } from '../types/index.js';
import type {
  NightOrderEntry,
  NightOrderSource,
  ScriptMetaWithNightOrder,
} from './nightOrderTypes.js';
import {
  DAWN_ENTRY,
  DEMON_INFO_ENTRY,
  DUSK_ENTRY,
  getSpecialEntry,
  isSpecialEntry,
  MINION_INFO_ENTRY,
} from './specialEntries.js';

/**
 * Result of building a night order
 */
export interface NightOrderResult {
  entries: NightOrderEntry[];
  source: NightOrderSource;
}

/**
 * Convert a Character to a NightOrderEntry
 */
export function characterToNightOrderEntry(
  character: Character,
  nightType: 'first' | 'other'
): NightOrderEntry | null {
  const orderNumber = nightType === 'first' ? character.firstNight : character.otherNight;

  // Skip characters that don't have a night order for this night type
  if (orderNumber === undefined || orderNumber === 0) {
    return null;
  }

  const reminderText =
    nightType === 'first' ? character.firstNightReminder : character.otherNightReminder;

  return {
    id: character.id,
    type: 'character',
    name: character.name,
    ability: reminderText || character.ability || '',
    image: getCharacterImageUrl(character),
    team: character.team,
    order: orderNumber,
    isOfficial: character.source === 'official',
    isLocked: character.source === 'official',
    nightType: hasNightOrderForBoth(character) ? 'both' : nightType,
    character,
  };
}

/**
 * Check if a character has night order for both nights
 */
function hasNightOrderForBoth(character: Character): boolean {
  return (
    character.firstNight !== undefined &&
    character.firstNight !== 0 &&
    character.otherNight !== undefined &&
    character.otherNight !== 0
  );
}

/**
 * Get the image URL for a character
 * Handles both string and array image fields
 */
function getCharacterImageUrl(character: Character): string {
  if (!character.image) {
    return '';
  }
  return Array.isArray(character.image) ? character.image[0] : character.image;
}

/**
 * Extract characters from script data
 * Filters out _meta entries and returns only Character objects
 */
function extractCharacters(scriptData: ScriptEntry[]): Character[] {
  return scriptData.filter(
    (entry): entry is Character => isCharacter(entry) && !isScriptMeta(entry)
  );
}

/**
 * Build night order from _meta array
 * @param metaOrder - Array of character IDs from _meta.firstNight or _meta.otherNight
 * @param characters - All characters from the script
 * @param nightType - Which night we're building for
 */
function buildOrderFromMetaArray(
  metaOrder: string[],
  characters: Character[],
  nightType: 'first' | 'other'
): NightOrderEntry[] {
  const entries: NightOrderEntry[] = [];
  const characterMap = new Map(characters.map((c) => [c.id.toLowerCase(), c]));

  for (const id of metaOrder) {
    const lowerId = id.toLowerCase();

    // Check if it's a special entry
    if (isSpecialEntry(lowerId)) {
      const specialEntry = getSpecialEntry(lowerId);
      if (specialEntry) {
        // For first night, include minion/demon info
        // For other nights, skip minion/demon info
        if (specialEntry.nightType === 'both' || specialEntry.nightType === nightType) {
          entries.push({ ...specialEntry });
        }
      }
      continue;
    }

    // Look up character
    const character = characterMap.get(lowerId);
    if (character) {
      const entry = characterToNightOrderEntry(character, nightType);
      if (entry) {
        // Only lock official characters - custom characters can still be reordered
        // The isLocked property is already set correctly by characterToNightOrderEntry
        // based on character.source === 'official'
        entries.push(entry);
      }
    }
  }

  return entries;
}

/**
 * Build night order from per-character numbers
 * @param characters - All characters from the script
 * @param nightType - Which night we're building for
 */
function buildOrderFromCharacterNumbers(
  characters: Character[],
  nightType: 'first' | 'other'
): NightOrderEntry[] {
  const entries: NightOrderEntry[] = [];

  // Add characters with night order numbers
  for (const character of characters) {
    const entry = characterToNightOrderEntry(character, nightType);
    if (entry) {
      entries.push(entry);
    }
  }

  // Sort by order number
  entries.sort((a, b) => a.order - b.order);

  // Find where to insert special entries
  // Minion/Demon info typically goes after early characters (order ~5-6)
  const insertIndex = entries.findIndex((e) => e.order > MINION_INFO_ENTRY.order);

  // Build final array with special entries
  const result: NightOrderEntry[] = [{ ...DUSK_ENTRY }];

  if (nightType === 'first') {
    // For first night, insert minion/demon info at the right position
    if (insertIndex === -1) {
      // All entries are before info entries, add at end before dawn
      result.push(...entries);
      result.push({ ...MINION_INFO_ENTRY });
      result.push({ ...DEMON_INFO_ENTRY });
    } else if (insertIndex === 0) {
      // All entries are after info entries
      result.push({ ...MINION_INFO_ENTRY });
      result.push({ ...DEMON_INFO_ENTRY });
      result.push(...entries);
    } else {
      // Insert info entries at the right position
      result.push(...entries.slice(0, insertIndex));
      result.push({ ...MINION_INFO_ENTRY });
      result.push({ ...DEMON_INFO_ENTRY });
      result.push(...entries.slice(insertIndex));
    }
  } else {
    // For other nights, just add character entries
    result.push(...entries);
  }

  result.push({ ...DAWN_ENTRY });

  return result;
}

/**
 * Build night order from script data
 * Automatically detects whether to use _meta arrays or character numbers
 *
 * @param scriptData - Raw script data array
 * @param nightType - Which night to build order for
 * @returns Night order result with entries and source indicator
 */
export function buildNightOrder(
  scriptData: ScriptEntry[],
  nightType: 'first' | 'other'
): NightOrderResult {
  const meta = extractScriptMeta(scriptData) as ScriptMetaWithNightOrder | null;
  const characters = extractCharacters(scriptData);
  const metaOrder = nightType === 'first' ? meta?.firstNight : meta?.otherNight;

  if (metaOrder && Array.isArray(metaOrder) && metaOrder.length > 0) {
    // Use _meta array order
    return {
      entries: buildOrderFromMetaArray(metaOrder, characters, nightType),
      source: 'meta',
    };
  }

  // Fall back to per-character numbers
  return {
    entries: buildOrderFromCharacterNumbers(characters, nightType),
    source: 'numbers',
  };
}

/**
 * Insert a custom character into the night order at a specific position
 * Maintains the relative order of official/locked characters
 *
 * @param entries - Current night order entries
 * @param entryId - ID of the entry to move
 * @param newIndex - Target index
 * @returns Updated entries array
 */
export function moveNightOrderEntry(
  entries: NightOrderEntry[],
  entryId: string,
  newIndex: number
): NightOrderEntry[] {
  const currentIndex = entries.findIndex((e) => e.id === entryId);
  if (currentIndex === -1) {
    return entries;
  }

  const entry = entries[currentIndex];

  // Only allow moving unlocked entries
  if (entry.isLocked) {
    return entries;
  }

  // Clamp newIndex to valid range (between dusk and dawn)
  const minIndex = 1; // After dusk
  const maxIndex = entries.length - 2; // Before dawn
  const clampedIndex = Math.max(minIndex, Math.min(maxIndex, newIndex));

  // Remove from current position
  const result = [...entries];
  result.splice(currentIndex, 1);

  // Insert at new position
  result.splice(clampedIndex, 0, entry);

  return result;
}

/**
 * Parse ability text to identify reminder tokens and circle indicators
 * - Tokens are marked with *TOKEN NAME* syntax (bold text)
 * - Circle indicators are marked with :reminder: (grey circle)
 *
 * @param abilityText - Raw ability text
 * @returns Array of text segments with formatting flags
 */
export interface AbilityTextSegment {
  text: string;
  isBold: boolean;
  isCircle: boolean;
}

export function parseAbilityText(abilityText: string): AbilityTextSegment[] {
  const segments: AbilityTextSegment[] = [];
  const regex = /(\*([^*]+)\*)|(:reminder:)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = regex.exec(abilityText);

  while (match !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      segments.push({
        text: abilityText.slice(lastIndex, match.index),
        isBold: false,
        isCircle: false,
      });
    }

    // Add the formatted segment
    if (match[2]) {
      // *BOLD* match
      segments.push({
        text: match[2],
        isBold: true,
        isCircle: false,
      });
    } else if (match[3]) {
      // :reminder: match (circle indicator)
      segments.push({
        text: '',
        isBold: false,
        isCircle: true,
      });
    }

    lastIndex = regex.lastIndex;
    match = regex.exec(abilityText);
  }

  // Add remaining text after last match
  if (lastIndex < abilityText.length) {
    segments.push({
      text: abilityText.slice(lastIndex),
      isBold: false,
      isCircle: false,
    });
  }

  return segments;
}

/**
 * Get team color for styling
 * Maps team names to CSS color values
 */
export function getTeamColor(team: Team | 'special' | undefined): string {
  const colors: Record<string, string> = {
    townsfolk: '#1a5f2a',
    outsider: '#1a3f5f',
    minion: '#5f1a3f',
    demon: '#8b0000',
    traveller: '#5f4f1a',
    fabled: '#4f1a5f',
    loric: '#2a5f5f',
    meta: '#808080',
    special: '#4a4a4a',
  };

  return colors[team || 'special'] || colors.special;
}

/**
 * Check if a night order entry should be shown for a given night type
 */
export function shouldShowEntry(entry: NightOrderEntry, nightType: 'first' | 'other'): boolean {
  return entry.nightType === 'both' || entry.nightType === nightType;
}

/**
 * Get statistics about the night order
 */
export interface NightOrderStats {
  totalEntries: number;
  characterCount: number;
  specialCount: number;
  lockedCount: number;
  movableCount: number;
}

export function getNightOrderStats(entries: NightOrderEntry[]): NightOrderStats {
  const characterEntries = entries.filter((e) => e.type === 'character');
  const specialEntries = entries.filter((e) => e.type === 'special');

  return {
    totalEntries: entries.length,
    characterCount: characterEntries.length,
    specialCount: specialEntries.length,
    lockedCount: entries.filter((e) => e.isLocked).length,
    movableCount: entries.filter((e) => !e.isLocked).length,
  };
}
