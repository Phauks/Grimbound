import type { FontSpacingOptions, GenerationOptions, TextShadowOptions } from '@/ts/types';

/**
 * Create default font spacing options.
 */
export function createDefaultFontSpacing(): FontSpacingOptions {
  return {
    characterName: 0,
    characterText: 0,
    reminderText: 0,
    metaName: 0,
    metaText: 0,
  };
}

/**
 * Create default text shadow options.
 */
export function createDefaultTextShadow(): TextShadowOptions {
  return {
    characterName: 2,
    characterText: 1,
    reminderText: 1,
    metaName: 2,
    metaText: 1,
  };
}

/**
 * Create minimal generation options (fewest tokens possible).
 */
export function createMinimalGenerationOptions(): GenerationOptions {
  return {
    displayAbilityText: false,
    generateBootleggerRules: false,
    tokenCount: false,
    setupStyle: 'none',
    reminderBackground: '#000000',
    characterBackground: 'Moon Phases',
    characterNameFont: 'Dumbledore',
    characterReminderFont: 'Dumbledore',
    scriptNameToken: false,
    almanacToken: false,
    pandemoniumToken: false,
    dpi: 300,
  };
}

/**
 * Create full generation options (all tokens enabled).
 */
export function createFullGenerationOptions(): GenerationOptions {
  return {
    displayAbilityText: true,
    generateBootleggerRules: true,
    tokenCount: true,
    setupStyle: 'official',
    reminderBackground: 'Moss',
    characterBackground: 'Moon Phases',
    characterNameFont: 'Dumbledore',
    characterReminderFont: 'Dumbledore',
    scriptNameToken: true,
    almanacToken: true,
    pandemoniumToken: true,
    dpi: 300,
    accentEnabled: true,
    accentGeneration: 'random',
    maximumAccents: 3,
    accentPopulationProbability: 0.5,
    fontSpacing: createDefaultFontSpacing(),
    textShadow: createDefaultTextShadow(),
  };
}

/**
 * Create generation options with custom overrides.
 */
export function createGenerationOptions(
  overrides: Partial<GenerationOptions> = {}
): GenerationOptions {
  return {
    displayAbilityText: true,
    generateBootleggerRules: false,
    tokenCount: true,
    setupStyle: 'official',
    reminderBackground: 'Moss',
    characterBackground: 'Moon Phases',
    characterNameFont: 'Dumbledore',
    characterReminderFont: 'Dumbledore',
    scriptNameToken: false,
    almanacToken: false,
    pandemoniumToken: false,
    dpi: 300,
    ...overrides,
  };
}
