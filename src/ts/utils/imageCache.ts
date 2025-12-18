/**
 * Blood on the Clocktower Token Generator
 * Global Image Cache - Singleton for sharing cached images across TokenGenerator instances
 */

import { cacheInvalidationService } from '@/ts/cache/CacheInvalidationService.js';
import { dataSyncService } from '@/ts/sync/index.js';
import { loadImage, loadLocalImage } from './imageUtils.js';
import { logger } from './logger.js';

// ============================================================================
// TYPES
// ============================================================================

interface CacheEntry {
  image: HTMLImageElement;
  lastAccessed: number;
  size: number;
}

interface ImageCacheOptions {
  maxSizeMB?: number;
  maxEntries?: number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract character ID from a URL or path
 * Handles various URL formats:
 * - https://example.com/icons/washerwoman.webp → washerwoman
 * - icons/carousel/steward.webp → steward
 * - /icons/chef.webp → chef
 * - washerwoman.png → washerwoman
 * - washerwoman → washerwoman (plain ID without extension)
 */
function extractCharacterIdFromUrl(url: string): string | null {
  // Get the filename from the path (last segment)
  const segments = url.split('/');
  const filename = segments[segments.length - 1];

  // First try: Extract character ID from filename with extension
  const matchWithExt = filename.match(/^([a-z_]+)\.(?:webp|png|jpg|jpeg|gif)$/i);
  if (matchWithExt) {
    return matchWithExt[1].toLowerCase();
  }

  // Second try: Plain character ID without extension (e.g., "washerwoman")
  const matchPlainId = filename.match(/^([a-z_]+)$/i);
  if (matchPlainId) {
    return matchPlainId[1].toLowerCase();
  }

  return null;
}

/**
 * Create an HTMLImageElement from a Blob
 */
async function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(blob);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image from blob'));
    };

    img.src = objectUrl;
  });
}

// ============================================================================
// IMAGE CACHE CLASS
// ============================================================================

/**
 * LRU Image Cache with size-based eviction
 */
class ImageCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSizeBytes: number;
  private maxEntries: number;
  private currentSizeBytes: number = 0;

  constructor(options: ImageCacheOptions = {}) {
    this.maxSizeBytes = (options.maxSizeMB ?? 50) * 1024 * 1024; // Default 50MB
    this.maxEntries = options.maxEntries ?? 500;
  }

  /**
   * Get a cached image by URL, loading it if not present
   * For relative paths (no http/https), tries sync storage first for official character images.
   * For external URLs (http/https), loads directly from network to ensure custom images are used.
   */
  async get(url: string, isLocal: boolean = false): Promise<HTMLImageElement> {
    const entry = this.cache.get(url);
    if (entry) {
      // Update last accessed time for LRU
      entry.lastAccessed = Date.now();
      return entry.image;
    }

    let image: HTMLImageElement;

    // Check if this is an external URL (http:// or https://)
    const isExternalUrl = url.startsWith('http://') || url.startsWith('https://');

    // For local files, load directly
    if (isLocal) {
      image = await loadLocalImage(url);
    }
    // For external URLs, always load from network (custom images)
    else if (isExternalUrl) {
      image = await loadImage(url);
    }
    // For relative paths (official images), try sync storage first
    else {
      const characterId = extractCharacterIdFromUrl(url);
      if (characterId) {
        try {
          const cachedBlob = await dataSyncService.getCharacterImage(characterId);
          if (cachedBlob) {
            image = await blobToImage(cachedBlob);
            logger.debug('ImageCache', `Loaded ${characterId} from sync storage`);
          } else {
            // Not in sync storage, load from network
            image = await loadImage(url);
          }
        } catch (error) {
          logger.warn(
            'ImageCache',
            `Failed to load ${characterId} from sync storage, falling back to network`,
            error
          );
          image = await loadImage(url);
        }
      } else {
        // Can't extract character ID, load from network
        image = await loadImage(url);
      }
    }

    // Estimate size (width * height * 4 bytes per pixel)
    const estimatedSize = (image.naturalWidth || 100) * (image.naturalHeight || 100) * 4;

    // Evict if necessary before adding
    await this.evictIfNeeded(estimatedSize);

    // Add to cache
    this.cache.set(url, {
      image,
      lastAccessed: Date.now(),
      size: estimatedSize,
    });
    this.currentSizeBytes += estimatedSize;

    return image;
  }

  /**
   * Check if URL is already cached
   */
  has(url: string): boolean {
    return this.cache.has(url);
  }

  /**
   * Convenience method to get a local image (shorthand for get(url, true))
   */
  async getLocal(url: string): Promise<HTMLImageElement> {
    return this.get(url, true);
  }

  /**
   * Get cache statistics
   */
  getStats(): { entries: number; sizeMB: number; maxSizeMB: number } {
    return {
      entries: this.cache.size,
      sizeMB: Math.round((this.currentSizeBytes / 1024 / 1024) * 100) / 100,
      maxSizeMB: Math.round(this.maxSizeBytes / 1024 / 1024),
    };
  }

  /**
   * Evict oldest entries if cache exceeds limits
   */
  private async evictIfNeeded(newEntrySize: number): Promise<void> {
    // Check entry count
    while (this.cache.size >= this.maxEntries) {
      this.evictOldest();
    }

    // Check size limit
    while (this.currentSizeBytes + newEntrySize > this.maxSizeBytes && this.cache.size > 0) {
      this.evictOldest();
    }
  }

  /**
   * Evict the least recently used entry
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const entry = this.cache.get(oldestKey);
      if (entry) {
        this.currentSizeBytes -= entry.size;
      }
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Clear all cached images
   */
  clear(): void {
    this.cache.clear();
    this.currentSizeBytes = 0;
  }

  /**
   * Invalidate cached images for specific asset URLs
   *
   * @param urls - Array of asset URLs to invalidate
   */
  invalidateUrls(urls: string[]): void {
    let bytesFreed = 0;

    for (const url of urls) {
      const entry = this.cache.get(url);
      if (entry) {
        bytesFreed += entry.size;
        this.cache.delete(url);
      }
    }

    this.currentSizeBytes -= bytesFreed;
    logger.debug(
      'ImageCache',
      `Invalidated ${urls.length} URLs, freed ${(bytesFreed / 1024 / 1024).toFixed(2)} MB`
    );
  }

  /**
   * Invalidate cache entries matching a pattern (e.g., asset:id URLs)
   *
   * @param pattern - URL pattern to match
   */
  invalidatePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    const urlsToInvalidate: string[] = [];

    for (const [url] of this.cache) {
      if (regex.test(url)) {
        urlsToInvalidate.push(url);
      }
    }

    this.invalidateUrls(urlsToInvalidate);
  }

  /**
   * Preload multiple images in parallel
   * @param urls - Array of image URLs to preload
   * @param isLocal - Whether images are local file paths
   * @param onProgress - Optional progress callback (loaded count, total count)
   */
  async preloadMany(
    urls: string[],
    isLocal: boolean = false,
    onProgress?: (loaded: number, total: number) => void
  ): Promise<void> {
    const total = urls.length;
    let loaded = 0;

    // Load all images in parallel
    await Promise.all(
      urls.map(async (url) => {
        try {
          await this.get(url, isLocal);
        } catch (error) {
          logger.warn('ImageCache', `Failed to preload: ${url}`, error);
        } finally {
          loaded++;
          if (onProgress) {
            onProgress(loaded, total);
          }
        }
      })
    );
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/**
 * Global image cache singleton
 * Shared across all TokenGenerator instances for maximum cache utilization
 */
export const globalImageCache = new ImageCache({
  maxSizeMB: 100, // 100MB cache limit
  maxEntries: 500, // Max 500 images
});

// Subscribe to cache invalidation events
cacheInvalidationService.subscribe('asset', (event) => {
  // When an asset changes, invalidate any cached images using that asset
  // Asset URLs follow pattern: asset:${id}
  for (const assetId of event.entityIds) {
    globalImageCache.invalidatePattern(`asset:${assetId}`);
  }
});

cacheInvalidationService.subscribe('global', () => {
  // Global invalidation - clear entire cache
  globalImageCache.clear();
  logger.info('ImageCache', 'Cleared all cached images (global invalidation)');
});

export default globalImageCache;
