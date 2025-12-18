/**
 * Blood on the Clocktower Token Generator
 * Script Parser - Parse and validate script JSON data
 */

import CONFIG from '@/ts/config.js';
import type { Character, ScriptEntry, ScriptMeta } from '@/ts/types/index.js';
import { logger } from '@/ts/utils/logger.js';
import { generateStableUuid, generateUuid } from '@/ts/utils/nameGenerator.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Result of lenient script validation
 */
export interface ScriptValidationResult {
  characters: Character[];
  warnings: string[];
}

/**
 * Result of processing a single script entry
 */
interface EntryProcessResult {
  character: Character | null;
  warning: string | null;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for checking if entry is a ScriptMeta
 */
export function isScriptMeta(entry: ScriptEntry): entry is ScriptMeta {
  return typeof entry === 'object' && entry !== null && 'id' in entry && entry.id === '_meta';
}

/**
 * Type guard for checking if entry is a Character
 */
export function isCharacter(entry: ScriptEntry): entry is Character {
  return typeof entry === 'object' && entry !== null && 'name' in entry;
}

/**
 * Type guard for checking if entry is an ID reference object
 */
export function isIdReference(entry: ScriptEntry): entry is { id: string } {
  return (
    typeof entry === 'object' && entry !== null && 'id' in entry && Object.keys(entry).length === 1
  );
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Build a map of official characters by lowercase ID for quick lookup
 * @param officialData - Array of official character data
 * @returns Map of character ID to Character
 */
function buildOfficialMap(officialData: Character[]): Map<string, Character> {
  const officialMap = new Map<string, Character>();
  if (Array.isArray(officialData)) {
    officialData.forEach((char) => {
      if (char?.id) {
        officialMap.set(char.id.toLowerCase(), char);
      }
    });
  }
  return officialMap;
}

/**
 * Options for processing a script entry
 */
interface ProcessEntryOptions {
  entry: ScriptEntry;
  officialMap: Map<string, Character>;
  position?: string;
  lenient?: boolean;
}

/**
 * Validate a custom character entry and return warnings
 * @param character - Character to validate
 * @returns Array of warning messages
 */
function validateCharacterEntry(character: Character): string[] {
  const warnings: string[] = [];
  const validTeams = CONFIG.TEAMS as readonly string[];

  // Validate team field
  if (character.team && !validTeams.includes(character.team)) {
    warnings.push(`invalid team "${character.team}"`);
  }

  // Validate image field
  if (character.image !== undefined) {
    if (
      typeof character.image !== 'string' &&
      !(Array.isArray(character.image) && character.image.every((img) => typeof img === 'string'))
    ) {
      warnings.push('image must be a string or array of strings');
    }
  }

  // Validate reminders field
  if (character.reminders !== undefined) {
    if (!Array.isArray(character.reminders)) {
      warnings.push('reminders must be an array');
    }
  }

  return warnings;
}

/**
 * Process a single script entry and return the result
 * Handles string IDs, ID reference objects, and full character objects
 * @param options - Processing options
 * @returns Processing result with character and/or warning
 */
async function processScriptEntry(options: ProcessEntryOptions): Promise<EntryProcessResult> {
  const { entry, officialMap, position = '', lenient = false } = options;

  // Handle string ID references
  if (typeof entry === 'string') {
    const officialChar = officialMap.get(entry.toLowerCase());
    if (officialChar) {
      const uuid = await generateStableUuid(officialChar.id, officialChar.name);
      return { character: { ...officialChar, uuid, source: 'official' }, warning: null };
    }
    const warning = lenient ? `${position}: Character "${entry}" not found in official data` : null;
    if (!lenient) {
      logger.warn('ScriptParser', `Character not found in official data: ${entry}`);
    }
    return { character: null, warning };
  }

  // Skip null/undefined/non-objects
  if (!entry || typeof entry !== 'object') {
    if (lenient) {
      return {
        character: null,
        warning: `${position}: Invalid entry type (expected object or string)`,
      };
    }
    return { character: null, warning: null };
  }

  // Skip _meta entries (valid, no warning)
  if (isScriptMeta(entry)) {
    return { character: null, warning: null };
  }

  // Handle ID reference objects
  if (isIdReference(entry)) {
    if (lenient && typeof entry.id !== 'string') {
      return { character: null, warning: `${position}: Invalid id field type` };
    }
    const officialChar = officialMap.get(entry.id.toLowerCase());
    if (officialChar) {
      const uuid = await generateStableUuid(officialChar.id, officialChar.name);
      return { character: { ...officialChar, uuid, source: 'official' }, warning: null };
    }
    const warning = lenient
      ? `${position}: Character "${entry.id}" not found in official data`
      : null;
    if (!lenient) {
      logger.warn('ScriptParser', `Character not found in official data: ${entry.id}`);
    }
    return { character: null, warning };
  }

  // Handle custom characters with full data
  if (isCharacter(entry)) {
    const entryWithId = entry as Character;
    let warning: string | null = null;

    // Validate in lenient mode
    if (lenient) {
      const entryWarnings = validateCharacterEntry(entryWithId);
      if (entryWarnings.length > 0) {
        const charName = entryWithId.name || entryWithId.id || 'Unknown';
        warning = `${position} (${charName}): ${entryWarnings.join(', ')}`;
      }
    }

    // Merge with official data if ID matches
    const officialChar = entryWithId.id ? officialMap.get(entryWithId.id.toLowerCase()) : null;
    const mergedChar = officialChar ? { ...officialChar, ...entryWithId } : entryWithId;

    // Determine source: official if ID matches official data, otherwise custom
    const source = officialChar ? 'official' : 'custom';

    // Ensure UUID is assigned
    // Use existing UUID if present, otherwise generate stable UUID
    // Fall back to random UUID if ID or name missing (edge case to avoid collisions)
    const uuid =
      mergedChar.uuid ||
      (mergedChar.id && mergedChar.name
        ? await generateStableUuid(mergedChar.id, mergedChar.name)
        : generateUuid());

    return { character: { ...mergedChar, uuid, source } as Character, warning };
  }

  return { character: null, warning: null };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Parse script JSON and merge with official data where needed
 * @param scriptData - Raw script data array
 * @param officialData - Official character data
 * @returns Merged character data
 * @throws Error if scriptData is not an array
 */
export async function parseScriptData(
  scriptData: ScriptEntry[],
  officialData: Character[] = []
): Promise<Character[]> {
  if (!Array.isArray(scriptData)) {
    throw new Error('Script data must be an array');
  }

  const officialMap = buildOfficialMap(officialData);
  const characters: Character[] = [];

  for (const entry of scriptData) {
    const result = await processScriptEntry({ entry, officialMap, lenient: false });
    if (result.character) {
      characters.push(result.character);
    }
  }

  return characters;
}

/**
 * Validate and parse script with lenient filtering
 * Invalid entries are filtered out with warnings instead of failing
 * @param scriptData - Raw script data array
 * @param officialData - Official character data
 * @returns Object containing valid characters and warnings for filtered entries
 */
export async function validateAndParseScript(
  scriptData: ScriptEntry[],
  officialData: Character[] = []
): Promise<ScriptValidationResult> {
  if (!Array.isArray(scriptData)) {
    return {
      characters: [],
      warnings: ['Script data must be an array'],
    };
  }

  const officialMap = buildOfficialMap(officialData);
  const characters: Character[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < scriptData.length; i++) {
    const entry = scriptData[i];
    const position = `Entry ${i + 1}`;

    const result = await processScriptEntry({ entry, officialMap, position, lenient: true });

    if (result.character) {
      characters.push(result.character);
    }
    if (result.warning) {
      warnings.push(result.warning);
    }
  }

  return { characters, warnings };
}

/**
 * Extract meta information from script
 * Includes backward compatibility migration for bootlegger field
 * @param scriptData - Raw script data
 * @returns Meta object or null
 */
export function extractScriptMeta(scriptData: ScriptEntry[]): ScriptMeta | null {
  if (!Array.isArray(scriptData)) {
    return null;
  }

  for (const entry of scriptData) {
    if (isScriptMeta(entry)) {
      const meta = { ...entry };

      // Backward compatibility: convert old bootlegger string to array format
      // Old format: bootlegger: "Custom ability text"
      // New format: bootlegger: ["Custom ability text"]
      // Note: Type assertion needed because old JSON data may have string format
      const bootleggerValue = meta.bootlegger as string | string[] | undefined;
      if (bootleggerValue !== undefined) {
        if (typeof bootleggerValue === 'string') {
          meta.bootlegger = bootleggerValue.trim() ? [bootleggerValue] : [];
          logger.debug('ScriptParser', 'Migrated bootlegger from string to array format');
        } else if (!Array.isArray(bootleggerValue)) {
          // Invalid format, reset to empty array
          meta.bootlegger = [];
          logger.warn('ScriptParser', 'Invalid bootlegger format, reset to empty array');
        }
      }

      return meta;
    }
  }

  return null;
}

export default {
  parseScriptData,
  validateAndParseScript,
  extractScriptMeta,
  isScriptMeta,
  isCharacter,
  isIdReference,
};
