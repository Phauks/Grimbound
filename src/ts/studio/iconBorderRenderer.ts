/**
 * Icon Border Renderer
 *
 * Utilities for adding borders to character icons.
 * Supports both outline strokes and canvas expansion.
 *
 * IMPORTANT: Border detection relies on image transparency (alpha channel).
 * Images without transparency will have borders applied to the rectangular edge.
 * For best results, use PNG images with transparent backgrounds.
 *
 * Performance: Uses optimized distance transform for morphological operations.
 */

import { hexToRgb } from '@/ts/utils/colorUtils.js';

// ============================================================================
// Constants
// ============================================================================

/** Alpha threshold for determining opaque vs transparent pixels */
const ALPHA_THRESHOLD = 128;

/** Number of shadow passes for outer-glow effect (stronger = more passes) */
const GLOW_PASSES = 3;

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

/** RGB color components */
interface RGB {
  r: number;
  g: number;
  b: number;
}

// ============================================================================
// Canvas Utilities
// ============================================================================

/**
 * Create a new canvas with the specified dimensions.
 * Returns null if context acquisition fails.
 */
function createCanvas(
  width: number,
  height: number
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  return ctx ? { canvas, ctx } : null;
}

// ============================================================================
// Alpha Mask Operations
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
 * Compute squared distance transform using Meijster algorithm.
 * Returns squared distance to nearest opaque pixel for each position.
 *
 * This is O(n) where n = width × height, much faster than naive O(n×r²).
 *
 * @see https://www.cs.rug.nl/~roe/publications/dt.pdf
 */
function computeDistanceTransform(
  mask: Uint8Array,
  width: number,
  height: number,
  expandedWidth: number,
  expandedHeight: number,
  offset: number
): Float32Array {
  const INF = expandedWidth + expandedHeight;
  const size = expandedWidth * expandedHeight;
  const distSq = new Float32Array(size);

  // Initialize: 0 for opaque pixels (mapped from source), INF² for rest
  distSq.fill(INF * INF);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = y * width + x;
      if (mask[srcIdx] >= ALPHA_THRESHOLD) {
        const dstIdx = (y + offset) * expandedWidth + (x + offset);
        distSq[dstIdx] = 0;
      }
    }
  }

  // Phase 1: Column-wise scan (vertical distance)
  const colDist = new Float32Array(size);

  for (let x = 0; x < expandedWidth; x++) {
    // Forward pass
    colDist[x] = distSq[x] === 0 ? 0 : INF;
    for (let y = 1; y < expandedHeight; y++) {
      const idx = y * expandedWidth + x;
      colDist[idx] = distSq[idx] === 0 ? 0 : colDist[idx - expandedWidth] + 1;
    }
    // Backward pass
    for (let y = expandedHeight - 2; y >= 0; y--) {
      const idx = y * expandedWidth + x;
      const below = colDist[idx + expandedWidth] + 1;
      if (below < colDist[idx]) {
        colDist[idx] = below;
      }
    }
  }

  // Phase 2: Row-wise scan using parabola envelope
  const s = new Int32Array(expandedWidth); // Envelope indices
  const t = new Int32Array(expandedWidth); // Intersection points

  for (let y = 0; y < expandedHeight; y++) {
    const rowOffset = y * expandedWidth;
    let q = 0;
    s[0] = 0;
    t[0] = 0;

    // Build envelope
    for (let u = 1; u < expandedWidth; u++) {
      const gu = colDist[rowOffset + u];
      while (q >= 0) {
        const sq = s[q];
        const gsq = colDist[rowOffset + sq];
        // Compare parabolas: f(s[q], y) vs f(u, y) at intersection
        const sepPoint = (u * u - sq * sq + gu * gu - gsq * gsq) / (2 * (u - sq));
        if (sepPoint > t[q]) break;
        q--;
      }
      q++;
      s[q] = u;
      t[q] = Math.floor(
        (u * u -
          s[q - 1] * s[q - 1] +
          colDist[rowOffset + u] ** 2 -
          colDist[rowOffset + s[q - 1]] ** 2) /
          (2 * (u - s[q - 1]))
      );
    }

    // Sample envelope
    for (let u = expandedWidth - 1; u >= 0; u--) {
      while (t[q] > u && q > 0) q--;
      const sq = s[q];
      const dx = u - sq;
      distSq[rowOffset + u] = dx * dx + colDist[rowOffset + sq] ** 2;
    }
  }

  return distSq;
}

/**
 * Dilate a mask by a given radius using distance transform.
 * Much faster than naive approach: O(n) vs O(n×r²).
 */
function dilateMask(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const expandBy = radius * 2;
  const newWidth = width + expandBy;
  const newHeight = height + expandBy;
  const result = new Uint8Array(newWidth * newHeight);

  const distSq = computeDistanceTransform(mask, width, height, newWidth, newHeight, radius);
  const radiusSq = radius * radius;

  for (let i = 0; i < result.length; i++) {
    if (distSq[i] <= radiusSq) {
      // Within radius: compute smooth alpha based on distance
      const dist = Math.sqrt(distSq[i]);
      if (dist < radius - 1) {
        result[i] = 255;
      } else {
        // Smooth falloff at edge
        result[i] = Math.round(255 * (1 - (dist - radius + 1)));
      }
    }
  }

  return result;
}

/**
 * Erode a mask by a given radius.
 * Pixels are kept only if all neighbors within radius are opaque.
 */
function erodeMask(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const result = new Uint8Array(mask.length);

  // Create inverted mask (transparent becomes "opaque" for distance calc)
  const inverted = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) {
    inverted[i] = mask[i] < ALPHA_THRESHOLD ? 255 : 0;
  }

  // Distance to nearest transparent pixel
  const distSq = computeDistanceTransform(inverted, width, height, width, height, 0);
  const radiusSq = radius * radius;

  for (let i = 0; i < mask.length; i++) {
    // Keep pixel only if distance to transparent is > radius
    result[i] = distSq[i] > radiusSq ? mask[i] : 0;
  }

  return result;
}

// ============================================================================
// Border Rendering
// ============================================================================

/**
 * Render solid border by drawing dilated mask as border color.
 */
function renderSolidBorder(
  resultCtx: CanvasRenderingContext2D,
  sourceCanvas: HTMLCanvasElement,
  sourceData: ImageData,
  newWidth: number,
  newHeight: number,
  borderWidth: number,
  borderRgb: RGB
): void {
  const { width, height } = sourceCanvas;

  // Create alpha mask from source
  const alphaMask = createAlphaMask(sourceData);

  // Dilate the mask to create border region
  const dilatedMask = dilateMask(alphaMask, width, height, borderWidth);

  // Create border image data
  const borderData = resultCtx.createImageData(newWidth, newHeight);

  // Draw border where: dilated mask is opaque AND original is transparent
  for (let y = 0; y < newHeight; y++) {
    for (let x = 0; x < newWidth; x++) {
      const i = (y * newWidth + x) * 4;
      const maskX = x - borderWidth;
      const maskY = y - borderWidth;
      const dilatedIdx = y * newWidth + x;

      const inOriginalBounds = maskX >= 0 && maskX < width && maskY >= 0 && maskY < height;

      if (inOriginalBounds) {
        const maskIdx = maskY * width + maskX;
        const isTransparentInOriginal = alphaMask[maskIdx] < ALPHA_THRESHOLD;
        const isInDilatedRegion = dilatedMask[dilatedIdx] > 0;

        if (isInDilatedRegion && isTransparentInOriginal) {
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

  // Draw border first, then original image on top
  resultCtx.putImageData(borderData, 0, 0);
  resultCtx.drawImage(sourceCanvas, borderWidth, borderWidth);
}

/**
 * Render outer glow border using shadow effect.
 */
function renderGlowBorder(
  resultCtx: CanvasRenderingContext2D,
  sourceCanvas: HTMLCanvasElement,
  borderWidth: number,
  color: string
): void {
  // Draw original centered first
  resultCtx.drawImage(sourceCanvas, borderWidth, borderWidth);

  // Apply glow using shadow
  resultCtx.save();
  resultCtx.globalCompositeOperation = 'destination-over';
  resultCtx.shadowColor = color;
  resultCtx.shadowBlur = borderWidth;
  resultCtx.shadowOffsetX = 0;
  resultCtx.shadowOffsetY = 0;

  // Draw multiple times for stronger glow
  for (let i = 0; i < GLOW_PASSES; i++) {
    resultCtx.drawImage(sourceCanvas, borderWidth, borderWidth);
  }
  resultCtx.restore();
}

// ============================================================================
// Public API
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

  const sourceCtx = canvas.getContext('2d');
  if (!sourceCtx) return canvas;

  // Create expanded canvas to accommodate border
  const expandBy = opts.width * 2;
  const newWidth = width + expandBy;
  const newHeight = height + expandBy;

  const result = createCanvas(newWidth, newHeight);
  if (!result) return canvas;

  const { canvas: resultCanvas, ctx: resultCtx } = result;
  const borderRgb = hexToRgb(opts.color) ?? { r: 255, g: 255, b: 255 };

  if (opts.style === 'solid') {
    const sourceData = sourceCtx.getImageData(0, 0, width, height);
    renderSolidBorder(resultCtx, canvas, sourceData, newWidth, newHeight, opts.width, borderRgb);
  } else {
    renderGlowBorder(resultCtx, canvas, opts.width, opts.color);
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

  const result = createCanvas(newSize, newSize);
  if (!result) return canvas;

  const { canvas: resultCanvas, ctx } = result;
  const centerX = newSize / 2;
  const centerY = newSize / 2;
  const radius = Math.max(width, height) / 2 + opts.width / 2;

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

/**
 * Remove border/expand transparent area by shrinking opaque regions.
 * Useful for removing existing borders before adding new ones.
 *
 * @param canvas - Source canvas
 * @param shrinkBy - Pixels to shrink by
 * @returns New canvas with shrunk content
 */
export function shrinkIconContent(canvas: HTMLCanvasElement, shrinkBy: number): HTMLCanvasElement {
  const { width, height } = canvas;
  const sourceCtx = canvas.getContext('2d');
  if (!sourceCtx) return canvas;

  const imageData = sourceCtx.getImageData(0, 0, width, height);
  const alphaMask = createAlphaMask(imageData);
  const erodedMask = erodeMask(alphaMask, width, height, shrinkBy);

  const result = createCanvas(width, height);
  if (!result) return canvas;

  const { canvas: resultCanvas, ctx: resultCtx } = result;
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
