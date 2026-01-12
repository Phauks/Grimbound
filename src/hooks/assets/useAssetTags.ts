/**
 * useAssetTags Hook
 *
 * React hook for managing asset tags - adding, removing, and batch operations.
 * Works with the tag-based categorization system (type:* tags).
 *
 * @module hooks/assets/useAssetTags
 *
 * @example
 * ```tsx
 * const {
 *   addTag,
 *   removeTag,
 *   reclassifyType,
 *   batchAddTag,
 *   batchRemoveTag,
 *   batchReclassifyType,
 * } = useAssetTags({ onUpdate: refreshAssets });
 * ```
 */

import { useState } from 'react';
import { useAssetStorageService } from '@/contexts/ServiceContext';
import {
  addTagToAll,
  analyzeSelectionTags,
  reclassifyTypeAll,
  removeTagFromAll,
} from '@/ts/services/upload/batchTagUtils.js';
import {
  addTag as addTagToAsset,
  hasTypeTag,
  removeTag as removeTagFromAsset,
  replaceTypeTag,
  type TypeTagValue,
} from '@/ts/services/upload/tagUtils.js';
import type { DBAsset } from '@/ts/services/upload/types.js';

// ============================================================================
// Types
// ============================================================================

export interface UseAssetTagsOptions {
  /** Callback when assets are updated */
  onUpdate?: () => Promise<void> | void;
}

export interface TagAnalysis {
  /** Tags common to ALL selected assets */
  common: string[];
  /** Tags present in SOME selected assets (tag → count) */
  partial: Map<string, number>;
  /** All unique tags across selection */
  all: string[];
  /** Type tag value if all have same type */
  commonType: TypeTagValue | null;
  /** Count of selected assets */
  count: number;
}

export interface UseAssetTagsReturn {
  // Single asset operations
  /** Add a tag to an asset */
  addTag: (assetId: string, tag: string) => Promise<void>;
  /** Remove a tag from an asset */
  removeTag: (assetId: string, tag: string) => Promise<void>;
  /** Change the type:* tag of an asset */
  reclassifyType: (assetId: string, newType: TypeTagValue) => Promise<void>;

  // Batch operations
  /** Add a tag to multiple assets */
  batchAddTag: (assetIds: string[], tag: string) => Promise<void>;
  /** Remove a tag from multiple assets */
  batchRemoveTag: (assetIds: string[], tag: string) => Promise<void>;
  /** Change the type:* tag of multiple assets */
  batchReclassifyType: (assetIds: string[], newType: TypeTagValue) => Promise<void>;

  // Analysis
  /** Analyze tags across a selection of assets */
  analyzeSelection: (assets: DBAsset[]) => TagAnalysis;

  // State
  isProcessing: boolean;
  error: string | null;
}

// ============================================================================
// Hook
// ============================================================================

export function useAssetTags(options: UseAssetTagsOptions = {}): UseAssetTagsReturn {
  const { onUpdate } = options;
  const assetStorageService = useAssetStorageService();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to wrap operations with loading state
  const withProcessing = async <T>(operation: () => Promise<T>): Promise<T> => {
    setIsProcessing(true);
    setError(null);
    try {
      const result = await operation();
      if (onUpdate) await onUpdate();
      return result;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  // Single asset: Add tag
  const addTag = async (assetId: string, tag: string) => {
    await withProcessing(async () => {
      const asset = await assetStorageService.getById(assetId);
      if (!asset) throw new Error(`Asset not found: ${assetId}`);

      const newTags = addTagToAsset(asset.tags, tag);
      await assetStorageService.update(assetId, { tags: newTags });
    });
  };

  // Single asset: Remove tag
  const removeTag = async (assetId: string, tag: string) => {
    await withProcessing(async () => {
      const asset = await assetStorageService.getById(assetId);
      if (!asset) throw new Error(`Asset not found: ${assetId}`);

      // Prevent removing type:* tag (use reclassifyType instead)
      if (tag.startsWith('type:')) {
        throw new Error('Cannot remove type:* tag. Use reclassifyType instead.');
      }

      const newTags = removeTagFromAsset(asset.tags, tag);
      await assetStorageService.update(assetId, { tags: newTags });
    });
  };

  // Single asset: Reclassify type
  const reclassifyTypeOp = async (assetId: string, newType: TypeTagValue) => {
    await withProcessing(async () => {
      const asset = await assetStorageService.getById(assetId);
      if (!asset) throw new Error(`Asset not found: ${assetId}`);

      if (!hasTypeTag(asset.tags)) {
        throw new Error('Asset has no type:* tag');
      }

      const newTags = replaceTypeTag(asset.tags, newType);
      await assetStorageService.update(assetId, { tags: newTags });
    });
  };

  // Batch: Add tag
  const batchAddTag = async (assetIds: string[], tag: string) => {
    await withProcessing(async () => {
      // Fetch all assets
      const assets = await Promise.all(
        assetIds.map(async (id) => {
          const asset = await assetStorageService.getById(id);
          if (!asset) throw new Error(`Asset not found: ${id}`);
          return asset;
        })
      );

      // Use utility to add tag to all
      const updatedAssets = addTagToAll(assets, tag);

      // Batch update
      await assetStorageService.bulkUpdate(
        updatedAssets.map((asset) => ({ id: asset.id, data: { tags: asset.tags } }))
      );
    });
  };

  // Batch: Remove tag
  const batchRemoveTag = async (assetIds: string[], tag: string) => {
    await withProcessing(async () => {
      // Prevent removing type:* tag
      if (tag.startsWith('type:')) {
        throw new Error('Cannot remove type:* tag. Use batchReclassifyType instead.');
      }

      // Fetch all assets
      const assets = await Promise.all(
        assetIds.map(async (id) => {
          const asset = await assetStorageService.getById(id);
          if (!asset) throw new Error(`Asset not found: ${id}`);
          return asset;
        })
      );

      // Use utility to remove tag from all
      const updatedAssets = removeTagFromAll(assets, tag);

      // Batch update
      await assetStorageService.bulkUpdate(
        updatedAssets.map((asset) => ({ id: asset.id, data: { tags: asset.tags } }))
      );
    });
  };

  // Batch: Reclassify type
  const batchReclassifyTypeOp = async (assetIds: string[], newType: TypeTagValue) => {
    await withProcessing(async () => {
      // Fetch all assets
      const assets = await Promise.all(
        assetIds.map(async (id) => {
          const asset = await assetStorageService.getById(id);
          if (!asset) throw new Error(`Asset not found: ${id}`);
          return asset;
        })
      );

      // Use utility to reclassify all
      const updatedAssets = reclassifyTypeAll(assets, newType);

      // Batch update
      await assetStorageService.bulkUpdate(
        updatedAssets.map((asset) => ({ id: asset.id, data: { tags: asset.tags } }))
      );
    });
  };

  // Analyze selection
  const analyzeSelection = (assets: DBAsset[]): TagAnalysis => {
    const baseAnalysis = analyzeSelectionTags(assets);

    // Find common type tag
    const typeTag = baseAnalysis.common.find((t) => t.startsWith('type:'));
    const commonType = typeTag ? (typeTag.substring(5) as TypeTagValue) : null;

    return {
      ...baseAnalysis,
      commonType,
      count: assets.length,
    };
  };

  return {
    // Single operations
    addTag,
    removeTag,
    reclassifyType: reclassifyTypeOp,

    // Batch operations
    batchAddTag,
    batchRemoveTag,
    batchReclassifyType: batchReclassifyTypeOp,

    // Analysis
    analyzeSelection,

    // State
    isProcessing,
    error,
  };
}
