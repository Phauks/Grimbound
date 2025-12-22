/**
 * useAssetOperations Hook
 *
 * Provides CRUD operations for assets: rename, download, duplicate, reclassify.
 * Encapsulates asset manipulation logic for the Asset Manager.
 *
 * @module hooks/assets/useAssetOperations
 */

import { useCallback } from 'react';
import { useAssetStorageService } from '@/contexts/ServiceContext';
import type { AssetType, AssetWithUrl } from '@/ts/services/upload/index.js';

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
  handleReclassify: (id: string, newType: AssetType) => Promise<void>;
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
  const handleRename = useCallback(
    async (id: string) => {
      const asset = assets.find((a) => a.id === id);
      if (!asset) return;

      const newName = window.prompt('Enter new name:', asset.metadata.filename);
      if (newName?.trim() && newName !== asset.metadata.filename) {
        await assetStorageService.update(id, {
          metadata: { ...asset.metadata, filename: newName.trim() },
        });
        await refresh();
      }
    },
    [assetStorageService, assets, refresh]
  );

  // Handle download
  const handleDownload = useCallback(
    async (id: string) => {
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
    },
    [assetStorageService]
  );

  // Handle duplicate
  const handleDuplicate = useCallback(
    async (id: string) => {
      const asset = await assetStorageService.getById(id);
      if (!asset) return;

      // Create a copy with a new name
      const nameParts = asset.metadata.filename.split('.');
      const ext = nameParts.length > 1 ? `.${nameParts.pop()}` : '';
      const baseName = nameParts.join('.');
      const newName = `${baseName} (copy)${ext}`;

      await assetStorageService.save({
        type: asset.type,
        projectId: asset.projectId,
        blob: asset.blob,
        thumbnail: asset.thumbnail,
        metadata: { ...asset.metadata, filename: newName, uploadedAt: Date.now() },
        linkedTo: [],
      });
      await refresh();
    },
    [assetStorageService, refresh]
  );

  // Handle reclassify (change asset type)
  const handleReclassify = useCallback(
    async (id: string, newType: AssetType) => {
      const asset = await assetStorageService.getById(id);
      if (!asset || asset.type === newType) return;

      await assetStorageService.update(id, { type: newType });
      await refresh();
    },
    [assetStorageService, refresh]
  );

  return {
    handleRename,
    handleDownload,
    handleDuplicate,
    handleReclassify,
  };
}

export default useAssetOperations;
