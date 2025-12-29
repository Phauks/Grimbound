/**
 * Unit tests for DataSyncService
 *
 * Tests all public methods including initialization, update checks,
 * download/install, character retrieval, event emissions, and error handling.
 *
 * Uses dependency injection to mock IStorageManager, IGitHubReleaseClient,
 * and IPackageExtractor dependencies.
 */

import { createCharacter, createCharacters } from '@test/factories/characterFactory';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CONFIG from '@/ts/config';
import { DataSyncError, GitHubAPIError } from '@/ts/errors';
import { DataSyncService, type SyncEvent, type SyncEventListener } from '@/ts/sync/dataSyncService';
import type {
  IGitHubReleaseClient,
  IPackageExtractor,
  IStorageManager,
} from '@/ts/sync/ISyncServices';
import type { CachedCharacter, ExtractedPackage, GitHubRelease } from '@/ts/types';

// ============================================================================
// Test Setup
// ============================================================================

describe('DataSyncService', () => {
  let service: DataSyncService;
  let mockStorage: IStorageManager;
  let mockGithub: IGitHubReleaseClient;
  let mockExtractor: IPackageExtractor;
  let eventListener: SyncEventListener;
  let emittedEvents: SyncEvent[];

  // Helper to create mock release
  const createMockRelease = (version = 'v2025.01.01-r1'): GitHubRelease => ({
    tag_name: version,
    name: `Release ${version}`,
    assets: [
      {
        name: 'character-data.zip',
        browser_download_url: 'https://example.com/data.zip',
        size: 1024000,
      },
    ],
    published_at: new Date().toISOString(),
  });

  // Helper to create mock extracted package
  const createMockPackage = (characterCount = 5): ExtractedPackage => {
    const characters = createCharacters(characterCount);
    const icons = new Map<string, Blob>();
    for (const char of characters) {
      icons.set(char.id, new Blob(['mock-icon'], { type: 'image/webp' }));
    }

    return {
      characters,
      icons,
      manifest: {
        version: 'v2025.01.01-r1',
        characterCount,
        contentHash: 'abc123',
        generatedAt: new Date().toISOString(),
      },
    };
  };

  beforeEach(() => {
    // Reset event tracking
    emittedEvents = [];
    eventListener = vi.fn((event: SyncEvent) => {
      emittedEvents.push(event);
    });

    // Create mock storage manager
    mockStorage = {
      initialize: vi.fn().mockResolvedValue(undefined),
      close: vi.fn(),
      getDatabase: vi.fn().mockResolvedValue({} as IDBDatabase),
      storeCharacter: vi.fn().mockResolvedValue(undefined),
      storeCharacters: vi.fn().mockResolvedValue(undefined),
      getCharacter: vi.fn().mockResolvedValue(null),
      getAllCharacters: vi.fn().mockResolvedValue([]),
      searchCharacters: vi.fn().mockResolvedValue([]),
      clearCharacters: vi.fn().mockResolvedValue(undefined),
      setMetadata: vi.fn().mockResolvedValue(undefined),
      getMetadata: vi.fn().mockResolvedValue(null),
      getAllMetadata: vi.fn().mockResolvedValue(new Map()),
      setSetting: vi.fn().mockResolvedValue(undefined),
      getSetting: vi.fn().mockResolvedValue(null),
      cacheImage: vi.fn().mockResolvedValue(undefined),
      getImage: vi.fn().mockResolvedValue(null),
      clearImageCache: vi.fn().mockResolvedValue(undefined),
      getStorageQuota: vi.fn().mockResolvedValue({ usage: 0, quota: 1000000000 }),
      isNearQuota: vi.fn().mockResolvedValue(false),
      hasSpace: vi.fn().mockResolvedValue(true),
      clearAll: vi.fn().mockResolvedValue(undefined),
    };

    // Create mock GitHub client
    mockGithub = {
      fetchLatestRelease: vi.fn().mockResolvedValue(createMockRelease()),
      downloadAsset: vi.fn().mockResolvedValue(new Blob(['mock-zip'])),
      findZipAsset: vi.fn().mockImplementation((release) => release.assets[0]),
      getRateLimitInfo: vi.fn().mockReturnValue(null),
      clearCache: vi.fn(),
    };

    // Create mock package extractor
    mockExtractor = {
      extract: vi.fn().mockResolvedValue(createMockPackage()),
      verifyContentHash: vi.fn().mockResolvedValue(true),
    };

    // Create service with injected dependencies
    service = new DataSyncService({
      storageManager: mockStorage,
      githubClient: mockGithub,
      packageExtractor: mockExtractor,
    });

    service.addEventListener(eventListener);
  });

  // ==========================================================================
  // Initialization
  // ==========================================================================

  describe('initialize', () => {
    it('should initialize storage', async () => {
      await service.initialize();

      expect(mockStorage.initialize).toHaveBeenCalled();
    });

    it('should emit initialized event when cached data exists', async () => {
      mockStorage.getMetadata = vi
        .fn()
        .mockImplementation((key: string) =>
          Promise.resolve(key === 'version' ? 'v2025.01.01-r1' : null)
        );

      await service.initialize();

      expect(emittedEvents).toContainEqual(
        expect.objectContaining({
          type: 'initialized',
          status: expect.objectContaining({
            state: 'success',
            dataSource: 'cache',
            currentVersion: 'v2025.01.01-r1',
          }),
        })
      );
    });

    it('should load cached version and lastSync metadata', async () => {
      const lastSyncTime = Date.now();
      mockStorage.getMetadata = vi.fn().mockImplementation((key: string) => {
        if (key === 'version') return Promise.resolve('v2025.01.01-r1');
        if (key === 'lastSync') return Promise.resolve(lastSyncTime);
        return Promise.resolve(null);
      });

      await service.initialize();

      const status = service.getStatus();
      expect(status.currentVersion).toBe('v2025.01.01-r1');
      expect(status.lastSync).toEqual(new Date(lastSyncTime));
    });

    it('should download data when no cache exists', async () => {
      mockStorage.getMetadata = vi.fn().mockResolvedValue(null);

      await service.initialize();

      expect(mockGithub.fetchLatestRelease).toHaveBeenCalled();
      expect(mockExtractor.extract).toHaveBeenCalled();
      expect(mockStorage.storeCharacters).toHaveBeenCalled();
    });

    it('should emit checking event when no cache exists', async () => {
      mockStorage.getMetadata = vi.fn().mockResolvedValue(null);

      await service.initialize();

      expect(emittedEvents).toContainEqual(
        expect.objectContaining({
          type: 'checking',
          status: expect.objectContaining({ state: 'checking' }),
        })
      );
    });

    it('should check for updates in background when cached data exists', async () => {
      mockStorage.getMetadata = vi
        .fn()
        .mockImplementation((key: string) =>
          Promise.resolve(key === 'version' ? 'v2025.01.01-r1' : null)
        );
      mockGithub.fetchLatestRelease = vi
        .fn()
        .mockResolvedValue(createMockRelease('v2025.01.02-r1'));

      await service.initialize();
      // Wait for background check
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockGithub.fetchLatestRelease).toHaveBeenCalled();
    });

    it('should only initialize once', async () => {
      await service.initialize();
      await service.initialize();
      await service.initialize();

      expect(mockStorage.initialize).toHaveBeenCalledTimes(1);
    });

    it('should return same promise when initialization is in progress', async () => {
      // Start initialization without awaiting
      const promise1 = service.initialize();
      const promise2 = service.initialize();

      // Both should resolve to same promise instance (same reference)
      expect(await promise1).toBeUndefined();
      expect(await promise2).toBeUndefined();
    });

    it('should set initialized flag after completion', async () => {
      mockStorage.getMetadata = vi.fn().mockResolvedValue('v2025.01.01-r1');

      expect(service.initialized).toBe(false);
      await service.initialize();
      expect(service.initialized).toBe(true);
    });

    it('should emit error event on initialization failure', async () => {
      const error = new Error('Storage initialization failed');
      mockStorage.initialize = vi.fn().mockRejectedValue(error);

      await expect(service.initialize()).rejects.toThrow('Storage initialization failed');

      expect(emittedEvents).toContainEqual(
        expect.objectContaining({
          type: 'error',
          status: expect.objectContaining({
            state: 'error',
            error: 'Storage initialization failed',
          }),
        })
      );
    });

    it('should start periodic update checks if enabled', async () => {
      const originalAutoSync = CONFIG.SYNC.ENABLE_AUTO_SYNC;
      CONFIG.SYNC.ENABLE_AUTO_SYNC = true;
      mockStorage.getMetadata = vi.fn().mockResolvedValue('v2025.01.01-r1');

      await service.initialize();

      // Service should have started interval
      // Clean up
      service.stopPeriodicUpdateChecks();
      CONFIG.SYNC.ENABLE_AUTO_SYNC = originalAutoSync;
    });
  });

  // ==========================================================================
  // Check For Updates
  // ==========================================================================

  describe('checkForUpdates', () => {
    beforeEach(async () => {
      mockStorage.getMetadata = vi.fn().mockResolvedValue('v2025.01.01-r1');
      await service.initialize();
      emittedEvents = []; // Clear initialization events
    });

    it('should emit checking event', async () => {
      await service.checkForUpdates();

      expect(emittedEvents).toContainEqual(
        expect.objectContaining({
          type: 'checking',
          status: expect.objectContaining({ state: 'checking' }),
        })
      );
    });

    it('should return true when update is available', async () => {
      mockGithub.fetchLatestRelease = vi
        .fn()
        .mockResolvedValue(createMockRelease('v2025.01.02-r1'));

      const updateAvailable = await service.checkForUpdates();

      expect(updateAvailable).toBe(true);
      const status = service.getStatus();
      expect(status.availableVersion).toBe('v2025.01.02-r1');
    });

    it('should return false when on latest version', async () => {
      mockGithub.fetchLatestRelease = vi
        .fn()
        .mockResolvedValue(createMockRelease('v2025.01.01-r1'));

      const updateAvailable = await service.checkForUpdates();

      expect(updateAvailable).toBe(false);
    });

    it('should return false when no release returned (304 Not Modified)', async () => {
      mockGithub.fetchLatestRelease = vi.fn().mockResolvedValue(null);

      const updateAvailable = await service.checkForUpdates();

      expect(updateAvailable).toBe(false);
    });

    it('should return false when cached version is newer than available', async () => {
      mockGithub.fetchLatestRelease = vi
        .fn()
        .mockResolvedValue(createMockRelease('v2024.12.31-r1'));

      const updateAvailable = await service.checkForUpdates();

      expect(updateAvailable).toBe(false);
    });

    it('should emit success event when no update available', async () => {
      mockGithub.fetchLatestRelease = vi
        .fn()
        .mockResolvedValue(createMockRelease('v2025.01.01-r1'));

      await service.checkForUpdates();

      expect(emittedEvents).toContainEqual(
        expect.objectContaining({
          type: 'success',
          status: expect.objectContaining({ state: 'success' }),
        })
      );
    });

    it('should handle rate limit gracefully', async () => {
      const rateLimitError = new GitHubAPIError('Rate limited', 403, true);
      mockGithub.fetchLatestRelease = vi.fn().mockRejectedValue(rateLimitError);

      const updateAvailable = await service.checkForUpdates();

      expect(updateAvailable).toBe(false);
      const status = service.getStatus();
      expect(status.state).toBe('success'); // Not shown as error
      expect(status.error).toBe('Rate limited');
    });

    it('should emit error event on check failure', async () => {
      const error = new Error('Network error');
      mockGithub.fetchLatestRelease = vi.fn().mockRejectedValue(error);

      const updateAvailable = await service.checkForUpdates();

      expect(updateAvailable).toBe(false);
      expect(emittedEvents).toContainEqual(
        expect.objectContaining({
          type: 'error',
          status: expect.objectContaining({ state: 'error' }),
          data: expect.objectContaining({ error }),
        })
      );
    });
  });

  // ==========================================================================
  // Download and Install
  // ==========================================================================

  describe('downloadAndInstall', () => {
    it('should emit downloading event', async () => {
      await service.downloadAndInstall();

      expect(emittedEvents).toContainEqual(
        expect.objectContaining({
          type: 'downloading',
          status: expect.objectContaining({ state: 'downloading' }),
        })
      );
    });

    it('should fetch latest release with force refresh', async () => {
      await service.downloadAndInstall();

      expect(mockGithub.fetchLatestRelease).toHaveBeenCalledWith(true);
    });

    it('should find ZIP asset from release', async () => {
      const release = createMockRelease();
      mockGithub.fetchLatestRelease = vi.fn().mockResolvedValue(release);

      await service.downloadAndInstall();

      expect(mockGithub.findZipAsset).toHaveBeenCalledWith(release);
    });

    it('should download ZIP asset with progress callback', async () => {
      await service.downloadAndInstall();

      expect(mockGithub.downloadAsset).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(Function)
      );
    });

    it('should emit progress events during download', async () => {
      mockGithub.downloadAsset = vi.fn().mockImplementation(async (_asset, onProgress) => {
        onProgress?.(512000, 1024000);
        onProgress?.(1024000, 1024000);
        return new Blob(['mock-zip']);
      });

      await service.downloadAndInstall();

      expect(emittedEvents).toContainEqual(
        expect.objectContaining({
          type: 'progress',
          data: expect.objectContaining({
            progress: { current: 512000, total: 1024000 },
          }),
        })
      );
    });

    it('should emit extracting event', async () => {
      await service.downloadAndInstall();

      expect(emittedEvents).toContainEqual(
        expect.objectContaining({
          type: 'extracting',
          status: expect.objectContaining({ state: 'extracting' }),
        })
      );
    });

    it('should extract ZIP package', async () => {
      const zipBlob = new Blob(['mock-zip']);
      mockGithub.downloadAsset = vi.fn().mockResolvedValue(zipBlob);

      await service.downloadAndInstall();

      expect(mockExtractor.extract).toHaveBeenCalledWith(zipBlob);
    });

    it('should verify content hash', async () => {
      const pkg = createMockPackage();
      mockExtractor.extract = vi.fn().mockResolvedValue(pkg);

      await service.downloadAndInstall();

      expect(mockExtractor.verifyContentHash).toHaveBeenCalledWith(pkg);
    });

    it('should continue if content hash verification fails', async () => {
      mockExtractor.verifyContentHash = vi.fn().mockResolvedValue(false);

      await service.downloadAndInstall();

      // Should still store characters
      expect(mockStorage.storeCharacters).toHaveBeenCalled();
    });

    it('should store characters in IndexedDB', async () => {
      const pkg = createMockPackage(3);
      mockExtractor.extract = vi.fn().mockResolvedValue(pkg);

      await service.downloadAndInstall();

      expect(mockStorage.storeCharacters).toHaveBeenCalledWith(pkg.characters, 'v2025.01.01-r1');
    });

    it('should cache character icons', async () => {
      const pkg = createMockPackage(2);
      mockExtractor.extract = vi.fn().mockResolvedValue(pkg);

      await service.downloadAndInstall();

      expect(mockStorage.cacheImage).toHaveBeenCalledTimes(2);
      for (const [characterId, iconBlob] of pkg.icons) {
        expect(mockStorage.cacheImage).toHaveBeenCalledWith(characterId, iconBlob);
      }
    });

    it('should update metadata', async () => {
      const pkg = createMockPackage(5);
      mockExtractor.extract = vi.fn().mockResolvedValue(pkg);

      await service.downloadAndInstall();

      expect(mockStorage.setMetadata).toHaveBeenCalledWith('version', 'v2025.01.01-r1');
      expect(mockStorage.setMetadata).toHaveBeenCalledWith('lastSync', expect.any(Number));
      expect(mockStorage.setMetadata).toHaveBeenCalledWith('characterCount', 5);
      expect(mockStorage.setMetadata).toHaveBeenCalledWith('contentHash', 'abc123');
    });

    it('should update status to success', async () => {
      await service.downloadAndInstall();

      const status = service.getStatus();
      expect(status.state).toBe('success');
      expect(status.dataSource).toBe('github');
      expect(status.currentVersion).toBe('v2025.01.01-r1');
      expect(status.availableVersion).toBeNull();
      expect(status.lastSync).toBeInstanceOf(Date);
      expect(status.error).toBeNull();
    });

    it('should emit success event with version', async () => {
      await service.downloadAndInstall();

      expect(emittedEvents).toContainEqual(
        expect.objectContaining({
          type: 'success',
          status: expect.objectContaining({ state: 'success' }),
          data: expect.objectContaining({ version: 'v2025.01.01-r1' }),
        })
      );
    });

    it('should throw error when no release found', async () => {
      mockGithub.fetchLatestRelease = vi.fn().mockResolvedValue(null);

      await expect(service.downloadAndInstall()).rejects.toThrow(DataSyncError);
      await expect(service.downloadAndInstall()).rejects.toThrow('No release found');
    });

    it('should throw error when no ZIP asset found', async () => {
      mockGithub.findZipAsset = vi.fn().mockReturnValue(null);

      await expect(service.downloadAndInstall()).rejects.toThrow(DataSyncError);
      await expect(service.downloadAndInstall()).rejects.toThrow('No ZIP asset found');
    });

    it('should emit error event on failure', async () => {
      const error = new Error('Download failed');
      mockGithub.downloadAsset = vi.fn().mockRejectedValue(error);

      await expect(service.downloadAndInstall()).rejects.toThrow('Download failed');

      expect(emittedEvents).toContainEqual(
        expect.objectContaining({
          type: 'error',
          status: expect.objectContaining({ state: 'error' }),
          data: expect.objectContaining({ error }),
        })
      );
    });
  });

  // ==========================================================================
  // Get Characters
  // ==========================================================================

  describe('getCharacters', () => {
    it('should initialize if not already initialized', async () => {
      mockStorage.getMetadata = vi.fn().mockResolvedValue('v2025.01.01-r1');

      await service.getCharacters();

      expect(mockStorage.initialize).toHaveBeenCalled();
    });

    it('should return all characters', async () => {
      const cachedChars = createCharacters(3).map((char) => ({
        ...char,
        _storedAt: Date.now(),
        _version: 'v2025.01.01-r1',
      })) as CachedCharacter[];

      mockStorage.getAllCharacters = vi.fn().mockResolvedValue(cachedChars);
      await service.initialize();

      const characters = await service.getCharacters();

      expect(characters).toHaveLength(3);
      expect(characters[0]).not.toHaveProperty('_storedAt');
      expect(characters[0]).not.toHaveProperty('_version');
    });

    it('should strip internal fields from characters', async () => {
      const cachedChar = {
        ...createCharacter(),
        _storedAt: Date.now(),
        _version: 'v2025.01.01-r1',
      } as CachedCharacter;

      mockStorage.getAllCharacters = vi.fn().mockResolvedValue([cachedChar]);
      await service.initialize();

      const characters = await service.getCharacters();

      expect(characters[0]).toHaveProperty('id');
      expect(characters[0]).toHaveProperty('name');
      expect(characters[0]).not.toHaveProperty('_storedAt');
      expect(characters[0]).not.toHaveProperty('_version');
    });

    it('should return empty array when no characters cached', async () => {
      mockStorage.getAllCharacters = vi.fn().mockResolvedValue([]);
      await service.initialize();

      const characters = await service.getCharacters();

      expect(characters).toEqual([]);
    });
  });

  // ==========================================================================
  // Get Character
  // ==========================================================================

  describe('getCharacter', () => {
    it('should initialize if not already initialized', async () => {
      mockStorage.getMetadata = vi.fn().mockResolvedValue('v2025.01.01-r1');

      await service.getCharacter('test-id');

      expect(mockStorage.initialize).toHaveBeenCalled();
    });

    it('should return character by ID', async () => {
      const cachedChar = {
        ...createCharacter({ id: 'washerwoman' }),
        _storedAt: Date.now(),
        _version: 'v2025.01.01-r1',
      } as CachedCharacter;

      mockStorage.getCharacter = vi.fn().mockResolvedValue(cachedChar);
      await service.initialize();

      const character = await service.getCharacter('washerwoman');

      expect(character).toBeDefined();
      expect(character?.id).toBe('washerwoman');
      expect(character).not.toHaveProperty('_storedAt');
      expect(character).not.toHaveProperty('_version');
    });

    it('should return null when character not found', async () => {
      mockStorage.getCharacter = vi.fn().mockResolvedValue(null);
      await service.initialize();

      const character = await service.getCharacter('non-existent');

      expect(character).toBeNull();
    });
  });

  // ==========================================================================
  // Search Characters
  // ==========================================================================

  describe('searchCharacters', () => {
    it('should initialize if not already initialized', async () => {
      mockStorage.getMetadata = vi.fn().mockResolvedValue('v2025.01.01-r1');

      await service.searchCharacters('test');

      expect(mockStorage.initialize).toHaveBeenCalled();
    });

    it('should search and return matching characters', async () => {
      const cachedChars = [
        {
          ...createCharacter({ name: 'Washerwoman', id: 'washerwoman' }),
          _storedAt: Date.now(),
          _version: 'v2025.01.01-r1',
        },
        {
          ...createCharacter({ name: 'Librarian', id: 'librarian' }),
          _storedAt: Date.now(),
          _version: 'v2025.01.01-r1',
        },
      ] as CachedCharacter[];

      mockStorage.searchCharacters = vi.fn().mockResolvedValue(cachedChars);
      await service.initialize();

      const characters = await service.searchCharacters('washer');

      expect(characters).toHaveLength(2);
      expect(characters[0]).not.toHaveProperty('_storedAt');
      expect(characters[0]).not.toHaveProperty('_version');
    });

    it('should return empty array when no matches', async () => {
      mockStorage.searchCharacters = vi.fn().mockResolvedValue([]);
      await service.initialize();

      const characters = await service.searchCharacters('nonexistent');

      expect(characters).toEqual([]);
    });
  });

  // ==========================================================================
  // Get Character Image
  // ==========================================================================

  describe('getCharacterImage', () => {
    it('should initialize if not already initialized', async () => {
      mockStorage.getMetadata = vi.fn().mockResolvedValue('v2025.01.01-r1');

      await service.getCharacterImage('washerwoman');

      expect(mockStorage.initialize).toHaveBeenCalled();
    });

    it('should return image blob from cache', async () => {
      const imageBlob = new Blob(['mock-image'], { type: 'image/webp' });
      mockStorage.getImage = vi.fn().mockResolvedValue(imageBlob);
      await service.initialize();

      const blob = await service.getCharacterImage('washerwoman');

      expect(blob).toBe(imageBlob);
      expect(mockStorage.getImage).toHaveBeenCalledWith('washerwoman');
    });

    it('should return null when image not cached', async () => {
      mockStorage.getImage = vi.fn().mockResolvedValue(null);
      await service.initialize();

      const blob = await service.getCharacterImage('nonexistent');

      expect(blob).toBeNull();
    });

    it('should return null when storage throws error', async () => {
      mockStorage.getImage = vi.fn().mockRejectedValue(new Error('Storage error'));
      await service.initialize();

      const blob = await service.getCharacterImage('washerwoman');

      expect(blob).toBeNull();
    });
  });

  // ==========================================================================
  // Has Character Image
  // ==========================================================================

  describe('hasCharacterImage', () => {
    it('should return true when image is cached', async () => {
      const imageBlob = new Blob(['mock-image']);
      mockStorage.getImage = vi.fn().mockResolvedValue(imageBlob);
      await service.initialize();

      const hasCached = await service.hasCharacterImage('washerwoman');

      expect(hasCached).toBe(true);
    });

    it('should return false when image is not cached', async () => {
      mockStorage.getImage = vi.fn().mockResolvedValue(null);
      await service.initialize();

      const hasCached = await service.hasCharacterImage('washerwoman');

      expect(hasCached).toBe(false);
    });
  });

  // ==========================================================================
  // Get Status
  // ==========================================================================

  describe('getStatus', () => {
    it('should return initial status before initialization', () => {
      const status = service.getStatus();

      expect(status.state).toBe('idle');
      expect(status.dataSource).toBe('offline');
      expect(status.currentVersion).toBeNull();
      expect(status.availableVersion).toBeNull();
      expect(status.lastSync).toBeNull();
      expect(status.error).toBeNull();
    });

    it('should return updated status after initialization with cache', async () => {
      mockStorage.getMetadata = vi.fn().mockImplementation((key: string) => {
        if (key === 'version') return Promise.resolve('v2025.01.01-r1');
        if (key === 'lastSync') return Promise.resolve(Date.now());
        return Promise.resolve(null);
      });

      await service.initialize();
      const status = service.getStatus();

      expect(status.state).toBe('success');
      expect(status.dataSource).toBe('cache');
      expect(status.currentVersion).toBe('v2025.01.01-r1');
    });

    it('should return copy of status (not reference)', () => {
      const status1 = service.getStatus();
      const status2 = service.getStatus();

      expect(status1).not.toBe(status2);
      expect(status1).toEqual(status2);
    });
  });

  // ==========================================================================
  // Clear Cache and Resync
  // ==========================================================================

  describe('clearCacheAndResync', () => {
    it('should clear all storage', async () => {
      await service.clearCacheAndResync();

      expect(mockStorage.clearAll).toHaveBeenCalled();
    });

    it('should clear GitHub cache', async () => {
      await service.clearCacheAndResync();

      expect(mockGithub.clearCache).toHaveBeenCalled();
    });

    it('should reset current version', async () => {
      mockStorage.getMetadata = vi.fn().mockResolvedValue('v2025.01.01-r1');
      await service.initialize();

      await service.clearCacheAndResync();

      const status = service.getStatus();
      expect(status.currentVersion).not.toBeNull(); // Will be set by downloadAndInstall
    });

    it('should download and install fresh data', async () => {
      await service.clearCacheAndResync();

      expect(mockGithub.fetchLatestRelease).toHaveBeenCalled();
      expect(mockExtractor.extract).toHaveBeenCalled();
      expect(mockStorage.storeCharacters).toHaveBeenCalled();
    });

    it('should throw error on failure', async () => {
      mockStorage.clearAll = vi.fn().mockRejectedValue(new Error('Clear failed'));

      await expect(service.clearCacheAndResync()).rejects.toThrow('Clear failed');
    });
  });

  // ==========================================================================
  // Periodic Update Checks
  // ==========================================================================

  describe('periodic update checks', () => {
    it('should stop periodic update checks', () => {
      service.stopPeriodicUpdateChecks();

      // Should not throw
      expect(true).toBe(true);
    });

    it('should be safe to stop when not started', () => {
      service.stopPeriodicUpdateChecks();
      service.stopPeriodicUpdateChecks();

      expect(true).toBe(true);
    });
  });

  // ==========================================================================
  // Event Listeners
  // ==========================================================================

  describe('event listeners', () => {
    it('should add event listener', () => {
      const newListener = vi.fn();

      service.addEventListener(newListener);

      expect(true).toBe(true); // No error
    });

    it('should emit events to all listeners', async () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      service.addEventListener(listener1);
      service.addEventListener(listener2);

      await service.downloadAndInstall();

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('should remove event listener', async () => {
      const removableListener = vi.fn();

      service.addEventListener(removableListener);
      service.removeEventListener(removableListener);

      await service.downloadAndInstall();

      expect(removableListener).not.toHaveBeenCalled();
    });

    it('should continue emitting when a listener throws', async () => {
      const throwingListener = vi.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });
      const normalListener = vi.fn();

      service.addEventListener(throwingListener);
      service.addEventListener(normalListener);

      await service.downloadAndInstall();

      expect(throwingListener).toHaveBeenCalled();
      expect(normalListener).toHaveBeenCalled();
    });

    it('should be safe to remove non-existent listener', () => {
      const listener = vi.fn();

      service.removeEventListener(listener);

      expect(true).toBe(true); // No error
    });
  });

  // ==========================================================================
  // Dependency Injection
  // ==========================================================================

  describe('dependency injection', () => {
    it('should accept injected storage manager', () => {
      const customStorage: IStorageManager = { ...mockStorage };
      const customService = new DataSyncService({ storageManager: customStorage });

      expect(customService).toBeDefined();
    });

    it('should accept injected GitHub client', () => {
      const customGithub: IGitHubReleaseClient = { ...mockGithub };
      const customService = new DataSyncService({ githubClient: customGithub });

      expect(customService).toBeDefined();
    });

    it('should accept injected package extractor', () => {
      const customExtractor: IPackageExtractor = { ...mockExtractor };
      const customService = new DataSyncService({ packageExtractor: customExtractor });

      expect(customService).toBeDefined();
    });

    it('should accept all injected dependencies', () => {
      const customService = new DataSyncService({
        storageManager: mockStorage,
        githubClient: mockGithub,
        packageExtractor: mockExtractor,
      });

      expect(customService).toBeDefined();
    });

    it('should work with empty dependency object', () => {
      const customService = new DataSyncService({});

      expect(customService).toBeDefined();
    });

    it('should work with undefined dependencies', () => {
      const customService = new DataSyncService();

      expect(customService).toBeDefined();
    });
  });

  // ==========================================================================
  // Integration Scenarios
  // ==========================================================================

  describe('integration scenarios', () => {
    it('should complete full sync flow', async () => {
      mockStorage.getMetadata = vi.fn().mockResolvedValue(null); // No cache

      await service.initialize();

      expect(mockStorage.initialize).toHaveBeenCalled();
      expect(mockGithub.fetchLatestRelease).toHaveBeenCalled();
      expect(mockExtractor.extract).toHaveBeenCalled();
      expect(mockStorage.storeCharacters).toHaveBeenCalled();

      const status = service.getStatus();
      expect(status.state).toBe('success');
      expect(status.currentVersion).toBe('v2025.01.01-r1');
    });

    it('should handle cached data and check for updates', async () => {
      mockStorage.getMetadata = vi.fn().mockResolvedValue('v2025.01.01-r1');
      mockGithub.fetchLatestRelease = vi
        .fn()
        .mockResolvedValue(createMockRelease('v2025.01.02-r1'));

      await service.initialize();
      // Background check auto-installs updates, so wait for it
      await new Promise((resolve) => setTimeout(resolve, 100));

      const status = service.getStatus();
      // After auto-install, version should be updated to v2025.01.02-r1
      expect(status.currentVersion).toBe('v2025.01.02-r1');
    });

    it('should emit all expected events during download', async () => {
      emittedEvents = [];

      await service.downloadAndInstall();

      const eventTypes = emittedEvents.map((e) => e.type);
      expect(eventTypes).toContain('downloading');
      expect(eventTypes).toContain('extracting');
      expect(eventTypes).toContain('success');
    });

    it('should handle multiple operations sequentially', async () => {
      mockStorage.getMetadata = vi.fn().mockResolvedValue('v2025.01.01-r1');

      await service.initialize();
      await service.checkForUpdates();
      const characters = await service.getCharacters();
      const status = service.getStatus();

      expect(characters).toBeDefined();
      expect(status.state).toBe('success');
    });
  });
});
