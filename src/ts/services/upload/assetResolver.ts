/**
 * Asset Reference Resolver
 *
 * Resolves asset:${id} references to blob URLs for rendering.
 * This enables persistent storage of asset references while
 * providing valid URLs at runtime.
 *
 * @module services/upload/assetResolver
 */

import type { AssetReference } from '@/ts/types/index.js';
import {
  createAssetReference as createRef,
  extractAssetId as extractId,
  isAssetReference as isAssetRef,
} from '@/ts/types/index.js';
import { logger } from '@/ts/utils/logger.js';
import { assetStorageService } from './AssetStorageService.js';

// ============================================================================
// Constants
// ============================================================================

/** Prefix used to identify asset references */
export const ASSET_REF_PREFIX = 'asset:';

// ============================================================================
// Type Guards and Utilities
// ============================================================================

/**
 * Check if a string is an asset reference (branded type guard)
 * Re-export from types/index.ts for convenience
 *
 * @param url - URL string to check
 * @returns True if the string is an AssetReference
 */
export function isAssetReference(url: string | undefined): url is AssetReference {
  return typeof url === 'string' && isAssetRef(url);
}

/**
 * Extract asset ID from an asset reference (with null safety)
 * Re-export from types/index.ts for convenience
 *
 * @param ref - Asset reference string (e.g., "asset:abc-123")
 * @returns Asset ID or null if not a valid reference
 */
export function extractAssetId(ref: string): string | null {
  if (!isAssetReference(ref)) return null;
  return extractId(ref);
}

/**
 * Create a type-safe asset reference from an asset ID
 * Re-export from types/index.ts for convenience
 *
 * @param assetId - Asset ID
 * @returns Branded AssetReference string
 */
export function createAssetReference(assetId: string): AssetReference {
  return createRef(assetId);
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
 * Note: We don't cache blob URLs here because they're ephemeral and become
 * invalid after page refresh. AssetStorageService.getByIdWithUrl() handles
 * its own caching with proper blob URL lifecycle management.
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

  // Resolve from storage (AssetStorageService handles caching internally)
  try {
    const asset = await assetStorageService.getByIdWithUrl(assetId);
    if (asset) {
      // Track asset usage (fire-and-forget, don't block resolution)
      assetStorageService.trackAssetUsage(assetId).catch((err) => {
        logger.warn('AssetResolver', `Failed to track asset usage for ${assetId}`, err);
      });

      return asset.url;
    }
  } catch (error) {
    logger.warn('AssetResolver', `Failed to resolve asset reference: ${url}`, error);
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
 * Resolve a character image field (string, AssetReference, or array)
 *
 * @param imageField - Image field value from character (URL or AssetReference)
 * @returns Resolved URL(s) in the same format as input
 */
export async function resolveCharacterImage(
  imageField: string | string[] | AssetReference | AssetReference[] | undefined
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
 * Note: Since blob URLs are not cached here anymore (they're ephemeral),
 * this will return the original URL for asset references. Use resolveAssetUrl()
 * for proper async resolution.
 *
 * @param url - URL that may be an asset reference
 * @returns Cached blob URL or original URL
 * @deprecated Prefer using resolveAssetUrl() instead for reliable resolution
 */
export function getResolvedUrlSync(url: string): string {
  if (!isAssetReference(url)) return url;

  const assetId = extractAssetId(url);
  if (!assetId) return url;

  // Note: resolvedUrlCache is no longer populated, so this will return the original URL
  return resolvedUrlCache.get(assetId) ?? url;
}

/**
 * Pre-resolve asset URLs for a batch of characters
 * Useful for batch token generation - warms up the AssetStorageService cache
 *
 * Note: We don't cache blob URLs here because they're ephemeral.
 * AssetStorageService.getByIdWithUrl() handles caching internally.
 *
 * @param imageFields - Array of image field values (URLs or AssetReferences)
 */
export async function preResolveAssets(
  imageFields: (string | string[] | AssetReference | AssetReference[] | undefined)[]
): Promise<void> {
  const assetIds = new Set<string>();

  for (const field of imageFields) {
    if (!field) continue;

    const urls = Array.isArray(field) ? field : [field];
    for (const url of urls) {
      if (isAssetReference(url)) {
        const id = extractAssetId(url);
        if (id) {
          assetIds.add(id);
        }
      }
    }
  }

  // Batch resolve all assets (warms up AssetStorageService's internal cache)
  await Promise.all(
    Array.from(assetIds).map(async (id) => {
      try {
        await assetStorageService.getByIdWithUrl(id);
      } catch (error) {
        logger.warn('AssetResolver', `Failed to pre-resolve asset: ${id}`, error);
      }
    })
  );
}

// ============================================================================
// Priority-Based Preloading
// ============================================================================

/**
 * Priority level for asset preloading
 * - high: First N tokens visible in viewport (load immediately)
 * - normal: Remaining visible tokens (load next)
 * - low: Off-screen tokens (load when idle)
 */
export type AssetPriority = 'high' | 'normal' | 'low';

/**
 * Preload task with priority
 */
export interface PreloadTask {
  /** Asset ID to preload */
  assetId: string;
  /** Priority level */
  priority: AssetPriority;
  /** Optional index for ordering within same priority */
  index?: number;
}

/**
 * Options for priority-based preloading
 */
export interface PreloadOptions {
  /** Maximum concurrent asset loads (default: 5) */
  concurrency?: number;
  /** Callback for progress updates */
  onProgress?: (loaded: number, total: number) => void;
}

/**
 * Pre-resolve assets with priority-based parallel loading
 * Loads high-priority assets first, with concurrency limiting
 *
 * @param tasks - Array of preload tasks with priorities
 * @param options - Preload options
 */
export async function preResolveAssetsWithPriority(
  tasks: PreloadTask[],
  options: PreloadOptions = {}
): Promise<void> {
  const { concurrency = 5, onProgress } = options;

  if (tasks.length === 0) {
    onProgress?.(0, 0);
    return;
  }

  // Sort by priority (high -> normal -> low), then by index
  const sortedTasks = [...tasks].sort((a, b) => {
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];

    if (priorityDiff !== 0) return priorityDiff;

    // Within same priority, sort by index
    return (a.index ?? 0) - (b.index ?? 0);
  });

  let loaded = 0;
  const total = sortedTasks.length;

  // Process tasks with concurrency limit
  const queue = [...sortedTasks];
  const inProgress = new Set<Promise<void>>();

  while (queue.length > 0 || inProgress.size > 0) {
    // Fill up to concurrency limit
    while (queue.length > 0 && inProgress.size < concurrency) {
      const task = queue.shift();
      if (!task) break;

      const promise = (async () => {
        try {
          // Warm up AssetStorageService's internal cache (don't cache blob URLs here)
          const asset = await assetStorageService.getByIdWithUrl(task.assetId);
          if (asset) {
            // Track asset usage (fire-and-forget)
            assetStorageService.trackAssetUsage(task.assetId).catch((err) => {
              logger.warn('AssetResolver', `Failed to track asset usage for ${task.assetId}`, err);
            });
          }
        } catch (error) {
          logger.warn(
            'AssetResolver',
            `Failed to pre-resolve asset (priority: ${task.priority}): ${task.assetId}`,
            error
          );
        } finally {
          loaded++;
          onProgress?.(loaded, total);
        }
      })();

      inProgress.add(promise);

      // Remove from in-progress when done
      promise.finally(() => {
        inProgress.delete(promise);
      });
    }

    // Wait for at least one to complete before adding more
    if (inProgress.size > 0) {
      await Promise.race(inProgress);
    }
  }
}

/**
 * Create preload tasks from image fields with automatic prioritization
 * First N items are marked as high priority, rest as normal
 *
 * @param imageFields - Array of image field values (URLs or AssetReferences)
 * @param highPriorityCount - Number of items to mark as high priority (default: 10)
 * @returns Array of preload tasks
 */
export function createPreloadTasks(
  imageFields: (string | string[] | AssetReference | AssetReference[] | undefined)[],
  highPriorityCount: number = 10
): PreloadTask[] {
  const tasks: PreloadTask[] = [];

  imageFields.forEach((field, index) => {
    if (!field) return;

    const urls = Array.isArray(field) ? field : [field];
    for (const url of urls) {
      if (isAssetReference(url)) {
        const assetId = extractAssetId(url);
        if (assetId) {
          tasks.push({
            assetId,
            priority: index < highPriorityCount ? 'high' : 'normal',
            index,
          });
        }
      }
    }
  });

  return tasks;
}
