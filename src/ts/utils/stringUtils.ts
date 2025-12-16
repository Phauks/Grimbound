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

/**
 * Sanitize filename by removing invalid characters and handling edge cases
 * @param filename - Original filename
 * @returns Sanitized filename safe for all operating systems
 */
export function sanitizeFilename(filename: string): string {
  // Reserved filenames on Windows
  const RESERVED_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

  let sanitized = filename
    .trim()
    // Remove control characters (ASCII 0-31)
    .replace(/[\x00-\x1F]/g, '')
    // Remove characters invalid on Windows/macOS/Linux
    .replace(/[<>:"/\\|?*]/g, '')
    // Replace spaces with underscores
    .replace(/\s+/g, '_')
    // Remove leading/trailing dots (problematic on Windows)
    .replace(/^\.+|\.+$/g, '')
    // Collapse multiple underscores
    .replace(/_+/g, '_')
    // Remove leading/trailing underscores
    .replace(/^_+|_+$/g, '');

  // Handle reserved Windows filenames
  if (RESERVED_NAMES.test(sanitized)) {
    sanitized = `_${sanitized}`;
  }

  // Limit length (leave room for extension)
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200);
  }

  // Fallback for empty result
  return sanitized || 'unnamed';
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
