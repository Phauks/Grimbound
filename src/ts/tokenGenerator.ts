/**
 * Blood on the Clocktower Token Generator
 * Token Generator - Canvas operations for token generation
 */

import CONFIG from './config.js';
import { loadImage, loadLocalImage, getContrastColor } from './utils.js';
import { getCharacterImageUrl, countReminders } from './dataLoader.js';
import type { Character, Token, GenerationOptions, ProgressCallback, Team } from './types/index.js';

/**
 * Token generator options
 */
interface TokenGeneratorOptions {
    roleDiameter: number;
    reminderDiameter: number;
    displayAbilityText: boolean;
    tokenCount: boolean;
    setupFlowerStyle: string;
    reminderBackground: string;
    characterBackground: string;
    characterNameFont: string;
    characterReminderFont: string;
}

/**
 * TokenGenerator class handles all canvas operations for creating tokens
 */
export class TokenGenerator {
    private options: TokenGeneratorOptions;
    private imageCache: Map<string, HTMLImageElement>;

    constructor(options: Partial<TokenGeneratorOptions> = {}) {
        this.options = {
            roleDiameter: options.roleDiameter ?? CONFIG.TOKEN.ROLE_DIAMETER,
            reminderDiameter: options.reminderDiameter ?? CONFIG.TOKEN.REMINDER_DIAMETER,
            displayAbilityText: options.displayAbilityText ?? CONFIG.TOKEN.DISPLAY_ABILITY_TEXT,
            tokenCount: options.tokenCount ?? CONFIG.TOKEN.TOKEN_COUNT,
            setupFlowerStyle: options.setupFlowerStyle ?? CONFIG.STYLE.SETUP_FLOWER_STYLE,
            reminderBackground: options.reminderBackground ?? CONFIG.STYLE.REMINDER_BACKGROUND,
            characterBackground: options.characterBackground ?? CONFIG.STYLE.CHARACTER_BACKGROUND,
            characterNameFont: options.characterNameFont ?? CONFIG.STYLE.CHARACTER_NAME_FONT,
            characterReminderFont: options.characterReminderFont ?? CONFIG.STYLE.CHARACTER_REMINDER_FONT
        };

        this.imageCache = new Map();
    }

    /**
     * Update generator options
     * @param newOptions - New options to apply
     */
    updateOptions(newOptions: Partial<TokenGeneratorOptions>): void {
        this.options = { ...this.options, ...newOptions };
    }

    /**
     * Load and cache an image
     * @param url - Image URL
     * @returns Loaded image element
     */
    async getCachedImage(url: string): Promise<HTMLImageElement> {
        const cachedImage = this.imageCache.get(url);
        if (cachedImage) {
            return cachedImage;
        }

        try {
            const img = await loadImage(url);
            this.imageCache.set(url, img);
            return img;
        } catch (error) {
            console.error(`Failed to load image: ${url}`, error);
            throw error;
        }
    }

    /**
     * Load a local asset image
     * @param path - Asset path
     * @returns Loaded image element
     */
    async getLocalImage(path: string): Promise<HTMLImageElement> {
        const cachedImage = this.imageCache.get(path);
        if (cachedImage) {
            return cachedImage;
        }

        try {
            const img = await loadLocalImage(path);
            this.imageCache.set(path, img);
            return img;
        } catch (error) {
            console.error(`Failed to load local image: ${path}`, error);
            throw error;
        }
    }

    /**
     * Generate a character token
     * @param character - Character data
     * @returns Generated canvas element
     */
    async generateCharacterToken(character: Character): Promise<HTMLCanvasElement> {
        const diameter = this.options.roleDiameter;
        const canvas = document.createElement('canvas');
        canvas.width = diameter;
        canvas.height = diameter;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            throw new Error('Failed to get canvas context');
        }

        // Enable high-quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const radius = diameter / 2;
        const center = { x: radius, y: radius };

        // Save initial state before clipping
        ctx.save();

        // Create circular clipping path for background and character image
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        // 1. Draw character background
        try {
            const bgPath = `${CONFIG.ASSETS.CHARACTER_BACKGROUNDS}${this.options.characterBackground}.png`;
            const bgImage = await this.getLocalImage(bgPath);
            this.drawImageCover(ctx, bgImage, diameter, diameter);
        } catch {
            // Fallback to solid color if background fails
            ctx.fillStyle = '#1a1a1a';
            ctx.fill();
        }

        // 2. Draw character image (centered)
        const imageUrl = getCharacterImageUrl(character.image);
        if (imageUrl) {
            try {
                const charImage = await this.getCachedImage(imageUrl);
                const imgSize = diameter * 0.65;
                const imgOffset = (diameter - imgSize) / 2;
                ctx.drawImage(charImage, imgOffset, imgOffset - diameter * 0.05, imgSize, imgSize);
            } catch (error) {
                console.warn(`Could not load character image for ${character.name}. This may be due to CORS restrictions. Token will be generated without portrait image.`, error);
            }
        }

        // 3. Draw setup flower if character has setup attribute
        if (character.setup) {
            try {
                const flowerPath = `${CONFIG.ASSETS.SETUP_FLOWERS}${this.options.setupFlowerStyle}.png`;
                const flowerImage = await this.getLocalImage(flowerPath);
                this.drawImageCover(ctx, flowerImage, diameter, diameter);
            } catch {
                console.warn('Could not load setup flower');
            }
        }

        // Restore context to remove clipping path before drawing text
        ctx.restore();

        // 4. Draw ability text if enabled
        if (this.options.displayAbilityText && character.ability) {
            this.drawAbilityText(ctx, character.ability, diameter);
        }

        // 5. Draw character name curved along bottom
        if (character.name) {
            this.drawCurvedText(
                ctx,
                character.name.toUpperCase(),
                center.x,
                center.y,
                radius * 0.85,
                this.options.characterNameFont,
                diameter * CONFIG.FONTS.CHARACTER_NAME.SIZE_RATIO,
                'bottom'
            );
        }

        // 6. Draw reminder count if enabled
        if (this.options.tokenCount) {
            const reminderCount = countReminders(character);
            if (reminderCount > 0) {
                this.drawTokenCount(ctx, reminderCount, diameter);
            }
        }

        return canvas;
    }

    /**
     * Generate a reminder token
     * @param character - Parent character data
     * @param reminderText - Reminder text
     * @returns Generated canvas element
     */
    async generateReminderToken(character: Character, reminderText: string): Promise<HTMLCanvasElement> {
        const diameter = this.options.reminderDiameter;
        const canvas = document.createElement('canvas');
        canvas.width = diameter;
        canvas.height = diameter;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            throw new Error('Failed to get canvas context');
        }

        // Enable high-quality rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const radius = diameter / 2;
        const center = { x: radius, y: radius };

        // Create circular clipping path
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        // 1. Fill with reminder background color
        ctx.fillStyle = this.options.reminderBackground;
        ctx.fill();

        // 2. Draw character image (centered, smaller)
        const imageUrl = getCharacterImageUrl(character.image);
        if (imageUrl) {
            try {
                const charImage = await this.getCachedImage(imageUrl);
                const imgSize = diameter * 0.5;
                const imgOffset = (diameter - imgSize) / 2;
                ctx.drawImage(charImage, imgOffset, imgOffset - diameter * 0.05, imgSize, imgSize);
            } catch (error) {
                console.warn(`Could not load character image for reminder: ${character.name}. This may be due to CORS restrictions. Token will be generated without portrait image.`, error);
            }
        }

        // Reset clipping for text
        ctx.restore();
        ctx.save();

        // 3. Draw reminder text curved along bottom
        const textColor = getContrastColor(this.options.reminderBackground);
        this.drawCurvedText(
            ctx,
            reminderText.toUpperCase(),
            center.x,
            center.y,
            radius * 0.85,
            this.options.characterReminderFont,
            diameter * CONFIG.FONTS.REMINDER_TEXT.SIZE_RATIO,
            'bottom',
            textColor
        );

        return canvas;
    }

    /**
     * Draw text curved along a circular path
     * @param ctx - Canvas context
     * @param text - Text to draw
     * @param centerX - Circle center X
     * @param centerY - Circle center Y
     * @param radius - Curve radius
     * @param fontFamily - Font family name
     * @param fontSize - Font size in pixels
     * @param position - 'top' or 'bottom'
     * @param color - Text color
     */
    drawCurvedText(
        ctx: CanvasRenderingContext2D,
        text: string,
        centerX: number,
        centerY: number,
        radius: number,
        fontFamily: string,
        fontSize: number,
        position: 'top' | 'bottom' = 'bottom',
        color: string = '#FFFFFF'
    ): void {
        ctx.save();

        ctx.font = `bold ${fontSize}px "${fontFamily}", Georgia, serif`;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Add text shadow for readability
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        // Measure total text width
        const totalWidth = ctx.measureText(text).width;

        // Calculate the angle span based on text width and radius
        // Limit to a maximum arc span to keep text readable
        const maxArcSpan = Math.PI * 0.7; // ~126 degrees
        const arcSpan = Math.min(totalWidth / radius, maxArcSpan);

        // Starting angle for bottom text (centered)
        let startAngle: number;
        if (position === 'bottom') {
            startAngle = Math.PI / 2 + arcSpan / 2;
        } else {
            startAngle = -Math.PI / 2 - arcSpan / 2;
        }

        // Calculate angle per character (proportional to character width)
        const charWidths: number[] = [];
        let totalCharWidth = 0;
        for (const char of text) {
            const width = ctx.measureText(char).width;
            charWidths.push(width);
            totalCharWidth += width;
        }

        // Draw each character
        let currentAngle = startAngle;
        const direction = position === 'bottom' ? -1 : 1;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const charWidth = charWidths[i];
            const charAngle = (charWidth / totalCharWidth) * arcSpan;

            currentAngle += direction * charAngle / 2;

            const x = centerX + radius * Math.cos(currentAngle);
            const y = centerY + radius * Math.sin(currentAngle);

            ctx.save();
            ctx.translate(x, y);

            // Rotate character to follow the curve
            let rotation = currentAngle + Math.PI / 2;
            if (position === 'top') {
                rotation -= Math.PI;
            }
            ctx.rotate(rotation);

            ctx.fillText(char, 0, 0);
            ctx.restore();

            currentAngle += direction * charAngle / 2;
        }

        ctx.restore();
    }

    /**
     * Draw ability text on token
     * @param ctx - Canvas context
     * @param ability - Ability text
     * @param diameter - Token diameter
     */
    drawAbilityText(ctx: CanvasRenderingContext2D, ability: string, diameter: number): void {
        ctx.save();

        const fontSize = diameter * CONFIG.FONTS.ABILITY_TEXT.SIZE_RATIO;
        ctx.font = `${fontSize}px "${this.options.characterReminderFont}", sans-serif`;
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // Add shadow for readability
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        // Word wrap the text
        const maxWidth = diameter * 0.7;
        const lineHeight = fontSize * (CONFIG.FONTS.ABILITY_TEXT.LINE_HEIGHT ?? 1.3);
        const words = ability.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            const metrics = ctx.measureText(testLine);

            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) {
            lines.push(currentLine);
        }

        // Draw lines centered vertically in upper portion of token
        const startY = diameter * 0.15;

        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], diameter / 2, startY + i * lineHeight);
        }

        ctx.restore();
    }

    /**
     * Draw reminder token count on character token
     * @param ctx - Canvas context
     * @param count - Number of reminders
     * @param diameter - Token diameter
     */
    drawTokenCount(ctx: CanvasRenderingContext2D, count: number, diameter: number): void {
        ctx.save();

        const fontSize = diameter * CONFIG.FONTS.TOKEN_COUNT.SIZE_RATIO;
        ctx.font = `bold ${fontSize}px "${this.options.characterNameFont}", Georgia, serif`;
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Draw at top of token
        const y = diameter * 0.12;

        // Add background circle
        ctx.beginPath();
        ctx.arc(diameter / 2, y, fontSize * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw count
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(count.toString(), diameter / 2, y);

        ctx.restore();
    }

    /**
     * Draw image to cover canvas (like CSS background-size: cover)
     * @param ctx - Canvas context
     * @param img - Image to draw
     * @param targetWidth - Target width
     * @param targetHeight - Target height
     */
    drawImageCover(
        ctx: CanvasRenderingContext2D,
        img: HTMLImageElement,
        targetWidth: number,
        targetHeight: number
    ): void {
        const imgRatio = img.width / img.height;
        const targetRatio = targetWidth / targetHeight;

        let drawWidth: number, drawHeight: number, drawX: number, drawY: number;

        if (imgRatio > targetRatio) {
            drawHeight = targetHeight;
            drawWidth = img.width * (targetHeight / img.height);
            drawX = (targetWidth - drawWidth) / 2;
            drawY = 0;
        } else {
            drawWidth = targetWidth;
            drawHeight = img.height * (targetWidth / img.width);
            drawX = 0;
            drawY = (targetHeight - drawHeight) / 2;
        }

        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    }

    /**
     * Clear image cache
     */
    clearCache(): void {
        this.imageCache.clear();
    }

    /**
     * Generate trademark/credit token
     * @returns Generated canvas element
     */
    async generateTrademarkToken(): Promise<HTMLCanvasElement> {
        const diameter = this.options.roleDiameter;
        const canvas = document.createElement('canvas');
        canvas.width = diameter;
        canvas.height = diameter;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            throw new Error('Failed to get canvas context');
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const radius = diameter / 2;
        const center = { x: radius, y: radius };

        ctx.save();

        // Create circular clipping path
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        // Draw character background
        try {
            const bgPath = `${CONFIG.ASSETS.CHARACTER_BACKGROUNDS}${this.options.characterBackground}.png`;
            const bgImage = await this.getLocalImage(bgPath);
            this.drawImageCover(ctx, bgImage, diameter, diameter);
        } catch {
            ctx.fillStyle = '#1a1a1a';
            ctx.fill();
        }

        // TBI: Draw Pandemonium Institute or BotC logo
        // Placeholder circle in center where logo will go
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.arc(center.x, center.y - diameter * 0.1, diameter * 0.25, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw "TBI" text as placeholder for logo
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = `${diameter * 0.08}px "${this.options.characterNameFont}", Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('TBI', center.x, center.y - diameter * 0.1);

        ctx.restore();

        // Draw ability text (trademark notice)
        const trademarkText = "Blood on the Clocktower is a product of the Pandemonium Institute";
        this.drawAbilityText(ctx, trademarkText, diameter);

        return canvas;
    }
}

/**
 * Generate all tokens for a list of characters
 * @param characters - Array of character objects
 * @param options - Generation options
 * @param progressCallback - Progress callback function
 * @returns Array of token objects with canvas and metadata
 */
export async function generateAllTokens(
    characters: Character[],
    options: Partial<GenerationOptions> = {},
    progressCallback: ProgressCallback | null = null
): Promise<Token[]> {
    const generator = new TokenGenerator(options);
    const tokens: Token[] = [];
    const nameCount = new Map<string, number>();

    let processed = 0;
    // Calculate total: characters + reminders + trademark token
    let total = characters.reduce((sum, char) => {
        return sum + 1 + (char.reminders?.length ?? 0);
    }, 0);
    total++; // Always add trademark token

    // Generate trademark token (always)
    try {
        const trademarkCanvas = await generator.generateTrademarkToken();
        tokens.push({
            type: 'character',
            name: 'Trademark',
            filename: 'botc_trademark',
            team: 'fabled' as Team,
            canvas: trademarkCanvas
        });
        processed++;
        if (progressCallback) progressCallback(processed, total);
    } catch (error) {
        console.error('Failed to generate trademark token:', error);
    }

    for (const character of characters) {
        if (!character.name) continue;

        // Generate character token
        try {
            const charCanvas = await generator.generateCharacterToken(character);
            const baseName = character.name.replace(/[^a-zA-Z0-9]/g, '_');

            // Handle duplicates
            if (!nameCount.has(baseName)) {
                nameCount.set(baseName, 0);
            }
            const count = nameCount.get(baseName) ?? 0;
            nameCount.set(baseName, count + 1);

            const filename = count === 0 ? baseName : `${baseName}_${String(count).padStart(2, '0')}`;

            tokens.push({
                type: 'character',
                name: character.name,
                filename: filename,
                team: (character.team || 'townsfolk') as Team,
                canvas: charCanvas,
                hasReminders: (character.reminders?.length ?? 0) > 0,
                reminderCount: character.reminders?.length ?? 0
            });
        } catch (error) {
            console.error(`Failed to generate token for ${character.name}:`, error);
        }

        processed++;
        if (progressCallback) {
            progressCallback(processed, total);
        }

        // Generate reminder tokens
        if (character.reminders && Array.isArray(character.reminders)) {
            const reminderCount = new Map<string, number>();

            for (const reminder of character.reminders) {
                try {
                    const reminderCanvas = await generator.generateReminderToken(character, reminder);
                    const reminderBaseName = `${character.name}_${reminder}`.replace(/[^a-zA-Z0-9]/g, '_');

                    // Handle duplicate reminders
                    if (!reminderCount.has(reminderBaseName)) {
                        reminderCount.set(reminderBaseName, 0);
                    }
                    const rCount = reminderCount.get(reminderBaseName) ?? 0;
                    reminderCount.set(reminderBaseName, rCount + 1);

                    const reminderFilename = rCount === 0 ? reminderBaseName : `${reminderBaseName}_${String(rCount).padStart(2, '0')}`;

                    tokens.push({
                        type: 'reminder',
                        name: `${character.name} - ${reminder}`,
                        filename: reminderFilename,
                        team: (character.team || 'townsfolk') as Team,
                        canvas: reminderCanvas,
                        parentCharacter: character.name,
                        reminderText: reminder
                    });
                } catch (error) {
                    console.error(`Failed to generate reminder token "${reminder}" for ${character.name}:`, error);
                }

                processed++;
                if (progressCallback) {
                    progressCallback(processed, total);
                }
            }
        }
    }

    return tokens;
}

export default {
    TokenGenerator,
    generateAllTokens
};
