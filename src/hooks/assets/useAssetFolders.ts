/**
 * useAssetFolders Hook
 *
 * React hook for managing asset folders - moving, organizing, and tree operations.
 *
 * @module hooks/assets/useAssetFolders
 *
 * @example
 * ```tsx
 * const {
 *   folderTree,
 *   moveToFolder,
 *   createFolder,
 *   renameFolder,
 *   deleteFolder,
 * } = useAssetFolders({ assets, onUpdate: refreshAssets });
 * ```
 */

import { useState } from 'react';
import { useAssetStorageService } from '@/contexts/ServiceContext';
import {
  deriveFolderTree,
  type FolderNode,
  getAllFolderPaths,
  getAssetsInFolder,
  getParentFolder,
  isSubfolderOf,
  joinPath,
  normalizePath,
} from '@/ts/services/upload/folderUtils.js';
import type { DBAsset } from '@/ts/services/upload/types.js';

// ============================================================================
// Types
// ============================================================================

export interface UseAssetFoldersOptions {
  /** Current assets to derive folder tree from */
  assets: DBAsset[];
  /** Callback when assets are updated */
  onUpdate?: () => Promise<void> | void;
}

export interface UseAssetFoldersReturn {
  // Folder tree
  /** Derived folder tree structure */
  folderTree: FolderNode[];
  /** All unique folder paths */
  allFolderPaths: string[];
  /** Get assets in a specific folder */
  getAssetsInFolder: (folderPath: string | null, includeSubfolders?: boolean) => DBAsset[];

  // Navigation
  /** Currently expanded folders */
  expandedFolders: Set<string>;
  /** Toggle folder expanded state */
  toggleFolder: (path: string) => void;
  /** Expand all folders */
  expandAll: () => void;
  /** Collapse all folders */
  collapseAll: () => void;

  // Asset operations
  /** Move an asset to a folder */
  moveToFolder: (assetId: string, folderPath: string | null) => Promise<void>;
  /** Move multiple assets to a folder */
  batchMoveToFolder: (assetIds: string[], folderPath: string | null) => Promise<void>;
  /** Remove asset from folder (move to root) */
  removeFromFolder: (assetId: string) => Promise<void>;

  // Folder operations
  /** Rename a folder (updates all assets in that folder) */
  renameFolder: (oldPath: string, newName: string) => Promise<void>;
  /** Delete a folder (move all assets to parent or root) */
  deleteFolder: (path: string, moveToParent?: boolean) => Promise<void>;

  // State
  isProcessing: boolean;
  error: string | null;
}

// ============================================================================
// Hook
// ============================================================================

export function useAssetFolders(options: UseAssetFoldersOptions): UseAssetFoldersReturn {
  const { assets, onUpdate } = options;
  const assetStorageService = useAssetStorageService();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

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

  // Derive folder tree from assets
  const folderTree = deriveFolderTree(assets);

  // Get all unique folder paths
  const allFolderPaths = getAllFolderPaths(assets);

  // Get assets in a folder
  const getAssetsInFolderCb = (folderPath: string | null, includeSubfolders = false): DBAsset[] =>
    getAssetsInFolder(assets, folderPath, includeSubfolders);

  // Toggle folder expanded state
  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  // Expand all folders
  const expandAll = () => {
    setExpandedFolders(new Set(allFolderPaths));
  };

  // Collapse all folders
  const collapseAll = () => {
    setExpandedFolders(new Set());
  };

  // Move asset to folder
  const moveToFolder = async (assetId: string, folderPath: string | null) => {
    await withProcessing(async () => {
      const normalizedPath = folderPath ? normalizePath(folderPath) : null;
      await assetStorageService.update(assetId, { folder: normalizedPath });
    });
  };

  // Batch move assets to folder
  const batchMoveToFolder = async (assetIds: string[], folderPath: string | null) => {
    await withProcessing(async () => {
      const normalizedPath = folderPath ? normalizePath(folderPath) : null;
      await assetStorageService.bulkUpdate(
        assetIds.map((id) => ({ id, data: { folder: normalizedPath } }))
      );
    });
  };

  // Remove from folder
  const removeFromFolder = async (assetId: string) => {
    await moveToFolder(assetId, null);
  };

  // Rename folder (updates all assets in that folder)
  const renameFolder = async (oldPath: string, newName: string) => {
    await withProcessing(async () => {
      const normalizedOld = normalizePath(oldPath);
      const parentPath = getParentFolder(normalizedOld);
      const newPath = parentPath ? joinPath(parentPath, newName) : newName;

      // Find all assets in the folder and subfolders
      const affectedAssets = assets.filter((asset) => {
        if (!asset.folder) return false;
        return asset.folder === normalizedOld || isSubfolderOf(asset.folder, normalizedOld);
      });

      if (affectedAssets.length === 0) return;

      // Update each asset's folder path
      const updates = affectedAssets.map((asset) => {
        let newFolder: string;
        if (asset.folder === normalizedOld) {
          // Direct member of folder
          newFolder = newPath;
        } else {
          // Subfolder - replace the old prefix with new prefix
          newFolder = newPath + asset.folder?.substring(normalizedOld.length);
        }
        return { id: asset.id, data: { folder: newFolder } };
      });

      await assetStorageService.bulkUpdate(updates);
    });
  };

  // Delete folder (move assets to parent or root)
  const deleteFolder = async (path: string, moveToParent = true) => {
    await withProcessing(async () => {
      const normalizedPath = normalizePath(path);
      const parentPath = moveToParent ? getParentFolder(normalizedPath) : null;

      // Find all assets in this folder (not subfolders)
      const directAssets = assets.filter((asset) => asset.folder === normalizedPath);

      if (directAssets.length === 0) return;

      // Move them to parent or root
      await assetStorageService.bulkUpdate(
        directAssets.map((asset) => ({ id: asset.id, data: { folder: parentPath } }))
      );
    });
  };

  return {
    // Folder tree
    folderTree,
    allFolderPaths,
    getAssetsInFolder: getAssetsInFolderCb,

    // Navigation
    expandedFolders,
    toggleFolder,
    expandAll,
    collapseAll,

    // Asset operations
    moveToFolder,
    batchMoveToFolder,
    removeFromFolder,

    // Folder operations
    renameFolder,
    deleteFolder,

    // State
    isProcessing,
    error,
  };
}
