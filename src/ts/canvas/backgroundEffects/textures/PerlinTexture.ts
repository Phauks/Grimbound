/**
 * Perlin Texture Strategy
 *
 * Smooth mathematical noise with subtle organic undulation.
 * Direct Perlin noise visualization.
 *
 * @module canvas/backgroundEffects/textures/PerlinTexture
 */

import { initPermutation, perlin2D } from '@/ts/canvas/backgroundEffects/noise/index.js';
import { BaseTextureStrategy, type TextureContext, type TextureResult } from './TextureStrategy.js';

/**
 * Generates simple Perlin noise texture
 */
export class PerlinTextureStrategy extends BaseTextureStrategy {
  readonly name = 'perlin';

  generate(context: TextureContext): TextureResult {
    const { ctx, diameter, config } = context;
    const scale = config.scale * 5;
    const seed = config.seed ?? Math.floor(Math.random() * 10000);

    initPermutation(seed);

    const imageData = this.forEachCircularPixel(context, (x, y, _nx, _ny, index, data) => {
      const nx = (x / diameter) * scale;
      const ny = (y / diameter) * scale;

      // Simple Perlin noise
      let value = perlin2D(nx, ny);
      value = value * 0.5 + 0.5; // Normalize to 0-1

      this.setGrayscalePixel(data, index, value);
    });

    ctx.putImageData(imageData, 0, 0);
    return { success: true };
  }
}
