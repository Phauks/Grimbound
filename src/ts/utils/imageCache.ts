/**
 * Blood on the Clocktower Token Generator
 * Global Image Cache - Singleton for sharing cached images across TokenGenerator instances
 */

import { loadImage, loadLocalImage } from './imageUtils.js';
import { dataSyncService } from '../sync/index.js';

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
 */
function extractCharacterIdFromUrl(url: string): string | null {
    // Get the filename from the path (last segment)
    const segments = url.split('/');
    const filename = segments[segments.length - 1];
    
    // Extract character ID from filename (remove extension)
    const match = filename.match(/^([a-z_]+)\.(?:webp|png|jpg|jpeg|gif)$/i);
    if (match) {
        return match[1].toLowerCase();
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
     * First checks sync storage (Cache API) for official character images,
     * then falls back to network loading
     */
    async get(url: string, isLocal: boolean = false): Promise<HTMLImageElement> {
        const entry = this.cache.get(url);
        if (entry) {
            // Update last accessed time for LRU
            entry.lastAccessed = Date.now();
            return entry.image;
        }

        let image: HTMLImageElement;

        // For non-local images, try to load from sync storage first
        if (!isLocal) {
            const characterId = extractCharacterIdFromUrl(url);
            if (characterId) {
                try {
                    const cachedBlob = await dataSyncService.getCharacterImage(characterId);
                    if (cachedBlob) {
                        image = await blobToImage(cachedBlob);
                        console.log(`[ImageCache] Loaded ${characterId} from sync storage`);
                    } else {
                        // Not in sync storage, load from network
                        image = await loadImage(url);
                    }
                } catch (error) {
                    console.warn(`[ImageCache] Failed to load ${characterId} from sync storage, falling back to network:`, error);
                    image = await loadImage(url);
                }
            } else {
                // Can't extract character ID, load from network
                image = await loadImage(url);
            }
        } else {
            // Local image
            image = await loadLocalImage(url);
        }
        
        // Estimate size (width * height * 4 bytes per pixel)
        const estimatedSize = (image.naturalWidth || 100) * (image.naturalHeight || 100) * 4;
        
        // Evict if necessary before adding
        await this.evictIfNeeded(estimatedSize);
        
        // Add to cache
        this.cache.set(url, {
            image,
            lastAccessed: Date.now(),
            size: estimatedSize
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
            sizeMB: Math.round(this.currentSizeBytes / 1024 / 1024 * 100) / 100,
            maxSizeMB: Math.round(this.maxSizeBytes / 1024 / 1024)
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
     * Preload multiple images in parallel
     */
    async preloadMany(urls: string[], isLocal: boolean = false): Promise<void> {
        await Promise.all(urls.map(url => this.get(url, isLocal)));
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
    maxSizeMB: 100,  // 100MB cache limit
    maxEntries: 500  // Max 500 images
});

export default globalImageCache;
