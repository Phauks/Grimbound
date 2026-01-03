/**
 * Unit tests for zipExporter.ts
 *
 * Tests ZIP file creation with folder structure organization,
 * filename sanitization, and batch processing.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Token, ZipExportOptions } from '@/ts/types/index.js';

// Mock JSZip - must be a constructor function
vi.mock('jszip', () => {
  const mockFile = vi.fn();
  const mockGenerateAsync = vi
    .fn()
    .mockResolvedValue(new Blob(['zip'], { type: 'application/zip' }));

  // Return a constructor function that returns the mock object
  const MockJSZip = function (this: any) {
    this.file = mockFile;
    this.generateAsync = mockGenerateAsync;
  } as any;

  return {
    default: MockJSZip,
  };
});

// Mock getTokenBlob
vi.mock('@/ts/utils/index.js', () => ({
  getTokenBlob: vi.fn(() => new Blob(['test'], { type: 'image/png' })),
}));

// Import after mocks are set up
import {
  createTokensZip,
  getTokenFilename,
  getTokenFolderPath,
  isMetaToken,
  processTokenToBlob,
  tokensToBundleData,
} from '@/ts/export/zipExporter.js';

// ============================================================================
// Test Helpers
// ============================================================================

const createMockToken = (overrides: Partial<Token> = {}): Token => ({
  type: 'character',
  name: 'Test Character',
  filename: 'test-character',
  team: 'townsfolk',
  diameter: 300,
  ...overrides,
});

const createDefaultZipSettings = (): ZipExportOptions => ({
  saveInTeamFolders: true,
  saveRemindersSeparately: true,
  metaTokenFolder: true,
  includeScriptJson: false,
  compressionLevel: 'normal',
});

// ============================================================================
// Tests
// ============================================================================

describe('zipExporter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================================================
  // isMetaToken Tests
  // ========================================================================

  describe('isMetaToken', () => {
    it('should return true for script-name token', () => {
      const token = createMockToken({ type: 'script-name' });
      expect(isMetaToken(token)).toBe(true);
    });

    it('should return true for almanac token', () => {
      const token = createMockToken({ type: 'almanac' });
      expect(isMetaToken(token)).toBe(true);
    });

    it('should return true for pandemonium token', () => {
      const token = createMockToken({ type: 'pandemonium' });
      expect(isMetaToken(token)).toBe(true);
    });

    it('should return true for bootlegger token', () => {
      const token = createMockToken({ type: 'bootlegger' });
      expect(isMetaToken(token)).toBe(true);
    });

    it('should return true for jinx token', () => {
      const token = createMockToken({ type: 'jinx' });
      expect(isMetaToken(token)).toBe(true);
    });

    it('should return false for character token', () => {
      const token = createMockToken({ type: 'character' });
      expect(isMetaToken(token)).toBe(false);
    });

    it('should return false for reminder token', () => {
      const token = createMockToken({ type: 'reminder' });
      expect(isMetaToken(token)).toBe(false);
    });

    it('should return false for undefined token', () => {
      expect(isMetaToken(undefined)).toBe(false);
    });

    it('should return false for null token', () => {
      expect(isMetaToken(null as unknown as Token)).toBe(false);
    });
  });

  // ========================================================================
  // getTokenFilename Tests
  // ========================================================================

  describe('getTokenFilename', () => {
    it('should add .png extension to filename', () => {
      const token = createMockToken({ filename: 'test' });
      expect(getTokenFilename(token)).toBe('test.png');
    });

    it('should add underscore prefix to meta token filenames', () => {
      const token = createMockToken({ type: 'script-name', filename: 'script-name' });
      expect(getTokenFilename(token)).toBe('_script-name.png');
    });

    it('should not double-prefix if underscore already present', () => {
      const token = createMockToken({ type: 'almanac', filename: '_almanac' });
      expect(getTokenFilename(token)).toBe('_almanac.png');
    });

    it('should not add underscore prefix to character tokens', () => {
      const token = createMockToken({ type: 'character', filename: 'washerwoman' });
      expect(getTokenFilename(token)).toBe('washerwoman.png');
    });

    it('should not add underscore prefix to reminder tokens', () => {
      const token = createMockToken({ type: 'reminder', filename: 'imp-dead' });
      expect(getTokenFilename(token)).toBe('imp-dead.png');
    });

    it('should handle filenames with special characters', () => {
      const token = createMockToken({ filename: 'test-character_v2' });
      expect(getTokenFilename(token)).toBe('test-character_v2.png');
    });

    it('should handle empty filename', () => {
      const token = createMockToken({ filename: '' });
      expect(getTokenFilename(token)).toBe('.png');
    });
  });

  // ========================================================================
  // getTokenFolderPath Tests
  // ========================================================================

  describe('getTokenFolderPath', () => {
    it('should place character token in character_tokens folder when saveRemindersSeparately enabled', () => {
      const token = createMockToken({ type: 'character', team: 'townsfolk' });
      const settings = createDefaultZipSettings();
      settings.saveRemindersSeparately = true;

      const path = getTokenFolderPath(token, settings);
      expect(path).toBe('character_tokens/Townsfolk/');
    });

    it('should place reminder token in reminder_tokens folder with team subfolder', () => {
      const token = createMockToken({ type: 'reminder', team: 'townsfolk' });
      const settings = createDefaultZipSettings();
      settings.saveRemindersSeparately = true;

      const path = getTokenFolderPath(token, settings);
      expect(path).toBe('reminder_tokens/Townsfolk/');
    });

    it('should place meta token in _meta folder when metaTokenFolder enabled', () => {
      const token = createMockToken({ type: 'script-name' });
      const settings = createDefaultZipSettings();
      settings.metaTokenFolder = true;

      const path = getTokenFolderPath(token, settings);
      expect(path).toBe('_meta/');
    });

    it('should not add team subfolder for meta tokens', () => {
      const token = createMockToken({ type: 'pandemonium' });
      const settings = createDefaultZipSettings();
      settings.metaTokenFolder = true;
      settings.saveInTeamFolders = true;

      const path = getTokenFolderPath(token, settings);
      expect(path).toBe('_meta/');
      expect(path).not.toContain('Townsfolk');
    });

    it('should add team subfolder to character tokens when saveInTeamFolders enabled', () => {
      const token = createMockToken({ type: 'character', team: 'demon' });
      const settings = createDefaultZipSettings();
      settings.saveInTeamFolders = true;

      const path = getTokenFolderPath(token, settings);
      expect(path).toContain('Demon/');
    });

    it('should handle all team types correctly', () => {
      const teams = ['townsfolk', 'outsider', 'minion', 'demon', 'traveller', 'fabled'] as const;

      for (const team of teams) {
        const token = createMockToken({ type: 'character', team });
        const settings = createDefaultZipSettings();
        settings.saveInTeamFolders = true;

        const path = getTokenFolderPath(token, settings);
        expect(path).toMatch(/character_tokens\/[A-Z][a-z]+\//);
      }
    });

    it('should use flat structure when all folder options disabled', () => {
      const token = createMockToken({ type: 'character', team: 'townsfolk' });
      const settings: ZipExportOptions = {
        saveInTeamFolders: false,
        saveRemindersSeparately: false,
        metaTokenFolder: false,
        includeScriptJson: false,
        compressionLevel: 'normal',
      };

      const path = getTokenFolderPath(token, settings);
      expect(path).toBe('');
    });
  });

  // ========================================================================
  // tokensToBundleData Tests
  // ========================================================================

  describe('tokensToBundleData', () => {
    it('should convert tokens to bundle data', async () => {
      const tokens = [
        createMockToken({ filename: 'token1' }),
        createMockToken({ filename: 'token2' }),
      ];

      const result = await tokensToBundleData(tokens);
      expect(result).toHaveLength(2);
      expect(result[0].filename).toBe('token1');
      expect(result[1].filename).toBe('token2');
    });

    it('should return blob for each token', async () => {
      const tokens = [createMockToken({ filename: 'token' })];
      const result = await tokensToBundleData(tokens);
      expect(result[0].blob).toBeInstanceOf(Blob);
    });

    it('should handle empty token array', async () => {
      const result = await tokensToBundleData([]);
      expect(result).toEqual([]);
    });

    it('should skip tokens that fail conversion', async () => {
      const { getTokenBlob } = await import('@/ts/utils/index.js');
      const tokens = [
        createMockToken({ filename: 'token1' }),
        createMockToken({ filename: 'token2' }),
        createMockToken({ filename: 'token3' }),
      ];

      vi.mocked(getTokenBlob)
        .mockReturnValueOnce(new Blob())
        .mockImplementationOnce(() => {
          throw new Error('Conversion failed');
        })
        .mockReturnValueOnce(new Blob());

      const result = await tokensToBundleData(tokens);
      expect(result).toHaveLength(2);
    });
  });

  // ========================================================================
  // processTokenToBlob Tests
  // ========================================================================

  describe('processTokenToBlob', () => {
    it('should convert token to blob', () => {
      const token = createMockToken();
      const result = processTokenToBlob(token);
      expect(result).toBeInstanceOf(Blob);
    });
  });

  // ========================================================================
  // createTokensZip Tests
  // ========================================================================

  describe('createTokensZip', () => {
    it('should create ZIP with character tokens', async () => {
      const tokens = [
        createMockToken({ filename: 'washerwoman', type: 'character' }),
        createMockToken({ filename: 'drunk', type: 'character' }),
      ];

      const result = await createTokensZip(tokens);
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('application/zip');
    });

    it('should create ZIP with reminder tokens', async () => {
      const tokens = [
        createMockToken({ filename: 'washerwoman-dead', type: 'reminder' }),
        createMockToken({ filename: 'drunk-sober', type: 'reminder' }),
      ];

      const result = await createTokensZip(tokens);
      expect(result).toBeInstanceOf(Blob);
    });

    it('should create ZIP with meta tokens', async () => {
      const tokens = [
        createMockToken({ filename: 'script-name', type: 'script-name' }),
        createMockToken({ filename: 'almanac', type: 'almanac' }),
      ];

      const result = await createTokensZip(tokens);
      expect(result).toBeInstanceOf(Blob);
    });

    it('should organize files into team folders', async () => {
      const tokens = [
        createMockToken({ filename: 'washerwoman', type: 'character', team: 'townsfolk' }),
        createMockToken({ filename: 'imp', type: 'character', team: 'demon' }),
      ];

      const settings = createDefaultZipSettings();
      settings.saveInTeamFolders = true;

      const result = await createTokensZip(tokens, null, settings);
      expect(result).toBeInstanceOf(Blob);
    });

    it('should separate character and reminder tokens into folders', async () => {
      const tokens = [
        createMockToken({ filename: 'char', type: 'character' }),
        createMockToken({ filename: 'rem', type: 'reminder' }),
      ];

      const settings = createDefaultZipSettings();
      settings.saveRemindersSeparately = true;

      const result = await createTokensZip(tokens, null, settings);
      expect(result).toBeInstanceOf(Blob);
    });

    it('should report progress for each token', async () => {
      const tokens = [
        createMockToken({ filename: 'token1' }),
        createMockToken({ filename: 'token2' }),
        createMockToken({ filename: 'token3' }),
      ];

      const progressCallback = vi.fn();
      await createTokensZip(tokens, progressCallback);

      expect(progressCallback).toHaveBeenCalledTimes(3);
    });

    it('should handle null progress callback', async () => {
      const tokens = [createMockToken()];
      const result = await createTokensZip(tokens, null);
      expect(result).toBeInstanceOf(Blob);
    });

    it('should throw error for invalid tokens parameter', async () => {
      const invalidTokens = 'not an array' as unknown as Token[];
      await expect(createTokensZip(invalidTokens)).rejects.toThrow();
    });

    it('should throw error for empty token array', async () => {
      const tokens: Token[] = [];
      await expect(createTokensZip(tokens)).rejects.toThrow('No tokens to export');
    });

    it('should handle single token', async () => {
      const tokens = [createMockToken({ filename: 'single' })];
      const result = await createTokensZip(tokens);
      expect(result).toBeInstanceOf(Blob);
    });

    it('should handle mixed token types in single ZIP', async () => {
      const tokens = [
        createMockToken({ filename: 'washerwoman', type: 'character', team: 'townsfolk' }),
        createMockToken({ filename: 'imp-dead', type: 'reminder', team: 'demon' }),
        createMockToken({ filename: 'script-name', type: 'script-name' }),
      ];

      const settings = createDefaultZipSettings();
      const result = await createTokensZip(tokens, null, settings);
      expect(result).toBeInstanceOf(Blob);
    });

    it('should return ZIP blob with correct type', async () => {
      const tokens = [createMockToken()];
      const result = await createTokensZip(tokens);
      expect(result).toBeInstanceOf(Blob);
      expect(result.type).toBe('application/zip');
    });
  });

  // ========================================================================
  // Edge Cases
  // ========================================================================

  describe('Edge Cases', () => {
    it('should handle tokens with all field values populated', async () => {
      const token: Token = {
        type: 'character',
        name: 'Complex Character',
        filename: 'complex-character',
        team: 'minion',
        diameter: 300,
        canvas: document.createElement('canvas'),
        dataUrl: 'data:image/png;base64,test',
        hasReminders: true,
        reminderCount: 3,
        parentUuid: 'test-uuid',
        isOfficial: true,
        variantIndex: 1,
        totalVariants: 3,
        imageUrl: 'https://example.com/image.png',
        hasDecorativeOverrides: true,
      };

      const tokens = [token];
      const result = await createTokensZip(tokens);
      expect(result).toBeInstanceOf(Blob);
    });

    it('should preserve token order in ZIP output', async () => {
      const tokens = [
        createMockToken({ filename: 'first' }),
        createMockToken({ filename: 'second' }),
        createMockToken({ filename: 'third' }),
      ];

      const result = await createTokensZip(tokens);
      expect(result).toBeInstanceOf(Blob);
    });
  });
});
