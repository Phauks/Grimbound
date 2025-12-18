/**
 * Blood on the Clocktower Token Generator
 * ZIP Exporter - ZIP file creation with folder structure
 */

import JSZip from 'jszip';
import { TEAM_LABELS } from '@/ts/config.js';
import type {
  PngExportOptions,
  ProgressCallback,
  Token,
  ZipExportOptions,
} from '@/ts/types/index.js';
import { canvasToBlob } from '@/ts/utils/index.js';
import { buildTokenMetadata, embedPngMetadata } from './pngMetadata.js';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Compression level mapping for JSZip
 */
const COMPRESSION_LEVELS: Record<string, number> = {
  fast: 1,
  normal: 6,
  maximum: 9,
};

/**
 * Default ZIP export options
 */
const DEFAULT_ZIP_OPTIONS: ZipExportOptions = {
  saveInTeamFolders: true,
  saveRemindersSeparately: true,
  metaTokenFolder: true,
  includeScriptJson: false,
  compressionLevel: 'normal',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a token is a meta token (script name, almanac, pandemonium, bootlegger)
 */
export function isMetaToken(token: Token): boolean {
  return (
    token.type === 'script-name' ||
    token.type === 'almanac' ||
    token.type === 'pandemonium' ||
    token.type === 'bootlegger'
  );
}

/**
 * Get the filename for a token, with underscore prefix for meta tokens
 */
export function getTokenFilename(token: Token): string {
  let filename = token.filename;
  if (isMetaToken(token) && !filename.startsWith('_')) {
    filename = `_${filename}`;
  }
  return `${filename}.png`;
}

/**
 * Determine the folder path for a token based on export settings
 */
export function getTokenFolderPath(token: Token, settings: ZipExportOptions): string {
  const { saveInTeamFolders, saveRemindersSeparately, metaTokenFolder } = settings;
  let folderPath = '';
  const isMeta = isMetaToken(token);

  // Meta tokens go to _meta folder if enabled
  if (isMeta && metaTokenFolder) {
    folderPath = '_meta/';
  } else if (saveRemindersSeparately) {
    // Separate by token type
    if (token.type === 'character' || isMeta) {
      folderPath = 'character_tokens/';
    } else {
      folderPath = 'reminder_tokens/';
    }
  }

  // Add team subfolder if enabled (except meta tokens)
  if (saveInTeamFolders && !isMeta) {
    const teamName = TEAM_LABELS[token.team as keyof typeof TEAM_LABELS] ?? token.team;
    folderPath += `${teamName}/`;
  }

  return folderPath;
}

/**
 * Process a token and convert to blob with optional metadata
 */
export async function processTokenToBlob(
  token: Token,
  pngSettings?: PngExportOptions
): Promise<Blob> {
  let blob = await canvasToBlob(token.canvas);

  if (pngSettings?.embedMetadata) {
    const metadata = buildTokenMetadata(token);
    blob = await embedPngMetadata(blob, metadata);
  }

  return blob;
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

/**
 * Batch size for parallel token processing
 * Set to Infinity to process all tokens in parallel
 * Modern browsers handle this efficiently
 */
const EXPORT_BATCH_SIZE = Infinity;

/**
 * Create a ZIP file with all token images
 * @param tokens - Array of token objects with canvas
 * @param progressCallback - Progress callback
 * @param zipSettings - ZIP folder structure settings
 * @param scriptJson - Optional script JSON to include
 * @param pngSettings - Optional PNG export settings (for metadata embedding)
 * @returns ZIP file blob
 */
export async function createTokensZip(
  tokens: Token[],
  progressCallback: ProgressCallback | null = null,
  zipSettings: ZipExportOptions = DEFAULT_ZIP_OPTIONS,
  scriptJson?: string,
  pngSettings?: PngExportOptions
): Promise<Blob> {
  // Validate input
  if (!(tokens && Array.isArray(tokens))) {
    throw new Error('Invalid tokens parameter: expected an array');
  }

  if (tokens.length === 0) {
    throw new Error('No tokens to export');
  }

  const zip = new JSZip();
  const settings = { ...DEFAULT_ZIP_OPTIONS, ...zipSettings };
  const compressionValue = COMPRESSION_LEVELS[settings.compressionLevel] ?? 6;

  // Process tokens in parallel batches for better performance
  // Use smaller batch size for small token counts to show progress
  const effectiveBatchSize = tokens.length <= 5 ? 1 : EXPORT_BATCH_SIZE;
  let processedCount = 0;

  for (let batchStart = 0; batchStart < tokens.length; batchStart += effectiveBatchSize) {
    const batchEnd = Math.min(batchStart + effectiveBatchSize, tokens.length);
    const batch = tokens.slice(batchStart, batchEnd);

    // Process batch in parallel, reporting progress for each token
    const batchResults = await Promise.all(
      batch.map(async (token) => {
        const blob = await processTokenToBlob(token, pngSettings);
        const filename = getTokenFilename(token);
        const folderPath = getTokenFolderPath(token, settings);

        // Report progress for each individual token
        processedCount++;
        if (progressCallback) {
          progressCallback(processedCount, tokens.length);
        }

        return { blob, path: folderPath + filename };
      })
    );

    // Add batch results to zip
    for (const { blob, path } of batchResults) {
      zip.file(path, blob);
    }
  }

  // Include script JSON if enabled
  if (settings.includeScriptJson && scriptJson) {
    const metaFolder = settings.metaTokenFolder ? '_meta/' : '';
    zip.file(`${metaFolder}script.json`, scriptJson);
  }

  // Generate ZIP with compression settings
  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: {
      level: compressionValue,
    },
  });
}
