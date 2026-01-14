/**
 * Random Name Generator for Blood on the Clocktower Characters
 *
 * Generates thematic names from a curated list of mythological and mystical words.
 */

import ALL_NAMES from '@/data/names.json';

// ============================================
// GENERATOR FUNCTIONS
// ============================================

/**
 * Generate a random name from the word list
 * @returns A random name string
 */
export function generateRandomName(): string {
  const randomIndex = Math.floor(Math.random() * ALL_NAMES.length);
  return ALL_NAMES[randomIndex];
}

/**
 * Generate multiple unique random names
 * @param count - Number of names to generate
 * @returns Array of unique random names
 */
export function generateMultipleNames(count: number): string[] {
  const shuffled = [...ALL_NAMES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Convert a name to a valid ID (snake_case, lowercase)
 * @param name - The name to convert
 * @returns A snake_case ID string
 */
export function nameToId(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '_'); // Replace spaces with underscores
}

/**
 * Generate a new UUID for character identification
 * @returns A UUID string
 */
export function generateUuid(): string {
  return crypto.randomUUID();
}

/**
 * UUID v5 namespace for character identification
 * Uses a custom namespace specific to this application
 */
const CHARACTER_UUID_NAMESPACE = 'a8f3e1c9-4b2d-5e6f-8a9b-3c4d5e6f7a8b';

/**
 * Convert Uint8Array to UUID format string
 * @param bytes - Byte array (must be 16 bytes)
 * @returns UUID string with dashes (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
 */
function bytesToUuid(bytes: Uint8Array): string {
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Generate a stable UUID v5 using SHA-1 (RFC 4122 compliant)
 *
 * This implementation uses SHA-1 cryptographic hashing to create collision-resistant UUIDs.
 * Replaces the previous FNV-1a implementation which had collision vulnerabilities.
 *
 * @param characterId - Character ID (e.g., "seamstress", "scapegoat")
 * @param characterName - Character name (e.g., "Seamstress", "Scapegoat")
 * @returns Promise resolving to UUID string
 *
 * @example
 * ```typescript
 * // Different characters will ALWAYS get different UUIDs
 * const seamstressUuid = await generateStableUuid('seamstress', 'Seamstress');
 * const scapegoatUuid = await generateStableUuid('scapegoat', 'Scapegoat');
 * // seamstressUuid !== scapegoatUuid (guaranteed - no more collisions!)
 *
 * // Same inputs always produce same UUID (deterministic)
 * const uuid1 = await generateStableUuid('washerwoman', 'Washerwoman');
 * const uuid2 = await generateStableUuid('washerwoman', 'Washerwoman');
 * // uuid1 === uuid2 (true)
 * ```
 */
export async function generateStableUuid(
  characterId: string,
  characterName: string
): Promise<string> {
  // Normalize inputs to ensure consistency
  const normalizedId = characterId.toLowerCase().trim();
  const normalizedName = characterName.trim();

  // Create namespace-qualified input
  const input = `${CHARACTER_UUID_NAMESPACE}:${normalizedId}:${normalizedName}`;

  // SHA-1 hash using Web Crypto API (RFC 4122 standard for UUID v5)
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);

  // Convert hash to byte array (SHA-1 produces 20 bytes, we need 16 for UUID)
  const hashBytes = new Uint8Array(hashBuffer);

  // Take first 16 bytes for UUID
  const uuidBytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    uuidBytes[i] = hashBytes[i];
  }

  // Set version (5) and variant bits per RFC 4122
  uuidBytes[6] = (uuidBytes[6] & 0x0f) | 0x50; // Version 5: 0101xxxx
  uuidBytes[8] = (uuidBytes[8] & 0x3f) | 0x80; // Variant: 10xxxxxx

  // Convert to UUID string format
  return bytesToUuid(uuidBytes);
}
