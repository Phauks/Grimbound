/**
 * Night Sheet Renderer
 *
 * Renders a NightSheetPrintable React component for PDF export.
 * This renderer:
 * 1. Renders the component normally (visible text)
 * 2. Extracts text positions from the DOM
 * 3. Hides text using clip-path (preserves layout, works with any background)
 * 4. Captures with Snapdom (no font embedding)
 * 5. Returns both canvas and text positions for pdf-lib overlay
 */

import { createRoot } from 'react-dom/client';
import {
  NightSheetPrintable,
  type NightSheetType,
} from '@/components/ViewComponents/ScriptComponents/NightSheetPrintable';
import CONFIG from '@/ts/config.js';
import {
  captureWithSnapdom,
  createOffscreenContainer,
  type ExtractedText,
  extractTextFromContainer,
  hideTextWithClipPath,
  PAGE_HEIGHT_PT,
  PAGE_WIDTH_PT,
  preResolveImageUrls,
  removeContainer,
  resolveScriptLogo,
  scaleTextPositions,
  waitForFonts,
  waitForImages,
} from '@/ts/scriptPdf/shared/index.js';
import type { BackgroundStyle } from '@/ts/types/backgroundEffects.js';
import type { ScriptMeta } from '@/ts/types/index.js';
import { logger } from '@/ts/utils/logger.js';
import type { NightOrderEntry } from './nightOrderTypes.js';

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
  /** Background style configuration */
  background: BackgroundStyle;
  /** Resolved background image URL (if using image background) */
  resolvedBackgroundUrl?: string | null;
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
export async function renderNightSheet(options: HybridRenderOptions): Promise<HybridRenderResult> {
  const {
    nightType,
    entries,
    scriptMeta,
    background,
    resolvedBackgroundUrl,
    signal,
    pageNumber,
    totalPages,
  } = options;

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
    preResolveImageUrls(entries, 'HybridRenderer', signal),
    resolveScriptLogo(scriptMeta?.logo, 'HybridRenderer'),
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
        resolvedBackgroundUrl={resolvedBackgroundUrl}
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

    // Clean up React root
    root.unmount();

    return {
      canvas,
      texts: scaledResult.texts,
      containerWidth: scaledResult.containerWidth,
      containerHeight: scaledResult.containerHeight,
    };
  } finally {
    // Always cleanup container
    removeContainer(container);
  }
}
