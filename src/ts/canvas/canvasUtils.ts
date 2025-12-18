/**
 * Blood on the Clocktower Token Generator
 * Canvas Utilities - Reusable canvas helper functions
 */

import { ABILITY_TEXT_SHADOW, DEFAULT_COLORS, TEXT_SHADOW } from '@/ts/constants.js';

/**
 * Point interface for x, y coordinates
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Canvas creation result
 */
export interface CanvasContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  center: Point;
  radius: number;
}

/**
 * Options for canvas creation
 */
export interface CanvasOptions {
  /** DPI setting (default: 300). Higher values create larger canvases with scaling. */
  dpi?: number;
}

/**
 * Create a canvas element with high-quality rendering settings
 * @param diameter - Canvas width and height in pixels (at base 300 DPI)
 * @param options - Optional canvas creation options
 * @returns Canvas element and 2D context
 * @throws Error if canvas context cannot be obtained
 */
export function createCanvas(diameter: number, options: CanvasOptions = {}): CanvasContext {
  const { dpi = 300 } = options;
  const dpiScale = dpi / 300;
  const scaledDiameter = Math.floor(diameter * dpiScale);

  const canvas = document.createElement('canvas');
  canvas.width = scaledDiameter;
  canvas.height = scaledDiameter;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Enable high-quality rendering
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Apply DPI scaling so drawing coordinates remain consistent
  if (dpiScale !== 1) {
    ctx.scale(dpiScale, dpiScale);
  }

  const radius = diameter / 2;
  const center: Point = { x: radius, y: radius };

  return { canvas, ctx, center, radius };
}

/**
 * Create a circular clipping path
 * @param ctx - Canvas 2D context
 * @param center - Center point of the circle
 * @param radius - Radius of the circle
 */
export function createCircularClipPath(
  ctx: CanvasRenderingContext2D,
  center: Point,
  radius: number
): void {
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
}

/**
 * Apply text shadow settings for curved text and titles
 * @param ctx - Canvas 2D context
 */
export function applyTextShadow(ctx: CanvasRenderingContext2D): void {
  ctx.shadowColor = DEFAULT_COLORS.TEXT_SHADOW;
  ctx.shadowBlur = TEXT_SHADOW.BLUR;
  ctx.shadowOffsetX = TEXT_SHADOW.OFFSET_X;
  ctx.shadowOffsetY = TEXT_SHADOW.OFFSET_Y;
}

/**
 * Apply text shadow settings for ability text (smaller shadows)
 * @param ctx - Canvas 2D context
 */
export function applyAbilityTextShadow(ctx: CanvasRenderingContext2D): void {
  ctx.shadowColor = DEFAULT_COLORS.TEXT_SHADOW;
  ctx.shadowBlur = ABILITY_TEXT_SHADOW.BLUR;
  ctx.shadowOffsetX = ABILITY_TEXT_SHADOW.OFFSET_X;
  ctx.shadowOffsetY = ABILITY_TEXT_SHADOW.OFFSET_Y;
}

/**
 * Clear shadow settings
 * @param ctx - Canvas 2D context
 */
export function clearShadow(ctx: CanvasRenderingContext2D): void {
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

/**
 * Word wrap text to fit within a maximum width
 * @param text - Text to wrap
 * @param ctx - Canvas 2D context (must have font set)
 * @param maxWidth - Maximum line width in pixels
 * @returns Array of wrapped lines
 */
export function wrapText(text: string, ctx: CanvasRenderingContext2D, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Draw an image to cover the canvas (like CSS background-size: cover)
 * @param ctx - Canvas 2D context
 * @param img - Image to draw
 * @param targetWidth - Target width to fill
 * @param targetHeight - Target height to fill
 */
export function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  targetWidth: number,
  targetHeight: number
): void {
  const imgRatio = img.width / img.height;
  const targetRatio = targetWidth / targetHeight;

  let drawWidth: number, drawHeight: number, drawX: number, drawY: number;

  if (imgRatio > targetRatio) {
    drawHeight = targetHeight;
    drawWidth = img.width * (targetHeight / img.height);
    drawX = (targetWidth - drawWidth) / 2;
    drawY = 0;
  } else {
    drawWidth = targetWidth;
    drawHeight = img.height * (targetWidth / img.width);
    drawX = 0;
    drawY = (targetHeight - drawHeight) / 2;
  }

  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
}

/**
 * Draw a filled circle
 * @param ctx - Canvas 2D context
 * @param center - Center point
 * @param radius - Circle radius
 * @param fillColor - Fill color
 */
export function fillCircle(
  ctx: CanvasRenderingContext2D,
  center: Point,
  radius: number,
  fillColor: string
): void {
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fillColor;
  ctx.fill();
}

/**
 * Draw a stroked circle
 * @param ctx - Canvas 2D context
 * @param center - Center point
 * @param radius - Circle radius
 * @param strokeColor - Stroke color
 * @param lineWidth - Line width
 */
export function strokeCircle(
  ctx: CanvasRenderingContext2D,
  center: Point,
  radius: number,
  strokeColor: string,
  lineWidth: number = 2
): void {
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

/**
 * Draw centered text at a specific position
 * @param ctx - Canvas 2D context
 * @param text - Text to draw
 * @param x - X coordinate (center)
 * @param y - Y coordinate (middle)
 * @param font - Font string (e.g., "bold 24px Arial")
 * @param color - Text color
 * @param withShadow - Whether to apply text shadow
 */
export function drawCenteredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  color: string,
  withShadow: boolean = true
): void {
  ctx.save();

  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (withShadow) {
    applyTextShadow(ctx);
  }

  ctx.fillText(text, x, y);

  ctx.restore();
}

/**
 * Draw multi-line text centered vertically
 * @param ctx - Canvas 2D context
 * @param lines - Array of text lines
 * @param centerX - X coordinate (center)
 * @param startY - Starting Y coordinate for first line
 * @param lineHeight - Height between lines
 * @param font - Font string
 * @param color - Text color
 * @param withShadow - Whether to apply text shadow
 */
export function drawMultiLineText(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  centerX: number,
  startY: number,
  lineHeight: number,
  font: string,
  color: string,
  withShadow: boolean = true
): void {
  ctx.save();

  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  if (withShadow) {
    applyAbilityTextShadow(ctx);
  }

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], centerX, startY + i * lineHeight);
  }

  ctx.restore();
}

/**
 * Calculate character widths for curved text
 * @param text - Text to measure
 * @param ctx - Canvas 2D context (must have font set)
 * @returns Object with character widths array and total width
 */
export function measureCharacterWidths(
  text: string,
  ctx: CanvasRenderingContext2D
): { charWidths: number[]; totalWidth: number } {
  const charWidths: number[] = [];
  let totalWidth = 0;

  for (const char of text) {
    const width = ctx.measureText(char).width;
    charWidths.push(width);
    totalWidth += width;
  }

  return { charWidths, totalWidth };
}

export default {
  createCanvas,
  createCircularClipPath,
  applyTextShadow,
  applyAbilityTextShadow,
  clearShadow,
  wrapText,
  drawImageCover,
  fillCircle,
  strokeCircle,
  drawCenteredText,
  drawMultiLineText,
  measureCharacterWidths,
};
