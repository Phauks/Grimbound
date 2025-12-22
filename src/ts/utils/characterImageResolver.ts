/**
 * Character Image Resolution - Single Source of Truth
 *
 * This module provides unified character image URL resolution for:
 * - Asset references (asset:uuid) -> resolved via AssetStorageService
 * - External URLs (http/https/data/blob) -> used as-is
 * - Official character paths -> resolved via dataSyncService
 *
 * Used by:
 * - useCharacterImageResolver hook (batch resolution for lists)
 * - NightOrderEntry component (single entry resolution)
 * - CharacterNavigation component (via hook)
 * - CharacterListView component (via hook)
 *
 * @module utils/characterImageResolver
 */

import { isAssetReference, resolveAssetUrl } from '@/ts/services/upload/assetResolver.js';
import { dataSyncService } from '@/ts/sync/index.js';
import type { Character } from '@/ts/types/index.js';
import { logger } from './logger.js';

// ============================================================================
// Persistent URL Cache (avoids repeated blob URL creation)
// ============================================================================

/**
 * Maximum number of blob URLs to keep cached.
 * Beyond this limit, oldest entries are evicted and their blob URLs revoked.
 * This prevents unbounded memory growth from blob URL accumulation.
 *
 * Set to 250 to accommodate all official characters (~175) plus headroom
 * for custom characters and browsing multiple scripts.
 */
const MAX_CACHED_BLOB_URLS = 250;

/**
 * Cache for resolved character icon URLs
 *
 * Key: character ID (lowercase)
 * Value: resolved URL string (blob URL or external URL)
 *
 * Uses Map's insertion order for LRU-like eviction. Entries accessed via
 * getCachedIconUrl are "touched" (re-inserted) to prevent eviction.
 *
 * When cache exceeds MAX_CACHED_BLOB_URLS, oldest entries are evicted
 * and their blob URLs are properly revoked.
 */
const characterIconUrlCache = new Map<string, string>();

/**
 * Get a cached URL for a character icon
 *
 * This also "touches" the entry by re-inserting it to update its position
 * in the Map's insertion order (for LRU-like behavior).
 */
export function getCachedIconUrl(characterId: string): string | undefined {
  const key = characterId.toLowerCase();
  const url = characterIconUrlCache.get(key);

  // "Touch" the entry by re-inserting to update LRU order
  if (url !== undefined) {
    characterIconUrlCache.delete(key);
    characterIconUrlCache.set(key, url);
  }

  return url;
}

/**
 * Evict oldest entries from the cache when it exceeds the maximum size.
 * Properly revokes blob URLs to prevent memory leaks.
 */
function evictOldestBlobUrls(): void {
  if (characterIconUrlCache.size <= MAX_CACHED_BLOB_URLS) {
    return;
  }

  const entries = [...characterIconUrlCache.entries()];
  const entriesToEvict = entries.slice(0, entries.length - MAX_CACHED_BLOB_URLS);

  for (const [key, url] of entriesToEvict) {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
    characterIconUrlCache.delete(key);
  }

  if (entriesToEvict.length > 0) {
    logger.debug(
      'CharacterImageResolver',
      `Evicted ${entriesToEvict.length} entries from icon URL cache (limit: ${MAX_CACHED_BLOB_URLS})`
    );
  }
}

/**
 * Set a cached URL for a character icon
 *
 * Automatically evicts oldest entries when cache exceeds MAX_CACHED_BLOB_URLS.
 */
export function setCachedIconUrl(characterId: string, url: string): void {
  characterIconUrlCache.set(characterId.toLowerCase(), url);
  evictOldestBlobUrls();
}

/**
 * Check if an icon URL is already cached
 */
export function hasIconUrlCached(characterId: string): boolean {
  return characterIconUrlCache.has(characterId.toLowerCase());
}

/**
 * Clear the icon URL cache (e.g., when re-syncing data)
 */
export function clearIconUrlCache(): void {
  // Revoke all blob URLs before clearing
  for (const url of characterIconUrlCache.values()) {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }
  characterIconUrlCache.clear();
  logger.debug('CharacterImageResolver', 'Icon URL cache cleared');
}

/**
 * Get cache statistics
 */
export function getIconUrlCacheStats(): { size: number; blobUrls: number } {
  let blobUrls = 0;
  for (const url of characterIconUrlCache.values()) {
    if (url.startsWith('blob:')) {
      blobUrls++;
    }
  }
  return { size: characterIconUrlCache.size, blobUrls };
}

// ============================================================================
// Types
// ============================================================================

/**
 * Options for resolving a character image URL
 */
export interface ResolveOptions {
  /** Skip dataSyncService lookup (for custom characters) */
  skipSyncStorage?: boolean;
  /** Context for logging (e.g., 'NightOrderEntry', 'CharacterList') */
  logContext?: string;
}

/**
 * Result of resolving a character image URL
 */
export interface ResolvedImage {
  /** The resolved URL (may be blob:, http:, asset:, data:, or original) */
  url: string;
  /** Where the URL came from */
  source: 'asset' | 'external' | 'sync' | 'fallback';
  /** If source is 'sync', this is the blob URL that needs cleanup */
  blobUrl?: string;
}

/**
 * Result of batch resolving character images
 */
export interface BatchResolveResult {
  /** Map of character UUID -> resolved URL */
  urls: Map<string, string>;
  /** All blob URLs created (caller must revoke these on cleanup) */
  blobUrls: string[];
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a URL is an external URL (http/https/data/blob)
 *
 * @param url - URL string to check
 * @returns True if the URL is external (doesn't need resolution)
 */
export function isExternalUrl(url: string): boolean {
  return /^(https?:\/\/|data:|blob:)/.test(url);
}

/**
 * Check if a path is a local asset path (starts with / but not a protocol)
 * These are paths like /scripts/dusk.webp that need base URL prepended
 *
 * @param path - Path string to check
 * @returns True if it's a local asset path
 */
export function isLocalAssetPath(path: string): boolean {
  return path.startsWith('/') && !isExternalUrl(path);
}

/**
 * Resolve a local asset path to a full URL by prepending the base URL
 *
 * In development: /scripts/dusk.webp -> /scripts/dusk.webp
 * In production: /scripts/dusk.webp -> /Clocktower_Token_Generator/scripts/dusk.webp
 *
 * @param path - Local asset path starting with /
 * @returns Full URL with base path prepended
 */
export function resolveLocalAssetPath(path: string): string {
  const baseUrl = import.meta.env.BASE_URL || '/';
  // Remove leading slash from path since baseUrl already ends with /
  return `${baseUrl}${path.substring(1)}`;
}

/**
 * Extract a character ID from various path formats
 *
 * Handles:
 * - "washerwoman"
 * - "Icon_washerwoman.png"
 * - "icons/washerwoman.webp"
 * - "Icon_po_poisoner.png" (with underscores)
 *
 * @param path - File path or character ID string
 * @returns Extracted character ID in lowercase, or null if not parseable
 */
export function extractCharacterIdFromPath(path: string): string | null {
  // Get the filename from the path
  const segments = path.split('/');
  const filename = segments[segments.length - 1];

  // Match patterns: "Icon_washerwoman.png", "washerwoman", "washerwoman.webp"
  const match = filename.match(/^(?:Icon_)?([a-z0-9_]+)(?:\.(?:webp|png|jpg|jpeg|gif))?$/i);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Get the first image URL from a character's image field
 *
 * @param imageField - Character.image value (string, array, or undefined)
 * @returns First image URL or undefined
 */
export function getFirstImageUrl(imageField: string | string[] | undefined): string | undefined {
  if (!imageField) return undefined;

  if (typeof imageField === 'string') {
    return imageField;
  }

  if (Array.isArray(imageField) && imageField.length > 0) {
    const first = imageField[0];
    if (typeof first === 'string') {
      return first;
    }
  }

  return undefined;
}

// ============================================================================
// Core Resolution Functions
// ============================================================================

/**
 * Resolve a single character image URL to a displayable URL
 *
 * Resolution order:
 * 0. Check persistent URL cache first (fastest path)
 * 1. Empty URL -> return fallback
 * 2. Asset reference (asset:uuid) -> resolve via AssetStorageService
 * 3. External URL (http/https/data/blob) -> return as-is
 * 4. Local asset path (/scripts/dusk.webp) -> resolve with base URL
 * 5. Path/ID -> try dataSyncService for official character images
 * 6. Fallback -> return original URL
 *
 * @param imageUrl - The image URL from character data (may be asset ref, URL, or path)
 * @param characterId - The character ID (used for sync storage lookup)
 * @param options - Resolution options
 * @returns Resolved image with URL and source metadata
 *
 * @example
 * // Resolve a single character image
 * const result = await resolveCharacterImageUrl(character.image, character.id)
 * if (result.url) {
 *   <img src={result.url} />
 * }
 *
 * // Note: blob URLs are cached and managed by the resolver - no manual cleanup needed
 */
export async function resolveCharacterImageUrl(
  imageUrl: string | undefined,
  characterId: string,
  options: ResolveOptions = {}
): Promise<ResolvedImage> {
  const { skipSyncStorage = false, logContext } = options;

  // 0. Check persistent URL cache first (fastest path for repeated calls)
  const cachedUrl = getCachedIconUrl(characterId);
  if (cachedUrl) {
    return { url: cachedUrl, source: 'sync' };
  }

  // 1. Empty URL -> fallback
  if (!imageUrl?.trim()) {
    return { url: '', source: 'fallback' };
  }

  try {
    // 2. Asset reference -> resolve via AssetStorageService
    if (isAssetReference(imageUrl)) {
      const resolvedUrl = await resolveAssetUrl(imageUrl);
      return {
        url: resolvedUrl || imageUrl,
        source: resolvedUrl ? 'asset' : 'fallback',
      };
    }

    // 3. External URL -> return as-is
    if (isExternalUrl(imageUrl)) {
      return { url: imageUrl, source: 'external' };
    }

    // 4. Local asset path (e.g., /scripts/dusk.webp) -> resolve with base URL
    if (isLocalAssetPath(imageUrl)) {
      const resolvedPath = resolveLocalAssetPath(imageUrl);
      return { url: resolvedPath, source: 'external' };
    }

    // 5. Try sync storage for official character images
    if (!skipSyncStorage) {
      // Extract character ID from the path if different from provided ID
      const extractedId = extractCharacterIdFromPath(imageUrl);
      const lookupId = extractedId || characterId;

      try {
        const blob = await dataSyncService.getCharacterImage(lookupId);
        if (blob) {
          const blobUrl = URL.createObjectURL(blob);
          // Cache the blob URL for future use (persists for session)
          setCachedIconUrl(lookupId, blobUrl);
          return { url: blobUrl, source: 'sync', blobUrl };
        }
      } catch (_error) {
        // Silent fail - will fall through to fallback
        if (logContext) {
          logger.warn(logContext, `Failed to resolve from sync storage: ${lookupId}`);
        }
      }
    }

    // 6. Fallback -> return original URL
    return { url: imageUrl, source: 'fallback' };
  } catch (error) {
    if (logContext) {
      logger.error(logContext, `Failed to resolve character image: ${characterId}`, error);
    }
    return { url: imageUrl, source: 'fallback' };
  }
}

/**
 * Resolve images for a batch of characters
 *
 * This is optimized for list-based components that display many characters.
 * Uses parallel resolution with Promise.all for maximum performance.
 * Returns a Map for O(1) lookup by UUID.
 *
 * Note: Blob URLs are cached in the persistent URL cache and should NOT be
 * revoked by callers. The cache manages blob URL lifecycle for the session.
 *
 * @param characters - Array of characters to resolve images for
 * @param officialCharMap - Optional map of official character data for fallback
 * @returns Map of UUIDs to resolved URLs and list of new blob URLs created
 *
 * @example
 * const { urls } = await resolveCharacterImages(characters, officialCharMap)
 *
 * // Use in render
 * const iconUrl = urls.get(character.uuid)
 *
 * // Note: No cleanup needed - blob URLs are cached for the session
 */
export async function resolveCharacterImages(
  characters: Character[],
  officialCharMap?: Map<string, Character>
): Promise<BatchResolveResult> {
  const urls = new Map<string, string>();
  const blobUrls: string[] = [];

  // Prepare resolution tasks
  const resolutionTasks = characters
    .filter((char) => char.uuid)
    .map(async (char) => {
      // Get image URL from character or fallback to official data
      let imageUrl = getFirstImageUrl(char.image as string | string[] | undefined);

      if (!imageUrl && officialCharMap) {
        const officialChar = officialCharMap.get(char.id.toLowerCase());
        if (officialChar) {
          imageUrl = getFirstImageUrl(officialChar.image as string | string[] | undefined);
        }
      }

      if (!imageUrl || !char.uuid) return null;

      const result = await resolveCharacterImageUrl(imageUrl, char.id);

      return {
        uuid: char.uuid,
        url: result.url,
        blobUrl: result.blobUrl,
      };
    });

  // Resolve all in parallel
  const results = await Promise.all(resolutionTasks);

  // Collect results
  for (const result of results) {
    if (result?.url) {
      urls.set(result.uuid, result.url);
      if (result.blobUrl) {
        blobUrls.push(result.blobUrl);
      }
    }
  }

  return { urls, blobUrls };
}

// ============================================================================
// Pre-warming Functions
// ============================================================================

/**
 * Pre-warm the icon URL cache with all official character images
 *
 * This should be called after data sync completes to ensure all character
 * icons are readily available without async lookups.
 *
 * @param characterIds - Array of character IDs to pre-warm
 * @param onProgress - Optional progress callback
 * @returns Number of icons successfully cached
 */
export async function prewarmIconCache(
  characterIds: string[],
  onProgress?: (loaded: number, total: number) => void
): Promise<number> {
  const total = characterIds.length;
  let loaded = 0;
  let cached = 0;

  logger.info('CharacterImageResolver', `Pre-warming icon cache for ${total} characters...`);

  // Process in parallel with concurrency limit to avoid overwhelming the browser
  const BATCH_SIZE = 20;

  for (let i = 0; i < characterIds.length; i += BATCH_SIZE) {
    const batch = characterIds.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (characterId) => {
        try {
          // Skip if already cached
          if (hasIconUrlCached(characterId)) {
            loaded++;
            if (onProgress) onProgress(loaded, total);
            cached++;
            return;
          }

          // Resolve the image (this will cache the blob URL)
          const blob = await dataSyncService.getCharacterImage(characterId);
          if (blob) {
            const blobUrl = URL.createObjectURL(blob);
            setCachedIconUrl(characterId, blobUrl);
            cached++;
          }
        } catch (error) {
          // Silent fail - icon will be loaded on demand
          logger.debug('CharacterImageResolver', `Failed to pre-warm ${characterId}:`, error);
        } finally {
          loaded++;
          if (onProgress) onProgress(loaded, total);
        }
      })
    );
  }

  logger.info('CharacterImageResolver', `Pre-warmed ${cached}/${total} icons`);
  return cached;
}
