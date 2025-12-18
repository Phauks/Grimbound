/**
 * Background Effects Constants
 *
 * Magic numbers extracted from texture and effect implementations
 * for maintainability and documentation.
 *
 * @module canvas/backgroundEffects/constants
 */

// ============================================================================
// EFFECT CONSTANTS - Visual effects applied to backgrounds
// ============================================================================

/**
 * Vignette effect parameters
 * Creates edge darkening with radial gradient
 */
export const VIGNETTE_EFFECT = {
  /** Inner radius ratio - center area remains clear (0.3 = 30% of radius) */
  INNER_RADIUS_RATIO: 0.3,
  /** Gradient midpoint - where fade begins (0.6 = 60% from center) */
  GRADIENT_MIDPOINT: 0.6,
} as const;

/**
 * Inner glow effect parameters
 * Creates colored glow at token edge
 */
export const INNER_GLOW_EFFECT = {
  /** Divisor for converting UI slider (0-100) to radius ratio */
  RADIUS_SCALE_DIVISOR: 50,
} as const;

// ============================================================================
// TEXTURE CONSTANTS - Procedural texture generation parameters
// ============================================================================

/**
 * Common normalization value used across textures
 * Standard pattern: `value * 0.5 + 0.5` normalizes -1..1 to 0..1
 */
export const NOISE_NORMALIZATION = {
  /** Multiplier for noise normalization */
  MULTIPLIER: 0.5,
  /** Offset for noise normalization */
  OFFSET: 0.5,
} as const;

/**
 * Marble texture parameters
 * Organic flowing patterns with veins
 */
export const MARBLE_TEXTURE = {
  /** Base frequency for sine wave distortion */
  VEIN_FREQUENCY: 8,
  /** Turbulence influence on vein distortion */
  TURBULENCE_INFLUENCE: 6,
  /** Number of turbulence octaves */
  TURBULENCE_OCTAVES: 5,
} as const;

/**
 * Clouds texture parameters
 * Soft billowy plasma gradients
 */
export const CLOUDS_TEXTURE = {
  /** Number of FBM octaves for smooth noise */
  FBM_OCTAVES: 6,
} as const;

/**
 * Watercolor texture parameters
 * Bleeding color edges with layered noise
 */
export const WATERCOLOR_TEXTURE = {
  /** Layer 1 amplitude (primary layer) */
  LAYER1_AMPLITUDE: 0.5,
  /** Layer 2 amplitude (detail layer) */
  LAYER2_AMPLITUDE: 0.3,
  /** Layer 3 amplitude (variation layer) */
  LAYER3_AMPLITUDE: 0.4,
  /** Layer blending weights [primary, detail, variation] */
  LAYER_WEIGHTS: [0.5, 0.3, 0.2] as const,
  /** Edge fade curve exponent (cubic falloff) */
  EDGE_FADE_EXPONENT: 3,
  /** Grayscale center value (128 = neutral gray) */
  GRAYSCALE_CENTER: 128,
  /** Grayscale tint amplitude */
  GRAYSCALE_AMPLITUDE: 100,
} as const;

/**
 * Parchment texture parameters
 * Aged paper with grain and variations
 */
export const PARCHMENT_TEXTURE = {
  /** Fine grain amplitude (high frequency detail) */
  FINE_GRAIN_AMPLITUDE: 0.4,
  /** Medium grain amplitude (perlin detail) */
  MEDIUM_GRAIN_AMPLITUDE: 0.15,
  /** Macro grain amplitude (large scale variation) */
  MACRO_GRAIN_AMPLITUDE: 0.25,
  /** Base brightness offset */
  BASE_BRIGHTNESS: 0.5,
  /** Vignette fade strength for aged look */
  VIGNETTE_STRENGTH: 0.15,
} as const;

/**
 * Linen texture parameters
 * Woven fabric crosshatch pattern
 */
export const LINEN_TEXTURE = {
  /** Horizontal thread weight in blend */
  HORIZONTAL_WEIGHT: 0.5,
  /** Vertical thread weight in blend */
  VERTICAL_WEIGHT: 0.5,
  /** Pattern intensity multiplier */
  PATTERN_MULTIPLIER: 0.6,
  /** Base brightness offset */
  BASE_BRIGHTNESS: 0.3,
  /** Seed influence on noise variation */
  SEED_INFLUENCE: 0.001,
  /** Noise variation amplitude */
  VARIATION_AMPLITUDE: 0.15,
} as const;

/**
 * Wood grain texture parameters
 * Directional grain lines with rings
 */
export const WOOD_GRAIN_TEXTURE = {
  /** X-axis turbulence compression */
  TURBULENCE_COMPRESSION_X: 0.3,
  /** Grain line frequency */
  GRAIN_FREQUENCY: 15,
  /** Turbulence influence on grain lines */
  TURBULENCE_INFLUENCE: 8,
  /** Ring pattern frequency */
  RING_FREQUENCY: 5,
  /** Ring turbulence influence */
  RING_TURBULENCE: 3,
  /** Ring pattern amplitude */
  RING_AMPLITUDE: 0.3,
  /** Grain contribution weight */
  GRAIN_WEIGHT: 0.7,
  /** Ring contribution weight */
  RING_WEIGHT: 0.3,
  /** Base value offset */
  BASE_OFFSET: 0.3,
} as const;

/**
 * Brushed metal texture parameters
 * Linear streaks with reflections
 */
export const BRUSHED_METAL_TEXTURE = {
  /** Variation amplitude from noise */
  VARIATION_AMPLITUDE: 0.25,
  /** Reflective gradient intensity */
  REFLECT_INTENSITY: 0.15,
  /** Streak pattern multiplier */
  STREAK_MULTIPLIER: 0.4,
  /** Base brightness value */
  BASE_BRIGHTNESS: 0.4,
  /** Seed influence for variation */
  SEED_INFLUENCE: 0.001,
  /** Y-axis compression for streaks */
  Y_COMPRESSION: 0.01,
} as const;

/**
 * Silk flow texture parameters
 * Flowing directional fabric texture
 */
export const SILK_FLOW_TEXTURE = {
  /** Angle noise scale */
  ANGLE_NOISE_SCALE: 0.5,
  /** Flow displacement distance */
  FLOW_DISPLACEMENT: 0.3,
  /** Base pattern amplitude */
  BASE_AMPLITUDE: 0.3,
} as const;

/**
 * Organic cells texture parameters
 * Voronoi-style cell patterns
 */
export const ORGANIC_CELLS_TEXTURE = {
  /** Base cell count multiplier */
  CELL_COUNT_BASE: 15,
  /** Edge detection divisor */
  EDGE_DIVISOR: 0.1,
  /** Maximum cell placement radius ratio */
  CELL_RADIUS_RATIO: 0.9,
  /** Random number generator constants (Lehmer RNG) */
  RNG_MULTIPLIER: 16807,
  RNG_MODULUS: 2147483647,
} as const;

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  // Effects
  VIGNETTE_EFFECT,
  INNER_GLOW_EFFECT,
  // Textures
  NOISE_NORMALIZATION,
  MARBLE_TEXTURE,
  CLOUDS_TEXTURE,
  WATERCOLOR_TEXTURE,
  PARCHMENT_TEXTURE,
  LINEN_TEXTURE,
  WOOD_GRAIN_TEXTURE,
  BRUSHED_METAL_TEXTURE,
  SILK_FLOW_TEXTURE,
  ORGANIC_CELLS_TEXTURE,
};
