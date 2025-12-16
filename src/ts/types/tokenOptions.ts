/**
 * Blood on the Clocktower Token Generator
 * Token Generator Options - Types and Defaults
 */

import CONFIG from '../config.js';
import type { Point } from '../canvas/index.js';
import type { ReminderCountStyle } from './index.js';

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

/**
 * QR code dot type options
 */
export type QRDotType = 'rounded' | 'extra-rounded' | 'classy' | 'classy-rounded' | 'square' | 'dots';

/**
 * QR code corner square type options
 */
export type QRCornerSquareType = 'dot' | 'square' | 'extra-rounded';

/**
 * QR code corner dot type options
 */
export type QRCornerDotType = 'dot' | 'square';

/**
 * QR code gradient type options
 */
export type QRGradientType = 'linear' | 'radial';

/**
 * QR code error correction level
 */
export type QRErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

/**
 * QR code gradient configuration
 */
export interface QRGradientConfig {
    type: QRGradientType;
    rotation?: number; // For linear gradients (0-360)
    colorStart: string;
    colorEnd: string;
}

/**
 * QR code styling options for almanac tokens
 */
export interface QRCodeOptions {
    // === Token Options ===
    /** Whether to show "ALMANAC" label on QR token (default: true) */
    showAlmanacLabel: boolean;
    /** Whether to show script logo in center of QR (default: true if available) */
    showLogo: boolean;
    /** Whether to show author name on script name token (default: true) */
    showAuthor: boolean;

    // === Dots Options ===
    /** Module/dot style (default: 'extra-rounded') */
    dotType: QRDotType;
    /** Whether dots use gradient (default: true) */
    dotsUseGradient: boolean;
    /** Dots gradient type (default: 'linear') */
    dotsGradientType: QRGradientType;
    /** Dots gradient rotation for linear (default: 45) */
    dotsGradientRotation: number;
    /** Dots color start (default: '#8B0000') */
    dotsColorStart: string;
    /** Dots color end (default: '#1a1a1a') */
    dotsColorEnd: string;

    // === Corner Square Options ===
    /** Corner square style (default: 'extra-rounded') */
    cornerSquareType: QRCornerSquareType;
    /** Whether corner squares use gradient (default: false) */
    cornerSquareUseGradient: boolean;
    /** Corner square gradient type */
    cornerSquareGradientType: QRGradientType;
    /** Corner square gradient rotation for linear (default: 45) */
    cornerSquareGradientRotation: number;
    /** Corner square color start */
    cornerSquareColorStart: string;
    /** Corner square color end */
    cornerSquareColorEnd: string;

    // === Corner Dot Options ===
    /** Corner dot style (default: 'dot') */
    cornerDotType: QRCornerDotType;
    /** Whether corner dots use gradient (default: false) */
    cornerDotUseGradient: boolean;
    /** Corner dot gradient type */
    cornerDotGradientType: QRGradientType;
    /** Corner dot gradient rotation for linear (default: 45) */
    cornerDotGradientRotation: number;
    /** Corner dot color start */
    cornerDotColorStart: string;
    /** Corner dot color end */
    cornerDotColorEnd: string;

    // === Background Options ===
    /** Whether background uses gradient (default: false) */
    backgroundUseGradient: boolean;
    /** Background gradient type */
    backgroundGradientType: QRGradientType;
    /** Background gradient rotation for linear (default: 45) */
    backgroundGradientRotation: number;
    /** Background color start (default: '#FFFFFF') */
    backgroundColorStart: string;
    /** Background color end */
    backgroundColorEnd: string;
    /** Background opacity 0-100 (default: 100 = fully opaque) */
    backgroundOpacity: number;
    /** Whether to use rounded corners on QR background (default: false) */
    backgroundRoundedCorners: boolean;

    // === Image Options ===
    /** Image source to show in QR center: 'none' | 'script-name' | 'script-logo' */
    imageSource: 'none' | 'script-name' | 'script-logo';
    /** Hide background dots behind the image (default: true) */
    imageHideBackgroundDots: boolean;
    /** Image size as percentage of QR code (5-50, default: 30) */
    imageSize: number;
    /** Image margin in pixels (0-20, default: 4) */
    imageMargin: number;

    // === QR Options ===
    /** Error correction level (default: 'H' for logo support) */
    errorCorrectionLevel: QRErrorCorrectionLevel;
}

import type { BootleggerIconType } from './index.js';
import type { BackgroundStyle } from './backgroundEffects.js';

export interface TokenGeneratorOptions {
    displayAbilityText: boolean;
    generateBootleggerRules: boolean;
    bootleggerRules?: string[];
    bootleggerIconType?: BootleggerIconType;
    bootleggerNormalizeIcons?: boolean;
    bootleggerHideName?: boolean;
    logoUrl?: string;
    tokenCount: boolean;
    reminderCountStyle?: ReminderCountStyle;
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
    /** Advanced background styling for character tokens (overrides color when type is 'styled') */
    characterBackgroundStyle?: BackgroundStyle;
    /** Advanced background styling for reminder tokens (overrides color when type is 'styled') */
    reminderBackgroundStyle?: BackgroundStyle;
    /** Advanced background styling for meta tokens (overrides color when type is 'styled') */
    metaBackgroundStyle?: BackgroundStyle;
    characterNameFont: string;
    characterNameColor: string;
    metaNameFont?: string;
    metaNameColor?: string;
    characterReminderFont: string;
    abilityTextFont: string;
    abilityTextColor: string;
    reminderTextColor: string;
    leafGeneration: string;
    leafEnabled: boolean;
    maximumLeaves: number;
    leafPopulationProbability: number;
    leafArcSpan: number;
    leafSlots: number;
    enableLeftLeaf: boolean;
    enableRightLeaf: boolean;
    sideLeafProbability: number;
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
    /** QR code styling options for almanac tokens */
    qrCodeOptions?: QRCodeOptions;
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
    leafEnabled: true,
    maximumLeaves: CONFIG.STYLE.MAXIMUM_LEAVES,
    leafPopulationProbability: CONFIG.STYLE.LEAF_POPULATION_PROBABILITY,
    leafArcSpan: CONFIG.STYLE.LEAF_ARC_SPAN,
    leafSlots: CONFIG.STYLE.LEAF_SLOTS,
    enableLeftLeaf: true,
    enableRightLeaf: true,
    sideLeafProbability: 50, // Side leaves have 50% probability by default
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
    },
    qrCodeOptions: {
        // Token options
        showAlmanacLabel: true,
        showLogo: true,
        showAuthor: true,
        // Dots options
        dotType: 'extra-rounded',
        dotsUseGradient: true,
        dotsGradientType: 'linear',
        dotsGradientRotation: 45,
        dotsColorStart: '#8B0000',
        dotsColorEnd: '#1a1a1a',
        // Corner square options
        cornerSquareType: 'extra-rounded',
        cornerSquareUseGradient: false,
        cornerSquareGradientType: 'linear',
        cornerSquareGradientRotation: 45,
        cornerSquareColorStart: '#8B0000',
        cornerSquareColorEnd: '#8B0000',
        // Corner dot options
        cornerDotType: 'dot',
        cornerDotUseGradient: false,
        cornerDotGradientType: 'linear',
        cornerDotGradientRotation: 45,
        cornerDotColorStart: '#1a1a1a',
        cornerDotColorEnd: '#1a1a1a',
        // Background options
        backgroundUseGradient: false,
        backgroundGradientType: 'linear',
        backgroundGradientRotation: 45,
        backgroundColorStart: '#FFFFFF',
        backgroundColorEnd: '#FFFFFF',
        backgroundOpacity: 100,
        backgroundRoundedCorners: false,
        // Image options
        imageSource: 'script-logo',
        imageHideBackgroundDots: true,
        imageSize: 30,
        imageMargin: 4,
        // QR options
        errorCorrectionLevel: 'H'
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
