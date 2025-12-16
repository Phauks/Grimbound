/**
 * Background Removal Service
 *
 * AI-powered background removal using MediaPipe Tasks Vision ImageSegmenter
 * Runs entirely client-side with no API costs or usage limits
 */

import {
  FilesetResolver,
  ImageSegmenter,
  type ImageSegmenterResult,
} from '@mediapipe/tasks-vision';
import type { BackgroundRemovalOptions } from '../types/index.js';
import { logger } from '../utils/logger.js';

// WASM files location - can be changed to self-host
const WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';

// Model file - DeepLabV3 for general image segmentation
const MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/image_segmenter/deeplab_v3/float32/1/deeplab_v3.tflite';

/**
 * Background Removal Service
 *
 * Uses MediaPipe Tasks Vision ImageSegmenter for automatic background removal.
 * Model is lazy-loaded on first use and cached for subsequent operations.
 */
export class BackgroundRemovalService {
  private segmenter: ImageSegmenter | null = null;
  private isLoading: boolean = false;
  private loadingPromise: Promise<void> | null = null;

  /**
   * Initialize the ML model (lazy-loaded on first use)
   */
  async initialize(): Promise<void> {
    // If already loaded or currently loading, return existing promise
    if (this.segmenter) return;
    if (this.loadingPromise) return this.loadingPromise;

    this.isLoading = true;

    this.loadingPromise = (async () => {
      try {
        logger.info('BackgroundRemoval', 'Loading MediaPipe Tasks Vision...');

        // Load the vision WASM files
        const vision = await FilesetResolver.forVisionTasks(WASM_PATH);

        // Create the ImageSegmenter
        this.segmenter = await ImageSegmenter.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_PATH,
            delegate: 'GPU', // Use GPU acceleration when available
          },
          outputCategoryMask: true,
          outputConfidenceMasks: true,
          runningMode: 'IMAGE',
        });

        logger.info('BackgroundRemoval', 'Background removal model initialized successfully');
      } catch (error) {
        logger.error('BackgroundRemoval', 'Failed to load background removal model', error);
        this.segmenter = null;
        throw error;
      } finally {
        this.isLoading = false;
        this.loadingPromise = null;
      }
    })();

    return this.loadingPromise;
  }

  /**
   * Remove background from image
   */
  async removeBackground(
    imageData: ImageData,
    options: BackgroundRemovalOptions = {}
  ): Promise<ImageData> {
    // Initialize model if needed
    if (!(this.segmenter || this.isLoading)) {
      await this.initialize();
    }

    if (!this.segmenter) {
      throw new Error('Background removal model not loaded');
    }

    const { threshold = 0.5, featherEdges = true, edgeRadius = 2, invertMask = false } = options;

    try {
      // Create temporary canvas for MediaPipe processing
      const canvas = document.createElement('canvas');
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      const ctx = canvas.getContext('2d')!;
      ctx.putImageData(imageData, 0, 0);

      // Run segmentation with callback
      let segmentationResult: ImageSegmenterResult | null = null;

      // The segment method uses a callback pattern
      this.segmenter.segment(canvas, (result: ImageSegmenterResult) => {
        segmentationResult = result;
      });

      if (!segmentationResult) {
        throw new Error('Segmentation failed - no result returned');
      }

      // Get the confidence mask (better for smooth edges)
      const confidenceMasks = (segmentationResult as ImageSegmenterResult).confidenceMasks;

      if (!confidenceMasks || confidenceMasks.length === 0) {
        throw new Error('No confidence mask returned from segmentation');
      }

      // Use the first confidence mask (person/foreground)
      const mask = confidenceMasks[0];
      const maskData = mask.getAsFloat32Array();

      // Apply mask to original image
      const output = this.applyConfidenceMask(imageData, maskData, {
        threshold,
        featherEdges,
        edgeRadius,
        invertMask,
      });

      // Close the mask to free memory
      mask.close();

      return output;
    } catch (error) {
      logger.error('BackgroundRemoval', 'Background removal failed', error);
      throw error;
    }
  }

  /**
   * Apply confidence mask to image
   */
  private applyConfidenceMask(
    imageData: ImageData,
    maskData: Float32Array,
    options: Required<BackgroundRemovalOptions>
  ): ImageData {
    const { threshold, featherEdges, edgeRadius, invertMask } = options;

    // Create output image data
    const output = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );

    // Apply mask to alpha channel
    for (let i = 0; i < maskData.length; i++) {
      // Get mask value (0-1 float)
      const confidence = maskData[i];

      // Apply threshold for hard edges, or use raw confidence for soft edges
      let alpha: number;
      if (featherEdges) {
        // Smooth transition using confidence value
        alpha = Math.max(0, Math.min(1, confidence - threshold + 0.5));
      } else {
        // Hard threshold
        alpha = confidence > threshold ? 1 : 0;
      }

      // Invert if requested (remove foreground instead of background)
      if (invertMask) {
        alpha = 1 - alpha;
      }

      // Set alpha channel
      const pixelIndex = i * 4;
      output.data[pixelIndex + 3] = Math.round(alpha * 255);
    }

    // Apply additional edge feathering if requested
    if (featherEdges && edgeRadius > 1) {
      return this.featherEdges(output, edgeRadius);
    }

    return output;
  }

  /**
   * Feather edges for smoother transitions
   */
  private featherEdges(imageData: ImageData, radius: number): ImageData {
    const output = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );

    const width = imageData.width;
    const height = imageData.height;

    // Simple box blur on alpha channel
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let count = 0;

        // Sample surrounding pixels
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const index = (ny * width + nx) * 4;
              sum += imageData.data[index + 3]; // Alpha channel
              count++;
            }
          }
        }

        const avgAlpha = sum / count;
        const index = (y * width + x) * 4;
        output.data[index + 3] = avgAlpha;
      }
    }

    return output;
  }

  /**
   * Manual background removal using a user-painted mask
   */
  manualRemoval(imageData: ImageData, maskData: ImageData): ImageData {
    const output = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );

    // Apply mask to alpha channel
    for (let i = 0; i < maskData.data.length; i += 4) {
      const maskAlpha = maskData.data[i + 3]; // Alpha channel of mask
      const currentAlpha = imageData.data[i + 3];

      // Combine original alpha with mask alpha
      output.data[i + 3] = Math.round((currentAlpha * maskAlpha) / 255);
    }

    return output;
  }

  /**
   * Check if model is loaded
   */
  isModelLoaded(): boolean {
    return this.segmenter !== null;
  }

  /**
   * Check if model is currently loading
   */
  isModelLoading(): boolean {
    return this.isLoading;
  }

  /**
   * Unload the model to free memory
   */
  async dispose(): Promise<void> {
    if (this.segmenter) {
      try {
        this.segmenter.close();
      } catch (error) {
        logger.error('BackgroundRemoval', 'Error disposing background removal model', error);
      }
      this.segmenter = null;
    }
  }
}

/**
 * Singleton instance for convenience
 */
export const backgroundRemovalService = new BackgroundRemovalService();
