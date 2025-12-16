/**
 * Blood on the Clocktower Token Generator
 * Color Utility Functions
 */

import type { RGB } from '../types/index.js';

/**
 * Convert hex color to RGB object
 * Supports both 3-character (#RGB) and 6-character (#RRGGBB) hex formats
 * @param hex - Hex color string (e.g., '#FFF', '#FFFFFF', 'ABC', 'AABBCC')
 * @returns RGB object with r, g, b properties, or null if invalid
 */
export function hexToRgb(hex: string): RGB | null {
  // Try 6-character hex first
  let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    };
  }

  // Try 3-character hex (expand each digit: F -> FF)
  result = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex);
  if (result) {
    return {
      r: parseInt(result[1] + result[1], 16),
      g: parseInt(result[2] + result[2], 16),
      b: parseInt(result[3] + result[3], 16),
    };
  }

  return null;
}

/**
 * Get contrast color (black or white) for given background
 * @param hexColor - Background hex color
 * @returns '#000000' or '#FFFFFF'
 */
export function getContrastColor(hexColor: string): string {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return '#000000';

  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}
