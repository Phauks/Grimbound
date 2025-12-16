/**
 * Blood on the Clocktower Token Generator
 * Token Generator - Refactored with Dependency Injection
 *
 * This is the refactored version that uses composition and dependency injection.
 * Orchestrates TokenImageRenderer and TokenTextRenderer for token generation.
 */

import {
  type CanvasContext,
  createCanvas,
  createCircularClipPath,
  type Point,
} from '../canvas/index.js';
import { generateStyledQRCode } from '../canvas/qrGeneration.js';
import CONFIG from '../config.js';
import { DEFAULT_COLORS, QR_COLORS, QR_TOKEN_LAYOUT } from '../constants.js';
import { countReminders, getCharacterImageUrl } from '../data/index.js';
import { ValidationError } from '../errors.js';
import type { Character } from '../types/index.js';
import {
  DEFAULT_TOKEN_OPTIONS,
  type MetaTokenContentRenderer,
  type TokenGeneratorOptions,
} from '../types/tokenOptions.js';
import { logger } from '../utils/logger.js';
import { defaultImageCache } from './ImageCacheAdapter.js';
import { type IImageCache, TokenImageRenderer } from './TokenImageRenderer.js';
import { TokenTextRenderer } from './TokenTextRenderer.js';

// Re-export for backward compatibility
export { generateAllTokens } from './batchGenerator.js';

/**
 * Lighten a hex color by a percentage
 * @param hex - Hex color string (e.g., '#8B0000')
 * @param percent - Lightness percentage (0-100, higher = lighter)
 * @returns Lightened hex color
 */
function _lightenColor(hex: string, percent: number): string {
  // Parse hex color
  const color = hex.replace('#', '');
  const r = parseInt(color.slice(0, 2), 16);
  const g = parseInt(color.slice(2, 4), 16);
  const b = parseInt(color.slice(4, 6), 16);

  // Calculate lightened values (blend toward white)
  const factor = percent / 100;
  const newR = Math.round(r + (255 - r) * factor);
  const newG = Math.round(g + (255 - g) * factor);
  const newB = Math.round(b + (255 - b) * factor);

  // Convert back to hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

/**
 * Draw a rounded rectangle path
 */
function _roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Refactored TokenGenerator using composition and dependency injection
 *
 * Benefits:
 * - Smaller, more focused class (< 300 lines vs 643)
 * - Dependency injection for better testability
 * - Separation of concerns (orchestration vs rendering)
 * - Each renderer can be tested independently
 */
export class TokenGenerator {
  private options: TokenGeneratorOptions;
  private imageRenderer: TokenImageRenderer;
  private textRenderer: TokenTextRenderer;
  private imageCache: IImageCache;

  /**
   * Create a new TokenGenerator with dependency injection
   *
   * @param options - Token generation options
   * @param imageCache - Image cache implementation (optional, uses global cache by default)
   */
  constructor(
    options: Partial<TokenGeneratorOptions> = {},
    imageCache: IImageCache = defaultImageCache
  ) {
    this.options = { ...DEFAULT_TOKEN_OPTIONS, ...options };

    // Merge nested options
    if (options.fontSpacing) {
      this.options.fontSpacing = { ...DEFAULT_TOKEN_OPTIONS.fontSpacing, ...options.fontSpacing };
    }
    if (options.textShadow) {
      this.options.textShadow = { ...DEFAULT_TOKEN_OPTIONS.textShadow, ...options.textShadow };
    }

    // Initialize dependencies
    this.imageCache = imageCache;
    this.imageRenderer = new TokenImageRenderer(this.options, imageCache);
    this.textRenderer = new TokenTextRenderer(this.options);

    logger.debug('TokenGenerator', 'Initialized with options', {
      dpi: this.options.dpi,
      transparentBackground: this.options.transparentBackground,
    });
  }

  /**
   * Update generator options (updates all renderers)
   */
  updateOptions(newOptions: Partial<TokenGeneratorOptions>): void {
    this.options = { ...this.options, ...newOptions };
    this.imageRenderer.updateOptions(this.options);
    this.textRenderer.updateOptions(this.options);
    logger.debug('TokenGenerator', 'Options updated');
  }

  /**
   * Pre-warm the image cache with all character images
   */
  async prewarmImageCache(characters: Character[]): Promise<void> {
    const imageUrls = new Set<string>();

    for (const character of characters) {
      const url = getCharacterImageUrl(character.image);
      if (url) {
        imageUrls.add(url);
      }
    }

    logger.info('TokenGenerator', `Pre-warming image cache with ${imageUrls.size} images`);
    await Promise.allSettled(
      Array.from(imageUrls).map((url) => this.imageRenderer.getCachedImage(url))
    );
  }

  /**
   * Clear the image cache
   */
  clearCache(): void {
    this.imageCache.clear();
    logger.info('TokenGenerator', 'Cache cleared');
  }

  // ========================================================================
  // CANVAS UTILITIES
  // ========================================================================

  private createBaseCanvas(diameter: number): CanvasContext {
    return createCanvas(diameter, { dpi: this.options.dpi });
  }

  private applyCircularClip(ctx: CanvasRenderingContext2D, center: Point, radius: number): void {
    ctx.save();
    createCircularClipPath(ctx, center, radius);
  }

  // ========================================================================
  // CHARACTER TOKEN GENERATION
  // ========================================================================

  async generateCharacterToken(
    character: Character,
    imageOverride?: string
  ): Promise<HTMLCanvasElement> {
    // Input validation
    if (!character?.name) {
      throw new ValidationError('Character must have a name');
    }
    if (this.options.dpi <= 0) {
      throw new ValidationError('DPI must be positive');
    }

    logger.debug('TokenGenerator', 'Generating character token', character.name);

    const diameter = CONFIG.TOKEN.ROLE_DIAMETER_INCHES * this.options.dpi;
    const { canvas, ctx, center, radius } = this.createBaseCanvas(diameter);

    this.applyCircularClip(ctx, center, radius);

    // Draw background
    if (this.options.characterBackgroundType === 'color') {
      if (!this.options.transparentBackground) {
        ctx.fillStyle = this.options.characterBackgroundColor || '#FFFFFF';
        ctx.fill();
      }
    } else {
      await this.imageRenderer.drawBackground(
        ctx,
        this.options.characterBackground,
        diameter,
        DEFAULT_COLORS.FALLBACK_BACKGROUND
      );
    }

    // Determine ability text
    const abilityTextToDisplay = this.options.displayAbilityText ? character.ability : undefined;
    const hasAbilityText = Boolean(abilityTextToDisplay?.trim());

    // Calculate text layout if needed
    let abilityTextLayout;
    if (hasAbilityText) {
      abilityTextLayout = this.textRenderer.calculateAbilityTextLayout(
        ctx,
        abilityTextToDisplay!,
        diameter
      );
    }

    // Draw character image
    await this.imageRenderer.drawCharacterImage(
      ctx,
      character,
      diameter,
      'character',
      imageOverride,
      hasAbilityText,
      abilityTextLayout
    );

    // Draw setup flower if needed
    if (character.setup) {
      await this.imageRenderer.drawSetupFlower(ctx, diameter);
    }

    ctx.restore();

    // Draw leaves
    if (this.options.leafEnabled !== false && this.options.maximumLeaves > 0) {
      await this.imageRenderer.drawLeaves(ctx, diameter);
    }

    // Draw ability text
    if (hasAbilityText) {
      this.textRenderer.drawAbilityText(ctx, abilityTextToDisplay!, diameter);
    }

    // Draw character name
    if (character.name) {
      this.textRenderer.drawCharacterName(ctx, character.name, center, radius, diameter);
    }

    // Draw token count badge
    if (this.options.tokenCount) {
      const reminderCount = countReminders(character);
      if (reminderCount > 0) {
        this.textRenderer.drawTokenCount(ctx, reminderCount, diameter);
      }
    }

    logger.info('TokenGenerator', 'Generated character token', character.name);
    return canvas;
  }

  // ========================================================================
  // REMINDER TOKEN GENERATION
  // ========================================================================

  async generateReminderToken(
    character: Character,
    reminderText: string,
    imageOverride?: string
  ): Promise<HTMLCanvasElement> {
    // Input validation
    if (!character?.name) {
      throw new ValidationError('Character must have a name for reminder token');
    }
    if (!reminderText?.trim()) {
      throw new ValidationError('Reminder text cannot be empty');
    }
    if (this.options.dpi <= 0) {
      throw new ValidationError('DPI must be positive');
    }

    logger.debug('TokenGenerator', 'Generating reminder token', {
      character: character.name,
      reminder: reminderText,
    });

    const diameter = CONFIG.TOKEN.REMINDER_DIAMETER_INCHES * this.options.dpi;
    const { canvas, ctx, center, radius } = this.createBaseCanvas(diameter);

    this.applyCircularClip(ctx, center, radius);

    // Draw background
    if (this.options.reminderBackgroundType === 'image') {
      const bgImage = this.options.reminderBackgroundImage || 'character_background_1';
      await this.imageRenderer.drawBackground(
        ctx,
        bgImage,
        diameter,
        DEFAULT_COLORS.FALLBACK_BACKGROUND
      );
    } else {
      if (!this.options.transparentBackground) {
        ctx.fillStyle = this.options.reminderBackground;
        ctx.fill();
      }
    }

    // Draw character image
    await this.imageRenderer.drawCharacterImage(
      ctx,
      character,
      diameter,
      'reminder',
      imageOverride
    );
    ctx.restore();

    // Draw reminder text
    this.textRenderer.drawReminderText(ctx, reminderText, center, radius, diameter);

    logger.info('TokenGenerator', 'Generated reminder token', {
      character: character.name,
      reminder: reminderText,
    });
    return canvas;
  }

  // ========================================================================
  // META TOKEN GENERATION
  // ========================================================================

  private async generateMetaToken(
    renderContent: MetaTokenContentRenderer,
    backgroundOverride?: string
  ): Promise<HTMLCanvasElement> {
    const diameter = CONFIG.TOKEN.ROLE_DIAMETER_INCHES * this.options.dpi;
    const { canvas, ctx, center, radius } = this.createBaseCanvas(diameter);

    this.applyCircularClip(ctx, center, radius);

    // Draw background
    if (this.options.metaBackgroundType === 'color') {
      if (!this.options.transparentBackground) {
        ctx.fillStyle = this.options.metaBackgroundColor || '#FFFFFF';
        ctx.fill();
      }
    } else {
      const bgName =
        backgroundOverride || this.options.metaBackground || this.options.characterBackground;
      await this.imageRenderer.drawBackground(
        ctx,
        bgName,
        diameter,
        DEFAULT_COLORS.FALLBACK_BACKGROUND
      );
    }

    ctx.restore();

    await renderContent(ctx, diameter, center, radius);
    return canvas;
  }

  async generateScriptNameToken(
    scriptName: string,
    author?: string,
    hideAuthor?: boolean
  ): Promise<HTMLCanvasElement> {
    logger.debug('TokenGenerator', 'Generating script name token', scriptName);

    return this.generateMetaToken(async (ctx, diameter, center, radius) => {
      // Try to draw logo if provided
      let logoDrawn = false;
      if (this.options.logoUrl) {
        logoDrawn = await this.imageRenderer.drawLogo(
          ctx,
          this.options.logoUrl,
          diameter,
          center.x,
          center.y
        );
      }

      // Fall back to text if no logo
      if (!logoDrawn) {
        this.textRenderer.drawCenteredText(ctx, scriptName, diameter);
      }

      // Draw author if provided
      if (author && !hideAuthor) {
        this.textRenderer.drawAuthorText(ctx, author, center, radius, diameter);
      }
    });
  }

  async generatePandemoniumToken(): Promise<HTMLCanvasElement> {
    logger.debug('TokenGenerator', 'Generating Pandemonium token');

    return this.generateMetaToken(async (ctx, diameter, center) => {
      await this.imageRenderer.drawPandemoniumImage(ctx, diameter, center.x, center.y);
    });
  }

  async generateAlmanacQRToken(
    almanacUrl: string,
    scriptName: string,
    scriptLogoUrl?: string
  ): Promise<HTMLCanvasElement> {
    logger.debug('TokenGenerator', 'Generating almanac QR token', scriptName);

    const diameter = CONFIG.TOKEN.ROLE_DIAMETER_INCHES * this.options.dpi;
    const { canvas, ctx, center, radius } = this.createBaseCanvas(diameter);

    // Get user's QR options with defaults
    const qrOpts = this.options.qrCodeOptions;

    // Token options
    const showAlmanacLabel = qrOpts?.showAlmanacLabel ?? true;
    const showLogo = qrOpts?.showLogo ?? true;

    // Dots options
    const dotType = qrOpts?.dotType ?? 'extra-rounded';
    const dotsUseGradient = qrOpts?.dotsUseGradient ?? true;
    const dotsGradientType = qrOpts?.dotsGradientType ?? 'linear';
    const dotsGradientRotation = qrOpts?.dotsGradientRotation ?? 45;
    const dotsColorStart = qrOpts?.dotsColorStart ?? QR_COLORS.GRADIENT_START;
    const dotsColorEnd = qrOpts?.dotsColorEnd ?? QR_COLORS.GRADIENT_END;

    // Corner square options
    const cornerSquareType = qrOpts?.cornerSquareType ?? 'extra-rounded';
    const cornerSquareUseGradient = qrOpts?.cornerSquareUseGradient ?? false;
    const cornerSquareGradientType = qrOpts?.cornerSquareGradientType ?? 'linear';
    const cornerSquareColorStart = qrOpts?.cornerSquareColorStart ?? QR_COLORS.GRADIENT_START;
    const cornerSquareColorEnd = qrOpts?.cornerSquareColorEnd ?? QR_COLORS.GRADIENT_START;

    // Corner dot options
    const cornerDotType = qrOpts?.cornerDotType ?? 'dot';
    const cornerDotUseGradient = qrOpts?.cornerDotUseGradient ?? false;
    const cornerDotGradientType = qrOpts?.cornerDotGradientType ?? 'linear';
    const cornerDotColorStart = qrOpts?.cornerDotColorStart ?? QR_COLORS.GRADIENT_END;
    const cornerDotColorEnd = qrOpts?.cornerDotColorEnd ?? QR_COLORS.GRADIENT_END;

    // Background options
    const backgroundUseGradient = qrOpts?.backgroundUseGradient ?? false;
    const backgroundGradientType = qrOpts?.backgroundGradientType ?? 'linear';
    const backgroundColorStart = qrOpts?.backgroundColorStart ?? '#FFFFFF';
    const backgroundColorEnd = qrOpts?.backgroundColorEnd ?? '#FFFFFF';
    const backgroundOpacity = qrOpts?.backgroundOpacity ?? 100;
    const backgroundRoundedCorners = qrOpts?.backgroundRoundedCorners ?? false;

    // Image options
    const imageHideBackgroundDots = qrOpts?.imageHideBackgroundDots ?? true;
    const imageSize = qrOpts?.imageSize ?? 30;
    const imageMargin = qrOpts?.imageMargin ?? 4;

    // QR options
    const errorCorrectionLevel = qrOpts?.errorCorrectionLevel ?? 'H';

    // Draw meta background (same as other meta tokens)
    this.applyCircularClip(ctx, center, radius);
    if (this.options.metaBackgroundType === 'color') {
      if (!this.options.transparentBackground) {
        ctx.fillStyle = this.options.metaBackgroundColor || '#FFFFFF';
        ctx.fill();
      }
    } else {
      const bgName = this.options.metaBackground || this.options.characterBackground;
      await this.imageRenderer.drawBackground(
        ctx,
        bgName,
        diameter,
        DEFAULT_COLORS.FALLBACK_BACKGROUND
      );
    }
    ctx.restore();

    // Calculate QR size and position
    const qrSize = Math.floor(diameter * QR_TOKEN_LAYOUT.QR_CODE_SIZE);
    const qrOffset = (diameter - qrSize) / 2;

    // Generate styled QR code with all options
    const qrCanvas = await generateStyledQRCode({
      text: almanacUrl,
      size: qrSize,
      logoUrl: scriptLogoUrl,
      showLogo: showLogo && !!scriptLogoUrl,
      // Dots
      dotType,
      dotsUseGradient,
      dotsGradientType,
      dotsGradientRotation,
      dotsColorStart,
      dotsColorEnd,
      // Corner squares
      cornerSquareType,
      cornerSquareUseGradient,
      cornerSquareGradientType,
      cornerSquareColorStart,
      cornerSquareColorEnd,
      // Corner dots
      cornerDotType,
      cornerDotUseGradient,
      cornerDotGradientType,
      cornerDotColorStart,
      cornerDotColorEnd,
      // Background
      backgroundUseGradient,
      backgroundGradientType,
      backgroundColorStart,
      backgroundColorEnd,
      backgroundOpacity,
      backgroundRoundedCorners,
      // Image
      imageHideBackgroundDots,
      imageSize,
      imageMargin,
      // QR
      errorCorrectionLevel,
    });

    // Draw QR code centered on token
    ctx.drawImage(qrCanvas, qrOffset, qrOffset, qrSize, qrSize);

    // Optionally draw "ALMANAC" curved at bottom
    if (showAlmanacLabel) {
      this.textRenderer.drawAlmanacLabel(ctx, center, radius, diameter);
    }

    logger.info('TokenGenerator', 'Generated almanac QR token', scriptName);
    return canvas;
  }
}

export default { TokenGenerator };
