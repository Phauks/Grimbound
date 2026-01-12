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

export {
  AssetArchiveService,
  assetArchiveService,
} from './AssetArchiveService.js';
export type { CreateAssetData } from './AssetStorageService.js';
export {
  AssetStorageService,
  assetStorageService,
} from './AssetStorageService.js';
export type {
  AssetSuggestion,
  SuggestionOptions,
} from './AssetSuggestionService.js';
export {
  AssetSuggestionService,
  assetSuggestionService,
} from './AssetSuggestionService.js';
// Asset Reference Resolver
export {
  ASSET_REF_PREFIX,
  clearResolvedUrlCache,
  createAssetReference,
  extractAssetId,
  getResolvedUrlSync,
  isAssetReference,
  preResolveAssets,
  resolveAssetUrl,
  resolveAssetUrls,
  resolveCharacterImage,
} from './assetResolver.js';
// Constants
export {
  DEFAULT_THUMBNAIL_SIZE,
  getConfigByTags,
  getConfigByType,
  getZipPathByTags,
  KB,
  MAGIC_BYTES,
  MB,
  PROCESSED_IMAGE_FORMAT,
  PROCESSED_IMAGE_QUALITY,
  TAG_TYPE_CONFIGS,
  TAG_TYPE_ICONS,
  TAG_TYPE_LABELS_PLURAL,
  TAG_ZIP_PATHS,
  THUMBNAIL_QUALITY,
  USER_TYPE_TABS,
} from './constants.js';
export {
  FileUploadService,
  fileUploadService,
} from './FileUploadService.js';
// Services
export {
  FileValidationService,
  fileValidationService,
} from './FileValidationService.js';
export type { ProcessingOptions } from './ImageProcessingService.js';
export {
  ImageProcessingService,
  imageProcessingService,
} from './ImageProcessingService.js';
// Types
export type {
  AssetFilter,
  AssetManagerOptions,
  AssetMetadata,
  AssetReference,
  AssetSourceType,
  AssetType,
  AssetTypeConfig,
  AssetWithUrl,
  DBAsset,
  ExportableAsset,
  ProcessedImage,
  UploadConfig,
  UploadError,
  UploadOutcome,
  UploadResult,
  UseFileUploadConfig,
  ValidationResult,
} from './types.js';
