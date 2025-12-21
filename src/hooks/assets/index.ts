/**
 * Assets Hooks Module
 *
 * Collection of React hooks for managing assets, file uploads,
 * and built-in asset integration.
 *
 * @module hooks/assets
 */

// ============================================================================
// Asset Management
// ============================================================================

export {
  useAssetManager,
  type AssetStats,
  type UseAssetManagerReturn,
} from './useAssetManager.js';

// ============================================================================
// Built-In Assets
// ============================================================================

export {
  useBuiltInAssets,
  type UseBuiltInAssetsOptions,
  type MergedAsset,
  type UseBuiltInAssetsReturn,
} from './useBuiltInAssets.js';

// ============================================================================
// File Upload
// ============================================================================

export {
  useFileUpload,
  type UseFileUploadReturn,
} from './useFileUpload.js';
