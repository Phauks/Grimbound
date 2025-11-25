/**
 * Blood on the Clocktower Token Generator
 * Token Generator - Canvas operations for token generation
 */

import CONFIG from './config.js';
import { loadImage, loadLocalImage, getContrastColor } from './utils.js';
import { getCharacterImageUrl, countReminders } from './dataLoader.js';
import type { Character, Token, GenerationOptions, ProgressCallback, Team, ScriptMeta } from './types/index.js';

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
            } else {
                // For bottom text, flip 180 degrees to face outward
                rotation += Math.PI;
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
     * Generate a script name token
     * @param scriptName - Script name to display
     * @param author - Optional author name
     * @returns Generated canvas element
     */
    async generateScriptNameToken(scriptName: string, author?: string): Promise<HTMLCanvasElement> {
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

        // Create circular clipping path for background
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
            // Fallback to solid color if background fails
            ctx.fillStyle = '#1a1a1a';
            ctx.fill();
        }

        // Restore context to remove clipping path before drawing text
        ctx.restore();

        // Draw script name in center (large, word-wrapped)
        this.drawCenteredText(ctx, scriptName.toUpperCase(), diameter);

        // Draw author curved at bottom if provided
        if (author) {
            this.drawCurvedText(
                ctx,
                author,
                center.x,
                center.y,
                radius * 0.85,
                this.options.characterNameFont,
                diameter * CONFIG.FONTS.CHARACTER_NAME.SIZE_RATIO * 0.7,
                'bottom'
            );
        }

        return canvas;
    }

    /**
     * Generate a Pandemonium Institute token
     * @returns Generated canvas element
     */
    async generatePandemoniumToken(): Promise<HTMLCanvasElement> {
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

        // Create circular clipping path for background
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
            // Fallback to solid color if background fails
            ctx.fillStyle = '#1a1a1a';
            ctx.fill();
        }

        // Restore context to remove clipping path before drawing text
        ctx.restore();

        // Draw "PANDEMONIUM" and "INSTITUTE" in center (two lines)
        this.drawPandemoniumText(ctx, diameter);

        // Draw "BLOOD ON THE CLOCKTOWER" curved at bottom
        this.drawCurvedText(
            ctx,
            'BLOOD ON THE CLOCKTOWER',
            center.x,
            center.y,
            radius * 0.85,
            this.options.characterNameFont,
            diameter * CONFIG.FONTS.CHARACTER_NAME.SIZE_RATIO * 0.75,
            'bottom'
        );

        return canvas;
    }

    /**
     * Draw Pandemonium Institute text (two lines centered)
     * @param ctx - Canvas context
     * @param diameter - Token diameter
     */
    private drawPandemoniumText(ctx: CanvasRenderingContext2D, diameter: number): void {
        ctx.save();

        const fontSize = diameter * 0.11;
        ctx.font = `bold ${fontSize}px "${this.options.characterNameFont}", Georgia, serif`;
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Add shadow for readability
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        const lineHeight = fontSize * 1.3;
        const centerY = diameter / 2;

        // Draw "PANDEMONIUM" on first line
        ctx.fillText('PANDEMONIUM', diameter / 2, centerY - lineHeight / 2);
        // Draw "INSTITUTE" on second line
        ctx.fillText('INSTITUTE', diameter / 2, centerY + lineHeight / 2);

        ctx.restore();
    }

    /**
     * Draw centered text with word wrapping
     * @param ctx - Canvas context
     * @param text - Text to draw
     * @param diameter - Token diameter
     */
    private drawCenteredText(ctx: CanvasRenderingContext2D, text: string, diameter: number): void {
        ctx.save();

        const fontSize = diameter * 0.12;
        ctx.font = `bold ${fontSize}px "${this.options.characterNameFont}", Georgia, serif`;
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Add shadow for readability
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        // Word wrap the text
        const maxWidth = diameter * 0.75;
        const words = text.split(' ');
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

        // Draw lines centered vertically
        const lineHeight = fontSize * 1.3;
        const totalHeight = lines.length * lineHeight;
        const startY = (diameter - totalHeight) / 2 + fontSize / 2;

        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], diameter / 2, startY + i * lineHeight);
        }

        ctx.restore();
    }

    /**
     * Generate an almanac QR code token
     * @param almanacUrl - URL for the QR code
     * @param scriptName - Script name to overlay
     * @returns Generated canvas element
     */
    async generateAlmanacQRToken(almanacUrl: string, scriptName: string): Promise<HTMLCanvasElement> {
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

        // Create circular clipping path
        ctx.save();
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        // Fill with white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();

        // Generate QR code
        const qrSize = Math.floor(diameter * 0.8);
        const qrCanvas = await this.generateQRCode(almanacUrl, qrSize);

        // Draw QR code centered
        const qrOffset = (diameter - qrSize) / 2;
        ctx.drawImage(qrCanvas, qrOffset, qrOffset - diameter * 0.05, qrSize, qrSize);

        // Restore context
        ctx.restore();

        // Draw white box behind script name text
        const boxWidth = diameter * 0.45;
        const boxHeight = diameter * 0.15;
        const boxX = (diameter - boxWidth) / 2;
        const boxY = (diameter - boxHeight) / 2 - diameter * 0.05;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

        // Draw script name in center using LHF Unlovable font
        this.drawQROverlayText(ctx, scriptName.toUpperCase(), diameter);

        // Draw "ALMANAC" curved at bottom
        this.drawCurvedText(
            ctx,
            'ALMANAC',
            center.x,
            center.y,
            radius * 0.85,
            this.options.characterNameFont,
            diameter * CONFIG.FONTS.CHARACTER_NAME.SIZE_RATIO,
            'bottom',
            '#000000'
        );

        return canvas;
    }

    /**
     * Generate QR code canvas
     * @param text - Text to encode
     * @param size - QR code size
     * @returns Canvas with QR code
     */
    private async generateQRCode(text: string, size: number): Promise<HTMLCanvasElement> {
        return new Promise((resolve, reject) => {
            const QRCodeLib = window.QRCode;
            if (!QRCodeLib) {
                reject(new Error('QRCode library not loaded'));
                return;
            }

            // Create a temporary container
            const container = document.createElement('div');
            container.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
            document.body.appendChild(container);

            try {
                // Generate QR code with high error correction
                new QRCodeLib(container, {
                    text: text,
                    width: size,
                    height: size,
                    colorDark: '#000000',
                    colorLight: '#FFFFFF',
                    correctLevel: 3 // QRCode.CorrectLevel.H = 3 (30% error recovery)
                });

                // Wait a bit for the QR code to be generated
                setTimeout(() => {
                    const qrCanvas = container.querySelector('canvas');
                    if (qrCanvas) {
                        // Clone the canvas
                        const resultCanvas = document.createElement('canvas');
                        resultCanvas.width = qrCanvas.width;
                        resultCanvas.height = qrCanvas.height;
                        const resultCtx = resultCanvas.getContext('2d');
                        if (resultCtx) {
                            resultCtx.drawImage(qrCanvas, 0, 0);
                        }
                        document.body.removeChild(container);
                        resolve(resultCanvas);
                    } else {
                        document.body.removeChild(container);
                        reject(new Error('Failed to generate QR code canvas'));
                    }
                }, 100);
            } catch (error) {
                document.body.removeChild(container);
                reject(error);
            }
        });
    }

    /**
     * Draw text overlay on QR code
     * @param ctx - Canvas context
     * @param text - Text to draw
     * @param diameter - Token diameter
     */
    private drawQROverlayText(ctx: CanvasRenderingContext2D, text: string, diameter: number): void {
        ctx.save();

        const fontSize = diameter * 0.08;
        ctx.font = `bold ${fontSize}px "LHF Unlovable", Georgia, serif`;
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Word wrap the text for long names
        const maxWidth = diameter * 0.4;
        const words = text.split(' ');
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

        // Draw lines centered vertically (slightly above center)
        const lineHeight = fontSize * 1.2;
        const totalHeight = lines.length * lineHeight;
        const startY = (diameter - totalHeight) / 2 + fontSize / 2 - diameter * 0.05;

        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], diameter / 2, startY + i * lineHeight);
        }

        ctx.restore();
    }

    /**
     * Clear image cache
     */
    clearCache(): void {
        this.imageCache.clear();
    }

}

/**
 * Generate all tokens for a list of characters
 * @param characters - Array of character objects
 * @param options - Generation options
 * @param progressCallback - Progress callback function
 * @param scriptMeta - Optional script metadata for meta tokens
 * @returns Array of token objects with canvas and metadata
 */
export async function generateAllTokens(
    characters: Character[],
    options: Partial<GenerationOptions> = {},
    progressCallback: ProgressCallback | null = null,
    scriptMeta: ScriptMeta | null = null
): Promise<Token[]> {
    const generator = new TokenGenerator(options);
    const tokens: Token[] = [];
    const nameCount = new Map<string, number>();

    // Calculate total including meta tokens
    let metaTokenCount = 0;
    if (options.pandemoniumToken) {
        metaTokenCount++;
    }
    if (options.scriptNameToken && scriptMeta?.name) {
        metaTokenCount++;
    }
    if (options.almanacToken && scriptMeta?.almanac) {
        metaTokenCount++;
    }

    let processed = 0;
    // Calculate total: characters + reminders + meta tokens
    let total = characters.reduce((sum, char) => {
        return sum + 1 + (char.reminders?.length ?? 0);
    }, 0) + metaTokenCount;

    // Generate meta tokens first
    if (options.pandemoniumToken) {
        try {
            const pandemoniumCanvas = await generator.generatePandemoniumToken();
            tokens.push({
                type: 'pandemonium',
                name: 'Pandemonium Institute',
                filename: 'pandemonium_institute',
                team: 'meta',
                canvas: pandemoniumCanvas
            });
        } catch (error) {
            console.error('Failed to generate pandemonium token:', error);
        }

        processed++;
        if (progressCallback) {
            progressCallback(processed, total);
        }
    }

    if (options.scriptNameToken && scriptMeta?.name) {
        try {
            const scriptNameCanvas = await generator.generateScriptNameToken(
                scriptMeta.name,
                scriptMeta.author
            );
            tokens.push({
                type: 'script-name',
                name: scriptMeta.name,
                filename: 'script_name',
                team: 'meta',
                canvas: scriptNameCanvas
            });
        } catch (error) {
            console.error('Failed to generate script name token:', error);
        }

        processed++;
        if (progressCallback) {
            progressCallback(processed, total);
        }
    }

    if (options.almanacToken && scriptMeta?.almanac && scriptMeta?.name) {
        try {
            const almanacCanvas = await generator.generateAlmanacQRToken(
                scriptMeta.almanac,
                scriptMeta.name
            );
            tokens.push({
                type: 'almanac',
                name: `${scriptMeta.name} Almanac`,
                filename: 'almanac_qr',
                team: 'meta',
                canvas: almanacCanvas
            });
        } catch (error) {
            console.error('Failed to generate almanac QR token:', error);
        }

        processed++;
        if (progressCallback) {
            progressCallback(processed, total);
        }
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
