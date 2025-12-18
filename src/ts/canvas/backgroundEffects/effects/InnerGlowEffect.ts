/**
 * Inner Glow Effect
 *
 * Applies a colored glow around the inner edge of the token.
 * Creates a rim lighting effect.
 *
 * @module canvas/backgroundEffects/effects/InnerGlowEffect
 */

import type { EffectsConfig } from '@/ts/types/backgroundEffects.js';
import { parseHexColor } from '@/ts/utils/colorUtils.js';
import { INNER_GLOW_EFFECT } from '../constants.js';
import type { EffectContext, EffectResult, EffectStrategy } from './EffectStrategy.js';

/**
 * Inner glow effect - adds colored glow at token edge
 */
export class InnerGlowEffect implements EffectStrategy {
  readonly name = 'inner-glow';

  isEnabled(config: EffectsConfig): boolean {
    return config.innerGlowEnabled;
  }

  apply(context: EffectContext): EffectResult {
    const { ctx, center, radius, config } = context;

    if (!this.isEnabled(config)) {
      return { success: true };
    }

    const glowRadius = radius * (config.innerGlowRadius / INNER_GLOW_EFFECT.RADIUS_SCALE_DIVISOR);
    const intensity = config.innerGlowIntensity / 100;
    const color = config.innerGlowColor;

    // Parse glow color
    const rgb = parseHexColor(color);

    // Create radial gradient for inner glow
    const gradient = ctx.createRadialGradient(
      center,
      center,
      radius - glowRadius, // Inner edge of glow
      center,
      center,
      radius // Outer edge (token boundary)
    );

    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${intensity})`);

    ctx.fillStyle = gradient;
    ctx.fill();

    return { success: true };
  }
}
