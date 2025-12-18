/**
 * Blood on the Clocktower Token Generator
 * Preset Configurations
 */

import CONFIG from '@/ts/config.js';
import type { PresetConfig, PresetName } from '@/ts/types/index.js';

export const PRESETS: Record<PresetName, PresetConfig> = {
  classic: {
    name: 'Classic',
    description: 'Standard settings for balanced token generation',
    icon: '⚙️',
    settings: {
      displayAbilityText: CONFIG.TOKEN.DISPLAY_ABILITY_TEXT,
      tokenCount: CONFIG.TOKEN.TOKEN_COUNT,
      setupStyle: CONFIG.STYLE.SETUP_STYLE,
      reminderBackground: CONFIG.STYLE.REMINDER_BACKGROUND,
      characterBackground: CONFIG.STYLE.CHARACTER_BACKGROUND,
      characterNameFont: CONFIG.STYLE.CHARACTER_NAME_FONT,
      characterNameColor: '#000000',
      characterReminderFont: CONFIG.STYLE.CHARACTER_REMINDER_FONT,
      abilityTextFont: 'TradeGothic',
      abilityTextColor: '#000000',
      reminderTextColor: '#000000',
      maximumAccents: 0,
      pandemoniumToken: true,
      scriptNameToken: true,
      almanacToken: true,
      fontSpacing: {
        characterName: 0,
        abilityText: 0,
        reminderText: 0,
        metaText: 0,
      },
      textShadow: {
        characterName: 4,
        abilityText: 3,
        reminderText: 4,
        metaText: 4,
      },
      pngSettings: {
        embedMetadata: false,
        transparentBackground: false,
      },
      zipSettings: {
        saveInTeamFolders: true,
        saveRemindersSeparately: true,
        metaTokenFolder: true,
        includeScriptJson: false,
        compressionLevel: 'normal',
      },
    },
  },
  fullbloom: {
    name: 'Full Bloom',
    description: 'Maximum decorative elements with ornate styling',
    icon: '🌸',
    settings: {
      displayAbilityText: true,
      generateBootleggerRules: false,
      tokenCount: true,
      setupStyle: 'setup_flower_3',
      reminderBackground: '#FFF8DC',
      characterBackground: 'character_background_3',
      characterNameFont: 'Dumbledor 1',
      characterNameColor: '#1a1a2e',
      characterReminderFont: 'TradeGothic',
      abilityTextFont: 'TradeGothic',
      abilityTextColor: '#2d2d44',
      reminderTextColor: '#1a1a2e',
      maximumAccents: 5,
      pandemoniumToken: true,
      scriptNameToken: true,
      almanacToken: true,
      fontSpacing: {
        characterName: 2,
        abilityText: 1,
        reminderText: 1,
        metaText: 2,
      },
      textShadow: {
        characterName: 6,
        abilityText: 4,
        reminderText: 5,
        metaText: 6,
      },
      pngSettings: {
        embedMetadata: true,
        transparentBackground: false,
      },
      zipSettings: {
        saveInTeamFolders: true,
        saveRemindersSeparately: true,
        metaTokenFolder: true,
        includeScriptJson: true,
        compressionLevel: 'normal',
      },
    },
  },
  minimal: {
    name: 'Minimal',
    description: 'Clean, simple tokens with reduced visual elements',
    icon: '⬜',
    settings: {
      displayAbilityText: false,
      generateBootleggerRules: false,
      tokenCount: false,
      setupStyle: 'setup_flower_1',
      reminderBackground: '#FFFFFF',
      characterBackground: 'character_background_1',
      characterNameFont: 'TradeGothic',
      characterNameColor: '#000000',
      characterReminderFont: 'TradeGothic',
      abilityTextFont: 'TradeGothic',
      abilityTextColor: '#333333',
      reminderTextColor: '#000000',
      maximumAccents: 0,
      pandemoniumToken: false,
      scriptNameToken: false,
      almanacToken: false,
      fontSpacing: {
        characterName: 0,
        abilityText: 0,
        reminderText: 0,
        metaText: 0,
      },
      textShadow: {
        characterName: 2,
        abilityText: 2,
        reminderText: 2,
        metaText: 2,
      },
      pngSettings: {
        embedMetadata: false,
        transparentBackground: false,
      },
      zipSettings: {
        saveInTeamFolders: false,
        saveRemindersSeparately: false,
        metaTokenFolder: false,
        includeScriptJson: false,
        compressionLevel: 'fast',
      },
    },
  },
};

export function getPreset(name: PresetName): PresetConfig {
  return PRESETS[name];
}

export function getPresetNames(): PresetName[] {
  return Object.keys(PRESETS) as PresetName[];
}

export default PRESETS;
