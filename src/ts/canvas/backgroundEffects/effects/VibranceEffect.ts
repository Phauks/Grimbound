/**
 * Vibrance Effect
 *
 * Smart saturation adjustment that affects muted colors more
 * than already-saturated colors, preventing over-saturation.
 *
 * @module canvas/backgroundEffects/effects/VibranceEffect
 */

import type { LightConfig } from '@/ts/types/backgroundEffects.js';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Context for vibrance effect (different from other effects)
 */
export interface VibranceContext {
  /** Canvas 2D rendering context */
  ctx: CanvasRenderingContext2D;
  /** Token diameter in pixels */
  diameter: number;
  /** Vibrance value (0-200, 100 = no change) */
  vibrance: number;
}

// ============================================================================
// VIBRANCE EFFECT
// ============================================================================

/**
 * Check if vibrance adjustment is needed
 *
 * @param light - Light configuration
 * @returns True if vibrance is not at default (100)
 */
export function isVibranceEnabled(light: LightConfig): boolean {
  return light.vibrance !== 100;
}

/**
 * Apply vibrance adjustment - smart saturation
 *
 * Increases saturation of less-saturated colors more than
 * already-saturated ones, preventing over-saturation of vivid colors.
 *
 * @param ctx - Canvas context
 * @param diameter - Token diameter
 * @param vibranceValue - Vibrance value (0-200, 100 = no change)
 */
export function applyVibrance(
  ctx: CanvasRenderingContext2D,
  diameter: number,
  vibranceValue: number
): void {
  const imageData = ctx.getImageData(0, 0, diameter, diameter);
  const data = imageData.data;

  // Convert 0-200 range to -1 to +1 range (100 = 0, no change)
  const amount = (vibranceValue - 100) / 100;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue; // Skip transparent pixels

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Find the max component to determine saturation level
    const max = Math.max(r, g, b);
    const avg = (r + g + b) / 3;

    // Calculate how saturated this pixel already is (0 = gray, 1 = fully saturated)
    const currentSaturation = max > 0 ? 1 - avg / max : 0;

    // Apply more adjustment to less-saturated pixels
    const adjustmentFactor = amount * (1 - currentSaturation);

    // Apply the adjustment
    data[i] = Math.max(0, Math.min(255, r + (r - avg) * adjustmentFactor));
    data[i + 1] = Math.max(0, Math.min(255, g + (g - avg) * adjustmentFactor));
    data[i + 2] = Math.max(0, Math.min(255, b + (b - avg) * adjustmentFactor));
  }

  ctx.putImageData(imageData, 0, 0);
}
