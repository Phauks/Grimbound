/**
 * Blood on the Clocktower Token Generator
 * Configuration and Constants
 */

import type { Config, Team, TeamColors, TeamLabels } from './types/index.js';

export const CONFIG: Config = {
    // Application Version
    VERSION: '0.1.0',

    // Token Generation Defaults
    TOKEN: {
        ROLE_DIAMETER: 300,
        REMINDER_DIAMETER: 525,
        DISPLAY_ABILITY_TEXT: false,
        TOKEN_COUNT: false
    },

    // Style Defaults
    STYLE: {
        LEAF_GENERATION: 'leaves_1',
        MAXIMUM_LEAVES: 3,
        LEAF_POPULATION_PROBABILITY: 30,
        SETUP_FLOWER_STYLE: 'setup_flower_1',
        REMINDER_BACKGROUND: '#FFFFFF',
        CHARACTER_BACKGROUND: 'character_background_1',
        CHARACTER_NAME_FONT: 'Dumbledor',
        CHARACTER_REMINDER_FONT: 'TradeGothic'
    },

    // PDF Generation Defaults
    PDF: {
        TOKEN_PADDING: 75,
        X_OFFSET: 0,
        Y_OFFSET: 0,
        PAGE_WIDTH: 8.5,  // inches
        PAGE_HEIGHT: 11,   // inches
        DPI: 300,
        MARGIN: 0.25       // inches
    },

    // API Endpoints
    API: {
        BOTC_DATA: 'https://script.bloodontheclocktower.com/data.json'
    },

    // Asset Paths
    ASSETS: {
        FONTS: './assets/fonts/',
        IMAGES: './assets/images/',
        CHARACTER_BACKGROUNDS: './assets/images/character_background/',
        SETUP_FLOWERS: './assets/images/setup_flower/',
        LEAVES: './assets/images/'
    },

    // Example Scripts
    EXAMPLE_SCRIPTS: [
        'Uncertain Death.json',
        'Fall of Rome.json'
    ],

    // Team Types
    TEAMS: ['townsfolk', 'outsider', 'minion', 'demon', 'traveller', 'fabled', 'loric'] as Team[],

    // Font Settings
    FONTS: {
        CHARACTER_NAME: {
            SIZE_RATIO: 0.12,  // Relative to diameter
            CURVE_OFFSET: 0.85  // Position along curve (0-1)
        },
        REMINDER_TEXT: {
            SIZE_RATIO: 0.08,
            CURVE_OFFSET: 0.85
        },
        ABILITY_TEXT: {
            SIZE_RATIO: 0.05,
            LINE_HEIGHT: 1.3
        },
        TOKEN_COUNT: {
            SIZE_RATIO: 0.08
        }
    }
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
    loric: '#2a5f5f'
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
    loric: 'Loric'
};

export default CONFIG;
