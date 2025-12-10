/**
 * File Upload Module - Type Definitions
 *
 * Core types for the unified file upload and asset management system.
 *
 * @module services/upload/types
 */

// ============================================================================
// Asset Types
// ============================================================================

/**
 * Types of assets that can be uploaded and managed
 */
export type AssetType =
  | 'character-icon'
  | 'token-background'
  | 'script-background'
  | 'setup-flower'
  | 'leaf'
  | 'logo';

/**
 * Source of how an asset was added to the system
 */
export type AssetSourceType = 'upload' | 'paste' | 'url' | 'editor';

// ============================================================================
// Asset Metadata
// ============================================================================

/**
 * Metadata stored with each asset
 */
export interface AssetMetadata {
  /** Original filename */
  filename: string;
  /** MIME type (e.g., 'image/png') */
  mimeType: string;
  /** File size in bytes */
  size: number;
  /** Image width in pixels */
  width: number;
  /** Image height in pixels */
  height: number;
  /** Timestamp when uploaded */
  uploadedAt: number;
  /** Timestamp when last edited (for future icon editor) */
  editedAt?: number;
  /** How the asset was added */
  sourceType: AssetSourceType;
}

/**
 * Asset stored in IndexedDB
 */
export interface DBAsset {
  /** Unique identifier (UUID) */
  id: string;
  /** Type of asset */
  type: AssetType;
  /** Project ID (null = global library) */
  projectId: string | null;
  /** Primary image data as Blob */
  blob: Blob;
  /** Thumbnail preview (128x128) as Blob */
  thumbnail: Blob;
  /** Asset metadata */
  metadata: AssetMetadata;
  /** Character IDs that use this asset */
  linkedTo: string[];
}

/**
 * Asset with object URL for display (runtime only, not stored)
 */
export interface AssetWithUrl extends DBAsset {
  /** Object URL for the main blob */
  url: string;
  /** Object URL for the thumbnail */
  thumbnailUrl: string;
}

// ============================================================================
// Upload Configuration
// ============================================================================

/**
 * Configuration for file upload operations
 */
export interface UploadConfig {
  /** Type of asset being uploaded */
  assetType: AssetType;
  /** Project ID to associate with (null for global) */
  projectId?: string | null;
  /** Character ID to link to (optional) */
  characterId?: string;
  /** Progress callback (0-100) */
  onProgress?: (progress: number) => void;
  /** Skip image processing (use original) */
  skipProcessing?: boolean;
}

/**
 * Validation configuration per asset type
 */
export interface AssetTypeConfig {
  /** Allowed MIME types */
  allowedMimeTypes: string[];
  /** Allowed file extensions (for display) */
  allowedExtensions: string[];
  /** Maximum file size in bytes */
  maxSize: number;
  /** Minimum width in pixels (optional) */
  minWidth?: number;
  /** Maximum width in pixels (optional) */
  maxWidth?: number;
  /** Minimum height in pixels (optional) */
  minHeight?: number;
  /** Maximum height in pixels (optional) */
  maxHeight?: number;
  /** Require square aspect ratio */
  requireSquare?: boolean;
  /** Require transparency support */
  requireTransparency?: boolean;
  /** Target width for resizing (optional) */
  targetWidth?: number;
  /** Target height for resizing (optional) */
  targetHeight?: number;
  /** Thumbnail size (default 128) */
  thumbnailSize?: number;
}

// ============================================================================
// Validation Results
// ============================================================================

/**
 * Result of file validation
 */
export interface ValidationResult {
  /** Whether the file is valid */
  valid: boolean;
  /** Error messages (if invalid) */
  errors: string[];
  /** Warning messages (valid but with concerns) */
  warnings: string[];
  /** Detected MIME type */
  detectedMimeType?: string;
  /** Image dimensions (if applicable) */
  dimensions?: {
    width: number;
    height: number;
  };
}

// ============================================================================
// Processing Results
// ============================================================================

/**
 * Result of image processing
 */
export interface ProcessedImage {
  /** Processed image blob */
  blob: Blob;
  /** Generated thumbnail blob */
  thumbnail: Blob;
  /** Image metadata */
  metadata: Omit<AssetMetadata, 'uploadedAt' | 'sourceType'>;
}

/**
 * Result of a successful upload
 */
export interface UploadResult {
  /** Whether upload succeeded */
  success: true;
  /** Created asset ID */
  assetId: string;
  /** Created asset data */
  asset: DBAsset;
}

/**
 * Result of a failed upload
 */
export interface UploadError {
  /** Whether upload succeeded */
  success: false;
  /** Original filename */
  filename: string;
  /** Error message */
  error: string;
  /** Validation result (if validation failed) */
  validation?: ValidationResult;
}

/**
 * Combined upload result type
 */
export type UploadOutcome = UploadResult | UploadError;

// ============================================================================
// Asset Manager Types
// ============================================================================

/**
 * Filter options for asset queries
 */
export interface AssetFilter {
  /** Filter by asset type */
  type?: AssetType | AssetType[];
  /** Filter by project scope */
  projectId?: string | null | 'all';
  /** Search by filename */
  search?: string;
  /** Filter orphaned assets only */
  orphanedOnly?: boolean;
  /** Sort field */
  sortBy?: 'uploadedAt' | 'filename' | 'size' | 'type';
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
}

/**
 * Options for the useAssetManager hook
 */
export interface AssetManagerOptions {
  /** Initial filter */
  initialFilter?: AssetFilter;
  /** Current project ID (for context) */
  currentProjectId?: string;
  /** Auto-refresh interval in ms (0 = disabled) */
  autoRefreshInterval?: number;
}

/**
 * Options for the useFileUpload hook
 */
export interface UseFileUploadConfig {
  /** Asset type for uploads */
  assetType: AssetType;
  /** Project ID to associate with */
  projectId?: string | null;
  /** Character ID to link to */
  characterId?: string;
  /** Allow multiple file selection */
  multiple?: boolean;
  /** Callback when upload completes */
  onComplete?: (results: UploadOutcome[]) => void;
  /** Callback when upload fails */
  onError?: (error: string) => void;
}

// ============================================================================
// Export Helpers
// ============================================================================

/**
 * Asset prepared for ZIP export (with extracted data)
 */
export interface ExportableAsset {
  /** Original asset ID */
  id: string;
  /** Asset type */
  type: AssetType;
  /** Filename for ZIP */
  filename: string;
  /** Blob data */
  blob: Blob;
  /** Metadata */
  metadata: AssetMetadata;
}

/**
 * Asset reference in exported project.json
 */
export interface AssetReference {
  /** Asset ID */
  id: string;
  /** Type of asset */
  type: AssetType;
  /** Path in ZIP file */
  zipPath: string;
  /** Original filename */
  filename: string;
  /** Linked character IDs */
  linkedTo: string[];
}
