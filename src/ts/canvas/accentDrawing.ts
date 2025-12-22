/**
 * Blood on the Clocktower Token Generator
 * Accent Drawing Utilities - Decorative accent rendering for tokens
 */

import CONFIG from '@/ts/config.js';
import { ACCENT_LAYOUT } from '@/ts/constants.js';
import { globalImageCache, logger, shuffleArray } from '@/ts/utils/index.js';

/**
 * Accent position configuration
 */
interface AccentPosition {
  type: 'left' | 'right' | 'arc';
  angle: number; // in radians, 0 = top, positive = clockwise
  scale: number;
  radialOffset: number;
}

/**
 * Options for accent drawing
 */
export interface AccentDrawingOptions {
  maximumAccents: number;
  accentPopulationProbability: number;
  accentGeneration: string;
  accentArcSpan: number;
  accentSlots: number;
  // Side accent options
  enableLeftAccent?: boolean;
  enableRightAccent?: boolean;
  sideAccentProbability?: number;
}

/**
 * Build array of all possible accent positions
 * @param accentArcSpan - Arc span in degrees
 * @param accentSlots - Number of positions along the arc
 * @param enableLeftAccent - Whether to include left side accent position
 * @param enableRightAccent - Whether to include right side accent position
 * @returns Array of accent positions
 */
function buildAccentPositions(
  accentArcSpan: number,
  accentSlots: number,
  enableLeftAccent: boolean = true,
  enableRightAccent: boolean = true
): AccentPosition[] {
  const positions: AccentPosition[] = [];

  // Add left side position (at 270 degrees / -90 degrees from top)
  if (enableLeftAccent) {
    positions.push({
      type: 'left',
      angle: -Math.PI / 2, // -90 degrees (left side)
      scale: ACCENT_LAYOUT.SIDE_ACCENTS.SCALE,
      radialOffset: ACCENT_LAYOUT.SIDE_ACCENTS.RADIAL_OFFSET,
    });
  }

  // Add right side position (at 90 degrees from top)
  if (enableRightAccent) {
    positions.push({
      type: 'right',
      angle: Math.PI / 2, // 90 degrees (right side)
      scale: ACCENT_LAYOUT.SIDE_ACCENTS.SCALE,
      radialOffset: ACCENT_LAYOUT.SIDE_ACCENTS.RADIAL_OFFSET,
    });
  }

  // Add arc positions along the top
  // Arc is centered at top (0 degrees), spanning accentArcSpan degrees
  const arcSpanRad = (accentArcSpan * Math.PI) / 180;
  const startAngle = -arcSpanRad / 2; // Start from left side of arc
  const angleStep = accentSlots > 1 ? arcSpanRad / (accentSlots - 1) : 0;

  for (let i = 0; i < accentSlots; i++) {
    const angle = startAngle + i * angleStep;
    positions.push({
      type: 'arc',
      angle: angle,
      scale: ACCENT_LAYOUT.ARC_ACCENTS.SCALE,
      radialOffset: ACCENT_LAYOUT.ARC_ACCENTS.RADIAL_OFFSET,
    });
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
 * Detect available accent variants for a given style
 * @param accentGeneration - Accent style name
 * @returns Number of available variants
 */
async function detectAccentVariants(accentGeneration: string): Promise<number> {
  const basePath = `${CONFIG.ASSETS.ACCENTS}${ACCENT_LAYOUT.ASSETS.ACCENTS_PATH}${accentGeneration}/`;
  let availableVariants = 0;

  for (let i = 1; i <= 20; i++) {
    // Check up to 20 variants
    try {
      await getCachedLocalImage(`${basePath}${ACCENT_LAYOUT.ASSETS.ACCENT_FILENAME}_${i}.webp`);
      availableVariants = i;
    } catch {
      break; // Stop when we can't load the next variant
    }
  }

  return availableVariants;
}

/**
 * Draw a single accent at a position
 * @param ctx - Canvas context
 * @param accentImage - Accent image element
 * @param position - Accent position configuration
 * @param diameter - Token diameter
 */
function drawSingleAccent(
  ctx: CanvasRenderingContext2D,
  accentImage: HTMLImageElement,
  position: AccentPosition,
  diameter: number
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

  // Draw accent centered at this position
  ctx.drawImage(accentImage, -accentSize / 2, -accentSize / 2, accentSize, accentSize);

  ctx.restore();
}

/**
 * Draw accent decorations on a token
 * Dynamically positions accents along an arc at the top and on left/right sides
 * Uses the global image cache for loading accent assets
 * @param ctx - Canvas context
 * @param diameter - Token diameter
 * @param options - Accent drawing options
 */
export async function drawAccents(
  ctx: CanvasRenderingContext2D,
  diameter: number,
  options: AccentDrawingOptions
): Promise<void> {
  const {
    maximumAccents,
    accentPopulationProbability,
    accentGeneration,
    accentArcSpan,
    accentSlots,
    enableLeftAccent = true,
    enableRightAccent = true,
    sideAccentProbability = accentPopulationProbability, // Default to arc probability
  } = options;

  // Detect available accent variants
  const availableVariants = await detectAccentVariants(accentGeneration);

  if (availableVariants === 0) {
    logger.warn('AccentDrawing', `No accent variants found for style: ${accentGeneration}`);
    return;
  }

  // Build and shuffle positions (respecting side accent settings)
  const positions = buildAccentPositions(
    accentArcSpan,
    accentSlots,
    enableLeftAccent,
    enableRightAccent
  );
  const shuffledPositions = shuffleArray(positions);

  let accentsDrawn = 0;

  for (const position of shuffledPositions) {
    // Stop if we've drawn the maximum number of accents
    if (accentsDrawn >= maximumAccents) {
      break;
    }

    // Use different probability for side accents vs arc accents
    const probability =
      position.type === 'left' || position.type === 'right'
        ? sideAccentProbability
        : accentPopulationProbability;

    // Roll probability check
    const roll = Math.random() * 100;
    if (roll >= probability) {
      continue; // Skip this accent position
    }

    // Pick a random accent variant from available ones
    const variantIndex = Math.floor(Math.random() * availableVariants) + 1;

    // Load and draw the accent
    try {
      const accentPath = `${CONFIG.ASSETS.ACCENTS}${ACCENT_LAYOUT.ASSETS.ACCENTS_PATH}${accentGeneration}/${ACCENT_LAYOUT.ASSETS.ACCENT_FILENAME}_${variantIndex}.webp`;
      const accentImage = await getCachedLocalImage(accentPath);

      drawSingleAccent(ctx, accentImage, position, diameter);
      accentsDrawn++;
    } catch (error) {
      logger.warn('AccentDrawing', `Could not load accent variant ${variantIndex}`, error);
    }
  }
}

export default {
  drawAccents,
};
