/**
 * Unit tests for useAssetTags hook
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAssetTags } from '@/hooks/assets/useAssetTags';
import type { DBAsset } from '@/ts/services/upload/types';

// Mock the ServiceContext
vi.mock('@/contexts/ServiceContext', () => ({
  useAssetStorageService: () => mockAssetStorageService,
}));

const mockAssetStorageService = {
  getById: vi.fn(),
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

describe('useAssetTags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addTag', () => {
    it('should add a tag to an asset', async () => {
      const asset = createMockAsset({ tags: ['type:icon'] });
      mockAssetStorageService.getById.mockResolvedValue(asset);
      mockAssetStorageService.update.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAssetTags());

      await act(async () => {
        await result.current.addTag('asset-123', 'custom:mytag');
      });

      expect(mockAssetStorageService.update).toHaveBeenCalledWith('asset-123', {
        tags: ['type:icon', 'custom:mytag'],
      });
    });

    it('should throw if asset not found', async () => {
      mockAssetStorageService.getById.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAssetTags());

      await act(async () => {
        await expect(result.current.addTag('missing', 'tag')).rejects.toThrow('Asset not found');
      });
    });
  });

  describe('removeTag', () => {
    it('should remove a tag from an asset', async () => {
      const asset = createMockAsset({ tags: ['type:icon', 'custom:mytag'] });
      mockAssetStorageService.getById.mockResolvedValue(asset);
      mockAssetStorageService.update.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAssetTags());

      await act(async () => {
        await result.current.removeTag('asset-123', 'custom:mytag');
      });

      expect(mockAssetStorageService.update).toHaveBeenCalledWith('asset-123', {
        tags: ['type:icon'],
      });
    });

    it('should throw when trying to remove type:* tag', async () => {
      const asset = createMockAsset({ tags: ['type:icon'] });
      mockAssetStorageService.getById.mockResolvedValue(asset);

      const { result } = renderHook(() => useAssetTags());

      await act(async () => {
        await expect(result.current.removeTag('asset-123', 'type:icon')).rejects.toThrow(
          'Cannot remove type:* tag'
        );
      });
    });
  });

  describe('reclassifyType', () => {
    it('should change the type:* tag', async () => {
      const asset = createMockAsset({ tags: ['type:icon', 'custom:tag'] });
      mockAssetStorageService.getById.mockResolvedValue(asset);
      mockAssetStorageService.update.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAssetTags());

      await act(async () => {
        await result.current.reclassifyType('asset-123', 'token-background');
      });

      expect(mockAssetStorageService.update).toHaveBeenCalledWith('asset-123', {
        tags: ['type:token-background', 'custom:tag'],
      });
    });
  });

  describe('batchAddTag', () => {
    it('should add tag to multiple assets', async () => {
      const assets = [
        createMockAsset({ id: 'a1', tags: ['type:icon'] }),
        createMockAsset({ id: 'a2', tags: ['type:icon'] }),
      ];

      mockAssetStorageService.getById
        .mockResolvedValueOnce(assets[0])
        .mockResolvedValueOnce(assets[1]);
      mockAssetStorageService.bulkUpdate.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAssetTags());

      await act(async () => {
        await result.current.batchAddTag(['a1', 'a2'], 'custom:batch');
      });

      expect(mockAssetStorageService.bulkUpdate).toHaveBeenCalledWith([
        { id: 'a1', data: { tags: ['type:icon', 'custom:batch'] } },
        { id: 'a2', data: { tags: ['type:icon', 'custom:batch'] } },
      ]);
    });
  });

  describe('batchReclassifyType', () => {
    it('should reclassify multiple assets', async () => {
      const assets = [
        createMockAsset({ id: 'a1', tags: ['type:icon'] }),
        createMockAsset({ id: 'a2', tags: ['type:icon', 'custom:keep'] }),
      ];

      mockAssetStorageService.getById
        .mockResolvedValueOnce(assets[0])
        .mockResolvedValueOnce(assets[1]);
      mockAssetStorageService.bulkUpdate.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAssetTags());

      await act(async () => {
        await result.current.batchReclassifyType(['a1', 'a2'], 'setup');
      });

      expect(mockAssetStorageService.bulkUpdate).toHaveBeenCalledWith([
        { id: 'a1', data: { tags: ['type:setup'] } },
        { id: 'a2', data: { tags: ['type:setup', 'custom:keep'] } },
      ]);
    });
  });

  describe('analyzeSelection', () => {
    it('should analyze tags across selection', () => {
      const assets = [
        createMockAsset({ id: 'a1', tags: ['type:icon', 'common', 'only-a1'] }),
        createMockAsset({ id: 'a2', tags: ['type:icon', 'common', 'only-a2'] }),
      ];

      const { result } = renderHook(() => useAssetTags());

      const analysis = result.current.analyzeSelection(assets);

      expect(analysis.common).toContain('type:icon');
      expect(analysis.common).toContain('common');
      expect(analysis.partial.has('only-a1')).toBe(true);
      expect(analysis.partial.has('only-a2')).toBe(true);
      expect(analysis.partial.get('only-a1')).toBe(1);
      expect(analysis.commonType).toBe('icon');
      expect(analysis.count).toBe(2);
    });
  });

  describe('state', () => {
    it('should track processing state', async () => {
      const asset = createMockAsset();
      mockAssetStorageService.getById.mockResolvedValue(asset);
      mockAssetStorageService.update.mockResolvedValue(undefined);

      const { result } = renderHook(() => useAssetTags());

      expect(result.current.isProcessing).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should reject on failure', async () => {
      mockAssetStorageService.getById.mockRejectedValue(new Error('Database error'));

      const { result } = renderHook(() => useAssetTags());

      await act(async () => {
        await expect(result.current.addTag('asset-123', 'tag')).rejects.toThrow('Database error');
      });
    });
  });
});
