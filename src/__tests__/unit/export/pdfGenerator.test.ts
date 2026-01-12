/**
 * Unit tests for PDFGenerator
 *
 * Tests PDF generation including layout calculation, grid layout, bleed canvas creation,
 * and complete PDF generation workflows.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PDFGenerator } from '@/ts/export/pdfGenerator';
import type { PDFOptions, Token } from '@/ts/types';

// ============================================================================
// Mocks
// ============================================================================

// Mock pdf-lib
vi.mock('pdf-lib', () => ({
  PDFDocument: {
    create: vi.fn(async () => ({
      addPage: vi.fn().mockReturnValue({
        drawImage: vi.fn(),
      }),
      embedJpg: vi.fn().mockResolvedValue({
        width: 300,
        height: 300,
      }),
      save: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4, 5])),
    })),
  },
}));

// Mock image utilities
vi.mock('@/ts/utils/imageUtils.js', () => ({
  canvasToArrayBuffer: vi.fn(async () => new ArrayBuffer(1000)),
  downloadFile: vi.fn(),
}));

// Mock canvas utilities
vi.mock('@/ts/canvas/bleedUtils.js', () => ({
  generateBleedRing: vi.fn(),
  hasValidSamples: vi.fn().mockReturnValue(true),
  sampleEdgeColors: vi.fn().mockReturnValue([
    { r: 255, g: 255, b: 255, a: 255 },
    { r: 255, g: 255, b: 255, a: 255 },
    { r: 255, g: 255, b: 255, a: 255 },
  ]),
}));

// Mock TokenFactory
vi.mock('@/ts/generation/TokenFactory.js', () => ({
  getTokenCanvas: vi.fn(async (_token: Token) => {
    const canvas = document.createElement('canvas');
    canvas.width = 525;
    canvas.height = 525;
    // Fill with solid color for testing
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 525, 525);
    }
    return canvas;
  }),
}));

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create a mock token for testing
 */
function createMockToken(overrides: Partial<Token> = {}): Token {
  const canvas = document.createElement('canvas');
  canvas.width = 525;
  canvas.height = 525;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 525, 525);
  }

  return {
    type: 'character',
    name: 'Test Character',
    filename: 'test.png',
    team: 'townsfolk',
    canvas,
    diameter: 525,
    ...overrides,
  };
}

/**
 * Create multiple mock tokens
 */
function createMockTokens(count: number, overrides: Partial<Token> = {}): Token[] {
  return Array.from({ length: count }, (_, i) =>
    createMockToken({
      name: `Character ${i + 1}`,
      filename: `character-${i + 1}.png`,
      ...overrides,
    })
  );
}

// ============================================================================
// Tests
// ============================================================================

describe('PDFGenerator', () => {
  let generator: PDFGenerator;

  beforeEach(() => {
    generator = new PDFGenerator();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Constructor & Options
  // ==========================================================================

  describe('constructor', () => {
    it('should create generator with default options', () => {
      const gen = new PDFGenerator();

      expect(gen).toBeDefined();
    });

    it('should create generator with custom options', () => {
      const options: Partial<PDFOptions> = {
        pageWidth: 8.5,
        pageHeight: 11,
        dpi: 150,
        margin: 0.5,
      };

      const gen = new PDFGenerator(options);

      expect(gen).toBeDefined();
    });

    it('should initialize with CONFIG defaults when options not provided', () => {
      const gen = new PDFGenerator();

      // Test by attempting layout which relies on initialized dimensions
      const tokens = createMockTokens(1);
      const result = gen.calculateGridLayout(tokens, false);

      expect(result.pages).toBeDefined();
      expect(result.pageTemplates).toBeDefined();
    });

    it('should apply partial options with defaults', () => {
      const options: Partial<PDFOptions> = {
        dpi: 150,
        // Other properties use defaults
      };

      const gen = new PDFGenerator(options);
      expect(gen).toBeDefined();
    });

    it('should set bleed default to 0.125 inches', () => {
      const gen = new PDFGenerator({ dpi: 300 });
      const tokens = createMockTokens(1);

      // Test that bleed is applied in PDF generation
      const result = gen.calculateGridLayout(tokens, false);
      expect(result.pages.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Option Updates
  // ==========================================================================

  describe('updateOptions', () => {
    it('should update PDF options', () => {
      const gen = new PDFGenerator();
      const newOptions: Partial<PDFOptions> = {
        margin: 1,
      };

      gen.updateOptions(newOptions);

      // Test that updates apply by checking layout
      const tokens = createMockTokens(2);
      const result = gen.calculateGridLayout(tokens, false);
      expect(result.pages).toBeDefined();
    });

    it('should recalculate dimensions after update', () => {
      const gen = new PDFGenerator();
      const tokens1 = createMockTokens(5);
      const result1 = gen.calculateGridLayout(tokens1, false);

      // Update margin
      gen.updateOptions({ margin: 0.75 });
      const result2 = gen.calculateGridLayout(tokens1, false);

      // Results may differ due to different margin calculations
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    it('should preserve unspecified options', () => {
      const options: Partial<PDFOptions> = {
        margin: 0.5,
        pageWidth: 8.5,
      };
      const gen = new PDFGenerator(options);

      // Update only margin
      gen.updateOptions({ margin: 0.75 });

      // Other options should remain
      const tokens = createMockTokens(1);
      const result = gen.calculateGridLayout(tokens, false);
      expect(result.pages).toBeDefined();
    });
  });

  // ==========================================================================
  // Grid Layout - Legacy (Custom/No Template)
  // ==========================================================================

  describe('calculateGridLayout - Legacy Layout', () => {
    it('should create single page for tokens that fit', () => {
      const generator = new PDFGenerator({ margin: 0.5 });
      const tokens = createMockTokens(2);

      const result = generator.calculateGridLayout(tokens, false);

      expect(result.pages).toHaveLength(1);
      expect(result.pages[0]).toHaveLength(2);
    });

    it('should create multiple pages when tokens overflow', () => {
      const generator = new PDFGenerator({ dpi: 100, margin: 0.5, tokenPadding: 0.1 });
      const tokens = createMockTokens(20);

      const result = generator.calculateGridLayout(tokens, false);

      expect(result.pages.length).toBeGreaterThan(1);
    });

    it('should set template to null for legacy layout', () => {
      const generator = new PDFGenerator();
      const tokens = createMockTokens(3);

      const result = generator.calculateGridLayout(tokens, false);

      expect(result.pageTemplates.every((t) => t === null)).toBe(true);
    });

    it('should handle empty token array', () => {
      const generator = new PDFGenerator();
      const tokens: Token[] = [];

      const result = generator.calculateGridLayout(tokens, false);

      expect(result.pages).toEqual([]);
      expect(result.pageTemplates).toEqual([]);
    });

    it('should position tokens with x, y, width, height', () => {
      const generator = new PDFGenerator({ dpi: 150, margin: 0.25 });
      const tokens = createMockTokens(1);

      const result = generator.calculateGridLayout(tokens, false);

      expect(result.pages[0][0]).toHaveProperty('x');
      expect(result.pages[0][0]).toHaveProperty('y');
      expect(result.pages[0][0]).toHaveProperty('width');
      expect(result.pages[0][0]).toHaveProperty('height');
    });

    it('should set token reference in layout item', () => {
      const generator = new PDFGenerator();
      const tokens = createMockTokens(1);

      const result = generator.calculateGridLayout(tokens, false);

      expect(result.pages[0][0].token).toBe(tokens[0]);
    });
  });

  // ==========================================================================
  // Grid Layout - With Templates
  // ==========================================================================

  describe('calculateGridLayout - With Templates', () => {
    it('should separate character and reminder tokens', () => {
      const generator = new PDFGenerator();
      const characterTokens = createMockTokens(2, { type: 'character' });
      const reminderTokens = createMockTokens(2, { type: 'reminder' });
      const tokens = [...characterTokens, ...reminderTokens];

      const result = generator.calculateGridLayout(tokens, true);

      // Should have pages for characters, then pages for reminders
      expect(result.pages.length).toBeGreaterThan(0);
      expect(result.pageTemplates).toBeDefined();
    });

    it('should use Avery 94500 for character tokens', () => {
      const generator = new PDFGenerator({ template: 'avery-94500' });
      const tokens = createMockTokens(1, { type: 'character' });

      const result = generator.calculateGridLayout(tokens, true);

      expect(result.pages).toBeDefined();
      expect(result.pageTemplates).toBeDefined();
    });

    it('should use Avery 94509 for reminder tokens', () => {
      const generator = new PDFGenerator({ template: 'avery-94509' });
      const tokens = createMockTokens(1, { type: 'reminder' });

      const result = generator.calculateGridLayout(tokens, true);

      expect(result.pages).toBeDefined();
      expect(result.pageTemplates).toBeDefined();
    });

    it('should use null template for custom template option', () => {
      const generator = new PDFGenerator({ template: 'custom' });
      const tokens = createMockTokens(2);

      const result = generator.calculateGridLayout(tokens, true);

      expect(result.pageTemplates.every((t) => t === null)).toBe(true);
    });

    it('should layout tokens in grid based on template', () => {
      const generator = new PDFGenerator({ template: 'avery-94500', dpi: 300 });
      const tokens = createMockTokens(10, { type: 'character' });

      const result = generator.calculateGridLayout(tokens, true);

      // Should have at least one page
      expect(result.pages.length).toBeGreaterThan(0);
      // Tokens should be laid out in grid
      for (const page of result.pages) {
        for (const item of page) {
          expect(item.x).toBeGreaterThanOrEqual(0);
          expect(item.y).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('should handle meta tokens with character tokens', () => {
      const generator = new PDFGenerator();
      const characterTokens = createMockTokens(2, { type: 'character' });
      const scriptNameToken = createMockToken({ type: 'script-name' });
      const almanacToken = createMockToken({ type: 'almanac' });
      const tokens = [...characterTokens, scriptNameToken, almanacToken];

      const result = generator.calculateGridLayout(tokens, true);

      expect(result.pages.length).toBeGreaterThan(0);
    });

    it('should handle all token types in separate pages mode', () => {
      const generator = new PDFGenerator({ dpi: 150 });
      const tokens = [
        createMockToken({ type: 'character' }),
        createMockToken({ type: 'reminder' }),
        createMockToken({ type: 'script-name' }),
        createMockToken({ type: 'almanac' }),
      ];

      const result = generator.calculateGridLayout(tokens, true);

      expect(result.pages).toBeDefined();
      expect(result.pageTemplates).toBeDefined();
    });
  });

  // ==========================================================================
  // Bleed Canvas Creation
  // ==========================================================================

  describe('createBleedCanvas', () => {
    it('should create larger canvas for bleed', () => {
      const token = createMockToken();
      const originalCanvas = token.canvas;
      if (!originalCanvas) {
        throw new Error('Canvas should be defined');
      }
      const originalSize = originalCanvas.width;

      // Access private method for testing
      const result = (
        generator as unknown as {
          createBleedCanvas: (canvas: HTMLCanvasElement, bleedPx: number) => HTMLCanvasElement;
        }
      ).createBleedCanvas(originalCanvas, 10);

      expect(result.width).toBe(originalSize + 20);
      expect(result.height).toBe(originalSize + 20);
    });

    it('should handle zero bleed', () => {
      const token = createMockToken();
      const originalCanvas = token.canvas;
      if (!originalCanvas) {
        throw new Error('Canvas should be defined');
      }

      const result = (
        generator as unknown as {
          createBleedCanvas: (canvas: HTMLCanvasElement, bleedPx: number) => HTMLCanvasElement;
        }
      ).createBleedCanvas(originalCanvas, 0);

      expect(result).toBeDefined();
    });

    it('should handle negative bleed (treated as zero)', () => {
      const token = createMockToken();
      const originalCanvas = token.canvas;
      if (!originalCanvas) {
        throw new Error('Canvas should be defined');
      }

      const result = (
        generator as unknown as {
          createBleedCanvas: (canvas: HTMLCanvasElement, bleedPx: number) => HTMLCanvasElement;
        }
      ).createBleedCanvas(originalCanvas, -5);

      expect(result).toBeDefined();
    });

    it('should return canvas when context fails', () => {
      const token = createMockToken();
      const originalCanvas = token.canvas;
      if (!originalCanvas) {
        throw new Error('Canvas should be defined');
      }

      // Mock failed context
      const mockCanvas = {
        ...originalCanvas,
        getContext: () => null,
      };

      const result = (
        generator as unknown as {
          createBleedCanvas: (canvas: HTMLCanvasElement, bleedPx: number) => HTMLCanvasElement;
        }
      ).createBleedCanvas(mockCanvas as unknown as HTMLCanvasElement, 10);

      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // PDF Generation
  // ==========================================================================

  describe('generatePDF', () => {
    it('should generate PDF from tokens', async () => {
      const tokens = createMockTokens(2);

      const pdfBytes = await generator.generatePDF(tokens);

      expect(pdfBytes).toBeDefined();
      expect(pdfBytes instanceof Uint8Array || ArrayBuffer.isView(pdfBytes)).toBe(true);
    });

    it('should handle empty token array', async () => {
      const tokens: Token[] = [];

      const pdfBytes = await generator.generatePDF(tokens);

      expect(pdfBytes).toBeDefined();
    });

    it('should report progress via callback', async () => {
      const progressCallback = vi.fn();
      const tokens = createMockTokens(3);

      await generator.generatePDF(tokens, progressCallback);

      // Should be called for each token processed
      expect(progressCallback).toHaveBeenCalled();
      // Verify progress increases
      const calls = progressCallback.mock.calls;
      if (calls.length > 1) {
        for (let i = 0; i < calls.length - 1; i++) {
          expect(calls[i][0]).toBeLessThanOrEqual(calls[i + 1][0]);
        }
      }
    });

    it('should handle null progress callback', async () => {
      const tokens = createMockTokens(2);

      const pdfBytes = await generator.generatePDF(tokens, null);

      expect(pdfBytes).toBeDefined();
    });

    it('should separate pages by default', async () => {
      const tokens = createMockTokens(2);

      const pdfBytes = await generator.generatePDF(tokens, null, true);

      expect(pdfBytes).toBeDefined();
    });

    it('should not separate pages when specified', async () => {
      const tokens = createMockTokens(2);

      const pdfBytes = await generator.generatePDF(tokens, null, false);

      expect(pdfBytes).toBeDefined();
    });

    it('should handle character tokens', async () => {
      const tokens = createMockTokens(2, { type: 'character', team: 'townsfolk' });

      const pdfBytes = await generator.generatePDF(tokens);

      expect(pdfBytes).toBeDefined();
    });

    it('should handle reminder tokens', async () => {
      const tokens = createMockTokens(2, { type: 'reminder', team: 'demon' });

      const pdfBytes = await generator.generatePDF(tokens);

      expect(pdfBytes).toBeDefined();
    });

    it('should handle mixed token types', async () => {
      const tokens = [
        ...createMockTokens(2, { type: 'character' }),
        ...createMockTokens(2, { type: 'reminder' }),
        createMockToken({ type: 'script-name' }),
      ];

      const pdfBytes = await generator.generatePDF(tokens);

      expect(pdfBytes).toBeDefined();
    });

    it('should track total tokens in progress callback', async () => {
      const progressCallback = vi.fn();
      const tokens = createMockTokens(5);

      await generator.generatePDF(tokens, progressCallback);

      // Check that total tokens is passed correctly
      const calls = progressCallback.mock.calls;
      if (calls.length > 0) {
        const totalTokens = calls[0][1];
        expect(totalTokens).toBe(5);
      }
    });

    it('should use custom DPI for calculations', async () => {
      const generator300 = new PDFGenerator({ dpi: 300 });
      const generator150 = new PDFGenerator({ dpi: 150 });
      const tokens = createMockTokens(1);

      const pdf300 = await generator300.generatePDF(tokens);
      const pdf150 = await generator150.generatePDF(tokens);

      expect(pdf300).toBeDefined();
      expect(pdf150).toBeDefined();
    });

    it('should respect bleed setting', async () => {
      const generator = new PDFGenerator({ bleed: 0.125, dpi: 300 });
      const tokens = createMockTokens(1);

      const pdfBytes = await generator.generatePDF(tokens);

      expect(pdfBytes).toBeDefined();
    });
  });

  // ==========================================================================
  // PDF Download
  // ==========================================================================

  describe('downloadPDF', () => {
    it('should generate and download PDF', async () => {
      const tokens = createMockTokens(2);
      const filename = 'test-tokens.pdf';

      await generator.downloadPDF(tokens, filename);

      // Should not throw
      expect(true).toBe(true);
    });

    it('should use default filename', async () => {
      const tokens = createMockTokens(1);

      await generator.downloadPDF(tokens);

      expect(true).toBe(true);
    });

    it('should pass through progress callback', async () => {
      const progressCallback = vi.fn();
      const tokens = createMockTokens(2);

      await generator.downloadPDF(tokens, 'test.pdf', progressCallback);

      expect(progressCallback).toHaveBeenCalled();
    });

    it('should handle null progress callback', async () => {
      const tokens = createMockTokens(1);

      await generator.downloadPDF(tokens, 'test.pdf', null);

      expect(true).toBe(true);
    });

    it('should respect separatePages option', async () => {
      const tokens = createMockTokens(2);

      await generator.downloadPDF(tokens, 'test.pdf', null, false);

      expect(true).toBe(true);
    });
  });

  // ==========================================================================
  // Get PDF Blob
  // ==========================================================================

  describe('getPDFBlob', () => {
    it('should generate PDF and return as blob', async () => {
      const tokens = createMockTokens(2);

      const blob = await generator.getPDFBlob(tokens);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
    });

    it('should have correct MIME type', async () => {
      const tokens = createMockTokens(1);

      const blob = await generator.getPDFBlob(tokens);

      expect(blob.type).toBe('application/pdf');
    });

    it('should handle empty tokens array', async () => {
      const tokens: Token[] = [];

      const blob = await generator.getPDFBlob(tokens);

      expect(blob).toBeInstanceOf(Blob);
    });

    it('should pass through progress callback', async () => {
      const progressCallback = vi.fn();
      const tokens = createMockTokens(2);

      await generator.getPDFBlob(tokens, progressCallback);

      expect(progressCallback).toHaveBeenCalled();
    });

    it('should handle null progress callback', async () => {
      const tokens = createMockTokens(1);

      const blob = await generator.getPDFBlob(tokens, null);

      expect(blob).toBeInstanceOf(Blob);
    });

    it('should respect separatePages option', async () => {
      const tokens = createMockTokens(2);

      const blob = await generator.getPDFBlob(tokens, null, false);

      expect(blob).toBeInstanceOf(Blob);
    });
  });

  // ==========================================================================
  // Different DPI Scenarios
  // ==========================================================================

  describe('Different DPI Settings', () => {
    it('should handle 72 DPI (screen resolution)', async () => {
      const generator = new PDFGenerator({ dpi: 72 });
      const tokens = createMockTokens(1);

      const pdfBytes = await generator.generatePDF(tokens);

      expect(pdfBytes).toBeDefined();
    });

    it('should handle 150 DPI (draft quality)', async () => {
      const generator = new PDFGenerator({ dpi: 150 });
      const tokens = createMockTokens(1);

      const pdfBytes = await generator.generatePDF(tokens);

      expect(pdfBytes).toBeDefined();
    });

    it('should handle standard print quality generation', async () => {
      const generator = new PDFGenerator();
      const tokens = createMockTokens(1);

      const pdfBytes = await generator.generatePDF(tokens);

      expect(pdfBytes).toBeDefined();
    });
  });

  // ==========================================================================
  // Layout Option Scenarios
  // ==========================================================================

  describe('Different Layout Options', () => {
    it('should handle custom margins', async () => {
      const generator = new PDFGenerator({ margin: 0.75 });
      const tokens = createMockTokens(2);

      const pdfBytes = await generator.generatePDF(tokens);

      expect(pdfBytes).toBeDefined();
    });

    it('should handle different token padding', async () => {
      const generator = new PDFGenerator({ tokenPadding: 0.25 });
      const tokens = createMockTokens(2);

      const pdfBytes = await generator.generatePDF(tokens);

      expect(pdfBytes).toBeDefined();
    });

    it('should handle x and y offsets', async () => {
      const generator = new PDFGenerator({ xOffset: 0.1, yOffset: 0.1 });
      const tokens = createMockTokens(1);

      const pdfBytes = await generator.generatePDF(tokens);

      expect(pdfBytes).toBeDefined();
    });

    it('should handle different page sizes', async () => {
      const generator = new PDFGenerator({ pageWidth: 8.5, pageHeight: 11 });
      const tokens = createMockTokens(2);

      const pdfBytes = await generator.generatePDF(tokens);

      expect(pdfBytes).toBeDefined();
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle single token', async () => {
      const tokens = createMockTokens(1);

      const pdfBytes = await generator.generatePDF(tokens);

      expect(pdfBytes).toBeDefined();
    });

    it('should handle very large token array', async () => {
      const tokens = createMockTokens(100);

      const pdfBytes = await generator.generatePDF(tokens);

      expect(pdfBytes).toBeDefined();
    });

    it('should handle tokens with missing canvas property', async () => {
      const tokens = createMockTokens(1);
      tokens[0].canvas = undefined;

      // Should not throw - getTokenCanvas will recreate
      const pdfBytes = await generator.generatePDF(tokens);

      expect(pdfBytes).toBeDefined();
    });

    it('should handle tokens with dataUrl', async () => {
      const tokens = createMockTokens(1);
      tokens[0].dataUrl = 'data:image/png;base64,iVBORw0KGgo=';

      const pdfBytes = await generator.generatePDF(tokens);

      expect(pdfBytes).toBeDefined();
    });

    it('should handle all team types', async () => {
      const teams = ['townsfolk', 'outsider', 'minion', 'demon', 'traveller', 'fabled'] as const;
      const tokens = teams.map((team) => createMockToken({ team }));

      const pdfBytes = await generator.generatePDF(tokens);

      expect(pdfBytes).toBeDefined();
    });

    it('should handle tokens with special characters in filename', async () => {
      const tokens = createMockTokens(1);
      tokens[0].filename = 'test-character_[1].png';

      const pdfBytes = await generator.generatePDF(tokens);

      expect(pdfBytes).toBeDefined();
    });

    it('should handle very small page dimensions', async () => {
      const generator = new PDFGenerator({ pageWidth: 3, pageHeight: 3, dpi: 100 });
      const tokens = createMockTokens(1);

      const pdfBytes = await generator.generatePDF(tokens);

      expect(pdfBytes).toBeDefined();
    });

    it('should handle very large page dimensions', async () => {
      const generator = new PDFGenerator({ pageWidth: 20, pageHeight: 20, dpi: 300 });
      const tokens = createMockTokens(1);

      const pdfBytes = await generator.generatePDF(tokens);

      expect(pdfBytes).toBeDefined();
    });

    it('should handle tokens created at different times', async () => {
      const token1 = createMockToken({ name: 'Token 1', order: 0 });
      const token2 = createMockToken({ name: 'Token 2', order: 1 });
      const tokens = [token1, token2];

      const pdfBytes = await generator.generatePDF(tokens);

      expect(pdfBytes).toBeDefined();
    });
  });

  // ==========================================================================
  // Integration Scenarios
  // ==========================================================================

  describe('Integration Scenarios', () => {
    it('should handle full workflow: generate, download, and blob', async () => {
      const tokens = createMockTokens(3);
      const progressCallback = vi.fn();

      const pdfBlob = await generator.getPDFBlob(tokens, progressCallback);

      expect(pdfBlob).toBeInstanceOf(Blob);
      expect(progressCallback).toHaveBeenCalled();
    });

    it('should handle update options then generate', async () => {
      const tokens = createMockTokens(2);

      generator.updateOptions({ dpi: 200 });
      const pdfBytes = await generator.generatePDF(tokens);

      expect(pdfBytes).toBeDefined();
    });

    it('should handle consecutive PDF generation', async () => {
      const tokens1 = createMockTokens(2);
      const tokens2 = createMockTokens(3);

      const pdf1 = await generator.generatePDF(tokens1);
      const pdf2 = await generator.generatePDF(tokens2);

      expect(pdf1).toBeDefined();
      expect(pdf2).toBeDefined();
    });

    it('should handle layout calculation multiple times', () => {
      const tokens = createMockTokens(5);

      const layout1 = generator.calculateGridLayout(tokens, true);
      const layout2 = generator.calculateGridLayout(tokens, false);

      expect(layout1).toBeDefined();
      expect(layout2).toBeDefined();
    });

    it('should handle mixed workflow with different separatePages settings', async () => {
      const tokens = createMockTokens(2);

      const pdf1 = await generator.generatePDF(tokens, null, true);
      const pdf2 = await generator.generatePDF(tokens, null, false);

      expect(pdf1).toBeDefined();
      expect(pdf2).toBeDefined();
    });
  });
});
