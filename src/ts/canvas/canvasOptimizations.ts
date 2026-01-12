/**
 * Blood on the Clocktower Token Generator
 * Canvas Optimization Utilities - Performance optimizations for canvas rendering
 */

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
  /** Whether text was truncated (not applicable for basic layout) */
  wasTruncated?: boolean;
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

    const cached = cache.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const distanceFromCenter = Math.abs(key - centerY);
    let width: number;

    // If outside the circle, return 0
    if (distanceFromCenter > radius) {
      width = 0;
    } else {
      // Calculate chord width at this height using Pythagorean theorem
      const halfWidth = Math.sqrt(radius * radius - distanceFromCenter * distanceFromCenter);
      const fullWidth = 2 * halfWidth;

      // Apply max width ratio to add some padding from edges
      width = fullWidth * maxWidthRatio;
    }

    cache.set(key, width);
    return width;
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

    // Calculate rotation to make text readable from outside the circle
    // Top: currentAngle + π/2 (no additional rotation needed)
    // Bottom: currentAngle + π/2 + π (add 180° for bottom text)
    const rotation =
      position === 'bottom' ? currentAngle + Math.PI / 2 + Math.PI : currentAngle + Math.PI / 2;

    positions.push({ char, x, y, rotation });

    currentAngle += (direction * charAngle) / 2;
  }

  return positions;
}

/**
 * Options for fitting text within bounded circular space
 */
export interface FitTextOptions {
  /** Minimum font size ratio (relative to diameter) to shrink to */
  minFontSizeRatio?: number;
  /** Font size reduction step per iteration */
  fontSizeStep?: number;
  /** Maximum iterations to prevent infinite loops */
  maxIterations?: number;
}

/**
 * Result of auto-fitting text calculation
 */
export interface FitTextResult extends TextLayoutResult {
  /** The font size that was used (may be smaller than requested) */
  actualFontSize: number;
  /** Whether the font size was reduced to fit */
  wasReduced: boolean;
}

/**
 * Calculate text layout that fits within available vertical space by reducing font size if needed.
 * Useful for jinx tokens and other contexts where text must not overflow a bounded area.
 *
 * @param ctx - Canvas context (font will be temporarily modified during calculation)
 * @param text - Text to layout
 * @param diameter - Token diameter
 * @param preferredFontSize - Preferred font size in pixels
 * @param lineHeightMultiplier - Line height multiplier
 * @param startY - Starting Y position
 * @param maxY - Maximum Y position (text must not exceed this)
 * @param circularPadding - Padding ratio for circular bounds
 * @param fontFamily - Font family for recalculating after size changes
 * @param options - Additional fitting options
 * @returns Layout result with actual font size used
 */
export function calculateFittedCircularTextLayout(
  ctx: CanvasRenderingContext2D,
  text: string,
  diameter: number,
  preferredFontSize: number,
  lineHeightMultiplier: number,
  startY: number,
  maxY: number,
  circularPadding: number,
  fontFamily: string,
  options: FitTextOptions = {}
): FitTextResult {
  const { minFontSizeRatio = 0.03, fontSizeStep = 0.005, maxIterations = 20 } = options;

  const minFontSize = diameter * minFontSizeRatio;
  const fontSizeDecrement = diameter * fontSizeStep;
  let currentFontSize = preferredFontSize;
  let iterations = 0;

  // Save original font
  const originalFont = ctx.font;

  while (iterations < maxIterations && currentFontSize >= minFontSize) {
    // Update font for accurate measurement
    ctx.font = `${currentFontSize}px ${fontFamily}`;

    const layout = calculateCircularTextLayout(
      ctx,
      text,
      diameter,
      currentFontSize,
      lineHeightMultiplier,
      startY,
      circularPadding
    );

    const endY = startY + layout.totalHeight;

    // Check if layout fits within bounds
    if (endY <= maxY) {
      // Restore original font
      ctx.font = originalFont;

      return {
        ...layout,
        actualFontSize: currentFontSize,
        wasReduced: currentFontSize < preferredFontSize,
      };
    }

    // Reduce font size and try again
    currentFontSize -= fontSizeDecrement;
    iterations++;
  }

  // If we still can't fit, use the minimum font size
  ctx.font = `${minFontSize}px ${fontFamily}`;
  const finalLayout = calculateCircularTextLayout(
    ctx,
    text,
    diameter,
    minFontSize,
    lineHeightMultiplier,
    startY,
    circularPadding
  );

  // Restore original font
  ctx.font = originalFont;

  return {
    ...finalLayout,
    actualFontSize: minFontSize,
    wasReduced: true,
  };
}
