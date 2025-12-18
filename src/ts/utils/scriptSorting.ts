/**
 * Blood on the Clocktower Token Generator
 * Script Sorting Utilities - Standard Amy Order (SAO) Implementation
 *
 * The Sort Order (SAO) is the official order that characters appear on a script.
 * It groups characters with similar abilities together to make scripts easier to read.
 *
 * Sorting hierarchy:
 * 1. Team order: Townsfolk → Outsiders → Minions → Demons → Travellers → Fabled → Loric
 * 2. Ability prefix groups (characters with similar ability text prefixes grouped together)
 * 3. Within each group: sort by ability text length (shortest first)
 * 4. Tie-breaker: name length, then alphabetically
 *
 * Reference: https://bloodontheclocktower.com/blogs/news/sort-order-sao-update
 */

import type { Character, ScriptEntry, ScriptMeta, Team } from '@/ts/types/index.js';
import { logger } from './logger.js';

// ============================================================================
// Constants
// ============================================================================

/**
 * Team order for SAO sorting
 * _meta always comes first (handled separately)
 */
export const SAO_TEAM_ORDER: readonly Team[] = [
  'townsfolk',
  'outsider',
  'minion',
  'demon',
  'traveller',
  'fabled',
  'loric',
] as const;

/**
 * Ability prefix priority order for SAO sorting
 * Characters are grouped by which prefix their ability starts with.
 * Prefixes are checked in order - first match wins.
 * Characters that don't match any prefix are sorted at the end by ability length.
 */
export const SAO_ABILITY_PREFIXES: readonly string[] = [
  // "You start knowing" group - information gained at game start
  'You start knowing',

  // Night/timing abilities
  'At night',
  'Each dusk*',
  'Each dusk',
  'Each night*',
  'Each night',
  'Each day',

  // Once per game abilities
  'Once per game, at night*',
  'Once per game, at night',
  'Once per game, during the day',
  'Once per game',

  // First night/day abilities
  'On your 1st night',
  'On your 1st day',

  // "You" passive abilities
  'You think',
  'You are',
  'You have',
  'You do not know',
  'You might',
  'You',

  // Death trigger abilities
  'When you die',
  'When you learn that you died',
  'When',

  // Conditional "If you" abilities
  'If you die',
  'If you died',
  'If you are "mad"',
  'If you are',
  'If you',

  // Demon-related conditionals
  'If the Demon dies',
  'If the Demon kills',
  'If the Demon',

  // Other conditionals
  'If both',
  'If there are 5 or more players alive',
  'If',

  // Group abilities
  'All players',
  'All',

  // "The" abilities
  'The 1st time',
  'The',

  // Alignment abilities
  'Good',
  'Evil',

  // Player group abilities
  'Players',
  'Minions',
] as const;

// ============================================================================
// Types
// ============================================================================

/**
 * Available sort order types
 */
export type SortOrder = 'sao' | 'alphabetical' | 'team' | 'custom';

/**
 * Sort options for script sorting
 */
export interface ScriptSortOptions {
  /** Keep _meta at the beginning of the script */
  preserveMetaPosition?: boolean;
  /** Official character data for looking up string ID references */
  officialData?: Character[];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if an entry is a _meta entry
 */
function isMetaEntry(entry: ScriptEntry): entry is ScriptMeta {
  if (typeof entry === 'object' && entry !== null && 'id' in entry) {
    return entry.id === '_meta';
  }
  return false;
}

/**
 * Check if an entry is a character (has required character fields)
 */
function isCharacterEntry(entry: ScriptEntry): entry is Character {
  if (typeof entry === 'object' && entry !== null && 'id' in entry) {
    const obj = entry as Record<string, unknown>;
    return obj.id !== '_meta' && typeof obj.name === 'string';
  }
  return false;
}

/**
 * Get the ability prefix group index for a character
 * Returns the index of the matching prefix, or a high number if no match
 */
function getAbilityPrefixIndex(ability: string | undefined): number {
  if (!ability) {
    return SAO_ABILITY_PREFIXES.length; // No ability = sort at end
  }

  const normalizedAbility = ability.trim();

  for (let i = 0; i < SAO_ABILITY_PREFIXES.length; i++) {
    if (normalizedAbility.startsWith(SAO_ABILITY_PREFIXES[i])) {
      return i;
    }
  }

  // No matching prefix - sort at the end of prefix groups
  return SAO_ABILITY_PREFIXES.length;
}

/**
 * Get the team sort index for a character
 */
function getTeamIndex(team: Team | undefined): number {
  if (!team) return 0; // Default to townsfolk position
  const index = SAO_TEAM_ORDER.indexOf(team);
  return index === -1 ? 0 : index;
}

/**
 * Compare two characters according to SAO rules
 * @returns negative if a comes before b, positive if b comes before a, 0 if equal
 */
function compareSAO(a: Character, b: Character): number {
  // 1. Sort by team
  const teamDiff = getTeamIndex(a.team) - getTeamIndex(b.team);
  if (teamDiff !== 0) return teamDiff;

  // 2. Sort by ability prefix group
  const prefixDiff = getAbilityPrefixIndex(a.ability) - getAbilityPrefixIndex(b.ability);
  if (prefixDiff !== 0) return prefixDiff;

  // 3. Sort by ability text length (shorter first)
  const aAbilityLen = (a.ability ?? '').length;
  const bAbilityLen = (b.ability ?? '').length;
  const abilityLenDiff = aAbilityLen - bAbilityLen;
  if (abilityLenDiff !== 0) return abilityLenDiff;

  // 4. Sort by name length (shorter first)
  const nameLenDiff = a.name.length - b.name.length;
  if (nameLenDiff !== 0) return nameLenDiff;

  // 5. Alphabetical by name
  return a.name.localeCompare(b.name);
}

// ============================================================================
// Main Sorting Functions
// ============================================================================

/**
 * Resolve an entry to a Character for sorting purposes
 * Handles string IDs, {id: string} objects, and full Character objects
 */
function resolveToCharacter(
  entry: ScriptEntry,
  officialDataMap: Map<string, Character>
): { character: Character; originalEntry: ScriptEntry } | null {
  // Skip meta entries
  if (isMetaEntry(entry)) {
    return null;
  }

  // Full character object with name
  if (isCharacterEntry(entry)) {
    return { character: entry, originalEntry: entry };
  }

  // String ID reference
  if (typeof entry === 'string') {
    const normalizedId = entry.toLowerCase().replace(/[^a-z0-9]/g, '');
    const official = officialDataMap.get(normalizedId);
    if (official) {
      return { character: official, originalEntry: entry };
    }
    // Can't resolve - return null
    return null;
  }

  // Object with just id (e.g., { id: "scarletwoman" })
  if (typeof entry === 'object' && entry !== null && 'id' in entry) {
    const id = (entry as { id: string }).id;
    const normalizedId = id.toLowerCase().replace(/[^a-z0-9]/g, '');
    const official = officialDataMap.get(normalizedId);
    if (official) {
      return { character: official, originalEntry: entry };
    }
    // Can't resolve - return null
    return null;
  }

  return null;
}

/**
 * Sort a script array according to SAO (Standard Amy Order)
 * - _meta is always kept at the beginning
 * - Characters are sorted by team, then by ability prefix group, then by ability length
 * - String IDs and {id: string} objects are resolved using officialData if provided
 * - Travellers, Fabled, and Loric are appended at the end in that order
 *
 * @param scriptData - The script array to sort (can include _meta, strings, or character objects)
 * @param options - Sorting options
 * @returns New sorted array (does not mutate original)
 */
export function sortScriptBySAO(
  scriptData: ScriptEntry[],
  options: ScriptSortOptions = {}
): ScriptEntry[] {
  const { preserveMetaPosition = true, officialData = [] } = options;

  // Build a map of official character IDs to character data for quick lookup
  const officialDataMap = new Map<string, Character>();
  for (const char of officialData) {
    if (char?.id) {
      const normalizedId = char.id.toLowerCase().replace(/[^a-z0-9]/g, '');
      officialDataMap.set(normalizedId, char);
    }
  }

  // Separate meta from characters
  let metaEntry: ScriptMeta | null = null;
  const resolvableEntries: Array<{ character: Character; originalEntry: ScriptEntry }> = [];
  const unknownEntries: ScriptEntry[] = []; // Entries we can't resolve

  for (const entry of scriptData) {
    if (isMetaEntry(entry)) {
      metaEntry = entry;
    } else {
      const resolved = resolveToCharacter(entry, officialDataMap);
      if (resolved) {
        resolvableEntries.push(resolved);
      } else {
        // Can't resolve this entry - keep it as unknown
        unknownEntries.push(entry);
      }
    }
  }

  // Sort resolved entries by SAO using the resolved character data
  resolvableEntries.sort((a, b) => compareSAO(a.character, b.character));

  // Build result array with original entries (preserving their original format)
  const result: ScriptEntry[] = [];

  // Add meta first if preserving position
  if (preserveMetaPosition && metaEntry) {
    result.push(metaEntry);
  }

  // Add sorted entries (using original format)
  for (const { originalEntry } of resolvableEntries) {
    result.push(originalEntry);
  }

  // Add any unknown entries at the end
  result.push(...unknownEntries);

  return result;
}

/**
 * Sort a JSON string containing a script by SAO
 * @param jsonString - JSON string of the script
 * @param options - Sorting options
 * @returns Formatted JSON string with sorted script
 */
export function sortScriptJsonBySAO(jsonString: string, options: ScriptSortOptions = {}): string {
  try {
    const parsed = JSON.parse(jsonString) as ScriptEntry[];

    if (!Array.isArray(parsed)) {
      throw new Error('Script must be an array');
    }

    const sorted = sortScriptBySAO(parsed, options);
    return JSON.stringify(sorted, null, 2);
  } catch (error) {
    logger.error('scriptSorting', 'Failed to sort script JSON', error);
    throw error;
  }
}

// ============================================================================
// Script Analysis Functions
// ============================================================================

/**
 * Check if a script is already sorted according to SAO
 * @param scriptData - The script array to check
 * @param options - Sorting options (including officialData for resolving string IDs)
 * @returns true if the script is in SAO order, false otherwise
 */
export function isScriptSortedBySAO(
  scriptData: ScriptEntry[],
  options: ScriptSortOptions = {}
): boolean {
  const { officialData = [] } = options;

  // Build a map of official character IDs to character data
  const officialDataMap = new Map<string, Character>();
  for (const char of officialData) {
    if (char?.id) {
      const normalizedId = char.id.toLowerCase().replace(/[^a-z0-9]/g, '');
      officialDataMap.set(normalizedId, char);
    }
  }

  // Resolve all entries to characters
  const resolvedCharacters: Character[] = [];
  for (const entry of scriptData) {
    if (isMetaEntry(entry)) continue;

    if (isCharacterEntry(entry)) {
      resolvedCharacters.push(entry);
    } else if (typeof entry === 'string') {
      const normalizedId = entry.toLowerCase().replace(/[^a-z0-9]/g, '');
      const official = officialDataMap.get(normalizedId);
      if (official) {
        resolvedCharacters.push(official);
      }
    } else if (typeof entry === 'object' && entry !== null && 'id' in entry) {
      const id = (entry as { id: string }).id;
      const normalizedId = id.toLowerCase().replace(/[^a-z0-9]/g, '');
      const official = officialDataMap.get(normalizedId);
      if (official) {
        resolvedCharacters.push(official);
      }
    }
  }

  if (resolvedCharacters.length <= 1) {
    return true; // Empty or single character is always "sorted"
  }

  // Check if characters are in correct SAO order
  for (let i = 0; i < resolvedCharacters.length - 1; i++) {
    const comparison = compareSAO(resolvedCharacters[i], resolvedCharacters[i + 1]);
    if (comparison > 0) {
      return false; // Current character should come after next character
    }
  }

  return true;
}

/**
 * Check if a JSON string script is sorted by SAO
 * @param jsonString - JSON string of the script
 * @param options - Sorting options (including officialData for resolving string IDs)
 * @returns true if sorted, false if not, null if JSON is invalid
 */
export function isScriptJsonSortedBySAO(
  jsonString: string,
  options: ScriptSortOptions = {}
): boolean | null {
  try {
    const parsed = JSON.parse(jsonString) as ScriptEntry[];

    if (!Array.isArray(parsed)) {
      return null;
    }

    return isScriptSortedBySAO(parsed, options);
  } catch {
    return null; // Invalid JSON
  }
}

/**
 * Get sorting statistics for a script
 * @param scriptData - The script array to analyze
 * @returns Object with character counts by team and sort status
 */
export function getScriptSortStats(scriptData: ScriptEntry[]): {
  isSorted: boolean;
  characterCount: number;
  teamCounts: Record<Team, number>;
  hasMeta: boolean;
} {
  const characters = scriptData.filter(isCharacterEntry);
  const hasMeta = scriptData.some(isMetaEntry);

  const teamCounts: Record<Team, number> = {
    townsfolk: 0,
    outsider: 0,
    minion: 0,
    demon: 0,
    traveller: 0,
    fabled: 0,
    loric: 0,
    meta: 0,
  };

  for (const char of characters) {
    const team = char.team ?? 'townsfolk';
    if (team in teamCounts) {
      teamCounts[team]++;
    }
  }

  return {
    isSorted: isScriptSortedBySAO(scriptData),
    characterCount: characters.length,
    teamCounts,
    hasMeta,
  };
}
