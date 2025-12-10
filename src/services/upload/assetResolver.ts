/**
 * Asset Reference Resolver
 *
 * Resolves asset:${id} references to blob URLs for rendering.
 * This enables persistent storage of asset references while
 * providing valid URLs at runtime.
 *
 * @module services/upload/assetResolver
 */

import { assetStorageService } from './AssetStorageService.js';

// ============================================================================
// Constants
// ============================================================================

/** Prefix used to identify asset references */
export const ASSET_REF_PREFIX = 'asset:';

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a string is an asset reference
 *
 * @param url - URL string to check
 * @returns True if the string is an asset reference
 */
export function isAssetReference(url: string | undefined): boolean {
  return typeof url === 'string' && url.startsWith(ASSET_REF_PREFIX);
}

/**
 * Extract asset ID from an asset reference
 *
 * @param ref - Asset reference string (e.g., "asset:abc-123")
 * @returns Asset ID or null if not a valid reference
 */
export function extractAssetId(ref: string): string | null {
  if (!isAssetReference(ref)) return null;
  return ref.slice(ASSET_REF_PREFIX.length);
}

/**
 * Create an asset reference from an asset ID
 *
 * @param assetId - Asset ID
 * @returns Asset reference string
 */
export function createAssetReference(assetId: string): string {
  return `${ASSET_REF_PREFIX}${assetId}`;
}

// ============================================================================
// Resolution Functions
// ============================================================================

/**
 * Cache for resolved asset URLs to avoid repeated lookups
 * Maps asset ID -> blob URL
 */
const resolvedUrlCache = new Map<string, string>();

/**
 * Clear the resolved URL cache
 * Call this when assets are deleted or the app reloads
 */
export function clearResolvedUrlCache(): void {
  resolvedUrlCache.clear();
}

/**
 * Resolve a single URL, handling asset references
 *
 * @param url - URL that may be an asset reference or regular URL
 * @returns Resolved URL (blob URL if asset reference, original otherwise)
 */
export async function resolveAssetUrl(url: string): Promise<string> {
  // Not an asset reference - return as-is
  if (!isAssetReference(url)) {
    return url;
  }

  const assetId = extractAssetId(url);
  if (!assetId) return url;

  // Check cache first
  const cached = resolvedUrlCache.get(assetId);
  if (cached) {
    return cached;
  }

  // Resolve from storage
  try {
    const asset = await assetStorageService.getByIdWithUrl(assetId);
    if (asset) {
      resolvedUrlCache.set(assetId, asset.url);
      return asset.url;
    }
  } catch (error) {
    console.warn(`Failed to resolve asset reference: ${url}`, error);
  }

  // Asset not found - return empty or placeholder
  return '';
}

/**
 * Resolve multiple URLs, handling asset references
 *
 * @param urls - Array of URLs that may include asset references
 * @returns Array of resolved URLs
 */
export async function resolveAssetUrls(urls: string[]): Promise<string[]> {
  return Promise.all(urls.map(resolveAssetUrl));
}

/**
 * Resolve a character image field (string or array)
 *
 * @param imageField - Image field value from character
 * @returns Resolved URL(s) in the same format as input
 */
export async function resolveCharacterImage(
  imageField: string | string[] | undefined
): Promise<string | string[] | undefined> {
  if (!imageField) return imageField;

  if (typeof imageField === 'string') {
    return resolveAssetUrl(imageField);
  }

  if (Array.isArray(imageField)) {
    return resolveAssetUrls(imageField);
  }

  return imageField;
}

/**
 * Synchronously get a resolved URL from cache (for preview rendering)
 * Returns the original URL if not cached
 *
 * @param url - URL that may be an asset reference
 * @returns Cached blob URL or original URL
 */
export function getResolvedUrlSync(url: string): string {
  if (!isAssetReference(url)) return url;

  const assetId = extractAssetId(url);
  if (!assetId) return url;

  return resolvedUrlCache.get(assetId) ?? url;
}

/**
 * Pre-resolve and cache asset URLs for a batch of characters
 * Useful for batch token generation
 *
 * @param imageFields - Array of image field values
 */
export async function preResolveAssets(
  imageFields: (string | string[] | undefined)[]
): Promise<void> {
  const assetIds = new Set<string>();

  for (const field of imageFields) {
    if (!field) continue;

    const urls = Array.isArray(field) ? field : [field];
    for (const url of urls) {
      if (isAssetReference(url)) {
        const id = extractAssetId(url);
        if (id && !resolvedUrlCache.has(id)) {
          assetIds.add(id);
        }
      }
    }
  }

  // Batch resolve all uncached assets
  await Promise.all(
    Array.from(assetIds).map(async (id) => {
      try {
        const asset = await assetStorageService.getByIdWithUrl(id);
        if (asset) {
          resolvedUrlCache.set(id, asset.url);
        }
      } catch (error) {
        console.warn(`Failed to pre-resolve asset: ${id}`, error);
      }
    })
  );
}
