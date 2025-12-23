/**
 * Blood on the Clocktower Token Generator
 * Token Generator - Canvas operations for token generation
 *
 * Uses composition and dependency injection for better testability.
 * Orchestrates TokenImageRenderer and TokenTextRenderer for token generation.
 */

import {
  type CanvasContext,
  createCanvas,
  createCircularClipPath,
  type Point,
  renderBackground,
  type TextLayoutResult,
} from '@/ts/canvas/index.js';
import { generateStyledQRCode } from '@/ts/canvas/qrGeneration.js';
import CONFIG from '@/ts/config.js';
import { DEFAULT_COLORS, QR_COLORS, QR_TOKEN_LAYOUT, TOKEN_COUNT_BADGE } from '@/ts/constants.js';
import { countReminders } from '@/ts/data/index.js';
import { ValidationError } from '@/ts/errors.js';
import type { Character } from '@/ts/types/index.js';
import {
  DEFAULT_TOKEN_OPTIONS,
  type MetaTokenContentRenderer,
  type TokenGeneratorOptions,
} from '@/ts/types/tokenOptions.js';
import { resolveCharacterImages } from '@/ts/utils/characterImageResolver.js';
import { logger } from '@/ts/utils/logger.js';
import { defaultImageCache } from './ImageCacheAdapter.js';
import { type IImageCache, TokenImageRenderer } from './TokenImageRenderer.js';
import { TokenTextRenderer } from './TokenTextRenderer.js';

/**
 * TokenGenerator class handles all canvas operations for creating tokens
 *
 * Architecture:
 * - Uses composition with TokenImageRenderer and TokenTextRenderer
 * - Supports dependency injection for the image cache
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
   * Pre-warm the image cache with all character images using SSOT resolution
   */
  async prewarmImageCache(characters: Character[]): Promise<void> {
    // Use SSOT batch resolution for consistent image URL handling
    const { urls } = await resolveCharacterImages(characters);

    if (urls.size === 0) {
      logger.debug('TokenGenerator', 'No character images to pre-warm');
      return;
    }

    logger.info('TokenGenerator', `Pre-warming image cache with ${urls.size} images`);
    await Promise.allSettled(
      Array.from(urls.values()).map((url) => this.imageRenderer.getCachedImage(url))
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

    // Draw background based on type selection
    // Priority: BackgroundStyle > color > image
    if (this.options.characterBackgroundStyle) {
      // Advanced background styling with gradients, textures, and effects
      await renderBackground(ctx, this.options.characterBackgroundStyle, diameter);
    } else if (this.options.characterBackgroundType === 'color') {
      if (!this.options.transparentBackground) {
        ctx.fillStyle = this.options.characterBackgroundColor || DEFAULT_COLORS.BACKGROUND_WHITE;
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
    const abilityTextToDisplay = this.options.displayAbilityText
      ? character.ability?.trim()
      : undefined;
    const hasAbilityText = Boolean(abilityTextToDisplay);

    // Calculate reminder count early to determine if we need to adjust positioning
    const reminderCount = this.options.tokenCount ? countReminders(character) : 0;
    const hasBadge = reminderCount > 0;

    // Determine if we should apply uniform layout (all tokens have same top buffer)
    const useUniformLayout = this.options.tokenCount && this.options.reminderCountUniformLayout;

    // Calculate adjusted Y position ratio if badge is present or uniform layout is enabled
    // This is used for both ability text positioning and icon layout
    let abilityTextYPosition: number | undefined;
    let topReservedY: number | undefined;

    if (hasBadge || useUniformLayout) {
      // For uniform layout, use reference count; otherwise use actual reminder count
      const bufferReminderCount = useUniformLayout
        ? TOKEN_COUNT_BADGE.UNIFORM_LAYOUT_REFERENCE_COUNT
        : reminderCount;

      // Get the Y ratio where content can start (below the badge area)
      const badgeBottomYRatio = this.textRenderer.calculateAbilityTextYWithBadge(
        bufferReminderCount,
        diameter
      );

      if (hasAbilityText) {
        // Ability text starts below badge area
        abilityTextYPosition = badgeBottomYRatio;
      } else {
        // No ability text, but icon should still avoid badge area
        // Convert ratio to pixel position for icon layout
        topReservedY = diameter * badgeBottomYRatio;
      }
    }

    // Calculate text layout if needed
    let abilityTextLayout: ReturnType<TokenTextRenderer['calculateAbilityTextLayout']> | undefined;
    if (abilityTextToDisplay) {
      abilityTextLayout = this.textRenderer.calculateAbilityTextLayout(
        ctx,
        abilityTextToDisplay,
        diameter,
        abilityTextYPosition
      );
    }

    // Convert ability text Y ratio to pixels for icon layout
    const abilityTextStartYPixels =
      abilityTextYPosition !== undefined ? diameter * abilityTextYPosition : undefined;

    // Draw character image
    await this.imageRenderer.drawCharacterImage(
      ctx,
      character,
      diameter,
      'character',
      imageOverride,
      hasAbilityText,
      abilityTextLayout,
      abilityTextStartYPixels,
      topReservedY
    );

    // Draw setup overlay if needed
    if (character.setup) {
      await this.imageRenderer.drawSetupOverlay(ctx, diameter);
    }

    ctx.restore();

    // Draw accents
    if (this.options.accentEnabled !== false && this.options.maximumAccents > 0) {
      await this.imageRenderer.drawAccents(ctx, diameter);
    }

    // Draw ability text (with adjusted Y position if badge is present)
    if (abilityTextToDisplay) {
      this.textRenderer.drawAbilityText(ctx, abilityTextToDisplay, diameter, abilityTextYPosition);
    }

    // Draw character name
    if (character.name) {
      this.textRenderer.drawCharacterName(ctx, character.name, center, radius, diameter);
    }

    // Draw token count badge (reminderCount already calculated above)
    if (this.options.tokenCount && reminderCount > 0) {
      this.textRenderer.drawTokenCount(ctx, reminderCount, diameter);
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

    // Draw background based on type selection
    // Priority: BackgroundStyle > image > color
    if (this.options.reminderBackgroundStyle) {
      // Advanced background styling with gradients, textures, and effects
      await renderBackground(ctx, this.options.reminderBackgroundStyle, diameter);
    } else if (this.options.reminderBackgroundType === 'image') {
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

    // Draw background based on type selection
    // Priority: BackgroundStyle > color > image
    if (this.options.metaBackgroundStyle) {
      // Advanced background styling with gradients, textures, and effects
      await renderBackground(ctx, this.options.metaBackgroundStyle, diameter);
    } else if (this.options.metaBackgroundType === 'color') {
      if (!this.options.transparentBackground) {
        ctx.fillStyle = this.options.metaBackgroundColor || DEFAULT_COLORS.BACKGROUND_WHITE;
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
    _scriptName: string,
    scriptLogoUrl?: string
  ): Promise<HTMLCanvasElement> {
    logger.debug('TokenGenerator', 'Generating almanac QR token', _scriptName);

    const diameter = CONFIG.TOKEN.ROLE_DIAMETER_INCHES * this.options.dpi;
    const { canvas, ctx, center, radius } = this.createBaseCanvas(diameter);

    // Get user's QR options with defaults
    const qrOpts = this.options.qrCodeOptions;

    // Token options
    const showAlmanacLabel = qrOpts?.showAlmanacLabel ?? true;
    const showLogo = qrOpts?.showLogo ?? true;

    // Pre-load external logo through our CORS proxy and convert to data URL
    // This is necessary because qr-code-styling loads images internally without our CORS proxy
    let logoDataUrl: string | undefined;
    if (scriptLogoUrl && showLogo) {
      try {
        // Load through our CORS proxy (getCachedImage → loadImage → proxy fallback)
        const logoImage = await this.imageRenderer.getCachedImage(scriptLogoUrl);

        // Convert to data URL (data URLs don't have CORS issues)
        const logoCanvas = document.createElement('canvas');
        logoCanvas.width = logoImage.naturalWidth || logoImage.width;
        logoCanvas.height = logoImage.naturalHeight || logoImage.height;
        const logoCtx = logoCanvas.getContext('2d');
        if (logoCtx) {
          logoCtx.drawImage(logoImage, 0, 0);
          logoDataUrl = logoCanvas.toDataURL('image/png');
          logger.debug('TokenGenerator', 'Pre-loaded QR logo as data URL');
        }
      } catch (error) {
        // Logo failed to load, QR will generate without logo
        logger.warn('TokenGenerator', `Failed to pre-load QR logo: ${scriptLogoUrl}`, error);
      }
    }

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
    const backgroundColorStart = qrOpts?.backgroundColorStart ?? QR_COLORS.BACKGROUND;
    const backgroundColorEnd = qrOpts?.backgroundColorEnd ?? QR_COLORS.BACKGROUND;
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
        ctx.fillStyle = this.options.metaBackgroundColor || DEFAULT_COLORS.BACKGROUND_WHITE;
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
    // Use pre-loaded data URL for logo to avoid CORS issues in qr-code-styling library
    const qrCanvas = await generateStyledQRCode({
      text: almanacUrl,
      size: qrSize,
      logoUrl: logoDataUrl,
      showLogo: showLogo && !!logoDataUrl,
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

    logger.info('TokenGenerator', 'Generated almanac QR token', _scriptName);
    return canvas;
  }

  // ========================================================================
  // BOOTLEGGER TOKEN GENERATION
  // ========================================================================

  /**
   * Generate a Bootlegger token with custom ability text.
   * Uses official Bootlegger character art with custom ability text.
   * Renders like a character token but with fixed Bootlegger appearance.
   * @param abilityText - The ability text to display on the token
   * @param normalizedLayout - Optional layout to use for consistent icon sizing across multiple tokens
   * @returns Promise resolving to canvas element
   */
  async generateBootleggerToken(
    abilityText: string,
    normalizedLayout?: TextLayoutResult
  ): Promise<HTMLCanvasElement> {
    logger.debug('TokenGenerator', 'Generating bootlegger token');

    const diameter = CONFIG.TOKEN.ROLE_DIAMETER_INCHES * this.options.dpi;
    const { canvas, ctx, center, radius } = this.createBaseCanvas(diameter);

    this.applyCircularClip(ctx, center, radius);

    // Draw background (same as character tokens)
    // Priority: BackgroundStyle > color > image
    if (this.options.characterBackgroundStyle) {
      await renderBackground(ctx, this.options.characterBackgroundStyle, diameter);
    } else if (this.options.characterBackgroundType === 'color') {
      if (!this.options.transparentBackground) {
        ctx.fillStyle = this.options.characterBackgroundColor || DEFAULT_COLORS.BACKGROUND_WHITE;
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

    // Bootlegger tokens always have ability text
    const hasAbilityText = Boolean(abilityText?.trim());
    let abilityTextLayout: TextLayoutResult | undefined;
    if (hasAbilityText) {
      abilityTextLayout = this.textRenderer.calculateAbilityTextLayout(ctx, abilityText, diameter);
    }

    // Use normalized layout for icon sizing if provided (for consistent icon sizes)
    const layoutForIcon = normalizedLayout || abilityTextLayout;

    // Check if we should use script logo instead of bootlegger icon
    const useScriptLogo = this.options.bootleggerIconType === 'script';

    // Draw Bootlegger character image
    await this.imageRenderer.drawBootleggerImage(
      ctx,
      diameter,
      hasAbilityText,
      layoutForIcon,
      useScriptLogo,
      this.options.logoUrl
    );

    ctx.restore();

    // Draw accents if enabled
    if (this.options.accentEnabled !== false && this.options.maximumAccents > 0) {
      await this.imageRenderer.drawAccents(ctx, diameter);
    }

    // Always draw ability text for bootlegger tokens
    if (hasAbilityText) {
      this.textRenderer.drawAbilityText(ctx, abilityText, diameter);
    }

    // Draw "BOOTLEGGER" at the bottom (like character name) unless hidden
    if (!this.options.bootleggerHideName) {
      this.textRenderer.drawCharacterName(ctx, 'Bootlegger', center, radius, diameter);
    }

    logger.info('TokenGenerator', 'Generated bootlegger token');
    return canvas;
  }

  /**
   * Calculate ability text layout for a bootlegger token without drawing.
   * Used for pre-calculating layouts to normalize icon sizes.
   * @param abilityText - The ability text to calculate layout for
   * @returns The calculated text layout result, or undefined if no text
   */
  calculateBootleggerLayout(abilityText: string): TextLayoutResult | undefined {
    const diameter = CONFIG.TOKEN.ROLE_DIAMETER_INCHES * this.options.dpi;
    const { ctx } = this.createBaseCanvas(diameter);

    if (!abilityText?.trim()) {
      return undefined;
    }

    return this.textRenderer.calculateAbilityTextLayout(ctx, abilityText, diameter);
  }
}
