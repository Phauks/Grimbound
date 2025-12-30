/**
 * Blood on the Clocktower Token Generator
 * String Utility Functions
 */

/**
 * Generate a unique filename suffix for duplicates
 * @param nameCount - Map tracking name occurrences
 * @param baseName - Base filename
 * @returns Filename with suffix if needed
 */
export function generateUniqueFilename(nameCount: Map<string, number>, baseName: string): string {
  if (!nameCount.has(baseName)) {
    nameCount.set(baseName, 0);
  }
  const count = nameCount.get(baseName) ?? 0;
  nameCount.set(baseName, count + 1);

  if (count === 0) {
    return baseName;
  }
  return `${baseName}_${String(count).padStart(2, '0')}`;
}

// Characters that are invalid in filenames on Windows/macOS/Linux
const INVALID_FILENAME_CHARS = new Set(['<', '>', ':', '"', '/', '\\', '|', '?', '*']);

// Reserved filenames on Windows (case-insensitive)
const RESERVED_NAMES = new Set([
  'con',
  'prn',
  'aux',
  'nul',
  'com1',
  'com2',
  'com3',
  'com4',
  'com5',
  'com6',
  'com7',
  'com8',
  'com9',
  'lpt1',
  'lpt2',
  'lpt3',
  'lpt4',
  'lpt5',
  'lpt6',
  'lpt7',
  'lpt8',
  'lpt9',
]);

/**
 * Sanitize filename by removing invalid characters and handling edge cases.
 * Uses character-by-character processing to avoid ReDoS vulnerabilities.
 * @param filename - Original filename
 * @returns Sanitized filename safe for all operating systems
 */
export function sanitizeFilename(filename: string): string {
  // Build sanitized string character by character (O(n) complexity)
  let result = '';
  let lastCharWasUnderscore = false;

  for (const char of filename) {
    const code = char.charCodeAt(0);

    // Skip control characters (0x00-0x1F)
    if (code <= 0x1f) {
      continue;
    }

    // Skip invalid filename characters
    if (INVALID_FILENAME_CHARS.has(char)) {
      continue;
    }

    // Replace whitespace with underscore, collapse consecutive underscores
    if (char === ' ' || char === '\t' || char === '_') {
      if (!lastCharWasUnderscore && result.length > 0) {
        result += '_';
        lastCharWasUnderscore = true;
      }
      continue;
    }

    // Skip leading dots
    if (char === '.' && result.length === 0) {
      continue;
    }

    result += char;
    lastCharWasUnderscore = false;
  }

  // Remove trailing dots and underscores
  let endIndex = result.length;
  while (endIndex > 0 && (result[endIndex - 1] === '.' || result[endIndex - 1] === '_')) {
    endIndex--;
  }
  result = result.slice(0, endIndex);

  // Handle reserved Windows filenames
  if (RESERVED_NAMES.has(result.toLowerCase())) {
    result = `_${result}`;
  }

  // Limit length (leave room for extension)
  if (result.length > 200) {
    result = result.substring(0, 200);
  }

  // Fallback for empty result
  return result || 'unnamed';
}

/**
 * Capitalize first letter of string
 * @param str - String to capitalize
 * @returns Capitalized string
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
