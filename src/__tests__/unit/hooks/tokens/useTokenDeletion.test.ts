/**
 * Unit tests for useTokenDeletion hook
 *
 * Tests cover:
 * - Hook initialization and return values
 * - Meta token deletion (immediate, without confirmation)
 * - Character/Reminder token deletion (with confirmation modal)
 * - Confirmation and cancellation logic
 * - Edge cases and complex scenarios
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createAlmanacToken,
  createBootleggerToken,
  createCharacter,
  createCharacterToken,
  createPandemoniumToken,
  createReminderToken,
  createScriptNameToken,
  createToken,
  resetAllFactories,
} from '@/__tests__/factories';
import { useTokenDeletion } from '@/hooks/tokens/useTokenDeletion';

describe('useTokenDeletion', () => {
  beforeEach(() => {
    resetAllFactories();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==================== Hook Initialization ====================
  describe('Hook Initialization', () => {
    it('should return expected functions', () => {
      const { result } = renderHook(() =>
        useTokenDeletion({
          tokens: [],
          characters: [],
          setTokens: vi.fn(),
          setCharacters: vi.fn(),
          updateGenerationOptions: vi.fn(),
        })
      );

      expect(result.current).toHaveProperty('handleDeleteRequest');
      expect(result.current).toHaveProperty('confirmDelete');
      expect(result.current).toHaveProperty('cancelDelete');
      expect(result.current).toHaveProperty('tokenToDelete');

      expect(typeof result.current.handleDeleteRequest).toBe('function');
      expect(typeof result.current.confirmDelete).toBe('function');
      expect(typeof result.current.cancelDelete).toBe('function');
    });

    it('should initialize tokenToDelete as null', () => {
      const { result } = renderHook(() =>
        useTokenDeletion({
          tokens: [],
          characters: [],
          setTokens: vi.fn(),
          setCharacters: vi.fn(),
          updateGenerationOptions: vi.fn(),
        })
      );

      expect(result.current.tokenToDelete).toBeNull();
    });
  });

  // ==================== Meta Token Deletion ====================
  describe('handleDeleteRequest - Meta Tokens', () => {
    it('should immediately delete script-name token without confirmation', () => {
      const setTokens = vi.fn();
      const updateGenerationOptions = vi.fn();
      const token = createScriptNameToken();
      const tokens = [token];

      const { result } = renderHook(() =>
        useTokenDeletion({
          tokens,
          characters: [],
          setTokens,
          setCharacters: vi.fn(),
          updateGenerationOptions,
        })
      );

      act(() => {
        result.current.handleDeleteRequest(token);
      });

      // Should set scriptNameToken: false
      expect(updateGenerationOptions).toHaveBeenCalledWith({ scriptNameToken: false });
      // Should remove token immediately
      expect(setTokens).toHaveBeenCalledWith([]);
      // Should NOT set tokenToDelete
      expect(result.current.tokenToDelete).toBeNull();
    });

    it('should immediately delete almanac token without confirmation', () => {
      const setTokens = vi.fn();
      const updateGenerationOptions = vi.fn();
      const token = createAlmanacToken();
      const tokens = [token];

      const { result } = renderHook(() =>
        useTokenDeletion({
          tokens,
          characters: [],
          setTokens,
          setCharacters: vi.fn(),
          updateGenerationOptions,
        })
      );

      act(() => {
        result.current.handleDeleteRequest(token);
      });

      expect(updateGenerationOptions).toHaveBeenCalledWith({ almanacToken: false });
      expect(setTokens).toHaveBeenCalledWith([]);
      expect(result.current.tokenToDelete).toBeNull();
    });

    it('should immediately delete pandemonium token without confirmation', () => {
      const setTokens = vi.fn();
      const updateGenerationOptions = vi.fn();
      const token = createPandemoniumToken();
      const tokens = [token];

      const { result } = renderHook(() =>
        useTokenDeletion({
          tokens,
          characters: [],
          setTokens,
          setCharacters: vi.fn(),
          updateGenerationOptions,
        })
      );

      act(() => {
        result.current.handleDeleteRequest(token);
      });

      expect(updateGenerationOptions).toHaveBeenCalledWith({ pandemoniumToken: false });
      expect(setTokens).toHaveBeenCalledWith([]);
      expect(result.current.tokenToDelete).toBeNull();
    });

    it('should immediately delete bootlegger token without confirmation', () => {
      const setTokens = vi.fn();
      const updateGenerationOptions = vi.fn();
      const token = createBootleggerToken();
      const tokens = [token];

      const { result } = renderHook(() =>
        useTokenDeletion({
          tokens,
          characters: [],
          setTokens,
          setCharacters: vi.fn(),
          updateGenerationOptions,
        })
      );

      act(() => {
        result.current.handleDeleteRequest(token);
      });

      expect(updateGenerationOptions).toHaveBeenCalledWith({ generateBootleggerRules: false });
      expect(setTokens).toHaveBeenCalledWith([]);
      expect(result.current.tokenToDelete).toBeNull();
    });

    it('should preserve other tokens when deleting meta token', () => {
      const setTokens = vi.fn();
      const characterToken = createCharacterToken();
      const metaToken = createScriptNameToken();
      const tokens = [characterToken, metaToken];

      const { result } = renderHook(() =>
        useTokenDeletion({
          tokens,
          characters: [],
          setTokens,
          setCharacters: vi.fn(),
          updateGenerationOptions: vi.fn(),
        })
      );

      act(() => {
        result.current.handleDeleteRequest(metaToken);
      });

      expect(setTokens).toHaveBeenCalledWith([characterToken]);
    });
  });

  // ==================== Character/Reminder Token Deletion (Request) ====================
  describe('handleDeleteRequest - Character/Reminder Tokens', () => {
    it('should set tokenToDelete for character tokens', () => {
      const token = createCharacterToken();

      const { result } = renderHook(() =>
        useTokenDeletion({
          tokens: [token],
          characters: [],
          setTokens: vi.fn(),
          setCharacters: vi.fn(),
          updateGenerationOptions: vi.fn(),
        })
      );

      act(() => {
        result.current.handleDeleteRequest(token);
      });

      expect(result.current.tokenToDelete).toBe(token);
    });

    it('should set tokenToDelete for reminder tokens', () => {
      const token = createReminderToken('Test Reminder', {
        parentCharacter: 'Washerwoman',
      });

      const { result } = renderHook(() =>
        useTokenDeletion({
          tokens: [token],
          characters: [],
          setTokens: vi.fn(),
          setCharacters: vi.fn(),
          updateGenerationOptions: vi.fn(),
        })
      );

      act(() => {
        result.current.handleDeleteRequest(token);
      });

      expect(result.current.tokenToDelete).toBe(token);
    });

    it('should not immediately delete character tokens', () => {
      const setTokens = vi.fn();
      const token = createCharacterToken();

      const { result } = renderHook(() =>
        useTokenDeletion({
          tokens: [token],
          characters: [],
          setTokens,
          setCharacters: vi.fn(),
          updateGenerationOptions: vi.fn(),
        })
      );

      act(() => {
        result.current.handleDeleteRequest(token);
      });

      expect(setTokens).not.toHaveBeenCalled();
    });

    it('should not immediately delete reminder tokens', () => {
      const setTokens = vi.fn();
      const token = createReminderToken('Test Reminder');

      const { result } = renderHook(() =>
        useTokenDeletion({
          tokens: [token],
          characters: [],
          setTokens,
          setCharacters: vi.fn(),
          updateGenerationOptions: vi.fn(),
        })
      );

      act(() => {
        result.current.handleDeleteRequest(token);
      });

      expect(setTokens).not.toHaveBeenCalled();
    });
  });

  // ==================== Confirm Delete - Character Tokens ====================
  describe('confirmDelete - Character Tokens', () => {
    it('should delete the character token', () => {
      const setTokens = vi.fn();
      const characterToken = createCharacterToken({ name: 'Washerwoman' });
      const tokens = [characterToken];

      const { result } = renderHook(() =>
        useTokenDeletion({
          tokens,
          characters: [],
          setTokens,
          setCharacters: vi.fn(),
          updateGenerationOptions: vi.fn(),
        })
      );

      act(() => {
        result.current.handleDeleteRequest(characterToken);
      });

      act(() => {
        result.current.confirmDelete();
      });

      expect(setTokens).toHaveBeenCalledWith([]);
    });

    it('should delete associated reminder tokens', () => {
      const setTokens = vi.fn();
      const characterToken = createCharacterToken({ name: 'Washerwoman' });
      const reminderToken1 = createReminderToken('First reminder', {
        parentCharacter: 'Washerwoman',
      });
      const reminderToken2 = createReminderToken('Second reminder', {
        parentCharacter: 'Washerwoman',
      });
      const otherReminderToken = createReminderToken('Other reminder', {
        parentCharacter: 'Drunk',
      });
      const tokens = [characterToken, reminderToken1, reminderToken2, otherReminderToken];

      const { result } = renderHook(() =>
        useTokenDeletion({
          tokens,
          characters: [],
          setTokens,
          setCharacters: vi.fn(),
          updateGenerationOptions: vi.fn(),
        })
      );

      act(() => {
        result.current.handleDeleteRequest(characterToken);
      });

      act(() => {
        result.current.confirmDelete();
      });

      expect(setTokens).toHaveBeenCalledWith([otherReminderToken]);
    });

    it('should remove character from characters array', () => {
      const setCharacters = vi.fn();
      const character = createCharacter({ name: 'Washerwoman' });
      const characterToken = createCharacterToken({ name: 'Washerwoman' });
      const otherCharacter = createCharacter({ name: 'Drunk' });
      const characters = [character, otherCharacter];

      const { result } = renderHook(() =>
        useTokenDeletion({
          tokens: [characterToken],
          characters,
          setTokens: vi.fn(),
          setCharacters,
          updateGenerationOptions: vi.fn(),
        })
      );

      act(() => {
        result.current.handleDeleteRequest(characterToken);
      });

      act(() => {
        result.current.confirmDelete();
      });

      expect(setCharacters).toHaveBeenCalledWith([otherCharacter]);
    });

    it('should clear tokenToDelete after confirmation', () => {
      const characterToken = createCharacterToken();

      const { result } = renderHook(() =>
        useTokenDeletion({
          tokens: [characterToken],
          characters: [],
          setTokens: vi.fn(),
          setCharacters: vi.fn(),
          updateGenerationOptions: vi.fn(),
        })
      );

      act(() => {
        result.current.handleDeleteRequest(characterToken);
      });

      expect(result.current.tokenToDelete).toBe(characterToken);

      act(() => {
        result.current.confirmDelete();
      });

      expect(result.current.tokenToDelete).toBeNull();
    });

    it('should handle character with no reminders', () => {
      const setTokens = vi.fn();
      const characterToken = createCharacterToken();

      const { result } = renderHook(() =>
        useTokenDeletion({
          tokens: [characterToken],
          characters: [],
          setTokens,
          setCharacters: vi.fn(),
          updateGenerationOptions: vi.fn(),
        })
      );

      act(() => {
        result.current.handleDeleteRequest(characterToken);
      });

      act(() => {
        result.current.confirmDelete();
      });

      expect(setTokens).toHaveBeenCalledWith([]);
    });

    it('should handle character not in characters array', () => {
      const setCharacters = vi.fn();
      const characterToken = createCharacterToken({ name: 'MissingCharacter' });
      const otherCharacter = createCharacter({ name: 'Drunk' });

      const { result } = renderHook(() =>
        useTokenDeletion({
          tokens: [characterToken],
          characters: [otherCharacter],
          setTokens: vi.fn(),
          setCharacters,
          updateGenerationOptions: vi.fn(),
        })
      );

      act(() => {
        result.current.handleDeleteRequest(characterToken);
      });

      act(() => {
        result.current.confirmDelete();
      });

      // Should still filter correctly even though character isn't found
      expect(setCharacters).toHaveBeenCalledWith([otherCharacter]);
    });

    it('should preserve other character tokens', () => {
      const setTokens = vi.fn();
      const character1Token = createCharacterToken({ name: 'Washerwoman' });
      const character2Token = createCharacterToken({ name: 'Drunk' });
      const tokens = [character1Token, character2Token];

      const { result } = renderHook(() =>
        useTokenDeletion({
          tokens,
          characters: [],
          setTokens,
          setCharacters: vi.fn(),
          updateGenerationOptions: vi.fn(),
        })
      );

      act(() => {
        result.current.handleDeleteRequest(character1Token);
      });

      act(() => {
        result.current.confirmDelete();
      });

      expect(setTokens).toHaveBeenCalledWith([character2Token]);
    });
  });

  // ==================== Confirm Delete - Reminder Tokens ====================
  describe('confirmDelete - Reminder Tokens', () => {
    it('should delete only the specific reminder token', () => {
      const setTokens = vi.fn();
      const reminderToken = createReminderToken('Test Reminder', {
        parentCharacter: 'Washerwoman',
      });
      const otherReminderToken = createReminderToken('Other Reminder', {
        parentCharacter: 'Washerwoman',
      });
      const tokens = [reminderToken, otherReminderToken];

      const { result } = renderHook(() =>
        useTokenDeletion({
          tokens,
          characters: [],
          setTokens,
          setCharacters: vi.fn(),
          updateGenerationOptions: vi.fn(),
        })
      );

      act(() => {
        result.current.handleDeleteRequest(reminderToken);
      });

      act(() => {
        result.current.confirmDelete();
      });

      expect(setTokens).toHaveBeenCalledWith([otherReminderToken]);
    });

    it('should not delete parent character when deleting reminder', () => {
      const setCharacters = vi.fn();
      const characterToken = createCharacterToken({ name: 'Washerwoman' });
      const reminderToken = createReminderToken('Test Reminder', {
        parentCharacter: 'Washerwoman',
      });
      const character = createCharacter({ name: 'Washerwoman' });

      const { result } = renderHook(() =>
        useTokenDeletion({
          tokens: [characterToken, reminderToken],
          characters: [character],
          setTokens: vi.fn(),
          setCharacters,
          updateGenerationOptions: vi.fn(),
        })
      );

      act(() => {
        result.current.handleDeleteRequest(reminderToken);
      });

      act(() => {
        result.current.confirmDelete();
      });

      // Character array should remain unchanged
      expect(setCharacters).not.toHaveBeenCalled();
    });

    it('should clear tokenToDelete after confirmation', () => {
      const reminderToken = createReminderToken('Test Reminder');

      const { result } = renderHook(() =>
        useTokenDeletion({
          tokens: [reminderToken],
          characters: [],
          setTokens: vi.fn(),
          setCharacters: vi.fn(),
          updateGenerationOptions: vi.fn(),
        })
      );

      act(() => {
        result.current.handleDeleteRequest(reminderToken);
      });

      expect(result.current.tokenToDelete).toBe(reminderToken);

      act(() => {
        result.current.confirmDelete();
      });

      expect(result.current.tokenToDelete).toBeNull();
    });

    it('should preserve other reminder tokens with different parent characters', () => {
      const setTokens = vi.fn();
      const reminderToken1 = createReminderToken('Washer reminder', {
        parentCharacter: 'Washerwoman',
      });
      const reminderToken2 = createReminderToken('Drunk reminder', {
        parentCharacter: 'Drunk',
      });
      const tokens = [reminderToken1, reminderToken2];

      const { result } = renderHook(() =>
        useTokenDeletion({
          tokens,
          characters: [],
          setTokens,
          setCharacters: vi.fn(),
          updateGenerationOptions: vi.fn(),
        })
      );

      act(() => {
        result.current.handleDeleteRequest(reminderToken1);
      });

      act(() => {
        result.current.confirmDelete();
      });

      expect(setTokens).toHaveBeenCalledWith([reminderToken2]);
    });
  });

  // ==================== Confirm Delete - Edge Cases ====================
  describe('confirmDelete - Edge Cases', () => {
    it('should do nothing if tokenToDelete is null', () => {
      const setTokens = vi.fn();
      const setCharacters = vi.fn();

      const { result } = renderHook(() =>
        useTokenDeletion({
          tokens: [],
          characters: [],
          setTokens,
          setCharacters,
          updateGenerationOptions: vi.fn(),
        })
      );

      act(() => {
        result.current.confirmDelete();
      });

      expect(setTokens).not.toHaveBeenCalled();
      expect(setCharacters).not.toHaveBeenCalled();
    });

    it('should handle multiple calls to confirmDelete', () => {
      const setTokens = vi.fn();
      const characterToken = createCharacterToken();

      const { result } = renderHook(() =>
        useTokenDeletion({
          tokens: [characterToken],
          characters: [],
          setTokens,
          setCharacters: vi.fn(),
          updateGenerationOptions: vi.fn(),
        })
      );

      act(() => {
        result.current.handleDeleteRequest(characterToken);
      });

      act(() => {
        result.current.confirmDelete();
      });

      // Second call should do nothing since tokenToDelete is null
      act(() => {
        result.current.confirmDelete();
      });

      // setTokens should only be called once
      expect(setTokens).toHaveBeenCalledTimes(1);
    });

    it('should handle complex scenario with mixed token types', () => {
      const setTokens = vi.fn();
      const characterToken = createCharacterToken({ name: 'Washerwoman' });
      const reminderToken1 = createReminderToken('Washer reminder', {
        parentCharacter: 'Washerwoman',
      });
      const reminderToken2 = createReminderToken('Drunk reminder', {
        parentCharacter: 'Drunk',
      });
      const metaToken = createScriptNameToken();
      const tokens = [characterToken, reminderToken1, reminderToken2, metaToken];

      const { result } = renderHook(() =>
        useTokenDeletion({
          tokens,
          characters: [],
          setTokens,
          setCharacters: vi.fn(),
          updateGenerationOptions: vi.fn(),
        })
      );

      act(() => {
        result.current.handleDeleteRequest(characterToken);
      });

      act(() => {
        result.current.confirmDelete();
      });

      // Should delete character and its reminders, preserve others
      expect(setTokens).toHaveBeenCalledWith([reminderToken2, metaToken]);
    });
  });

  // ==================== Cancel Delete ====================
  describe('cancelDelete', () => {
    it('should clear tokenToDelete', () => {
      const characterToken = createCharacterToken();

      const { result } = renderHook(() =>
        useTokenDeletion({
          tokens: [characterToken],
          characters: [],
          setTokens: vi.fn(),
          setCharacters: vi.fn(),
          updateGenerationOptions: vi.fn(),
        })
      );

      act(() => {
        result.current.handleDeleteRequest(characterToken);
      });

      expect(result.current.tokenToDelete).toBe(characterToken);

      act(() => {
        result.current.cancelDelete();
      });

      expect(result.current.tokenToDelete).toBeNull();
    });

    it('should not delete any tokens when cancelled', () => {
      const setTokens = vi.fn();
      const characterToken = createCharacterToken();

      const { result } = renderHook(() =>
        useTokenDeletion({
          tokens: [characterToken],
          characters: [],
          setTokens,
          setCharacters: vi.fn(),
          updateGenerationOptions: vi.fn(),
        })
      );

      act(() => {
        result.current.handleDeleteRequest(characterToken);
      });

      act(() => {
        result.current.cancelDelete();
      });

      expect(setTokens).not.toHaveBeenCalled();
    });

    it('should do nothing if tokenToDelete is already null', () => {
      const { result } = renderHook(() =>
        useTokenDeletion({
          tokens: [],
          characters: [],
          setTokens: vi.fn(),
          setCharacters: vi.fn(),
          updateGenerationOptions: vi.fn(),
        })
      );

      expect(result.current.tokenToDelete).toBeNull();

      act(() => {
        result.current.cancelDelete();
      });

      expect(result.current.tokenToDelete).toBeNull();
    });

    it('should allow requesting deletion again after cancellation', () => {
      const characterToken1 = createCharacterToken({ name: 'Washerwoman' });
      const characterToken2 = createCharacterToken({ name: 'Drunk' });

      const { result } = renderHook(() =>
        useTokenDeletion({
          tokens: [characterToken1, characterToken2],
          characters: [],
          setTokens: vi.fn(),
          setCharacters: vi.fn(),
          updateGenerationOptions: vi.fn(),
        })
      );

      // Request deletion of first token
      act(() => {
        result.current.handleDeleteRequest(characterToken1);
      });

      expect(result.current.tokenToDelete).toBe(characterToken1);

      // Cancel
      act(() => {
        result.current.cancelDelete();
      });

      expect(result.current.tokenToDelete).toBeNull();

      // Request deletion of second token
      act(() => {
        result.current.handleDeleteRequest(characterToken2);
      });

      expect(result.current.tokenToDelete).toBe(characterToken2);
    });
  });

  // ==================== Complex Scenarios ====================
  describe('Complex Scenarios', () => {
    it('should handle character with multiple reminders of different types', () => {
      const setTokens = vi.fn();
      const characterToken = createCharacterToken({ name: 'Washerwoman' });
      const reminderA = createReminderToken('First reminder', {
        parentCharacter: 'Washerwoman',
        filename: 'reminder-a.png',
      });
      const reminderB = createReminderToken('Second reminder', {
        parentCharacter: 'Washerwoman',
        filename: 'reminder-b.png',
      });
      const reminderC = createReminderToken('Third reminder', {
        parentCharacter: 'Washerwoman',
        filename: 'reminder-c.png',
      });
      const tokens = [characterToken, reminderA, reminderB, reminderC];

      const { result } = renderHook(() =>
        useTokenDeletion({
          tokens,
          characters: [],
          setTokens,
          setCharacters: vi.fn(),
          updateGenerationOptions: vi.fn(),
        })
      );

      act(() => {
        result.current.handleDeleteRequest(characterToken);
      });

      act(() => {
        result.current.confirmDelete();
      });

      expect(setTokens).toHaveBeenCalledWith([]);
    });

    it('should handle deletion workflow: request -> cancel -> request -> confirm', () => {
      const setTokens = vi.fn();
      const characterToken1 = createCharacterToken({ name: 'Washerwoman' });
      const characterToken2 = createCharacterToken({ name: 'Drunk' });
      const tokens = [characterToken1, characterToken2];

      const { result } = renderHook(() =>
        useTokenDeletion({
          tokens,
          characters: [],
          setTokens,
          setCharacters: vi.fn(),
          updateGenerationOptions: vi.fn(),
        })
      );

      // Request deletion of token1
      act(() => {
        result.current.handleDeleteRequest(characterToken1);
      });

      expect(result.current.tokenToDelete).toBe(characterToken1);

      // Cancel
      act(() => {
        result.current.cancelDelete();
      });

      expect(result.current.tokenToDelete).toBeNull();
      expect(setTokens).not.toHaveBeenCalled();

      // Request deletion of token2
      act(() => {
        result.current.handleDeleteRequest(characterToken2);
      });

      expect(result.current.tokenToDelete).toBe(characterToken2);

      // Confirm
      act(() => {
        result.current.confirmDelete();
      });

      expect(setTokens).toHaveBeenCalledWith([characterToken1]);
    });

    it('should handle rapid succession of delete requests', () => {
      const characterToken1 = createCharacterToken({ name: 'Washerwoman' });
      const characterToken2 = createCharacterToken({ name: 'Drunk' });

      const { result } = renderHook(() =>
        useTokenDeletion({
          tokens: [characterToken1, characterToken2],
          characters: [],
          setTokens: vi.fn(),
          setCharacters: vi.fn(),
          updateGenerationOptions: vi.fn(),
        })
      );

      // Request deletion of token1
      act(() => {
        result.current.handleDeleteRequest(characterToken1);
      });

      expect(result.current.tokenToDelete).toBe(characterToken1);

      // Immediately request deletion of token2 (overwrites token1)
      act(() => {
        result.current.handleDeleteRequest(characterToken2);
      });

      expect(result.current.tokenToDelete).toBe(characterToken2);
    });

    it('should handle multiple meta tokens of different types', () => {
      const updateGenerationOptions = vi.fn();
      const setTokens = vi.fn();
      const scriptNameToken = createScriptNameToken();
      const almanacToken = createAlmanacToken();
      const pandemoniumToken = createPandemoniumToken();

      const { result } = renderHook(() =>
        useTokenDeletion({
          tokens: [scriptNameToken, almanacToken, pandemoniumToken],
          characters: [],
          setTokens,
          setCharacters: vi.fn(),
          updateGenerationOptions,
        })
      );

      // Delete script-name
      act(() => {
        result.current.handleDeleteRequest(scriptNameToken);
      });

      expect(updateGenerationOptions).toHaveBeenNthCalledWith(1, { scriptNameToken: false });
      expect(result.current.tokenToDelete).toBeNull();

      // Delete almanac
      act(() => {
        result.current.handleDeleteRequest(almanacToken);
      });

      expect(updateGenerationOptions).toHaveBeenNthCalledWith(2, { almanacToken: false });
      expect(result.current.tokenToDelete).toBeNull();

      // Delete pandemonium
      act(() => {
        result.current.handleDeleteRequest(pandemoniumToken);
      });

      expect(updateGenerationOptions).toHaveBeenNthCalledWith(3, { pandemoniumToken: false });
      expect(result.current.tokenToDelete).toBeNull();

      // Each deletion should filter from original tokens array
      expect(setTokens).toHaveBeenNthCalledWith(1, [almanacToken, pandemoniumToken]);
      expect(setTokens).toHaveBeenNthCalledWith(2, [scriptNameToken, pandemoniumToken]);
      expect(setTokens).toHaveBeenNthCalledWith(3, [scriptNameToken, almanacToken]);
    });
  });

  // ==================== State Update Coverage ====================
  describe('State Update Coverage', () => {
    it('should update tokenToDelete state correctly', () => {
      const characterToken = createCharacterToken();

      const { result } = renderHook(() =>
        useTokenDeletion({
          tokens: [characterToken],
          characters: [],
          setTokens: vi.fn(),
          setCharacters: vi.fn(),
          updateGenerationOptions: vi.fn(),
        })
      );

      expect(result.current.tokenToDelete).toBeNull();

      act(() => {
        result.current.handleDeleteRequest(characterToken);
      });

      expect(result.current.tokenToDelete).toBe(characterToken);

      act(() => {
        result.current.cancelDelete();
      });

      expect(result.current.tokenToDelete).toBeNull();
    });

    it('should maintain tokenToDelete across re-renders when unchanged', () => {
      const characterToken = createCharacterToken();

      const { result } = renderHook(
        ({ tokens }) =>
          useTokenDeletion({
            tokens,
            characters: [],
            setTokens: vi.fn(),
            setCharacters: vi.fn(),
            updateGenerationOptions: vi.fn(),
          }),
        {
          initialProps: { tokens: [characterToken] },
        }
      );

      act(() => {
        result.current.handleDeleteRequest(characterToken);
      });

      const token1 = result.current.tokenToDelete;
      // token1 should be the selected character token
      expect(token1).toBe(characterToken);

      // Should maintain the same token reference after hook execution
      const token2 = result.current.tokenToDelete;
      expect(token1).toBe(token2);
    });
  });

  // ==================== Callback Dependencies ====================
  describe('Callback Dependencies', () => {
    it('should use latest tokens array in confirmDelete', () => {
      const setTokens = vi.fn();
      const characterToken = createCharacterToken({ name: 'Washerwoman' });
      const otherToken = createToken();
      let tokens = [characterToken, otherToken];

      const { result, rerender } = renderHook(
        ({ tokens: tokensProp }) =>
          useTokenDeletion({
            tokens: tokensProp,
            characters: [],
            setTokens,
            setCharacters: vi.fn(),
            updateGenerationOptions: vi.fn(),
          }),
        {
          initialProps: { tokens },
        }
      );

      act(() => {
        result.current.handleDeleteRequest(characterToken);
      });

      // Update tokens before confirming
      tokens = [characterToken, otherToken, createToken()];
      rerender({ tokens });

      act(() => {
        result.current.confirmDelete();
      });

      // Should use the updated tokens array
      expect(setTokens).toHaveBeenCalledWith([otherToken, tokens[2]]);
    });

    it('should use latest characters array in confirmDelete', () => {
      const setCharacters = vi.fn();
      const character = createCharacter({ name: 'Washerwoman' });
      const characterToken = createCharacterToken({ name: 'Washerwoman' });
      let characters = [character];

      const { result, rerender } = renderHook(
        ({ characters: charsProp }) =>
          useTokenDeletion({
            tokens: [characterToken],
            characters: charsProp,
            setTokens: vi.fn(),
            setCharacters,
            updateGenerationOptions: vi.fn(),
          }),
        {
          initialProps: { characters },
        }
      );

      act(() => {
        result.current.handleDeleteRequest(characterToken);
      });

      // Add another character
      characters = [character, createCharacter({ name: 'Drunk' })];
      rerender({ characters });

      act(() => {
        result.current.confirmDelete();
      });

      // Should filter using the updated characters array
      expect(setCharacters).toHaveBeenCalledWith([characters[1]]);
    });
  });
});
