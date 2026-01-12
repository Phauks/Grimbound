/**
 * Blood on the Clocktower Token Generator
 * Accent Drawing Utilities - Deterministic accent rendering for tokens
 *
 * Accents are functional game indicators:
 * - Top accents: Number of reminder tokens to add to the Grimoire
 * - Left accent: Character acts on the first night
 * - Right accent: Character acts on other nights (each night except the first)
 */

import CONFIG from '@/ts/config.js';
import { ACCENT_LAYOUT } from '@/ts/constants.js';
import { globalImageCache, logger } from '@/ts/utils/index.js';

/**
 * Accent position configuration
 */
interface AccentPosition {
  type: 'left' | 'right' | 'top';
  angle: number; // in radians, 0 = top, positive = clockwise
  scale: number;
  radialOffset: number;
}

/**
 * Character data needed for accent drawing
 */
export interface AccentCharacterData {
  /** Number of reminder tokens (determines top accent count) */
  reminderCount: number;
  /** Whether character acts on first night (determines left accent) */
  firstNight: boolean;
  /** Whether character acts on other nights (determines right accent) */
  otherNight: boolean;
}

/**
 * Options for accent drawing
 */
export interface AccentDrawingOptions {
  /** Accent style (e.g., 'classic', 'autumn') */
  accentGeneration: string;
  /** Character data for deterministic accent placement */
  characterData: AccentCharacterData;
  /** How far from center accents are placed (0.5-1.0, default from ACCENT_LAYOUT) */
  radialOffset?: number;
  /** Rotate accent images 180 degrees */
  rotate180?: boolean;
  /** Flip accent images horizontally */
  flip?: boolean;
}

/**
 * Build array of accent positions based on character data
 * @param characterData - Character's reminder count and night order data
 * @param radialOffset - How far from center accents are placed (0.5-1.0)
 * @returns Array of accent positions to draw
 */
function buildAccentPositions(
  characterData: AccentCharacterData,
  radialOffset: number
): AccentPosition[] {
  const positions: AccentPosition[] = [];
  const { reminderCount, firstNight, otherNight } = characterData;

  // Add left side position if character acts on first night
  if (firstNight) {
    positions.push({
      type: 'left',
      angle: -Math.PI / 2, // -90 degrees (left side)
      scale: ACCENT_LAYOUT.SIDE_ACCENTS.SCALE,
      radialOffset,
    });
  }

  // Add right side position if character acts on other nights
  if (otherNight) {
    positions.push({
      type: 'right',
      angle: Math.PI / 2, // 90 degrees (right side)
      scale: ACCENT_LAYOUT.SIDE_ACCENTS.SCALE,
      radialOffset,
    });
  }

  // Add top positions based on reminder count
  // Positions are clustered at the apex with fixed spacing between them
  if (reminderCount > 0) {
    const maxTopAccents = Math.min(reminderCount, ACCENT_LAYOUT.TOP_ACCENTS.MAX_COUNT);
    const spacingRad = (ACCENT_LAYOUT.TOP_ACCENTS.SPACING_DEGREES * Math.PI) / 180;

    // Calculate total span needed for all accents
    // For N accents, we need (N-1) gaps between them
    const totalSpan = (maxTopAccents - 1) * spacingRad;

    // Start angle is half the total span to the left of center (0)
    const startAngle = -totalSpan / 2;

    for (let i = 0; i < maxTopAccents; i++) {
      const angle = startAngle + i * spacingRad;
      positions.push({
        type: 'top',
        angle: angle,
        scale: ACCENT_LAYOUT.TOP_ACCENTS.SCALE,
        radialOffset,
      });
    }
  }

  return positions;
}

/**
 * Load and cache a local image using the global cache
 * @param path - Image path
 * @returns Loaded image element
 */
async function getCachedLocalImage(path: string): Promise<HTMLImageElement> {
  return globalImageCache.getLocal(path);
}

/**
 * Get the accent image path for a given style
 * Uses the first variant (leaf_1.webp) since accents are now deterministic
 * @param accentGeneration - Accent style name
 * @returns Path to the accent image
 */
function getAccentImagePath(accentGeneration: string): string {
  return `${CONFIG.ASSETS.ACCENTS}${ACCENT_LAYOUT.ASSETS.ACCENTS_PATH}${accentGeneration}/${ACCENT_LAYOUT.ASSETS.ACCENT_FILENAME}_1.webp`;
}

/**
 * Draw a single accent at a position
 * @param ctx - Canvas context
 * @param accentImage - Accent image element
 * @param position - Accent position configuration
 * @param diameter - Token diameter
 * @param rotate180 - Whether to rotate the accent image 180 degrees
 * @param flip - Whether to flip the accent image horizontally
 */
function drawSingleAccent(
  ctx: CanvasRenderingContext2D,
  accentImage: HTMLImageElement,
  position: AccentPosition,
  diameter: number,
  rotate180: boolean,
  flip: boolean
): void {
  const radius = diameter / 2;
  const center = { x: radius, y: radius };
  const accentSize = diameter * position.scale;

  // Calculate position on the circle
  // Angle 0 = top center, positive = clockwise
  const posX = center.x + radius * position.radialOffset * Math.sin(position.angle);
  const posY = center.y - radius * position.radialOffset * Math.cos(position.angle);

  ctx.save();

  // Move to the accent position
  ctx.translate(posX, posY);

  // Rotate accent to point outward from center
  // The accent image should point upward (12 o'clock)
  // We rotate it to follow the circle's tangent + point outward
  ctx.rotate(position.angle);

  // Apply additional 180 degree rotation if requested
  if (rotate180) {
    ctx.rotate(Math.PI);
  }

  // Apply horizontal flip if requested
  if (flip) {
    ctx.scale(-1, 1);
  }

  // Draw accent centered at this position
  ctx.drawImage(accentImage, -accentSize / 2, -accentSize / 2, accentSize, accentSize);

  ctx.restore();
}

/**
 * Draw accent decorations on a token based on character data
 *
 * Accents are functional game indicators:
 * - Top accents show the number of reminder tokens
 * - Left accent indicates the character acts on first night
 * - Right accent indicates the character acts on other nights
 *
 * @param ctx - Canvas context
 * @param diameter - Token diameter
 * @param options - Accent drawing options including character data
 */
export async function drawAccents(
  ctx: CanvasRenderingContext2D,
  diameter: number,
  options: AccentDrawingOptions
): Promise<void> {
  const { accentGeneration, characterData, radialOffset, rotate180, flip } = options;

  // Use provided radial offset or default from constants
  const effectiveRadialOffset = radialOffset ?? ACCENT_LAYOUT.DEFAULT_RADIAL_OFFSET;
  const shouldRotate180 = rotate180 ?? false;
  const shouldFlip = flip ?? false;

  // Build positions based on character data
  const positions = buildAccentPositions(characterData, effectiveRadialOffset);

  if (positions.length === 0) {
    logger.debug('AccentDrawing', 'No accents to draw (no reminders or night actions)');
    return;
  }

  // Load the accent image
  const accentPath = getAccentImagePath(accentGeneration);

  try {
    const accentImage = await getCachedLocalImage(accentPath);

    // Draw each accent at its determined position
    for (const position of positions) {
      drawSingleAccent(ctx, accentImage, position, diameter, shouldRotate180, shouldFlip);
    }

    logger.debug('AccentDrawing', 'Drew accents', {
      style: accentGeneration,
      topAccents: positions.filter((p) => p.type === 'top').length,
      leftAccent: positions.some((p) => p.type === 'left'),
      rightAccent: positions.some((p) => p.type === 'right'),
    });
  } catch (error) {
    logger.warn('AccentDrawing', `Could not load accent image: ${accentPath}`, error);
  }
}
