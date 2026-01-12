/**
 * Script PDF Constants
 *
 * Layout constants and default settings for script PDF generation.
 */

import { getTeamHexColor } from '@/ts/constants.js';
import {
  type BackgroundStyle,
  DEFAULT_EFFECTS_CONFIG,
  DEFAULT_GRADIENT_CONFIG,
  DEFAULT_LIGHT_CONFIG,
} from '@/ts/types/backgroundEffects.js';
import type { Team } from '@/ts/types/index.js';

import type {
  BackingSheetSettings,
  MarginConfig,
  NightOrderSettings,
  PlayerCountEntry,
  PlayerScriptSettings,
  ScriptPdfSettings,
} from './types.js';

// ============================================================================
// PAGE DIMENSIONS
// ============================================================================

/** US Letter page width in inches */
export const PAGE_WIDTH_INCHES = 8.5;

/** US Letter page height in inches */
export const PAGE_HEIGHT_INCHES = 11;

/** Points per inch (standard PDF unit) */
export const POINTS_PER_INCH = 72;

/** US Letter page width in points */
export const PAGE_WIDTH_PT = PAGE_WIDTH_INCHES * POINTS_PER_INCH; // 612

/** US Letter page height in points */
export const PAGE_HEIGHT_PT = PAGE_HEIGHT_INCHES * POINTS_PER_INCH; // 792

/** DPI for raster rendering */
export const RENDER_DPI = 300;

/** UI preview width in pixels */
export const UI_PREVIEW_WIDTH = 680;

/** UI preview height based on letter aspect ratio */
export const UI_PREVIEW_HEIGHT = Math.round(
  UI_PREVIEW_WIDTH * (PAGE_HEIGHT_INCHES / PAGE_WIDTH_INCHES)
);

// ============================================================================
// PLAYER SCRIPT FRONT PAGE LAYOUT
// ============================================================================

/**
 * Player Script front page layout constants (all values in inches)
 */
export const PLAYER_SCRIPT_FRONT = {
  // Margins
  MARGIN_TOP: 0.4,
  MARGIN_BOTTOM: 0.3,
  MARGIN_LEFT: 0.5, // Extra room for team labels
  MARGIN_RIGHT: 0.3,

  // Team label
  TEAM_LABEL_WIDTH: 0.25,
  TEAM_LABEL_FONT_SIZE: 8, // points
  TEAM_LABEL_LETTER_SPACING: 0.08, // em

  // Header section
  HEADER_HEIGHT: 0.9,
  TITLE_FONT_SIZE: 32, // points
  AUTHOR_FONT_SIZE: 12, // points
  AUTHOR_MARGIN_TOP: 0.08,

  // Footer section
  FOOTER_HEIGHT: 0.35,
  FOOTER_FONT_SIZE: 7, // points

  // Character entry (single column)
  ENTRY_HEIGHT_1COL: 0.7,
  ENTRY_ICON_SIZE_1COL: 0.55,
  ENTRY_NAME_FONT_SIZE_1COL: 8, // points - standardized to 8pt
  ENTRY_ABILITY_FONT_SIZE_1COL: 8, // points - standardized to 8pt

  // Character entry (two column)
  ENTRY_HEIGHT_2COL: 0.6,
  ENTRY_ICON_SIZE_2COL: 0.45,
  ENTRY_NAME_FONT_SIZE_2COL: 8, // points - standardized to 8pt
  ENTRY_ABILITY_FONT_SIZE_2COL: 8, // points - standardized to 8pt

  // Spacing
  ENTRY_SPACING: 0.06,
  TEAM_SPACING: 0.15,
  COLUMN_GAP: 0.2,

  // Jinx section
  JINX_SECTION_MARGIN_TOP: 0.15,
  JINX_ENTRY_HEIGHT: 0.4,
  JINX_ICON_SIZE: 0.3,
  JINX_ICON_GAP: 0.04,
  JINX_TEXT_FONT_SIZE: 8, // points

  // Fabled section
  FABLED_SECTION_MARGIN_TOP: 0.12,
  FABLED_ENTRY_HEIGHT: 0.5,
  FABLED_ICON_SIZE: 0.4,
  FABLED_NAME_FONT_SIZE: 10, // points
  FABLED_ABILITY_FONT_SIZE: 8, // points

  // Auto column threshold
  /** Maximum characters for single column layout */
  SINGLE_COLUMN_MAX_CHARS: 16,
} as const;

// ============================================================================
// PLAYER SCRIPT BACKING SHEET LAYOUT
// ============================================================================

/**
 * Player Script backing sheet layout constants (all values in inches)
 */
export const PLAYER_SCRIPT_BACK = {
  // Margins
  MARGIN: 0.5,

  // Night order icons bar
  NIGHT_ORDER_HEIGHT: 0.9,
  NIGHT_ORDER_MARGIN_BOTTOM: 0.3,
  NIGHT_ORDER_ICON_SIZE: 0.35,
  NIGHT_ORDER_ICON_GAP: 0.08,
  NIGHT_ORDER_LABEL_FONT_SIZE: 9, // points
  NIGHT_ORDER_LABEL_WIDTH: 1.0,

  // Center content (logo or name)
  LOGO_MAX_HEIGHT: 4.5,
  LOGO_MAX_WIDTH: 6.5,
  NAME_FONT_SIZE: 48, // points
  NAME_MAX_WIDTH: 6.5,

  // Player count table
  PLAYER_COUNT_HEIGHT: 1.6,
  PLAYER_COUNT_MARGIN_TOP: 0.3,
  PLAYER_COUNT_HEADER_FONT_SIZE: 10, // points
  PLAYER_COUNT_CELL_FONT_SIZE: 9, // points
  PLAYER_COUNT_CELL_WIDTH: 0.4,
  PLAYER_COUNT_ROW_HEIGHT: 0.28,

  // Jinx/Fabled sections on back (if configured)
  SECTION_MARGIN_TOP: 0.3,
} as const;

// ============================================================================
// FONTS
// ============================================================================

/**
 * Default fonts for Player Script
 */
export const PLAYER_SCRIPT_FONTS = {
  TITLE: 'Dumbledor',
  AUTHOR: 'Goudy Old Style',
  CHARACTER_NAME: 'Trade Gothic Bold',
  CHARACTER_ABILITY: 'Trade Gothic',
  TEAM_LABEL: 'Trade Gothic Bold',
  FOOTER: 'Trade Gothic',
  JINX_TEXT: 'Trade Gothic',
  FABLED_NAME: 'Trade Gothic Bold',
  FABLED_ABILITY: 'Trade Gothic',
} as const;

/**
 * Default fonts for Night Order
 */
export const NIGHT_ORDER_FONTS = {
  TITLE: 'Trade Gothic Bold',
  CHARACTER_NAME: 'Trade Gothic Bold',
  CHARACTER_ABILITY: 'Trade Gothic',
} as const;

/**
 * Fallback font stack
 */
export const FALLBACK_FONTS = 'system-ui, -apple-system, sans-serif';

// ============================================================================
// TEAM COLORS & LABELS - Derived from SSOT in @/ts/constants.ts
// ============================================================================

/**
 * Team colors for script PDF (hex strings)
 * Derived from the SSOT in @/ts/constants.ts
 */
export const TEAM_COLORS: Record<Team, string> = {
  townsfolk: getTeamHexColor('townsfolk'),
  outsider: getTeamHexColor('outsider'),
  minion: getTeamHexColor('minion'),
  demon: getTeamHexColor('demon'),
  traveller: getTeamHexColor('traveller'),
  fabled: getTeamHexColor('fabled'),
  loric: getTeamHexColor('loric'),
  meta: getTeamHexColor('meta'),
};

/**
 * Team label text (uppercase for vertical display)
 */
export const TEAM_LABELS: Record<Team, string> = {
  townsfolk: 'TOWNSFOLK',
  outsider: 'OUTSIDERS',
  minion: 'MINIONS',
  demon: 'DEMONS',
  traveller: 'TRAVELLERS',
  fabled: 'FABLED',
  loric: 'LORIC',
  meta: 'META',
};

// ============================================================================
// PLAYER COUNT TABLE DATA
// ============================================================================

/**
 * Standard player count breakdown table
 */
export const PLAYER_COUNT_TABLE: PlayerCountEntry[] = [
  { players: 5, townsfolk: 3, outsiders: 0, minions: 1, demons: 1 },
  { players: 6, townsfolk: 3, outsiders: 1, minions: 1, demons: 1 },
  { players: 7, townsfolk: 5, outsiders: 0, minions: 1, demons: 1 },
  { players: 8, townsfolk: 5, outsiders: 1, minions: 1, demons: 1 },
  { players: 9, townsfolk: 5, outsiders: 2, minions: 1, demons: 1 },
  { players: 10, townsfolk: 7, outsiders: 0, minions: 2, demons: 1 },
  { players: 11, townsfolk: 7, outsiders: 1, minions: 2, demons: 1 },
  { players: 12, townsfolk: 7, outsiders: 2, minions: 2, demons: 1 },
  { players: 13, townsfolk: 9, outsiders: 0, minions: 3, demons: 1 },
  { players: 14, townsfolk: 9, outsiders: 1, minions: 3, demons: 1 },
  { players: '15+', townsfolk: 9, outsiders: 2, minions: 3, demons: 1 },
];

// ============================================================================
// DEFAULT BACKGROUND STYLE
// ============================================================================

/**
 * Default background style for script PDFs - parchment-style with subtle texture
 */
export const DEFAULT_SCRIPT_PDF_BACKGROUND: BackgroundStyle = {
  sourceType: 'styled',
  mode: 'solid',
  solidColor: '#f4edd9', // Warm parchment color
  gradient: {
    ...DEFAULT_GRADIENT_CONFIG,
    colorStart: '#f4edd9',
    colorEnd: '#e8dcc8',
  },
  texture: {
    type: 'parchment',
    intensity: 30,
    scale: 1,
    seed: 12345,
    randomizeSeedPerToken: false,
    blendMode: 'soft-light',
    contrast: 5,
  },
  effects: {
    ...DEFAULT_EFFECTS_CONFIG,
    vignetteEnabled: false,
    borderEnabled: false,
  },
  light: DEFAULT_LIGHT_CONFIG,
};

// ============================================================================
// DEFAULT SETTINGS
// ============================================================================

/**
 * Default margin configuration
 */
export const DEFAULT_MARGINS: MarginConfig = {
  top: PLAYER_SCRIPT_FRONT.MARGIN_TOP,
  bottom: PLAYER_SCRIPT_FRONT.MARGIN_BOTTOM,
  left: PLAYER_SCRIPT_FRONT.MARGIN_LEFT,
  right: PLAYER_SCRIPT_FRONT.MARGIN_RIGHT,
};

/**
 * Default Player Script settings
 */
export const DEFAULT_PLAYER_SCRIPT_SETTINGS: PlayerScriptSettings = {
  enabled: true,
  margins: DEFAULT_MARGINS,
  background: DEFAULT_SCRIPT_PDF_BACKGROUND,
  iconScale: 1.0,
  fonts: {
    scriptName: PLAYER_SCRIPT_FONTS.TITLE,
    author: PLAYER_SCRIPT_FONTS.AUTHOR,
    characterName: PLAYER_SCRIPT_FONTS.CHARACTER_NAME,
    abilityText: PLAYER_SCRIPT_FONTS.CHARACTER_ABILITY,
    teamLabel: PLAYER_SCRIPT_FONTS.TEAM_LABEL,
  },
  showAuthor: true,
  showVersion: true,
  includeBackingSheet: true,
  columns: 'auto',
  titleStyle: 'centered',
  showJinxIconsInline: false,
  scaleIcons: true,
  showDecorations: true,
  showJinxes: true,
  showFabled: true,
};

/**
 * Default Backing Sheet settings
 */
export const DEFAULT_BACKING_SHEET_SETTINGS: BackingSheetSettings = {
  enabled: true,
  margins: DEFAULT_MARGINS,
  background: DEFAULT_SCRIPT_PDF_BACKGROUND,
  iconScale: 1.0,
  backingContent: 'name',
  logoScale: 1.0,
  // Additional Information
  showJinxes: true,
  showFabled: true,
  showTravellers: false,
  showBootlegger: true,
  showLoric: false,
  // Options
  showNightOrderOnBack: true,
  showPlayerCountOnBack: true,
};

/**
 * Default Night Order settings
 */
export const DEFAULT_NIGHT_ORDER_SETTINGS: NightOrderSettings = {
  enabled: true,
  margins: {
    top: 0.3,
    bottom: 0.3,
    left: 0.3,
    right: 0.3,
  },
  background: DEFAULT_SCRIPT_PDF_BACKGROUND, // Unified background style
  iconScale: 1.0,
  fonts: {
    title: NIGHT_ORDER_FONTS.TITLE,
    characterName: NIGHT_ORDER_FONTS.CHARACTER_NAME,
    abilityText: NIGHT_ORDER_FONTS.CHARACTER_ABILITY,
  },
  scaleIcons: true,
  showDecorations: true,
};

/**
 * Complete default settings for script PDF generation
 */
export const DEFAULT_SCRIPT_PDF_SETTINGS: ScriptPdfSettings = {
  playerScript: DEFAULT_PLAYER_SCRIPT_SETTINGS,
  backingSheet: DEFAULT_BACKING_SHEET_SETTINGS,
  nightOrder: DEFAULT_NIGHT_ORDER_SETTINGS,
};

// ============================================================================
// MISCELLANEOUS
// ============================================================================

/**
 * Footer text for player script
 */
export const FOOTER_TEXT = {
  NOT_FIRST_NIGHT: '*Not the first night',
  COPYRIGHT: '\u00A9 bloodontheclocktower.com',
} as const;

/**
 * Special character handling
 */
export const SPECIAL_CHARACTERS = {
  /** Characters that should be excluded from player script (meta entries, etc.) */
  EXCLUDED_IDS: ['_meta', 'dusk', 'dawn', 'minioninfo', 'demoninfo'],
} as const;
