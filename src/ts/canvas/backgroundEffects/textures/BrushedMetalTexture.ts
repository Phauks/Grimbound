/**
 * Brushed Metal Texture Strategy
 *
 * Linear brushed metal streaks with subtle reflections.
 * Uses horizontal sine waves with noise variation.
 *
 * @module canvas/backgroundEffects/textures/BrushedMetalTexture
 */

import { BRUSHED_METAL_TEXTURE } from '../constants.js';
import { initPermutation, perlin2D } from '@/ts/canvas/backgroundEffects/noise/index.js';
import { BaseTextureStrategy, type TextureContext, type TextureResult } from './TextureStrategy.js';

/**
 * Generates brushed metal texture with linear streaks
 */
export class BrushedMetalTextureStrategy extends BaseTextureStrategy {
  readonly name = 'brushed-metal';

  generate(context: TextureContext): TextureResult {
    const { ctx, diameter, config } = context;
    const scale = config.scale * 30;
    const seed = config.seed ?? Math.floor(Math.random() * 10000);

    initPermutation(seed);

    const imageData = this.forEachCircularPixel(context, (x, y, _nx, _ny, index, data) => {
      // Horizontal brushed lines
      const streak = Math.sin(((y * scale) / diameter) * Math.PI * 2) * 0.5 + 0.5;

      // Add variation along x for realistic streaks
      const nx = (x / diameter) * 20;
      const variation = perlin2D(nx + seed * BRUSHED_METAL_TEXTURE.SEED_INFLUENCE, y * BRUSHED_METAL_TEXTURE.Y_COMPRESSION) * BRUSHED_METAL_TEXTURE.VARIATION_AMPLITUDE;

      // Subtle reflective gradient
      const reflect = Math.abs(Math.sin((y / diameter) * Math.PI)) * BRUSHED_METAL_TEXTURE.REFLECT_INTENSITY;

      let value = streak * BRUSHED_METAL_TEXTURE.STREAK_MULTIPLIER + variation + BRUSHED_METAL_TEXTURE.BASE_BRIGHTNESS + reflect;
      value = Math.max(0, Math.min(1, value));

      this.setGrayscalePixel(data, index, value);
    });

    ctx.putImageData(imageData, 0, 0);
    return { success: true };
  }
}
