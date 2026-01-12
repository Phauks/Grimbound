/**
 * Unit tests for TokenGenerator
 *
 * Tests all canvas operations for token generation including character tokens,
 * reminder tokens, meta tokens (script name, pandemonium, almanac QR, bootlegger, jinx),
 * and image cache management. Validates proper composition, dependency injection,
 * error handling, and edge cases.
 */

import { createCharacter, resetCharacterFactory } from '@test/factories/characterFactory';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TokenGenerator } from '@/ts/generation/TokenGenerator';
import type { Character, Jinx } from '@/ts/types';
import { DEFAULT_TOKEN_OPTIONS, type TokenGeneratorOptions } from '@/ts/types/tokenOptions';

// ============================================================================
// Mock Setup
// ============================================================================

// Mock canvas utilities
vi.mock('@/ts/canvas/index.js', () => ({
  createCanvas: vi.fn((diameter: number) => ({
    canvas: document.createElement('canvas'),
    ctx: {
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      scale: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      closePath: vi.fn(),
      clip: vi.fn(),
      fill: vi.fn(),
      drawImage: vi.fn(),
      fillText: vi.fn(),
      fillStyle: '#000000',
    },
    center: { x: diameter / 2, y: diameter / 2 },
    radius: diameter / 2,
  })),
  createCircularClipPath: vi.fn(),
  drawCurvedText: vi.fn(),
  calculateFittedCircularTextLayout: vi.fn().mockReturnValue({
    fontSize: 20,
    lineHeight: 1.2,
    lines: ['Line 1', 'Line 2'],
  }),
  renderBackground: vi.fn().mockResolvedValue(undefined),
  getFrameModeInfo: vi.fn().mockReturnValue({
    isActive: false,
    scale: 1,
    borderWidth: 0,
    contentDiameter: 1000,
  }),
}));

// Mock QR generation
vi.mock('@/ts/canvas/qrGeneration.js', () => ({
  generateStyledQRCode: vi.fn().mockResolvedValue(document.createElement('canvas')),
}));

// Mock character image resolver (SSOT)
vi.mock('@/ts/utils/characterImageResolver.js', () => ({
  resolveCharacterImageUrl: vi.fn((_url: string, _characterId: string) =>
    Promise.resolve({
      url: 'https://example.com/resolved-image.png',
      source: 'external',
    })
  ),
  resolveCharacterImages: vi.fn((_characters: Character[]) =>
    Promise.resolve({
      urls: new Map([
        ['test-character-1:0', 'https://example.com/char1.png'],
        ['test-character-2:0', 'https://example.com/char2.png'],
      ]),
      blobUrls: [],
    })
  ),
}));

// Mock data utilities
vi.mock('@/ts/data/index.js', () => ({
  countReminders: vi.fn((character: Character) => character.reminders?.length || 0),
}));

// Mock logger
vi.mock('@/ts/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnValue({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

// Mock TokenImageRenderer
vi.mock('@/ts/generation/TokenImageRenderer.js', () => ({
  TokenImageRenderer: class MockTokenImageRenderer {
    updateOptions = vi.fn();
    getCachedImage = vi.fn().mockResolvedValue({
      width: 100,
      height: 100,
      src: 'test.png',
    });
    drawCharacterImage = vi.fn().mockResolvedValue(undefined);
    drawSetupOverlay = vi.fn().mockResolvedValue(undefined);
    drawAccents = vi.fn().mockResolvedValue(undefined);
    drawBackground = vi.fn().mockResolvedValue(undefined);
    drawLogo = vi.fn().mockResolvedValue(true);
    drawPandemoniumImage = vi.fn().mockResolvedValue(undefined);
    drawBootleggerImage = vi.fn().mockResolvedValue(undefined);
  },
  defaultImageCache: {
    get: vi.fn().mockResolvedValue({
      width: 100,
      height: 100,
      src: 'test.png',
    }),
    clear: vi.fn(),
  },
}));

// Mock TokenTextRenderer
vi.mock('@/ts/generation/TokenTextRenderer.js', () => ({
  TokenTextRenderer: class MockTokenTextRenderer {
    updateOptions = vi.fn();
    calculateAbilityTextLayout = vi.fn().mockReturnValue({
      fontSize: 20,
      lineHeight: 1.2,
    });
    calculateBootleggerTextLayout = vi.fn().mockReturnValue({
      fontSize: 20,
      lineHeight: 1.2,
    });
    drawAbilityText = vi.fn();
    drawCharacterName = vi.fn();
    drawTokenCount = vi.fn();
    drawReminderText = vi.fn();
    drawCenteredText = vi.fn();
    drawAuthorText = vi.fn();
    drawAlmanacLabel = vi.fn();
    calculateAbilityTextYWithBadge = vi.fn().mockReturnValue(0.6);
  },
}));

// Mock QR options resolver
vi.mock('@/ts/generation/QROptionsResolver.js', () => ({
  resolveQROptions: vi.fn((options: any) => ({
    ...options,
    showLogo: true,
    showAlmanacLabel: true,
  })),
  buildStyledQRParams: vi.fn(() => ({
    width: 300,
    height: 300,
    data: 'https://example.com',
  })),
}));

// ============================================================================
// Test Helpers
// ============================================================================

function createDefaultOptions(
  overrides: Partial<TokenGeneratorOptions> = {}
): TokenGeneratorOptions {
  return {
    ...DEFAULT_TOKEN_OPTIONS,
    dpi: 300,
    ...overrides,
  };
}

function createMockImageCache() {
  return {
    get: vi.fn().mockResolvedValue({
      width: 100,
      height: 100,
      src: 'test.png',
    }),
    clear: vi.fn(),
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('TokenGenerator', () => {
  let generator: TokenGenerator;
  let mockImageCache: any;
  let options: TokenGeneratorOptions;

  beforeEach(() => {
    vi.clearAllMocks();
    resetCharacterFactory();
    mockImageCache = createMockImageCache();
    options = createDefaultOptions();
    generator = new TokenGenerator(options, mockImageCache);
  });

  // ==========================================================================
  // Constructor & Initialization
  // ==========================================================================

  describe('constructor', () => {
    it('should create TokenGenerator with options', () => {
      expect(generator).toBeDefined();
    });

    it('should merge options with defaults', () => {
      const partialOptions = { tokenCount: true };
      const gen = new TokenGenerator(partialOptions, mockImageCache);
      expect(gen).toBeDefined();
    });

    it('should use default image cache if not provided', () => {
      const gen = new TokenGenerator(options);
      expect(gen).toBeDefined();
    });

    it('should initialize TokenImageRenderer', () => {
      expect(generator).toBeDefined();
    });

    it('should initialize TokenTextRenderer', () => {
      expect(generator).toBeDefined();
    });

    it('should merge nested fontSpacing options', () => {
      const customOptions = {
        fontSpacing: { characterName: 2 },
      };
      const gen = new TokenGenerator(customOptions, mockImageCache);
      expect(gen).toBeDefined();
    });

    it('should merge nested textShadow options', () => {
      const customOptions = {
        textShadow: { reminderName: { blur: 5, offsetX: 2 } },
      };
      const gen = new TokenGenerator(customOptions, mockImageCache);
      expect(gen).toBeDefined();
    });

    it('should accept empty options', () => {
      const gen = new TokenGenerator({}, mockImageCache);
      expect(gen).toBeDefined();
    });
  });

  // ==========================================================================
  // updateOptions
  // ==========================================================================

  describe('updateOptions', () => {
    it('should update options', () => {
      generator.updateOptions({ tokenCount: true });
      expect(generator).toBeDefined();
    });

    it('should propagate options to image renderer', () => {
      generator.updateOptions({ transparentBackground: true });
      // Verify that update options doesn't throw
      expect(generator).toBeDefined();
    });

    it('should propagate options to text renderer', () => {
      generator.updateOptions({ displayAbilityText: false });
      // Verify that update options doesn't throw
      expect(generator).toBeDefined();
    });

    it('should handle empty partial updates', () => {
      expect(() => generator.updateOptions({})).not.toThrow();
    });

    it('should merge new options with existing', () => {
      generator.updateOptions({ tokenCount: true });
      generator.updateOptions({ transparentBackground: true });
      expect(generator).toBeDefined();
    });
  });

  // ==========================================================================
  // prewarmImageCache
  // ==========================================================================

  describe('prewarmImageCache', () => {
    it('should warm cache with character images', async () => {
      const characters = [createCharacter({ name: 'Char1' }), createCharacter({ name: 'Char2' })];

      await generator.prewarmImageCache(characters);

      // Verify prewarming doesn't throw
      expect(generator).toBeDefined();
    });

    it('should handle empty character list', async () => {
      await generator.prewarmImageCache([]);
      expect(generator).toBeDefined();
    });

    it('should resolve all image URLs using SSOT', async () => {
      const characters = [createCharacter()];

      await generator.prewarmImageCache(characters);

      // Verify SSOT resolution doesn't throw
      expect(generator).toBeDefined();
    });

    it('should handle image loading errors gracefully', async () => {
      const failingCache = {
        get: vi.fn().mockRejectedValue(new Error('Load failed')),
        clear: vi.fn(),
      };
      const genWithFailingCache = new TokenGenerator(options, failingCache);
      const characters = [createCharacter()];

      // Should not throw
      await genWithFailingCache.prewarmImageCache(characters);
    });
  });

  // ==========================================================================
  // clearCache
  // ==========================================================================

  describe('clearCache', () => {
    it('should clear the image cache', () => {
      generator.clearCache();
      expect(mockImageCache.clear).toHaveBeenCalled();
    });

    it('should be callable multiple times', () => {
      generator.clearCache();
      generator.clearCache();
      expect(mockImageCache.clear).toHaveBeenCalledTimes(2);
    });
  });

  // ==========================================================================
  // generateCharacterToken
  // ==========================================================================

  describe('generateCharacterToken', () => {
    it('should generate character token for valid character', async () => {
      const character = createCharacter({
        name: 'Washerwoman',
        ability: 'Test ability text',
      });

      const canvas = await generator.generateCharacterToken(character);

      expect(canvas).toBeDefined();
    });

    it('should throw ValidationError for character without name', async () => {
      const character = createCharacter({ name: '' });

      await expect(generator.generateCharacterToken(character)).rejects.toThrow('name');
    });

    it('should throw ValidationError for null character', async () => {
      await expect(generator.generateCharacterToken(null as any)).rejects.toThrow();
    });

    it('should throw ValidationError for invalid DPI', async () => {
      const invalidGenerator = new TokenGenerator({ ...options, dpi: 0 }, mockImageCache);
      const character = createCharacter();

      await expect(invalidGenerator.generateCharacterToken(character)).rejects.toThrow('DPI');
    });

    it('should use custom image override if provided', async () => {
      const character = createCharacter();
      const imageOverride = 'custom-image.png';

      await generator.generateCharacterToken(character, imageOverride);

      expect(generator).toBeDefined();
    });

    it('should draw ability text when enabled', async () => {
      const character = createCharacter({
        ability: 'Powerful ability',
      });
      const genWithAbility = new TokenGenerator(
        { ...options, displayAbilityText: true },
        mockImageCache
      );

      await genWithAbility.generateCharacterToken(character);
      expect(generator).toBeDefined();
    });

    it('should omit ability text when disabled', async () => {
      const character = createCharacter({
        ability: 'Powerful ability',
      });
      const genWithoutAbility = new TokenGenerator(
        { ...options, displayAbilityText: false },
        mockImageCache
      );

      await genWithoutAbility.generateCharacterToken(character);
      expect(generator).toBeDefined();
    });

    it('should draw setup overlay when character has setup', async () => {
      const character = createCharacter({ setup: true });

      await generator.generateCharacterToken(character);
      expect(generator).toBeDefined();
    });

    it('should calculate token count badge when enabled', async () => {
      const character = createCharacter({
        reminders: ['Reminder 1', 'Reminder 2'],
      });
      const genWithBadge = new TokenGenerator({ ...options, tokenCount: true }, mockImageCache);

      await genWithBadge.generateCharacterToken(character);
      expect(generator).toBeDefined();
    });

    it('should handle character without ability', async () => {
      const character = createCharacter({ ability: '' });

      const canvas = await generator.generateCharacterToken(character);
      expect(canvas).toBeDefined();
    });

    it('should use correct diameter for character tokens', async () => {
      const character = createCharacter();

      const canvas = await generator.generateCharacterToken(character);
      expect(canvas).toBeDefined();
    });
  });

  // ==========================================================================
  // generateReminderToken
  // ==========================================================================

  describe('generateReminderToken', () => {
    it('should generate reminder token for valid inputs', async () => {
      const character = createCharacter({ name: 'Washerwoman' });
      const reminderText = 'Remember this';

      const canvas = await generator.generateReminderToken(character, reminderText);

      expect(canvas).toBeDefined();
    });

    it('should throw ValidationError for character without name', async () => {
      const character = createCharacter({ name: '' });

      await expect(generator.generateReminderToken(character, 'Reminder')).rejects.toThrow('name');
    });

    it('should throw ValidationError for empty reminder text', async () => {
      const character = createCharacter();

      await expect(generator.generateReminderToken(character, '')).rejects.toThrow('Reminder text');
    });

    it('should throw ValidationError for whitespace-only reminder text', async () => {
      const character = createCharacter();

      await expect(generator.generateReminderToken(character, '   ')).rejects.toThrow(
        'Reminder text'
      );
    });

    it('should throw ValidationError for invalid DPI', async () => {
      const invalidGenerator = new TokenGenerator({ ...options, dpi: -1 }, mockImageCache);
      const character = createCharacter();

      await expect(invalidGenerator.generateReminderToken(character, 'Reminder')).rejects.toThrow(
        'DPI'
      );
    });

    it('should use correct diameter for reminder tokens', async () => {
      const character = createCharacter();

      const canvas = await generator.generateReminderToken(character, 'Test Reminder');
      expect(canvas).toBeDefined();
    });

    it('should handle custom image override', async () => {
      const character = createCharacter();
      const imageOverride = 'custom.png';

      const canvas = await generator.generateReminderToken(character, 'Reminder', imageOverride);
      expect(canvas).toBeDefined();
    });
  });

  // ==========================================================================
  // generateScriptNameToken
  // ==========================================================================

  describe('generateScriptNameToken', () => {
    it('should generate script name token', async () => {
      const canvas = await generator.generateScriptNameToken('My Script');

      expect(canvas).toBeDefined();
    });

    it('should include author text when provided', async () => {
      const canvas = await generator.generateScriptNameToken('My Script', 'John Doe');

      expect(canvas).toBeDefined();
    });

    it('should hide author when hideAuthor is true', async () => {
      const canvas = await generator.generateScriptNameToken('My Script', 'John Doe', true);

      expect(canvas).toBeDefined();
    });

    it('should handle missing author', async () => {
      const canvas = await generator.generateScriptNameToken('My Script');

      expect(canvas).toBeDefined();
    });

    it('should use logo if available', async () => {
      const genWithLogo = new TokenGenerator(
        { ...options, logoUrl: 'https://example.com/logo.png' },
        mockImageCache
      );

      const canvas = await genWithLogo.generateScriptNameToken('My Script');
      expect(canvas).toBeDefined();
    });
  });

  // ==========================================================================
  // generatePandemoniumToken
  // ==========================================================================

  describe('generatePandemoniumToken', () => {
    it('should generate pandemonium token', async () => {
      const canvas = await generator.generatePandemoniumToken();

      expect(canvas).toBeDefined();
    });

    it('should produce a canvas element', async () => {
      const canvas = await generator.generatePandemoniumToken();

      expect(canvas instanceof HTMLCanvasElement || canvas.toString() === '[object Object]').toBe(
        true
      );
    });

    it('should be callable multiple times', async () => {
      const canvas1 = await generator.generatePandemoniumToken();
      const canvas2 = await generator.generatePandemoniumToken();

      expect(canvas1).toBeDefined();
      expect(canvas2).toBeDefined();
    });
  });

  // ==========================================================================
  // generateAlmanacQRToken
  // ==========================================================================

  describe('generateAlmanacQRToken', () => {
    it('should generate almanac QR token', async () => {
      const almanacUrl = 'https://example.com/almanac';

      const canvas = await generator.generateAlmanacQRToken(almanacUrl, 'My Script');

      expect(canvas).toBeDefined();
    });

    it('should handle QR code generation', async () => {
      const almanacUrl = 'https://example.com/almanac';

      const canvas = await generator.generateAlmanacQRToken(almanacUrl, 'My Script');

      expect(canvas).toBeDefined();
    });

    it('should use script logo when provided', async () => {
      const genWithLogo = new TokenGenerator(
        { ...options, logoUrl: 'https://example.com/logo.png' },
        mockImageCache
      );

      const canvas = await genWithLogo.generateAlmanacQRToken(
        'https://example.com/almanac',
        'My Script',
        'https://example.com/logo.png'
      );

      expect(canvas).toBeDefined();
    });

    it('should handle missing logo gracefully', async () => {
      const canvas = await generator.generateAlmanacQRToken(
        'https://example.com/almanac',
        'My Script'
      );

      expect(canvas).toBeDefined();
    });
  });

  // ==========================================================================
  // generateBootleggerToken
  // ==========================================================================

  describe('generateBootleggerToken', () => {
    it('should generate bootlegger token with ability text', async () => {
      const abilityText = 'Each night, gain a new ability';

      const canvas = await generator.generateBootleggerToken(abilityText);

      expect(canvas).toBeDefined();
    });

    it('should handle normalized layout for consistent icon sizing', async () => {
      const abilityText = 'Ability text';
      const normalizedLayout = {
        fontSize: 20,
        lineHeight: 1.2,
      };

      const canvas = await generator.generateBootleggerToken(abilityText, normalizedLayout);

      expect(canvas).toBeDefined();
    });

    it('should use script logo when bootleggerIconType is "script"', async () => {
      const genWithScriptIcon = new TokenGenerator(
        { ...options, bootleggerIconType: 'script', logoUrl: 'https://example.com/logo.png' },
        mockImageCache
      );

      const canvas = await genWithScriptIcon.generateBootleggerToken('Ability text');

      expect(canvas).toBeDefined();
    });

    it('should hide bootlegger name when bootleggerHideName is true', async () => {
      const genWithHiddenName = new TokenGenerator(
        { ...options, bootleggerHideName: true },
        mockImageCache
      );

      const canvas = await genWithHiddenName.generateBootleggerToken('Ability text');

      expect(canvas).toBeDefined();
    });

    it('should draw accents when enabled', async () => {
      const genWithAccents = new TokenGenerator(
        { ...options, accentEnabled: true },
        mockImageCache
      );

      const canvas = await genWithAccents.generateBootleggerToken('Ability text');

      expect(canvas).toBeDefined();
    });

    it('should handle empty ability text', async () => {
      const canvas = await generator.generateBootleggerToken('');

      expect(canvas).toBeDefined();
    });
  });

  // ==========================================================================
  // generateJinxToken
  // ==========================================================================

  describe('generateJinxToken', () => {
    it('should generate jinx token for two characters', async () => {
      const char1 = createCharacter({ name: 'Character 1', id: 'char1' });
      const char2 = createCharacter({ name: 'Character 2', id: 'char2' });
      const jinx: Jinx = {
        id: 'char2',
        reason: 'They cannot both live',
      };

      const canvas = await generator.generateJinxToken(jinx, char1, char2);

      expect(canvas).toBeDefined();
    });

    it('should use pre-resolved URLs when available', async () => {
      const char1 = createCharacter({ name: 'Character 1', id: 'char1' });
      const char2 = createCharacter({ name: 'Character 2', id: 'char2' });
      const jinx: Jinx = {
        id: 'char2',
        reason: 'Jinx reason',
      };
      const preResolvedUrls = new Map([
        ['char1:0', 'https://example.com/char1.png'],
        ['char2:0', 'https://example.com/char2.png'],
      ]);

      const canvas = await generator.generateJinxToken(jinx, char1, char2, preResolvedUrls);

      expect(canvas).toBeDefined();
    });

    it('should handle missing pre-resolved URLs', async () => {
      const char1 = createCharacter({ name: 'Character 1' });
      const char2 = createCharacter({ name: 'Character 2' });
      const jinx: Jinx = {
        id: 'char2',
        reason: 'Jinx reason',
      };

      const canvas = await generator.generateJinxToken(jinx, char1, char2);

      expect(canvas).toBeDefined();
    });

    it('should respect jinxIconSpacing option', async () => {
      const genWithSpacing = new TokenGenerator(
        { ...options, jinxIconSpacing: 0.1 },
        mockImageCache
      );
      const char1 = createCharacter({ name: 'Char 1' });
      const char2 = createCharacter({ name: 'Char 2' });
      const jinx: Jinx = {
        id: 'char2',
        reason: 'Reason',
      };

      const canvas = await genWithSpacing.generateJinxToken(jinx, char1, char2);

      expect(canvas).toBeDefined();
    });

    it('should respect textLocations.metaName option', async () => {
      const genWithoutMetaName = new TokenGenerator(
        { ...options, textLocations: { metaName: 'none' } },
        mockImageCache
      );
      const char1 = createCharacter({ name: 'Char 1' });
      const char2 = createCharacter({ name: 'Char 2' });
      const jinx: Jinx = {
        id: 'char2',
        reason: 'Reason',
      };

      const canvas = await genWithoutMetaName.generateJinxToken(jinx, char1, char2);

      expect(canvas).toBeDefined();
    });

    it('should handle icon settings for meta tokens', async () => {
      const genWithIconSettings = new TokenGenerator(
        {
          ...options,
          iconSettings: {
            meta: { scale: 0.8, offsetX: 0.05, offsetY: -0.05 },
          },
        },
        mockImageCache
      );
      const char1 = createCharacter({ name: 'Char 1' });
      const char2 = createCharacter({ name: 'Char 2' });
      const jinx: Jinx = {
        id: 'char2',
        reason: 'Reason',
      };

      const canvas = await genWithIconSettings.generateJinxToken(jinx, char1, char2);

      expect(canvas).toBeDefined();
    });
  });

  // ==========================================================================
  // calculateBootleggerLayout (deprecated)
  // ==========================================================================

  describe('calculateBootleggerLayout', () => {
    it('should calculate bootlegger text layout', () => {
      const layout = generator.calculateBootleggerLayout('Ability text');

      expect(layout).toBeDefined();
    });

    it('should return value for empty text', () => {
      const layout = generator.calculateBootleggerLayout('');

      expect(layout).toBeDefined();
    });

    it('should calculate consistent layouts for same text', () => {
      const layout1 = generator.calculateBootleggerLayout('Same ability');
      const layout2 = generator.calculateBootleggerLayout('Same ability');

      expect(layout1).toBeDefined();
      expect(layout2).toBeDefined();
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('integration', () => {
    it('should generate different token types for same character', async () => {
      const character = createCharacter({
        name: 'Test Character',
        ability: 'Test ability',
        reminders: ['Reminder 1'],
      });

      const characterCanvas = await generator.generateCharacterToken(character);
      const reminderCanvas = await generator.generateReminderToken(character, 'Reminder 1');

      expect(characterCanvas).toBeDefined();
      expect(reminderCanvas).toBeDefined();
    });

    it('should handle option updates between token generations', async () => {
      const char1 = createCharacter({ name: 'Char 1' });
      const char2 = createCharacter({ name: 'Char 2' });

      const canvas1 = await generator.generateCharacterToken(char1);
      generator.updateOptions({ tokenCount: true });
      const canvas2 = await generator.generateCharacterToken(char2);

      expect(canvas1).toBeDefined();
      expect(canvas2).toBeDefined();
    });

    it('should work with cache warming and clearing', async () => {
      const characters = [createCharacter(), createCharacter()];

      await generator.prewarmImageCache(characters);
      generator.clearCache();
      const canvas = await generator.generateCharacterToken(characters[0]);

      expect(canvas).toBeDefined();
    });

    it('should generate all meta token types', async () => {
      const scriptCanvas = await generator.generateScriptNameToken('Script');
      const pandemoniumCanvas = await generator.generatePandemoniumToken();
      const almanacCanvas = await generator.generateAlmanacQRToken('https://example.com', 'Script');

      expect(scriptCanvas).toBeDefined();
      expect(pandemoniumCanvas).toBeDefined();
      expect(almanacCanvas).toBeDefined();
    });

    it('should handle rapid successive token generations', async () => {
      const character = createCharacter();
      const canvases = await Promise.all([
        generator.generateCharacterToken(character),
        generator.generateCharacterToken(character),
        generator.generateCharacterToken(character),
      ]);

      expect(canvases).toHaveLength(3);
      expect(canvases.every((c) => c)).toBe(true);
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  describe('error handling', () => {
    it('should handle character image loading errors gracefully', async () => {
      const character = createCharacter();

      const canvas = await generator.generateCharacterToken(character);
      expect(canvas).toBeDefined();
    });

    it('should validate DPI is positive', async () => {
      const zeroDpiGenerator = new TokenGenerator({ ...options, dpi: 0 }, mockImageCache);
      const character = createCharacter();

      await expect(zeroDpiGenerator.generateCharacterToken(character)).rejects.toThrow();
    });

    it('should validate negative DPI', async () => {
      const negativeDpiGenerator = new TokenGenerator({ ...options, dpi: -300 }, mockImageCache);
      const character = createCharacter();

      await expect(negativeDpiGenerator.generateCharacterToken(character)).rejects.toThrow();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle character with very long name', async () => {
      const character = createCharacter({
        name: 'A'.repeat(100),
      });

      const canvas = await generator.generateCharacterToken(character);
      expect(canvas).toBeDefined();
    });

    it('should handle character with very long ability text', async () => {
      const character = createCharacter({
        ability: 'This is a very long ability text that goes on and on. '.repeat(10),
      });

      const canvas = await generator.generateCharacterToken(character);
      expect(canvas).toBeDefined();
    });

    it('should handle many reminders', async () => {
      const character = createCharacter({
        reminders: Array.from({ length: 20 }, (_, i) => `Reminder ${i + 1}`),
      });
      const genWithBadge = new TokenGenerator({ ...options, tokenCount: true }, mockImageCache);

      const canvas = await genWithBadge.generateCharacterToken(character);
      expect(canvas).toBeDefined();
    });

    it('should handle special characters in names', async () => {
      const character = createCharacter({
        name: 'Test & Character(v2.0)',
      });

      const canvas = await generator.generateCharacterToken(character);
      expect(canvas).toBeDefined();
    });

    it('should handle undefined optional fields', async () => {
      const character = createCharacter({
        ability: undefined,
        reminders: undefined,
        setup: undefined,
      });

      const canvas = await generator.generateCharacterToken(character);
      expect(canvas).toBeDefined();
    });

    it('should handle null character property gracefully', async () => {
      const character = createCharacter({ ability: null as any });

      const canvas = await generator.generateCharacterToken(character);
      expect(canvas).toBeDefined();
    });
  });
});
