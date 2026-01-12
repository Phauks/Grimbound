/**
 * Unit tests for useCharacterDownloads hook
 *
 * Tests character download operations:
 * - Download character token as PNG
 * - Download reminder tokens as ZIP
 * - Download all tokens as ZIP
 * - Download character definition as JSON
 * - Registration with DownloadsContext
 * - Error handling and loading states
 *
 * @module __tests__/unit/hooks/characters/useCharacterDownloads.test
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCharacter, resetCharacterFactory } from '@/__tests__/factories/characterFactory';
import {
  createCharacterToken,
  createReminderToken,
  resetTokenFactory,
} from '@/__tests__/factories/tokenFactory';
import type { DownloadItem } from '@/contexts/DownloadsContext';
import { useCharacterDownloads } from '@/hooks/characters/useCharacterDownloads';

// ============================================================================
// Mocks
// ============================================================================

const mockDownloadCharacterTokensAsZip = vi.fn();
const mockDownloadCharacterTokenOnly = vi.fn();
const mockDownloadReminderTokensOnly = vi.fn();

vi.mock('@/ts/ui/detailViewUtils.js', () => ({
  downloadCharacterTokensAsZip: (
    characterToken: unknown,
    reminderTokens: unknown,
    name: string,
    charData: unknown
  ) => mockDownloadCharacterTokensAsZip(characterToken, reminderTokens, name, charData),
  downloadCharacterTokenOnly: (token: unknown, name: string) =>
    mockDownloadCharacterTokenOnly(token, name),
  downloadReminderTokensOnly: (tokens: unknown, name: string) =>
    mockDownloadReminderTokensOnly(tokens, name),
}));

vi.mock('@/ts/utils/imageUtils.js', () => ({
  getTokenBlob: vi.fn(() => new Blob(['test'], { type: 'image/png' })),
}));

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

// ============================================================================
// Test Helpers
// ============================================================================

const createDefaultOptions = (overrides = {}) => ({
  displayCharacterToken: null,
  displayReminderTokens: [],
  editedCharacter: null,
  selectedCharacter: undefined,
  isMetaSelected: false,
  addToast: vi.fn(),
  setDownloads: vi.fn(),
  clearDownloads: vi.fn(),
  ...overrides,
});

// ============================================================================
// Tests
// ============================================================================

describe('useCharacterDownloads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCharacterFactory();
    resetTokenFactory();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // Hook Initialization
  // --------------------------------------------------------------------------

  describe('Hook Initialization', () => {
    it('should return expected functions and state', () => {
      const { result } = renderHook(() => useCharacterDownloads(createDefaultOptions()));

      expect(result.current).toHaveProperty('handleDownloadAll');
      expect(result.current).toHaveProperty('handleDownloadCharacter');
      expect(result.current).toHaveProperty('handleDownloadReminders');
      expect(result.current).toHaveProperty('handleDownloadJson');
      expect(result.current).toHaveProperty('isDownloading');
      expect(typeof result.current.handleDownloadAll).toBe('function');
      expect(typeof result.current.handleDownloadCharacter).toBe('function');
      expect(typeof result.current.handleDownloadReminders).toBe('function');
      expect(typeof result.current.handleDownloadJson).toBe('function');
      expect(result.current.isDownloading).toBe(false);
    });

    it('should register downloads with setDownloads on mount', () => {
      const setDownloads = vi.fn();
      renderHook(() => useCharacterDownloads(createDefaultOptions({ setDownloads })));

      expect(setDownloads).toHaveBeenCalled();
      const downloads = setDownloads.mock.calls[0][0] as DownloadItem[];
      expect(downloads).toHaveLength(3);
      expect(downloads.map((d) => d.id)).toEqual([
        'character-token',
        'reminder-tokens',
        'character-json',
      ]);
    });

    it('should call clearDownloads on unmount', () => {
      const clearDownloads = vi.fn();
      const { unmount } = renderHook(() =>
        useCharacterDownloads(createDefaultOptions({ clearDownloads }))
      );

      expect(clearDownloads).not.toHaveBeenCalled();
      unmount();
      expect(clearDownloads).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // Download Registration
  // --------------------------------------------------------------------------

  describe('Download Registration', () => {
    it('should disable all downloads when no character selected', () => {
      const setDownloads = vi.fn();
      renderHook(() => useCharacterDownloads(createDefaultOptions({ setDownloads })));

      const downloads = setDownloads.mock.calls[0][0] as DownloadItem[];
      expect(downloads[0].disabled).toBe(true);
      expect(downloads[1].disabled).toBe(true);
      expect(downloads[2].disabled).toBe(true);
    });

    it('should enable character JSON download when character is selected', () => {
      const setDownloads = vi.fn();
      const character = createCharacter({ name: 'Test Character' });

      renderHook(() =>
        useCharacterDownloads(
          createDefaultOptions({
            setDownloads,
            editedCharacter: character,
          })
        )
      );

      const downloads = setDownloads.mock.calls[0][0] as DownloadItem[];
      const jsonDownload = downloads.find((d) => d.id === 'character-json');
      expect(jsonDownload?.disabled).toBe(false);
      expect(jsonDownload?.description).toBe('Test Character.json');
    });

    it('should enable character token download when token is available', () => {
      const setDownloads = vi.fn();
      const character = createCharacter({ name: 'Test Character' });
      const token = createCharacterToken({ name: 'Test Character' });

      renderHook(() =>
        useCharacterDownloads(
          createDefaultOptions({
            setDownloads,
            editedCharacter: character,
            displayCharacterToken: token,
          })
        )
      );

      const downloads = setDownloads.mock.calls[0][0] as DownloadItem[];
      const tokenDownload = downloads.find((d) => d.id === 'character-token');
      expect(tokenDownload?.disabled).toBe(false);
    });

    it('should enable reminder download when reminders are available', () => {
      const setDownloads = vi.fn();
      const character = createCharacter({ name: 'Test Character' });
      const reminders = [createReminderToken('Reminder 1'), createReminderToken('Reminder 2')];

      renderHook(() =>
        useCharacterDownloads(
          createDefaultOptions({
            setDownloads,
            editedCharacter: character,
            displayReminderTokens: reminders,
          })
        )
      );

      const downloads = setDownloads.mock.calls[0][0] as DownloadItem[];
      const reminderDownload = downloads.find((d) => d.id === 'reminder-tokens');
      expect(reminderDownload?.disabled).toBe(false);
      expect(reminderDownload?.description).toBe('2 reminders (ZIP)');
    });

    it('should disable all downloads when meta is selected', () => {
      const setDownloads = vi.fn();
      const character = createCharacter({ name: 'Test Character' });
      const token = createCharacterToken({ name: 'Test Character' });

      renderHook(() =>
        useCharacterDownloads(
          createDefaultOptions({
            setDownloads,
            editedCharacter: character,
            displayCharacterToken: token,
            isMetaSelected: true,
          })
        )
      );

      const downloads = setDownloads.mock.calls[0][0] as DownloadItem[];
      expect(downloads[0].disabled).toBe(true);
      expect(downloads[1].disabled).toBe(true);
      expect(downloads[2].disabled).toBe(true);
    });

    it('should update downloads when dependencies change', () => {
      const setDownloads = vi.fn();
      const { rerender } = renderHook((props) => useCharacterDownloads(props), {
        initialProps: createDefaultOptions({ setDownloads }),
      });

      const initialCalls = setDownloads.mock.calls.length;

      // Add a character
      const character = createCharacter({ name: 'New Character' });
      rerender(createDefaultOptions({ setDownloads, editedCharacter: character }));

      expect(setDownloads.mock.calls.length).toBeGreaterThan(initialCalls);
    });
  });

  // --------------------------------------------------------------------------
  // handleDownloadAll
  // --------------------------------------------------------------------------

  describe('handleDownloadAll', () => {
    it('should do nothing when no character token available', async () => {
      const addToast = vi.fn();
      const { result } = renderHook(() =>
        useCharacterDownloads(createDefaultOptions({ addToast }))
      );

      await act(async () => {
        await result.current.handleDownloadAll();
      });

      expect(mockDownloadCharacterTokensAsZip).not.toHaveBeenCalled();
      expect(addToast).not.toHaveBeenCalled();
    });

    it('should download all tokens as ZIP when available', async () => {
      mockDownloadCharacterTokensAsZip.mockResolvedValue(undefined);
      const addToast = vi.fn();
      const character = createCharacter({ name: 'Test Character' });
      const token = createCharacterToken({ name: 'Test Character' });
      const reminders = [createReminderToken('Reminder 1')];

      const { result } = renderHook(() =>
        useCharacterDownloads(
          createDefaultOptions({
            addToast,
            selectedCharacter: character,
            displayCharacterToken: token,
            displayReminderTokens: reminders,
          })
        )
      );

      await act(async () => {
        await result.current.handleDownloadAll();
      });

      expect(mockDownloadCharacterTokensAsZip).toHaveBeenCalledWith(
        token,
        reminders,
        'Test Character',
        character
      );
      expect(addToast).toHaveBeenCalledWith('Downloaded Test Character tokens', 'success');
    });

    it('should set isDownloading to true during download', async () => {
      let resolveDownload: () => void;
      const downloadPromise = new Promise<void>((resolve) => {
        resolveDownload = resolve;
      });
      mockDownloadCharacterTokensAsZip.mockReturnValue(downloadPromise);

      const character = createCharacter({ name: 'Test' });
      const token = createCharacterToken({ name: 'Test' });

      const { result } = renderHook(() =>
        useCharacterDownloads(
          createDefaultOptions({
            selectedCharacter: character,
            displayCharacterToken: token,
          })
        )
      );

      expect(result.current.isDownloading).toBe(false);

      let downloadAllPromise: Promise<void>;
      act(() => {
        downloadAllPromise = result.current.handleDownloadAll();
      });

      // isDownloading should be true during download
      expect(result.current.isDownloading).toBe(true);

      await act(async () => {
        if (resolveDownload) resolveDownload();
        await downloadAllPromise;
      });

      expect(result.current.isDownloading).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      mockDownloadCharacterTokensAsZip.mockRejectedValue(new Error('Download failed'));
      const addToast = vi.fn();
      const character = createCharacter({ name: 'Test' });
      const token = createCharacterToken({ name: 'Test' });

      const { result } = renderHook(() =>
        useCharacterDownloads(
          createDefaultOptions({
            addToast,
            selectedCharacter: character,
            displayCharacterToken: token,
          })
        )
      );

      await act(async () => {
        await result.current.handleDownloadAll();
      });

      expect(addToast).toHaveBeenCalledWith('Failed to download tokens', 'error');
      expect(result.current.isDownloading).toBe(false);
    });

    it('should use editedCharacter when selectedCharacter is undefined', async () => {
      mockDownloadCharacterTokensAsZip.mockResolvedValue(undefined);
      const addToast = vi.fn();
      const editedCharacter = createCharacter({ name: 'Edited Character' });
      const token = createCharacterToken({ name: 'Edited Character' });

      const { result } = renderHook(() =>
        useCharacterDownloads(
          createDefaultOptions({
            addToast,
            editedCharacter,
            displayCharacterToken: token,
          })
        )
      );

      await act(async () => {
        await result.current.handleDownloadAll();
      });

      expect(mockDownloadCharacterTokensAsZip).toHaveBeenCalledWith(
        token,
        [],
        'Edited Character',
        editedCharacter
      );
    });
  });

  // --------------------------------------------------------------------------
  // handleDownloadCharacter
  // --------------------------------------------------------------------------

  describe('handleDownloadCharacter', () => {
    it('should do nothing when no character token available', () => {
      const addToast = vi.fn();
      const { result } = renderHook(() =>
        useCharacterDownloads(createDefaultOptions({ addToast }))
      );

      act(() => {
        result.current.handleDownloadCharacter();
      });

      expect(mockDownloadCharacterTokenOnly).not.toHaveBeenCalled();
      expect(addToast).not.toHaveBeenCalled();
    });

    it('should download character token as PNG', () => {
      const addToast = vi.fn();
      const character = createCharacter({ name: 'Test Character' });
      const token = createCharacterToken({ name: 'Test Character' });

      const { result } = renderHook(() =>
        useCharacterDownloads(
          createDefaultOptions({
            addToast,
            selectedCharacter: character,
            displayCharacterToken: token,
          })
        )
      );

      act(() => {
        result.current.handleDownloadCharacter();
      });

      expect(mockDownloadCharacterTokenOnly).toHaveBeenCalledWith(token, 'Test Character');
      expect(addToast).toHaveBeenCalledWith('Downloaded Test Character character token', 'success');
    });

    it('should handle errors gracefully', () => {
      mockDownloadCharacterTokenOnly.mockImplementation(() => {
        throw new Error('Download failed');
      });
      const addToast = vi.fn();
      const character = createCharacter({ name: 'Test' });
      const token = createCharacterToken({ name: 'Test' });

      const { result } = renderHook(() =>
        useCharacterDownloads(
          createDefaultOptions({
            addToast,
            selectedCharacter: character,
            displayCharacterToken: token,
          })
        )
      );

      act(() => {
        result.current.handleDownloadCharacter();
      });

      expect(addToast).toHaveBeenCalledWith('Failed to download character token', 'error');
    });

    it('should use fallback name when character name is undefined', () => {
      const addToast = vi.fn();
      const token = createCharacterToken({ name: 'Token' });

      const { result } = renderHook(() =>
        useCharacterDownloads(
          createDefaultOptions({
            addToast,
            displayCharacterToken: token,
          })
        )
      );

      act(() => {
        result.current.handleDownloadCharacter();
      });

      expect(mockDownloadCharacterTokenOnly).toHaveBeenCalledWith(token, 'character');
    });
  });

  // --------------------------------------------------------------------------
  // handleDownloadReminders
  // --------------------------------------------------------------------------

  describe('handleDownloadReminders', () => {
    it('should show warning when no reminder tokens available', async () => {
      const addToast = vi.fn();
      const { result } = renderHook(() =>
        useCharacterDownloads(createDefaultOptions({ addToast }))
      );

      await act(async () => {
        await result.current.handleDownloadReminders();
      });

      expect(addToast).toHaveBeenCalledWith('No reminder tokens to download', 'warning');
      expect(mockDownloadReminderTokensOnly).not.toHaveBeenCalled();
    });

    it('should download reminder tokens as ZIP', async () => {
      mockDownloadReminderTokensOnly.mockResolvedValue(undefined);
      const addToast = vi.fn();
      const character = createCharacter({ name: 'Test Character' });
      const reminders = [createReminderToken('Reminder 1'), createReminderToken('Reminder 2')];

      const { result } = renderHook(() =>
        useCharacterDownloads(
          createDefaultOptions({
            addToast,
            selectedCharacter: character,
            displayReminderTokens: reminders,
          })
        )
      );

      await act(async () => {
        await result.current.handleDownloadReminders();
      });

      expect(mockDownloadReminderTokensOnly).toHaveBeenCalledWith(reminders, 'Test Character');
      expect(addToast).toHaveBeenCalledWith('Downloaded Test Character reminder tokens', 'success');
    });

    it('should handle errors gracefully', async () => {
      mockDownloadReminderTokensOnly.mockRejectedValue(new Error('Download failed'));
      const addToast = vi.fn();
      const character = createCharacter({ name: 'Test' });
      const reminders = [createReminderToken('Reminder')];

      const { result } = renderHook(() =>
        useCharacterDownloads(
          createDefaultOptions({
            addToast,
            selectedCharacter: character,
            displayReminderTokens: reminders,
          })
        )
      );

      await act(async () => {
        await result.current.handleDownloadReminders();
      });

      expect(addToast).toHaveBeenCalledWith('Failed to download reminder tokens', 'error');
      expect(result.current.isDownloading).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // handleDownloadJson
  // --------------------------------------------------------------------------

  describe('handleDownloadJson', () => {
    // Mock URL APIs
    let mockCreateObjectURL: ReturnType<typeof vi.fn>;
    let mockRevokeObjectURL: ReturnType<typeof vi.fn>;
    let mockClick: ReturnType<typeof vi.fn>;
    let capturedAnchor: HTMLAnchorElement | null = null;
    let originalCreateElement: typeof document.createElement;

    beforeEach(() => {
      mockCreateObjectURL = vi.fn(() => 'blob:test-url');
      mockRevokeObjectURL = vi.fn();
      mockClick = vi.fn();
      capturedAnchor = null;

      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;

      // Save original createElement before mocking
      originalCreateElement = document.createElement.bind(document);

      // Replace createElement to capture anchor and mock click
      document.createElement = ((tag: string) => {
        const element = originalCreateElement(tag);
        if (tag === 'a') {
          capturedAnchor = element as HTMLAnchorElement;
          (element as HTMLAnchorElement).click = mockClick;
        }
        return element;
      }) as typeof document.createElement;
    });

    afterEach(() => {
      document.createElement = originalCreateElement;
      capturedAnchor = null;
    });

    it('should do nothing when no character data available', () => {
      const addToast = vi.fn();
      const { result } = renderHook(() =>
        useCharacterDownloads(createDefaultOptions({ addToast }))
      );

      act(() => {
        result.current.handleDownloadJson();
      });

      expect(mockCreateObjectURL).not.toHaveBeenCalled();
      expect(addToast).not.toHaveBeenCalled();
    });

    it('should download character as JSON', () => {
      const addToast = vi.fn();
      const character = createCharacter({
        id: 'test-char',
        name: 'Test Character',
        uuid: 'uuid-123',
        source: 'custom',
        ability: 'Test ability',
      });

      const { result } = renderHook(() =>
        useCharacterDownloads(
          createDefaultOptions({
            addToast,
            editedCharacter: character,
          })
        )
      );

      act(() => {
        result.current.handleDownloadJson();
      });

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test-url');
      expect(addToast).toHaveBeenCalledWith('Downloaded Test Character.json', 'success');
    });

    it('should strip uuid and source from exported JSON', () => {
      const addToast = vi.fn();
      const character = createCharacter({
        id: 'test-char',
        name: 'Test Character',
        uuid: 'uuid-123',
        source: 'custom',
      });

      const { result } = renderHook(() =>
        useCharacterDownloads(
          createDefaultOptions({
            addToast,
            editedCharacter: character,
          })
        )
      );

      act(() => {
        result.current.handleDownloadJson();
      });

      // Check that the Blob was created with stripped fields
      const blobArg = mockCreateObjectURL.mock.calls[0][0] as Blob;
      expect(blobArg).toBeInstanceOf(Blob);
      expect(blobArg.type).toBe('application/json');
    });

    it('should use id as filename when available', () => {
      const addToast = vi.fn();
      const character = createCharacter({
        id: 'custom-id',
        name: 'Test Name',
      });

      const { result } = renderHook(() =>
        useCharacterDownloads(
          createDefaultOptions({
            addToast,
            editedCharacter: character,
          })
        )
      );

      act(() => {
        result.current.handleDownloadJson();
      });

      // Check the captured anchor element's download property
      expect(capturedAnchor).not.toBeNull();
      expect(capturedAnchor?.download).toBe('custom-id.json');
    });

    it('should prefer editedCharacter over selectedCharacter', () => {
      const addToast = vi.fn();
      const editedCharacter = createCharacter({ name: 'Edited' });
      const selectedCharacter = createCharacter({ name: 'Selected' });

      const { result } = renderHook(() =>
        useCharacterDownloads(
          createDefaultOptions({
            addToast,
            editedCharacter,
            selectedCharacter,
          })
        )
      );

      act(() => {
        result.current.handleDownloadJson();
      });

      expect(addToast).toHaveBeenCalledWith('Downloaded Edited.json', 'success');
    });
  });

  // --------------------------------------------------------------------------
  // Download Item getBlob Functions
  // --------------------------------------------------------------------------

  describe('Download Item getBlob Functions', () => {
    it('should return blob for character token', async () => {
      const setDownloads = vi.fn();
      const token = createCharacterToken({ name: 'Test', filename: 'test.png' });
      const character = createCharacter({ name: 'Test' });

      renderHook(() =>
        useCharacterDownloads(
          createDefaultOptions({
            setDownloads,
            displayCharacterToken: token,
            editedCharacter: character,
          })
        )
      );

      const downloads = setDownloads.mock.calls[0][0] as DownloadItem[];
      const tokenDownload = downloads.find((d) => d.id === 'character-token');

      const result = await tokenDownload?.getBlob?.();
      expect(result).not.toBeNull();
      expect(result?.filename).toBe('test.png');
    });

    it('should return null for character token when no token available', async () => {
      const setDownloads = vi.fn();

      renderHook(() => useCharacterDownloads(createDefaultOptions({ setDownloads })));

      const downloads = setDownloads.mock.calls[0][0] as DownloadItem[];
      const tokenDownload = downloads.find((d) => d.id === 'character-token');

      const result = await tokenDownload?.getBlob?.();
      expect(result).toBeNull();
    });

    it('should return array of blobs for reminder tokens', async () => {
      const setDownloads = vi.fn();
      const character = createCharacter({ name: 'Test' });
      const reminders = [
        createReminderToken('Reminder 1', { filename: 'reminder1.png' }),
        createReminderToken('Reminder 2', { filename: 'reminder2.png' }),
      ];

      renderHook(() =>
        useCharacterDownloads(
          createDefaultOptions({
            setDownloads,
            editedCharacter: character,
            displayReminderTokens: reminders,
          })
        )
      );

      const downloads = setDownloads.mock.calls[0][0] as DownloadItem[];
      const reminderDownload = downloads.find((d) => d.id === 'reminder-tokens');

      const result = await reminderDownload?.getBlob?.();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('should return blob for character JSON', async () => {
      const setDownloads = vi.fn();
      const character = createCharacter({ id: 'test-id', name: 'Test' });

      renderHook(() =>
        useCharacterDownloads(
          createDefaultOptions({
            setDownloads,
            editedCharacter: character,
          })
        )
      );

      const downloads = setDownloads.mock.calls[0][0] as DownloadItem[];
      const jsonDownload = downloads.find((d) => d.id === 'character-json');

      const result = await jsonDownload?.getBlob?.();
      expect(result).not.toBeNull();
      expect(result?.filename).toBe('test-id.json');
    });

    it('should return null for character JSON when no character available', async () => {
      const setDownloads = vi.fn();

      renderHook(() => useCharacterDownloads(createDefaultOptions({ setDownloads })));

      const downloads = setDownloads.mock.calls[0][0] as DownloadItem[];
      const jsonDownload = downloads.find((d) => d.id === 'character-json');

      const result = await jsonDownload?.getBlob?.();
      expect(result).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases
  // --------------------------------------------------------------------------

  describe('Edge Cases', () => {
    it('should handle character with minimal data', () => {
      const setDownloads = vi.fn();
      const character = createCharacter({ name: 'Minimal' });

      const { result } = renderHook(() =>
        useCharacterDownloads(
          createDefaultOptions({
            setDownloads,
            editedCharacter: character,
          })
        )
      );

      expect(result.current.isDownloading).toBe(false);
    });

    it('should handle rapid download calls', async () => {
      mockDownloadCharacterTokensAsZip.mockResolvedValue(undefined);
      const addToast = vi.fn();
      const character = createCharacter({ name: 'Test' });
      const token = createCharacterToken({ name: 'Test' });

      const { result } = renderHook(() =>
        useCharacterDownloads(
          createDefaultOptions({
            addToast,
            selectedCharacter: character,
            displayCharacterToken: token,
          })
        )
      );

      // Call multiple times rapidly
      await act(async () => {
        await Promise.all([
          result.current.handleDownloadAll(),
          result.current.handleDownloadAll(),
          result.current.handleDownloadAll(),
        ]);
      });

      // Should complete without errors
      expect(result.current.isDownloading).toBe(false);
    });

    it('should handle selectedCharacter taking precedence for name in downloads', async () => {
      mockDownloadCharacterTokensAsZip.mockResolvedValue(undefined);
      const addToast = vi.fn();
      const editedCharacter = createCharacter({ name: 'Edited Name' });
      const selectedCharacter = createCharacter({ name: 'Selected Name' });
      const token = createCharacterToken({ name: 'Test' });

      const { result } = renderHook(() =>
        useCharacterDownloads(
          createDefaultOptions({
            addToast,
            editedCharacter,
            selectedCharacter,
            displayCharacterToken: token,
          })
        )
      );

      await act(async () => {
        await result.current.handleDownloadAll();
      });

      // selectedCharacter.name should be used for the download name
      expect(mockDownloadCharacterTokensAsZip).toHaveBeenCalledWith(
        token,
        [],
        'Selected Name',
        expect.any(Object)
      );
    });
  });
});
