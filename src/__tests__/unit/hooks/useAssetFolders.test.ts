/**
 * Unit tests for useAssetFolders hook
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAssetFolders } from '@/hooks/assets/useAssetFolders';
import type { DBAsset } from '@/ts/services/upload/types';

// Mock the ServiceContext
vi.mock('@/contexts/ServiceContext', () => ({
  useAssetStorageService: () => mockAssetStorageService,
}));

const mockAssetStorageService = {
  update: vi.fn(),
  bulkUpdate: vi.fn(),
};

// Test helpers
const createMockAsset = (overrides: Partial<DBAsset> = {}): DBAsset => ({
  id: 'asset-123',
  tags: ['type:icon'],
  folder: null,
  projectId: null,
  blob: new Blob(['test']),
  thumbnail: new Blob(['thumb']),
  linkedTo: [],
  metadata: {
    filename: 'test.png',
    mimeType: 'image/png',
    size: 1024,
    width: 256,
    height: 256,
    uploadedAt: Date.now(),
    sourceType: 'upload',
  },
  ...overrides,
});

describe('useAssetFolders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('folderTree', () => {
    it('should derive folder tree from assets', () => {
      const assets = [
        createMockAsset({ id: 'a1', folder: 'Characters/Townsfolk' }),
        createMockAsset({ id: 'a2', folder: 'Characters/Townsfolk' }),
        createMockAsset({ id: 'a3', folder: 'Characters/Outsiders' }),
        createMockAsset({ id: 'a4', folder: null }),
      ];

      const { result } = renderHook(() => useAssetFolders({ assets }));

      expect(result.current.folderTree).toHaveLength(1); // Characters root
      expect(result.current.folderTree[0].name).toBe('Characters');
      expect(result.current.folderTree[0].children).toHaveLength(2);
    });

    it('should return empty tree for assets without folders', () => {
      const assets = [
        createMockAsset({ id: 'a1', folder: null }),
        createMockAsset({ id: 'a2', folder: null }),
      ];

      const { result } = renderHook(() => useAssetFolders({ assets }));

      expect(result.current.folderTree).toHaveLength(0);
    });
  });

  describe('allFolderPaths', () => {
    it('should return all unique folder paths', () => {
      const assets = [
        createMockAsset({ id: 'a1', folder: 'Characters/Townsfolk' }),
        createMockAsset({ id: 'a2', folder: 'Characters/Outsiders' }),
        createMockAsset({ id: 'a3', folder: 'Backgrounds' }),
      ];

      const { result } = renderHook(() => useAssetFolders({ assets }));

      expect(result.current.allFolderPaths).toContain('Characters/Townsfolk');
      expect(result.current.allFolderPaths).toContain('Characters/Outsiders');
      expect(result.current.allFolderPaths).toContain('Backgrounds');
    });
  });

  describe('getAssetsInFolder', () => {
    it('should get assets in a specific folder', () => {
      const assets = [
        createMockAsset({ id: 'a1', folder: 'Characters/Townsfolk' }),
        createMockAsset({ id: 'a2', folder: 'Characters/Townsfolk' }),
        createMockAsset({ id: 'a3', folder: 'Characters/Outsiders' }),
      ];

      const { result } = renderHook(() => useAssetFolders({ assets }));

      const inTownsfolk = result.current.getAssetsInFolder('Characters/Townsfolk');
      expect(inTownsfolk).toHaveLength(2);
      expect(inTownsfolk.map((a) => a.id)).toEqual(['a1', 'a2']);
    });

    it('should get assets at root level', () => {
      const assets = [
        createMockAsset({ id: 'a1', folder: null }),
        createMockAsset({ id: 'a2', folder: 'Some/Folder' }),
      ];

      const { result } = renderHook(() => useAssetFolders({ assets }));

      const atRoot = result.current.getAssetsInFolder(null);
      expect(atRoot).toHaveLength(1);
      expect(atRoot[0].id).toBe('a1');
    });
  });

  describe('expandedFolders', () => {
    it('should toggle folder expanded state', () => {
      const assets = [createMockAsset({ folder: 'Test' })];
      const { result } = renderHook(() => useAssetFolders({ assets }));

      expect(result.current.expandedFolders.has('Test')).toBe(false);

      act(() => {
        result.current.toggleFolder('Test');
      });

      expect(result.current.expandedFolders.has('Test')).toBe(true);

      act(() => {
        result.current.toggleFolder('Test');
      });

      expect(result.current.expandedFolders.has('Test')).toBe(false);
    });

    it('should expand all folders', () => {
      const assets = [
        createMockAsset({ folder: 'Folder1' }),
        createMockAsset({ folder: 'Folder2' }),
      ];

      const { result } = renderHook(() => useAssetFolders({ assets }));

      act(() => {
        result.current.expandAll();
      });

      expect(result.current.expandedFolders.has('Folder1')).toBe(true);
      expect(result.current.expandedFolders.has('Folder2')).toBe(true);
    });

    it('should collapse all folders', () => {
      const assets = [createMockAsset({ folder: 'Test' })];
      const { result } = renderHook(() => useAssetFolders({ assets }));

      act(() => {
        result.current.expandAll();
      });

      act(() => {
        result.current.collapseAll();
      });

      expect(result.current.expandedFolders.size).toBe(0);
    });
  });

  describe('moveToFolder', () => {
    it('should move an asset to a folder', async () => {
      const assets: DBAsset[] = [];
      mockAssetStorageService.update.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAssetFolders({ assets }));

      await act(async () => {
        await result.current.moveToFolder('asset-123', 'NewFolder');
      });

      expect(mockAssetStorageService.update).toHaveBeenCalledWith('asset-123', {
        folder: 'NewFolder',
      });
    });

    it('should remove from folder when null is passed', async () => {
      const assets: DBAsset[] = [];
      mockAssetStorageService.update.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAssetFolders({ assets }));

      await act(async () => {
        await result.current.moveToFolder('asset-123', null);
      });

      expect(mockAssetStorageService.update).toHaveBeenCalledWith('asset-123', {
        folder: null,
      });
    });
  });

  describe('batchMoveToFolder', () => {
    it('should move multiple assets to a folder', async () => {
      const assets: DBAsset[] = [];
      mockAssetStorageService.bulkUpdate.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAssetFolders({ assets }));

      await act(async () => {
        await result.current.batchMoveToFolder(['a1', 'a2', 'a3'], 'SharedFolder');
      });

      expect(mockAssetStorageService.bulkUpdate).toHaveBeenCalledWith([
        { id: 'a1', data: { folder: 'SharedFolder' } },
        { id: 'a2', data: { folder: 'SharedFolder' } },
        { id: 'a3', data: { folder: 'SharedFolder' } },
      ]);
    });
  });

  describe('renameFolder', () => {
    it('should rename folder and update all assets', async () => {
      const assets = [
        createMockAsset({ id: 'a1', folder: 'OldName' }),
        createMockAsset({ id: 'a2', folder: 'OldName/Sub' }),
      ];

      mockAssetStorageService.bulkUpdate.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAssetFolders({ assets }));

      await act(async () => {
        await result.current.renameFolder('OldName', 'NewName');
      });

      expect(mockAssetStorageService.bulkUpdate).toHaveBeenCalledWith([
        { id: 'a1', data: { folder: 'NewName' } },
        { id: 'a2', data: { folder: 'NewName/Sub' } },
      ]);
    });
  });

  describe('deleteFolder', () => {
    it('should move assets to parent folder', async () => {
      const assets = [
        createMockAsset({ id: 'a1', folder: 'Parent/Child' }),
        createMockAsset({ id: 'a2', folder: 'Parent/Child' }),
      ];

      mockAssetStorageService.bulkUpdate.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAssetFolders({ assets }));

      await act(async () => {
        await result.current.deleteFolder('Parent/Child', true);
      });

      expect(mockAssetStorageService.bulkUpdate).toHaveBeenCalledWith([
        { id: 'a1', data: { folder: 'Parent' } },
        { id: 'a2', data: { folder: 'Parent' } },
      ]);
    });

    it('should move assets to root when moveToParent is false', async () => {
      const assets = [createMockAsset({ id: 'a1', folder: 'SomeFolder' })];

      mockAssetStorageService.bulkUpdate.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAssetFolders({ assets }));

      await act(async () => {
        await result.current.deleteFolder('SomeFolder', false);
      });

      expect(mockAssetStorageService.bulkUpdate).toHaveBeenCalledWith([
        { id: 'a1', data: { folder: null } },
      ]);
    });
  });

  describe('state', () => {
    it('should track processing state', async () => {
      const assets: DBAsset[] = [];
      mockAssetStorageService.update.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAssetFolders({ assets }));

      expect(result.current.isProcessing).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should reject on failure', async () => {
      const assets: DBAsset[] = [];
      mockAssetStorageService.update.mockRejectedValue(new Error('Update failed'));

      const { result } = renderHook(() => useAssetFolders({ assets }));

      await act(async () => {
        await expect(result.current.moveToFolder('asset-123', 'folder')).rejects.toThrow(
          'Update failed'
        );
      });
    });
  });
});
