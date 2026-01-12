/**
 * Night Order PDF Exporter
 *
 * Uses a two-phase hybrid approach for fast PDF generation:
 * 1. Capture visual layout with Snapdom (embedFonts: false) - FAST
 * 2. Overlay text using pdf-lib with embedded fonts - accurate typography
 *
 * This avoids the slow base64 font encoding in Snapdom while maintaining
 * high-quality font rendering in the final PDF.
 */

import fontkit from '@pdf-lib/fontkit';
import { PDFDocument } from 'pdf-lib';
import {
  canvasToJpegBytes,
  drawTextOnPage,
  loadAllFonts,
  PAGE_HEIGHT_PT,
  PAGE_WIDTH_PT,
  resolveBackgroundImage,
} from '@/ts/scriptPdf/shared/index.js';
import type { BackgroundStyle } from '@/ts/types/backgroundEffects.js';
import type { ScriptMeta } from '@/ts/types/index.js';
import { downloadFile } from '@/ts/utils/imageUtils.js';
import { logger } from '@/ts/utils/logger.js';
import { paginateEntries } from './nightOrderLayout.js';
import type { NightOrderState } from './nightOrderTypes.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Progress phases for export
 */
export type ExportPhase =
  | 'initializing'
  | 'loading-fonts'
  | 'loading-images'
  | 'rendering-first'
  | 'rendering-other'
  | 'saving';

/**
 * Progress callback function
 */
export type ProgressCallback = (phase: ExportPhase, progress: number, total: number) => void;

/**
 * Export options for PDF generation
 */
export interface NightOrderPdfOptions {
  /** Include First Night sheet */
  includeFirstNight?: boolean;
  /** Include Other Nights sheet */
  includeOtherNight?: boolean;
  /** Show script name in header */
  showScriptName?: boolean;
  /** Progress callback */
  onProgress?: ProgressCallback;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
  /** Background style configuration */
  background?: BackgroundStyle;
}

/** Default background settings */
const DEFAULT_BACKGROUND: BackgroundStyle = {
  sourceType: 'styled',
  mode: 'solid',
  solidColor: '#f4edd9',
  gradient: {
    type: 'linear',
    colorStart: '#f4edd9',
    colorEnd: '#e8dcc8',
    rotation: 180,
  },
  texture: {
    type: 'none',
    intensity: 50,
    scale: 1,
    seed: 12345,
    randomizeSeedPerToken: false,
  },
  effects: {
    vignetteEnabled: false,
    vignetteIntensity: 20,
    vignetteColor: '#000000',
    innerGlowEnabled: false,
    innerGlowColor: '#ffffff',
    innerGlowRadius: 10,
    innerGlowIntensity: 30,
    borderEnabled: false,
    borderWidth: 3,
    borderColor: '#ffffff',
    borderStyle: 'solid',
    borderMode: 'overlay',
  },
  light: {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    vibrance: 0,
  },
};

// ============================================================================
// Main Export Functions
// ============================================================================

/**
 * Generate a night order PDF using the hybrid approach
 */
export async function generateNightOrderPdf(
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
  logger.info('NightOrderPdfExporter', 'Starting PDF generation');

  try {
    // Phase: Initializing
    onProgress?.('initializing', 0, 100);

    // Resolve background image if using image background
    const resolvedBackgroundUrl =
      background.sourceType === 'image'
        ? await resolveBackgroundImage(background.imageUrl, 'NightOrderPdfExporter')
        : undefined;

    // Create PDF document and register fontkit for custom font embedding
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    pdfDoc.setTitle(scriptMeta?.name ? `${scriptMeta.name} - Night Order` : 'Night Order');
    pdfDoc.setCreator('Grimbound Token Generator');

    // Phase: Loading fonts
    onProgress?.('loading-fonts', 10, 100);
    const fonts = await loadAllFonts(pdfDoc, 'NightOrderPdfExporter');

    // We need to dynamically import the renderer to avoid circular dependencies
    const { renderNightSheet } = await import('./nightSheetRenderer.js');

    // Paginate entries for both night types
    const firstNightPages = includeFirstNight
      ? paginateEntries(firstNight.entries)
      : { pages: [], pageCount: 0 };
    const otherNightPages = includeOtherNight
      ? paginateEntries(otherNight.entries)
      : { pages: [], pageCount: 0 };
    const totalPages = firstNightPages.pageCount + otherNightPages.pageCount;

    logger.info('NightOrderPdfExporter', 'Pagination calculated', {
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

        const result = await renderNightSheet({
          nightType: 'first',
          entries: pageEntries,
          scriptMeta,
          background,
          resolvedBackgroundUrl,
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

        // Overlay text with proper fonts (treatReminderAsBold=true for night order)
        drawTextOnPage(page, result.texts, fonts, PAGE_HEIGHT_PT, 'NightOrderPdfExporter', true);

        // Release canvas memory
        result.canvas.width = 1;
        result.canvas.height = 1;

        pagesRendered++;
        logger.debug(
          'NightOrderPdfExporter',
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

        const result = await renderNightSheet({
          nightType: 'other',
          entries: pageEntries,
          scriptMeta,
          background,
          resolvedBackgroundUrl,
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

        // Overlay text with proper fonts (treatReminderAsBold=true for night order)
        drawTextOnPage(page, result.texts, fonts, PAGE_HEIGHT_PT, 'NightOrderPdfExporter', true);

        // Release canvas memory
        result.canvas.width = 1;
        result.canvas.height = 1;

        pagesRendered++;
        logger.debug(
          'NightOrderPdfExporter',
          `Other nights page ${pageNumber}/${otherNightPages.pageCount} added`
        );
      }
    }

    // Phase: Saving
    onProgress?.('saving', 90, 100);

    const pdfBytes = await pdfDoc.save();

    const endTime = performance.now();
    logger.info('NightOrderPdfExporter', `PDF generated in ${(endTime - startTime).toFixed(0)}ms`, {
      pageCount: pdfDoc.getPageCount(),
      sizeKB: Math.round(pdfBytes.length / 1024),
    });

    onProgress?.('saving', 100, 100);

    return pdfBytes;
  } catch (error) {
    logger.error('NightOrderPdfExporter', 'PDF generation failed', error);
    throw error;
  }
}

/**
 * Generate and download a night order PDF using hybrid mode
 */
export async function downloadNightOrderPdf(
  firstNight: NightOrderState,
  otherNight: NightOrderState,
  scriptMeta: ScriptMeta | null,
  filename: string,
  options: NightOrderPdfOptions = {}
): Promise<void> {
  const pdfBytes = await generateNightOrderPdf(firstNight, otherNight, scriptMeta, options);

  const blob = new Blob([pdfBytes.slice()], { type: 'application/pdf' });
  downloadFile(blob, filename);

  logger.info('NightOrderPdfExporter', `Downloaded: ${filename}`);
}

/**
 * Get a night order PDF as a Blob using hybrid mode
 */
export async function getNightOrderPdfBlob(
  firstNight: NightOrderState,
  otherNight: NightOrderState,
  scriptMeta: ScriptMeta | null,
  options: NightOrderPdfOptions = {}
): Promise<Blob> {
  const pdfBytes = await generateNightOrderPdf(firstNight, otherNight, scriptMeta, options);
  return new Blob([pdfBytes.slice()], { type: 'application/pdf' });
}
