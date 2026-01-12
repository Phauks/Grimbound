/**
 * Player Script Hybrid Renderer
 *
 * Renders PlayerScriptFront and PlayerScriptBack React components for hybrid PDF export.
 * This renderer:
 * 1. Renders the component normally (visible text)
 * 2. Extracts text positions from the DOM
 * 3. Hides text using clip-path (preserves layout, works with any background)
 * 4. Captures with Snapdom (no font embedding)
 * 5. Returns both canvas and text positions for pdf-lib overlay
 */

import { createRoot } from 'react-dom/client';
import CONFIG from '@/ts/config.js';
import type { ScriptMeta } from '@/ts/types/index.js';
import { logger } from '@/ts/utils/logger.js';
import {
  captureWithSnapdom,
  createOffscreenContainer,
  type ExtractedText,
  extractTextFromContainer,
  hideTextWithClipPath,
  PAGE_HEIGHT_INCHES,
  PAGE_HEIGHT_PT,
  PAGE_WIDTH_INCHES,
  PAGE_WIDTH_PT,
  preResolveImageUrls,
  removeContainer,
  resolveBackgroundImage,
  resolveScriptLogo,
  scaleTextPositions,
  UI_PREVIEW_WIDTH,
  waitForFonts,
  waitForImages,
} from '../shared/index.js';
import type {
  BackingSheetSettings,
  NightOrderIcon,
  PlayerScriptCharacter,
  PlayerScriptJinx,
  PlayerScriptSettings,
} from '../types.js';
import { PlayerScriptBack } from './PlayerScriptBack.js';
import { PlayerScriptFront } from './PlayerScriptFront.js';

// ============================================================================
// Types
// ============================================================================

export interface PlayerScriptRenderOptions {
  /** Which page to render */
  pageType: 'front' | 'back';
  /** Script metadata */
  scriptMeta: ScriptMeta | null;
  /** Characters for front page */
  characters: PlayerScriptCharacter[];
  /** Fabled characters */
  fabled: PlayerScriptCharacter[];
  /** Active jinxes */
  jinxes: PlayerScriptJinx[];
  /** First night order icons (for back page) */
  firstNight: NightOrderIcon[];
  /** Other nights order icons (for back page) */
  otherNight: NightOrderIcon[];
  /** Player script settings */
  settings: PlayerScriptSettings;
  /** Backing sheet settings */
  backingSettings: BackingSheetSettings;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

export interface PlayerScriptRenderResult {
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
// Helper Functions
// ============================================================================

/** Additional CSS selectors for player script text hiding */
const PLAYER_SCRIPT_TEXT_SELECTORS = 'div[class*="teamLabel"]';

/**
 * Collect all characters that need image resolution
 */
function collectAllCharacters(
  characters: PlayerScriptCharacter[],
  fabled: PlayerScriptCharacter[],
  jinxes: PlayerScriptJinx[],
  firstNight: NightOrderIcon[],
  otherNight: NightOrderIcon[]
): Array<{ id: string; image: string }> {
  const allChars: Array<{ id: string; image: string }> = [];
  const seenIds = new Set<string>();

  const addChar = (id: string, image: string) => {
    if (!seenIds.has(id)) {
      seenIds.add(id);
      allChars.push({ id, image });
    }
  };

  for (const char of characters) {
    addChar(char.id, char.image);
  }

  for (const char of fabled) {
    addChar(char.id, char.image);
  }

  for (const jinx of jinxes) {
    addChar(jinx.char1.id, jinx.char1.image);
    addChar(jinx.char2.id, jinx.char2.image);
  }

  for (const icon of firstNight) {
    addChar(icon.id, icon.image);
  }

  for (const icon of otherNight) {
    addChar(icon.id, icon.image);
  }

  return allChars;
}

// ============================================================================
// Main Export Functions
// ============================================================================

/**
 * Render a player script page for hybrid PDF export
 */
export async function renderPlayerScriptForHybrid(
  options: PlayerScriptRenderOptions
): Promise<PlayerScriptRenderResult> {
  const {
    pageType,
    scriptMeta,
    characters,
    fabled,
    jinxes,
    firstNight,
    otherNight,
    settings,
    backingSettings,
    signal,
  } = options;

  if (signal?.aborted) {
    throw new DOMException('Render aborted', 'AbortError');
  }

  logger.info('PlayerScriptRenderer', `Rendering ${pageType} page for hybrid export`, {
    characterCount: characters.length,
    fabledCount: fabled.length,
    jinxCount: jinxes.length,
  });

  const startTime = performance.now();
  const timings: Record<string, number> = {};

  // Step 1: Pre-resolve all image URLs (in parallel with logo and backgrounds)
  const resolveStart = performance.now();
  const allChars = collectAllCharacters(characters, fabled, jinxes, firstNight, otherNight);

  // Resolve character images, logo, and background images in parallel
  const [resolvedImageUrls, resolvedLogoUrl, resolvedFrontBgUrl, resolvedBackBgUrl] =
    await Promise.all([
      preResolveImageUrls(allChars, 'PlayerScriptRenderer', signal),
      resolveScriptLogo(scriptMeta?.logo, 'PlayerScriptRenderer'),
      // Resolve front page background (from player script settings)
      settings.background.sourceType === 'image'
        ? resolveBackgroundImage(settings.background.imageUrl, 'PlayerScriptRenderer')
        : Promise.resolve(undefined),
      // Resolve back page background (from backing sheet settings)
      backingSettings.background.sourceType === 'image'
        ? resolveBackgroundImage(backingSettings.background.imageUrl, 'PlayerScriptRenderer')
        : Promise.resolve(undefined),
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

    const waitForRender = async () => {
      const maxWaitMs = 500;
      const waitStart = performance.now();
      while (performance.now() - waitStart < maxWaitMs) {
        if (container.querySelector('[class*="sheet"]')) {
          break;
        }
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    };

    // Calculate page dimensions
    const pageWidth = `${UI_PREVIEW_WIDTH}px`;
    const pageHeight = `${Math.round(UI_PREVIEW_WIDTH * (PAGE_HEIGHT_INCHES / PAGE_WIDTH_INCHES))}px`;

    // Render the appropriate page type
    // Note: Jinxes and fabled are always on the back page when enabled (controlled by settings.showJinxes/showFabled)
    if (pageType === 'front') {
      root.render(
        <PlayerScriptFront
          scriptMeta={scriptMeta}
          characters={characters}
          imageUrls={resolvedImageUrls}
          settings={settings}
          resolvedBackgroundUrl={resolvedFrontBgUrl}
          pageWidth={pageWidth}
          pageHeight={pageHeight}
        />
      );
    } else {
      root.render(
        <PlayerScriptBack
          scriptMeta={scriptMeta}
          firstNight={firstNight}
          otherNight={otherNight}
          imageUrls={resolvedImageUrls}
          logoUrl={resolvedLogoUrl}
          backingSettings={backingSettings}
          playerScriptSettings={settings}
          fabled={fabled}
          jinxes={jinxes}
          resolvedBackgroundUrl={resolvedBackBgUrl}
          pageWidth={pageWidth}
          pageHeight={pageHeight}
        />
      );
    }

    await waitForRender();
    timings.reactRender = performance.now() - renderStart;

    if (signal?.aborted) {
      root.unmount();
      throw new DOMException('Render aborted', 'AbortError');
    }

    if (!container.querySelector('[class*="sheet"]')) {
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

    // Step 6: Hide text using clip-path (with player script specific selectors)
    hideTextWithClipPath(container, PLAYER_SCRIPT_TEXT_SELECTORS);

    if (signal?.aborted) {
      root.unmount();
      throw new DOMException('Render aborted', 'AbortError');
    }

    // Step 7: Capture with Snapdom
    const captureStart = performance.now();
    const canvas = await captureWithSnapdom(container, CONFIG.PDF.DPI);
    timings.snapdomCapture = performance.now() - captureStart;

    // Step 8: Scale text positions to PDF dimensions
    const scaledResult = scaleTextPositions(extractionResult, PAGE_WIDTH_PT, PAGE_HEIGHT_PT);

    const endTime = performance.now();
    logger.info(
      'PlayerScriptRenderer',
      `Captured ${pageType} page in ${(endTime - startTime).toFixed(0)}ms`,
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
