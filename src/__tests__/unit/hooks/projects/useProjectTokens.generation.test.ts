/**
 * Generation unit tests for useProjectTokens hook
 *
 * Tests cover core generation behavior. Kept minimal to avoid
 * memory issues with Node 25 + vitest + jsdom environment.
 *
 * @module __tests__/unit/hooks/projects/useProjectTokens.generation.test
 */

import { renderHook, waitFor } from '@testing-library/react';
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
// Tests - Kept minimal for environment stability
// ============================================================================

describe('useProjectTokens - Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateAllTokens.mockResolvedValue([createMockToken()]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate preview tokens for non-active project', async () => {
    const options = createDefaultOptions({
      project: createMockProject(),
      isActiveProject: false,
      displayMode: 'tokens',
    });

    const { result } = renderHook(() => useProjectTokens(options));

    await waitFor(
      () => {
        expect(mockGenerateAllTokens).toHaveBeenCalled();
      },
      { timeout: 2000 }
    );

    await waitFor(() => {
      expect(result.current.displayTokens).toHaveLength(1);
    });
  });

  it('should pass correct parameters to generateAllTokens', async () => {
    const project = createMockProject();
    const options = createDefaultOptions({
      project,
      isActiveProject: false,
      displayMode: 'tokens',
    });

    renderHook(() => useProjectTokens(options));

    await waitFor(
      () => {
        expect(mockGenerateAllTokens).toHaveBeenCalled();
      },
      { timeout: 2000 }
    );

    expect(mockGenerateAllTokens).toHaveBeenCalledWith(
      project.state.characters,
      project.state.generationOptions,
      null,
      project.state.scriptMeta,
      null,
      expect.any(Object),
      undefined,
      expect.any(Function)
    );
  });
});
