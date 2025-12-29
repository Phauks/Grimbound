/**
 * Unit tests for CacheManager
 *
 * Tests all public methods including image cache access, pre-render cache access,
 * cache invalidation, cache management, and statistics.
 *
 * Uses dependency injection to mock PreRenderCacheManager, ImageCache,
 * FontCache, and CacheInvalidationService.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock CacheLogger to avoid localStorage issues during module initialization
vi.mock('@/ts/cache/utils/CacheLogger', () => ({
  cacheLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fontCache instance
vi.mock('@/ts/cache/instances/fontCache', () => ({
  fontCache: {
    clear: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    has: vi.fn(),
  },
  getFontCacheStats: vi.fn().mockReturnValue({
    size: 0,
    memoryUsage: 0,
    maxSize: 100,
    maxMemory: 1024 * 1024 * 10,
    hitCount: 0,
    missCount: 0,
    evictionCount: 0,
    hitRate: 0,
  }),
}));

import type { InvalidationScope } from '@/ts/cache/CacheInvalidationService';
import { CacheManager } from '@/ts/cache/CacheManager';
import type {
  CacheStats,
  ICacheStrategy,
  IPreRenderStrategy,
  PreRenderContext,
  PreRenderResult,
} from '@/ts/cache/core/index';
import type { PreRenderCacheManager } from '@/ts/cache/manager/PreRenderCacheManager';
import type { Token } from '@/ts/types';
import type { ImageCache } from '@/ts/utils/imageCache';

// ============================================================================
// Test Setup
// ============================================================================

describe('CacheManager', () => {
  let manager: CacheManager;
  let mockPreRenderManager: PreRenderCacheManager;
  let mockImageCache: ImageCache;
  let mockFontCache: {
    clear: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    has: ReturnType<typeof vi.fn>;
  };
  let mockInvalidationService: {
    invalidateAsset: ReturnType<typeof vi.fn>;
    invalidateAssets: ReturnType<typeof vi.fn>;
    invalidateCharacter: ReturnType<typeof vi.fn>;
    invalidateCharacters: ReturnType<typeof vi.fn>;
    invalidateProject: ReturnType<typeof vi.fn>;
    invalidateAll: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Create mock dependencies
    mockPreRenderManager = {
      preRender: vi.fn().mockResolvedValue({ success: true, rendered: 5 }),
      getCache: vi.fn(),
      getCacheNames: vi.fn().mockReturnValue(['tokens', 'characters', 'project']),
      getAllCacheStats: vi.fn().mockReturnValue({
        tokens: { size: 10, hits: 100, misses: 10, hitRate: 0.9 },
        characters: { size: 5, hits: 50, misses: 5, hitRate: 0.91 },
      }),
      getCacheStats: vi.fn(),
      isStrategyRendering: vi.fn().mockReturnValue(false),
      clearCache: vi.fn().mockResolvedValue(undefined),
      clearAllCaches: vi.fn().mockResolvedValue(undefined),
      registerStrategy: vi.fn(),
      registerCache: vi.fn(),
    } as unknown as PreRenderCacheManager;

    mockImageCache = {
      get: vi.fn().mockResolvedValue(new Image()),
      preloadMany: vi.fn().mockResolvedValue(undefined),
      has: vi.fn().mockReturnValue(true),
      clear: vi.fn(),
      getStats: vi.fn().mockReturnValue({
        entries: 20,
        sizeMB: 5.5,
        maxSizeMB: 50,
      }),
    } as unknown as ImageCache;

    mockFontCache = {
      clear: vi.fn(),
      get: vi.fn(),
      set: vi.fn(),
      has: vi.fn(),
    };

    mockInvalidationService = {
      invalidateAsset: vi.fn().mockResolvedValue(undefined),
      invalidateAssets: vi.fn().mockResolvedValue(undefined),
      invalidateCharacter: vi.fn().mockResolvedValue(undefined),
      invalidateCharacters: vi.fn().mockResolvedValue(undefined),
      invalidateProject: vi.fn().mockResolvedValue(undefined),
      invalidateAll: vi.fn().mockResolvedValue(undefined),
    };

    // Create CacheManager with injected dependencies
    manager = new CacheManager({
      preRenderManager: mockPreRenderManager,
      imageCache: mockImageCache,
      fontCache: mockFontCache as typeof mockFontCache,
      invalidationService: mockInvalidationService as typeof mockInvalidationService,
    });
  });

  // ==========================================================================
  // Character Image Access
  // ==========================================================================

  describe('getCharacterImage', () => {
    it('should get image from image cache', async () => {
      const url = 'icons/washerwoman.webp';
      const image = await manager.getCharacterImage(url);

      expect(mockImageCache.get).toHaveBeenCalledWith(url, false);
      expect(image).toBeInstanceOf(Image);
    });

    it('should pass isLocal parameter to image cache', async () => {
      const url = '/local/image.png';
      await manager.getCharacterImage(url, true);

      expect(mockImageCache.get).toHaveBeenCalledWith(url, true);
    });

    it('should default isLocal to false', async () => {
      const url = 'http://example.com/image.png';
      await manager.getCharacterImage(url);

      expect(mockImageCache.get).toHaveBeenCalledWith(url, false);
    });

    it('should return image from cache', async () => {
      const mockImage = new Image();
      mockImage.src = 'test.png';
      mockImageCache.get = vi.fn().mockResolvedValue(mockImage);

      const result = await manager.getCharacterImage('test.png');

      expect(result).toBe(mockImage);
    });
  });

  describe('preloadImages', () => {
    it('should preload multiple images in parallel', async () => {
      const urls = ['icon1.png', 'icon2.png', 'icon3.png'];
      await manager.preloadImages(urls);

      expect(mockImageCache.preloadMany).toHaveBeenCalledWith(urls, false, undefined);
    });

    it('should pass isLocal parameter to preloadMany', async () => {
      const urls = ['/local/icon1.png', '/local/icon2.png'];
      await manager.preloadImages(urls, true);

      expect(mockImageCache.preloadMany).toHaveBeenCalledWith(urls, true, undefined);
    });

    it('should pass onProgress callback to preloadMany', async () => {
      const urls = ['icon1.png', 'icon2.png'];
      const onProgress = vi.fn();
      await manager.preloadImages(urls, false, onProgress);

      expect(mockImageCache.preloadMany).toHaveBeenCalledWith(urls, false, onProgress);
    });

    it('should handle empty URL array', async () => {
      await manager.preloadImages([]);

      expect(mockImageCache.preloadMany).toHaveBeenCalledWith([], false, undefined);
    });
  });

  describe('hasImage', () => {
    it('should check if image is cached', () => {
      mockImageCache.has = vi.fn().mockReturnValue(true);
      const result = manager.hasImage('test.png');

      expect(mockImageCache.has).toHaveBeenCalledWith('test.png');
      expect(result).toBe(true);
    });

    it('should return false for uncached image', () => {
      mockImageCache.has = vi.fn().mockReturnValue(false);
      const result = manager.hasImage('uncached.png');

      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // Pre-Rendered Token Access
  // ==========================================================================

  describe('getPreRenderedToken', () => {
    it('should get token from specific strategy cache', async () => {
      const mockCache: ICacheStrategy = {
        get: vi.fn().mockResolvedValue({ value: 'data:image/png;base64,abc123' }),
        set: vi.fn(),
        has: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
        getStats: vi.fn(),
      };
      mockPreRenderManager.getCache = vi.fn().mockReturnValue(mockCache);

      const result = await manager.getPreRenderedToken('washerwoman.png', 'tokens');

      expect(mockPreRenderManager.getCache).toHaveBeenCalledWith('tokens');
      expect(mockCache.get).toHaveBeenCalledWith('washerwoman.png');
      expect(result).toBe('data:image/png;base64,abc123');
    });

    it('should return null if strategy cache not found', async () => {
      mockPreRenderManager.getCache = vi.fn().mockReturnValue(undefined);

      const result = await manager.getPreRenderedToken('test.png', 'nonexistent');

      expect(result).toBeNull();
    });

    it('should return null if token not in cache', async () => {
      const mockCache: ICacheStrategy = {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn(),
        has: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
        getStats: vi.fn(),
      };
      mockPreRenderManager.getCache = vi.fn().mockReturnValue(mockCache);

      const result = await manager.getPreRenderedToken('missing.png', 'tokens');

      expect(result).toBeNull();
    });

    it('should try all caches when strategy not specified', async () => {
      const mockCache1: ICacheStrategy = {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn(),
        has: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
        getStats: vi.fn(),
      };
      const mockCache2: ICacheStrategy = {
        get: vi.fn().mockResolvedValue({ value: 'data:image/png;base64,found' }),
        set: vi.fn(),
        has: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
        getStats: vi.fn(),
      };

      mockPreRenderManager.getCache = vi
        .fn()
        .mockReturnValueOnce(mockCache1)
        .mockReturnValueOnce(mockCache2);

      const result = await manager.getPreRenderedToken('test.png');

      expect(result).toBe('data:image/png;base64,found');
    });

    it('should return null if token not found in any cache', async () => {
      const mockCache: ICacheStrategy = {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn(),
        has: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
        getStats: vi.fn(),
      };
      mockPreRenderManager.getCache = vi.fn().mockReturnValue(mockCache);

      const result = await manager.getPreRenderedToken('missing.png');

      expect(result).toBeNull();
    });
  });

  describe('preRender', () => {
    it('should trigger pre-rendering with context', async () => {
      const context: PreRenderContext = {
        type: 'tokens-hover',
        tokens: [],
        characters: [],
      };

      const result = await manager.preRender(context);

      expect(mockPreRenderManager.preRender).toHaveBeenCalledWith(context);
      expect(result).toEqual({ success: true, rendered: 5 });
    });

    it('should return pre-render result', async () => {
      const expectedResult: PreRenderResult = {
        success: true,
        rendered: 10,
        cached: 5,
        failed: 0,
      };
      mockPreRenderManager.preRender = vi.fn().mockResolvedValue(expectedResult);

      const context: PreRenderContext = {
        type: 'characters-hover',
        tokens: [],
        characters: [],
      };

      const result = await manager.preRender(context);

      expect(result).toEqual(expectedResult);
    });

    it('should handle pre-render errors', async () => {
      mockPreRenderManager.preRender = vi.fn().mockRejectedValue(new Error('Pre-render failed'));

      const context: PreRenderContext = {
        type: 'tokens-hover',
        tokens: [],
        characters: [],
      };

      await expect(manager.preRender(context)).rejects.toThrow('Pre-render failed');
    });
  });

  describe('cacheTokenBatch', () => {
    it('should cache tokens with default type', async () => {
      const tokens: Token[] = [
        { filename: 'token1.png', characterData: null } as Token,
        { filename: 'token2.png', characterData: null } as Token,
      ];

      await manager.cacheTokenBatch(tokens);

      expect(mockPreRenderManager.preRender).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'manual',
          tokens,
          characters: [],
        })
      );
    });

    it('should cache tokens with custom type', async () => {
      const tokens: Token[] = [{ filename: 'token1.png', characterData: null } as Token];

      await manager.cacheTokenBatch(tokens, 'tokens-hover');

      expect(mockPreRenderManager.preRender).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'tokens-hover',
        })
      );
    });

    it('should filter out null character data', async () => {
      const character = { id: 'washerwoman', name: 'Washerwoman' };
      const tokens: Token[] = [
        { filename: 'token1.png', characterData: character } as Token,
        { filename: 'token2.png', characterData: null } as Token,
      ];

      await manager.cacheTokenBatch(tokens);

      expect(mockPreRenderManager.preRender).toHaveBeenCalledWith(
        expect.objectContaining({
          characters: [character],
        })
      );
    });

    it('should throw error if caching fails', async () => {
      mockPreRenderManager.preRender = vi
        .fn()
        .mockResolvedValue({ success: false, error: 'Cache error' });
      const tokens: Token[] = [{ filename: 'token1.png', characterData: null } as Token];

      await expect(manager.cacheTokenBatch(tokens)).rejects.toThrow(
        'Failed to cache token batch: Cache error'
      );
    });
  });

  // ==========================================================================
  // Cache Invalidation
  // ==========================================================================

  describe('invalidateAsset', () => {
    it('should invalidate asset with default reason', async () => {
      await manager.invalidateAsset('asset-123');

      expect(mockInvalidationService.invalidateAsset).toHaveBeenCalledWith('asset-123', 'manual');
    });

    it('should invalidate asset with update reason', async () => {
      await manager.invalidateAsset('asset-456', 'update');

      expect(mockInvalidationService.invalidateAsset).toHaveBeenCalledWith('asset-456', 'update');
    });

    it('should invalidate asset with delete reason', async () => {
      await manager.invalidateAsset('asset-789', 'delete');

      expect(mockInvalidationService.invalidateAsset).toHaveBeenCalledWith('asset-789', 'delete');
    });
  });

  describe('invalidateCharacter', () => {
    it('should invalidate character with default reason', async () => {
      await manager.invalidateCharacter('washerwoman');

      expect(mockInvalidationService.invalidateCharacter).toHaveBeenCalledWith(
        'washerwoman',
        'manual'
      );
    });

    it('should invalidate character with update reason', async () => {
      await manager.invalidateCharacter('imp', 'update');

      expect(mockInvalidationService.invalidateCharacter).toHaveBeenCalledWith('imp', 'update');
    });

    it('should invalidate character with delete reason', async () => {
      await manager.invalidateCharacter('baron', 'delete');

      expect(mockInvalidationService.invalidateCharacter).toHaveBeenCalledWith('baron', 'delete');
    });
  });

  describe('invalidateProject', () => {
    it('should invalidate project with default reason', async () => {
      await manager.invalidateProject('project-123');

      expect(mockInvalidationService.invalidateProject).toHaveBeenCalledWith(
        'project-123',
        'manual'
      );
    });

    it('should invalidate project with update reason', async () => {
      await manager.invalidateProject('project-456', 'update');

      expect(mockInvalidationService.invalidateProject).toHaveBeenCalledWith(
        'project-456',
        'update'
      );
    });

    it('should invalidate project with delete reason', async () => {
      await manager.invalidateProject('project-789', 'delete');

      expect(mockInvalidationService.invalidateProject).toHaveBeenCalledWith(
        'project-789',
        'delete'
      );
    });
  });

  describe('invalidate', () => {
    it('should invalidate all caches for global scope', async () => {
      await manager.invalidate('global' as InvalidationScope);

      expect(mockInvalidationService.invalidateAll).toHaveBeenCalledWith('manual');
    });

    it('should invalidate asset scope', async () => {
      await manager.invalidate('asset' as InvalidationScope);

      expect(mockInvalidationService.invalidateAssets).toHaveBeenCalledWith([], 'manual');
    });

    it('should invalidate character scope', async () => {
      await manager.invalidate('character' as InvalidationScope);

      expect(mockInvalidationService.invalidateCharacters).toHaveBeenCalledWith([], 'manual');
    });

    it('should invalidate project scope', async () => {
      await manager.invalidate('project' as InvalidationScope);

      expect(mockInvalidationService.invalidateAll).toHaveBeenCalledWith('manual');
    });
  });

  // ==========================================================================
  // Cache Management
  // ==========================================================================

  describe('clearCache', () => {
    it('should clear image cache', async () => {
      await manager.clearCache('image');

      expect(mockImageCache.clear).toHaveBeenCalled();
    });

    it('should clear font cache', async () => {
      await manager.clearCache('font');

      expect(mockFontCache.clear).toHaveBeenCalled();
    });

    it('should clear pre-render cache by name', async () => {
      await manager.clearCache('tokens');

      expect(mockPreRenderManager.clearCache).toHaveBeenCalledWith('tokens');
    });

    it('should clear characters cache', async () => {
      await manager.clearCache('characters');

      expect(mockPreRenderManager.clearCache).toHaveBeenCalledWith('characters');
    });
  });

  describe('clearAll', () => {
    it('should clear all cache layers', async () => {
      await manager.clearAll();

      expect(mockPreRenderManager.clearAllCaches).toHaveBeenCalled();
      expect(mockImageCache.clear).toHaveBeenCalled();
      expect(mockFontCache.clear).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Statistics
  // ==========================================================================

  describe('getStats', () => {
    it('should return combined cache statistics', () => {
      const stats = manager.getStats();

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('preRender');
      expect(stats).toHaveProperty('image');
      expect(stats).toHaveProperty('font');
      expect(stats).toHaveProperty('total');
    });

    it('should include pre-render cache stats', () => {
      mockPreRenderManager.getAllCacheStats = vi.fn().mockReturnValue({
        tokens: { size: 10, hits: 100, misses: 10, hitRate: 0.9 },
      });

      const stats = manager.getStats();

      expect(stats.preRender.tokens).toEqual({
        size: 10,
        hits: 100,
        misses: 10,
        hitRate: 0.9,
      });
    });

    it('should include image cache stats', () => {
      mockImageCache.getStats = vi.fn().mockReturnValue({
        entries: 25,
        sizeMB: 7.2,
        maxSizeMB: 50,
      });

      const stats = manager.getStats();

      expect(stats.image).toEqual({
        entries: 25,
        sizeMB: 7.2,
        maxSizeMB: 50,
      });
    });

    it('should calculate total statistics', () => {
      mockPreRenderManager.getAllCacheStats = vi.fn().mockReturnValue({
        tokens: { size: 10, hits: 100, misses: 10, hitRate: 0.9 },
        characters: { size: 5, hits: 50, misses: 5, hitRate: 0.91 },
      });
      mockImageCache.getStats = vi.fn().mockReturnValue({
        entries: 20,
        sizeMB: 5.5,
        maxSizeMB: 50,
      });

      const stats = manager.getStats();

      expect(stats.total.layers).toBe(3);
      expect(stats.total.totalEntries).toBe(35); // 10 + 5 + 20
      expect(stats.total.totalSizeMB).toBeGreaterThan(0);
    });

    it('should round total size MB to 2 decimal places', () => {
      mockImageCache.getStats = vi.fn().mockReturnValue({
        entries: 10,
        sizeMB: 3.456789,
        maxSizeMB: 50,
      });

      const stats = manager.getStats();

      expect(stats.total.totalSizeMB).toBe(3.46);
    });
  });

  describe('getAllCacheStats', () => {
    it('should return all pre-render cache stats', () => {
      const mockStats: Record<string, CacheStats> = {
        tokens: { size: 10, hits: 100, misses: 10, hitRate: 0.9 },
        characters: { size: 5, hits: 50, misses: 5, hitRate: 0.91 },
      };
      mockPreRenderManager.getAllCacheStats = vi.fn().mockReturnValue(mockStats);

      const stats = manager.getAllCacheStats();

      expect(stats).toEqual(mockStats);
      expect(mockPreRenderManager.getAllCacheStats).toHaveBeenCalled();
    });
  });

  describe('getCacheStats', () => {
    it('should return stats for specific cache', () => {
      const mockStats: CacheStats = { size: 10, hits: 100, misses: 10, hitRate: 0.9 };
      mockPreRenderManager.getCacheStats = vi.fn().mockReturnValue(mockStats);

      const stats = manager.getCacheStats('tokens');

      expect(stats).toEqual(mockStats);
      expect(mockPreRenderManager.getCacheStats).toHaveBeenCalledWith('tokens');
    });

    it('should return null for non-existent cache', () => {
      mockPreRenderManager.getCacheStats = vi.fn().mockReturnValue(null);

      const stats = manager.getCacheStats('nonexistent');

      expect(stats).toBeNull();
    });
  });

  describe('isStrategyRendering', () => {
    it('should check if strategy is rendering', () => {
      mockPreRenderManager.isStrategyRendering = vi.fn().mockReturnValue(true);

      const result = manager.isStrategyRendering('tokens');

      expect(result).toBe(true);
      expect(mockPreRenderManager.isStrategyRendering).toHaveBeenCalledWith('tokens');
    });

    it('should return false if strategy is not rendering', () => {
      mockPreRenderManager.isStrategyRendering = vi.fn().mockReturnValue(false);

      const result = manager.isStrategyRendering('characters');

      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // Advanced Access
  // ==========================================================================

  describe('preRenderCacheManager', () => {
    it('should expose pre-render cache manager', () => {
      const preRenderManager = manager.preRenderCacheManager;

      expect(preRenderManager).toBe(mockPreRenderManager);
    });
  });

  describe('getCache', () => {
    it('should get cache instance by name', () => {
      const mockCache: ICacheStrategy = {
        get: vi.fn(),
        set: vi.fn(),
        has: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
        getStats: vi.fn(),
      };
      mockPreRenderManager.getCache = vi.fn().mockReturnValue(mockCache);

      const cache = manager.getCache('tokens');

      expect(cache).toBe(mockCache);
      expect(mockPreRenderManager.getCache).toHaveBeenCalledWith('tokens');
    });

    it('should return undefined for non-existent cache', () => {
      mockPreRenderManager.getCache = vi.fn().mockReturnValue(undefined);

      const cache = manager.getCache('nonexistent');

      expect(cache).toBeUndefined();
    });
  });

  describe('registerStrategy', () => {
    it('should register new pre-render strategy', () => {
      const mockStrategy: IPreRenderStrategy = {
        name: 'custom-strategy',
        preRender: vi.fn(),
      };

      manager.registerStrategy(mockStrategy);

      expect(mockPreRenderManager.registerStrategy).toHaveBeenCalledWith(mockStrategy);
    });
  });

  describe('registerCache', () => {
    it('should register new cache instance', () => {
      const mockCache: ICacheStrategy = {
        get: vi.fn(),
        set: vi.fn(),
        has: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
        getStats: vi.fn(),
      };

      manager.registerCache('custom-cache', mockCache);

      expect(mockPreRenderManager.registerCache).toHaveBeenCalledWith('custom-cache', mockCache);
    });
  });

  // ==========================================================================
  // Dependency Injection
  // ==========================================================================

  describe('Dependency Injection', () => {
    it('should accept injected preRenderManager', () => {
      const customManager = new CacheManager({
        preRenderManager: mockPreRenderManager,
      });

      expect(customManager).toBeDefined();
    });

    it('should accept injected imageCache', () => {
      const customManager = new CacheManager({
        imageCache: mockImageCache,
      });

      expect(customManager).toBeDefined();
    });

    it('should accept injected fontCache', () => {
      const customManager = new CacheManager({
        fontCache: mockFontCache as typeof mockFontCache,
      });

      expect(customManager).toBeDefined();
    });

    it('should accept injected invalidationService', () => {
      const customManager = new CacheManager({
        invalidationService: mockInvalidationService as typeof mockInvalidationService,
      });

      expect(customManager).toBeDefined();
    });

    it('should accept multiple injected dependencies', () => {
      const customManager = new CacheManager({
        preRenderManager: mockPreRenderManager,
        imageCache: mockImageCache,
        fontCache: mockFontCache as typeof mockFontCache,
        invalidationService: mockInvalidationService as typeof mockInvalidationService,
      });

      expect(customManager).toBeDefined();
    });

    it('should work with empty dependency object', () => {
      const customManager = new CacheManager({});

      expect(customManager).toBeDefined();
    });

    it('should work with undefined dependencies', () => {
      const customManager = new CacheManager();

      expect(customManager).toBeDefined();
    });
  });
});
