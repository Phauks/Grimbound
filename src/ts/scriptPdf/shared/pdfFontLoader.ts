/**
 * PDF Font Loader
 *
 * Shared font loading utilities for PDF generation.
 * Used by both Night Order and Player Script PDF exporters.
 */

import type { PDFDocument, PDFFont } from 'pdf-lib';
import { logger } from '@/ts/utils/logger.js';
import { FONT_PATHS } from './pdfConstants.js';

/**
 * Font cache containing all embedded fonts for a PDF document
 */
export interface FontCache {
  Dumbledor: PDFFont;
  GoudyOldStyle: PDFFont;
  TradeGothic: PDFFont;
  TradeGothicBold: PDFFont;
}

/**
 * Load a font file and embed it in the PDF document
 */
export async function loadFont(pdfDoc: PDFDocument, path: string): Promise<PDFFont> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load font: ${path}`);
  }
  const fontBytes = await response.arrayBuffer();
  return await pdfDoc.embedFont(fontBytes);
}

/**
 * Load all required fonts for script PDFs
 *
 * @param pdfDoc - The PDF document to embed fonts into
 * @param logContext - Logger context name (e.g., 'NightOrderPdfExporter')
 */
export async function loadAllFonts(
  pdfDoc: PDFDocument,
  logContext = 'PdfFontLoader'
): Promise<FontCache> {
  const startTime = performance.now();

  const [dumbledor, goudyOldStyle, tradeGothic, tradeGothicBold] = await Promise.all([
    loadFont(pdfDoc, FONT_PATHS.Dumbledor),
    loadFont(pdfDoc, FONT_PATHS.GoudyOldStyle),
    loadFont(pdfDoc, FONT_PATHS.TradeGothic),
    loadFont(pdfDoc, FONT_PATHS.TradeGothicBold),
  ]);

  logger.info(logContext, `Fonts loaded in ${(performance.now() - startTime).toFixed(0)}ms`);

  return {
    Dumbledor: dumbledor,
    GoudyOldStyle: goudyOldStyle,
    TradeGothic: tradeGothic,
    TradeGothicBold: tradeGothicBold,
  };
}
