/**
 * File Upload Module
 *
 * Unified file upload and asset management system for the Clocktower Token Generator.
 *
 * @module services/upload
 *
 * @example
 * ```typescript
 * import {
 *   fileUploadService,
 *   assetStorageService,
 *   fileValidationService,
 *   imageProcessingService,
 * } from '@/services/upload';
 *
 * // Upload a file
 * const results = await fileUploadService.upload(file, {
 *   assetType: 'character-icon',
 *   projectId: 'project-123',
 *   characterId: 'char-456',
 * });
 *
 * // Get all assets
 * const assets = await assetStorageService.list({
 *   type: 'character-icon',
 *   projectId: 'project-123',
 * });
 *
 * // Get asset URL for display
 * const url = await assetStorageService.getAssetUrl(assetId);
 * ```
 */

// Types
export type {
  AssetType,
  AssetSourceType,
  AssetMetadata,
  DBAsset,
  AssetWithUrl,
  UploadConfig,
  AssetTypeConfig,
  ValidationResult,
  ProcessedImage,
  UploadResult,
  UploadError,
  UploadOutcome,
  AssetFilter,
  AssetManagerOptions,
  UseFileUploadConfig,
  ExportableAsset,
  AssetReference,
} from './types.js';

// Constants
export {
  KB,
  MB,
  MAGIC_BYTES,
  ASSET_TYPE_CONFIGS,
  DEFAULT_THUMBNAIL_SIZE,
  THUMBNAIL_QUALITY,
  PROCESSED_IMAGE_FORMAT,
  PROCESSED_IMAGE_QUALITY,
  ASSET_ZIP_PATHS,
  ASSET_TYPE_LABELS,
  ASSET_TYPE_LABELS_PLURAL,
  ASSET_TYPE_ICONS,
} from './constants.js';

// Services
export {
  FileValidationService,
  fileValidationService,
} from './FileValidationService.js';

export {
  ImageProcessingService,
  imageProcessingService,
} from './ImageProcessingService.js';

export type { ProcessingOptions } from './ImageProcessingService.js';

export {
  AssetStorageService,
  assetStorageService,
} from './AssetStorageService.js';

export type { CreateAssetData } from './AssetStorageService.js';

export {
  AssetSuggestionService,
  assetSuggestionService,
} from './AssetSuggestionService.js';

export type {
  AssetSuggestion,
  SuggestionOptions,
} from './AssetSuggestionService.js';

export {
  FileUploadService,
  fileUploadService,
} from './FileUploadService.js';

export {
  AssetArchiveService,
  assetArchiveService,
} from './AssetArchiveService.js';

// Asset Reference Resolver
export {
  ASSET_REF_PREFIX,
  isAssetReference,
  extractAssetId,
  createAssetReference,
  clearResolvedUrlCache,
  resolveAssetUrl,
  resolveAssetUrls,
  resolveCharacterImage,
  getResolvedUrlSync,
  preResolveAssets,
} from './assetResolver.js';
