/**
 * Blood on the Clocktower Token Generator
 * Canvas Module - Barrel export for all canvas utilities
 */

// Font cache (using hexagonal architecture)
export {
  clearFontCache,
  fontCache,
  getCachedFont,
  getFontCacheStats,
} from '@/ts/cache/instances/fontCache.js';
// Accent drawing utilities
export {
  type AccentDrawingOptions,
  drawAccents,
} from './accentDrawing.js';
// Background effects module (textures, effects, noise)
export {
  // Effects
  applyEffects,
  applyVibrance,
  // Textures
  BaseTextureStrategy,
  type EffectContext,
  type EffectResult,
  type EffectStrategy,
  // Frame mode (border scaling)
  type FrameModeInfo,
  // Noise utilities
  fbm,
  getFrameModeInfo,
  InnerGlowEffect,
  initPermutation,
  isFrameModeActive,
  isVibranceEnabled,
  perlin2D,
  // Main renderer
  renderBackground,
  renderTexturePreview,
  ridgedNoise,
  type TextureContext,
  TextureFactory,
  type TextureResult,
  type TextureStrategy,
  turbulence,
  VignetteEffect,
} from './backgroundEffects/index.js';
// Bleed utilities for print-professional token bleeding
export {
  type BleedConfig,
  type EdgeSample,
  generateBleedRing,
  hasValidSamples,
  interpolateSampleColor,
  sampleEdgeColors,
} from './bleedUtils.js';
// Canvas optimization utilities
export {
  type CharacterPosition,
  calculateCircularTextLayout,
  calculateCircularWidth,
  calculateFittedCircularTextLayout,
  createCircularWidthCalculator,
  type FitTextOptions,
  type FitTextResult,
  precalculateCurvedTextPositions,
  type TextLayoutResult,
} from './canvasOptimizations.js';
// Canvas pooling
export {
  CanvasPool,
  globalCanvasPool,
} from './canvasPool.js';
// Canvas utilities
export {
  applyAbilityTextShadow,
  applyTextShadow,
  type CanvasContext,
  clearShadow,
  createCanvas,
  createCircularClipPath,
  drawCenteredText,
  drawImageCover,
  drawMultiLineText,
  fillCircle,
  measureCharacterWidths,
  type Point,
  strokeCircle,
  wrapText,
} from './canvasUtils.js';
// Gradient utilities for backgrounds
export {
  createBackgroundGradient,
  createGradientPreview,
  getCSSGradient,
} from './gradientUtils.js';
// QR code generation
export {
  generateStyledQRCode,
  QR_DEFAULTS,
  type StyledQRCodeOptions,
} from './qrGeneration.js';
// Text drawing utilities
export {
  applyConfigurableShadow,
  type CenteredTextOptions,
  type CurvedTextOptions,
  drawAbilityText,
  drawCenteredWrappedText,
  drawCurvedText,
  drawQROverlayText,
  drawTwoLineCenteredText,
} from './textDrawing.js';
