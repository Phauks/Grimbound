/**
 * Unit tests for useAssetManager hook
 *
 * Tests cover:
 * - Hook initialization and state
 * - Filter operations
 * - Selection operations
 * - Asset operations (delete, promote, move)
 * - Bulk operations
 * - Pagination
 * - Error handling
 * - Cleanup on unmount
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as ServiceContextModule from '@/contexts/ServiceContext';
import { useAssetManager } from '@/hooks/assets/useAssetManager';
import type { AssetWithUrl } from '@/ts/services/upload/index.js';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@/contexts/ServiceContext');

// ============================================================================
// Test Helpers
// ============================================================================

const createMockAsset = (overrides: Partial<AssetWithUrl> = {}): AssetWithUrl => ({
  id: `asset-${Math.random().toString(36).substr(2, 9)}`,
  filename: 'test-asset.png',
  type: 'character-icon',
  mimeType: 'image/png',
  size: 1024,
  hash: 'abc123',
  uploadedAt: Date.now(),
  url: 'blob:mock-url',
  ...overrides,
});

const createMockStats = () => ({
  count: 5,
  totalSize: 5120,
  totalSizeMB: 0.005,
  byType: {
    'character-icon': { count: 3, size: 3072 },
    background: { count: 2, size: 2048 },
    decorative: { count: 0, size: 0 },
    'setup-overlay': { count: 0, size: 0 },
  },
});

const createMockAssetStorageService = (overrides = {}) => ({
  listWithUrls: vi.fn().mockResolvedValue([]),
  count: vi.fn().mockResolvedValue(0),
  getStats: vi.fn().mockResolvedValue(createMockStats()),
  getOrphaned: vi.fn().mockResolvedValue([]),
  delete: vi.fn().mockResolvedValue(undefined),
  bulkDelete: vi.fn().mockResolvedValue(undefined),
  promoteToGlobal: vi.fn().mockResolvedValue(undefined),
  bulkPromoteToGlobal: vi.fn().mockResolvedValue(undefined),
  moveToProject: vi.fn().mockResolvedValue(undefined),
  bulkMoveToProject: vi.fn().mockResolvedValue(undefined),
  cleanupOrphans: vi.fn().mockResolvedValue(0),
  revokeAllUrls: vi.fn(),
  ...overrides,
});

// ============================================================================
// Tests
// ============================================================================

describe('useAssetManager', () => {
  let mockAssetStorageService: ReturnType<typeof createMockAssetStorageService>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAssetStorageService = createMockAssetStorageService();
    vi.spyOn(ServiceContextModule, 'useAssetStorageService').mockReturnValue(
      mockAssetStorageService as ReturnType<typeof ServiceContextModule.useAssetStorageService>
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // Hook Initialization
  // --------------------------------------------------------------------------

  describe('Hook Initialization', () => {
    it('should return expected state and functions', async () => {
      const { result } = renderHook(() => useAssetManager());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // State
      expect(result.current).toHaveProperty('assets');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('error');

      // Filter
      expect(result.current).toHaveProperty('filter');
      expect(result.current).toHaveProperty('setFilter');
      expect(result.current).toHaveProperty('resetFilter');

      // Pagination
      expect(result.current).toHaveProperty('totalCount');
      expect(result.current).toHaveProperty('hasMore');
      expect(result.current).toHaveProperty('loadMore');
      expect(result.current).toHaveProperty('isLoadingMore');

      // Selection
      expect(result.current).toHaveProperty('selectedIds');
      expect(result.current).toHaveProperty('selectedCount');
      expect(result.current).toHaveProperty('toggleSelect');
      expect(result.current).toHaveProperty('selectAll');
      expect(result.current).toHaveProperty('clearSelection');
      expect(result.current).toHaveProperty('isSelected');

      // Stats
      expect(result.current).toHaveProperty('stats');
      expect(result.current).toHaveProperty('orphanedCount');

      // Actions
      expect(result.current).toHaveProperty('deleteAsset');
      expect(result.current).toHaveProperty('deleteSelected');
      expect(result.current).toHaveProperty('promoteToGlobal');
      expect(result.current).toHaveProperty('promoteSelectedToGlobal');
      expect(result.current).toHaveProperty('moveToProject');
      expect(result.current).toHaveProperty('moveSelectedToProject');
      expect(result.current).toHaveProperty('cleanupOrphans');
      expect(result.current).toHaveProperty('refresh');
    });

    it('should fetch assets on mount', async () => {
      renderHook(() => useAssetManager());

      await waitFor(() => {
        expect(mockAssetStorageService.listWithUrls).toHaveBeenCalled();
      });
    });

    it('should apply initial filter', async () => {
      renderHook(() =>
        useAssetManager({
          initialFilter: { type: 'character-icon' },
        })
      );

      await waitFor(() => {
        expect(mockAssetStorageService.listWithUrls).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'character-icon',
          })
        );
      });
    });

    it('should apply currentProjectId filter', async () => {
      renderHook(() =>
        useAssetManager({
          currentProjectId: 'project-123',
        })
      );

      await waitFor(() => {
        expect(mockAssetStorageService.listWithUrls).toHaveBeenCalledWith(
          expect.objectContaining({
            projectId: 'project-123',
          })
        );
      });
    });
  });

  // --------------------------------------------------------------------------
  // Asset Loading
  // --------------------------------------------------------------------------

  describe('Asset Loading', () => {
    it('should set assets after fetch', async () => {
      const assets = [createMockAsset(), createMockAsset()];
      mockAssetStorageService.listWithUrls.mockResolvedValue(assets);
      mockAssetStorageService.count.mockResolvedValue(2);

      const { result } = renderHook(() => useAssetManager());

      await waitFor(() => {
        expect(result.current.assets).toEqual(assets);
      });
    });

    it('should set loading state during fetch', async () => {
      const { result } = renderHook(() => useAssetManager());

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should set error on fetch failure', async () => {
      mockAssetStorageService.listWithUrls.mockRejectedValue(new Error('Fetch failed'));

      const { result } = renderHook(() => useAssetManager());

      await waitFor(() => {
        expect(result.current.error).toBe('Fetch failed');
      });
    });

    it('should set stats after fetch', async () => {
      const stats = createMockStats();
      mockAssetStorageService.getStats.mockResolvedValue(stats);

      const { result } = renderHook(() => useAssetManager());

      await waitFor(() => {
        expect(result.current.stats).toEqual(stats);
      });
    });

    it('should set orphanedCount after fetch', async () => {
      mockAssetStorageService.getOrphaned.mockResolvedValue(['orphan-1', 'orphan-2']);

      const { result } = renderHook(() => useAssetManager());

      await waitFor(() => {
        expect(result.current.orphanedCount).toBe(2);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Filter Operations
  // --------------------------------------------------------------------------

  describe('Filter Operations', () => {
    it('should update filter with setFilter', async () => {
      const { result } = renderHook(() => useAssetManager());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        result.current.setFilter({ type: 'background' });
      });

      expect(result.current.filter.type).toBe('background');
    });

    it('should clear selection on filter change', async () => {
      const assets = [createMockAsset({ id: 'asset-1' }), createMockAsset({ id: 'asset-2' })];
      mockAssetStorageService.listWithUrls.mockResolvedValue(assets);

      const { result } = renderHook(() => useAssetManager());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Select some assets
      await act(async () => {
        result.current.toggleSelect('asset-1');
      });

      expect(result.current.selectedCount).toBe(1);

      // Change filter
      await act(async () => {
        result.current.setFilter({ type: 'background' });
      });

      expect(result.current.selectedCount).toBe(0);
    });

    it('should reset filter with resetFilter', async () => {
      const { result } = renderHook(() =>
        useAssetManager({
          initialFilter: { type: 'character-icon' },
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Change filter
      await act(async () => {
        result.current.setFilter({ type: 'background' });
      });

      expect(result.current.filter.type).toBe('background');

      // Reset
      await act(async () => {
        result.current.resetFilter();
      });

      expect(result.current.filter.type).toBe('character-icon');
    });
  });

  // --------------------------------------------------------------------------
  // Selection Operations
  // --------------------------------------------------------------------------

  describe('Selection Operations', () => {
    it('should toggle selection', async () => {
      const assets = [createMockAsset({ id: 'asset-1' })];
      mockAssetStorageService.listWithUrls.mockResolvedValue(assets);

      const { result } = renderHook(() => useAssetManager());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isSelected('asset-1')).toBe(false);

      act(() => {
        result.current.toggleSelect('asset-1');
      });

      expect(result.current.isSelected('asset-1')).toBe(true);
      expect(result.current.selectedCount).toBe(1);

      act(() => {
        result.current.toggleSelect('asset-1');
      });

      expect(result.current.isSelected('asset-1')).toBe(false);
      expect(result.current.selectedCount).toBe(0);
    });

    it('should select all assets', async () => {
      const assets = [
        createMockAsset({ id: 'asset-1' }),
        createMockAsset({ id: 'asset-2' }),
        createMockAsset({ id: 'asset-3' }),
      ];
      mockAssetStorageService.listWithUrls.mockResolvedValue(assets);

      const { result } = renderHook(() => useAssetManager());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.selectedCount).toBe(3);
    });

    it('should clear selection', async () => {
      const assets = [createMockAsset({ id: 'asset-1' })];
      mockAssetStorageService.listWithUrls.mockResolvedValue(assets);

      const { result } = renderHook(() => useAssetManager());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.toggleSelect('asset-1');
      });

      expect(result.current.selectedCount).toBe(1);

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedCount).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Asset Actions
  // --------------------------------------------------------------------------

  describe('Asset Actions', () => {
    it('should delete asset', async () => {
      const assets = [createMockAsset({ id: 'asset-1' })];
      mockAssetStorageService.listWithUrls.mockResolvedValue(assets);

      const { result } = renderHook(() => useAssetManager());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteAsset('asset-1');
      });

      expect(mockAssetStorageService.delete).toHaveBeenCalledWith('asset-1');
    });

    it('should delete selected assets', async () => {
      const assets = [createMockAsset({ id: 'asset-1' }), createMockAsset({ id: 'asset-2' })];
      mockAssetStorageService.listWithUrls.mockResolvedValue(assets);

      const { result } = renderHook(() => useAssetManager());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.toggleSelect('asset-1');
        result.current.toggleSelect('asset-2');
      });

      await act(async () => {
        await result.current.deleteSelected();
      });

      expect(mockAssetStorageService.bulkDelete).toHaveBeenCalledWith(['asset-1', 'asset-2']);
    });

    it('should not delete when no selection', async () => {
      const { result } = renderHook(() => useAssetManager());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteSelected();
      });

      expect(mockAssetStorageService.bulkDelete).not.toHaveBeenCalled();
    });

    it('should promote asset to global', async () => {
      const { result } = renderHook(() => useAssetManager());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.promoteToGlobal('asset-1');
      });

      expect(mockAssetStorageService.promoteToGlobal).toHaveBeenCalledWith('asset-1');
    });

    it('should move asset to project', async () => {
      const { result } = renderHook(() => useAssetManager());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.moveToProject('asset-1', 'project-123');
      });

      expect(mockAssetStorageService.moveToProject).toHaveBeenCalledWith('asset-1', 'project-123');
    });

    it('should cleanup orphans', async () => {
      mockAssetStorageService.cleanupOrphans.mockResolvedValue(3);

      const { result } = renderHook(() => useAssetManager());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let cleanedCount = 0;
      await act(async () => {
        cleanedCount = await result.current.cleanupOrphans();
      });

      expect(mockAssetStorageService.cleanupOrphans).toHaveBeenCalled();
      expect(cleanedCount).toBe(3);
    });
  });

  // --------------------------------------------------------------------------
  // Bulk Actions
  // --------------------------------------------------------------------------

  describe('Bulk Actions', () => {
    it('should promote selected to global', async () => {
      const assets = [createMockAsset({ id: 'asset-1' }), createMockAsset({ id: 'asset-2' })];
      mockAssetStorageService.listWithUrls.mockResolvedValue(assets);

      const { result } = renderHook(() => useAssetManager());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.toggleSelect('asset-1');
        result.current.toggleSelect('asset-2');
      });

      await act(async () => {
        await result.current.promoteSelectedToGlobal();
      });

      expect(mockAssetStorageService.bulkPromoteToGlobal).toHaveBeenCalledWith([
        'asset-1',
        'asset-2',
      ]);
    });

    it('should move selected to project', async () => {
      const assets = [createMockAsset({ id: 'asset-1' }), createMockAsset({ id: 'asset-2' })];
      mockAssetStorageService.listWithUrls.mockResolvedValue(assets);

      const { result } = renderHook(() => useAssetManager());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.toggleSelect('asset-1');
        result.current.toggleSelect('asset-2');
      });

      await act(async () => {
        await result.current.moveSelectedToProject('project-456');
      });

      expect(mockAssetStorageService.bulkMoveToProject).toHaveBeenCalledWith(
        ['asset-1', 'asset-2'],
        'project-456'
      );
    });
  });

  // --------------------------------------------------------------------------
  // Pagination
  // --------------------------------------------------------------------------

  describe('Pagination', () => {
    it('should calculate hasMore correctly', async () => {
      const assets = [createMockAsset(), createMockAsset()];
      mockAssetStorageService.listWithUrls.mockResolvedValue(assets);
      mockAssetStorageService.count.mockResolvedValue(5);

      const { result } = renderHook(() => useAssetManager());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasMore).toBe(true);
      expect(result.current.totalCount).toBe(5);
    });

    it('should return hasMore false when all loaded', async () => {
      const assets = [createMockAsset(), createMockAsset()];
      mockAssetStorageService.listWithUrls.mockResolvedValue(assets);
      mockAssetStorageService.count.mockResolvedValue(2);

      const { result } = renderHook(() => useAssetManager());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasMore).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Refresh
  // --------------------------------------------------------------------------

  describe('Refresh', () => {
    it('should refresh assets', async () => {
      const { result } = renderHook(() => useAssetManager());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Initial fetch calls listWithUrls twice:
      // 1. Once for filtered assets
      // 2. Once for folder navigation (unfiltered)
      expect(mockAssetStorageService.listWithUrls).toHaveBeenCalledTimes(2);

      await act(async () => {
        await result.current.refresh();
      });

      // After refresh, listWithUrls is called 2 more times (4 total)
      expect(mockAssetStorageService.listWithUrls).toHaveBeenCalledTimes(4);
    });
  });

  // --------------------------------------------------------------------------
  // Cleanup
  // --------------------------------------------------------------------------

  describe('Cleanup', () => {
    it('should revoke URLs on unmount', async () => {
      const { unmount } = renderHook(() => useAssetManager());

      await waitFor(() => {
        expect(mockAssetStorageService.listWithUrls).toHaveBeenCalled();
      });

      unmount();

      expect(mockAssetStorageService.revokeAllUrls).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // Error Handling
  // --------------------------------------------------------------------------

  describe('Error Handling', () => {
    it('should throw error on delete failure', async () => {
      mockAssetStorageService.delete.mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => useAssetManager());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify the error is thrown back to caller
      let thrownError: Error | undefined;
      try {
        await act(async () => {
          await result.current.deleteAsset('asset-1');
        });
      } catch (err) {
        thrownError = err as Error;
      }

      expect(thrownError?.message).toBe('Delete failed');
      expect(mockAssetStorageService.delete).toHaveBeenCalledWith('asset-1');
    });

    it('should set error on initial fetch failure', async () => {
      mockAssetStorageService.listWithUrls.mockRejectedValue(new Error('Fetch failed'));

      const { result } = renderHook(() => useAssetManager());

      await waitFor(() => {
        expect(result.current.error).toBe('Fetch failed');
      });
    });
  });
});
