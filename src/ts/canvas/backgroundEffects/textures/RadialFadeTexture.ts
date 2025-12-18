/**
 * Radial Fade Texture Strategy
 *
 * Center-to-edge fade effect creating a spotlight-like appearance.
 * Uses distance-based gradient with configurable falloff.
 *
 * @module canvas/backgroundEffects/textures/RadialFadeTexture
 */

import { BaseTextureStrategy, type TextureContext, type TextureResult } from './TextureStrategy.js';

/**
 * Generates radial fade texture from center to edge
 */
export class RadialFadeTextureStrategy extends BaseTextureStrategy {
  readonly name = 'radial-fade';

  generate(context: TextureContext): TextureResult {
    const { ctx, diameter, center, config } = context;
    const scale = config.scale;

    const imageData = ctx.createImageData(diameter, diameter);
    const data = imageData.data;

    for (let y = 0; y < diameter; y++) {
      for (let x = 0; x < diameter; x++) {
        const dx = x - center;
        const dy = y - center;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > center) continue;

        // Radial gradient with scale affecting the curve
        const normalizedDist = dist / center;
        const value = 1 - normalizedDist ** (1 / scale);

        const index = this.getPixelIndex(x, y, diameter);
        this.setGrayscalePixel(data, index, value);
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return { success: true };
  }
}
