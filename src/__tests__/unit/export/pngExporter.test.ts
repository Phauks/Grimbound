/**
 * Unit tests for PNG Exporter
 *
 * Tests PNG export functionality for single token downloads.
 * Validates blob creation, download triggering, and error handling.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadTokenPNG } from '@/ts/export/pngExporter.js';
import type { Token } from '@/ts/types/index.js';

// ============================================================================
// Mocks
// ============================================================================

// Mock the image utilities
vi.mock('@/ts/utils/index.js', () => ({
  downloadFile: vi.fn(),
  getTokenBlob: vi.fn(),
}));

// Import mocked functions
import { downloadFile, getTokenBlob } from '@/ts/utils/index.js';

// ============================================================================
// Test Setup
// ============================================================================

describe('PNG Exporter', () => {
  // Helper to create a mock token
  const createMockToken = (overrides: Partial<Token> = {}): Token => ({
    type: 'character',
    name: 'Test Character',
    filename: 'test-character',
    team: 'townsfolk',
    canvas: undefined,
    dataUrl:
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    diameter: 525,
    ...overrides,
  });

  // Helper to create a mock blob
  const createMockBlob = (data: string = 'mock png data'): Blob =>
    new Blob([data], { type: 'image/png' });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(downloadFile).mockReturnValue(undefined);
  });

  // ==========================================================================
  // downloadTokenPNG - Basic Functionality
  // ==========================================================================

  describe('downloadTokenPNG', () => {
    describe('basic functionality', () => {
      it('should download single token', () => {
        const token = createMockToken({
          name: 'Washerwoman',
          filename: 'washerwoman',
        });
        const mockBlob = createMockBlob();

        vi.mocked(getTokenBlob).mockReturnValue(mockBlob);

        downloadTokenPNG(token);

        expect(getTokenBlob).toHaveBeenCalledWith(token);
        expect(downloadFile).toHaveBeenCalledWith(mockBlob, 'washerwoman.png');
      });

      it('should download token with .png extension appended to filename', () => {
        const token = createMockToken({
          filename: 'token-name',
        });
        const mockBlob = createMockBlob();

        vi.mocked(getTokenBlob).mockReturnValue(mockBlob);

        downloadTokenPNG(token);

        expect(downloadFile).toHaveBeenCalledWith(mockBlob, 'token-name.png');
      });

      it('should handle tokens with special characters in filename', () => {
        const token = createMockToken({
          filename: 'test-character_v2',
        });
        const mockBlob = createMockBlob();

        vi.mocked(getTokenBlob).mockReturnValue(mockBlob);

        downloadTokenPNG(token);

        expect(downloadFile).toHaveBeenCalledWith(mockBlob, 'test-character_v2.png');
      });

      it('should return undefined (void function)', () => {
        const token = createMockToken();
        const mockBlob = createMockBlob();

        vi.mocked(getTokenBlob).mockReturnValue(mockBlob);

        const result = downloadTokenPNG(token);

        expect(result).toBeUndefined();
      });
    });

    // ==========================================================================
    // Token Types
    // ==========================================================================

    describe('different token types', () => {
      it('should handle character tokens', () => {
        const token = createMockToken({
          type: 'character',
          name: 'Washerwoman',
          team: 'townsfolk',
        });
        const mockBlob = createMockBlob();

        vi.mocked(getTokenBlob).mockReturnValue(mockBlob);

        downloadTokenPNG(token);

        expect(getTokenBlob).toHaveBeenCalledWith(expect.objectContaining({ type: 'character' }));
        expect(downloadFile).toHaveBeenCalled();
      });

      it('should handle reminder tokens', () => {
        const token = createMockToken({
          type: 'reminder',
          name: 'Imp - Dead',
          team: 'demon',
          reminderText: 'Dead',
          parentCharacter: 'Imp',
        });
        const mockBlob = createMockBlob();

        vi.mocked(getTokenBlob).mockReturnValue(mockBlob);

        downloadTokenPNG(token);

        expect(getTokenBlob).toHaveBeenCalledWith(expect.objectContaining({ type: 'reminder' }));
        expect(downloadFile).toHaveBeenCalled();
      });

      it('should handle script-name tokens', () => {
        const token = createMockToken({
          type: 'script-name',
          name: 'Trouble Brewing',
          team: 'meta',
        });
        const mockBlob = createMockBlob();

        vi.mocked(getTokenBlob).mockReturnValue(mockBlob);

        downloadTokenPNG(token);

        expect(getTokenBlob).toHaveBeenCalledWith(expect.objectContaining({ type: 'script-name' }));
        expect(downloadFile).toHaveBeenCalled();
      });

      it('should handle almanac tokens', () => {
        const token = createMockToken({
          type: 'almanac',
          name: 'Almanac QR',
          team: 'meta',
        });
        const mockBlob = createMockBlob();

        vi.mocked(getTokenBlob).mockReturnValue(mockBlob);

        downloadTokenPNG(token);

        expect(getTokenBlob).toHaveBeenCalledWith(expect.objectContaining({ type: 'almanac' }));
        expect(downloadFile).toHaveBeenCalled();
      });

      it('should handle pandemonium tokens', () => {
        const token = createMockToken({
          type: 'pandemonium',
          name: 'Pandemonium',
          team: 'meta',
        });
        const mockBlob = createMockBlob();

        vi.mocked(getTokenBlob).mockReturnValue(mockBlob);

        downloadTokenPNG(token);

        expect(getTokenBlob).toHaveBeenCalledWith(expect.objectContaining({ type: 'pandemonium' }));
        expect(downloadFile).toHaveBeenCalled();
      });

      it('should handle bootlegger tokens', () => {
        const token = createMockToken({
          type: 'bootlegger',
          name: 'Custom Character',
          team: 'townsfolk',
        });
        const mockBlob = createMockBlob();

        vi.mocked(getTokenBlob).mockReturnValue(mockBlob);

        downloadTokenPNG(token);

        expect(getTokenBlob).toHaveBeenCalledWith(expect.objectContaining({ type: 'bootlegger' }));
        expect(downloadFile).toHaveBeenCalled();
      });

      it('should handle jinx tokens', () => {
        const token = createMockToken({
          type: 'jinx',
          name: 'Washerwoman/Drunk Jinx',
          team: 'meta',
        });
        const mockBlob = createMockBlob();

        vi.mocked(getTokenBlob).mockReturnValue(mockBlob);

        downloadTokenPNG(token);

        expect(getTokenBlob).toHaveBeenCalledWith(expect.objectContaining({ type: 'jinx' }));
        expect(downloadFile).toHaveBeenCalled();
      });
    });

    // ==========================================================================
    // Blob Handling
    // ==========================================================================

    describe('blob handling', () => {
      it('should get blob from token using getTokenBlob utility', () => {
        const token = createMockToken();
        const mockBlob = createMockBlob();

        vi.mocked(getTokenBlob).mockReturnValue(mockBlob);

        downloadTokenPNG(token);

        expect(getTokenBlob).toHaveBeenCalledTimes(1);
        expect(getTokenBlob).toHaveBeenCalledWith(token);
      });

      it('should handle blob created from dataUrl', () => {
        const token = createMockToken({
          dataUrl: 'data:image/png;base64,ABC123==',
        });
        const mockBlob = new Blob(['PNG data'], { type: 'image/png' });

        vi.mocked(getTokenBlob).mockReturnValue(mockBlob);

        downloadTokenPNG(token);

        expect(getTokenBlob).toHaveBeenCalledWith(token);
        expect(downloadFile).toHaveBeenCalledWith(mockBlob, expect.stringContaining('.png'));
      });

      it('should handle blob created from canvas', () => {
        const canvas = document.createElement('canvas');
        canvas.width = 525;
        canvas.height = 525;

        const token = createMockToken({
          canvas,
          dataUrl: undefined,
        });
        const mockBlob = createMockBlob();

        vi.mocked(getTokenBlob).mockReturnValue(mockBlob);

        downloadTokenPNG(token);

        expect(getTokenBlob).toHaveBeenCalledWith(token);
        expect(downloadFile).toHaveBeenCalledWith(mockBlob, expect.stringContaining('.png'));
      });

      it('should pass correct blob to downloadFile', () => {
        const token = createMockToken();
        const mockBlob = createMockBlob('specific png data');

        vi.mocked(getTokenBlob).mockReturnValue(mockBlob);

        downloadTokenPNG(token);

        const [downloadedBlob] = vi.mocked(downloadFile).mock.calls[0];
        expect(downloadedBlob).toBe(mockBlob);
        expect(downloadedBlob).toBeInstanceOf(Blob);
        expect(downloadedBlob.type).toBe('image/png');
      });
    });

    // ==========================================================================
    // Filename Handling
    // ==========================================================================

    describe('filename handling', () => {
      it('should use token filename with .png extension', () => {
        const token = createMockToken({
          filename: 'my-token',
        });
        const mockBlob = createMockBlob();

        vi.mocked(getTokenBlob).mockReturnValue(mockBlob);

        downloadTokenPNG(token);

        expect(downloadFile).toHaveBeenCalledWith(expect.anything(), 'my-token.png');
      });

      it('should handle filenames with underscores', () => {
        const token = createMockToken({
          filename: 'character_name_v1',
        });
        const mockBlob = createMockBlob();

        vi.mocked(getTokenBlob).mockReturnValue(mockBlob);

        downloadTokenPNG(token);

        expect(downloadFile).toHaveBeenCalledWith(expect.anything(), 'character_name_v1.png');
      });

      it('should handle filenames with hyphens', () => {
        const token = createMockToken({
          filename: 'reminder-dead-imp',
        });
        const mockBlob = createMockBlob();

        vi.mocked(getTokenBlob).mockReturnValue(mockBlob);

        downloadTokenPNG(token);

        expect(downloadFile).toHaveBeenCalledWith(expect.anything(), 'reminder-dead-imp.png');
      });

      it('should handle single word filenames', () => {
        const token = createMockToken({
          filename: 'washerwoman',
        });
        const mockBlob = createMockBlob();

        vi.mocked(getTokenBlob).mockReturnValue(mockBlob);

        downloadTokenPNG(token);

        expect(downloadFile).toHaveBeenCalledWith(expect.anything(), 'washerwoman.png');
      });

      it('should always add exactly one .png extension', () => {
        const token = createMockToken({
          filename: 'test.png', // Already has extension
        });
        const mockBlob = createMockBlob();

        vi.mocked(getTokenBlob).mockReturnValue(mockBlob);

        downloadTokenPNG(token);

        expect(downloadFile).toHaveBeenCalledWith(expect.anything(), 'test.png.png');
      });
    });

    // ==========================================================================
    // Error Handling
    // ==========================================================================

    describe('error handling', () => {
      it('should propagate error from getTokenBlob', () => {
        const token = createMockToken();
        const error = new Error('Failed to get blob');

        vi.mocked(getTokenBlob).mockImplementation(() => {
          throw error;
        });

        expect(() => downloadTokenPNG(token)).toThrow('Failed to get blob');
      });

      it('should propagate error from downloadFile', () => {
        const token = createMockToken();
        const mockBlob = createMockBlob();
        const error = new Error('Failed to trigger download');

        vi.mocked(getTokenBlob).mockReturnValue(mockBlob);
        vi.mocked(downloadFile).mockImplementation(() => {
          throw error;
        });

        expect(() => downloadTokenPNG(token)).toThrow('Failed to trigger download');
      });

      it('should handle blob creation errors', () => {
        const token = createMockToken();
        const blobError = new Error('Canvas is undefined or cleared');

        vi.mocked(getTokenBlob).mockImplementation(() => {
          throw blobError;
        });

        expect(() => downloadTokenPNG(token)).toThrow('Canvas is undefined or cleared');
      });
    });

    // ==========================================================================
    // Integration Scenarios
    // ==========================================================================

    describe('integration scenarios', () => {
      it('should complete full download flow for character token', () => {
        const token = createMockToken({
          type: 'character',
          name: 'Spy',
          filename: 'spy',
          team: 'townsfolk',
        });
        const mockBlob = createMockBlob();

        vi.mocked(getTokenBlob).mockReturnValue(mockBlob);

        downloadTokenPNG(token);

        expect(getTokenBlob).toHaveBeenCalledWith(token);
        expect(downloadFile).toHaveBeenCalledWith(mockBlob, 'spy.png');
      });

      it('should handle multiple tokens being exported sequentially', () => {
        const token1 = createMockToken({ filename: 'token1' });
        const token2 = createMockToken({ filename: 'token2' });
        const blob1 = createMockBlob('blob1');
        const blob2 = createMockBlob('blob2');

        vi.mocked(getTokenBlob).mockReturnValueOnce(blob1).mockReturnValueOnce(blob2);

        downloadTokenPNG(token1);
        downloadTokenPNG(token2);

        expect(getTokenBlob).toHaveBeenCalledTimes(2);
        expect(downloadFile).toHaveBeenCalledTimes(2);
        expect(downloadFile).toHaveBeenNthCalledWith(1, blob1, 'token1.png');
        expect(downloadFile).toHaveBeenNthCalledWith(2, blob2, 'token2.png');
      });

      it('should handle token with all optional fields', () => {
        const token = createMockToken({
          type: 'character',
          name: 'Complete Token',
          filename: 'complete',
          team: 'demon',
          diameter: 525,
          hasReminders: true,
          reminderCount: 3,
          parentUuid: 'uuid-123',
          isOfficial: true,
        });
        const mockBlob = createMockBlob();

        vi.mocked(getTokenBlob).mockReturnValue(mockBlob);

        downloadTokenPNG(token);

        expect(getTokenBlob).toHaveBeenCalledWith(expect.objectContaining(token));
        expect(downloadFile).toHaveBeenCalledWith(mockBlob, 'complete.png');
      });

      it('should handle token with minimal fields', () => {
        const token: Token = {
          type: 'character',
          name: 'Minimal',
          filename: 'minimal',
          team: 'townsfolk',
          diameter: 525,
        };
        const mockBlob = createMockBlob();

        vi.mocked(getTokenBlob).mockReturnValue(mockBlob);

        downloadTokenPNG(token);

        expect(getTokenBlob).toHaveBeenCalledWith(token);
        expect(downloadFile).toHaveBeenCalledWith(mockBlob, 'minimal.png');
      });
    });

    // ==========================================================================
    // Team Handling
    // ==========================================================================

    describe('team handling', () => {
      const teams = [
        'townsfolk',
        'outsider',
        'minion',
        'demon',
        'traveller',
        'fabled',
        'meta',
      ] as const;

      teams.forEach((team) => {
        it(`should handle ${team} team tokens`, () => {
          const token = createMockToken({ team });
          const mockBlob = createMockBlob();

          vi.mocked(getTokenBlob).mockReturnValue(mockBlob);

          downloadTokenPNG(token);

          expect(getTokenBlob).toHaveBeenCalledWith(expect.objectContaining({ team }));
          expect(downloadFile).toHaveBeenCalled();
        });
      });
    });
  });
});
