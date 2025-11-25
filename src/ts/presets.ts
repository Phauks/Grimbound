/**
 * Blood on the Clocktower Token Generator
 * Preset Configurations
 */

import type { PresetConfig, PresetName } from './types/index.js';
import CONFIG from './config.js';

export const PRESETS: Record<PresetName, PresetConfig> = {
    default: {
        name: 'Default',
        description: 'Standard settings for balanced token generation',
        icon: '⚙️',
        settings: {
            displayAbilityText: CONFIG.TOKEN.DISPLAY_ABILITY_TEXT,
            roleDiameter: CONFIG.TOKEN.ROLE_DIAMETER,
            reminderDiameter: CONFIG.TOKEN.REMINDER_DIAMETER,
            tokenCount: CONFIG.TOKEN.TOKEN_COUNT,
            setupFlowerStyle: CONFIG.STYLE.SETUP_FLOWER_STYLE,
            reminderBackground: CONFIG.STYLE.REMINDER_BACKGROUND,
            characterBackground: CONFIG.STYLE.CHARACTER_BACKGROUND,
            characterNameFont: CONFIG.STYLE.CHARACTER_NAME_FONT,
            characterReminderFont: CONFIG.STYLE.CHARACTER_REMINDER_FONT,
            scriptNameToken: true,
            almanacToken: true
        }
    },
    fullbloom: {
        name: 'Full Bloom',
        description: 'Maximum decorative elements with flowers and leaves (Coming Soon)',
        icon: '🌸',
        settings: {
            // TBI - Will include leaf overlay generation with high probability,
            // maximum flower density, ornate character backgrounds,
            // and enhanced decorative borders
            displayAbilityText: false,
            roleDiameter: 300,
            reminderDiameter: 525,
            tokenCount: true,
            setupFlowerStyle: 'setup_flower_1',
            reminderBackground: '#FFF8DC',
            characterBackground: 'character_background_1',
            characterNameFont: 'Dumbledor',
            characterReminderFont: 'TradeGothic',
            scriptNameToken: true,
            almanacToken: true
        }
    },
    minimal: {
        name: 'Minimal',
        description: 'Clean, simple tokens without decorative elements (Coming Soon)',
        icon: '⬜',
        settings: {
            // TBI - Will include plain solid backgrounds, no setup flowers,
            // no leaf overlays, simple sans-serif fonts,
            // and reduced visual decorations
            displayAbilityText: false,
            roleDiameter: 300,
            reminderDiameter: 525,
            tokenCount: false,
            setupFlowerStyle: 'setup_flower_1',
            reminderBackground: '#FFFFFF',
            characterBackground: 'character_background_1',
            characterNameFont: 'TradeGothic',
            characterReminderFont: 'TradeGothic',
            scriptNameToken: false,
            almanacToken: false
        }
    }
};

export function getPreset(name: PresetName): PresetConfig {
    return PRESETS[name];
}

export function getPresetNames(): PresetName[] {
    return Object.keys(PRESETS) as PresetName[];
}

export default PRESETS;
