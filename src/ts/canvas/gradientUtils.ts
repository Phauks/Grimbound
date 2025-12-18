/**
 * Blood on the Clocktower Token Generator
 * Gradient Utilities - Canvas gradient creation for backgrounds
 */

import type { GradientConfig } from '@/ts/types/backgroundEffects.js';
// Re-export interpolateColors from colorUtils for backwards compatibility
export { interpolateColors } from '@/ts/utils/colorUtils.js';

// ============================================================================
// GRADIENT CREATION
// ============================================================================

/**
 * Create a canvas gradient from configuration
 *
 * @param ctx - Canvas 2D rendering context
 * @param config - Gradient configuration
 * @param diameter - Token diameter in pixels
 * @returns Canvas gradient to use as fillStyle
 */
export function createBackgroundGradient(
  ctx: CanvasRenderingContext2D,
  config: GradientConfig,
  diameter: number
): CanvasGradient {
  const center = diameter / 2;
  const radius = diameter / 2;

  switch (config.type) {
    case 'linear':
      return createLinearGradient(ctx, config, diameter);
    case 'radial':
      return createRadialGradient(ctx, config, center, radius);
    case 'conic':
      return createConicGradient(ctx, config, center);
    default:
      return createLinearGradient(ctx, config, diameter);
  }
}

/**
 * Create a linear gradient
 *
 * @param ctx - Canvas context
 * @param config - Gradient configuration with rotation
 * @param diameter - Token diameter
 */
function createLinearGradient(
  ctx: CanvasRenderingContext2D,
  config: GradientConfig,
  diameter: number
): CanvasGradient {
  // Convert rotation angle to radians
  const angleRad = (config.rotation * Math.PI) / 180;
  const center = diameter / 2;

  // Calculate gradient line length (corner to corner for full coverage)
  // Using sqrt(2)/2 * diameter ensures gradient covers the entire circle
  const length = diameter * Math.SQRT1_2;

  // Calculate start and end points based on rotation
  const x1 = center - Math.cos(angleRad) * length;
  const y1 = center - Math.sin(angleRad) * length;
  const x2 = center + Math.cos(angleRad) * length;
  const y2 = center + Math.sin(angleRad) * length;

  const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
  gradient.addColorStop(0, config.colorStart);
  gradient.addColorStop(1, config.colorEnd);

  return gradient;
}

/**
 * Create a radial gradient
 *
 * @param ctx - Canvas context
 * @param config - Gradient configuration with optional center position
 * @param center - Center coordinate (same for x and y in circular token)
 * @param radius - Token radius
 */
function createRadialGradient(
  ctx: CanvasRenderingContext2D,
  config: GradientConfig,
  center: number,
  radius: number
): CanvasGradient {
  // Allow custom center position (0-1 range), default to center
  const cx = center * 2 * (config.centerX ?? 0.5);
  const cy = center * 2 * (config.centerY ?? 0.5);

  // Inner radius is 0 (center point), outer radius is the token radius
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  gradient.addColorStop(0, config.colorStart);
  gradient.addColorStop(1, config.colorEnd);

  return gradient;
}

/**
 * Create a conic (angular) gradient
 *
 * @param ctx - Canvas context
 * @param config - Gradient configuration with rotation
 * @param center - Center coordinate
 */
function createConicGradient(
  ctx: CanvasRenderingContext2D,
  config: GradientConfig,
  center: number
): CanvasGradient {
  // Convert rotation to radians (conic gradient starts from the right, so adjust)
  const startAngle = ((config.rotation - 90) * Math.PI) / 180;

  const gradient = ctx.createConicGradient(startAngle, center, center);

  // For a smooth conic gradient, we cycle through the colors
  gradient.addColorStop(0, config.colorStart);
  gradient.addColorStop(0.5, config.colorEnd);
  gradient.addColorStop(1, config.colorStart);

  return gradient;
}

// ============================================================================
// GRADIENT PREVIEW UTILITIES
// ============================================================================

/**
 * Create a small gradient preview for UI display
 *
 * @param config - Gradient configuration
 * @param size - Preview size in pixels (default 48)
 * @returns Data URL of the gradient preview
 */
export function createGradientPreview(config: GradientConfig, size: number = 48): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return '';
  }

  // Create circular clip
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();

  // Fill with gradient
  ctx.fillStyle = createBackgroundGradient(ctx, config, size);
  ctx.fill();

  return canvas.toDataURL();
}

/**
 * Get CSS gradient string for UI preview (non-canvas)
 * Note: This is an approximation for UI display, not exact match
 *
 * @param config - Gradient configuration
 * @returns CSS gradient string
 */
export function getCSSGradient(config: GradientConfig): string {
  switch (config.type) {
    case 'linear':
      return `linear-gradient(${config.rotation}deg, ${config.colorStart}, ${config.colorEnd})`;
    case 'radial':
      return `radial-gradient(circle at ${(config.centerX ?? 0.5) * 100}% ${(config.centerY ?? 0.5) * 100}%, ${config.colorStart}, ${config.colorEnd})`;
    case 'conic':
      return `conic-gradient(from ${config.rotation}deg, ${config.colorStart}, ${config.colorEnd}, ${config.colorStart})`;
    default:
      return `linear-gradient(${config.rotation}deg, ${config.colorStart}, ${config.colorEnd})`;
  }
}

