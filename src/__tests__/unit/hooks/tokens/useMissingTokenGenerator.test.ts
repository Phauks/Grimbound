/**
 * Unit tests for useMissingTokenGenerator hook
 *
 * Tests cover:
 * - Detecting characters without tokens
 * - Incremental token generation (appending to existing)
 * - Hash-based deduplication (lastGeneratedJsonHash)
 * - Abort/cancel functionality
 * - Error handling (including AbortError)
 * - Progress updates
 * - Pre-rendering of generated tokens
 * - Concurrent generation prevention
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCharacter, createToken, resetAllFactories } from '@/__tests__/factories';
import * as TokenCardModule from '@/components/ViewComponents/TokensComponents/TokenGrid/TokenCard';
import type { useTokenContext } from '@/contexts/TokenContext';
import * as TokenContextModule from '@/contexts/TokenContext';
import { useMissingTokenGenerator } from '@/hooks/tokens/useMissingTokenGenerator';
import * as HashUtilsModule from '@/ts/cache/utils/hashUtils';
import * as BatchGeneratorModule from '@/ts/generation/batchGenerator';

type TokenContextType = ReturnType<typeof useTokenContext>;

/**
 * Mock factory for TokenContext value
 */
const createMockTokenContext = (overrides = {}): TokenContextType => ({
  tokens: [],
  setTokens: vi.fn(),
  characters: [],
  setCharacters: vi.fn(),
  officialData: [],
  setOfficialData: vi.fn(),
  characterMetadata: new Map(),
  getMetadata: vi.fn(),
  setMetadata: vi.fn(),
  deleteMetadata: vi.fn(),
  clearAllMetadata: vi.fn(),
  isCharacterEnabled: vi.fn(() => true),
  setCharacterEnabled: vi.fn(),
  setAllCharactersEnabled: vi.fn(),
  getEnabledCharacters: vi.fn(() => []),
  enabledCharacterUuids: new Set<string>(),
  characterSelectionSummary: { enabled: 0, disabled: 0, total: 0 },
  scriptMeta: null,
  setScriptMeta: vi.fn(),
  generationOptions: {
    displayAbilityText: true,
    generateBootleggerRules: false,
    tokenCount: true,
    setupStyle: 'default',
    reminderBackground: '#000000',
    characterBackground: '#ffffff',
    characterNameFont: 'Arial',
    characterReminderFont: 'Arial',
    scriptNameToken: true,
    almanacToken: false,
    pandemoniumToken: false,
  },
  updateGenerationOptions: vi.fn(),
  jsonInput: '[]',
  setJsonInput: vi.fn(),
  filters: {
    teams: [],
    tokenTypes: [],
    display: [],
    reminders: [],
    origin: [],
  },
  updateFilters: vi.fn(),
  exampleCharacterToken: null,
  setExampleCharacterToken: vi.fn(),
  exampleMetaToken: null,
  setExampleMetaToken: vi.fn(),
  isLoading: false,
  setIsLoading: vi.fn(),
  error: null,
  setError: vi.fn(),
  warnings: [],
  setWarnings: vi.fn(),
  generationProgress: null,
  setGenerationProgress: vi.fn(),
  lastGeneratedJsonHash: null,
  setLastGeneratedJsonHash: vi.fn(),
  syncStatus: {
    state: 'idle',
    dataSource: 'cache',
    currentVersion: null,
    availableVersion: null,
    lastSync: null,
    error: null,
  },
  isSyncInitialized: false,
  ...overrides,
});

describe('useMissingTokenGenerator', () => {
  beforeEach(() => {
    resetAllFactories();

    // Mock TokenCard functions
    vi.spyOn(TokenCardModule, 'preRenderGalleryTokens').mockImplementation(() => {});

    // Mock hash utility - deterministic for testing
    vi.spyOn(HashUtilsModule, 'simpleHash').mockImplementation((str: string) => String(str.length));

    // Mock batch generator functions
    vi.spyOn(BatchGeneratorModule, 'generateAllTokens').mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Hook Initialization', () => {
    it('should return expected functions', () => {
      const mockContext = createMockTokenContext();
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useMissingTokenGenerator());

      expect(result.current).toHaveProperty('generateMissingTokens');
      expect(result.current).toHaveProperty('hasMissingTokens');
      expect(result.current).toHaveProperty('getMissingCharacters');
      expect(result.current).toHaveProperty('cancelGeneration');
      expect(typeof result.current.generateMissingTokens).toBe('function');
      expect(typeof result.current.hasMissingTokens).toBe('function');
      expect(typeof result.current.getMissingCharacters).toBe('function');
      expect(typeof result.current.cancelGeneration).toBe('function');
    });
  });

  describe('getMissingCharacters', () => {
    it('should return empty array when all enabled characters have tokens', () => {
      const character1 = createCharacter({ uuid: 'char-1', name: 'Washerwoman' });
      const character2 = createCharacter({ uuid: 'char-2', name: 'Librarian' });
      const token1 = createToken({ parentUuid: 'char-1', type: 'character' });
      const token2 = createToken({ parentUuid: 'char-2', type: 'character' });

      const mockContext = createMockTokenContext({
        tokens: [token1, token2],
        getEnabledCharacters: vi.fn(() => [character1, character2]),
        jsonInput: '[{"id":"test"}]',
        lastGeneratedJsonHash: null,
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useMissingTokenGenerator());

      expect(result.current.getMissingCharacters()).toEqual([]);
    });

    it('should return characters without tokens', () => {
      const character1 = createCharacter({ uuid: 'char-1', name: 'Washerwoman' });
      const character2 = createCharacter({ uuid: 'char-2', name: 'Librarian' });
      const character3 = createCharacter({ uuid: 'char-3', name: 'Investigator' });
      const token1 = createToken({ parentUuid: 'char-1', type: 'character' });

      const mockContext = createMockTokenContext({
        tokens: [token1],
        getEnabledCharacters: vi.fn(() => [character1, character2, character3]),
        jsonInput: '[{"id":"test"}]',
        lastGeneratedJsonHash: null,
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useMissingTokenGenerator());

      const missing = result.current.getMissingCharacters();
      expect(missing).toHaveLength(2);
      expect(missing).toEqual([character2, character3]);
    });

    it('should return empty when lastGeneratedJsonHash matches current jsonInput', () => {
      const character1 = createCharacter({ uuid: 'char-1', name: 'Washerwoman' });
      const mockHash = 'test-hash-123';
      const jsonInput = '[{"id":"test"}]';
      // Must have at least one token for the condition to apply
      const existingToken = createToken({ parentUuid: 'other-char', type: 'character' });

      const mockContext = createMockTokenContext({
        tokens: [existingToken],
        getEnabledCharacters: vi.fn(() => [character1]),
        jsonInput,
        lastGeneratedJsonHash: mockHash,
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);
      vi.spyOn(HashUtilsModule, 'simpleHash').mockReturnValue(mockHash);

      const { result } = renderHook(() => useMissingTokenGenerator());

      // Even though character has no token, hash matches so should return empty
      expect(result.current.getMissingCharacters()).toEqual([]);
    });

    it('should only consider enabled characters', () => {
      const enabledChar = createCharacter({ uuid: 'char-1', name: 'Washerwoman' });

      const mockContext = createMockTokenContext({
        tokens: [],
        getEnabledCharacters: vi.fn(() => [enabledChar]),
        jsonInput: '[{"id":"test"}]',
        lastGeneratedJsonHash: null,
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useMissingTokenGenerator());

      const missing = result.current.getMissingCharacters();
      expect(missing).toHaveLength(1);
      expect(missing[0]).toEqual(enabledChar);
    });

    it('should ignore non-character tokens when determining missing tokens', () => {
      const character1 = createCharacter({ uuid: 'char-1', name: 'Washerwoman' });
      const reminderToken = createToken({ parentUuid: 'char-1', type: 'reminder' });
      const metaToken = createToken({ type: 'meta' });

      const mockContext = createMockTokenContext({
        tokens: [reminderToken, metaToken],
        getEnabledCharacters: vi.fn(() => [character1]),
        jsonInput: '[{"id":"test"}]',
        lastGeneratedJsonHash: null,
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useMissingTokenGenerator());

      const missing = result.current.getMissingCharacters();
      expect(missing).toHaveLength(1);
      expect(missing[0]).toEqual(character1);
    });
  });

  describe('hasMissingTokens', () => {
    it('should return true when there are missing tokens', () => {
      const character1 = createCharacter({ uuid: 'char-1', name: 'Washerwoman' });
      const character2 = createCharacter({ uuid: 'char-2', name: 'Librarian' });

      const mockContext = createMockTokenContext({
        tokens: [],
        getEnabledCharacters: vi.fn(() => [character1, character2]),
        jsonInput: '[{"id":"test"}]',
        lastGeneratedJsonHash: null,
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useMissingTokenGenerator());

      expect(result.current.hasMissingTokens()).toBe(true);
    });

    it('should return false when all characters have tokens', () => {
      const character1 = createCharacter({ uuid: 'char-1', name: 'Washerwoman' });
      const token1 = createToken({ parentUuid: 'char-1', type: 'character' });

      const mockContext = createMockTokenContext({
        tokens: [token1],
        getEnabledCharacters: vi.fn(() => [character1]),
        jsonInput: '[{"id":"test"}]',
        lastGeneratedJsonHash: null,
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useMissingTokenGenerator());

      expect(result.current.hasMissingTokens()).toBe(false);
    });

    it('should return false when tokens were already generated for this JSON', () => {
      const character1 = createCharacter({ uuid: 'char-1', name: 'Washerwoman' });
      const mockHash = 'test-hash-123';
      const jsonInput = '[{"id":"test"}]';
      const existingToken = createToken({ parentUuid: 'other-char', type: 'character' });

      const mockContext = createMockTokenContext({
        tokens: [existingToken],
        getEnabledCharacters: vi.fn(() => [character1]),
        jsonInput,
        lastGeneratedJsonHash: mockHash,
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);
      vi.spyOn(HashUtilsModule, 'simpleHash').mockReturnValue(mockHash);

      const { result } = renderHook(() => useMissingTokenGenerator());

      expect(result.current.hasMissingTokens()).toBe(false);
    });
  });

  describe('generateMissingTokens', () => {
    it('should skip if already loading', async () => {
      const character1 = createCharacter({ uuid: 'char-1', name: 'Washerwoman' });

      const mockContext = createMockTokenContext({
        tokens: [],
        getEnabledCharacters: vi.fn(() => [character1]),
        isLoading: true,
        jsonInput: '[{"id":"test"}]',
        lastGeneratedJsonHash: null,
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const generateAllTokensMock = vi.spyOn(BatchGeneratorModule, 'generateAllTokens');

      const { result } = renderHook(() => useMissingTokenGenerator());

      const generated = await act(async () => await result.current.generateMissingTokens());

      expect(generated).toBe(0);
      expect(generateAllTokensMock).not.toHaveBeenCalled();
    });

    it('should skip if no missing characters', async () => {
      const character1 = createCharacter({ uuid: 'char-1', name: 'Washerwoman' });
      const token1 = createToken({ parentUuid: 'char-1', type: 'character' });

      const mockContext = createMockTokenContext({
        tokens: [token1],
        getEnabledCharacters: vi.fn(() => [character1]),
        isLoading: false,
        jsonInput: '[{"id":"test"}]',
        lastGeneratedJsonHash: null,
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const generateAllTokensMock = vi.spyOn(BatchGeneratorModule, 'generateAllTokens');

      const { result } = renderHook(() => useMissingTokenGenerator());

      const generated = await act(async () => await result.current.generateMissingTokens());

      expect(generated).toBe(0);
      expect(generateAllTokensMock).not.toHaveBeenCalled();
    });

    it('should call generateAllTokens with missing characters only', async () => {
      const character1 = createCharacter({ uuid: 'char-1', name: 'Washerwoman' });
      const character2 = createCharacter({ uuid: 'char-2', name: 'Librarian' });
      const token1 = createToken({ parentUuid: 'char-1', type: 'character' });

      const mockContext = createMockTokenContext({
        tokens: [token1],
        getEnabledCharacters: vi.fn(() => [character1, character2]),
        isLoading: false,
        jsonInput: '[{"id":"test"}]',
        lastGeneratedJsonHash: null,
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const generateAllTokensMock = vi
        .spyOn(BatchGeneratorModule, 'generateAllTokens')
        .mockResolvedValue([]);

      const { result } = renderHook(() => useMissingTokenGenerator());

      await act(async () => {
        await result.current.generateMissingTokens();
      });

      expect(generateAllTokensMock).toHaveBeenCalledWith(
        [character2],
        expect.any(Object),
        null,
        null,
        expect.any(Function),
        expect.any(AbortSignal),
        undefined,
        expect.any(Function)
      );
    });

    it('should disable meta token options', async () => {
      const character1 = createCharacter({ uuid: 'char-1', name: 'Washerwoman' });

      const mockContext = createMockTokenContext({
        tokens: [],
        getEnabledCharacters: vi.fn(() => [character1]),
        isLoading: false,
        jsonInput: '[{"id":"test"}]',
        lastGeneratedJsonHash: null,
        generationOptions: {
          displayAbilityText: true,
          generateBootleggerRules: true,
          tokenCount: true,
          setupStyle: 'default' as const,
          reminderBackground: '#000000',
          characterBackground: '#ffffff',
          characterNameFont: 'Arial',
          characterReminderFont: 'Arial',
          scriptNameToken: true,
          almanacToken: true,
          pandemoniumToken: true,
        },
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const generateAllTokensMock = vi
        .spyOn(BatchGeneratorModule, 'generateAllTokens')
        .mockResolvedValue([]);

      const { result } = renderHook(() => useMissingTokenGenerator());

      await act(async () => {
        await result.current.generateMissingTokens();
      });

      expect(generateAllTokensMock).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          pandemoniumToken: false,
          scriptNameToken: false,
          almanacToken: false,
          generateBootleggerRules: false,
        }),
        null,
        null,
        expect.any(Function),
        expect.any(AbortSignal),
        undefined,
        expect.any(Function)
      );
    });

    it('should update tokens incrementally via tokenCallback', async () => {
      const character1 = createCharacter({ uuid: 'char-1', name: 'Washerwoman' });
      const newToken1 = createToken({ parentUuid: 'char-1', type: 'character', name: 'Token 1' });
      const newToken2 = createToken({ parentUuid: 'char-1', type: 'reminder', name: 'Token 2' });

      const setTokens = vi.fn();

      const mockContext = createMockTokenContext({
        tokens: [],
        getEnabledCharacters: vi.fn(() => [character1]),
        isLoading: false,
        jsonInput: '[{"id":"test"}]',
        lastGeneratedJsonHash: null,
        setTokens,
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      vi.spyOn(BatchGeneratorModule, 'generateAllTokens').mockImplementation(
        async (_chars, _opts, _progress, _meta, callback) => {
          callback?.(newToken1);
          callback?.(newToken2);
          return [];
        }
      );

      const { result } = renderHook(() => useMissingTokenGenerator());

      await act(async () => {
        await result.current.generateMissingTokens();
      });

      expect(setTokens).toHaveBeenCalledTimes(2);
      expect(setTokens).toHaveBeenNthCalledWith(1, [newToken1]);
      expect(setTokens).toHaveBeenNthCalledWith(2, [newToken1, newToken2]);
    });

    it('should set lastGeneratedJsonHash on success', async () => {
      const character1 = createCharacter({ uuid: 'char-1', name: 'Washerwoman' });
      const mockHash = 'new-hash-456';
      const jsonInput = '[{"id":"test"}]';
      const setLastGeneratedJsonHash = vi.fn();

      const mockContext = createMockTokenContext({
        tokens: [],
        getEnabledCharacters: vi.fn(() => [character1]),
        isLoading: false,
        jsonInput,
        lastGeneratedJsonHash: null,
        setLastGeneratedJsonHash,
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);
      vi.spyOn(BatchGeneratorModule, 'generateAllTokens').mockResolvedValue([]);
      vi.spyOn(HashUtilsModule, 'simpleHash').mockReturnValue(mockHash);

      const { result } = renderHook(() => useMissingTokenGenerator());

      await act(async () => {
        await result.current.generateMissingTokens();
      });

      expect(setLastGeneratedJsonHash).toHaveBeenCalledWith(mockHash);
    });

    it('should handle errors and set error state', async () => {
      const character1 = createCharacter({ uuid: 'char-1', name: 'Washerwoman' });
      const testError = new Error('Generation failed');
      const setError = vi.fn();

      const mockContext = createMockTokenContext({
        tokens: [],
        getEnabledCharacters: vi.fn(() => [character1]),
        isLoading: false,
        jsonInput: '[{"id":"test"}]',
        lastGeneratedJsonHash: null,
        setError,
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);
      vi.spyOn(BatchGeneratorModule, 'generateAllTokens').mockRejectedValue(testError);

      const { result } = renderHook(() => useMissingTokenGenerator());

      await act(async () => {
        await result.current.generateMissingTokens();
      });

      expect(setError).toHaveBeenCalledWith('Generation failed');
    });

    it('should not set error for AbortError', async () => {
      const character1 = createCharacter({ uuid: 'char-1', name: 'Washerwoman' });
      const abortError = new DOMException('Aborted', 'AbortError');
      const setError = vi.fn();

      const mockContext = createMockTokenContext({
        tokens: [],
        getEnabledCharacters: vi.fn(() => [character1]),
        isLoading: false,
        jsonInput: '[{"id":"test"}]',
        lastGeneratedJsonHash: null,
        setError,
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);
      vi.spyOn(BatchGeneratorModule, 'generateAllTokens').mockRejectedValue(abortError);

      const { result } = renderHook(() => useMissingTokenGenerator());

      await act(async () => {
        await result.current.generateMissingTokens();
      });

      expect(setError).toHaveBeenCalledWith(null);
      expect(setError).not.toHaveBeenCalledWith('Aborted');
    });

    it('should clean up loading state in finally block', async () => {
      const character1 = createCharacter({ uuid: 'char-1', name: 'Washerwoman' });
      const setIsLoading = vi.fn();
      const setGenerationProgress = vi.fn();

      const mockContext = createMockTokenContext({
        tokens: [],
        getEnabledCharacters: vi.fn(() => [character1]),
        isLoading: false,
        jsonInput: '[{"id":"test"}]',
        lastGeneratedJsonHash: null,
        setIsLoading,
        setGenerationProgress,
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);
      vi.spyOn(BatchGeneratorModule, 'generateAllTokens').mockResolvedValue([]);

      const { result } = renderHook(() => useMissingTokenGenerator());

      await act(async () => {
        await result.current.generateMissingTokens();
      });

      expect(setIsLoading).toHaveBeenCalledWith(true);
      expect(setIsLoading).toHaveBeenCalledWith(false);
      expect(setGenerationProgress).toHaveBeenCalledWith(null);
    });

    it('should call preRenderGalleryTokens with all tokens after generation', async () => {
      const character1 = createCharacter({ uuid: 'char-1', name: 'Washerwoman' });
      const existingToken = createToken({ parentUuid: 'other-char', type: 'character' });
      const newToken = createToken({ parentUuid: 'char-1', type: 'character' });

      const mockContext = createMockTokenContext({
        tokens: [existingToken],
        getEnabledCharacters: vi.fn(() => [character1]),
        isLoading: false,
        jsonInput: '[{"id":"test"}]',
        lastGeneratedJsonHash: null,
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      vi.spyOn(BatchGeneratorModule, 'generateAllTokens').mockImplementation(
        async (_chars, _opts, _progress, _meta, callback) => {
          callback?.(newToken);
          return [];
        }
      );

      const preRenderMock = vi
        .spyOn(TokenCardModule, 'preRenderGalleryTokens')
        .mockImplementation(() => {});

      const { result } = renderHook(() => useMissingTokenGenerator());

      await act(async () => {
        await result.current.generateMissingTokens();
      });

      expect(preRenderMock).toHaveBeenCalledWith([existingToken, newToken]);
    });

    it('should return number of new tokens generated', async () => {
      const character1 = createCharacter({ uuid: 'char-1', name: 'Washerwoman' });
      const character2 = createCharacter({ uuid: 'char-2', name: 'Librarian' });
      const newToken1 = createToken({ parentUuid: 'char-1', type: 'character' });
      const newToken2 = createToken({ parentUuid: 'char-2', type: 'character' });

      const mockContext = createMockTokenContext({
        tokens: [],
        getEnabledCharacters: vi.fn(() => [character1, character2]),
        isLoading: false,
        jsonInput: '[{"id":"test"}]',
        lastGeneratedJsonHash: null,
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      vi.spyOn(BatchGeneratorModule, 'generateAllTokens').mockImplementation(
        async (_chars, _opts, _progress, _meta, callback) => {
          callback?.(newToken1);
          callback?.(newToken2);
          return [];
        }
      );

      const { result } = renderHook(() => useMissingTokenGenerator());

      const generated = await act(async () => await result.current.generateMissingTokens());

      expect(generated).toBe(2);
    });

    it('should set initial progress', async () => {
      const character1 = createCharacter({ uuid: 'char-1', name: 'Washerwoman' });
      const character2 = createCharacter({ uuid: 'char-2', name: 'Librarian' });
      const setGenerationProgress = vi.fn();

      const mockContext = createMockTokenContext({
        tokens: [],
        getEnabledCharacters: vi.fn(() => [character1, character2]),
        isLoading: false,
        jsonInput: '[{"id":"test"}]',
        lastGeneratedJsonHash: null,
        setGenerationProgress,
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);
      vi.spyOn(BatchGeneratorModule, 'generateAllTokens').mockResolvedValue([]);

      const { result } = renderHook(() => useMissingTokenGenerator());

      await act(async () => {
        await result.current.generateMissingTokens();
      });

      expect(setGenerationProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: 'character',
          character: { current: 0, total: 2 },
          reminder: { current: 0, total: 0 },
          meta: { current: 0, total: 0 },
          overall: { current: 0, total: 2 },
        })
      );
    });
  });

  describe('cancelGeneration', () => {
    it('should abort in-flight generation', async () => {
      const character1 = createCharacter({ uuid: 'char-1', name: 'Washerwoman' });
      let capturedSignal: AbortSignal | null = null;

      const mockContext = createMockTokenContext({
        tokens: [],
        getEnabledCharacters: vi.fn(() => [character1]),
        isLoading: false,
        jsonInput: '[{"id":"test"}]',
        lastGeneratedJsonHash: null,
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      vi.spyOn(BatchGeneratorModule, 'generateAllTokens').mockImplementation(
        async (_chars, _opts, _progress, _meta, _callback, signal) => {
          capturedSignal = signal;
          await new Promise(() => {});
          return [];
        }
      );

      const { result } = renderHook(() => useMissingTokenGenerator());

      const promise = act(async () => await result.current.generateMissingTokens());

      await new Promise((resolve) => setTimeout(resolve, 10));

      act(() => {
        result.current.cancelGeneration();
      });

      expect(capturedSignal?.aborted).toBe(true);
    });
  });

  describe('Concurrent Generation Prevention', () => {
    it('should skip generation when isLoading is true', async () => {
      const character1 = createCharacter({ uuid: 'char-1', name: 'Washerwoman' });

      const mockContext = createMockTokenContext({
        tokens: [],
        getEnabledCharacters: vi.fn(() => [character1]),
        isLoading: true,
        jsonInput: '[{"id":"test"}]',
        lastGeneratedJsonHash: null,
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const generateAllTokensMock = vi.spyOn(BatchGeneratorModule, 'generateAllTokens');

      const { result } = renderHook(() => useMissingTokenGenerator());

      let count = 0;
      await act(async () => {
        count = await result.current!.generateMissingTokens();
      });

      expect(count).toBe(0);
      expect(generateAllTokensMock).not.toHaveBeenCalled();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle character missing detection and generation', async () => {
      const character1 = createCharacter({ uuid: 'char-1', name: 'Washerwoman' });
      const character2 = createCharacter({ uuid: 'char-2', name: 'Librarian' });
      const newToken1 = createToken({ parentUuid: 'char-1', type: 'character' });
      const newToken2 = createToken({ parentUuid: 'char-2', type: 'character' });

      const mockContext = createMockTokenContext({
        tokens: [],
        getEnabledCharacters: vi.fn(() => [character1, character2]),
        isLoading: false,
        jsonInput: '[{"id":"test"}]',
        lastGeneratedJsonHash: null,
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);
      vi.spyOn(HashUtilsModule, 'simpleHash').mockReturnValue('test-hash');

      vi.spyOn(BatchGeneratorModule, 'generateAllTokens').mockImplementation(
        async (_chars, _opts, _progress, _meta, callback) => {
          callback?.(newToken1);
          callback?.(newToken2);
          return [];
        }
      );

      const preRenderMock = vi
        .spyOn(TokenCardModule, 'preRenderGalleryTokens')
        .mockImplementation(() => {});

      const { result } = renderHook(() => useMissingTokenGenerator());

      // Check before generation
      expect(result.current!.hasMissingTokens()).toBe(true);
      expect(result.current!.getMissingCharacters()).toHaveLength(2);

      let generated = 0;
      await act(async () => {
        generated = await result.current!.generateMissingTokens();
      });

      expect(generated).toBe(2);
      expect(preRenderMock).toHaveBeenCalledWith([newToken1, newToken2]);
    });
  });
});
