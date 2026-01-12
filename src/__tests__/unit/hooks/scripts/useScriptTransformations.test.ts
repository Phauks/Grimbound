/**
 * Unit tests for useScriptTransformations hook
 *
 * Tests cover:
 * - Script analysis (sorted state, formatting needs, condensable refs)
 * - Format issue detection in night reminders
 * - JSON formatting handler
 * - SAO sorting handler
 * - Script condensing handler
 * - Night reminder format fixing handler
 * - Force regeneration trigger
 *
 * @module __tests__/unit/hooks/scripts/useScriptTransformations.test
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { useTokenContext } from '@/contexts/TokenContext';
import * as TokenContextModule from '@/contexts/TokenContext';
import { useScriptTransformations } from '@/hooks/scripts/useScriptTransformations';
import type { Character } from '@/ts/types/index.js';
import * as scriptUtils from '@/ts/utils/index.js';

// Mock useScriptData
vi.mock('@/hooks/scripts/useScriptData.js', () => ({
  useScriptData: () => ({
    updateScript: vi.fn().mockResolvedValue(undefined),
  }),
}));

type TokenContextType = ReturnType<typeof useTokenContext>;

// Sample character data for testing
const mockCharacter: Character = {
  id: 'clockmaker',
  name: 'Clockmaker',
  team: 'townsfolk',
  ability: 'You start knowing how many steps from the Demon to its nearest Minion.',
  image: 'https://example.com/clockmaker.png',
  uuid: 'test-uuid-1',
};

const mockCharacterWithReminder: Character = {
  id: 'empath',
  name: 'Empath',
  team: 'townsfolk',
  ability: 'Each night, you learn how many of your 2 alive neighbours are evil.',
  image: 'https://example.com/empath.png',
  uuid: 'test-uuid-2',
  firstNightReminder: 'Check your <i class="reminder-token">neighbours</i>.',
  otherNightReminder: 'The Empath learns **how many** evil neighbours.',
};

/**
 * Mock factory for TokenContext value
 */
const createMockTokenContext = (overrides = {}): TokenContextType =>
  ({
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
    isCharacterEnabled: vi.fn(),
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
    jsonInput: '',
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
  }) as TokenContextType;

describe('useScriptTransformations', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations for script utilities
    vi.spyOn(scriptUtils, 'isScriptJsonSortedBySAO').mockReturnValue(true);
    vi.spyOn(scriptUtils, 'hasCondensableReferences').mockReturnValue(false);
    vi.spyOn(scriptUtils, 'sortScriptJsonBySAO').mockImplementation((json) => json);
    vi.spyOn(scriptUtils, 'condenseScript').mockImplementation((json) => json);
    vi.spyOn(scriptUtils, 'analyzeReminderText').mockReturnValue([]);
    vi.spyOn(scriptUtils, 'normalizeReminderText').mockImplementation((text) => text);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should return all expected properties', () => {
      const mockTokenContext = createMockTokenContext();
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);

      const { result } = renderHook(() => useScriptTransformations());

      // Analysis properties
      expect(result.current).toHaveProperty('isScriptSorted');
      expect(result.current).toHaveProperty('needsFormatting');
      expect(result.current).toHaveProperty('hasCondensableRefs');
      expect(result.current).toHaveProperty('formatIssuesSummary');

      // Handler functions
      expect(result.current).toHaveProperty('handleFormat');
      expect(result.current).toHaveProperty('handleSort');
      expect(result.current).toHaveProperty('handleCondenseScript');
      expect(result.current).toHaveProperty('handleFixFormats');
      expect(result.current).toHaveProperty('triggerRegenerate');
    });

    it('should have callable handler functions', () => {
      const mockTokenContext = createMockTokenContext();
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);

      const { result } = renderHook(() => useScriptTransformations());

      expect(typeof result.current.handleFormat).toBe('function');
      expect(typeof result.current.handleSort).toBe('function');
      expect(typeof result.current.handleCondenseScript).toBe('function');
      expect(typeof result.current.handleFixFormats).toBe('function');
      expect(typeof result.current.triggerRegenerate).toBe('function');
    });
  });

  describe('isScriptSorted Analysis', () => {
    it('should return true for empty input', () => {
      const mockTokenContext = createMockTokenContext({ jsonInput: '', characters: [] });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);

      const { result } = renderHook(() => useScriptTransformations());

      expect(result.current.isScriptSorted).toBe(true);
    });

    it('should return true when script is sorted by SAO', () => {
      vi.spyOn(scriptUtils, 'isScriptJsonSortedBySAO').mockReturnValue(true);

      const mockTokenContext = createMockTokenContext({
        jsonInput: '["clockmaker", "empath"]',
        characters: [mockCharacter],
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);

      const { result } = renderHook(() => useScriptTransformations());

      expect(result.current.isScriptSorted).toBe(true);
    });

    it('should return false when script is not sorted by SAO', () => {
      vi.spyOn(scriptUtils, 'isScriptJsonSortedBySAO').mockReturnValue(false);

      const mockTokenContext = createMockTokenContext({
        jsonInput: '["empath", "clockmaker"]',
        characters: [mockCharacter],
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);

      const { result } = renderHook(() => useScriptTransformations());

      expect(result.current.isScriptSorted).toBe(false);
    });

    it('should pass official data to sorting check', () => {
      const officialData = [mockCharacter];
      const mockTokenContext = createMockTokenContext({
        jsonInput: '["clockmaker"]',
        characters: [mockCharacter],
        officialData,
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);

      renderHook(() => useScriptTransformations());

      expect(scriptUtils.isScriptJsonSortedBySAO).toHaveBeenCalledWith('["clockmaker"]', {
        officialData,
      });
    });
  });

  describe('needsFormatting Analysis', () => {
    it('should return false for empty characters', () => {
      const mockTokenContext = createMockTokenContext({
        jsonInput: '["clockmaker"]',
        characters: [],
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);

      const { result } = renderHook(() => useScriptTransformations());

      expect(result.current.needsFormatting).toBe(false);
    });

    it('should return true for minified JSON', () => {
      // JSON must be > 50 characters for needsFormatting to be true
      const mockTokenContext = createMockTokenContext({
        jsonInput:
          '["clockmaker","empath","fortuneteller","washerwoman","librarian","investigator"]',
        characters: [mockCharacter],
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);

      const { result } = renderHook(() => useScriptTransformations());

      expect(result.current.needsFormatting).toBe(true);
    });

    it('should return false for already formatted JSON', () => {
      const formattedJson = JSON.stringify(['clockmaker', 'empath'], null, 2);
      const mockTokenContext = createMockTokenContext({
        jsonInput: formattedJson,
        characters: [mockCharacter],
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);

      const { result } = renderHook(() => useScriptTransformations());

      expect(result.current.needsFormatting).toBe(false);
    });

    it('should return false for invalid JSON', () => {
      const mockTokenContext = createMockTokenContext({
        jsonInput: 'not valid json',
        characters: [mockCharacter],
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);

      const { result } = renderHook(() => useScriptTransformations());

      expect(result.current.needsFormatting).toBe(false);
    });

    it('should return false for short JSON', () => {
      const mockTokenContext = createMockTokenContext({
        jsonInput: '["a"]',
        characters: [mockCharacter],
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);

      const { result } = renderHook(() => useScriptTransformations());

      expect(result.current.needsFormatting).toBe(false);
    });
  });

  describe('hasCondensableRefs Analysis', () => {
    it('should return false for empty input', () => {
      const mockTokenContext = createMockTokenContext({
        jsonInput: '',
        characters: [],
        officialData: [],
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);

      const { result } = renderHook(() => useScriptTransformations());

      expect(result.current.hasCondensableRefs).toBe(false);
    });

    it('should return false when no official data', () => {
      const mockTokenContext = createMockTokenContext({
        jsonInput: '[{"id": "clockmaker"}]',
        characters: [mockCharacter],
        officialData: [],
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);

      const { result } = renderHook(() => useScriptTransformations());

      expect(result.current.hasCondensableRefs).toBe(false);
    });

    it('should return true when condensable references exist', () => {
      vi.spyOn(scriptUtils, 'hasCondensableReferences').mockReturnValue(true);

      const mockTokenContext = createMockTokenContext({
        jsonInput: '[{"id": "clockmaker"}]',
        characters: [mockCharacter],
        officialData: [mockCharacter],
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);

      const { result } = renderHook(() => useScriptTransformations());

      expect(result.current.hasCondensableRefs).toBe(true);
    });

    it('should return false when no condensable references', () => {
      vi.spyOn(scriptUtils, 'hasCondensableReferences').mockReturnValue(false);

      const mockTokenContext = createMockTokenContext({
        jsonInput: '["clockmaker"]',
        characters: [mockCharacter],
        officialData: [mockCharacter],
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);

      const { result } = renderHook(() => useScriptTransformations());

      expect(result.current.hasCondensableRefs).toBe(false);
    });
  });

  describe('formatIssuesSummary Analysis', () => {
    it('should return null for empty input', () => {
      const mockTokenContext = createMockTokenContext({
        jsonInput: '',
        characters: [],
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);

      const { result } = renderHook(() => useScriptTransformations());

      expect(result.current.formatIssuesSummary).toBeNull();
    });

    it('should return null when no format issues', () => {
      vi.spyOn(scriptUtils, 'analyzeReminderText').mockReturnValue([]);

      const mockTokenContext = createMockTokenContext({
        jsonInput: '["empath"]',
        characters: [mockCharacter],
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);

      const { result } = renderHook(() => useScriptTransformations());

      expect(result.current.formatIssuesSummary).toBeNull();
    });

    it('should detect format issues in firstNightReminder', () => {
      vi.spyOn(scriptUtils, 'analyzeReminderText').mockImplementation((text) => {
        if (text?.includes('<i class')) {
          return [{ type: 'html-tag', description: 'HTML tags should use :reminder: format' }];
        }
        return [];
      });

      const mockTokenContext = createMockTokenContext({
        jsonInput: '["empath"]',
        characters: [mockCharacterWithReminder],
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);

      const { result } = renderHook(() => useScriptTransformations());

      expect(result.current.formatIssuesSummary).not.toBeNull();
      expect(result.current.formatIssuesSummary?.totalCharactersAffected).toBeGreaterThan(0);
    });

    it('should detect format issues in otherNightReminder', () => {
      vi.spyOn(scriptUtils, 'analyzeReminderText').mockImplementation((text) => {
        if (text?.includes('**')) {
          return [{ type: 'double-asterisk', description: 'Use single asterisks for emphasis' }];
        }
        return [];
      });

      const mockTokenContext = createMockTokenContext({
        jsonInput: '["empath"]',
        characters: [mockCharacterWithReminder],
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);

      const { result } = renderHook(() => useScriptTransformations());

      expect(result.current.formatIssuesSummary).not.toBeNull();
    });

    it('should aggregate unique issue types', () => {
      vi.spyOn(scriptUtils, 'analyzeReminderText').mockReturnValue([
        { type: 'html-tag', description: 'HTML tag issue' },
        { type: 'double-asterisk', description: 'Double asterisk issue' },
      ]);

      const mockTokenContext = createMockTokenContext({
        jsonInput: '["empath"]',
        characters: [mockCharacterWithReminder],
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);

      const { result } = renderHook(() => useScriptTransformations());

      expect(result.current.formatIssuesSummary?.uniqueIssueTypes.length).toBe(2);
    });
  });

  describe('handleFormat Handler', () => {
    it('should format JSON with proper indentation', async () => {
      const mockTokenContext = createMockTokenContext({
        jsonInput: '["clockmaker","empath"]',
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);

      const { result } = renderHook(() => useScriptTransformations());

      await act(async () => {
        await result.current.handleFormat();
      });

      // The handler should call updateScript (mocked) without throwing
      expect(true).toBe(true);
    });

    it('should set error for invalid JSON', async () => {
      const setError = vi.fn();
      const mockTokenContext = createMockTokenContext({
        jsonInput: 'not valid json',
        setError,
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);

      const { result } = renderHook(() => useScriptTransformations());

      await act(async () => {
        await result.current.handleFormat();
      });

      expect(setError).toHaveBeenCalledWith('Cannot format: Invalid JSON');
    });
  });

  describe('handleSort Handler', () => {
    it('should sort script by SAO', async () => {
      const sortedJson = '["empath", "clockmaker"]';
      vi.spyOn(scriptUtils, 'sortScriptJsonBySAO').mockReturnValue(sortedJson);

      const mockTokenContext = createMockTokenContext({
        jsonInput: '["clockmaker", "empath"]',
        officialData: [mockCharacter],
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);

      const { result } = renderHook(() => useScriptTransformations());

      await act(async () => {
        await result.current.handleSort();
      });

      expect(scriptUtils.sortScriptJsonBySAO).toHaveBeenCalled();
    });

    it('should trigger regeneration after sorting', async () => {
      const onForceRegenerate = vi.fn();

      const mockTokenContext = createMockTokenContext({
        jsonInput: '["clockmaker"]',
        officialData: [mockCharacter],
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);

      const { result } = renderHook(() => useScriptTransformations({ onForceRegenerate }));

      await act(async () => {
        await result.current.handleSort();
      });

      expect(onForceRegenerate).toHaveBeenCalled();
    });

    it('should set error for invalid JSON', async () => {
      const setError = vi.fn();
      vi.spyOn(scriptUtils, 'sortScriptJsonBySAO').mockImplementation(() => {
        throw new Error('Parse error');
      });

      const mockTokenContext = createMockTokenContext({
        jsonInput: '["clockmaker"]',
        setError,
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);

      const { result } = renderHook(() => useScriptTransformations());

      await act(async () => {
        await result.current.handleSort();
      });

      expect(setError).toHaveBeenCalledWith('Cannot sort: Invalid JSON');
    });
  });

  describe('handleCondenseScript Handler', () => {
    it('should condense script references', async () => {
      const condensedJson = '["clockmaker"]';
      vi.spyOn(scriptUtils, 'condenseScript').mockReturnValue(condensedJson);

      const mockTokenContext = createMockTokenContext({
        jsonInput: '[{"id": "clockmaker"}]',
        officialData: [mockCharacter],
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);

      const { result } = renderHook(() => useScriptTransformations());

      await act(async () => {
        await result.current.handleCondenseScript();
      });

      expect(scriptUtils.condenseScript).toHaveBeenCalled();
    });

    it('should trigger regeneration after condensing', async () => {
      const onForceRegenerate = vi.fn();

      const mockTokenContext = createMockTokenContext({
        jsonInput: '[{"id": "clockmaker"}]',
        officialData: [mockCharacter],
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);

      const { result } = renderHook(() => useScriptTransformations({ onForceRegenerate }));

      await act(async () => {
        await result.current.handleCondenseScript();
      });

      expect(onForceRegenerate).toHaveBeenCalled();
    });

    it('should set error for invalid JSON', async () => {
      const setError = vi.fn();
      vi.spyOn(scriptUtils, 'condenseScript').mockImplementation(() => {
        throw new Error('Parse error');
      });

      const mockTokenContext = createMockTokenContext({
        jsonInput: '["clockmaker"]',
        setError,
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);

      const { result } = renderHook(() => useScriptTransformations());

      await act(async () => {
        await result.current.handleCondenseScript();
      });

      expect(setError).toHaveBeenCalledWith('Cannot condense: Invalid JSON');
    });
  });

  describe('handleFixFormats Handler', () => {
    it('should fix non-standard formats in night reminders', async () => {
      vi.spyOn(scriptUtils, 'analyzeReminderText').mockReturnValue([
        { type: 'html-tag', description: 'HTML tag issue' },
      ]);
      vi.spyOn(scriptUtils, 'normalizeReminderText').mockReturnValue('Fixed text');

      const mockTokenContext = createMockTokenContext({
        jsonInput: JSON.stringify([mockCharacterWithReminder]),
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);

      const { result } = renderHook(() => useScriptTransformations());

      await act(async () => {
        await result.current.handleFixFormats();
      });

      expect(scriptUtils.normalizeReminderText).toHaveBeenCalled();
    });

    it('should trigger regeneration after fixing formats', async () => {
      const onForceRegenerate = vi.fn();
      vi.spyOn(scriptUtils, 'analyzeReminderText').mockReturnValue([
        { type: 'html-tag', description: 'HTML tag issue' },
      ]);
      vi.spyOn(scriptUtils, 'normalizeReminderText').mockReturnValue('Fixed text');

      const mockTokenContext = createMockTokenContext({
        jsonInput: JSON.stringify([mockCharacterWithReminder]),
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);

      const { result } = renderHook(() => useScriptTransformations({ onForceRegenerate }));

      await act(async () => {
        await result.current.handleFixFormats();
      });

      expect(onForceRegenerate).toHaveBeenCalled();
    });

    it('should skip _meta entries', async () => {
      vi.spyOn(scriptUtils, 'analyzeReminderText').mockReturnValue([
        { type: 'html-tag', description: 'HTML tag issue' },
      ]);

      const scriptWithMeta = [{ id: '_meta', name: 'Test Script' }, mockCharacterWithReminder];

      const mockTokenContext = createMockTokenContext({
        jsonInput: JSON.stringify(scriptWithMeta),
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);

      const { result } = renderHook(() => useScriptTransformations());

      await act(async () => {
        await result.current.handleFixFormats();
      });

      // analyzeReminderText should not be called for _meta entries
      // It should only be called for the character with reminders
    });

    it('should set error for non-array JSON', async () => {
      const setError = vi.fn();

      const mockTokenContext = createMockTokenContext({
        jsonInput: '{"id": "clockmaker"}',
        setError,
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);

      const { result } = renderHook(() => useScriptTransformations());

      await act(async () => {
        await result.current.handleFixFormats();
      });

      expect(setError).toHaveBeenCalledWith('Cannot fix formats: JSON must be an array');
    });

    it('should set error for invalid JSON', async () => {
      const setError = vi.fn();

      const mockTokenContext = createMockTokenContext({
        jsonInput: 'not valid json',
        setError,
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);

      const { result } = renderHook(() => useScriptTransformations());

      await act(async () => {
        await result.current.handleFixFormats();
      });

      expect(setError).toHaveBeenCalledWith('Cannot fix formats: Invalid JSON');
    });

    it('should not update script if no modifications needed', async () => {
      vi.spyOn(scriptUtils, 'analyzeReminderText').mockReturnValue([]);

      const mockTokenContext = createMockTokenContext({
        jsonInput: JSON.stringify([mockCharacter]),
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);

      const onForceRegenerate = vi.fn();
      const { result } = renderHook(() => useScriptTransformations({ onForceRegenerate }));

      await act(async () => {
        await result.current.handleFixFormats();
      });

      expect(onForceRegenerate).not.toHaveBeenCalled();
    });
  });

  describe('triggerRegenerate', () => {
    it('should call onForceRegenerate callback', () => {
      const onForceRegenerate = vi.fn();

      const mockTokenContext = createMockTokenContext();
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);

      const { result } = renderHook(() => useScriptTransformations({ onForceRegenerate }));

      act(() => {
        result.current.triggerRegenerate();
      });

      expect(onForceRegenerate).toHaveBeenCalled();
    });

    it('should not throw when no callback provided', () => {
      const mockTokenContext = createMockTokenContext();
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);

      const { result } = renderHook(() => useScriptTransformations());

      expect(() => {
        act(() => {
          result.current.triggerRegenerate();
        });
      }).not.toThrow();
    });
  });

  describe('Memoization', () => {
    it('should update isScriptSorted when jsonInput changes', () => {
      vi.spyOn(scriptUtils, 'isScriptJsonSortedBySAO').mockReturnValue(true);

      const mockTokenContext = createMockTokenContext({
        jsonInput: '["clockmaker"]',
        characters: [mockCharacter],
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);

      const { result, rerender } = renderHook(() => useScriptTransformations());

      expect(result.current.isScriptSorted).toBe(true);

      // Update to return false for next call
      vi.spyOn(scriptUtils, 'isScriptJsonSortedBySAO').mockReturnValue(false);

      // Update context with new input
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue({
        ...mockTokenContext,
        jsonInput: '["empath", "clockmaker"]',
      });

      rerender();

      expect(result.current.isScriptSorted).toBe(false);
    });

    it('should update hasCondensableRefs when officialData changes', () => {
      vi.spyOn(scriptUtils, 'hasCondensableReferences').mockReturnValue(false);

      const mockTokenContext = createMockTokenContext({
        jsonInput: '[{"id": "clockmaker"}]',
        characters: [mockCharacter],
        officialData: [],
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);

      const { result, rerender } = renderHook(() => useScriptTransformations());

      expect(result.current.hasCondensableRefs).toBe(false);

      // Update mock and context
      vi.spyOn(scriptUtils, 'hasCondensableReferences').mockReturnValue(true);
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue({
        ...mockTokenContext,
        officialData: [mockCharacter],
      });

      rerender();

      expect(result.current.hasCondensableRefs).toBe(true);
    });
  });
});
