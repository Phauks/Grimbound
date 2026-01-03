/**
 * Night Sheet Renderer
 *
 * Renders a NightSheetPrintable React component offscreen and captures
 * it as a canvas using Snapdom for true WYSIWYG PDF export.
 *
 * This module handles:
 * - Offscreen container creation at DPI-correct dimensions
 * - React component mounting and rendering
 * - Image URL pre-resolution for all entries
 * - Font loading and waiting
 * - Snapdom capture with hi-DPI support
 * - Cleanup of resources
 */

import { createRoot } from 'react-dom/client';
import type { NightSheetBackground } from '@/components/ViewComponents/ScriptComponents/NightOrderView';
import {
  NightSheetPrintable,
  type NightSheetType,
} from '@/components/ViewComponents/ScriptComponents/NightSheetPrintable';
import CONFIG from '@/ts/config.js';
import type { ScriptMeta } from '@/ts/types/index.js';
import { resolveCharacterImageUrl } from '@/ts/utils/characterImageResolver.js';
import { loadImage } from '@/ts/utils/imageUtils.js';
import { logger } from '@/ts/utils/logger.js';
import type { NightOrderEntry } from './nightOrderTypes.js';

// ============================================================================
// Types
// ============================================================================

export interface RenderOptions {
  /** Night type ('first' or 'other') */
  nightType: NightSheetType;
  /** Night order entries */
  entries: NightOrderEntry[];
  /** Script metadata */
  scriptMeta: ScriptMeta | null;
  /** Background customization */
  background: NightSheetBackground;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

export interface RenderResult {
  /** Captured canvas */
  canvas: HTMLCanvasElement;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Letter page size in inches */
const PAGE_WIDTH_INCHES = 8.5;
const PAGE_HEIGHT_INCHES = 11;

/**
 * UI preview container width from NightOrderView.module.css
 * The UI uses max-width: 680px for the page preview.
 * To match WYSIWYG, we must render at the same dimensions.
 */
const UI_PREVIEW_WIDTH = 680;

/** Timeout for image loading (ms) */
const IMAGE_LOAD_TIMEOUT = 15000;

/** Cached Snapdom import to avoid repeated dynamic imports */
let snapdomModule: typeof import('@zumer/snapdom') | null = null;

/** Promise lock to prevent concurrent preload calls (React StrictMode calls effects twice) */
let preloadPromise: Promise<void> | null = null;

/** Set of font families that have been warmed for Snapdom embedding */
const warmedFonts = new Set<string>();

/** Promise lock for font warming (one at a time) */
let fontWarmPromise: Promise<void> | null = null;

/**
 * Pre-load Snapdom module for faster captures.
 */
export async function preloadSnapdom(): Promise<void> {
  // Return existing promise if already loading (prevents duplicate work in StrictMode)
  if (preloadPromise) {
    logger.debug('NightSheetRenderer', 'Preload already in progress, waiting...');
    return preloadPromise;
  }

  // Already loaded
  if (snapdomModule) {
    logger.debug('NightSheetRenderer', 'Snapdom module already cached');
    return;
  }

  // Start loading with promise lock
  preloadPromise = (async () => {
    const startTime = performance.now();
    logger.info('NightSheetRenderer', 'Loading Snapdom module...');

    try {
      snapdomModule = await import('@zumer/snapdom');
      logger.info(
        'NightSheetRenderer',
        `Snapdom module loaded in ${(performance.now() - startTime).toFixed(0)}ms`
      );
    } finally {
      preloadPromise = null;
    }
  })();

  return preloadPromise;
}

/**
 * Warm Snapdom's font cache for specific font families.
 *
 * Snapdom's embedFonts option is slow on first use (~13s) because it needs to
 * find, fetch, and encode font files as base64. By warming fonts when the user
 * selects them (not when they export), we shift the delay to a less critical moment.
 *
 * @param fonts - Array of font family names to warm
 * @returns Promise that resolves when warming is complete
 */
export async function warmFonts(fonts: string[]): Promise<void> {
  // Filter out already-warmed fonts
  const fontsToWarm = fonts.filter((f) => !warmedFonts.has(f));

  if (fontsToWarm.length === 0) {
    logger.debug('NightSheetRenderer', 'All fonts already warmed', { fonts });
    return;
  }

  // Wait for any in-progress warming
  if (fontWarmPromise) {
    logger.debug('NightSheetRenderer', 'Font warming in progress, waiting...');
    await fontWarmPromise;
    // Check again after waiting - fonts may have been warmed
    const stillNeedWarming = fontsToWarm.filter((f) => !warmedFonts.has(f));
    if (stillNeedWarming.length === 0) {
      return;
    }
  }

  // Ensure Snapdom is loaded
  await preloadSnapdom();
  if (!snapdomModule) {
    logger.warn('NightSheetRenderer', 'Cannot warm fonts - Snapdom not loaded');
    return;
  }

  // Start warming with promise lock
  fontWarmPromise = (async () => {
    const startTime = performance.now();
    const fontFamily = fontsToWarm.join(', ');

    logger.info('NightSheetRenderer', `Warming fonts: ${fontsToWarm.join(', ')}...`);

    // Create a minimal element with all fonts to warm
    const dummy = document.createElement('div');
    dummy.style.position = 'fixed';
    dummy.style.left = '-9999px';
    dummy.style.width = '10px';
    dummy.style.height = '10px';
    dummy.style.fontFamily = fontFamily;
    dummy.textContent = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    document.body.appendChild(dummy);

    try {
      // This forces Snapdom to process and cache the fonts
      await snapdomModule.snapdom(dummy, { scale: 1, embedFonts: true });

      // Mark fonts as warmed
      for (const font of fontsToWarm) {
        warmedFonts.add(font);
      }

      logger.info(
        'NightSheetRenderer',
        `Fonts warmed in ${(performance.now() - startTime).toFixed(0)}ms`,
        { fonts: fontsToWarm }
      );
    } catch (error) {
      logger.warn('NightSheetRenderer', 'Font warming failed', error);
    } finally {
      dummy.remove();
      fontWarmPromise = null;
    }
  })();

  return fontWarmPromise;
}

/**
 * Warm the default night sheet fonts.
 * Call this when user navigates to the night order view.
 */
export function warmDefaultNightSheetFonts(): void {
  // Fire and forget - don't await, let it run in background
  warmFonts(['Dumbledor', 'Goudy Old Style', 'TradeGothic', 'TradeGothicBold']).catch(() => {
    // Ignore errors - this is just pre-warming
  });
}

/**
 * Check if fonts are warmed (useful for UI feedback)
 */
export function areFontsWarmed(fonts: string[]): boolean {
  return fonts.every((f) => warmedFonts.has(f));
}

/**
 * Get the current font warming status
 */
export function getFontWarmingStatus(): { isWarming: boolean; warmedFonts: string[] } {
  return {
    isWarming: fontWarmPromise !== null,
    warmedFonts: Array.from(warmedFonts),
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create an offscreen container at UI preview dimensions.
 *
 * Strategy for true WYSIWYG:
 * - Render at EXACT UI preview dimensions (680px wide, letter aspect ratio)
 * - Snapdom scales up to target DPI during capture
 * - This ensures PDF matches UI exactly - same icon sizes, same text wrapping
 */
function createOffscreenContainer(): HTMLDivElement {
  const container = document.createElement('div');

  // Position off-screen but still rendered (Snapdom needs visible elements)
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';

  // Use EXACT UI preview dimensions for true WYSIWYG
  // UI uses max-width: 680px with letter aspect ratio (8.5/11)
  const width = UI_PREVIEW_WIDTH;
  const height = Math.round(width * (PAGE_HEIGHT_INCHES / PAGE_WIDTH_INCHES));

  container.style.width = `${width}px`;
  container.style.height = `${height}px`;
  container.style.overflow = 'hidden';
  container.style.backgroundColor = 'transparent';

  document.body.appendChild(container);

  return container;
}

/**
 * Convert an image to a data URL for CORS-safe embedding
 *
 * This is necessary because Snapdom renders to canvas, which requires
 * images to be loaded with CORS headers. By converting to data URLs,
 * we ensure the images can be safely rendered regardless of source.
 */
async function imageToDataUrl(img: HTMLImageElement): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2d context');
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL('image/png');
}

/**
 * Pre-resolve and load all character image URLs as data URLs
 *
 * This function:
 * 1. Resolves image URLs via SSOT (handles asset refs, sync storage, etc.)
 * 2. Loads images with CORS handling (auto-falls back to proxy)
 * 3. Converts to data URLs for CORS-safe Snapdom rendering
 */
async function preResolveImageUrls(
  entries: NightOrderEntry[],
  signal?: AbortSignal
): Promise<Map<string, string>> {
  const resolvedUrls = new Map<string, string>();
  const startTime = performance.now();
  let successCount = 0;
  let failCount = 0;

  // Resolve and load images in parallel
  const resolvePromises = entries.map(async (entry) => {
    if (signal?.aborted) return;

    try {
      // Step 1: Resolve URL via SSOT (handles asset:, sync storage, external)
      const result = await resolveCharacterImageUrl(entry.image, entry.id, {
        logContext: 'NightSheetRenderer',
      });

      // Step 2: Load image with CORS handling (auto proxy fallback)
      const img = await loadImage(result.url);

      // Step 3: Convert to data URL for CORS-safe canvas rendering
      const dataUrl = await imageToDataUrl(img);
      resolvedUrls.set(entry.id, dataUrl);
      successCount++;
    } catch (error) {
      failCount++;
      logger.warn('NightSheetRenderer', `Failed to load image for ${entry.name}`, error);
      // Keep original URL as fallback (may still fail in canvas but at least visible)
      resolvedUrls.set(entry.id, entry.image);
    }
  });

  await Promise.all(resolvePromises);

  logger.info(
    'NightSheetRenderer',
    `Pre-resolved ${entries.length} images in ${(performance.now() - startTime).toFixed(0)}ms`,
    {
      success: successCount,
      failed: failCount,
    }
  );

  return resolvedUrls;
}

/**
 * Wait for all images in container to load
 */
async function waitForImages(container: HTMLElement, signal?: AbortSignal): Promise<void> {
  const images = container.querySelectorAll('img');

  const loadPromises = Array.from(images).map((img) => {
    // Already loaded
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
        // Don't fail on image error - just continue
        resolve();
      };

      img.addEventListener('load', onLoad);
      img.addEventListener('error', onError);

      // Timeout for slow images
      const timeout = setTimeout(() => {
        cleanup();
        resolve();
      }, IMAGE_LOAD_TIMEOUT);

      // Handle abort
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
 */
async function waitForFonts(): Promise<void> {
  // Wait for document fonts to be ready
  await document.fonts.ready;

  // Additionally try to load specific fonts we need
  const fontFamilies = ['Dumbledor', 'Goudy Old Style', 'TradeGothic', 'TradeGothicBold'];

  const fontPromises = fontFamilies.map(async (family) => {
    try {
      await document.fonts.load(`1rem "${family}"`);
    } catch {
      // Font might not exist, that's OK
    }
  });

  await Promise.all(fontPromises);
}

/**
 * Capture container with Snapdom, scaling to target DPI.
 *
 * Container is at UI preview dimensions (680×880).
 * Snapdom scales up to target PDF dimensions (2550×3300 at 300 DPI).
 */
async function captureWithSnapdom(
  element: HTMLElement,
  targetDpi: number
): Promise<HTMLCanvasElement> {
  // Use cached module or import if not yet loaded
  if (!snapdomModule) {
    snapdomModule = await import('@zumer/snapdom');
  }
  const { snapdom } = snapdomModule;

  // Calculate scale factor to reach target DPI dimensions
  // UI preview: 680px wide
  // Target: 8.5" × targetDpi = 2550px at 300 DPI
  const targetWidth = PAGE_WIDTH_INCHES * targetDpi;
  const scaleFactor = targetWidth / UI_PREVIEW_WIDTH;

  // Capture with scaling for print quality
  // Snapdom renders at the scaled resolution, so text/images are sharp
  const result = await snapdom(element, {
    scale: scaleFactor,
    // Must embed fonts for correct rendering in SVG → Canvas conversion
    embedFonts: true,
  });

  // Convert to canvas
  const canvas = await result.toCanvas();

  return canvas;
}

// ============================================================================
// Main Export Function
// ============================================================================

/**
 * Render a night sheet to canvas using Snapdom
 *
 * @param options - Render options including entries and background
 * @returns Canvas element with the rendered night sheet
 */
export async function renderNightSheetToCanvas(options: RenderOptions): Promise<RenderResult> {
  const { nightType, entries, scriptMeta, background, signal } = options;

  // Check for abort before starting
  if (signal?.aborted) {
    throw new DOMException('Render aborted', 'AbortError');
  }

  logger.info('NightSheetRenderer', `Rendering ${nightType} night at ${CONFIG.PDF.DPI} DPI`, {
    entryCount: entries.length,
  });

  const startTime = performance.now();
  const timings: Record<string, number> = {};

  // Step 1: Pre-resolve all image URLs (parallel)
  const resolveStart = performance.now();
  const resolvedImageUrls = await preResolveImageUrls(entries, signal);
  timings.imageResolve = performance.now() - resolveStart;

  if (signal?.aborted) {
    throw new DOMException('Render aborted', 'AbortError');
  }

  // Step 2: Create offscreen container at UI preview dimensions
  const container = createOffscreenContainer();

  try {
    // Step 3: Render React component into container
    const renderStart = performance.now();
    const root = createRoot(container);

    root.render(
      <NightSheetPrintable
        type={nightType}
        entries={entries}
        scriptMeta={scriptMeta}
        background={background}
        resolvedImageUrls={resolvedImageUrls}
      />
    );

    // Poll for React to render content (fast when ready, handles race condition)
    const maxWaitMs = 500;
    const waitStart = performance.now();

    while (performance.now() - waitStart < maxWaitMs) {
      // Check if React has rendered the sheet
      if (container.querySelector('[data-night-type]')) {
        break;
      }
      // Wait one frame and check again
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }

    timings.reactRender = performance.now() - renderStart;

    if (signal?.aborted) {
      root.unmount();
      throw new DOMException('Render aborted', 'AbortError');
    }

    // Final verification
    if (!container.querySelector('[data-night-type]')) {
      logger.error('NightSheetRenderer', 'React failed to render within timeout');
      throw new Error('React component failed to render');
    }

    // Step 4: Wait for fonts and images to load (parallel)
    const loadStart = performance.now();
    await Promise.all([waitForFonts(), waitForImages(container, signal)]);
    timings.assetLoad = performance.now() - loadStart;

    if (signal?.aborted) {
      root.unmount();
      throw new DOMException('Render aborted', 'AbortError');
    }

    // Step 5: Capture with Snapdom (scales up to target DPI)
    const captureStart = performance.now();
    const canvas = await captureWithSnapdom(container, CONFIG.PDF.DPI);
    timings.snapdomCapture = performance.now() - captureStart;

    // Step 6: Cleanup React
    root.unmount();

    const endTime = performance.now();
    logger.info(
      'NightSheetRenderer',
      `Captured ${nightType} night in ${(endTime - startTime).toFixed(0)}ms`,
      {
        width: canvas.width,
        height: canvas.height,
        timings: {
          imageResolve: `${timings.imageResolve.toFixed(0)}ms`,
          reactRender: `${timings.reactRender.toFixed(0)}ms`,
          assetLoad: `${timings.assetLoad.toFixed(0)}ms`,
          snapdomCapture: `${timings.snapdomCapture.toFixed(0)}ms`,
        },
      }
    );

    return {
      canvas,
      width: canvas.width,
      height: canvas.height,
    };
  } finally {
    // Always cleanup container
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}
