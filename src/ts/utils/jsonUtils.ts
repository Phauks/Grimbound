/**
 * Blood on the Clocktower Token Generator
 * JSON Utility Functions
 */

import type { Character, ScriptEntry, ScriptMeta, ValidationResult } from '@/ts/types/index.js';

/**
 * Format JSON with pretty printing
 * @param jsonString - JSON string to format
 * @returns Formatted JSON string
 */
export function formatJson(jsonString: string): string {
  try {
    const parsed = JSON.parse(jsonString) as unknown;
    return JSON.stringify(parsed, null, 2);
  } catch {
    return jsonString;
  }
}

/**
 * Validate JSON string
 * @param jsonString - JSON string to validate
 * @returns Validation result with valid boolean and error message
 */
export function validateJson(jsonString: string): ValidationResult {
  if (!jsonString.trim()) {
    return { valid: false, error: 'JSON is empty' };
  }
  try {
    const parsed = JSON.parse(jsonString) as unknown;
    if (!Array.isArray(parsed)) {
      return { valid: false, error: 'JSON must be an array' };
    }
    return { valid: true, data: parsed as ScriptEntry[] };
  } catch (e) {
    const error = e instanceof Error ? e.message : 'Unknown error';
    return { valid: false, error: `Invalid JSON: ${error}` };
  }
}

/**
 * Deep clone an object using structuredClone (with JSON fallback for older browsers).
 * structuredClone handles more types (Date, RegExp, Map, Set, ArrayBuffer, etc.) and circular references.
 * Falls back to JSON serialization for environments without structuredClone support.
 *
 * @param obj - Object to clone
 * @returns Cloned object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  // Use structuredClone if available (Chrome 98+, Firefox 94+, Safari 15.4+)
  if (typeof structuredClone === 'function') {
    return structuredClone(obj);
  }
  // Fallback to JSON serialization for older browsers
  return JSON.parse(JSON.stringify(obj)) as T;
}

/**
 * Strip internal fields (like uuid, source) from a character or script entry object.
 * Used when exporting JSON to keep the output clean.
 * @param entry - Object to strip internal fields from
 * @returns Object with internal fields removed
 */
export function stripInternalFields<T extends Record<string, unknown>>(
  entry: T
): Omit<T, 'uuid' | 'source'> {
  if (typeof entry !== 'object' || entry === null) return entry;
  const { uuid, source, ...rest } = entry;
  return rest as Omit<T, 'uuid' | 'source'>;
}

/**
 * Clean JSON string by stripping internal fields (uuid, source) from all entries.
 * Used for exporting script JSON without internal generator state.
 * @param jsonString - JSON string to clean
 * @returns Cleaned JSON string with internal fields removed
 */
export function getCleanJsonForExport(jsonString: string): string {
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) return jsonString;

    const cleaned = parsed.map((entry) => {
      // If it's an object (character or meta), strip uuid and source
      if (typeof entry === 'object' && entry !== null) {
        return stripInternalFields(entry as Record<string, unknown>);
      }
      // String IDs stay as-is
      return entry;
    });

    return JSON.stringify(cleaned, null, 2);
  } catch {
    return jsonString;
  }
}

/**
 * Check if a script entry is an object with only an "id" field (condensable format)
 * @param entry - Script entry to check
 * @returns True if entry is condensable { "id": "..." } format
 */
function isCondensableIdReference(entry: unknown): entry is { id: string } {
  if (typeof entry !== 'object' || entry === null) return false;
  const keys = Object.keys(entry);
  return keys.length === 1 && 'id' in entry && typeof (entry as { id: unknown }).id === 'string';
}

/**
 * Check if an ID corresponds to an official character
 * @param id - Character ID to check
 * @param officialData - Array of official characters
 * @returns True if ID matches an official character
 */
function isOfficialCharacter(id: string, officialData: Character[]): boolean {
  const normalizedId = id.toLowerCase().trim();
  return officialData.some((char) => char.id.toLowerCase() === normalizedId);
}

/**
 * Check if a script has condensable character references
 * Detects object-format references like { "id": "clockmaker" } that could be simplified to "clockmaker"
 * @param jsonString - JSON string to check
 * @param officialData - Array of official characters to validate against
 * @returns True if script contains condensable references
 */
export function hasCondensableReferences(jsonString: string, officialData: Character[]): boolean {
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) return false;

    return parsed.some((entry) => {
      // Check if entry is condensable format and matches official character
      if (isCondensableIdReference(entry)) {
        return isOfficialCharacter(entry.id, officialData);
      }
      return false;
    });
  } catch {
    return false;
  }
}

/**
 * Condense script by converting object-format character references to string format
 * Converts { "id": "clockmaker" } to "clockmaker" for official characters only
 * @param jsonString - JSON string to condense
 * @param officialData - Array of official characters to validate against
 * @returns Condensed JSON string with simplified character references
 */
export function condenseScript(jsonString: string, officialData: Character[]): string {
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) return jsonString;

    const condensed = parsed.map((entry) => {
      // If entry is condensable and matches official character, convert to string
      if (isCondensableIdReference(entry) && isOfficialCharacter(entry.id, officialData)) {
        return entry.id;
      }
      // Keep all other entries as-is (strings, _meta, custom characters, etc.)
      return entry;
    });

    return JSON.stringify(condensed, null, 2);
  } catch {
    return jsonString;
  }
}

/**
 * Build a meta entry object from script metadata.
 * Only includes fields that have values.
 */
function buildMetaEntry(scriptMeta: ScriptMeta): Record<string, unknown> {
  const entry: Record<string, unknown> = { id: '_meta' };
  if (scriptMeta.name) entry.name = scriptMeta.name;
  if (scriptMeta.author) entry.author = scriptMeta.author;
  if (scriptMeta.logo) entry.logo = scriptMeta.logo;
  return entry;
}

/**
 * Build a custom character entry object for JSON export.
 * Only includes optional fields that have meaningful values.
 */
function buildCustomCharacterEntry(char: Character): Record<string, unknown> {
  const entry: Record<string, unknown> = {
    id: char.id,
    name: char.name,
  };

  // Only include team if not the default
  if (char.team && char.team !== 'townsfolk') entry.team = char.team;

  // Include text fields if present
  if (char.ability) entry.ability = char.ability;
  if (char.image) entry.image = char.image;

  // Include arrays if non-empty
  if (char.reminders && char.reminders.length > 0) entry.reminders = char.reminders;
  if (char.remindersGlobal && char.remindersGlobal.length > 0)
    entry.remindersGlobal = char.remindersGlobal;

  // Include night order fields if defined
  if (char.setup !== undefined) entry.setup = char.setup;
  if (char.firstNight !== undefined) entry.firstNight = char.firstNight;
  if (char.firstNightReminder) entry.firstNightReminder = char.firstNightReminder;
  if (char.otherNight !== undefined) entry.otherNight = char.otherNight;
  if (char.otherNightReminder) entry.otherNightReminder = char.otherNightReminder;

  return entry;
}

/**
 * Convert a character to its JSON representation.
 * Official characters become string IDs, custom characters become full objects.
 */
function characterToJsonEntry(char: Character): string | Record<string, unknown> {
  return char.source === 'official' ? char.id : buildCustomCharacterEntry(char);
}

/**
 * Convert a characters array to JSON string format for script export.
 * Official characters are represented as string IDs, custom characters
 * include full definition, and meta is placed first if present.
 *
 * @param characters - Array of characters to convert
 * @param scriptMeta - Optional script metadata (name, author, logo)
 * @returns JSON string representation of the script
 */
export function charactersToJson(characters: Character[], scriptMeta: ScriptMeta | null): string {
  const jsonArray: unknown[] = [];

  if (scriptMeta) {
    jsonArray.push(buildMetaEntry(scriptMeta));
  }

  for (const char of characters) {
    jsonArray.push(characterToJsonEntry(char));
  }

  return JSON.stringify(jsonArray, null, 2);
}
