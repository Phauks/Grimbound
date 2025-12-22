/**
 * Background Renderer
 *
 * Main orchestrator for rendering token backgrounds with textures and effects.
 * Coordinates the rendering pipeline: base → texture → effects → post-processing.
 *
 * @module canvas/backgroundEffects/BackgroundRenderer
 */

import { createBackgroundGradient } from '@/ts/canvas/gradientUtils.js';
import { getBuiltInAssetPath, isBuiltInAsset } from '@/ts/constants/builtInAssets.js';
import { isAssetReference, resolveAssetUrl } from '@/ts/services/upload/assetResolver.js';
import type { BackgroundStyle, TextureConfig } from '@/ts/types/backgroundEffects.js';
import { DEFAULT_LIGHT_CONFIG } from '@/ts/types/backgroundEffects.js';
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
  // Check if it's a built-in asset ID (like 'character_background_1')
  else if (isBuiltInAsset(url, 'token-background')) {
    resolvedUrl = getBuiltInAssetPath(url, 'token-background') || '';
  }
  // Otherwise use the URL directly (http, data, blob URLs)
  else {
    resolvedUrl = url;
  }

  if (!resolvedUrl) {
    throw new Error(`Failed to resolve image URL: ${url}`);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${resolvedUrl}`));

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
    throw new Error('Failed to get 2d context for texture canvas');
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
// MAIN RENDER FUNCTION
// ============================================================================

/**
 * Render a complete background with base, texture, and effects
 *
 * This is the main entry point for background rendering.
 * Pipeline: filters → base (solid/gradient/image) → texture → effects → vibrance
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
  const light = style.light || DEFAULT_LIGHT_CONFIG;

  ctx.save();

  // 1. Apply CSS-style filters for brightness/contrast/saturation (before drawing)
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
  if (filters.length > 0) {
    ctx.filter = filters.join(' ');
  }

  // 2. Draw base depending on sourceType
  if (style.sourceType === 'image' && style.imageUrl) {
    // Image mode: load and draw the image
    try {
      const img = await loadBackgroundImage(style.imageUrl);
      // Draw image to cover the circular area (center and crop)
      const aspectRatio = img.width / img.height;
      let drawWidth = diameter;
      let drawHeight = diameter;
      let offsetX = 0;
      let offsetY = 0;

      if (aspectRatio > 1) {
        // Image is wider - fit height, crop width
        drawWidth = diameter * aspectRatio;
        offsetX = (diameter - drawWidth) / 2;
      } else {
        // Image is taller - fit width, crop height
        drawHeight = diameter / aspectRatio;
        offsetY = (diameter - drawHeight) / 2;
      }

      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    } catch (error) {
      // Fallback to solid color if image fails to load
      // Using console.warn here is intentional for debugging failed loads
      // eslint-disable-next-line no-console
      console.warn('Failed to load background image, using fallback color:', error);
      ctx.fillStyle = style.solidColor || '#FFFFFF';
      ctx.fill();
    }
  } else if (style.mode === 'solid') {
    // Solid color mode
    ctx.fillStyle = style.solidColor;
    ctx.fill();
  } else {
    // Gradient mode
    ctx.fillStyle = createBackgroundGradient(ctx, style.gradient, diameter);
    ctx.fill();
  }

  // 3. Apply texture overlay if enabled (works for all source types)
  if (style.texture.type !== 'none') {
    applyTexture(ctx, style.texture, diameter, style.solidColor);
  }

  // Reset filter before effects (effects should not be filtered)
  ctx.filter = 'none';

  // 4. Apply visual effects
  applyEffects(ctx, style.effects, center, diameter / 2);

  ctx.restore();

  // 5. Apply vibrance (post-processing, requires pixel manipulation)
  if (light.vibrance !== 100) {
    applyVibrance(ctx, diameter, light.vibrance);
  }
}
