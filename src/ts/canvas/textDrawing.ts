/**
 * Blood on the Clocktower Token Generator
 * Text Drawing Utilities - Curved and styled text rendering
 */

import { getCachedFont } from '../cache/instances/fontCache.js';
import { CHARACTER_LAYOUT, DEFAULT_COLORS, LINE_HEIGHTS } from '../constants.js';
import { getLineSegments, parseAbilityText } from '../utils/abilityTextParser.js';
import {
  calculateCircularTextLayout,
  precalculateCurvedTextPositions,
} from './canvasOptimizations.js';
import { wrapText } from './canvasUtils.js';

/**
 * Options for curved text rendering
 */
export interface CurvedTextOptions {
  text: string;
  centerX: number;
  centerY: number;
  radius: number;
  fontFamily: string;
  fontSize: number;
  position: 'top' | 'bottom';
  color: string;
  letterSpacing: number;
  shadowBlur: number;
}

/**
 * Options for centered text with word wrapping
 */
export interface CenteredTextOptions {
  text: string;
  diameter: number;
  fontFamily: string;
  fontSizeRatio: number;
  maxWidthRatio: number;
  color: string;
  shadowBlur: number;
  verticalOffset?: number;
}

/**
 * Apply configurable text shadow
 * @param ctx - Canvas 2D context
 * @param blur - Shadow blur radius
 */
export function applyConfigurableShadow(ctx: CanvasRenderingContext2D, blur: number): void {
  ctx.shadowColor = DEFAULT_COLORS.TEXT_SHADOW;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetX = blur / 2;
  ctx.shadowOffsetY = blur / 2;
}

/**
 * Draw text curved along a circular path
 * @param ctx - Canvas context
 * @param options - Curved text options
 */
export function drawCurvedText(ctx: CanvasRenderingContext2D, options: CurvedTextOptions): void {
  const {
    text,
    centerX,
    centerY,
    radius,
    fontFamily,
    fontSize,
    position,
    color,
    letterSpacing,
    shadowBlur,
  } = options;

  ctx.save();

  // Use cached font string
  ctx.font = getCachedFont('bold', fontSize, fontFamily, 'Georgia, serif');
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Add text shadow for readability
  applyConfigurableShadow(ctx, shadowBlur);

  // Measure total text width including letter spacing
  // Letter spacing is applied between characters, so (N-1) spaces for N characters
  const baseWidth = ctx.measureText(text).width;
  const totalLetterSpacing = text.length > 1 ? (text.length - 1) * letterSpacing : 0;
  const totalWidth = baseWidth + totalLetterSpacing;

  // Calculate the angle span based on text width and radius
  // Limit to a maximum arc span to keep text readable
  const maxArcSpan = CHARACTER_LAYOUT.MAX_TEXT_ARC_SPAN;
  const arcSpan = Math.min(totalWidth / radius, maxArcSpan);

  // Starting angle for bottom text (centered)
  let startAngle: number;
  if (position === 'bottom') {
    startAngle = Math.PI / 2 + arcSpan / 2;
  } else {
    startAngle = -Math.PI / 2 - arcSpan / 2;
  }

  // Calculate angle per character (proportional to character width)
  const charWidths: number[] = [];
  let totalCharWidth = 0;
  for (const char of text) {
    const width = ctx.measureText(char).width + letterSpacing;
    charWidths.push(width);
    totalCharWidth += width;
  }

  const direction = position === 'bottom' ? -1 : 1;

  // Pre-calculate all character positions
  const positions = precalculateCurvedTextPositions(
    text,
    charWidths,
    totalCharWidth,
    centerX,
    centerY,
    radius,
    arcSpan,
    startAngle,
    direction,
    position
  );

  // Draw all characters using pre-calculated positions
  for (const { char, x, y, rotation } of positions) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.fillText(char, 0, 0);
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Draw centered text with word wrapping
 * @param ctx - Canvas context
 * @param options - Centered text options
 */
export function drawCenteredWrappedText(
  ctx: CanvasRenderingContext2D,
  options: CenteredTextOptions
): void {
  const {
    text,
    diameter,
    fontFamily,
    fontSizeRatio,
    maxWidthRatio,
    color,
    shadowBlur,
    verticalOffset = 0,
  } = options;

  ctx.save();

  const fontSize = diameter * fontSizeRatio;
  // Use cached font string
  ctx.font = getCachedFont('bold', fontSize, fontFamily, 'Georgia, serif');
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Add shadow for readability
  applyConfigurableShadow(ctx, shadowBlur);

  // Word wrap the text
  const maxWidth = diameter * maxWidthRatio;
  const lines = wrapText(text, ctx, maxWidth);

  // Draw lines centered vertically
  const lineHeight = fontSize * LINE_HEIGHTS.STANDARD;
  const totalHeight = lines.length * lineHeight;
  const startY = (diameter - totalHeight) / 2 + fontSize / 2 + verticalOffset;

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], diameter / 2, startY + i * lineHeight);
  }

  ctx.restore();
}

/**
 * Draw two-line centered text (for Pandemonium Institute)
 * @param ctx - Canvas context
 * @param line1 - First line text
 * @param line2 - Second line text
 * @param diameter - Token diameter
 * @param fontFamily - Font family name
 * @param fontSizeRatio - Font size as ratio of diameter
 * @param color - Text color
 * @param shadowBlur - Shadow blur radius
 */
export function drawTwoLineCenteredText(
  ctx: CanvasRenderingContext2D,
  line1: string,
  line2: string,
  diameter: number,
  fontFamily: string,
  fontSizeRatio: number,
  color: string,
  shadowBlur: number
): void {
  ctx.save();

  const fontSize = diameter * fontSizeRatio;
  // Use cached font string
  ctx.font = getCachedFont('bold', fontSize, fontFamily, 'Georgia, serif');
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Add shadow for readability
  applyConfigurableShadow(ctx, shadowBlur);

  const lineHeight = fontSize * LINE_HEIGHTS.STANDARD;
  const centerY = diameter / 2;

  // Draw first line above center
  ctx.fillText(line1, diameter / 2, centerY - lineHeight / 2);
  // Draw second line below center
  ctx.fillText(line2, diameter / 2, centerY + lineHeight / 2);

  ctx.restore();
}

/**
 * Draw ability text on token (horizontal, word-wrapped with adaptive width based on circular shape)
 * This version uses optimized circular text layout calculation
 * @param ctx - Canvas context
 * @param ability - Ability text
 * @param diameter - Token diameter
 * @param fontFamily - Font family name
 * @param fontSizeRatio - Font size as ratio of diameter
 * @param lineHeightMultiplier - Line height multiplier
 * @param maxWidthRatio - Max width as ratio of diameter (used as padding factor for circular calculation)
 * @param yPositionRatio - Y position as ratio of diameter
 * @param color - Text color
 * @param letterSpacing - Letter spacing in pixels
 * @param shadowBlur - Shadow blur radius
 */
export function drawAbilityText(
  ctx: CanvasRenderingContext2D,
  ability: string,
  diameter: number,
  fontFamily: string,
  fontSizeRatio: number,
  lineHeightMultiplier: number,
  _maxWidthRatio: number,
  yPositionRatio: number,
  color: string,
  letterSpacing: number,
  shadowBlur: number
): void {
  ctx.save();

  const fontSize = diameter * fontSizeRatio;
  // Use cached font string (normal weight for ability text)
  ctx.font = getCachedFont('', fontSize, fontFamily, 'sans-serif');
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  // Apply letterSpacing if supported (modern browsers)
  if ('letterSpacing' in ctx && letterSpacing !== 0) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
      `${letterSpacing}px`;
  }

  // Add shadow for readability (smaller for ability text)
  ctx.shadowColor = DEFAULT_COLORS.TEXT_SHADOW;
  ctx.shadowBlur = shadowBlur;
  ctx.shadowOffsetX = shadowBlur / 3;
  ctx.shadowOffsetY = shadowBlur / 3;

  const startY = diameter * yPositionRatio;

  // Use optimized circular text layout calculation
  const layout = calculateCircularTextLayout(
    ctx,
    ability,
    diameter,
    fontSize,
    lineHeightMultiplier,
    startY,
    CHARACTER_LAYOUT.ABILITY_TEXT_CIRCULAR_PADDING
  );

  // Check if we have bold text (setup brackets)
  const segments = parseAbilityText(ability);
  const hasBoldText = segments.some((s) => s.isBold);

  // Draw lines
  let currentY = startY;
  for (const line of layout.lines) {
    if (!hasBoldText) {
      // Fast path: no bold text, use simple centered drawing
      ctx.fillText(line, diameter / 2, currentY);
    } else {
      // Slow path: render segment-by-segment for mixed bold/normal text
      const lineSegments = getLineSegments(line, ability);

      // Calculate total line width with mixed fonts
      let totalWidth = 0;
      for (const seg of lineSegments) {
        ctx.font = getCachedFont(seg.isBold ? 'bold' : '', fontSize, fontFamily, 'sans-serif');
        totalWidth += ctx.measureText(seg.text).width;
      }

      // Start from left edge of centered text
      let xPos = diameter / 2 - totalWidth / 2;

      // Draw each segment with appropriate font weight
      for (const seg of lineSegments) {
        ctx.font = getCachedFont(seg.isBold ? 'bold' : '', fontSize, fontFamily, 'sans-serif');
        ctx.textAlign = 'left'; // Left-align for segment drawing
        ctx.fillText(seg.text, xPos, currentY);
        xPos += ctx.measureText(seg.text).width;
      }

      // Reset alignment for next iteration
      ctx.textAlign = 'center';
    }
    currentY += layout.lineHeight;
  }

  ctx.restore();
}

/**
 * Draw text overlay on QR code
 * @param ctx - Canvas context
 * @param text - Text to draw
 * @param diameter - Token diameter
 * @param fontFamily - Font family name
 * @param fontSizeRatio - Font size as ratio of diameter
 * @param maxWidthRatio - Max width as ratio of diameter
 * @param verticalOffset - Vertical offset as ratio of diameter
 * @param color - Text color
 */
export function drawQROverlayText(
  ctx: CanvasRenderingContext2D,
  text: string,
  diameter: number,
  fontFamily: string,
  fontSizeRatio: number,
  maxWidthRatio: number,
  verticalOffset: number,
  color: string
): void {
  ctx.save();

  const fontSize = diameter * fontSizeRatio;
  // Use cached font string
  ctx.font = getCachedFont('bold', fontSize, fontFamily, 'Georgia, serif');
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Word wrap the text
  const maxWidth = diameter * maxWidthRatio;
  const lines = wrapText(text, ctx, maxWidth);

  // Draw lines centered vertically (with vertical offset)
  const lineHeight = fontSize * LINE_HEIGHTS.TIGHT;
  const totalHeight = lines.length * lineHeight;
  const startY = (diameter - totalHeight) / 2 + fontSize / 2 - diameter * verticalOffset;

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], diameter / 2, startY + i * lineHeight);
  }

  ctx.restore();
}

export default {
  drawCurvedText,
  drawCenteredWrappedText,
  drawTwoLineCenteredText,
  drawAbilityText,
  drawQROverlayText,
  applyConfigurableShadow,
};
