import { vi } from 'vitest';
import type { IAssetStorageService } from '@/ts/services/upload/IUploadServices';
import { getTypeFromTags } from '@/ts/services/upload/tagUtils';
import type { AssetFilter, AssetWithUrl, DBAsset } from '@/ts/services/upload/types';

/**
 * Create a mock AssetStorageService for testing.
 */
export function createMockAssetStorageService(
  overrides: Partial<IAssetStorageService> = {}
): IAssetStorageService {
  const assets = new Map<string, DBAsset>();
  let idCounter = 0;

  const createMockAsset = (id: string, tags: string[] = ['type:icon']): DBAsset => ({
    id,
    tags,
    folder: null, // null = root
    projectId: null, // null = global
    blob: new Blob(['mock-data']),
    thumbnail: new Blob(['mock-thumbnail']),
    metadata: {
      filename: `Asset ${id}`,
      mimeType: 'image/webp',
      size: 1000,
      width: 256,
      height: 256,
      uploadedAt: Date.now(),
      sourceType: 'upload',
    },
    linkedTo: [],
  });

  return {
    // CRUD Operations
    save: vi.fn().mockImplementation(async (data) => {
      const id = `mock-asset-${++idCounter}`;
      const asset = createMockAsset(id, data.tags);
      asset.metadata.filename = data.metadata?.filename ?? `Asset ${id}`;
      assets.set(id, asset);
      return id;
    }),
    getById: vi.fn().mockImplementation(async (id: string) => assets.get(id)),
    getByIdWithUrl: vi.fn().mockImplementation(async (id: string) => {
      const asset = assets.get(id);
      if (!asset) return undefined;
      return {
        ...asset,
        url: `blob:mock-url-${id}`,
        thumbnailUrl: `blob:mock-thumb-${id}`,
      } as AssetWithUrl;
    }),
    update: vi.fn().mockImplementation(async (id: string, updates) => {
      const existing = assets.get(id);
      if (existing) {
        assets.set(id, { ...existing, ...updates, updatedAt: Date.now() });
      }
    }),
    delete: vi.fn().mockImplementation(async (id: string) => {
      assets.delete(id);
    }),
    bulkDelete: vi.fn().mockImplementation(async (ids: string[]) => {
      for (const id of ids) assets.delete(id);
    }),
    bulkUpdate: vi.fn().mockResolvedValue(undefined),

    // Query Operations
    list: vi.fn().mockImplementation(async (_filter?: AssetFilter) => Array.from(assets.values())),
    count: vi.fn().mockImplementation(async () => assets.size),
    listWithUrls: vi.fn().mockImplementation(async () =>
      Array.from(assets.values()).map((a) => ({
        ...a,
        url: `blob:mock-url-${a.id}`,
        thumbnailUrl: `blob:mock-thumb-${a.id}`,
      }))
    ),
    getByType: vi
      .fn()
      .mockImplementation(async (typeTagValue: string) =>
        Array.from(assets.values()).filter((a) => getTypeFromTags(a.tags) === typeTagValue)
      ),
    findByHash: vi.fn().mockResolvedValue(undefined),
    getByProject: vi.fn().mockResolvedValue([]),
    getGlobal: vi
      .fn()
      .mockImplementation(async () =>
        Array.from(assets.values()).filter((a) => a.projectId === null)
      ),
    getOrphaned: vi.fn().mockResolvedValue([]),
    getByCharacter: vi.fn().mockResolvedValue([]),

    // Linking Operations
    linkToCharacter: vi.fn().mockResolvedValue(undefined),
    unlinkFromCharacter: vi.fn().mockResolvedValue(undefined),
    replaceCharacterLink: vi.fn().mockResolvedValue(undefined),
    trackAssetUsage: vi.fn().mockResolvedValue(undefined),

    // Scope Operations
    promoteToGlobal: vi.fn().mockResolvedValue(undefined),
    moveToProject: vi.fn().mockResolvedValue(undefined),
    bulkPromoteToGlobal: vi.fn().mockResolvedValue(undefined),
    bulkMoveToProject: vi.fn().mockResolvedValue(undefined),

    // URL Management
    getAssetUrl: vi.fn().mockImplementation(async (id: string) => `blob:mock-url-${id}`),
    getAssetUrlTracked: vi.fn().mockImplementation(async (id: string) => `blob:mock-url-${id}`),
    getThumbnailUrl: vi.fn().mockImplementation(async (id: string) => `blob:mock-thumb-${id}`),
    getThumbnailUrlTracked: vi
      .fn()
      .mockImplementation(async (id: string) => `blob:mock-thumb-${id}`),
    releaseUrl: vi.fn(),
    revokeUrl: vi.fn(),
    revokeAllUrls: vi.fn(),
    getUrlCacheStats: vi.fn().mockReturnValue({ cachedUrls: 0, estimatedSizeMB: 0 }),
    clearUrlCache: vi.fn(),

    // Export Helpers
    getExportableAssets: vi.fn().mockResolvedValue([]),
    streamExportableAssets: vi.fn().mockImplementation(async function* () {
      // Empty generator
    }),

    // Statistics & Cleanup
    getStats: vi.fn().mockResolvedValue({
      count: 0,
      totalSize: 0,
      totalSizeMB: 0,
      byType: {},
    }),
    cleanupOrphans: vi.fn().mockResolvedValue(0),
    deleteProjectAssets: vi.fn().mockResolvedValue(undefined),

    ...overrides,
  };
}
