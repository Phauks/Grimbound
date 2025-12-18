/**
 * Blood on the Clocktower Token Generator
 * Canvas Optimization Utilities - Performance optimizations for canvas rendering
 */

import { clearFontCache, getCachedFont } from '@/ts/cache/instances/fontCache.js';
import { CHARACTER_LAYOUT } from '@/ts/constants.js';

// ============================================================================
// TEXT LAYOUT CACHING
// ============================================================================

/**
 * Result of text layout calculation
 */
export interface TextLayoutResult {
  lines: string[];
  totalHeight: number;
  lineHeight: number;
}

/**
 * Calculate text layout with word wrapping for circular bounds
 * This caches both the wrapped lines and the total height to avoid redundant calculations
 *
 * @param ctx - Canvas context (must have font set)
 * @param text - Text to layout
 * @param diameter - Token diameter
 * @param fontSize - Font size in pixels
 * @param lineHeightMultiplier - Line height multiplier
 * @param startY - Starting Y position
 * @param circularPadding - Padding ratio for circular bounds
 * @returns Layout result with lines and height
 */
export function calculateCircularTextLayout(
  ctx: CanvasRenderingContext2D,
  text: string,
  diameter: number,
  fontSize: number,
  lineHeightMultiplier: number,
  startY: number,
  circularPadding: number = CHARACTER_LAYOUT.ABILITY_TEXT_CIRCULAR_PADDING
): TextLayoutResult {
  const radius = diameter / 2;
  const centerY = diameter / 2;
  const lineHeight = fontSize * lineHeightMultiplier;

  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  let currentY = startY;

  // Create width calculator with caching
  const widthCalculator = createCircularWidthCalculator(centerY, radius, circularPadding);

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = ctx.measureText(testLine).width;

    // Calculate available width at current Y position
    const availableWidth = widthCalculator(currentY + fontSize / 2);

    if (testWidth <= availableWidth || !currentLine) {
      // Word fits on current line (or it's the first word on the line)
      currentLine = testLine;
    } else {
      // Word doesn't fit, save current line and start new one
      lines.push(currentLine);
      currentLine = word;
      currentY += lineHeight;
    }
  }

  // Add the last line
  if (currentLine) {
    lines.push(currentLine);
  }

  const totalHeight = lines.length * lineHeight;

  return { lines, totalHeight, lineHeight };
}

// ============================================================================
// CIRCULAR WIDTH CALCULATION CACHING
// ============================================================================

/**
 * Create a cached circular width calculator
 * Pre-computes widths at pixel intervals to avoid expensive sqrt operations
 *
 * @param centerY - Y coordinate of circle center
 * @param radius - Circle radius
 * @param maxWidthRatio - Maximum width ratio to constrain
 * @returns Function that returns cached width for given Y position
 */
export function createCircularWidthCalculator(
  centerY: number,
  radius: number,
  maxWidthRatio: number = 0.9
): (y: number) => number {
  const cache = new Map<number, number>();

  return (y: number): number => {
    // Round to nearest pixel for cache key
    const key = Math.round(y);

    if (!cache.has(key)) {
      const distanceFromCenter = Math.abs(key - centerY);

      // If outside the circle, return 0
      if (distanceFromCenter > radius) {
        cache.set(key, 0);
      } else {
        // Calculate chord width at this height using Pythagorean theorem
        const halfWidth = Math.sqrt(radius * radius - distanceFromCenter * distanceFromCenter);
        const fullWidth = 2 * halfWidth;

        // Apply max width ratio to add some padding from edges
        cache.set(key, fullWidth * maxWidthRatio);
      }
    }

    return cache.get(key)!;
  };
}

/**
 * Calculate the available width at a given Y position within a circle
 * (Non-cached version for single calculations)
 *
 * @param yPosition - Y coordinate position
 * @param centerY - Y coordinate of circle center
 * @param radius - Circle radius
 * @param maxWidthRatio - Maximum width ratio to constrain
 * @returns Available width at that Y position
 */
export function calculateCircularWidth(
  yPosition: number,
  centerY: number,
  radius: number,
  maxWidthRatio: number = 0.9
): number {
  const distanceFromCenter = Math.abs(yPosition - centerY);

  // If outside the circle, return 0
  if (distanceFromCenter > radius) {
    return 0;
  }

  // Calculate chord width at this height using Pythagorean theorem
  const halfWidth = Math.sqrt(radius * radius - distanceFromCenter * distanceFromCenter);
  const fullWidth = 2 * halfWidth;

  // Apply max width ratio to add some padding from edges
  return fullWidth * maxWidthRatio;
}

// ============================================================================
// FONT STRING CACHING
// ============================================================================

// Font cache now uses hexagonal cache architecture with LRU eviction
// See: src/ts/cache/instances/fontCache.ts
// Re-export for backward compatibility
export { getCachedFont as globalFontCache, clearFontCache };

// ============================================================================
// CURVED TEXT POSITION CACHING
// ============================================================================

/**
 * Pre-calculated position for a character in curved text
 */
export interface CharacterPosition {
  char: string;
  x: number;
  y: number;
  rotation: number;
}

/**
 * Pre-calculate all character positions for curved text
 * This avoids repeated trigonometric calculations during rendering
 *
 * @param text - Text to position
 * @param charWidths - Width of each character
 * @param totalCharWidth - Total width of all characters
 * @param centerX - X coordinate of circle center
 * @param centerY - Y coordinate of circle center
 * @param radius - Radius for text placement
 * @param arcSpan - Total arc span for the text
 * @param startAngle - Starting angle
 * @param direction - Direction (-1 for bottom, 1 for top)
 * @param position - Position type ('top' or 'bottom')
 * @returns Array of pre-calculated character positions
 */
export function precalculateCurvedTextPositions(
  text: string,
  charWidths: number[],
  totalCharWidth: number,
  centerX: number,
  centerY: number,
  radius: number,
  arcSpan: number,
  startAngle: number,
  direction: number,
  position: 'top' | 'bottom'
): CharacterPosition[] {
  const positions: CharacterPosition[] = [];
  let currentAngle = startAngle;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const charWidth = charWidths[i];
    const charAngle = (charWidth / totalCharWidth) * arcSpan;

    currentAngle += (direction * charAngle) / 2;

    const x = centerX + radius * Math.cos(currentAngle);
    const y = centerY + radius * Math.sin(currentAngle);

    // Calculate rotation
    let rotation = currentAngle + Math.PI / 2;
    if (position === 'top') {
      rotation -= Math.PI;
    } else {
      // For bottom text, flip 180 degrees to face outward
      rotation += Math.PI;
    }

    positions.push({ char, x, y, rotation });

    currentAngle += (direction * charAngle) / 2;
  }

  return positions;
}

export default {
  calculateCircularTextLayout,
  createCircularWidthCalculator,
  calculateCircularWidth,
  getCachedFont,
  clearFontCache,
  precalculateCurvedTextPositions,
};
