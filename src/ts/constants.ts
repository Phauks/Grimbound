/**
 * Blood on the Clocktower Token Generator
 * Constants - Design values and magic numbers extracted for maintainability
 */

// ============================================================================
// TOKEN TYPE CONSTANTS - Type-safe token type definitions
// ============================================================================

/**
 * Token type constants for type-safe token generation
 */
export const TokenType = {
  CHARACTER: 'character',
  REMINDER: 'reminder',
  META: 'meta',
} as const;

export type TokenTypeValue = (typeof TokenType)[keyof typeof TokenType];

// ============================================================================
// LAYOUT RATIOS - Used for token element positioning and sizing
// ============================================================================

/**
 * Layout ratios for character token generation
 * All values are relative to the token diameter
 */
export const CHARACTER_LAYOUT = {
  /** Radius ratio for curved text placement */
  CURVED_TEXT_RADIUS: 0.85,
  /** Maximum arc span for curved text (~126 degrees) */
  MAX_TEXT_ARC_SPAN: Math.PI * 0.7,

  /** Y position for ability text from top of token */
  ABILITY_TEXT_Y_POSITION: 0.15,
  /** Width ratio for ability text wrapping */
  ABILITY_TEXT_MAX_WIDTH: 0.65,
  /** Padding ratio for ability text within circular bounds (0.9 = 90% of calculated circular width) */
  ABILITY_TEXT_CIRCULAR_PADDING: 0.8,
  /** Multiplier for how much of available space the icon uses when ability text is present (0.8 = 80%) */
  ICON_SPACE_RATIO_WITH_ABILITY: 1.5,
  /** Multiplier for how much of available space the icon uses when no ability text (0.9 = 90%) */
  ICON_SPACE_RATIO_NO_ABILITY: 1.2,
  /** Top margin when no ability text (distance from top of token to start of icon space) */
  NO_ABILITY_TOP_MARGIN: 0.1,

  /** Y position for token count badge from top */
  TOKEN_COUNT_Y_POSITION: 0.12,
} as const;

/**
 * Layout ratios for reminder token generation
 */
export const REMINDER_LAYOUT = {
  /** Size of character image on reminder tokens (smaller than character tokens) */
  IMAGE_SIZE_RATIO: 1.0,
  /** Vertical offset for character image */
  IMAGE_VERTICAL_OFFSET: 0.05,
  /** Radius ratio for curved text placement */
  CURVED_TEXT_RADIUS: 0.85,
} as const;

/**
 * Layout ratios for meta tokens (script name, pandemonium, almanac)
 */
export const META_TOKEN_LAYOUT = {
  /** Font size ratio for Pandemonium Institute text */
  PANDEMONIUM_TEXT_SIZE: 0.11,
  /** Font size ratio for centered script name text */
  CENTERED_TEXT_SIZE: 0.12,
  /** Max width ratio for centered text wrapping */
  CENTERED_TEXT_MAX_WIDTH: 0.75,
  /** Font size ratio for author name (smaller than main text) */
  AUTHOR_TEXT_SIZE_FACTOR: 0.7,
  /** Font size ratio for "Blood on the Clocktower" text */
  BOTC_TEXT_SIZE_FACTOR: 0.75,
  /** Max size ratio for script name logo image */
  LOGO_MAX_SIZE_RATIO: 0.7,
  /** Max size ratio for Pandemonium Institute image */
  PANDEMONIUM_IMAGE_MAX_SIZE_RATIO: 0.75,
} as const;

/**
 * Layout ratios for QR code almanac token
 */
export const QR_TOKEN_LAYOUT = {
  /** Size of QR code relative to diameter - reduced to fit within circle */
  QR_CODE_SIZE: 0.68,
  /** Font size ratio for script name (curved at bottom) */
  SCRIPT_NAME_SIZE: 0.1,
  /** Radius for curved script name text placement */
  SCRIPT_NAME_RADIUS: 0.88,
  /** Logo size relative to QR code (embedded in center) */
  LOGO_SIZE_RATIO: 0.25,
} as const;

// ============================================================================
// TEXT SIZING - Line heights and typography settings
// ============================================================================

/**
 * Line height multipliers for multi-line text
 */
export const LINE_HEIGHTS = {
  /** Standard line height for most text */
  STANDARD: 1.3,
  /** Tighter line height for QR overlay text */
  TIGHT: 1.2,
} as const;

/**
 * Token count badge sizing
 */
export const TOKEN_COUNT_BADGE = {
  /** Radius multiplier for background circle */
  BACKGROUND_RADIUS: 0.8,
  /** Line width for badge stroke */
  STROKE_WIDTH: 2,
  /** Size growth per reminder item (for dots style) */
  SIZE_GROWTH_PER_ITEM: 0.15,
} as const;

/**
 * Accent decoration configuration for token generation
 * Uses accent assets dynamically positioned around the token edge
 */
export const ACCENT_LAYOUT = {
  /** Arc configuration for top accents (in degrees, centered at top) */
  ARC: {
    /** Default arc span in degrees (e.g., 120 = 60deg left to 60deg right of top) */
    DEFAULT_SPAN: 120,
    /** Maximum configurable arc span */
    MAX_SPAN: 180,
    /** Minimum configurable arc span */
    MIN_SPAN: 30,
  },
  /** Number of potential accent positions along the arc */
  SLOTS: {
    DEFAULT: 7,
    MIN: 3,
    MAX: 15,
  },
  /** Left and right side accent configuration */
  SIDE_ACCENTS: {
    /** How far from center (as ratio of radius) */
    RADIAL_OFFSET: 0.88,
    /** Scale relative to diameter */
    SCALE: 0.3,
    /** Rotation in degrees (positive = clockwise) - accents point outward */
    LEFT_ROTATION: -90,
    RIGHT_ROTATION: 90,
  },
  /** Arc accent configuration */
  ARC_ACCENTS: {
    /** How far from center accents are placed (as ratio of radius) */
    RADIAL_OFFSET: 0.78,
    /** Scale relative to diameter */
    SCALE: 0.22,
  },
  /** Asset configuration */
  ASSETS: {
    /** Base path for accent/leaves folder (relative to CONFIG.ASSETS.ACCENTS) */
    ACCENTS_PATH: 'leaves/',
    /** Filename prefix for accent variants (leaf_1.webp, leaf_2.webp, etc.) */
    ACCENT_FILENAME: 'leaf',
    /** Number of accent variants available */
    DEFAULT_VARIANTS: 1,
    MIN_VARIANTS: 1,
    MAX_VARIANTS: 10,
  },
  /** Default generation settings */
  DEFAULTS: {
    MAX_ACCENTS: 5,
    PROBABILITY: 30,
  },
} as const;

// ============================================================================
// TEAM COLORS - Centralized color definitions for all character alignments
// ============================================================================

/**
 * Team color definitions - Single Source of Truth
 *
 * Each team has:
 * - hex: Primary color as hex string
 * - hue: HSL hue value (0-360) for selective recoloring
 * - saturationBoost: Multiplier for saturation when recoloring (1.0 = no change)
 * - split: Optional split color config (left/right sides have different colors)
 *
 * These values are used by:
 * - Studio icon color replacer (HSL-based selective recoloring)
 * - Character preset system (grayscale + overlay)
 * - Token generation backgrounds
 */
export const TEAM_COLORS = {
  /** Townsfolk - Blue (good aligned) */
  townsfolk: {
    hex: '#3B5998',
    hue: 220,
    saturationBoost: 1.0,
  },
  /** Outsider - Cyan/Teal (good aligned, but potentially harmful) */
  outsider: {
    hex: '#20B2AA',
    hue: 177,
    saturationBoost: 0.95,
  },
  /** Minion - Purple (evil aligned) */
  minion: {
    hex: '#9400D3',
    hue: 280,
    saturationBoost: 1.1,
  },
  /** Demon - Red (evil aligned) */
  demon: {
    hex: '#CC0000',
    hue: 0,
    saturationBoost: 1.15,
  },
  /** Traveler - Split color (left blue, right red) representing dual allegiance */
  traveler: {
    hex: '#808080', // Gray for preview (actual color is split)
    hue: 0, // Not used for split colors
    saturationBoost: 1.0,
    split: {
      left: { hex: '#3B5998', hue: 220 },  // Blue (Good/Townsfolk)
      right: { hex: '#CC0000', hue: 0 },    // Red (Evil/Demon)
    },
  },
  /** Fabled - Gold (storyteller characters) */
  fabled: {
    hex: '#FFD700',
    hue: 51,
    saturationBoost: 1.2,
  },
  /** Loric - Forest Green (custom homebrew alignment) */
  loric: {
    hex: '#228B22',
    hue: 120,
    saturationBoost: 1.0,
  },
} as const;

/**
 * Type for team keys
 */
export type TeamColorKey = keyof typeof TEAM_COLORS;

/**
 * Get team color by key
 */
export function getTeamColor(team: TeamColorKey) {
  return TEAM_COLORS[team];
}

// ============================================================================
// COLORS - Default colors used throughout token generation
// ============================================================================

/**
 * Default colors for token rendering
 */
export const DEFAULT_COLORS = {
  /** Fallback background color when image fails to load */
  FALLBACK_BACKGROUND: '#1a1a1a',
  /** Default text color (white) */
  TEXT_PRIMARY: '#FFFFFF',
  /** Black text color for QR tokens */
  TEXT_DARK: '#000000',
  /** Text shadow color for readability */
  TEXT_SHADOW: 'rgba(0, 0, 0, 0.8)',
  /** Semi-transparent background for badges */
  BADGE_BACKGROUND: 'rgba(0, 0, 0, 0.6)',
} as const;

/**
 * QR code default colors and styling
 */
export const QR_COLORS = {
  /** Default gradient start color (blood red) */
  GRADIENT_START: '#8B0000',
  /** Default gradient end color (near black) */
  GRADIENT_END: '#1a1a1a',
  /** Background color */
  BACKGROUND: '#FFFFFF',
  /** Error correction level (H = 30% recovery for logo overlay) */
  ERROR_CORRECTION_LEVEL: 'H',
} as const;

// ============================================================================
// SHADOW SETTINGS - Text shadow configuration for readability
// ============================================================================

/**
 * Text shadow settings for curved text and titles
 */
export const TEXT_SHADOW = {
  /** Shadow blur radius in pixels */
  BLUR: 4,
  /** Shadow horizontal offset */
  OFFSET_X: 2,
  /** Shadow vertical offset */
  OFFSET_Y: 2,
} as const;

/**
 * Text shadow settings for ability text (smaller shadows)
 */
export const ABILITY_TEXT_SHADOW = {
  /** Shadow blur radius in pixels */
  BLUR: 0,
  /** Shadow horizontal offset */
  OFFSET_X: 1,
  /** Shadow vertical offset */
  OFFSET_Y: 1,
} as const;

// ============================================================================
// TIMING - Delays and timeouts
// ============================================================================

/**
 * Timing constants
 */
export const TIMING = {
  /** Delay for QR code generation (ms) - allows library to render */
  QR_GENERATION_DELAY: 100,
  /** Debounce delay for JSON validation (ms) */
  JSON_VALIDATION_DEBOUNCE: 300,
  /** Debounce delay for option changes (ms) */
  OPTION_CHANGE_DEBOUNCE: 500,
} as const;

// ============================================================================
// UI CONSTANTS - User interface settings
// ============================================================================

/**
 * UI size settings
 */
export const UI_SIZE = {
  /** Minimum UI scale percentage */
  MIN: 50,
  /** Maximum UI scale percentage */
  MAX: 200,
  /** Default UI scale percentage */
  DEFAULT: 100,
  /** Base font size in pixels */
  BASE_FONT_SIZE_PX: 16,
} as const;

/**
 * Token preview display settings
 */
export const TOKEN_PREVIEW = {
  /** Display size for token cards in the grid */
  DISPLAY_SIZE: 180,
} as const;

// ============================================================================
// EXPORT DEFAULT - For convenience imports
// ============================================================================

export default {
  TokenType,
  CHARACTER_LAYOUT,
  REMINDER_LAYOUT,
  META_TOKEN_LAYOUT,
  QR_TOKEN_LAYOUT,
  LINE_HEIGHTS,
  TOKEN_COUNT_BADGE,
  ACCENT_LAYOUT,
  TEAM_COLORS,
  DEFAULT_COLORS,
  QR_COLORS,
  TEXT_SHADOW,
  ABILITY_TEXT_SHADOW,
  TIMING,
  UI_SIZE,
  TOKEN_PREVIEW,
};
