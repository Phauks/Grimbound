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
// Constants
// ============================================================================

/** Number of bytes to read for magic number detection */
const MAGIC_BYTE_SAMPLE_SIZE = 16;

/** Number of bytes to read when detecting SVG */
const SVG_SAMPLE_SIZE = 1024;

/** Maximum canvas dimension for transparency sampling (performance optimization) */
const TRANSPARENCY_SAMPLE_SIZE = 100;

/** Tolerance for "nearly square" images (5%) */
const SQUARE_TOLERANCE = 0.05;

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
    this.validateMimeType(detectedMimeType, config, errors);

    // 3. Validate file size
    this.validateFileSize(file.size, config, errors);

    // 4. If image, validate dimensions
    let dimensions: { width: number; height: number } | undefined;
    if (this.isRasterImage(detectedMimeType)) {
      try {
        dimensions = await this.getImageDimensions(file);
        this.validateDimensions(dimensions, config, errors, warnings);

        // Check transparency requirement
        if (config.requireTransparency) {
          await this.validateTransparency(file, detectedMimeType, warnings);
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
      const buffer = await file.slice(0, MAGIC_BYTE_SAMPLE_SIZE).arrayBuffer();
      const bytes = new Uint8Array(buffer);

      // Check known formats in order of specificity
      const detected = this.detectFromMagicBytes(bytes);
      if (detected) return detected;

      // Check SVG (text-based, needs larger sample)
      if (bytes[0] === 0x3c) {
        const text = await file.slice(0, SVG_SAMPLE_SIZE).text();
        if (text.includes('<svg') || text.includes('<!DOCTYPE svg')) {
          return 'image/svg+xml';
        }
      }

      // Fallback to browser-reported type
      return file.type || 'application/octet-stream';
    } catch {
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
    const img = await this.loadImage(file);
    return { width: img.naturalWidth, height: img.naturalHeight };
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
    if (mimeType === 'image/jpeg') return false;

    // SVG and GIF can have transparency, assume they do
    if (mimeType === 'image/svg+xml' || mimeType === 'image/gif') return true;

    // PNG and WebP require pixel sampling
    if (mimeType === 'image/png' || mimeType === 'image/webp') {
      return this.sampleTransparency(file);
    }

    // Unknown formats - assume they might have transparency
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
  // Private Validation Helpers
  // ==========================================================================

  /**
   * Validate MIME type against config
   */
  private validateMimeType(mimeType: string, config: AssetTypeConfig, errors: string[]): void {
    if (!config.allowedMimeTypes.includes(mimeType)) {
      errors.push(
        `Invalid file type: ${mimeType || 'unknown'}. ` +
          `Allowed: ${config.allowedExtensions.join(', ')}`
      );
    }
  }

  /**
   * Validate file size against config
   */
  private validateFileSize(size: number, config: AssetTypeConfig, errors: string[]): void {
    if (size > config.maxSize) {
      const maxMB = (config.maxSize / MB).toFixed(1);
      const actualMB = (size / MB).toFixed(1);
      errors.push(`File too large: ${actualMB}MB. Maximum: ${maxMB}MB`);
    }
  }

  /**
   * Validate image dimensions against config
   */
  private validateDimensions(
    dimensions: { width: number; height: number },
    config: AssetTypeConfig,
    errors: string[],
    warnings: string[]
  ): void {
    const { width, height } = dimensions;

    // Minimum dimensions
    if (config.minWidth && width < config.minWidth) {
      errors.push(`Image too narrow: ${width}px. Minimum: ${config.minWidth}px`);
    }
    if (config.minHeight && height < config.minHeight) {
      errors.push(`Image too short: ${height}px. Minimum: ${config.minHeight}px`);
    }

    // Maximum dimensions (warning only - will be resized)
    if (config.maxWidth && width > config.maxWidth) {
      warnings.push(`Image will be resized: ${width}px → ${config.maxWidth}px`);
    }
    if (config.maxHeight && height > config.maxHeight) {
      warnings.push(`Image will be resized: ${height}px → ${config.maxHeight}px`);
    }

    // Square requirement
    if (config.requireSquare && width !== height) {
      const diff = Math.abs(width - height);
      const avgSize = (width + height) / 2;
      const tolerance = avgSize * SQUARE_TOLERANCE;

      if (diff > tolerance) {
        warnings.push(`Image is not square (${width}×${height}). It will be cropped to fit.`);
      }
    }
  }

  /**
   * Validate transparency requirement
   */
  private async validateTransparency(
    file: File,
    mimeType: string,
    warnings: string[]
  ): Promise<void> {
    const hasAlpha = await this.checkTransparency(file, mimeType);
    if (!hasAlpha) {
      warnings.push(
        `Image may not have transparency. Token backgrounds work best with transparent PNGs.`
      );
    }
  }

  // ==========================================================================
  // Private Detection Helpers
  // ==========================================================================

  /**
   * Check if MIME type is a raster image (not SVG)
   */
  private isRasterImage(mimeType: string): boolean {
    return mimeType.startsWith('image/') && mimeType !== 'image/svg+xml';
  }

  /**
   * Detect MIME type from magic bytes
   */
  private detectFromMagicBytes(bytes: Uint8Array): string | null {
    // PNG (8 bytes)
    if (this.matchesMagicBytes(bytes, MAGIC_BYTES['image/png'])) {
      return 'image/png';
    }

    // JPEG (3 bytes)
    if (this.matchesMagicBytes(bytes, MAGIC_BYTES['image/jpeg'])) {
      return 'image/jpeg';
    }

    // WebP (RIFF + WEBP at offset 8)
    if (
      this.matchesMagicBytes(bytes, MAGIC_BYTES['image/webp']) &&
      this.matchesMagicBytes(bytes.slice(8), WEBP_SIGNATURE)
    ) {
      return 'image/webp';
    }

    // GIF
    if (this.matchesMagicBytes(bytes, MAGIC_BYTES['image/gif'])) {
      return 'image/gif';
    }

    return null;
  }

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

  // ==========================================================================
  // Private Image Helpers
  // ==========================================================================

  /**
   * Load an image from a File
   */
  private loadImage(file: File): Promise<HTMLImageElement> {
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
   * Sample pixels to detect transparency
   */
  private async sampleTransparency(file: File): Promise<boolean> {
    try {
      const img = await this.loadImage(file);

      // Create small canvas to sample pixels efficiently
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return true; // Assume transparency if can't check

      canvas.width = Math.min(img.width, TRANSPARENCY_SAMPLE_SIZE);
      canvas.height = Math.min(img.height, TRANSPARENCY_SAMPLE_SIZE);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Check alpha channel (every 4th byte starting at index 3)
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 255) return true; // Found transparent pixel
      }

      return false;
    } catch {
      return true; // Assume transparency on error
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Singleton instance of FileValidationService
 */
export const fileValidationService = new FileValidationService();
