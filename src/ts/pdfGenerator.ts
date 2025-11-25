/**
 * Blood on the Clocktower Token Generator
 * PDF Generator - PDF export functionality
 */

import CONFIG from './config.js';
import { canvasToBlob } from './utils.js';
import type { Token, PDFOptions, TokenLayoutItem, ProgressCallback, jsPDFDocument, JSZipInstance } from './types/index.js';

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

    constructor(options: Partial<PDFOptions> = {}) {
        this.options = {
            pageWidth: options.pageWidth ?? CONFIG.PDF.PAGE_WIDTH,
            pageHeight: options.pageHeight ?? CONFIG.PDF.PAGE_HEIGHT,
            dpi: options.dpi ?? CONFIG.PDF.DPI,
            margin: options.margin ?? CONFIG.PDF.MARGIN,
            tokenPadding: options.tokenPadding ?? CONFIG.PDF.TOKEN_PADDING,
            xOffset: options.xOffset ?? CONFIG.PDF.X_OFFSET,
            yOffset: options.yOffset ?? CONFIG.PDF.Y_OFFSET
        };

        // Calculate usable area in pixels at 300 DPI
        this.pageWidthPx = this.options.pageWidth * this.options.dpi;
        this.pageHeightPx = this.options.pageHeight * this.options.dpi;
        this.marginPx = this.options.margin * this.options.dpi;

        // Usable area
        this.usableWidth = this.pageWidthPx - (2 * this.marginPx);
        this.usableHeight = this.pageHeightPx - (2 * this.marginPx);
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
        this.usableWidth = this.pageWidthPx - (2 * this.marginPx);
        this.usableHeight = this.pageHeightPx - (2 * this.marginPx);
    }

    /**
     * Calculate grid layout for tokens
     * @param tokens - Array of token objects with canvas
     * @returns Array of pages with token positions
     */
    calculateGridLayout(tokens: Token[]): TokenLayoutItem[][] {
        const pages: TokenLayoutItem[][] = [];
        let currentPage: TokenLayoutItem[] = [];
        let currentX = this.options.xOffset;
        let currentY = this.options.yOffset;
        let rowHeight = 0;

        for (const token of tokens) {
            const tokenWidth = token.canvas.width;
            const tokenHeight = token.canvas.height;
            const tokenSize = Math.max(tokenWidth, tokenHeight);

            // Check if token fits on current row
            if (currentX + tokenSize > this.usableWidth) {
                // Move to next row
                currentX = this.options.xOffset;
                currentY += rowHeight + this.options.tokenPadding;
                rowHeight = 0;
            }

            // Check if token fits on current page
            if (currentY + tokenSize > this.usableHeight) {
                // Save current page and start new one
                pages.push(currentPage);
                currentPage = [];
                currentX = this.options.xOffset;
                currentY = this.options.yOffset;
                rowHeight = 0;
            }

            // Add token to current position
            currentPage.push({
                token,
                x: currentX,
                y: currentY,
                width: tokenWidth,
                height: tokenHeight
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
     * @param progressCallback - Progress callback (page, totalPages)
     * @returns Generated PDF document
     */
    async generatePDF(tokens: Token[], progressCallback: ProgressCallback | null = null): Promise<jsPDFDocument> {
        const jspdfLib = window.jspdf;
        if (!jspdfLib) {
            throw new Error('jsPDF library not loaded');
        }

        // Create PDF document (dimensions in inches)
        const pdf = new jspdfLib.jsPDF({
            orientation: 'portrait',
            unit: 'in',
            format: [this.options.pageWidth, this.options.pageHeight]
        });

        // Calculate layout
        const pages = this.calculateGridLayout(tokens);

        if (pages.length === 0) {
            return pdf;
        }

        // Generate each page
        for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
            const page = pages[pageIndex];

            if (pageIndex > 0) {
                pdf.addPage();
            }

            if (progressCallback) {
                progressCallback(pageIndex + 1, pages.length);
            }

            // Add tokens to page
            for (const item of page) {
                // Convert canvas to base64 image
                const dataUrl = item.token.canvas.toDataURL('image/png');

                // Calculate position in inches (from pixels at 300 DPI)
                const xInches = (this.marginPx + item.x) / this.options.dpi;
                const yInches = (this.marginPx + item.y) / this.options.dpi;
                const widthInches = item.width / this.options.dpi;
                const heightInches = item.height / this.options.dpi;

                // Add image to PDF
                pdf.addImage(
                    dataUrl,
                    'PNG',
                    xInches,
                    yInches,
                    widthInches,
                    heightInches
                );
            }
        }

        return pdf;
    }

    /**
     * Generate and download PDF
     * @param tokens - Array of token objects with canvas
     * @param filename - Output filename
     * @param progressCallback - Progress callback
     */
    async downloadPDF(
        tokens: Token[],
        filename: string = 'tokens.pdf',
        progressCallback: ProgressCallback | null = null
    ): Promise<void> {
        const pdf = await this.generatePDF(tokens, progressCallback);
        pdf.save(filename);
    }

    /**
     * Generate and return PDF as blob
     * @param tokens - Array of token objects with canvas
     * @param progressCallback - Progress callback
     * @returns PDF blob
     */
    async getPDFBlob(tokens: Token[], progressCallback: ProgressCallback | null = null): Promise<Blob> {
        const pdf = await this.generatePDF(tokens, progressCallback);
        return pdf.output('blob');
    }
}

/**
 * Create a ZIP file with all token images
 * @param tokens - Array of token objects with canvas
 * @param progressCallback - Progress callback
 * @returns ZIP file blob
 */
export async function createTokensZip(
    tokens: Token[],
    progressCallback: ProgressCallback | null = null
): Promise<Blob> {
    // Validate input
    if (!tokens || !Array.isArray(tokens)) {
        throw new Error('Invalid tokens parameter: expected an array');
    }

    if (tokens.length === 0) {
        throw new Error('No tokens to export');
    }

    const JSZipConstructor = window.JSZip;
    if (!JSZipConstructor) {
        throw new Error('JSZip library not loaded');
    }

    const zip: JSZipInstance = new JSZipConstructor();

    // Create folders for character and reminder tokens
    const charFolder = zip.folder('character_tokens');
    const reminderFolder = zip.folder('reminder_tokens');

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        if (progressCallback) {
            progressCallback(i + 1, tokens.length);
        }

        // Convert canvas to blob
        const blob = await canvasToBlob(token.canvas);
        const filename = `${token.filename}.png`;

        // Add to appropriate folder - special tokens go in character_tokens
        if (token.type === 'character' || token.type === 'script-name' || token.type === 'almanac') {
            charFolder.file(filename, blob);
        } else {
            reminderFolder.file(filename, blob);
        }
    }

    // Generate ZIP
    return await zip.generateAsync({ type: 'blob' });
}

/**
 * Download a single token as PNG
 * @param token - Token object with canvas
 */
export async function downloadTokenPNG(token: Token): Promise<void> {
    const blob = await canvasToBlob(token.canvas);
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${token.filename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}

export default {
    PDFGenerator,
    createTokensZip,
    downloadTokenPNG
};
