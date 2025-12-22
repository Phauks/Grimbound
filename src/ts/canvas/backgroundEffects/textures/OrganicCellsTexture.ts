/**
 * Organic Cells Texture Strategy
 *
 * Voronoi-style cell patterns resembling biological cells or stone tiles.
 * Uses F2-F1 distance for edge detection.
 *
 * @module canvas/backgroundEffects/textures/OrganicCellsTexture
 */

import { ORGANIC_CELLS_TEXTURE } from '../constants.js';
import { BaseTextureStrategy, type TextureContext, type TextureResult } from './TextureStrategy.js';

/**
 * Generates Voronoi cell-like organic pattern
 */
export class OrganicCellsTextureStrategy extends BaseTextureStrategy {
  readonly name = 'organic-cells';

  generate(context: TextureContext): TextureResult {
    const { ctx, diameter, center, config } = context;
    const scale = config.scale;
    const seed = config.seed ?? Math.floor(Math.random() * 10000);

    // Generate random cell centers
    const cellCount = Math.floor(ORGANIC_CELLS_TEXTURE.CELL_COUNT_BASE * scale);
    const cells = this.generateCellCenters(cellCount, center, seed);

    const imageData = ctx.createImageData(diameter, diameter);
    const data = imageData.data;

    for (let y = 0; y < diameter; y++) {
      for (let x = 0; x < diameter; x++) {
        const dx = x - center;
        const dy = y - center;
        if (dx * dx + dy * dy > center * center) continue;

        // Find two closest cells
        const [minDist1, minDist2] = this.findTwoClosestCells(x, y, cells);

        // F2 - F1 gives cell edges
        const value = (minDist2 - minDist1) / (diameter * ORGANIC_CELLS_TEXTURE.EDGE_DIVISOR);
        const clamped = Math.min(1, Math.max(0, value));

        const index = this.getPixelIndex(x, y, diameter);
        this.setGrayscalePixel(data, index, clamped);
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return { success: true };
  }

  /**
   * Generate random cell center points
   */
  private generateCellCenters(
    count: number,
    center: number,
    seed: number
  ): Array<{ x: number; y: number }> {
    const cells: Array<{ x: number; y: number }> = [];
    let random = seed;

    for (let i = 0; i < count; i++) {
      random = (random * ORGANIC_CELLS_TEXTURE.RNG_MULTIPLIER) % ORGANIC_CELLS_TEXTURE.RNG_MODULUS;
      const angle = (random / ORGANIC_CELLS_TEXTURE.RNG_MODULUS) * Math.PI * 2;
      random = (random * ORGANIC_CELLS_TEXTURE.RNG_MULTIPLIER) % ORGANIC_CELLS_TEXTURE.RNG_MODULUS;
      const dist =
        (random / ORGANIC_CELLS_TEXTURE.RNG_MODULUS) *
        center *
        ORGANIC_CELLS_TEXTURE.CELL_RADIUS_RATIO;

      cells.push({
        x: center + Math.cos(angle) * dist,
        y: center + Math.sin(angle) * dist,
      });
    }

    return cells;
  }

  /**
   * Find distances to two closest cell centers
   */
  private findTwoClosestCells(
    x: number,
    y: number,
    cells: Array<{ x: number; y: number }>
  ): [number, number] {
    let minDist1 = Infinity;
    let minDist2 = Infinity;

    for (const cell of cells) {
      const dist = Math.sqrt((x - cell.x) ** 2 + (y - cell.y) ** 2);
      if (dist < minDist1) {
        minDist2 = minDist1;
        minDist1 = dist;
      } else if (dist < minDist2) {
        minDist2 = dist;
      }
    }

    return [minDist1, minDist2];
  }
}
