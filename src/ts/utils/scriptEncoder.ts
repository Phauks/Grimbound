/**
 * Script Encoder Utility
 *
 * Encodes script JSON data for use with the official Blood on the Clocktower
 * Script Tool at script.bloodontheclocktower.com.
 *
 * The official tool accepts scripts via URL parameter using gzip + base64url encoding.
 * This utility provides functions to encode scripts in this format.
 *
 * @module ts/utils/scriptEncoder
 */

import pako from 'pako';
import type { ScriptEntry } from '@/ts/types/index.js';

/**
 * Encode script JSON for URL parameter (gzip + base64url)
 * Matches the format expected by script.bloodontheclocktower.com
 *
 * @param script - Array of script entries (meta, characters, id references)
 * @returns Base64url encoded gzip-compressed JSON string
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
 * ```
 */
export function encodeScriptForUrl(script: ScriptEntry[]): string {
  // Convert script to JSON string
  const json = JSON.stringify(script);

  // Compress with gzip
  const compressed = pako.gzip(json);

  // Convert to base64
  let base64 = '';
  const bytes = new Uint8Array(compressed);
  for (let i = 0; i < bytes.length; i++) {
    base64 += String.fromCharCode(bytes[i]);
  }
  base64 = btoa(base64);

  // Convert to base64url (RFC 4648)
  // Replace + with -, / with _, and remove trailing =
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decode script from URL parameter format back to JSON
 * Useful for debugging or importing scripts from URLs
 *
 * @param encoded - Base64url encoded gzip-compressed string
 * @returns Parsed script entries array
 *
 * @example
 * ```typescript
 * const script = decodeScriptFromUrl("H4sIAAAAAAAA...");
 * // Returns the original script array
 * ```
 */
export function decodeScriptFromUrl(encoded: string): ScriptEntry[] {
  // Convert from base64url back to base64
  let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');

  // Add padding if needed
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }

  // Decode base64 to binary
  const binaryString = atob(base64);
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
 * @param script - Array of script entries
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
export function getOfficialScriptToolUrl(script: ScriptEntry[]): string {
  const encoded = encodeScriptForUrl(script);
  return `https://script.bloodontheclocktower.com/?script=${encoded}`;
}

/**
 * Open the official BOTC Script Tool in a new tab with the script pre-loaded
 *
 * @param script - Array of script entries
 * @returns The window reference (or null if popup was blocked)
 *
 * @example
 * ```typescript
 * openInOfficialScriptTool(myScript);
 * ```
 */
export function openInOfficialScriptTool(script: ScriptEntry[]): Window | null {
  const url = getOfficialScriptToolUrl(script);
  return window.open(url, '_blank');
}
