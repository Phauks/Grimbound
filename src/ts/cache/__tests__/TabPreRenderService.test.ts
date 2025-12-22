/**
 * TabPreRenderService Unit Tests
 *
 * Tests for the unified tab pre-render service with dependency injection.
 *
 * @module ts/cache/__tests__/TabPreRenderService.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NightOrderResult } from '@/ts/nightOrder/nightOrderUtils.js';
import type { Character, GenerationOptions, ScriptMeta, Token } from '@/ts/types/index.js';

// Mock localStorage before importing the service
const mockLocalStorage = {
  getItem: vi.fn().mockReturnValue(null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
vi.stubGlobal('localStorage', mockLocalStorage);

// Now import the service (after localStorage is mocked)
const { TabPreRenderService } = await import('../TabPreRenderService.js');
type TabPreRenderContext = import('../TabPreRenderService.js').TabPreRenderContext;
type TabPreRenderServiceDeps = import('../TabPreRenderService.js').TabPreRenderServiceDeps;

// ============================================================================
// Test Data Factories
// ============================================================================

function createMockCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'test-character',
    uuid: 'test-uuid-123',
    name: 'Test Character',
    team: 'townsfolk',
    ability: 'Test ability',
    image: 'test-image.png',
    firstNight: 1,
    otherNight: 2,
    ...overrides,
  } as Character;
}

function createMockToken(overrides: Partial<Token> = {}): Token {
  const canvas = {
    toDataURL: vi.fn().mockReturnValue('data:image/png;base64,mockdata'),
  } as unknown as HTMLCanvasElement;

  return {
    id: 'test-token',
    uuid: 'test-token-uuid',
    filename: 'test-token.png',
    type: 'character',
    canvas,
    ...overrides,
  } as Token;
}

function createMockScriptMeta(): ScriptMeta {
  return {
    id: '_meta',
    name: 'Test Script',
    author: 'Test Author',
  } as ScriptMeta;
}

function createMockGenerationOptions(): GenerationOptions {
  return {
    dpi: 300,
    includeReminders: true,
    tokenStyle: 'default',
  } as GenerationOptions;
}

function createMockContext(overrides: Partial<TabPreRenderContext> = {}): TabPreRenderContext {
  return {
    characters: [createMockCharacter()],
    tokens: [createMockToken()],
    scriptMeta: createMockScriptMeta(),
    generationOptions: createMockGenerationOptions(),
    ...overrides,
  };
}

function createMockNightOrderResult(): NightOrderResult {
  return {
    entries: [{ characterId: 'test-character', name: 'Test Character', ability: 'Test ability' }],
    totalCharacters: 1,
  } as NightOrderResult;
}

// ============================================================================
// Mock Dependencies Factory
// ============================================================================

function createMockDeps(): TabPreRenderServiceDeps {
  return {
    cacheManager: {
      preRender: vi.fn().mockResolvedValue(undefined),
      clearCache: vi.fn().mockResolvedValue(undefined),
    } as unknown as TabPreRenderServiceDeps['cacheManager'],
    resolveImageUrl: vi.fn().mockResolvedValue({ url: 'resolved-url.png', source: 'external' }),
    buildNightOrder: vi.fn().mockReturnValue(createMockNightOrderResult()),
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('TabPreRenderService', () => {
  let service: TabPreRenderService;
  let mockDeps: TabPreRenderServiceDeps;

  beforeEach(() => {
    mockDeps = createMockDeps();
    service = new TabPreRenderService(mockDeps);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Constructor Tests
  // ==========================================================================

  describe('constructor', () => {
    it('should create instance with default dependencies', () => {
      const defaultService = new TabPreRenderService();
      expect(defaultService).toBeInstanceOf(TabPreRenderService);
    });

    it('should accept partial dependency overrides', () => {
      const partialDeps = { buildNightOrder: vi.fn() };
      const partialService = new TabPreRenderService(partialDeps);
      expect(partialService).toBeInstanceOf(TabPreRenderService);
    });
  });

  // ==========================================================================
  // preRenderTab Tests
  // ==========================================================================

  describe('preRenderTab', () => {
    it('should return error result for unknown tab', () => {
      const result = service.preRenderTab('unknown' as 'characters', createMockContext());

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown tab');
    });

    it('should route to correct handler for characters tab', () => {
      const context = createMockContext();
      const result = service.preRenderTab('characters', context);

      expect(result.tab).toBe('characters');
      expect(mockDeps.cacheManager.preRender).toHaveBeenCalled();
    });

    it('should route to correct handler for tokens tab', () => {
      const context = createMockContext();
      const result = service.preRenderTab('tokens', context);

      expect(result.tab).toBe('tokens');
      expect(result.success).toBe(true);
    });

    it('should route to correct handler for script tab', () => {
      const context = createMockContext();
      const result = service.preRenderTab('script', context);

      expect(result.tab).toBe('script');
      expect(mockDeps.buildNightOrder).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Characters Tab Tests
  // ==========================================================================

  describe('characters pre-render', () => {
    it('should return empty result when no characters', () => {
      const context = createMockContext({ characters: [] });
      const result = service.preRenderTab('characters', context);

      expect(result.itemCount).toBe(0);
      expect(result.fromCache).toBe(true);
    });

    it('should return empty result when no generation options', () => {
      const context = createMockContext({ generationOptions: undefined });
      const result = service.preRenderTab('characters', context);

      expect(result.itemCount).toBe(0);
    });

    it('should pre-render last selected character when available', () => {
      const char1 = createMockCharacter({ uuid: 'char-1', id: 'id-1' });
      const char2 = createMockCharacter({ uuid: 'char-2', id: 'id-2' });
      const context = createMockContext({
        characters: [char1, char2],
        lastSelectedCharacterUuid: 'char-2',
      });

      service.preRenderTab('characters', context);

      expect(mockDeps.cacheManager.preRender).toHaveBeenCalledWith(
        expect.objectContaining({
          characters: [char2],
        })
      );
    });

    it('should fall back to first character when last selected not found', () => {
      const char1 = createMockCharacter({ uuid: 'char-1' });
      const context = createMockContext({
        characters: [char1],
        lastSelectedCharacterUuid: 'nonexistent',
      });

      service.preRenderTab('characters', context);

      expect(mockDeps.cacheManager.preRender).toHaveBeenCalledWith(
        expect.objectContaining({
          characters: [char1],
        })
      );
    });
  });

  // ==========================================================================
  // Tokens Tab Tests
  // ==========================================================================

  describe('tokens pre-render', () => {
    it('should return empty result when no tokens', () => {
      const context = createMockContext({ tokens: [] });
      const result = service.preRenderTab('tokens', context);

      expect(result.itemCount).toBe(0);
      expect(result.fromCache).toBe(true);
    });

    it('should encode tokens to data URLs', () => {
      const token = createMockToken();
      const context = createMockContext({ tokens: [token] });

      service.preRenderTab('tokens', context);
      vi.runAllTimers();

      expect(service.hasTokenDataUrl(token.filename)).toBe(true);
    });

    it('should skip tokens without canvas', () => {
      const tokenWithCanvas = createMockToken({ filename: 'with-canvas.png' });
      const tokenWithoutCanvas = createMockToken({
        filename: 'without-canvas.png',
        canvas: undefined,
      });
      const context = createMockContext({ tokens: [tokenWithCanvas, tokenWithoutCanvas] });

      service.preRenderTab('tokens', context);
      vi.runAllTimers();

      expect(service.hasTokenDataUrl('with-canvas.png')).toBe(true);
      expect(service.hasTokenDataUrl('without-canvas.png')).toBe(false);
    });

    it('should not exceed max batch size', () => {
      const tokens = Array.from({ length: 30 }, (_, i) =>
        createMockToken({ filename: `token-${i}.png` })
      );
      const context = createMockContext({ tokens });

      const result = service.preRenderTab('tokens', context);
      vi.runAllTimers();

      expect(result.itemCount).toBe(20); // MAX_TOKENS_PER_BATCH
    });

    it('should prevent concurrent pre-rendering', () => {
      const context = createMockContext();

      service.preRenderTab('tokens', context);
      const result2 = service.preRenderTab('tokens', context);

      expect(result2.fromCache).toBe(true);
    });
  });

  // ==========================================================================
  // Script Tab Tests
  // ==========================================================================

  describe('script pre-render', () => {
    it('should return empty result when no characters', () => {
      const context = createMockContext({ characters: [] });
      const result = service.preRenderTab('script', context);

      expect(result.itemCount).toBe(0);
      expect(result.fromCache).toBe(true);
    });

    it('should build night order for both phases', () => {
      const context = createMockContext();

      service.preRenderTab('script', context);

      expect(mockDeps.buildNightOrder).toHaveBeenCalledTimes(2);
      expect(mockDeps.buildNightOrder).toHaveBeenCalledWith(expect.anything(), 'first');
      expect(mockDeps.buildNightOrder).toHaveBeenCalledWith(expect.anything(), 'other');
    });

    it('should return cached result on second call', () => {
      const context = createMockContext();

      const result1 = service.preRenderTab('script', context);
      const result2 = service.preRenderTab('script', context);

      expect(result1.fromCache).toBe(false);
      expect(result2.fromCache).toBe(true);
      expect(mockDeps.buildNightOrder).toHaveBeenCalledTimes(2); // Only first call
    });

    it('should include script meta in script data', () => {
      const meta = createMockScriptMeta();
      const context = createMockContext({ scriptMeta: meta });

      service.preRenderTab('script', context);

      expect(mockDeps.buildNightOrder).toHaveBeenCalledWith(
        expect.arrayContaining([meta]),
        expect.anything()
      );
    });
  });

  // ==========================================================================
  // getCachedNightOrder Tests
  // ==========================================================================

  describe('getCachedNightOrder', () => {
    it('should return null when no cache', () => {
      const result = service.getCachedNightOrder([]);
      expect(result).toBeNull();
    });

    it('should return cached data when hash matches', () => {
      const character = createMockCharacter();
      const context = createMockContext({ characters: [character], scriptMeta: null });

      service.preRenderTab('script', context);
      const cached = service.getCachedNightOrder([character]);

      expect(cached).not.toBeNull();
      expect(cached?.firstNight).toBeDefined();
      expect(cached?.otherNight).toBeDefined();
    });

    it('should return null when hash does not match', () => {
      const char1 = createMockCharacter({ id: 'char-1' });
      const char2 = createMockCharacter({ id: 'char-2' });
      const context = createMockContext({ characters: [char1], scriptMeta: null });

      service.preRenderTab('script', context);
      const cached = service.getCachedNightOrder([char2]);

      expect(cached).toBeNull();
    });
  });

  // ==========================================================================
  // getCachedTokenDataUrl Tests
  // ==========================================================================

  describe('getCachedTokenDataUrl', () => {
    it('should return undefined when not cached', () => {
      expect(service.getCachedTokenDataUrl('nonexistent.png')).toBeUndefined();
    });

    it('should return data URL when cached', () => {
      const token = createMockToken();
      const context = createMockContext({ tokens: [token] });

      service.preRenderTab('tokens', context);
      vi.runAllTimers();

      const url = service.getCachedTokenDataUrl(token.filename);
      expect(url).toBe('data:image/png;base64,mockdata');
    });
  });

  // ==========================================================================
  // getCachedCharacterImageUrl Tests
  // ==========================================================================

  describe('getCachedCharacterImageUrl', () => {
    it('should return undefined when not cached', () => {
      expect(service.getCachedCharacterImageUrl('nonexistent')).toBeUndefined();
    });

    it('should resolve and cache character image URLs', async () => {
      const character = createMockCharacter({ id: 'test-id', image: 'test.png' });
      const context = createMockContext({ characters: [character] });

      service.preRenderTab('script', context);
      vi.runAllTimers();

      // Wait for async resolution
      await vi.runAllTimersAsync();

      expect(service.hasCharacterImageUrl('test-id')).toBe(true);
    });
  });

  // ==========================================================================
  // clearCache Tests
  // ==========================================================================

  describe('clearCache', () => {
    it('should clear script cache', () => {
      const context = createMockContext();
      service.preRenderTab('script', context);

      service.clearCache('script');

      expect(service.getCachedNightOrder(context.characters)).toBeNull();
    });

    it('should clear tokens cache', () => {
      const token = createMockToken();
      const context = createMockContext({ tokens: [token] });
      service.preRenderTab('tokens', context);
      vi.runAllTimers();

      service.clearCache('tokens');

      expect(service.hasTokenDataUrl(token.filename)).toBe(false);
    });

    it('should delegate characters cache to CacheManager', () => {
      service.clearCache('characters');

      expect(mockDeps.cacheManager.clearCache).toHaveBeenCalledWith('characters');
    });
  });

  // ==========================================================================
  // clearAll Tests
  // ==========================================================================

  describe('clearAll', () => {
    it('should clear all caches', () => {
      const token = createMockToken();
      const context = createMockContext({ tokens: [token] });

      service.preRenderTab('script', context);
      service.preRenderTab('tokens', context);
      vi.runAllTimers();

      service.clearAll();

      expect(service.getCachedNightOrder(context.characters)).toBeNull();
      expect(service.hasTokenDataUrl(token.filename)).toBe(false);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('should handle character with array image', async () => {
      const character = createMockCharacter({ image: ['first.png', 'second.png'] });
      const context = createMockContext({ characters: [character] });

      service.preRenderTab('script', context);
      vi.runAllTimers();
      await vi.runAllTimersAsync();

      expect(mockDeps.resolveImageUrl).toHaveBeenCalledWith(
        'first.png',
        character.id,
        expect.anything()
      );
    });

    it('should handle character with object image', async () => {
      const character = createMockCharacter({ image: { url: 'object.png' } as unknown as string });
      const context = createMockContext({ characters: [character] });

      service.preRenderTab('script', context);
      vi.runAllTimers();
      await vi.runAllTimersAsync();

      expect(mockDeps.resolveImageUrl).toHaveBeenCalledWith(
        'object.png',
        character.id,
        expect.anything()
      );
    });

    it('should use fallback URL when resolution fails', async () => {
      mockDeps.resolveImageUrl = vi.fn().mockRejectedValue(new Error('Network error'));
      service = new TabPreRenderService(mockDeps);

      const character = createMockCharacter({ id: 'fail-id', image: 'fallback.png' });
      const context = createMockContext({ characters: [character] });

      service.preRenderTab('script', context);
      vi.runAllTimers();
      await vi.runAllTimersAsync();

      expect(service.getCachedCharacterImageUrl('fail-id')).toBe('fallback.png');
    });
  });
});
