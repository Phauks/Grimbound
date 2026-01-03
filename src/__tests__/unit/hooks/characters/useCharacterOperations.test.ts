/**
 * Unit tests for useCharacterOperations hook
 *
 * Tests cover:
 * - Hook returns expected functions
 * - Orchestration of sub-hooks (useCharacterCRUD, useCharacterMetadata)
 * - Add/delete/duplicate character operations
 * - Team change operations
 */

import { createCharacter } from '@test/factories';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as UseCharacterCRUDModule from '@/hooks/characters/useCharacterCRUD';
import * as UseCharacterMetadataModule from '@/hooks/characters/useCharacterMetadata';
import { useCharacterOperations } from '@/hooks/characters/useCharacterOperations';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@/hooks/characters/useCharacterCRUD');
vi.mock('@/hooks/characters/useCharacterMetadata');

// ============================================================================
// Test Helpers
// ============================================================================

const createMockCRUDResult = (overrides = {}) => ({
  handleAddCharacter: vi.fn().mockResolvedValue(undefined),
  handleDeleteCharacter: vi.fn(),
  handleDuplicateCharacter: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const createMockMetadataResult = (overrides = {}) => ({
  handleChangeTeam: vi.fn(),
  ...overrides,
});

const createDefaultOptions = (overrides = {}) => ({
  characters: [],
  tokens: [],
  jsonInput: '[]',
  generationOptions: {
    diameter: 300,
    reminderDiameter: 200,
    dpi: 300,
    enableReminders: true,
    enableScriptNameToken: false,
    enablePandemoniumToken: false,
    enableAlmanacQRToken: false,
    enableBootleggerToken: false,
    teamVariants: [],
  },
  setCharacters: vi.fn(),
  setTokens: vi.fn(),
  setJsonInput: vi.fn(),
  setMetadata: vi.fn(),
  deleteMetadata: vi.fn(),
  getMetadata: vi.fn(),
  addToast: vi.fn(),
  selectedCharacterUuid: '',
  setSelectedCharacterUuid: vi.fn(),
  setEditedCharacter: vi.fn(),
  ...overrides,
});

// ============================================================================
// Tests
// ============================================================================

describe('useCharacterOperations', () => {
  let mockCRUDResult: ReturnType<typeof createMockCRUDResult>;
  let mockMetadataResult: ReturnType<typeof createMockMetadataResult>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock returns
    mockCRUDResult = createMockCRUDResult();
    mockMetadataResult = createMockMetadataResult();

    vi.spyOn(UseCharacterCRUDModule, 'useCharacterCRUD').mockReturnValue(mockCRUDResult);
    vi.spyOn(UseCharacterMetadataModule, 'useCharacterMetadata').mockReturnValue(
      mockMetadataResult
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // Hook Initialization
  // --------------------------------------------------------------------------

  describe('Hook Initialization', () => {
    it('should return expected functions', () => {
      const { result } = renderHook(() => useCharacterOperations(createDefaultOptions()));

      expect(result.current).toHaveProperty('handleAddCharacter');
      expect(result.current).toHaveProperty('handleDeleteCharacter');
      expect(result.current).toHaveProperty('handleDuplicateCharacter');
      expect(result.current).toHaveProperty('handleChangeTeam');
      expect(typeof result.current.handleAddCharacter).toBe('function');
      expect(typeof result.current.handleDeleteCharacter).toBe('function');
      expect(typeof result.current.handleDuplicateCharacter).toBe('function');
      expect(typeof result.current.handleChangeTeam).toBe('function');
    });

    it('should call useCharacterCRUD with correct options', () => {
      const options = createDefaultOptions({
        characters: [createCharacter()],
        jsonInput: '[{"id": "test"}]',
      });

      renderHook(() => useCharacterOperations(options));

      expect(UseCharacterCRUDModule.useCharacterCRUD).toHaveBeenCalledWith(
        expect.objectContaining({
          characters: options.characters,
          tokens: options.tokens,
          jsonInput: options.jsonInput,
          generationOptions: options.generationOptions,
          setCharacters: options.setCharacters,
          setTokens: options.setTokens,
          setJsonInput: options.setJsonInput,
          setMetadata: options.setMetadata,
          deleteMetadata: options.deleteMetadata,
          getMetadata: options.getMetadata,
          addToast: options.addToast,
          selectedCharacterUuid: options.selectedCharacterUuid,
          setSelectedCharacterUuid: options.setSelectedCharacterUuid,
          setEditedCharacter: options.setEditedCharacter,
        })
      );
    });

    it('should call useCharacterMetadata with correct options', () => {
      const options = createDefaultOptions({
        characters: [createCharacter()],
        jsonInput: '[{"id": "test"}]',
      });

      renderHook(() => useCharacterOperations(options));

      expect(UseCharacterMetadataModule.useCharacterMetadata).toHaveBeenCalledWith(
        expect.objectContaining({
          characters: options.characters,
          tokens: options.tokens,
          jsonInput: options.jsonInput,
          generationOptions: options.generationOptions,
          setCharacters: options.setCharacters,
          setTokens: options.setTokens,
          setJsonInput: options.setJsonInput,
          selectedCharacterUuid: options.selectedCharacterUuid,
          setEditedCharacter: options.setEditedCharacter,
          addToast: options.addToast,
        })
      );
    });
  });

  // --------------------------------------------------------------------------
  // handleAddCharacter
  // --------------------------------------------------------------------------

  describe('handleAddCharacter', () => {
    it('should delegate to useCharacterCRUD.handleAddCharacter', async () => {
      const { result } = renderHook(() => useCharacterOperations(createDefaultOptions()));

      await act(async () => {
        await result.current.handleAddCharacter();
      });

      expect(mockCRUDResult.handleAddCharacter).toHaveBeenCalled();
    });

    it('should return promise from CRUD hook', async () => {
      mockCRUDResult.handleAddCharacter.mockResolvedValue(undefined);

      const { result } = renderHook(() => useCharacterOperations(createDefaultOptions()));

      const promise = result.current.handleAddCharacter();
      expect(promise).toBeInstanceOf(Promise);
      await promise;
    });
  });

  // --------------------------------------------------------------------------
  // handleDeleteCharacter
  // --------------------------------------------------------------------------

  describe('handleDeleteCharacter', () => {
    it('should delegate to useCharacterCRUD.handleDeleteCharacter', () => {
      const { result } = renderHook(() => useCharacterOperations(createDefaultOptions()));

      act(() => {
        result.current.handleDeleteCharacter('test-id');
      });

      expect(mockCRUDResult.handleDeleteCharacter).toHaveBeenCalledWith('test-id');
    });

    it('should work when no characterId provided', () => {
      const { result } = renderHook(() => useCharacterOperations(createDefaultOptions()));

      act(() => {
        result.current.handleDeleteCharacter();
      });

      // Called with no arguments (optional characterId)
      expect(mockCRUDResult.handleDeleteCharacter).toHaveBeenCalled();
      expect(mockCRUDResult.handleDeleteCharacter).toHaveBeenCalledTimes(1);
    });
  });

  // --------------------------------------------------------------------------
  // handleDuplicateCharacter
  // --------------------------------------------------------------------------

  describe('handleDuplicateCharacter', () => {
    it('should delegate to useCharacterCRUD.handleDuplicateCharacter', async () => {
      const { result } = renderHook(() => useCharacterOperations(createDefaultOptions()));

      await act(async () => {
        await result.current.handleDuplicateCharacter('test-id');
      });

      expect(mockCRUDResult.handleDuplicateCharacter).toHaveBeenCalledWith('test-id');
    });

    it('should return promise from CRUD hook', async () => {
      mockCRUDResult.handleDuplicateCharacter.mockResolvedValue(undefined);

      const { result } = renderHook(() => useCharacterOperations(createDefaultOptions()));

      const promise = result.current.handleDuplicateCharacter('test-id');
      expect(promise).toBeInstanceOf(Promise);
      await promise;
    });
  });

  // --------------------------------------------------------------------------
  // handleChangeTeam
  // --------------------------------------------------------------------------

  describe('handleChangeTeam', () => {
    it('should delegate to useCharacterMetadata.handleChangeTeam', () => {
      const { result } = renderHook(() => useCharacterOperations(createDefaultOptions()));

      act(() => {
        result.current.handleChangeTeam('test-id', 'demon');
      });

      expect(mockMetadataResult.handleChangeTeam).toHaveBeenCalledWith('test-id', 'demon');
    });

    it('should pass all team types correctly', () => {
      const { result } = renderHook(() => useCharacterOperations(createDefaultOptions()));

      const teams = ['townsfolk', 'outsider', 'minion', 'demon', 'traveller', 'fabled'] as const;

      teams.forEach((team) => {
        act(() => {
          result.current.handleChangeTeam(`char-${team}`, team);
        });
        expect(mockMetadataResult.handleChangeTeam).toHaveBeenLastCalledWith(`char-${team}`, team);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Optional Callbacks
  // --------------------------------------------------------------------------

  describe('Optional Callbacks', () => {
    it('should pass onCharacterCreated callback to CRUD hook', () => {
      const onCharacterCreated = vi.fn();
      const options = createDefaultOptions({ onCharacterCreated });

      renderHook(() => useCharacterOperations(options));

      expect(UseCharacterCRUDModule.useCharacterCRUD).toHaveBeenCalledWith(
        expect.objectContaining({
          onCharacterCreated,
        })
      );
    });

    it('should pass createNewCharacter flag to CRUD hook', () => {
      const options = createDefaultOptions({ createNewCharacter: true });

      renderHook(() => useCharacterOperations(options));

      expect(UseCharacterCRUDModule.useCharacterCRUD).toHaveBeenCalledWith(
        expect.objectContaining({
          createNewCharacter: true,
        })
      );
    });
  });

  // --------------------------------------------------------------------------
  // Options Updates
  // --------------------------------------------------------------------------

  describe('Options Updates', () => {
    it('should re-call sub-hooks when options change', () => {
      const options = createDefaultOptions();
      const { rerender } = renderHook((props) => useCharacterOperations(props), {
        initialProps: options,
      });

      // Initial calls
      expect(UseCharacterCRUDModule.useCharacterCRUD).toHaveBeenCalledTimes(1);
      expect(UseCharacterMetadataModule.useCharacterMetadata).toHaveBeenCalledTimes(1);

      // Update with new characters
      const newCharacters = [createCharacter({ name: 'New Char' })];
      rerender({ ...options, characters: newCharacters });

      // Sub-hooks should be called again with new options
      expect(UseCharacterCRUDModule.useCharacterCRUD).toHaveBeenCalledTimes(2);
      expect(UseCharacterMetadataModule.useCharacterMetadata).toHaveBeenCalledTimes(2);
    });
  });
});
