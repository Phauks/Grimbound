/**
 * Blood on the Clocktower Token Generator
 * Configuration and Constants
 */

import { EXAMPLE_SCRIPT_LIST } from './data/exampleScripts.js';
import type {
  AveryTemplate,
  AveryTemplateId,
  Config,
  Team,
  TeamColors,
  TeamLabels,
} from './types/index.js';

/**
 * Avery label template specifications
 * Based on Avery Presta templates for round labels
 */
export const AVERY_TEMPLATES: Record<Exclude<AveryTemplateId, 'custom'>, AveryTemplate> = {
  'avery-94500': {
    id: 'avery-94500',
    name: 'Avery 94500 (1.75" Round)',
    labelDiameter: 1.75, // inches - matches character tokens
    columns: 4,
    rows: 5,
    leftMargin: 0.375, // 3/8 inch
    topMargin: 0.625, // 5/8 inch
    gap: 0.25, // 1/4 inch between labels
    labelsPerSheet: 20,
  },
  'avery-94509': {
    id: 'avery-94509',
    name: 'Avery 94509 (1" Round)',
    labelDiameter: 1.0, // inches - matches reminder tokens
    columns: 6,
    rows: 8,
    leftMargin: 0.625, // 5/8 inch
    topMargin: 0.625, // 5/8 inch
    gap: 0.25, // 1/4 inch between labels
    labelsPerSheet: 48,
  },
};

export const CONFIG: Config = {
  // Application Version
  VERSION: '0.2.0',

  // Token Generation Defaults
  TOKEN: {
    // Physical sizes in inches (not configurable by users)
    ROLE_DIAMETER_INCHES: 1.75, // Character token diameter
    REMINDER_DIAMETER_INCHES: 1, // Reminder token diameter
    DISPLAY_ABILITY_TEXT: false,
    TOKEN_COUNT: false,
  },

  // Style Defaults
  STYLE: {
    ACCENT_GENERATION: 'classic',
    MAXIMUM_ACCENTS: 5,
    ACCENT_POPULATION_PROBABILITY: 30,
    ACCENT_ARC_SPAN: 120,
    ACCENT_SLOTS: 7,
    SETUP_STYLE: 'setup_flower_1',
    REMINDER_BACKGROUND: '#6C3BAA',
    CHARACTER_BACKGROUND: 'character_background_1',
    CHARACTER_NAME_FONT: 'Dumbledor',
    CHARACTER_NAME_COLOR: '#000000',
    CHARACTER_REMINDER_FONT: 'TradeGothic',
    ABILITY_TEXT_FONT: 'TradeGothic',
    ABILITY_TEXT_COLOR: '#000000',
    REMINDER_TEXT_COLOR: '#FFFFFF',
  },

  // PDF Generation Defaults (based on Avery 94500 template for character tokens)
  PDF: {
    TOKEN_PADDING: 75, // pixels between tokens (legacy, template gap used when template set)
    X_OFFSET: 0, // horizontal offset in mm (fine-tuning)
    Y_OFFSET: 0, // vertical offset in mm (fine-tuning)
    PAGE_WIDTH: 8.5, // inches
    PAGE_HEIGHT: 11, // inches
    DPI: 300,
    MARGIN: 0.375, // inches (Avery 94500 left/right margin)
    IMAGE_QUALITY: 0.9, // JPEG quality (0.0-1.0, default 90%)
    DEFAULT_TEMPLATE: 'avery-94500' as const, // Default to Avery 94500 for character tokens
  },

  // Font Spacing Defaults
  FONT_SPACING: {
    CHARACTER_NAME: 0, // 0px = normal spacing
    ABILITY_TEXT: 0,
    REMINDER_TEXT: 0,
    META_TEXT: 0,
  },

  // Text Shadow Defaults
  TEXT_SHADOW: {
    CHARACTER_NAME: 0, // 0px blur radius (disabled by default)
    ABILITY_TEXT: 0, // 0px blur radius (disabled by default)
    REMINDER_TEXT: 0, // 0px blur radius (disabled by default)
    META_TEXT: 0, // 0px blur radius (disabled by default)
  },

  // ZIP Export Settings
  ZIP: {
    SAVE_IN_TEAM_FOLDERS: true,
    SAVE_REMINDERS_SEPARATELY: true,
  },

  // Batch Generation Settings
  GENERATION: {
    // Adaptive batch size based on CPU cores
    // Formula: min(8, max(2, cores - 1))
    // 2-core: 2 parallel, 4-core: 3, 8-core: 7, 16-core: 8 (capped)
    BATCH_SIZE: Math.min(
      8,
      Math.max(2, (typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 4) - 1)
    ),
    MIN_BATCH_SIZE: 2,
    MAX_BATCH_SIZE: 8,
  },

  // Data Synchronization Settings
  SYNC: {
    // GitHub repository for official data releases
    GITHUB_REPO: 'Phauks/Blood-on-the-Clocktower---Official-Data-Sync',
    GITHUB_API_BASE: 'https://api.github.com',

    // How often to check for updates (1 hour in milliseconds)
    CHECK_INTERVAL_MS: 3600000,

    // Cache time-to-live (24 hours in milliseconds)
    CACHE_TTL_MS: 86400000,

    // Storage quota warning threshold (in MB)
    STORAGE_QUOTA_WARNING_MB: 20,

    // Maximum storage allowed (in MB, soft limit)
    MAX_STORAGE_MB: 50,

    // Enable automatic background sync
    ENABLE_AUTO_SYNC: true,

    // Retry settings for failed requests
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 1000, // Initial delay, uses exponential backoff

    // IndexedDB configuration
    DB_NAME: 'botc-token-generator',
    DB_VERSION: 1,

    // Cache API configuration
    CACHE_NAME: 'botc-character-icons-v1',
  },

  // Auto-generation Default
  AUTO_GENERATE_DEFAULT: true,

  // API Endpoints
  API: {
    CORS_PROXY: 'https://cors-header-proxy.infiniteinstants.com/?', // Cloudflare Workers CORS proxy
  },

  // Asset Paths (served from publicDir 'assets')
  // Uses import.meta.env.BASE_URL for correct path resolution on GitHub Pages
  ASSETS: {
    FONTS: `${import.meta.env.BASE_URL}fonts/`,
    IMAGES: `${import.meta.env.BASE_URL}images/`,
    CHARACTER_BACKGROUNDS: `${import.meta.env.BASE_URL}images/character_background/`,
    SETUP_OVERLAYS: `${import.meta.env.BASE_URL}images/setup_overlays/`,
    ACCENTS: `${import.meta.env.BASE_URL}images/`,
  },

  // Example Scripts (auto-populated from example_scripts folder)
  // To add a new script, simply add a .json file to the example_scripts/ folder
  EXAMPLE_SCRIPTS: EXAMPLE_SCRIPT_LIST,

  // Team Types
  TEAMS: [
    'townsfolk',
    'outsider',
    'minion',
    'demon',
    'traveller',
    'fabled',
    'loric',
    'meta',
  ] as Team[],

  // Font Settings
  FONTS: {
    CHARACTER_NAME: {
      SIZE_RATIO: 0.12, // Relative to diameter
      CURVE_OFFSET: 0.85, // Position along curve (0-1)
    },
    REMINDER_TEXT: {
      SIZE_RATIO: 0.08,
      CURVE_OFFSET: 0.85,
    },
    ABILITY_TEXT: {
      SIZE_RATIO: 0.05,
      LINE_HEIGHT: 1.3,
    },
    TOKEN_COUNT: {
      SIZE_RATIO: 0.08,
    },
  },

  // Trademark Token
  TRADEMARK: {
    TEXT: 'Blood on the Clocktower is a product of the Pandemonium Institute',
  },
};

/**
 * Team color mapping for display purposes
 */
export const TEAM_COLORS: TeamColors = {
  townsfolk: '#1a5f2a',
  outsider: '#1a3f5f',
  minion: '#5f1a3f',
  demon: '#8b0000',
  traveller: '#5f4f1a',
  fabled: '#4f1a5f',
  loric: '#2a5f5f',
  meta: '#808080',
};

/**
 * Team labels for display
 */
export const TEAM_LABELS: TeamLabels = {
  townsfolk: 'Townsfolk',
  outsider: 'Outsider',
  minion: 'Minion',
  demon: 'Demon',
  traveller: 'Traveller',
  fabled: 'Fabled',
  loric: 'Loric',
  meta: 'Meta',
};

export default CONFIG;
