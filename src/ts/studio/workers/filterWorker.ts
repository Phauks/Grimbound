/**
 * Filter Worker
 *
 * Web Worker for offloading heavy image processing operations.
 * Processes filters on a separate thread to avoid blocking the main UI.
 */

import type { ImageFilter } from '../../types/index';

// ============================================================================
// Message Types
// ============================================================================

interface FilterRequest {
  type: 'apply-filter';
  imageData: ImageData;
  filter: ImageFilter;
}

interface FilterResponse {
  type: 'filter-result';
  imageData: ImageData;
}

interface ErrorResponse {
  type: 'error';
  message: string;
}

type WorkerRequest = FilterRequest;

// ============================================================================
// Filter Implementations
// ============================================================================

/**
 * Adjust brightness
 */
function adjustBrightness(imageData: ImageData, value: number): ImageData {
  const data = imageData.data;
  const adjustment = (value / 100) * 255; // -100 to +100 -> -255 to +255

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.max(0, Math.min(255, data[i] + adjustment)); // R
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + adjustment)); // G
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + adjustment)); // B
  }

  return imageData;
}

/**
 * Adjust contrast
 */
function adjustContrast(imageData: ImageData, value: number): ImageData {
  const data = imageData.data;
  const factor = (259 * (value + 255)) / (255 * (259 - value));

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128));
    data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] - 128) + 128));
    data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] - 128) + 128));
  }

  return imageData;
}

/**
 * Adjust saturation
 */
function adjustSaturation(imageData: ImageData, value: number): ImageData {
  const data = imageData.data;
  const multiplier = 1 + value / 100; // -100 to +100 -> 0 to 2

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Calculate grayscale value (luminosity method)
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

    // Interpolate between gray and original color
    data[i] = Math.max(0, Math.min(255, gray + (r - gray) * multiplier));
    data[i + 1] = Math.max(0, Math.min(255, gray + (g - gray) * multiplier));
    data[i + 2] = Math.max(0, Math.min(255, gray + (b - gray) * multiplier));
  }

  return imageData;
}

/**
 * Adjust hue
 */
function adjustHue(imageData: ImageData, degrees: number): ImageData {
  const data = imageData.data;
  const angle = (degrees * Math.PI) / 180;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;

    // RGB to HSL
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0;
    let s = 0;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      if (max === r) {
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      } else if (max === g) {
        h = ((b - r) / d + 2) / 6;
      } else {
        h = ((r - g) / d + 4) / 6;
      }
    }

    // Adjust hue
    h = (h + angle / (2 * Math.PI)) % 1;
    if (h < 0) h += 1;

    // HSL to RGB
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    let r2: number;
    let g2: number;
    let b2: number;
    if (s === 0) {
      r2 = g2 = b2 = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r2 = hue2rgb(p, q, h + 1 / 3);
      g2 = hue2rgb(p, q, h);
      b2 = hue2rgb(p, q, h - 1 / 3);
    }

    data[i] = Math.round(r2 * 255);
    data[i + 1] = Math.round(g2 * 255);
    data[i + 2] = Math.round(b2 * 255);
  }

  return imageData;
}

/**
 * Invert colors
 */
function invertColors(imageData: ImageData): ImageData {
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - data[i]; // R
    data[i + 1] = 255 - data[i + 1]; // G
    data[i + 2] = 255 - data[i + 2]; // B
  }

  return imageData;
}

/**
 * Apply blur (simple box blur)
 */
function applyBlur(imageData: ImageData, radius: number): ImageData {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  const outputData = new Uint8ClampedArray(data);

  const r = Math.floor(radius);
  const kernelSize = r * 2 + 1;
  const kernelArea = kernelSize * kernelSize;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let rSum = 0,
        gSum = 0,
        bSum = 0,
        aSum = 0;

      // Sample kernel area
      for (let ky = -r; ky <= r; ky++) {
        for (let kx = -r; kx <= r; kx++) {
          const px = Math.max(0, Math.min(width - 1, x + kx));
          const py = Math.max(0, Math.min(height - 1, y + ky));
          const idx = (py * width + px) * 4;

          rSum += data[idx];
          gSum += data[idx + 1];
          bSum += data[idx + 2];
          aSum += data[idx + 3];
        }
      }

      const idx = (y * width + x) * 4;
      outputData[idx] = rSum / kernelArea;
      outputData[idx + 1] = gSum / kernelArea;
      outputData[idx + 2] = bSum / kernelArea;
      outputData[idx + 3] = aSum / kernelArea;
    }
  }

  return new ImageData(outputData, width, height);
}

/**
 * Apply sharpen
 */
function applySharpen(imageData: ImageData, amount: number): ImageData {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  const outputData = new Uint8ClampedArray(data);

  // Sharpen kernel (unsharp mask approximation)
  const kernel = [0, -amount, 0, -amount, 1 + 4 * amount, -amount, 0, -amount, 0];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let r = 0,
        g = 0,
        b = 0;

      // Apply kernel
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          const k = kernel[(ky + 1) * 3 + (kx + 1)];

          r += data[idx] * k;
          g += data[idx + 1] * k;
          b += data[idx + 2] * k;
        }
      }

      const idx = (y * width + x) * 4;
      outputData[idx] = Math.max(0, Math.min(255, r));
      outputData[idx + 1] = Math.max(0, Math.min(255, g));
      outputData[idx + 2] = Math.max(0, Math.min(255, b));
    }
  }

  return new ImageData(outputData, width, height);
}

// ============================================================================
// Message Handler
// ============================================================================

/**
 * Process filter request
 */
function processFilter(imageData: ImageData, filter: ImageFilter): ImageData {
  switch (filter.type) {
    case 'brightness':
      return adjustBrightness(imageData, filter.value);
    case 'contrast':
      return adjustContrast(imageData, filter.value);
    case 'saturation':
      return adjustSaturation(imageData, filter.value);
    case 'hue':
      return adjustHue(imageData, filter.value);
    case 'blur':
      return applyBlur(imageData, filter.value);
    case 'sharpen':
      return applySharpen(imageData, filter.value / 100); // Normalize to 0-1
    case 'invert':
      return invertColors(imageData);
    default:
      throw new Error(`Unknown filter type: ${(filter as { type: string }).type}`);
  }
}

// ============================================================================
// Worker Message Listener
// ============================================================================

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  try {
    const request = event.data;

    if (request.type === 'apply-filter') {
      const result = processFilter(request.imageData, request.filter);
      const response: FilterResponse = {
        type: 'filter-result',
        imageData: result,
      };
      self.postMessage(response);
    }
  } catch (error) {
    const response: ErrorResponse = {
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
    self.postMessage(response);
  }
};

// Export type for main thread usage
export type { FilterRequest, FilterResponse, ErrorResponse };
