/**
 * Blood on the Clocktower Token Generator
 * Icon Layout Strategies - Separate layout calculation from rendering
 */

import { CHARACTER_LAYOUT, REMINDER_LAYOUT, TokenType, type TokenTypeValue } from '../constants.js';
import type { Point } from '../canvas/index.js';

// ============================================================================
// LAYOUT RESULT TYPES
// ============================================================================

/**
 * Result of icon layout calculation
 */
export interface IconLayoutResult {
    size: number;
    position: Point;
}

/**
 * Context for layout calculations
 * Note: iconOffsetX and iconOffsetY are in INCHES (canonical unit)
 * They are converted to pixels using the dpi parameter
 */
export interface LayoutContext {
    diameter: number;
    dpi: number;
    iconScale: number;
    /** Horizontal offset in inches */
    iconOffsetX: number;
    /** Vertical offset in inches */
    iconOffsetY: number;
}

// ============================================================================
// LAYOUT STRATEGY INTERFACE
// ============================================================================

/**
 * Strategy interface for calculating icon layout
 */
export interface IconLayoutStrategy {
    /**
     * Calculate icon size and position
     * @param context - Layout context with diameter and icon settings
     * @returns Layout result with size and position
     */
    calculate(context: LayoutContext): IconLayoutResult;
}

// ============================================================================
// CHARACTER TOKEN LAYOUT STRATEGIES
// ============================================================================

/**
 * Layout strategy for character tokens with ability text
 */
export class CharacterWithAbilityTextLayout implements IconLayoutStrategy {
    constructor(
        private abilityTextHeight: number,
        private abilityTextStartY: number
    ) {}

    calculate(context: LayoutContext): IconLayoutResult {
        const { diameter, dpi, iconScale, iconOffsetX, iconOffsetY } = context;

        // Convert inch offsets to pixels
        const offsetXPixels = iconOffsetX * dpi;
        const offsetYPixels = iconOffsetY * dpi;

        // Character name is at the bottom (curved text)
        const characterNameY = diameter * CHARACTER_LAYOUT.CURVED_TEXT_RADIUS;

        // Dynamic sizing: maximize icon space between ability text and character name
        const abilityTextEndY = this.abilityTextStartY + this.abilityTextHeight;

        // Calculate available vertical space for icon
        const availableHeight = characterNameY - abilityTextEndY;

        // Use configured ratio of available space for optimal appearance
        const optimalSize = availableHeight * CHARACTER_LAYOUT.ICON_SPACE_RATIO_WITH_ABILITY;

        // Calculate the ratio
        const imageSizeRatio = optimalSize / diameter;

        // Apply icon scale
        const size = diameter * imageSizeRatio * iconScale;

        // Center icon vertically in the available space
        const iconCenterY = abilityTextEndY + availableHeight / 2;
        const verticalOffset = (diameter / 2 - iconCenterY) / diameter;

        // Calculate base offset (centers the image)
        const baseOffsetX = (diameter - size) / 2;
        const baseOffsetY = (diameter - size) / 2 - diameter * verticalOffset;

        // Apply user-defined offsets (converted from inches to pixels)
        // Note: offsetY is negated so positive values move the icon up
        const x = baseOffsetX + offsetXPixels;
        const y = baseOffsetY - offsetYPixels;

        return {
            size,
            position: { x, y }
        };
    }
}

/**
 * Layout strategy for character tokens without ability text
 */
export class CharacterWithoutAbilityTextLayout implements IconLayoutStrategy {
    calculate(context: LayoutContext): IconLayoutResult {
        const { diameter, dpi, iconScale, iconOffsetX, iconOffsetY } = context;

        // Convert inch offsets to pixels
        const offsetXPixels = iconOffsetX * dpi;
        const offsetYPixels = iconOffsetY * dpi;

        // Character name is at the bottom (curved text)
        const characterNameY = diameter * CHARACTER_LAYOUT.CURVED_TEXT_RADIUS;

        // Without ability text: dynamic sizing between top margin and character name
        const topMargin = diameter * CHARACTER_LAYOUT.NO_ABILITY_TOP_MARGIN;

        // Calculate available vertical space for icon
        const availableHeight = characterNameY - topMargin;

        // Use configured ratio of available space for optimal appearance
        const optimalSize = availableHeight * CHARACTER_LAYOUT.ICON_SPACE_RATIO_NO_ABILITY;

        // Calculate the ratio
        const imageSizeRatio = optimalSize / diameter;

        // Apply icon scale
        const size = diameter * imageSizeRatio * iconScale;

        // Center icon vertically in the available space
        const iconCenterY = topMargin + availableHeight / 2;
        const verticalOffset = (diameter / 2 - iconCenterY) / diameter;

        // Calculate base offset (centers the image)
        const baseOffsetX = (diameter - size) / 2;
        const baseOffsetY = (diameter - size) / 2 - diameter * verticalOffset;

        // Apply user-defined offsets (converted from inches to pixels)
        const x = baseOffsetX + offsetXPixels;
        const y = baseOffsetY - offsetYPixels;

        return {
            size,
            position: { x, y }
        };
    }
}

/**
 * Layout strategy for reminder tokens
 */
export class ReminderTokenLayout implements IconLayoutStrategy {
    calculate(context: LayoutContext): IconLayoutResult {
        const { diameter, dpi, iconScale, iconOffsetX, iconOffsetY } = context;

        // Convert inch offsets to pixels
        const offsetXPixels = iconOffsetX * dpi;
        const offsetYPixels = iconOffsetY * dpi;

        // Use reminder layout constants
        const imageSizeRatio = REMINDER_LAYOUT.IMAGE_SIZE_RATIO;
        const verticalOffset = REMINDER_LAYOUT.IMAGE_VERTICAL_OFFSET;

        // Apply icon scale
        const size = diameter * imageSizeRatio * iconScale;

        // Calculate base offset (centers the image)
        const baseOffsetX = (diameter - size) / 2;
        const baseOffsetY = (diameter - size) / 2 - diameter * verticalOffset;

        // Apply user-defined offsets (converted from inches to pixels)
        const x = baseOffsetX + offsetXPixels;
        const y = baseOffsetY - offsetYPixels;

        return {
            size,
            position: { x, y }
        };
    }
}

/**
 * Layout strategy for meta tokens (default/fallback)
 */
export class MetaTokenLayout implements IconLayoutStrategy {
    calculate(context: LayoutContext): IconLayoutResult {
        const { diameter, dpi, iconScale, iconOffsetX, iconOffsetY } = context;

        // Convert inch offsets to pixels
        const offsetXPixels = iconOffsetX * dpi;
        const offsetYPixels = iconOffsetY * dpi;

        // Simple centered layout
        const imageSizeRatio = 1.0;
        const size = diameter * imageSizeRatio * iconScale;

        // Calculate base offset (centers the image)
        const baseOffsetX = (diameter - size) / 2;
        const baseOffsetY = (diameter - size) / 2;

        // Apply user-defined offsets (converted from inches to pixels)
        const x = baseOffsetX + offsetXPixels;
        const y = baseOffsetY - offsetYPixels;

        return {
            size,
            position: { x, y }
        };
    }
}

// ============================================================================
// LAYOUT STRATEGY FACTORY
// ============================================================================

/**
 * Factory for creating appropriate layout strategy
 */
export class IconLayoutStrategyFactory {
    /**
     * Create layout strategy for character tokens
     * @param hasAbilityText - Whether the character has ability text
     * @param abilityTextHeight - Height of ability text (if present)
     * @param abilityTextStartY - Starting Y position of ability text
     * @returns Appropriate layout strategy
     */
    static createCharacterLayout(
        hasAbilityText: boolean,
        abilityTextHeight?: number,
        abilityTextStartY?: number
    ): IconLayoutStrategy {
        if (hasAbilityText && abilityTextHeight !== undefined && abilityTextStartY !== undefined) {
            return new CharacterWithAbilityTextLayout(abilityTextHeight, abilityTextStartY);
        } else {
            return new CharacterWithoutAbilityTextLayout();
        }
    }

    /**
     * Create layout strategy based on token type
     * @param tokenType - Type of token
     * @param hasAbilityText - Whether character has ability text (only for character tokens)
     * @param abilityTextHeight - Height of ability text (only for character tokens with ability text)
     * @param abilityTextStartY - Starting Y position of ability text
     * @returns Appropriate layout strategy
     */
    static create(
        tokenType: TokenTypeValue,
        hasAbilityText?: boolean,
        abilityTextHeight?: number,
        abilityTextStartY?: number
    ): IconLayoutStrategy {
        switch (tokenType) {
            case TokenType.CHARACTER:
                return this.createCharacterLayout(
                    hasAbilityText ?? false,
                    abilityTextHeight,
                    abilityTextStartY
                );
            case TokenType.REMINDER:
                return new ReminderTokenLayout();
            case TokenType.META:
                return new MetaTokenLayout();
            default:
                // Fallback to meta token layout
                return new MetaTokenLayout();
        }
    }
}

export default {
    IconLayoutStrategyFactory,
    CharacterWithAbilityTextLayout,
    CharacterWithoutAbilityTextLayout,
    ReminderTokenLayout,
    MetaTokenLayout
};
