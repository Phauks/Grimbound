/**
 * Background Effects Module
 *
 * Comprehensive background rendering system for token generation.
 * Provides procedural textures, visual effects, and compositing.
 *
 * ## Architecture
 *
 * The module follows a modular architecture with clear separation of concerns:
 *
 * - **BackgroundRenderer**: Main orchestrator coordinating the render pipeline
 * - **textures/**: Strategy pattern for procedural texture generation
 * - **effects/**: Visual effects (vignette, glow) applied post-rendering
 * - **noise/**: Mathematical noise utilities (Perlin, FBM, turbulence)
 *
 * ## Usage
 *
 * ```typescript
 * import { renderBackground } from '@/ts/canvas/backgroundEffects';
 *
 * // Render with full configuration
 * await renderBackground(ctx, backgroundStyle, diameter);
 *
 * // For texture preview only
 * renderTexturePreview(ctx, textureConfig, diameter);
 * ```
 *
 * ## Extending with Custom Textures
 *
 * ```typescript
 * import { TextureFactory, BaseTextureStrategy } from '@/ts/canvas/backgroundEffects';
 *
 * class CustomTextureStrategy extends BaseTextureStrategy {
 *   readonly name = 'custom';
 *   generate(context: TextureContext): TextureResult {
 *     // Custom generation logic
 *     return { success: true };
 *   }
 * }
 *
 * TextureFactory.register('custom', new CustomTextureStrategy());
 * ```
 *
 * @module canvas/backgroundEffects
 */

// ============================================================================
// MAIN RENDERER
// ============================================================================

export { renderBackground, renderTexturePreview } from './BackgroundRenderer.js';

// ============================================================================
// EFFECTS
// ============================================================================

export {
  applyEffects,
  applyVibrance,
  type EffectContext,
  type EffectResult,
  type EffectStrategy,
  InnerGlowEffect,
  isVibranceEnabled,
  VignetteEffect,
} from './effects/index.js';

// ============================================================================
// TEXTURES
// ============================================================================

export {
  BaseTextureStrategy,
  BrushedMetalTextureStrategy,
  CloudsTextureStrategy,
  LinenTextureStrategy,
  MarbleTextureStrategy,
  OrganicCellsTextureStrategy,
  ParchmentTextureStrategy,
  PerlinTextureStrategy,
  RadialFadeTextureStrategy,
  SilkFlowTextureStrategy,
  type TextureContext,
  TextureFactory,
  type TextureResult,
  type TextureStrategy,
  WatercolorTextureStrategy,
  WoodGrainTextureStrategy,
} from './textures/index.js';

// ============================================================================
// NOISE UTILITIES
// ============================================================================

export {
  fbm,
  getPermutation,
  initPermutation,
  perlin2D,
  ridgedNoise,
  turbulence,
} from './noise/index.js';
