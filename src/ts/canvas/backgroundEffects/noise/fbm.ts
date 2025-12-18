/**
 * Fractal Brownian Motion (FBM) and Turbulence
 *
 * Multi-octave noise functions built on Perlin noise for
 * creating natural-looking procedural patterns.
 *
 * @module canvas/backgroundEffects/noise/fbm
 */

import { perlin2D } from './perlin.js';

// ============================================================================
// FRACTAL NOISE FUNCTIONS
// ============================================================================

/**
 * Fractal Brownian Motion - multi-octave noise for smooth, cloud-like patterns
 *
 * Combines multiple octaves of Perlin noise at different frequencies and amplitudes
 * to create rich, detailed patterns. Higher octaves add finer detail.
 *
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param octaves - Number of noise layers to combine (typically 4-8)
 * @returns Normalized noise value in range [-1, 1]
 *
 * @example
 * ```typescript
 * initPermutation(12345);
 * const value = fbm(x * scale, y * scale, 6);
 * const normalized = value * 0.5 + 0.5; // Convert to [0, 1]
 * ```
 */
export function fbm(x: number, y: number, octaves: number): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * perlin2D(x * frequency, y * frequency);
    maxValue += amplitude;
    amplitude *= 0.5; // Persistence
    frequency *= 2; // Lacunarity
  }

  return value / maxValue;
}

/**
 * Turbulence noise - absolute value of noise for marble-like effects
 *
 * Similar to FBM but takes the absolute value of each octave,
 * creating sharp creases that resemble marble veins or fire.
 *
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param octaves - Number of noise layers to combine
 * @returns Noise value in range [0, 1]
 *
 * @example
 * ```typescript
 * initPermutation(12345);
 * const turb = turbulence(x * scale, y * scale, 5);
 * // Use with sine for marble: Math.sin(x * 8 + turb * 6)
 * ```
 */
export function turbulence(x: number, y: number, octaves: number): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * Math.abs(perlin2D(x * frequency, y * frequency));
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / maxValue;
}

/**
 * Ridged noise - inverted turbulence for ridge-like patterns
 *
 * Creates sharp ridges useful for mountain terrain or crack patterns.
 *
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param octaves - Number of noise layers
 * @returns Noise value in range [0, 1]
 */
export function ridgedNoise(x: number, y: number, octaves: number): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    const n = 1 - Math.abs(perlin2D(x * frequency, y * frequency));
    value += amplitude * n * n; // Square for sharper ridges
    maxValue += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / maxValue;
}
