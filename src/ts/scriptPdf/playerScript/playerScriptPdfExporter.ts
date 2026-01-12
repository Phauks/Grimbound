/**
 * Player Script PDF Exporter
 *
 * Uses a two-phase hybrid approach for PDF generation:
 * 1. Capture visual layout with Snapdom (embedFonts: false) - FAST
 * 2. Overlay text using pdf-lib with embedded fonts - accurate typography
 *
 * Generates a 1-2 page PDF with front page (roles) and optional backing sheet.
 */

import fontkit from '@pdf-lib/fontkit';
import { PDFDocument } from 'pdf-lib';
import type { ScriptMeta } from '@/ts/types/index.js';
import { downloadFile } from '@/ts/utils/imageUtils.js';
import { logger } from '@/ts/utils/logger.js';
import {
  canvasToJpegBytes,
  drawTextOnPage,
  loadAllFonts,
  PAGE_HEIGHT_PT,
  PAGE_WIDTH_PT,
} from '../shared/index.js';
import type {
  BackingSheetSettings,
  NightOrderIcon,
  PlayerScriptCharacter,
  PlayerScriptJinx,
  PlayerScriptSettings,
} from '../types.js';
import { renderPlayerScriptForHybrid } from './playerScriptRenderer.js';

// ============================================================================
// Types
// ============================================================================

export type ExportPhase =
  | 'initializing'
  | 'loading-fonts'
  | 'rendering-front'
  | 'rendering-back'
  | 'saving';

export type ProgressCallback = (phase: ExportPhase, progress: number, total: number) => void;

export interface PlayerScriptPdfOptions {
  /** Whether to include the backing sheet (default: true) */
  includeBackingSheet?: boolean;
  /** Progress callback */
  onProgress?: ProgressCallback;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
}

export interface PlayerScriptExportData {
  /** Script metadata */
  scriptMeta: ScriptMeta | null;
  /** Main characters (townsfolk, outsiders, minions, demons) */
  characters: PlayerScriptCharacter[];
  /** Fabled characters */
  fabled: PlayerScriptCharacter[];
  /** Active jinxes */
  jinxes: PlayerScriptJinx[];
  /** First night order icons */
  firstNight: NightOrderIcon[];
  /** Other nights order icons */
  otherNight: NightOrderIcon[];
  /** Player script settings */
  settings: PlayerScriptSettings;
  /** Backing sheet settings */
  backingSettings: BackingSheetSettings;
}

// ============================================================================
// Main Export Functions
// ============================================================================

/**
 * Generate a player script PDF using the hybrid approach
 */
export async function generatePlayerScriptPdf(
  data: PlayerScriptExportData,
  options: PlayerScriptPdfOptions = {}
): Promise<Uint8Array> {
  const { includeBackingSheet = true, onProgress, signal } = options;
  const {
    scriptMeta,
    characters,
    fabled,
    jinxes,
    firstNight,
    otherNight,
    settings,
    backingSettings,
  } = data;

  if (signal?.aborted) {
    throw new DOMException('Export cancelled', 'AbortError');
  }

  const startTime = performance.now();
  logger.info('PlayerScriptPdfExporter', 'Starting hybrid PDF generation');

  // Phase: Initializing
  onProgress?.('initializing', 0, 100);

  // Create PDF document
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  pdfDoc.setTitle(scriptMeta?.name ? `${scriptMeta.name} - Player Script` : 'Player Script');
  pdfDoc.setCreator('Grimbound Token Generator');

  // Phase: Loading fonts
  onProgress?.('loading-fonts', 10, 100);
  const fonts = await loadAllFonts(pdfDoc, 'PlayerScriptPdfExporter');

  if (signal?.aborted) {
    throw new DOMException('Export cancelled', 'AbortError');
  }

  // Phase: Rendering front page
  onProgress?.('rendering-front', 20, 100);

  const frontResult = await renderPlayerScriptForHybrid({
    pageType: 'front',
    scriptMeta,
    characters,
    fabled,
    jinxes,
    firstNight,
    otherNight,
    settings,
    backingSettings,
    signal,
  });

  // Embed front page
  const frontJpegBytes = await canvasToJpegBytes(frontResult.canvas);
  const frontImage = await pdfDoc.embedJpg(frontJpegBytes);
  const frontPage = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);

  frontPage.drawImage(frontImage, {
    x: 0,
    y: 0,
    width: PAGE_WIDTH_PT,
    height: PAGE_HEIGHT_PT,
  });

  drawTextOnPage(frontPage, frontResult.texts, fonts, PAGE_HEIGHT_PT, 'PlayerScriptPdfExporter');

  // Release canvas memory
  frontResult.canvas.width = 1;
  frontResult.canvas.height = 1;

  logger.debug('PlayerScriptPdfExporter', 'Front page added');

  // Phase: Rendering back page (if enabled)
  if (includeBackingSheet && backingSettings.enabled) {
    if (signal?.aborted) {
      throw new DOMException('Export cancelled', 'AbortError');
    }

    onProgress?.('rendering-back', 50, 100);

    const backResult = await renderPlayerScriptForHybrid({
      pageType: 'back',
      scriptMeta,
      characters,
      fabled,
      jinxes,
      firstNight,
      otherNight,
      settings,
      backingSettings,
      signal,
    });

    // Embed back page
    const backJpegBytes = await canvasToJpegBytes(backResult.canvas);
    const backImage = await pdfDoc.embedJpg(backJpegBytes);
    const backPage = pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);

    backPage.drawImage(backImage, {
      x: 0,
      y: 0,
      width: PAGE_WIDTH_PT,
      height: PAGE_HEIGHT_PT,
    });

    drawTextOnPage(backPage, backResult.texts, fonts, PAGE_HEIGHT_PT, 'PlayerScriptPdfExporter');

    // Release canvas memory
    backResult.canvas.width = 1;
    backResult.canvas.height = 1;

    logger.debug('PlayerScriptPdfExporter', 'Back page added');
  }

  // Phase: Saving
  onProgress?.('saving', 90, 100);

  const pdfBytes = await pdfDoc.save();

  const endTime = performance.now();
  logger.info('PlayerScriptPdfExporter', `PDF generated in ${(endTime - startTime).toFixed(0)}ms`, {
    pageCount: pdfDoc.getPageCount(),
    sizeKB: Math.round(pdfBytes.length / 1024),
  });

  onProgress?.('saving', 100, 100);

  return pdfBytes;
}

/**
 * Generate and download a player script PDF
 */
export async function downloadPlayerScriptPdf(
  data: PlayerScriptExportData,
  filename: string,
  options: PlayerScriptPdfOptions = {}
): Promise<void> {
  const pdfBytes = await generatePlayerScriptPdf(data, options);

  const blob = new Blob([pdfBytes.slice()], { type: 'application/pdf' });
  downloadFile(blob, filename);

  logger.info('PlayerScriptPdfExporter', `Downloaded: ${filename}`);
}

/**
 * Get a player script PDF as a Blob
 */
export async function getPlayerScriptPdfBlob(
  data: PlayerScriptExportData,
  options: PlayerScriptPdfOptions = {}
): Promise<Blob> {
  const pdfBytes = await generatePlayerScriptPdf(data, options);
  return new Blob([pdfBytes.slice()], { type: 'application/pdf' });
}
