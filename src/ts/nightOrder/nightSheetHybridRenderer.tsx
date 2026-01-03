/**
 * Night Sheet Hybrid Renderer
 *
 * Renders a NightSheetPrintable React component for hybrid PDF export.
 * This renderer:
 * 1. Renders the component normally (visible text)
 * 2. Extracts text positions from the DOM
 * 3. Hides text using clip-path (preserves layout, works with any background)
 * 4. Captures with Snapdom (no font embedding)
 * 5. Returns both canvas and text positions for pdf-lib overlay
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
import { applyCorsProxy, loadImage } from '@/ts/utils/imageUtils.js';
import { logger } from '@/ts/utils/logger.js';
import type { NightOrderEntry } from './nightOrderTypes.js';
import {
  type ExtractedText,
  extractTextFromContainer,
  scaleTextPositions,
} from './textExtractor.js';

// ============================================================================
// Types
// ============================================================================

export interface HybridRenderOptions {
  /** Night type ('first' or 'other') */
  nightType: NightSheetType;
  /** Night order entries for this page */
  entries: NightOrderEntry[];
  /** Script metadata */
  scriptMeta: ScriptMeta | null;
  /** Background customization */
  background: NightSheetBackground;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
  /** Current page number (1-based) for multi-page exports */
  pageNumber?: number;
  /** Total number of pages for this night type */
  totalPages?: number;
}

export interface HybridRenderResult {
  /** Captured canvas (without text) */
  canvas: HTMLCanvasElement;
  /** Extracted text positions (scaled to PDF dimensions) */
  texts: ExtractedText[];
  /** Container width used for scaling */
  containerWidth: number;
  /** Container height used for scaling */
  containerHeight: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Letter page size in inches */
const PAGE_WIDTH_INCHES = 8.5;
const PAGE_HEIGHT_INCHES = 11;

/** UI preview container width (must match NightOrderView.module.css) */
const UI_PREVIEW_WIDTH = 680;

/** Letter page size in points */
const PAGE_WIDTH_PT = PAGE_WIDTH_INCHES * 72;
const PAGE_HEIGHT_PT = PAGE_HEIGHT_INCHES * 72;

/** Timeout for image loading (ms) */
const IMAGE_LOAD_TIMEOUT = 15000;

/** Cached Snapdom import */
let snapdomModule: typeof import('@zumer/snapdom') | null = null;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create an offscreen container at UI preview dimensions
 */
function createOffscreenContainer(): HTMLDivElement {
  const container = document.createElement('div');

  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';

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
 * Resolve script logo URL through CORS proxy and convert to data URL
 */
async function resolveScriptLogo(logoUrl: string | undefined): Promise<string | undefined> {
  if (!logoUrl) return undefined;

  try {
    // Apply CORS proxy for external URLs
    const proxiedUrl = applyCorsProxy(logoUrl);
    const img = await loadImage(proxiedUrl);
    return await imageToDataUrl(img);
  } catch (error) {
    logger.warn('HybridRenderer', `Failed to load script logo: ${logoUrl}`, error);
    return undefined;
  }
}

/**
 * Pre-resolve all character image URLs as data URLs
 */
async function preResolveImageUrls(
  entries: NightOrderEntry[],
  signal?: AbortSignal
): Promise<Map<string, string>> {
  const resolvedUrls = new Map<string, string>();

  const resolvePromises = entries.map(async (entry) => {
    if (signal?.aborted) return;

    try {
      const result = await resolveCharacterImageUrl(entry.image, entry.id, {
        logContext: 'HybridRenderer',
      });
      const img = await loadImage(result.url);
      const dataUrl = await imageToDataUrl(img);
      resolvedUrls.set(entry.id, dataUrl);
    } catch (error) {
      logger.warn('HybridRenderer', `Failed to load image for ${entry.name}`, error);
      resolvedUrls.set(entry.id, entry.image);
    }
  });

  await Promise.all(resolvePromises);
  return resolvedUrls;
}

/**
 * Wait for all images in container to load
 */
async function waitForImages(container: HTMLElement, signal?: AbortSignal): Promise<void> {
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
 */
async function waitForFonts(): Promise<void> {
  await document.fonts.ready;

  const fontFamilies = ['Dumbledor', 'Goudy Old Style', 'TradeGothic', 'TradeGothicBold'];

  const fontPromises = fontFamilies.map(async (family) => {
    try {
      await document.fonts.load(`1rem "${family}"`);
    } catch {
      // Font might not exist
    }
  });

  await Promise.all(fontPromises);
}

/**
 * Capture container with Snapdom WITHOUT font embedding
 */
async function captureWithSnapdom(
  element: HTMLElement,
  targetDpi: number
): Promise<HTMLCanvasElement> {
  if (!snapdomModule) {
    snapdomModule = await import('@zumer/snapdom');
  }
  const { snapdom } = snapdomModule;

  const targetWidth = PAGE_WIDTH_INCHES * targetDpi;
  const scaleFactor = targetWidth / UI_PREVIEW_WIDTH;

  // Capture WITHOUT font embedding - this is the fast path
  const result = await snapdom(element, {
    scale: scaleFactor,
    embedFonts: false, // Key: no base64 font encoding
  });

  return await result.toCanvas();
}

/**
 * Hide all text in container using clip-path.
 *
 * clip-path: inset(100%) makes elements invisible while preserving their
 * layout dimensions. This works regardless of background (solid, gradient, image).
 *
 * Returns a cleanup function to restore original styles.
 */
function hideTextWithClipPath(container: HTMLElement): () => void {
  const originalStyles: Array<{ element: HTMLElement; clipPath: string }> = [];

  // Find all text-containing elements and apply clip-path
  const textElements = container.querySelectorAll(
    'h1, h2, h3, h4, h5, h6, p, span, strong, em, div[class*="name"], div[class*="ability"], div[class*="title"], div[class*="scriptName"]'
  );

  for (const element of textElements) {
    const htmlElement = element as HTMLElement;
    // Only hide elements that directly contain text (not just wrappers)
    const hasDirectText = Array.from(htmlElement.childNodes).some(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
    );

    if (hasDirectText || htmlElement.tagName === 'SPAN' || htmlElement.tagName === 'STRONG') {
      originalStyles.push({
        element: htmlElement,
        clipPath: htmlElement.style.clipPath,
      });
      htmlElement.style.clipPath = 'inset(100%)';
    }
  }

  // Return cleanup function
  return () => {
    for (const { element, clipPath } of originalStyles) {
      element.style.clipPath = clipPath;
    }
  };
}

// ============================================================================
// Main Export Function
// ============================================================================

/**
 * Render a night sheet for hybrid PDF export
 *
 * This function:
 * 1. Renders the React component with visible text
 * 2. Extracts text positions from the DOM
 * 3. Hides text using clip-path (preserves layout, works with any background)
 * 4. Captures with Snapdom (no font embedding)
 * 5. Returns canvas + text positions for pdf-lib overlay
 */
export async function renderNightSheetForHybrid(
  options: HybridRenderOptions
): Promise<HybridRenderResult> {
  const { nightType, entries, scriptMeta, background, signal, pageNumber, totalPages } = options;

  if (signal?.aborted) {
    throw new DOMException('Render aborted', 'AbortError');
  }

  logger.info('HybridRenderer', `Rendering ${nightType} night for hybrid export`, {
    entryCount: entries.length,
    pageNumber,
    totalPages,
  });

  const startTime = performance.now();
  const timings: Record<string, number> = {};

  // Step 1: Pre-resolve all image URLs and script logo (in parallel)
  const resolveStart = performance.now();
  const [resolvedImageUrls, resolvedLogoUrl] = await Promise.all([
    preResolveImageUrls(entries, signal),
    resolveScriptLogo(scriptMeta?.logo),
  ]);
  timings.imageResolve = performance.now() - resolveStart;

  if (signal?.aborted) {
    throw new DOMException('Render aborted', 'AbortError');
  }

  // Step 2: Create offscreen container
  const container = createOffscreenContainer();

  try {
    // Step 3: Render with visible text for position extraction
    const renderStart = performance.now();
    const root = createRoot(container);

    // Helper to wait for render
    const waitForRender = async () => {
      const maxWaitMs = 500;
      const waitStart = performance.now();
      while (performance.now() - waitStart < maxWaitMs) {
        if (container.querySelector('[data-night-type]')) {
          break;
        }
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    };

    // Render with visible text
    root.render(
      <NightSheetPrintable
        type={nightType}
        entries={entries}
        scriptMeta={scriptMeta}
        background={background}
        resolvedImageUrls={resolvedImageUrls}
        pageNumber={pageNumber}
        totalPages={totalPages}
        resolvedLogoUrl={resolvedLogoUrl}
      />
    );

    await waitForRender();
    timings.reactRender = performance.now() - renderStart;

    if (signal?.aborted) {
      root.unmount();
      throw new DOMException('Render aborted', 'AbortError');
    }

    if (!container.querySelector('[data-night-type]')) {
      throw new Error('React component failed to render');
    }

    // Step 4: Wait for fonts and images
    const loadStart = performance.now();
    await Promise.all([waitForFonts(), waitForImages(container, signal)]);
    timings.assetLoad = performance.now() - loadStart;

    if (signal?.aborted) {
      root.unmount();
      throw new DOMException('Render aborted', 'AbortError');
    }

    // Step 5: Extract text positions from the rendered component
    const extractStart = performance.now();
    const extractionResult = extractTextFromContainer(container);
    timings.textExtract = performance.now() - extractStart;

    // Step 6: Hide text using clip-path (preserves layout, works with any background)
    hideTextWithClipPath(container);

    if (signal?.aborted) {
      root.unmount();
      throw new DOMException('Render aborted', 'AbortError');
    }

    // Step 7: Capture with Snapdom (text hidden but layout preserved)
    const captureStart = performance.now();
    const canvas = await captureWithSnapdom(container, CONFIG.PDF.DPI);
    timings.snapdomCapture = performance.now() - captureStart;

    // Step 8: Scale text positions to PDF dimensions
    const scaledResult = scaleTextPositions(extractionResult, PAGE_WIDTH_PT, PAGE_HEIGHT_PT);

    const endTime = performance.now();
    logger.info(
      'HybridRenderer',
      `Captured ${nightType} night in ${(endTime - startTime).toFixed(0)}ms`,
      {
        width: canvas.width,
        height: canvas.height,
        textElements: scaledResult.texts.length,
        timings: {
          imageResolve: `${timings.imageResolve.toFixed(0)}ms`,
          reactRender: `${timings.reactRender.toFixed(0)}ms`,
          assetLoad: `${timings.assetLoad.toFixed(0)}ms`,
          textExtract: `${timings.textExtract.toFixed(0)}ms`,
          snapdomCapture: `${timings.snapdomCapture.toFixed(0)}ms`,
        },
      }
    );

    return {
      canvas,
      texts: scaledResult.texts,
      containerWidth: scaledResult.containerWidth,
      containerHeight: scaledResult.containerHeight,
    };
  } finally {
    // Always cleanup container
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}
