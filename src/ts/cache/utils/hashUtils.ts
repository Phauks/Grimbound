/**
 * Hash Utilities for Cache Key Generation
 *
 * Provides consistent hashing functions used across all cache layers.
 * Consolidates previously duplicated hash implementations.
 *
 * @module ts/cache/utils/hashUtils
 */

/**
 * Generate a simple string hash using djb2 algorithm.
 * Fast and produces good distribution for cache keys.
 *
 * @param input - String to hash
 * @returns Hash as base-36 string
 *
 * @example
 * ```typescript
 * const hash = simpleHash('some-string-key');
 * // Returns something like "1a2b3c"
 * ```
 */
export function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

/**
 * Generate a hash from an object by JSON stringifying specific keys.
 * Useful for hashing configuration objects.
 *
 * @param obj - Object to hash
 * @param keys - Optional specific keys to include (all keys if not specified)
 * @returns Hash as base-36 string
 *
 * @example
 * ```typescript
 * const hash = hashObject({ a: 1, b: 2, c: 3 }, ['a', 'b']);
 * // Only hashes { a: 1, b: 2 }
 * ```
 */
export function hashObject<T extends Record<string, unknown>>(
  obj: T,
  keys?: (keyof T)[]
): string {
  const subset = keys
    ? keys.reduce(
        (acc, key) => {
          acc[key as string] = obj[key];
          return acc;
        },
        {} as Record<string, unknown>
      )
    : obj;

  return simpleHash(JSON.stringify(subset));
}

/**
 * Generate a hash from an array of items using a key extractor.
 * Useful for hashing arrays of objects by specific properties.
 *
 * @param items - Array of items to hash
 * @param keyExtractor - Function to extract key string from each item
 * @returns Hash as base-36 string
 *
 * @example
 * ```typescript
 * const hash = hashArray(characters, (c) => c.id);
 * // Hashes "char1,char2,char3"
 * ```
 */
export function hashArray<T>(items: T[], keyExtractor: (item: T) => string): string {
  const key = items.map(keyExtractor).join(',');
  return simpleHash(key);
}

/**
 * Combine multiple hash strings into a single hash.
 * Useful when cache key depends on multiple factors.
 *
 * @param hashes - Array of hash strings to combine
 * @returns Combined hash as base-36 string
 *
 * @example
 * ```typescript
 * const combined = combineHashes([optionsHash, characterHash, projectHash]);
 * ```
 */
export function combineHashes(hashes: string[]): string {
  return simpleHash(hashes.join(':'));
}
