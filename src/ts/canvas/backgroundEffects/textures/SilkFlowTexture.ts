/**
 * Silk Flow Texture Strategy
 *
 * Flowing silk-like directional texture.
 * Uses noise-based flow fields for organic movement.
 *
 * @module canvas/backgroundEffects/textures/SilkFlowTexture
 */

import { SILK_FLOW_TEXTURE } from '../constants.js';
import { fbm, initPermutation, perlin2D } from '@/ts/canvas/backgroundEffects/noise/index.js';
import { BaseTextureStrategy, type TextureContext, type TextureResult } from './TextureStrategy.js';

/**
 * Generates flowing silk-like directional texture
 */
export class SilkFlowTextureStrategy extends BaseTextureStrategy {
  readonly name = 'silk-flow';

  generate(context: TextureContext): TextureResult {
    const { ctx, diameter, config } = context;
    const scale = config.scale * 3;
    const seed = config.seed ?? Math.floor(Math.random() * 10000);

    initPermutation(seed);

    const imageData = this.forEachCircularPixel(context, (x, y, _nx, _ny, index, data) => {
      const nx = (x / diameter) * scale;
      const ny = (y / diameter) * scale;

      // Flow field using noise for direction
      const angle = perlin2D(nx * SILK_FLOW_TEXTURE.ANGLE_NOISE_SCALE, ny * SILK_FLOW_TEXTURE.ANGLE_NOISE_SCALE) * Math.PI * 2;

      // Sample along the flow direction
      const flowX = nx + Math.cos(angle) * SILK_FLOW_TEXTURE.FLOW_DISPLACEMENT;
      const flowY = ny + Math.sin(angle) * SILK_FLOW_TEXTURE.FLOW_DISPLACEMENT;

      // Combine flow with base noise
      const flow = fbm(flowX, flowY, 4);
      const base = perlin2D(nx * 2, ny * 2) * SILK_FLOW_TEXTURE.BASE_AMPLITUDE;

      const value = (flow + base) * 0.5 + 0.5;

      this.setGrayscalePixel(data, index, value);
    });

    ctx.putImageData(imageData, 0, 0);
    return { success: true };
  }
}
