/**
 * Noise Utilities Module
 *
 * Procedural noise functions for texture generation.
 * Provides Perlin noise, FBM, and turbulence algorithms.
 *
 * @module canvas/backgroundEffects/noise
 */

export { fbm, ridgedNoise, turbulence } from './fbm.js';
export { getPermutation, initPermutation, perlin2D } from './perlin.js';
