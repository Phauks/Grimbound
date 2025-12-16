/**
 * Blood on the Clocktower Token Generator
 * Leaf Drawing Utilities - Decorative leaf rendering for tokens
 */

import CONFIG from '../config.js';
import { LEAF_LAYOUT } from '../constants.js';
import { globalImageCache, shuffleArray } from '../utils/index.js';

/**
 * Leaf position configuration
 */
interface LeafPosition {
  type: 'left' | 'right' | 'arc';
  angle: number; // in radians, 0 = top, positive = clockwise
  scale: number;
  radialOffset: number;
}

/**
 * Options for leaf drawing
 */
export interface LeafDrawingOptions {
  maximumLeaves: number;
  leafPopulationProbability: number;
  leafGeneration: string;
  leafArcSpan: number;
  leafSlots: number;
  // Side leaf options
  enableLeftLeaf?: boolean;
  enableRightLeaf?: boolean;
  sideLeafProbability?: number;
}

/**
 * Build array of all possible leaf positions
 * @param leafArcSpan - Arc span in degrees
 * @param leafSlots - Number of positions along the arc
 * @param enableLeftLeaf - Whether to include left side leaf position
 * @param enableRightLeaf - Whether to include right side leaf position
 * @returns Array of leaf positions
 */
function buildLeafPositions(
  leafArcSpan: number,
  leafSlots: number,
  enableLeftLeaf: boolean = true,
  enableRightLeaf: boolean = true
): LeafPosition[] {
  const positions: LeafPosition[] = [];

  // Add left side position (at 270 degrees / -90 degrees from top)
  if (enableLeftLeaf) {
    positions.push({
      type: 'left',
      angle: -Math.PI / 2, // -90 degrees (left side)
      scale: LEAF_LAYOUT.SIDE_LEAVES.SCALE,
      radialOffset: LEAF_LAYOUT.SIDE_LEAVES.RADIAL_OFFSET,
    });
  }

  // Add right side position (at 90 degrees from top)
  if (enableRightLeaf) {
    positions.push({
      type: 'right',
      angle: Math.PI / 2, // 90 degrees (right side)
      scale: LEAF_LAYOUT.SIDE_LEAVES.SCALE,
      radialOffset: LEAF_LAYOUT.SIDE_LEAVES.RADIAL_OFFSET,
    });
  }

  // Add arc positions along the top
  // Arc is centered at top (0 degrees), spanning leafArcSpan degrees
  const arcSpanRad = (leafArcSpan * Math.PI) / 180;
  const startAngle = -arcSpanRad / 2; // Start from left side of arc
  const angleStep = leafSlots > 1 ? arcSpanRad / (leafSlots - 1) : 0;

  for (let i = 0; i < leafSlots; i++) {
    const angle = startAngle + i * angleStep;
    positions.push({
      type: 'arc',
      angle: angle,
      scale: LEAF_LAYOUT.ARC_LEAVES.SCALE,
      radialOffset: LEAF_LAYOUT.ARC_LEAVES.RADIAL_OFFSET,
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
 * Detect available leaf variants for a given style
 * @param leafGeneration - Leaf style name
 * @returns Number of available variants
 */
async function detectLeafVariants(leafGeneration: string): Promise<number> {
  const basePath = `${CONFIG.ASSETS.LEAVES}${LEAF_LAYOUT.ASSETS.LEAVES_PATH}${leafGeneration}/`;
  let availableVariants = 0;

  for (let i = 1; i <= 20; i++) {
    // Check up to 20 variants
    try {
      await getCachedLocalImage(`${basePath}${LEAF_LAYOUT.ASSETS.LEAF_FILENAME}_${i}.webp`);
      availableVariants = i;
    } catch {
      break; // Stop when we can't load the next variant
    }
  }

  return availableVariants;
}

/**
 * Draw a single leaf at a position
 * @param ctx - Canvas context
 * @param leafImage - Leaf image element
 * @param position - Leaf position configuration
 * @param diameter - Token diameter
 */
function drawSingleLeaf(
  ctx: CanvasRenderingContext2D,
  leafImage: HTMLImageElement,
  position: LeafPosition,
  diameter: number
): void {
  const radius = diameter / 2;
  const center = { x: radius, y: radius };
  const leafSize = diameter * position.scale;

  // Calculate position on the circle
  // Angle 0 = top center, positive = clockwise
  const posX = center.x + radius * position.radialOffset * Math.sin(position.angle);
  const posY = center.y - radius * position.radialOffset * Math.cos(position.angle);

  ctx.save();

  // Move to the leaf position
  ctx.translate(posX, posY);

  // Rotate leaf to point outward from center
  // The leaf image should point upward (12 o'clock)
  // We rotate it to follow the circle's tangent + point outward
  ctx.rotate(position.angle);

  // Draw leaf centered at this position
  ctx.drawImage(leafImage, -leafSize / 2, -leafSize / 2, leafSize, leafSize);

  ctx.restore();
}

/**
 * Draw leaf decorations on a token
 * Dynamically positions leaves along an arc at the top and on left/right sides
 * Uses the global image cache for loading leaf assets
 * @param ctx - Canvas context
 * @param diameter - Token diameter
 * @param options - Leaf drawing options
 */
export async function drawLeaves(
  ctx: CanvasRenderingContext2D,
  diameter: number,
  options: LeafDrawingOptions
): Promise<void> {
  const {
    maximumLeaves,
    leafPopulationProbability,
    leafGeneration,
    leafArcSpan,
    leafSlots,
    enableLeftLeaf = true,
    enableRightLeaf = true,
    sideLeafProbability = leafPopulationProbability, // Default to arc probability
  } = options;

  // Detect available leaf variants
  const availableVariants = await detectLeafVariants(leafGeneration);

  if (availableVariants === 0) {
    console.warn(`No leaf variants found for style: ${leafGeneration}`);
    return;
  }

  // Build and shuffle positions (respecting side leaf settings)
  const positions = buildLeafPositions(leafArcSpan, leafSlots, enableLeftLeaf, enableRightLeaf);
  const shuffledPositions = shuffleArray(positions);

  let leavesDrawn = 0;

  for (const position of shuffledPositions) {
    // Stop if we've drawn the maximum number of leaves
    if (leavesDrawn >= maximumLeaves) {
      break;
    }

    // Use different probability for side leaves vs arc leaves
    const probability =
      position.type === 'left' || position.type === 'right'
        ? sideLeafProbability
        : leafPopulationProbability;

    // Roll probability check
    const roll = Math.random() * 100;
    if (roll >= probability) {
      continue; // Skip this leaf position
    }

    // Pick a random leaf variant from available ones
    const variantIndex = Math.floor(Math.random() * availableVariants) + 1;

    // Load and draw the leaf
    try {
      const leafPath = `${CONFIG.ASSETS.LEAVES}${LEAF_LAYOUT.ASSETS.LEAVES_PATH}${leafGeneration}/${LEAF_LAYOUT.ASSETS.LEAF_FILENAME}_${variantIndex}.webp`;
      const leafImage = await getCachedLocalImage(leafPath);

      drawSingleLeaf(ctx, leafImage, position, diameter);
      leavesDrawn++;
    } catch (error) {
      console.warn(`Could not load leaf variant ${variantIndex}`, error);
    }
  }
}

export default {
  drawLeaves,
};
