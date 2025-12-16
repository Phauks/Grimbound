/**
 * Blood on the Clocktower Token Generator
 * Data Loader - I/O operations for loading script and character data
 */

import type { ScriptEntry } from '../types/index.js';
import { logger } from '../utils/logger.js';

// ============================================================================
// Data Fetching
// ============================================================================

/**
 * Load example script from file
 * @param filename - Example script filename (with or without .json extension)
 * @returns Parsed script data
 */
export async function loadExampleScript(filename: string): Promise<ScriptEntry[]> {
  logger.debug('DataLoader', `Loading example script: ${filename}`);

  // Ensure filename has .json extension
  const jsonFilename = filename.endsWith('.json') ? filename : `${filename}.json`;

  // Try multiple path variations for compatibility with different deployment scenarios
  const basePath = new URL('.', window.location.href).href;
  const pathsToTry = [
    `/example_scripts/${jsonFilename}`,
    `./example_scripts/${jsonFilename}`,
    `example_scripts/${jsonFilename}`,
    new URL(`example_scripts/${jsonFilename}`, basePath).href,
  ];

  let lastError: Error | null = null;

  for (const path of pathsToTry) {
    try {
      logger.debug('DataLoader', `Trying path: ${path}`);
      const response = await fetch(path);
      if (response.ok) {
        const data = (await response.json()) as ScriptEntry[];
        logger.debug('DataLoader', `Successfully loaded from: ${path}`, data);
        return data;
      }
      logger.debug('DataLoader', `Path returned status: ${response.status}`);
    } catch (error) {
      logger.debug('DataLoader', `Path failed: ${path}`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  const errorMessage = `Failed to load example script: ${filename}. ${lastError?.message ?? 'Unknown error'}`;
  logger.error('DataLoader', errorMessage, lastError);
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
