/**
 * Basic unit tests for useProjectTokens hook
 *
 * Tests cover:
 * - Hook initialization
 * - Active project token handling (uses context tokens)
 * - Display mode behavior (no generation triggered)
 *
 * Note: Split from main test file to avoid memory accumulation in vitest workers
 *
 * @module __tests__/unit/hooks/projects/useProjectTokens.basic.test
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type UseProjectTokensOptions, useProjectTokens } from '@/hooks/projects/useProjectTokens';
import type { Character, Token } from '@/ts/types/index';
import type { Project, ProjectState } from '@/ts/types/project';
import type { GenerationOptions } from '@/ts/types/tokenOptions';

// ============================================================================
// Mocks
// ============================================================================

const mockGenerateAllTokens = vi.fn();
const mockLogger = {
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
};

// ============================================================================
// Test Helpers
// ============================================================================

// Use a minimal mock object instead of real canvas to avoid memory accumulation
const mockCanvas = {} as HTMLCanvasElement;

const createMockToken = (overrides: Partial<Token> = {}): Token => ({
  id: 'token-1',
  filename: 'test-token.png',
  type: 'character',
  characterId: 'clockmaker',
  characterName: 'Clockmaker',
  team: 'townsfolk',
  canvas: mockCanvas,
  ...overrides,
});

const createMockCharacter = (overrides: Partial<Character> = {}): Character => ({
  id: 'clockmaker',
  name: 'Clockmaker',
  team: 'townsfolk',
  ability: 'You start knowing how many steps from the Demon to its nearest Minion.',
  image: 'https://example.com/clockmaker.png',
  ...overrides,
});

const createMockGenerationOptions = (): GenerationOptions => ({
  diameter: 300,
  reminderDiameter: 200,
  dpi: 300,
  enableReminders: true,
  enableScriptNameToken: false,
  enablePandemoniumToken: false,
  enableAlmanacQRToken: false,
  enableBootleggerToken: false,
  teamVariants: [],
});

const createMockProjectState = (overrides: Partial<ProjectState> = {}): ProjectState => ({
  jsonInput: '[]',
  characters: [createMockCharacter()],
  scriptMeta: null,
  characterMetadata: {},
  generationOptions: createMockGenerationOptions(),
  customIcons: [],
  filters: {},
  schemaVersion: 1,
  ...overrides,
});

const createMockProject = (overrides: Partial<Project> = {}): Project =>
  ({
    id: 'project-1',
    name: 'Test Project',
    description: 'A test project',
    createdAt: Date.now(),
    lastModifiedAt: Date.now(),
    lastAccessedAt: Date.now(),
    state: createMockProjectState(),
    thumbnail: { type: 'auto' },
    stats: {
      characterCount: 1,
      tokenCount: 0,
      reminderCount: 0,
      customIconCount: 0,
      presetCount: 0,
    },
    schemaVersion: 1,
    ...overrides,
  }) as Project;

const createMockDeps = () => ({
  generateAllTokens: mockGenerateAllTokens,
  logger: mockLogger,
});

const createDefaultOptions = (
  overrides: Partial<UseProjectTokensOptions> = {}
): UseProjectTokensOptions => ({
  project: null,
  isActiveProject: false,
  displayMode: 'tokens',
  contextTokens: [],
  setContextTokens: vi.fn(),
  deps: createMockDeps(),
  ...overrides,
});

// ============================================================================
// Tests
// ============================================================================

describe('useProjectTokens - Basic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateAllTokens.mockResolvedValue([createMockToken()]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // Hook Initialization
  // --------------------------------------------------------------------------

  describe('Hook Initialization', () => {
    it('should return expected values', () => {
      const { result } = renderHook(() => useProjectTokens(createDefaultOptions()));

      expect(result.current).toHaveProperty('displayTokens');
      expect(result.current).toHaveProperty('isGenerating');
      expect(result.current).toHaveProperty('generationProgress');
    });

    it('should initialize with empty tokens when no project', () => {
      const { result } = renderHook(() => useProjectTokens(createDefaultOptions()));

      expect(result.current.displayTokens).toEqual([]);
      expect(result.current.isGenerating).toBe(false);
      expect(result.current.generationProgress).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // Active Project Behavior (no generation triggered)
  // --------------------------------------------------------------------------

  describe('Active Project Behavior', () => {
    it('should use context tokens for active project', () => {
      const contextTokens = [createMockToken(), createMockToken({ id: 'token-2' })];
      const options = createDefaultOptions({
        project: createMockProject(),
        isActiveProject: true,
        contextTokens,
      });

      const { result } = renderHook(() => useProjectTokens(options));

      expect(result.current.displayTokens).toBe(contextTokens);
    });

    it('should not generate preview tokens for active project', async () => {
      const options = createDefaultOptions({
        project: createMockProject(),
        isActiveProject: true,
        contextTokens: [createMockToken()],
      });

      const { result } = renderHook(() => useProjectTokens(options));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(result.current.isGenerating).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Display Mode Behavior (no generation triggered)
  // --------------------------------------------------------------------------

  describe('Display Mode Behavior', () => {
    it('should not generate tokens when display mode is list', async () => {
      const options = createDefaultOptions({
        project: createMockProject(),
        isActiveProject: false,
        displayMode: 'list',
      });

      renderHook(() => useProjectTokens(options));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(mockGenerateAllTokens).not.toHaveBeenCalled();
    });

    it('should not generate tokens when display mode is json', async () => {
      const options = createDefaultOptions({
        project: createMockProject(),
        isActiveProject: false,
        displayMode: 'json',
      });

      renderHook(() => useProjectTokens(options));

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(mockGenerateAllTokens).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // Error Handling (with mocked rejection)
  // --------------------------------------------------------------------------

  describe('Error Handling', () => {
    it('should not log error for AbortError', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      mockGenerateAllTokens.mockRejectedValue(abortError);

      const options = createDefaultOptions({
        project: createMockProject(),
        isActiveProject: false,
        displayMode: 'tokens',
      });

      const { result } = renderHook(() => useProjectTokens(options));

      // Wait for the hook to finish processing (generation completes or fails)
      await waitFor(
        () => {
          expect(result.current.isGenerating).toBe(false);
        },
        { timeout: 2000 }
      );

      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });
});
