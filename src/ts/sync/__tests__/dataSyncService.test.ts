/**
 * Blood on the Clocktower Token Generator
 * Data Sync Service Unit Tests
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Character, GitHubRelease } from '../../types/index.js';
import { DataSyncService, type SyncEvent } from '../dataSyncService.js';

// Mock modules
vi.mock('../storageManager.js', () => ({
  storageManager: {
    initialize: vi.fn().mockResolvedValue(undefined),
    getMetadata: vi.fn().mockResolvedValue(null),
    setMetadata: vi.fn().mockResolvedValue(undefined),
    getAllCharacters: vi.fn().mockResolvedValue([]),
    getCharacter: vi.fn().mockResolvedValue(null),
    searchCharacters: vi.fn().mockResolvedValue([]),
    storeCharacters: vi.fn().mockResolvedValue(undefined),
    cacheImage: vi.fn().mockResolvedValue(undefined),
    clearAll: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../githubReleaseClient.js', () => ({
  githubReleaseClient: {
    fetchLatestRelease: vi.fn().mockResolvedValue(null),
    downloadAsset: vi.fn().mockResolvedValue(new Blob()),
    findZipAsset: vi.fn().mockReturnValue(null),
    clearCache: vi.fn(),
  },
}));

vi.mock('../packageExtractor.js', () => ({
  packageExtractor: {
    extract: vi.fn().mockResolvedValue({
      characters: [],
      manifest: {
        version: 'v2025.12.03-r6',
        contentHash: 'test',
        characterCount: 0,
      },
      icons: new Map(),
    }),
    verifyContentHash: vi.fn().mockResolvedValue(true),
  },
}));

describe('DataSyncService', () => {
  let service: DataSyncService;
  let events: SyncEvent[];

  beforeEach(() => {
    service = new DataSyncService();
    events = [];

    // Capture events
    service.addEventListener((event) => {
      events.push(event);
    });

    // Clear all mock implementations
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully with cached data', async () => {
      const { storageManager } = await import('../storageManager.js');

      // Mock cached data exists
      vi.mocked(storageManager.getMetadata)
        .mockResolvedValueOnce('v2025.12.03-r6') // version
        .mockResolvedValueOnce(Date.now()); // lastSync

      await service.initialize();

      expect(service.initialized).toBe(true);
      expect(service.getStatus().currentVersion).toBe('v2025.12.03-r6');
      expect(service.getStatus().dataSource).toBe('cache');
    });

    it('should handle multiple initialization calls', async () => {
      const { storageManager } = await import('../storageManager.js');

      vi.mocked(storageManager.getMetadata).mockResolvedValue('v2025.12.03-r6');

      await Promise.all([service.initialize(), service.initialize(), service.initialize()]);

      expect(service.initialized).toBe(true);
      // Should only initialize once
      expect(vi.mocked(storageManager.initialize)).toHaveBeenCalledTimes(1);
    });
  });

  describe('checkForUpdates', () => {
    it('should detect when no update is available', async () => {
      const { storageManager } = await import('../storageManager.js');
      const { githubReleaseClient } = await import('../githubReleaseClient.js');

      // Mock current version
      vi.mocked(storageManager.getMetadata).mockResolvedValue('v2025.12.03-r6');
      await service.initialize();

      // Mock GitHub returns same version
      const mockRelease: GitHubRelease = {
        tag_name: 'v2025.12.03-r6',
        name: 'Release',
        published_at: '2025-12-03',
        assets: [],
      };
      vi.mocked(githubReleaseClient.fetchLatestRelease).mockResolvedValue(mockRelease);

      const hasUpdate = await service.checkForUpdates();

      expect(hasUpdate).toBe(false);
    });

    it('should detect when update is available', async () => {
      const { storageManager } = await import('../storageManager.js');
      const { githubReleaseClient } = await import('../githubReleaseClient.js');

      // Mock current version
      vi.mocked(storageManager.getMetadata).mockResolvedValue('v2025.12.03-r5');
      await service.initialize();

      // Mock GitHub returns newer version
      const mockRelease: GitHubRelease = {
        tag_name: 'v2025.12.03-r6',
        name: 'Release',
        published_at: '2025-12-03',
        assets: [],
      };
      vi.mocked(githubReleaseClient.fetchLatestRelease).mockResolvedValue(mockRelease);

      const hasUpdate = await service.checkForUpdates();

      expect(hasUpdate).toBe(true);
      expect(service.getStatus().availableVersion).toBe('v2025.12.03-r6');
    });

    it('should handle 304 Not Modified response', async () => {
      const { storageManager } = await import('../storageManager.js');
      const { githubReleaseClient } = await import('../githubReleaseClient.js');

      vi.mocked(storageManager.getMetadata).mockResolvedValue('v2025.12.03-r6');
      await service.initialize();

      // Mock 304 response (null return)
      vi.mocked(githubReleaseClient.fetchLatestRelease).mockResolvedValue(null);

      const hasUpdate = await service.checkForUpdates();

      expect(hasUpdate).toBe(false);
    });
  });

  describe('getCharacters', () => {
    it('should return characters from storage', async () => {
      const { storageManager } = await import('../storageManager.js');

      const mockCharacters: Character[] = [
        {
          id: 'washerwoman',
          name: 'Washerwoman',
          team: 'townsfolk',
          image: 'test.webp',
        },
      ];

      vi.mocked(storageManager.getAllCharacters).mockResolvedValue(mockCharacters as any);
      vi.mocked(storageManager.getMetadata).mockResolvedValue('v2025.12.03-r6');

      await service.initialize();
      const characters = await service.getCharacters();

      expect(characters).toEqual(mockCharacters);
    });

    it('should strip internal fields from characters', async () => {
      const { storageManager } = await import('../storageManager.js');

      const mockCachedCharacter = {
        id: 'washerwoman',
        name: 'Washerwoman',
        team: 'townsfolk',
        image: 'test.webp',
        _storedAt: Date.now(),
        _version: 'v2025.12.03-r6',
      };

      vi.mocked(storageManager.getAllCharacters).mockResolvedValue([mockCachedCharacter] as any);
      vi.mocked(storageManager.getMetadata).mockResolvedValue('v2025.12.03-r6');

      await service.initialize();
      const characters = await service.getCharacters();

      expect(characters[0]).not.toHaveProperty('_storedAt');
      expect(characters[0]).not.toHaveProperty('_version');
    });
  });

  describe('event emission', () => {
    it('should emit events to listeners', async () => {
      const { storageManager } = await import('../storageManager.js');

      vi.mocked(storageManager.getMetadata).mockResolvedValue('v2025.12.03-r6');

      await service.initialize();

      expect(events.length).toBeGreaterThan(0);
      expect(events.some((e) => e.type === 'initialized')).toBe(true);
    });

    it('should handle listener removal', () => {
      const listener = vi.fn();

      service.addEventListener(listener);
      service.removeEventListener(listener);

      // Trigger an event
      service.getStatus(); // This shouldn't trigger anything

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('clearCacheAndResync', () => {
    it('should clear all data and re-download', async () => {
      const { storageManager } = await import('../storageManager.js');
      const { githubReleaseClient } = await import('../githubReleaseClient.js');

      vi.mocked(storageManager.getMetadata).mockResolvedValue('v2025.12.03-r6');
      await service.initialize();

      // Mock successful download
      const mockRelease: GitHubRelease = {
        tag_name: 'v2025.12.03-r7',
        name: 'Release',
        published_at: '2025-12-03',
        assets: [
          {
            name: 'package.zip',
            url: 'http://api.test.com/repos/test/releases/assets/456',
            browser_download_url: 'http://test.com/package.zip',
            size: 1000,
            content_type: 'application/zip',
          },
        ],
      };

      vi.mocked(githubReleaseClient.fetchLatestRelease).mockResolvedValue(mockRelease);
      vi.mocked(githubReleaseClient.findZipAsset).mockReturnValue(mockRelease.assets[0]);

      await service.clearCacheAndResync();

      expect(storageManager.clearAll).toHaveBeenCalled();
      expect(githubReleaseClient.clearCache).toHaveBeenCalled();
    });
  });
});
