/**
 * Unit tests for useScriptData hook
 *
 * Tests cover:
 * - Script loading and parsing
 * - JSON validation
 * - Error handling
 * - Example script loading
 * - Script updates via gateway
 * - Meta entry management
 * - Separator detection and removal
 * - Official data loading
 * - Sync event subscription
 *
 * @module __tests__/unit/hooks/scripts/useScriptData.test
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { useDataSync } from '@/contexts/DataSyncContext';
import * as DataSyncContextModule from '@/contexts/DataSyncContext';
import type { useTokenContext } from '@/contexts/TokenContext';
import * as TokenContextModule from '@/contexts/TokenContext';
import { useScriptData } from '@/hooks/scripts/useScriptData';
import * as characterLookupModule from '@/ts/data/characterLookup.js';
import * as dataLoaderModule from '@/ts/data/dataLoader.js';
import * as scriptParserModule from '@/ts/data/scriptParser.js';
import type { Character, ScriptMeta } from '@/ts/types/index.js';

type TokenContextType = ReturnType<typeof useTokenContext>;
type DataSyncContextType = ReturnType<typeof useDataSync>;

// Sample character data for testing
const mockCharacter: Character = {
  id: 'clockmaker',
  name: 'Clockmaker',
  team: 'townsfolk',
  ability: 'You start knowing how many steps from the Demon to its nearest Minion.',
  image: 'https://example.com/clockmaker.png',
  uuid: 'test-uuid-1',
};

const mockCharacter2: Character = {
  id: 'fortuneteller',
  name: 'Fortune Teller',
  team: 'townsfolk',
  ability: 'Each night, choose 2 players: you learn if either is a Demon.',
  image: 'https://example.com/fortuneteller.png',
  firstNight: 5,
  otherNight: 10,
  uuid: 'test-uuid-2',
};

const mockScriptMeta: ScriptMeta = {
  id: '_meta',
  name: 'Test Script',
  author: 'Test Author',
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

/**
 * Mock factory for DataSyncContext value
 */
const createMockDataSyncContext = (overrides = {}): DataSyncContextType =>
  ({
    getCharacters: vi.fn().mockResolvedValue([]),
    isInitialized: true,
    subscribeToEvents: vi.fn().mockReturnValue(() => {}),
    checkForUpdates: vi.fn(),
    forceUpdate: vi.fn(),
    syncStatus: {
      state: 'idle',
      dataSource: 'cache',
      currentVersion: null,
      availableVersion: null,
      lastSync: null,
      error: null,
    },
    resetSync: vi.fn(),
    ...overrides,
  }) as unknown as DataSyncContextType;

describe('useScriptData', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    vi.spyOn(scriptParserModule, 'validateAndParseScript').mockResolvedValue({
      characters: [],
      warnings: [],
    });
    vi.spyOn(scriptParserModule, 'extractScriptMeta').mockReturnValue(null);
    vi.spyOn(characterLookupModule.characterLookup, 'updateCharacters').mockImplementation(
      () => {}
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should return all expected functions', () => {
      const mockTokenContext = createMockTokenContext();
      const mockDataSyncContext = createMockDataSyncContext();

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);
      vi.spyOn(DataSyncContextModule, 'useDataSync').mockReturnValue(mockDataSyncContext);

      const { result } = renderHook(() => useScriptData());

      expect(result.current).toHaveProperty('loadScript');
      expect(result.current).toHaveProperty('loadExampleScriptByName');
      expect(result.current).toHaveProperty('loadOfficialData');
      expect(result.current).toHaveProperty('parseJson');
      expect(result.current).toHaveProperty('clearScript');
      expect(result.current).toHaveProperty('addMetaToScript');
      expect(result.current).toHaveProperty('hasSeparatorsInIds');
      expect(result.current).toHaveProperty('removeSeparatorsFromIds');
      expect(result.current).toHaveProperty('updateScript');
    });

    it('should have callable functions', () => {
      const mockTokenContext = createMockTokenContext();
      const mockDataSyncContext = createMockDataSyncContext();

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);
      vi.spyOn(DataSyncContextModule, 'useDataSync').mockReturnValue(mockDataSyncContext);

      const { result } = renderHook(() => useScriptData());

      expect(typeof result.current.loadScript).toBe('function');
      expect(typeof result.current.loadExampleScriptByName).toBe('function');
      expect(typeof result.current.loadOfficialData).toBe('function');
      expect(typeof result.current.parseJson).toBe('function');
      expect(typeof result.current.clearScript).toBe('function');
      expect(typeof result.current.addMetaToScript).toBe('function');
      expect(typeof result.current.hasSeparatorsInIds).toBe('function');
      expect(typeof result.current.removeSeparatorsFromIds).toBe('function');
      expect(typeof result.current.updateScript).toBe('function');
    });
  });

  describe('parseJson', () => {
    it('should clear state for empty input', async () => {
      const setCharacters = vi.fn();
      const setScriptMeta = vi.fn();
      const setWarnings = vi.fn();
      const setError = vi.fn();

      const mockTokenContext = createMockTokenContext({
        setCharacters,
        setScriptMeta,
        setWarnings,
        setError,
      });
      const mockDataSyncContext = createMockDataSyncContext();

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);
      vi.spyOn(DataSyncContextModule, 'useDataSync').mockReturnValue(mockDataSyncContext);

      const { result } = renderHook(() => useScriptData());

      await act(async () => {
        await result.current.parseJson('');
      });

      expect(setCharacters).toHaveBeenCalledWith([]);
      expect(setScriptMeta).toHaveBeenCalledWith(null);
      expect(setWarnings).toHaveBeenCalledWith([]);
      expect(setError).toHaveBeenCalledWith(null);
    });

    it('should set error for invalid JSON syntax', async () => {
      const setError = vi.fn();

      const mockTokenContext = createMockTokenContext({ setError });
      const mockDataSyncContext = createMockDataSyncContext();

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);
      vi.spyOn(DataSyncContextModule, 'useDataSync').mockReturnValue(mockDataSyncContext);

      const { result } = renderHook(() => useScriptData());

      await act(async () => {
        await result.current.parseJson('{ invalid json');
      });

      expect(setError).toHaveBeenCalled();
      const errorCall = setError.mock.calls.find((call) => call[0] !== null);
      expect(errorCall?.[0]).toBeDefined();
    });

    it('should parse valid JSON and update state', async () => {
      const setCharacters = vi.fn();
      const setScriptMeta = vi.fn();
      const setWarnings = vi.fn();
      const setError = vi.fn();

      const mockTokenContext = createMockTokenContext({
        setCharacters,
        setScriptMeta,
        setWarnings,
        setError,
        officialData: [mockCharacter],
      });
      const mockDataSyncContext = createMockDataSyncContext();

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);
      vi.spyOn(DataSyncContextModule, 'useDataSync').mockReturnValue(mockDataSyncContext);

      vi.spyOn(scriptParserModule, 'validateAndParseScript').mockResolvedValue({
        characters: [mockCharacter],
        warnings: ['Test warning'],
      });
      vi.spyOn(scriptParserModule, 'extractScriptMeta').mockReturnValue(mockScriptMeta);

      const { result } = renderHook(() => useScriptData());

      await act(async () => {
        await result.current.parseJson('["clockmaker"]');
      });

      expect(setCharacters).toHaveBeenCalledWith([mockCharacter]);
      expect(setScriptMeta).toHaveBeenCalledWith(mockScriptMeta);
      expect(setWarnings).toHaveBeenCalledWith(['Test warning']);
      expect(setError).toHaveBeenCalledWith(null);
    });

    it('should handle parse errors gracefully', async () => {
      const setError = vi.fn();

      const mockTokenContext = createMockTokenContext({ setError });
      const mockDataSyncContext = createMockDataSyncContext();

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);
      vi.spyOn(DataSyncContextModule, 'useDataSync').mockReturnValue(mockDataSyncContext);

      vi.spyOn(scriptParserModule, 'validateAndParseScript').mockRejectedValue(
        new Error('Parse error')
      );

      const { result } = renderHook(() => useScriptData());

      await act(async () => {
        await result.current.parseJson('["valid-json-but-parse-fails"]');
      });

      expect(setError).toHaveBeenCalledWith('Parse error');
    });
  });

  describe('clearScript', () => {
    it('should clear all script-related state', async () => {
      const setJsonInput = vi.fn();
      const setCharacters = vi.fn();
      const setTokens = vi.fn();
      const setScriptMeta = vi.fn();
      const setWarnings = vi.fn();
      const setError = vi.fn();
      const clearAllMetadata = vi.fn();
      const setLastGeneratedJsonHash = vi.fn();

      const mockTokenContext = createMockTokenContext({
        setJsonInput,
        setCharacters,
        setTokens,
        setScriptMeta,
        setWarnings,
        setError,
        clearAllMetadata,
        setLastGeneratedJsonHash,
      });
      const mockDataSyncContext = createMockDataSyncContext();

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);
      vi.spyOn(DataSyncContextModule, 'useDataSync').mockReturnValue(mockDataSyncContext);

      const { result } = renderHook(() => useScriptData());

      act(() => {
        result.current.clearScript();
      });

      expect(setJsonInput).toHaveBeenCalledWith('');
      expect(setCharacters).toHaveBeenCalledWith([]);
      expect(setTokens).toHaveBeenCalledWith([]);
      expect(setScriptMeta).toHaveBeenCalledWith(null);
      expect(setWarnings).toHaveBeenCalledWith([]);
      expect(setError).toHaveBeenCalledWith(null);
      expect(clearAllMetadata).toHaveBeenCalled();
      expect(setLastGeneratedJsonHash).toHaveBeenCalledWith(null);
    });
  });

  describe('hasSeparatorsInIds', () => {
    it('should return false for empty input', () => {
      const mockTokenContext = createMockTokenContext({ jsonInput: '' });
      const mockDataSyncContext = createMockDataSyncContext();

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);
      vi.spyOn(DataSyncContextModule, 'useDataSync').mockReturnValue(mockDataSyncContext);

      const { result } = renderHook(() => useScriptData());

      expect(result.current.hasSeparatorsInIds()).toBe(false);
    });

    it('should return false when no official data loaded', () => {
      const mockTokenContext = createMockTokenContext({
        jsonInput: '["fortune_teller"]',
        officialData: [],
      });
      const mockDataSyncContext = createMockDataSyncContext();

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);
      vi.spyOn(DataSyncContextModule, 'useDataSync').mockReturnValue(mockDataSyncContext);

      const { result } = renderHook(() => useScriptData());

      expect(result.current.hasSeparatorsInIds()).toBe(false);
    });

    it('should return true when ID with underscore matches official character', () => {
      const mockTokenContext = createMockTokenContext({
        jsonInput: '["fortune_teller"]',
        officialData: [{ ...mockCharacter2, id: 'fortuneteller' }],
      });
      const mockDataSyncContext = createMockDataSyncContext();

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);
      vi.spyOn(DataSyncContextModule, 'useDataSync').mockReturnValue(mockDataSyncContext);

      const { result } = renderHook(() => useScriptData());

      expect(result.current.hasSeparatorsInIds()).toBe(true);
    });

    it('should return true when ID with hyphen matches official character', () => {
      const mockTokenContext = createMockTokenContext({
        jsonInput: '["fortune-teller"]',
        officialData: [{ ...mockCharacter2, id: 'fortuneteller' }],
      });
      const mockDataSyncContext = createMockDataSyncContext();

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);
      vi.spyOn(DataSyncContextModule, 'useDataSync').mockReturnValue(mockDataSyncContext);

      const { result } = renderHook(() => useScriptData());

      expect(result.current.hasSeparatorsInIds()).toBe(true);
    });

    it('should return false when separator ID does not match official character', () => {
      const mockTokenContext = createMockTokenContext({
        jsonInput: '["custom_character"]',
        officialData: [mockCharacter],
      });
      const mockDataSyncContext = createMockDataSyncContext();

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);
      vi.spyOn(DataSyncContextModule, 'useDataSync').mockReturnValue(mockDataSyncContext);

      const { result } = renderHook(() => useScriptData());

      expect(result.current.hasSeparatorsInIds()).toBe(false);
    });

    it('should detect separators in object ID format', () => {
      const mockTokenContext = createMockTokenContext({
        jsonInput: '[{"id": "fortune_teller", "name": "Fortune Teller"}]',
        officialData: [{ ...mockCharacter2, id: 'fortuneteller' }],
      });
      const mockDataSyncContext = createMockDataSyncContext();

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);
      vi.spyOn(DataSyncContextModule, 'useDataSync').mockReturnValue(mockDataSyncContext);

      const { result } = renderHook(() => useScriptData());

      expect(result.current.hasSeparatorsInIds()).toBe(true);
    });

    it('should ignore _meta entries', () => {
      const mockTokenContext = createMockTokenContext({
        jsonInput: '[{"id": "_meta", "name": "Test Script"}]',
        officialData: [mockCharacter],
      });
      const mockDataSyncContext = createMockDataSyncContext();

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);
      vi.spyOn(DataSyncContextModule, 'useDataSync').mockReturnValue(mockDataSyncContext);

      const { result } = renderHook(() => useScriptData());

      expect(result.current.hasSeparatorsInIds()).toBe(false);
    });
  });

  describe('removeSeparatorsFromIds', () => {
    it('should do nothing for empty input', async () => {
      const mockTokenContext = createMockTokenContext({ jsonInput: '' });
      const mockDataSyncContext = createMockDataSyncContext();

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);
      vi.spyOn(DataSyncContextModule, 'useDataSync').mockReturnValue(mockDataSyncContext);

      const { result } = renderHook(() => useScriptData());

      await act(async () => {
        await result.current.removeSeparatorsFromIds();
      });

      // No error thrown, function completes silently
    });

    it('should remove underscores from string IDs', async () => {
      const setJsonInput = vi.fn();

      // Need to mock loadScript which is called by updateScript
      vi.spyOn(scriptParserModule, 'validateAndParseScript').mockResolvedValue({
        characters: [],
        warnings: [],
      });

      const mockTokenContext = createMockTokenContext({
        jsonInput: '["fortune_teller", "tea_lady"]',
        setJsonInput,
        setIsLoading: vi.fn(),
        setError: vi.fn(),
        setWarnings: vi.fn(),
        setCharacters: vi.fn(),
        setScriptMeta: vi.fn(),
        clearAllMetadata: vi.fn(),
        setLastGeneratedJsonHash: vi.fn(),
      });
      const mockDataSyncContext = createMockDataSyncContext();

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);
      vi.spyOn(DataSyncContextModule, 'useDataSync').mockReturnValue(mockDataSyncContext);

      const { result } = renderHook(() => useScriptData());

      await act(async () => {
        await result.current.removeSeparatorsFromIds();
      });

      // Check that setJsonInput was called with separators removed
      const jsonCall = setJsonInput.mock.calls.find((call) => {
        const json = call[0];
        return json.includes('fortuneteller') && json.includes('tealady');
      });
      expect(jsonCall).toBeDefined();
    });

    it('should remove hyphens from string IDs', async () => {
      const setJsonInput = vi.fn();

      vi.spyOn(scriptParserModule, 'validateAndParseScript').mockResolvedValue({
        characters: [],
        warnings: [],
      });

      const mockTokenContext = createMockTokenContext({
        jsonInput: '["fortune-teller"]',
        setJsonInput,
        setIsLoading: vi.fn(),
        setError: vi.fn(),
        setWarnings: vi.fn(),
        setCharacters: vi.fn(),
        setScriptMeta: vi.fn(),
        clearAllMetadata: vi.fn(),
        setLastGeneratedJsonHash: vi.fn(),
      });
      const mockDataSyncContext = createMockDataSyncContext();

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);
      vi.spyOn(DataSyncContextModule, 'useDataSync').mockReturnValue(mockDataSyncContext);

      const { result } = renderHook(() => useScriptData());

      await act(async () => {
        await result.current.removeSeparatorsFromIds();
      });

      const jsonCall = setJsonInput.mock.calls.find((call) => call[0].includes('fortuneteller'));
      expect(jsonCall).toBeDefined();
    });

    it('should not modify _meta entries', async () => {
      const setJsonInput = vi.fn();

      vi.spyOn(scriptParserModule, 'validateAndParseScript').mockResolvedValue({
        characters: [],
        warnings: [],
      });

      const mockTokenContext = createMockTokenContext({
        jsonInput: '[{"id": "_meta", "name": "Test_Script"}]',
        setJsonInput,
        setIsLoading: vi.fn(),
        setError: vi.fn(),
        setWarnings: vi.fn(),
        setCharacters: vi.fn(),
        setScriptMeta: vi.fn(),
        clearAllMetadata: vi.fn(),
        setLastGeneratedJsonHash: vi.fn(),
      });
      const mockDataSyncContext = createMockDataSyncContext();

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);
      vi.spyOn(DataSyncContextModule, 'useDataSync').mockReturnValue(mockDataSyncContext);

      const { result } = renderHook(() => useScriptData());

      await act(async () => {
        await result.current.removeSeparatorsFromIds();
      });

      // _meta id should remain unchanged
      const jsonCall = setJsonInput.mock.calls.find((call) => call[0].includes('_meta'));
      expect(jsonCall).toBeDefined();
    });
  });

  describe('addMetaToScript', () => {
    it('should do nothing for empty input', async () => {
      const setError = vi.fn();

      const mockTokenContext = createMockTokenContext({ jsonInput: '', setError });
      const mockDataSyncContext = createMockDataSyncContext();

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);
      vi.spyOn(DataSyncContextModule, 'useDataSync').mockReturnValue(mockDataSyncContext);

      const { result } = renderHook(() => useScriptData());

      await act(async () => {
        await result.current.addMetaToScript();
      });

      // No error should be set, function exits early
      expect(setError).not.toHaveBeenCalled();
    });

    it('should do nothing if _meta already exists', async () => {
      const setJsonInput = vi.fn();

      const mockTokenContext = createMockTokenContext({
        jsonInput: '[{"id": "_meta", "name": "Existing Script"}]',
        setJsonInput,
      });
      const mockDataSyncContext = createMockDataSyncContext();

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);
      vi.spyOn(DataSyncContextModule, 'useDataSync').mockReturnValue(mockDataSyncContext);

      const { result } = renderHook(() => useScriptData());

      await act(async () => {
        await result.current.addMetaToScript();
      });

      // setJsonInput should not be called since _meta already exists
      expect(setJsonInput).not.toHaveBeenCalled();
    });

    it('should add _meta entry with default values', async () => {
      const setJsonInput = vi.fn();

      vi.spyOn(scriptParserModule, 'validateAndParseScript').mockResolvedValue({
        characters: [],
        warnings: [],
      });

      const mockTokenContext = createMockTokenContext({
        jsonInput: '["clockmaker"]',
        characters: [mockCharacter],
        setJsonInput,
        setIsLoading: vi.fn(),
        setError: vi.fn(),
        setWarnings: vi.fn(),
        setCharacters: vi.fn(),
        setScriptMeta: vi.fn(),
        clearAllMetadata: vi.fn(),
        setLastGeneratedJsonHash: vi.fn(),
      });
      const mockDataSyncContext = createMockDataSyncContext();

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);
      vi.spyOn(DataSyncContextModule, 'useDataSync').mockReturnValue(mockDataSyncContext);

      const { result } = renderHook(() => useScriptData());

      await act(async () => {
        await result.current.addMetaToScript();
      });

      // Check that _meta was added
      const jsonCall = setJsonInput.mock.calls.find((call) => call[0].includes('_meta'));
      expect(jsonCall).toBeDefined();

      const parsedResult = JSON.parse(jsonCall[0]);
      expect(parsedResult[0].id).toBe('_meta');
      expect(parsedResult[0].name).toBe('My Custom Script');
    });

    it('should add _meta entry with provided values', async () => {
      const setJsonInput = vi.fn();

      vi.spyOn(scriptParserModule, 'validateAndParseScript').mockResolvedValue({
        characters: [],
        warnings: [],
      });

      const mockTokenContext = createMockTokenContext({
        jsonInput: '["clockmaker"]',
        characters: [mockCharacter],
        setJsonInput,
        setIsLoading: vi.fn(),
        setError: vi.fn(),
        setWarnings: vi.fn(),
        setCharacters: vi.fn(),
        setScriptMeta: vi.fn(),
        clearAllMetadata: vi.fn(),
        setLastGeneratedJsonHash: vi.fn(),
      });
      const mockDataSyncContext = createMockDataSyncContext();

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);
      vi.spyOn(DataSyncContextModule, 'useDataSync').mockReturnValue(mockDataSyncContext);

      const { result } = renderHook(() => useScriptData());

      await act(async () => {
        await result.current.addMetaToScript({
          name: 'Custom Name',
          author: 'Custom Author',
          version: '2.0.0',
        });
      });

      const jsonCall = setJsonInput.mock.calls.find((call) => call[0].includes('_meta'));
      expect(jsonCall).toBeDefined();

      const parsedResult = JSON.parse(jsonCall[0]);
      expect(parsedResult[0].name).toBe('Custom Name');
      expect(parsedResult[0].author).toBe('Custom Author');
      expect(parsedResult[0].version).toBe('2.0.0');
    });

    it('should set error for invalid JSON', async () => {
      const setError = vi.fn();

      const mockTokenContext = createMockTokenContext({
        jsonInput: 'not valid json',
        setError,
      });
      const mockDataSyncContext = createMockDataSyncContext();

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);
      vi.spyOn(DataSyncContextModule, 'useDataSync').mockReturnValue(mockDataSyncContext);

      const { result } = renderHook(() => useScriptData());

      await act(async () => {
        await result.current.addMetaToScript();
      });

      expect(setError).toHaveBeenCalledWith('Failed to add metadata: Invalid JSON');
    });
  });

  describe('loadExampleScriptByName', () => {
    it('should load example script and update state', async () => {
      const setIsLoading = vi.fn();
      const setError = vi.fn();
      const setJsonInput = vi.fn();

      vi.spyOn(dataLoaderModule, 'loadExampleScript').mockResolvedValue([
        mockCharacter,
        mockScriptMeta,
      ]);
      vi.spyOn(scriptParserModule, 'validateAndParseScript').mockResolvedValue({
        characters: [mockCharacter],
        warnings: [],
      });
      vi.spyOn(scriptParserModule, 'extractScriptMeta').mockReturnValue(mockScriptMeta);

      const mockTokenContext = createMockTokenContext({
        setIsLoading,
        setError,
        setJsonInput,
        setCharacters: vi.fn(),
        setScriptMeta: vi.fn(),
        setWarnings: vi.fn(),
        clearAllMetadata: vi.fn(),
        setLastGeneratedJsonHash: vi.fn(),
      });
      const mockDataSyncContext = createMockDataSyncContext();

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);
      vi.spyOn(DataSyncContextModule, 'useDataSync').mockReturnValue(mockDataSyncContext);

      const { result } = renderHook(() => useScriptData());

      await act(async () => {
        await result.current.loadExampleScriptByName('Test Script');
      });

      expect(setIsLoading).toHaveBeenCalledWith(true);
      expect(setError).toHaveBeenCalledWith(null);
      expect(dataLoaderModule.loadExampleScript).toHaveBeenCalledWith('Test Script');
    });

    it('should handle load error', async () => {
      const setError = vi.fn();
      const setIsLoading = vi.fn();

      vi.spyOn(dataLoaderModule, 'loadExampleScript').mockRejectedValue(
        new Error('Script not found')
      );

      const mockTokenContext = createMockTokenContext({
        setError,
        setIsLoading,
      });
      const mockDataSyncContext = createMockDataSyncContext();

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);
      vi.spyOn(DataSyncContextModule, 'useDataSync').mockReturnValue(mockDataSyncContext);

      const { result } = renderHook(() => useScriptData());

      await act(async () => {
        await result.current.loadExampleScriptByName('Nonexistent Script');
      });

      expect(setError).toHaveBeenCalledWith('Script not found');
      expect(setIsLoading).toHaveBeenCalledWith(false);
    });
  });

  describe('loadOfficialData', () => {
    it('should skip loading when sync not initialized', async () => {
      const setOfficialData = vi.fn();

      const mockTokenContext = createMockTokenContext({ setOfficialData });
      const mockDataSyncContext = createMockDataSyncContext({ isInitialized: false });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);
      vi.spyOn(DataSyncContextModule, 'useDataSync').mockReturnValue(mockDataSyncContext);

      const { result } = renderHook(() => useScriptData());

      const officialData = await act(async () => await result.current.loadOfficialData());

      expect(officialData).toEqual([]);
      expect(setOfficialData).not.toHaveBeenCalled();
    });

    it('should load and store official data when initialized', async () => {
      const setOfficialData = vi.fn();
      const mockOfficialChars = [mockCharacter, mockCharacter2];

      const mockTokenContext = createMockTokenContext({ setOfficialData });
      const mockDataSyncContext = createMockDataSyncContext({
        isInitialized: true,
        getCharacters: vi.fn().mockResolvedValue(mockOfficialChars),
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);
      vi.spyOn(DataSyncContextModule, 'useDataSync').mockReturnValue(mockDataSyncContext);

      const { result } = renderHook(() => useScriptData());

      const officialData = await act(async () => await result.current.loadOfficialData());

      expect(officialData).toEqual(mockOfficialChars);
      expect(setOfficialData).toHaveBeenCalledWith(mockOfficialChars);
    });

    it('should handle load error gracefully', async () => {
      const setOfficialData = vi.fn();

      const mockTokenContext = createMockTokenContext({ setOfficialData });
      const mockDataSyncContext = createMockDataSyncContext({
        isInitialized: true,
        getCharacters: vi.fn().mockRejectedValue(new Error('Network error')),
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);
      vi.spyOn(DataSyncContextModule, 'useDataSync').mockReturnValue(mockDataSyncContext);

      const { result } = renderHook(() => useScriptData());

      const officialData = await act(async () => await result.current.loadOfficialData());

      expect(officialData).toEqual([]);
      expect(setOfficialData).not.toHaveBeenCalled();
    });
  });

  describe('updateScript (gateway)', () => {
    it('should call clearScript for clear source', async () => {
      const setJsonInput = vi.fn();
      const setCharacters = vi.fn();
      const setTokens = vi.fn();
      const setScriptMeta = vi.fn();
      const setWarnings = vi.fn();
      const setError = vi.fn();
      const clearAllMetadata = vi.fn();
      const setLastGeneratedJsonHash = vi.fn();

      const mockTokenContext = createMockTokenContext({
        setJsonInput,
        setCharacters,
        setTokens,
        setScriptMeta,
        setWarnings,
        setError,
        clearAllMetadata,
        setLastGeneratedJsonHash,
      });
      const mockDataSyncContext = createMockDataSyncContext();

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);
      vi.spyOn(DataSyncContextModule, 'useDataSync').mockReturnValue(mockDataSyncContext);

      const { result } = renderHook(() => useScriptData());

      await act(async () => {
        await result.current.updateScript('', 'clear');
      });

      expect(setJsonInput).toHaveBeenCalledWith('');
      expect(setCharacters).toHaveBeenCalledWith([]);
      expect(clearAllMetadata).toHaveBeenCalled();
    });

    it('should call loadScript for other sources', async () => {
      const setIsLoading = vi.fn();
      const setError = vi.fn();
      const setWarnings = vi.fn();
      const setJsonInput = vi.fn();
      const setCharacters = vi.fn();
      const setScriptMeta = vi.fn();
      const clearAllMetadata = vi.fn();
      const setLastGeneratedJsonHash = vi.fn();

      vi.spyOn(scriptParserModule, 'validateAndParseScript').mockResolvedValue({
        characters: [mockCharacter],
        warnings: [],
      });

      const mockTokenContext = createMockTokenContext({
        setIsLoading,
        setError,
        setWarnings,
        setJsonInput,
        setCharacters,
        setScriptMeta,
        clearAllMetadata,
        setLastGeneratedJsonHash,
      });
      const mockDataSyncContext = createMockDataSyncContext();

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);
      vi.spyOn(DataSyncContextModule, 'useDataSync').mockReturnValue(mockDataSyncContext);

      const { result } = renderHook(() => useScriptData());

      await act(async () => {
        await result.current.updateScript('["clockmaker"]', 'format');
      });

      expect(setIsLoading).toHaveBeenCalledWith(true);
      expect(setIsLoading).toHaveBeenCalledWith(false);
    });
  });

  describe('Sync Event Subscription', () => {
    it('should subscribe to sync events on mount', () => {
      const subscribeToEvents = vi.fn().mockReturnValue(() => {});

      const mockTokenContext = createMockTokenContext();
      const mockDataSyncContext = createMockDataSyncContext({
        subscribeToEvents,
        isInitialized: true,
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);
      vi.spyOn(DataSyncContextModule, 'useDataSync').mockReturnValue(mockDataSyncContext);

      renderHook(() => useScriptData());

      expect(subscribeToEvents).toHaveBeenCalled();
    });

    it('should unsubscribe from sync events on unmount', () => {
      const unsubscribe = vi.fn();
      const subscribeToEvents = vi.fn().mockReturnValue(unsubscribe);

      const mockTokenContext = createMockTokenContext();
      const mockDataSyncContext = createMockDataSyncContext({
        subscribeToEvents,
        isInitialized: true,
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);
      vi.spyOn(DataSyncContextModule, 'useDataSync').mockReturnValue(mockDataSyncContext);

      const { unmount } = renderHook(() => useScriptData());

      unmount();

      expect(unsubscribe).toHaveBeenCalled();
    });
  });

  describe('Character Lookup Update', () => {
    it('should update character lookup when official data changes', async () => {
      const mockOfficialData = [mockCharacter, mockCharacter2];

      const mockTokenContext = createMockTokenContext({
        officialData: mockOfficialData,
      });
      const mockDataSyncContext = createMockDataSyncContext();

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);
      vi.spyOn(DataSyncContextModule, 'useDataSync').mockReturnValue(mockDataSyncContext);

      renderHook(() => useScriptData());

      await waitFor(() => {
        expect(characterLookupModule.characterLookup.updateCharacters).toHaveBeenCalledWith(
          mockOfficialData
        );
      });
    });

    it('should not update character lookup for empty official data', () => {
      const mockTokenContext = createMockTokenContext({
        officialData: [],
      });
      const mockDataSyncContext = createMockDataSyncContext();

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockTokenContext);
      vi.spyOn(DataSyncContextModule, 'useDataSync').mockReturnValue(mockDataSyncContext);

      renderHook(() => useScriptData());

      expect(characterLookupModule.characterLookup.updateCharacters).not.toHaveBeenCalled();
    });
  });
});
