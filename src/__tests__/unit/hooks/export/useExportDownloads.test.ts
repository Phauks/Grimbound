/**
 * Unit tests for useExportDownloads hook
 *
 * Tests cover:
 * - Download item generation with correct categories
 * - Featured downloads filtering
 * - Token filtering by enabled characters
 * - Download execution with loading state
 * - Download action handlers
 * - Disabled state management
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as NightOrderContextModule from '@/contexts/NightOrderContext';
import type { useTokenContext } from '@/contexts/TokenContext';
import * as TokenContextModule from '@/contexts/TokenContext';
import * as useExportModule from '@/hooks/export/useExport';
import { useExportDownloads } from '@/hooks/export/useExportDownloads';
import type { Character, Token } from '@/ts/types/index.js';

type TokenContextType = ReturnType<typeof useTokenContext>;

// Mock dependencies
vi.mock('@/ts/export/zipExporter.js', () => ({
  createTokensZip: vi.fn().mockResolvedValue(new Blob(['zip'], { type: 'application/zip' })),
  isMetaToken: vi.fn((token) =>
    ['script-name', 'almanac', 'pandemonium', 'bootlegger', 'jinx'].includes(token?.type)
  ),
  tokensToBundleData: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/ts/nightOrder/nightOrderPdfExporter.js', () => ({
  downloadNightOrderPdf: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/ts/utils/imageUtils.js', () => ({
  downloadFile: vi.fn(),
}));

vi.mock('@/ts/utils/logger.js', () => {
  const createMockLogger = () => ({
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    child: vi.fn(() => createMockLogger()),
    time: vi.fn((_name: string, _label: string, fn: () => unknown) => fn()),
  });
  return {
    logger: createMockLogger(),
  };
});

vi.mock('@/ts/utils/scriptEncoder.js', () => ({
  getOfficialScriptToolUrl: vi.fn().mockReturnValue('https://script.bloodontheclocktower.com/'),
}));

// ============================================================================
// Test Helpers
// ============================================================================

const createMockToken = (overrides: Partial<Token> = {}): Token => ({
  type: 'character',
  name: 'Test Character',
  filename: 'test-character',
  team: 'townsfolk',
  diameter: 300,
  characterData: { uuid: 'char-uuid-1' } as Token['characterData'],
  ...overrides,
});

const createMockCharacter = (overrides: Partial<Character> = {}): Character => ({
  id: 'test-character',
  name: 'Test Character',
  team: 'townsfolk',
  ability: 'Test ability',
  image: 'test.png',
  uuid: 'char-uuid-1',
  ...overrides,
});

const createMockTokenContext = (overrides = {}): TokenContextType => ({
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
});

const createMockUseExport = (overrides = {}) => ({
  downloadZip: vi.fn(),
  downloadPdf: vi.fn(),
  downloadJson: vi.fn(),
  downloadStyleFormat: vi.fn(),
  downloadAll: vi.fn(),
  cancelExport: vi.fn(),
  isExporting: false,
  exportProgress: null,
  exportStep: null,
  getBaseFilename: vi.fn(() => 'test_script'),
  ...overrides,
});

const createMockNightOrderContext = (overrides = {}) => ({
  firstNight: null,
  otherNight: null,
  isLoading: false,
  error: null,
  ...overrides,
});

// ============================================================================
// Tests
// ============================================================================

describe('useExportDownloads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ========================================================================
  // Initial State and Download Categories
  // ========================================================================

  describe('Download Categories', () => {
    it('should return all download category arrays', () => {
      const mockContext = createMockTokenContext();
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);
      vi.spyOn(useExportModule, 'useExport').mockReturnValue(createMockUseExport());
      vi.spyOn(NightOrderContextModule, 'useNightOrder').mockReturnValue(
        createMockNightOrderContext()
      );

      const { result } = renderHook(() => useExportDownloads());

      expect(result.current.downloads).toBeDefined();
      expect(result.current.featuredDownloads).toBeDefined();
      expect(result.current.jsonDownloads).toBeDefined();
      expect(result.current.tokenDownloads).toBeDefined();
      expect(result.current.scriptDownloads).toBeDefined();
      expect(result.current.executeDownload).toBeDefined();
      expect(result.current.executingId).toBeNull();
    });

    it('should separate featured downloads correctly', () => {
      const mockContext = createMockTokenContext({
        tokens: [createMockToken()],
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);
      vi.spyOn(useExportModule, 'useExport').mockReturnValue(createMockUseExport());
      vi.spyOn(NightOrderContextModule, 'useNightOrder').mockReturnValue(
        createMockNightOrderContext()
      );

      const { result } = renderHook(() => useExportDownloads());

      // Featured downloads should include print sheet, night order, and player script
      expect(result.current.featuredDownloads.length).toBeGreaterThan(0);
      expect(result.current.featuredDownloads.every((d) => d.featured)).toBe(true);
    });

    it('should separate JSON downloads correctly', () => {
      const mockContext = createMockTokenContext({
        jsonInput: '[{"id": "washerwoman"}]',
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);
      vi.spyOn(useExportModule, 'useExport').mockReturnValue(createMockUseExport());
      vi.spyOn(NightOrderContextModule, 'useNightOrder').mockReturnValue(
        createMockNightOrderContext()
      );

      const { result } = renderHook(() => useExportDownloads());

      expect(result.current.jsonDownloads.every((d) => d.category === 'json')).toBe(true);
    });

    it('should separate token downloads correctly', () => {
      const characterToken = createMockToken({
        type: 'character',
        characterData: { uuid: 'uuid-1' } as Token['characterData'],
      });
      const reminderToken = createMockToken({
        type: 'reminder',
        parentUuid: 'uuid-1',
      });

      const mockContext = createMockTokenContext({
        tokens: [characterToken, reminderToken],
        getEnabledCharacters: vi.fn(() => [createMockCharacter({ uuid: 'uuid-1' })]),
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);
      vi.spyOn(useExportModule, 'useExport').mockReturnValue(createMockUseExport());
      vi.spyOn(NightOrderContextModule, 'useNightOrder').mockReturnValue(
        createMockNightOrderContext()
      );

      const { result } = renderHook(() => useExportDownloads());

      expect(result.current.tokenDownloads.every((d) => d.category === 'tokens')).toBe(true);
    });

    it('should separate script downloads correctly', () => {
      const mockContext = createMockTokenContext({
        getEnabledCharacters: vi.fn(() => [createMockCharacter()]),
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);
      vi.spyOn(useExportModule, 'useExport').mockReturnValue(createMockUseExport());
      vi.spyOn(NightOrderContextModule, 'useNightOrder').mockReturnValue(
        createMockNightOrderContext({
          firstNight: { entries: [{ id: 'test' }] },
          otherNight: { entries: [] },
        })
      );

      const { result } = renderHook(() => useExportDownloads());

      const scriptDownloads = result.current.scriptDownloads.filter((d) => d.category === 'script');
      expect(scriptDownloads.length).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // Token Filtering
  // ========================================================================

  describe('Token Filtering', () => {
    it('should filter tokens by enabled character UUIDs', () => {
      const enabledToken = createMockToken({
        type: 'character',
        characterData: { uuid: 'enabled-uuid' } as Token['characterData'],
      });
      const disabledToken = createMockToken({
        type: 'character',
        characterData: { uuid: 'disabled-uuid' } as Token['characterData'],
      });

      const mockContext = createMockTokenContext({
        tokens: [enabledToken, disabledToken],
        getEnabledCharacters: vi.fn(() => [createMockCharacter({ uuid: 'enabled-uuid' })]),
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);
      vi.spyOn(useExportModule, 'useExport').mockReturnValue(createMockUseExport());
      vi.spyOn(NightOrderContextModule, 'useNightOrder').mockReturnValue(
        createMockNightOrderContext()
      );

      const { result } = renderHook(() => useExportDownloads());

      // Character tokens download should reflect only enabled tokens
      const charTokensDownload = result.current.tokenDownloads.find(
        (d) => d.id === 'character-tokens'
      );
      expect(charTokensDownload).toBeDefined();
      expect(charTokensDownload?.description).toContain('1 token');
    });

    it('should always include meta tokens', () => {
      const metaToken = createMockToken({
        type: 'script-name',
        name: 'Script Name',
      });

      const mockContext = createMockTokenContext({
        tokens: [metaToken],
        getEnabledCharacters: vi.fn(() => []),
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);
      vi.spyOn(useExportModule, 'useExport').mockReturnValue(createMockUseExport());
      vi.spyOn(NightOrderContextModule, 'useNightOrder').mockReturnValue(
        createMockNightOrderContext()
      );

      const { result } = renderHook(() => useExportDownloads());

      const metaTokensDownload = result.current.tokenDownloads.find((d) => d.id === 'meta-tokens');
      expect(metaTokensDownload).toBeDefined();
      expect(metaTokensDownload?.description).toContain('1 token');
    });

    it('should include reminder tokens when parent is enabled', () => {
      const reminderToken = createMockToken({
        type: 'reminder',
        parentUuid: 'enabled-parent',
      });

      const mockContext = createMockTokenContext({
        tokens: [reminderToken],
        getEnabledCharacters: vi.fn(() => [createMockCharacter({ uuid: 'enabled-parent' })]),
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);
      vi.spyOn(useExportModule, 'useExport').mockReturnValue(createMockUseExport());
      vi.spyOn(NightOrderContextModule, 'useNightOrder').mockReturnValue(
        createMockNightOrderContext()
      );

      const { result } = renderHook(() => useExportDownloads());

      const reminderTokensDownload = result.current.tokenDownloads.find(
        (d) => d.id === 'reminder-tokens'
      );
      expect(reminderTokensDownload?.description).toContain('1 token');
    });
  });

  // ========================================================================
  // Download Item Properties
  // ========================================================================

  describe('Download Item Properties', () => {
    it('should mark PDF print sheet as disabled when no tokens', () => {
      const mockContext = createMockTokenContext({
        tokens: [],
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);
      vi.spyOn(useExportModule, 'useExport').mockReturnValue(createMockUseExport());
      vi.spyOn(NightOrderContextModule, 'useNightOrder').mockReturnValue(
        createMockNightOrderContext()
      );

      const { result } = renderHook(() => useExportDownloads());

      const printSheet = result.current.featuredDownloads.find((d) => d.id === 'pdf-print-sheet');
      expect(printSheet?.disabled).toBe(true);
    });

    it('should mark night order as disabled when no night order data', () => {
      const mockContext = createMockTokenContext();
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);
      vi.spyOn(useExportModule, 'useExport').mockReturnValue(createMockUseExport());
      vi.spyOn(NightOrderContextModule, 'useNightOrder').mockReturnValue(
        createMockNightOrderContext({
          firstNight: null,
          otherNight: null,
        })
      );

      const { result } = renderHook(() => useExportDownloads());

      const nightOrder = result.current.featuredDownloads.find((d) => d.id === 'night-order-pdf');
      expect(nightOrder?.disabled).toBe(true);
    });

    it('should enable night order when night order data exists', () => {
      const mockContext = createMockTokenContext();
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);
      vi.spyOn(useExportModule, 'useExport').mockReturnValue(createMockUseExport());
      vi.spyOn(NightOrderContextModule, 'useNightOrder').mockReturnValue(
        createMockNightOrderContext({
          firstNight: { entries: [{ id: 'washerwoman', name: 'Washerwoman' }] },
          otherNight: { entries: [] },
        })
      );

      const { result } = renderHook(() => useExportDownloads());

      const nightOrder = result.current.featuredDownloads.find((d) => d.id === 'night-order-pdf');
      expect(nightOrder?.disabled).toBe(false);
    });

    it('should mark script share link as disabled when no characters', () => {
      const mockContext = createMockTokenContext({
        getEnabledCharacters: vi.fn(() => []),
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);
      vi.spyOn(useExportModule, 'useExport').mockReturnValue(createMockUseExport());
      vi.spyOn(NightOrderContextModule, 'useNightOrder').mockReturnValue(
        createMockNightOrderContext()
      );

      const { result } = renderHook(() => useExportDownloads());

      const shareLink = result.current.scriptDownloads.find((d) => d.id === 'script-share-link');
      expect(shareLink?.disabled).toBe(true);
    });

    it('should enable script share link when characters exist', () => {
      const mockContext = createMockTokenContext({
        getEnabledCharacters: vi.fn(() => [createMockCharacter()]),
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);
      vi.spyOn(useExportModule, 'useExport').mockReturnValue(createMockUseExport());
      vi.spyOn(NightOrderContextModule, 'useNightOrder').mockReturnValue(
        createMockNightOrderContext()
      );

      const { result } = renderHook(() => useExportDownloads());

      const shareLink = result.current.scriptDownloads.find((d) => d.id === 'script-share-link');
      expect(shareLink?.disabled).toBe(false);
    });

    it('should show script name in descriptions when available', () => {
      const mockContext = createMockTokenContext({
        scriptMeta: { name: 'Trouble Brewing', id: '_meta' },
        tokens: [createMockToken()],
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);
      vi.spyOn(useExportModule, 'useExport').mockReturnValue(createMockUseExport());
      vi.spyOn(NightOrderContextModule, 'useNightOrder').mockReturnValue(
        createMockNightOrderContext({
          firstNight: { entries: [{ id: 'test' }] },
          otherNight: { entries: [] },
        })
      );

      const { result } = renderHook(() => useExportDownloads());

      const nightOrder = result.current.featuredDownloads.find((d) => d.id === 'night-order-pdf');
      expect(nightOrder?.description).toBe('Trouble Brewing');
    });
  });

  // ========================================================================
  // executeDownload
  // ========================================================================

  describe('executeDownload', () => {
    it('should set executingId during download', async () => {
      const mockContext = createMockTokenContext();
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);
      vi.spyOn(useExportModule, 'useExport').mockReturnValue(createMockUseExport());
      vi.spyOn(NightOrderContextModule, 'useNightOrder').mockReturnValue(
        createMockNightOrderContext()
      );

      const { result } = renderHook(() => useExportDownloads());

      const mockItem = {
        id: 'test-download',
        icon: '📥',
        label: 'Test',
        description: 'Test download',
        action: vi.fn().mockResolvedValue(undefined),
        disabled: false,
        category: 'tokens' as const,
      };

      await act(async () => {
        await result.current.executeDownload(mockItem);
      });

      expect(mockItem.action).toHaveBeenCalled();
      expect(result.current.executingId).toBeNull(); // Reset after completion
    });

    it('should not execute disabled downloads', async () => {
      const mockContext = createMockTokenContext();
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);
      vi.spyOn(useExportModule, 'useExport').mockReturnValue(createMockUseExport());
      vi.spyOn(NightOrderContextModule, 'useNightOrder').mockReturnValue(
        createMockNightOrderContext()
      );

      const { result } = renderHook(() => useExportDownloads());

      const mockItem = {
        id: 'test-download',
        icon: '📥',
        label: 'Test',
        description: 'Test download',
        action: vi.fn(),
        disabled: true,
        category: 'tokens' as const,
      };

      await act(async () => {
        await result.current.executeDownload(mockItem);
      });

      expect(mockItem.action).not.toHaveBeenCalled();
    });

    it('should reset executingId even on error', async () => {
      const mockContext = createMockTokenContext();
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);
      vi.spyOn(useExportModule, 'useExport').mockReturnValue(createMockUseExport());
      vi.spyOn(NightOrderContextModule, 'useNightOrder').mockReturnValue(
        createMockNightOrderContext()
      );

      const { result } = renderHook(() => useExportDownloads());

      const mockItem = {
        id: 'test-download',
        icon: '📥',
        label: 'Test',
        description: 'Test download',
        action: vi.fn().mockRejectedValue(new Error('Download failed')),
        disabled: false,
        category: 'tokens' as const,
      };

      try {
        await act(async () => {
          await result.current.executeDownload(mockItem);
        });
      } catch {
        // Expected error
      }

      expect(result.current.executingId).toBeNull();
    });
  });

  // ========================================================================
  // Download Actions
  // ========================================================================

  describe('Download Actions', () => {
    it('should call downloadPdf for PDF print sheet', async () => {
      const downloadPdf = vi.fn();
      const mockContext = createMockTokenContext({
        tokens: [createMockToken()],
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);
      vi.spyOn(useExportModule, 'useExport').mockReturnValue(createMockUseExport({ downloadPdf }));
      vi.spyOn(NightOrderContextModule, 'useNightOrder').mockReturnValue(
        createMockNightOrderContext()
      );

      const { result } = renderHook(() => useExportDownloads());

      const printSheet = result.current.featuredDownloads.find((d) => d.id === 'pdf-print-sheet');

      await act(async () => {
        await printSheet?.action();
      });

      expect(downloadPdf).toHaveBeenCalled();
    });

    it('should call downloadJson for script JSON', async () => {
      const downloadJson = vi.fn();
      const mockContext = createMockTokenContext({
        jsonInput: '[{"id": "test"}]',
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);
      vi.spyOn(useExportModule, 'useExport').mockReturnValue(createMockUseExport({ downloadJson }));
      vi.spyOn(NightOrderContextModule, 'useNightOrder').mockReturnValue(
        createMockNightOrderContext()
      );

      const { result } = renderHook(() => useExportDownloads());

      const scriptJson = result.current.jsonDownloads.find((d) => d.id === 'script-json');

      await act(async () => {
        await scriptJson?.action();
      });

      expect(downloadJson).toHaveBeenCalled();
    });

    it('should call createTokensZip for character tokens', async () => {
      const characterToken = createMockToken({
        type: 'character',
        characterData: { uuid: 'uuid-1' } as Token['characterData'],
      });

      const mockContext = createMockTokenContext({
        tokens: [characterToken],
        getEnabledCharacters: vi.fn(() => [createMockCharacter({ uuid: 'uuid-1' })]),
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);
      vi.spyOn(useExportModule, 'useExport').mockReturnValue(createMockUseExport());
      vi.spyOn(NightOrderContextModule, 'useNightOrder').mockReturnValue(
        createMockNightOrderContext()
      );

      const { result } = renderHook(() => useExportDownloads());

      const charTokensDownload = result.current.tokenDownloads.find(
        (d) => d.id === 'character-tokens'
      );

      await act(async () => {
        await charTokensDownload?.action();
      });

      const { createTokensZip } = await import('@/ts/export/zipExporter.js');
      expect(createTokensZip).toHaveBeenCalled();
    });

    it('should call downloadNightOrderPdf for night order', async () => {
      const mockContext = createMockTokenContext({
        scriptMeta: { name: 'Test Script', id: '_meta' },
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);
      vi.spyOn(useExportModule, 'useExport').mockReturnValue(createMockUseExport());
      vi.spyOn(NightOrderContextModule, 'useNightOrder').mockReturnValue(
        createMockNightOrderContext({
          firstNight: { entries: [{ id: 'test' }] },
          otherNight: { entries: [] },
        })
      );

      const { result } = renderHook(() => useExportDownloads());

      const nightOrder = result.current.featuredDownloads.find((d) => d.id === 'night-order-pdf');

      await act(async () => {
        await nightOrder?.action();
      });

      const { downloadNightOrderPdf } = await import('@/ts/nightOrder/nightOrderPdfExporter.js');
      expect(downloadNightOrderPdf).toHaveBeenCalled();
    });
  });

  // ========================================================================
  // Player Script (Coming Soon)
  // ========================================================================

  describe('Player Script', () => {
    it('should mark player script as disabled with coming soon message', () => {
      const mockContext = createMockTokenContext();
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);
      vi.spyOn(useExportModule, 'useExport').mockReturnValue(createMockUseExport());
      vi.spyOn(NightOrderContextModule, 'useNightOrder').mockReturnValue(
        createMockNightOrderContext()
      );

      const { result } = renderHook(() => useExportDownloads());

      const playerScript = result.current.featuredDownloads.find((d) => d.id === 'player-script');
      expect(playerScript?.disabled).toBe(true);
      expect(playerScript?.disabledReason).toContain('soon');
    });
  });

  // ========================================================================
  // Script Share Link
  // ========================================================================

  describe('Script Share Link', () => {
    it('should create URL shortcut file on download', async () => {
      const mockContext = createMockTokenContext({
        getEnabledCharacters: vi.fn(() => [createMockCharacter()]),
        scriptMeta: { name: 'My Script', id: '_meta' },
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);
      vi.spyOn(useExportModule, 'useExport').mockReturnValue(createMockUseExport());
      vi.spyOn(NightOrderContextModule, 'useNightOrder').mockReturnValue(
        createMockNightOrderContext()
      );

      const { result } = renderHook(() => useExportDownloads());

      const shareLink = result.current.scriptDownloads.find((d) => d.id === 'script-share-link');

      await act(async () => {
        await shareLink?.action();
      });

      const { downloadFile } = await import('@/ts/utils/imageUtils.js');
      expect(downloadFile).toHaveBeenCalledWith(expect.any(Blob), expect.stringContaining('.url'));
    });

    it('should include character count in description', () => {
      const characters = [
        createMockCharacter({ uuid: 'uuid-1' }),
        createMockCharacter({ uuid: 'uuid-2' }),
        createMockCharacter({ uuid: 'uuid-3' }),
      ];

      const mockContext = createMockTokenContext({
        getEnabledCharacters: vi.fn(() => characters),
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);
      vi.spyOn(useExportModule, 'useExport').mockReturnValue(createMockUseExport());
      vi.spyOn(NightOrderContextModule, 'useNightOrder').mockReturnValue(
        createMockNightOrderContext()
      );

      const { result } = renderHook(() => useExportDownloads());

      const shareLink = result.current.scriptDownloads.find((d) => d.id === 'script-share-link');
      expect(shareLink?.description).toContain('3 characters');
    });
  });

  // ========================================================================
  // Edge Cases
  // ========================================================================

  describe('Edge Cases', () => {
    it('should handle empty token list gracefully', () => {
      const mockContext = createMockTokenContext({
        tokens: [],
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);
      vi.spyOn(useExportModule, 'useExport').mockReturnValue(createMockUseExport());
      vi.spyOn(NightOrderContextModule, 'useNightOrder').mockReturnValue(
        createMockNightOrderContext()
      );

      const { result } = renderHook(() => useExportDownloads());

      expect(result.current.downloads).toBeDefined();
      expect(result.current.downloads.length).toBeGreaterThan(0);
    });

    it('should handle null script meta', () => {
      const mockContext = createMockTokenContext({
        scriptMeta: null,
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);
      vi.spyOn(useExportModule, 'useExport').mockReturnValue(createMockUseExport());
      vi.spyOn(NightOrderContextModule, 'useNightOrder').mockReturnValue(
        createMockNightOrderContext()
      );

      const { result } = renderHook(() => useExportDownloads());

      const scriptJson = result.current.jsonDownloads.find((d) => d.id === 'script-json');
      expect(scriptJson?.description).toBe('Current script');
    });

    it('should handle exporting state from useExport', () => {
      const mockContext = createMockTokenContext({
        tokens: [createMockToken()],
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);
      vi.spyOn(useExportModule, 'useExport').mockReturnValue(
        createMockUseExport({ isExporting: true })
      );
      vi.spyOn(NightOrderContextModule, 'useNightOrder').mockReturnValue(
        createMockNightOrderContext()
      );

      const { result } = renderHook(() => useExportDownloads());

      // PDF should be disabled when exporting
      const printSheet = result.current.featuredDownloads.find((d) => d.id === 'pdf-print-sheet');
      expect(printSheet?.disabled).toBe(true);
    });

    it('should handle all meta token types correctly', () => {
      const metaTypes = ['script-name', 'almanac', 'pandemonium', 'bootlegger', 'jinx'];
      const metaTokens = metaTypes.map((type) =>
        createMockToken({ type: type as Token['type'], name: type })
      );

      const mockContext = createMockTokenContext({
        tokens: metaTokens,
        getEnabledCharacters: vi.fn(() => []),
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);
      vi.spyOn(useExportModule, 'useExport').mockReturnValue(createMockUseExport());
      vi.spyOn(NightOrderContextModule, 'useNightOrder').mockReturnValue(
        createMockNightOrderContext()
      );

      const { result } = renderHook(() => useExportDownloads());

      const metaTokensDownload = result.current.tokenDownloads.find((d) => d.id === 'meta-tokens');
      expect(metaTokensDownload?.description).toContain('5 tokens');
    });
  });
});
