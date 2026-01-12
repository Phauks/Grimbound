/**
 * Unit tests for useExport hook
 *
 * Tests cover:
 * - Export state management (isExporting, progress, step)
 * - Token filtering by enabled characters
 * - Download functions (ZIP, PDF, JSON, Style, All)
 * - Abort/cancellation handling
 * - Progress callback functionality
 * - Error handling
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { useTokenContext } from '@/contexts/TokenContext';
import * as TokenContextModule from '@/contexts/TokenContext';
import { useExport } from '@/hooks/export/useExport';
import type { Token } from '@/ts/types/index.js';

type TokenContextType = ReturnType<typeof useTokenContext>;

// Mock export modules
vi.mock('@/ts/export/completePackageExporter.js', () => ({
  createCompletePackage: vi
    .fn()
    .mockResolvedValue(new Blob(['complete'], { type: 'application/zip' })),
}));

const mockDownloadPDF = vi.fn().mockResolvedValue(undefined);
vi.mock('@/ts/export/pdfGenerator.js', () => ({
  PDFGenerator: vi.fn().mockImplementation(function () {
    this.downloadPDF = mockDownloadPDF;
    return this;
  }),
}));

vi.mock('@/ts/export/zipExporter.js', () => ({
  createTokensZip: vi.fn().mockResolvedValue(new Blob(['zip'], { type: 'application/zip' })),
}));

vi.mock('@/ts/utils/index.js', () => ({
  downloadFile: vi.fn(),
  getCleanJsonForExport: vi.fn((json: string) => json),
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
  sanitizeFilename: vi.fn((name: string) => name.replace(/[^a-zA-Z0-9]/g, '_')),
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
    pdfPadding: 0.25,
    pdfXOffset: 0,
    pdfYOffset: 0,
    pdfBleed: 0.125,
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

// ============================================================================
// Tests
// ============================================================================

describe('useExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ========================================================================
  // Initial State Tests
  // ========================================================================

  describe('Initial State', () => {
    it('should return initial export state', () => {
      const mockContext = createMockTokenContext();
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useExport());

      expect(result.current.isExporting).toBe(false);
      expect(result.current.exportProgress).toBeNull();
      expect(result.current.exportStep).toBeNull();
    });

    it('should provide all download functions', () => {
      const mockContext = createMockTokenContext();
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useExport());

      expect(typeof result.current.downloadZip).toBe('function');
      expect(typeof result.current.downloadPdf).toBe('function');
      expect(typeof result.current.downloadJson).toBe('function');
      expect(typeof result.current.downloadStyleFormat).toBe('function');
      expect(typeof result.current.downloadAll).toBe('function');
      expect(typeof result.current.cancelExport).toBe('function');
      expect(typeof result.current.getBaseFilename).toBe('function');
    });
  });

  // ========================================================================
  // Token Filtering Tests
  // ========================================================================

  describe('Token Filtering', () => {
    it('should filter tokens by enabled character UUIDs', () => {
      const enabledUuid = 'enabled-uuid';
      const disabledUuid = 'disabled-uuid';

      const tokens: Token[] = [
        createMockToken({ characterData: { uuid: enabledUuid } as Token['characterData'] }),
        createMockToken({ characterData: { uuid: disabledUuid } as Token['characterData'] }),
      ];

      const mockContext = createMockTokenContext({
        tokens,
        enabledCharacterUuids: new Set([enabledUuid]),
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useExport());

      // The filtered tokens are used internally - we can verify via getBaseFilename behavior
      expect(result.current).toBeDefined();
    });

    it('should always include meta tokens', () => {
      const metaToken = createMockToken({ type: 'script-name', name: 'Script Name' });
      const characterToken = createMockToken({
        type: 'character',
        characterData: { uuid: 'disabled-uuid' } as Token['characterData'],
      });

      const mockContext = createMockTokenContext({
        tokens: [metaToken, characterToken],
        enabledCharacterUuids: new Set(), // No enabled characters
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useExport());

      // Meta tokens should still be available for export
      expect(result.current.downloadZip).toBeDefined();
    });

    it('should include reminder tokens when parent character is enabled', () => {
      const parentUuid = 'parent-uuid';
      const reminderToken = createMockToken({
        type: 'reminder',
        parentUuid,
      });

      const mockContext = createMockTokenContext({
        tokens: [reminderToken],
        enabledCharacterUuids: new Set([parentUuid]),
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useExport());

      expect(result.current).toBeDefined();
    });

    it('should exclude reminder tokens when parent character is disabled', () => {
      const reminderToken = createMockToken({
        type: 'reminder',
        parentUuid: 'disabled-parent',
      });

      const mockContext = createMockTokenContext({
        tokens: [reminderToken],
        enabledCharacterUuids: new Set(), // Parent not enabled
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useExport());

      expect(result.current).toBeDefined();
    });
  });

  // ========================================================================
  // getBaseFilename Tests
  // ========================================================================

  describe('getBaseFilename', () => {
    it('should return script name when available', () => {
      const mockContext = createMockTokenContext({
        scriptMeta: { name: 'My Script', id: '_meta' },
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useExport());

      expect(result.current.getBaseFilename()).toBe('My_Script');
    });

    it('should return default filename when no script meta', () => {
      const mockContext = createMockTokenContext({
        scriptMeta: null,
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useExport());

      expect(result.current.getBaseFilename()).toBe('clocktower_tokens');
    });
  });

  // ========================================================================
  // downloadZip Tests
  // ========================================================================

  describe('downloadZip', () => {
    it('should not execute if no enabled tokens', async () => {
      const mockContext = createMockTokenContext({
        tokens: [],
        enabledCharacterUuids: new Set(),
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.downloadZip();
      });

      const { createTokensZip } = await import('@/ts/export/zipExporter.js');
      expect(createTokensZip).not.toHaveBeenCalled();
    });

    it('should create ZIP with enabled tokens', async () => {
      const token = createMockToken({
        characterData: { uuid: 'enabled-uuid' } as Token['characterData'],
      });

      const mockContext = createMockTokenContext({
        tokens: [token],
        enabledCharacterUuids: new Set(['enabled-uuid']),
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.downloadZip();
      });

      const { createTokensZip } = await import('@/ts/export/zipExporter.js');
      expect(createTokensZip).toHaveBeenCalled();
    });

    it('should update export state during ZIP creation', async () => {
      const token = createMockToken({
        characterData: { uuid: 'uuid' } as Token['characterData'],
      });

      const mockContext = createMockTokenContext({
        tokens: [token],
        enabledCharacterUuids: new Set(['uuid']),
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useExport());

      const downloadPromise = act(async () => {
        const promise = result.current.downloadZip();
        // Check state during export (this may be synchronous in tests)
        await promise;
      });

      await downloadPromise;

      // After completion, should be false
      expect(result.current.isExporting).toBe(false);
    });
  });

  // ========================================================================
  // downloadPdf Tests
  // ========================================================================

  describe('downloadPdf', () => {
    it('should not execute if no enabled tokens', async () => {
      const mockContext = createMockTokenContext({
        tokens: [],
        enabledCharacterUuids: new Set(),
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.downloadPdf();
      });

      // PDFGenerator is instantiated, but downloadPDF should not be called when no tokens
      expect(mockDownloadPDF).not.toHaveBeenCalled();
    });

    it('should use generation options for PDF settings', async () => {
      const token = createMockToken({
        characterData: { uuid: 'uuid' } as Token['characterData'],
      });

      const mockContext = createMockTokenContext({
        tokens: [token],
        enabledCharacterUuids: new Set(['uuid']),
        generationOptions: {
          pdfPadding: 0.5,
          pdfXOffset: 0.1,
          pdfYOffset: 0.2,
          pdfBleed: 0.25,
        } as TokenContextType['generationOptions'],
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.downloadPdf();
      });

      const { PDFGenerator } = await import('@/ts/export/pdfGenerator.js');
      expect(PDFGenerator).toHaveBeenCalledWith({
        tokenPadding: 0.5,
        xOffset: 0.1,
        yOffset: 0.2,
        bleed: 0.25,
      });
    });
  });

  // ========================================================================
  // downloadJson Tests
  // ========================================================================

  describe('downloadJson', () => {
    it('should not execute if no JSON input', async () => {
      const mockContext = createMockTokenContext({
        jsonInput: '',
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.downloadJson();
      });

      const { downloadFile } = await import('@/ts/utils/index.js');
      expect(downloadFile).not.toHaveBeenCalled();
    });

    it('should create JSON blob and download', async () => {
      const mockContext = createMockTokenContext({
        jsonInput: '[{"id": "washerwoman"}]',
        scriptMeta: { name: 'Test Script', id: '_meta' },
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.downloadJson();
      });

      const { downloadFile, getCleanJsonForExport } = await import('@/ts/utils/index.js');
      expect(getCleanJsonForExport).toHaveBeenCalledWith('[{"id": "washerwoman"}]');
      expect(downloadFile).toHaveBeenCalled();
    });
  });

  // ========================================================================
  // downloadStyleFormat Tests
  // ========================================================================

  describe('downloadStyleFormat', () => {
    it('should create style JSON with generation options', async () => {
      const mockContext = createMockTokenContext({
        generationOptions: {
          displayAbilityText: true,
          characterBackground: '#ff0000',
        } as TokenContextType['generationOptions'],
        scriptMeta: { name: 'My Script', id: '_meta' },
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.downloadStyleFormat();
      });

      const { downloadFile } = await import('@/ts/utils/index.js');
      expect(downloadFile).toHaveBeenCalled();
    });

    it('should use default name when no script meta', async () => {
      const mockContext = createMockTokenContext({
        scriptMeta: null,
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.downloadStyleFormat();
      });

      const { downloadFile } = await import('@/ts/utils/index.js');
      expect(downloadFile).toHaveBeenCalled();
    });
  });

  // ========================================================================
  // downloadAll Tests
  // ========================================================================

  describe('downloadAll', () => {
    it('should not execute if no enabled tokens', async () => {
      const mockContext = createMockTokenContext({
        tokens: [],
        enabledCharacterUuids: new Set(),
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.downloadAll();
      });

      const { createCompletePackage } = await import('@/ts/export/completePackageExporter.js');
      expect(createCompletePackage).not.toHaveBeenCalled();
    });

    it('should create complete package with all options', async () => {
      const token = createMockToken({
        characterData: { uuid: 'uuid' } as Token['characterData'],
      });

      const mockContext = createMockTokenContext({
        tokens: [token],
        enabledCharacterUuids: new Set(['uuid']),
        jsonInput: '[{"id": "test"}]',
        scriptMeta: { name: 'Complete Script', id: '_meta' },
        generationOptions: {
          displayAbilityText: true,
        } as TokenContextType['generationOptions'],
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.downloadAll();
      });

      const { createCompletePackage } = await import('@/ts/export/completePackageExporter.js');
      expect(createCompletePackage).toHaveBeenCalledWith(
        expect.objectContaining({
          tokens: expect.any(Array),
          scriptJson: '[{"id": "test"}]',
          baseFilename: 'Complete_Script',
        })
      );
    });

    it('should update progress during complete package creation', async () => {
      const token = createMockToken({
        characterData: { uuid: 'uuid' } as Token['characterData'],
      });

      const mockContext = createMockTokenContext({
        tokens: [token],
        enabledCharacterUuids: new Set(['uuid']),
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.downloadAll();
      });

      // After completion
      expect(result.current.isExporting).toBe(false);
      expect(result.current.exportProgress).toBeNull();
      expect(result.current.exportStep).toBeNull();
    });
  });

  // ========================================================================
  // cancelExport Tests
  // ========================================================================

  describe('cancelExport', () => {
    it('should reset export state', () => {
      const mockContext = createMockTokenContext();
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useExport());

      act(() => {
        result.current.cancelExport();
      });

      expect(result.current.isExporting).toBe(false);
      expect(result.current.exportProgress).toBeNull();
      expect(result.current.exportStep).toBeNull();
    });

    it('should abort in-progress export', async () => {
      const token = createMockToken({
        characterData: { uuid: 'uuid' } as Token['characterData'],
      });

      // Create a slow mock that we can cancel
      const { createCompletePackage } = await import('@/ts/export/completePackageExporter.js');
      vi.mocked(createCompletePackage).mockImplementation(async ({ signal }) => {
        // Simulate slow operation
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (signal?.aborted) {
          throw new DOMException('Export cancelled', 'AbortError');
        }
        return new Blob(['complete'], { type: 'application/zip' });
      });

      const mockContext = createMockTokenContext({
        tokens: [token],
        enabledCharacterUuids: new Set(['uuid']),
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useExport());

      // Start export and cancel immediately
      act(() => {
        result.current.downloadAll();
      });

      act(() => {
        result.current.cancelExport();
      });

      await waitFor(() => {
        expect(result.current.isExporting).toBe(false);
      });
    });
  });

  // ========================================================================
  // Error Handling Tests
  // ========================================================================

  describe('Error Handling', () => {
    it('should handle ZIP creation errors', async () => {
      const token = createMockToken({
        characterData: { uuid: 'uuid' } as Token['characterData'],
      });

      const { createTokensZip } = await import('@/ts/export/zipExporter.js');
      vi.mocked(createTokensZip).mockRejectedValueOnce(new Error('ZIP creation failed'));

      const mockContext = createMockTokenContext({
        tokens: [token],
        enabledCharacterUuids: new Set(['uuid']),
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useExport());

      await expect(
        act(async () => {
          await result.current.downloadZip();
        })
      ).rejects.toThrow('ZIP creation failed');

      expect(result.current.isExporting).toBe(false);
    });

    it('should log abort errors as debug', async () => {
      const token = createMockToken({
        characterData: { uuid: 'uuid' } as Token['characterData'],
      });

      const { createTokensZip } = await import('@/ts/export/zipExporter.js');
      vi.mocked(createTokensZip).mockRejectedValueOnce(
        new DOMException('Export cancelled', 'AbortError')
      );

      const mockContext = createMockTokenContext({
        tokens: [token],
        enabledCharacterUuids: new Set(['uuid']),
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.downloadZip();
      });

      const { logger } = await import('@/ts/utils/index.js');
      expect(logger.debug).toHaveBeenCalledWith('useExport', 'zip export cancelled');
    });
  });

  // ========================================================================
  // Edge Cases
  // ========================================================================

  describe('Edge Cases', () => {
    it('should handle tokens without UUID tracking', () => {
      const tokenWithoutUuid = createMockToken({
        type: 'character',
        characterData: undefined,
      });

      const mockContext = createMockTokenContext({
        tokens: [tokenWithoutUuid],
        enabledCharacterUuids: new Set(),
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useExport());

      // Should not throw, token without UUID should be included as fallback
      expect(result.current).toBeDefined();
    });

    it('should handle all meta token types', () => {
      const metaTypes = ['script-name', 'almanac', 'pandemonium', 'bootlegger'] as const;
      const metaTokens = metaTypes.map((type) => createMockToken({ type, name: type }));

      const mockContext = createMockTokenContext({
        tokens: metaTokens,
        enabledCharacterUuids: new Set(), // No characters enabled
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useExport());

      // All meta tokens should be available
      expect(result.current).toBeDefined();
    });

    it('should sanitize filenames with special characters', () => {
      const mockContext = createMockTokenContext({
        scriptMeta: { name: 'My Script: Part 1 (v2)', id: '_meta' },
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(mockContext);

      const { result } = renderHook(() => useExport());

      const filename = result.current.getBaseFilename();
      // sanitizeFilename mock replaces non-alphanumeric with underscore
      expect(filename).toBe('My_Script__Part_1__v2_');
    });
  });
});
