/**
 * Blood on the Clocktower Token Generator
 * Token Image Renderer - Handles image rendering for tokens
 *
 * Extracted from TokenGenerator to follow Single Responsibility Principle.
 * This class focuses solely on rendering images on tokens.
 */

import CONFIG from '../config.js';
import {
    CHARACTER_LAYOUT,
    TokenType,
    type TokenTypeValue
} from '../constants.js';
import { loadImage, loadLocalImage } from '../utils/index.js';
import {
    drawImageCover,
    type CanvasContext
} from '../canvas/index.js';
import { getCharacterImageUrl } from '../data/index.js';
import type { Character } from '../types/index.js';
import type { TokenGeneratorOptions } from '../types/tokenOptions.js';
import {
    IconLayoutStrategyFactory,
    type IconLayoutStrategy,
    type LayoutContext
} from './iconLayoutStrategies.js';
import type { TextLayoutResult } from '../canvas/canvasOptimizations.js';
import { TokenCreationError } from '../errors.js';
import { logger } from '../utils/logger.js';

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
     * Draw background on canvas
     */
    async drawBackground(
        ctx: CanvasRenderingContext2D,
        backgroundName: string,
        diameter: number,
        fallbackColor: string
    ): Promise<void> {
        try {
            const bgPath = `${CONFIG.ASSETS.CHARACTER_BACKGROUNDS}${backgroundName}.png`;
            const bgImage = await this.getLocalImage(bgPath);
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

            logger.debug('TokenImageRenderer', 'Drew character image', {
                character: character.name,
                size: layout.size,
                position: layout.position
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
     * Draw setup flower decoration
     */
    async drawSetupFlower(ctx: CanvasRenderingContext2D, diameter: number): Promise<void> {
        try {
            const flowerPath = `${CONFIG.ASSETS.SETUP_FLOWERS}${this.options.setupFlowerStyle}.png`;
            const flowerImage = await this.getLocalImage(flowerPath);
            drawImageCover(ctx, flowerImage, diameter, diameter);
            logger.debug('TokenImageRenderer', 'Drew setup flower', this.options.setupFlowerStyle);
        } catch (error) {
            logger.warn('TokenImageRenderer', `Could not load setup flower: ${this.options.setupFlowerStyle}`, error);
        }
    }

    /**
     * Draw leaves decoration
     */
    async drawLeaves(ctx: CanvasRenderingContext2D, diameter: number): Promise<void> {
        // Import dynamically to avoid circular dependencies
        const { drawLeaves } = await import('../canvas/index.js');
        const leafOptions = {
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
        logger.debug('TokenImageRenderer', 'Drew leaves', { maxLeaves: this.options.maximumLeaves });
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
        const pandemoniumImage = await this.getCachedImage('/images/Pandemonium_Institute/the_pandemonium_institute.webp');

        const maxSize = diameter * 0.75;
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
}

export default TokenImageRenderer;
