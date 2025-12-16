/**
 * Blood on the Clocktower Token Generator
 * Canvas Module - Barrel export for all canvas utilities
 */

// Canvas utilities
export {
    createCanvas,
    createCircularClipPath,
    applyTextShadow,
    applyAbilityTextShadow,
    clearShadow,
    wrapText,
    drawImageCover,
    fillCircle,
    strokeCircle,
    drawCenteredText,
    drawMultiLineText,
    measureCharacterWidths,
    type Point,
    type CanvasContext,
    type CanvasOptions,
} from './canvasUtils.js';

// Text drawing utilities
export {
    drawCurvedText,
    drawCenteredWrappedText,
    drawTwoLineCenteredText,
    drawAbilityText,
    drawQROverlayText,
    applyConfigurableShadow,
    type CurvedTextOptions,
    type CenteredTextOptions,
} from './textDrawing.js';

// Leaf drawing utilities
export {
    drawLeaves,
    type LeafDrawingOptions,
} from './leafDrawing.js';

// QR code generation
export {
    generateStyledQRCode,
    QR_DEFAULTS,
    type StyledQRCodeOptions,
} from './qrGeneration.js';

// Canvas optimization utilities
export {
    calculateCircularTextLayout,
    createCircularWidthCalculator,
    calculateCircularWidth,
    precalculateCurvedTextPositions,
    type TextLayoutResult,
    type CharacterPosition,
} from './canvasOptimizations.js';

// Font cache (using hexagonal architecture)
export {
    getCachedFont,
    clearFontCache,
    getFontCacheStats,
    fontCache
} from '../cache/instances/fontCache.js';

// Canvas pooling
export {
    CanvasPool,
    globalCanvasPool,
} from './canvasPool.js';

// Gradient utilities for backgrounds
export {
    createBackgroundGradient,
    createGradientPreview,
    getCSSGradient,
    interpolateColors,
} from './gradientUtils.js';

// Background effects (textures, vignette, glow, etc.)
export {
    renderBackground,
    renderTexturePreview,
} from './backgroundEffects.js';
