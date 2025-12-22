/**
 * Watercolor Texture Strategy
 *
 * Bleeding color edges like wet watercolor paint.
 * Uses multiple layered noise with soft edge fading.
 *
 * @module canvas/backgroundEffects/textures/WatercolorTexture
 */

import { fbm, initPermutation } from '@/ts/canvas/backgroundEffects/noise/index.js';
import { WATERCOLOR_TEXTURE } from '../constants.js';
import { BaseTextureStrategy, type TextureContext, type TextureResult } from './TextureStrategy.js';

/**
 * Generates watercolor-like texture with bleeding edges
 */
export class WatercolorTextureStrategy extends BaseTextureStrategy {
  readonly name = 'watercolor';

  generate(context: TextureContext): TextureResult {
    const { ctx, diameter, center, config } = context;
    const scale = config.scale * 2;
    const seed = config.seed ?? Math.floor(Math.random() * 10000);

    initPermutation(seed);

    const imageData = this.forEachCircularPixel(context, (x, y, _nx, _ny, index, data) => {
      const nx = (x / diameter) * scale;
      const ny = (y / diameter) * scale;

      // Multiple layers of soft noise with different frequencies
      const layer1 = fbm(nx, ny, 4) * WATERCOLOR_TEXTURE.LAYER1_AMPLITUDE + 0.5;
      const layer2 = fbm(nx * 2 + 100, ny * 2 + 100, 3) * WATERCOLOR_TEXTURE.LAYER2_AMPLITUDE + 0.5;
      const layer3 =
        fbm(nx * 0.5 + 50, ny * 0.5 + 50, 5) * WATERCOLOR_TEXTURE.LAYER3_AMPLITUDE + 0.5;

      // Combine layers with soft blending
      let value =
        layer1 * WATERCOLOR_TEXTURE.LAYER_WEIGHTS[0] +
        layer2 * WATERCOLOR_TEXTURE.LAYER_WEIGHTS[1] +
        layer3 * WATERCOLOR_TEXTURE.LAYER_WEIGHTS[2];

      // Edge fade for watercolor effect
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy) / center;
      const edgeFade = 1 - dist ** WATERCOLOR_TEXTURE.EDGE_FADE_EXPONENT;
      value *= edgeFade;

      // Slight color tinting based on value
      const gray = Math.floor(
        WATERCOLOR_TEXTURE.GRAYSCALE_CENTER + (value - 0.5) * WATERCOLOR_TEXTURE.GRAYSCALE_AMPLITUDE
      );
      const clampedGray = Math.min(255, Math.max(0, gray));

      data[index] = clampedGray;
      data[index + 1] = clampedGray;
      data[index + 2] = clampedGray;
      data[index + 3] = 255;
    });

    ctx.putImageData(imageData, 0, 0);
    return { success: true };
  }
}
