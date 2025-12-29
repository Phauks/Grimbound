/**
 * Auto-discover example scripts from the example_scripts folder
 * Uses Vite's import.meta.glob to find all JSON files at build time
 *
 * JSON content is inlined into the bundle for:
 * - Fewer HTTP requests
 * - Immediate offline availability
 * - Better PWA caching
 */

import type { ScriptEntry } from '@/ts/types/index.js';

// Import all JSON files from example_scripts folder
// Content is bundled directly into JS (no separate fetch needed)
const scriptModules = import.meta.glob('/example_scripts/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, ScriptEntry[]>;

/**
 * Get list of example script filenames (auto-populated from example_scripts folder)
 * Adding any .json file to example_scripts/ will automatically include it here
 */
export function getExampleScriptNames(): string[] {
  return Object.keys(scriptModules)
    .map((path) => {
      // Extract filename from path like "/example_scripts/Catfishing.json"
      const match = path.match(/\/example_scripts\/(.+\.json)$/);
      return match ? match[1] : null;
    })
    .filter((name): name is string => name !== null)
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Get example script data directly (bundled, no fetch needed)
 */
export function getExampleScriptData(filename: string): ScriptEntry[] | null {
  const key = `/example_scripts/${filename}`;
  return scriptModules[key] || null;
}

// Export the list for use in config
export const EXAMPLE_SCRIPT_LIST = getExampleScriptNames();
