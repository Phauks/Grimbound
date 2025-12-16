/**
 * Blood on the Clocktower Token Generator
 * PDF Generator - PDF export functionality
 */

import { jsPDF } from 'jspdf';
import CONFIG, { AVERY_TEMPLATES } from '../config.js';
import type {
  AveryTemplate,
  jsPDFDocument,
  PDFOptions,
  ProgressCallback,
  Token,
  TokenLayoutItem,
} from '../types/index.js';

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
 * PDFGenerator class handles PDF creation and layout
 */
export class PDFGenerator {
  private options: PDFOptions;
  private pageWidthPx: number;
  private pageHeightPx: number;
  private marginPx: number;
  private usableWidth: number;
  private usableHeight: number;

  /**
   * Convert inches to pixels at given DPI
   */
  private static inchesToPixels(inches: number, dpi: number): number {
    return inches * dpi;
  }

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

    // Calculate usable area in pixels at 300 DPI
    this.pageWidthPx = this.options.pageWidth * this.options.dpi;
    this.pageHeightPx = this.options.pageHeight * this.options.dpi;
    this.marginPx = this.options.margin * this.options.dpi;

    // Convert offsets from inches to pixels
    this.xOffsetPx = PDFGenerator.inchesToPixels(this.options.xOffset, this.options.dpi);
    this.yOffsetPx = PDFGenerator.inchesToPixels(this.options.yOffset, this.options.dpi);

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
    this.xOffsetPx = PDFGenerator.inchesToPixels(this.options.xOffset, this.options.dpi);
    this.yOffsetPx = PDFGenerator.inchesToPixels(this.options.yOffset, this.options.dpi);
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
    const _leftMarginPx = PDFGenerator.inchesToPixels(template.leftMargin, dpi);
    const _topMarginPx = PDFGenerator.inchesToPixels(template.topMargin, dpi);
    const gapPx = PDFGenerator.inchesToPixels(template.gap, dpi);
    const labelDiameterPx = PDFGenerator.inchesToPixels(template.labelDiameter, dpi);

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
   * Generate PDF from tokens
   * @param tokens - Array of token objects with canvas
   * @param progressCallback - Progress callback (current token, total tokens)
   * @param separatePages - Whether to separate character and reminder tokens onto different pages (default: true)
   * @returns Generated PDF document
   */
  async generatePDF(
    tokens: Token[],
    progressCallback: ProgressCallback | null = null,
    separatePages: boolean = true
  ): Promise<jsPDFDocument> {
    // Create PDF document (dimensions in inches)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'in',
      format: [this.options.pageWidth, this.options.pageHeight],
      compress: true, // Enable PDF stream compression
    });

    // Calculate layout
    const { pages, pageTemplates } = this.calculateGridLayout(tokens, separatePages);

    if (pages.length === 0) {
      return pdf;
    }

    // Track tokens processed for progress reporting
    let tokensProcessed = 0;
    const totalTokens = tokens.length;

    // Generate each page
    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
      const page = pages[pageIndex];
      const template = pageTemplates[pageIndex];

      if (pageIndex > 0) {
        pdf.addPage();
      }

      // Determine margins based on template or fallback to options
      const leftMarginInches = template ? template.leftMargin : this.options.margin;
      const topMarginInches = template ? template.topMargin : this.options.margin;

      // Calculate bleed in pixels
      const bleedInches = this.options.bleed ?? 0;
      const bleedPx = Math.round(bleedInches * this.options.dpi);

      // Add tokens to page
      for (const item of page) {
        const originalSize = item.token.canvas.width;
        const bleedSize = originalSize + bleedPx * 2;

        // Create a canvas with bleed area
        const bleedCanvas = document.createElement('canvas');
        bleedCanvas.width = bleedSize;
        bleedCanvas.height = bleedSize;
        const bleedCtx = bleedCanvas.getContext('2d');

        if (bleedCtx) {
          // Fill with white background
          bleedCtx.fillStyle = '#FFFFFF';
          bleedCtx.fillRect(0, 0, bleedSize, bleedSize);

          // If bleed is enabled, stretch edge colors outward
          if (bleedPx > 0) {
            const tokenCtx = item.token.canvas.getContext('2d');
            if (tokenCtx) {
              const imageData = tokenCtx.getImageData(0, 0, originalSize, originalSize);
              const center = originalSize / 2;
              const radius = originalSize / 2;

              // Sample edge colors and draw radial lines outward
              const steps = 720; // Sample every 0.5 degrees for smooth coverage
              for (let i = 0; i < steps; i++) {
                const angle = (i / steps) * Math.PI * 2;

                // Sample 2 pixels inside the edge to avoid anti-aliased pixels
                const sampleRadius = radius - 2;
                const edgeX = Math.round(center + Math.cos(angle) * sampleRadius);
                const edgeY = Math.round(center + Math.sin(angle) * sampleRadius);

                // Clamp to valid range
                const clampedX = Math.max(0, Math.min(originalSize - 1, edgeX));
                const clampedY = Math.max(0, Math.min(originalSize - 1, edgeY));

                // Sample pixel color at edge
                const pixelIndex = (clampedY * originalSize + clampedX) * 4;
                const r = imageData.data[pixelIndex];
                const g = imageData.data[pixelIndex + 1];
                const b = imageData.data[pixelIndex + 2];
                const a = imageData.data[pixelIndex + 3];

                // Only draw if pixel is not transparent
                if (a > 128) {
                  bleedCtx.strokeStyle = `rgb(${r},${g},${b})`;
                  bleedCtx.lineWidth = 4; // Thick lines for good coverage
                  bleedCtx.beginPath();
                  // Start from edge of token (in bleed canvas coordinates)
                  const startX = center + bleedPx + Math.cos(angle) * radius;
                  const startY = center + bleedPx + Math.sin(angle) * radius;
                  // End at outer edge of bleed zone
                  const endX = center + bleedPx + Math.cos(angle) * (radius + bleedPx);
                  const endY = center + bleedPx + Math.sin(angle) * (radius + bleedPx);
                  bleedCtx.moveTo(startX, startY);
                  bleedCtx.lineTo(endX, endY);
                  bleedCtx.stroke();
                }
              }
            }
          }

          // Draw the original token centered on bleed canvas
          bleedCtx.drawImage(item.token.canvas, bleedPx, bleedPx);
        }

        // Convert composite canvas to base64 JPEG image with quality setting
        const dataUrl = bleedCanvas.toDataURL('image/jpeg', this.options.imageQuality);

        // Calculate position in inches
        // item.x and item.y are in pixels, template margins are in inches
        // xOffset and yOffset are already in inches
        const xOffsetInches = this.options.xOffset;
        const yOffsetInches = this.options.yOffset;

        // Offset position by bleed so token CENTER stays in same place
        const xInches = leftMarginInches + xOffsetInches + item.x / this.options.dpi - bleedInches;
        const yInches = topMarginInches + yOffsetInches + item.y / this.options.dpi - bleedInches;
        // Include bleed in dimensions
        const widthInches = (item.width + bleedPx * 2) / this.options.dpi;
        const heightInches = (item.height + bleedPx * 2) / this.options.dpi;

        // Add image to PDF
        pdf.addImage(dataUrl, 'JPEG', xInches, yInches, widthInches, heightInches);

        // Report progress by token
        tokensProcessed++;
        if (progressCallback) {
          progressCallback(tokensProcessed, totalTokens);
        }
      }
    }

    return pdf;
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
    const pdf = await this.generatePDF(tokens, progressCallback, separatePages);
    pdf.save(filename);
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
    const pdf = await this.generatePDF(tokens, progressCallback, separatePages);
    return pdf.output('blob');
  }
}

export default { PDFGenerator };
