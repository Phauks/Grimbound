/**
 * Upload Services Interfaces
 *
 * Defines the contracts for file upload and asset management services.
 * These interfaces enable dependency injection and testing.
 *
 * @module services/upload/IUploadServices
 */

import type {
  AssetFilter,
  AssetMetadata,
  AssetType,
  AssetTypeConfig,
  AssetWithUrl,
  DBAsset,
  ExportableAsset,
  ProcessedImage,
  UploadConfig,
  UploadOutcome,
  ValidationResult,
} from './types.js';
import type { CreateAssetData } from './AssetStorageService.js';
import type { ProcessingOptions } from './ImageProcessingService.js';

// ============================================================================
// File Validation Service Interface
// ============================================================================

/**
 * Service for validating files before upload
 */
export interface IFileValidationService {
  /**
   * Validate a file for a specific asset type
   *
   * @param file - File to validate
   * @param assetType - Type of asset being uploaded
   * @returns Validation result with errors/warnings
   */
  validate(file: File, assetType: AssetType): Promise<ValidationResult>;

  /**
   * Detect MIME type from file content using magic bytes
   *
   * @param file - File to analyze
   * @returns Detected MIME type or fallback to file.type
   */
  detectMimeType(file: File): Promise<string>;

  /**
   * Get image dimensions by loading into an Image element
   *
   * @param file - Image file
   * @returns Width and height in pixels
   */
  getImageDimensions(file: File): Promise<{ width: number; height: number }>;

  /**
   * Check if an image has transparency/alpha channel
   *
   * @param file - Image file
   * @param mimeType - MIME type of the image
   * @returns True if image supports transparency
   */
  checkTransparency(file: File, mimeType: string): Promise<boolean>;

  /**
   * Get the configuration for an asset type
   *
   * @param assetType - Type of asset
   * @returns Asset type configuration
   */
  getConfig(assetType: AssetType): AssetTypeConfig;

  /**
   * Get human-readable description of allowed files
   *
   * @param assetType - Type of asset
   * @returns Description string
   */
  getAllowedFilesDescription(assetType: AssetType): string;
}

// ============================================================================
// Image Processing Service Interface
// ============================================================================

/**
 * Crop region definition
 */
export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Service for processing images before storage
 */
export interface IImageProcessingService {
  /**
   * Process an image file for storage
   *
   * @param file - Original file
   * @param assetType - Type of asset
   * @param options - Processing options
   * @returns Processed image with blob, thumbnail, and metadata
   */
  process(file: File, assetType: AssetType, options?: ProcessingOptions): Promise<ProcessedImage>;

  /**
   * Generate a thumbnail from an image
   *
   * @param source - Image element or File
   * @param size - Thumbnail size (square)
   * @param crop - Crop region (optional)
   * @returns Thumbnail as Blob
   */
  generateThumbnail(
    source: HTMLImageElement | File,
    size?: number,
    crop?: CropRegion
  ): Promise<Blob>;

  /**
   * Load an image from a File
   *
   * @param file - File to load
   * @returns Loaded HTMLImageElement
   */
  loadImage(file: File): Promise<HTMLImageElement>;

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
  resizeImage(
    img: HTMLImageElement,
    width: number,
    height: number,
    crop: CropRegion | undefined,
    format: string,
    quality: number
  ): Promise<Blob>;

  /**
   * Crop an image to a specific region
   *
   * @param source - File or Blob to crop
   * @param region - Crop region
   * @returns Cropped image as Blob
   */
  crop(source: File | Blob, region: CropRegion): Promise<Blob>;

  /**
   * Rotate an image by degrees
   *
   * @param source - File or Blob to rotate
   * @param degrees - Rotation angle
   * @returns Rotated image as Blob
   */
  rotate(source: File | Blob, degrees: number): Promise<Blob>;

  /**
   * Generate SHA-256 content hash for a blob
   *
   * @param blob - Blob to hash
   * @returns Hex-encoded SHA-256 hash
   */
  hashBlob(blob: Blob): Promise<string>;

  /**
   * Generate content hashes for both processed blob and thumbnail
   *
   * @param processedBlob - Main processed image blob
   * @param thumbnailBlob - Thumbnail blob
   * @returns Object with mainHash and thumbnailHash
   */
  hashProcessedImage(
    processedBlob: Blob,
    thumbnailBlob: Blob
  ): Promise<{ mainHash: string; thumbnailHash: string }>;
}

// ============================================================================
// Asset Storage Service Interface
// ============================================================================

/**
 * Service for managing asset storage in IndexedDB
 */
export interface IAssetStorageService {
  // ---------------------------------------------------------------------------
  // CRUD Operations
  // ---------------------------------------------------------------------------

  /**
   * Save a new asset to the database with automatic deduplication
   *
   * @param data - Asset data
   * @param options - Save options
   * @returns Created or existing asset ID
   */
  save(data: CreateAssetData, options?: { enableDeduplication?: boolean }): Promise<string>;

  /**
   * Get an asset by ID
   *
   * @param id - Asset ID
   * @returns Asset or undefined if not found
   */
  getById(id: string): Promise<DBAsset | undefined>;

  /**
   * Get an asset with object URLs for display
   *
   * @param id - Asset ID
   * @returns Asset with URLs or undefined
   */
  getByIdWithUrl(id: string): Promise<AssetWithUrl | undefined>;

  /**
   * Update an existing asset
   *
   * @param id - Asset ID
   * @param updates - Partial asset data to update
   */
  update(id: string, updates: Partial<Omit<DBAsset, 'id'>>): Promise<void>;

  /**
   * Delete an asset by ID
   *
   * @param id - Asset ID
   */
  delete(id: string): Promise<void>;

  /**
   * Delete multiple assets by ID
   *
   * @param ids - Array of asset IDs
   */
  bulkDelete(ids: string[]): Promise<void>;

  /**
   * Update multiple assets in a single transaction
   *
   * @param updates - Array of {id, data} pairs to update
   */
  bulkUpdate(updates: Array<{ id: string; data: Partial<Omit<DBAsset, 'id'>> }>): Promise<void>;

  // ---------------------------------------------------------------------------
  // Query Operations
  // ---------------------------------------------------------------------------

  /**
   * Get all assets matching a filter
   *
   * @param filter - Filter options
   * @returns Filtered assets
   */
  list(filter?: AssetFilter): Promise<DBAsset[]>;

  /**
   * Get total count of assets matching filter
   *
   * @param filter - Filter options
   * @returns Total count
   */
  count(filter?: AssetFilter): Promise<number>;

  /**
   * Get all assets with object URLs
   *
   * @param filter - Filter options
   * @returns Assets with URLs
   */
  listWithUrls(filter?: AssetFilter): Promise<AssetWithUrl[]>;

  /**
   * Get assets by type
   *
   * @param type - Asset type
   * @returns Assets of that type
   */
  getByType(type: AssetType): Promise<DBAsset[]>;

  /**
   * Find an asset by content hash
   *
   * @param contentHash - SHA-256 content hash
   * @returns First asset with matching hash, or undefined
   */
  findByHash(contentHash: string): Promise<DBAsset | undefined>;

  /**
   * Get assets for a specific project
   *
   * @param projectId - Project ID
   * @returns Project assets
   */
  getByProject(projectId: string): Promise<DBAsset[]>;

  /**
   * Get all global assets
   *
   * @returns Global assets
   */
  getGlobal(): Promise<DBAsset[]>;

  /**
   * Get orphaned assets
   *
   * @returns Orphaned assets
   */
  getOrphaned(): Promise<DBAsset[]>;

  /**
   * Get assets linked to a specific character
   *
   * @param characterId - Character ID
   * @returns Assets linked to that character
   */
  getByCharacter(characterId: string): Promise<DBAsset[]>;

  // ---------------------------------------------------------------------------
  // Linking Operations
  // ---------------------------------------------------------------------------

  /**
   * Link an asset to a character
   */
  linkToCharacter(assetId: string, characterId: string): Promise<void>;

  /**
   * Unlink an asset from a character
   */
  unlinkFromCharacter(assetId: string, characterId: string): Promise<void>;

  /**
   * Replace all links for a character
   */
  replaceCharacterLink(
    characterId: string,
    newAssetId: string | null,
    assetType: AssetType
  ): Promise<void>;

  /**
   * Track asset usage when it's used in token generation
   */
  trackAssetUsage(assetId: string, projectId?: string): Promise<void>;

  // ---------------------------------------------------------------------------
  // Scope Operations
  // ---------------------------------------------------------------------------

  /**
   * Promote an asset to global scope
   */
  promoteToGlobal(id: string): Promise<void>;

  /**
   * Move an asset to a specific project
   */
  moveToProject(id: string, projectId: string): Promise<void>;

  /**
   * Promote multiple assets to global scope
   */
  bulkPromoteToGlobal(ids: string[]): Promise<void>;

  /**
   * Move multiple assets to a specific project
   */
  bulkMoveToProject(ids: string[], projectId: string): Promise<void>;

  // ---------------------------------------------------------------------------
  // URL Management
  // ---------------------------------------------------------------------------

  /**
   * Get an object URL for an asset's blob
   */
  getAssetUrl(id: string): Promise<string | null>;

  /**
   * Get an object URL with automatic cleanup tracking
   */
  getAssetUrlTracked(id: string, trackingObject: object): Promise<string | null>;

  /**
   * Get an object URL for an asset's thumbnail
   */
  getThumbnailUrl(id: string): Promise<string | null>;

  /**
   * Get a thumbnail URL with automatic cleanup tracking
   */
  getThumbnailUrlTracked(id: string, trackingObject: object): Promise<string | null>;

  /**
   * Release a URL
   */
  releaseUrl(id: string): void;

  /**
   * Force revoke and remove URL from cache
   */
  revokeUrl(id: string): void;

  /**
   * Revoke all cached URLs
   */
  revokeAllUrls(): void;

  /**
   * Get URL cache statistics
   */
  getUrlCacheStats(): { cachedUrls: number; estimatedSizeMB: number };

  /**
   * Clear the URL cache completely
   */
  clearUrlCache(): void;

  // ---------------------------------------------------------------------------
  // Export Helpers
  // ---------------------------------------------------------------------------

  /**
   * Get all assets for export
   */
  getExportableAssets(projectId: string): Promise<ExportableAsset[]>;

  /**
   * Stream exportable assets one at a time
   */
  streamExportableAssets(
    projectId: string,
    includeUnused?: boolean
  ): AsyncGenerator<ExportableAsset, void, undefined>;

  // ---------------------------------------------------------------------------
  // Statistics & Cleanup
  // ---------------------------------------------------------------------------

  /**
   * Get storage statistics for assets
   */
  getStats(filter?: AssetFilter): Promise<{
    count: number;
    totalSize: number;
    totalSizeMB: number;
    byType: Record<AssetType, { count: number; size: number }>;
  }>;

  /**
   * Delete all orphaned assets
   */
  cleanupOrphans(): Promise<number>;

  /**
   * Delete all assets for a project
   */
  deleteProjectAssets(projectId: string): Promise<void>;
}

// ============================================================================
// File Upload Service Interface
// ============================================================================

/**
 * Service for handling file uploads
 */
export interface IFileUploadService {
  /**
   * Upload one or more files
   *
   * @param files - File or array of files to upload
   * @param config - Upload configuration
   * @returns Array of upload results
   */
  upload(files: File | File[], config: UploadConfig): Promise<UploadOutcome[]>;

  /**
   * Upload from clipboard event
   *
   * @param event - Clipboard event
   * @param config - Upload configuration
   * @returns Upload result or null if no image in clipboard
   */
  uploadFromClipboard(event: ClipboardEvent, config: UploadConfig): Promise<UploadOutcome | null>;

  /**
   * Upload from a URL
   *
   * @param url - Image URL
   * @param config - Upload configuration
   * @returns Upload result
   */
  uploadFromUrl(url: string, config: UploadConfig): Promise<UploadOutcome>;

  /**
   * Upload from a Blob (e.g., from icon editor)
   *
   * @param blob - Blob to upload
   * @param filename - Filename to use
   * @param config - Upload configuration
   * @returns Upload result
   */
  uploadFromBlob(blob: Blob, filename: string, config: UploadConfig): Promise<UploadOutcome>;

  /**
   * Create a file input and trigger file selection
   *
   * @param config - Upload configuration
   * @param multiple - Allow multiple file selection
   * @returns Promise that resolves with upload results
   */
  openFilePicker(config: UploadConfig, multiple?: boolean): Promise<UploadOutcome[]>;

  /**
   * Get accept string for file input based on asset type
   *
   * @param assetType - Type of asset
   * @returns Accept string for file input
   */
  getAcceptString(assetType: AssetType): string;

  /**
   * Check if a file type is valid for an asset type
   *
   * @param file - File to check
   * @param assetType - Type of asset
   * @returns True if file type is valid
   */
  isValidFileType(file: File, assetType: AssetType): boolean;
}

// ============================================================================
// Asset Suggestion Service Interface
// ============================================================================

/**
 * Asset suggestion result
 */
export interface AssetSuggestion {
  assetId: string;
  asset: DBAsset;
  confidence: number;
  matchReason: 'exact-id' | 'similar-name' | 'same-project' | 'recently-used' | 'popular';
}

/**
 * Service for suggesting assets based on context
 */
export interface IAssetSuggestionService {
  /**
   * Get suggested assets for a character
   *
   * @param characterId - Character ID
   * @param characterName - Character name
   * @param projectId - Current project ID
   * @param assetType - Type of asset to suggest
   * @param limit - Maximum number of suggestions
   * @returns Sorted suggestions
   */
  getSuggestions(
    characterId: string,
    characterName: string,
    projectId: string | null,
    assetType: AssetType,
    limit?: number
  ): Promise<AssetSuggestion[]>;
}

// ============================================================================
// Asset Archive Service Interface
// ============================================================================

/**
 * Service for handling asset archiving and restoration
 */
export interface IAssetArchiveService {
  /**
   * Export all assets for a project to a ZIP file
   *
   * @param projectId - Project ID
   * @returns ZIP blob
   */
  exportProjectAssets(projectId: string): Promise<Blob>;

  /**
   * Import assets from a ZIP file
   *
   * @param zipBlob - ZIP blob
   * @param projectId - Target project ID
   * @returns Number of imported assets
   */
  importProjectAssets(zipBlob: Blob, projectId: string): Promise<number>;

  /**
   * Create a backup of all assets
   *
   * @returns ZIP blob containing all assets
   */
  createFullBackup(): Promise<Blob>;

  /**
   * Restore from a full backup
   *
   * @param zipBlob - ZIP blob containing backup
   * @returns Number of restored assets
   */
  restoreFromBackup(zipBlob: Blob): Promise<number>;
}

// ============================================================================
// Dependency Injection Types
// ============================================================================

/**
 * Dependencies for FileUploadService
 */
export interface FileUploadServiceDeps {
  fileValidationService: IFileValidationService;
  imageProcessingService: IImageProcessingService;
  assetStorageService: IAssetStorageService;
}

/**
 * Dependencies for AssetStorageService
 */
export interface AssetStorageServiceDeps {
  imageProcessingService: IImageProcessingService;
}
