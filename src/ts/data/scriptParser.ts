/**
 * Blood on the Clocktower Token Generator
 * Script Parser - Parse and validate script JSON data
 *
 * @module scriptParser
 *
 * Responsibilities:
 * - Parse script JSON (string IDs, ID references, full character objects)
 * - Merge with official character data
 * - Validate entries and collect warnings
 * - Extract script meta information
 *
 * Architecture:
 * - Type guards for entry classification
 * - Handler functions for each entry type (Strategy-like pattern)
 * - ParsingContext for shared state
 * - Public API with strict/lenient modes
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

/**
 * Context for parsing operations - avoids rebuilding maps on each call
 */
interface ParsingContext {
  /** Map of official characters by lowercase ID */
  officialMap: Map<string, Character>;
  /** Whether to collect warnings instead of just logging */
  lenient: boolean;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if value is a non-null object (helper for type narrowing)
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Type guard for checking if entry is a ScriptMeta
 *
 * ScriptMeta has id === '_meta' and may contain optional metadata fields.
 *
 * @example
 * ```typescript
 * if (isScriptMeta(entry)) {
 *   console.log(entry.name); // TypeScript knows this is ScriptMeta
 * }
 * ```
 */
export function isScriptMeta(entry: ScriptEntry): entry is ScriptMeta {
  return isObject(entry) && 'id' in entry && entry.id === '_meta';
}

/**
 * Type guard for checking if entry is a Character
 *
 * Characters must have a 'name' property. This distinguishes them from
 * ID reference objects which only have 'id'.
 *
 * @example
 * ```typescript
 * if (isCharacter(entry)) {
 *   console.log(entry.name, entry.team); // TypeScript knows this is Character
 * }
 * ```
 */
export function isCharacter(entry: ScriptEntry): entry is Character {
  return isObject(entry) && 'name' in entry && typeof entry.name === 'string';
}

/**
 * Type guard for checking if entry is an ID reference object
 *
 * ID references are objects with only an 'id' field (e.g., { id: "washerwoman" }).
 * This is the minimal format used by script-tool exports.
 *
 * @example
 * ```typescript
 * if (isIdReference(entry)) {
 *   const id = entry.id; // TypeScript knows id is string
 * }
 * ```
 */
export function isIdReference(entry: ScriptEntry): entry is { id: string } {
  return (
    isObject(entry) &&
    'id' in entry &&
    typeof entry.id === 'string' &&
    Object.keys(entry).length === 1
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
    for (const char of officialData) {
      if (char?.id) {
        officialMap.set(char.id.toLowerCase(), char);
      }
    }
  }
  return officialMap;
}

/**
 * Create a parsing context from official data
 * @param officialData - Array of official character data
 * @param lenient - Whether to collect warnings instead of logging
 * @returns Parsing context
 */
function createParsingContext(officialData: Character[], lenient: boolean): ParsingContext {
  return {
    officialMap: buildOfficialMap(officialData),
    lenient,
  };
}

/**
 * Validate a custom character entry and return warnings
 * @param character - Character to validate
 * @returns Array of warning messages
 */
function validateCharacterEntry(character: Character): string[] {
  const warnings: string[] = [];
  const validTeams = CONFIG.TEAMS as readonly string[];

  if (character.team && !validTeams.includes(character.team)) {
    warnings.push(`invalid team "${character.team}"`);
  }

  if (character.image !== undefined) {
    const isValidImage =
      typeof character.image === 'string' ||
      (Array.isArray(character.image) && character.image.every((img) => typeof img === 'string'));
    if (!isValidImage) {
      warnings.push('image must be a string or array of strings');
    }
  }

  if (character.reminders !== undefined && !Array.isArray(character.reminders)) {
    warnings.push('reminders must be an array');
  }

  return warnings;
}

// ============================================================================
// Entry Handlers (Strategy-like pattern for each entry type)
// ============================================================================

/**
 * Handle string ID entries (e.g., "washerwoman")
 */
async function handleStringEntry(
  id: string,
  ctx: ParsingContext,
  position: string
): Promise<EntryProcessResult> {
  const officialChar = ctx.officialMap.get(id.toLowerCase());
  if (officialChar) {
    const uuid = await generateStableUuid(officialChar.id, officialChar.name);
    return { character: { ...officialChar, uuid, source: 'official' }, warning: null };
  }

  if (ctx.lenient) {
    return {
      character: null,
      warning: `${position}: Character "${id}" not found in official data`,
    };
  }
  logger.warn('ScriptParser', `Character not found in official data: ${id}`);
  return { character: null, warning: null };
}

/**
 * Handle ID reference objects (e.g., { id: "washerwoman" })
 */
async function handleIdReference(
  entry: { id: string },
  ctx: ParsingContext,
  position: string
): Promise<EntryProcessResult> {
  if (ctx.lenient && typeof entry.id !== 'string') {
    return { character: null, warning: `${position}: Invalid id field type` };
  }

  const officialChar = ctx.officialMap.get(entry.id.toLowerCase());
  if (officialChar) {
    const uuid = await generateStableUuid(officialChar.id, officialChar.name);
    return { character: { ...officialChar, uuid, source: 'official' }, warning: null };
  }

  if (ctx.lenient) {
    return {
      character: null,
      warning: `${position}: Character "${entry.id}" not found in official data`,
    };
  }
  logger.warn('ScriptParser', `Character not found in official data: ${entry.id}`);
  return { character: null, warning: null };
}

/**
 * Handle full character objects with custom data
 */
async function handleCharacterEntry(
  entry: Character,
  ctx: ParsingContext,
  position: string
): Promise<EntryProcessResult> {
  let warning: string | null = null;

  // Validate in lenient mode
  if (ctx.lenient) {
    const entryWarnings = validateCharacterEntry(entry);
    if (entryWarnings.length > 0) {
      const charName = entry.name || entry.id || 'Unknown';
      warning = `${position} (${charName}): ${entryWarnings.join(', ')}`;
    }
  }

  // Merge with official data if ID matches
  const officialChar = entry.id ? ctx.officialMap.get(entry.id.toLowerCase()) : null;
  const mergedChar = officialChar ? { ...officialChar, ...entry } : entry;
  const source = officialChar ? 'official' : 'custom';

  // Generate UUID: existing > stable (from id+name) > random (fallback)
  const uuid =
    mergedChar.uuid ||
    (mergedChar.id && mergedChar.name
      ? await generateStableUuid(mergedChar.id, mergedChar.name)
      : generateUuid());

  return { character: { ...mergedChar, uuid, source } as Character, warning };
}

/**
 * Process a single script entry and return the result
 * Routes to appropriate handler based on entry type
 */
async function processScriptEntry(
  entry: ScriptEntry,
  ctx: ParsingContext,
  position: string
): Promise<EntryProcessResult> {
  // Handle string ID references
  if (typeof entry === 'string') {
    return handleStringEntry(entry, ctx, position);
  }

  // Skip null/undefined/non-objects
  if (!entry || typeof entry !== 'object') {
    if (ctx.lenient) {
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
    return handleIdReference(entry, ctx, position);
  }

  // Handle full character objects
  if (isCharacter(entry)) {
    return handleCharacterEntry(entry, ctx, position);
  }

  return { character: null, warning: null };
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Parse script JSON and merge with official data where needed
 *
 * Strict mode: Logs warnings for unrecognized entries but doesn't collect them.
 * Use `validateAndParseScript` for lenient mode with warning collection.
 *
 * @param scriptData - Raw script data array
 * @param officialData - Official character data for merging
 * @returns Merged character data
 * @throws Error if scriptData is not an array
 *
 * @example
 * ```typescript
 * const characters = await parseScriptData(scriptJson, officialCharacters);
 * ```
 */
export async function parseScriptData(
  scriptData: ScriptEntry[],
  officialData: Character[] = []
): Promise<Character[]> {
  if (!Array.isArray(scriptData)) {
    throw new Error('Script data must be an array');
  }

  const ctx = createParsingContext(officialData, false);
  const characters: Character[] = [];

  for (let i = 0; i < scriptData.length; i++) {
    const result = await processScriptEntry(scriptData[i], ctx, `Entry ${i + 1}`);
    if (result.character) {
      characters.push(result.character);
    }
  }

  return characters;
}

/**
 * Validate and parse script with lenient filtering
 *
 * Lenient mode: Invalid entries are filtered out with warnings instead of failing.
 * Useful for user-provided JSON that may contain errors.
 *
 * @param scriptData - Raw script data array
 * @param officialData - Official character data for merging
 * @returns Object containing valid characters and warnings for filtered entries
 *
 * @example
 * ```typescript
 * const { characters, warnings } = await validateAndParseScript(userJson, officialData);
 * if (warnings.length > 0) {
 *   console.warn('Script had issues:', warnings);
 * }
 * ```
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

  const ctx = createParsingContext(officialData, true);
  const characters: Character[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < scriptData.length; i++) {
    const position = `Entry ${i + 1}`;
    const result = await processScriptEntry(scriptData[i], ctx, position);

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
