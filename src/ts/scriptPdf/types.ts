/**
 * Script PDF Types
 *
 * Shared type definitions for script PDF generation including
 * Player Script and Night Order sheets.
 */

import type { BackgroundStyle } from '@/ts/types/backgroundEffects.js';
import type { Jinx, ScriptMeta, Team } from '@/ts/types/index.js';

// Re-export BackgroundStyle for convenience
export type { BackgroundStyle };

// ============================================================================
// PLAYER SCRIPT TYPES
// ============================================================================

/**
 * Column layout options for character display
 * - 1: Single column layout
 * - 2: Two column layout
 * - 'auto': Automatically choose based on character count
 */
export type ColumnLayout = 1 | 2 | 'auto';

/**
 * Title style options for the player script header
 * - 'centered': Centered title with author/version below
 * - 'compact': Left-aligned smaller title with author/version on the right
 */
export type TitleStyle = 'centered' | 'compact';

/**
 * Location for optional content sections
 */
export type ContentLocation = 'front' | 'back';

/**
 * What to display in the center of the backing sheet
 */
export type BackingContentType = 'none' | 'name' | 'logo';

/**
 * Options for player script generation
 */
export interface PlayerScriptOptions {
  // Layout
  /** Column layout: 1, 2, or 'auto' to decide based on character count */
  columns: ColumnLayout;

  // Content toggles
  /** Whether to include jinxes section */
  includeJinxes: boolean;
  /** Whether to include fabled section */
  includeFabled: boolean;
  /** Where to render jinxes (front page or backing sheet) */
  jinxesLocation: ContentLocation;
  /** Where to render fabled characters (front page or backing sheet) */
  fabledLocation: ContentLocation;

  // Backing sheet options
  /** What to display in center of backing sheet: script name text or logo image */
  backingContent: BackingContentType;
  /** Whether to include night order icons on backing sheet */
  includeNightOrderIcons: boolean;
  /** Whether to include player count table on backing sheet */
  includePlayerCount: boolean;

  // Styling - uses full BackgroundStyle from Token view
  /** Background style configuration (solid, gradient, texture, effects) */
  background: BackgroundStyle;

  // Custom ordering
  /** Character IDs in custom display order (overrides SAO sorting) */
  customOrder?: string[];
}

/**
 * A character prepared for player script rendering
 */
export interface PlayerScriptCharacter {
  /** Unique character ID */
  id: string;
  /** Display name */
  name: string;
  /** Team/faction */
  team: Team;
  /** Ability text */
  ability: string;
  /** Image URL or asset reference */
  image: string;
  /** Whether character affects setup (shown with setup icon) */
  setup?: boolean;
  /** Jinxes this character has with other characters */
  jinxes?: Jinx[];
  /** UUID for custom characters */
  uuid?: string;
}

/**
 * A jinx entry prepared for display
 */
export interface PlayerScriptJinx {
  /** First character in the jinx pair */
  char1: {
    id: string;
    name: string;
    image: string;
  };
  /** Second character in the jinx pair */
  char2: {
    id: string;
    name: string;
    image: string;
  };
  /** The jinx rule text */
  reason: string;
}

/**
 * Night order icon entry for the backing sheet
 */
export interface NightOrderIcon {
  /** Character ID */
  id: string;
  /** Image URL */
  image: string;
  /** Optional character name for tooltips */
  name?: string;
}

/**
 * Complete data for player script generation
 */
export interface PlayerScriptData {
  /** Script metadata (name, author, etc.) */
  scriptMeta: ScriptMeta | null;
  /** All characters in the script, organized for display */
  characters: PlayerScriptCharacter[];
  /** Fabled characters to include */
  fabled: PlayerScriptCharacter[];
  /** Active jinxes between characters in the script */
  jinxes: PlayerScriptJinx[];
  /** First night order for backing sheet */
  firstNightOrder: NightOrderIcon[];
  /** Other nights order for backing sheet */
  otherNightOrder: NightOrderIcon[];
}

/**
 * Player count breakdown for a specific player count
 */
export interface PlayerCountEntry {
  /** Number of players (or '15+' for 15 or more) */
  players: number | string;
  /** Number of Townsfolk */
  townsfolk: number;
  /** Number of Outsiders */
  outsiders: number;
  /** Number of Minions */
  minions: number;
  /** Number of Demons */
  demons: number;
}

// ============================================================================
// UNIFIED PDF SETTINGS
// ============================================================================

/**
 * Margin configuration in inches
 */
export interface MarginConfig {
  /** Top margin in inches */
  top: number;
  /** Bottom margin in inches */
  bottom: number;
  /** Left margin in inches */
  left: number;
  /** Right margin in inches */
  right: number;
}

/**
 * Font configuration for a specific text element
 */
export interface FontConfig {
  /** Font family name */
  family: string;
  /** Font size in points (optional, uses defaults if not specified) */
  size?: number;
  /** Font weight (optional) */
  weight?: 'normal' | 'bold';
}

/**
 * Player Script specific settings
 */
export interface PlayerScriptSettings {
  /** Whether Player Script export is enabled */
  enabled: boolean;

  /** Page margins in inches */
  margins: MarginConfig;

  /** Background style configuration */
  background: BackgroundStyle;

  /** Icon scale multiplier (0.5 to 2.0, default 1.0) */
  iconScale: number;

  // Font settings
  /** Font configurations for different text elements */
  fonts: {
    /** Script name/title font */
    scriptName: string;
    /** Author name font */
    author: string;
    /** Character name font */
    characterName: string;
    /** Ability text font */
    abilityText: string;
    /** Team label font (vertical labels) */
    teamLabel: string;
  };

  // Content toggles
  /** Whether to show author name */
  showAuthor: boolean;
  /** Whether to show version number */
  showVersion: boolean;
  /** Whether to generate backing sheet */
  includeBackingSheet: boolean;
  /** Column layout: 1, 2, or 'auto' */
  columns: ColumnLayout;

  // Header/Title settings
  /** Title style: 'centered' or 'compact' */
  titleStyle: TitleStyle;

  // Jinx inline icons (on front page character entries)
  /** Whether to show small jinx icon next to character name */
  showJinxIconsInline: boolean;

  // Visual settings
  /** Whether to scale icons to fit available space */
  scaleIcons: boolean;
  /** Whether to show decorative elements */
  showDecorations: boolean;

  // Custom character order (persisted per-project)
  /** Character IDs in custom order */
  customOrder?: string[];

  // Jinx and Fabled sections (shown on back page when enabled)
  /** Whether to show jinxes section on back page */
  showJinxes: boolean;
  /** Whether to show fabled section on back page */
  showFabled: boolean;
}

/**
 * Backing Sheet specific settings
 */
export interface BackingSheetSettings {
  /** Whether Backing Sheet export is enabled */
  enabled: boolean;

  /** Page margins in inches */
  margins: MarginConfig;

  /** Background style configuration */
  background: BackgroundStyle;

  /** Icon scale multiplier (0.5 to 2.0, default 1.0) */
  iconScale: number;

  /** What to show in center: 'none', 'name', or 'logo' */
  backingContent: BackingContentType;

  /** Logo scale multiplier when backingContent is 'logo' (0.5 to 2.0, default 1.0) */
  logoScale: number;

  // Additional Information (sections shown on backing sheet)
  /** Whether to show jinxes section on backing sheet */
  showJinxes: boolean;
  /** Whether to show fabled section on backing sheet */
  showFabled: boolean;
  /** Whether to show recommended travellers from script meta */
  showTravellers: boolean;
  /** Whether to show bootlegger abilities from script meta */
  showBootlegger: boolean;
  /** Whether to show loric characters on backing sheet */
  showLoric: boolean;

  // Options
  /** Whether to show night order icons on backing sheet */
  showNightOrderOnBack: boolean;
  /** Whether to show player count table on backing sheet */
  showPlayerCountOnBack: boolean;
}

/**
 * Night Order specific settings
 */
export interface NightOrderSettings {
  /** Whether Night Order export is enabled */
  enabled: boolean;

  /** Page margins in inches */
  margins: MarginConfig;

  /** Background style configuration (solid, gradient, texture, image, effects) */
  background: BackgroundStyle;

  /** Icon scale multiplier (0.5 to 2.0, default 1.0) */
  iconScale: number;

  // Font settings
  /** Font configurations for different text elements */
  fonts: {
    /** Title font */
    title: string;
    /** Character name font */
    characterName: string;
    /** Ability text font */
    abilityText: string;
  };

  // Visual settings
  /** Whether to scale icons to fit available space */
  scaleIcons: boolean;
  /** Whether to show decorative elements */
  showDecorations: boolean;
}

/**
 * Complete settings for all script PDF generation
 * Stored in ScriptPdfContext and persisted per-project
 */
export interface ScriptPdfSettings {
  /** Player Script specific settings */
  playerScript: PlayerScriptSettings;
  /** Backing Sheet specific settings */
  backingSheet: BackingSheetSettings;
  /** Night Order specific settings */
  nightOrder: NightOrderSettings;
}

// ============================================================================
// CONTEXT TYPES
// ============================================================================

/**
 * Export progress state
 */
export interface ExportProgress {
  /** Current phase of export */
  phase: 'idle' | 'rendering' | 'generating' | 'saving';
  /** Current step number */
  current: number;
  /** Total steps */
  total: number;
  /** Optional message */
  message?: string;
}

/**
 * Deep partial utility type for nested updates
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * ScriptPdfContext value interface
 */
export interface ScriptPdfContextValue {
  /** Current settings */
  settings: ScriptPdfSettings;

  /** Export state */
  isExporting: boolean;
  exportProgress: ExportProgress;

  /** Settings actions */
  updateSettings: (updates: DeepPartial<ScriptPdfSettings>) => void;
  resetSettings: () => void;

  /** Character ordering actions (for player script) */
  reorderCharacters: (fromIndex: number, toIndex: number) => void;
  resetCharacterOrder: () => void;

  /** Export actions */
  exportPlayerScript: () => Promise<void>;
  exportNightOrder: () => Promise<void>;
  exportAll: () => Promise<void>;
}

// ============================================================================
// RENDER TYPES
// ============================================================================

/**
 * Text position data extracted for hybrid PDF rendering
 */
export interface TextPosition {
  /** Text content */
  text: string;
  /** X position in points */
  x: number;
  /** Y position in points */
  y: number;
  /** Font size in points */
  fontSize: number;
  /** Font family */
  fontFamily: string;
  /** Font weight */
  fontWeight?: 'normal' | 'bold';
  /** Text color (hex) */
  color: string;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Maximum width for wrapping */
  maxWidth?: number;
}

/**
 * Render result from hybrid renderer
 */
export interface HybridRenderResult {
  /** Rendered canvas */
  canvas: HTMLCanvasElement;
  /** Extracted text positions for PDF overlay */
  textPositions: TextPosition[];
  /** Page width in points */
  pageWidth: number;
  /** Page height in points */
  pageHeight: number;
}
