/**
 * Texture Strategy Interface
 *
 * Defines the contract for all procedural texture generators.
 * Follows the Strategy pattern for extensible texture creation.
 *
 * @module canvas/backgroundEffects/textures/TextureStrategy
 */

import type { TextureConfig } from '@/ts/types/backgroundEffects.js';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Context provided to texture generators
 */
export interface TextureContext {
  /** Canvas 2D rendering context for the texture */
  ctx: CanvasRenderingContext2D;
  /** Diameter of the circular token in pixels */
  diameter: number;
  /** Center point (diameter / 2) */
  center: number;
  /** Texture configuration */
  config: TextureConfig;
  /** Base/solid color for tinting effects */
  baseColor: string;
}

/**
 * Result of texture generation (for potential caching/metadata)
 */
export interface TextureResult {
  /** Whether texture was successfully generated */
  success: boolean;
  /** Optional error message if generation failed */
  error?: string;
}

// ============================================================================
// STRATEGY INTERFACE
// ============================================================================

/**
 * Strategy interface for procedural texture generation
 *
 * Each texture type implements this interface with its own
 * algorithm for generating pixel data.
 *
 * @example
 * ```typescript
 * class MarbleTextureStrategy implements TextureStrategy {
 *   generate(context: TextureContext): TextureResult {
 *     // Generate marble texture...
 *     return { success: true };
 *   }
 * }
 * ```
 */
export interface TextureStrategy {
  /**
   * Generate the texture onto the provided canvas context
   *
   * @param context - Texture generation context with canvas, dimensions, and config
   * @returns Result indicating success or failure
   */
  generate(context: TextureContext): TextureResult;

  /**
   * Human-readable name for debugging/logging
   */
  readonly name: string;
}

// ============================================================================
// BASE CLASS
// ============================================================================

/**
 * Abstract base class for texture strategies
 *
 * Provides common functionality like circular bounds checking
 * and image data manipulation helpers.
 */
export abstract class BaseTextureStrategy implements TextureStrategy {
  abstract readonly name: string;
  abstract generate(context: TextureContext): TextureResult;

  /**
   * Check if a point is within the circular token bounds
   */
  protected isInCircle(x: number, y: number, center: number): boolean {
    const dx = x - center;
    const dy = y - center;
    return dx * dx + dy * dy <= center * center;
  }

  /**
   * Get the pixel index for ImageData manipulation
   */
  protected getPixelIndex(x: number, y: number, width: number): number {
    return (y * width + x) * 4;
  }

  /**
   * Set a grayscale pixel value in ImageData
   */
  protected setGrayscalePixel(
    data: Uint8ClampedArray,
    index: number,
    value: number,
    alpha: number = 255
  ): void {
    const gray = Math.floor(Math.max(0, Math.min(255, value * 255)));
    data[index] = gray;
    data[index + 1] = gray;
    data[index + 2] = gray;
    data[index + 3] = alpha;
  }

  /**
   * Create ImageData and iterate over circular pixels
   *
   * @param context - Texture context
   * @param callback - Called for each pixel with normalized coords and pixel index
   */
  protected forEachCircularPixel(
    context: TextureContext,
    callback: (
      x: number,
      y: number,
      nx: number,
      ny: number,
      index: number,
      data: Uint8ClampedArray
    ) => void
  ): ImageData {
    const { ctx, diameter, center } = context;
    const imageData = ctx.createImageData(diameter, diameter);
    const data = imageData.data;

    for (let y = 0; y < diameter; y++) {
      for (let x = 0; x < diameter; x++) {
        if (!this.isInCircle(x, y, center)) continue;

        const index = this.getPixelIndex(x, y, diameter);
        const nx = x / diameter;
        const ny = y / diameter;

        callback(x, y, nx, ny, index, data);
      }
    }

    return imageData;
  }
}
