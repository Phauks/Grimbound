/**
 * Hybrid Night Order PDF Exporter
 *
 * Uses a two-phase approach for faster PDF generation:
 * 1. Capture visual layout with Snapdom (embedFonts: false) - FAST
 * 2. Overlay text using pdf-lib with embedded fonts - accurate typography
 *
 * This avoids the slow base64 font encoding in Snapdom while maintaining
 * high-quality font rendering in the final PDF.
 *
 * Fallback: If hybrid mode fails, automatically falls back to legacy mode.
 */

import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, type PDFFont, rgb } from 'pdf-lib';
import type { NightSheetBackground } from '@/components/ViewComponents/ScriptComponents/NightOrderView';
import type { ScriptMeta } from '@/ts/types/index.js';
import { downloadFile } from '@/ts/utils/imageUtils.js';
import { logger } from '@/ts/utils/logger.js';
import { paginateEntries } from './nightOrderLayout.js';
import {
  type ExportPhase,
  generateNightOrderPdf as legacyGeneratePdf,
  type NightOrderPdfOptions,
  type ProgressCallback,
} from './nightOrderPdfExporter.js';
import type { NightOrderState } from './nightOrderTypes.js';
import type { ExtractedText } from './textExtractor.js';

// Re-export types for convenience
export type { ExportPhase, NightOrderPdfOptions, ProgressCallback };

// ============================================================================
// Types
// ============================================================================

interface FontCache {
  Dumbledor: PDFFont;
  GoudyOldStyle: PDFFont;
  TradeGothic: PDFFont;
  TradeGothicBold: PDFFont;
}

// ============================================================================
// Constants
// ============================================================================

/** Letter page size in points (72 points = 1 inch) */
const PAGE_WIDTH_PT = 8.5 * 72; // 612
const PAGE_HEIGHT_PT = 11 * 72; // 792

/** JPEG quality for PDF embedding (0-1) */
const JPEG_QUALITY = 0.92;

/** Font file paths */
const FONT_PATHS = {
  Dumbledor: '/fonts/Dumbledor/Dumbledor.ttf',
  GoudyOldStyle: '/fonts/GoudyOldStyle/GoudyOldStyle.ttf',
  TradeGothic: '/fonts/TradeGothic/TradeGothic.otf',
  TradeGothicBold: '/fonts/TradeGothic/TradeGothicBold.otf',
} as const;

/** Default background settings */
const DEFAULT_BACKGROUND: NightSheetBackground = {
  baseColor: '#f4edd9',
  showTexture: true,
  textureOpacity: 0.06,
};

// ============================================================================
// Font Loading
// ============================================================================

/**
 * Load a font file and embed it in the PDF document
 */
async function loadFont(pdfDoc: PDFDocument, path: string): Promise<PDFFont> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load font: ${path}`);
  }
  const fontBytes = await response.arrayBuffer();
  return await pdfDoc.embedFont(fontBytes);
}

/**
 * Load all required fonts for the night sheet
 */
async function loadAllFonts(pdfDoc: PDFDocument): Promise<FontCache> {
  const startTime = performance.now();

  const [dumbledor, goudyOldStyle, tradeGothic, tradeGothicBold] = await Promise.all([
    loadFont(pdfDoc, FONT_PATHS.Dumbledor),
    loadFont(pdfDoc, FONT_PATHS.GoudyOldStyle),
    loadFont(pdfDoc, FONT_PATHS.TradeGothic),
    loadFont(pdfDoc, FONT_PATHS.TradeGothicBold),
  ]);

  logger.info(
    'HybridPdfExporter',
    `Fonts loaded in ${(performance.now() - startTime).toFixed(0)}ms`
  );

  return {
    Dumbledor: dumbledor,
    GoudyOldStyle: goudyOldStyle,
    TradeGothic: tradeGothic,
    TradeGothicBold: tradeGothicBold,
  };
}

// ============================================================================
// Color Parsing
// ============================================================================

/**
 * Parse CSS color string to PDF rgb color
 */
function parseColor(colorStr: string): { r: number; g: number; b: number } {
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

// ============================================================================
// Text Rendering
// ============================================================================

/**
 * Get the appropriate font for a text element
 */
function getFontForText(text: ExtractedText, fonts: FontCache): PDFFont {
  const { fontFamily, fontWeight, type } = text;

  // Reminder tokens always use bold
  if (type === 'reminderToken') {
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
 * Get the ascender height for a font at a given size.
 * The ascender is the distance from baseline to top of tallest glyph.
 *
 * Uses actual font metrics from the embedded font data.
 */
function getAscender(font: PDFFont, fontSize: number): number {
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
function hasLigatureSequences(text: string): boolean {
  // Common ligature sequences: fi, fl, ff, ffi, ffl, ft, st
  return /fi|fl|ff|ft|st/i.test(text);
}

/**
 * Draw text character-by-character to prevent ligature substitution.
 * This ensures the text renders with the same spacing as the DOM.
 */
function drawTextWithoutLigatures(
  page: ReturnType<PDFDocument['addPage']>,
  text: string,
  x: number,
  y: number,
  fontSize: number,
  font: PDFFont,
  color: { r: number; g: number; b: number }
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
function isBulletCharacter(text: string): boolean {
  const trimmed = text.trim();
  // Check for various bullet/circle characters
  // ● U+25CF BLACK CIRCLE
  // • U+2022 BULLET
  // ○ U+25CB WHITE CIRCLE
  // ◦ U+25E6 WHITE BULLET
  const isBullet = trimmed === '●' || trimmed === '•' || trimmed === '○' || trimmed === '◦';
  if (isBullet) {
    logger.debug(
      'HybridPdfExporter',
      `Detected bullet character: "${trimmed}" (U+${trimmed.charCodeAt(0).toString(16).toUpperCase()})`
    );
  }
  return isBullet;
}

/**
 * Draw a filled circle for reminder indicators
 * These are drawn as shapes rather than font glyphs for consistent rendering
 *
 * @param x - Left edge of the text bounding box
 * @param centerY - Vertical center of the text line (in PDF coordinates)
 * @param fontSize - Font size for scaling the circle
 * @param color - Fill color
 */
function drawBulletCircle(
  page: ReturnType<PDFDocument['addPage']>,
  x: number,
  centerY: number,
  fontSize: number,
  color: { r: number; g: number; b: number }
): void {
  // Circle radius - approximately 1/3 of font size for visibility
  const radius = fontSize * 0.3;
  // Center horizontally within the character width
  const centerX = x + radius;

  logger.debug(
    'HybridPdfExporter',
    `Drawing bullet circle at (${centerX.toFixed(1)}, ${centerY.toFixed(1)}) r=${radius.toFixed(1)}`
  );

  page.drawCircle({
    x: centerX,
    y: centerY,
    size: radius,
    color: rgb(color.r, color.g, color.b),
  });
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
 * Bullet characters (●) are drawn as actual circles rather than font glyphs,
 * since the embedded fonts may not have these characters.
 */
function drawTextOnPage(
  page: ReturnType<PDFDocument['addPage']>,
  texts: ExtractedText[],
  fonts: FontCache,
  pageHeight: number
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

      const font = getFontForText(text, fonts);

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
      logger.warn('HybridPdfExporter', `Failed to draw text: "${text.text}"`, error);
    }
  }
}

/**
 * Convert canvas to JPEG bytes for PDF embedding
 */
async function canvasToJpegBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to convert canvas to blob'));
          return;
        }
        blob
          .arrayBuffer()
          .then((buffer) => resolve(new Uint8Array(buffer)))
          .catch(reject);
      },
      'image/jpeg',
      JPEG_QUALITY
    );
  });
}

// ============================================================================
// Main Export Functions
// ============================================================================

/**
 * Generate a night order PDF using the hybrid approach
 *
 * Falls back to legacy mode if hybrid fails.
 */
export async function generateNightOrderPdfHybrid(
  firstNight: NightOrderState,
  otherNight: NightOrderState,
  scriptMeta: ScriptMeta | null,
  options: NightOrderPdfOptions = {}
): Promise<Uint8Array> {
  const {
    includeFirstNight = true,
    includeOtherNight = true,
    onProgress,
    signal,
    background = DEFAULT_BACKGROUND,
  } = options;

  if (signal?.aborted) {
    throw new DOMException('Export cancelled', 'AbortError');
  }

  const startTime = performance.now();
  logger.info('HybridPdfExporter', 'Starting hybrid PDF generation');

  try {
    // Phase: Initializing
    onProgress?.('initializing', 0, 100);

    // Create PDF document and register fontkit for custom font embedding
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    pdfDoc.setTitle(scriptMeta?.name ? `${scriptMeta.name} - Night Order` : 'Night Order');
    pdfDoc.setCreator('Grimbound Token Generator (Hybrid Mode)');

    // Phase: Loading fonts
    onProgress?.('loading-fonts', 10, 100);
    const fonts = await loadAllFonts(pdfDoc);

    // We need to dynamically import the renderer to avoid circular dependencies
    const { renderNightSheetForHybrid } = await import('./nightSheetHybridRenderer.js');

    // Paginate entries for both night types
    const firstNightPages = includeFirstNight
      ? paginateEntries(firstNight.entries)
      : { pages: [], pageCount: 0 };
    const otherNightPages = includeOtherNight
      ? paginateEntries(otherNight.entries)
      : { pages: [], pageCount: 0 };
    const totalPages = firstNightPages.pageCount + otherNightPages.pageCount;

    logger.info('HybridPdfExporter', 'Pagination calculated', {
      firstNightPages: firstNightPages.pageCount,
      otherNightPages: otherNightPages.pageCount,
      totalPages,
    });

    let pagesRendered = 0;

    // Phase: Rendering First Night (potentially multiple pages)
    if (firstNightPages.pageCount > 0) {
      for (let i = 0; i < firstNightPages.pages.length; i++) {
        if (signal?.aborted) {
          throw new DOMException('Export cancelled', 'AbortError');
        }

        const pageEntries = firstNightPages.pages[i];
        const pageNumber = i + 1;

        // Calculate progress: 20-50% for first night pages
        const progressBase = 20;
        const progressRange = 30;
        const pageProgress =
          progressBase + (progressRange * pagesRendered) / Math.max(totalPages, 1);
        onProgress?.('rendering-first', Math.round(pageProgress), 100);

        const result = await renderNightSheetForHybrid({
          nightType: 'first',
          entries: pageEntries,
          scriptMeta,
          background,
          signal,
          pageNumber,
          totalPages: firstNightPages.pageCount,
        });

        // Embed background image
        const jpegBytes = await canvasToJpegBytes(result.canvas);
        const image = await pdfDoc.embedJpg(jpegBytes);
        const page = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);

        // Draw background image
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: PAGE_WIDTH_PT,
          height: PAGE_HEIGHT_PT,
        });

        // Overlay text with proper fonts
        drawTextOnPage(page, result.texts, fonts, PAGE_HEIGHT_PT);

        // Release canvas memory
        result.canvas.width = 1;
        result.canvas.height = 1;

        pagesRendered++;
        logger.debug(
          'HybridPdfExporter',
          `First night page ${pageNumber}/${firstNightPages.pageCount} added`
        );
      }
    }

    // Phase: Rendering Other Nights (potentially multiple pages)
    if (otherNightPages.pageCount > 0) {
      for (let i = 0; i < otherNightPages.pages.length; i++) {
        if (signal?.aborted) {
          throw new DOMException('Export cancelled', 'AbortError');
        }

        const pageEntries = otherNightPages.pages[i];
        const pageNumber = i + 1;

        // Calculate progress: 50-80% for other night pages
        const progressBase = 50;
        const progressRange = 30;
        const pageProgress =
          progressBase +
          (progressRange * (pagesRendered - firstNightPages.pageCount)) /
            Math.max(otherNightPages.pageCount, 1);
        onProgress?.('rendering-other', Math.round(pageProgress), 100);

        const result = await renderNightSheetForHybrid({
          nightType: 'other',
          entries: pageEntries,
          scriptMeta,
          background,
          signal,
          pageNumber,
          totalPages: otherNightPages.pageCount,
        });

        // Embed background image
        const jpegBytes = await canvasToJpegBytes(result.canvas);
        const image = await pdfDoc.embedJpg(jpegBytes);
        const page = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);

        // Draw background image
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: PAGE_WIDTH_PT,
          height: PAGE_HEIGHT_PT,
        });

        // Overlay text with proper fonts
        drawTextOnPage(page, result.texts, fonts, PAGE_HEIGHT_PT);

        // Release canvas memory
        result.canvas.width = 1;
        result.canvas.height = 1;

        pagesRendered++;
        logger.debug(
          'HybridPdfExporter',
          `Other nights page ${pageNumber}/${otherNightPages.pageCount} added`
        );
      }
    }

    // Phase: Saving
    onProgress?.('saving', 90, 100);

    const pdfBytes = await pdfDoc.save();

    const endTime = performance.now();
    logger.info(
      'HybridPdfExporter',
      `Hybrid PDF generated in ${(endTime - startTime).toFixed(0)}ms`,
      {
        pageCount: pdfDoc.getPageCount(),
        sizeKB: Math.round(pdfBytes.length / 1024),
        mode: 'hybrid',
      }
    );

    onProgress?.('saving', 100, 100);

    return pdfBytes;
  } catch (error) {
    // Log the error and fall back to legacy mode
    logger.warn('HybridPdfExporter', 'Hybrid mode failed, falling back to legacy', error);

    return legacyGeneratePdf(firstNight, otherNight, scriptMeta, {
      ...options,
      onProgress: (phase, progress, total) => {
        // Offset progress to account for hybrid attempt
        onProgress?.(phase, Math.min(progress + 10, total), total);
      },
    });
  }
}

/**
 * Generate and download a night order PDF using hybrid mode
 */
export async function downloadNightOrderPdfHybrid(
  firstNight: NightOrderState,
  otherNight: NightOrderState,
  scriptMeta: ScriptMeta | null,
  filename: string,
  options: NightOrderPdfOptions = {}
): Promise<void> {
  const pdfBytes = await generateNightOrderPdfHybrid(firstNight, otherNight, scriptMeta, options);

  const blob = new Blob([pdfBytes.slice()], { type: 'application/pdf' });
  downloadFile(blob, filename);

  logger.info('HybridPdfExporter', `Downloaded: ${filename}`);
}

/**
 * Get a night order PDF as a Blob using hybrid mode
 */
export async function getNightOrderPdfBlobHybrid(
  firstNight: NightOrderState,
  otherNight: NightOrderState,
  scriptMeta: ScriptMeta | null,
  options: NightOrderPdfOptions = {}
): Promise<Blob> {
  const pdfBytes = await generateNightOrderPdfHybrid(firstNight, otherNight, scriptMeta, options);
  return new Blob([pdfBytes.slice()], { type: 'application/pdf' });
}
