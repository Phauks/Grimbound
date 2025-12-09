/**
 * Blood on the Clocktower Token Generator
 * Token Generator Options - Types and Defaults
 */

import CONFIG from '../config.js';
import type { Point } from '../canvas/index.js';

// ============================================================================
// TOKEN GENERATOR OPTIONS
// ============================================================================

/**
 * Token generator options interface
 */
// Icon settings for image positioning
export interface IconSettings {
    scale: number;
    offsetX: number;
    offsetY: number;
}

export interface TokenGeneratorOptions {
    displayAbilityText: boolean;
    generateBootleggerRules: boolean;
    bootleggerRules?: string;
    logoUrl?: string;
    tokenCount: boolean;
    setupFlowerStyle: string;
    reminderBackground: string;
    reminderBackgroundImage?: string;
    reminderBackgroundType?: 'color' | 'image';
    characterBackground: string;
    characterBackgroundColor?: string;
    characterBackgroundType?: 'color' | 'image';
    metaBackground?: string;
    metaBackgroundColor?: string;
    metaBackgroundType?: 'color' | 'image';
    characterNameFont: string;
    characterNameColor: string;
    metaNameFont?: string;
    metaNameColor?: string;
    characterReminderFont: string;
    abilityTextFont: string;
    abilityTextColor: string;
    reminderTextColor: string;
    leafGeneration: string;
    maximumLeaves: number;
    leafPopulationProbability: number;
    leafArcSpan: number;
    leafSlots: number;
    transparentBackground: boolean;
    dpi: number;
    fontSpacing: {
        characterName: number;
        abilityText: number;
        reminderText: number;
        metaText?: number;
    };
    textShadow?: {
        characterName: number;
        abilityText: number;
        reminderText: number;
        metaText?: number;
    };
    iconSettings?: {
        character: IconSettings;
        reminder: IconSettings;
        meta: IconSettings;
    };
}

/**
 * Default token generator options
 */
export const DEFAULT_TOKEN_OPTIONS: TokenGeneratorOptions = {
    displayAbilityText: CONFIG.TOKEN.DISPLAY_ABILITY_TEXT,
    generateBootleggerRules: false,
    tokenCount: CONFIG.TOKEN.TOKEN_COUNT,
    setupFlowerStyle: CONFIG.STYLE.SETUP_FLOWER_STYLE,
    reminderBackground: CONFIG.STYLE.REMINDER_BACKGROUND,
    characterBackground: CONFIG.STYLE.CHARACTER_BACKGROUND,
    characterNameFont: CONFIG.STYLE.CHARACTER_NAME_FONT,
    characterNameColor: CONFIG.STYLE.CHARACTER_NAME_COLOR,
    metaNameFont: CONFIG.STYLE.CHARACTER_NAME_FONT,
    metaNameColor: CONFIG.STYLE.CHARACTER_NAME_COLOR,
    characterReminderFont: CONFIG.STYLE.CHARACTER_REMINDER_FONT,
    abilityTextFont: CONFIG.STYLE.ABILITY_TEXT_FONT,
    abilityTextColor: CONFIG.STYLE.ABILITY_TEXT_COLOR,
    reminderTextColor: CONFIG.STYLE.REMINDER_TEXT_COLOR,
    leafGeneration: CONFIG.STYLE.LEAF_GENERATION,
    maximumLeaves: CONFIG.STYLE.MAXIMUM_LEAVES,
    leafPopulationProbability: CONFIG.STYLE.LEAF_POPULATION_PROBABILITY,
    leafArcSpan: CONFIG.STYLE.LEAF_ARC_SPAN,
    leafSlots: CONFIG.STYLE.LEAF_SLOTS,
    transparentBackground: false,
    dpi: CONFIG.PDF.DPI,
    fontSpacing: {
        characterName: CONFIG.FONT_SPACING.CHARACTER_NAME,
        abilityText: CONFIG.FONT_SPACING.ABILITY_TEXT,
        reminderText: CONFIG.FONT_SPACING.REMINDER_TEXT,
        metaText: CONFIG.FONT_SPACING.META_TEXT
    },
    textShadow: {
        characterName: CONFIG.TEXT_SHADOW.CHARACTER_NAME,
        abilityText: CONFIG.TEXT_SHADOW.ABILITY_TEXT,
        reminderText: CONFIG.TEXT_SHADOW.REMINDER_TEXT,
        metaText: CONFIG.TEXT_SHADOW.META_TEXT
    }
};

// ============================================================================
// META TOKEN TYPES
// ============================================================================

/**
 * Meta token content renderer function type
 */
export type MetaTokenContentRenderer = (
    ctx: CanvasRenderingContext2D,
    diameter: number,
    center: Point,
    radius: number
) => Promise<void> | void;
