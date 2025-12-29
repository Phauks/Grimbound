/**
 * Unit tests for TabPreRenderService
 *
 * Tests the unified tab pre-rendering service that handles all tab hover
 * pre-rendering logic for characters, tokens, and script tabs.
 *
 * Uses dependency injection to mock CacheManager and internal dependencies.
 */

// ============================================================================
// Mock CacheLogger to avoid localStorage initialization issues
// ============================================================================

// Must be before other imports
vi.mock('@/ts/cache/utils/CacheLogger', () => ({
  CacheLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    time: vi.fn(),
    initialize: vi.fn(),
    setLevel: vi.fn(),
  },
}));

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TabPreRenderContext, TabPreRenderServiceDeps } from '@/ts/cache/TabPreRenderService';
import { TabPreRenderService } from '@/ts/cache/TabPreRenderService';
import type { NightOrderResult } from '@/ts/nightOrder/nightOrderUtils';
import type { Character, GenerationOptions, ScriptEntry, ScriptMeta, Token } from '@/ts/types';

// ============================================================================
// Test Setup & Helpers
// ============================================================================

/**
 * Create a mock character for testing
 */
function createMockCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'test-character',
    name: 'Test Character',
    team: 'townsfolk',
    ability: 'Test ability',
    image: 'test-image.webp',
    edition: 'tb',
    firstNight: 0,
    otherNight: 0,
    reminders: ['Test reminder'],
    setup: false,
    ...overrides,
  } as Character;
}

/**
 * Create mock generation options
 */
function createMockGenerationOptions(
  overrides: Partial<GenerationOptions> = {}
): GenerationOptions {
  return {
    dpi: 300,
    displayAbilityText: true,
    characterNameFont: 'Dumbledore',
    characterReminderFont: 'Dumbledore',
    characterBackground: '#1a1a2e',
    characterBackgroundType: 'solid',
    reminderBackground: '#1a1a2e',
    reminderBackgroundType: 'solid',
    ...overrides,
  } as GenerationOptions;
}

/**
 * Create a mock token
 */
function createMockToken(overrides: Partial<Token> = {}): Token {
  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 300;

  return {
    type: 'character',
    name: 'Test Token',
    filename: 'test-token',
    team: 'townsfolk',
    canvas,
    diameter: 300,
    ...overrides,
  };
}

/**
 * Create mock script meta
 */
function createMockScriptMeta(): ScriptMeta {
  return {
    id: '_meta',
    name: 'Test Script',
    author: 'Test Author',
  };
}

/**
 * Create mock night order result
 */
function createMockNightOrderResult(): NightOrderResult {
  return {
    entries: [
      {
        id: 'test-character',
        type: 'character' as const,
        name: 'Test Character',
        ability: 'Test ability',
        image: 'test-image.webp',
        team: 'townsfolk',
        order: 1,
        nightType: 'first' as const,
      },
    ],
    source: 'character',
  };
}

/**
 * Create mock pre-render context
 */
function createMockContext(overrides: Partial<TabPreRenderContext> = {}): TabPreRenderContext {
  return {
    characters: [createMockCharacter()],
    tokens: [createMockToken()],
    scriptMeta: createMockScriptMeta(),
    generationOptions: createMockGenerationOptions(),
    lastSelectedCharacterUuid: undefined,
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('TabPreRenderService', () => {
  let service: TabPreRenderService;
  let mockCacheManager: TabPreRenderServiceDeps['cacheManager'];
  let mockResolveImageUrl: TabPreRenderServiceDeps['resolveImageUrl'];
  let mockBuildNightOrder: TabPreRenderServiceDeps['buildNightOrder'];
  let mockRegenerateTokens: TabPreRenderServiceDeps['regenerateTokens'];

  beforeEach(() => {
    // Create mock dependencies
    mockCacheManager = {
      preRender: vi.fn().mockResolvedValue(undefined),
      clearCache: vi.fn(),
      getStats: vi.fn(),
    } as unknown as TabPreRenderServiceDeps['cacheManager'];

    mockResolveImageUrl = vi.fn().mockResolvedValue({
      url: 'resolved-url.webp',
      source: 'external',
      blobUrl: null,
    });

    mockBuildNightOrder = vi.fn().mockReturnValue(createMockNightOrderResult());

    mockRegenerateTokens = vi.fn().mockResolvedValue({
      characterToken: createMockToken(),
      reminderTokens: [createMockToken({ type: 'reminder' })],
    });

    // Create service with injected dependencies
    service = new TabPreRenderService({
      cacheManager: mockCacheManager,
      resolveImageUrl: mockResolveImageUrl,
      buildNightOrder: mockBuildNightOrder,
      regenerateTokens: mockRegenerateTokens,
    });
  });

  // ==========================================================================
  // Constructor & Dependency Injection
  // ==========================================================================

  describe('constructor', () => {
    it('should create service with injected dependencies', () => {
      expect(service).toBeDefined();
    });

    it('should create service with no dependencies (defaults)', () => {
      const defaultService = new TabPreRenderService();
      expect(defaultService).toBeDefined();
    });

    it('should create service with partial dependencies', () => {
      const partialService = new TabPreRenderService({
        resolveImageUrl: mockResolveImageUrl,
      });
      expect(partialService).toBeDefined();
    });
  });

  // ==========================================================================
  // Pre-Render Tab: Characters
  // ==========================================================================

  describe('preRenderTab - characters', () => {
    it('should return empty result when no characters', () => {
      const context = createMockContext({ characters: [] });

      const result = service.preRenderTab('characters', context);

      expect(result.success).toBe(true);
      expect(result.tab).toBe('characters');
      expect(result.fromCache).toBe(true);
      expect(result.itemCount).toBe(0);
    });

    it('should return empty result when no generation options', () => {
      const context = createMockContext({ generationOptions: undefined });

      const result = service.preRenderTab('characters', context);

      expect(result.success).toBe(true);
      expect(result.fromCache).toBe(true);
      expect(result.itemCount).toBe(0);
    });

    it('should pre-render first character when no last selected UUID', () => {
      const char1 = createMockCharacter({ id: 'char1', name: 'Character 1' });
      const char2 = createMockCharacter({ id: 'char2', name: 'Character 2' });
      const context = createMockContext({ characters: [char1, char2] });

      const result = service.preRenderTab('characters', context);

      expect(result.success).toBe(true);
      expect(result.tab).toBe('characters');
      expect(result.fromCache).toBe(false);
      expect(result.itemCount).toBe(1);
    });

    it('should pre-render last selected character when UUID provided', async () => {
      const char1 = createMockCharacter({ id: 'char1', uuid: 'uuid1', name: 'Character 1' });
      const char2 = createMockCharacter({ id: 'char2', uuid: 'uuid2', name: 'Character 2' });
      const context = createMockContext({
        characters: [char1, char2],
        lastSelectedCharacterUuid: 'uuid2',
      });

      service.preRenderTab('characters', context);

      // Wait for async token generation
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockRegenerateTokens).toHaveBeenCalledWith(char2, context.generationOptions);
    });

    it('should return cache hit when character already cached', async () => {
      const context = createMockContext();

      // First call should cache
      const result1 = service.preRenderTab('characters', context);
      expect(result1.fromCache).toBe(false);

      // Wait for async token generation
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Second call should hit cache
      const result2 = service.preRenderTab('characters', context);
      expect(result2.fromCache).toBe(true);
    });

    it('should handle regenerate tokens error gracefully', async () => {
      mockRegenerateTokens = vi.fn().mockRejectedValue(new Error('Token generation failed'));
      service = new TabPreRenderService({ regenerateTokens: mockRegenerateTokens });

      const context = createMockContext();

      const result = service.preRenderTab('characters', context);

      expect(result.success).toBe(true);
      expect(result.fromCache).toBe(false);

      // Wait for async error handling
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    it('should prevent concurrent pre-rendering', () => {
      const context = createMockContext();

      // First call starts pre-rendering
      const result1 = service.preRenderTab('characters', context);
      expect(result1.fromCache).toBe(false);

      // Second call before first completes should skip
      const result2 = service.preRenderTab('characters', context);
      expect(result2.fromCache).toBe(false);
      expect(result2.itemCount).toBe(0);
    });

    it('should evict oldest entry when cache is full', async () => {
      // Fill cache with 10 entries
      for (let i = 0; i < 10; i++) {
        const char = createMockCharacter({ id: `char${i}`, uuid: `uuid${i}` });
        const context = createMockContext({ characters: [char] });
        service.preRenderTab('characters', context);
        await new Promise((resolve) => setTimeout(resolve, 5));
      }

      // Cache 11th entry should evict first
      const char11 = createMockCharacter({ id: 'char11', uuid: 'uuid11' });
      const context11 = createMockContext({ characters: [char11] });

      service.preRenderTab('characters', context11);
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Verify first entry was evicted by checking cache hit
      const char0 = createMockCharacter({ id: 'char0', uuid: 'uuid0' });
      const context0 = createMockContext({ characters: [char0] });
      const result = service.preRenderTab('characters', context0);

      expect(result.fromCache).toBe(false);
    });
  });

  // ==========================================================================
  // Pre-Render Tab: Tokens
  // ==========================================================================

  describe('preRenderTab - tokens', () => {
    it('should return empty result (no pre-render needed)', () => {
      const context = createMockContext();

      const result = service.preRenderTab('tokens', context);

      expect(result.success).toBe(true);
      expect(result.tab).toBe('tokens');
      expect(result.fromCache).toBe(true);
      expect(result.itemCount).toBe(0);
    });
  });

  // ==========================================================================
  // Pre-Render Tab: Script
  // ==========================================================================

  describe('preRenderTab - script', () => {
    it('should return empty result when no characters', () => {
      const context = createMockContext({ characters: [] });

      const result = service.preRenderTab('script', context);

      expect(result.success).toBe(true);
      expect(result.fromCache).toBe(true);
      expect(result.itemCount).toBe(0);
    });

    it('should build night order from characters and meta', () => {
      const context = createMockContext();

      const result = service.preRenderTab('script', context);

      expect(result.success).toBe(true);
      expect(result.fromCache).toBe(false);
      expect(mockBuildNightOrder).toHaveBeenCalledTimes(2);
      expect(mockBuildNightOrder).toHaveBeenCalledWith(
        expect.arrayContaining([context.scriptMeta, ...context.characters]),
        'first'
      );
      expect(mockBuildNightOrder).toHaveBeenCalledWith(
        expect.arrayContaining([context.scriptMeta, ...context.characters]),
        'other'
      );
    });

    it('should build night order without meta if not provided', () => {
      const context = createMockContext({ scriptMeta: null });

      service.preRenderTab('script', context);

      expect(mockBuildNightOrder).toHaveBeenCalledWith(context.characters, 'first');
    });

    it('should return cache hit on second call with same data', () => {
      const context = createMockContext();

      // First call
      const result1 = service.preRenderTab('script', context);
      expect(result1.fromCache).toBe(false);

      // Second call with same data
      const result2 = service.preRenderTab('script', context);
      expect(result2.fromCache).toBe(true);
    });

    it('should rebuild night order when characters change', () => {
      const context1 = createMockContext();
      const context2 = createMockContext({
        characters: [createMockCharacter({ id: 'different-character' })],
      });

      service.preRenderTab('script', context1);
      const result2 = service.preRenderTab('script', context2);

      expect(result2.fromCache).toBe(false);
    });

    it('should preload character images asynchronously', async () => {
      const char1 = createMockCharacter({ id: 'char1', image: 'image1.webp' });
      const char2 = createMockCharacter({ id: 'char2', image: 'image2.webp' });
      const context = createMockContext({ characters: [char1, char2] });

      service.preRenderTab('script', context);

      // Wait for async image resolution
      await new Promise((resolve) => setTimeout(resolve, 250));

      expect(mockResolveImageUrl).toHaveBeenCalledWith('image1.webp', 'char1', {
        logContext: 'TabPreRenderService',
      });
      expect(mockResolveImageUrl).toHaveBeenCalledWith('image2.webp', 'char2', {
        logContext: 'TabPreRenderService',
      });
    });

    it('should handle array image format', async () => {
      const char = createMockCharacter({ id: 'char1', image: ['image1.webp', 'image2.webp'] });
      const context = createMockContext({ characters: [char] });

      service.preRenderTab('script', context);

      await new Promise((resolve) => setTimeout(resolve, 250));

      expect(mockResolveImageUrl).toHaveBeenCalledWith('image1.webp', 'char1', {
        logContext: 'TabPreRenderService',
      });
    });

    it('should handle object image format with url property', async () => {
      const char = createMockCharacter({
        id: 'char1',
        image: { url: 'image1.webp', source: 'custom' } as unknown as string,
      });
      const context = createMockContext({ characters: [char] });

      service.preRenderTab('script', context);

      await new Promise((resolve) => setTimeout(resolve, 250));

      expect(mockResolveImageUrl).toHaveBeenCalledWith('image1.webp', 'char1', {
        logContext: 'TabPreRenderService',
      });
    });

    it('should skip characters without image', async () => {
      const char = createMockCharacter({ id: 'char1', image: null as unknown as string });
      const context = createMockContext({ characters: [char] });

      service.preRenderTab('script', context);

      await new Promise((resolve) => setTimeout(resolve, 250));

      expect(mockResolveImageUrl).not.toHaveBeenCalled();
    });

    it('should handle image resolution errors gracefully', async () => {
      mockResolveImageUrl = vi.fn().mockRejectedValue(new Error('Image not found'));
      service = new TabPreRenderService({ resolveImageUrl: mockResolveImageUrl });

      const context = createMockContext();

      service.preRenderTab('script', context);

      await new Promise((resolve) => setTimeout(resolve, 250));

      // Should use fallback URL
      const cachedUrl = service.getCachedCharacterImageUrl('test-character');
      expect(cachedUrl).toBe('test-image.webp');
    });

    it('should not preload images concurrently', async () => {
      const context = createMockContext();

      service.preRenderTab('script', context);
      service.preRenderTab('script', context);

      await new Promise((resolve) => setTimeout(resolve, 250));

      // Should only resolve once
      expect(mockResolveImageUrl).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================================================
  // Pre-Render Tab: Unknown Tab
  // ==========================================================================

  describe('preRenderTab - unknown tab', () => {
    it('should return error for unknown tab', () => {
      const context = createMockContext();

      const result = service.preRenderTab('unknown' as 'characters', context);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown tab: unknown');
    });
  });

  // ==========================================================================
  // Get Cached Night Order
  // ==========================================================================

  describe('getCachedNightOrder', () => {
    it('should return null when cache is empty', () => {
      const scriptData: ScriptEntry[] = [createMockCharacter()];

      const cached = service.getCachedNightOrder(scriptData);

      expect(cached).toBeNull();
    });

    it('should return cached night order after pre-render', () => {
      const character = createMockCharacter();
      const meta = createMockScriptMeta();
      const context = createMockContext({ characters: [character], scriptMeta: meta });

      service.preRenderTab('script', context);

      // getCachedNightOrder expects same scriptData structure as preRenderTab used
      const scriptData: ScriptEntry[] = [meta, character];
      const cached = service.getCachedNightOrder(scriptData);

      expect(cached).not.toBeNull();
      expect(cached?.firstNight).toBeDefined();
      expect(cached?.otherNight).toBeDefined();
    });

    it('should return null when script data changes', () => {
      const char1 = createMockCharacter({ id: 'char1' });
      const char2 = createMockCharacter({ id: 'char2' });
      const context = createMockContext({ characters: [char1] });

      service.preRenderTab('script', context);

      const cached = service.getCachedNightOrder([char2]);

      expect(cached).toBeNull();
    });

    it('should handle cache validation with meta', () => {
      const meta = createMockScriptMeta();
      const character = createMockCharacter();
      const scriptData: ScriptEntry[] = [meta, character];
      const context = createMockContext({ characters: [character], scriptMeta: meta });

      service.preRenderTab('script', context);

      const cached = service.getCachedNightOrder(scriptData);

      expect(cached).not.toBeNull();
    });
  });

  // ==========================================================================
  // Get/Has Cached Character Image URL
  // ==========================================================================

  describe('getCachedCharacterImageUrl', () => {
    it('should return undefined when not cached', () => {
      const url = service.getCachedCharacterImageUrl('unknown-character');

      expect(url).toBeUndefined();
    });

    it('should return cached URL after pre-render', async () => {
      const character = createMockCharacter({ id: 'char1', image: 'image1.webp' });
      const context = createMockContext({ characters: [character] });

      service.preRenderTab('script', context);

      await new Promise((resolve) => setTimeout(resolve, 250));

      const url = service.getCachedCharacterImageUrl('char1');

      expect(url).toBe('resolved-url.webp');
    });
  });

  describe('hasCharacterImageUrl', () => {
    it('should return false when not cached', () => {
      const hasCached = service.hasCharacterImageUrl('unknown-character');

      expect(hasCached).toBe(false);
    });

    it('should return true after caching', async () => {
      const character = createMockCharacter({ id: 'char1', image: 'image1.webp' });
      const context = createMockContext({ characters: [character] });

      service.preRenderTab('script', context);

      await new Promise((resolve) => setTimeout(resolve, 250));

      const hasCached = service.hasCharacterImageUrl('char1');

      expect(hasCached).toBe(true);
    });
  });

  // ==========================================================================
  // Get/Has Cached Character Tokens
  // ==========================================================================

  describe('getCachedCharacterTokens', () => {
    it('should return null when not cached', () => {
      const options = createMockGenerationOptions();

      const cached = service.getCachedCharacterTokens('unknown-uuid', options);

      expect(cached).toBeNull();
    });

    it('should return cached tokens after pre-render', async () => {
      const character = createMockCharacter({ id: 'char1', uuid: 'uuid1' });
      const options = createMockGenerationOptions();
      const context = createMockContext({ characters: [character], generationOptions: options });

      service.preRenderTab('characters', context);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const cached = service.getCachedCharacterTokens('uuid1', options);

      expect(cached).not.toBeNull();
      expect(cached?.characterToken).toBeDefined();
      expect(cached?.reminderTokens).toBeDefined();
    });

    it('should return null when options change', async () => {
      const character = createMockCharacter({ id: 'char1', uuid: 'uuid1' });
      const options1 = createMockGenerationOptions({ dpi: 300 });
      const options2 = createMockGenerationOptions({ dpi: 150 });
      const context = createMockContext({
        characters: [character],
        generationOptions: options1,
      });

      service.preRenderTab('characters', context);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const cached = service.getCachedCharacterTokens('uuid1', options2);

      expect(cached).toBeNull();
    });
  });

  describe('hasCharacterTokens', () => {
    it('should return false when not cached', () => {
      const options = createMockGenerationOptions();

      const hasCached = service.hasCharacterTokens('unknown-uuid', options);

      expect(hasCached).toBe(false);
    });

    it('should return true after caching', async () => {
      const character = createMockCharacter({ id: 'char1', uuid: 'uuid1' });
      const options = createMockGenerationOptions();
      const context = createMockContext({ characters: [character], generationOptions: options });

      service.preRenderTab('characters', context);

      await new Promise((resolve) => setTimeout(resolve, 10));

      const hasCached = service.hasCharacterTokens('uuid1', options);

      expect(hasCached).toBe(true);
    });
  });

  // ==========================================================================
  // Clear Cache
  // ==========================================================================

  describe('clearCache', () => {
    it('should clear script cache', async () => {
      const context = createMockContext();

      service.preRenderTab('script', context);

      await new Promise((resolve) => setTimeout(resolve, 250));

      service.clearCache('script');

      const cachedNightOrder = service.getCachedNightOrder([createMockCharacter()]);
      const cachedImageUrl = service.getCachedCharacterImageUrl('test-character');

      expect(cachedNightOrder).toBeNull();
      expect(cachedImageUrl).toBeUndefined();
    });

    it('should clear characters cache', async () => {
      const character = createMockCharacter({ uuid: 'uuid1' });
      const options = createMockGenerationOptions();
      const context = createMockContext({ characters: [character], generationOptions: options });

      service.preRenderTab('characters', context);

      await new Promise((resolve) => setTimeout(resolve, 10));

      service.clearCache('characters');

      const cached = service.getCachedCharacterTokens('uuid1', options);

      expect(cached).toBeNull();
    });

    it('should handle tokens cache clear (no-op)', () => {
      expect(() => service.clearCache('tokens')).not.toThrow();
    });
  });

  // ==========================================================================
  // Clear All
  // ==========================================================================

  describe('clearAll', () => {
    it('should clear all caches', async () => {
      const character = createMockCharacter({ id: 'char1', uuid: 'uuid1', image: 'image.webp' });
      const options = createMockGenerationOptions();
      const context = createMockContext({ characters: [character], generationOptions: options });

      service.preRenderTab('script', context);
      service.preRenderTab('characters', context);

      await new Promise((resolve) => setTimeout(resolve, 250));

      service.clearAll();

      const cachedNightOrder = service.getCachedNightOrder([character]);
      const cachedImageUrl = service.getCachedCharacterImageUrl('char1');
      const cachedTokens = service.getCachedCharacterTokens('uuid1', options);

      expect(cachedNightOrder).toBeNull();
      expect(cachedImageUrl).toBeUndefined();
      expect(cachedTokens).toBeNull();
    });
  });
});
