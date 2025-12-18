/**
 * Blood on the Clocktower Token Generator
 * Complete Package Exporter - Creates ZIP containing tokens, PDF, JSON, and style
 */

import JSZip from 'jszip';
import type {
  GenerationOptions,
  ProgressCallback,
  ScriptMeta,
  Token,
  ZipExportOptions,
} from '@/ts/types/index.js';
import { downloadFile } from '@/ts/utils/index.js';
import { PDFGenerator } from './pdfGenerator.js';
import { getTokenFilename, getTokenFolderPath, processTokenToBlob } from './zipExporter.js';

/**
 * Progress callback with step information
 */
export type CompletePackageProgressCallback = (
  step: 'json' | 'style' | 'tokens' | 'pdf',
  current: number,
  total: number
) => void;

/**
 * Options for creating a complete package
 */
export interface CompletePackageOptions {
  tokens: Token[];
  scriptJson?: string;
  generationOptions: GenerationOptions;
  zipSettings: ZipExportOptions;
  scriptMeta: ScriptMeta | null;
  baseFilename: string;
  progressCallback?: CompletePackageProgressCallback | null;
  signal?: AbortSignal;
}

/**
 * Create a complete package ZIP containing:
 * - Script JSON
 * - Style/generation options JSON
 * - All tokens (organized in folders)
 * - PDF document
 *
 * @param options - Package configuration options
 * @returns Blob containing the complete ZIP package
 */
export async function createCompletePackage(options: CompletePackageOptions): Promise<Blob> {
  const {
    tokens,
    scriptJson,
    generationOptions,
    zipSettings,
    scriptMeta,
    baseFilename,
    progressCallback,
    signal,
  } = options;

  const zip = new JSZip();

  // Step 1: Add Script JSON
  if (progressCallback) {
    progressCallback('json', 1, 1);
  }
  if (scriptJson) {
    zip.file(`${baseFilename}.json`, scriptJson);
  }

  // Check for cancellation
  if (signal?.aborted) {
    throw new DOMException('Export cancelled', 'AbortError');
  }

  // Step 2: Add Style/Generation Options JSON
  if (progressCallback) {
    progressCallback('style', 1, 1);
  }
  const styleData = {
    version: '1.0',
    name: scriptMeta?.name ? `${scriptMeta.name} Style` : 'Custom Style',
    generationOptions,
    exportedAt: new Date().toISOString(),
  };
  zip.file(`${baseFilename}_style.json`, JSON.stringify(styleData, null, 2));

  // Check for cancellation
  if (signal?.aborted) {
    throw new DOMException('Export cancelled', 'AbortError');
  }

  // Step 3: Add Tokens
  if (progressCallback) {
    progressCallback('tokens', 0, tokens.length);
  }

  // Process tokens in parallel batches for performance
  // Set to Infinity to process all tokens in parallel
  // Modern browsers handle this efficiently
  const BATCH_SIZE = Infinity;
  let processedCount = 0;

  for (let batchStart = 0; batchStart < tokens.length; batchStart += BATCH_SIZE) {
    // Check for cancellation
    if (signal?.aborted) {
      throw new DOMException('Export cancelled', 'AbortError');
    }

    const batchEnd = Math.min(batchStart + BATCH_SIZE, tokens.length);
    const batch = tokens.slice(batchStart, batchEnd);

    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(async (token) => {
        const blob = await processTokenToBlob(token, generationOptions.pngSettings);
        const filename = getTokenFilename(token);
        const folderPath = getTokenFolderPath(token, zipSettings);

        // Report progress for each token
        processedCount++;
        if (progressCallback) {
          progressCallback('tokens', processedCount, tokens.length);
        }

        return { blob, path: `tokens/${folderPath}${filename}` };
      })
    );

    // Add batch results to ZIP
    for (const { blob, path } of batchResults) {
      zip.file(path, blob);
    }

    // Yield to UI between batches
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  // Check for cancellation
  if (signal?.aborted) {
    throw new DOMException('Export cancelled', 'AbortError');
  }

  // Step 4: Add PDF
  const pdfGenerator = new PDFGenerator({
    tokenPadding: generationOptions.pdfPadding ?? 0.25, // Default 1/4" padding
    xOffset: generationOptions.pdfXOffset ?? 0, // Inches
    yOffset: generationOptions.pdfYOffset ?? 0, // Inches
    imageQuality: generationOptions.pdfImageQuality ?? 0.9,
    bleed: generationOptions.pdfBleed ?? 0.125, // Default 1/8" bleed
  });

  const pdfProgressCallback: ProgressCallback = (currentPage, totalPages) => {
    if (signal?.aborted) {
      throw new DOMException('Export cancelled', 'AbortError');
    }
    if (progressCallback) {
      progressCallback('pdf', currentPage, totalPages);
    }
  };

  const pdfBlob = await pdfGenerator.getPDFBlob(tokens, pdfProgressCallback);
  zip.file(`${baseFilename}.pdf`, pdfBlob);

  // Check for cancellation
  if (signal?.aborted) {
    throw new DOMException('Export cancelled', 'AbortError');
  }

  // Generate final ZIP
  const finalBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return finalBlob;
}

/**
 * Download a complete package as a ZIP file
 *
 * @param options - Package configuration options
 * @param downloadFilename - Filename for the downloaded ZIP
 */
export async function downloadCompletePackage(
  options: CompletePackageOptions,
  downloadFilename: string
): Promise<void> {
  const blob = await createCompletePackage(options);
  downloadFile(blob, downloadFilename);
}
