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
  type AssetStats,
  type UseAssetManagerReturn,
  useAssetManager,
} from './useAssetManager.js';

// ============================================================================
// Built-In Assets
// ============================================================================

export {
  type MergedAsset,
  type UseBuiltInAssetsOptions,
  type UseBuiltInAssetsReturn,
  useBuiltInAssets,
} from './useBuiltInAssets.js';

// ============================================================================
// File Upload
// ============================================================================

export {
  type UseFileUploadReturn,
  useFileUpload,
} from './useFileUpload.js';

// ============================================================================
// Asset Preview
// ============================================================================

export {
  type AssetPreviewState,
  type AssetSource,
  type UseAssetPreviewOptions,
  useAssetPreview,
} from '../useAssetPreview.js';

// ============================================================================
// Asset Preview Generator (for Asset Manager token preview)
// ============================================================================

export {
  type PreviewTokenType,
  type UseAssetPreviewGeneratorOptions,
  type UseAssetPreviewGeneratorReturn,
  useAssetPreviewGenerator,
} from './useAssetPreviewGenerator.js';

// ============================================================================
// Asset Selection (for Asset Manager selection mode)
// ============================================================================

export {
  type BuiltInAsset,
  type UseAssetSelectionOptions,
  type UseAssetSelectionReturn,
  useAssetSelection,
} from './useAssetSelection.js';

// ============================================================================
// Asset Operations (CRUD for Asset Manager)
// ============================================================================

export {
  type UseAssetOperationsOptions,
  type UseAssetOperationsReturn,
  useAssetOperations,
} from './useAssetOperations.js';
