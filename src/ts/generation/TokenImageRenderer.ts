/**
 * Blood on the Clocktower Token Generator
 * Token Image Renderer - Handles image rendering for tokens
 *
 * Extracted from TokenGenerator to follow Single Responsibility Principle.
 * This class focuses solely on rendering images on tokens.
 */

import type { TextLayoutResult } from '@/ts/canvas/canvasOptimizations.js';
import { drawImageCover } from '@/ts/canvas/index.js';
import CONFIG from '@/ts/config.js';
import { getBuiltInAssetPath, isBuiltInAsset } from '@/ts/constants/builtInAssets.js';
import {
  CHARACTER_LAYOUT,
  META_TOKEN_LAYOUT,
  TokenType,
  type TokenTypeValue,
} from '@/ts/constants.js';
import { getCharacterImageUrl } from '@/ts/data/index.js';
import { TokenCreationError } from '@/ts/errors.js';
import { isAssetReference, resolveAssetUrl } from '@/ts/services/upload/assetResolver.js';
import type { AssetType } from '@/ts/services/upload/types.js';
import { dataSyncService } from '@/ts/sync/index.js';
import type { Character } from '@/ts/types/index.js';
import type { TokenGeneratorOptions } from '@/ts/types/tokenOptions.js';
import { logger } from '@/ts/utils/logger.js';
import {
  type IconLayoutStrategy,
  IconLayoutStrategyFactory,
  type LayoutContext,
} from './iconLayoutStrategies.js';

/**
 * Image cache interface for dependency injection
 */
export interface IImageCache {
  get(url: string, isLocal: boolean): Promise<HTMLImageElement>;
  clear(): void;
}

/**
 * Handles all image rendering operations for tokens
 */
export class TokenImageRenderer {
  private options: TokenGeneratorOptions;
  private imageCache: IImageCache;

  constructor(options: TokenGeneratorOptions, imageCache: IImageCache) {
    this.options = options;
    this.imageCache = imageCache;
  }

  /**
   * Update renderer options
   */
  updateOptions(options: Partial<TokenGeneratorOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get cached image from URL
   */
  async getCachedImage(url: string): Promise<HTMLImageElement> {
    return this.imageCache.get(url, false);
  }

  /**
   * Get local image from path
   */
  async getLocalImage(path: string): Promise<HTMLImageElement> {
    return this.imageCache.get(path, true);
  }

  /**
   * Resolve a decorative asset value to a loadable image URL/path
   * Handles built-in asset IDs, user-uploaded asset references, and legacy paths
   * @param value - Asset identifier (ID, reference, or filename)
   * @param assetType - Type of asset for built-in lookup
   * @param legacyPathPrefix - Path prefix for legacy filename patterns
   * @returns Resolved URL/path or null if not found
   */
  async resolveDecorativeAsset(
    value: string,
    assetType: AssetType,
    legacyPathPrefix: string
  ): Promise<string | null> {
    if (!value || value === 'none') return null;

    // Check if it's a user-uploaded asset reference (asset:uuid)
    if (isAssetReference(value)) {
      const resolvedUrl = await resolveAssetUrl(value);
      return resolvedUrl || null;
    }

    // Check if it's a built-in asset ID
    if (isBuiltInAsset(value, assetType)) {
      return getBuiltInAssetPath(value, assetType);
    }

    // Legacy fallback: treat as filename pattern
    return `${legacyPathPrefix}${value}.png`;
  }

  /**
   * Draw background on canvas
   * @param ctx - Canvas rendering context
   * @param backgroundName - Background asset name/ID/reference
   * @param diameter - Token diameter
   * @param fallbackColor - Fallback color if background fails to load
   */
  async drawBackground(
    ctx: CanvasRenderingContext2D,
    backgroundName: string,
    diameter: number,
    fallbackColor: string
  ): Promise<void> {
    try {
      const bgPath = await this.resolveDecorativeAsset(
        backgroundName,
        'token-background',
        CONFIG.ASSETS.CHARACTER_BACKGROUNDS
      );

      if (!bgPath) {
        if (!this.options.transparentBackground) {
          ctx.fillStyle = fallbackColor;
          ctx.fill();
        }
        return;
      }

      // Determine if it's a local path or a blob URL
      const bgImage = bgPath.startsWith('blob:')
        ? await this.getCachedImage(bgPath)
        : await this.getLocalImage(bgPath);
      drawImageCover(ctx, bgImage, diameter, diameter);
    } catch (error) {
      logger.warn('TokenImageRenderer', `Failed to load background: ${backgroundName}`, error);
      if (!this.options.transparentBackground) {
        ctx.fillStyle = fallbackColor;
        ctx.fill();
      }
    }
  }

  /**
   * Draw character image on token
   */
  async drawCharacterImage(
    ctx: CanvasRenderingContext2D,
    character: Character,
    diameter: number,
    tokenType: TokenTypeValue,
    imageOverride?: string,
    hasAbilityText?: boolean,
    abilityTextLayout?: TextLayoutResult
  ): Promise<void> {
    const imageUrl = imageOverride || getCharacterImageUrl(character.image);
    if (!imageUrl) {
      logger.debug('TokenImageRenderer', 'No image URL for character', character.name);
      return;
    }

    try {
      const charImage = await this.getCachedImage(imageUrl);

      // Get icon settings for this token type
      const defaultIconSettings = { scale: 1.0, offsetX: 0, offsetY: 0 };
      const iconSettings =
        this.options.iconSettings?.[tokenType as 'character' | 'reminder' | 'meta'] ||
        defaultIconSettings;

      // Create layout context (offsets are in inches, converted to pixels in strategy)
      const layoutContext: LayoutContext = {
        diameter,
        dpi: this.options.dpi || 300,
        iconScale: iconSettings.scale,
        iconOffsetX: iconSettings.offsetX,
        iconOffsetY: iconSettings.offsetY,
      };

      // Get appropriate layout strategy
      let strategy: IconLayoutStrategy;
      if (tokenType === TokenType.CHARACTER) {
        const abilityTextStartY = abilityTextLayout
          ? diameter * CHARACTER_LAYOUT.ABILITY_TEXT_Y_POSITION
          : undefined;
        strategy = IconLayoutStrategyFactory.create(
          tokenType,
          hasAbilityText,
          abilityTextLayout?.totalHeight,
          abilityTextStartY
        );
      } else {
        strategy = IconLayoutStrategyFactory.create(tokenType);
      }

      // Calculate layout using strategy
      const layout = strategy.calculate(layoutContext);

      // Draw image at calculated position
      ctx.drawImage(charImage, layout.position.x, layout.position.y, layout.size, layout.size);

      logger.debug('TokenImageRenderer', 'Drew character image', {
        character: character.name,
        size: layout.size,
        position: layout.position,
      });
    } catch (error) {
      throw new TokenCreationError(
        `Failed to load character image`,
        character.name,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Draw setup overlay decoration
   * @param ctx - Canvas rendering context
   * @param diameter - Token diameter
   */
  async drawSetupOverlay(ctx: CanvasRenderingContext2D, diameter: number): Promise<void> {
    try {
      const overlayPath = await this.resolveDecorativeAsset(
        this.options.setupStyle,
        'setup-overlay',
        CONFIG.ASSETS.SETUP_OVERLAYS
      );

      if (!overlayPath) return;

      // Determine if it's a local path or a blob URL
      const overlayImage = overlayPath.startsWith('blob:')
        ? await this.getCachedImage(overlayPath)
        : await this.getLocalImage(overlayPath);
      drawImageCover(ctx, overlayImage, diameter, diameter);
      logger.debug('TokenImageRenderer', 'Drew setup overlay', this.options.setupStyle);
    } catch (error) {
      logger.warn(
        'TokenImageRenderer',
        `Could not load setup overlay: ${this.options.setupStyle}`,
        error
      );
    }
  }

  /**
   * Draw accents decoration
   */
  async drawAccents(ctx: CanvasRenderingContext2D, diameter: number): Promise<void> {
    // Import dynamically to avoid circular dependencies
    const { drawAccents } = await import('../canvas/index.js');
    const accentOptions = {
      maximumAccents: this.options.maximumAccents,
      accentPopulationProbability: this.options.accentPopulationProbability,
      accentGeneration: this.options.accentGeneration,
      accentArcSpan: this.options.accentArcSpan,
      accentSlots: this.options.accentSlots,
      enableLeftAccent: this.options.enableLeftAccent,
      enableRightAccent: this.options.enableRightAccent,
      sideAccentProbability: this.options.sideAccentProbability,
    };
    await drawAccents(ctx, diameter, accentOptions);
    logger.debug('TokenImageRenderer', 'Drew accents', { maxAccents: this.options.maximumAccents });
  }

  /**
   * Draw logo image for script name token
   */
  async drawLogo(
    ctx: CanvasRenderingContext2D,
    logoUrl: string,
    diameter: number,
    centerX: number,
    centerY: number
  ): Promise<boolean> {
    try {
      const logoImage = await this.getCachedImage(logoUrl);

      // Calculate size maintaining aspect ratio
      const maxSize = diameter * META_TOKEN_LAYOUT.LOGO_MAX_SIZE_RATIO;
      const aspectRatio = logoImage.width / logoImage.height;
      let drawWidth: number, drawHeight: number;

      if (aspectRatio > 1) {
        // Wider than tall
        drawWidth = Math.min(logoImage.width, maxSize);
        drawHeight = drawWidth / aspectRatio;
      } else {
        // Taller than wide or square
        drawHeight = Math.min(logoImage.height, maxSize);
        drawWidth = drawHeight * aspectRatio;
      }

      const x = centerX - drawWidth / 2;
      const y = centerY - drawHeight / 2;
      ctx.drawImage(logoImage, x, y, drawWidth, drawHeight);

      logger.debug('TokenImageRenderer', 'Drew logo', { width: drawWidth, height: drawHeight });
      return true;
    } catch (error) {
      logger.warn('TokenImageRenderer', 'Failed to load logo', error);
      return false;
    }
  }

  /**
   * Draw Pandemonium Institute image
   */
  async drawPandemoniumImage(
    ctx: CanvasRenderingContext2D,
    diameter: number,
    centerX: number,
    centerY: number
  ): Promise<void> {
    const pandemoniumImage = await this.getCachedImage(
      `${CONFIG.ASSETS.IMAGES}Pandemonium_Institute/the_pandemonium_institute.webp`
    );

    const maxSize = diameter * META_TOKEN_LAYOUT.PANDEMONIUM_IMAGE_MAX_SIZE_RATIO;
    const aspectRatio = pandemoniumImage.width / pandemoniumImage.height;
    let drawWidth: number, drawHeight: number;

    if (aspectRatio > 1) {
      drawWidth = Math.min(pandemoniumImage.width, maxSize);
      drawHeight = drawWidth / aspectRatio;
    } else {
      drawHeight = Math.min(pandemoniumImage.height, maxSize);
      drawWidth = drawHeight * aspectRatio;
    }

    const x = centerX - drawWidth / 2;
    const y = centerY - drawHeight / 2;
    ctx.drawImage(pandemoniumImage, x, y, drawWidth, drawHeight);

    logger.debug('TokenImageRenderer', 'Drew Pandemonium Institute image');
  }

  /**
   * Draw Bootlegger token image.
   * Uses either the official Bootlegger art or the script logo based on options.
   * @param ctx - Canvas rendering context
   * @param diameter - Token diameter
   * @param hasAbilityText - Whether ability text is present
   * @param abilityTextLayout - Pre-calculated text layout for positioning
   * @param useScriptLogo - Whether to use script logo instead of bootlegger icon
   * @param logoUrl - URL of the script logo (if useScriptLogo is true)
   */
  async drawBootleggerImage(
    ctx: CanvasRenderingContext2D,
    diameter: number,
    hasAbilityText: boolean,
    abilityTextLayout?: TextLayoutResult,
    useScriptLogo?: boolean,
    logoUrl?: string
  ): Promise<void> {
    let imageUrl: string | null = null;
    let blobToRevoke: string | null = null;

    if (useScriptLogo && logoUrl) {
      // Use script logo
      imageUrl = logoUrl;
    } else {
      // Use Bootlegger character image
      try {
        // Try to get Bootlegger image from sync service
        const blob = await dataSyncService.getCharacterImage('bootlegger');
        if (blob) {
          imageUrl = URL.createObjectURL(blob);
          blobToRevoke = imageUrl;
        }
      } catch (error) {
        logger.warn('TokenImageRenderer', 'Failed to load Bootlegger image from sync', error);
      }

      // Fallback: try loading from local asset if sync failed
      if (!imageUrl) {
        try {
          // Attempt a fallback URL path
          imageUrl = `${CONFIG.ASSETS.IMAGES}icons/bootlegger.webp`;
        } catch {
          logger.warn('TokenImageRenderer', 'No Bootlegger fallback image available');
        }
      }
    }

    if (!imageUrl) {
      logger.warn(
        'TokenImageRenderer',
        'No Bootlegger image available, token will be missing icon'
      );
      return;
    }

    try {
      const charImage = await this.getCachedImage(imageUrl);

      // Get icon settings for character type
      const defaultIconSettings = { scale: 1.0, offsetX: 0, offsetY: 0 };
      const iconSettings = this.options.iconSettings?.character || defaultIconSettings;

      // Create layout context
      const layoutContext: LayoutContext = {
        diameter,
        dpi: this.options.dpi || 300,
        iconScale: iconSettings.scale,
        iconOffsetX: iconSettings.offsetX,
        iconOffsetY: iconSettings.offsetY,
      };

      // Use character layout strategy since bootlegger looks like a character token
      const abilityTextStartY = abilityTextLayout
        ? diameter * CHARACTER_LAYOUT.ABILITY_TEXT_Y_POSITION
        : undefined;

      const strategy = IconLayoutStrategyFactory.create(
        TokenType.CHARACTER,
        hasAbilityText,
        abilityTextLayout?.totalHeight,
        abilityTextStartY
      );

      const layout = strategy.calculate(layoutContext);

      // Calculate draw dimensions - handle aspect ratio and scaling for script logos
      let drawWidth = layout.size;
      let drawHeight = layout.size;
      let drawX = layout.position.x;
      let drawY = layout.position.y;

      if (useScriptLogo) {
        // Script logos use a 1.0 space ratio instead of the 1.5x ratio used for character icons
        // This keeps the logo fully within the available space between ability text and name
        const scriptLogoScale = 1.0 / CHARACTER_LAYOUT.ICON_SPACE_RATIO_WITH_ABILITY;
        const scaledSize = layout.size * scriptLogoScale;

        // Handle aspect ratio - script logos may not be square
        const aspectRatio = charImage.width / charImage.height;

        if (aspectRatio > 1) {
          // Wider than tall
          drawWidth = scaledSize;
          drawHeight = scaledSize / aspectRatio;
        } else {
          // Taller than wide (or square)
          drawHeight = scaledSize;
          drawWidth = scaledSize * aspectRatio;
        }

        // Center the image within the original layout position
        drawX = layout.position.x + (layout.size - drawWidth) / 2;
        drawY = layout.position.y + (layout.size - drawHeight) / 2;
      }

      // Draw image at calculated position
      ctx.drawImage(charImage, drawX, drawY, drawWidth, drawHeight);

      logger.debug('TokenImageRenderer', 'Drew Bootlegger image', {
        useScriptLogo,
        size: { width: drawWidth, height: drawHeight },
      });
    } catch (error) {
      logger.error('TokenImageRenderer', 'Failed to draw Bootlegger image', error);
    } finally {
      // Clean up blob URL if we created one
      if (blobToRevoke) {
        URL.revokeObjectURL(blobToRevoke);
      }
    }
  }
}

export default TokenImageRenderer;
