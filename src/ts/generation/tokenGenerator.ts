/**
 * Blood on the Clocktower Token Generator
 * Token Generator - Canvas operations for token generation
 */

import CONFIG from '../config.js';
import {
    CHARACTER_LAYOUT,
    REMINDER_LAYOUT,
    META_TOKEN_LAYOUT,
    QR_TOKEN_LAYOUT,
    LINE_HEIGHTS,
    TOKEN_COUNT_BADGE,
    DEFAULT_COLORS,
    QR_COLORS,
    TokenType,
    type TokenTypeValue
} from '../constants.js';
import { loadImage, loadLocalImage, globalImageCache, logger } from '../utils/index.js';
import { isBuiltInAsset, getBuiltInAssetPath } from '../constants/builtInAssets.js';
import { isAssetReference, resolveAssetUrl } from '../services/upload/assetResolver.js';
import type { AssetType } from '../services/upload/types.js';
import {
    drawImageCover,
    createCircularClipPath,
    createCanvas,
    type Point,
    type CanvasContext,
    calculateCircularTextLayout,
    type TextLayoutResult
} from '../canvas/index.js';
import {
    drawCurvedText,
    drawCenteredWrappedText,
    drawTwoLineCenteredText,
    drawAbilityText,
    drawQROverlayText
} from '../canvas/index.js';
import { drawLeaves, type LeafDrawingOptions, renderBackground } from '../canvas/index.js';
import { generateStyledQRCode } from '../canvas/qrGeneration.js';
import type { BackgroundStyle } from '../types/backgroundEffects.js';
import { getCharacterImageUrl, countReminders } from '../data/index.js';
import type { Character, ReminderCountStyle } from '../types/index.js';
import {
    type TokenGeneratorOptions,
    type MetaTokenContentRenderer,
    DEFAULT_TOKEN_OPTIONS
} from '../types/tokenOptions.js';
import {
    IconLayoutStrategyFactory,
    type IconLayoutStrategy,
    type LayoutContext
} from './iconLayoutStrategies.js';
import { TokenCreationError, ValidationError } from '../errors.js';
import { dataSyncService } from '../sync/index.js';

// Re-export generateAllTokens for backward compatibility
export { generateAllTokens } from './batchGenerator.js';

// ============================================================================
// REMINDER COUNT FORMATTING
// ============================================================================

/**
 * Format reminder count based on the selected style
 * @param count - The numeric count to format
 * @param style - The display style (arabic, roman, circled, dots)
 * @returns Formatted string representation
 */
function formatReminderCount(count: number, style: ReminderCountStyle = 'arabic'): string {
    switch (style) {
        case 'roman':
            // Roman numerals up to 10
            const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
            return romanNumerals[count - 1] || count.toString();
        case 'circled':
            // Unicode circled numbers (① = U+2460, starts at code point 0x2460 for 1)
            if (count >= 1 && count <= 20) {
                return String.fromCodePoint(0x245F + count);
            }
            return count.toString();
        case 'dots':
            // Bullet points representation
            return '\u2022'.repeat(count); // Unicode bullet •
        case 'arabic':
        default:
            return count.toString();
    }
}

// ============================================================================
// TOKEN GENERATOR CLASS
// ============================================================================

/**
 * TokenGenerator class handles all canvas operations for creating tokens
 */
export class TokenGenerator {
    private options: TokenGeneratorOptions;
    // Note: Using globalImageCache singleton instead of instance cache
    // for better cache utilization across regenerations

    constructor(options: Partial<TokenGeneratorOptions> = {}) {
        this.options = { ...DEFAULT_TOKEN_OPTIONS, ...options };
        if (options.fontSpacing) {
            this.options.fontSpacing = { ...DEFAULT_TOKEN_OPTIONS.fontSpacing, ...options.fontSpacing };
        }
        if (options.textShadow) {
            this.options.textShadow = { ...DEFAULT_TOKEN_OPTIONS.textShadow, ...options.textShadow };
        }
    }

    /** Update generator options */
    updateOptions(newOptions: Partial<TokenGeneratorOptions>): void {
        this.options = { ...this.options, ...newOptions };
    }

    // ========================================================================
    // IMAGE CACHING (using global singleton)
    // ========================================================================

    async getCachedImage(url: string): Promise<HTMLImageElement> {
        return globalImageCache.get(url, false);
    }

    async getLocalImage(path: string): Promise<HTMLImageElement> {
        return globalImageCache.get(path, true);
    }

    clearCache(): void {
        globalImageCache.clear();
    }

    /**
     * Pre-warm the image cache with all character images
     * This improves performance by loading all images before generation starts
     * @param characters - Array of characters to pre-load images for
     */
    async prewarmImageCache(characters: Character[]): Promise<void> {
        const imageUrls = new Set<string>();

        // Collect all unique image URLs
        for (const character of characters) {
            const url = getCharacterImageUrl(character.image);
            if (url) {
                imageUrls.add(url);
            }
        }

        // Pre-load all images in parallel
        await Promise.allSettled(
            Array.from(imageUrls).map(url => this.getCachedImage(url))
        );
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

    /**
     * Resolve a decorative asset value to a loadable image URL/path
     * Handles built-in asset IDs, user-uploaded asset references, and legacy paths
     */
    private async resolveDecorativeAsset(
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

    private async drawBackground(
        ctx: CanvasRenderingContext2D,
        backgroundName: string,
        diameter: number,
        fallbackColor: string = DEFAULT_COLORS.FALLBACK_BACKGROUND
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
        } catch {
            if (!this.options.transparentBackground) {
                ctx.fillStyle = fallbackColor;
                ctx.fill();
            }
        }
    }

    // ========================================================================
    // CHARACTER TOKEN GENERATION
    // ========================================================================

    async generateCharacterToken(character: Character, imageOverride?: string): Promise<HTMLCanvasElement> {
        // Input validation
        if (!character?.name) {
            throw new ValidationError('Character must have a name');
        }
        if (this.options.dpi <= 0) {
            throw new ValidationError('DPI must be positive');
        }

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
                ctx.fillStyle = this.options.characterBackgroundColor || '#FFFFFF';
                ctx.fill();
            }
        } else {
            await this.drawBackground(ctx, this.options.characterBackground, diameter);
        }
        
        // Determine ability text to display
        const abilityTextToDisplay = this.options.displayAbilityText ? character.ability : undefined;
        const hasAbilityText = Boolean(abilityTextToDisplay?.trim());

        // Calculate text layout once (replaces redundant calculation)
        let abilityTextLayout: TextLayoutResult | undefined;
        if (hasAbilityText) {
            abilityTextLayout = this.calculateAbilityTextLayout(ctx, abilityTextToDisplay!, diameter);
        }

        // Draw character image with adjusted layout based on ability text presence
        await this.drawCharacterImage(
            ctx,
            character,
            diameter,
            TokenType.CHARACTER,
            imageOverride,
            hasAbilityText,
            abilityTextLayout
        );

        if (character.setup) {
            await this.drawSetupFlower(ctx, diameter);
        }

        ctx.restore();

        if (this.options.leafEnabled !== false && this.options.maximumLeaves > 0) {
            await this.drawLeavesOnToken(ctx, diameter);
        }

        if (hasAbilityText) {
            this.drawCharacterAbilityText(ctx, abilityTextToDisplay!, diameter);
        }

        if (character.name) {
            this.drawCharacterName(ctx, character.name, center, radius, diameter);
        }

        if (this.options.tokenCount) {
            const reminderCount = countReminders(character);
            if (reminderCount > 0) {
                this.drawTokenCount(ctx, reminderCount, diameter);
            }
        }

        return canvas;
    }

    /**
     * Calculate ability text layout (optimized version using cached layout calculation)
     * @param ctx - Canvas context
     * @param ability - Ability text
     * @param diameter - Token diameter
     * @returns Text layout result with lines and height
     */
    private calculateAbilityTextLayout(ctx: CanvasRenderingContext2D, ability: string, diameter: number): TextLayoutResult {
        ctx.save();
        const fontSize = diameter * CONFIG.FONTS.ABILITY_TEXT.SIZE_RATIO;
        ctx.font = `${fontSize}px "${this.options.abilityTextFont}", sans-serif`;
        const lineHeightMultiplier = CONFIG.FONTS.ABILITY_TEXT.LINE_HEIGHT ?? LINE_HEIGHTS.STANDARD;
        const startY = diameter * CHARACTER_LAYOUT.ABILITY_TEXT_Y_POSITION;

        // Use optimized circular text layout calculation
        const layout = calculateCircularTextLayout(
            ctx,
            ability,
            diameter,
            fontSize,
            lineHeightMultiplier,
            startY,
            CHARACTER_LAYOUT.ABILITY_TEXT_CIRCULAR_PADDING
        );

        ctx.restore();
        return layout;
    }

    /**
     * Draw character image on token (optimized with layout strategies)
     * @param ctx - Canvas context
     * @param character - Character data
     * @param diameter - Token diameter
     * @param tokenType - Type of token
     * @param imageOverride - Optional image URL override
     * @param hasAbilityText - Whether character has ability text
     * @param abilityTextLayout - Pre-calculated ability text layout
     */
    private async drawCharacterImage(
        ctx: CanvasRenderingContext2D,
        character: Character,
        diameter: number,
        tokenType: TokenTypeValue,
        imageOverride?: string,
        hasAbilityText?: boolean,
        abilityTextLayout?: TextLayoutResult
    ): Promise<void> {
        const imageUrl = imageOverride || getCharacterImageUrl(character.image);
        if (!imageUrl) return;

        try {
            const charImage = await this.getCachedImage(imageUrl);

            // Get icon settings for this token type
            const defaultIconSettings = { scale: 1.0, offsetX: 0, offsetY: 0 };
            const iconSettings = this.options.iconSettings?.[tokenType as 'character' | 'reminder' | 'meta'] || defaultIconSettings;

            // Create layout context (offsets are in inches, converted to pixels in strategy)
            const layoutContext: LayoutContext = {
                diameter,
                dpi: this.options.dpi || 300,
                iconScale: iconSettings.scale,
                iconOffsetX: iconSettings.offsetX,
                iconOffsetY: iconSettings.offsetY
            };

            // Get appropriate layout strategy
            let strategy: IconLayoutStrategy;
            if (tokenType === TokenType.CHARACTER) {
                const abilityTextStartY = abilityTextLayout ? diameter * CHARACTER_LAYOUT.ABILITY_TEXT_Y_POSITION : undefined;
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
            ctx.drawImage(
                charImage,
                layout.position.x,
                layout.position.y,
                layout.size,
                layout.size
            );
        } catch (error) {
            throw new TokenCreationError(
                `Failed to load character image`,
                character.name,
                error instanceof Error ? error : new Error(String(error))
            );
        }
    }

    private async drawSetupFlower(ctx: CanvasRenderingContext2D, diameter: number): Promise<void> {
        try {
            const flowerPath = await this.resolveDecorativeAsset(
                this.options.setupFlowerStyle,
                'setup-flower',
                CONFIG.ASSETS.SETUP_FLOWERS
            );

            if (!flowerPath) return;

            // Determine if it's a local path or a blob URL
            const flowerImage = flowerPath.startsWith('blob:')
                ? await this.getCachedImage(flowerPath)
                : await this.getLocalImage(flowerPath);
            drawImageCover(ctx, flowerImage, diameter, diameter);
        } catch (error) {
            // Log warning but don't throw - setup flower is optional decoration
            logger.warn('TokenGenerator', `Could not load setup flower: ${this.options.setupFlowerStyle}`, error);
        }
    }

    private async drawLeavesOnToken(ctx: CanvasRenderingContext2D, diameter: number): Promise<void> {
        const leafOptions: LeafDrawingOptions = {
            maximumLeaves: this.options.maximumLeaves,
            leafPopulationProbability: this.options.leafPopulationProbability,
            leafGeneration: this.options.leafGeneration,
            leafArcSpan: this.options.leafArcSpan,
            leafSlots: this.options.leafSlots,
            enableLeftLeaf: this.options.enableLeftLeaf,
            enableRightLeaf: this.options.enableRightLeaf,
            sideLeafProbability: this.options.sideLeafProbability
        };
        await drawLeaves(ctx, diameter, leafOptions);
    }

    private drawCharacterAbilityText(ctx: CanvasRenderingContext2D, ability: string, diameter: number): void {
        drawAbilityText(
            ctx, ability, diameter,
            this.options.abilityTextFont,
            CONFIG.FONTS.ABILITY_TEXT.SIZE_RATIO,
            CONFIG.FONTS.ABILITY_TEXT.LINE_HEIGHT ?? LINE_HEIGHTS.STANDARD,
            CHARACTER_LAYOUT.ABILITY_TEXT_MAX_WIDTH,
            CHARACTER_LAYOUT.ABILITY_TEXT_Y_POSITION,
            this.options.abilityTextColor,
            this.options.fontSpacing.abilityText,
            this.options.textShadow?.abilityText ?? 3
        );
    }

    private drawCharacterName(
        ctx: CanvasRenderingContext2D,
        name: string,
        center: Point,
        radius: number,
        diameter: number
    ): void {
        drawCurvedText(ctx, {
            text: name.toUpperCase(),
            centerX: center.x,
            centerY: center.y,
            radius: radius * CHARACTER_LAYOUT.CURVED_TEXT_RADIUS,
            fontFamily: this.options.characterNameFont,
            fontSize: diameter * CONFIG.FONTS.CHARACTER_NAME.SIZE_RATIO,
            position: 'bottom',
            color: this.options.characterNameColor,
            letterSpacing: this.options.fontSpacing.characterName,
            shadowBlur: this.options.textShadow?.characterName ?? 4
        });
    }

    private drawTokenCount(ctx: CanvasRenderingContext2D, count: number, diameter: number): void {
        ctx.save();
        const fontSize = diameter * CONFIG.FONTS.TOKEN_COUNT.SIZE_RATIO;
        ctx.font = `bold ${fontSize}px "${this.options.characterNameFont}", Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const y = diameter * CHARACTER_LAYOUT.TOKEN_COUNT_Y_POSITION;

        // Format the count based on the selected style
        const style = this.options.reminderCountStyle || 'arabic';
        const displayText = formatReminderCount(count, style);

        // Adjust badge size for dots style (wider)
        const badgeRadius = style === 'dots'
            ? fontSize * TOKEN_COUNT_BADGE.BACKGROUND_RADIUS * (1 + count * 0.15)
            : fontSize * TOKEN_COUNT_BADGE.BACKGROUND_RADIUS;

        ctx.beginPath();
        ctx.arc(diameter / 2, y, badgeRadius, 0, Math.PI * 2);
        ctx.fillStyle = DEFAULT_COLORS.BADGE_BACKGROUND;
        ctx.fill();
        ctx.strokeStyle = DEFAULT_COLORS.TEXT_PRIMARY;
        ctx.lineWidth = TOKEN_COUNT_BADGE.STROKE_WIDTH;
        ctx.stroke();

        ctx.fillStyle = DEFAULT_COLORS.TEXT_PRIMARY;
        ctx.fillText(displayText, diameter / 2, y);
        ctx.restore();
    }

    // ========================================================================
    // REMINDER TOKEN GENERATION
    // ========================================================================

    async generateReminderToken(character: Character, reminderText: string, imageOverride?: string): Promise<HTMLCanvasElement> {
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
            await this.drawBackground(ctx, bgImage, diameter);
        } else {
            if (!this.options.transparentBackground) {
                ctx.fillStyle = this.options.reminderBackground;
                ctx.fill();
            }
        }

        await this.drawCharacterImage(ctx, character, diameter, TokenType.REMINDER, imageOverride);
        ctx.restore();

        drawCurvedText(ctx, {
            text: reminderText.toUpperCase(),
            centerX: center.x,
            centerY: center.y,
            radius: radius * REMINDER_LAYOUT.CURVED_TEXT_RADIUS,
            fontFamily: this.options.characterReminderFont,
            fontSize: diameter * CONFIG.FONTS.REMINDER_TEXT.SIZE_RATIO,
            position: 'bottom',
            color: this.options.reminderTextColor,
            letterSpacing: this.options.fontSpacing.reminderText,
            shadowBlur: this.options.textShadow?.reminderText ?? 4
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
                ctx.fillStyle = this.options.metaBackgroundColor || '#FFFFFF';
                ctx.fill();
            }
        } else {
            const bgName = backgroundOverride || this.options.metaBackground || this.options.characterBackground;
            await this.drawBackground(ctx, bgName, diameter);
        }

        ctx.restore();

        await renderContent(ctx, diameter, center, radius);
        return canvas;
    }

    async generateScriptNameToken(scriptName: string, author?: string, hideAuthor?: boolean): Promise<HTMLCanvasElement> {
        const metaFont = this.options.metaNameFont || this.options.characterNameFont;
        const metaColor = this.options.metaNameColor || DEFAULT_COLORS.TEXT_PRIMARY;
        
        // Try to load custom logo if provided
        let logoImage: HTMLImageElement | null = null;
        if (this.options.logoUrl) {
            try {
                logoImage = await this.getCachedImage(this.options.logoUrl);
            } catch {
                // Silently fall back to text-only token
                logoImage = null;
            }
        }
        
        return this.generateMetaToken(async (ctx, diameter, center, radius) => {
            if (logoImage) {
                // Draw logo image centered on token
                const maxSize = diameter * 0.7;
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
                
                const x = center.x - drawWidth / 2;
                const y = center.y - drawHeight / 2;
                ctx.drawImage(logoImage, x, y, drawWidth, drawHeight);
            } else {
                // Fall back to text-only
                drawCenteredWrappedText(ctx, {
                    text: scriptName.toUpperCase(),
                    diameter,
                    fontFamily: metaFont,
                    fontSizeRatio: META_TOKEN_LAYOUT.CENTERED_TEXT_SIZE,
                    maxWidthRatio: META_TOKEN_LAYOUT.CENTERED_TEXT_MAX_WIDTH,
                    color: metaColor,
                    shadowBlur: this.options.textShadow?.metaText ?? 4
                });
            }

            if (author && !hideAuthor) {
                drawCurvedText(ctx, {
                    text: author,
                    centerX: center.x,
                    centerY: center.y,
                    radius: radius * CHARACTER_LAYOUT.CURVED_TEXT_RADIUS,
                    fontFamily: metaFont,
                    fontSize: diameter * CONFIG.FONTS.CHARACTER_NAME.SIZE_RATIO * META_TOKEN_LAYOUT.AUTHOR_TEXT_SIZE_FACTOR,
                    position: 'bottom',
                    color: metaColor,
                    letterSpacing: this.options.fontSpacing.metaText ?? 0,
                    shadowBlur: this.options.textShadow?.metaText ?? 4
                });
            }
        });
    }

    async generatePandemoniumToken(): Promise<HTMLCanvasElement> {
        // Load the Pandemonium Institute image
        const pandemoniumImage = await this.getCachedImage('/images/Pandemonium_Institute/the_pandemonium_institute.webp');
        
        return this.generateMetaToken(async (ctx, diameter, center) => {
            // Draw image centered on token
            const maxSize = diameter * 0.75;
            const aspectRatio = pandemoniumImage.width / pandemoniumImage.height;
            let drawWidth: number, drawHeight: number;
            
            if (aspectRatio > 1) {
                // Wider than tall
                drawWidth = Math.min(pandemoniumImage.width, maxSize);
                drawHeight = drawWidth / aspectRatio;
            } else {
                // Taller than wide or square
                drawHeight = Math.min(pandemoniumImage.height, maxSize);
                drawWidth = drawHeight * aspectRatio;
            }
            
            const x = center.x - drawWidth / 2;
            const y = center.y - drawHeight / 2;
            ctx.drawImage(pandemoniumImage, x, y, drawWidth, drawHeight);
        });
    }

    async generateAlmanacQRToken(almanacUrl: string, scriptName: string, scriptLogoUrl?: string): Promise<HTMLCanvasElement> {
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
                const logoImage = await this.getCachedImage(scriptLogoUrl);

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
            await this.drawBackground(ctx, bgName, diameter);
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
            errorCorrectionLevel
        });

        // Draw QR code centered on token
        ctx.drawImage(qrCanvas, qrOffset, qrOffset, qrSize, qrSize);

        // Optionally draw "ALMANAC" curved at bottom
        if (showAlmanacLabel) {
            drawCurvedText(ctx, {
                text: 'ALMANAC',
                centerX: center.x,
                centerY: center.y,
                radius: radius * QR_TOKEN_LAYOUT.SCRIPT_NAME_RADIUS,
                fontFamily: this.options.metaNameFont || this.options.characterNameFont,
                fontSize: diameter * QR_TOKEN_LAYOUT.SCRIPT_NAME_SIZE,
                position: 'bottom',
                color: QR_COLORS.GRADIENT_END,
                letterSpacing: this.options.fontSpacing.metaText ?? 0,
                shadowBlur: 0
            });
        }

        return canvas;
    }

    /**
     * Lighten a hex color by a percentage
     */
    private lightenColor(hex: string, percent: number): string {
        const color = hex.replace('#', '');
        const r = parseInt(color.slice(0, 2), 16);
        const g = parseInt(color.slice(2, 4), 16);
        const b = parseInt(color.slice(4, 6), 16);
        const factor = percent / 100;
        const newR = Math.round(r + (255 - r) * factor);
        const newG = Math.round(g + (255 - g) * factor);
        const newB = Math.round(b + (255 - b) * factor);
        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    }

    /**
     * Draw a rounded rectangle path
     */
    private roundedRectPath(
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
    async generateBootleggerToken(abilityText: string, normalizedLayout?: TextLayoutResult): Promise<HTMLCanvasElement> {
        const diameter = CONFIG.TOKEN.ROLE_DIAMETER_INCHES * this.options.dpi;
        const { canvas, ctx, center, radius } = this.createBaseCanvas(diameter);

        this.applyCircularClip(ctx, center, radius);

        // Draw background (same as character tokens)
        if (this.options.characterBackgroundType === 'color') {
            if (!this.options.transparentBackground) {
                ctx.fillStyle = this.options.characterBackgroundColor || '#FFFFFF';
                ctx.fill();
            }
        } else {
            await this.drawBackground(ctx, this.options.characterBackground, diameter);
        }

        // Bootlegger tokens always have ability text
        const hasAbilityText = Boolean(abilityText?.trim());
        let abilityTextLayout: TextLayoutResult | undefined;
        if (hasAbilityText) {
            abilityTextLayout = this.calculateAbilityTextLayout(ctx, abilityText, diameter);
        }

        // Use normalized layout for icon sizing if provided (for consistent icon sizes)
        const layoutForIcon = normalizedLayout || abilityTextLayout;

        // Draw Bootlegger character image
        await this.drawBootleggerImage(ctx, diameter, hasAbilityText, layoutForIcon);

        ctx.restore();

        // Draw leaves if enabled
        if (this.options.leafEnabled !== false && this.options.maximumLeaves > 0) {
            await this.drawLeavesOnToken(ctx, diameter);
        }

        // Always draw ability text for bootlegger tokens
        if (hasAbilityText) {
            this.drawCharacterAbilityText(ctx, abilityText, diameter);
        }

        // Draw "BOOTLEGGER" at the bottom (like character name) unless hidden
        if (!this.options.bootleggerHideName) {
            this.drawCharacterName(ctx, 'Bootlegger', center, radius, diameter);
        }

        return canvas;
    }

    /**
     * Calculate ability text layout for a bootlegger token without drawing.
     * Used for pre-calculating layouts to normalize icon sizes.
     * @param abilityText - The ability text to calculate layout for
     * @returns The calculated text layout result
     */
    calculateBootleggerLayout(abilityText: string): TextLayoutResult | undefined {
        const diameter = CONFIG.TOKEN.ROLE_DIAMETER_INCHES * this.options.dpi;
        const { ctx } = this.createBaseCanvas(diameter);

        if (!abilityText?.trim()) {
            return undefined;
        }

        return this.calculateAbilityTextLayout(ctx, abilityText, diameter);
    }

    /**
     * Draw Bootlegger token image.
     * Uses either the official Bootlegger art or the script logo based on options.
     */
    private async drawBootleggerImage(
        ctx: CanvasRenderingContext2D,
        diameter: number,
        hasAbilityText: boolean,
        abilityTextLayout?: TextLayoutResult
    ): Promise<void> {
        let imageUrl: string | null = null;
        let blobToRevoke: string | null = null;

        // Check if we should use script logo instead of bootlegger icon
        const useScriptLogo = this.options.bootleggerIconType === 'script';

        if (useScriptLogo && this.options.logoUrl) {
            // Use script logo
            imageUrl = this.options.logoUrl;
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
                logger.warn('TokenGenerator', 'Failed to load Bootlegger image from sync', error);
            }

            // Fallback: try loading from local asset if sync failed
            if (!imageUrl) {
                try {
                    // Attempt a fallback URL path
                    imageUrl = '/images/icons/bootlegger.webp';
                } catch {
                    logger.warn('TokenGenerator', 'No Bootlegger fallback image available');
                }
            }
        }

        if (!imageUrl) {
            logger.warn('TokenGenerator', 'No Bootlegger image available, token will be missing icon');
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
                iconOffsetY: iconSettings.offsetY
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
            ctx.drawImage(
                charImage,
                drawX,
                drawY,
                drawWidth,
                drawHeight
            );
        } catch (error) {
            logger.error('TokenGenerator', 'Failed to draw Bootlegger image', error);
        } finally {
            // Clean up blob URL if we created one
            if (blobToRevoke) {
                URL.revokeObjectURL(blobToRevoke);
            }
        }
    }
}

export default { TokenGenerator };
