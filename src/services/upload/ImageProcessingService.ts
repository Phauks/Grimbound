/**
 * Image Processing Service
 *
 * Handles image resizing, format conversion, and thumbnail generation.
 * Uses Canvas API for client-side image manipulation.
 *
 * @module services/upload/ImageProcessingService
 */

import type { AssetType, ProcessedImage, AssetMetadata } from './types.js';
import {
  ASSET_TYPE_CONFIGS,
  DEFAULT_THUMBNAIL_SIZE,
  THUMBNAIL_QUALITY,
  PROCESSED_IMAGE_FORMAT,
  PROCESSED_IMAGE_QUALITY,
} from './constants.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Options for image processing
 */
export interface ProcessingOptions {
  /** Target width (optional, uses config default) */
  targetWidth?: number;
  /** Target height (optional, uses config default) */
  targetHeight?: number;
  /** Output format (optional, defaults to webp) */
  outputFormat?: string;
  /** Output quality 0-1 (optional) */
  quality?: number;
  /** Thumbnail size (optional) */
  thumbnailSize?: number;
  /** Skip resizing, keep original dimensions */
  skipResize?: boolean;
  /** Skip format conversion, keep original format */
  skipConversion?: boolean;
}

// ============================================================================
// ImageProcessingService
// ============================================================================

/**
 * Service for processing images before storage
 */
export class ImageProcessingService {
  /**
   * Process an image file for storage
   *
   * @param file - Original file
   * @param assetType - Type of asset
   * @param options - Processing options
   * @returns Processed image with blob, thumbnail, and metadata
   */
  async process(
    file: File,
    assetType: AssetType,
    options: ProcessingOptions = {}
  ): Promise<ProcessedImage> {
    const config = ASSET_TYPE_CONFIGS[assetType];

    // Load the image
    const img = await this.loadImage(file);

    // Determine target dimensions
    const targetWidth = options.targetWidth ?? config.targetWidth ?? img.naturalWidth;
    const targetHeight = options.targetHeight ?? config.targetHeight ?? img.naturalHeight;

    // Determine output format
    const outputFormat = options.skipConversion
      ? file.type
      : (options.outputFormat ?? PROCESSED_IMAGE_FORMAT);
    const quality = options.quality ?? PROCESSED_IMAGE_QUALITY;

    // Calculate actual dimensions (maintaining aspect ratio or cropping)
    const { width, height, crop } = this.calculateDimensions(
      img.naturalWidth,
      img.naturalHeight,
      targetWidth,
      targetHeight,
      config.requireSquare ?? false,
      options.skipResize ?? false
    );

    // Process main image
    const processedBlob = await this.resizeImage(
      img,
      width,
      height,
      crop,
      outputFormat,
      quality
    );

    // Generate thumbnail
    const thumbnailSize = options.thumbnailSize ?? config.thumbnailSize ?? DEFAULT_THUMBNAIL_SIZE;
    const thumbnail = await this.generateThumbnail(img, thumbnailSize, crop);

    // Build metadata
    const metadata: Omit<AssetMetadata, 'uploadedAt' | 'sourceType'> = {
      filename: this.updateFilename(file.name, outputFormat),
      mimeType: outputFormat,
      size: processedBlob.size,
      width,
      height,
    };

    return {
      blob: processedBlob,
      thumbnail,
      metadata,
    };
  }

  /**
   * Generate a thumbnail from an image
   *
   * @param source - Image element or File
   * @param size - Thumbnail size (square)
   * @param crop - Crop region (optional)
   * @returns Thumbnail as Blob
   */
  async generateThumbnail(
    source: HTMLImageElement | File,
    size: number = DEFAULT_THUMBNAIL_SIZE,
    crop?: CropRegion
  ): Promise<Blob> {
    // If source is a File, load it first
    const img = source instanceof File ? await this.loadImage(source) : source;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not create canvas context');
    }

    canvas.width = size;
    canvas.height = size;

    // Apply crop or scale to fit
    if (crop) {
      ctx.drawImage(
        img,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        size,
        size
      );
    } else {
      // Cover fit (crop to fill)
      const scale = Math.max(size / img.naturalWidth, size / img.naturalHeight);
      const scaledWidth = img.naturalWidth * scale;
      const scaledHeight = img.naturalHeight * scale;
      const x = (size - scaledWidth) / 2;
      const y = (size - scaledHeight) / 2;
      ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
    }

    return this.canvasToBlob(canvas, 'image/webp', THUMBNAIL_QUALITY);
  }

  /**
   * Load an image from a File
   *
   * @param file - File to load
   * @returns Loaded HTMLImageElement
   */
  async loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  /**
   * Resize an image using canvas
   *
   * @param img - Source image
   * @param width - Target width
   * @param height - Target height
   * @param crop - Crop region (optional)
   * @param format - Output format
   * @param quality - Output quality
   * @returns Resized image as Blob
   */
  async resizeImage(
    img: HTMLImageElement,
    width: number,
    height: number,
    crop: CropRegion | undefined,
    format: string,
    quality: number
  ): Promise<Blob> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not create canvas context');
    }

    canvas.width = width;
    canvas.height = height;

    // Enable image smoothing for better quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (crop) {
      // Draw cropped region
      ctx.drawImage(
        img,
        crop.x,
        crop.y,
        crop.width,
        crop.height,
        0,
        0,
        width,
        height
      );
    } else {
      // Draw full image scaled
      ctx.drawImage(img, 0, 0, width, height);
    }

    return this.canvasToBlob(canvas, format, quality);
  }

  /**
   * Convert canvas to Blob
   *
   * @param canvas - Canvas element
   * @param format - Output format
   * @param quality - Output quality
   * @returns Blob
   */
  private canvasToBlob(
    canvas: HTMLCanvasElement,
    format: string,
    quality: number
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        },
        format,
        quality
      );
    });
  }

  /**
   * Calculate output dimensions based on constraints
   *
   * @param srcWidth - Source width
   * @param srcHeight - Source height
   * @param maxWidth - Maximum width
   * @param maxHeight - Maximum height
   * @param requireSquare - Force square output
   * @param skipResize - Keep original dimensions
   * @returns Target dimensions and optional crop region
   */
  private calculateDimensions(
    srcWidth: number,
    srcHeight: number,
    maxWidth: number,
    maxHeight: number,
    requireSquare: boolean,
    skipResize: boolean
  ): { width: number; height: number; crop?: CropRegion } {
    // If skipping resize, return original dimensions
    if (skipResize && !requireSquare) {
      return { width: srcWidth, height: srcHeight };
    }

    let width = srcWidth;
    let height = srcHeight;
    let crop: CropRegion | undefined;

    // Handle square requirement
    if (requireSquare) {
      const size = Math.min(srcWidth, srcHeight);
      crop = {
        x: Math.floor((srcWidth - size) / 2),
        y: Math.floor((srcHeight - size) / 2),
        width: size,
        height: size,
      };
      width = size;
      height = size;
    }

    // Scale down if needed
    if (!skipResize) {
      if (width > maxWidth || height > maxHeight) {
        const scale = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
    }

    return { width, height, crop };
  }

  /**
   * Update filename extension based on new format
   *
   * @param filename - Original filename
   * @param newFormat - New MIME type
   * @returns Updated filename
   */
  private updateFilename(filename: string, newFormat: string): string {
    const extensionMap: Record<string, string> = {
      'image/webp': '.webp',
      'image/png': '.png',
      'image/jpeg': '.jpg',
    };

    const newExt = extensionMap[newFormat] || '.webp';
    const baseName = filename.replace(/\.[^.]+$/, '');
    return `${baseName}${newExt}`;
  }

  // ==========================================================================
  // Future Icon Editor Methods (stubs for extension)
  // ==========================================================================

  /**
   * Crop an image to a specific region
   * (For future icon editor)
   */
  async crop(
    source: File | Blob,
    region: CropRegion
  ): Promise<Blob> {
    const file = source instanceof Blob && !(source instanceof File)
      ? new File([source], 'image.png', { type: source.type })
      : source as File;

    const img = await this.loadImage(file);

    return this.resizeImage(
      img,
      region.width,
      region.height,
      region,
      source.type || 'image/png',
      PROCESSED_IMAGE_QUALITY
    );
  }

  /**
   * Rotate an image by degrees
   * (For future icon editor)
   */
  async rotate(
    source: File | Blob,
    degrees: number
  ): Promise<Blob> {
    const file = source instanceof Blob && !(source instanceof File)
      ? new File([source], 'image.png', { type: source.type })
      : source as File;

    const img = await this.loadImage(file);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Could not create canvas context');
    }

    // Handle 90/180/270 degree rotations
    const radians = (degrees * Math.PI) / 180;
    const sin = Math.abs(Math.sin(radians));
    const cos = Math.abs(Math.cos(radians));

    canvas.width = Math.round(img.naturalWidth * cos + img.naturalHeight * sin);
    canvas.height = Math.round(img.naturalWidth * sin + img.naturalHeight * cos);

    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(radians);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

    return this.canvasToBlob(canvas, source.type || 'image/png', PROCESSED_IMAGE_QUALITY);
  }
}

// ============================================================================
// Types (internal)
// ============================================================================

/**
 * Crop region definition
 */
interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Singleton instance of ImageProcessingService
 */
export const imageProcessingService = new ImageProcessingService();
