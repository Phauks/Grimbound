/**
 * File Validation Service
 *
 * Validates files before upload based on asset type configuration.
 * Performs MIME type detection using magic bytes, not just file extension.
 *
 * @module services/upload/FileValidationService
 */

import { ASSET_TYPE_CONFIGS, MAGIC_BYTES, MB, WEBP_SIGNATURE } from './constants.js';
import type { AssetType, AssetTypeConfig, ValidationResult } from './types.js';

// ============================================================================
// FileValidationService
// ============================================================================

/**
 * Service for validating files before upload
 */
export class FileValidationService {
  /**
   * Validate a file for a specific asset type
   *
   * @param file - File to validate
   * @param assetType - Type of asset being uploaded
   * @returns Validation result with errors/warnings
   */
  async validate(file: File, assetType: AssetType): Promise<ValidationResult> {
    const config = ASSET_TYPE_CONFIGS[assetType];
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Detect actual MIME type from file content
    const detectedMimeType = await this.detectMimeType(file);

    // 2. Validate MIME type
    if (!config.allowedMimeTypes.includes(detectedMimeType)) {
      errors.push(
        `Invalid file type: ${detectedMimeType || 'unknown'}. ` +
          `Allowed: ${config.allowedExtensions.join(', ')}`
      );
    }

    // 3. Validate file size
    if (file.size > config.maxSize) {
      const maxMB = (config.maxSize / MB).toFixed(1);
      const actualMB = (file.size / MB).toFixed(1);
      errors.push(`File too large: ${actualMB}MB. Maximum: ${maxMB}MB`);
    }

    // 4. If image, validate dimensions
    let dimensions: { width: number; height: number } | undefined;
    if (detectedMimeType.startsWith('image/') && detectedMimeType !== 'image/svg+xml') {
      try {
        dimensions = await this.getImageDimensions(file);

        // Check minimum dimensions
        if (config.minWidth && dimensions.width < config.minWidth) {
          errors.push(`Image too narrow: ${dimensions.width}px. Minimum: ${config.minWidth}px`);
        }
        if (config.minHeight && dimensions.height < config.minHeight) {
          errors.push(`Image too short: ${dimensions.height}px. Minimum: ${config.minHeight}px`);
        }

        // Check maximum dimensions
        if (config.maxWidth && dimensions.width > config.maxWidth) {
          warnings.push(`Image will be resized: ${dimensions.width}px → ${config.maxWidth}px`);
        }
        if (config.maxHeight && dimensions.height > config.maxHeight) {
          warnings.push(`Image will be resized: ${dimensions.height}px → ${config.maxHeight}px`);
        }

        // Check square requirement
        if (config.requireSquare && dimensions.width !== dimensions.height) {
          const diff = Math.abs(dimensions.width - dimensions.height);
          const avgSize = (dimensions.width + dimensions.height) / 2;
          const tolerance = avgSize * 0.05; // 5% tolerance

          if (diff > tolerance) {
            warnings.push(
              `Image is not square (${dimensions.width}×${dimensions.height}). ` +
                `It will be cropped to fit.`
            );
          }
        }

        // Check transparency requirement
        if (config.requireTransparency) {
          const hasAlpha = await this.checkTransparency(file, detectedMimeType);
          if (!hasAlpha) {
            warnings.push(
              `Image may not have transparency. Token backgrounds work best with transparent PNGs.`
            );
          }
        }
      } catch (error) {
        errors.push(`Could not read image dimensions: ${(error as Error).message}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      detectedMimeType,
      dimensions,
    };
  }

  /**
   * Detect MIME type from file content using magic bytes
   *
   * @param file - File to analyze
   * @returns Detected MIME type or fallback to file.type
   */
  async detectMimeType(file: File): Promise<string> {
    try {
      // Read first 16 bytes for magic number detection
      const buffer = await file.slice(0, 16).arrayBuffer();
      const bytes = new Uint8Array(buffer);

      // Check PNG (8 bytes)
      if (this.matchesMagicBytes(bytes, MAGIC_BYTES['image/png'])) {
        return 'image/png';
      }

      // Check JPEG (3 bytes)
      if (this.matchesMagicBytes(bytes, MAGIC_BYTES['image/jpeg'])) {
        return 'image/jpeg';
      }

      // Check WebP (RIFF + WEBP at offset 8)
      if (
        this.matchesMagicBytes(bytes, MAGIC_BYTES['image/webp']) &&
        this.matchesMagicBytes(bytes.slice(8), WEBP_SIGNATURE)
      ) {
        return 'image/webp';
      }

      // Check GIF
      if (this.matchesMagicBytes(bytes, MAGIC_BYTES['image/gif'])) {
        return 'image/gif';
      }

      // Check SVG (starts with '<' or '<?xml')
      if (bytes[0] === 0x3c) {
        // Could be SVG or XML, check for svg tag in first 1KB
        const text = await file.slice(0, 1024).text();
        if (text.includes('<svg') || text.includes('<!DOCTYPE svg')) {
          return 'image/svg+xml';
        }
      }

      // Fallback to browser-reported type
      return file.type || 'application/octet-stream';
    } catch {
      // If we can't read the file, trust the browser
      return file.type || 'application/octet-stream';
    }
  }

  /**
   * Get image dimensions by loading into an Image element
   *
   * @param file - Image file
   * @returns Width and height in pixels
   */
  async getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  /**
   * Check if an image has transparency/alpha channel
   *
   * @param file - Image file
   * @param mimeType - MIME type of the image
   * @returns True if image supports transparency
   */
  async checkTransparency(file: File, mimeType: string): Promise<boolean> {
    // JPEG never has transparency
    if (mimeType === 'image/jpeg') {
      return false;
    }

    // PNG and WebP can have transparency, check a sample of pixels
    if (mimeType === 'image/png' || mimeType === 'image/webp') {
      try {
        const url = URL.createObjectURL(file);
        const img = await this.loadImage(url);
        URL.revokeObjectURL(url);

        // Create small canvas to sample pixels
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return true; // Assume transparency if can't check

        canvas.width = Math.min(img.width, 100);
        canvas.height = Math.min(img.height, 100);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Check corners and center for transparency
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Sample pixels (check alpha channel - every 4th byte starting at index 3)
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] < 255) {
            return true; // Found a transparent pixel
          }
        }

        return false; // No transparent pixels found
      } catch {
        return true; // Assume transparency on error
      }
    }

    // SVG and others - assume they might have transparency
    return true;
  }

  /**
   * Get the configuration for an asset type
   *
   * @param assetType - Type of asset
   * @returns Asset type configuration
   */
  getConfig(assetType: AssetType): AssetTypeConfig {
    return ASSET_TYPE_CONFIGS[assetType];
  }

  /**
   * Get human-readable description of allowed files
   *
   * @param assetType - Type of asset
   * @returns Description string
   */
  getAllowedFilesDescription(assetType: AssetType): string {
    const config = ASSET_TYPE_CONFIGS[assetType];
    const extensions = config.allowedExtensions.join(', ');
    const maxMB = (config.maxSize / MB).toFixed(0);
    return `${extensions} (max ${maxMB}MB)`;
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  /**
   * Check if bytes match a magic byte pattern
   */
  private matchesMagicBytes(bytes: Uint8Array, pattern: Uint8Array): boolean {
    if (bytes.length < pattern.length) return false;
    for (let i = 0; i < pattern.length; i++) {
      if (bytes[i] !== pattern[i]) return false;
    }
    return true;
  }

  /**
   * Load an image from URL
   */
  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Singleton instance of FileValidationService
 */
export const fileValidationService = new FileValidationService();
