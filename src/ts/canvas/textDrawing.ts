/**
 * Blood on the Clocktower Token Generator
 * Text Drawing Utilities - Curved and styled text rendering
 */

import { DEFAULT_COLORS, CHARACTER_LAYOUT, LINE_HEIGHTS } from '../constants.js';
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
export function applyConfigurableShadow(
    ctx: CanvasRenderingContext2D,
    blur: number
): void {
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
export function drawCurvedText(
    ctx: CanvasRenderingContext2D,
    options: CurvedTextOptions
): void {
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
        shadowBlur
    } = options;

    ctx.save();

    ctx.font = `bold ${fontSize}px "${fontFamily}", Georgia, serif`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Add text shadow for readability
    applyConfigurableShadow(ctx, shadowBlur);

    // Measure total text width
    const totalWidth = ctx.measureText(text).width;

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

    // Draw each character
    let currentAngle = startAngle;
    const direction = position === 'bottom' ? -1 : 1;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const charWidth = charWidths[i];
        const charAngle = (charWidth / totalCharWidth) * arcSpan;

        currentAngle += direction * charAngle / 2;

        const x = centerX + radius * Math.cos(currentAngle);
        const y = centerY + radius * Math.sin(currentAngle);

        ctx.save();
        ctx.translate(x, y);

        // Rotate character to follow the curve
        let rotation = currentAngle + Math.PI / 2;
        if (position === 'top') {
            rotation -= Math.PI;
        } else {
            // For bottom text, flip 180 degrees to face outward
            rotation += Math.PI;
        }
        ctx.rotate(rotation);

        ctx.fillText(char, 0, 0);
        ctx.restore();

        currentAngle += direction * charAngle / 2;
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
        verticalOffset = 0
    } = options;

    ctx.save();

    const fontSize = diameter * fontSizeRatio;
    ctx.font = `bold ${fontSize}px "${fontFamily}", Georgia, serif`;
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
    ctx.font = `bold ${fontSize}px "${fontFamily}", Georgia, serif`;
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
 * Calculate the available width at a given Y position within a circle
 * Uses the chord formula: width = 2 * sqrt(r² - d²)
 * where r is radius and d is distance from center
 * @param yPosition - Y coordinate position
 * @param centerY - Y coordinate of circle center
 * @param radius - Circle radius
 * @param maxWidthRatio - Maximum width ratio to constrain (e.g., 0.9 = 90% of calculated width)
 * @returns Available width at that Y position
 */
function calculateCircularWidth(yPosition: number, centerY: number, radius: number, maxWidthRatio: number = 0.9): number {
    const distanceFromCenter = Math.abs(yPosition - centerY);
    
    // If outside the circle, return 0
    if (distanceFromCenter > radius) {
        return 0;
    }
    
    // Calculate chord width at this height using Pythagorean theorem
    // For a circle: x² + y² = r²
    // So: x = sqrt(r² - y²), and width = 2x
    const halfWidth = Math.sqrt(radius * radius - distanceFromCenter * distanceFromCenter);
    const fullWidth = 2 * halfWidth;
    
    // Apply max width ratio to add some padding from edges
    return fullWidth * maxWidthRatio;
}

/**
 * Draw ability text on token (horizontal, word-wrapped with adaptive width based on circular shape)
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
    maxWidthRatio: number,
    yPositionRatio: number,
    color: string,
    letterSpacing: number,
    shadowBlur: number
): void {
    ctx.save();

    const fontSize = diameter * fontSizeRatio;
    ctx.font = `${fontSize}px "${fontFamily}", sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // Apply letterSpacing if supported (modern browsers)
    if ('letterSpacing' in ctx && letterSpacing !== 0) {
        (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${letterSpacing}px`;
    }

    // Add shadow for readability (smaller for ability text)
    ctx.shadowColor = DEFAULT_COLORS.TEXT_SHADOW;
    ctx.shadowBlur = shadowBlur;
    ctx.shadowOffsetX = shadowBlur / 3;
    ctx.shadowOffsetY = shadowBlur / 3;

    // Calculate circle properties
    const radius = diameter / 2;
    const centerY = diameter / 2;
    const lineHeight = fontSize * lineHeightMultiplier;
    const startY = diameter * yPositionRatio;

    // Split text into words for adaptive wrapping
    const words = ability.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    let currentY = startY;

    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = ctx.measureText(testLine).width;
        
        // Calculate available width at current Y position
        // Use CHARACTER_LAYOUT.ABILITY_TEXT_CIRCULAR_PADDING for consistent padding from circle edges
        const availableWidth = calculateCircularWidth(currentY + fontSize / 2, centerY, radius, CHARACTER_LAYOUT.ABILITY_TEXT_CIRCULAR_PADDING);
        
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

    // Draw lines with their adaptive widths
    currentY = startY;
    for (const line of lines) {
        ctx.fillText(line, diameter / 2, currentY);
        currentY += lineHeight;
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
    ctx.font = `bold ${fontSize}px "${fontFamily}", Georgia, serif`;
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
    applyConfigurableShadow
};
