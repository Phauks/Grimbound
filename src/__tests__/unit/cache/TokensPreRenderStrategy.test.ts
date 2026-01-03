/**
 * Unit tests for TokensPreRenderStrategy
 *
 * Tests cover:
 * - shouldTrigger conditions
 * - preRender with dataUrl tokens (direct cache)
 * - preRender with canvas tokens (encoding needed)
 * - preloadImages functionality
 * - destroy cleanup
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ICacheStrategy } from '@/ts/cache/core/interfaces';
import type { CacheStats, PreRenderContext } from '@/ts/cache/core/types';
import { TokensPreRenderStrategy } from '@/ts/cache/strategies/TokensPreRenderStrategy';
import type { Character, GenerationOptions, Token } from '@/ts/types/index';

// Mock dependencies
vi.mock('@/ts/utils/imageCache', () => ({
  globalImageCache: {
    has: vi.fn(),
    preloadMany: vi.fn(),
  },
}));

vi.mock('@/ts/cache/utils/AdaptiveWorkerPool', () => ({
  AdaptiveWorkerPool: vi.fn().mockImplementation(() => ({
    execute: vi.fn(),
    terminate: vi.fn(),
    getAdaptiveStats: vi.fn().mockReturnValue({}),
  })),
}));

import { globalImageCache } from '@/ts/utils/imageCache';

// ============================================================================
// Test Helpers
// ============================================================================

const createMockCache = (): ICacheStrategy<string, string> => ({
  get: vi.fn().mockResolvedValue(null),
  set: vi.fn().mockResolvedValue(undefined),
  has: vi.fn().mockReturnValue(false),
  delete: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn().mockResolvedValue(undefined),
  getStats: vi.fn().mockReturnValue({
    size: 0,
    memoryUsage: 0,
    hitCount: 0,
    missCount: 0,
    evictionCount: 0,
    hitRate: 0,
  } as CacheStats),
  evict: vi.fn().mockResolvedValue(0),
  keys: vi.fn().mockReturnValue([]),
  invalidateByTag: vi.fn().mockResolvedValue(0),
  getByTag: vi.fn().mockResolvedValue([]),
});

const createMockCanvas = (): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 300;
  // Mock getContext to return a mock context
  const mockContext = {
    getImageData: vi.fn().mockReturnValue({
      data: new Uint8ClampedArray(300 * 300 * 4),
      width: 300,
      height: 300,
    }),
    fillRect: vi.fn(),
  };
  vi.spyOn(canvas, 'getContext').mockReturnValue(
    mockContext as unknown as CanvasRenderingContext2D
  );
  vi.spyOn(canvas, 'toDataURL').mockReturnValue('data:image/png;base64,encoded');
  return canvas;
};

const createMockToken = (overrides: Partial<Token> = {}): Token =>
  ({
    filename: 'washerwoman.png',
    characterId: 'washerwoman',
    tokenType: 'character',
    dataUrl: 'data:image/png;base64,existing',
    ...overrides,
  }) as Token;

const createMockCharacter = (overrides: Partial<Character> = {}): Character =>
  ({
    id: 'washerwoman',
    name: 'Washerwoman',
    team: 'townsfolk',
    ability: 'Test ability',
    image: 'https://example.com/washerwoman.png',
    ...overrides,
  }) as Character;

const createMockGenerationOptions = (
  overrides: Partial<GenerationOptions> = {}
): GenerationOptions =>
  ({
    diameter: 300,
    reminderDiameter: 200,
    dpi: 300,
    characterBackground: 'bg.png',
    reminderBackground: 'reminder-bg.png',
    ...overrides,
  }) as GenerationOptions;

const createPreRenderContext = (overrides: Partial<PreRenderContext> = {}): PreRenderContext => ({
  type: 'tokens-hover',
  tokens: [createMockToken()],
  characters: [createMockCharacter()],
  generationOptions: createMockGenerationOptions(),
  ...overrides,
});

// ============================================================================
// Tests
// ============================================================================

describe('TokensPreRenderStrategy', () => {
  let strategy: TokensPreRenderStrategy;
  let mockCache: ICacheStrategy<string, string>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCache = createMockCache();
    // Disable workers for testing (OffscreenCanvas not available in jsdom)
    strategy = new TokensPreRenderStrategy(mockCache, {
      maxTokens: 20,
      maxConcurrent: 5,
      useWorkers: false,
      useIdleCallback: false,
      encodingQuality: 0.92,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    strategy.destroy();
  });

  // --------------------------------------------------------------------------
  // Strategy Properties
  // --------------------------------------------------------------------------

  describe('Strategy Properties', () => {
    it('should have name "tokens"', () => {
      expect(strategy.name).toBe('tokens');
    });

    it('should have priority 1', () => {
      expect(strategy.priority).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // shouldTrigger
  // --------------------------------------------------------------------------

  describe('shouldTrigger', () => {
    it('should return true for tokens-hover with tokens', () => {
      const context = createPreRenderContext();

      expect(strategy.shouldTrigger(context)).toBe(true);
    });

    it('should return false for non-tokens-hover type', () => {
      const context = createPreRenderContext({ type: 'characters-hover' });

      expect(strategy.shouldTrigger(context)).toBe(false);
    });

    it('should return false when tokens is empty', () => {
      const context = createPreRenderContext({ tokens: [] });

      expect(strategy.shouldTrigger(context)).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // preRender - Tokens with dataUrl
  // --------------------------------------------------------------------------

  describe('preRender - Tokens with dataUrl', () => {
    it('should cache tokens with existing dataUrl directly', async () => {
      const token = createMockToken({ dataUrl: 'data:image/png;base64,existing' });
      const context = createPreRenderContext({ tokens: [token] });

      const result = await strategy.preRender(context);

      expect(result.success).toBe(true);
      expect(result.rendered).toBe(1);
      expect(mockCache.set).toHaveBeenCalledWith(
        'washerwoman.png',
        'data:image/png;base64,existing'
      );
    });

    it('should skip already cached tokens', async () => {
      vi.mocked(mockCache.has).mockReturnValue(true);
      const context = createPreRenderContext();

      const result = await strategy.preRender(context);

      expect(result.success).toBe(true);
      expect(result.rendered).toBe(0);
      expect(result.skipped).toBe(1);
      expect(mockCache.set).not.toHaveBeenCalled();
    });

    it('should process multiple tokens', async () => {
      const tokens = [
        createMockToken({ filename: 'token1.png' }),
        createMockToken({ filename: 'token2.png' }),
        createMockToken({ filename: 'token3.png' }),
      ];
      const context = createPreRenderContext({ tokens });

      const result = await strategy.preRender(context);

      expect(result.success).toBe(true);
      expect(result.rendered).toBe(3);
      expect(mockCache.set).toHaveBeenCalledTimes(3);
    });

    it('should respect maxTokens limit', async () => {
      const limitedStrategy = new TokensPreRenderStrategy(mockCache, {
        maxTokens: 2,
        maxConcurrent: 5,
        useWorkers: false,
        useIdleCallback: false,
        encodingQuality: 0.92,
      });

      const tokens = [
        createMockToken({ filename: 'token1.png' }),
        createMockToken({ filename: 'token2.png' }),
        createMockToken({ filename: 'token3.png' }),
        createMockToken({ filename: 'token4.png' }),
      ];
      const context = createPreRenderContext({ tokens });

      const result = await limitedStrategy.preRender(context);

      // Only first 2 should be processed
      expect(result.rendered).toBe(2);
      expect(mockCache.set).toHaveBeenCalledTimes(2);

      limitedStrategy.destroy();
    });
  });

  // --------------------------------------------------------------------------
  // preRender - Tokens with canvas (no dataUrl)
  // --------------------------------------------------------------------------

  describe('preRender - Tokens with canvas', () => {
    it('should encode canvas tokens on main thread', async () => {
      const canvas = createMockCanvas();
      const token = createMockToken({
        dataUrl: undefined,
        canvas,
      });
      const context = createPreRenderContext({ tokens: [token] });

      const result = await strategy.preRender(context);

      expect(result.success).toBe(true);
      expect(result.rendered).toBe(1);
      expect(canvas.toDataURL).toHaveBeenCalled();
      expect(mockCache.set).toHaveBeenCalledWith(
        'washerwoman.png',
        'data:image/png;base64,encoded'
      );
    });

    it('should skip tokens without canvas or dataUrl', async () => {
      const token = createMockToken({
        dataUrl: undefined,
        canvas: undefined,
      });
      const context = createPreRenderContext({ tokens: [token] });

      const result = await strategy.preRender(context);

      expect(result.success).toBe(true);
      expect(result.rendered).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it('should skip tokens with invalid canvas (width <= 1)', async () => {
      const canvas = createMockCanvas();
      canvas.width = 1;
      const token = createMockToken({
        dataUrl: undefined,
        canvas,
      });
      const context = createPreRenderContext({ tokens: [token] });

      const result = await strategy.preRender(context);

      expect(result.rendered).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it('should handle mixed tokens (some with dataUrl, some with canvas)', async () => {
      const canvas = createMockCanvas();
      const tokens = [
        createMockToken({
          filename: 'with-dataurl.png',
          dataUrl: 'data:image/png;base64,existing',
        }),
        createMockToken({ filename: 'with-canvas.png', dataUrl: undefined, canvas }),
        createMockToken({ filename: 'neither.png', dataUrl: undefined, canvas: undefined }),
      ];
      const context = createPreRenderContext({ tokens });

      const result = await strategy.preRender(context);

      expect(result.success).toBe(true);
      expect(result.rendered).toBe(2); // dataUrl + canvas
      expect(result.skipped).toBe(1); // neither
    });
  });

  // --------------------------------------------------------------------------
  // preRender - Metadata
  // --------------------------------------------------------------------------

  describe('preRender - Metadata', () => {
    it('should include strategy name in metadata', async () => {
      const context = createPreRenderContext();

      const result = await strategy.preRender(context);

      expect(result.metadata?.strategy).toBe('tokens');
    });

    it('should include token counts in metadata', async () => {
      const tokens = [
        createMockToken({ filename: 'token1.png' }),
        createMockToken({ filename: 'token2.png' }),
      ];
      const context = createPreRenderContext({ tokens });

      const result = await strategy.preRender(context);

      expect(result.metadata?.tokensProcessed).toBe(2);
      expect(result.metadata?.totalTokens).toBe(2);
    });

    it('should include cache stats in metadata', async () => {
      const context = createPreRenderContext();

      const result = await strategy.preRender(context);

      expect(result.metadata?.cacheStats).toBeDefined();
    });

    it('should indicate worker usage in metadata', async () => {
      const context = createPreRenderContext();

      const result = await strategy.preRender(context);

      expect(result.metadata?.useWorkers).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // preloadImages
  // --------------------------------------------------------------------------

  describe('preloadImages', () => {
    beforeEach(() => {
      vi.stubGlobal('requestIdleCallback', (cb: () => void) => {
        cb();
        return 1;
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should extract image URLs from characters', async () => {
      vi.mocked(globalImageCache.has).mockReturnValue(false);
      vi.mocked(globalImageCache.preloadMany).mockResolvedValue(undefined);

      const character = createMockCharacter({ image: 'https://example.com/char.png' });
      const context = createPreRenderContext({ characters: [character] });

      await strategy.preloadImages(context);

      expect(globalImageCache.preloadMany).toHaveBeenCalledWith(
        expect.arrayContaining(['https://example.com/char.png']),
        false,
        undefined
      );
    });

    it('should extract array of character images', async () => {
      vi.mocked(globalImageCache.has).mockReturnValue(false);
      vi.mocked(globalImageCache.preloadMany).mockResolvedValue(undefined);

      const character = createMockCharacter({
        image: ['url1.png', 'url2.png'] as unknown as string,
      });
      const context = createPreRenderContext({ characters: [character] });

      await strategy.preloadImages(context);

      expect(globalImageCache.preloadMany).toHaveBeenCalledWith(
        expect.arrayContaining(['url1.png', 'url2.png']),
        false,
        undefined
      );
    });

    it('should extract background URLs from generation options', async () => {
      vi.mocked(globalImageCache.has).mockReturnValue(false);
      vi.mocked(globalImageCache.preloadMany).mockResolvedValue(undefined);

      const options = createMockGenerationOptions({
        characterBackground: 'char-bg.png',
        reminderBackground: 'reminder-bg.png',
        logoUrl: 'logo.png',
      });
      const context = createPreRenderContext({ generationOptions: options });

      await strategy.preloadImages(context);

      expect(globalImageCache.preloadMany).toHaveBeenCalledWith(
        expect.arrayContaining(['char-bg.png', 'reminder-bg.png', 'logo.png']),
        false,
        undefined
      );
    });

    it('should skip already cached images', async () => {
      vi.mocked(globalImageCache.has).mockReturnValue(true);

      const onProgress = vi.fn();
      const context = createPreRenderContext();

      await strategy.preloadImages(context, onProgress);

      expect(globalImageCache.preloadMany).not.toHaveBeenCalled();
      expect(onProgress).toHaveBeenCalledWith(0, 0);
    });

    it('should respect maxTokens for character preloading', async () => {
      const limitedStrategy = new TokensPreRenderStrategy(mockCache, {
        maxTokens: 2,
        maxConcurrent: 5,
        useWorkers: false,
        useIdleCallback: true,
        encodingQuality: 0.92,
      });

      vi.mocked(globalImageCache.has).mockReturnValue(false);
      vi.mocked(globalImageCache.preloadMany).mockResolvedValue(undefined);

      const characters = [
        createMockCharacter({ id: 'char1', image: 'url1.png' }),
        createMockCharacter({ id: 'char2', image: 'url2.png' }),
        createMockCharacter({ id: 'char3', image: 'url3.png' }),
      ];
      const context = createPreRenderContext({ characters });

      await limitedStrategy.preloadImages(context);

      // Should only preload first 2 characters
      const calls = vi.mocked(globalImageCache.preloadMany).mock.calls;
      if (calls.length > 0) {
        const urls = calls[0][0] as string[];
        expect(urls).not.toContain('url3.png');
      }

      limitedStrategy.destroy();
    });

    it('should use setTimeout fallback when useIdleCallback is false', async () => {
      const noIdleStrategy = new TokensPreRenderStrategy(mockCache, {
        maxTokens: 20,
        maxConcurrent: 5,
        useWorkers: false,
        useIdleCallback: false,
        encodingQuality: 0.92,
      });

      vi.useFakeTimers();
      vi.mocked(globalImageCache.has).mockReturnValue(false);
      vi.mocked(globalImageCache.preloadMany).mockResolvedValue(undefined);

      const context = createPreRenderContext();
      const promise = noIdleStrategy.preloadImages(context);

      await vi.runAllTimersAsync();
      await promise;

      expect(globalImageCache.preloadMany).toHaveBeenCalled();

      vi.useRealTimers();
      noIdleStrategy.destroy();
    });
  });

  // --------------------------------------------------------------------------
  // destroy
  // --------------------------------------------------------------------------

  describe('destroy', () => {
    it('should be callable without error', () => {
      expect(() => strategy.destroy()).not.toThrow();
    });

    it('should be safe to call multiple times', () => {
      strategy.destroy();
      expect(() => strategy.destroy()).not.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // Error Handling
  // --------------------------------------------------------------------------

  describe('Error Handling', () => {
    it('should handle canvas encoding errors gracefully', async () => {
      const canvas = createMockCanvas();
      vi.spyOn(canvas, 'toDataURL').mockImplementation(() => {
        throw new Error('Encoding failed');
      });

      const token = createMockToken({
        filename: 'error-token.png',
        dataUrl: undefined,
        canvas,
      });
      const context = createPreRenderContext({ tokens: [token] });

      const result = await strategy.preRender(context);

      // Should still succeed overall but with failed count
      expect(result.success).toBe(true);
      expect(result.rendered).toBe(0);
      expect(result.skipped).toBe(1); // Failed tokens counted as skipped
    });
  });
});
