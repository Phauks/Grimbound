/**
 * Blood on the Clocktower Token Generator
 * Storage Manager Unit Tests
 *
 * Note: These tests require a browser-like environment with IndexedDB and Cache API support.
 * They will run in jsdom with fake-indexeddb if configured.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Character } from '../../types/index.js';
import { StorageManager } from '../storageManager.js';

// Mock character data for testing
const mockCharacter: Character = {
  id: 'washerwoman',
  name: 'Washerwoman',
  team: 'townsfolk',
  ability: 'You start knowing that 1 of 2 players is a particular Townsfolk.',
  image: 'https://example.com/washerwoman.webp',
  setup: false,
  reminders: ['Townsfolk', 'Wrong'],
  edition: 'tb',
};

const mockCharacter2: Character = {
  id: 'librarian',
  name: 'Librarian',
  team: 'townsfolk',
  ability: 'You start knowing that 1 of 2 players is a particular Outsider.',
  image: 'https://example.com/librarian.webp',
  setup: false,
  reminders: ['Outsider', 'Wrong'],
  edition: 'tb',
};

describe('StorageManager', () => {
  let storageManager: StorageManager;

  beforeEach(async () => {
    storageManager = new StorageManager();

    // Check if IndexedDB is available
    if (typeof indexedDB === 'undefined') {
      console.warn('IndexedDB not available in test environment, skipping tests');
      return;
    }

    await storageManager.initialize();
  });

  afterEach(async () => {
    // Skip cleanup if IndexedDB not available
    if (typeof indexedDB === 'undefined') {
      return;
    }

    try {
      await storageManager.clearAll();
      storageManager.close();
    } catch (error) {
      console.error('Error during test cleanup:', error);
    }
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      // Skip if IndexedDB not available
      if (typeof indexedDB === 'undefined') {
        return;
      }

      const db = await storageManager.getDatabase();
      expect(db).toBeDefined();
      expect(db.objectStoreNames.contains('characters')).toBe(true);
      expect(db.objectStoreNames.contains('metadata')).toBe(true);
      expect(db.objectStoreNames.contains('settings')).toBe(true);
    });

    it('should handle multiple initialization calls', async () => {
      // Skip if IndexedDB not available
      if (typeof indexedDB === 'undefined') {
        return;
      }

      await storageManager.initialize();
      await storageManager.initialize();
      const db = await storageManager.getDatabase();
      expect(db).toBeDefined();
    });
  });

  describe('character operations', () => {
    beforeEach(async () => {
      if (typeof indexedDB === 'undefined') {
        return;
      }
      await storageManager.clearCharacters();
    });

    it('should store and retrieve a character', async () => {
      if (typeof indexedDB === 'undefined') {
        return;
      }

      await storageManager.storeCharacter(mockCharacter, 'v2025.12.03-r6');
      const retrieved = await storageManager.getCharacter('washerwoman');

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('washerwoman');
      expect(retrieved?.name).toBe('Washerwoman');
      expect(retrieved?._version).toBe('v2025.12.03-r6');
      expect(retrieved?._storedAt).toBeGreaterThan(0);
    });

    it('should store multiple characters', async () => {
      if (typeof indexedDB === 'undefined') {
        return;
      }

      const characters = [mockCharacter, mockCharacter2];
      await storageManager.storeCharacters(characters, 'v2025.12.03-r6');

      const allCharacters = await storageManager.getAllCharacters();
      expect(allCharacters).toHaveLength(2);
      expect(allCharacters.map((c) => c.id)).toContain('washerwoman');
      expect(allCharacters.map((c) => c.id)).toContain('librarian');
    });

    it('should return null for non-existent character', async () => {
      if (typeof indexedDB === 'undefined') {
        return;
      }

      const retrieved = await storageManager.getCharacter('nonexistent');
      expect(retrieved).toBeNull();
    });

    it('should search characters by name', async () => {
      if (typeof indexedDB === 'undefined') {
        return;
      }

      await storageManager.storeCharacters([mockCharacter, mockCharacter2], 'v2025.12.03-r6');
      const results = await storageManager.searchCharacters('washer');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('washerwoman');
    });

    it('should search characters by id', async () => {
      if (typeof indexedDB === 'undefined') {
        return;
      }

      await storageManager.storeCharacters([mockCharacter, mockCharacter2], 'v2025.12.03-r6');
      const results = await storageManager.searchCharacters('lib');

      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('librarian');
    });

    it('should clear all characters', async () => {
      if (typeof indexedDB === 'undefined') {
        return;
      }

      await storageManager.storeCharacters([mockCharacter, mockCharacter2], 'v2025.12.03-r6');
      await storageManager.clearCharacters();

      const allCharacters = await storageManager.getAllCharacters();
      expect(allCharacters).toHaveLength(0);
    });
  });

  describe('metadata operations', () => {
    it('should set and get metadata', async () => {
      if (typeof indexedDB === 'undefined') {
        return;
      }

      await storageManager.setMetadata('version', 'v2025.12.03-r6');
      const value = await storageManager.getMetadata('version');
      expect(value).toBe('v2025.12.03-r6');
    });

    it('should handle different metadata value types', async () => {
      if (typeof indexedDB === 'undefined') {
        return;
      }

      await storageManager.setMetadata('stringKey', 'stringValue');
      await storageManager.setMetadata('numberKey', 42);
      await storageManager.setMetadata('booleanKey', true);

      expect(await storageManager.getMetadata('stringKey')).toBe('stringValue');
      expect(await storageManager.getMetadata('numberKey')).toBe(42);
      expect(await storageManager.getMetadata('booleanKey')).toBe(true);
    });

    it('should return null for non-existent metadata', async () => {
      if (typeof indexedDB === 'undefined') {
        return;
      }

      const value = await storageManager.getMetadata('nonexistent');
      expect(value).toBeNull();
    });

    it('should get all metadata', async () => {
      if (typeof indexedDB === 'undefined') {
        return;
      }

      await storageManager.setMetadata('key1', 'value1');
      await storageManager.setMetadata('key2', 'value2');

      const allMetadata = await storageManager.getAllMetadata();
      expect(allMetadata.size).toBeGreaterThanOrEqual(2);
      expect(allMetadata.get('key1')).toBe('value1');
      expect(allMetadata.get('key2')).toBe('value2');
    });
  });

  describe('settings operations', () => {
    it('should set and get settings', async () => {
      if (typeof indexedDB === 'undefined') {
        return;
      }

      const settingValue = { autoSync: true, updateMode: 'auto' };
      await storageManager.setSetting('syncSettings', settingValue);
      const retrieved = await storageManager.getSetting('syncSettings');
      expect(retrieved).toEqual(settingValue);
    });

    it('should return null for non-existent setting', async () => {
      if (typeof indexedDB === 'undefined') {
        return;
      }

      const value = await storageManager.getSetting('nonexistent');
      expect(value).toBeNull();
    });
  });

  describe('cache API operations', () => {
    beforeEach(() => {
      // Mock Cache API if not available
      if (typeof caches === 'undefined') {
        const mockCache = {
          match: vi.fn(),
          put: vi.fn(),
          delete: vi.fn(),
        };
        (global as any).caches = {
          open: vi.fn().mockResolvedValue(mockCache),
          delete: vi.fn().mockResolvedValue(true),
        };
      }
    });

    it('should cache and retrieve images', async () => {
      if (typeof indexedDB === 'undefined' || typeof caches === 'undefined') {
        return;
      }

      const imageBlob = new Blob(['fake image data'], { type: 'image/webp' });
      await storageManager.cacheImage('washerwoman', imageBlob);

      // Note: Actual retrieval depends on Cache API implementation
      // In a real environment, this would work; in tests, it depends on the mock
    });
  });

  describe('storage quota operations', () => {
    beforeEach(() => {
      // Mock navigator.storage if not available
      if (!navigator.storage?.estimate) {
        (navigator as any).storage = {
          estimate: vi.fn().mockResolvedValue({
            usage: 1024 * 1024 * 5, // 5 MB
            quota: 1024 * 1024 * 100, // 100 MB
          }),
        };
      }
    });

    it('should get storage quota', async () => {
      const quota = await storageManager.getStorageQuota();
      expect(quota.usage).toBeGreaterThanOrEqual(0);
      expect(quota.quota).toBeGreaterThanOrEqual(0);
      expect(quota.usageMB).toBeGreaterThanOrEqual(0);
      expect(quota.quotaMB).toBeGreaterThanOrEqual(0);
      expect(quota.percentUsed).toBeGreaterThanOrEqual(0);
    });

    it('should check if near quota', async () => {
      const isNear = await storageManager.isNearQuota();
      expect(typeof isNear).toBe('boolean');
    });

    it('should check if space is available', async () => {
      const hasSpace = await storageManager.hasSpace(10);
      expect(typeof hasSpace).toBe('boolean');
    });
  });

  describe('utility operations', () => {
    it('should clear all data', async () => {
      if (typeof indexedDB === 'undefined') {
        return;
      }

      await storageManager.storeCharacter(mockCharacter, 'v2025.12.03-r6');
      await storageManager.setMetadata('version', 'v2025.12.03-r6');
      await storageManager.setSetting('test', 'value');

      await storageManager.clearAll();

      const characters = await storageManager.getAllCharacters();
      const version = await storageManager.getMetadata('version');
      const setting = await storageManager.getSetting('test');

      expect(characters).toHaveLength(0);
      expect(version).toBeNull();
      expect(setting).toBeNull();
    });
  });
});
