/**
 * Blood on the Clocktower Token Generator
 * Image Cache Adapter - Adapter pattern for global image cache
 *
 * Provides a clean interface for dependency injection into TokenGenerator.
 */

import { globalImageCache } from '@/ts/utils/imageCache.js';
import type { IImageCache } from './TokenImageRenderer.js';

/**
 * Adapter that wraps the global image cache to implement IImageCache interface
 */
export class ImageCacheAdapter implements IImageCache {
  /**
   * Get cached image (with CORS support for external URLs)
   */
  async get(url: string, isLocal: boolean): Promise<HTMLImageElement> {
    return globalImageCache.get(url, isLocal);
  }

  /**
   * Clear all cached images
   */
  clear(): void {
    globalImageCache.clear();
  }

  /**
   * Pre-warm cache with multiple URLs
   */
  async prewarm(urls: string[]): Promise<void> {
    await Promise.allSettled(urls.map((url) => globalImageCache.get(url, false)));
  }
}

/**
 * Default image cache adapter instance
 */
export const defaultImageCache = new ImageCacheAdapter();

export default ImageCacheAdapter;
