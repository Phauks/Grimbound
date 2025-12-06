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
    QR_COLORS
} from '../constants.js';
import { loadImage, loadLocalImage, globalImageCache } from '../utils/index.js';
import { drawImageCover, createCircularClipPath, createCanvas, type Point, type CanvasContext } from '../canvas/index.js';
import {
    drawCurvedText,
    drawCenteredWrappedText,
    drawTwoLineCenteredText,
    drawAbilityText,
    drawQROverlayText
} from '../canvas/index.js';
import { drawLeaves, type LeafDrawingOptions } from '../canvas/index.js';
import { generateQRCode } from '../canvas/index.js';
import { getCharacterImageUrl, countReminders } from '../data/index.js';
import type { Character } from '../types/index.js';
import {
    type TokenGeneratorOptions,
    type MetaTokenContentRenderer,
    DEFAULT_TOKEN_OPTIONS
} from '../types/tokenOptions.js';

// Re-export generateAllTokens for backward compatibility
export { generateAllTokens } from './batchGenerator.js';

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

    private async drawBackground(
        ctx: CanvasRenderingContext2D,
        backgroundName: string,
        diameter: number,
        fallbackColor: string = DEFAULT_COLORS.FALLBACK_BACKGROUND
    ): Promise<void> {
        try {
            const bgPath = `${CONFIG.ASSETS.CHARACTER_BACKGROUNDS}${backgroundName}.png`;
            const bgImage = await this.getLocalImage(bgPath);
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
        const diameter = CONFIG.TOKEN.ROLE_DIAMETER_INCHES * this.options.dpi;
        const { canvas, ctx, center, radius } = this.createBaseCanvas(diameter);

        this.applyCircularClip(ctx, center, radius);
        
        // Draw background based on type selection
        if (this.options.characterBackgroundType === 'color') {
            if (!this.options.transparentBackground) {
                ctx.fillStyle = this.options.characterBackgroundColor || '#FFFFFF';
                ctx.fill();
            }
        } else {
            await this.drawBackground(ctx, this.options.characterBackground, diameter);
        }
        
        // Determine if ability text will be displayed
        const hasAbilityText = Boolean(this.options.displayAbilityText && character.ability);
        
        // Calculate optimal icon size when ability text is present
        let abilityTextHeight = 0;
        if (hasAbilityText) {
            abilityTextHeight = this.calculateAbilityTextHeight(ctx, character.ability!, diameter);
        }
        
        // Draw character image with adjusted layout based on ability text presence
        await this.drawCharacterImage(ctx, character, diameter, CHARACTER_LAYOUT, 'character', imageOverride, hasAbilityText, abilityTextHeight);

        if (character.setup) {
            await this.drawSetupFlower(ctx, diameter);
        }

        ctx.restore();

        if (this.options.maximumLeaves > 0) {
            await this.drawLeavesOnToken(ctx, diameter);
        }

        if (hasAbilityText) {
            this.drawCharacterAbilityText(ctx, character.ability!, diameter);
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

    private calculateAbilityTextHeight(ctx: CanvasRenderingContext2D, ability: string, diameter: number): number {
        ctx.save();
        const fontSize = diameter * CONFIG.FONTS.ABILITY_TEXT.SIZE_RATIO;
        ctx.font = `${fontSize}px "${this.options.abilityTextFont}", sans-serif`;
        const lineHeight = fontSize * (CONFIG.FONTS.ABILITY_TEXT.LINE_HEIGHT ?? LINE_HEIGHTS.STANDARD);
        
        // Calculate how many lines the ability text will take
        const radius = diameter / 2;
        const centerY = diameter / 2;
        const startY = diameter * CHARACTER_LAYOUT.ABILITY_TEXT_Y_POSITION;
        const words = ability.split(' ');
        let lineCount = 0;
        let currentLine = '';
        let currentY = startY;
        
        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const testWidth = ctx.measureText(testLine).width;
            const distanceFromCenter = Math.abs(currentY + fontSize / 2 - centerY);
            const halfWidth = distanceFromCenter < radius ? Math.sqrt(radius * radius - distanceFromCenter * distanceFromCenter) : 0;
            const availableWidth = 2 * halfWidth * CHARACTER_LAYOUT.ABILITY_TEXT_CIRCULAR_PADDING;
            
            if (testWidth <= availableWidth || !currentLine) {
                currentLine = testLine;
            } else {
                lineCount++;
                currentLine = word;
                currentY += lineHeight;
            }
        }
        if (currentLine) lineCount++;
        
        ctx.restore();
        return lineCount * lineHeight;
    }

    private async drawCharacterImage(
        ctx: CanvasRenderingContext2D,
        character: Character,
        diameter: number,
        layout: typeof CHARACTER_LAYOUT | typeof REMINDER_LAYOUT,
        tokenType: 'character' | 'reminder' | 'meta',
        imageOverride?: string,
        hasAbilityText?: boolean,
        abilityTextHeight?: number
    ): Promise<void> {
        const imageUrl = imageOverride || getCharacterImageUrl(character.image);
        if (!imageUrl) return;

        try {
            const charImage = await this.getCachedImage(imageUrl);

            // Get icon settings for this token type
            const defaultIconSettings = { scale: 1.0, offsetX: 0, offsetY: 0 };
            const iconSettings = this.options.iconSettings?.[tokenType] || defaultIconSettings;

            // Adjust size and position based on ability text presence (only for character tokens)
            // Use default values if layout doesn't specify (CHARACTER_LAYOUT doesn't have these, REMINDER_LAYOUT does)
            let imageSizeRatio = 'IMAGE_SIZE_RATIO' in layout ? layout.IMAGE_SIZE_RATIO : 1.0;
            let verticalOffset = 'IMAGE_VERTICAL_OFFSET' in layout ? layout.IMAGE_VERTICAL_OFFSET : 0.05;
            
            if (tokenType === 'character' && hasAbilityText !== undefined) {
                // Character name is at the bottom (curved text)
                const characterNameY = diameter * CHARACTER_LAYOUT.CURVED_TEXT_RADIUS;
                
                if (hasAbilityText && abilityTextHeight !== undefined) {
                    // Dynamic sizing: maximize icon space between ability text and character name
                    const abilityTextStartY = diameter * CHARACTER_LAYOUT.ABILITY_TEXT_Y_POSITION;
                    const abilityTextEndY = abilityTextStartY + abilityTextHeight;
                    
                    // Calculate available vertical space for icon
                    const availableHeight = characterNameY - abilityTextEndY;
                    
                    // Use configured ratio of available space for optimal appearance
                    const optimalSize = availableHeight * CHARACTER_LAYOUT.ICON_SPACE_RATIO_WITH_ABILITY;
                    
                    // Calculate the ratio
                    imageSizeRatio = optimalSize / diameter;
                    
                    // Center icon vertically in the available space
                    const iconCenterY = abilityTextEndY + availableHeight / 2;
                    verticalOffset = (diameter / 2 - iconCenterY) / diameter;
                } else {
                    // Without ability text: dynamic sizing between top margin and character name
                    const topMargin = diameter * CHARACTER_LAYOUT.NO_ABILITY_TOP_MARGIN;
                    
                    // Calculate available vertical space for icon
                    const availableHeight = characterNameY - topMargin;
                    
                    // Use configured ratio of available space for optimal appearance
                    const optimalSize = availableHeight * CHARACTER_LAYOUT.ICON_SPACE_RATIO_NO_ABILITY;
                    
                    // Calculate the ratio
                    imageSizeRatio = optimalSize / diameter;
                    
                    // Center icon vertically in the available space
                    const iconCenterY = topMargin + availableHeight / 2;
                    verticalOffset = (diameter / 2 - iconCenterY) / diameter;
                }
            }

            // Apply icon scale
            const imgSize = diameter * imageSizeRatio * iconSettings.scale;

            // Calculate base offset (centers the image)
            const baseOffsetX = (diameter - imgSize) / 2;
            const baseOffsetY = (diameter - imgSize) / 2 - diameter * verticalOffset;

            // Apply user-defined offsets
            const offsetX = baseOffsetX + iconSettings.offsetX;
            const offsetY = baseOffsetY + iconSettings.offsetY;

            ctx.drawImage(
                charImage,
                offsetX,
                offsetY,
                imgSize,
                imgSize
            );
        } catch (error) {
            console.warn(`Could not load character image for ${character.name}`, error);
        }
    }

    private async drawSetupFlower(ctx: CanvasRenderingContext2D, diameter: number): Promise<void> {
        try {
            const flowerPath = `${CONFIG.ASSETS.SETUP_FLOWERS}${this.options.setupFlowerStyle}.png`;
            const flowerImage = await this.getLocalImage(flowerPath);
            drawImageCover(ctx, flowerImage, diameter, diameter);
        } catch {
            console.warn('Could not load setup flower');
        }
    }

    private async drawLeavesOnToken(ctx: CanvasRenderingContext2D, diameter: number): Promise<void> {
        const leafOptions: LeafDrawingOptions = {
            maximumLeaves: this.options.maximumLeaves,
            leafPopulationProbability: this.options.leafPopulationProbability,
            leafGeneration: this.options.leafGeneration,
            leafArcSpan: this.options.leafArcSpan,
            leafSlots: this.options.leafSlots
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

        ctx.beginPath();
        ctx.arc(diameter / 2, y, fontSize * TOKEN_COUNT_BADGE.BACKGROUND_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = DEFAULT_COLORS.BADGE_BACKGROUND;
        ctx.fill();
        ctx.strokeStyle = DEFAULT_COLORS.TEXT_PRIMARY;
        ctx.lineWidth = TOKEN_COUNT_BADGE.STROKE_WIDTH;
        ctx.stroke();

        ctx.fillStyle = DEFAULT_COLORS.TEXT_PRIMARY;
        ctx.fillText(count.toString(), diameter / 2, y);
        ctx.restore();
    }

    // ========================================================================
    // REMINDER TOKEN GENERATION
    // ========================================================================

    async generateReminderToken(character: Character, reminderText: string): Promise<HTMLCanvasElement> {
        const diameter = CONFIG.TOKEN.REMINDER_DIAMETER_INCHES * this.options.dpi;
        const { canvas, ctx, center, radius } = this.createBaseCanvas(diameter);

        this.applyCircularClip(ctx, center, radius);

        // Draw background based on type selection
        if (this.options.reminderBackgroundType === 'image') {
            const bgImage = this.options.reminderBackgroundImage || 'character_background_1';
            await this.drawBackground(ctx, bgImage, diameter);
        } else {
            if (!this.options.transparentBackground) {
                ctx.fillStyle = this.options.reminderBackground;
                ctx.fill();
            }
        }

        await this.drawCharacterImage(ctx, character, diameter, REMINDER_LAYOUT, 'reminder');
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
        if (this.options.metaBackgroundType === 'color') {
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

    async generateScriptNameToken(scriptName: string, author?: string): Promise<HTMLCanvasElement> {
        const metaFont = this.options.metaNameFont || this.options.characterNameFont;
        const metaColor = this.options.metaNameColor || DEFAULT_COLORS.TEXT_PRIMARY;
        
        return this.generateMetaToken((ctx, diameter, center, radius) => {
            drawCenteredWrappedText(ctx, {
                text: scriptName.toUpperCase(),
                diameter,
                fontFamily: metaFont,
                fontSizeRatio: META_TOKEN_LAYOUT.CENTERED_TEXT_SIZE,
                maxWidthRatio: META_TOKEN_LAYOUT.CENTERED_TEXT_MAX_WIDTH,
                color: metaColor,
                shadowBlur: this.options.textShadow?.metaText ?? 4
            });

            if (author) {
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
        const metaFont = this.options.metaNameFont || this.options.characterNameFont;
        const metaColor = this.options.metaNameColor || DEFAULT_COLORS.TEXT_PRIMARY;
        
        return this.generateMetaToken((ctx, diameter, center, radius) => {
            drawTwoLineCenteredText(
                ctx, 'PANDEMONIUM', 'INSTITUTE', diameter,
                metaFont,
                META_TOKEN_LAYOUT.PANDEMONIUM_TEXT_SIZE,
                metaColor,
                this.options.textShadow?.metaText ?? 4
            );

            drawCurvedText(ctx, {
                text: 'BLOOD ON THE CLOCKTOWER',
                centerX: center.x,
                centerY: center.y,
                radius: radius * CHARACTER_LAYOUT.CURVED_TEXT_RADIUS,
                fontFamily: metaFont,
                fontSize: diameter * CONFIG.FONTS.CHARACTER_NAME.SIZE_RATIO * META_TOKEN_LAYOUT.BOTC_TEXT_SIZE_FACTOR,
                position: 'bottom',
                color: metaColor,
                letterSpacing: this.options.fontSpacing.metaText ?? 0,
                shadowBlur: this.options.textShadow?.metaText ?? 4
            });
        });
    }

    async generateAlmanacQRToken(almanacUrl: string, scriptName: string): Promise<HTMLCanvasElement> {
        const diameter = CONFIG.TOKEN.ROLE_DIAMETER_INCHES * this.options.dpi;
        const { canvas, ctx, center, radius } = this.createBaseCanvas(diameter);

        this.applyCircularClip(ctx, center, radius);

        const bgName = this.options.metaBackground || this.options.characterBackground;
        await this.drawBackground(ctx, bgName, diameter, QR_COLORS.LIGHT);

        // Generate and draw QR code
        const qrSize = Math.floor(diameter * QR_TOKEN_LAYOUT.QR_CODE_SIZE);
        const qrCanvas = await generateQRCode({ text: almanacUrl, size: qrSize });
        const qrOffset = (diameter - qrSize) / 2;
        ctx.drawImage(qrCanvas, qrOffset, qrOffset - diameter * QR_TOKEN_LAYOUT.QR_VERTICAL_OFFSET, qrSize, qrSize);

        ctx.restore();

        // Draw white box behind script name
        const boxWidth = diameter * QR_TOKEN_LAYOUT.TEXT_BOX_WIDTH;
        const boxHeight = diameter * QR_TOKEN_LAYOUT.TEXT_BOX_HEIGHT;
        const boxX = (diameter - boxWidth) / 2;
        const boxY = (diameter - boxHeight) / 2 - diameter * QR_TOKEN_LAYOUT.QR_VERTICAL_OFFSET;
        ctx.fillStyle = QR_COLORS.LIGHT;
        ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

        drawQROverlayText(
            ctx, scriptName.toUpperCase(), diameter, 'LHF Unlovable',
            QR_TOKEN_LAYOUT.OVERLAY_TEXT_SIZE,
            QR_TOKEN_LAYOUT.OVERLAY_TEXT_MAX_WIDTH,
            QR_TOKEN_LAYOUT.QR_VERTICAL_OFFSET,
            QR_COLORS.DARK
        );

        drawCurvedText(ctx, {
            text: 'ALMANAC',
            centerX: center.x,
            centerY: center.y,
            radius: radius * CHARACTER_LAYOUT.CURVED_TEXT_RADIUS,
            fontFamily: this.options.metaNameFont || this.options.characterNameFont,
            fontSize: diameter * CONFIG.FONTS.CHARACTER_NAME.SIZE_RATIO,
            position: 'bottom',
            color: QR_COLORS.DARK,
            letterSpacing: this.options.fontSpacing.metaText ?? 0,
            shadowBlur: 0
        });

        return canvas;
    }
}

export default { TokenGenerator };
