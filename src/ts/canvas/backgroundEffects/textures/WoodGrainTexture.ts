/**
 * Wood Grain Texture Strategy
 *
 * Directional wood patterns with grain lines and rings.
 * Uses turbulence with sine waves for realistic wood appearance.
 *
 * @module canvas/backgroundEffects/textures/WoodGrainTexture
 */

import { initPermutation, turbulence } from '@/ts/canvas/backgroundEffects/noise/index.js';
import { WOOD_GRAIN_TEXTURE } from '../constants.js';
import { BaseTextureStrategy, type TextureContext, type TextureResult } from './TextureStrategy.js';

/**
 * Generates directional wood grain texture
 */
export class WoodGrainTextureStrategy extends BaseTextureStrategy {
  readonly name = 'wood-grain';

  generate(context: TextureContext): TextureResult {
    const { ctx, diameter, config } = context;
    const scale = config.scale * 3;
    const seed = config.seed ?? Math.floor(Math.random() * 10000);

    initPermutation(seed);

    const imageData = this.forEachCircularPixel(context, (x, y, _nx, _ny, index, data) => {
      const nx = (x / diameter) * scale;
      const ny = (y / diameter) * scale;

      // Create wood grain - stretched turbulence + sine waves
      const turb = turbulence(nx * WOOD_GRAIN_TEXTURE.TURBULENCE_COMPRESSION_X, ny, 4);
      const grain = Math.sin(
        (ny * WOOD_GRAIN_TEXTURE.GRAIN_FREQUENCY + turb * WOOD_GRAIN_TEXTURE.TURBULENCE_INFLUENCE) *
          Math.PI
      );

      // Add ring pattern
      const rings =
        Math.sin(
          nx * WOOD_GRAIN_TEXTURE.RING_FREQUENCY + turb * WOOD_GRAIN_TEXTURE.RING_TURBULENCE
        ) * WOOD_GRAIN_TEXTURE.RING_AMPLITUDE;

      let value =
        (grain * 0.5 + 0.5) * WOOD_GRAIN_TEXTURE.GRAIN_WEIGHT +
        rings * WOOD_GRAIN_TEXTURE.RING_WEIGHT +
        WOOD_GRAIN_TEXTURE.BASE_OFFSET;
      value = Math.max(0, Math.min(1, value));

      this.setGrayscalePixel(data, index, value);
    });

    ctx.putImageData(imageData, 0, 0);
    return { success: true };
  }
}
