/**
 * Script Encoder Utility
 *
 * Encodes script JSON data for use with the official Blood on the Clocktower
 * Script Tool at script.bloodontheclocktower.com.
 *
 * The official tool accepts scripts via URL parameter using gzip + base64 encoding.
 * This utility provides functions to encode scripts in this format.
 *
 * @module ts/utils/scriptEncoder
 */

import pako from 'pako';
import type { Character, ScriptEntry } from '@/ts/types/index.js';

/** Type for script data that can be encoded - looser than ScriptEntry for flexibility */
export type EncodableScriptData = unknown[];

/**
 * Encode script JSON for URL parameter (gzip + base64)
 * Matches the format expected by script.bloodontheclocktower.com
 *
 * The official tool expects standard base64 encoding (not base64url).
 * The result should be URL-encoded when used in a query string.
 *
 * @param script - Array of script entries (meta, characters, id references)
 * @returns Standard base64 encoded gzip-compressed JSON string
 *
 * @example
 * ```typescript
 * const encoded = encodeScriptForUrl([
 *   { id: '_meta', name: 'My Script' },
 *   'washerwoman',
 *   'librarian',
 *   'imp'
 * ]);
 * // Returns something like: "H4sIAAAAAAAA..."
 * // Use with: `?script=${encodeURIComponent(encoded)}`
 * ```
 */
export function encodeScriptForUrl(script: EncodableScriptData): string {
  // Convert script to JSON string
  const json = JSON.stringify(script);

  // Compress with gzip
  const compressed = pako.gzip(json);

  // Convert to standard base64 (not base64url)
  // The official BOTC script tool expects standard base64 with URL encoding
  let base64 = '';
  const bytes = new Uint8Array(compressed);
  for (const byte of bytes) {
    base64 += String.fromCharCode(byte);
  }
  return btoa(base64);
}

/**
 * Decode script from URL parameter format back to JSON
 * Useful for debugging or importing scripts from URLs
 *
 * @param encoded - Standard base64 encoded gzip-compressed string
 * @returns Parsed script entries array
 *
 * @example
 * ```typescript
 * const script = decodeScriptFromUrl("H4sIAAAAAAAA...");
 * ```
 */
export function decodeScriptFromUrl(encoded: string): ScriptEntry[] {
  // Decode base64 to binary
  const binaryString = atob(encoded);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Decompress gzip
  const decompressed = pako.ungzip(bytes, { to: 'string' });

  // Parse JSON
  return JSON.parse(decompressed) as ScriptEntry[];
}

/**
 * Generate the full URL to the official BOTC Script Tool with the script pre-loaded
 *
 * @param script - Array of script entries (can include meta objects, character IDs, or full character objects)
 * @returns Full URL to script.bloodontheclocktower.com with encoded script
 *
 * @example
 * ```typescript
 * const url = getOfficialScriptToolUrl([
 *   { id: '_meta', name: 'My Script' },
 *   'washerwoman',
 *   'imp'
 * ]);
 * // Opens in browser: https://script.bloodontheclocktower.com/?script=H4sI...
 * window.open(url, '_blank');
 * ```
 */
export function getOfficialScriptToolUrl(script: EncodableScriptData): string {
  const encoded = encodeScriptForUrl(script);
  // URL-encode the base64 string (+ becomes %2B, / becomes %2F, = becomes %3D)
  return `https://script.bloodontheclocktower.com/?script=${encodeURIComponent(encoded)}`;
}

/**
 * Open the official BOTC Script Tool in a new tab with the script pre-loaded
 *
 * @param script - Array of script entries (can include meta objects, character IDs, or full character objects)
 * @returns The window reference (or null if popup was blocked)
 *
 * @example
 * ```typescript
 * openInOfficialScriptTool(myScript);
 * ```
 */
export function openInOfficialScriptTool(script: EncodableScriptData): Window | null {
  const url = getOfficialScriptToolUrl(script);
  return window.open(url, '_blank');
}

/**
 * Format a character for the official BOTC Script Tool
 *
 * - Official characters: returns just the ID string
 * - Custom characters: returns full character object with all properties
 *
 * @param char - Character to format
 * @returns String ID for official characters, or full object for custom
 */
export function formatCharacterForOfficialTool(char: Character): string | Record<string, unknown> {
  // Official characters can be referenced by ID alone
  if (char.source === 'official') {
    return char.id;
  }

  // Custom characters need full data for the tool to display them
  const customChar: Record<string, unknown> = {
    id: char.id,
    name: char.name,
    ability: char.ability || '',
    team: char.team,
  };

  // Add optional properties only if they have values
  if (char.image) customChar.image = char.image;
  if (char.firstNight) customChar.firstNight = char.firstNight;
  if (char.firstNightReminder) customChar.firstNightReminder = char.firstNightReminder;
  if (char.otherNight) customChar.otherNight = char.otherNight;
  if (char.otherNightReminder) customChar.otherNightReminder = char.otherNightReminder;
  if (char.reminders && char.reminders.length > 0) customChar.reminders = char.reminders;
  if (char.remindersGlobal && char.remindersGlobal.length > 0) {
    customChar.remindersGlobal = char.remindersGlobal;
  }
  if (char.setup) customChar.setup = char.setup;
  if (char.flavor) customChar.flavor = char.flavor;
  if (char.jinxes && char.jinxes.length > 0) customChar.jinxes = char.jinxes;

  return customChar;
}
