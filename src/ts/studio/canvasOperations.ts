/**
 * Studio Canvas Operations
 *
 * Core utilities for canvas manipulation, layer composition, and image operations
 * in the Studio editor.
 */

import { studioCanvasPool } from '../canvas/canvasPool.js';
import type { BlendMode, Layer } from '../types/index.js';
import { logger } from '../utils/logger.js';

// ============================================================================
// Canvas Pool Utilities
// ============================================================================

/**
 * Create a canvas from the studio pool with high-quality rendering settings
 *
 * @param width - Canvas width in pixels
 * @param height - Canvas height in pixels
 * @returns Canvas element with configured 2D context
 */
export function createStudioCanvas(
  width: number,
  height: number
): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} {
  const canvas = studioCanvasPool.acquire(width, height);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get 2D context from canvas');
  }

  // Enable high-quality rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  return { canvas, ctx };
}

/**
 * Release a canvas back to the studio pool
 * Call this when a layer is deleted or canvas is no longer needed
 *
 * @param canvas - Canvas to release
 */
export function releaseStudioCanvas(canvas: HTMLCanvasElement): void {
  studioCanvasPool.release(canvas);
}

/**
 * Get statistics about the canvas pool
 * Useful for debugging memory usage
 */
export function getCanvasPoolStats() {
  return studioCanvasPool.getStats();
}

// ============================================================================
// Layer Composition
// ============================================================================

/**
 * Compose multiple layers onto a target canvas
 * Renders all visible layers in z-index order with blend modes and opacity
 *
 * @param layers - Array of layers to compose
 * @param targetCanvas - Canvas to render the composition onto
 */
export function composeLayers(layers: Layer[], targetCanvas: HTMLCanvasElement): void {
  const ctx = targetCanvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D context from target canvas');
  }

  // Clear the target canvas
  ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

  // Sort layers by z-index (lowest to highest)
  const sortedLayers = [...layers]
    .filter((layer) => layer.visible)
    .sort((a, b) => a.zIndex - b.zIndex);

  // Composite each layer
  for (const layer of sortedLayers) {
    compositeLayer(ctx, layer);
  }
}

/**
 * Composite a single layer onto a canvas context
 * Applies blend mode, opacity, and transformations
 *
 * @param ctx - Target canvas context
 * @param layer - Layer to composite
 */
function compositeLayer(ctx: CanvasRenderingContext2D, layer: Layer): void {
  ctx.save();

  // Apply opacity
  ctx.globalAlpha = layer.opacity;

  // Apply blend mode
  ctx.globalCompositeOperation = blendModeToCompositeOp(layer.blendMode);

  // Apply transformations
  applyLayerTransform(ctx, layer);

  // Draw the layer's canvas
  ctx.drawImage(layer.canvas, 0, 0);

  ctx.restore();
}

/**
 * Apply layer transformations (position, rotation, scale) to context
 *
 * @param ctx - Canvas context
 * @param layer - Layer with transformation properties
 */
function applyLayerTransform(ctx: CanvasRenderingContext2D, layer: Layer): void {
  // Translate to position
  ctx.translate(layer.position.x, layer.position.y);

  // Rotate if needed
  if (layer.rotation !== 0) {
    const centerX = layer.canvas.width / 2;
    const centerY = layer.canvas.height / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate((layer.rotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);
  }

  // Scale if needed
  if (layer.scale.x !== 1 || layer.scale.y !== 1) {
    ctx.scale(layer.scale.x, layer.scale.y);
  }
}

/**
 * Convert BlendMode to Canvas composite operation
 *
 * @param mode - Studio blend mode
 * @returns Canvas globalCompositeOperation value
 */
function blendModeToCompositeOp(mode: BlendMode): GlobalCompositeOperation {
  const modeMap: Record<BlendMode, GlobalCompositeOperation> = {
    normal: 'source-over',
    multiply: 'multiply',
    screen: 'screen',
    overlay: 'overlay',
    darken: 'darken',
    lighten: 'lighten',
  };

  return modeMap[mode] || 'source-over';
}

// ============================================================================
// Image Loading
// ============================================================================

/**
 * Load an image from a File or Blob and convert to a canvas
 *
 * @param file - File or Blob containing image data
 * @returns Promise resolving to canvas with the image
 */
export async function loadImageToCanvas(file: File | Blob): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      // Create canvas sized to image from pool
      const { canvas, ctx } = createStudioCanvas(img.width, img.height);

      // Draw image
      ctx.drawImage(img, 0, 0);

      // Clean up
      URL.revokeObjectURL(url);

      resolve(canvas);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Load an image from a URL and convert to a canvas
 *
 * @param url - Image URL
 * @returns Promise resolving to canvas with the image
 */
export async function loadImageFromUrl(url: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const { canvas, ctx } = createStudioCanvas(img.width, img.height);
      ctx.drawImage(img, 0, 0);
      resolve(canvas);
    };

    img.onerror = () => {
      reject(new Error(`Failed to load image from ${url}`));
    };

    img.src = url;
  });
}

/**
 * Paste image from clipboard
 * Attempts to read image data from the clipboard
 *
 * @returns Promise resolving to canvas with pasted image, or null if no image in clipboard
 */
export async function pasteFromClipboard(): Promise<HTMLCanvasElement | null> {
  try {
    const clipboardItems = await navigator.clipboard.read();

    for (const item of clipboardItems) {
      // Look for image types
      const imageTypes = item.types.filter((type) => type.startsWith('image/'));

      if (imageTypes.length > 0) {
        const blob = await item.getType(imageTypes[0]);
        return loadImageToCanvas(blob);
      }
    }

    return null;
  } catch (error) {
    logger.error('CanvasOperations', 'Failed to read from clipboard', error);
    return null;
  }
}

// ============================================================================
// Image Export
// ============================================================================

/**
 * Export composed layers as a single image blob
 *
 * @param layers - Layers to compose
 * @param format - Output format ('png' or 'jpeg')
 * @param quality - JPEG quality (0-1), ignored for PNG
 * @returns Promise resolving to image blob
 */
export async function exportCompositeImage(
  layers: Layer[],
  format: 'png' | 'jpeg' = 'png',
  quality: number = 0.92
): Promise<Blob> {
  // Determine canvas size from layers
  const bounds = getLayersBounds(layers);

  // Create export canvas
  const { canvas } = createStudioCanvas(bounds.width, bounds.height);

  // Compose all layers
  composeLayers(layers, canvas);

  // Convert to blob
  return new Promise((resolve, reject) => {
    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';

    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      },
      mimeType,
      quality
    );
  });
}

/**
 * Calculate bounding box containing all layers
 *
 * @param layers - Layers to measure
 * @returns Bounding box dimensions
 */
function getLayersBounds(layers: Layer[]): { width: number; height: number } {
  if (layers.length === 0) {
    return { width: 512, height: 512 }; // Default size
  }

  let maxWidth = 0;
  let maxHeight = 0;

  for (const layer of layers) {
    const layerWidth = layer.canvas.width * layer.scale.x + layer.position.x;
    const layerHeight = layer.canvas.height * layer.scale.y + layer.position.y;

    maxWidth = Math.max(maxWidth, layerWidth);
    maxHeight = Math.max(maxHeight, layerHeight);
  }

  return {
    width: Math.ceil(maxWidth) || 512,
    height: Math.ceil(maxHeight) || 512,
  };
}

// ============================================================================
// Canvas Utilities
// ============================================================================

/**
 * Create a blank canvas layer
 *
 * @param width - Canvas width
 * @param height - Canvas height
 * @param fillColor - Optional fill color
 * @returns Canvas element
 */
export function createBlankCanvas(
  width: number,
  height: number,
  fillColor?: string
): HTMLCanvasElement {
  const { canvas, ctx } = createStudioCanvas(width, height);

  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fillRect(0, 0, width, height);
  }

  return canvas;
}

/**
 * Clone a canvas
 *
 * @param source - Canvas to clone
 * @returns Cloned canvas
 */
export function cloneCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const { canvas, ctx } = createStudioCanvas(source.width, source.height);
  ctx.drawImage(source, 0, 0);
  return canvas;
}

/**
 * Resize a canvas while preserving content
 *
 * @param source - Canvas to resize
 * @param newWidth - New width
 * @param newHeight - New height
 * @param smooth - Use smooth scaling
 * @returns Resized canvas
 */
export function resizeCanvas(
  source: HTMLCanvasElement,
  newWidth: number,
  newHeight: number,
  smooth: boolean = true
): HTMLCanvasElement {
  const { canvas, ctx } = createStudioCanvas(newWidth, newHeight);

  ctx.imageSmoothingEnabled = smooth;
  ctx.imageSmoothingQuality = 'high';

  // Scale to fit new dimensions
  ctx.drawImage(source, 0, 0, newWidth, newHeight);

  return canvas;
}

/**
 * Get ImageData from a canvas
 *
 * @param canvas - Canvas to read
 * @returns ImageData object
 */
export function getImageData(canvas: HTMLCanvasElement): ImageData {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D context');
  }

  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/**
 * Put ImageData onto a canvas
 *
 * @param canvas - Target canvas
 * @param imageData - ImageData to write
 */
export function putImageData(canvas: HTMLCanvasElement, imageData: ImageData): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D context');
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Clear a canvas (make transparent)
 *
 * @param canvas - Canvas to clear
 */
export function clearCanvas(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/**
 * Fill a canvas with a color
 *
 * @param canvas - Canvas to fill
 * @param color - Fill color
 */
export function fillCanvas(canvas: HTMLCanvasElement, color: string): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

/**
 * Convert canvas to data URL
 *
 * @param canvas - Canvas to convert
 * @param format - Output format
 * @param quality - JPEG quality (0-1)
 * @returns Data URL string
 */
export function canvasToDataURL(
  canvas: HTMLCanvasElement,
  format: 'png' | 'jpeg' = 'png',
  quality: number = 0.92
): string {
  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
  return canvas.toDataURL(mimeType, quality);
}
