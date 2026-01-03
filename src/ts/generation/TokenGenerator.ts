/**
 * Blood on the Clocktower Token Generator
 * Token Generator - Canvas operations for token generation
 *
 * Uses composition and dependency injection for better testability.
 * Orchestrates TokenImageRenderer and TokenTextRenderer for token generation.
 */

import {
  type CanvasContext,
  calculateFittedCircularTextLayout,
  createCanvas,
  createCircularClipPath,
  drawCurvedText,
  type FrameModeInfo,
  getFrameModeInfo,
  type Point,
  renderBackground,
  type TextLayoutResult,
} from '@/ts/canvas/index.js';
import { generateStyledQRCode } from '@/ts/canvas/qrGeneration.js';
import CONFIG from '@/ts/config.js';
import {
  DEFAULT_COLORS,
  JINX_TOKEN_LAYOUT,
  QR_TOKEN_LAYOUT,
  TOKEN_COUNT_BADGE,
} from '@/ts/constants.js';
import { countReminders } from '@/ts/data/index.js';
import { ValidationError } from '@/ts/errors.js';
import type { BackgroundStyle } from '@/ts/types/backgroundEffects.js';
import type { Character, Jinx } from '@/ts/types/index.js';
import {
  DEFAULT_TOKEN_OPTIONS,
  type MetaTokenContentRenderer,
  type TokenGeneratorOptions,
} from '@/ts/types/tokenOptions.js';
import { resolveCharacterImages } from '@/ts/utils/characterImageResolver.js';
import { logger } from '@/ts/utils/logger.js';
import { defaultImageCache } from './ImageCacheAdapter.js';
import { buildStyledQRParams, resolveQROptions } from './QROptionsResolver.js';
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
    return createCanvas(diameter);
  }

  private applyCircularClip(ctx: CanvasRenderingContext2D, center: Point, radius: number): void {
    ctx.save();
    createCircularClipPath(ctx, center, radius);
  }

  /**
   * Get frame mode info for a token type
   * Returns scaling information if frame mode border is active
   */
  private getFrameModeInfoForType(
    tokenType: 'character' | 'reminder' | 'meta',
    diameter: number
  ): FrameModeInfo {
    const styleMap = {
      character: this.options.characterBackgroundStyle,
      reminder: this.options.reminderBackgroundStyle,
      meta: this.options.metaBackgroundStyle,
    };

    const style = styleMap[tokenType];
    if (!style?.effects) {
      return { isActive: false, scale: 1, borderWidth: 0, contentDiameter: diameter };
    }

    return getFrameModeInfo(style.effects, diameter);
  }

  /**
   * Apply frame mode scale transform if active
   * Scales all content to fit inside the border frame
   */
  private applyFrameModeTransform(
    ctx: CanvasRenderingContext2D,
    frameModeInfo: FrameModeInfo,
    center: number
  ): void {
    if (!frameModeInfo.isActive) return;

    ctx.translate(center, center);
    ctx.scale(frameModeInfo.scale, frameModeInfo.scale);
    ctx.translate(-center, -center);
  }

  /**
   * Draw token background based on type selection
   * Priority: BackgroundStyle > color > image
   */
  private async drawTokenBackground(
    ctx: CanvasRenderingContext2D,
    diameter: number,
    tokenType: 'character' | 'reminder' | 'meta'
  ): Promise<void> {
    const styleMap = {
      character: this.options.characterBackgroundStyle,
      reminder: this.options.reminderBackgroundStyle,
      meta: this.options.metaBackgroundStyle,
    };
    const typeMap = {
      character: this.options.characterBackgroundType,
      reminder: this.options.reminderBackgroundType,
      meta: this.options.metaBackgroundType,
    };
    const colorMap = {
      character: this.options.characterBackgroundColor,
      reminder: this.options.reminderBackground,
      meta: this.options.metaBackgroundColor,
    };
    const imageMap = {
      character: this.options.characterBackground,
      reminder: this.options.reminderBackgroundImage || 'character_background_1',
      meta: this.options.metaBackground || this.options.characterBackground,
    };

    const style = styleMap[tokenType];
    const bgType = typeMap[tokenType];
    const color = colorMap[tokenType];
    const bgImage = imageMap[tokenType];

    if (style) {
      await renderBackground(ctx, style as BackgroundStyle, diameter);
    } else if (bgType === 'color') {
      if (!this.options.transparentBackground) {
        ctx.fillStyle = color || DEFAULT_COLORS.BACKGROUND_WHITE;
        ctx.fill();
      }
    } else if (tokenType === 'reminder' && bgType !== 'image') {
      // Reminder tokens: default to color if not explicitly set to image
      if (!this.options.transparentBackground) {
        ctx.fillStyle = this.options.reminderBackground;
        ctx.fill();
      }
    } else {
      await this.imageRenderer.drawBackground(
        ctx,
        bgImage,
        diameter,
        DEFAULT_COLORS.FALLBACK_BACKGROUND
      );
    }
  }

  /**
   * Calculate Y positions adjusted for badge presence
   * Returns positions for ability text and icon layout when badge is visible
   */
  private calculateBadgeAdjustedPositions(
    diameter: number,
    reminderCount: number,
    hasAbilityText: boolean
  ): { abilityTextYPosition?: number; topReservedY?: number } {
    const useUniformLayout = this.options.tokenCount && this.options.reminderCountUniformLayout;
    const hasBadge = reminderCount > 0;

    if (!(hasBadge || useUniformLayout)) {
      return {};
    }

    const bufferReminderCount = useUniformLayout
      ? TOKEN_COUNT_BADGE.UNIFORM_LAYOUT_REFERENCE_COUNT
      : reminderCount;

    const badgeBottomYRatio = this.textRenderer.calculateAbilityTextYWithBadge(
      bufferReminderCount,
      diameter
    );

    if (hasAbilityText) {
      return { abilityTextYPosition: badgeBottomYRatio };
    }
    return { topReservedY: diameter * badgeBottomYRatio };
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

    logger.debug('TokenGenerator', 'Generating character token', character.name);

    const diameter = CONFIG.TOKEN.ROLE_DIAMETER_INCHES * CONFIG.PDF.DPI;
    const { canvas, ctx, center, radius } = this.createBaseCanvas(diameter);

    // Get frame mode info for scaling content
    const frameModeInfo = this.getFrameModeInfoForType('character', diameter);

    this.applyCircularClip(ctx, center, radius);
    await this.drawTokenBackground(ctx, diameter, 'character');

    // Apply frame mode transform for all content (icon, text, etc.)
    // Background already handles its own scaling internally
    this.applyFrameModeTransform(ctx, frameModeInfo, center.x);

    // Determine ability text
    const abilityTextToDisplay = this.options.displayAbilityText
      ? character.ability?.trim()
      : undefined;
    const hasAbilityText = Boolean(abilityTextToDisplay);

    // Calculate reminder count and badge-adjusted positions
    const reminderCount = this.options.tokenCount ? countReminders(character) : 0;
    const { abilityTextYPosition, topReservedY } = this.calculateBadgeAdjustedPositions(
      diameter,
      reminderCount,
      hasAbilityText
    );

    // Calculate text layout if needed
    let abilityTextLayout: TextLayoutResult | undefined;
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

    // For frame mode, apply transform again for content outside the clip
    if (frameModeInfo.isActive) {
      ctx.save();
      this.applyFrameModeTransform(ctx, frameModeInfo, center.x);
    }

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

    // Draw token count badge
    if (this.options.tokenCount && reminderCount > 0) {
      this.textRenderer.drawTokenCount(ctx, reminderCount, diameter);
    }

    // Restore frame mode transform
    if (frameModeInfo.isActive) {
      ctx.restore();
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

    logger.debug('TokenGenerator', 'Generating reminder token', {
      character: character.name,
      reminder: reminderText,
    });

    const diameter = CONFIG.TOKEN.REMINDER_DIAMETER_INCHES * CONFIG.PDF.DPI;
    const { canvas, ctx, center, radius } = this.createBaseCanvas(diameter);

    // Get frame mode info for scaling content
    const frameModeInfo = this.getFrameModeInfoForType('reminder', diameter);

    this.applyCircularClip(ctx, center, radius);
    await this.drawTokenBackground(ctx, diameter, 'reminder');

    // Apply frame mode transform for all content
    this.applyFrameModeTransform(ctx, frameModeInfo, center.x);

    // Draw character image
    await this.imageRenderer.drawCharacterImage(
      ctx,
      character,
      diameter,
      'reminder',
      imageOverride
    );
    ctx.restore();

    // For frame mode, apply transform again for content outside the clip
    if (frameModeInfo.isActive) {
      ctx.save();
      this.applyFrameModeTransform(ctx, frameModeInfo, center.x);
    }

    // Draw reminder text
    this.textRenderer.drawReminderText(ctx, reminderText, center, radius, diameter);

    // Restore frame mode transform
    if (frameModeInfo.isActive) {
      ctx.restore();
    }

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
    _backgroundOverride?: string
  ): Promise<HTMLCanvasElement> {
    const diameter = CONFIG.TOKEN.ROLE_DIAMETER_INCHES * CONFIG.PDF.DPI;
    const { canvas, ctx, center, radius } = this.createBaseCanvas(diameter);

    // Get frame mode info for scaling content
    const frameModeInfo = this.getFrameModeInfoForType('meta', diameter);

    this.applyCircularClip(ctx, center, radius);
    await this.drawTokenBackground(ctx, diameter, 'meta');
    ctx.restore();

    // Apply frame mode transform for content
    if (frameModeInfo.isActive) {
      ctx.save();
      this.applyFrameModeTransform(ctx, frameModeInfo, center.x);
    }

    await renderContent(ctx, diameter, center, radius);

    // Restore frame mode transform
    if (frameModeInfo.isActive) {
      ctx.restore();
    }

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

    const diameter = CONFIG.TOKEN.ROLE_DIAMETER_INCHES * CONFIG.PDF.DPI;
    const { canvas, ctx, center, radius } = this.createBaseCanvas(diameter);

    // Get frame mode info for scaling content
    const frameModeInfo = this.getFrameModeInfoForType('meta', diameter);

    // Resolve QR options with defaults
    const qrOpts = resolveQROptions(this.options.qrCodeOptions);

    // Pre-load external logo through our CORS proxy and convert to data URL
    // This is necessary because qr-code-styling loads images internally without our CORS proxy
    const logoDataUrl = await this.preloadLogoAsDataUrl(scriptLogoUrl, qrOpts.showLogo);

    // Draw meta background
    this.applyCircularClip(ctx, center, radius);
    await this.drawTokenBackground(ctx, diameter, 'meta');
    ctx.restore();

    // Apply frame mode transform for content
    if (frameModeInfo.isActive) {
      ctx.save();
      this.applyFrameModeTransform(ctx, frameModeInfo, center.x);
    }

    // Calculate QR size and position
    const qrSize = Math.floor(diameter * QR_TOKEN_LAYOUT.QR_CODE_SIZE);
    const qrOffset = (diameter - qrSize) / 2;

    // Generate styled QR code with resolved options
    const qrParams = buildStyledQRParams(almanacUrl, qrSize, logoDataUrl, qrOpts);
    const qrCanvas = await generateStyledQRCode(qrParams);

    // Draw QR code centered on token
    ctx.drawImage(qrCanvas, qrOffset, qrOffset, qrSize, qrSize);

    // Optionally draw "ALMANAC" curved at bottom
    if (qrOpts.showAlmanacLabel) {
      this.textRenderer.drawAlmanacLabel(ctx, center, radius, diameter);
    }

    // Restore frame mode transform
    if (frameModeInfo.isActive) {
      ctx.restore();
    }

    logger.info('TokenGenerator', 'Generated almanac QR token', _scriptName);
    return canvas;
  }

  /**
   * Pre-load an external logo through CORS proxy and convert to data URL
   * This is necessary because qr-code-styling loads images internally without our CORS proxy
   */
  private async preloadLogoAsDataUrl(
    logoUrl: string | undefined,
    showLogo: boolean
  ): Promise<string | undefined> {
    if (!(logoUrl && showLogo)) {
      return undefined;
    }

    try {
      const logoImage = await this.imageRenderer.getCachedImage(logoUrl);
      const logoCanvas = document.createElement('canvas');
      logoCanvas.width = logoImage.naturalWidth || logoImage.width;
      logoCanvas.height = logoImage.naturalHeight || logoImage.height;
      const logoCtx = logoCanvas.getContext('2d');

      if (logoCtx) {
        logoCtx.drawImage(logoImage, 0, 0);
        logger.debug('TokenGenerator', 'Pre-loaded QR logo as data URL');
        return logoCanvas.toDataURL('image/png');
      }
    } catch (error) {
      logger.warn('TokenGenerator', `Failed to pre-load QR logo: ${logoUrl}`, error);
    }

    return undefined;
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

    const diameter = CONFIG.TOKEN.ROLE_DIAMETER_INCHES * CONFIG.PDF.DPI;
    const { canvas, ctx, center, radius } = this.createBaseCanvas(diameter);

    // Get frame mode info for scaling content (bootlegger uses character background)
    const frameModeInfo = this.getFrameModeInfoForType('character', diameter);

    this.applyCircularClip(ctx, center, radius);
    await this.drawTokenBackground(ctx, diameter, 'character');

    // Apply frame mode transform for all content
    this.applyFrameModeTransform(ctx, frameModeInfo, center.x);

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

    // For frame mode, apply transform again for content outside the clip
    if (frameModeInfo.isActive) {
      ctx.save();
      this.applyFrameModeTransform(ctx, frameModeInfo, center.x);
    }

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

    // Restore frame mode transform
    if (frameModeInfo.isActive) {
      ctx.restore();
    }

    logger.info('TokenGenerator', 'Generated bootlegger token');
    return canvas;
  }

  /**
   * Calculate ability text layout for a bootlegger token without drawing.
   * Used for pre-calculating layouts to normalize icon sizes.
   * @param abilityText - The ability text to calculate layout for
   * @returns The calculated text layout result, or undefined if no text
   * @deprecated Use textRenderer.calculateBootleggerTextLayout() instead
   */
  calculateBootleggerLayout(abilityText: string): TextLayoutResult | undefined {
    return this.textRenderer.calculateBootleggerTextLayout(abilityText);
  }

  // ========================================================================
  // JINX TOKEN GENERATION
  // ========================================================================

  /**
   * Generate a jinx token showing the interaction between two characters.
   * Layout:
   * - First character name curved at the top
   * - Two character icons side by side in the middle
   * - Jinx reason text below the icons
   * - Second character name curved at the bottom
   *
   * @param jinx - The jinx data (contains target id and reason text)
   * @param char1 - First character (the one with the jinx)
   * @param char2 - Second character (the target of the jinx)
   * @returns Promise resolving to canvas element
   */
  async generateJinxToken(
    jinx: Jinx,
    char1: Character,
    char2: Character,
    preResolvedUrls?: Map<string, string>
  ): Promise<HTMLCanvasElement> {
    logger.debug('TokenGenerator', `Generating jinx token: ${char1.name} ⚡ ${char2.name}`);

    return this.generateMetaToken(async (ctx, diameter, center) => {
      const radius = diameter / 2;

      // Use meta icon settings for jinx tokens (they are a type of meta token)
      const defaultIconSettings = { scale: 1.0, offsetX: 0, offsetY: 0 };
      const metaIconSettings = this.options.iconSettings?.meta || defaultIconSettings;

      // Apply meta icon scale to jinx icons
      const baseIconSize = diameter * JINX_TOKEN_LAYOUT.ICON_SIZE_RATIO;
      const iconSize = baseIconSize * metaIconSettings.scale;

      // Apply offsets (scaled relative to diameter for resolution independence)
      const offsetX = (metaIconSettings.offsetX || 0) * diameter;
      const offsetY = (metaIconSettings.offsetY || 0) * diameter;

      // Jinx icon spacing adjustment (distance from center)
      // Positive values move icons further apart, negative moves closer together
      const jinxSpacingAdjust = (this.options.jinxIconSpacing || 0) * diameter;

      const halfSpacing = (diameter * JINX_TOKEN_LAYOUT.ICON_SPACING) / 2;
      const baseHalfIconSize = baseIconSize / 2;

      // Calculate icon CENTER positions using base (unscaled) size
      // This ensures icons scale from their own centers, not from the token center
      // Offsets move both icons together as a unit
      // jinxSpacingAdjust moves icons symmetrically apart/together
      const icon1CenterX = center.x - baseHalfIconSize - halfSpacing + offsetX - jinxSpacingAdjust;
      const icon2CenterX = center.x + baseHalfIconSize + halfSpacing + offsetX + jinxSpacingAdjust;
      const iconCenterY = diameter * JINX_TOKEN_LAYOUT.ICON_Y_POSITION + baseHalfIconSize + offsetY;

      // Calculate top-left positions from centers for drawing
      const scaledHalfSize = iconSize / 2;
      const icon1X = icon1CenterX - scaledHalfSize;
      const icon2X = icon2CenterX - scaledHalfSize;
      const iconY = iconCenterY - scaledHalfSize;

      // Draw character names unless hidden via textLocations.metaName === 'none'
      const metaTextLocation = this.options.textLocations?.metaName ?? 'bottom';
      if (metaTextLocation !== 'none') {
        const metaFont = this.options.metaNameFont || this.options.characterNameFont;
        const metaColor = this.options.metaNameColor || DEFAULT_COLORS.TEXT_PRIMARY;
        const curvedNameFontSize = diameter * JINX_TOKEN_LAYOUT.CURVED_NAME_FONT_SIZE_RATIO;
        const curvedNameRadius = radius * JINX_TOKEN_LAYOUT.CURVED_NAME_RADIUS;

        // Draw first character name curved at TOP
        drawCurvedText(ctx, {
          text: char1.name.toUpperCase(),
          centerX: center.x,
          centerY: center.y,
          radius: curvedNameRadius,
          fontFamily: metaFont,
          fontSize: curvedNameFontSize,
          position: 'top',
          color: metaColor,
          letterSpacing: 1,
          shadowBlur: 4,
          renderStyle: 'filled',
        });

        // Draw second character name curved at BOTTOM
        drawCurvedText(ctx, {
          text: char2.name.toUpperCase(),
          centerX: center.x,
          centerY: center.y,
          radius: curvedNameRadius,
          fontFamily: metaFont,
          fontSize: curvedNameFontSize,
          position: 'bottom',
          color: metaColor,
          letterSpacing: 1,
          shadowBlur: 4,
          renderStyle: 'filled',
        });
      }

      // Try to load and draw both character images
      try {
        // Use pre-resolved URLs if available, otherwise resolve (backward compat)
        let char1ImageUrl: string | undefined;
        let char2ImageUrl: string | undefined;

        if (preResolvedUrls) {
          // Use pre-resolved URLs from BatchContext (format: "characterId:0")
          char1ImageUrl = preResolvedUrls.get(`${char1.id}:0`);
          char2ImageUrl = preResolvedUrls.get(`${char2.id}:0`);
        } else {
          // Fallback: resolve image URLs (for standalone usage)
          const { urls } = await resolveCharacterImages([char1, char2]);
          char1ImageUrl = urls.get(char1.uuid || char1.id);
          char2ImageUrl = urls.get(char2.uuid || char2.id);
        }

        // Draw first character icon
        if (char1ImageUrl) {
          const char1Image = await this.imageRenderer.getCachedImage(char1ImageUrl);
          // Draw circular clipped icon
          ctx.save();
          ctx.beginPath();
          ctx.arc(icon1X + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(char1Image, icon1X, iconY, iconSize, iconSize);
          ctx.restore();
        }

        // Draw second character icon
        if (char2ImageUrl) {
          const char2Image = await this.imageRenderer.getCachedImage(char2ImageUrl);
          // Draw circular clipped icon
          ctx.save();
          ctx.beginPath();
          ctx.arc(icon2X + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(char2Image, icon2X, iconY, iconSize, iconSize);
          ctx.restore();
        }
      } catch (error) {
        logger.warn('TokenGenerator', 'Failed to load jinx character icons', error);
      }

      // Draw jinx reason text using auto-fitting circular text layout
      const jinxY = diameter * JINX_TOKEN_LAYOUT.JINX_Y_POSITION;
      const preferredJinxFontSize = diameter * JINX_TOKEN_LAYOUT.JINX_FONT_SIZE_RATIO;
      const metaTextFont = this.options.metaTextFont || this.options.abilityTextFont;
      const metaTextColor = this.options.metaTextColor || DEFAULT_COLORS.META_TEXT;

      // Determine max Y based on whether names are shown
      const maxYRatio =
        metaTextLocation === 'none'
          ? JINX_TOKEN_LAYOUT.JINX_TEXT_MAX_Y_NO_NAME
          : JINX_TOKEN_LAYOUT.JINX_TEXT_MAX_Y_WITH_NAME;
      const maxY = diameter * maxYRatio;

      ctx.save();
      ctx.font = `${preferredJinxFontSize}px ${metaTextFont}`;
      ctx.fillStyle = metaTextColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 2;

      // Use auto-fitting circular text layout to ensure text fits within bounds
      const layout = calculateFittedCircularTextLayout(
        ctx,
        jinx.reason,
        diameter,
        preferredJinxFontSize,
        JINX_TOKEN_LAYOUT.JINX_LINE_HEIGHT,
        jinxY,
        maxY,
        JINX_TOKEN_LAYOUT.JINX_CIRCULAR_PADDING,
        metaTextFont,
        { minFontSizeRatio: JINX_TOKEN_LAYOUT.JINX_MIN_FONT_SIZE_RATIO }
      );

      // Update font to actual size used (may have been reduced to fit)
      ctx.font = `${layout.actualFontSize}px ${metaTextFont}`;

      // Draw each line centered
      let currentY = jinxY;
      for (const line of layout.lines) {
        ctx.fillText(line, center.x, currentY);
        currentY += layout.lineHeight;
      }
      ctx.restore();

      if (layout.wasReduced) {
        logger.debug(
          'TokenGenerator',
          `Drew jinx token with ${layout.lines.length} lines (font reduced from ${preferredJinxFontSize.toFixed(1)} to ${layout.actualFontSize.toFixed(1)})`
        );
      } else {
        logger.debug('TokenGenerator', `Drew jinx token with ${layout.lines.length} lines of text`);
      }
    });
  }
}
