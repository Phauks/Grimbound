/**
 * Perlin Noise Implementation
 *
 * 2D Perlin noise for procedural texture generation.
 * Uses a permutation table seeded for reproducible patterns.
 *
 * @module canvas/backgroundEffects/noise/perlin
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Gradient vectors for 2D Perlin noise
 */
const GRAD3: readonly number[][] = [
  [1, 1, 0],
  [-1, 1, 0],
  [1, -1, 0],
  [-1, -1, 0],
  [1, 0, 1],
  [-1, 0, 1],
  [1, 0, -1],
  [-1, 0, -1],
  [0, 1, 1],
  [0, -1, 1],
  [0, 1, -1],
  [0, -1, -1],
];

// ============================================================================
// PERMUTATION TABLE
// ============================================================================

/**
 * Permutation table for noise generation
 * Initialized via initPermutation() with a seed
 */
let permutation: number[] = [];

/**
 * Initialize the permutation table with a seed for reproducible noise
 *
 * @param seed - Seed value for random number generation
 */
export function initPermutation(seed: number): void {
  const p: number[] = [];
  for (let i = 0; i < 256; i++) {
    p[i] = i;
  }

  // Fisher-Yates shuffle with linear congruential generator
  let random = seed;
  for (let i = 255; i > 0; i--) {
    random = (random * 16807) % 2147483647;
    const j = random % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }

  // Duplicate for overflow handling
  permutation = new Array(512);
  for (let i = 0; i < 512; i++) {
    permutation[i] = p[i & 255];
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Dot product of gradient and distance vectors
 */
function dot(g: number[], x: number, y: number): number {
  return g[0] * x + g[1] * y;
}

/**
 * Smoothstep fade function (6t^5 - 15t^4 + 10t^3)
 * Provides smooth interpolation with zero first and second derivatives at 0 and 1
 */
function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * Linear interpolation between two values
 */
function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

// ============================================================================
// NOISE FUNCTIONS
// ============================================================================

/**
 * 2D Perlin noise implementation
 *
 * Returns a value in the range [-1, 1] for the given coordinates.
 * Call initPermutation() before using this function.
 *
 * @param x - X coordinate
 * @param y - Y coordinate
 * @returns Noise value in range [-1, 1]
 */
export function perlin2D(x: number, y: number): number {
  // Find unit grid cell containing point
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;

  // Get relative position within cell
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);

  // Compute fade curves
  const u = fade(xf);
  const v = fade(yf);

  // Hash coordinates of the 4 corners
  const aa = permutation[permutation[X] + Y];
  const ab = permutation[permutation[X] + Y + 1];
  const ba = permutation[permutation[X + 1] + Y];
  const bb = permutation[permutation[X + 1] + Y + 1];

  // Compute dot products and interpolate
  const x1 = lerp(dot(GRAD3[aa % 12], xf, yf), dot(GRAD3[ba % 12], xf - 1, yf), u);
  const x2 = lerp(dot(GRAD3[ab % 12], xf, yf - 1), dot(GRAD3[bb % 12], xf - 1, yf - 1), u);

  return lerp(x1, x2, v);
}

/**
 * Get the current permutation table (for advanced use cases)
 */
export function getPermutation(): readonly number[] {
  return permutation;
}
