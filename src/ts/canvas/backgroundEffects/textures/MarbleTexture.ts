/**
 * Marble Texture Strategy
 *
 * Organic flowing patterns like marble stone with veins.
 * Uses turbulence noise with sine wave distortion.
 *
 * @module canvas/backgroundEffects/textures/MarbleTexture
 */

import { initPermutation, turbulence } from '@/ts/canvas/backgroundEffects/noise/index.js';
import { MARBLE_TEXTURE } from '../constants.js';
import { BaseTextureStrategy, type TextureContext, type TextureResult } from './TextureStrategy.js';

/**
 * Generates marble/swirl texture with organic flowing patterns
 */
export class MarbleTextureStrategy extends BaseTextureStrategy {
  readonly name = 'marble';

  generate(context: TextureContext): TextureResult {
    const { ctx, diameter, config } = context;
    const scale = config.scale * 4;
    const seed = config.seed ?? Math.floor(Math.random() * 10000);

    initPermutation(seed);

    const imageData = this.forEachCircularPixel(context, (x, y, _nx, _ny, index, data) => {
      const nx = (x / diameter) * scale;
      const ny = (y / diameter) * scale;

      // Turbulent noise for marble veins
      const turb = turbulence(nx, ny, MARBLE_TEXTURE.TURBULENCE_OCTAVES);

      // Sine wave distortion for flowing veins
      let value = Math.sin(
        nx * MARBLE_TEXTURE.VEIN_FREQUENCY + turb * MARBLE_TEXTURE.TURBULENCE_INFLUENCE
      );
      value = (value + 1) * 0.5; // Normalize to 0-1

      this.setGrayscalePixel(data, index, value);
    });

    ctx.putImageData(imageData, 0, 0);
    return { success: true };
  }
}
