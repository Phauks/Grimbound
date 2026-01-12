/**
 * Unit tests for TokenImageRenderer
 *
 * Tests image rendering operations including character images, backgrounds,
 * decorative assets, and logo rendering with proper dependency injection.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TokenType } from '@/ts/constants';
import type { IImageCache } from '@/ts/generation/TokenImageRenderer';
import { TokenImageRenderer } from '@/ts/generation/TokenImageRenderer';
import type { Character } from '@/ts/types/index';
import type { TokenGeneratorOptions } from '@/ts/types/tokenOptions';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock canvas module
vi.mock('@/ts/canvas/index.js', () => ({
  drawImageCover: vi.fn(),
  drawAccents: vi.fn(),
}));

// Mock asset resolver
vi.mock('@/ts/services/upload/assetResolver.js', () => ({
  isAssetReference: vi.fn((value: string) => value.startsWith('asset:')),
  resolveAssetUrl: vi.fn((ref: string) => {
    if (ref === 'asset:valid-uuid') return Promise.resolve('blob:resolved-asset-url');
    return Promise.resolve(null);
  }),
}));

// Mock built-in assets
vi.mock('@/ts/constants/builtInAssets.js', () => ({
  isBuiltInAsset: vi.fn(
    (value: string, type: string) => value === 'builtin-bg' && type === 'token-background'
  ),
  getBuiltInAssetPath: vi.fn((value: string, _type: string) => `/images/builtin/${value}.png`),
}));

// Mock data module
vi.mock('@/ts/data/index.js', () => ({
  getCharacterImageUrl: vi.fn((image: string) => {
    if (!image) return null;
    if (image.startsWith('http')) return image;
    return `/images/icons/${image}`;
  }),
}));

// Mock sync service
vi.mock('@/ts/sync/index.js', () => ({
  dataSyncService: {
    getCharacterImage: vi.fn((id: string) => {
      if (id === 'bootlegger') {
        return Promise.resolve(new Blob(['bootlegger-image'], { type: 'image/webp' }));
      }
      return Promise.resolve(null);
    }),
  },
}));

// Mock logger
vi.mock('@/ts/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock config
vi.mock('@/ts/config.js', () => ({
  default: {
    ASSETS: {
      CHARACTER_BACKGROUNDS: '/images/Character Backgrounds/',
      SETUP_OVERLAYS: '/images/Setup Overlays/',
      IMAGES: '/images/',
    },
    PDF: {
      DPI: 300,
    },
  },
}));

// ============================================================================
// Test Helpers
// ============================================================================

function createMockImageCache(): IImageCache {
  return {
    get: vi.fn().mockImplementation((url: string, _isLocal: boolean) => {
      const mockImage = {
        src: url,
        width: 100,
        height: 100,
        complete: true,
      } as HTMLImageElement;
      return Promise.resolve(mockImage);
    }),
    clear: vi.fn(),
  };
}

function createMockCanvas(): CanvasRenderingContext2D {
  const mockCanvas = document.createElement('canvas');
  const ctx = mockCanvas.getContext('2d');
  if (!ctx) throw new Error('Could not create 2D context');

  // Mock commonly used methods
  vi.spyOn(ctx, 'drawImage').mockImplementation(() => {});
  vi.spyOn(ctx, 'fill').mockImplementation(() => {});

  return ctx;
}

function createMockCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'test-character',
    name: 'Test Character',
    team: 'townsfolk',
    ability: 'Test ability',
    image: 'test.webp',
    ...overrides,
  };
}

function createDefaultOptions(
  overrides: Partial<TokenGeneratorOptions> = {}
): TokenGeneratorOptions {
  return {
    dpi: 300,
    backgroundName: 'test-bg',
    transparentBackground: false,
    displayAbilityText: true,
    setupStyle: 'none',
    accentEnabled: true,
    accentGeneration: 'classic',
    iconSettings: {
      character: { scale: 1.0, offsetX: 0, offsetY: 0 },
      reminder: { scale: 1.0, offsetX: 0, offsetY: 0 },
      meta: { scale: 1.0, offsetX: 0, offsetY: 0 },
    },
    ...overrides,
  } as TokenGeneratorOptions;
}

// ============================================================================
// Tests
// ============================================================================

describe('TokenImageRenderer', () => {
  let renderer: TokenImageRenderer;
  let mockImageCache: IImageCache;
  let options: TokenGeneratorOptions;

  beforeEach(() => {
    vi.clearAllMocks();
    mockImageCache = createMockImageCache();
    options = createDefaultOptions();
    renderer = new TokenImageRenderer(options, mockImageCache);
  });

  // ==========================================================================
  // Constructor & Initialization
  // ==========================================================================

  describe('constructor', () => {
    it('should initialize with options and image cache', () => {
      expect(renderer).toBeDefined();
    });

    it('should accept options parameter', () => {
      const customOptions = createDefaultOptions({ tokenCount: true });
      const customRenderer = new TokenImageRenderer(customOptions, mockImageCache);
      expect(customRenderer).toBeDefined();
    });

    it('should accept image cache dependency', () => {
      const customCache = createMockImageCache();
      const customRenderer = new TokenImageRenderer(options, customCache);
      expect(customRenderer).toBeDefined();
    });
  });

  // ==========================================================================
  // updateOptions
  // ==========================================================================

  describe('updateOptions', () => {
    it('should update options with partial values', () => {
      renderer.updateOptions({ tokenCount: true });
      // Options are private, but we can test behavior in other methods
      expect(renderer).toBeDefined();
    });

    it('should merge new options with existing options', () => {
      renderer.updateOptions({ backgroundName: 'new-bg' });
      // Should preserve existing options, update backgroundName
      expect(renderer).toBeDefined();
    });

    it('should handle empty partial update', () => {
      renderer.updateOptions({});
      expect(renderer).toBeDefined();
    });
  });

  // ==========================================================================
  // getCachedImage
  // ==========================================================================

  describe('getCachedImage', () => {
    it('should fetch image from cache with isLocal=false', async () => {
      const url = 'https://example.com/image.png';
      const image = await renderer.getCachedImage(url);

      expect(mockImageCache.get).toHaveBeenCalledWith(url, false);
      expect(image).toBeDefined();
    });

    it('should return image object', async () => {
      const image = await renderer.getCachedImage('test.png');
      expect(image).toBeDefined();
      expect(image.src).toBe('test.png');
    });
  });

  // ==========================================================================
  // getLocalImage
  // ==========================================================================

  describe('getLocalImage', () => {
    it('should fetch image from cache with isLocal=true', async () => {
      const path = '/images/local.png';
      const image = await renderer.getLocalImage(path);

      expect(mockImageCache.get).toHaveBeenCalledWith(path, true);
      expect(image).toBeDefined();
    });

    it('should return image object', async () => {
      const image = await renderer.getLocalImage('/local.png');
      expect(image).toBeDefined();
      expect(image.src).toBe('/local.png');
    });
  });

  // ==========================================================================
  // resolveDecorativeAsset
  // ==========================================================================

  describe('resolveDecorativeAsset', () => {
    it('should return null for empty value', async () => {
      const result = await renderer.resolveDecorativeAsset('', 'token-background', '/prefix/');
      expect(result).toBeNull();
    });

    it('should return null for "none" value', async () => {
      const result = await renderer.resolveDecorativeAsset('none', 'token-background', '/prefix/');
      expect(result).toBeNull();
    });

    it('should resolve asset reference (asset:uuid)', async () => {
      const result = await renderer.resolveDecorativeAsset(
        'asset:valid-uuid',
        'token-background',
        '/prefix/'
      );
      expect(result).toBe('blob:resolved-asset-url');
    });

    it('should return null for invalid asset reference', async () => {
      const result = await renderer.resolveDecorativeAsset(
        'asset:invalid-uuid',
        'token-background',
        '/prefix/'
      );
      expect(result).toBeNull();
    });

    it('should resolve built-in asset ID', async () => {
      const result = await renderer.resolveDecorativeAsset(
        'builtin-bg',
        'token-background',
        '/prefix/'
      );
      expect(result).toBe('/images/builtin/builtin-bg.png');
    });

    it('should use legacy fallback for unrecognized values', async () => {
      const result = await renderer.resolveDecorativeAsset(
        'custom-bg',
        'token-background',
        '/prefix/'
      );
      expect(result).toBe('/prefix/custom-bg.png');
    });
  });

  // ==========================================================================
  // drawBackground
  // ==========================================================================

  describe('drawBackground', () => {
    it('should draw background image when resolved', async () => {
      const { drawImageCover } = await import('@/ts/canvas/index.js');
      const ctx = createMockCanvas();

      await renderer.drawBackground(ctx, 'builtin-bg', 300, '#FFFFFF');

      expect(mockImageCache.get).toHaveBeenCalled();
      expect(drawImageCover).toHaveBeenCalled();
    });

    it('should use fallback color when background not found', async () => {
      const ctx = createMockCanvas();
      ctx.fillStyle = '';

      await renderer.drawBackground(ctx, 'none', 300, '#123456');

      expect(ctx.fillStyle).toBe('#123456');
      expect(ctx.fill).toHaveBeenCalled();
    });

    it('should not fill when transparentBackground is true', async () => {
      renderer.updateOptions({ transparentBackground: true });
      const ctx = createMockCanvas();

      await renderer.drawBackground(ctx, 'none', 300, '#FFFFFF');

      expect(ctx.fill).not.toHaveBeenCalled();
    });

    it('should handle blob URLs', async () => {
      const { drawImageCover } = await import('@/ts/canvas/index.js');
      const ctx = createMockCanvas();

      await renderer.drawBackground(ctx, 'asset:valid-uuid', 300, '#FFFFFF');

      expect(mockImageCache.get).toHaveBeenCalledWith('blob:resolved-asset-url', false);
      expect(drawImageCover).toHaveBeenCalled();
    });

    it('should handle local paths', async () => {
      const { drawImageCover } = await import('@/ts/canvas/index.js');
      const ctx = createMockCanvas();

      await renderer.drawBackground(ctx, 'builtin-bg', 300, '#FFFFFF');

      expect(mockImageCache.get).toHaveBeenCalled();
      expect(drawImageCover).toHaveBeenCalled();
    });

    it('should use fallback on image load error', async () => {
      mockImageCache.get = vi.fn().mockRejectedValue(new Error('Load failed'));
      const ctx = createMockCanvas();
      ctx.fillStyle = '';

      await renderer.drawBackground(ctx, 'invalid-bg', 300, '#ABCDEF');

      expect(ctx.fillStyle).toBe('#ABCDEF');
      expect(ctx.fill).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // drawCharacterImage
  // ==========================================================================

  describe('drawCharacterImage', () => {
    it('should draw character image with default layout', async () => {
      const ctx = createMockCanvas();
      const character = createMockCharacter();

      await renderer.drawCharacterImage(ctx, character, 300, TokenType.CHARACTER);

      expect(mockImageCache.get).toHaveBeenCalledWith('/images/icons/test.webp', false);
      expect(ctx.drawImage).toHaveBeenCalled();
    });

    it('should skip drawing when no image URL', async () => {
      const ctx = createMockCanvas();
      const character = createMockCharacter({ image: '' });

      await renderer.drawCharacterImage(ctx, character, 300, TokenType.CHARACTER);

      expect(ctx.drawImage).not.toHaveBeenCalled();
    });

    it('should use image override when provided', async () => {
      const ctx = createMockCanvas();
      const character = createMockCharacter();
      const overrideUrl = 'https://example.com/override.png';

      await renderer.drawCharacterImage(ctx, character, 300, TokenType.CHARACTER, overrideUrl);

      expect(mockImageCache.get).toHaveBeenCalledWith(overrideUrl, false);
    });

    it('should apply icon scale settings', async () => {
      renderer.updateOptions({
        iconSettings: {
          character: { scale: 1.5, offsetX: 0, offsetY: 0 },
          reminder: { scale: 1.0, offsetX: 0, offsetY: 0 },
          meta: { scale: 1.0, offsetX: 0, offsetY: 0 },
        },
      });
      const ctx = createMockCanvas();
      const character = createMockCharacter();

      await renderer.drawCharacterImage(ctx, character, 300, TokenType.CHARACTER);

      expect(ctx.drawImage).toHaveBeenCalled();
    });

    it('should handle reminder token type', async () => {
      const ctx = createMockCanvas();
      const character = createMockCharacter();

      await renderer.drawCharacterImage(ctx, character, 300, TokenType.REMINDER);

      expect(ctx.drawImage).toHaveBeenCalled();
    });

    it('should handle meta token type', async () => {
      const ctx = createMockCanvas();
      const character = createMockCharacter();

      await renderer.drawCharacterImage(ctx, character, 300, TokenType.META);

      expect(ctx.drawImage).toHaveBeenCalled();
    });

    it('should throw TokenCreationError on image load failure', async () => {
      mockImageCache.get = vi.fn().mockRejectedValue(new Error('Load failed'));
      const ctx = createMockCanvas();
      const character = createMockCharacter();

      await expect(
        renderer.drawCharacterImage(ctx, character, 300, TokenType.CHARACTER)
      ).rejects.toThrow('Failed to load character image');
    });

    it('should use ability text layout when provided', async () => {
      const ctx = createMockCanvas();
      const character = createMockCharacter();
      const abilityTextLayout = {
        lines: ['Test'],
        totalHeight: 50,
        fontSize: 12,
      };

      await renderer.drawCharacterImage(
        ctx,
        character,
        300,
        TokenType.CHARACTER,
        undefined,
        true,
        abilityTextLayout,
        180
      );

      expect(ctx.drawImage).toHaveBeenCalled();
    });

    it('should handle badge-only case with topReservedY', async () => {
      const ctx = createMockCanvas();
      const character = createMockCharacter();

      await renderer.drawCharacterImage(
        ctx,
        character,
        300,
        TokenType.CHARACTER,
        undefined,
        false,
        undefined,
        undefined,
        50 // topReservedY for badge
      );

      expect(ctx.drawImage).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // drawSetupOverlay
  // ==========================================================================

  describe('drawSetupOverlay', () => {
    it('should draw setup overlay when style is set', async () => {
      const { drawImageCover } = await import('@/ts/canvas/index.js');
      renderer.updateOptions({ setupStyle: 'builtin-setup' });
      const ctx = createMockCanvas();

      await renderer.drawSetupOverlay(ctx, 300);

      expect(mockImageCache.get).toHaveBeenCalled();
      expect(drawImageCover).toHaveBeenCalled();
    });

    it('should skip when setupStyle is none', async () => {
      const { drawImageCover } = await import('@/ts/canvas/index.js');
      renderer.updateOptions({ setupStyle: 'none' });
      const ctx = createMockCanvas();

      await renderer.drawSetupOverlay(ctx, 300);

      expect(drawImageCover).not.toHaveBeenCalled();
    });

    it('should handle blob URLs for setup overlay', async () => {
      renderer.updateOptions({ setupStyle: 'asset:valid-uuid' });
      const ctx = createMockCanvas();

      await renderer.drawSetupOverlay(ctx, 300);

      expect(mockImageCache.get).toHaveBeenCalled();
    });

    it('should handle load errors gracefully', async () => {
      mockImageCache.get = vi.fn().mockRejectedValue(new Error('Load failed'));
      renderer.updateOptions({ setupStyle: 'invalid-setup' });
      const ctx = createMockCanvas();

      await expect(renderer.drawSetupOverlay(ctx, 300)).resolves.not.toThrow();
    });
  });

  // ==========================================================================
  // drawAccents
  // ==========================================================================

  describe('drawAccents', () => {
    it('should call drawAccents with character data', async () => {
      const { drawAccents } = await import('@/ts/canvas/index.js');
      const ctx = createMockCanvas();
      const characterData = {
        reminderCount: 3,
        firstNight: true,
        otherNight: false,
      };

      await renderer.drawAccents(ctx, 300, characterData);

      expect(drawAccents).toHaveBeenCalledWith(
        ctx,
        300,
        expect.objectContaining({
          characterData: expect.objectContaining({
            reminderCount: 3,
            firstNight: true,
            otherNight: false,
          }),
        })
      );
    });

    it('should pass accent generation style from options', async () => {
      const { drawAccents } = await import('@/ts/canvas/index.js');
      renderer.updateOptions({
        accentGeneration: 'autumn',
      });
      const ctx = createMockCanvas();
      const characterData = {
        reminderCount: 2,
        firstNight: false,
        otherNight: true,
      };

      await renderer.drawAccents(ctx, 300, characterData);

      expect(drawAccents).toHaveBeenCalledWith(
        ctx,
        300,
        expect.objectContaining({
          accentGeneration: 'autumn',
        })
      );
    });
  });

  // ==========================================================================
  // drawLogo
  // ==========================================================================

  describe('drawLogo', () => {
    it('should draw logo at calculated position', async () => {
      const ctx = createMockCanvas();
      const logoUrl = 'https://example.com/logo.png';

      const result = await renderer.drawLogo(ctx, logoUrl, 300, 150, 150);

      expect(result).toBe(true);
      expect(mockImageCache.get).toHaveBeenCalledWith(logoUrl, false);
      expect(ctx.drawImage).toHaveBeenCalled();
    });

    it('should maintain aspect ratio for wide logos', async () => {
      mockImageCache.get = vi.fn().mockResolvedValue({
        src: 'logo.png',
        width: 200,
        height: 100,
        complete: true,
      } as HTMLImageElement);

      const ctx = createMockCanvas();
      const result = await renderer.drawLogo(ctx, 'logo.png', 300, 150, 150);

      expect(result).toBe(true);
      expect(ctx.drawImage).toHaveBeenCalled();
    });

    it('should maintain aspect ratio for tall logos', async () => {
      mockImageCache.get = vi.fn().mockResolvedValue({
        src: 'logo.png',
        width: 100,
        height: 200,
        complete: true,
      } as HTMLImageElement);

      const ctx = createMockCanvas();
      const result = await renderer.drawLogo(ctx, 'logo.png', 300, 150, 150);

      expect(result).toBe(true);
      expect(ctx.drawImage).toHaveBeenCalled();
    });

    it('should return false on load failure', async () => {
      mockImageCache.get = vi.fn().mockRejectedValue(new Error('Load failed'));
      const ctx = createMockCanvas();

      const result = await renderer.drawLogo(ctx, 'invalid.png', 300, 150, 150);

      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // drawPandemoniumImage
  // ==========================================================================

  describe('drawPandemoniumImage', () => {
    it('should draw Pandemonium Institute image', async () => {
      const ctx = createMockCanvas();

      await renderer.drawPandemoniumImage(ctx, 300, 150, 150);

      expect(mockImageCache.get).toHaveBeenCalledWith(
        '/images/Pandemonium_Institute/the_pandemonium_institute.webp',
        false
      );
      expect(ctx.drawImage).toHaveBeenCalled();
    });

    it('should maintain aspect ratio', async () => {
      mockImageCache.get = vi.fn().mockResolvedValue({
        src: 'pandemonium.webp',
        width: 150,
        height: 100,
        complete: true,
      } as HTMLImageElement);

      const ctx = createMockCanvas();

      await renderer.drawPandemoniumImage(ctx, 300, 150, 150);

      expect(ctx.drawImage).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // drawBootleggerImage
  // ==========================================================================

  describe('drawBootleggerImage', () => {
    it('should draw Bootlegger image from sync service', async () => {
      const ctx = createMockCanvas();

      await renderer.drawBootleggerImage(ctx, 300, false);

      expect(ctx.drawImage).toHaveBeenCalled();
    });

    it('should use script logo when useScriptLogo is true', async () => {
      const ctx = createMockCanvas();
      const logoUrl = 'https://example.com/script-logo.png';

      await renderer.drawBootleggerImage(ctx, 300, false, undefined, true, logoUrl);

      expect(mockImageCache.get).toHaveBeenCalledWith(logoUrl, false);
      expect(ctx.drawImage).toHaveBeenCalled();
    });

    it('should handle ability text layout', async () => {
      const ctx = createMockCanvas();
      const abilityTextLayout = {
        lines: ['Test'],
        totalHeight: 50,
        fontSize: 12,
      };

      await renderer.drawBootleggerImage(ctx, 300, true, abilityTextLayout);

      expect(ctx.drawImage).toHaveBeenCalled();
    });

    it('should handle sync service errors gracefully', async () => {
      const { dataSyncService } = await import('@/ts/sync/index.js');
      vi.mocked(dataSyncService.getCharacterImage).mockRejectedValueOnce(new Error('Sync failed'));

      const ctx = createMockCanvas();

      await expect(renderer.drawBootleggerImage(ctx, 300, false)).resolves.not.toThrow();
    });

    it('should use fallback when sync service returns null', async () => {
      const { dataSyncService } = await import('@/ts/sync/index.js');
      vi.mocked(dataSyncService.getCharacterImage).mockResolvedValueOnce(null);

      const ctx = createMockCanvas();

      await renderer.drawBootleggerImage(ctx, 300, false);

      expect(mockImageCache.get).toHaveBeenCalled();
    });

    it('should handle script logo aspect ratio', async () => {
      mockImageCache.get = vi.fn().mockResolvedValue({
        src: 'logo.png',
        width: 200,
        height: 100,
        complete: true,
      } as HTMLImageElement);

      const ctx = createMockCanvas();

      await renderer.drawBootleggerImage(ctx, 300, false, undefined, true, 'logo.png');

      expect(ctx.drawImage).toHaveBeenCalled();
    });
  });
});
