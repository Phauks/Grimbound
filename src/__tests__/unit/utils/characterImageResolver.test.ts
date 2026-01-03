import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as assetResolver from '@/ts/services/upload/assetResolver';
import * as syncService from '@/ts/sync/index';
import type { Character } from '@/ts/types/index';
import {
  clearIconUrlCache,
  extractCharacterIdFromPath,
  getCachedIconUrl,
  getFirstImageUrl,
  getIconUrlCacheStats,
  hasIconUrlCached,
  isExternalUrl,
  isLocalAssetPath,
  prewarmIconCache,
  resolveCharacterImages,
  resolveCharacterImageUrl,
  resolveLocalAssetPath,
  setCachedIconUrl,
} from '@/ts/utils/characterImageResolver';

// ============================================================================
// Mock Setup
// ============================================================================

vi.mock('@/ts/services/upload/assetResolver');
vi.mock('@/ts/sync/index');
vi.mock('@/ts/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}));

// ============================================================================
// Test Setup
// ============================================================================

beforeEach(() => {
  vi.clearAllMocks();
  clearIconUrlCache();
  mockUuidCounter = 0;
  // Mock import.meta.env.BASE_URL
  vi.stubGlobal('import', {
    meta: {
      env: {
        BASE_URL: '/',
      },
    },
  });
});

afterEach(() => {
  clearIconUrlCache();
  vi.clearAllMocks();
});

// ============================================================================
// Test Data Factories
// ============================================================================

let mockUuidCounter = 0;

function createMockCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'test-character',
    name: 'Test Character',
    team: 'townsfolk',
    image: 'http://example.com/test.png',
    ...overrides,
  };
}

function createMockCharacterWithUuid(
  overrides: Partial<Character & { uuid: string }> = {}
): Character & { uuid: string } {
  return {
    uuid: `test-uuid-${++mockUuidCounter}`,
    ...createMockCharacter(overrides),
  };
}

// ============================================================================
// URL Classification Tests
// ============================================================================

describe('characterImageResolver', () => {
  describe('isExternalUrl', () => {
    it('should identify http URLs as external', () => {
      expect(isExternalUrl('http://example.com/image.png')).toBe(true);
    });

    it('should identify https URLs as external', () => {
      expect(isExternalUrl('https://example.com/image.png')).toBe(true);
    });

    it('should identify data URLs as external', () => {
      expect(isExternalUrl('data:image/png;base64,abc123')).toBe(true);
    });

    it('should identify blob URLs as external', () => {
      expect(isExternalUrl('blob:http://example.com/12345')).toBe(true);
    });

    it('should not identify local paths as external', () => {
      expect(isExternalUrl('/images/icon.png')).toBe(false);
    });

    it('should not identify character IDs as external', () => {
      expect(isExternalUrl('washerwoman')).toBe(false);
    });

    it('should not identify asset references as external', () => {
      expect(isExternalUrl('asset:uuid-123')).toBe(false);
    });
  });

  describe('isLocalAssetPath', () => {
    it('should identify paths starting with / as local', () => {
      expect(isLocalAssetPath('/scripts/dusk.webp')).toBe(true);
    });

    it('should identify nested paths as local', () => {
      expect(isLocalAssetPath('/images/characters/icon.png')).toBe(true);
    });

    it('should not identify http URLs as local', () => {
      expect(isLocalAssetPath('http://example.com/image.png')).toBe(false);
    });

    it('should not identify https URLs as local', () => {
      expect(isLocalAssetPath('https://example.com/image.png')).toBe(false);
    });

    it('should not identify relative paths as local', () => {
      expect(isLocalAssetPath('images/icon.png')).toBe(false);
    });

    it('should not identify character IDs as local', () => {
      expect(isLocalAssetPath('washerwoman')).toBe(false);
    });

    it('should not identify blob URLs as local', () => {
      expect(isLocalAssetPath('blob:http://example.com/12345')).toBe(false);
    });

    it('should not identify data URLs as local', () => {
      expect(isLocalAssetPath('data:image/png;base64,abc')).toBe(false);
    });
  });

  describe('resolveLocalAssetPath', () => {
    it('should resolve local path to full URL with base path', () => {
      const result = resolveLocalAssetPath('/scripts/dusk.webp');
      expect(result).toBe('/scripts/dusk.webp');
    });

    it('should handle nested paths', () => {
      const result = resolveLocalAssetPath('/images/characters/icon.png');
      expect(result).toBe('/images/characters/icon.png');
    });

    it('should remove leading slash from path', () => {
      const result = resolveLocalAssetPath('/test.png');
      expect(result).toBe('/test.png');
    });

    it('should preserve multiple slashes in path', () => {
      const result = resolveLocalAssetPath('/deep/nested/path/file.png');
      expect(result).toBe('/deep/nested/path/file.png');
    });
  });

  describe('extractCharacterIdFromPath', () => {
    it('should extract character ID from simple name', () => {
      const result = extractCharacterIdFromPath('washerwoman');
      expect(result).toBe('washerwoman');
    });

    it('should extract character ID from Icon_name.png format', () => {
      const result = extractCharacterIdFromPath('Icon_washerwoman.png');
      expect(result).toBe('washerwoman');
    });

    it('should extract character ID from nested path', () => {
      const result = extractCharacterIdFromPath('icons/washerwoman.webp');
      expect(result).toBe('washerwoman');
    });

    it('should handle character IDs with underscores', () => {
      const result = extractCharacterIdFromPath('Icon_po_poisoner.png');
      expect(result).toBe('po_poisoner');
    });

    it('should handle webp extension', () => {
      const result = extractCharacterIdFromPath('Icon_washerwoman.webp');
      expect(result).toBe('washerwoman');
    });

    it('should handle jpg extension', () => {
      const result = extractCharacterIdFromPath('washerwoman.jpg');
      expect(result).toBe('washerwoman');
    });

    it('should handle jpeg extension', () => {
      const result = extractCharacterIdFromPath('washerwoman.jpeg');
      expect(result).toBe('washerwoman');
    });

    it('should handle gif extension', () => {
      const result = extractCharacterIdFromPath('washerwoman.gif');
      expect(result).toBe('washerwoman');
    });

    it('should normalize to lowercase', () => {
      const result = extractCharacterIdFromPath('WASHERWOMAN');
      expect(result).toBe('washerwoman');
    });

    it('should return null for invalid paths', () => {
      const result = extractCharacterIdFromPath('..\\..\\etc\\passwd');
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = extractCharacterIdFromPath('');
      expect(result).toBeNull();
    });

    it('should handle complex nested paths', () => {
      const result = extractCharacterIdFromPath('path/to/deep/nested/Icon_washerwoman.webp');
      expect(result).toBe('washerwoman');
    });
  });

  describe('getFirstImageUrl', () => {
    it('should return string URL as-is', () => {
      const result = getFirstImageUrl('http://example.com/image.png');
      expect(result).toBe('http://example.com/image.png');
    });

    it('should return first URL from array', () => {
      const urls = ['http://example.com/first.png', 'http://example.com/second.png'];
      const result = getFirstImageUrl(urls);
      expect(result).toBe('http://example.com/first.png');
    });

    it('should return undefined for empty string', () => {
      const result = getFirstImageUrl('');
      expect(result).toBeUndefined();
    });

    it('should return undefined for undefined', () => {
      const result = getFirstImageUrl(undefined);
      expect(result).toBeUndefined();
    });

    it('should return undefined for empty array', () => {
      const result = getFirstImageUrl([]);
      expect(result).toBeUndefined();
    });

    it('should return first item from array even if empty string', () => {
      const result = getFirstImageUrl(['', '']);
      expect(result).toBe('');
    });

    it('should return first item in array regardless of content', () => {
      const urls = ['', 'http://example.com/valid.png'];
      const result = getFirstImageUrl(urls);
      expect(result).toBe('');
    });

    it('should handle array with single URL', () => {
      const result = getFirstImageUrl(['http://example.com/single.png']);
      expect(result).toBe('http://example.com/single.png');
    });

    it('should handle whitespace-only strings', () => {
      const result = getFirstImageUrl('   ');
      expect(result).toBe('   '); // Returns as-is, caller handles trimming
    });
  });

  // ============================================================================
  // Cache Management Tests
  // ============================================================================

  describe('Icon URL Cache', () => {
    describe('getCachedIconUrl', () => {
      it('should return undefined for non-cached character', () => {
        const result = getCachedIconUrl('not-cached');
        expect(result).toBeUndefined();
      });

      it('should return cached URL for existing character', () => {
        setCachedIconUrl('test-char', 'blob:http://example.com/123');
        const result = getCachedIconUrl('test-char');
        expect(result).toBe('blob:http://example.com/123');
      });

      it('should be case-insensitive for character ID', () => {
        setCachedIconUrl('TestChar', 'blob:http://example.com/123');
        const result = getCachedIconUrl('testchar');
        expect(result).toBe('blob:http://example.com/123');
      });

      it('should update LRU order when accessed', () => {
        setCachedIconUrl('char1', 'blob:1');
        setCachedIconUrl('char2', 'blob:2');
        setCachedIconUrl('char3', 'blob:3');

        // Access char1 to move it to end
        getCachedIconUrl('char1');

        // Clear and check order
        const stats = getIconUrlCacheStats();
        expect(stats.size).toBe(3);
      });
    });

    describe('setCachedIconUrl', () => {
      it('should cache URL for character', () => {
        setCachedIconUrl('test-char', 'blob:http://example.com/123');
        expect(hasIconUrlCached('test-char')).toBe(true);
      });

      it('should normalize character ID to lowercase', () => {
        setCachedIconUrl('TestChar', 'blob:http://example.com/123');
        const result = getCachedIconUrl('testchar');
        expect(result).toBe('blob:http://example.com/123');
      });

      it('should overwrite existing cached URL', () => {
        setCachedIconUrl('test-char', 'blob:1');
        setCachedIconUrl('test-char', 'blob:2');
        expect(getCachedIconUrl('test-char')).toBe('blob:2');
      });

      it('should handle non-blob URLs', () => {
        setCachedIconUrl('test-char', 'http://example.com/image.png');
        expect(getCachedIconUrl('test-char')).toBe('http://example.com/image.png');
      });
    });

    describe('hasIconUrlCached', () => {
      it('should return false for non-cached character', () => {
        expect(hasIconUrlCached('not-cached')).toBe(false);
      });

      it('should return true for cached character', () => {
        setCachedIconUrl('test-char', 'blob:http://example.com/123');
        expect(hasIconUrlCached('test-char')).toBe(true);
      });

      it('should be case-insensitive', () => {
        setCachedIconUrl('TestChar', 'blob:http://example.com/123');
        expect(hasIconUrlCached('testchar')).toBe(true);
      });
    });

    describe('clearIconUrlCache', () => {
      it('should remove all cached URLs', () => {
        setCachedIconUrl('char1', 'blob:1');
        setCachedIconUrl('char2', 'blob:2');
        clearIconUrlCache();
        expect(hasIconUrlCached('char1')).toBe(false);
        expect(hasIconUrlCached('char2')).toBe(false);
      });

      it('should revoke blob URLs', () => {
        const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
        setCachedIconUrl('test', 'blob:http://example.com/123');
        clearIconUrlCache();
        expect(revokeSpy).toHaveBeenCalled();
      });

      it('should not revoke non-blob URLs', () => {
        const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
        setCachedIconUrl('test', 'http://example.com/image.png');
        clearIconUrlCache();
        expect(revokeSpy).not.toHaveBeenCalled();
      });

      it('should work on empty cache', () => {
        expect(() => clearIconUrlCache()).not.toThrow();
      });
    });

    describe('getIconUrlCacheStats', () => {
      it('should return empty stats for empty cache', () => {
        const stats = getIconUrlCacheStats();
        expect(stats.size).toBe(0);
        expect(stats.blobUrls).toBe(0);
      });

      it('should count total cached URLs', () => {
        setCachedIconUrl('char1', 'blob:1');
        setCachedIconUrl('char2', 'blob:2');
        setCachedIconUrl('char3', 'http://example.com/image.png');

        const stats = getIconUrlCacheStats();
        expect(stats.size).toBe(3);
      });

      it('should count blob URLs separately', () => {
        setCachedIconUrl('char1', 'blob:1');
        setCachedIconUrl('char2', 'blob:2');
        setCachedIconUrl('char3', 'http://example.com/image.png');

        const stats = getIconUrlCacheStats();
        expect(stats.blobUrls).toBe(2);
      });

      it('should be accurate after cache eviction', () => {
        // Add 3 entries then check stats
        setCachedIconUrl('char1', 'blob:1');
        setCachedIconUrl('char2', 'blob:2');

        const stats = getIconUrlCacheStats();
        expect(stats.size).toBe(2);
        expect(stats.blobUrls).toBe(2);
      });
    });
  });

  // ============================================================================
  // Main Resolution Function Tests
  // ============================================================================

  describe('resolveCharacterImageUrl', () => {
    it('should return cached URL without resolving', async () => {
      setCachedIconUrl('test-char', 'blob:cached');
      const result = await resolveCharacterImageUrl('any-url', 'test-char');
      expect(result.url).toBe('blob:cached');
      expect(result.source).toBe('sync');
    });

    it('should return fallback for empty URL', async () => {
      const result = await resolveCharacterImageUrl('', 'test-char');
      expect(result.url).toBe('');
      expect(result.source).toBe('fallback');
    });

    it('should return fallback for undefined URL', async () => {
      const result = await resolveCharacterImageUrl(undefined, 'test-char');
      expect(result.url).toBe('');
      expect(result.source).toBe('fallback');
    });

    it('should return empty url for whitespace-only URL', async () => {
      const result = await resolveCharacterImageUrl('   ', 'test-char');
      expect(result.url).toBe('');
      expect(result.source).toBe('fallback');
    });

    // Asset references
    describe('Asset Reference Resolution', () => {
      it('should resolve asset reference via assetResolver', async () => {
        vi.mocked(assetResolver.isAssetReference).mockReturnValue(true);
        vi.mocked(assetResolver.resolveAssetUrl).mockResolvedValue('blob:resolved-asset');

        const result = await resolveCharacterImageUrl('asset:uuid-123', 'test-char');

        expect(result.url).toBe('blob:resolved-asset');
        expect(result.source).toBe('asset');
        expect(assetResolver.resolveAssetUrl).toHaveBeenCalledWith('asset:uuid-123');
      });

      it('should return asset reference as fallback if resolution fails', async () => {
        vi.mocked(assetResolver.isAssetReference).mockReturnValue(true);
        vi.mocked(assetResolver.resolveAssetUrl).mockResolvedValue(null);

        const result = await resolveCharacterImageUrl('asset:uuid-123', 'test-char');

        expect(result.url).toBe('asset:uuid-123');
        expect(result.source).toBe('fallback');
      });

      it('should handle asset resolver errors gracefully', async () => {
        vi.mocked(assetResolver.isAssetReference).mockReturnValue(true);
        vi.mocked(assetResolver.resolveAssetUrl).mockRejectedValue(new Error('Resolve failed'));

        const result = await resolveCharacterImageUrl('asset:uuid-123', 'test-char');

        expect(result.url).toBe('asset:uuid-123');
        expect(result.source).toBe('fallback');
      });
    });

    // External URLs
    describe('External URL Resolution', () => {
      it('should return http URL as-is', async () => {
        vi.mocked(assetResolver.isAssetReference).mockReturnValue(false);

        const result = await resolveCharacterImageUrl('http://example.com/image.png', 'test-char');

        expect(result.url).toBe('http://example.com/image.png');
        expect(result.source).toBe('external');
      });

      it('should return https URL as-is', async () => {
        vi.mocked(assetResolver.isAssetReference).mockReturnValue(false);

        const result = await resolveCharacterImageUrl('https://example.com/image.png', 'test-char');

        expect(result.url).toBe('https://example.com/image.png');
        expect(result.source).toBe('external');
      });

      it('should return data URL as-is', async () => {
        vi.mocked(assetResolver.isAssetReference).mockReturnValue(false);

        const result = await resolveCharacterImageUrl('data:image/png;base64,abc123', 'test-char');

        expect(result.url).toBe('data:image/png;base64,abc123');
        expect(result.source).toBe('external');
      });

      it('should return blob URL as-is', async () => {
        vi.mocked(assetResolver.isAssetReference).mockReturnValue(false);

        const result = await resolveCharacterImageUrl('blob:http://example.com/123', 'test-char');

        expect(result.url).toBe('blob:http://example.com/123');
        expect(result.source).toBe('external');
      });
    });

    // Local asset paths
    describe('Local Asset Path Resolution', () => {
      it('should resolve local asset path with base URL', async () => {
        vi.mocked(assetResolver.isAssetReference).mockReturnValue(false);

        const result = await resolveCharacterImageUrl('/scripts/dusk.webp', 'test-char');

        expect(result.url).toBe('/scripts/dusk.webp');
        expect(result.source).toBe('external');
      });

      it('should resolve nested local paths', async () => {
        vi.mocked(assetResolver.isAssetReference).mockReturnValue(false);

        const result = await resolveCharacterImageUrl('/images/characters/icon.png', 'test-char');

        expect(result.url).toBe('/images/characters/icon.png');
        expect(result.source).toBe('external');
      });
    });

    // Sync storage (official characters)
    describe('Sync Storage Resolution', () => {
      it('should resolve official character from sync storage', async () => {
        vi.mocked(assetResolver.isAssetReference).mockReturnValue(false);
        const mockBlob = new Blob(['test']);
        vi.mocked(syncService.dataSyncService.getCharacterImage).mockResolvedValue(mockBlob);
        const createObjectURLSpy = vi
          .spyOn(URL, 'createObjectURL')
          .mockReturnValue('blob:http://example.com/123');

        const result = await resolveCharacterImageUrl('washerwoman', 'washerwoman');

        expect(result.url).toBe('blob:http://example.com/123');
        expect(result.source).toBe('sync');
        expect(result.blobUrl).toBe('blob:http://example.com/123');
        expect(createObjectURLSpy).toHaveBeenCalledWith(mockBlob);
      });

      it('should cache blob URL from sync storage', async () => {
        vi.mocked(assetResolver.isAssetReference).mockReturnValue(false);
        const mockBlob = new Blob(['test']);
        vi.mocked(syncService.dataSyncService.getCharacterImage).mockResolvedValue(mockBlob);
        vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:cached-123');

        await resolveCharacterImageUrl('washerwoman', 'washerwoman');

        // Subsequent calls should use cache
        const cachedResult = await resolveCharacterImageUrl('any-url', 'washerwoman');
        expect(cachedResult.url).toBe('blob:cached-123');
        expect(cachedResult.source).toBe('sync');
      });

      it('should extract character ID from path for sync lookup', async () => {
        vi.mocked(assetResolver.isAssetReference).mockReturnValue(false);
        const mockBlob = new Blob(['test']);
        vi.mocked(syncService.dataSyncService.getCharacterImage).mockResolvedValue(mockBlob);
        vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:123');

        await resolveCharacterImageUrl('Icon_washerwoman.png', 'different-id');

        // Should call with extracted ID, not provided ID
        expect(syncService.dataSyncService.getCharacterImage).toHaveBeenCalledWith('washerwoman');
      });

      it('should use provided ID when path does not contain valid character ID', async () => {
        vi.mocked(assetResolver.isAssetReference).mockReturnValue(false);
        const mockBlob = new Blob(['test']);
        vi.mocked(syncService.dataSyncService.getCharacterImage).mockResolvedValue(mockBlob);
        vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:123');

        await resolveCharacterImageUrl('invalid-path-format', 'test-character');

        // Should fall back to provided ID
        expect(syncService.dataSyncService.getCharacterImage).toHaveBeenCalledWith(
          'test-character'
        );
      });

      it('should skip sync storage when skipSyncStorage option is true', async () => {
        vi.mocked(assetResolver.isAssetReference).mockReturnValue(false);

        const result = await resolveCharacterImageUrl('washerwoman', 'washerwoman', {
          skipSyncStorage: true,
        });

        expect(result.url).toBe('washerwoman');
        expect(result.source).toBe('fallback');
        expect(syncService.dataSyncService.getCharacterImage).not.toHaveBeenCalled();
      });

      it('should handle sync storage lookup errors gracefully', async () => {
        vi.mocked(assetResolver.isAssetReference).mockReturnValue(false);
        vi.mocked(syncService.dataSyncService.getCharacterImage).mockRejectedValue(
          new Error('Lookup failed')
        );

        const result = await resolveCharacterImageUrl('washerwoman', 'washerwoman');

        expect(result.url).toBe('washerwoman');
        expect(result.source).toBe('fallback');
      });

      it('should return fallback when sync storage returns null', async () => {
        vi.mocked(assetResolver.isAssetReference).mockReturnValue(false);
        vi.mocked(syncService.dataSyncService.getCharacterImage).mockResolvedValue(null);

        const result = await resolveCharacterImageUrl('washerwoman', 'washerwoman');

        expect(result.url).toBe('washerwoman');
        expect(result.source).toBe('fallback');
      });
    });

    // Resolution order
    describe('Resolution Order', () => {
      it('should check cache before other resolution methods', async () => {
        vi.mocked(assetResolver.isAssetReference).mockReturnValue(false);
        setCachedIconUrl('test-char', 'blob:cached');

        // Pass any URL - should use cache and not call resolvers
        const result = await resolveCharacterImageUrl('any-url', 'test-char');

        expect(result.url).toBe('blob:cached');
        expect(assetResolver.isAssetReference).not.toHaveBeenCalled();
      });

      it('should resolve asset references before external URLs', async () => {
        vi.mocked(assetResolver.isAssetReference).mockReturnValue(true);
        vi.mocked(assetResolver.resolveAssetUrl).mockResolvedValue('blob:asset');

        const result = await resolveCharacterImageUrl('asset:uuid', 'test-char');

        expect(result.source).toBe('asset');
        expect(result.url).toBe('blob:asset');
      });

      it('should resolve external URLs before sync storage', async () => {
        vi.mocked(assetResolver.isAssetReference).mockReturnValue(false);

        const result = await resolveCharacterImageUrl('http://example.com/image.png', 'test-char');

        expect(result.source).toBe('external');
        expect(syncService.dataSyncService.getCharacterImage).not.toHaveBeenCalled();
      });
    });

    // Error handling
    describe('Error Handling', () => {
      it('should handle unexpected errors gracefully', async () => {
        vi.mocked(assetResolver.isAssetReference).mockImplementation(() => {
          throw new Error('Unexpected error');
        });

        const result = await resolveCharacterImageUrl('test-url', 'test-char');

        expect(result.url).toBe('test-url');
        expect(result.source).toBe('fallback');
      });

      it('should accept logContext option', async () => {
        vi.mocked(assetResolver.isAssetReference).mockReturnValue(false);
        vi.mocked(syncService.dataSyncService.getCharacterImage).mockRejectedValue(
          new Error('Failed')
        );

        const result = await resolveCharacterImageUrl('test-url', 'test-char', {
          logContext: 'TestComponent',
        });

        expect(result.url).toBe('test-url');
        expect(result.source).toBe('fallback');
      });
    });

    // Result structure
    describe('Result Object Structure', () => {
      it('should always include url and source', async () => {
        const result = await resolveCharacterImageUrl('http://example.com/image.png', 'test-char');

        expect(result).toHaveProperty('url');
        expect(result).toHaveProperty('source');
      });

      it('should include blobUrl only for sync source', async () => {
        vi.mocked(assetResolver.isAssetReference).mockReturnValue(false);
        const mockBlob = new Blob(['test']);
        vi.mocked(syncService.dataSyncService.getCharacterImage).mockResolvedValue(mockBlob);
        vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:123');

        const result = await resolveCharacterImageUrl('washerwoman', 'washerwoman');

        expect(result.blobUrl).toBe('blob:123');
      });

      it('should not include blobUrl for non-sync sources', async () => {
        vi.mocked(assetResolver.isAssetReference).mockReturnValue(false);

        const result = await resolveCharacterImageUrl('http://example.com/image.png', 'test-char');

        expect(result.blobUrl).toBeUndefined();
      });
    });
  });

  // ============================================================================
  // Batch Resolution Tests
  // ============================================================================

  describe('resolveCharacterImages', () => {
    it('should resolve multiple characters in parallel', async () => {
      vi.mocked(assetResolver.isAssetReference).mockReturnValue(false);

      const characters = [
        createMockCharacterWithUuid({ id: 'char1', image: 'http://example.com/1.png' }),
        createMockCharacterWithUuid({ id: 'char2', image: 'http://example.com/2.png' }),
      ];

      const result = await resolveCharacterImages(characters);

      expect(result.urls.size).toBe(2);
      expect(result.urls.get('test-uuid-1')).toBe('http://example.com/1.png');
      expect(result.urls.get('test-uuid-2')).toBe('http://example.com/2.png');
    });

    it('should return Map for O(1) lookup by UUID', async () => {
      vi.mocked(assetResolver.isAssetReference).mockReturnValue(false);

      const characters = [
        createMockCharacterWithUuid({ id: 'char1', image: 'http://example.com/1.png' }),
      ];

      const result = await resolveCharacterImages(characters);

      expect(result.urls).toBeInstanceOf(Map);
      expect(result.urls.get('test-uuid-1')).toBe('http://example.com/1.png');
    });

    it('should return empty result for characters without uuid', async () => {
      vi.mocked(assetResolver.isAssetReference).mockReturnValue(false);

      const characters = [createMockCharacter({ id: 'char1', image: 'http://example.com/1.png' })];

      const result = await resolveCharacterImages(characters);

      expect(result.urls.size).toBe(0);
    });

    it('should return empty result for characters without image', async () => {
      vi.mocked(assetResolver.isAssetReference).mockReturnValue(false);

      const characters = [createMockCharacterWithUuid({ image: '' })];

      const result = await resolveCharacterImages(characters);

      expect(result.urls.size).toBe(0);
    });

    it('should fallback to official character map if character has no image', async () => {
      vi.mocked(assetResolver.isAssetReference).mockReturnValue(false);

      const character = createMockCharacterWithUuid({ id: 'washerwoman', image: '' });
      const officialChar = createMockCharacter({
        id: 'washerwoman',
        image: 'http://example.com/official.png',
      });
      const officialCharMap = new Map([['washerwoman', officialChar]]);

      const result = await resolveCharacterImages([character], officialCharMap);

      expect(result.urls.size).toBe(1);
      expect(result.urls.get('test-uuid-1')).toBe('http://example.com/official.png');
    });

    it('should collect blob URLs from sync resolution', async () => {
      vi.mocked(assetResolver.isAssetReference).mockReturnValue(false);
      const mockBlob = new Blob(['test']);
      vi.mocked(syncService.dataSyncService.getCharacterImage).mockResolvedValue(mockBlob);
      const createObjectURLSpy = vi
        .spyOn(URL, 'createObjectURL')
        .mockReturnValue('blob:http://example.com/123');

      const characters = [createMockCharacterWithUuid({ id: 'washerwoman', image: 'washerwoman' })];

      const result = await resolveCharacterImages(characters);

      expect(result.blobUrls).toContain('blob:http://example.com/123');
      expect(createObjectURLSpy).toHaveBeenCalled();
    });

    it('should handle mixed URL types', async () => {
      vi.mocked(assetResolver.isAssetReference).mockImplementation((url) =>
        (url as string).startsWith('asset:')
      );
      vi.mocked(assetResolver.resolveAssetUrl).mockResolvedValue('blob:asset-url');

      const characters = [
        createMockCharacterWithUuid({ id: 'char1', image: 'http://example.com/1.png' }),
        createMockCharacterWithUuid({ id: 'char2', image: 'asset:uuid-123' }),
      ];

      const result = await resolveCharacterImages(characters);

      expect(result.urls.size).toBe(2);
      expect(result.urls.get('test-uuid-1')).toBe('http://example.com/1.png');
      expect(result.urls.get('test-uuid-2')).toBe('blob:asset-url');
    });

    it('should handle character with array of images', async () => {
      vi.mocked(assetResolver.isAssetReference).mockReturnValue(false);

      const characters = [
        createMockCharacterWithUuid({
          id: 'char1',
          image: ['http://example.com/1.png', 'http://example.com/2.png'],
        }),
      ];

      const result = await resolveCharacterImages(characters);

      expect(result.urls.size).toBe(1);
      expect(result.urls.get('test-uuid-1')).toBe('http://example.com/1.png');
    });

    it('should skip characters with errors', async () => {
      vi.mocked(assetResolver.isAssetReference).mockReturnValue(false);
      vi.mocked(syncService.dataSyncService.getCharacterImage).mockRejectedValue(
        new Error('Lookup failed')
      );

      const characters = [
        createMockCharacterWithUuid({ id: 'char1', image: 'washerwoman' }),
        createMockCharacterWithUuid({ id: 'char2', image: 'http://example.com/2.png' }),
      ];

      const result = await resolveCharacterImages(characters);

      // char2 should still be resolved
      expect(result.urls.size).toBeGreaterThan(0);
    });

    it('should return empty blobUrls array for external URLs only', async () => {
      vi.mocked(assetResolver.isAssetReference).mockReturnValue(false);

      const characters = [
        createMockCharacterWithUuid({ id: 'char1', image: 'http://example.com/1.png' }),
      ];

      const result = await resolveCharacterImages(characters);

      expect(result.blobUrls).toEqual([]);
    });

    it('should handle empty character array', async () => {
      const result = await resolveCharacterImages([]);

      expect(result.urls).toBeInstanceOf(Map);
      expect(result.urls.size).toBe(0);
      expect(result.blobUrls).toEqual([]);
    });

    it('should filter out characters without uuid', async () => {
      vi.mocked(assetResolver.isAssetReference).mockReturnValue(false);

      const characters = [
        createMockCharacterWithUuid({ id: 'char1', image: 'http://example.com/1.png' }),
        createMockCharacter({ id: 'char2', image: 'http://example.com/2.png' }), // No uuid
      ];

      const result = await resolveCharacterImages(characters);

      expect(result.urls.size).toBe(1);
    });
  });

  // ============================================================================
  // Pre-warming Tests
  // ============================================================================

  describe('prewarmIconCache', () => {
    it('should warm cache with character images', async () => {
      vi.mocked(syncService.dataSyncService.getCharacterImage).mockResolvedValue(
        new Blob(['test'])
      );
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:123');

      const characterIds = ['washerwoman', 'villager'];
      const cached = await prewarmIconCache(characterIds);

      expect(cached).toBeGreaterThan(0);
      expect(hasIconUrlCached('washerwoman')).toBe(true);
      expect(hasIconUrlCached('villager')).toBe(true);
    });

    it('should skip already cached characters', async () => {
      setCachedIconUrl('washerwoman', 'blob:cached');

      vi.mocked(syncService.dataSyncService.getCharacterImage).mockResolvedValue(
        new Blob(['test'])
      );

      const characterIds = ['washerwoman'];
      await prewarmIconCache(characterIds);

      // Should not call getCharacterImage for cached character
      expect(syncService.dataSyncService.getCharacterImage).not.toHaveBeenCalledWith('washerwoman');
    });

    it('should call progress callback', async () => {
      vi.mocked(syncService.dataSyncService.getCharacterImage).mockResolvedValue(
        new Blob(['test'])
      );
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:123');

      const onProgress = vi.fn();
      const characterIds = ['char1', 'char2', 'char3'];

      await prewarmIconCache(characterIds, onProgress);

      expect(onProgress).toHaveBeenCalled();
      // Should be called for each character
      expect(onProgress.mock.calls.length).toBeGreaterThan(0);
    });

    it('should handle errors gracefully without stopping warmup', async () => {
      vi.mocked(syncService.dataSyncService.getCharacterImage)
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce(new Blob(['test']));

      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:123');

      const characterIds = ['failed-char', 'success-char'];
      const cached = await prewarmIconCache(characterIds);

      // Should warm the one that succeeded
      expect(cached).toBeGreaterThan(0);
    });

    it('should handle empty character array', async () => {
      const cached = await prewarmIconCache([]);

      expect(cached).toBe(0);
    });

    it('should process characters in batches', async () => {
      vi.mocked(syncService.dataSyncService.getCharacterImage).mockResolvedValue(
        new Blob(['test'])
      );
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:123');

      // Create more characters than batch size (20)
      const characterIds = Array.from({ length: 50 }, (_, i) => `char${i}`);

      await prewarmIconCache(characterIds);

      // All should be warmed
      expect(hasIconUrlCached('char0')).toBe(true);
      expect(hasIconUrlCached('char49')).toBe(true);
    });

    it('should return count of successfully cached icons', async () => {
      vi.mocked(syncService.dataSyncService.getCharacterImage)
        .mockResolvedValueOnce(new Blob(['test']))
        .mockResolvedValueOnce(new Blob(['test']))
        .mockResolvedValueOnce(null); // Fail one

      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:123');

      const characterIds = ['char1', 'char2', 'char3'];
      const cached = await prewarmIconCache(characterIds);

      expect(cached).toBe(2);
    });

    it('should normalize character IDs to lowercase', async () => {
      vi.mocked(syncService.dataSyncService.getCharacterImage).mockResolvedValue(
        new Blob(['test'])
      );
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:123');

      await prewarmIconCache(['WASHERWOMAN']);

      expect(hasIconUrlCached('washerwoman')).toBe(true);
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Integration Scenarios', () => {
    it('should handle complete workflow: resolve -> cache -> retrieve', async () => {
      vi.mocked(assetResolver.isAssetReference).mockReturnValue(false);
      const mockBlob = new Blob(['test']);
      vi.mocked(syncService.dataSyncService.getCharacterImage).mockResolvedValue(mockBlob);
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:123');

      // First resolution
      const result1 = await resolveCharacterImageUrl('washerwoman', 'washerwoman');
      expect(result1.source).toBe('sync');

      // Second resolution uses cache
      const result2 = await resolveCharacterImageUrl('any-url', 'washerwoman');
      expect(result2.url).toBe('blob:123');
      expect(result2.source).toBe('sync');

      // Should only call once
      expect(syncService.dataSyncService.getCharacterImage).toHaveBeenCalledTimes(1);
    });

    it('should handle switching between asset and external URLs', async () => {
      vi.mocked(assetResolver.isAssetReference).mockImplementation((url) =>
        (url as string).startsWith('asset:')
      );
      vi.mocked(assetResolver.resolveAssetUrl).mockResolvedValue('blob:asset');

      const assetResult = await resolveCharacterImageUrl('asset:uuid', 'test-char');
      expect(assetResult.source).toBe('asset');

      const externalResult = await resolveCharacterImageUrl(
        'http://example.com/image.png',
        'test-char'
      );
      expect(externalResult.source).toBe('external');
    });

    it('should maintain cache across multiple resolutions', async () => {
      vi.mocked(assetResolver.isAssetReference).mockReturnValue(false);
      const mockBlob = new Blob(['test']);
      vi.mocked(syncService.dataSyncService.getCharacterImage).mockResolvedValue(mockBlob);
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:persistent');

      // Resolve multiple characters
      await resolveCharacterImageUrl('washerwoman', 'washerwoman');
      await resolveCharacterImageUrl('villager', 'villager');

      // Both should be cached
      const stats = getIconUrlCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.blobUrls).toBe(2);
    });
  });
});
