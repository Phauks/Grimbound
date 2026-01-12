/**
 * PDF Text Renderer
 *
 * Shared text rendering utilities for PDF generation.
 * Handles color parsing, font selection, and text drawing with ligature prevention.
 */

import type { PDFDocument, PDFFont } from 'pdf-lib';
import { rgb } from 'pdf-lib';
import { logger } from '@/ts/utils/logger.js';
import type { FontCache } from './pdfFontLoader.js';
import type { ExtractedText } from './textExtractor.js';

/**
 * RGB color values normalized to 0-1 range for pdf-lib
 */
export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

/**
 * Internal font structure for accessing metrics.
 * This is not part of pdf-lib's public API but is stable.
 */
interface FontWithEmbedder {
  embedder?: {
    font?: {
      ascent?: number;
      unitsPerEm?: number;
    };
  };
}

/**
 * Parse CSS color string to PDF rgb color
 */
export function parseColor(colorStr: string): RGBColor {
  // Handle rgb/rgba format
  const rgbMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    return {
      r: Number.parseInt(rgbMatch[1], 10) / 255,
      g: Number.parseInt(rgbMatch[2], 10) / 255,
      b: Number.parseInt(rgbMatch[3], 10) / 255,
    };
  }

  // Handle hex format
  const hexMatch = colorStr.match(/^#([0-9a-f]{6})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    return {
      r: Number.parseInt(hex.slice(0, 2), 16) / 255,
      g: Number.parseInt(hex.slice(2, 4), 16) / 255,
      b: Number.parseInt(hex.slice(4, 6), 16) / 255,
    };
  }

  // Default to black
  return { r: 0, g: 0, b: 0 };
}

/**
 * Get the ascender height for a font at a given size.
 * The ascender is the distance from baseline to top of tallest glyph.
 *
 * Uses actual font metrics from the embedded font data.
 */
export function getAscender(font: PDFFont, fontSize: number): number {
  try {
    // Access the font embedder which contains actual font metrics
    const fontWithEmbedder = font as unknown as FontWithEmbedder;
    const embedder = fontWithEmbedder.embedder;
    if (embedder?.font) {
      const { ascent, unitsPerEm } = embedder.font;
      if (typeof ascent === 'number' && typeof unitsPerEm === 'number' && unitsPerEm > 0) {
        return (ascent / unitsPerEm) * fontSize;
      }
    }
  } catch {
    // Fall back to approximation if metrics unavailable
  }

  // Fallback: typical ascender is ~80% of font size
  return fontSize * 0.8;
}

/**
 * Check if text contains ligature-prone character sequences.
 * These are sequences that fonts commonly replace with ligature glyphs.
 */
export function hasLigatureSequences(text: string): boolean {
  // Common ligature sequences: fi, fl, ff, ffi, ffl, ft, st
  return /fi|fl|ff|ft|st/i.test(text);
}

/**
 * Draw text character-by-character to prevent ligature substitution.
 * This ensures the text renders with the same spacing as the DOM.
 */
export function drawTextWithoutLigatures(
  page: ReturnType<PDFDocument['addPage']>,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  font: PDFFont,
  color: RGBColor
): void {
  let currentX = x;
  for (const char of text) {
    page.drawText(char, {
      x: currentX,
      y,
      size: fontSize,
      font,
      color: rgb(color.r, color.g, color.b),
    });
    // Advance by the width of this character
    currentX += font.widthOfTextAtSize(char, fontSize);
  }
}

/**
 * Check if text is a bullet/circle character that should be drawn as a shape
 */
export function isBulletCharacter(text: string): boolean {
  const trimmed = text.trim();
  // Check for various bullet/circle characters
  // U+25CF BLACK CIRCLE, U+2022 BULLET, U+25CB WHITE CIRCLE, U+25E6 WHITE BULLET
  return trimmed === '●' || trimmed === '•' || trimmed === '○' || trimmed === '◦';
}

/**
 * Draw a filled circle for bullet/reminder indicators
 *
 * @param page - PDF page to draw on
 * @param x - Left edge of the text bounding box
 * @param centerY - Vertical center of the text line (in PDF coordinates)
 * @param fontSize - Font size for scaling the circle
 * @param color - Fill color
 */
export function drawBulletCircle(
  page: ReturnType<PDFDocument['addPage']>,
  x: number,
  centerY: number,
  fontSize: number,
  color: RGBColor
): void {
  // Circle radius - approximately 1/3 of font size for visibility
  const radius = fontSize * 0.3;
  // Center horizontally within the character width
  const centerX = x + radius;

  page.drawCircle({
    x: centerX,
    y: centerY,
    size: radius,
    color: rgb(color.r, color.g, color.b),
  });
}

/**
 * Get the appropriate font for a text element
 *
 * @param text - Extracted text element
 * @param fonts - Font cache
 * @param treatReminderAsBold - Whether to use bold for reminder tokens (night order only)
 */
export function getFontForText(
  text: ExtractedText,
  fonts: FontCache,
  treatReminderAsBold = false
): PDFFont {
  const { fontFamily, fontWeight, type } = text;

  // Night order: Reminder tokens always use bold
  if (treatReminderAsBold && type === 'reminderToken') {
    return fonts.TradeGothicBold;
  }

  // Check for bold weight
  const isBold = fontWeight === 'bold' || fontWeight === '700' || fontWeight === '600';

  switch (fontFamily) {
    case 'Dumbledor':
      return fonts.Dumbledor;
    case 'GoudyOldStyle':
      return fonts.GoudyOldStyle;
    case 'TradeGothicBold':
      return fonts.TradeGothicBold;
    case 'TradeGothic':
      return isBold ? fonts.TradeGothicBold : fonts.TradeGothic;
    default:
      return fonts.TradeGothic;
  }
}

/**
 * Draw extracted text onto a PDF page
 *
 * Note: pdf-lib uses bottom-left origin, so we need to flip Y coordinates.
 * We use actual font metrics to calculate baseline position.
 *
 * For text containing ligature sequences (fi, fl, ff, etc.), we draw
 * character-by-character to prevent pdf-lib from applying ligature
 * substitution, which would cause spacing mismatches with the DOM layout.
 *
 * Bullet characters are drawn as actual circles rather than font glyphs,
 * since the embedded fonts may not have these characters.
 *
 * @param page - PDF page to draw on
 * @param texts - Array of extracted text elements
 * @param fonts - Font cache
 * @param pageHeight - Page height in points (for Y coordinate conversion)
 * @param logContext - Logger context name
 * @param treatReminderAsBold - Whether to use bold for reminder tokens
 */
export function drawTextOnPage(
  page: ReturnType<PDFDocument['addPage']>,
  texts: ExtractedText[],
  fonts: FontCache,
  pageHeight: number,
  logContext = 'PdfTextRenderer',
  treatReminderAsBold = false
): void {
  for (const text of texts) {
    try {
      const color = parseColor(text.color);

      // Handle bullet characters specially - draw as circles
      if (isBulletCharacter(text.text)) {
        // Position circle at x-height center (middle of lowercase letters)
        // text.y is top of bounding box, offset down by ~40% of fontSize to reach x-height center
        const centerY = pageHeight - text.y - text.fontSize * 0.4;
        drawBulletCircle(page, text.x, centerY, text.fontSize, color);
        continue;
      }

      const font = getFontForText(text, fonts, treatReminderAsBold);

      // Get actual ascender from font metrics
      const ascender = getAscender(font, text.fontSize);

      // pdf-lib Y is from bottom, DOM Y is from top
      // DOM Y is the top of the text bounding box
      // Baseline = top of box + ascender distance
      const pdfY = pageHeight - text.y - ascender;

      // Check if text contains ligature sequences
      if (hasLigatureSequences(text.text)) {
        // Draw character-by-character to prevent ligature substitution
        drawTextWithoutLigatures(page, text.text, text.x, pdfY, text.fontSize, font, color);
      } else {
        // No ligature risk, draw normally (faster)
        page.drawText(text.text, {
          x: text.x,
          y: pdfY,
          size: text.fontSize,
          font,
          color: rgb(color.r, color.g, color.b),
        });
      }
    } catch (error) {
      // Log but don't fail on individual text errors
      logger.warn(logContext, `Failed to draw text: "${text.text}"`, error);
    }
  }
}
