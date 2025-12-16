/**
 * File Upload Service
 *
 * Main orchestrator for file uploads. Coordinates validation, processing,
 * and storage of uploaded files.
 *
 * @module services/upload/FileUploadService
 */

import { assetStorageService, type CreateAssetData } from './AssetStorageService.js';
import { fileValidationService } from './FileValidationService.js';
import { imageProcessingService } from './ImageProcessingService.js';
import type { AssetSourceType, AssetType, UploadConfig, UploadOutcome } from './types.js';

// ============================================================================
// FileUploadService
// ============================================================================

/**
 * Service for handling file uploads
 */
export class FileUploadService {
  /**
   * Upload one or more files
   *
   * @param files - File or array of files to upload
   * @param config - Upload configuration
   * @returns Array of upload results
   */
  async upload(files: File | File[], config: UploadConfig): Promise<UploadOutcome[]> {
    const fileArray = Array.isArray(files) ? files : [files];
    const results: UploadOutcome[] = [];
    const total = fileArray.length;

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];

      // Report progress
      if (config.onProgress) {
        const progress = Math.round(((i + 0.5) / total) * 100);
        config.onProgress(progress);
      }

      try {
        const result = await this.uploadSingle(file, config, 'upload');
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          filename: file.name,
          error: (error as Error).message,
        });
      }

      // Report progress
      if (config.onProgress) {
        const progress = Math.round(((i + 1) / total) * 100);
        config.onProgress(progress);
      }
    }

    return results;
  }

  /**
   * Upload from clipboard event
   *
   * @param event - Clipboard event
   * @param config - Upload configuration
   * @returns Upload result or null if no image in clipboard
   */
  async uploadFromClipboard(
    event: ClipboardEvent,
    config: UploadConfig
  ): Promise<UploadOutcome | null> {
    const items = event.clipboardData?.items;
    if (!items) return null;

    // Find image item in clipboard
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          // Generate a filename for clipboard images
          const ext = this.getExtensionFromMimeType(file.type);
          const timestamp = Date.now();
          const renamedFile = new File([file], `pasted_${timestamp}.${ext}`, {
            type: file.type,
          });

          try {
            return await this.uploadSingle(renamedFile, config, 'paste');
          } catch (error) {
            return {
              success: false,
              filename: renamedFile.name,
              error: (error as Error).message,
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * Upload from URL
   *
   * @param url - Image URL to download and upload
   * @param config - Upload configuration
   * @returns Upload result
   */
  async uploadFromUrl(url: string, config: UploadConfig): Promise<UploadOutcome> {
    try {
      // Fetch the image
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      const blob = await response.blob();

      // Generate filename from URL
      const urlPath = new URL(url).pathname;
      const urlFilename = urlPath.split('/').pop() || 'image';
      const ext = this.getExtensionFromMimeType(blob.type);
      const filename = urlFilename.includes('.') ? urlFilename : `${urlFilename}.${ext}`;

      const file = new File([blob], filename, { type: blob.type });

      return await this.uploadSingle(file, config, 'url');
    } catch (error) {
      return {
        success: false,
        filename: url,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Upload from a Blob (e.g., from icon editor)
   *
   * @param blob - Blob to upload
   * @param filename - Filename to use
   * @param config - Upload configuration
   * @returns Upload result
   */
  async uploadFromBlob(blob: Blob, filename: string, config: UploadConfig): Promise<UploadOutcome> {
    const file = new File([blob], filename, { type: blob.type });
    return this.uploadSingle(file, config, 'editor');
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Upload a single file
   */
  private async uploadSingle(
    file: File,
    config: UploadConfig,
    sourceType: AssetSourceType
  ): Promise<UploadOutcome> {
    // 1. Validate the file
    const validation = await fileValidationService.validate(file, config.assetType);

    if (!validation.valid) {
      return {
        success: false,
        filename: file.name,
        error: validation.errors.join('; '),
        validation,
      };
    }

    // 2. Process the image (resize, convert, generate thumbnail)
    let processedBlob: Blob;
    let thumbnailBlob: Blob;
    let metadata: {
      filename: string;
      mimeType: string;
      size: number;
      width: number;
      height: number;
    };

    if (config.skipProcessing) {
      // Use original file
      processedBlob = file;
      thumbnailBlob = await imageProcessingService.generateThumbnail(file);
      metadata = {
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        width: validation.dimensions?.width ?? 0,
        height: validation.dimensions?.height ?? 0,
      };
    } else {
      // Process the image
      const processed = await imageProcessingService.process(file, config.assetType);
      processedBlob = processed.blob;
      thumbnailBlob = processed.thumbnail;
      metadata = processed.metadata;
    }

    // 3. Prepare asset data
    const assetData: CreateAssetData = {
      type: config.assetType,
      projectId: config.projectId ?? null,
      blob: processedBlob,
      thumbnail: thumbnailBlob,
      metadata: {
        ...metadata,
        uploadedAt: Date.now(),
        sourceType,
      },
      linkedTo: config.characterId ? [config.characterId] : [],
    };

    // 4. Save to database
    const assetId = await assetStorageService.save(assetData);

    // 5. Get the saved asset
    const asset = await assetStorageService.getById(assetId);
    if (!asset) {
      throw new Error('Failed to retrieve saved asset');
    }

    return {
      success: true,
      assetId,
      asset,
    };
  }

  /**
   * Get file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const map: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'image/svg+xml': 'svg',
    };
    return map[mimeType] || 'png';
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Create a file input and trigger file selection
   *
   * @param config - Upload configuration
   * @param multiple - Allow multiple file selection
   * @returns Promise that resolves with upload results
   */
  openFilePicker(config: UploadConfig, multiple: boolean = false): Promise<UploadOutcome[]> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = multiple;
      input.accept = this.getAcceptString(config.assetType);

      input.onchange = async () => {
        if (input.files && input.files.length > 0) {
          const files = Array.from(input.files);
          const results = await this.upload(files, config);
          resolve(results);
        } else {
          resolve([]);
        }
      };

      // Handle cancel
      input.oncancel = () => {
        resolve([]);
      };

      input.click();
    });
  }

  /**
   * Get accept string for file input based on asset type
   */
  getAcceptString(assetType: AssetType): string {
    const config = fileValidationService.getConfig(assetType);
    return config.allowedMimeTypes.join(',');
  }

  /**
   * Check if a file type is valid for an asset type
   */
  isValidFileType(file: File, assetType: AssetType): boolean {
    const config = fileValidationService.getConfig(assetType);
    return config.allowedMimeTypes.includes(file.type);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Singleton instance of FileUploadService
 */
export const fileUploadService = new FileUploadService();
