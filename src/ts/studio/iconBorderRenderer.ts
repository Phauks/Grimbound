/**
 * Icon Border Renderer
 *
 * Utilities for adding borders to character icons.
 * Supports both outline strokes and canvas expansion.
 *
 * IMPORTANT: Border detection relies on image transparency (alpha channel).
 * Images without transparency will have borders applied to the rectangular edge.
 * For best results, use PNG images with transparent backgrounds.
 */

import { hexToRgb } from '@/ts/utils/colorUtils.js';

// ============================================================================
// Constants
// ============================================================================

/** Alpha threshold for determining opaque vs transparent pixels */
const ALPHA_THRESHOLD = 128;

// ============================================================================
// Types
// ============================================================================

export interface BorderOptions {
  /** Border width in pixels */
  width: number;
  /** Border color as hex string */
  color: string;
  /** Border style */
  style: 'solid' | 'outer-glow';
}

export const DEFAULT_BORDER_OPTIONS: BorderOptions = {
  width: 3,
  color: '#FFFFFF',
  style: 'solid',
};

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Add a border around non-transparent pixels in an image.
 * This creates an outline effect by detecting edges of opaque content.
 *
 * @param canvas - Source canvas
 * @param options - Border options
 * @returns New canvas with border applied
 */
export function addIconBorder(
  canvas: HTMLCanvasElement,
  options: Partial<BorderOptions> = {}
): HTMLCanvasElement {
  const opts: BorderOptions = { ...DEFAULT_BORDER_OPTIONS, ...options };

  const { width, height } = canvas;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Get source image data
  const sourceData = ctx.getImageData(0, 0, width, height);

  // Create expanded canvas to accommodate border
  const expandBy = opts.width * 2;
  const newWidth = width + expandBy;
  const newHeight = height + expandBy;

  const resultCanvas = document.createElement('canvas');
  resultCanvas.width = newWidth;
  resultCanvas.height = newHeight;

  const resultCtx = resultCanvas.getContext('2d');
  if (!resultCtx) return canvas;

  // Parse border color
  const borderRgb = hexToRgb(opts.color) ?? { r: 255, g: 255, b: 255 };

  if (opts.style === 'solid') {
    // Create alpha mask from source
    const alphaMask = createAlphaMask(sourceData);

    // Dilate the mask to create border region
    const dilatedMask = dilateMask(alphaMask, width, height, opts.width);

    // Create border image data
    const borderData = resultCtx.createImageData(newWidth, newHeight);

    // Draw dilated mask as border color
    // Border is drawn where:
    // 1. The dilated mask has opacity (within range of an opaque pixel)
    // 2. The original pixel is transparent (below threshold)
    for (let y = 0; y < newHeight; y++) {
      for (let x = 0; x < newWidth; x++) {
        const i = (y * newWidth + x) * 4;
        const maskX = x - opts.width;
        const maskY = y - opts.width;
        const dilatedIdx = y * newWidth + x;

        // Check if in dilated region
        if (maskX >= 0 && maskX < width && maskY >= 0 && maskY < height) {
          const maskIdx = maskY * width + maskX;

          // Border region: dilated mask has value AND original is below threshold
          if (dilatedMask[dilatedIdx] > 0 && alphaMask[maskIdx] < ALPHA_THRESHOLD) {
            borderData.data[i] = borderRgb.r;
            borderData.data[i + 1] = borderRgb.g;
            borderData.data[i + 2] = borderRgb.b;
            borderData.data[i + 3] = dilatedMask[dilatedIdx];
          }
        } else if (dilatedMask[dilatedIdx] > 0) {
          // Edge region outside original bounds - always part of border
          borderData.data[i] = borderRgb.r;
          borderData.data[i + 1] = borderRgb.g;
          borderData.data[i + 2] = borderRgb.b;
          borderData.data[i + 3] = dilatedMask[dilatedIdx];
        }
      }
    }

    // Draw border first
    resultCtx.putImageData(borderData, 0, 0);

    // Draw original image on top, centered
    resultCtx.drawImage(canvas, opts.width, opts.width);
  } else {
    // Outer glow style - softer edge
    // Draw original centered first
    resultCtx.drawImage(canvas, opts.width, opts.width);

    // Apply glow using shadow
    resultCtx.save();
    resultCtx.globalCompositeOperation = 'destination-over';
    resultCtx.shadowColor = opts.color;
    resultCtx.shadowBlur = opts.width;
    resultCtx.shadowOffsetX = 0;
    resultCtx.shadowOffsetY = 0;

    // Draw multiple times for stronger glow
    for (let i = 0; i < 3; i++) {
      resultCtx.drawImage(canvas, opts.width, opts.width);
    }
    resultCtx.restore();
  }

  return resultCanvas;
}

/**
 * Add a simple circular border to an icon.
 * Assumes the icon is roughly circular and centered.
 *
 * @param canvas - Source canvas
 * @param options - Border options
 * @returns New canvas with circular border
 */
export function addCircularBorder(
  canvas: HTMLCanvasElement,
  options: Partial<BorderOptions> = {}
): HTMLCanvasElement {
  const opts: BorderOptions = { ...DEFAULT_BORDER_OPTIONS, ...options };

  const { width, height } = canvas;
  const expandBy = opts.width * 2;
  const newSize = Math.max(width, height) + expandBy;

  const resultCanvas = document.createElement('canvas');
  resultCanvas.width = newSize;
  resultCanvas.height = newSize;

  const ctx = resultCanvas.getContext('2d');
  if (!ctx) return canvas;

  const centerX = newSize / 2;
  const centerY = newSize / 2;
  const radius = (Math.max(width, height) / 2) + (opts.width / 2);

  // Draw border circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.strokeStyle = opts.color;
  ctx.lineWidth = opts.width;
  ctx.stroke();

  // Draw original image centered
  const imgX = (newSize - width) / 2;
  const imgY = (newSize - height) / 2;
  ctx.drawImage(canvas, imgX, imgY);

  return resultCanvas;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create an alpha mask from image data (0 = transparent, 255 = opaque)
 */
function createAlphaMask(imageData: ImageData): Uint8Array {
  const { width, height, data } = imageData;
  const mask = new Uint8Array(width * height);

  for (let i = 0; i < mask.length; i++) {
    mask[i] = data[i * 4 + 3]; // Alpha channel
  }

  return mask;
}

/**
 * Dilate a mask by a given radius using distance-based expansion.
 * Creates smooth edges for the border.
 */
function dilateMask(
  mask: Uint8Array,
  width: number,
  height: number,
  radius: number
): Uint8Array {
  const expandBy = radius * 2;
  const newWidth = width + expandBy;
  const newHeight = height + expandBy;
  const result = new Uint8Array(newWidth * newHeight);

  // For each pixel in the expanded canvas
  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const resultIdx = y * newWidth + x;

      // Map to original coordinates
      const srcX = x - radius;
      const srcY = y - radius;

      // Find minimum distance to any opaque pixel within radius
      let minDist = radius + 1;

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const checkX = srcX + dx;
          const checkY = srcY + dy;

          if (checkX < 0 || checkX >= width || checkY < 0 || checkY >= height) {
            continue;
          }

          const checkIdx = checkY * width + checkX;
          if (mask[checkIdx] >= ALPHA_THRESHOLD) {
            // Opaque pixel found (alpha >= threshold)
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDist) {
              minDist = dist;
            }
          }
        }
      }

      // If within radius of an opaque pixel, set alpha based on distance
      if (minDist <= radius) {
        // Smooth falloff at edges
        const alpha = minDist < radius - 1 ? 255 : Math.round(255 * (1 - (minDist - radius + 1)));
        result[resultIdx] = Math.max(result[resultIdx], alpha);
      }
    }
  }

  return result;
}

/**
 * Remove border/expand transparent area by shrinking opaque regions.
 * Useful for removing existing borders before adding new ones.
 *
 * @param canvas - Source canvas
 * @param shrinkBy - Pixels to shrink by
 * @returns New canvas with shrunk content
 */
export function shrinkIconContent(
  canvas: HTMLCanvasElement,
  shrinkBy: number
): HTMLCanvasElement {
  const { width, height } = canvas;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const imageData = ctx.getImageData(0, 0, width, height);
  const alphaMask = createAlphaMask(imageData);

  // Erode the mask
  const erodedMask = erodeMask(alphaMask, width, height, shrinkBy);

  // Apply eroded mask to image
  const resultCanvas = document.createElement('canvas');
  resultCanvas.width = width;
  resultCanvas.height = height;

  const resultCtx = resultCanvas.getContext('2d');
  if (!resultCtx) return canvas;

  const resultData = resultCtx.createImageData(width, height);

  for (let i = 0; i < alphaMask.length; i++) {
    const pixelIdx = i * 4;
    resultData.data[pixelIdx] = imageData.data[pixelIdx];
    resultData.data[pixelIdx + 1] = imageData.data[pixelIdx + 1];
    resultData.data[pixelIdx + 2] = imageData.data[pixelIdx + 2];
    resultData.data[pixelIdx + 3] = erodedMask[i];
  }

  resultCtx.putImageData(resultData, 0, 0);
  return resultCanvas;
}

/**
 * Erode a mask by a given radius
 */
function erodeMask(
  mask: Uint8Array,
  width: number,
  height: number,
  radius: number
): Uint8Array {
  const result = new Uint8Array(mask.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;

      // Check if any pixel within radius is transparent
      let allOpaque = true;

      outer: for (let dy = -radius; dy <= radius && allOpaque; dy++) {
        for (let dx = -radius; dx <= radius && allOpaque; dx++) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > radius) continue;

          const checkX = x + dx;
          const checkY = y + dy;

          if (checkX < 0 || checkX >= width || checkY < 0 || checkY >= height) {
            allOpaque = false;
            break outer;
          }

          const checkIdx = checkY * width + checkX;
          if (mask[checkIdx] < ALPHA_THRESHOLD) {
            allOpaque = false;
            break outer;
          }
        }
      }

      result[idx] = allOpaque ? mask[idx] : 0;
    }
  }

  return result;
}
