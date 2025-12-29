/**
 * Blood on the Clocktower Token Generator
 * Data Loader - I/O operations for loading script and character data
 */

import { getExampleScriptData } from '@/ts/data/exampleScripts.js';
import type { ScriptEntry } from '@/ts/types/index.js';
import { logger } from '@/ts/utils/logger.js';

// ============================================================================
// Data Fetching
// ============================================================================

/**
 * Load example script (bundled - no fetch needed)
 * @param filename - Example script filename (with or without .json extension)
 * @returns Parsed script data
 */
export async function loadExampleScript(filename: string): Promise<ScriptEntry[]> {
  logger.debug('DataLoader', `Loading example script: ${filename}`);

  // Ensure filename has .json extension
  const jsonFilename = filename.endsWith('.json') ? filename : `${filename}.json`;

  // Get bundled script data (no network request needed)
  const data = getExampleScriptData(jsonFilename);
  if (data) {
    logger.debug('DataLoader', `Loaded bundled script: ${jsonFilename}`, data);
    return data;
  }

  const errorMessage = `Example script not found: ${filename}`;
  logger.error('DataLoader', errorMessage);
  throw new Error(errorMessage);
}

/**
 * Load and parse JSON from file
 * @param file - File object
 * @returns Parsed JSON data
 */
export async function loadJsonFile(file: File): Promise<ScriptEntry[]> {
  logger.debug('DataLoader', `Loading file: ${file.name}, size: ${file.size}, type: ${file.type}`);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event): void => {
      logger.debug('DataLoader', 'File read successfully');
      try {
        const result = event.target?.result;
        if (typeof result !== 'string') {
          const error = new Error('Failed to read file as text');
          logger.error('DataLoader', error.message, error);
          reject(error);
          return;
        }
        logger.debug('DataLoader', `File content length: ${result.length}`);
        const data = JSON.parse(result) as ScriptEntry[];
        logger.debug('DataLoader', 'JSON parsed successfully', data);
        resolve(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        const parseError = new Error(`Invalid JSON file: ${message}`);
        logger.error('DataLoader', parseError.message, parseError);
        reject(parseError);
      }
    };

    reader.onerror = (): void => {
      const error = new Error('Failed to read file');
      logger.error('DataLoader', error.message, error);
      reject(error);
    };

    reader.readAsText(file);
  });
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  loadExampleScript,
  loadJsonFile,
};
