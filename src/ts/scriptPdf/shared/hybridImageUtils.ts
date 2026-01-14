/**
 * Hybrid Image Utilities
 *
 * Shared utilities for image loading and conversion in hybrid PDF rendering.
 */

import { getAnyBuiltInAssetPath, isAnyBuiltInAsset } from '@/ts/constants/builtInAssets.js';
import { resolveAssetUrl } from '@/ts/services/upload/assetResolver.js';
import { resolveCharacterImageUrl } from '@/ts/utils/characterImageResolver.js';
import { applyCorsProxy, loadImage } from '@/ts/utils/imageUtils.js';
import { logger } from '@/ts/utils/logger.js';
import { IMAGE_LOAD_TIMEOUT, SCRIPT_FONT_FAMILIES } from './hybridConstants.js';

/**
 * Convert an image to a data URL for CORS-safe embedding
 */
export async function imageToDataUrl(img: HTMLImageElement): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2d context');
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Resolve script logo URL through CORS proxy and convert to data URL
 *
 * @param logoUrl - The logo URL to resolve
 * @param logContext - Logger context name
 */
export async function resolveScriptLogo(
  logoUrl: string | undefined,
  logContext = 'HybridRenderer'
): Promise<string | undefined> {
  if (!logoUrl) return undefined;

  try {
    const proxiedUrl = applyCorsProxy(logoUrl);
    const img = await loadImage(proxiedUrl);
    return await imageToDataUrl(img);
  } catch (error) {
    logger.warn(logContext, `Failed to load script logo: ${logoUrl}`, error);
    return undefined;
  }
}

/**
 * Resolve background image URL (asset reference or external URL) to data URL
 *
 * This handles:
 * 1. Built-in asset IDs (script_background_1, character_background_1, etc.) - type-agnostic
 * 2. Asset references (asset:uuid) -> IndexedDB
 * 3. External URLs (http/https/data/blob)
 *
 * Design principle: Asset types are for organization, not restriction.
 *
 * @param imageUrl - The image URL to resolve
 * @param logContext - Logger context name
 */
export async function resolveBackgroundImage(
  imageUrl: string | undefined,
  logContext = 'HybridRenderer'
): Promise<string | undefined> {
  if (!imageUrl) return undefined;

  try {
    // 1. Check for ANY built-in asset first (type-agnostic)
    if (isAnyBuiltInAsset(imageUrl)) {
      const builtInPath = getAnyBuiltInAssetPath(imageUrl);
      if (builtInPath) {
        const img = await loadImage(builtInPath);
        return await imageToDataUrl(img);
      }
    }

    // 2. Try to resolve asset references (asset:uuid -> blob URL)
    const resolvedUrl = await resolveAssetUrl(imageUrl);

    // 3. Load the image and convert to data URL for Snapdom
    const proxiedUrl = applyCorsProxy(resolvedUrl);
    const img = await loadImage(proxiedUrl);
    return await imageToDataUrl(img);
  } catch (error) {
    logger.warn(logContext, `Failed to load background image: ${imageUrl}`, error);
    return undefined;
  }
}

/**
 * Item with id and optional image for pre-resolution
 */
interface ImageItem {
  id: string;
  image?: string;
  name?: string;
}

/**
 * Pre-resolve all character/entry image URLs as data URLs
 *
 * @param items - Array of items with id and image properties
 * @param logContext - Logger context name
 * @param signal - Abort signal for cancellation
 */
export async function preResolveImageUrls<T extends ImageItem>(
  items: T[],
  logContext = 'HybridRenderer',
  signal?: AbortSignal
): Promise<Map<string, string>> {
  const resolvedUrls = new Map<string, string>();

  const resolvePromises = items.map(async (item) => {
    if (signal?.aborted) return;
    if (!item.image) return;

    try {
      const result = await resolveCharacterImageUrl(item.image, item.id, {
        logContext,
      });
      const img = await loadImage(result.url);
      const dataUrl = await imageToDataUrl(img);
      resolvedUrls.set(item.id, dataUrl);
    } catch (error) {
      const name = item.name || item.id;
      logger.warn(logContext, `Failed to load image for ${name}`, error);
      if (item.image) {
        resolvedUrls.set(item.id, item.image);
      }
    }
  });

  await Promise.all(resolvePromises);
  return resolvedUrls;
}

/**
 * Wait for all images in container to load
 *
 * @param container - The container element to search for images
 * @param signal - Abort signal for cancellation
 */
export async function waitForImages(container: HTMLElement, signal?: AbortSignal): Promise<void> {
  const images = container.querySelectorAll('img');

  const loadPromises = Array.from(images).map((img) => {
    if (img.complete && img.naturalWidth > 0) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      const cleanup = () => {
        img.removeEventListener('load', onLoad);
        img.removeEventListener('error', onError);
        clearTimeout(timeout);
      };

      const onLoad = () => {
        cleanup();
        resolve();
      };

      const onError = () => {
        cleanup();
        resolve();
      };

      img.addEventListener('load', onLoad);
      img.addEventListener('error', onError);

      const timeout = setTimeout(() => {
        cleanup();
        resolve();
      }, IMAGE_LOAD_TIMEOUT);

      if (signal) {
        signal.addEventListener(
          'abort',
          () => {
            cleanup();
            resolve();
          },
          { once: true }
        );
      }
    });
  });

  await Promise.all(loadPromises);
}

/**
 * Wait for fonts to be ready
 *
 * Waits for document.fonts.ready and then explicitly loads each font family.
 */
export async function waitForFonts(): Promise<void> {
  await document.fonts.ready;

  const fontPromises = SCRIPT_FONT_FAMILIES.map(async (family) => {
    try {
      await document.fonts.load(`1rem "${family}"`);
    } catch {
      // Font might not exist
    }
  });

  await Promise.all(fontPromises);
}
