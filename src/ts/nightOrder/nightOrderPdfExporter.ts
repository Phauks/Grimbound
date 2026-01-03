/**
 * Night Order PDF Exporter
 *
 * True WYSIWYG PDF export using Snapdom to capture the actual React components.
 * This replaces the previous manual pdf-lib drawing approach with a capture-based
 * approach that guarantees the PDF matches the UI exactly.
 *
 * Flow:
 * 1. Render NightSheetPrintable offscreen at DPI-correct dimensions
 * 2. Capture with Snapdom to canvas
 * 3. Convert canvas to JPEG
 * 4. Embed as full-page image in PDF using pdf-lib
 */

import { PDFDocument } from 'pdf-lib';
import type { NightSheetBackground } from '@/components/ViewComponents/ScriptComponents/NightOrderView';
import type { ScriptMeta } from '@/ts/types/index.js';
import { downloadFile } from '@/ts/utils/imageUtils.js';
import { logger } from '@/ts/utils/logger.js';
import type { NightOrderState } from './nightOrderTypes.js';
import { preloadSnapdom, renderNightSheetToCanvas } from './nightSheetRenderer.js';

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
  /** Background customization */
  background?: NightSheetBackground;
}

// ============================================================================
// Constants
// ============================================================================

/** Letter page size in points (72 points = 1 inch) */
const PAGE_WIDTH_PT = 8.5 * 72; // 612
const PAGE_HEIGHT_PT = 11 * 72; // 792

/** Default background settings */
const DEFAULT_BACKGROUND: NightSheetBackground = {
  baseColor: '#f4edd9',
  showTexture: true,
  textureOpacity: 0.06,
};

/** JPEG quality for PDF embedding (0-1) */
const JPEG_QUALITY = 0.92;

// ============================================================================
// Helper Functions
// ============================================================================

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
          .then((buffer) => {
            resolve(new Uint8Array(buffer));
          })
          .catch(reject);
      },
      'image/jpeg',
      JPEG_QUALITY
    );
  });
}

/**
 * Embed a canvas as a full-page image in PDF
 */
async function embedCanvasInPdf(pdfDoc: PDFDocument, canvas: HTMLCanvasElement): Promise<void> {
  // Convert canvas to JPEG bytes
  const jpegBytes = await canvasToJpegBytes(canvas);

  // Embed the image
  const image = await pdfDoc.embedJpg(jpegBytes);

  // Add a new page
  const page = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);

  // Draw the image to fill the page
  page.drawImage(image, {
    x: 0,
    y: 0,
    width: PAGE_WIDTH_PT,
    height: PAGE_HEIGHT_PT,
  });

  // Release canvas memory
  canvas.width = 1;
  canvas.height = 1;
}

// ============================================================================
// Main Export Functions
// ============================================================================

/**
 * Generate a night order PDF as bytes
 *
 * @param firstNight - First night order state
 * @param otherNight - Other nights order state
 * @param scriptMeta - Script metadata (name, logo)
 * @param options - Export options
 * @returns PDF as Uint8Array
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

  // Check for abort
  if (signal?.aborted) {
    throw new DOMException('Export cancelled', 'AbortError');
  }

  logger.info('NightOrderPdfExporter', 'Starting PDF generation', {
    includeFirstNight,
    includeOtherNight,
    firstNightEntries: firstNight.entries.length,
    otherNightEntries: otherNight.entries.length,
  });

  const startTime = performance.now();

  // Phase: Initializing - preload Snapdom in parallel with PDF creation
  onProgress?.('initializing', 0, 100);

  // Preload Snapdom and create PDF document in parallel
  const [, pdfDoc] = await Promise.all([preloadSnapdom(), PDFDocument.create()]);

  // Set metadata
  pdfDoc.setTitle(scriptMeta?.name ? `${scriptMeta.name} - Night Order` : 'Night Order');
  pdfDoc.setCreator('Grimbound Token Generator');

  // Phase: Rendering First Night
  if (includeFirstNight && firstNight.entries.length > 0) {
    if (signal?.aborted) {
      throw new DOMException('Export cancelled', 'AbortError');
    }

    onProgress?.('rendering-first', 25, 100);

    const result = await renderNightSheetToCanvas({
      nightType: 'first',
      entries: firstNight.entries,
      scriptMeta,
      background,
      signal,
    });

    await embedCanvasInPdf(pdfDoc, result.canvas);

    logger.debug('NightOrderPdfExporter', 'First night page added');
  }

  // Phase: Rendering Other Nights
  if (includeOtherNight && otherNight.entries.length > 0) {
    if (signal?.aborted) {
      throw new DOMException('Export cancelled', 'AbortError');
    }

    onProgress?.('rendering-other', 60, 100);

    const result = await renderNightSheetToCanvas({
      nightType: 'other',
      entries: otherNight.entries,
      scriptMeta,
      background,
      signal,
    });

    await embedCanvasInPdf(pdfDoc, result.canvas);

    logger.debug('NightOrderPdfExporter', 'Other nights page added');
  }

  // Phase: Saving
  if (signal?.aborted) {
    throw new DOMException('Export cancelled', 'AbortError');
  }

  onProgress?.('saving', 90, 100);

  // Save PDF to bytes
  const pdfBytes = await pdfDoc.save();

  const endTime = performance.now();
  logger.info('NightOrderPdfExporter', `PDF generated in ${(endTime - startTime).toFixed(0)}ms`, {
    pageCount: pdfDoc.getPageCount(),
    sizeKB: Math.round(pdfBytes.length / 1024),
  });

  onProgress?.('saving', 100, 100);

  return pdfBytes;
}

/**
 * Generate and download a night order PDF
 *
 * @param firstNight - First night order state
 * @param otherNight - Other nights order state
 * @param scriptMeta - Script metadata (name, logo)
 * @param filename - Output filename
 * @param options - Export options
 */
export async function downloadNightOrderPdf(
  firstNight: NightOrderState,
  otherNight: NightOrderState,
  scriptMeta: ScriptMeta | null,
  filename: string,
  options: NightOrderPdfOptions = {}
): Promise<void> {
  const pdfBytes = await generateNightOrderPdf(firstNight, otherNight, scriptMeta, options);

  // Create blob and download (slice to ensure standard ArrayBuffer for Blob compatibility)
  const blob = new Blob([pdfBytes.slice()], { type: 'application/pdf' });
  downloadFile(blob, filename);

  logger.info('NightOrderPdfExporter', `Downloaded: ${filename}`);
}

/**
 * Generate a night order PDF as a Blob
 *
 * @param firstNight - First night order state
 * @param otherNight - Other nights order state
 * @param scriptMeta - Script metadata (name, logo)
 * @param options - Export options
 * @returns PDF as Blob
 */
export async function getNightOrderPdfBlob(
  firstNight: NightOrderState,
  otherNight: NightOrderState,
  scriptMeta: ScriptMeta | null,
  options: NightOrderPdfOptions = {}
): Promise<Blob> {
  const pdfBytes = await generateNightOrderPdf(firstNight, otherNight, scriptMeta, options);
  // Slice to ensure standard ArrayBuffer for Blob compatibility
  return new Blob([pdfBytes.slice()], { type: 'application/pdf' });
}
