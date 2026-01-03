/**
 * Border Effect
 *
 * Applies a colored border ring around the token edge.
 * Supports solid, dashed, and dotted styles.
 * Has two modes: overlay (draws on top) and frame (content shrinks).
 *
 * Note: Frame mode is handled by BackgroundRenderer, not this effect.
 * This effect only handles overlay mode rendering.
 *
 * @module canvas/backgroundEffects/effects/BorderEffect
 */

import type { EffectsConfig } from '@/ts/types/backgroundEffects.js';
import { BORDER_EFFECT } from '../constants.js';
import type { EffectContext, EffectResult, EffectStrategy } from './EffectStrategy.js';

/**
 * Border effect - adds a colored ring around the token edge
 */
export class BorderEffect implements EffectStrategy {
  readonly name = 'border';

  isEnabled(config: EffectsConfig): boolean {
    return config.borderEnabled;
  }

  apply(context: EffectContext): EffectResult {
    const { ctx, center, radius, config } = context;

    if (!this.isEnabled(config)) {
      return { success: true };
    }

    // Frame mode is handled by BackgroundRenderer, skip here
    if (config.borderMode === 'frame') {
      return { success: true };
    }

    // Calculate border width in pixels (percentage of diameter)
    const borderWidth = radius * 2 * (config.borderWidth / 100);

    if (borderWidth <= 0) {
      return { success: true };
    }

    ctx.save();

    // Draw the border as a stroke on a circular path
    // Position at radius - half border width so it stays within bounds
    ctx.beginPath();
    ctx.arc(center, center, radius - borderWidth / 2, 0, Math.PI * 2);

    // Set stroke style - color supports hex with alpha (e.g., #RRGGBBAA)
    ctx.strokeStyle = config.borderColor;
    ctx.lineWidth = borderWidth;

    // Apply line dash pattern for dashed/dotted styles
    if (config.borderStyle === 'dashed') {
      const dashLength = borderWidth * BORDER_EFFECT.DASH_MULTIPLIER;
      const gapLength = borderWidth * BORDER_EFFECT.GAP_MULTIPLIER;
      ctx.setLineDash([dashLength, gapLength]);
    } else if (config.borderStyle === 'dotted') {
      const dotLength = borderWidth * BORDER_EFFECT.DOT_MULTIPLIER;
      const gapLength = borderWidth * BORDER_EFFECT.GAP_MULTIPLIER;
      ctx.setLineDash([dotLength, gapLength]);
      ctx.lineCap = 'round';
    }
    // Solid style: no dash pattern needed (default)

    ctx.stroke();
    ctx.restore();

    return { success: true };
  }
}
