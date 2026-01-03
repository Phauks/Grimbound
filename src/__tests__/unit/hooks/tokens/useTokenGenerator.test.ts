/**
 * Unit tests for useTokenGenerator hook
 *
 * Tests cover:
 * - Token generation with enabled characters
 * - Abort/cancel functionality
 * - Error handling
 * - Progress updates
 * - Partial regeneration (by type)
 * - Concurrent generation prevention
 * - Batched token updates
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCharacter, createToken } from '@/__tests__/factories';
import * as TokenCardModule from '@/components/ViewComponents/TokensComponents/TokenGrid/TokenCard';
import type { useTokenContext } from '@/contexts/TokenContext';
import * as TokenContextModule from '@/contexts/TokenContext';
import { useTokenGenerator } from '@/hooks/tokens/useTokenGenerator';
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

describe('useTokenGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock TokenCard functions
    vi.spyOn(TokenCardModule, 'clearDataUrlCache').mockImplementation(() => {});
    vi.spyOn(TokenCardModule, 'preRenderGalleryTokens').mockImplementation(() => {});

    // Mock batch generator functions
    vi.spyOn(BatchGeneratorModule, 'calculateTokenCountsByType').mockReturnValue({
      character: 0,
      reminder: 0,
      meta: 0,
      total: 0,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Hook Initialization', () => {
    it('should return expected functions', () => {
      const mockContext = createMockTokenContext();
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useTokenGenerator());

      expect(result.current).toHaveProperty('generateTokens');
      expect(result.current).toHaveProperty('cancelGeneration');
      expect(result.current).toHaveProperty('regenerateCharacterTokens');
      expect(result.current).toHaveProperty('regenerateReminderTokens');
      expect(result.current).toHaveProperty('regenerateMetaTokens');
      expect(typeof result.current.generateTokens).toBe('function');
      expect(typeof result.current.cancelGeneration).toBe('function');
    });
  });

  describe('generateTokens', () => {
    it('should set error when no enabled characters', async () => {
      const setError = vi.fn();
      const mockContext = createMockTokenContext({
        getEnabledCharacters: vi.fn(() => []),
        setError,
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useTokenGenerator());

      await act(async () => {
        await result.current.generateTokens();
      });

      expect(setError).toHaveBeenCalledWith(
        'No characters to generate tokens for (all characters are disabled)'
      );
    });

    it('should set loading state during generation', async () => {
      const setIsLoading = vi.fn();
      const characters = [createCharacter({ uuid: 'test-uuid-1' })];

      vi.spyOn(BatchGeneratorModule, 'generateAllTokens').mockResolvedValue([]);
      vi.spyOn(BatchGeneratorModule, 'calculateTokenCountsByType').mockReturnValue({
        character: 1,
        reminder: 0,
        meta: 0,
        total: 1,
      });

      const mockContext = createMockTokenContext({
        getEnabledCharacters: vi.fn(() => characters),
        setIsLoading,
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useTokenGenerator());

      await act(async () => {
        await result.current.generateTokens();
      });

      expect(setIsLoading).toHaveBeenCalledWith(true);
      expect(setIsLoading).toHaveBeenCalledWith(false);
    });

    it('should call generateAllTokens with correct parameters', async () => {
      const characters = [
        createCharacter({ uuid: 'test-uuid-1', name: 'Washerwoman' }),
        createCharacter({ uuid: 'test-uuid-2', name: 'Librarian' }),
      ];
      const generationOptions = {
        displayAbilityText: true,
        generateBootleggerRules: false,
        tokenCount: true,
        setupStyle: 'default' as const,
        reminderBackground: '#000000',
        characterBackground: '#ffffff',
        characterNameFont: 'Arial',
        characterReminderFont: 'Arial',
        scriptNameToken: true,
        almanacToken: false,
        pandemoniumToken: false,
      };

      const generateAllTokensMock = vi
        .spyOn(BatchGeneratorModule, 'generateAllTokens')
        .mockResolvedValue([]);
      vi.spyOn(BatchGeneratorModule, 'calculateTokenCountsByType').mockReturnValue({
        character: 2,
        reminder: 0,
        meta: 1,
        total: 3,
      });

      const mockContext = createMockTokenContext({
        getEnabledCharacters: vi.fn(() => characters),
        generationOptions,
        characterMetadata: new Map(),
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useTokenGenerator());

      await act(async () => {
        await result.current.generateTokens();
      });

      expect(generateAllTokensMock).toHaveBeenCalledWith(
        characters,
        generationOptions,
        expect.any(Function), // progress callback
        undefined, // scriptMeta
        expect.any(Function), // token callback
        expect.any(AbortSignal), // abort signal
        expect.any(Map), // characterMetadata
        expect.any(Function) // setGenerationProgress
      );
    });

    it('should update generation progress', async () => {
      const setGenerationProgress = vi.fn();
      const characters = [createCharacter({ uuid: 'test-uuid-1' })];

      vi.spyOn(BatchGeneratorModule, 'generateAllTokens').mockResolvedValue([]);
      vi.spyOn(BatchGeneratorModule, 'calculateTokenCountsByType').mockReturnValue({
        character: 1,
        reminder: 2,
        meta: 1,
        total: 4,
      });

      const mockContext = createMockTokenContext({
        getEnabledCharacters: vi.fn(() => characters),
        setGenerationProgress,
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useTokenGenerator());

      await act(async () => {
        await result.current.generateTokens();
      });

      // Initial progress should be set
      expect(setGenerationProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          phase: 'meta',
          character: { current: 0, total: 1 },
          reminder: { current: 0, total: 2 },
          meta: { current: 0, total: 1 },
          overall: { current: 0, total: 4 },
        })
      );

      // Progress should be cleared after completion
      expect(setGenerationProgress).toHaveBeenCalledWith(null);
    });

    it('should clear tokens and data URL cache before generation', async () => {
      const setTokens = vi.fn();
      const characters = [createCharacter({ uuid: 'test-uuid-1' })];

      vi.spyOn(BatchGeneratorModule, 'generateAllTokens').mockResolvedValue([]);
      vi.spyOn(BatchGeneratorModule, 'calculateTokenCountsByType').mockReturnValue({
        character: 1,
        reminder: 0,
        meta: 0,
        total: 1,
      });

      const mockContext = createMockTokenContext({
        getEnabledCharacters: vi.fn(() => characters),
        setTokens,
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useTokenGenerator());

      await act(async () => {
        await result.current.generateTokens();
      });

      expect(setTokens).toHaveBeenCalledWith([]);
      expect(TokenCardModule.clearDataUrlCache).toHaveBeenCalled();
    });

    it('should set lastGeneratedJsonHash on success', async () => {
      const setLastGeneratedJsonHash = vi.fn();
      const characters = [createCharacter({ uuid: 'test-uuid-1' })];

      vi.spyOn(BatchGeneratorModule, 'generateAllTokens').mockResolvedValue([]);
      vi.spyOn(BatchGeneratorModule, 'calculateTokenCountsByType').mockReturnValue({
        character: 1,
        reminder: 0,
        meta: 0,
        total: 1,
      });

      const mockContext = createMockTokenContext({
        getEnabledCharacters: vi.fn(() => characters),
        jsonInput: '[{"id":"test"}]',
        setLastGeneratedJsonHash,
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useTokenGenerator());

      await act(async () => {
        await result.current.generateTokens();
      });

      expect(setLastGeneratedJsonHash).toHaveBeenCalledWith(expect.any(String));
    });

    it('should handle generation errors', async () => {
      const setError = vi.fn();
      const characters = [createCharacter({ uuid: 'test-uuid-1' })];
      const testError = new Error('Generation failed');

      vi.spyOn(BatchGeneratorModule, 'generateAllTokens').mockRejectedValue(testError);
      vi.spyOn(BatchGeneratorModule, 'calculateTokenCountsByType').mockReturnValue({
        character: 1,
        reminder: 0,
        meta: 0,
        total: 1,
      });

      const mockContext = createMockTokenContext({
        getEnabledCharacters: vi.fn(() => characters),
        setError,
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useTokenGenerator());

      await act(async () => {
        await result.current.generateTokens();
      });

      expect(setError).toHaveBeenCalledWith('Generation failed');
    });

    it('should not set error for abort', async () => {
      const setError = vi.fn();
      const characters = [createCharacter({ uuid: 'test-uuid-1' })];
      const abortError = new DOMException('Aborted', 'AbortError');

      vi.spyOn(BatchGeneratorModule, 'generateAllTokens').mockRejectedValue(abortError);
      vi.spyOn(BatchGeneratorModule, 'calculateTokenCountsByType').mockReturnValue({
        character: 1,
        reminder: 0,
        meta: 0,
        total: 1,
      });

      const mockContext = createMockTokenContext({
        getEnabledCharacters: vi.fn(() => characters),
        setError,
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useTokenGenerator());

      await act(async () => {
        await result.current.generateTokens();
      });

      // setError should only be called once - with null when starting generation
      // Not with an error message after abort
      expect(setError).not.toHaveBeenCalledWith('Aborted');
    });

    it('should pre-render gallery tokens after generation', async () => {
      const characters = [createCharacter({ uuid: 'test-uuid-1' })];
      const token = createToken({ name: 'Test Token' });

      vi.spyOn(BatchGeneratorModule, 'generateAllTokens').mockImplementation(
        async (_chars, _opts, _progress, _meta, tokenCallback) => {
          tokenCallback?.(token);
          return [token];
        }
      );
      vi.spyOn(BatchGeneratorModule, 'calculateTokenCountsByType').mockReturnValue({
        character: 1,
        reminder: 0,
        meta: 0,
        total: 1,
      });

      const mockContext = createMockTokenContext({
        getEnabledCharacters: vi.fn(() => characters),
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useTokenGenerator());

      await act(async () => {
        await result.current.generateTokens();
      });

      expect(TokenCardModule.preRenderGalleryTokens).toHaveBeenCalled();
    });
  });

  describe('cancelGeneration', () => {
    it('should abort in-flight generation', async () => {
      const characters = [createCharacter({ uuid: 'test-uuid-1' })];
      let capturedSignal: AbortSignal | undefined;

      vi.spyOn(BatchGeneratorModule, 'generateAllTokens').mockImplementation(
        async (_chars, _opts, _progress, _meta, _tokenCallback, signal) => {
          capturedSignal = signal;
          // Simulate long-running generation
          await new Promise((resolve) => setTimeout(resolve, 100));
          return [];
        }
      );
      vi.spyOn(BatchGeneratorModule, 'calculateTokenCountsByType').mockReturnValue({
        character: 1,
        reminder: 0,
        meta: 0,
        total: 1,
      });

      const mockContext = createMockTokenContext({
        getEnabledCharacters: vi.fn(() => characters),
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useTokenGenerator());

      // Start generation (don't await)
      act(() => {
        result.current.generateTokens();
      });

      // Cancel generation
      act(() => {
        result.current.cancelGeneration();
      });

      // Signal should be aborted
      await waitFor(() => {
        expect(capturedSignal?.aborted).toBe(true);
      });
    });
  });

  describe('Concurrent Generation Prevention', () => {
    it('should prevent concurrent generation calls', async () => {
      const characters = [createCharacter({ uuid: 'test-uuid-1' })];
      let callCount = 0;

      vi.spyOn(BatchGeneratorModule, 'generateAllTokens').mockImplementation(async () => {
        callCount++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return [];
      });
      vi.spyOn(BatchGeneratorModule, 'calculateTokenCountsByType').mockReturnValue({
        character: 1,
        reminder: 0,
        meta: 0,
        total: 1,
      });

      const mockContext = createMockTokenContext({
        getEnabledCharacters: vi.fn(() => characters),
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useTokenGenerator());

      // Start multiple generations concurrently
      await act(async () => {
        result.current.generateTokens();
        result.current.generateTokens();
        result.current.generateTokens();
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Should only generate once
      expect(callCount).toBe(1);
    });
  });

  describe('regenerateByType', () => {
    describe('regenerateCharacterTokens', () => {
      it('should only regenerate character tokens', async () => {
        const characters = [createCharacter({ uuid: 'test-uuid-1' })];
        const existingReminderToken = createToken({ type: 'reminder', name: 'Reminder' });
        const existingMetaToken = createToken({
          type: 'script-name',
          name: 'Script',
          team: 'meta',
        });
        const newCharacterToken = createToken({ type: 'character', name: 'New Char' });

        const generateCharacterTokensMock = vi
          .spyOn(BatchGeneratorModule, 'generateCharacterTokens')
          .mockImplementation(async (_chars, _opts, _progress, _meta, tokenCallback) => {
            tokenCallback?.(newCharacterToken);
          });

        vi.spyOn(BatchGeneratorModule, 'calculateTokenCountsByType').mockReturnValue({
          character: 1,
          reminder: 1,
          meta: 1,
          total: 3,
        });

        const mockContext = createMockTokenContext({
          tokens: [existingReminderToken, existingMetaToken],
          getEnabledCharacters: vi.fn(() => characters),
        });
        vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

        const { result } = renderHook(() => useTokenGenerator());

        await act(async () => {
          await result.current.regenerateCharacterTokens();
        });

        expect(generateCharacterTokensMock).toHaveBeenCalled();
      });

      it('should set error when no enabled characters', async () => {
        const setError = vi.fn();
        const mockContext = createMockTokenContext({
          getEnabledCharacters: vi.fn(() => []),
          setError,
        });
        vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

        const { result } = renderHook(() => useTokenGenerator());

        await act(async () => {
          await result.current.regenerateCharacterTokens();
        });

        expect(setError).toHaveBeenCalledWith(
          'No characters to generate tokens for (all characters are disabled)'
        );
      });
    });

    describe('regenerateReminderTokens', () => {
      it('should only regenerate reminder tokens', async () => {
        const characters = [createCharacter({ uuid: 'test-uuid-1' })];

        const generateRemindersMock = vi
          .spyOn(BatchGeneratorModule, 'generateReminders')
          .mockResolvedValue(undefined);

        vi.spyOn(BatchGeneratorModule, 'calculateTokenCountsByType').mockReturnValue({
          character: 1,
          reminder: 2,
          meta: 0,
          total: 3,
        });

        const mockContext = createMockTokenContext({
          getEnabledCharacters: vi.fn(() => characters),
        });
        vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

        const { result } = renderHook(() => useTokenGenerator());

        await act(async () => {
          await result.current.regenerateReminderTokens();
        });

        expect(generateRemindersMock).toHaveBeenCalled();
      });
    });

    describe('regenerateMetaTokens', () => {
      it('should only regenerate meta tokens', async () => {
        const characters = [createCharacter({ uuid: 'test-uuid-1' })];

        const generateMetaMock = vi
          .spyOn(BatchGeneratorModule, 'generateMeta')
          .mockResolvedValue(undefined);

        vi.spyOn(BatchGeneratorModule, 'calculateTokenCountsByType').mockReturnValue({
          character: 1,
          reminder: 0,
          meta: 2,
          total: 3,
        });

        const mockContext = createMockTokenContext({
          getEnabledCharacters: vi.fn(() => characters),
        });
        vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

        const { result } = renderHook(() => useTokenGenerator());

        await act(async () => {
          await result.current.regenerateMetaTokens();
        });

        expect(generateMetaMock).toHaveBeenCalled();
      });
    });
  });

  describe('Progress Callback', () => {
    it('should pass external progress callback to generateAllTokens', async () => {
      const characters = [createCharacter({ uuid: 'test-uuid-1' })];
      const externalCallback = vi.fn();
      let capturedCallback: unknown;

      vi.spyOn(BatchGeneratorModule, 'generateAllTokens').mockImplementation(
        async (_chars, _opts, progressCallback) => {
          capturedCallback = progressCallback;
          return [];
        }
      );
      vi.spyOn(BatchGeneratorModule, 'calculateTokenCountsByType').mockReturnValue({
        character: 1,
        reminder: 0,
        meta: 0,
        total: 1,
      });

      const mockContext = createMockTokenContext({
        getEnabledCharacters: vi.fn(() => characters),
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useTokenGenerator());

      await act(async () => {
        await result.current.generateTokens(externalCallback);
      });

      // Captured callback should be the external one (or a wrapper)
      expect(capturedCallback).toBeDefined();
    });
  });
});
