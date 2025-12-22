/**
 * Visual Effects Module
 *
 * Effects applied to token backgrounds after base rendering.
 * Includes vignette, inner glow, and post-processing effects.
 *
 * @module canvas/backgroundEffects/effects
 */

import type { EffectsConfig } from '@/ts/types/backgroundEffects.js';
import type { EffectContext, EffectStrategy } from './EffectStrategy.js';
import { InnerGlowEffect } from './InnerGlowEffect.js';
import { VignetteEffect } from './VignetteEffect.js';

// ============================================================================
// EFFECT REGISTRY
// ============================================================================

/**
 * All available visual effects in application order
 */
const effects: EffectStrategy[] = [new VignetteEffect(), new InnerGlowEffect()];

// ============================================================================
// EFFECT APPLICATION
// ============================================================================

/**
 * Apply all enabled visual effects to the canvas
 *
 * Effects are applied in order: vignette, then inner glow.
 * Each effect checks its enabled state before applying.
 *
 * @param ctx - Canvas 2D context
 * @param config - Effects configuration
 * @param center - Token center point
 * @param radius - Token radius
 */
export function applyEffects(
  ctx: CanvasRenderingContext2D,
  config: EffectsConfig,
  center: number,
  radius: number
): void {
  const context: EffectContext = {
    ctx,
    diameter: radius * 2,
    center,
    radius,
    config,
  };

  for (const effect of effects) {
    if (effect.isEnabled(config)) {
      effect.apply(context);
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

// Strategy interface
export type { EffectContext, EffectResult, EffectStrategy } from './EffectStrategy.js';

// Individual effects
export { InnerGlowEffect } from './InnerGlowEffect.js';
// Vibrance (post-processing)
export { applyVibrance, isVibranceEnabled } from './VibranceEffect.js';
export { VignetteEffect } from './VignetteEffect.js';
