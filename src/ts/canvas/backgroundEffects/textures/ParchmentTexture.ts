/**
 * Parchment Texture Strategy
 *
 * Aged paper texture with grain and subtle variations.
 * Uses multiple noise layers for realistic paper appearance.
 *
 * @module canvas/backgroundEffects/textures/ParchmentTexture
 */

import { PARCHMENT_TEXTURE } from '../constants.js';
import { fbm, initPermutation, perlin2D } from '@/ts/canvas/backgroundEffects/noise/index.js';
import { BaseTextureStrategy, type TextureContext, type TextureResult } from './TextureStrategy.js';

/**
 * Generates aged parchment/paper texture
 */
export class ParchmentTextureStrategy extends BaseTextureStrategy {
  readonly name = 'parchment';

  generate(context: TextureContext): TextureResult {
    const { ctx, diameter, center, config } = context;
    const scale = config.scale * 4;
    const seed = config.seed ?? Math.floor(Math.random() * 10000);

    initPermutation(seed);

    const imageData = this.forEachCircularPixel(context, (x, y, _nx, _ny, index, data) => {
      const nx = (x / diameter) * scale;
      const ny = (y / diameter) * scale;

      // Base paper grain - multiple layers of noise
      const grain1 = fbm(nx * 2, ny * 2, 4) * PARCHMENT_TEXTURE.FINE_GRAIN_AMPLITUDE;
      const grain2 = perlin2D(nx * 8, ny * 8) * PARCHMENT_TEXTURE.MEDIUM_GRAIN_AMPLITUDE;
      const grain3 = fbm(nx * 0.5, ny * 0.5, 3) * PARCHMENT_TEXTURE.MACRO_GRAIN_AMPLITUDE;

      // Combine layers
      let value = PARCHMENT_TEXTURE.BASE_BRIGHTNESS + grain1 + grain2 + grain3;

      // Add edge darkening for aged look
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy) / center;
      value *= 1 - dist * PARCHMENT_TEXTURE.VIGNETTE_STRENGTH;

      // Clamp
      value = Math.max(0, Math.min(1, value));

      this.setGrayscalePixel(data, index, value);
    });

    ctx.putImageData(imageData, 0, 0);
    return { success: true };
  }
}
