/**
 * Clouds Texture Strategy
 *
 * Soft billowy plasma gradients resembling clouds.
 * Uses multi-octave FBM noise for smooth transitions.
 *
 * @module canvas/backgroundEffects/textures/CloudsTexture
 */

import { CLOUDS_TEXTURE } from '../constants.js';
import { fbm, initPermutation } from '@/ts/canvas/backgroundEffects/noise/index.js';
import { BaseTextureStrategy, type TextureContext, type TextureResult } from './TextureStrategy.js';

/**
 * Generates soft, billowy cloud-like texture
 */
export class CloudsTextureStrategy extends BaseTextureStrategy {
  readonly name = 'clouds';

  generate(context: TextureContext): TextureResult {
    const { ctx, diameter, config } = context;
    const scale = config.scale * 3;
    const seed = config.seed ?? Math.floor(Math.random() * 10000);

    initPermutation(seed);

    const imageData = this.forEachCircularPixel(context, (x, y, _nx, _ny, index, data) => {
      const nx = (x / diameter) * scale;
      const ny = (y / diameter) * scale;

      // Smooth multi-octave noise
      let value = fbm(nx, ny, CLOUDS_TEXTURE.FBM_OCTAVES);
      value = value * 0.5 + 0.5; // Normalize to 0-1

      this.setGrayscalePixel(data, index, value);
    });

    ctx.putImageData(imageData, 0, 0);
    return { success: true };
  }
}
