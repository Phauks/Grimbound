/**
 * Blood on the Clocktower Token Generator
 * PDF Generator - PDF export functionality using pdf-lib
 */

import { PDFDocument } from 'pdf-lib';
import { generateBleedRing, hasValidSamples, sampleEdgeColors } from '@/ts/canvas/bleedUtils.js';
import CONFIG, { AVERY_TEMPLATES } from '@/ts/config.js';
import { BLEED_ALGORITHM, DEFAULT_COLORS, PDF_POINTS_PER_INCH } from '@/ts/constants.js';
import type {
  AveryTemplate,
  PDFOptions,
  ProgressCallback,
  Token,
  TokenLayoutItem,
} from '@/ts/types/index.js';
import { canvasToArrayBuffer, downloadFile } from '@/ts/utils/imageUtils.js';

export { downloadTokenPNG } from './pngExporter.js';
// Re-export ZIP and PNG functions for backward compatibility
export { createTokensZip } from './zipExporter.js';

/**
 * Get template for a given token type
 * Character tokens use 94500 (1.75"), reminder tokens use 94509 (1")
 */
function _getTemplateForTokenType(tokenType: Token['type']): AveryTemplate {
  if (tokenType === 'reminder') {
    return AVERY_TEMPLATES['avery-94509'];
  }
  // Character, script-name, almanac, pandemonium all use character template
  return AVERY_TEMPLATES['avery-94500'];
}

/**
 * Convert inches to points (PDF coordinate system)
 * PDF specification: 1 inch = 72 points
 */
function inchesToPoints(inches: number): number {
  return inches * PDF_POINTS_PER_INCH;
}

/**
 * Convert inches to pixels at given DPI
 */
function inchesToPixels(inches: number, dpi: number): number {
  return inches * dpi;
}

/**
 * PDFGenerator class handles PDF creation and layout using pdf-lib
 */
export class PDFGenerator {
  private options: PDFOptions;
  private pageWidthPx: number;
  private pageHeightPx: number;
  private marginPx: number;
  private usableWidth: number;
  private usableHeight: number;

  constructor(options: Partial<PDFOptions> = {}) {
    this.options = {
      pageWidth: options.pageWidth ?? CONFIG.PDF.PAGE_WIDTH,
      pageHeight: options.pageHeight ?? CONFIG.PDF.PAGE_HEIGHT,
      dpi: options.dpi ?? CONFIG.PDF.DPI,
      margin: options.margin ?? CONFIG.PDF.MARGIN,
      tokenPadding: options.tokenPadding ?? CONFIG.PDF.TOKEN_PADDING,
      xOffset: options.xOffset ?? CONFIG.PDF.X_OFFSET,
      yOffset: options.yOffset ?? CONFIG.PDF.Y_OFFSET,
      imageQuality: options.imageQuality ?? CONFIG.PDF.IMAGE_QUALITY,
      template: options.template ?? CONFIG.PDF.DEFAULT_TEMPLATE,
      bleed: options.bleed ?? 0.125, // Default 1/8" bleed for cutting
    };

    // Calculate usable area in pixels at configured DPI
    this.pageWidthPx = this.options.pageWidth * this.options.dpi;
    this.pageHeightPx = this.options.pageHeight * this.options.dpi;
    this.marginPx = this.options.margin * this.options.dpi;

    // Usable area
    this.usableWidth = this.pageWidthPx - 2 * this.marginPx;
    this.usableHeight = this.pageHeightPx - 2 * this.marginPx;
  }

  /**
   * Update generator options
   * @param newOptions - New options to apply
   */
  updateOptions(newOptions: Partial<PDFOptions>): void {
    this.options = { ...this.options, ...newOptions };

    // Recalculate dimensions
    this.pageWidthPx = this.options.pageWidth * this.options.dpi;
    this.pageHeightPx = this.options.pageHeight * this.options.dpi;
    this.marginPx = this.options.margin * this.options.dpi;
    this.usableWidth = this.pageWidthPx - 2 * this.marginPx;
    this.usableHeight = this.pageHeightPx - 2 * this.marginPx;
  }

  /**
   * Calculate grid layout for tokens
   * @param tokens - Array of token objects with canvas
   * @param separateByType - Whether to separate character and reminder tokens onto different pages
   * @returns Object with pages array and metadata about each page's template
   */
  calculateGridLayout(
    tokens: Token[],
    separateByType: boolean = true
  ): { pages: TokenLayoutItem[][]; pageTemplates: (AveryTemplate | null)[] } {
    if (!separateByType) {
      const pages = this.calculateSingleLayout(tokens, null);
      return { pages, pageTemplates: pages.map(() => null) };
    }

    // Separate tokens by type
    const characterTokens = tokens.filter(
      (t) =>
        t.type === 'character' ||
        t.type === 'script-name' ||
        t.type === 'almanac' ||
        t.type === 'pandemonium'
    );
    const reminderTokens = tokens.filter((t) => t.type === 'reminder');

    // Layout each group with its appropriate template
    // Character tokens use Avery 94500 (1.75"), reminders use Avery 94509 (1")
    const charTemplate = this.options.template === 'custom' ? null : AVERY_TEMPLATES['avery-94500'];
    const reminderTemplate =
      this.options.template === 'custom' ? null : AVERY_TEMPLATES['avery-94509'];

    const charPages = this.calculateSingleLayout(characterTokens, charTemplate);
    const reminderPages = this.calculateSingleLayout(reminderTokens, reminderTemplate);

    // Build template array for each page
    const pageTemplates: (AveryTemplate | null)[] = [
      ...charPages.map(() => charTemplate),
      ...reminderPages.map(() => reminderTemplate),
    ];

    // Character pages first, then reminder pages
    return { pages: [...charPages, ...reminderPages], pageTemplates };
  }

  /**
   * Calculate grid layout for a single array of tokens using template
   * @param tokens - Array of token objects with canvas
   * @param template - Avery template to use, or null for legacy layout
   * @returns Array of pages with token positions
   */
  private calculateSingleLayout(
    tokens: Token[],
    template: AveryTemplate | null
  ): TokenLayoutItem[][] {
    if (!template) {
      return this.calculateLegacyLayout(tokens);
    }

    const pages: TokenLayoutItem[][] = [];
    let currentPage: TokenLayoutItem[] = [];

    // Convert template dimensions to pixels
    const dpi = this.options.dpi;
    const _leftMarginPx = inchesToPixels(template.leftMargin, dpi);
    const _topMarginPx = inchesToPixels(template.topMargin, dpi);
    const gapPx = inchesToPixels(template.gap, dpi);
    const labelDiameterPx = inchesToPixels(template.labelDiameter, dpi);

    let col = 0;
    let row = 0;

    for (const token of tokens) {
      // Check if we need a new page
      if (row >= template.rows) {
        pages.push(currentPage);
        currentPage = [];
        col = 0;
        row = 0;
      }

      // Calculate position based on grid
      // Position is relative to page origin (0,0), margins applied in renderPDF
      const x = col * (labelDiameterPx + gapPx);
      const y = row * (labelDiameterPx + gapPx);

      currentPage.push({
        token,
        x,
        y,
        width: labelDiameterPx,
        height: labelDiameterPx,
      });

      // Move to next cell
      col++;
      if (col >= template.columns) {
        col = 0;
        row++;
      }
    }

    // Add last page if not empty
    if (currentPage.length > 0) {
      pages.push(currentPage);
    }

    return pages;
  }

  /**
   * Legacy layout algorithm (for custom/no template)
   * @param tokens - Array of token objects with canvas
   * @returns Array of pages with token positions
   */
  private calculateLegacyLayout(tokens: Token[]): TokenLayoutItem[][] {
    const pages: TokenLayoutItem[][] = [];
    let currentPage: TokenLayoutItem[] = [];
    let currentX = 0;
    let currentY = 0;
    let rowHeight = 0;

    for (const token of tokens) {
      // Use the original diameter instead of scaled canvas dimensions
      const tokenSize = token.diameter;

      // Check if token fits on current row
      if (currentX + tokenSize > this.usableWidth) {
        // Move to next row
        currentX = 0;
        currentY += rowHeight + this.options.tokenPadding;
        rowHeight = 0;
      }

      // Check if token fits on current page
      if (currentY + tokenSize > this.usableHeight) {
        // Save current page and start new one
        pages.push(currentPage);
        currentPage = [];
        currentX = 0;
        currentY = 0;
        rowHeight = 0;
      }

      // Add token to current position
      currentPage.push({
        token,
        x: currentX,
        y: currentY,
        width: tokenSize,
        height: tokenSize,
      });

      // Update position
      rowHeight = Math.max(rowHeight, tokenSize);
      currentX += tokenSize + this.options.tokenPadding;
    }

    // Add last page if not empty
    if (currentPage.length > 0) {
      pages.push(currentPage);
    }

    return pages;
  }

  /**
   * Create bleed canvas with extended edge colors using pixel-perfect ring generation.
   *
   * This algorithm fixes the white circle artifact by:
   * 1. Sampling colors from a safe zone INSIDE the token edge (avoids anti-aliased pixels)
   * 2. Generating a bleed ring that extends INWARD to overlap with anti-aliased zone
   * 3. Drawing the original token on top so anti-aliased edges blend with bleed colors
   *
   * @param tokenCanvas - Original token canvas
   * @param bleedPx - Bleed size in pixels
   * @returns Canvas with bleed area
   */
  private createBleedCanvas(tokenCanvas: HTMLCanvasElement, bleedPx: number): HTMLCanvasElement {
    const originalSize = tokenCanvas.width;
    const bleedSize = originalSize + bleedPx * 2;
    const originalRadius = originalSize / 2;
    const center = originalSize / 2;

    const bleedCanvas = document.createElement('canvas');
    bleedCanvas.width = bleedSize;
    bleedCanvas.height = bleedSize;
    const bleedCtx = bleedCanvas.getContext('2d');

    if (!bleedCtx) {
      return tokenCanvas; // Fallback to original if context fails
    }

    // No bleed requested? Just center the token on the larger canvas
    if (bleedPx <= 0) {
      // Fill with white background for consistency
      bleedCtx.fillStyle = DEFAULT_COLORS.BACKGROUND_WHITE;
      bleedCtx.fillRect(0, 0, bleedSize, bleedSize);
      bleedCtx.drawImage(tokenCanvas, bleedPx, bleedPx);
      return bleedCanvas;
    }

    // Get token image data for edge sampling
    const tokenCtx = tokenCanvas.getContext('2d');
    if (!tokenCtx) {
      bleedCtx.fillStyle = DEFAULT_COLORS.BACKGROUND_WHITE;
      bleedCtx.fillRect(0, 0, bleedSize, bleedSize);
      bleedCtx.drawImage(tokenCanvas, bleedPx, bleedPx);
      return bleedCanvas;
    }

    const imageData = tokenCtx.getImageData(0, 0, originalSize, originalSize);

    // Sample colors from safe zone inside the token edge
    const samples = sampleEdgeColors(
      imageData,
      center,
      originalRadius,
      BLEED_ALGORITHM.SAMPLE_COUNT,
      BLEED_ALGORITHM.SAFE_SAMPLE_DISTANCE
    );

    // Validate that we have enough opaque samples for bleed generation
    if (
      !hasValidSamples(
        samples,
        BLEED_ALGORITHM.MIN_VALID_SAMPLE_RATIO,
        BLEED_ALGORITHM.MIN_ALPHA_THRESHOLD
      )
    ) {
      // Token may have transparent edges - fall back to white background
      bleedCtx.fillStyle = DEFAULT_COLORS.BACKGROUND_WHITE;
      bleedCtx.fillRect(0, 0, bleedSize, bleedSize);
      bleedCtx.drawImage(tokenCanvas, bleedPx, bleedPx);
      return bleedCanvas;
    }

    // Fill background with white first (for any corners outside the circular bleed)
    bleedCtx.fillStyle = DEFAULT_COLORS.BACKGROUND_WHITE;
    bleedCtx.fillRect(0, 0, bleedSize, bleedSize);

    // Generate the bleed ring with inward overlap
    // This ring extends inward by INNER_OVERLAP pixels to overlap with the token's
    // anti-aliased edge zone, ensuring smooth color blending
    generateBleedRing(
      bleedCtx,
      bleedSize,
      originalRadius,
      {
        bleedPx,
        innerOverlap: BLEED_ALGORITHM.INNER_OVERLAP,
      },
      samples,
      BLEED_ALGORITHM.MIN_ALPHA_THRESHOLD
    );

    // Draw the original token on top
    // The anti-aliased edge pixels will now blend with the bleed colors
    // instead of the white background, eliminating the white circle artifact
    bleedCtx.drawImage(tokenCanvas, bleedPx, bleedPx);

    return bleedCanvas;
  }

  /**
   * Generate PDF from tokens using pdf-lib
   * @param tokens - Array of token objects with canvas
   * @param progressCallback - Progress callback (current token, total tokens)
   * @param separatePages - Whether to separate character and reminder tokens onto different pages (default: true)
   * @returns Generated PDF as Uint8Array
   */
  async generatePDF(
    tokens: Token[],
    progressCallback: ProgressCallback | null = null,
    separatePages: boolean = true
  ): Promise<Uint8Array> {
    // Create PDF document
    const pdfDoc = await PDFDocument.create();

    // Calculate layout
    const { pages, pageTemplates } = this.calculateGridLayout(tokens, separatePages);

    if (pages.length === 0) {
      return pdfDoc.save();
    }

    // Page dimensions in points
    const pageWidthPt = inchesToPoints(this.options.pageWidth);
    const pageHeightPt = inchesToPoints(this.options.pageHeight);

    // Track tokens processed for progress reporting
    let tokensProcessed = 0;
    const totalTokens = tokens.length;

    // Calculate bleed in pixels and inches
    const bleedInches = this.options.bleed ?? 0;
    const bleedPx = Math.round(bleedInches * this.options.dpi);

    // Generate each page
    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
      const pageItems = pages[pageIndex];
      const template = pageTemplates[pageIndex];

      // Add page with dimensions
      const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);

      // Determine margins based on template or fallback to options
      const leftMarginInches = template ? template.leftMargin : this.options.margin;
      const topMarginInches = template ? template.topMargin : this.options.margin;

      // Add tokens to page
      for (const item of pageItems) {
        // Create bleed canvas
        const bleedCanvas = this.createBleedCanvas(item.token.canvas, bleedPx);

        // Convert canvas to ArrayBuffer (efficient, no base64)
        const imageBuffer = await canvasToArrayBuffer(
          bleedCanvas,
          'image/jpeg',
          this.options.imageQuality
        );

        // Embed image in PDF
        const image = await pdfDoc.embedJpg(imageBuffer);

        // Calculate position in points
        // Note: PDF coordinate system has origin at bottom-left, Y increases upward
        const xOffsetInches = this.options.xOffset;
        const yOffsetInches = this.options.yOffset;

        // Position calculation (accounting for bleed offset)
        const xInches = leftMarginInches + xOffsetInches + item.x / this.options.dpi - bleedInches;
        // Convert from top-down (layout) to bottom-up (PDF) coordinates
        const yFromTop = topMarginInches + yOffsetInches + item.y / this.options.dpi - bleedInches;
        const heightInches = (item.height + bleedPx * 2) / this.options.dpi;
        const yInches = this.options.pageHeight - yFromTop - heightInches;

        const widthInches = (item.width + bleedPx * 2) / this.options.dpi;

        // Draw image on page (convert inches to points)
        page.drawImage(image, {
          x: inchesToPoints(xInches),
          y: inchesToPoints(yInches),
          width: inchesToPoints(widthInches),
          height: inchesToPoints(heightInches),
        });

        // Report progress by token
        tokensProcessed++;
        if (progressCallback) {
          progressCallback(tokensProcessed, totalTokens);
        }
      }
    }

    return pdfDoc.save();
  }

  /**
   * Generate and download PDF
   * @param tokens - Array of token objects with canvas
   * @param filename - Output filename
   * @param progressCallback - Progress callback
   * @param separatePages - Whether to separate character and reminder tokens onto different pages (default: true)
   */
  async downloadPDF(
    tokens: Token[],
    filename: string = 'tokens.pdf',
    progressCallback: ProgressCallback | null = null,
    separatePages: boolean = true
  ): Promise<void> {
    const pdfBytes = await this.generatePDF(tokens, progressCallback, separatePages);
    // Create fresh Uint8Array for Blob compatibility (pdf-lib types include SharedArrayBuffer)
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
    downloadFile(blob, filename);
  }

  /**
   * Generate and return PDF as blob
   * @param tokens - Array of token objects with canvas
   * @param progressCallback - Progress callback
   * @param separatePages - Whether to separate character and reminder tokens onto different pages (default: true)
   * @returns PDF blob
   */
  async getPDFBlob(
    tokens: Token[],
    progressCallback: ProgressCallback | null = null,
    separatePages: boolean = true
  ): Promise<Blob> {
    const pdfBytes = await this.generatePDF(tokens, progressCallback, separatePages);
    // Create fresh Uint8Array for Blob compatibility (pdf-lib types include SharedArrayBuffer)
    return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
  }
}

export default { PDFGenerator };
