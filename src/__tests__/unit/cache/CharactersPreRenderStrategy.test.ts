/**
 * Unit tests for CharactersPreRenderStrategy
 *
 * Tests cover:
 * - shouldTrigger conditions
 * - preRender success/failure cases
 * - getPreRendered cache retrieval
 * - preloadImages with globalImageCache
 * - Cache key generation and options hashing
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ICacheStrategy } from '@/ts/cache/core/interfaces';
import type { CacheStats, PreRenderContext } from '@/ts/cache/core/types';
import {
  type CharactersPreRenderEntry,
  CharactersPreRenderStrategy,
} from '@/ts/cache/strategies/CharactersPreRenderStrategy';
import type { Character, GenerationOptions, Token } from '@/ts/types/index';

// Mock dependencies
vi.mock('@/ts/ui/detailViewUtils', () => ({
  regenerateCharacterAndReminders: vi.fn(),
}));

vi.mock('@/ts/utils/imageCache', () => ({
  globalImageCache: {
    has: vi.fn(),
    preloadMany: vi.fn(),
  },
}));

import { regenerateCharacterAndReminders } from '@/ts/ui/detailViewUtils';
import { globalImageCache } from '@/ts/utils/imageCache';

// ============================================================================
// Test Helpers
// ============================================================================

const createMockCache = (): ICacheStrategy<string, CharactersPreRenderEntry> => ({
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

const createMockCharacter = (overrides: Partial<Character> = {}): Character =>
  ({
    id: 'washerwoman',
    name: 'Washerwoman',
    team: 'townsfolk',
    ability: 'You start knowing that 1 of 2 players is a particular Townsfolk.',
    image: 'https://example.com/washerwoman.png',
    reminders: ['Townsfolk', 'Wrong'],
    ...overrides,
  }) as Character;

const createMockGenerationOptions = (
  overrides: Partial<GenerationOptions> = {}
): GenerationOptions =>
  ({
    diameter: 300,
    reminderDiameter: 200,
    dpi: 300,
    enableReminders: true,
    displayAbilityText: true,
    characterBackground: 'bg.png',
    reminderBackground: 'reminder-bg.png',
    characterNameFont: 'Arial',
    characterNameColor: '#FFFFFF',
    ...overrides,
  }) as GenerationOptions;

const createMockToken = (overrides: Partial<Token> = {}): Token =>
  ({
    filename: 'washerwoman.png',
    characterId: 'washerwoman',
    tokenType: 'character',
    dataUrl: 'data:image/png;base64,xxx',
    ...overrides,
  }) as Token;

const createPreRenderContext = (overrides: Partial<PreRenderContext> = {}): PreRenderContext => ({
  type: 'characters-hover',
  tokens: [],
  characters: [createMockCharacter()],
  generationOptions: createMockGenerationOptions(),
  ...overrides,
});

// ============================================================================
// Tests
// ============================================================================

describe('CharactersPreRenderStrategy', () => {
  let strategy: CharactersPreRenderStrategy;
  let mockCache: ICacheStrategy<string, CharactersPreRenderEntry>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCache = createMockCache();
    strategy = new CharactersPreRenderStrategy(mockCache);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // Strategy Properties
  // --------------------------------------------------------------------------

  describe('Strategy Properties', () => {
    it('should have name "characters"', () => {
      expect(strategy.name).toBe('characters');
    });

    it('should have priority 2', () => {
      expect(strategy.priority).toBe(2);
    });
  });

  // --------------------------------------------------------------------------
  // shouldTrigger
  // --------------------------------------------------------------------------

  describe('shouldTrigger', () => {
    it('should return true for characters-hover with characters and options', () => {
      const context = createPreRenderContext();

      expect(strategy.shouldTrigger(context)).toBe(true);
    });

    it('should return false for non-characters-hover type', () => {
      const context = createPreRenderContext({ type: 'tokens-hover' });

      expect(strategy.shouldTrigger(context)).toBe(false);
    });

    it('should return false when characters is undefined', () => {
      const context = createPreRenderContext({ characters: undefined });

      expect(strategy.shouldTrigger(context)).toBe(false);
    });

    it('should return false when characters is empty', () => {
      const context = createPreRenderContext({ characters: [] });

      expect(strategy.shouldTrigger(context)).toBe(false);
    });

    it('should return false when generationOptions is undefined', () => {
      const context = createPreRenderContext({ generationOptions: undefined });

      expect(strategy.shouldTrigger(context)).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // preRender
  // --------------------------------------------------------------------------

  describe('preRender', () => {
    it('should return error when characters is missing', async () => {
      const context = createPreRenderContext({ characters: undefined });

      const result = await strategy.preRender(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing characters');
    });

    it('should return error when characters is empty', async () => {
      const context = createPreRenderContext({ characters: [] });

      const result = await strategy.preRender(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing characters');
    });

    it('should return error when generationOptions is missing', async () => {
      const context = createPreRenderContext({ generationOptions: undefined });

      const result = await strategy.preRender(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing');
    });

    it('should skip if already cached', async () => {
      vi.mocked(mockCache.has).mockReturnValue(true);
      const context = createPreRenderContext();

      const result = await strategy.preRender(context);

      expect(result.success).toBe(true);
      expect(result.rendered).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.metadata?.cached).toBe(true);
    });

    it('should render first character when not cached', async () => {
      const mockCharacterToken = createMockToken();
      const mockReminderTokens = [
        createMockToken({ filename: 'washerwoman-reminder-1.png', tokenType: 'reminder' }),
      ];

      vi.mocked(regenerateCharacterAndReminders).mockResolvedValue({
        characterToken: mockCharacterToken,
        reminderTokens: mockReminderTokens,
      });

      const context = createPreRenderContext();

      const result = await strategy.preRender(context);

      expect(result.success).toBe(true);
      expect(result.rendered).toBe(1);
      expect(result.skipped).toBe(0);
      expect(regenerateCharacterAndReminders).toHaveBeenCalledWith(
        context.characters?.[0],
        context.generationOptions
      );
    });

    it('should store result in cache', async () => {
      const mockCharacterToken = createMockToken();
      const mockReminderTokens = [createMockToken({ tokenType: 'reminder' })];

      vi.mocked(regenerateCharacterAndReminders).mockResolvedValue({
        characterToken: mockCharacterToken,
        reminderTokens: mockReminderTokens,
      });

      const context = createPreRenderContext();

      await strategy.preRender(context);

      expect(mockCache.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          characterToken: mockCharacterToken,
          reminderTokens: mockReminderTokens,
          characterUuid: 'washerwoman',
        })
      );
    });

    it('should exclude reminders when includeReminders is false', async () => {
      const strategyNoReminders = new CharactersPreRenderStrategy(mockCache, {
        includeReminders: false,
      });

      const mockCharacterToken = createMockToken();
      const mockReminderTokens = [createMockToken({ tokenType: 'reminder' })];

      vi.mocked(regenerateCharacterAndReminders).mockResolvedValue({
        characterToken: mockCharacterToken,
        reminderTokens: mockReminderTokens,
      });

      const context = createPreRenderContext();

      await strategyNoReminders.preRender(context);

      expect(mockCache.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          reminderTokens: [], // Empty array when reminders disabled
        })
      );
    });

    it('should handle regeneration errors', async () => {
      vi.mocked(regenerateCharacterAndReminders).mockRejectedValue(new Error('Render failed'));

      const context = createPreRenderContext();

      const result = await strategy.preRender(context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Render failed');
    });

    it('should include metadata on success', async () => {
      const mockCharacterToken = createMockToken();
      const mockReminderTokens = [createMockToken({ tokenType: 'reminder' })];

      vi.mocked(regenerateCharacterAndReminders).mockResolvedValue({
        characterToken: mockCharacterToken,
        reminderTokens: mockReminderTokens,
      });

      const context = createPreRenderContext();

      const result = await strategy.preRender(context);

      expect(result.metadata?.strategy).toBe('characters');
      expect(result.metadata?.characterId).toBe('washerwoman');
      expect(result.metadata?.reminderCount).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // getPreRendered
  // --------------------------------------------------------------------------

  describe('getPreRendered', () => {
    it('should return cached entry when available', async () => {
      const cachedEntry: CharactersPreRenderEntry = {
        characterToken: createMockToken(),
        reminderTokens: [],
        characterUuid: 'washerwoman',
        optionsHash: 'abc123',
      };

      vi.mocked(mockCache.get).mockResolvedValue({
        value: cachedEntry,
        key: 'test',
        size: 100,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        accessCount: 1,
      });

      const character = createMockCharacter();
      const options = createMockGenerationOptions();

      const result = await strategy.getPreRendered(character, options);

      expect(result).toEqual(cachedEntry);
    });

    it('should return null when not cached', async () => {
      vi.mocked(mockCache.get).mockResolvedValue(null);

      const character = createMockCharacter();
      const options = createMockGenerationOptions();

      const result = await strategy.getPreRendered(character, options);

      expect(result).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // preloadImages
  // --------------------------------------------------------------------------

  describe('preloadImages', () => {
    beforeEach(() => {
      // Mock requestIdleCallback
      vi.stubGlobal('requestIdleCallback', (cb: () => void) => {
        cb();
        return 1;
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should call progress with 0,0 when no characters', async () => {
      const onProgress = vi.fn();
      const context = createPreRenderContext({ characters: [] });

      await strategy.preloadImages(context, onProgress);

      expect(onProgress).toHaveBeenCalledWith(0, 0);
    });

    it('should extract image URLs from character', async () => {
      vi.mocked(globalImageCache.has).mockReturnValue(false);
      vi.mocked(globalImageCache.preloadMany).mockResolvedValue(undefined);

      const character = createMockCharacter({
        image: 'https://example.com/character.png',
      });
      const context = createPreRenderContext({ characters: [character] });

      await strategy.preloadImages(context);

      expect(globalImageCache.preloadMany).toHaveBeenCalledWith(
        expect.arrayContaining(['https://example.com/character.png']),
        false,
        undefined
      );
    });

    it('should extract array of image URLs from character', async () => {
      vi.mocked(globalImageCache.has).mockReturnValue(false);
      vi.mocked(globalImageCache.preloadMany).mockResolvedValue(undefined);

      const character = createMockCharacter({
        image: [
          'https://example.com/variant1.png',
          'https://example.com/variant2.png',
        ] as unknown as string,
      });
      const context = createPreRenderContext({ characters: [character] });

      await strategy.preloadImages(context);

      expect(globalImageCache.preloadMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          'https://example.com/variant1.png',
          'https://example.com/variant2.png',
        ]),
        false,
        undefined
      );
    });

    it('should extract background URLs from generation options', async () => {
      vi.mocked(globalImageCache.has).mockReturnValue(false);
      vi.mocked(globalImageCache.preloadMany).mockResolvedValue(undefined);

      const options = createMockGenerationOptions({
        characterBackground: 'bg.png',
        reminderBackground: 'reminder-bg.png',
        logoUrl: 'logo.png',
      });
      const context = createPreRenderContext({ generationOptions: options });

      await strategy.preloadImages(context);

      expect(globalImageCache.preloadMany).toHaveBeenCalledWith(
        expect.arrayContaining(['bg.png', 'reminder-bg.png', 'logo.png']),
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

    it('should use setTimeout fallback when requestIdleCallback not available', async () => {
      vi.unstubAllGlobals();
      vi.useFakeTimers();

      vi.mocked(globalImageCache.has).mockReturnValue(false);
      vi.mocked(globalImageCache.preloadMany).mockResolvedValue(undefined);

      const context = createPreRenderContext();
      const promise = strategy.preloadImages(context);

      await vi.runAllTimersAsync();
      await promise;

      expect(globalImageCache.preloadMany).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should pass progress callback to preloadMany', async () => {
      vi.mocked(globalImageCache.has).mockReturnValue(false);
      vi.mocked(globalImageCache.preloadMany).mockResolvedValue(undefined);

      const onProgress = vi.fn();
      const context = createPreRenderContext();

      await strategy.preloadImages(context, onProgress);

      expect(globalImageCache.preloadMany).toHaveBeenCalledWith(
        expect.any(Array),
        false,
        onProgress
      );
    });
  });

  // --------------------------------------------------------------------------
  // Cache Key Generation
  // --------------------------------------------------------------------------

  describe('Cache Key Generation', () => {
    it('should generate different keys for different characters', async () => {
      vi.mocked(regenerateCharacterAndReminders).mockResolvedValue({
        characterToken: createMockToken(),
        reminderTokens: [],
      });

      const context1 = createPreRenderContext({
        characters: [createMockCharacter({ id: 'char1' })],
      });
      const context2 = createPreRenderContext({
        characters: [createMockCharacter({ id: 'char2' })],
      });

      await strategy.preRender(context1);
      await strategy.preRender(context2);

      const calls = vi.mocked(mockCache.set).mock.calls;
      expect(calls[0][0]).not.toBe(calls[1][0]);
    });

    it('should generate different keys for different options', async () => {
      vi.mocked(regenerateCharacterAndReminders).mockResolvedValue({
        characterToken: createMockToken(),
        reminderTokens: [],
      });

      // Use options that ARE included in the hash (displayAbilityText, characterBackground, etc.)
      // Note: dpi is NOT in the hash because it doesn't affect visual appearance of cached previews
      const context1 = createPreRenderContext({
        generationOptions: createMockGenerationOptions({ displayAbilityText: true }),
      });
      const context2 = createPreRenderContext({
        generationOptions: createMockGenerationOptions({ displayAbilityText: false }),
      });

      await strategy.preRender(context1);
      await strategy.preRender(context2);

      const calls = vi.mocked(mockCache.set).mock.calls;
      expect(calls[0][0]).not.toBe(calls[1][0]);
    });
  });
});
