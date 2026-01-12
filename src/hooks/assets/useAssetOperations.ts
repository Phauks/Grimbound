/**
 * useAssetOperations Hook
 *
 * Provides CRUD operations for assets: rename, download, duplicate, reclassify.
 * Encapsulates asset manipulation logic for the Asset Manager.
 *
 * @module hooks/assets/useAssetOperations
 */

import { useAssetStorageService } from '@/contexts/ServiceContext';
import type { AssetWithUrl } from '@/ts/services/upload/index.js';
import {
  getTypeFromTags,
  replaceTypeTag,
  type TypeTagValue,
} from '@/ts/services/upload/tagUtils.js';

// ============================================================================
// Types
// ============================================================================

export interface UseAssetOperationsOptions {
  /** Current list of assets (for finding asset by ID) */
  assets: AssetWithUrl[];
  /** Callback to refresh asset list after operations */
  refresh: () => Promise<void>;
}

export interface UseAssetOperationsReturn {
  /** Rename an asset */
  handleRename: (id: string) => Promise<void>;
  /** Download an asset */
  handleDownload: (id: string) => Promise<void>;
  /** Duplicate an asset */
  handleDuplicate: (id: string) => Promise<void>;
  /** Reclassify an asset to a different type */
  handleReclassify: (id: string, newType: TypeTagValue) => void;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for asset CRUD operations
 */
export function useAssetOperations(options: UseAssetOperationsOptions): UseAssetOperationsReturn {
  const { assets, refresh } = options;

  // Get service from DI context
  const assetStorageService = useAssetStorageService();

  // Handle rename
  const handleRename = async (id: string) => {
    const asset = assets.find((a) => a.id === id);
    if (!asset) return;

    const newName = window.prompt('Enter new name:', asset.metadata.filename);
    if (newName?.trim() && newName !== asset.metadata.filename) {
      await assetStorageService.update(id, {
        metadata: { ...asset.metadata, filename: newName.trim() },
      });
      await refresh();
    }
  };

  // Handle download
  const handleDownload = async (id: string) => {
    const asset = await assetStorageService.getById(id);
    if (!asset) return;

    const url = URL.createObjectURL(asset.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = asset.metadata.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle duplicate
  const handleDuplicate = async (id: string) => {
    const asset = await assetStorageService.getById(id);
    if (!asset) return;

    // Create a copy with a new name
    const nameParts = asset.metadata.filename.split('.');
    const ext = nameParts.length > 1 ? `.${nameParts.pop()}` : '';
    const baseName = nameParts.join('.');
    const newName = `${baseName} (copy)${ext}`;

    await assetStorageService.save({
      tags: asset.tags,
      folder: asset.folder,
      projectId: asset.projectId,
      blob: asset.blob,
      thumbnail: asset.thumbnail,
      metadata: { ...asset.metadata, filename: newName, uploadedAt: Date.now() },
      linkedTo: [],
    });
    await refresh();
  };

  // Handle reclassify (change asset type tag)
  const handleReclassify = (id: string, newType: TypeTagValue) => {
    // Find asset and update its type tag
    const doReclassify = async () => {
      const asset = await assetStorageService.getById(id);
      if (!asset) return;

      const currentType = getTypeFromTags(asset.tags);
      if (currentType === newType) return;

      const newTags = replaceTypeTag(asset.tags, newType);
      await assetStorageService.update(id, { tags: newTags });
      await refresh();
    };

    doReclassify();
  };

  return {
    handleRename,
    handleDownload,
    handleDuplicate,
    handleReclassify,
  };
}
