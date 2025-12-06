/**
 * Blood on the Clocktower Token Generator
 * Data Loader - I/O operations for loading script and character data
 */

import type {
    Character,
    ScriptEntry,
} from '../types/index.js';

// ============================================================================
// Data Fetching
// ============================================================================

/**
 * Load example script from file
 * @param filename - Example script filename (with or without .json extension)
 * @returns Parsed script data
 */
export async function loadExampleScript(filename: string): Promise<ScriptEntry[]> {
    console.log(`[loadExampleScript] Loading example script: ${filename}`);

    // Ensure filename has .json extension
    const jsonFilename = filename.endsWith('.json') ? filename : `${filename}.json`;

    // Try multiple path variations for compatibility with different deployment scenarios
    const basePath = new URL('.', window.location.href).href;
    const pathsToTry = [
        `/example_scripts/${jsonFilename}`,
        `./example_scripts/${jsonFilename}`,
        `example_scripts/${jsonFilename}`,
        new URL(`example_scripts/${jsonFilename}`, basePath).href
    ];

    let lastError: Error | null = null;

    for (const path of pathsToTry) {
        try {
            console.log(`[loadExampleScript] Trying path: ${path}`);
            const response = await fetch(path);
            if (response.ok) {
                const data = await response.json() as ScriptEntry[];
                console.log(`[loadExampleScript] Successfully loaded from: ${path}`, data);
                return data;
            }
            console.log(`[loadExampleScript] Path returned status: ${response.status}`);
        } catch (error) {
            console.log(`[loadExampleScript] Path failed: ${path}`, error);
            lastError = error instanceof Error ? error : new Error(String(error));
        }
    }

    const errorMessage = `Failed to load example script: ${filename}. ${lastError?.message ?? 'Unknown error'}`;
    console.error('[loadExampleScript]', errorMessage);
    throw new Error(errorMessage);
}

/**
 * Load and parse JSON from file
 * @param file - File object
 * @returns Parsed JSON data
 */
export async function loadJsonFile(file: File): Promise<ScriptEntry[]> {
    console.log(`[loadJsonFile] Loading file: ${file.name}, size: ${file.size}, type: ${file.type}`);

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event): void => {
            console.log('[loadJsonFile] File read successfully');
            try {
                const result = event.target?.result;
                if (typeof result !== 'string') {
                    const error = new Error('Failed to read file as text');
                    console.error('[loadJsonFile]', error.message);
                    reject(error);
                    return;
                }
                console.log(`[loadJsonFile] File content length: ${result.length}`);
                const data = JSON.parse(result) as ScriptEntry[];
                console.log('[loadJsonFile] JSON parsed successfully:', data);
                resolve(data);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                const parseError = new Error(`Invalid JSON file: ${message}`);
                console.error('[loadJsonFile]', parseError.message);
                reject(parseError);
            }
        };

        reader.onerror = (): void => {
            const error = new Error('Failed to read file');
            console.error('[loadJsonFile]', error.message, reader.error);
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
