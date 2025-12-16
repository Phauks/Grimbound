/**
 * Filter Engine
 *
 * Core image processing functions for applying filters and adjustments to ImageData.
 * All functions operate on ImageData and return modified ImageData.
 */

// ============================================================================
// Color Adjustments
// ============================================================================

/**
 * Adjust brightness of an image
 * @param imageData - Source image data
 * @param value - Brightness adjustment (-100 to +100)
 * @returns Modified image data
 */
export function adjustBrightness(imageData: ImageData, value: number): ImageData {
  const data = new Uint8ClampedArray(imageData.data);

  for (let i = 0; i < data.length; i += 4) {
    data[i] = data[i] + value; // Red
    data[i + 1] = data[i + 1] + value; // Green
    data[i + 2] = data[i + 2] + value; // Blue
    // Alpha (i + 3) unchanged
  }

  return new ImageData(data, imageData.width, imageData.height);
}

/**
 * Adjust contrast of an image
 * @param imageData - Source image data
 * @param value - Contrast adjustment (-100 to +100)
 * @returns Modified image data
 */
export function adjustContrast(imageData: ImageData, value: number): ImageData {
  const data = new Uint8ClampedArray(imageData.data);

  // Convert value to contrast factor (0.5 to 2.0)
  const factor = (259 * (value + 255)) / (255 * (259 - value));

  for (let i = 0; i < data.length; i += 4) {
    data[i] = factor * (data[i] - 128) + 128; // Red
    data[i + 1] = factor * (data[i + 1] - 128) + 128; // Green
    data[i + 2] = factor * (data[i + 2] - 128) + 128; // Blue
  }

  return new ImageData(data, imageData.width, imageData.height);
}

/**
 * Adjust saturation of an image
 * @param imageData - Source image data
 * @param value - Saturation adjustment (-100 to +100)
 * @returns Modified image data
 */
export function adjustSaturation(imageData: ImageData, value: number): ImageData {
  const data = new Uint8ClampedArray(imageData.data);

  // Convert value to saturation factor (0 = grayscale, 1 = normal, 2 = super saturated)
  const factor = (value + 100) / 100;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Calculate luminance
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

    // Interpolate between gray and color
    data[i] = gray + factor * (r - gray);
    data[i + 1] = gray + factor * (g - gray);
    data[i + 2] = gray + factor * (b - gray);
  }

  return new ImageData(data, imageData.width, imageData.height);
}

/**
 * Adjust hue of an image
 * @param imageData - Source image data
 * @param degrees - Hue rotation in degrees (0-360)
 * @returns Modified image data
 */
export function adjustHue(imageData: ImageData, degrees: number): ImageData {
  const data = new Uint8ClampedArray(imageData.data);
  const radians = (degrees * Math.PI) / 180;

  // Precompute rotation matrix values
  const cosA = Math.cos(radians);
  const sinA = Math.sin(radians);

  // Rotation matrix for hue (simplified from full HSV conversion)
  const matrix = [
    cosA + (1 - cosA) / 3,
    (1 / 3) * (1 - cosA) - Math.sqrt(1 / 3) * sinA,
    (1 / 3) * (1 - cosA) + Math.sqrt(1 / 3) * sinA,
    (1 / 3) * (1 - cosA) + Math.sqrt(1 / 3) * sinA,
    cosA + (1 / 3) * (1 - cosA),
    (1 / 3) * (1 - cosA) - Math.sqrt(1 / 3) * sinA,
    (1 / 3) * (1 - cosA) - Math.sqrt(1 / 3) * sinA,
    (1 / 3) * (1 - cosA) + Math.sqrt(1 / 3) * sinA,
    cosA + (1 / 3) * (1 - cosA),
  ];

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    data[i] = matrix[0] * r + matrix[1] * g + matrix[2] * b;
    data[i + 1] = matrix[3] * r + matrix[4] * g + matrix[5] * b;
    data[i + 2] = matrix[6] * r + matrix[7] * g + matrix[8] * b;
  }

  return new ImageData(data, imageData.width, imageData.height);
}

/**
 * Invert colors of an image
 * @param imageData - Source image data
 * @returns Modified image data
 */
export function invertColors(imageData: ImageData): ImageData {
  const data = new Uint8ClampedArray(imageData.data);

  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - data[i]; // Red
    data[i + 1] = 255 - data[i + 1]; // Green
    data[i + 2] = 255 - data[i + 2]; // Blue
    // Alpha unchanged
  }

  return new ImageData(data, imageData.width, imageData.height);
}

// ============================================================================
// Effects & Filters
// ============================================================================

/**
 * Apply box blur to an image
 * @param imageData - Source image data
 * @param radius - Blur radius in pixels
 * @returns Modified image data
 */
export function applyBlur(imageData: ImageData, radius: number): ImageData {
  if (radius <= 0) return imageData;

  const { width, height } = imageData;
  const data = new Uint8ClampedArray(imageData.data);
  const result = new Uint8ClampedArray(data.length);

  // Horizontal pass
  const temp = new Uint8ClampedArray(data.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0,
        count = 0;

      for (let kx = -radius; kx <= radius; kx++) {
        const px = Math.min(width - 1, Math.max(0, x + kx));
        const offset = (y * width + px) * 4;

        r += data[offset];
        g += data[offset + 1];
        b += data[offset + 2];
        a += data[offset + 3];
        count++;
      }

      const offset = (y * width + x) * 4;
      temp[offset] = r / count;
      temp[offset + 1] = g / count;
      temp[offset + 2] = b / count;
      temp[offset + 3] = a / count;
    }
  }

  // Vertical pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0,
        count = 0;

      for (let ky = -radius; ky <= radius; ky++) {
        const py = Math.min(height - 1, Math.max(0, y + ky));
        const offset = (py * width + x) * 4;

        r += temp[offset];
        g += temp[offset + 1];
        b += temp[offset + 2];
        a += temp[offset + 3];
        count++;
      }

      const offset = (y * width + x) * 4;
      result[offset] = r / count;
      result[offset + 1] = g / count;
      result[offset + 2] = b / count;
      result[offset + 3] = a / count;
    }
  }

  return new ImageData(result, width, height);
}

/**
 * Apply sharpening filter
 * @param imageData - Source image data
 * @param amount - Sharpening amount (0-10)
 * @returns Modified image data
 */
export function applySharpen(imageData: ImageData, amount: number): ImageData {
  const { width, height } = imageData;
  const data = new Uint8ClampedArray(imageData.data);
  const result = new Uint8ClampedArray(data.length);

  // Sharpening kernel
  const kernel = [0, -amount, 0, -amount, 1 + 4 * amount, -amount, 0, -amount, 0];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) {
        let sum = 0;

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const offset = ((y + ky) * width + (x + kx)) * 4 + c;
            const kernelValue = kernel[(ky + 1) * 3 + (kx + 1)];
            sum += data[offset] * kernelValue;
          }
        }

        const offset = (y * width + x) * 4 + c;
        result[offset] = sum;
      }

      // Copy alpha
      const offset = (y * width + x) * 4;
      result[offset + 3] = data[offset + 3];
    }
  }

  // Copy edges
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (y === 0 || y === height - 1 || x === 0 || x === width - 1) {
        const offset = (y * width + x) * 4;
        result[offset] = data[offset];
        result[offset + 1] = data[offset + 1];
        result[offset + 2] = data[offset + 2];
        result[offset + 3] = data[offset + 3];
      }
    }
  }

  return new ImageData(result, width, height);
}

/**
 * Apply edge detection filter (Sobel operator)
 * @param imageData - Source image data
 * @returns Modified image data
 */
export function detectEdges(imageData: ImageData): ImageData {
  const { width, height } = imageData;
  const data = new Uint8ClampedArray(imageData.data);
  const result = new Uint8ClampedArray(data.length);

  // Sobel kernels
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  // Convert to grayscale first
  const gray = new Uint8ClampedArray(width * height);
  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0,
        gy = 0;

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const offset = (y + ky) * width + (x + kx);
          const kernelIndex = (ky + 1) * 3 + (kx + 1);

          gx += gray[offset] * sobelX[kernelIndex];
          gy += gray[offset] * sobelY[kernelIndex];
        }
      }

      const magnitude = Math.sqrt(gx * gx + gy * gy);
      const offset = (y * width + x) * 4;

      result[offset] = magnitude;
      result[offset + 1] = magnitude;
      result[offset + 2] = magnitude;
      result[offset + 3] = 255;
    }
  }

  return new ImageData(result, width, height);
}

// ============================================================================
// Transformations
// ============================================================================

/**
 * Crop image to its content (remove transparent/similar color borders)
 * @param imageData - Source image data
 * @param threshold - Color similarity threshold (0-255)
 * @returns Cropped image data
 */
export function cropToContent(imageData: ImageData, threshold: number = 10): ImageData {
  const { width, height, data } = imageData;

  // Find bounds
  let minX = width,
    minY = height,
    maxX = 0,
    maxY = 0;
  const bgColor = { r: data[0], g: data[1], b: data[2], a: data[3] };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const a = data[offset + 3];

      // Check if pixel is significantly different from background
      const diff = Math.abs(r - bgColor.r) + Math.abs(g - bgColor.g) + Math.abs(b - bgColor.b);

      if (a > threshold || diff > threshold) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  // If no content found, return original
  if (minX >= maxX || minY >= maxY) {
    return imageData;
  }

  // Create cropped image
  const cropWidth = maxX - minX + 1;
  const cropHeight = maxY - minY + 1;
  const cropped = new Uint8ClampedArray(cropWidth * cropHeight * 4);

  for (let y = 0; y < cropHeight; y++) {
    for (let x = 0; x < cropWidth; x++) {
      const srcOffset = ((y + minY) * width + (x + minX)) * 4;
      const dstOffset = (y * cropWidth + x) * 4;

      cropped[dstOffset] = data[srcOffset];
      cropped[dstOffset + 1] = data[srcOffset + 1];
      cropped[dstOffset + 2] = data[srcOffset + 2];
      cropped[dstOffset + 3] = data[srcOffset + 3];
    }
  }

  return new ImageData(cropped, cropWidth, cropHeight);
}

/**
 * Add padding around an image
 * @param imageData - Source image data
 * @param padding - Padding in pixels
 * @param color - Padding color (CSS color string)
 * @returns Padded image data
 */
export function addPadding(imageData: ImageData, padding: number, color: string): ImageData {
  const { width, height, data } = imageData;
  const newWidth = width + padding * 2;
  const newHeight = height + padding * 2;
  const result = new Uint8ClampedArray(newWidth * newHeight * 4);

  // Parse color
  const rgb = parseColor(color);

  // Fill with background color
  for (let i = 0; i < result.length; i += 4) {
    result[i] = rgb.r;
    result[i + 1] = rgb.g;
    result[i + 2] = rgb.b;
    result[i + 3] = 255;
  }

  // Copy original image
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcOffset = (y * width + x) * 4;
      const dstOffset = ((y + padding) * newWidth + (x + padding)) * 4;

      result[dstOffset] = data[srcOffset];
      result[dstOffset + 1] = data[srcOffset + 1];
      result[dstOffset + 2] = data[srcOffset + 2];
      result[dstOffset + 3] = data[srcOffset + 3];
    }
  }

  return new ImageData(result, newWidth, newHeight);
}

/**
 * Apply anti-aliasing to an image
 * @param imageData - Source image data
 * @returns Smoothed image data
 */
export function applyAntiAliasing(imageData: ImageData): ImageData {
  // Simple 2x2 averaging filter for smoothing
  return applyBlur(imageData, 1);
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Parse CSS color string to RGB
 * @param color - CSS color string
 * @returns RGB object
 */
function parseColor(color: string): { r: number; g: number; b: number } {
  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return { r, g, b };
  }

  // Handle rgb() colors
  if (color.startsWith('rgb')) {
    const match = color.match(/\d+/g);
    if (match && match.length >= 3) {
      return {
        r: parseInt(match[0], 10),
        g: parseInt(match[1], 10),
        b: parseInt(match[2], 10),
      };
    }
  }

  // Default to white
  return { r: 255, g: 255, b: 255 };
}

/**
 * Apply multiple filters in sequence
 * @param imageData - Source image data
 * @param filters - Array of filter functions
 * @returns Modified image data
 */
export function applyFilters(
  imageData: ImageData,
  filters: Array<(data: ImageData) => ImageData>
): ImageData {
  return filters.reduce((data, filter) => filter(data), imageData);
}

// ============================================================================
// Async Filter Processing (Web Worker)
// ============================================================================

import type { ImageFilter } from '../types/index';

/**
 * Worker pool for parallel filter processing
 */
class FilterWorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private poolSize: number;

  constructor(poolSize: number = 2) {
    this.poolSize = Math.min(poolSize, navigator.hardwareConcurrency || 2);
  }

  /**
   * Get or create a worker from the pool
   */
  private getWorker(): Worker {
    // Return available worker if exists
    if (this.availableWorkers.length > 0) {
      return this.availableWorkers.pop()!;
    }

    // Create new worker if under pool size
    if (this.workers.length < this.poolSize) {
      const worker = new Worker(new URL('./workers/filterWorker.ts', import.meta.url), {
        type: 'module',
      });
      this.workers.push(worker);
      return worker;
    }

    // Wait for a worker to become available (should not happen with proper queue management)
    throw new Error('No workers available and pool is full');
  }

  /**
   * Return a worker to the pool
   */
  private returnWorker(worker: Worker): void {
    this.availableWorkers.push(worker);
  }

  /**
   * Apply filter using a worker from the pool
   */
  async applyFilter(imageData: ImageData, filter: ImageFilter): Promise<ImageData> {
    const worker = this.getWorker();

    return new Promise((resolve, reject) => {
      const handleMessage = (event: MessageEvent) => {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        this.returnWorker(worker);

        if (event.data.type === 'filter-result') {
          resolve(event.data.imageData);
        } else if (event.data.type === 'error') {
          reject(new Error(event.data.message));
        }
      };

      const handleError = (error: ErrorEvent) => {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        this.returnWorker(worker);
        reject(error);
      };

      worker.addEventListener('message', handleMessage);
      worker.addEventListener('error', handleError);

      worker.postMessage({
        type: 'apply-filter',
        imageData,
        filter,
      });
    });
  }

  /**
   * Terminate all workers in the pool
   */
  terminate(): void {
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
    this.availableWorkers = [];
  }
}

// Global worker pool instance
let workerPool: FilterWorkerPool | null = null;

/**
 * Get or create the global worker pool
 */
function getWorkerPool(): FilterWorkerPool {
  if (!workerPool) {
    workerPool = new FilterWorkerPool(2);
  }
  return workerPool;
}

/**
 * Apply filter asynchronously using Web Worker.
 * Use this for heavy filters or when you want to avoid blocking the main thread.
 *
 * @param imageData - Source image data
 * @param filter - Filter to apply
 * @returns Promise with modified image data
 */
export async function applyFilterAsync(
  imageData: ImageData,
  filter: ImageFilter
): Promise<ImageData> {
  const pool = getWorkerPool();
  return pool.applyFilter(imageData, filter);
}

/**
 * Terminate all filter workers.
 * Call this when shutting down the editor or switching projects.
 */
export function terminateFilterWorkers(): void {
  if (workerPool) {
    workerPool.terminate();
    workerPool = null;
  }
}
