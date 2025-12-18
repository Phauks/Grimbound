/**
 * Vignette Effect
 *
 * Applies edge darkening to create a spotlight/vignette effect.
 * Uses radial gradient for smooth falloff.
 *
 * @module canvas/backgroundEffects/effects/VignetteEffect
 */

import type { EffectsConfig } from '@/ts/types/backgroundEffects.js';
import { parseHexColor } from '@/ts/utils/colorUtils.js';
import { VIGNETTE_EFFECT } from '../constants.js';
import type { EffectContext, EffectResult, EffectStrategy } from './EffectStrategy.js';

/**
 * Vignette effect - darkens edges of the token
 */
export class VignetteEffect implements EffectStrategy {
  readonly name = 'vignette';

  isEnabled(config: EffectsConfig): boolean {
    return config.vignetteEnabled;
  }

  apply(context: EffectContext): EffectResult {
    const { ctx, center, radius, config } = context;

    if (!this.isEnabled(config)) {
      return { success: true };
    }

    const intensity = config.vignetteIntensity / 100;
    const color = config.vignetteColor || '#000000';

    // Parse vignette color
    const rgb = parseHexColor(color);

    // Create radial gradient for vignette
    const gradient = ctx.createRadialGradient(
      center,
      center,
      radius * VIGNETTE_EFFECT.INNER_RADIUS_RATIO, // Inner radius - clear center
      center,
      center,
      radius // Outer radius - edge
    );

    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(VIGNETTE_EFFECT.GRADIENT_MIDPOINT, 'transparent');
    gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${intensity})`);

    ctx.fillStyle = gradient;
    ctx.fill();

    return { success: true };
  }
}
