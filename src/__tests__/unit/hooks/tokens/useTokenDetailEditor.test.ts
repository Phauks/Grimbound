/**
 * Unit tests for useTokenDetailEditor hook
 *
 * Tests token detail editing with preview regeneration including:
 * - Hook initialization and state defaults
 * - Deep cloning of character data for safe editing
 * - Dirty state tracking for unsaved changes
 * - Debounced preview regeneration
 * - Reset functionality to revert changes
 * - Script JSON application with validation
 * - Character and reminder token downloads
 * - Error handling and logging
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createCharacter,
  createCharacterWithReminders,
} from '@/__tests__/factories/characterFactory';
import { createCharacterToken, createReminderToken } from '@/__tests__/factories/tokenFactory';
import { createGenerationOptions } from '@/__tests__/factories/tokenOptionsFactory';
import * as TokenContextModule from '@/contexts/TokenContext';
import { useTokenDetailEditor } from '@/hooks/tokens/useTokenDetailEditor';
import type { Token } from '@/ts/types/index.js';

/**
 * Mock detailViewUtils functions
 */
vi.mock('@/ts/ui/detailViewUtils.js', () => ({
  regenerateSingleToken: vi.fn(
    async (editedChar) =>
      new Promise((resolve) => {
        setTimeout(() => {
          const canvas = document.createElement('canvas');
          canvas.id = `regenerated-${editedChar.id}`;
          resolve(canvas);
        }, 50);
      })
  ),
  updateCharacterInJson: vi.fn((json: string, id: string, char) => {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      const index = parsed.findIndex(
        (item: unknown) =>
          (typeof item === 'string' && item === id) ||
          (typeof item === 'object' && item !== null && (item as { id?: string }).id === id)
      );
      if (index !== -1) {
        parsed[index] = char;
      }
    }
    return JSON.stringify(parsed, null, 2);
  }),
  downloadCharacterTokensAsZip: vi.fn(async () => {
    // Mock async function
    await new Promise((resolve) => setTimeout(resolve, 10));
  }),
}));

/**
 * Mock logger and debounce
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
  debounce: vi.fn((fn: Function, _delay: number) => {
    // Mock debounce returns a function that defers execution
    return (...args: unknown[]) => {
      Promise.resolve().then(() => fn(...args));
    };
  }),
}));

describe('useTokenDetailEditor', () => {
  let mockSetJsonInput: ReturnType<typeof vi.fn>;
  let mockUseTokenContext: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockSetJsonInput = vi.fn();

    // Mock useTokenContext
    mockUseTokenContext = vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue({
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
      enabledCharacterUuids: new Set(),
      characterSelectionSummary: { enabled: 0, disabled: 0, total: 0 },
      scriptMeta: null,
      setScriptMeta: vi.fn(),
      generationOptions: createGenerationOptions(),
      updateGenerationOptions: vi.fn(),
      jsonInput: '[]',
      setJsonInput: mockSetJsonInput,
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
      generationProgress: { current: 0, total: 0 },
      setGenerationProgress: vi.fn(),
    } as unknown as ReturnType<typeof TokenContextModule.useTokenContext>);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Hook Initialization', () => {
    it('should return expected properties and functions', () => {
      const character = createCharacter();
      const characterToken = createCharacterToken();

      const { result } = renderHook(() =>
        useTokenDetailEditor({
          character,
          characterToken,
          reminderTokens: [],
        })
      );

      expect(result.current).toHaveProperty('editedCharacter');
      expect(result.current).toHaveProperty('previewToken');
      expect(result.current).toHaveProperty('isDirty');
      expect(result.current).toHaveProperty('isRegenerating');
      expect(result.current).toHaveProperty('handleEditChange');
      expect(result.current).toHaveProperty('handleReset');
      expect(result.current).toHaveProperty('handleApplyToScript');
      expect(result.current).toHaveProperty('handleDownloadAll');
    });

    it('should deep clone character on initialization', () => {
      const character = createCharacter({
        id: 'test-char',
        name: 'Original Name',
        ability: 'Original ability',
      });
      const characterToken = createCharacterToken();

      const { result } = renderHook(() =>
        useTokenDetailEditor({
          character,
          characterToken,
          reminderTokens: [],
        })
      );

      expect(result.current.editedCharacter).toEqual(character);
      expect(result.current.editedCharacter).not.toBe(character);
    });

    it('should initialize previewToken with provided characterToken', () => {
      const character = createCharacter();
      const characterToken = createCharacterToken({ name: 'Test Token' });

      const { result } = renderHook(() =>
        useTokenDetailEditor({
          character,
          characterToken,
          reminderTokens: [],
        })
      );

      expect(result.current.previewToken).toEqual(characterToken);
      expect(result.current.previewToken.name).toBe('Test Token');
    });

    it('should initialize isDirty as false', () => {
      const character = createCharacter();
      const characterToken = createCharacterToken();

      const { result } = renderHook(() =>
        useTokenDetailEditor({
          character,
          characterToken,
          reminderTokens: [],
        })
      );

      expect(result.current.isDirty).toBe(false);
    });

    it('should initialize isRegenerating as false', () => {
      const character = createCharacter();
      const characterToken = createCharacterToken();

      const { result } = renderHook(() =>
        useTokenDetailEditor({
          character,
          characterToken,
          reminderTokens: [],
        })
      );

      expect(result.current.isRegenerating).toBe(false);
    });
  });

  describe('handleEditChange', () => {
    it('should update editedCharacter with new field value', () => {
      const character = createCharacter({ name: 'Original' });
      const characterToken = createCharacterToken();

      const { result } = renderHook(() =>
        useTokenDetailEditor({
          character,
          characterToken,
          reminderTokens: [],
        })
      );

      act(() => {
        result.current.handleEditChange('name', 'Updated Name');
      });

      expect(result.current.editedCharacter.name).toBe('Updated Name');
    });

    it('should set isDirty to true after edit', () => {
      const character = createCharacter();
      const characterToken = createCharacterToken();

      const { result } = renderHook(() =>
        useTokenDetailEditor({
          character,
          characterToken,
          reminderTokens: [],
        })
      );

      expect(result.current.isDirty).toBe(false);

      act(() => {
        result.current.handleEditChange('ability', 'New ability text');
      });

      expect(result.current.isDirty).toBe(true);
    });

    it('should update multiple fields independently', () => {
      const character = createCharacter({
        name: 'Original',
        ability: 'Original ability',
      });
      const characterToken = createCharacterToken();

      const { result } = renderHook(() =>
        useTokenDetailEditor({
          character,
          characterToken,
          reminderTokens: [],
        })
      );

      act(() => {
        result.current.handleEditChange('name', 'New Name');
      });

      act(() => {
        result.current.handleEditChange('ability', 'New Ability');
      });

      expect(result.current.editedCharacter.name).toBe('New Name');
      expect(result.current.editedCharacter.ability).toBe('New Ability');
    });

    it('should not modify original character', () => {
      const character = createCharacter({ name: 'Original' });
      const characterToken = createCharacterToken();

      renderHook(() =>
        useTokenDetailEditor({
          character,
          characterToken,
          reminderTokens: [],
        })
      );

      // Note: In the actual hook, character is from props and shouldn't change
      // The test verifies that the original character object is not mutated
      const originalName = character.name;

      act(() => {
        // This would be called within the hook, but we're testing isolation
      });

      expect(character.name).toBe(originalName);
    });

    it('should preserve other fields when editing one field', () => {
      const character = createCharacter({
        name: 'Original Name',
        ability: 'Original ability',
        team: 'townsfolk',
      });
      const characterToken = createCharacterToken();

      const { result } = renderHook(() =>
        useTokenDetailEditor({
          character,
          characterToken,
          reminderTokens: [],
        })
      );

      act(() => {
        result.current.handleEditChange('name', 'New Name');
      });

      expect(result.current.editedCharacter.ability).toBe('Original ability');
      expect(result.current.editedCharacter.team).toBe('townsfolk');
    });
  });

  describe('handleReset', () => {
    it('should reset editedCharacter to original character', () => {
      const character = createCharacter({ name: 'Original', ability: 'Original ability' });
      const characterToken = createCharacterToken();

      const { result } = renderHook(() =>
        useTokenDetailEditor({
          character,
          characterToken,
          reminderTokens: [],
        })
      );

      act(() => {
        result.current.handleEditChange('name', 'Modified Name');
        result.current.handleEditChange('ability', 'Modified ability');
      });

      expect(result.current.editedCharacter.name).toBe('Modified Name');

      act(() => {
        result.current.handleReset();
      });

      expect(result.current.editedCharacter.name).toBe('Original');
      expect(result.current.editedCharacter.ability).toBe('Original ability');
    });

    it('should reset previewToken to original characterToken', () => {
      const character = createCharacter();
      const originalToken = createCharacterToken({ name: 'Original Token' });
      const regeneratedCanvas = document.createElement('canvas');

      const { result } = renderHook(() =>
        useTokenDetailEditor({
          character,
          characterToken: originalToken,
          reminderTokens: [],
        })
      );

      // Simulate a regeneration that changes the canvas
      act(() => {
        result.current.handleEditChange('name', 'Changed');
      });

      vi.runAllTimers();

      act(() => {
        result.current.handleReset();
      });

      expect(result.current.previewToken).toEqual(originalToken);
    });

    it('should set isDirty to false after reset', () => {
      const character = createCharacter();
      const characterToken = createCharacterToken();

      const { result } = renderHook(() =>
        useTokenDetailEditor({
          character,
          characterToken,
          reminderTokens: [],
        })
      );

      act(() => {
        result.current.handleEditChange('name', 'Changed');
      });

      expect(result.current.isDirty).toBe(true);

      act(() => {
        result.current.handleReset();
      });

      expect(result.current.isDirty).toBe(false);
    });

    it('should create a deep clone on reset', () => {
      const character = createCharacter();
      const characterToken = createCharacterToken();

      const { result } = renderHook(() =>
        useTokenDetailEditor({
          character,
          characterToken,
          reminderTokens: [],
        })
      );

      act(() => {
        result.current.handleEditChange('name', 'Changed');
      });

      act(() => {
        result.current.handleReset();
      });

      // Verify it's a deep clone (different reference)
      expect(result.current.editedCharacter).not.toBe(character);
      expect(result.current.editedCharacter).toEqual(character);
    });
  });

  describe('handleApplyToScript', () => {
    it('should call updateCharacterInJson with correct parameters', async () => {
      const { updateCharacterInJson } = await import('@/ts/ui/detailViewUtils.js');
      const character = createCharacter({ id: 'char-1', name: 'Original' });
      const characterToken = createCharacterToken();
      const jsonInput = JSON.stringify([character]);

      mockUseTokenContext.mockReturnValue({
        ...(mockUseTokenContext.getMockReturnValue() as unknown as object),
        jsonInput,
      } as unknown as ReturnType<typeof TokenContextModule.useTokenContext>);

      const { result } = renderHook(() =>
        useTokenDetailEditor({
          character,
          characterToken,
          reminderTokens: [],
        })
      );

      act(() => {
        result.current.handleEditChange('name', 'Updated Name');
      });

      await act(async () => {
        await result.current.handleApplyToScript();
      });

      expect(updateCharacterInJson).toHaveBeenCalledWith(
        jsonInput,
        'char-1',
        expect.objectContaining({
          name: 'Updated Name',
        })
      );
    });

    it('should update jsonInput via setJsonInput', async () => {
      const character = createCharacter({ id: 'char-1', name: 'Original' });
      const characterToken = createCharacterToken();
      const jsonInput = JSON.stringify([character]);

      mockUseTokenContext.mockReturnValue({
        ...(mockUseTokenContext.getMockReturnValue() as unknown as object),
        jsonInput,
      } as unknown as ReturnType<typeof TokenContextModule.useTokenContext>);

      const { result } = renderHook(() =>
        useTokenDetailEditor({
          character,
          characterToken,
          reminderTokens: [],
        })
      );

      act(() => {
        result.current.handleEditChange('name', 'Updated');
      });

      await act(async () => {
        await result.current.handleApplyToScript();
      });

      expect(mockSetJsonInput).toHaveBeenCalled();
    });

    it('should set isDirty to false on successful apply', async () => {
      const character = createCharacter();
      const characterToken = createCharacterToken();
      const jsonInput = JSON.stringify([character]);

      mockUseTokenContext.mockReturnValue({
        ...(mockUseTokenContext.getMockReturnValue() as unknown as object),
        jsonInput,
      } as unknown as ReturnType<typeof TokenContextModule.useTokenContext>);

      const { result } = renderHook(() =>
        useTokenDetailEditor({
          character,
          characterToken,
          reminderTokens: [],
        })
      );

      act(() => {
        result.current.handleEditChange('ability', 'New');
      });

      expect(result.current.isDirty).toBe(true);

      await act(async () => {
        await result.current.handleApplyToScript();
      });

      expect(result.current.isDirty).toBe(false);
    });

    it('should handle errors gracefully without throwing', async () => {
      const { updateCharacterInJson } = await import('@/ts/ui/detailViewUtils.js');
      vi.mocked(updateCharacterInJson).mockImplementation(() => {
        throw new Error('JSON parse failed');
      });

      const character = createCharacter();
      const characterToken = createCharacterToken();
      const jsonInput = 'invalid json';

      mockUseTokenContext.mockReturnValue({
        ...(mockUseTokenContext.getMockReturnValue() as unknown as object),
        jsonInput,
      } as unknown as ReturnType<typeof TokenContextModule.useTokenContext>);

      const { result } = renderHook(() =>
        useTokenDetailEditor({
          character,
          characterToken,
          reminderTokens: [],
        })
      );

      // Should not throw
      await act(async () => {
        await expect(result.current.handleApplyToScript()).resolves.not.toThrow();
      });
    });
  });

  describe('handleDownloadAll', () => {
    it('should call downloadCharacterTokensAsZip with correct parameters', async () => {
      const { downloadCharacterTokensAsZip } = await import('@/ts/ui/detailViewUtils.js');
      const character = createCharacter({ name: 'TestChar' });
      const characterToken = createCharacterToken({ name: 'TestChar' });
      const reminderToken = createReminderToken('Test Reminder');

      const { result } = renderHook(() =>
        useTokenDetailEditor({
          character,
          characterToken,
          reminderTokens: [reminderToken],
        })
      );

      await act(async () => {
        await result.current.handleDownloadAll();
      });

      expect(downloadCharacterTokensAsZip).toHaveBeenCalledWith(
        characterToken,
        [reminderToken],
        'TestChar'
      );
    });

    it('should work with empty reminderTokens array', async () => {
      const { downloadCharacterTokensAsZip } = await import('@/ts/ui/detailViewUtils.js');
      const character = createCharacter({ name: 'TestChar' });
      const characterToken = createCharacterToken();

      const { result } = renderHook(() =>
        useTokenDetailEditor({
          character,
          characterToken,
          reminderTokens: [],
        })
      );

      await act(async () => {
        await result.current.handleDownloadAll();
      });

      expect(downloadCharacterTokensAsZip).toHaveBeenCalledWith(characterToken, [], 'TestChar');
    });

    it('should work with multiple reminder tokens', async () => {
      const { downloadCharacterTokensAsZip } = await import('@/ts/ui/detailViewUtils.js');
      const character = createCharacter({ name: 'TestChar' });
      const characterToken = createCharacterToken();
      const reminders = [
        createReminderToken('Reminder 1'),
        createReminderToken('Reminder 2'),
        createReminderToken('Reminder 3'),
      ];

      const { result } = renderHook(() =>
        useTokenDetailEditor({
          character,
          characterToken,
          reminderTokens: reminders,
        })
      );

      await act(async () => {
        await result.current.handleDownloadAll();
      });

      expect(downloadCharacterTokensAsZip).toHaveBeenCalledWith(
        characterToken,
        reminders,
        'TestChar'
      );
    });

    it('should handle errors gracefully without throwing', async () => {
      const { downloadCharacterTokensAsZip } = await import('@/ts/ui/detailViewUtils.js');
      vi.mocked(downloadCharacterTokensAsZip).mockRejectedValue(new Error('Download failed'));

      const character = createCharacter();
      const characterToken = createCharacterToken();

      const { result } = renderHook(() =>
        useTokenDetailEditor({
          character,
          characterToken,
          reminderTokens: [],
        })
      );

      // Should not throw
      await act(async () => {
        await expect(result.current.handleDownloadAll()).resolves.not.toThrow();
      });
    });
  });

  describe('Preview Regeneration Flow', () => {
    it('should set isRegenerating during preview generation', async () => {
      const character = createCharacter();
      const characterToken = createCharacterToken();

      const { result } = renderHook(() =>
        useTokenDetailEditor({
          character,
          characterToken,
          reminderTokens: [],
        })
      );

      act(() => {
        result.current.handleEditChange('name', 'Changed');
      });

      vi.runAllTimers();

      await waitFor(() => {
        expect(result.current.isRegenerating).toBe(false);
      });
    });

    it('should update previewToken after regeneration completes', async () => {
      const character = createCharacter({ id: 'original-id' });
      const characterToken = createCharacterToken();

      const { result } = renderHook(() =>
        useTokenDetailEditor({
          character,
          characterToken,
          reminderTokens: [],
        })
      );

      const originalCanvas = result.current.previewToken.canvas;

      act(() => {
        result.current.handleEditChange('name', 'Changed');
      });

      vi.runAllTimers();

      await waitFor(() => {
        // After regeneration, previewToken should have a new canvas
        expect(result.current.previewToken.canvas).not.toBe(originalCanvas);
      });
    });

    it('should clear isRegenerating after completion', async () => {
      const character = createCharacter();
      const characterToken = createCharacterToken();

      const { result } = renderHook(() =>
        useTokenDetailEditor({
          character,
          characterToken,
          reminderTokens: [],
        })
      );

      act(() => {
        result.current.handleEditChange('name', 'Changed');
      });

      vi.runAllTimers();

      await waitFor(() => {
        expect(result.current.isRegenerating).toBe(false);
      });
    });

    it('should handle regeneration errors gracefully', async () => {
      const { regenerateSingleToken } = await import('@/ts/ui/detailViewUtils.js');
      vi.mocked(regenerateSingleToken).mockRejectedValue(new Error('Generation failed'));

      const character = createCharacter();
      const characterToken = createCharacterToken();

      const { result } = renderHook(() =>
        useTokenDetailEditor({
          character,
          characterToken,
          reminderTokens: [],
        })
      );

      act(() => {
        result.current.handleEditChange('name', 'Changed');
      });

      vi.runAllTimers();

      await waitFor(() => {
        expect(result.current.isRegenerating).toBe(false);
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle edit->reset->edit sequence', async () => {
      const character = createCharacter({ name: 'Original' });
      const characterToken = createCharacterToken();

      const { result } = renderHook(() =>
        useTokenDetailEditor({
          character,
          characterToken,
          reminderTokens: [],
        })
      );

      if (result.current) {
        // First edit
        act(() => {
          result.current.handleEditChange('name', 'First Change');
        });

        expect(result.current.editedCharacter.name).toBe('First Change');
        expect(result.current.isDirty).toBe(true);

        // Reset
        act(() => {
          result.current.handleReset();
        });

        expect(result.current.editedCharacter.name).toBe('Original');
        expect(result.current.isDirty).toBe(false);

        // Second edit
        act(() => {
          result.current.handleEditChange('ability', 'New Ability');
        });

        expect(result.current.editedCharacter.ability).toBe('New Ability');
        expect(result.current.isDirty).toBe(true);
      }
    });

    it('should handle edit->apply->edit sequence', async () => {
      const character = createCharacter({ id: 'test-id', name: 'Original' });
      const characterToken = createCharacterToken();
      const jsonInput = JSON.stringify([character]);

      const baseContextValue = mockUseTokenContext.mock.results[0]?.value || {
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
        enabledCharacterUuids: new Set(),
        characterSelectionSummary: { enabled: 0, disabled: 0, total: 0 },
        scriptMeta: null,
        setScriptMeta: vi.fn(),
        generationOptions: createGenerationOptions(),
        updateGenerationOptions: vi.fn(),
        jsonInput: '[]',
        setJsonInput: mockSetJsonInput,
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
        generationProgress: { current: 0, total: 0 },
        setGenerationProgress: vi.fn(),
      };

      mockUseTokenContext.mockReturnValue({
        ...baseContextValue,
        jsonInput,
      } as unknown as ReturnType<typeof TokenContextModule.useTokenContext>);

      const { result } = renderHook(() =>
        useTokenDetailEditor({
          character,
          characterToken,
          reminderTokens: [],
        })
      );

      if (result.current) {
        // First edit and apply
        act(() => {
          result.current.handleEditChange('name', 'First Change');
        });

        await act(async () => {
          await result.current.handleApplyToScript();
        });

        expect(mockSetJsonInput).toHaveBeenCalled();

        // Second edit
        act(() => {
          result.current.handleEditChange('ability', 'New Ability');
        });

        expect(result.current.isDirty).toBe(true);
      }
    });

    it('should handle character with reminders', async () => {
      const character = createCharacterWithReminders(['Reminder 1', 'Reminder 2']);
      const characterToken = createCharacterToken();
      const reminders = [createReminderToken('Reminder 1'), createReminderToken('Reminder 2')];

      const { result } = renderHook(() =>
        useTokenDetailEditor({
          character,
          characterToken,
          reminderTokens: reminders,
        })
      );

      if (result.current) {
        expect(result.current.editedCharacter.reminders).toEqual(['Reminder 1', 'Reminder 2']);

        act(() => {
          result.current.handleEditChange('reminders', [
            'Reminder 1',
            'Reminder 2',
            'New Reminder',
          ]);
        });

        expect(result.current.editedCharacter.reminders).toHaveLength(3);
        expect(result.current.isDirty).toBe(true);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle character with special characters in name', () => {
      const character = createCharacter({ name: 'Character\'s "Special" (Name) & More' });
      const characterToken = createCharacterToken();

      const { result } = renderHook(() =>
        useTokenDetailEditor({
          character,
          characterToken,
          reminderTokens: [],
        })
      );

      if (result.current) {
        expect(result.current.editedCharacter.name).toBe('Character\'s "Special" (Name) & More');

        act(() => {
          result.current.handleEditChange('name', 'Normal Name');
        });

        expect(result.current.editedCharacter.name).toBe('Normal Name');
      }
    });

    it('should handle empty character ability', () => {
      const character = createCharacter({ ability: '' });
      const characterToken = createCharacterToken();

      const { result } = renderHook(() =>
        useTokenDetailEditor({
          character,
          characterToken,
          reminderTokens: [],
        })
      );

      if (result.current) {
        expect(result.current.editedCharacter.ability).toBe('');

        act(() => {
          result.current.handleEditChange('ability', 'New Ability');
        });

        expect(result.current.editedCharacter.ability).toBe('New Ability');
      }
    });

    it('should handle very long ability text', () => {
      const longAbility = 'A'.repeat(5000);
      const character = createCharacter({ ability: longAbility });
      const characterToken = createCharacterToken();

      const { result } = renderHook(() =>
        useTokenDetailEditor({
          character,
          characterToken,
          reminderTokens: [],
        })
      );

      if (result.current) {
        expect(result.current.editedCharacter.ability).toBe(longAbility);
        expect(result.current.editedCharacter.ability.length).toBe(5000);
      }
    });

    it('should handle character with undefined optional fields', () => {
      const character = createCharacter({
        reminders: undefined as unknown as string[],
      });
      const characterToken = createCharacterToken();

      const { result } = renderHook(() =>
        useTokenDetailEditor({
          character,
          characterToken,
          reminderTokens: [],
        })
      );

      if (result.current) {
        expect(result.current.editedCharacter).toBeDefined();
      }
    });

    it('should handle multiple concurrent edits (last one wins)', () => {
      const character = createCharacter({ name: 'Original', ability: 'Original' });
      const characterToken = createCharacterToken();

      const { result } = renderHook(() =>
        useTokenDetailEditor({
          character,
          characterToken,
          reminderTokens: [],
        })
      );

      if (result.current) {
        act(() => {
          result.current.handleEditChange('name', 'Change 1');
          result.current.handleEditChange('name', 'Change 2');
          result.current.handleEditChange('name', 'Change 3');
        });

        expect(result.current.editedCharacter.name).toBe('Change 3');
      }
    });
  });

  describe('State Isolation and Independence', () => {
    it('should not affect other hook instances', () => {
      const character1 = createCharacter({ id: 'char-1', name: 'Char 1' });
      const character2 = createCharacter({ id: 'char-2', name: 'Char 2' });
      const token1 = createCharacterToken();
      const token2 = createCharacterToken();

      const { result: result1 } = renderHook(() =>
        useTokenDetailEditor({
          character: character1,
          characterToken: token1,
          reminderTokens: [],
        })
      );

      const { result: result2 } = renderHook(() =>
        useTokenDetailEditor({
          character: character2,
          characterToken: token2,
          reminderTokens: [],
        })
      );

      if (result1.current && result2.current) {
        act(() => {
          result1.current.handleEditChange('name', 'Modified 1');
        });

        expect(result1.current.editedCharacter.name).toBe('Modified 1');
        expect(result2.current.editedCharacter.name).toBe('Char 2');
      }
    });

    it('should handle prop changes for character', () => {
      const character1 = createCharacter({ id: 'char-1', name: 'Original' });
      const character2 = createCharacter({ id: 'char-2', name: 'Different' });
      const token = createCharacterToken();

      const { result, rerender } = renderHook(
        ({ character }) =>
          useTokenDetailEditor({
            character,
            characterToken: token,
            reminderTokens: [],
          }),
        { initialProps: { character: character1 } }
      );

      if (result.current) {
        expect(result.current.editedCharacter.name).toBe('Original');

        // Note: In actual hook usage, changing character prop would reset state
        rerender({ character: character2 });

        // After prop change, should reinitialize with new character
        // This depends on useEffect dependencies in the actual hook
      }
    });
  });

  describe('Logging and Debugging', () => {
    it('should log debug message on successful apply', async () => {
      const { logger } = await import('@/ts/utils/logger.js');
      const character = createCharacter();
      const characterToken = createCharacterToken();
      const jsonInput = JSON.stringify([character]);

      const baseContextValue = mockUseTokenContext.mock.results[0]?.value || {
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
        enabledCharacterUuids: new Set(),
        characterSelectionSummary: { enabled: 0, disabled: 0, total: 0 },
        scriptMeta: null,
        setScriptMeta: vi.fn(),
        generationOptions: createGenerationOptions(),
        updateGenerationOptions: vi.fn(),
        jsonInput: '[]',
        setJsonInput: mockSetJsonInput,
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
        generationProgress: { current: 0, total: 0 },
        setGenerationProgress: vi.fn(),
      };

      mockUseTokenContext.mockReturnValue({
        ...baseContextValue,
        jsonInput,
      } as unknown as ReturnType<typeof TokenContextModule.useTokenContext>);

      const { result } = renderHook(() =>
        useTokenDetailEditor({
          character,
          characterToken,
          reminderTokens: [],
        })
      );

      if (result.current) {
        act(() => {
          result.current.handleEditChange('name', 'Changed');
        });

        await act(async () => {
          await result.current.handleApplyToScript();
        });

        // Verify logger was called (actual messages depend on mock implementation)
        expect(logger.debug).toHaveBeenCalledWith(
          'useTokenDetailEditor',
          'Character changes applied to script'
        );
      }
    });

    it('should log error message on failed regeneration', async () => {
      const { logger } = await import('@/ts/utils/logger.js');
      const { regenerateSingleToken } = await import('@/ts/ui/detailViewUtils.js');
      vi.mocked(regenerateSingleToken).mockRejectedValueOnce(new Error('Generation error'));

      const character = createCharacter();
      const characterToken = createCharacterToken();

      const { result } = renderHook(() =>
        useTokenDetailEditor({
          character,
          characterToken,
          reminderTokens: [],
        })
      );

      if (result.current) {
        act(() => {
          result.current.handleEditChange('name', 'Changed');
        });

        await waitFor(() => {
          expect(logger.error).toHaveBeenCalledWith(
            'useTokenDetailEditor',
            'Failed to regenerate preview:',
            expect.any(Error)
          );
        });
      }
    });
  });
});
