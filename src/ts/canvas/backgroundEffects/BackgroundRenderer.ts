/**
 * Background Renderer
 *
 * Main orchestrator for rendering token backgrounds with textures and effects.
 * Coordinates the rendering pipeline: base → texture → effects → post-processing.
 *
 * @module canvas/backgroundEffects/BackgroundRenderer
 */

import { createBackgroundGradient } from '@/ts/canvas/gradientUtils.js';
import { getAnyBuiltInAssetPath, isAnyBuiltInAsset } from '@/ts/constants/builtInAssets.js';
import { ResourceNotFoundError, TokenCreationError } from '@/ts/errors.js';
import { isAssetReference, resolveAssetUrl } from '@/ts/services/upload/assetResolver.js';
import type {
  BackgroundStyle,
  EffectsConfig,
  TextureConfig,
} from '@/ts/types/backgroundEffects.js';
import { DEFAULT_LIGHT_CONFIG } from '@/ts/types/backgroundEffects.js';
import { logger } from '@/ts/utils/logger.js';
import { BORDER_EFFECT } from './constants.js';
import { applyEffects, applyVibrance } from './effects/index.js';
import { type TextureContext, TextureFactory } from './textures/index.js';

// ============================================================================
// IMAGE LOADING
// ============================================================================

/**
 * Load a background image from URL
 *
 * Handles multiple URL formats:
 * - asset:uuid references (resolved via asset storage)
 * - Built-in asset IDs (like 'character_background_1')
 * - Direct URLs (http, data, blob)
 *
 * @param url - Image URL or asset reference
 * @returns Loaded HTMLImageElement
 */
async function loadBackgroundImage(url: string): Promise<HTMLImageElement> {
  let resolvedUrl: string;

  // Check if it's an asset reference (asset:uuid format)
  if (isAssetReference(url)) {
    resolvedUrl = await resolveAssetUrl(url);
  }
  // Check if it's ANY built-in asset ID (type-agnostic: works for token-background, script-background, etc.)
  else if (isAnyBuiltInAsset(url)) {
    resolvedUrl = getAnyBuiltInAssetPath(url) || '';
  }
  // Otherwise use the URL directly (http, data, blob URLs)
  else {
    resolvedUrl = url;
  }

  if (!resolvedUrl) {
    throw new ResourceNotFoundError(`Failed to resolve image URL: ${url}`, 'image', url);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(
        new ResourceNotFoundError(`Failed to load image: ${resolvedUrl}`, 'image', resolvedUrl)
      );

    img.src = resolvedUrl;
  });
}

// ============================================================================
// TEXTURE APPLICATION
// ============================================================================

/**
 * Apply texture overlay using strategy pattern
 *
 * @param ctx - Canvas context
 * @param config - Texture configuration
 * @param diameter - Token diameter
 * @param baseColor - Base/solid color for tinting
 */
function applyTexture(
  ctx: CanvasRenderingContext2D,
  config: TextureConfig,
  diameter: number,
  baseColor: string
): void {
  const strategy = TextureFactory.create(config.type);
  if (!strategy) {
    return; // 'none' type or unsupported
  }

  const intensity = config.intensity / 100;
  const center = diameter / 2;

  // Determine seed: use random if randomizeSeedPerToken is enabled
  const effectiveSeed = config.randomizeSeedPerToken
    ? Math.floor(Math.random() * 100000)
    : (config.seed ?? 12345);

  // Create offscreen canvas for texture
  const textureCanvas = document.createElement('canvas');
  textureCanvas.width = diameter;
  textureCanvas.height = diameter;
  const textureCtx = textureCanvas.getContext('2d');
  if (!textureCtx) {
    throw new TokenCreationError('Failed to get 2d context for texture canvas', 'Texture');
  }

  // Build texture context
  const textureContext: TextureContext = {
    ctx: textureCtx,
    diameter,
    center,
    config: { ...config, seed: effectiveSeed },
    baseColor,
  };

  // Generate texture using strategy
  strategy.generate(textureContext);

  // Apply contrast adjustment if set
  if (config.contrast && config.contrast !== 0) {
    applyContrastAdjustment(textureCtx, diameter, config.contrast);
  }

  // Map blend mode to canvas composite operation
  const compositeOp = getCompositeOperation(config.blendMode ?? 'overlay');

  // Composite texture onto main canvas with intensity
  ctx.globalAlpha = intensity;
  ctx.globalCompositeOperation = compositeOp;
  ctx.drawImage(textureCanvas, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

/**
 * Apply texture for preview purposes (synchronous)
 */
export function renderTexturePreview(
  ctx: CanvasRenderingContext2D,
  texture: TextureConfig,
  diameter: number,
  baseColor: string = '#FFFFFF'
): void {
  if (texture.type === 'none') return;
  applyTexture(ctx, texture, diameter, baseColor);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Draw a light gray checkerboard pattern to indicate empty/paper areas
 * Used as background for image mode to show areas not covered by the image
 *
 * @param ctx - Canvas context
 * @param diameter - Token diameter
 */
function drawCheckerboardBackground(ctx: CanvasRenderingContext2D, diameter: number): void {
  const checkerSize = Math.max(6, Math.floor(diameter / 20));
  const colors = ['#E0E0E0', '#F5F5F5'];

  for (let y = 0; y < diameter; y += checkerSize) {
    for (let x = 0; x < diameter; x += checkerSize) {
      const colorIndex = (Math.floor(x / checkerSize) + Math.floor(y / checkerSize)) % 2;
      ctx.fillStyle = colors[colorIndex];
      ctx.fillRect(x, y, checkerSize, checkerSize);
    }
  }
}

/**
 * Map texture blend mode to canvas composite operation
 */
function getCompositeOperation(blendMode: string): GlobalCompositeOperation {
  switch (blendMode) {
    case 'normal':
      return 'source-over';
    case 'overlay':
      return 'overlay';
    case 'multiply':
      return 'multiply';
    case 'screen':
      return 'screen';
    case 'soft-light':
      return 'soft-light';
    case 'hard-light':
      return 'hard-light';
    default:
      return 'overlay';
  }
}

/**
 * Apply contrast adjustment to texture
 */
function applyContrastAdjustment(
  ctx: CanvasRenderingContext2D,
  diameter: number,
  contrast: number
): void {
  const imageData = ctx.getImageData(0, 0, diameter, diameter);
  const data = imageData.data;

  // Contrast factor: -50 to +50 maps to 0.5 to 1.5
  const factor = (100 + contrast) / 100;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue; // Skip transparent

    // Apply contrast around midpoint (128)
    data[i] = Math.min(255, Math.max(0, Math.round((data[i] - 128) * factor + 128)));
    data[i + 1] = Math.min(255, Math.max(0, Math.round((data[i + 1] - 128) * factor + 128)));
    data[i + 2] = Math.min(255, Math.max(0, Math.round((data[i + 2] - 128) * factor + 128)));
  }

  ctx.putImageData(imageData, 0, 0);
}

// ============================================================================
// RENDER HELPERS (extracted to reduce cognitive complexity)
// ============================================================================

/** Light configuration for filter building */
interface LightConfig {
  brightness: number;
  contrast: number;
  saturation: number;
  vibrance: number;
}

/** Calculated image dimensions and position */
interface ImageLayout {
  drawWidth: number;
  drawHeight: number;
  offsetX: number;
  offsetY: number;
}

/**
 * Build CSS filter string from light configuration.
 */
function buildFilterString(light: LightConfig): string {
  const filters: string[] = [];
  if (light.brightness !== 100) {
    filters.push(`brightness(${light.brightness / 100})`);
  }
  if (light.contrast !== 100) {
    filters.push(`contrast(${light.contrast / 100})`);
  }
  if (light.saturation !== 100) {
    filters.push(`saturate(${light.saturation / 100})`);
  }
  return filters.join(' ');
}

/**
 * Calculate initial image dimensions to cover the circular area.
 */
function calculateCoverDimensions(
  imgWidth: number,
  imgHeight: number,
  diameter: number
): ImageLayout {
  const aspectRatio = imgWidth / imgHeight;
  let drawWidth = diameter;
  let drawHeight = diameter;
  let offsetX = 0;
  let offsetY = 0;

  if (aspectRatio > 1) {
    drawWidth = diameter * aspectRatio;
    offsetX = (diameter - drawWidth) / 2;
  } else {
    drawHeight = diameter / aspectRatio;
    offsetY = (diameter - drawHeight) / 2;
  }

  return { drawWidth, drawHeight, offsetX, offsetY };
}

/**
 * Apply zoom transformation to image layout.
 */
function applyZoomTransform(layout: ImageLayout, zoom: number): ImageLayout {
  if (zoom === 1) return layout;

  const prevWidth = layout.drawWidth;
  const prevHeight = layout.drawHeight;
  const drawWidth = layout.drawWidth * zoom;
  const drawHeight = layout.drawHeight * zoom;

  return {
    drawWidth,
    drawHeight,
    offsetX: layout.offsetX - (drawWidth - prevWidth) / 2,
    offsetY: layout.offsetY - (drawHeight - prevHeight) / 2,
  };
}

/**
 * Apply manual offset to image layout.
 * Y is inverted so positive = up (matches user expectations).
 */
function applyManualOffset(
  layout: ImageLayout,
  offsetXPercent: number,
  offsetYPercent: number,
  diameter: number
): ImageLayout {
  return {
    ...layout,
    offsetX: layout.offsetX + offsetXPercent * diameter,
    offsetY: layout.offsetY - offsetYPercent * diameter,
  };
}

/**
 * Apply crop offset (random or fixed) to image layout.
 */
function applyCropOffset(
  layout: ImageLayout,
  style: BackgroundStyle,
  diameter: number
): ImageLayout {
  const maxOffsetX = Math.abs(layout.drawWidth - diameter) / 2;
  const maxOffsetY = Math.abs(layout.drawHeight - diameter) / 2;

  let offsetX = layout.offsetX;
  let offsetY = layout.offsetY;

  if (style.randomCrop) {
    offsetX += (Math.random() - 0.5) * 2 * maxOffsetX;
    offsetY += (Math.random() - 0.5) * 2 * maxOffsetY;
  } else if (style.cropOffsetX !== undefined || style.cropOffsetY !== undefined) {
    offsetX += ((style.cropOffsetX ?? 0.5) - 0.5) * 2 * maxOffsetX;
    offsetY += ((style.cropOffsetY ?? 0.5) - 0.5) * 2 * maxOffsetY;
  }

  return { ...layout, offsetX, offsetY };
}

/**
 * Determine rotation angle from style configuration.
 */
function getRotationAngle(style: BackgroundStyle): number {
  if (style.randomizeRotation) {
    return Math.random() * 360;
  }
  return style.imageRotation ?? 0;
}

/**
 * Draw error checkerboard pattern (red/yellow) when image fails to load.
 */
function drawErrorCheckerboard(ctx: CanvasRenderingContext2D, diameter: number): void {
  const checkerSize = Math.max(8, Math.floor(diameter / 16));
  const colors = ['#FF0000', '#FFFF00'];

  for (let y = 0; y < diameter; y += checkerSize) {
    for (let x = 0; x < diameter; x += checkerSize) {
      const colorIndex = (Math.floor(x / checkerSize) + Math.floor(y / checkerSize)) % 2;
      ctx.fillStyle = colors[colorIndex];
      ctx.fillRect(x, y, checkerSize, checkerSize);
    }
  }
}

/**
 * Render image background with all transformations applied.
 */
async function renderImageBackground(
  ctx: CanvasRenderingContext2D,
  style: BackgroundStyle & { imageUrl: string },
  diameter: number,
  center: number
): Promise<void> {
  drawCheckerboardBackground(ctx, diameter);

  try {
    const img = await loadBackgroundImage(style.imageUrl);

    // Calculate layout with all transformations
    let layout = calculateCoverDimensions(img.width, img.height, diameter);
    layout = applyZoomTransform(layout, style.imageZoom ?? 1);
    layout = applyManualOffset(layout, style.imageOffsetX ?? 0, style.imageOffsetY ?? 0, diameter);
    layout = applyCropOffset(layout, style, diameter);

    const rotation = getRotationAngle(style);

    // Apply rotation if needed
    if (rotation !== 0) {
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-center, -center);
    }

    ctx.drawImage(img, layout.offsetX, layout.offsetY, layout.drawWidth, layout.drawHeight);

    if (rotation !== 0) {
      ctx.restore();
    }
  } catch (error) {
    logger.warn('BackgroundRenderer', 'Failed to load background image, using fallback', error);
    drawErrorCheckerboard(ctx, diameter);
  }
}

/**
 * Render solid or gradient background.
 */
function renderColorBackground(
  ctx: CanvasRenderingContext2D,
  style: BackgroundStyle,
  diameter: number
): void {
  if (style.mode === 'solid') {
    ctx.fillStyle = style.solidColor;
  } else {
    ctx.fillStyle = createBackgroundGradient(ctx, style.gradient, diameter);
  }
  ctx.fill();
}

// ============================================================================
// BORDER FRAME MODE SUPPORT
// ============================================================================

/**
 * Check if border frame mode is active
 */
export function isFrameModeActive(effects: EffectsConfig): boolean {
  return effects.borderEnabled && effects.borderMode === 'frame' && effects.borderWidth > 0;
}

/**
 * Frame mode scale information for use by TokenGenerator
 */
export interface FrameModeInfo {
  /** Whether frame mode is active */
  isActive: boolean;
  /** Scale factor for content (1.0 = no scaling) */
  scale: number;
  /** Border width in pixels */
  borderWidth: number;
  /** Content diameter (inner area) in pixels */
  contentDiameter: number;
}

/**
 * Get frame mode scaling information
 * Used by TokenGenerator to scale all content inside the border
 *
 * @param effects - Effects configuration
 * @param diameter - Token diameter in pixels
 * @returns Frame mode info including scale factor
 */
export function getFrameModeInfo(effects: EffectsConfig, diameter: number): FrameModeInfo {
  if (!isFrameModeActive(effects)) {
    return {
      isActive: false,
      scale: 1,
      borderWidth: 0,
      contentDiameter: diameter,
    };
  }

  const borderWidth = diameter * (effects.borderWidth / 100);
  const contentDiameter = diameter - borderWidth * 2;
  const scale = contentDiameter / diameter;

  return {
    isActive: true,
    scale,
    borderWidth,
    contentDiameter,
  };
}

/**
 * Calculate the content radius when frame mode is active
 * Content shrinks to make room for the border
 */
function calculateContentRadius(radius: number, effects: EffectsConfig): number {
  if (!isFrameModeActive(effects)) {
    return radius;
  }
  const borderWidth = radius * 2 * (effects.borderWidth / 100);
  return radius - borderWidth;
}

/**
 * Draw the border ring for frame mode
 * This is drawn before content, outside the content clip area
 */
function drawFrameBorder(
  ctx: CanvasRenderingContext2D,
  center: number,
  outerRadius: number,
  innerRadius: number,
  effects: EffectsConfig
): void {
  const borderWidth = outerRadius - innerRadius;

  if (borderWidth <= 0) return;

  ctx.save();

  // Draw the border as a stroke between inner and outer radius
  ctx.beginPath();
  ctx.arc(center, center, outerRadius - borderWidth / 2, 0, Math.PI * 2);

  ctx.strokeStyle = effects.borderColor;
  ctx.lineWidth = borderWidth;

  // Apply line dash pattern for dashed/dotted styles
  if (effects.borderStyle === 'dashed') {
    const dashLength = borderWidth * BORDER_EFFECT.DASH_MULTIPLIER;
    const gapLength = borderWidth * BORDER_EFFECT.GAP_MULTIPLIER;
    ctx.setLineDash([dashLength, gapLength]);
  } else if (effects.borderStyle === 'dotted') {
    const dotLength = borderWidth * BORDER_EFFECT.DOT_MULTIPLIER;
    const gapLength = borderWidth * BORDER_EFFECT.GAP_MULTIPLIER;
    ctx.setLineDash([dotLength, gapLength]);
    ctx.lineCap = 'round';
  }

  ctx.stroke();
  ctx.restore();
}

// ============================================================================
// MAIN RENDER FUNCTION
// ============================================================================

/**
 * Render a complete background with base, texture, and effects
 *
 * This is the main entry point for background rendering.
 * Pipeline: [frame border] → scale transform → filters → base (solid/gradient/image) → texture → effects → vibrance
 *
 * For frame mode, the border is drawn first, then a scale transform is applied
 * so all content renders at a smaller size inside the border.
 * For overlay mode, the border is drawn as part of the effects pipeline.
 *
 * @param ctx - Canvas context (should have circular clip already applied)
 * @param style - Complete background style configuration
 * @param diameter - Token diameter in pixels
 */
export async function renderBackground(
  ctx: CanvasRenderingContext2D,
  style: BackgroundStyle,
  diameter: number
): Promise<void> {
  const center = diameter / 2;
  const radius = diameter / 2;
  const light = style.light || DEFAULT_LIGHT_CONFIG;

  // Check if frame mode border is active
  const frameModeInfo = getFrameModeInfo(style.effects, diameter);

  ctx.save();

  // 0. For frame mode: draw border first, apply scale transform, then clip
  if (frameModeInfo.isActive) {
    const contentRadius = calculateContentRadius(radius, style.effects);

    // Draw border at full size (before any transform)
    drawFrameBorder(ctx, center, radius, contentRadius, style.effects);

    // Apply scale transform centered on the token
    // This makes all subsequent rendering appear at a smaller size, centered
    ctx.translate(center, center);
    ctx.scale(frameModeInfo.scale, frameModeInfo.scale);
    ctx.translate(-center, -center);

    // Create circular clip AFTER transform - clip at full radius in transformed space
    // This creates a clip at the content area size in final output
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.clip();
  }

  // 1. Apply CSS-style filters for brightness/contrast/saturation
  const filterString = buildFilterString(light);
  if (filterString) {
    ctx.filter = filterString;
  }

  // 2. Draw base depending on sourceType
  // In frame mode, this renders at full coordinates but gets scaled down
  if (style.sourceType === 'image' && style.imageUrl) {
    // Type assertion safe after imageUrl check
    await renderImageBackground(
      ctx,
      style as BackgroundStyle & { imageUrl: string },
      diameter,
      center
    );
  } else {
    renderColorBackground(ctx, style, diameter);
  }

  // 3. Apply texture overlay if enabled
  if (style.texture.type !== 'none') {
    applyTexture(ctx, style.texture, diameter, style.solidColor);
  }

  // Reset filter before effects (effects should not be filtered)
  ctx.filter = 'none';

  // 4. Apply visual effects (at full radius - transform handles scaling)
  applyEffects(ctx, style.effects, center, radius);

  ctx.restore();

  // 5. Apply vibrance (post-processing, requires pixel manipulation)
  if (light.vibrance !== 100) {
    applyVibrance(ctx, diameter, light.vibrance);
  }
}
