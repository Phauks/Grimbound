/**
 * Unit tests for completePackageExporter
 *
 * Tests cover:
 * - createCompletePackage creates ZIP with all components
 * - downloadCompletePackage triggers download
 * - Progress callbacks for each step
 * - Abort signal cancellation
 * - Token processing and PDF generation
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type CompletePackageOptions,
  createCompletePackage,
  downloadCompletePackage,
} from '@/ts/export/completePackageExporter';
import type { GenerationOptions, ScriptMeta, Token } from '@/ts/types/index';

// Mock dependencies - must be hoisted
const mockZipFile = vi.fn();
const mockZipGenerateAsync = vi
  .fn()
  .mockResolvedValue(new Blob(['zip'], { type: 'application/zip' }));
const mockPdfGetBlob = vi.fn().mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' }));

vi.mock('jszip', () => ({
  default: class MockJSZip {
    file(...args: unknown[]) {
      return mockZipFile(...args);
    }
    generateAsync(...args: unknown[]) {
      return mockZipGenerateAsync(...args);
    }
  },
}));

vi.mock('@/ts/export/pdfGenerator', () => ({
  PDFGenerator: class MockPDFGenerator {
    getPDFBlob(...args: unknown[]) {
      return mockPdfGetBlob(...args);
    }
  },
}));

vi.mock('@/ts/export/zipExporter', () => ({
  getTokenFilename: vi.fn((token: Token) => token.filename),
  getTokenFolderPath: vi.fn(() => 'characters/'),
  processTokenToBlob: vi.fn().mockResolvedValue(new Blob(['png'], { type: 'image/png' })),
}));

vi.mock('@/ts/utils/index', () => ({
  downloadFile: vi.fn(),
}));

import { processTokenToBlob } from '@/ts/export/zipExporter';
import { downloadFile } from '@/ts/utils/index';

// ============================================================================
// Test Helpers
// ============================================================================

const createMockToken = (overrides: Partial<Token> = {}): Token =>
  ({
    filename: 'washerwoman.png',
    characterId: 'washerwoman',
    tokenType: 'character',
    dataUrl: 'data:image/png;base64,xxx',
    ...overrides,
  }) as Token;

const createMockGenerationOptions = (
  overrides: Partial<GenerationOptions> = {}
): GenerationOptions =>
  ({
    diameter: 300,
    reminderDiameter: 200,
    dpi: 300,
    pdfPadding: 0.25,
    pdfXOffset: 0,
    pdfYOffset: 0,
    pdfBleed: 0.125,
    ...overrides,
  }) as GenerationOptions;

const createMockScriptMeta = (overrides: Partial<ScriptMeta> = {}): ScriptMeta => ({
  name: 'Test Script',
  author: 'Test Author',
  ...overrides,
});

const createCompletePackageOptions = (
  overrides: Partial<CompletePackageOptions> = {}
): CompletePackageOptions => ({
  tokens: [createMockToken()],
  scriptJson: '[]',
  generationOptions: createMockGenerationOptions(),
  scriptMeta: createMockScriptMeta(),
  baseFilename: 'test-script',
  progressCallback: null,
  ...overrides,
});

// ============================================================================
// Tests
// ============================================================================

describe('completePackageExporter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockZipFile.mockClear();
    mockZipGenerateAsync.mockClear();
    mockZipGenerateAsync.mockResolvedValue(new Blob(['zip'], { type: 'application/zip' }));
    mockPdfGetBlob.mockClear();
    mockPdfGetBlob.mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // createCompletePackage
  // --------------------------------------------------------------------------

  describe('createCompletePackage', () => {
    it('should create a ZIP blob', async () => {
      const options = createCompletePackageOptions();

      const result = await createCompletePackage(options);

      expect(result).toBeInstanceOf(Blob);
    });

    it('should add script JSON to ZIP', async () => {
      const options = createCompletePackageOptions({
        scriptJson: '[{"id": "washerwoman"}]',
        baseFilename: 'my-script',
      });

      await createCompletePackage(options);

      expect(mockZipFile).toHaveBeenCalledWith('my-script.json', '[{"id": "washerwoman"}]');
    });

    it('should skip script JSON when not provided', async () => {
      const options = createCompletePackageOptions({
        scriptJson: undefined,
      });

      await createCompletePackage(options);

      // Should not have a .json file call for script (only style.json)
      const jsonCalls = mockZipFile.mock.calls.filter(
        (call: [string, unknown]) => call[0].endsWith('.json') && !call[0].includes('_style')
      );
      expect(jsonCalls).toHaveLength(0);
    });

    it('should add style JSON to ZIP', async () => {
      const options = createCompletePackageOptions({
        baseFilename: 'my-script',
        scriptMeta: createMockScriptMeta({ name: 'Custom Script' }),
      });

      await createCompletePackage(options);

      expect(mockZipFile).toHaveBeenCalledWith(
        'my-script_style.json',
        expect.stringContaining('"name": "Custom Script Style"')
      );
    });

    it('should include generation options in style JSON', async () => {
      const genOptions = createMockGenerationOptions({ tokenCount: true });
      const options = createCompletePackageOptions({
        generationOptions: genOptions,
      });

      await createCompletePackage(options);

      const styleCall = mockZipFile.mock.calls.find((call: [string, unknown]) =>
        call[0].includes('_style.json')
      );
      expect(styleCall).toBeDefined();
      const styleContent = JSON.parse(styleCall?.[1] as string);
      expect(styleContent.generationOptions.tokenCount).toBe(true);
    });

    it('should process tokens and add to ZIP', async () => {
      const tokens = [
        createMockToken({ filename: 'token1.png' }),
        createMockToken({ filename: 'token2.png' }),
      ];
      const options = createCompletePackageOptions({ tokens });

      await createCompletePackage(options);

      expect(processTokenToBlob).toHaveBeenCalledTimes(2);
      expect(mockZipFile).toHaveBeenCalledWith('tokens/characters/token1.png', expect.any(Blob));
      expect(mockZipFile).toHaveBeenCalledWith('tokens/characters/token2.png', expect.any(Blob));
    });

    it('should generate PDF and add to ZIP', async () => {
      const options = createCompletePackageOptions({
        baseFilename: 'my-script',
      });

      await createCompletePackage(options);

      expect(mockPdfGetBlob).toHaveBeenCalled();
      expect(mockZipFile).toHaveBeenCalledWith('my-script.pdf', expect.any(Blob));
    });

    it('should pass tokens to PDF generator', async () => {
      const tokens = [
        createMockToken({ filename: 'token1.png' }),
        createMockToken({ filename: 'token2.png' }),
      ];
      const options = createCompletePackageOptions({ tokens });

      await createCompletePackage(options);

      // PDF generator should receive the tokens
      expect(mockPdfGetBlob).toHaveBeenCalledWith(tokens, expect.any(Function));
    });

    it('should add PDF blob to ZIP', async () => {
      const options = createCompletePackageOptions({
        baseFilename: 'test-script',
      });

      await createCompletePackage(options);

      expect(mockZipFile).toHaveBeenCalledWith('test-script.pdf', expect.any(Blob));
    });

    it('should generate ZIP with compression', async () => {
      const options = createCompletePackageOptions();

      await createCompletePackage(options);

      expect(mockZipGenerateAsync).toHaveBeenCalledWith({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });
    });
  });

  // --------------------------------------------------------------------------
  // Progress Callbacks
  // --------------------------------------------------------------------------

  describe('Progress Callbacks', () => {
    it('should call progress callback for JSON step', async () => {
      const progressCallback = vi.fn();
      const options = createCompletePackageOptions({ progressCallback });

      await createCompletePackage(options);

      expect(progressCallback).toHaveBeenCalledWith('json', 1, 1);
    });

    it('should call progress callback for style step', async () => {
      const progressCallback = vi.fn();
      const options = createCompletePackageOptions({ progressCallback });

      await createCompletePackage(options);

      expect(progressCallback).toHaveBeenCalledWith('style', 1, 1);
    });

    it('should call progress callback for tokens step', async () => {
      const progressCallback = vi.fn();
      const tokens = [
        createMockToken({ filename: 'token1.png' }),
        createMockToken({ filename: 'token2.png' }),
        createMockToken({ filename: 'token3.png' }),
      ];
      const options = createCompletePackageOptions({ tokens, progressCallback });

      await createCompletePackage(options);

      expect(progressCallback).toHaveBeenCalledWith('tokens', 0, 3);
      expect(progressCallback).toHaveBeenCalledWith('tokens', 1, 3);
      expect(progressCallback).toHaveBeenCalledWith('tokens', 2, 3);
      expect(progressCallback).toHaveBeenCalledWith('tokens', 3, 3);
    });

    it('should call progress callback for PDF step', async () => {
      const progressCallback = vi.fn();
      const options = createCompletePackageOptions({ progressCallback });

      // Configure mockPdfGetBlob to call the progress callback
      mockPdfGetBlob.mockImplementation(
        async (_tokens: unknown, pdfProgressCallback: (a: number, b: number) => void) => {
          // Simulate PDF progress
          pdfProgressCallback(1, 2);
          pdfProgressCallback(2, 2);
          return new Blob(['pdf']);
        }
      );

      await createCompletePackage(options);

      expect(progressCallback).toHaveBeenCalledWith('pdf', 1, 2);
      expect(progressCallback).toHaveBeenCalledWith('pdf', 2, 2);
    });

    it('should work without progress callback', async () => {
      const options = createCompletePackageOptions({ progressCallback: null });

      await expect(createCompletePackage(options)).resolves.not.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // Abort Signal
  // --------------------------------------------------------------------------

  describe('Abort Signal', () => {
    it('should throw AbortError when signal is aborted before tokens', async () => {
      const controller = new AbortController();
      controller.abort();

      const options = createCompletePackageOptions({ signal: controller.signal });

      await expect(createCompletePackage(options)).rejects.toThrow('Export cancelled');
    });

    it('should check abort signal at multiple points', async () => {
      const controller = new AbortController();
      let tokenCount = 0;

      vi.mocked(processTokenToBlob).mockImplementation(async () => {
        tokenCount++;
        if (tokenCount === 2) {
          controller.abort();
        }
        return new Blob(['png']);
      });

      const tokens = [
        createMockToken({ filename: 'token1.png' }),
        createMockToken({ filename: 'token2.png' }),
        createMockToken({ filename: 'token3.png' }),
      ];
      const options = createCompletePackageOptions({ tokens, signal: controller.signal });

      await expect(createCompletePackage(options)).rejects.toThrow('Export cancelled');
    });

    it('should abort during PDF generation', async () => {
      const controller = new AbortController();

      mockPdfGetBlob.mockImplementation(
        async (_tokens: unknown, pdfProgressCallback: (a: number, b: number) => void) => {
          controller.abort();
          pdfProgressCallback(1, 2); // This should throw
          return new Blob(['pdf']);
        }
      );

      const options = createCompletePackageOptions({ signal: controller.signal });

      await expect(createCompletePackage(options)).rejects.toThrow('Export cancelled');
    });
  });

  // --------------------------------------------------------------------------
  // downloadCompletePackage
  // --------------------------------------------------------------------------

  describe('downloadCompletePackage', () => {
    it('should create package and download', async () => {
      const options = createCompletePackageOptions();

      await downloadCompletePackage(options, 'my-package.zip');

      expect(downloadFile).toHaveBeenCalledWith(expect.any(Blob), 'my-package.zip');
    });

    it('should pass through all options to createCompletePackage', async () => {
      const progressCallback = vi.fn();
      const options = createCompletePackageOptions({
        progressCallback,
        baseFilename: 'custom-name',
      });

      await downloadCompletePackage(options, 'output.zip');

      expect(progressCallback).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases
  // --------------------------------------------------------------------------

  describe('Edge Cases', () => {
    it('should handle empty tokens array', async () => {
      const options = createCompletePackageOptions({ tokens: [] });

      await expect(createCompletePackage(options)).resolves.not.toThrow();
    });

    it('should handle null scriptMeta', async () => {
      const options = createCompletePackageOptions({ scriptMeta: null });

      await createCompletePackage(options);

      const styleCall = mockZipFile.mock.calls.find((call: [string, unknown]) =>
        call[0].includes('_style.json')
      );
      const styleContent = JSON.parse(styleCall?.[1] as string);
      expect(styleContent.name).toBe('Custom Style');
    });

    it('should include exportedAt timestamp in style', async () => {
      const before = new Date().toISOString();
      const options = createCompletePackageOptions();

      await createCompletePackage(options);

      const after = new Date().toISOString();
      const styleCall = mockZipFile.mock.calls.find((call: [string, unknown]) =>
        call[0].includes('_style.json')
      );
      const styleContent = JSON.parse(styleCall?.[1] as string);

      expect(styleContent.exportedAt).toBeDefined();
      expect(styleContent.exportedAt >= before).toBe(true);
      expect(styleContent.exportedAt <= after).toBe(true);
    });

    it('should include version in style', async () => {
      const options = createCompletePackageOptions();

      await createCompletePackage(options);

      const styleCall = mockZipFile.mock.calls.find((call: [string, unknown]) =>
        call[0].includes('_style.json')
      );
      const styleContent = JSON.parse(styleCall?.[1] as string);

      expect(styleContent.version).toBe('1.0');
    });
  });
});
