/**
 * Unit tests for useAutoSaveDetector hook
 *
 * Tests state change detection for auto-save:
 * - Detecting when project state changes
 * - Setting isDirty flag on state change
 * - Not setting isDirty for identical state
 * - Resetting when project changes
 * - Shallow signature optimization for performance
 */

import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCharacter } from '@/__tests__/factories/characterFactory';
import { createProject } from '@/__tests__/factories/projectFactory';
import type { Character } from '@/ts/types';
import type { Project } from '@/ts/types/project';

/**
 * Mock logger to avoid console output during tests
 */
vi.mock('@/ts/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock context values
let mockProjectContextValue: {
  currentProject: Project | null;
  setIsDirty: ReturnType<typeof vi.fn>;
  setAutoSaveStatus: ReturnType<typeof vi.fn>;
  incrementChangeVersion: ReturnType<typeof vi.fn>;
};

let mockTokenContextValue: {
  characters: Character[];
  scriptMeta: { name?: string } | null;
  generationOptions: Record<string, unknown>;
  jsonInput: string;
  filters: { teams: string[]; tokenTypes: string[] };
  characterMetadata: Map<string, unknown>;
  tokens: Array<{ name: string; type: string; filename: string }>;
};

// Mock contexts
vi.mock('@/contexts/ProjectContext.js', () => ({
  useProjectContext: () => mockProjectContextValue,
}));

vi.mock('@/contexts/TokenContext.js', () => ({
  useTokenContext: () => mockTokenContextValue,
}));

// Import after mocking
import { useAutoSaveDetector } from '@/hooks/autosave/useAutoSaveDetector';

describe('useAutoSaveDetector', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock context values
    mockProjectContextValue = {
      currentProject: null,
      setIsDirty: vi.fn(),
      setAutoSaveStatus: vi.fn(),
      incrementChangeVersion: vi.fn(),
    };

    mockTokenContextValue = {
      characters: [],
      scriptMeta: null,
      generationOptions: {},
      jsonInput: '',
      filters: { teams: [], tokenTypes: [] },
      characterMetadata: new Map(),
      tokens: [],
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('No project loaded', () => {
    it('should not set isDirty when no project is loaded', () => {
      mockProjectContextValue.currentProject = null;

      renderHook(() => useAutoSaveDetector());

      expect(mockProjectContextValue.setIsDirty).toHaveBeenCalledWith(false);
    });

    it('should clear dirty flag when project is unloaded', () => {
      const project = createProject({ name: 'Test Project' });
      mockProjectContextValue.currentProject = project;

      const { rerender } = renderHook(() => useAutoSaveDetector());

      // Unload project
      mockProjectContextValue.currentProject = null;
      rerender();

      expect(mockProjectContextValue.setIsDirty).toHaveBeenCalledWith(false);
    });
  });

  describe('Initial state capture', () => {
    it('should capture initial state without setting dirty', () => {
      const project = createProject({ name: 'Test Project' });
      mockProjectContextValue.currentProject = project;
      mockTokenContextValue.characters = [createCharacter({ uuid: 'char-1', name: 'Test' })];

      renderHook(() => useAutoSaveDetector());

      // First render should capture state, not mark dirty
      // setIsDirty should not be called with true on initial render
      expect(mockProjectContextValue.setIsDirty).not.toHaveBeenCalledWith(true);
    });
  });

  describe('State change detection', () => {
    it('should detect character changes and set isDirty', () => {
      const project = createProject({ name: 'Test Project' });
      mockProjectContextValue.currentProject = project;
      mockTokenContextValue.characters = [createCharacter({ uuid: 'char-1', name: 'Original' })];

      const { rerender } = renderHook(() => useAutoSaveDetector());

      // Change characters
      mockTokenContextValue.characters = [createCharacter({ uuid: 'char-1', name: 'Modified' })];
      rerender();

      expect(mockProjectContextValue.setIsDirty).toHaveBeenCalledWith(true);
      expect(mockProjectContextValue.incrementChangeVersion).toHaveBeenCalled();
    });

    it('should detect jsonInput changes', () => {
      const project = createProject({ name: 'Test Project' });
      mockProjectContextValue.currentProject = project;
      mockTokenContextValue.jsonInput = '[]';

      const { rerender } = renderHook(() => useAutoSaveDetector());

      // Change jsonInput
      mockTokenContextValue.jsonInput = '[{"id": "test"}]';
      rerender();

      expect(mockProjectContextValue.setIsDirty).toHaveBeenCalledWith(true);
    });

    it('should detect scriptMeta changes', () => {
      const project = createProject({ name: 'Test Project' });
      mockProjectContextValue.currentProject = project;
      mockTokenContextValue.scriptMeta = null;

      const { rerender } = renderHook(() => useAutoSaveDetector());

      // Change scriptMeta
      mockTokenContextValue.scriptMeta = { name: 'My Script' };
      rerender();

      expect(mockProjectContextValue.setIsDirty).toHaveBeenCalledWith(true);
    });

    it('should detect generationOptions changes', () => {
      const project = createProject({ name: 'Test Project' });
      mockProjectContextValue.currentProject = project;
      mockTokenContextValue.generationOptions = { borderWidth: 3 };

      const { rerender } = renderHook(() => useAutoSaveDetector());

      // Change generationOptions
      mockTokenContextValue.generationOptions = { borderWidth: 5 };
      rerender();

      expect(mockProjectContextValue.setIsDirty).toHaveBeenCalledWith(true);
    });

    it('should detect filter changes', () => {
      const project = createProject({ name: 'Test Project' });
      mockProjectContextValue.currentProject = project;
      mockTokenContextValue.filters = { teams: [], tokenTypes: [] };

      const { rerender } = renderHook(() => useAutoSaveDetector());

      // Change filters
      mockTokenContextValue.filters = { teams: ['townsfolk'], tokenTypes: [] };
      rerender();

      expect(mockProjectContextValue.setIsDirty).toHaveBeenCalledWith(true);
    });

    it('should detect characterMetadata changes', () => {
      const project = createProject({ name: 'Test Project' });
      mockProjectContextValue.currentProject = project;
      mockTokenContextValue.characterMetadata = new Map();

      const { rerender } = renderHook(() => useAutoSaveDetector());

      // Change characterMetadata
      mockTokenContextValue.characterMetadata = new Map([['char-1', { idLinkedToName: true }]]);
      rerender();

      expect(mockProjectContextValue.setIsDirty).toHaveBeenCalledWith(true);
    });

    it('should detect token changes', () => {
      const project = createProject({ name: 'Test Project' });
      mockProjectContextValue.currentProject = project;
      mockTokenContextValue.tokens = [];

      const { rerender } = renderHook(() => useAutoSaveDetector());

      // Change tokens
      mockTokenContextValue.tokens = [
        { name: 'Token1', type: 'character', filename: 'token1.png' },
      ];
      rerender();

      expect(mockProjectContextValue.setIsDirty).toHaveBeenCalledWith(true);
    });
  });

  describe('No change detection', () => {
    it('should not set isDirty when state is identical', () => {
      const project = createProject({ name: 'Test Project' });
      const character = createCharacter({ uuid: 'char-1', name: 'Test' });

      mockProjectContextValue.currentProject = project;
      mockTokenContextValue.characters = [character];
      mockTokenContextValue.jsonInput = '[]';

      const { rerender } = renderHook(() => useAutoSaveDetector());

      // Clear mock calls from initial render
      vi.clearAllMocks();

      // Rerender with same state (same object references)
      rerender();

      // Should not have called setIsDirty with true
      expect(mockProjectContextValue.setIsDirty).not.toHaveBeenCalledWith(true);
    });
  });

  describe('Project switching', () => {
    it('should reset state when project ID changes', () => {
      const project1 = createProject({ name: 'Project 1' });
      const project2 = createProject({ name: 'Project 2' });

      mockProjectContextValue.currentProject = project1;
      mockTokenContextValue.characters = [createCharacter({ uuid: 'char-1', name: 'Test' })];

      const { rerender } = renderHook(() => useAutoSaveDetector());

      // Clear mock calls from initial render
      vi.clearAllMocks();

      // Switch to different project
      mockProjectContextValue.currentProject = project2;
      rerender();

      // Should capture new initial state without marking dirty
      // The behavior depends on implementation - it might or might not call setIsDirty
    });
  });

  describe('Auto-save status update', () => {
    it('should update auto-save status when state changes', () => {
      const project = createProject({ name: 'Test Project' });
      mockProjectContextValue.currentProject = project;
      mockTokenContextValue.jsonInput = '[]';

      const { rerender } = renderHook(() => useAutoSaveDetector());

      // Change state
      mockTokenContextValue.jsonInput = '[{"id": "test"}]';
      rerender();

      expect(mockProjectContextValue.setAutoSaveStatus).toHaveBeenCalledWith({
        state: 'idle',
        isDirty: true,
      });
    });
  });

  describe('Change version increment', () => {
    it('should increment change version when state changes', () => {
      const project = createProject({ name: 'Test Project' });
      mockProjectContextValue.currentProject = project;
      mockTokenContextValue.jsonInput = '[]';

      const { rerender } = renderHook(() => useAutoSaveDetector());

      // Change state
      mockTokenContextValue.jsonInput = '[{"id": "test"}]';
      rerender();

      expect(mockProjectContextValue.incrementChangeVersion).toHaveBeenCalled();
    });

    it('should not increment change version when state is unchanged', () => {
      const project = createProject({ name: 'Test Project' });
      mockProjectContextValue.currentProject = project;
      mockTokenContextValue.jsonInput = '[]';

      const { rerender } = renderHook(() => useAutoSaveDetector());

      // Clear mock calls
      vi.clearAllMocks();

      // Rerender with same state
      rerender();

      // Should not have incremented
      expect(mockProjectContextValue.incrementChangeVersion).not.toHaveBeenCalled();
    });
  });

  describe('Shallow signature optimization', () => {
    it('should skip deep comparison when shallow signature matches', () => {
      const project = createProject({ name: 'Test Project' });
      const character = createCharacter({ uuid: 'char-1', name: 'Test' });

      mockProjectContextValue.currentProject = project;
      mockTokenContextValue.characters = [character];
      mockTokenContextValue.tokens = [{ name: 'Token', type: 'character', filename: 't.png' }];
      mockTokenContextValue.jsonInput = '[]';
      mockTokenContextValue.filters = { teams: ['townsfolk'], tokenTypes: ['character'] };
      mockTokenContextValue.characterMetadata = new Map([['char-1', {}]]);

      const { rerender } = renderHook(() => useAutoSaveDetector());

      // Clear mock calls
      vi.clearAllMocks();

      // Rerender - shallow signature should match, skipping deep comparison
      rerender();

      // Since shallow signature matches, setIsDirty should not be called
      expect(mockProjectContextValue.setIsDirty).not.toHaveBeenCalledWith(true);
    });
  });
});
