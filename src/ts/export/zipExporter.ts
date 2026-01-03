/**
 * Blood on the Clocktower Token Generator
 * ZIP Exporter - ZIP file creation with folder structure
 */

import JSZip from 'jszip';
import { TEAM_LABELS } from '@/ts/config.js';
import type { ProgressCallback, Token, ZipExportOptions } from '@/ts/types/index.js';
import { getTokenBlob } from '@/ts/utils/index.js';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Hardcoded ZIP export settings.
 * All sub-folder options are active, compression is normal.
 */
const ZIP_SETTINGS: ZipExportOptions = {
  saveInTeamFolders: true,
  saveRemindersSeparately: true,
  metaTokenFolder: true,
  includeScriptJson: false,
  compressionLevel: 'normal',
};

/** Compression level for normal quality */
const COMPRESSION_LEVEL = 6;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a token is a meta token (not character or reminder).
 * Includes: script-name, almanac, pandemonium, bootlegger, jinx
 */
export function isMetaToken(token?: Token): boolean {
  return !!token && token.type !== 'character' && token.type !== 'reminder';
}

/**
 * Bundle data for downloads (blob with filename)
 */
export interface BundleData {
  blob: Blob;
  filename: string;
}

/**
 * Convert tokens to bundle data (blobs with filenames) for downloads.
 * Uses token.dataUrl when available (memory-efficient path).
 * Skips tokens that fail to convert.
 */
export async function tokensToBundleData(tokens: Token[]): Promise<BundleData[]> {
  const results: BundleData[] = [];
  for (const token of tokens) {
    try {
      const blob = getTokenBlob(token);
      results.push({ blob, filename: token.filename });
    } catch {
      // Skip tokens that fail to convert
    }
  }
  return results;
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
 * Process a token and convert to blob.
 * Uses token.dataUrl when available (memory-efficient path).
 */
export function processTokenToBlob(token: Token): Blob {
  return getTokenBlob(token);
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
 * Create a ZIP file with all token images.
 * Uses hardcoded settings: team folders, separate reminders, meta folder, normal compression.
 *
 * @param tokens - Array of token objects with canvas
 * @param progressCallback - Progress callback
 * @param zipSettings - ZIP folder structure settings (optional override)
 * @param scriptJson - Optional script JSON to include
 * @returns ZIP file blob
 */
export async function createTokensZip(
  tokens: Token[],
  progressCallback: ProgressCallback | null = null,
  zipSettings: Partial<ZipExportOptions> = {},
  scriptJson?: string
): Promise<Blob> {
  // Validate input
  if (!(tokens && Array.isArray(tokens))) {
    throw new Error('Invalid tokens parameter: expected an array');
  }

  if (tokens.length === 0) {
    throw new Error('No tokens to export');
  }

  const zip = new JSZip();
  const settings = { ...ZIP_SETTINGS, ...zipSettings };

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
        const blob = processTokenToBlob(token);
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

  // Generate ZIP with normal compression
  return await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: {
      level: COMPRESSION_LEVEL,
    },
  });
}
