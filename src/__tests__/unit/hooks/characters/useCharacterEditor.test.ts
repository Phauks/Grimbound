/**
 * Unit tests for useCharacterEditor hook
 *
 * Tests character editing state management with:
 * - Edited character isolation from source data
 * - Dirty tracking for unsaved changes
 * - Debounced auto-save to JSON and characters array
 * - Flush on unmount to prevent data loss
 * - Sync with selected character changes
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCharacter } from '@/__tests__/factories/characterFactory';
import { useCharacterEditor } from '@/hooks/characters/useCharacterEditor';
import { SAVE_DEBOUNCE_MS } from '@/ts/data/characterUtils';
import type { Character } from '@/ts/types';

/**
 * Mock updateCharacterInJson utility
 */
vi.mock('@/ts/ui/detailViewUtils.js', () => ({
  updateCharacterInJson: vi.fn((json: string, id: string, char: Character) => {
    // Simple mock: return JSON with updated character
    const parsed = JSON.parse(json) as Record<string, unknown>[] | Record<string, unknown>;
    const entries = Array.isArray(parsed) ? parsed : [parsed];
    return JSON.stringify(
      entries.map((e: Record<string, unknown>) => (e.id === id ? { ...e, ...char } : e))
    );
  }),
}));

/**
 * Mock logger to avoid console output during tests
 */
vi.mock('@/ts/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    time: vi.fn((_name: string, _msg: string, fn: () => unknown) => fn()),
    child: vi.fn(() => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}));

/**
 * Mock characterUtils
 */
vi.mock('@/ts/data/characterUtils.js', () => ({
  SAVE_DEBOUNCE_MS: 100,
  isIdLinkedToName: vi.fn(
    (char: Character) => char.id === char.name.toLowerCase().replace(/\s+/g, '-')
  ),
}));

describe('useCharacterEditor', () => {
  let mockSetJsonInput: ReturnType<typeof vi.fn>;
  let mockSetCharacters: ReturnType<typeof vi.fn>;
  let mockSetMetadata: ReturnType<typeof vi.fn>;
  let mockOnCacheInvalidate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Use fake timers for debounce testing
    vi.useFakeTimers();

    // Create mock callbacks
    mockSetJsonInput = vi.fn();
    mockSetCharacters = vi.fn();
    mockSetMetadata = vi.fn();
    mockOnCacheInvalidate = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Initial state', () => {
    it('should return null editedCharacter when no character selected', () => {
      const character = createCharacter({ uuid: 'char-1', name: 'Test' });
      const { result } = renderHook(() =>
        useCharacterEditor({
          selectedCharacterUuid: '',
          characters: [character],
          jsonInput: JSON.stringify([character]),
          setJsonInput: mockSetJsonInput,
          setCharacters: mockSetCharacters,
          setMetadata: mockSetMetadata,
        })
      );

      expect(result.current.editedCharacter).toBeNull();
      expect(result.current.isDirty).toBe(false);
      expect(result.current.originalCharacterUuid).toBe('');
    });

    it('should load character when selectedCharacterUuid matches', () => {
      const character = createCharacter({
        uuid: 'char-1',
        name: 'Test Character',
      });
      const { result } = renderHook(() =>
        useCharacterEditor({
          selectedCharacterUuid: 'char-1',
          characters: [character],
          jsonInput: JSON.stringify([character]),
          setJsonInput: mockSetJsonInput,
          setCharacters: mockSetCharacters,
          setMetadata: mockSetMetadata,
        })
      );

      expect(result.current.editedCharacter).not.toBeNull();
      expect(result.current.editedCharacter?.uuid).toBe('char-1');
      expect(result.current.editedCharacter?.name).toBe('Test Character');
      expect(result.current.isDirty).toBe(false);
      expect(result.current.originalCharacterUuid).toBe('char-1');
    });

    it('should return empty state when characters array is empty', () => {
      const { result } = renderHook(() =>
        useCharacterEditor({
          selectedCharacterUuid: 'char-1',
          characters: [],
          jsonInput: '[]',
          setJsonInput: mockSetJsonInput,
          setCharacters: mockSetCharacters,
          setMetadata: mockSetMetadata,
        })
      );

      expect(result.current.editedCharacter).toBeNull();
      expect(result.current.isDirty).toBe(false);
    });
  });

  describe('handleEditChange', () => {
    it('should update a single field on editedCharacter', () => {
      const character = createCharacter({
        uuid: 'char-1',
        name: 'Original Name',
      });
      const { result } = renderHook(() =>
        useCharacterEditor({
          selectedCharacterUuid: 'char-1',
          characters: [character],
          jsonInput: JSON.stringify([character]),
          setJsonInput: mockSetJsonInput,
          setCharacters: mockSetCharacters,
          setMetadata: mockSetMetadata,
        })
      );

      act(() => {
        result.current.handleEditChange('name', 'Updated Name');
      });

      expect(result.current.editedCharacter?.name).toBe('Updated Name');
    });

    it('should set isDirty to true when field is changed', () => {
      const character = createCharacter({
        uuid: 'char-1',
        ability: 'Original ability',
      });
      const { result } = renderHook(() =>
        useCharacterEditor({
          selectedCharacterUuid: 'char-1',
          characters: [character],
          jsonInput: JSON.stringify([character]),
          setJsonInput: mockSetJsonInput,
          setCharacters: mockSetCharacters,
          setMetadata: mockSetMetadata,
        })
      );

      expect(result.current.isDirty).toBe(false);

      act(() => {
        result.current.handleEditChange('ability', 'Updated ability');
      });

      expect(result.current.isDirty).toBe(true);
    });

    it('should debounce updateCharacter call', async () => {
      const character = createCharacter({
        uuid: 'char-1',
        name: 'Test',
      });
      const { result } = renderHook(() =>
        useCharacterEditor({
          selectedCharacterUuid: 'char-1',
          characters: [character],
          jsonInput: JSON.stringify([character]),
          setJsonInput: mockSetJsonInput,
          setCharacters: mockSetCharacters,
          setMetadata: mockSetMetadata,
        })
      );

      act(() => {
        result.current.handleEditChange('name', 'Name 1');
      });

      // Before debounce time, setJsonInput should not have been called
      expect(mockSetJsonInput).not.toHaveBeenCalled();
      expect(mockSetCharacters).not.toHaveBeenCalled();

      // Advance timers past debounce time
      await act(async () => {
        vi.advanceTimersByTime(SAVE_DEBOUNCE_MS + 10);
      });

      // Now the save should have been triggered
      expect(mockSetJsonInput).toHaveBeenCalled();
      expect(mockSetCharacters).toHaveBeenCalled();
    });

    it('should accumulate multiple rapid changes before debounced save', async () => {
      const character = createCharacter({
        uuid: 'char-1',
        name: 'Test',
        ability: 'Test ability',
      });
      const { result } = renderHook(() =>
        useCharacterEditor({
          selectedCharacterUuid: 'char-1',
          characters: [character],
          jsonInput: JSON.stringify([character]),
          setJsonInput: mockSetJsonInput,
          setCharacters: mockSetCharacters,
          setMetadata: mockSetMetadata,
        })
      );

      // Make multiple rapid changes
      act(() => {
        result.current.handleEditChange('name', 'Name 1');
        result.current.handleEditChange('ability', 'Ability 1');
        result.current.handleEditChange('team', 'demon');
      });

      // Check that changes are accumulated
      expect(result.current.editedCharacter?.name).toBe('Name 1');
      expect(result.current.editedCharacter?.ability).toBe('Ability 1');
      expect(result.current.editedCharacter?.team).toBe('demon');

      // Before debounce, setCharacters should not be called
      expect(mockSetCharacters).not.toHaveBeenCalled();

      // Trigger debounced save
      await act(async () => {
        vi.advanceTimersByTime(SAVE_DEBOUNCE_MS + 10);
      });

      // All changes should be saved in one batch
      expect(mockSetCharacters).toHaveBeenCalledTimes(1);
      const savedCharacters = mockSetCharacters.mock.calls[0][0];
      expect(savedCharacters[0].name).toBe('Name 1');
      expect(savedCharacters[0].ability).toBe('Ability 1');
      expect(savedCharacters[0].team).toBe('demon');
    });

    it('should cancel previous debounce timer when new change arrives', async () => {
      const character = createCharacter({
        uuid: 'char-1',
        name: 'Test',
      });
      const { result } = renderHook(() =>
        useCharacterEditor({
          selectedCharacterUuid: 'char-1',
          characters: [character],
          jsonInput: JSON.stringify([character]),
          setJsonInput: mockSetJsonInput,
          setCharacters: mockSetCharacters,
          setMetadata: mockSetMetadata,
        })
      );

      act(() => {
        result.current.handleEditChange('name', 'Name 1');
      });

      // Advance partially through debounce
      await act(async () => {
        vi.advanceTimersByTime(SAVE_DEBOUNCE_MS / 2);
      });

      // Make another change (should reset timer)
      act(() => {
        result.current.handleEditChange('name', 'Name 2');
      });

      // Advance another half debounce time (total: SAVE_DEBOUNCE_MS but timer was reset)
      await act(async () => {
        vi.advanceTimersByTime(SAVE_DEBOUNCE_MS / 2);
      });

      // Should not have saved yet (timer was reset)
      expect(mockSetCharacters).not.toHaveBeenCalled();

      // Advance to complete the new debounce
      await act(async () => {
        vi.advanceTimersByTime(SAVE_DEBOUNCE_MS / 2 + 10);
      });

      // Now should have saved
      expect(mockSetCharacters).toHaveBeenCalledTimes(1);
      const savedCharacters = mockSetCharacters.mock.calls[0][0];
      expect(savedCharacters[0].name).toBe('Name 2');
    });

    it('should call onCacheInvalidate callback', () => {
      const character = createCharacter({
        uuid: 'char-1',
        name: 'Test',
      });
      const { result } = renderHook(() =>
        useCharacterEditor({
          selectedCharacterUuid: 'char-1',
          characters: [character],
          jsonInput: JSON.stringify([character]),
          setJsonInput: mockSetJsonInput,
          setCharacters: mockSetCharacters,
          setMetadata: mockSetMetadata,
          onCacheInvalidate: mockOnCacheInvalidate,
        })
      );

      act(() => {
        result.current.handleEditChange('name', 'Updated');
      });

      expect(mockOnCacheInvalidate).toHaveBeenCalledWith('char-1');
    });

    it('should not update if editedCharacter is null', () => {
      const character = createCharacter({
        uuid: 'char-1',
        name: 'Test',
      });
      const { result } = renderHook(() =>
        useCharacterEditor({
          selectedCharacterUuid: '',
          characters: [character],
          jsonInput: JSON.stringify([character]),
          setJsonInput: mockSetJsonInput,
          setCharacters: mockSetCharacters,
          setMetadata: mockSetMetadata,
        })
      );

      // editedCharacter is null
      expect(result.current.editedCharacter).toBeNull();

      // Trying to call handleEditChange should not crash
      act(() => {
        result.current.handleEditChange('name', 'New Name');
      });

      expect(result.current.editedCharacter).toBeNull();
    });
  });

  describe('handleReplaceCharacter', () => {
    it('should replace entire edited character', () => {
      const original = createCharacter({
        uuid: 'char-1',
        name: 'Original',
      });
      const replacement = createCharacter({
        uuid: 'char-1',
        name: 'Replacement',
        ability: 'New ability',
      });

      const { result } = renderHook(() =>
        useCharacterEditor({
          selectedCharacterUuid: 'char-1',
          characters: [original],
          jsonInput: JSON.stringify([original]),
          setJsonInput: mockSetJsonInput,
          setCharacters: mockSetCharacters,
          setMetadata: mockSetMetadata,
        })
      );

      act(() => {
        result.current.handleReplaceCharacter(replacement);
      });

      expect(result.current.editedCharacter?.name).toBe('Replacement');
      expect(result.current.editedCharacter?.ability).toBe('New ability');
    });

    it('should set isDirty to true when character is replaced', () => {
      const character = createCharacter({
        uuid: 'char-1',
        name: 'Test',
      });
      const replacement = createCharacter({
        uuid: 'char-1',
        name: 'Different',
      });

      const { result } = renderHook(() =>
        useCharacterEditor({
          selectedCharacterUuid: 'char-1',
          characters: [character],
          jsonInput: JSON.stringify([character]),
          setJsonInput: mockSetJsonInput,
          setCharacters: mockSetCharacters,
          setMetadata: mockSetMetadata,
        })
      );

      expect(result.current.isDirty).toBe(false);

      act(() => {
        result.current.handleReplaceCharacter(replacement);
      });

      expect(result.current.isDirty).toBe(true);
    });

    it('should call onCacheInvalidate with replaced character uuid', () => {
      const character = createCharacter({
        uuid: 'char-1',
        name: 'Test',
      });
      const replacement = createCharacter({
        uuid: 'char-2',
        name: 'Other',
      });

      const { result } = renderHook(() =>
        useCharacterEditor({
          selectedCharacterUuid: 'char-1',
          characters: [character],
          jsonInput: JSON.stringify([character]),
          setJsonInput: mockSetJsonInput,
          setCharacters: mockSetCharacters,
          setMetadata: mockSetMetadata,
          onCacheInvalidate: mockOnCacheInvalidate,
        })
      );

      act(() => {
        result.current.handleReplaceCharacter(replacement);
      });

      expect(mockOnCacheInvalidate).toHaveBeenCalledWith('char-2');
    });
  });

  describe('resetToCharacter', () => {
    it('should set isDirty to false when resetting', () => {
      const character = createCharacter({
        uuid: 'char-1',
        name: 'Test',
      });

      const { result } = renderHook(() =>
        useCharacterEditor({
          selectedCharacterUuid: 'char-1',
          characters: [character],
          jsonInput: JSON.stringify([character]),
          setJsonInput: mockSetJsonInput,
          setCharacters: mockSetCharacters,
          setMetadata: mockSetMetadata,
        })
      );

      // Make a change
      act(() => {
        result.current.handleEditChange('name', 'Changed');
      });
      expect(result.current.isDirty).toBe(true);

      // Reset
      act(() => {
        result.current.resetToCharacter('char-1');
      });

      expect(result.current.isDirty).toBe(false);
      expect(result.current.editedCharacter?.name).toBe('Test');
    });

    it('should handle non-existent character gracefully', () => {
      const character = createCharacter({
        uuid: 'char-1',
        name: 'Test',
      });

      const { result } = renderHook(() =>
        useCharacterEditor({
          selectedCharacterUuid: 'char-1',
          characters: [character],
          jsonInput: JSON.stringify([character]),
          setJsonInput: mockSetJsonInput,
          setCharacters: mockSetCharacters,
          setMetadata: mockSetMetadata,
        })
      );

      const originalEdited = result.current.editedCharacter;

      act(() => {
        result.current.resetToCharacter('non-existent-uuid');
      });

      // Should not change anything
      expect(result.current.editedCharacter).toEqual(originalEdited);
    });
  });

  describe('Character selection changes', () => {
    it('should switch character when selectedCharacterUuid changes', () => {
      const char1 = createCharacter({
        uuid: 'char-1',
        name: 'Character 1',
      });
      const char2 = createCharacter({
        uuid: 'char-2',
        name: 'Character 2',
      });

      const { result, rerender } = renderHook(
        ({ uuid }) =>
          useCharacterEditor({
            selectedCharacterUuid: uuid,
            characters: [char1, char2],
            jsonInput: JSON.stringify([char1, char2]),
            setJsonInput: mockSetJsonInput,
            setCharacters: mockSetCharacters,
            setMetadata: mockSetMetadata,
          }),
        { initialProps: { uuid: 'char-1' } }
      );

      expect(result.current.editedCharacter?.uuid).toBe('char-1');

      // Change selected character
      rerender({ uuid: 'char-2' });

      expect(result.current.editedCharacter?.uuid).toBe('char-2');
      expect(result.current.editedCharacter?.name).toBe('Character 2');
      expect(result.current.isDirty).toBe(false);
    });

    it('should skip reload if we just saved', () => {
      const character = createCharacter({
        uuid: 'char-1',
        name: 'Test',
      });

      const { result } = renderHook(() =>
        useCharacterEditor({
          selectedCharacterUuid: 'char-1',
          characters: [character],
          jsonInput: JSON.stringify([character]),
          setJsonInput: mockSetJsonInput,
          setCharacters: mockSetCharacters,
          setMetadata: mockSetMetadata,
        })
      );

      // Change a field and trigger save
      act(() => {
        result.current.handleEditChange('name', 'Modified');
      });

      // Trigger debounced save
      act(() => {
        vi.advanceTimersByTime(SAVE_DEBOUNCE_MS + 10);
      });

      // After save, editedCharacter should still be set
      expect(result.current.editedCharacter?.name).toBe('Modified');
    });

    it('should not reset editedCharacter immediately after save', () => {
      const character = createCharacter({
        uuid: 'char-1',
        name: 'Test',
      });

      const { result } = renderHook(() =>
        useCharacterEditor({
          selectedCharacterUuid: 'char-1',
          characters: [character],
          jsonInput: JSON.stringify([character]),
          setJsonInput: mockSetJsonInput,
          setCharacters: mockSetCharacters,
          setMetadata: mockSetMetadata,
        })
      );

      act(() => {
        result.current.handleEditChange('name', 'Changed');
      });

      // Trigger save
      act(() => {
        vi.advanceTimersByTime(SAVE_DEBOUNCE_MS + 10);
      });

      // The justSavedRef flag prevents the sync effect from resetting editedCharacter
      expect(result.current.editedCharacter?.name).toBe('Changed');
    });
  });

  describe('Deep cloning', () => {
    it('should deep clone character for isolation from source', () => {
      const character = createCharacter({
        uuid: 'char-1',
        name: 'Original',
        reminders: ['reminder1', 'reminder2'],
      });

      const { result } = renderHook(() =>
        useCharacterEditor({
          selectedCharacterUuid: 'char-1',
          characters: [character],
          jsonInput: JSON.stringify([character]),
          setJsonInput: mockSetJsonInput,
          setCharacters: mockSetCharacters,
          setMetadata: mockSetMetadata,
        })
      );

      // Modify editedCharacter
      act(() => {
        result.current.handleEditChange('name', 'Modified');
      });

      // Original character should not be affected
      expect(character.name).toBe('Original');
      expect(result.current.editedCharacter?.name).toBe('Modified');
    });

    it('should preserve complex nested objects in clone', () => {
      const character = createCharacter({
        uuid: 'char-1',
        name: 'Test',
        reminders: ['reminder1', 'reminder2'],
        jinxes: [{ id: 'other-char', reason: 'test' }],
      });

      const { result } = renderHook(() =>
        useCharacterEditor({
          selectedCharacterUuid: 'char-1',
          characters: [character],
          jsonInput: JSON.stringify([character]),
          setJsonInput: mockSetJsonInput,
          setCharacters: mockSetCharacters,
          setMetadata: mockSetMetadata,
        })
      );

      // Verify that arrays and nested objects are preserved
      expect(result.current.editedCharacter?.reminders).toEqual(['reminder1', 'reminder2']);
      expect(result.current.editedCharacter?.jinxes).toEqual([
        { id: 'other-char', reason: 'test' },
      ]);
    });
  });

  describe('Unmount behavior', () => {
    it('should flush pending save on unmount', async () => {
      const character = createCharacter({
        uuid: 'char-1',
        name: 'Test',
      });

      const { unmount, result } = renderHook(() =>
        useCharacterEditor({
          selectedCharacterUuid: 'char-1',
          characters: [character],
          jsonInput: JSON.stringify([character]),
          setJsonInput: mockSetJsonInput,
          setCharacters: mockSetCharacters,
          setMetadata: mockSetMetadata,
        })
      );

      // Make a change
      act(() => {
        result.current.handleEditChange('name', 'Changed');
      });

      // Before debounce completes, unmount
      expect(mockSetCharacters).not.toHaveBeenCalled();

      unmount();

      // Save should have been flushed
      expect(mockSetCharacters).toHaveBeenCalled();
      const savedCharacters = mockSetCharacters.mock.calls[0][0];
      expect(savedCharacters[0].name).toBe('Changed');
    });

    it('should not flush if there are no pending changes on unmount', () => {
      const character = createCharacter({
        uuid: 'char-1',
        name: 'Test',
      });

      const { unmount } = renderHook(() =>
        useCharacterEditor({
          selectedCharacterUuid: 'char-1',
          characters: [character],
          jsonInput: JSON.stringify([character]),
          setJsonInput: mockSetJsonInput,
          setCharacters: mockSetCharacters,
          setMetadata: mockSetMetadata,
        })
      );

      // No changes made
      unmount();

      // Should not have called setCharacters
      expect(mockSetCharacters).not.toHaveBeenCalled();
    });

    it('should cancel debounce timer on unmount', async () => {
      const character = createCharacter({
        uuid: 'char-1',
        name: 'Test',
      });

      const { unmount, result } = renderHook(() =>
        useCharacterEditor({
          selectedCharacterUuid: 'char-1',
          characters: [character],
          jsonInput: JSON.stringify([character]),
          setJsonInput: mockSetJsonInput,
          setCharacters: mockSetCharacters,
          setMetadata: mockSetMetadata,
        })
      );

      // Make a change
      act(() => {
        result.current.handleEditChange('name', 'Changed');
      });

      // Unmount before debounce
      unmount();

      // Advance timers - should not trigger another save since timer was cancelled
      await act(async () => {
        vi.advanceTimersByTime(SAVE_DEBOUNCE_MS + 10);
      });

      // Should only have called once (from unmount flush)
      expect(mockSetCharacters).toHaveBeenCalledTimes(1);
    });
  });

  describe('Save operation', () => {
    it('should update JSON input during save', async () => {
      const character = createCharacter({
        uuid: 'char-1',
        id: 'test-char',
        name: 'Test',
      });

      const { result } = renderHook(() =>
        useCharacterEditor({
          selectedCharacterUuid: 'char-1',
          characters: [character],
          jsonInput: JSON.stringify([character]),
          setJsonInput: mockSetJsonInput,
          setCharacters: mockSetCharacters,
          setMetadata: mockSetMetadata,
        })
      );

      act(() => {
        result.current.handleEditChange('name', 'Updated');
      });

      // Trigger save
      await act(async () => {
        vi.advanceTimersByTime(SAVE_DEBOUNCE_MS + 10);
      });

      expect(mockSetJsonInput).toHaveBeenCalled();
    });

    it('should update characters array during save', async () => {
      const char1 = createCharacter({
        uuid: 'char-1',
        id: 'char-1',
        name: 'Character 1',
      });
      const char2 = createCharacter({
        uuid: 'char-2',
        id: 'char-2',
        name: 'Character 2',
      });

      const { result } = renderHook(() =>
        useCharacterEditor({
          selectedCharacterUuid: 'char-1',
          characters: [char1, char2],
          jsonInput: JSON.stringify([char1, char2]),
          setJsonInput: mockSetJsonInput,
          setCharacters: mockSetCharacters,
          setMetadata: mockSetMetadata,
        })
      );

      act(() => {
        result.current.handleEditChange('name', 'Updated');
      });

      // Trigger save
      await act(async () => {
        vi.advanceTimersByTime(SAVE_DEBOUNCE_MS + 10);
      });

      expect(mockSetCharacters).toHaveBeenCalled();
      const savedChars = mockSetCharacters.mock.calls[0][0];
      expect(savedChars).toHaveLength(2);
      expect(savedChars[0].uuid).toBe('char-1');
      expect(savedChars[0].name).toBe('Updated');
      expect(savedChars[1].name).toBe('Character 2');
    });

    it('should set metadata during save', async () => {
      const character = createCharacter({
        uuid: 'char-1',
        id: 'test-char',
        name: 'Test',
      });

      const { result } = renderHook(() =>
        useCharacterEditor({
          selectedCharacterUuid: 'char-1',
          characters: [character],
          jsonInput: JSON.stringify([character]),
          setJsonInput: mockSetJsonInput,
          setCharacters: mockSetCharacters,
          setMetadata: mockSetMetadata,
        })
      );

      act(() => {
        result.current.handleEditChange('name', 'Updated');
      });

      // Trigger save
      await act(async () => {
        vi.advanceTimersByTime(SAVE_DEBOUNCE_MS + 10);
      });

      expect(mockSetMetadata).toHaveBeenCalledWith(
        'char-1',
        expect.objectContaining({
          idLinkedToName: expect.any(Boolean),
        })
      );
    });

    it('should set isDirty to false after save completes', async () => {
      const character = createCharacter({
        uuid: 'char-1',
        name: 'Test',
      });

      const { result } = renderHook(() =>
        useCharacterEditor({
          selectedCharacterUuid: 'char-1',
          characters: [character],
          jsonInput: JSON.stringify([character]),
          setJsonInput: mockSetJsonInput,
          setCharacters: mockSetCharacters,
          setMetadata: mockSetMetadata,
        })
      );

      act(() => {
        result.current.handleEditChange('name', 'Updated');
      });

      expect(result.current.isDirty).toBe(true);

      // Trigger save
      await act(async () => {
        vi.advanceTimersByTime(SAVE_DEBOUNCE_MS + 10);
      });

      expect(result.current.isDirty).toBe(false);
    });

    it('should handle errors during save gracefully', async () => {
      const character = createCharacter({
        uuid: 'char-1',
        name: 'Test',
      });

      // Make setJsonInput throw an error
      mockSetJsonInput.mockImplementation(() => {
        throw new Error('Save failed');
      });

      const { result } = renderHook(() =>
        useCharacterEditor({
          selectedCharacterUuid: 'char-1',
          characters: [character],
          jsonInput: JSON.stringify([character]),
          setJsonInput: mockSetJsonInput,
          setCharacters: mockSetCharacters,
          setMetadata: mockSetMetadata,
        })
      );

      act(() => {
        result.current.handleEditChange('name', 'Updated');
      });

      // Trigger save - should not throw
      await act(async () => {
        vi.advanceTimersByTime(SAVE_DEBOUNCE_MS + 10);
      });

      // Should still be dirty since save failed
      expect(result.current.isDirty).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle character without uuid gracefully', () => {
      const character = createCharacter({
        uuid: undefined,
        name: 'Test',
      });

      const { result } = renderHook(() =>
        useCharacterEditor({
          selectedCharacterUuid: '',
          characters: [character],
          jsonInput: JSON.stringify([character]),
          setJsonInput: mockSetJsonInput,
          setCharacters: mockSetCharacters,
          setMetadata: mockSetMetadata,
        })
      );

      expect(result.current.editedCharacter).toBeNull();
    });

    it('should handle empty characters array gracefully', () => {
      const { result } = renderHook(() =>
        useCharacterEditor({
          selectedCharacterUuid: 'char-1',
          characters: [],
          jsonInput: '[]',
          setJsonInput: mockSetJsonInput,
          setCharacters: mockSetCharacters,
          setMetadata: mockSetMetadata,
        })
      );

      expect(result.current.editedCharacter).toBeNull();
      expect(result.current.isDirty).toBe(false);
    });

    it('should handle very rapid selection changes', () => {
      const char1 = createCharacter({
        uuid: 'char-1',
        name: 'Character 1',
      });
      const char2 = createCharacter({
        uuid: 'char-2',
        name: 'Character 2',
      });
      const char3 = createCharacter({
        uuid: 'char-3',
        name: 'Character 3',
      });

      const { result, rerender } = renderHook(
        ({ uuid }) =>
          useCharacterEditor({
            selectedCharacterUuid: uuid,
            characters: [char1, char2, char3],
            jsonInput: JSON.stringify([char1, char2, char3]),
            setJsonInput: mockSetJsonInput,
            setCharacters: mockSetCharacters,
            setMetadata: mockSetMetadata,
          }),
        { initialProps: { uuid: 'char-1' } }
      );

      // Rapid selection changes
      rerender({ uuid: 'char-2' });
      rerender({ uuid: 'char-3' });
      rerender({ uuid: 'char-1' });

      expect(result.current.editedCharacter?.uuid).toBe('char-1');
    });

    it('should preserve field values with special types', () => {
      const character = createCharacter({
        uuid: 'char-1',
        setup: true,
        firstNight: 5,
        otherNight: 10,
        reminders: ['rem1', 'rem2'],
      });

      const { result } = renderHook(() =>
        useCharacterEditor({
          selectedCharacterUuid: 'char-1',
          characters: [character],
          jsonInput: JSON.stringify([character]),
          setJsonInput: mockSetJsonInput,
          setCharacters: mockSetCharacters,
          setMetadata: mockSetMetadata,
        })
      );

      expect(result.current.editedCharacter?.setup).toBe(true);
      expect(result.current.editedCharacter?.firstNight).toBe(5);
      expect(result.current.editedCharacter?.otherNight).toBe(10);
      expect(result.current.editedCharacter?.reminders).toEqual(['rem1', 'rem2']);
    });

    it('should handle undefined optional callback', () => {
      const character = createCharacter({
        uuid: 'char-1',
        name: 'Test',
      });

      const { result } = renderHook(() =>
        useCharacterEditor({
          selectedCharacterUuid: 'char-1',
          characters: [character],
          jsonInput: JSON.stringify([character]),
          setJsonInput: mockSetJsonInput,
          setCharacters: mockSetCharacters,
          setMetadata: mockSetMetadata,
          // onCacheInvalidate is undefined
        })
      );

      // Should not throw
      act(() => {
        result.current.handleEditChange('name', 'Updated');
      });

      expect(result.current.editedCharacter?.name).toBe('Updated');
    });
  });
});
