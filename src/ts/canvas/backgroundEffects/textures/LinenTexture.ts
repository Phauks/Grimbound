/**
 * Linen Texture Strategy
 *
 * Woven fabric crosshatch pattern resembling linen cloth.
 * Uses sine waves with noise variation for organic weave.
 *
 * @module canvas/backgroundEffects/textures/LinenTexture
 */

import { initPermutation, perlin2D } from '@/ts/canvas/backgroundEffects/noise/index.js';
import { LINEN_TEXTURE } from '../constants.js';
import { BaseTextureStrategy, type TextureContext, type TextureResult } from './TextureStrategy.js';

/**
 * Generates woven linen/fabric texture
 */
export class LinenTextureStrategy extends BaseTextureStrategy {
  readonly name = 'linen';

  generate(context: TextureContext): TextureResult {
    const { ctx, diameter, config } = context;
    const scale = config.scale * 20;
    const seed = config.seed ?? Math.floor(Math.random() * 10000);

    initPermutation(seed);

    const imageData = this.forEachCircularPixel(context, (x, y, _nx, _ny, index, data) => {
      // Create crosshatch pattern
      const horizontal = Math.sin(((y * scale) / diameter) * Math.PI) * 0.5 + 0.5;
      const vertical = Math.sin(((x * scale) / diameter) * Math.PI) * 0.5 + 0.5;

      // Combine with slight variation from noise
      const nx = (x / diameter) * 5;
      const ny = (y / diameter) * 5;
      const variation =
        perlin2D(
          nx + seed * LINEN_TEXTURE.SEED_INFLUENCE,
          ny + seed * LINEN_TEXTURE.SEED_INFLUENCE
        ) * LINEN_TEXTURE.VARIATION_AMPLITUDE;

      const value =
        (horizontal * LINEN_TEXTURE.HORIZONTAL_WEIGHT + vertical * LINEN_TEXTURE.VERTICAL_WEIGHT) *
          LINEN_TEXTURE.PATTERN_MULTIPLIER +
        LINEN_TEXTURE.BASE_BRIGHTNESS +
        variation;

      this.setGrayscalePixel(data, index, value);
    });

    ctx.putImageData(imageData, 0, 0);
    return { success: true };
  }
}
