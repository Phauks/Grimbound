/**
 * Hybrid Snapdom Capture
 *
 * Shared Snapdom capture utilities for hybrid PDF rendering.
 */

import {
  PAGE_WIDTH_INCHES,
  setSnapdomModule,
  snapdomModule,
  UI_PREVIEW_WIDTH,
} from './hybridConstants.js';

/**
 * Capture container with Snapdom WITHOUT font embedding
 *
 * This is the fast path - Snapdom captures the visual layout without
 * embedding fonts (which is slow). Text is later overlaid using pdf-lib.
 *
 * @param element - The element to capture
 * @param targetDpi - Target DPI for the output canvas
 */
export async function captureWithSnapdom(
  element: HTMLElement,
  targetDpi: number
): Promise<HTMLCanvasElement> {
  let module = snapdomModule;

  if (!module) {
    module = await import('@zumer/snapdom');
    setSnapdomModule(module);
  }

  const { snapdom } = module;

  const targetWidth = PAGE_WIDTH_INCHES * targetDpi;
  const scaleFactor = targetWidth / UI_PREVIEW_WIDTH;

  // Capture WITHOUT font embedding - this is the fast path
  const result = await snapdom(element, {
    scale: scaleFactor,
    embedFonts: false, // Key: no base64 font encoding
  });

  return await result.toCanvas();
}
