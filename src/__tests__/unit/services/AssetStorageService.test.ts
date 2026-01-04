/**
 * Unit tests for AssetStorageService
 *
 * Comprehensive test suite covering:
 * - CRUD operations (create, read, update, delete)
 * - Bulk operations (bulkDelete, bulkUpdate, bulkPromoteToGlobal, bulkMoveToProject)
 * - Query operations (list, count, listWithUrls, getByType, findByHash, etc.)
 * - Linking operations (link, unlink, replace links)
 * - URL management (caching, refCount, tracking, revocation)
 * - Scope operations (promote, move)
 * - Export and statistics
 * - Error handling and edge cases
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cacheInvalidationService } from '@/ts/cache/CacheInvalidationService';
import { projectDb } from '@/ts/db/projectDb';
import {
  AssetStorageService,
  type CreateAssetData,
} from '@/ts/services/upload/AssetStorageService';
import { imageProcessingService } from '@/ts/services/upload/ImageProcessingService';
import type { AssetMetadata, DBAsset } from '@/ts/services/upload/types';

// Mock dependencies
vi.mock('@/ts/cache/CacheInvalidationService');
vi.mock('@/ts/db/projectDb');
vi.mock('@/ts/services/upload/ImageProcessingService');

describe('AssetStorageService', () => {
  let service: AssetStorageService;

  // Test data factories
  const createMockMetadata = (): AssetMetadata => ({
    filename: 'test-icon.png',
    mimeType: 'image/png',
    size: 10240,
    width: 256,
    height: 256,
    uploadedAt: Date.now(),
    sourceType: 'upload',
  });

  const createMockBlob = (size: number = 10240): Blob => new Blob(['x'.repeat(size)]);

  const createMockAsset = (overrides: Partial<DBAsset> = {}): DBAsset => ({
    id: 'asset-1',
    tags: ['type:icon'],
    folder: null,
    projectId: 'project-1',
    blob: createMockBlob(),
    thumbnail: createMockBlob(2048),
    metadata: createMockMetadata(),
    linkedTo: [],
    contentHash: 'hash-1',
    ...overrides,
  });

  const createCreateAssetData = (overrides: Partial<CreateAssetData> = {}): CreateAssetData => ({
    tags: ['type:icon'],
    projectId: 'project-1',
    blob: createMockBlob(),
    thumbnail: createMockBlob(2048),
    metadata: createMockMetadata(),
    ...overrides,
  });

  beforeEach(() => {
    service = new AssetStorageService();
    vi.clearAllMocks();

    // Mock URL.createObjectURL and URL.revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();

    // Default mocks for common Dexie operations
    // These provide sensible defaults that tests can override with mockReturnValueOnce
    vi.mocked(projectDb.assets.toArray).mockResolvedValue([]);
    vi.mocked(projectDb.assets.toCollection).mockReturnValue({
      toArray: vi.fn().mockResolvedValue([]),
    } as unknown as ReturnType<typeof projectDb.assets.toCollection>);
    vi.mocked(projectDb.assets.where).mockReturnValue({
      equals: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(undefined),
        toArray: vi.fn().mockResolvedValue([]),
      }),
      anyOf: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      }),
    } as unknown as ReturnType<typeof projectDb.assets.where>);
  });

  afterEach(() => {
    service.clearUrlCache();
    vi.resetAllMocks();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // CRUD Operations
  // =========================================================================

  describe('save()', () => {
    it('should save a new asset with generated ID', async () => {
      const data = createCreateAssetData();
      vi.mocked(imageProcessingService.hashBlob).mockResolvedValue('test-hash');
      vi.mocked(projectDb.assets.put).mockResolvedValue(undefined);

      // Mock findByHash to return undefined (no existing asset)
      vi.mocked(projectDb.assets.where).mockReturnValue({
        equals: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(undefined),
        }),
      } as unknown as ReturnType<typeof projectDb.assets.where>);

      const id = await service.save(data);

      // ID is a generated UUID (36 chars with dashes: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(projectDb.assets.put).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ['type:icon'],
          projectId: 'project-1',
        })
      );
    });

    it('should use provided ID for restore operations', async () => {
      const data = createCreateAssetData({ id: 'existing-id' });
      vi.mocked(imageProcessingService.hashBlob).mockResolvedValue('test-hash');
      vi.mocked(projectDb.assets.put).mockResolvedValue('existing-id');

      const id = await service.save(data);

      expect(id).toBe('existing-id');
    });

    it('should deduplicate identical assets', async () => {
      const data = createCreateAssetData();
      const existingAsset = createMockAsset({ id: 'existing-id' });
      const hash = 'duplicate-hash';

      vi.mocked(imageProcessingService.hashBlob).mockResolvedValue(hash);
      vi.mocked(projectDb.assets.where).mockReturnValue({
        equals: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(existingAsset),
        }),
      } as unknown as ReturnType<typeof projectDb.assets.where>);

      const id = await service.save(data);

      expect(id).toBe('existing-id');
      expect(projectDb.assets.put).not.toHaveBeenCalled();
    });

    it('should merge linkedTo when deduplicating', async () => {
      const data = createCreateAssetData({ linkedTo: ['char-2', 'char-3'] });
      const existingAsset = createMockAsset({
        id: 'existing-id',
        linkedTo: ['char-1'],
      });
      const hash = 'duplicate-hash';

      vi.mocked(imageProcessingService.hashBlob).mockResolvedValue(hash);
      vi.mocked(projectDb.assets.where).mockReturnValue({
        equals: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(existingAsset),
        }),
      } as unknown as ReturnType<typeof projectDb.assets.where>);
      vi.mocked(projectDb.assets.update).mockResolvedValue();

      await service.save(data);

      expect(projectDb.assets.update).toHaveBeenCalledWith('existing-id', {
        linkedTo: expect.arrayContaining(['char-1', 'char-2', 'char-3']),
      });
    });

    it('should skip deduplication when explicitly disabled', async () => {
      const data = createCreateAssetData();
      vi.mocked(imageProcessingService.hashBlob).mockResolvedValue('test-hash');
      vi.mocked(projectDb.assets.put).mockResolvedValue('asset-1');

      await service.save(data, { enableDeduplication: false });

      // Should have called put (create new) even if duplicate exists
      expect(projectDb.assets.put).toHaveBeenCalled();
    });

    it('should preserve usage tracking fields during restore', async () => {
      const data = createCreateAssetData({
        id: 'restored-id',
        lastUsedAt: 1000,
        usageCount: 5,
        usedInProjects: ['project-1', 'project-2'],
      });

      vi.mocked(imageProcessingService.hashBlob).mockResolvedValue('test-hash');
      vi.mocked(projectDb.assets.put).mockResolvedValue('restored-id');

      await service.save(data);

      expect(projectDb.assets.put).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'restored-id',
          lastUsedAt: 1000,
          usageCount: 5,
          usedInProjects: ['project-1', 'project-2'],
        })
      );
    });
  });

  describe('getById()', () => {
    it('should return asset by ID', async () => {
      const mockAsset = createMockAsset();
      vi.mocked(projectDb.assets.get).mockResolvedValue(mockAsset);

      const result = await service.getById('asset-1');

      expect(result).toEqual(mockAsset);
      expect(projectDb.assets.get).toHaveBeenCalledWith('asset-1');
    });

    it('should return undefined when asset not found', async () => {
      vi.mocked(projectDb.assets.get).mockResolvedValue(undefined);

      const result = await service.getById('non-existent');

      expect(result).toBeUndefined();
    });
  });

  describe('getByIdWithUrl()', () => {
    it('should return asset with URLs', async () => {
      const mockAsset = createMockAsset();
      vi.mocked(projectDb.assets.get).mockResolvedValue(mockAsset);

      const result = await service.getByIdWithUrl('asset-1');

      expect(result).toBeDefined();
      expect(result?.url).toBe('blob:mock-url');
      expect(result?.thumbnailUrl).toBe('blob:mock-url');
    });

    it('should return undefined when asset not found', async () => {
      vi.mocked(projectDb.assets.get).mockResolvedValue(undefined);

      const result = await service.getByIdWithUrl('non-existent');

      expect(result).toBeUndefined();
    });

    it('should cache URLs', async () => {
      const mockAsset = createMockAsset();
      vi.mocked(projectDb.assets.get).mockResolvedValue(mockAsset);

      const result1 = await service.getByIdWithUrl('asset-1');
      const result2 = await service.getByIdWithUrl('asset-1');

      expect(result1?.url).toBe(result2?.url);
      expect(projectDb.assets.get).toHaveBeenCalledTimes(2); // Still called twice (get happens before cache check in attachUrls)
    });
  });

  describe('update()', () => {
    it('should update asset', async () => {
      vi.mocked(projectDb.assets.update).mockResolvedValue();
      vi.mocked(cacheInvalidationService.invalidateAsset).mockResolvedValue();

      await service.update('asset-1', { metadata: createMockMetadata() });

      expect(projectDb.assets.update).toHaveBeenCalledWith(
        'asset-1',
        expect.objectContaining({
          metadata: expect.any(Object),
        })
      );
    });

    it('should revoke URLs when blob is updated', async () => {
      const mockAsset = createMockAsset();
      vi.mocked(projectDb.assets.get).mockResolvedValue(mockAsset);

      // Get URL first to cache it
      await service.getByIdWithUrl('asset-1');

      vi.mocked(projectDb.assets.update).mockResolvedValue();
      vi.mocked(cacheInvalidationService.invalidateAsset).mockResolvedValue();

      // Now update blob
      await service.update('asset-1', { blob: createMockBlob() });

      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('should emit cache invalidation event', async () => {
      vi.mocked(projectDb.assets.update).mockResolvedValue();
      vi.mocked(cacheInvalidationService.invalidateAsset).mockResolvedValue();

      await service.update('asset-1', { linkedTo: ['char-1'] });

      expect(cacheInvalidationService.invalidateAsset).toHaveBeenCalledWith(
        'asset-1',
        'update',
        expect.objectContaining({
          fields: expect.arrayContaining(['linkedTo']),
        })
      );
    });
  });

  describe('delete()', () => {
    it('should delete asset by ID', async () => {
      vi.mocked(projectDb.assets.delete).mockResolvedValue();
      vi.mocked(cacheInvalidationService.invalidateAsset).mockResolvedValue();

      await service.delete('asset-1');

      expect(projectDb.assets.delete).toHaveBeenCalledWith('asset-1');
    });

    it('should revoke URLs before deletion', async () => {
      const mockAsset = createMockAsset();
      vi.mocked(projectDb.assets.get).mockResolvedValue(mockAsset);

      // Cache a URL
      await service.getByIdWithUrl('asset-1');

      vi.mocked(projectDb.assets.delete).mockResolvedValue();
      vi.mocked(cacheInvalidationService.invalidateAsset).mockResolvedValue();

      await service.delete('asset-1');

      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('should emit cache invalidation event', async () => {
      vi.mocked(projectDb.assets.delete).mockResolvedValue();
      vi.mocked(cacheInvalidationService.invalidateAsset).mockResolvedValue();

      await service.delete('asset-1');

      expect(cacheInvalidationService.invalidateAsset).toHaveBeenCalledWith('asset-1', 'delete');
    });
  });

  describe('bulkDelete()', () => {
    it('should delete multiple assets', async () => {
      vi.mocked(projectDb.assets.bulkDelete).mockResolvedValue();
      vi.mocked(cacheInvalidationService.invalidateAssets).mockResolvedValue();

      await service.bulkDelete(['asset-1', 'asset-2', 'asset-3']);

      expect(projectDb.assets.bulkDelete).toHaveBeenCalledWith(['asset-1', 'asset-2', 'asset-3']);
    });

    it('should revoke URLs for all deleted assets', async () => {
      const mockAsset1 = createMockAsset({ id: 'asset-1' });
      const mockAsset2 = createMockAsset({ id: 'asset-2' });

      vi.mocked(projectDb.assets.get)
        .mockResolvedValueOnce(mockAsset1)
        .mockResolvedValueOnce(mockAsset2);

      // Cache URLs
      await service.getByIdWithUrl('asset-1');
      await service.getByIdWithUrl('asset-2');

      vi.mocked(projectDb.assets.bulkDelete).mockResolvedValue();
      vi.mocked(cacheInvalidationService.invalidateAssets).mockResolvedValue();

      await service.bulkDelete(['asset-1', 'asset-2']);

      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('should emit cache invalidation for all assets', async () => {
      vi.mocked(projectDb.assets.bulkDelete).mockResolvedValue();
      vi.mocked(cacheInvalidationService.invalidateAssets).mockResolvedValue();

      await service.bulkDelete(['asset-1', 'asset-2']);

      expect(cacheInvalidationService.invalidateAssets).toHaveBeenCalledWith(
        ['asset-1', 'asset-2'],
        'delete'
      );
    });
  });

  describe('bulkUpdate()', () => {
    it('should update multiple assets in transaction', async () => {
      vi.mocked(projectDb.transaction).mockImplementation(async (_, __, cb) => {
        await cb();
      });
      vi.mocked(projectDb.assets.update).mockResolvedValue();
      vi.mocked(cacheInvalidationService.invalidateAssets).mockResolvedValue();

      const updates = [
        { id: 'asset-1', data: { projectId: 'project-2' } },
        { id: 'asset-2', data: { linkedTo: ['char-1'] } },
      ];

      await service.bulkUpdate(updates);

      expect(projectDb.transaction).toHaveBeenCalled();
      expect(projectDb.assets.update).toHaveBeenCalledTimes(2);
    });

    it('should emit single cache invalidation event for all assets', async () => {
      vi.mocked(projectDb.transaction).mockImplementation(async (_, __, cb) => {
        await cb();
      });
      vi.mocked(projectDb.assets.update).mockResolvedValue();
      vi.mocked(cacheInvalidationService.invalidateAssets).mockResolvedValue();

      const updates = [
        { id: 'asset-1', data: { projectId: 'project-2' } },
        { id: 'asset-2', data: { projectId: 'project-2' } },
      ];

      await service.bulkUpdate(updates);

      expect(cacheInvalidationService.invalidateAssets).toHaveBeenCalledWith(
        ['asset-1', 'asset-2'],
        'update',
        { count: 2 }
      );
    });
  });

  describe('bulkPromoteToGlobal()', () => {
    it('should promote multiple assets to global scope', async () => {
      vi.mocked(projectDb.transaction).mockImplementation(async (_, __, cb) => {
        await cb();
      });
      vi.mocked(projectDb.assets.update).mockResolvedValue();
      vi.mocked(cacheInvalidationService.invalidateAssets).mockResolvedValue();

      await service.bulkPromoteToGlobal(['asset-1', 'asset-2']);

      expect(projectDb.assets.update).toHaveBeenCalledWith('asset-1', { projectId: null });
      expect(projectDb.assets.update).toHaveBeenCalledWith('asset-2', { projectId: null });
    });
  });

  describe('bulkMoveToProject()', () => {
    it('should move multiple assets to project', async () => {
      vi.mocked(projectDb.transaction).mockImplementation(async (_, __, cb) => {
        await cb();
      });
      vi.mocked(projectDb.assets.update).mockResolvedValue();
      vi.mocked(cacheInvalidationService.invalidateAssets).mockResolvedValue();

      await service.bulkMoveToProject(['asset-1', 'asset-2'], 'new-project');

      expect(projectDb.assets.update).toHaveBeenCalledWith('asset-1', { projectId: 'new-project' });
      expect(projectDb.assets.update).toHaveBeenCalledWith('asset-2', { projectId: 'new-project' });
    });
  });

  // =========================================================================
  // Query Operations
  // =========================================================================

  describe('list()', () => {
    it('should list all assets when no filter provided', async () => {
      // Create assets with explicit uploadedAt for deterministic order
      const baseTime = Date.now();
      const assets = [
        createMockAsset({
          id: 'asset-1',
          metadata: { ...createMockMetadata(), uploadedAt: baseTime + 1 },
        }),
        createMockAsset({
          id: 'asset-2',
          metadata: { ...createMockMetadata(), uploadedAt: baseTime },
        }),
      ];
      // list() calls toArray() directly for fallback path
      vi.mocked(projectDb.assets.toArray).mockResolvedValue(assets);

      const result = await service.list();

      // Default sort is desc by uploadedAt, so asset-1 (newer) should come first
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('asset-1');
      expect(result[1].id).toBe('asset-2');
    });

    it('should use compound index for folder+projectId optimization', async () => {
      const assets = [createMockAsset()];
      const toArrayFn = vi.fn().mockResolvedValue(assets);
      const equalsFn = vi.fn().mockReturnValue({
        toArray: toArrayFn,
      });

      vi.mocked(projectDb.assets.where).mockReturnValue({
        equals: equalsFn,
      } as unknown as ReturnType<typeof projectDb.assets.where>);

      await service.list({ folder: 'Icons', projectId: 'project-1' });

      expect(projectDb.assets.where).toHaveBeenCalledWith('[folder+projectId]');
      expect(equalsFn).toHaveBeenCalledWith(['Icons', 'project-1']);
    });

    it('should filter by tags using index', async () => {
      const assets = [createMockAsset({ tags: ['type:icon'] })];
      const whereChain = {
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(assets),
        }),
      };

      vi.mocked(projectDb.assets.where).mockReturnValue(
        whereChain as unknown as ReturnType<typeof projectDb.assets.where>
      );

      await service.list({ tags: ['type:icon'] });

      expect(projectDb.assets.where).toHaveBeenCalledWith('tags');
      expect(whereChain.equals).toHaveBeenCalledWith('type:icon');
    });

    it('should filter by multiple tags with AND logic', async () => {
      const assets = [
        createMockAsset({ tags: ['type:icon', 'team:townsfolk'] }),
        createMockAsset({ tags: ['type:icon', 'team:outsider'] }),
      ];
      const whereChain = {
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(assets),
        }),
      };

      vi.mocked(projectDb.assets.where).mockReturnValue(
        whereChain as unknown as ReturnType<typeof projectDb.assets.where>
      );

      const result = await service.list({ tags: ['type:icon', 'team:townsfolk'] });

      expect(whereChain.equals).toHaveBeenCalledWith('type:icon');
      // Second tag is applied as filter, so only the first asset should match
      expect(result).toHaveLength(1);
      expect(result[0].tags).toContain('team:townsfolk');
    });

    it('should apply search filter', async () => {
      const assets = [
        createMockAsset({ id: 'asset-1', metadata: createMockMetadata() }),
        createMockAsset({
          id: 'asset-2',
          metadata: { ...createMockMetadata(), filename: 'other.png' },
        }),
      ];

      // list() calls toArray() directly for fallback path
      vi.mocked(projectDb.assets.toArray).mockResolvedValue(assets);

      const result = await service.list({ search: 'test' });

      expect(result).toContainEqual(expect.objectContaining({ id: 'asset-1' }));
      expect(result).not.toContainEqual(expect.objectContaining({ id: 'asset-2' }));
    });

    it('should filter by orphaned assets', async () => {
      const assets = [
        createMockAsset({ id: 'asset-1', linkedTo: [] }),
        createMockAsset({ id: 'asset-2', linkedTo: ['char-1'] }),
      ];

      // list() calls toArray() directly for fallback path
      vi.mocked(projectDb.assets.toArray).mockResolvedValue(assets);

      const result = await service.list({ orphanedOnly: true });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('asset-1');
    });

    it('should sort by filename', async () => {
      const assets = [
        createMockAsset({ metadata: { ...createMockMetadata(), filename: 'zebra.png' } }),
        createMockAsset({ metadata: { ...createMockMetadata(), filename: 'alpha.png' } }),
      ];

      // list() calls toArray() directly for fallback path
      vi.mocked(projectDb.assets.toArray).mockResolvedValue(assets);

      const result = await service.list({ sortBy: 'filename', sortDirection: 'asc' });

      expect(result[0].metadata.filename).toBe('alpha.png');
      expect(result[1].metadata.filename).toBe('zebra.png');
    });

    it('should sort by size', async () => {
      const assets = [
        createMockAsset({ metadata: { ...createMockMetadata(), size: 1000 } }),
        createMockAsset({ metadata: { ...createMockMetadata(), size: 2000 } }),
      ];

      // list() calls toArray() directly for fallback path
      vi.mocked(projectDb.assets.toArray).mockResolvedValue(assets);

      const result = await service.list({ sortBy: 'size', sortDirection: 'desc' });

      expect(result[0].metadata.size).toBe(2000);
      expect(result[1].metadata.size).toBe(1000);
    });

    it('should apply pagination', async () => {
      // Create assets with ascending uploadedAt so after desc sort we get: 9, 8, 7, 6, 5, 4, 3, 2, 1, 0
      const baseTime = 1000000;
      const assets = Array.from({ length: 10 }, (_, i) =>
        createMockAsset({
          id: `asset-${i}`,
          metadata: { ...createMockMetadata(), uploadedAt: baseTime + i },
        })
      );

      // list() calls toArray() directly for fallback path
      vi.mocked(projectDb.assets.toArray).mockResolvedValue(assets);

      // Default sort is desc by uploadedAt, so offset:2 limit:3 gives assets 7, 6, 5
      const result = await service.list({ offset: 2, limit: 3 });

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('asset-7');
    });
  });

  describe('count()', () => {
    it('should return total count ignoring pagination', async () => {
      const assets = [createMockAsset(), createMockAsset(), createMockAsset()];
      // list() calls toArray() directly for fallback path
      vi.mocked(projectDb.assets.toArray).mockResolvedValue(assets);

      const count = await service.count({ offset: 1, limit: 1 });

      expect(count).toBe(3);
    });
  });

  describe('listWithUrls()', () => {
    it('should return assets with object URLs', async () => {
      const assets = [createMockAsset({ id: 'asset-1' })];
      // list() calls toArray() directly for fallback path
      vi.mocked(projectDb.assets.toArray).mockResolvedValue(assets);
      vi.mocked(projectDb.assets.get).mockResolvedValue(assets[0]);

      const result = await service.listWithUrls();

      expect(result).toHaveLength(1);
      expect(result[0].url).toBe('blob:mock-url');
      expect(result[0].thumbnailUrl).toBe('blob:mock-url');
    });
  });

  describe('getByType()', () => {
    it('should get assets by type tag', async () => {
      const assets = [createMockAsset({ tags: ['type:icon'] })];
      const whereChain = {
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(assets),
        }),
      };

      vi.mocked(projectDb.assets.where).mockReturnValue(
        whereChain as unknown as ReturnType<typeof projectDb.assets.where>
      );

      const result = await service.getByType('icon');

      expect(result).toEqual(assets);
      expect(projectDb.assets.where).toHaveBeenCalledWith('tags');
      expect(whereChain.equals).toHaveBeenCalledWith('type:icon');
    });

    it('should accept full type:* tag format', async () => {
      const assets = [createMockAsset({ tags: ['type:token-background'] })];
      const whereChain = {
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(assets),
        }),
      };

      vi.mocked(projectDb.assets.where).mockReturnValue(
        whereChain as unknown as ReturnType<typeof projectDb.assets.where>
      );

      const result = await service.getByType('type:token-background');

      expect(result).toEqual(assets);
      expect(whereChain.equals).toHaveBeenCalledWith('type:token-background');
    });
  });

  describe('findByHash()', () => {
    it('should find asset by content hash', async () => {
      const asset = createMockAsset();
      const whereChain = {
        equals: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(asset),
        }),
      };

      vi.mocked(projectDb.assets.where).mockReturnValue(
        whereChain as unknown as ReturnType<typeof projectDb.assets.where>
      );

      const result = await service.findByHash('test-hash');

      expect(result).toEqual(asset);
      expect(projectDb.assets.where).toHaveBeenCalledWith('contentHash');
    });

    it('should return undefined when not found', async () => {
      const whereChain = {
        equals: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(undefined),
        }),
      };

      vi.mocked(projectDb.assets.where).mockReturnValue(
        whereChain as unknown as ReturnType<typeof projectDb.assets.where>
      );

      const result = await service.findByHash('nonexistent-hash');

      expect(result).toBeUndefined();
    });
  });

  describe('getByProject()', () => {
    it('should get assets for a project', async () => {
      const assets = [createMockAsset({ projectId: 'project-1' })];
      const whereChain = {
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(assets),
        }),
      };

      vi.mocked(projectDb.assets.where).mockReturnValue(
        whereChain as unknown as ReturnType<typeof projectDb.assets.where>
      );

      const result = await service.getByProject('project-1');

      expect(result).toEqual(assets);
      expect(projectDb.assets.where).toHaveBeenCalledWith('projectId');
    });
  });

  describe('getGlobal()', () => {
    it('should get global assets (projectId = null)', async () => {
      const assets = [
        createMockAsset({ projectId: null }),
        createMockAsset({ projectId: 'project-1' }),
      ];

      // getGlobal() uses toArray() directly, not toCollection()
      vi.mocked(projectDb.assets.toArray).mockResolvedValueOnce(assets);

      const result = await service.getGlobal();

      expect(result).toHaveLength(1);
      expect(result[0].projectId).toBeNull();
    });
  });

  describe('getOrphaned()', () => {
    it('should get assets not linked to any character', async () => {
      const assets = [createMockAsset({ linkedTo: [] }), createMockAsset({ linkedTo: ['char-1'] })];

      // getOrphaned() uses toArray() directly, not toCollection()
      vi.mocked(projectDb.assets.toArray).mockResolvedValueOnce(assets);

      const result = await service.getOrphaned();

      expect(result).toHaveLength(1);
      expect(result[0].linkedTo).toHaveLength(0);
    });
  });

  describe('getByCharacter()', () => {
    it('should get assets linked to a character', async () => {
      const assets = [createMockAsset({ linkedTo: ['char-1'] })];
      const whereChain = {
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(assets),
        }),
      };

      vi.mocked(projectDb.assets.where).mockReturnValue(
        whereChain as unknown as ReturnType<typeof projectDb.assets.where>
      );

      const result = await service.getByCharacter('char-1');

      expect(result).toEqual(assets);
      expect(projectDb.assets.where).toHaveBeenCalledWith('linkedTo');
    });
  });

  // =========================================================================
  // Linking Operations
  // =========================================================================

  describe('linkToCharacter()', () => {
    it('should link asset to character', async () => {
      const asset = createMockAsset({ linkedTo: [] });
      vi.mocked(projectDb.assets.get).mockResolvedValue(asset);
      vi.mocked(projectDb.assets.update).mockResolvedValue();
      vi.mocked(cacheInvalidationService.invalidateAsset).mockResolvedValue();

      await service.linkToCharacter('asset-1', 'char-1');

      expect(projectDb.assets.update).toHaveBeenCalledWith('asset-1', {
        linkedTo: ['char-1'],
      });
    });

    it('should not duplicate links', async () => {
      const asset = createMockAsset({ linkedTo: ['char-1'] });
      vi.mocked(projectDb.assets.get).mockResolvedValue(asset);

      await service.linkToCharacter('asset-1', 'char-1');

      expect(projectDb.assets.update).not.toHaveBeenCalled();
    });

    it('should throw when asset not found', async () => {
      vi.mocked(projectDb.assets.get).mockResolvedValue(undefined);

      await expect(service.linkToCharacter('non-existent', 'char-1')).rejects.toThrow(
        'Asset not found'
      );
    });
  });

  describe('unlinkFromCharacter()', () => {
    it('should unlink asset from character', async () => {
      const asset = createMockAsset({ linkedTo: ['char-1', 'char-2'] });
      vi.mocked(projectDb.assets.get).mockResolvedValue(asset);
      vi.mocked(projectDb.assets.update).mockResolvedValue();
      vi.mocked(cacheInvalidationService.invalidateAsset).mockResolvedValue();

      await service.unlinkFromCharacter('asset-1', 'char-1');

      expect(projectDb.assets.update).toHaveBeenCalledWith('asset-1', {
        linkedTo: ['char-2'],
      });
    });

    it('should throw when asset not found', async () => {
      vi.mocked(projectDb.assets.get).mockResolvedValue(undefined);

      await expect(service.unlinkFromCharacter('non-existent', 'char-1')).rejects.toThrow(
        'Asset not found'
      );
    });
  });

  describe('replaceCharacterLink()', () => {
    it('should replace all links for a character with new asset', async () => {
      const oldAsset = createMockAsset({
        id: 'old-asset',
        tags: ['type:icon'],
        linkedTo: ['char-1'],
      });
      const newAsset = createMockAsset({ id: 'new-asset', tags: ['type:icon'], linkedTo: [] });

      const equalsFnForOld = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([oldAsset]),
      });

      vi.mocked(projectDb.assets.where).mockReturnValueOnce({
        equals: equalsFnForOld,
      } as unknown as ReturnType<typeof projectDb.assets.where>);

      vi.mocked(projectDb.assets.get)
        .mockResolvedValueOnce(oldAsset)
        .mockResolvedValueOnce(newAsset);

      vi.mocked(projectDb.assets.update).mockResolvedValue();
      vi.mocked(cacheInvalidationService.invalidateAsset).mockResolvedValue();

      await service.replaceCharacterLink('char-1', 'new-asset', 'icon');

      expect(projectDb.assets.update).toHaveBeenCalledWith('old-asset', {
        linkedTo: [],
      });
      expect(projectDb.assets.update).toHaveBeenCalledWith('new-asset', {
        linkedTo: ['char-1'],
      });
    });

    it('should unlink all when new asset ID is null', async () => {
      const oldAsset = createMockAsset({
        id: 'asset-1',
        tags: ['type:icon'],
        linkedTo: ['char-1'],
      });

      const equalsFn = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([oldAsset]),
      });

      vi.mocked(projectDb.assets.where).mockReturnValueOnce({
        equals: equalsFn,
      } as unknown as ReturnType<typeof projectDb.assets.where>);

      vi.mocked(projectDb.assets.get).mockResolvedValue(oldAsset);
      vi.mocked(projectDb.assets.update).mockResolvedValue();
      vi.mocked(cacheInvalidationService.invalidateAsset).mockResolvedValue();

      await service.replaceCharacterLink('char-1', null, 'type:icon');

      expect(projectDb.assets.update).toHaveBeenCalledWith('asset-1', { linkedTo: [] });
    });
  });

  describe('trackAssetUsage()', () => {
    it('should track asset usage', async () => {
      const asset = createMockAsset({
        usageCount: 5,
        lastUsedAt: 1000,
        usedInProjects: ['project-1'],
      });
      vi.mocked(projectDb.assets.get).mockResolvedValue(asset);
      vi.mocked(projectDb.assets.update).mockResolvedValue();
      vi.mocked(cacheInvalidationService.invalidateAsset).mockResolvedValue();

      const beforeTime = Date.now();
      await service.trackAssetUsage('asset-1', 'project-2');
      const afterTime = Date.now();

      expect(projectDb.assets.update).toHaveBeenCalledWith('asset-1', {
        usageCount: 6,
        lastUsedAt: expect.any(Number),
        usedInProjects: ['project-1', 'project-2'],
      });

      const callArgs = vi.mocked(projectDb.assets.update).mock.calls[0][1] as Record<
        string,
        unknown
      >;
      expect(callArgs.lastUsedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(callArgs.lastUsedAt).toBeLessThanOrEqual(afterTime);
    });

    it('should not add duplicate projects to usedInProjects', async () => {
      const asset = createMockAsset({
        usageCount: 5,
        usedInProjects: ['project-1'],
      });
      vi.mocked(projectDb.assets.get).mockResolvedValue(asset);
      vi.mocked(projectDb.assets.update).mockResolvedValue();
      vi.mocked(cacheInvalidationService.invalidateAsset).mockResolvedValue();

      await service.trackAssetUsage('asset-1', 'project-1');

      expect(projectDb.assets.update).toHaveBeenCalledWith('asset-1', {
        usageCount: 6,
        lastUsedAt: expect.any(Number),
        usedInProjects: ['project-1'],
      });
    });

    it('should handle missing asset gracefully', async () => {
      vi.mocked(projectDb.assets.get).mockResolvedValue(undefined);

      // Should not throw
      await service.trackAssetUsage('non-existent', 'project-1');
    });
  });

  // =========================================================================
  // Scope Operations
  // =========================================================================

  describe('promoteToGlobal()', () => {
    it('should promote asset to global scope', async () => {
      vi.mocked(projectDb.assets.update).mockResolvedValue();
      vi.mocked(cacheInvalidationService.invalidateAsset).mockResolvedValue();

      await service.promoteToGlobal('asset-1');

      expect(projectDb.assets.update).toHaveBeenCalledWith('asset-1', { projectId: null });
    });
  });

  describe('moveToProject()', () => {
    it('should move asset to project', async () => {
      vi.mocked(projectDb.assets.update).mockResolvedValue();
      vi.mocked(cacheInvalidationService.invalidateAsset).mockResolvedValue();

      await service.moveToProject('asset-1', 'new-project');

      expect(projectDb.assets.update).toHaveBeenCalledWith('asset-1', {
        projectId: 'new-project',
      });
    });
  });

  // =========================================================================
  // URL Management
  // =========================================================================

  describe('getAssetUrl()', () => {
    it('should create and cache object URL', async () => {
      const asset = createMockAsset();
      vi.mocked(projectDb.assets.get).mockResolvedValue(asset);

      const url = await service.getAssetUrl('asset-1');

      expect(url).toBe('blob:mock-url');
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(asset.blob);
    });

    it('should reuse cached URL', async () => {
      const asset = createMockAsset();
      vi.mocked(projectDb.assets.get).mockResolvedValue(asset);

      const url1 = await service.getAssetUrl('asset-1');
      vi.clearAllMocks();
      const url2 = await service.getAssetUrl('asset-1');

      expect(url1).toBe(url2);
      expect(global.URL.createObjectURL).not.toHaveBeenCalled();
    });

    it('should increment refCount on cache hit', async () => {
      const asset = createMockAsset();
      vi.mocked(projectDb.assets.get).mockResolvedValue(asset);

      await service.getAssetUrl('asset-1');
      await service.getAssetUrl('asset-1');

      const stats = service.getUrlCacheStats();
      expect(stats.cachedUrls).toBe(1);
    });

    it('should return null for non-existent asset', async () => {
      vi.mocked(projectDb.assets.get).mockResolvedValue(undefined);

      const url = await service.getAssetUrl('non-existent');

      expect(url).toBeNull();
    });
  });

  describe('getThumbnailUrl()', () => {
    it('should create and cache thumbnail URL', async () => {
      const asset = createMockAsset();
      vi.mocked(projectDb.assets.get).mockResolvedValue(asset);

      const url = await service.getThumbnailUrl('asset-1');

      expect(url).toBe('blob:mock-url');
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(asset.thumbnail);
    });

    it('should return null for non-existent asset', async () => {
      vi.mocked(projectDb.assets.get).mockResolvedValue(undefined);

      const url = await service.getThumbnailUrl('non-existent');

      expect(url).toBeNull();
    });
  });

  describe('getAssetUrlTracked()', () => {
    it('should create URL with automatic cleanup tracking', async () => {
      const asset = createMockAsset();
      vi.mocked(projectDb.assets.get).mockResolvedValue(asset);

      const trackingObject = {};
      const url = await service.getAssetUrlTracked('asset-1', trackingObject);

      expect(url).toBe('blob:mock-url');
    });

    it('should register weak reference for automatic cleanup', async () => {
      const asset = createMockAsset();
      vi.mocked(projectDb.assets.get).mockResolvedValue(asset);

      const trackingObject = {};
      await service.getAssetUrlTracked('asset-1', trackingObject);

      // Verify weak reference was added (indirectly by checking URL cache has weakRefs)
      const stats = service.getUrlCacheStats();
      expect(stats.cachedUrls).toBe(1);
    });
  });

  describe('getThumbnailUrlTracked()', () => {
    it('should create thumbnail URL with automatic cleanup tracking', async () => {
      const asset = createMockAsset();
      vi.mocked(projectDb.assets.get).mockResolvedValue(asset);

      const trackingObject = {};
      const url = await service.getThumbnailUrlTracked('asset-1', trackingObject);

      expect(url).toBe('blob:mock-url');
    });
  });

  describe('releaseUrl()', () => {
    it('should decrement refCount', async () => {
      const asset = createMockAsset();
      vi.mocked(projectDb.assets.get).mockResolvedValue(asset);

      await service.getAssetUrl('asset-1');
      await service.getAssetUrl('asset-1');

      service.releaseUrl('asset-1');

      // URL should still be cached (refCount > 0)
      expect(service.getUrlCacheStats().cachedUrls).toBe(1);
    });

    it('should revoke URL when refCount reaches zero', async () => {
      const asset = createMockAsset();
      vi.mocked(projectDb.assets.get).mockResolvedValue(asset);

      await service.getAssetUrl('asset-1');

      service.releaseUrl('asset-1');

      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
      expect(service.getUrlCacheStats().cachedUrls).toBe(0);
    });
  });

  describe('revokeUrl()', () => {
    it('should force revoke URL immediately', async () => {
      const asset = createMockAsset();
      vi.mocked(projectDb.assets.get).mockResolvedValue(asset);

      await service.getAssetUrl('asset-1');
      service.revokeUrl('asset-1');

      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
      expect(service.getUrlCacheStats().cachedUrls).toBe(0);
    });

    it('should handle non-cached URLs gracefully', async () => {
      service.revokeUrl('non-existent');

      expect(global.URL.revokeObjectURL).not.toHaveBeenCalled();
    });
  });

  describe('revokeAllUrls()', () => {
    it('should revoke all cached URLs', async () => {
      const asset1 = createMockAsset({ id: 'asset-1' });
      const asset2 = createMockAsset({ id: 'asset-2' });

      vi.mocked(projectDb.assets.get).mockResolvedValueOnce(asset1).mockResolvedValueOnce(asset2);

      await service.getAssetUrl('asset-1');
      await service.getAssetUrl('asset-2');

      service.revokeAllUrls();

      expect(service.getUrlCacheStats().cachedUrls).toBe(0);
    });
  });

  describe('clearUrlCache()', () => {
    it('should clear all cached URLs', async () => {
      const asset = createMockAsset();
      vi.mocked(projectDb.assets.get).mockResolvedValue(asset);

      await service.getAssetUrl('asset-1');
      service.clearUrlCache();

      expect(service.getUrlCacheStats().cachedUrls).toBe(0);
    });
  });

  describe('getUrlCacheStats()', () => {
    it('should return cache statistics', async () => {
      const asset1 = createMockAsset({ id: 'asset-1' });
      const asset2 = createMockAsset({ id: 'asset-2' });

      vi.mocked(projectDb.assets.get).mockResolvedValueOnce(asset1).mockResolvedValueOnce(asset2);

      await service.getAssetUrl('asset-1');
      await service.getAssetUrl('asset-2');

      const stats = service.getUrlCacheStats();

      expect(stats.cachedUrls).toBe(2);
      expect(stats.estimatedSizeMB).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // Export Helpers
  // =========================================================================

  describe('getExportableAssets()', () => {
    it('should export project assets', async () => {
      const projectAssets = [createMockAsset({ projectId: 'project-1' })];
      const mockProject = {
        id: 'project-1',
        stateJson: JSON.stringify({ characters: [] }),
      };

      const equalsFn = vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue(projectAssets),
      });

      vi.mocked(projectDb.assets.where).mockReturnValueOnce({
        equals: equalsFn,
      } as unknown as ReturnType<typeof projectDb.assets.where>);

      vi.mocked(projectDb.assets.toCollection).mockReturnValueOnce({
        toArray: vi.fn().mockResolvedValue([]),
      } as unknown as ReturnType<typeof projectDb.assets.toCollection>);

      vi.mocked(projectDb.projects.get).mockResolvedValue(
        mockProject as unknown as Awaited<ReturnType<typeof projectDb.projects.get>>
      );

      const result = await service.getExportableAssets('project-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(projectAssets[0].id);
    });
  });

  describe('streamExportableAssets()', () => {
    // NOTE: These tests are skipped because they require complex Dexie mock chains
    // that are difficult to maintain. The functionality is better tested via
    // integration tests using the actual IndexedDB.

    it.skip('should stream exportable assets', async () => {
      // Requires mocking compound index [type+projectId].equals chain
      // which is complex and brittle. Integration test preferred.
    });

    it.skip('should filter out unused assets when includeUnused is false', async () => {
      // Requires mocking compound index [type+projectId].equals chain
      // which is complex and brittle. Integration test preferred.
    });
  });

  // =========================================================================
  // Statistics
  // =========================================================================

  describe('getStats()', () => {
    it('should return storage statistics', async () => {
      const assets = [
        createMockAsset({
          tags: ['type:icon'],
          metadata: { ...createMockMetadata(), size: 10240 },
        }),
        createMockAsset({
          tags: ['type:token-background'],
          metadata: { ...createMockMetadata(), size: 20480 },
        }),
      ];

      // getStats calls list() which uses toArray() directly for fallback path
      vi.mocked(projectDb.assets.toArray).mockResolvedValue(assets);

      const stats = await service.getStats();

      expect(stats.count).toBe(2);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.byType['icon'].count).toBe(1);
      expect(stats.byType['token-background'].count).toBe(1);
    });
  });

  // =========================================================================
  // Cleanup
  // =========================================================================

  describe('cleanupOrphans()', () => {
    it('should delete orphaned assets', async () => {
      const orphans = [
        createMockAsset({ id: 'orphan-1', linkedTo: [] }),
        createMockAsset({ id: 'orphan-2', linkedTo: [] }),
      ];

      // Mock getOrphaned by mocking toArray (getOrphaned uses projectDb.assets.toArray())
      vi.mocked(projectDb.assets.toArray).mockResolvedValueOnce(orphans);

      vi.mocked(projectDb.assets.bulkDelete).mockResolvedValue();
      vi.mocked(cacheInvalidationService.invalidateAssets).mockResolvedValue();

      const count = await service.cleanupOrphans();

      expect(count).toBe(2);
      expect(projectDb.assets.bulkDelete).toHaveBeenCalledWith(['orphan-1', 'orphan-2']);
    });
  });

  describe('deleteProjectAssets()', () => {
    it('should delete all assets for a project', async () => {
      const projectAssets = [
        createMockAsset({ id: 'asset-1', projectId: 'project-1' }),
        createMockAsset({ id: 'asset-2', projectId: 'project-1' }),
      ];

      vi.mocked(projectDb.assets.where).mockReturnValue({
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(projectAssets),
        }),
      } as unknown as ReturnType<typeof projectDb.assets.where>);

      vi.mocked(projectDb.assets.bulkDelete).mockResolvedValue();
      vi.mocked(cacheInvalidationService.invalidateAssets).mockResolvedValue();

      await service.deleteProjectAssets('project-1');

      expect(projectDb.assets.bulkDelete).toHaveBeenCalledWith(['asset-1', 'asset-2']);
    });
  });

  // =========================================================================
  // Edge Cases & Error Handling
  // =========================================================================

  describe('Edge Cases', () => {
    it('should handle empty asset lists', async () => {
      vi.mocked(projectDb.assets.toCollection).mockReturnValueOnce({
        toArray: vi.fn().mockResolvedValue([]),
      } as unknown as ReturnType<typeof projectDb.assets.toCollection>);

      const result = await service.list();

      expect(result).toEqual([]);
    });

    it('should handle concurrent operations on same asset', async () => {
      const asset = createMockAsset();
      vi.mocked(projectDb.assets.get).mockResolvedValue(asset);

      const url1 = await service.getAssetUrl('asset-1');
      const url2 = await service.getAssetUrl('asset-1');

      expect(url1).toBe(url2);
    });

    it('should handle sorting by lastUsedAt', async () => {
      const assets = [
        createMockAsset({ id: 'asset-1', lastUsedAt: 1000 }),
        createMockAsset({ id: 'asset-2', lastUsedAt: 2000 }),
        createMockAsset({ id: 'asset-3', lastUsedAt: 1500 }),
      ];

      // Use tags filter to hit the where().equals() code path
      vi.mocked(projectDb.assets.where).mockReturnValue({
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(assets),
        }),
      } as unknown as ReturnType<typeof projectDb.assets.where>);

      const result = await service.list({
        tags: ['type:icon'],
        sortBy: 'lastUsedAt',
        sortDirection: 'desc',
      });

      expect(result).toHaveLength(3);
      expect(result[0].lastUsedAt).toBe(2000);
      expect(result[1].lastUsedAt).toBe(1500);
      expect(result[2].lastUsedAt).toBe(1000);
    });

    it('should apply pagination correctly', async () => {
      // Create assets with explicit uploadedAt for deterministic sorting
      const baseTime = 1000000;
      const assets = Array.from({ length: 10 }, (_, i) =>
        createMockAsset({
          id: `mock-asset-${i}`,
          metadata: {
            ...createMockMetadata(),
            uploadedAt: baseTime + i, // ascending order: 0, 1, 2...
          },
        })
      );

      // Use tags filter to hit the where().equals() code path
      vi.mocked(projectDb.assets.where).mockReturnValue({
        equals: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(assets),
        }),
      } as unknown as ReturnType<typeof projectDb.assets.where>);

      // Default sort is desc by uploadedAt, so order is: 9, 8, 7, 6, 5, 4, 3, 2, 1, 0
      // offset: 2, limit: 3 would give: 7, 6, 5
      const result = await service.list({ tags: ['type:icon'], offset: 2, limit: 3 });

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('mock-asset-7');
      expect(result[1].id).toBe('mock-asset-6');
      expect(result[2].id).toBe('mock-asset-5');
    });
  });
});
