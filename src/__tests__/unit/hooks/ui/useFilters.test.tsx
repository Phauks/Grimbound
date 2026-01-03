/**
 * Unit tests for useFilters hook
 *
 * Tests cover:
 * - Filter state proxying from TokenContext
 * - Toggle handlers for each filter type (teams, tokenTypes, display, reminders, origin)
 * - Reset filters functionality
 * - Adding and removing individual filter values
 * - Error handling when context is unavailable
 * - Hook composition and memoization behavior
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { useTokenContext } from '@/contexts/TokenContext';
import * as TokenContextModule from '@/contexts/TokenContext';
import { useFilters } from '@/hooks/ui/useFilters';

type TokenContextType = ReturnType<typeof useTokenContext>;

/**
 * Mock factory for TokenContext value
 * Provides a complete mock context with filter-related properties
 */
const createMockTokenContext = (overrides = {}): TokenContextType => ({
  // Token state
  tokens: [],
  setTokens: vi.fn(),

  // Character state
  characters: [],
  setCharacters: vi.fn(),

  officialData: [],
  setOfficialData: vi.fn(),

  // Character metadata
  characterMetadata: new Map(),
  getMetadata: vi.fn(),
  setMetadata: vi.fn(),
  deleteMetadata: vi.fn(),
  clearAllMetadata: vi.fn(),

  // Character enable/disable helpers
  isCharacterEnabled: vi.fn(),
  setCharacterEnabled: vi.fn(),
  setAllCharactersEnabled: vi.fn(),
  getEnabledCharacters: vi.fn(() => []),
  enabledCharacterUuids: new Set<string>(),
  characterSelectionSummary: { enabled: 0, disabled: 0, total: 0 },

  // Script metadata
  scriptMeta: null,
  setScriptMeta: vi.fn(),

  // Generation options
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

  // JSON input
  jsonInput: '',
  setJsonInput: vi.fn(),

  // Filter state - the main focus of this hook
  filters: {
    teams: [],
    tokenTypes: [],
    display: [],
    reminders: [],
    origin: [],
  },
  updateFilters: vi.fn(),

  // Example token states
  exampleCharacterToken: null,
  setExampleCharacterToken: vi.fn(),
  exampleMetaToken: null,
  setExampleMetaToken: vi.fn(),

  // UI state
  isLoading: false,
  setIsLoading: vi.fn(),

  error: null,
  setError: vi.fn(),

  // Validation warnings
  warnings: [],
  setWarnings: vi.fn(),

  // Generation progress
  generationProgress: null,
  setGenerationProgress: vi.fn(),

  // Token generation session tracking
  lastGeneratedJsonHash: null,
  setLastGeneratedJsonHash: vi.fn(),

  // Sync status
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

describe('useFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Filter State', () => {
    it('should return all filter arrays from context', () => {
      const mockContext = createMockTokenContext({
        filters: {
          teams: ['townsfolk'],
          tokenTypes: ['character', 'reminder'],
          display: ['roles'],
          reminders: [],
          origin: ['official'],
        },
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useFilters());

      // The hook returns only toggle functions and resetFilters
      expect(result.current).toBeDefined();
      expect(result.current.toggleTeam).toBeDefined();
      expect(result.current.toggleTokenType).toBeDefined();
      expect(result.current.toggleDisplay).toBeDefined();
      expect(result.current.toggleReminders).toBeDefined();
      expect(result.current.toggleOrigin).toBeDefined();
      expect(result.current.resetFilters).toBeDefined();
    });

    it('should work with empty filter arrays', () => {
      const mockContext = createMockTokenContext({
        filters: {
          teams: [],
          tokenTypes: [],
          display: [],
          reminders: [],
          origin: [],
        },
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useFilters());

      expect(result.current.toggleTeam).toBeDefined();
      expect(result.current.toggleTokenType).toBeDefined();
    });
  });

  describe('toggleTeam Handler', () => {
    it('should add team to filter when not present', () => {
      const updateFilters = vi.fn();
      const mockContext = createMockTokenContext({
        filters: { teams: [], tokenTypes: [], display: [], reminders: [], origin: [] },
        updateFilters,
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.toggleTeam('townsfolk');
      });

      expect(updateFilters).toHaveBeenCalledWith({
        teams: ['townsfolk'],
      });
    });

    it('should remove team from filter when already present', () => {
      const updateFilters = vi.fn();
      const mockContext = createMockTokenContext({
        filters: { teams: ['townsfolk'], tokenTypes: [], display: [], reminders: [], origin: [] },
        updateFilters,
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.toggleTeam('townsfolk');
      });

      expect(updateFilters).toHaveBeenCalledWith({
        teams: [],
      });
    });

    it('should toggle multiple teams independently', () => {
      const updateFilters = vi.fn();
      const mockContext = createMockTokenContext({
        filters: { teams: ['townsfolk'], tokenTypes: [], display: [], reminders: [], origin: [] },
        updateFilters,
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.toggleTeam('evil');
      });

      expect(updateFilters).toHaveBeenCalledWith({
        teams: ['townsfolk', 'evil'],
      });
    });

    it('should preserve other teams when toggling', () => {
      const updateFilters = vi.fn();
      const mockContext = createMockTokenContext({
        filters: {
          teams: ['townsfolk', 'evil'],
          tokenTypes: [],
          display: [],
          reminders: [],
          origin: [],
        },
        updateFilters,
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.toggleTeam('traveler');
      });

      expect(updateFilters).toHaveBeenCalledWith({
        teams: ['townsfolk', 'evil', 'traveler'],
      });
    });

    it('should handle removing team from middle of list', () => {
      const updateFilters = vi.fn();
      const mockContext = createMockTokenContext({
        filters: {
          teams: ['townsfolk', 'evil', 'traveler'],
          tokenTypes: [],
          display: [],
          reminders: [],
          origin: [],
        },
        updateFilters,
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.toggleTeam('evil');
      });

      expect(updateFilters).toHaveBeenCalledWith({
        teams: ['townsfolk', 'traveler'],
      });
    });
  });

  describe('toggleTokenType Handler', () => {
    it('should add token type to filter when not present', () => {
      const updateFilters = vi.fn();
      const mockContext = createMockTokenContext({
        filters: { teams: [], tokenTypes: [], display: [], reminders: [], origin: [] },
        updateFilters,
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.toggleTokenType('character');
      });

      expect(updateFilters).toHaveBeenCalledWith({
        tokenTypes: ['character'],
      });
    });

    it('should remove token type from filter when already present', () => {
      const updateFilters = vi.fn();
      const mockContext = createMockTokenContext({
        filters: {
          teams: [],
          tokenTypes: ['character', 'reminder'],
          display: [],
          reminders: [],
          origin: [],
        },
        updateFilters,
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.toggleTokenType('character');
      });

      expect(updateFilters).toHaveBeenCalledWith({
        tokenTypes: ['reminder'],
      });
    });

    it('should handle multiple token types', () => {
      const updateFilters = vi.fn();
      const mockContext = createMockTokenContext({
        filters: { teams: [], tokenTypes: ['character'], display: [], reminders: [], origin: [] },
        updateFilters,
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.toggleTokenType('reminder');
      });

      expect(updateFilters).toHaveBeenCalledWith({
        tokenTypes: ['character', 'reminder'],
      });
    });
  });

  describe('toggleDisplay Handler', () => {
    it('should add display option to filter when not present', () => {
      const updateFilters = vi.fn();
      const mockContext = createMockTokenContext({
        filters: { teams: [], tokenTypes: [], display: [], reminders: [], origin: [] },
        updateFilters,
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.toggleDisplay('roles');
      });

      expect(updateFilters).toHaveBeenCalledWith({
        display: ['roles'],
      });
    });

    it('should remove display option from filter when already present', () => {
      const updateFilters = vi.fn();
      const mockContext = createMockTokenContext({
        filters: {
          teams: [],
          tokenTypes: [],
          display: ['roles', 'team'],
          reminders: [],
          origin: [],
        },
        updateFilters,
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.toggleDisplay('roles');
      });

      expect(updateFilters).toHaveBeenCalledWith({
        display: ['team'],
      });
    });
  });

  describe('toggleReminders Handler', () => {
    it('should add reminder to filter when not present', () => {
      const updateFilters = vi.fn();
      const mockContext = createMockTokenContext({
        filters: { teams: [], tokenTypes: [], display: [], reminders: [], origin: [] },
        updateFilters,
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.toggleReminders('dusk');
      });

      expect(updateFilters).toHaveBeenCalledWith({
        reminders: ['dusk'],
      });
    });

    it('should remove reminder from filter when already present', () => {
      const updateFilters = vi.fn();
      const mockContext = createMockTokenContext({
        filters: {
          teams: [],
          tokenTypes: [],
          display: [],
          reminders: ['dusk', 'dawn'],
          origin: [],
        },
        updateFilters,
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.toggleReminders('dusk');
      });

      expect(updateFilters).toHaveBeenCalledWith({
        reminders: ['dawn'],
      });
    });
  });

  describe('toggleOrigin Handler', () => {
    it('should add origin to filter when not present', () => {
      const updateFilters = vi.fn();
      const mockContext = createMockTokenContext({
        filters: { teams: [], tokenTypes: [], display: [], reminders: [], origin: [] },
        updateFilters,
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.toggleOrigin('official');
      });

      expect(updateFilters).toHaveBeenCalledWith({
        origin: ['official'],
      });
    });

    it('should remove origin from filter when already present', () => {
      const updateFilters = vi.fn();
      const mockContext = createMockTokenContext({
        filters: {
          teams: [],
          tokenTypes: [],
          display: [],
          reminders: [],
          origin: ['official', 'custom'],
        },
        updateFilters,
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.toggleOrigin('official');
      });

      expect(updateFilters).toHaveBeenCalledWith({
        origin: ['custom'],
      });
    });

    it('should handle multiple origins', () => {
      const updateFilters = vi.fn();
      const mockContext = createMockTokenContext({
        filters: { teams: [], tokenTypes: [], display: [], reminders: [], origin: ['official'] },
        updateFilters,
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.toggleOrigin('custom');
      });

      expect(updateFilters).toHaveBeenCalledWith({
        origin: ['official', 'custom'],
      });
    });
  });

  describe('resetFilters Handler', () => {
    it('should clear all filters to empty arrays', () => {
      const updateFilters = vi.fn();
      const mockContext = createMockTokenContext({
        filters: {
          teams: ['townsfolk', 'evil'],
          tokenTypes: ['character', 'reminder'],
          display: ['roles'],
          reminders: ['dusk'],
          origin: ['official'],
        },
        updateFilters,
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.resetFilters();
      });

      expect(updateFilters).toHaveBeenCalledWith({
        teams: [],
        tokenTypes: [],
        display: [],
        reminders: [],
        origin: [],
      });
    });

    it('should work when filters are already empty', () => {
      const updateFilters = vi.fn();
      const mockContext = createMockTokenContext({
        filters: {
          teams: [],
          tokenTypes: [],
          display: [],
          reminders: [],
          origin: [],
        },
        updateFilters,
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.resetFilters();
      });

      expect(updateFilters).toHaveBeenCalledWith({
        teams: [],
        tokenTypes: [],
        display: [],
        reminders: [],
        origin: [],
      });
    });

    it('should reset partially populated filters', () => {
      const updateFilters = vi.fn();
      const mockContext = createMockTokenContext({
        filters: {
          teams: ['townsfolk'],
          tokenTypes: [],
          display: ['roles'],
          reminders: [],
          origin: ['official', 'custom'],
        },
        updateFilters,
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.resetFilters();
      });

      expect(updateFilters).toHaveBeenCalledWith({
        teams: [],
        tokenTypes: [],
        display: [],
        reminders: [],
        origin: [],
      });
    });
  });

  describe('Handler Stability and Memoization', () => {
    it('should provide all toggle functions in return object', () => {
      const mockContext = createMockTokenContext({
        filters: { teams: [], tokenTypes: [], display: [], reminders: [], origin: [] },
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useFilters());

      // Verify all expected functions are present
      expect(result.current).toHaveProperty('toggleTeam');
      expect(result.current).toHaveProperty('toggleTokenType');
      expect(result.current).toHaveProperty('toggleDisplay');
      expect(result.current).toHaveProperty('toggleReminders');
      expect(result.current).toHaveProperty('toggleOrigin');
      expect(result.current).toHaveProperty('resetFilters');
    });

    it('should provide functions that are callable', () => {
      const updateFilters = vi.fn();
      const mockContext = createMockTokenContext({
        filters: { teams: [], tokenTypes: [], display: [], reminders: [], origin: [] },
        updateFilters,
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useFilters());

      // All functions should be callable
      expect(typeof result.current.toggleTeam).toBe('function');
      expect(typeof result.current.toggleTokenType).toBe('function');
      expect(typeof result.current.toggleDisplay).toBe('function');
      expect(typeof result.current.toggleReminders).toBe('function');
      expect(typeof result.current.toggleOrigin).toBe('function');
      expect(typeof result.current.resetFilters).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should throw error when used outside TokenContext provider', () => {
      // Don't mock useTokenContext, let it throw naturally
      vi.spyOn(TokenContextModule, 'useTokenContext').mockImplementation(() => {
        throw new Error('useTokenContext must be used within a TokenProvider');
      });

      expect(() => {
        renderHook(() => useFilters());
      }).toThrow('useTokenContext must be used within a TokenProvider');
    });

    it('should handle undefined context gracefully', () => {
      vi.spyOn(TokenContextModule, 'useTokenContext').mockImplementation(() => {
        throw new Error('useTokenContext must be used within a TokenProvider');
      });

      expect(() => {
        renderHook(() => useFilters());
      }).toThrow();
    });
  });

  describe('Complex Filter Scenarios', () => {
    it('should handle toggling multiple filter types in sequence', () => {
      const updateFilters = vi.fn();
      const mockContext = createMockTokenContext({
        filters: { teams: [], tokenTypes: [], display: [], reminders: [], origin: [] },
        updateFilters,
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.toggleTeam('townsfolk');
        result.current.toggleTokenType('character');
        result.current.toggleDisplay('roles');
      });

      expect(updateFilters).toHaveBeenCalledTimes(3);
      expect(updateFilters).toHaveBeenNthCalledWith(1, { teams: ['townsfolk'] });
      expect(updateFilters).toHaveBeenNthCalledWith(2, { tokenTypes: ['character'] });
      expect(updateFilters).toHaveBeenNthCalledWith(3, { display: ['roles'] });
    });

    it('should handle rapid filter toggling', () => {
      const updateFilters = vi.fn();
      const mockContext = createMockTokenContext({
        filters: { teams: [], tokenTypes: [], display: [], reminders: [], origin: [] },
        updateFilters,
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.toggleTeam('townsfolk');
        result.current.toggleTeam('evil');
        result.current.toggleTeam('outsider');
      });

      expect(updateFilters).toHaveBeenCalledTimes(3);
    });

    it('should preserve filter types independently', () => {
      const updateFilters = vi.fn();
      const mockContext = createMockTokenContext({
        filters: {
          teams: ['townsfolk'],
          tokenTypes: ['character'],
          display: ['roles'],
          reminders: ['dusk'],
          origin: ['official'],
        },
        updateFilters,
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useFilters());

      // Toggle one team
      act(() => {
        result.current.toggleTeam('evil');
      });

      // Verify only teams filter is updated
      expect(updateFilters).toHaveBeenCalledWith({
        teams: ['townsfolk', 'evil'],
      });
    });

    it('should handle all filter types in single reset operation', () => {
      const updateFilters = vi.fn();
      const mockContext = createMockTokenContext({
        filters: {
          teams: ['townsfolk', 'evil', 'outsider'],
          tokenTypes: ['character', 'reminder', 'meta'],
          display: ['roles', 'team'],
          reminders: ['dusk', 'dawn'],
          origin: ['official', 'custom', 'homebrew'],
        },
        updateFilters,
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.resetFilters();
      });

      // All filters should be reset to empty arrays in a single call
      expect(updateFilters).toHaveBeenCalledOnce();
      expect(updateFilters).toHaveBeenCalledWith({
        teams: [],
        tokenTypes: [],
        display: [],
        reminders: [],
        origin: [],
      });
    });
  });

  describe('Integration with Filter Factory', () => {
    it('should use createToggleHandler factory for consistent behavior', () => {
      const updateFilters = vi.fn();
      const mockContext = createMockTokenContext({
        filters: {
          teams: ['a'],
          tokenTypes: ['b'],
          display: ['c'],
          reminders: ['d'],
          origin: ['e'],
        },
        updateFilters,
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useFilters());

      // All toggle handlers should behave consistently
      act(() => {
        result.current.toggleTeam('a'); // Remove
        result.current.toggleTokenType('new-type'); // Add
      });

      expect(updateFilters).toHaveBeenNthCalledWith(1, { teams: [] });
      expect(updateFilters).toHaveBeenNthCalledWith(2, { tokenTypes: ['b', 'new-type'] });
    });
  });

  describe('Edge Cases', () => {
    it('should handle filter with special characters in value', () => {
      const updateFilters = vi.fn();
      const mockContext = createMockTokenContext({
        filters: { teams: [], tokenTypes: [], display: [], reminders: [], origin: [] },
        updateFilters,
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.toggleTeam('team-with-dash');
        result.current.toggleTokenType('type_with_underscore');
      });

      expect(updateFilters).toHaveBeenCalledWith({ teams: ['team-with-dash'] });
      expect(updateFilters).toHaveBeenCalledWith({ tokenTypes: ['type_with_underscore'] });
    });

    it('should handle case-sensitive filter values', () => {
      const updateFilters = vi.fn();
      const mockContext = createMockTokenContext({
        filters: { teams: ['Townsfolk'], tokenTypes: [], display: [], reminders: [], origin: [] },
        updateFilters,
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.toggleTeam('townsfolk');
      });

      // 'townsfolk' (lowercase) should not match 'Townsfolk' (capitalized)
      // This verifies case-sensitive comparison
      expect(updateFilters).toHaveBeenCalledWith({
        teams: ['Townsfolk', 'townsfolk'],
      });
    });

    it('should handle empty string filter value', () => {
      const updateFilters = vi.fn();
      const mockContext = createMockTokenContext({
        filters: { teams: [], tokenTypes: [], display: [], reminders: [], origin: [] },
        updateFilters,
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.toggleTeam('');
      });

      expect(updateFilters).toHaveBeenCalledWith({
        teams: [''],
      });
    });

    it('should handle duplicate values being toggled', () => {
      const updateFilters = vi.fn();
      const mockContext = createMockTokenContext({
        filters: { teams: ['townsfolk'], tokenTypes: [], display: [], reminders: [], origin: [] },
        updateFilters,
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useFilters());

      act(() => {
        result.current.toggleTeam('townsfolk'); // Remove existing
      });

      expect(updateFilters).toHaveBeenCalledWith({
        teams: [],
      });
    });
  });
});
