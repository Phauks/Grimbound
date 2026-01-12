/**
 * useAssetManager Hook
 *
 * React hook for managing assets with filtering, selection,
 * and bulk operations.
 *
 * @module hooks/assets/useAssetManager
 *
 * @example
 * ```tsx
 * const {
 *   assets,
 *   isLoading,
 *   filter,
 *   setFilter,
 *   selectedIds,
 *   toggleSelect,
 *   deleteSelected,
 *   stats,
 * } = useAssetManager({
 *   currentProjectId: projectId,
 *   initialFilter: { type: 'character-icon' },
 * });
 * ```
 */

import { useCallback, useEffect, useState } from 'react';
import { useAssetStorageService } from '@/contexts/ServiceContext';
import type {
  AssetFilter,
  AssetManagerOptions,
  AssetWithUrl,
} from '@/ts/services/upload/index.js';
import type { TypeTagValue } from '@/ts/services/upload/tagUtils.js';
import { useSelection } from '../ui/useSelection.js';

// ============================================================================
// Types
// ============================================================================

export interface AssetStats {
  count: number;
  totalSize: number;
  totalSizeMB: number;
  byType: Record<TypeTagValue | string, { count: number; size: number }>;
}

export interface UseAssetManagerReturn {
  // State
  assets: AssetWithUrl[];
  allFolders: string[];
  isLoading: boolean;
  error: string | null;

  // Filter
  filter: AssetFilter;
  setFilter: (filter: Partial<AssetFilter>) => void;
  resetFilter: () => void;

  // Pagination
  totalCount: number;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  isLoadingMore: boolean;

  // Selection (from useSelection)
  selectedIds: Set<string>;
  selectedCount: number;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;

  // Stats
  stats: AssetStats | null;
  orphanedCount: number;

  // Actions
  deleteAsset: (id: string) => Promise<void>;
  deleteSelected: () => Promise<void>;
  promoteToGlobal: (id: string) => Promise<void>;
  promoteSelectedToGlobal: () => Promise<void>;
  moveToProject: (id: string, projectId: string) => Promise<void>;
  moveSelectedToProject: (projectId: string) => Promise<void>;
  cleanupOrphans: () => Promise<number>;
  refresh: () => Promise<void>;

  // Star operations
  toggleStar: (id: string) => Promise<void>;
  toggleStarSelected: () => Promise<void>;

  // Folder operations
  moveToFolder: (id: string, folder: string | null) => Promise<void>;
  moveSelectedToFolder: (folder: string | null) => Promise<void>;

  // Tag operations
  addTag: (id: string, tag: string) => Promise<void>;
  removeTag: (id: string, tag: string) => Promise<void>;
  addTagToSelected: (tag: string) => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

const DEFAULT_FILTER: AssetFilter = {
  sortBy: 'uploadedAt',
  sortDirection: 'desc',
};

/**
 * Hook for managing assets
 */
export function useAssetManager(options: AssetManagerOptions = {}): UseAssetManagerReturn {
  // Get service from DI context
  const assetStorageService = useAssetStorageService();

  // State
  const [assets, setAssets] = useState<AssetWithUrl[]>([]);
  const [allFolders, setAllFolders] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilterState] = useState<AssetFilter>({
    ...DEFAULT_FILTER,
    ...options.initialFilter,
  });
  const [stats, setStats] = useState<AssetStats | null>(null);
  const [orphanedCount, setOrphanedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Use extracted selection hook
  const { selectedIds, selectedCount, toggleSelect, clearSelection, isSelected, setSelection } =
    useSelection();

  // Select all assets currently loaded
  const selectAll = () => {
    setSelection(assets.map((a) => a.id));
  };

  // Fetch assets
  const fetchAssets = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Apply project context if set
      const effectiveFilter = { ...filter };
      if (options.currentProjectId && effectiveFilter.projectId === undefined) {
        effectiveFilter.projectId = options.currentProjectId;
      }

      const fetchedAssets = await assetStorageService.listWithUrls(effectiveFilter);
      setAssets(fetchedAssets);

      // Fetch total count (for pagination)
      const count = await assetStorageService.count(effectiveFilter);
      setTotalCount(count);

      // Fetch stats
      const fetchedStats = await assetStorageService.getStats(effectiveFilter);
      setStats(fetchedStats);

      // Fetch orphaned count
      const orphaned = await assetStorageService.getOrphaned();
      setOrphanedCount(orphaned.length);

      // Fetch all folders (completely unfiltered) for navigation
      // This ensures folder structure is always visible regardless of type/tag/search filters
      const folderFilter: AssetFilter = {
        projectId: effectiveFilter.projectId,
        sortBy: 'uploadedAt',
        sortDirection: 'desc',
      };
      const allAssetsForFolders = await assetStorageService.listWithUrls(folderFilter);
      const folderSet = new Set<string>();
      for (const asset of allAssetsForFolders) {
        if (asset.folder) {
          folderSet.add(asset.folder);
        }
      }
      setAllFolders(Array.from(folderSet).sort());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [assetStorageService, filter, options.currentProjectId]);

  // Load more assets (for infinite scroll)
  const loadMore = async () => {
    if (isLoadingMore || !filter.limit) return;

    setIsLoadingMore(true);
    setError(null);

    try {
      const effectiveFilter = { ...filter };
      if (options.currentProjectId && effectiveFilter.projectId === undefined) {
        effectiveFilter.projectId = options.currentProjectId;
      }

      // Increment offset by current limit
      const nextOffset = (filter.offset ?? 0) + filter.limit;
      effectiveFilter.offset = nextOffset;

      const moreAssets = await assetStorageService.listWithUrls(effectiveFilter);
      setAssets((prev) => [...prev, ...moreAssets]);

      // Update filter offset for next load
      setFilterState((prev) => ({ ...prev, offset: nextOffset }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Auto-refresh
  useEffect(() => {
    if (options.autoRefreshInterval && options.autoRefreshInterval > 0) {
      const interval = setInterval(fetchAssets, options.autoRefreshInterval);
      return () => clearInterval(interval);
    }
  }, [options.autoRefreshInterval, fetchAssets]);

  // Cleanup URLs on unmount
  useEffect(
    () => () => {
      assetStorageService.revokeAllUrls();
    },
    [assetStorageService]
  );

  // Filter methods
  const setFilter = (updates: Partial<AssetFilter>) => {
    setFilterState((prev) => ({ ...prev, ...updates }));
    clearSelection(); // Clear selection on filter change
  };

  const resetFilter = () => {
    setFilterState({ ...DEFAULT_FILTER, ...options.initialFilter });
    clearSelection();
  };

  // Action methods
  const deleteAsset = async (id: string) => {
    try {
      await assetStorageService.delete(id);
      await fetchAssets();
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;

    try {
      await assetStorageService.bulkDelete(Array.from(selectedIds));
      clearSelection();
      await fetchAssets();
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  const promoteToGlobal = async (id: string) => {
    try {
      await assetStorageService.promoteToGlobal(id);
      await fetchAssets();
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  const moveToProject = async (id: string, projectId: string) => {
    try {
      await assetStorageService.moveToProject(id, projectId);
      await fetchAssets();
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  const promoteSelectedToGlobal = async () => {
    if (selectedIds.size === 0) return;

    try {
      await assetStorageService.bulkPromoteToGlobal(Array.from(selectedIds));
      clearSelection();
      await fetchAssets();
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  const moveSelectedToProject = async (projectId: string) => {
    if (selectedIds.size === 0) return;

    try {
      await assetStorageService.bulkMoveToProject(Array.from(selectedIds), projectId);
      clearSelection();
      await fetchAssets();
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  const cleanupOrphans = async () => {
    try {
      const count = await assetStorageService.cleanupOrphans();
      await fetchAssets();
      return count;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  const refresh = async () => {
    await fetchAssets();
  };

  // Star operations - with optimistic updates
  const toggleStar = async (id: string) => {
    const asset = assets.find((a) => a.id === id);
    if (!asset) return;

    const isStarred = asset.tags.includes('starred');
    const newTags = isStarred
      ? asset.tags.filter((t) => t !== 'starred')
      : [...asset.tags, 'starred'];

    // Optimistic update - update local state immediately
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, tags: newTags } : a)));

    try {
      await assetStorageService.update(id, { tags: newTags });
      // No fetchAssets() - we already updated locally
    } catch (err) {
      // Rollback on error
      setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, tags: asset.tags } : a)));
      setError((err as Error).message);
      throw err;
    }
  };

  const toggleStarSelected = async () => {
    if (selectedIds.size === 0) return;

    // Check if all selected are starred - if so, unstar all; otherwise star all
    const selectedAssets = assets.filter((a) => selectedIds.has(a.id));
    const allStarred = selectedAssets.every((a) => a.tags.includes('starred'));

    // Build updates map for optimistic update
    const updatesMap = new Map<string, string[]>();
    const updates = selectedAssets.map((asset) => {
      const newTags = allStarred
        ? asset.tags.filter((t) => t !== 'starred')
        : asset.tags.includes('starred')
          ? asset.tags
          : [...asset.tags, 'starred'];
      updatesMap.set(asset.id, newTags);
      return { id: asset.id, data: { tags: newTags } };
    });

    // Optimistic update
    setAssets((prev) =>
      prev.map((a) => {
        const newTags = updatesMap.get(a.id);
        return newTags ? { ...a, tags: newTags } : a;
      })
    );

    try {
      await assetStorageService.bulkUpdate(updates);
    } catch (err) {
      // Rollback on error
      await fetchAssets();
      setError((err as Error).message);
      throw err;
    }
  };

  // Folder operations - with optimistic updates
  const moveToFolder = async (id: string, folder: string | null) => {
    const asset = assets.find((a) => a.id === id);
    if (!asset) return;

    const oldFolder = asset.folder;

    // Optimistic update - update local state immediately
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, folder } : a)));

    try {
      await assetStorageService.update(id, { folder });
      // No fetchAssets() - we already updated locally
    } catch (err) {
      // Rollback on error
      setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, folder: oldFolder } : a)));
      setError((err as Error).message);
      throw err;
    }
  };

  const moveSelectedToFolder = async (folder: string | null) => {
    if (selectedIds.size === 0) return;

    const updates = Array.from(selectedIds).map((id) => ({
      id,
      data: { folder },
    }));

    try {
      await assetStorageService.bulkUpdate(updates);
      clearSelection();
      await fetchAssets();
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  };

  // Tag operations - with optimistic updates
  const addTag = async (id: string, tag: string) => {
    const asset = assets.find((a) => a.id === id);
    if (!asset || asset.tags.includes(tag)) return;

    const newTags = [...asset.tags, tag];

    // Optimistic update
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, tags: newTags } : a)));

    try {
      await assetStorageService.update(id, { tags: newTags });
    } catch (err) {
      // Rollback on error
      setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, tags: asset.tags } : a)));
      setError((err as Error).message);
      throw err;
    }
  };

  const removeTag = async (id: string, tag: string) => {
    const asset = assets.find((a) => a.id === id);
    if (!asset) return;

    const newTags = asset.tags.filter((t) => t !== tag);

    // Optimistic update
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, tags: newTags } : a)));

    try {
      await assetStorageService.update(id, { tags: newTags });
    } catch (err) {
      // Rollback on error
      setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, tags: asset.tags } : a)));
      setError((err as Error).message);
      throw err;
    }
  };

  const addTagToSelected = async (tag: string) => {
    if (selectedIds.size === 0) return;

    const selectedAssets = assets.filter((a) => selectedIds.has(a.id));
    const updatesMap = new Map<string, string[]>();
    const updates = selectedAssets
      .filter((asset) => !asset.tags.includes(tag))
      .map((asset) => {
        const newTags = [...asset.tags, tag];
        updatesMap.set(asset.id, newTags);
        return { id: asset.id, data: { tags: newTags } };
      });

    if (updates.length === 0) return;

    // Optimistic update
    setAssets((prev) =>
      prev.map((a) => {
        const newTags = updatesMap.get(a.id);
        return newTags ? { ...a, tags: newTags } : a;
      })
    );

    try {
      await assetStorageService.bulkUpdate(updates);
    } catch (err) {
      // Rollback on error
      await fetchAssets();
      setError((err as Error).message);
      throw err;
    }
  };

  // Compute hasMore for pagination
  const hasMore = assets.length < totalCount;

  return {
    // State
    assets,
    allFolders,
    isLoading,
    error,

    // Filter
    filter,
    setFilter,
    resetFilter,

    // Pagination
    totalCount,
    hasMore,
    loadMore,
    isLoadingMore,

    // Selection
    selectedIds,
    selectedCount,
    toggleSelect,
    selectAll,
    clearSelection,
    isSelected,

    // Stats
    stats,
    orphanedCount,

    // Actions
    deleteAsset,
    deleteSelected,
    promoteToGlobal,
    promoteSelectedToGlobal,
    moveToProject,
    moveSelectedToProject,
    cleanupOrphans,
    refresh,

    // Star operations
    toggleStar,
    toggleStarSelected,

    // Folder operations
    moveToFolder,
    moveSelectedToFolder,

    // Tag operations
    addTag,
    removeTag,
    addTagToSelected,
  };
}
