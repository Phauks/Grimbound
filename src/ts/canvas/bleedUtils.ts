/**
 * Blood on the Clocktower Token Generator
 * Bleed Utilities - Print-professional edge bleeding for circular tokens
 *
 * The bleed algorithm extends edge colors outward to create print margins.
 * Key insight: the bleed ring must OVERLAP into the token's anti-aliased
 * edge zone so that semi-transparent edge pixels blend with bleed colors
 * instead of white background.
 */

import type { RGB } from '@/ts/types/index.js';

// ============================================================================
// Types
// ============================================================================

/**
 * A color sample taken from the token edge at a specific angle
 */
export interface EdgeSample {
  /** Angle in radians (0 to 2π) */
  angle: number;
  /** Red channel (0-255) */
  r: number;
  /** Green channel (0-255) */
  g: number;
  /** Blue channel (0-255) */
  b: number;
  /** Alpha channel (0-255) */
  a: number;
}

/**
 * Configuration for bleed ring generation
 */
export interface BleedConfig {
  /** Bleed size in pixels (outward extension) */
  bleedPx: number;
  /** Pixels the bleed extends inward to overlap anti-aliased zone */
  innerOverlap: number;
}

// ============================================================================
// Edge Color Sampling
// ============================================================================

/**
 * Sample colors from the token edge at regular angular intervals.
 *
 * Samples are taken from a "safe zone" inside the token edge to avoid
 * picking up anti-aliased semi-transparent pixels. The safe distance
 * should be at least 3-5 pixels inside the visible edge.
 *
 * @param imageData - Source token image data
 * @param center - Center point of the circular token
 * @param radius - Radius of the token in pixels
 * @param sampleCount - Number of samples to take (e.g., 360 for 1° resolution)
 * @param safeDistance - Pixels inside edge to sample from (avoids AA zone)
 * @returns Array of edge color samples
 */
export function sampleEdgeColors(
  imageData: ImageData,
  center: number,
  radius: number,
  sampleCount: number,
  safeDistance: number
): EdgeSample[] {
  const samples: EdgeSample[] = [];
  const { width, data } = imageData;

  // Scale safe distance for very small tokens
  const scaledSafeDistance = Math.max(2, Math.min(safeDistance, radius * 0.1));
  const sampleRadius = radius - scaledSafeDistance;

  for (let i = 0; i < sampleCount; i++) {
    const angle = (i / sampleCount) * Math.PI * 2;

    // Calculate sample position
    const x = Math.round(center + Math.cos(angle) * sampleRadius);
    const y = Math.round(center + Math.sin(angle) * sampleRadius);

    // Clamp to valid image bounds
    const clampedX = Math.max(0, Math.min(width - 1, x));
    const clampedY = Math.max(0, Math.min(width - 1, y));

    // Get pixel color
    const index = (clampedY * width + clampedX) * 4;

    samples.push({
      angle,
      r: data[index],
      g: data[index + 1],
      b: data[index + 2],
      a: data[index + 3],
    });
  }

  return samples;
}

// ============================================================================
// Color Interpolation
// ============================================================================

/**
 * Interpolate color between edge samples for a given angle.
 *
 * Uses linear interpolation between the two bracketing samples to produce
 * smooth color transitions. This eliminates visible banding that would
 * occur with nearest-neighbor sampling.
 *
 * @param samples - Array of edge color samples
 * @param targetAngle - Angle in radians to interpolate for
 * @param minAlphaThreshold - Minimum alpha to consider sample valid
 * @returns Interpolated RGB color
 */
export function interpolateSampleColor(
  samples: EdgeSample[],
  targetAngle: number,
  minAlphaThreshold: number
): RGB {
  const sampleCount = samples.length;
  if (sampleCount === 0) {
    return { r: 0, g: 0, b: 0 };
  }

  // Normalize angle to 0-2π range
  let normalizedAngle = targetAngle;
  while (normalizedAngle < 0) normalizedAngle += Math.PI * 2;
  while (normalizedAngle >= Math.PI * 2) normalizedAngle -= Math.PI * 2;

  // Find bracketing sample indices
  const angleStep = (Math.PI * 2) / sampleCount;
  const sampleIndex = normalizedAngle / angleStep;

  const lowerIndex = Math.floor(sampleIndex) % sampleCount;
  const upperIndex = (lowerIndex + 1) % sampleCount;
  const t = sampleIndex - Math.floor(sampleIndex); // Interpolation factor [0, 1)

  const lower = samples[lowerIndex];
  const upper = samples[upperIndex];

  // If either sample is transparent, use the more opaque one
  if (lower.a < minAlphaThreshold || upper.a < minAlphaThreshold) {
    return lower.a >= upper.a
      ? { r: lower.r, g: lower.g, b: lower.b }
      : { r: upper.r, g: upper.g, b: upper.b };
  }

  // Linear interpolation between samples
  return {
    r: Math.round(lower.r + (upper.r - lower.r) * t),
    g: Math.round(lower.g + (upper.g - lower.g) * t),
    b: Math.round(lower.b + (upper.b - lower.b) * t),
  };
}

// ============================================================================
// Bleed Ring Generation
// ============================================================================

/**
 * Generate a bleed ring around a circular token.
 *
 * The ring extends both INWARD (to overlap with anti-aliased edge) and
 * OUTWARD (the actual bleed margin). This ensures that when the original
 * token is composited on top, its semi-transparent edge pixels blend
 * with the bleed colors rather than a white background.
 *
 * Algorithm:
 * 1. For each pixel in the ring's bounding box
 * 2. Calculate distance from center
 * 3. If within ring bounds, calculate angle
 * 4. Interpolate color from edge samples
 * 5. Write pixel to canvas
 *
 * @param bleedCtx - Canvas context to draw bleed ring on
 * @param bleedSize - Total canvas size (token + bleed on both sides)
 * @param originalRadius - Original token radius
 * @param config - Bleed configuration
 * @param samples - Edge color samples from the token
 * @param minAlphaThreshold - Minimum alpha for valid samples
 */
export function generateBleedRing(
  bleedCtx: CanvasRenderingContext2D,
  bleedSize: number,
  originalRadius: number,
  config: BleedConfig,
  samples: EdgeSample[],
  minAlphaThreshold: number
): void {
  const { bleedPx, innerOverlap } = config;
  const bleedCenter = bleedSize / 2;

  // Ring bounds
  const innerRadius = originalRadius - innerOverlap; // Overlaps INTO token
  const outerRadius = originalRadius + bleedPx; // Outer bleed edge

  // Get existing ImageData to preserve the white background
  // (createImageData would create transparent black pixels that show through)
  const imageData = bleedCtx.getImageData(0, 0, bleedSize, bleedSize);
  const data = imageData.data;

  // Only iterate over bounding box of the ring (performance optimization)
  const minBound = Math.max(0, Math.floor(bleedCenter - outerRadius - 1));
  const maxBound = Math.min(bleedSize - 1, Math.ceil(bleedCenter + outerRadius + 1));

  for (let y = minBound; y <= maxBound; y++) {
    for (let x = minBound; x <= maxBound; x++) {
      const dx = x - bleedCenter;
      const dy = y - bleedCenter;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Skip pixels outside the bleed ring
      if (dist < innerRadius || dist > outerRadius) continue;

      // Calculate angle for this pixel
      const angle = Math.atan2(dy, dx);

      // Interpolate color from edge samples
      const color = interpolateSampleColor(samples, angle, minAlphaThreshold);

      // Write pixel (fully opaque)
      const index = (y * bleedSize + x) * 4;
      data[index] = color.r;
      data[index + 1] = color.g;
      data[index + 2] = color.b;
      data[index + 3] = 255;
    }
  }

  bleedCtx.putImageData(imageData, 0, 0);
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Check if edge samples have sufficient valid (opaque) pixels.
 *
 * If too many edge samples are transparent, the token may have an
 * irregular shape or transparent background, and bleed generation
 * should fall back to simple copying.
 *
 * @param samples - Edge color samples
 * @param minRatio - Minimum ratio of valid samples required (e.g., 0.5 = 50%)
 * @param minAlphaThreshold - Minimum alpha to consider valid
 * @returns True if samples are valid for bleed generation
 */
export function hasValidSamples(
  samples: EdgeSample[],
  minRatio: number,
  minAlphaThreshold: number
): boolean {
  if (samples.length === 0) return false;

  const validCount = samples.filter((s) => s.a >= minAlphaThreshold).length;
  return validCount / samples.length >= minRatio;
}
