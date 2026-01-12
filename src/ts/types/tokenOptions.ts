/**
 * Blood on the Clocktower Token Generator
 * Token Generator Options - Types and Defaults
 */

import type { Point } from '@/ts/canvas/index.js';
import CONFIG from '@/ts/config.js';
import type {
  FontSizeOptions,
  GenerationOptions,
  MeasurementUnit,
  ReminderCountStyle,
  SetupPlacement,
  TextRenderStyleOptions,
  TextStrokeColorOptions,
  TextStrokeWidthOptions,
} from './index.js';

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
export type QRDotType =
  | 'rounded'
  | 'extra-rounded'
  | 'classy'
  | 'classy-rounded'
  | 'square'
  | 'dots';

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

import {
  type BackgroundStyle,
  DEFAULT_EFFECTS_CONFIG,
  DEFAULT_GRADIENT_CONFIG,
  DEFAULT_LIGHT_CONFIG,
  DEFAULT_TEXTURE_CONFIG,
} from './backgroundEffects.js';
import type { BootleggerIconType } from './index.js';

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
  /** When true, all tokens use uniform top spacing as if they all have a badge */
  reminderCountUniformLayout?: boolean;
  setupStyle: string;
  /** Placement of setup overlay: 'left' or 'right' (default) */
  setupPlacement?: SetupPlacement;
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
  /** Font for meta token text/description (defaults to abilityTextFont if not set) */
  metaTextFont?: string;
  /** Color for meta token text/description (defaults to abilityTextColor if not set) */
  metaTextColor?: string;
  characterReminderFont: string;
  abilityTextFont: string;
  abilityTextColor: string;
  reminderTextColor: string;
  // Accent settings - now deterministic based on character data:
  // - Top accents: number of reminders
  // - Left accent: character acts on first night
  // - Right accent: character acts on other nights
  accentGeneration: string;
  accentEnabled: boolean;
  /** How far from center accents are placed (0.5-1.0, default 0.88). Lower = closer to center */
  accentRadialOffset?: number;
  /** Rotate accent images 180 degrees */
  accentRotate180?: boolean;
  /** Flip accent images horizontally */
  accentFlip?: boolean;
  /** Whether accents are drawn under or over the character icon (default: 'over') */
  accentLayer?: 'under' | 'over';
  transparentBackground: boolean;
  fontSpacing: {
    characterName: number;
    characterText: number;
    reminderText: number;
    metaName?: number;
    metaText?: number;
  };
  textShadow?: {
    characterName: number;
    characterText: number;
    reminderText: number;
    metaName?: number;
    metaText?: number;
  };
  /** Font sizes in points (0 = auto/ratio-based) */
  fontSizes?: FontSizeOptions;
  /** Text render styles (filled, outlined, both) */
  textRenderStyles?: TextRenderStyleOptions;
  /** Text stroke colors for outlined/both styles */
  textStrokeColors?: TextStrokeColorOptions;
  /** Text stroke widths for outlined/both styles */
  textStrokeWidths?: TextStrokeWidthOptions;
  /** Text location for curved text: 'none' (hidden), 'bottom' (default) or 'top' */
  textLocations?: {
    characterName?: 'none' | 'bottom' | 'top';
    reminderText?: 'none' | 'bottom' | 'top';
    metaName?: 'none' | 'bottom' | 'top';
  };
  iconSettings?: {
    character: IconSettings;
    reminder: IconSettings;
    meta: IconSettings;
  };
  /** QR code styling options for almanac tokens */
  qrCodeOptions?: QRCodeOptions;
  /** Distance of jinx icons from center (0 = default, positive = further apart) */
  jinxIconSpacing?: number;
}

/**
 * Default token generator options
 */
export const DEFAULT_TOKEN_OPTIONS: TokenGeneratorOptions = {
  displayAbilityText: CONFIG.TOKEN.DISPLAY_ABILITY_TEXT,
  generateBootleggerRules: false,
  tokenCount: CONFIG.TOKEN.TOKEN_COUNT,
  reminderCountUniformLayout: false,
  setupStyle: CONFIG.STYLE.SETUP_STYLE,
  setupPlacement: 'right',
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
  accentGeneration: CONFIG.STYLE.ACCENT_GENERATION,
  accentEnabled: true,
  transparentBackground: false,
  fontSpacing: {
    characterName: CONFIG.FONT_SPACING.CHARACTER_NAME,
    characterText: CONFIG.FONT_SPACING.ABILITY_TEXT,
    reminderText: CONFIG.FONT_SPACING.REMINDER_TEXT,
    metaName: CONFIG.FONT_SPACING.CHARACTER_NAME,
    metaText: CONFIG.FONT_SPACING.META_TEXT,
  },
  textShadow: {
    characterName: CONFIG.TEXT_SHADOW.CHARACTER_NAME,
    characterText: CONFIG.TEXT_SHADOW.ABILITY_TEXT,
    reminderText: CONFIG.TEXT_SHADOW.REMINDER_TEXT,
    metaName: CONFIG.TEXT_SHADOW.CHARACTER_NAME,
    metaText: CONFIG.TEXT_SHADOW.META_TEXT,
  },
  textLocations: {
    characterName: 'bottom',
    reminderText: 'bottom',
    metaName: 'bottom',
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
    errorCorrectionLevel: 'H',
  },
};

// ============================================================================
// DEFAULT GENERATION OPTIONS (for UI/presets)
// ============================================================================

/**
 * Default generation options - the single source of truth for application defaults.
 * Used by:
 * - TokenContext for initial state
 * - "Classic" preset to always reflect current defaults
 * - Any code that needs to know the default values
 *
 * IMPORTANT: Update these values to change application defaults.
 * The "Classic" preset will automatically reflect any changes made here.
 */
export const DEFAULT_GENERATION_OPTIONS: GenerationOptions = {
  // Display options
  displayAbilityText: CONFIG.TOKEN.DISPLAY_ABILITY_TEXT,
  generateBootleggerRules: false,
  tokenCount: CONFIG.TOKEN.TOKEN_COUNT,
  reminderCountUniformLayout: false,

  // Setup overlay
  setupStyle: CONFIG.STYLE.SETUP_STYLE,
  setupPlacement: 'right',

  // Reminder token background
  reminderBackground: CONFIG.STYLE.REMINDER_BACKGROUND,
  reminderBackgroundImage: CONFIG.STYLE.CHARACTER_BACKGROUND,
  reminderBackgroundType: 'color',

  // Character token background
  characterBackground: CONFIG.STYLE.CHARACTER_BACKGROUND,
  characterBackgroundColor: '#FFFFFF',
  characterBackgroundType: 'image',

  // Meta token background
  metaBackground: CONFIG.STYLE.CHARACTER_BACKGROUND,
  metaBackgroundColor: '#FFFFFF',
  metaBackgroundType: 'image',

  // Background styles (new format) - matches legacy defaults above
  characterBackgroundStyle: {
    sourceType: 'image',
    imageUrl: CONFIG.STYLE.CHARACTER_BACKGROUND,
    mode: 'solid',
    solidColor: '#FFFFFF',
    gradient: DEFAULT_GRADIENT_CONFIG,
    texture: DEFAULT_TEXTURE_CONFIG,
    effects: DEFAULT_EFFECTS_CONFIG,
    light: DEFAULT_LIGHT_CONFIG,
  },
  reminderBackgroundStyle: {
    sourceType: 'styled',
    imageUrl: undefined,
    mode: 'solid',
    solidColor: CONFIG.STYLE.REMINDER_BACKGROUND,
    gradient: DEFAULT_GRADIENT_CONFIG,
    texture: DEFAULT_TEXTURE_CONFIG,
    effects: DEFAULT_EFFECTS_CONFIG,
    light: DEFAULT_LIGHT_CONFIG,
  },
  metaBackgroundStyle: {
    sourceType: 'image',
    imageUrl: CONFIG.STYLE.CHARACTER_BACKGROUND,
    mode: 'solid',
    solidColor: '#FFFFFF',
    gradient: DEFAULT_GRADIENT_CONFIG,
    texture: DEFAULT_TEXTURE_CONFIG,
    effects: DEFAULT_EFFECTS_CONFIG,
    light: DEFAULT_LIGHT_CONFIG,
  },

  // Fonts and colors
  characterNameFont: CONFIG.STYLE.CHARACTER_NAME_FONT,
  characterNameColor: CONFIG.STYLE.CHARACTER_NAME_COLOR,
  metaNameFont: CONFIG.STYLE.CHARACTER_NAME_FONT,
  metaNameColor: CONFIG.STYLE.CHARACTER_NAME_COLOR,
  characterReminderFont: CONFIG.STYLE.CHARACTER_REMINDER_FONT,
  abilityTextFont: CONFIG.STYLE.ABILITY_TEXT_FONT,
  abilityTextColor: CONFIG.STYLE.ABILITY_TEXT_COLOR,
  reminderTextColor: CONFIG.STYLE.REMINDER_TEXT_COLOR,

  // Accent settings - deterministic based on character data
  accentGeneration: CONFIG.STYLE.ACCENT_GENERATION,
  accentEnabled: true, // Enable accents by default

  // Font spacing (0 = normal spacing)
  fontSpacing: {
    characterName: CONFIG.FONT_SPACING.CHARACTER_NAME,
    characterText: CONFIG.FONT_SPACING.ABILITY_TEXT,
    reminderText: CONFIG.FONT_SPACING.REMINDER_TEXT,
    metaName: CONFIG.FONT_SPACING.CHARACTER_NAME,
    metaText: CONFIG.FONT_SPACING.META_TEXT,
  },

  // Text shadows (subtle by default)
  textShadow: {
    characterName: 4,
    characterText: 3,
    reminderText: 4,
    metaName: 4,
    metaText: 4,
  },

  // Text locations for curved text
  textLocations: {
    characterName: 'bottom',
    reminderText: 'bottom',
    metaName: 'bottom',
  },

  // Meta tokens
  pandemoniumToken: true,
  scriptNameToken: true,
  almanacToken: true,

  // Icon positioning
  iconSettings: {
    character: { scale: 1.0, offsetX: 0, offsetY: 0 },
    reminder: { scale: 1.0, offsetX: 0, offsetY: 0 },
    meta: { scale: 1.0, offsetX: 0, offsetY: 0 },
  },

  // Measurement unit for UI display
  measurementUnit: 'inches' as MeasurementUnit,

  // Character/Meta token settings link (default: unlinked)
  characterMetaLink: {
    background: false,
    font: false,
    icon: false,
    text: false,
  },
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
