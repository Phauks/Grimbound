/**
 * Decorative Utilities
 *
 * Utilities for merging per-character decorative overrides with global generation options.
 * Used for live preview updates when editing character decoratives.
 *
 * @module utils/decorativeUtils
 */

import type { DecorativeOverrides, GenerationOptions } from '@/ts/types/index.js';

/** Default values for decorative settings when neither decoratives nor global options provide a value */
const DEFAULTS = {
  FONT_SPACING: 0,
  NAME_SHADOW_BLUR: 4,
  ABILITY_SHADOW_BLUR: 3,
  ICON_SCALE: 1.0,
  ICON_OFFSET: 0,
  TEXT_COLOR: '#FFFFFF',
} as const;

/**
 * Creates an effective GenerationOptions object by merging global options
 * with character-specific decorative overrides.
 *
 * When custom settings are disabled (useCustomSettings is false or undefined),
 * returns global options unchanged.
 * When enabled, decorative values take precedence over global values.
 *
 * @param globalOptions - The global generation options
 * @param decoratives - Character-specific decorative overrides
 * @returns Merged generation options with decoratives applied
 *
 * @example
 * ```ts
 * const effectiveOptions = createEffectiveOptions(generationOptions, decoratives);
 * const generator = new TokenGenerator(effectiveOptions);
 * ```
 */
export function createEffectiveOptions(
  globalOptions: GenerationOptions,
  decoratives: DecorativeOverrides | undefined
): GenerationOptions {
  // If no decoratives or custom settings disabled, return global options unchanged
  if (!decoratives?.useCustomSettings) {
    return globalOptions;
  }

  const d = decoratives;
  const g = globalOptions;

  return {
    ...globalOptions,
    // Background
    characterBackgroundStyle: d.backgroundStyle ?? g.characterBackgroundStyle,
    // Font
    characterNameFont: d.nameFont ?? g.characterNameFont,
    characterNameColor: d.nameColor ?? g.characterNameColor,
    fontSpacing: {
      characterName: d.nameFontSpacing ?? g.fontSpacing?.characterName ?? DEFAULTS.FONT_SPACING,
      abilityText: d.abilityTextFontSpacing ?? g.fontSpacing?.abilityText ?? DEFAULTS.FONT_SPACING,
      reminderText: g.fontSpacing?.reminderText ?? DEFAULTS.FONT_SPACING,
      metaText: g.fontSpacing?.metaText ?? DEFAULTS.FONT_SPACING,
    },
    textShadow: {
      characterName: d.nameTextShadow ?? g.textShadow?.characterName ?? DEFAULTS.NAME_SHADOW_BLUR,
      abilityText: d.abilityTextShadow ?? g.textShadow?.abilityText ?? DEFAULTS.ABILITY_SHADOW_BLUR,
      reminderText: g.textShadow?.reminderText ?? DEFAULTS.NAME_SHADOW_BLUR,
      metaText: g.textShadow?.metaText ?? DEFAULTS.NAME_SHADOW_BLUR,
    },
    // Icon
    iconSettings: {
      character: {
        scale: d.iconScale ?? g.iconSettings?.character?.scale ?? DEFAULTS.ICON_SCALE,
        offsetX: d.iconOffsetX ?? g.iconSettings?.character?.offsetX ?? DEFAULTS.ICON_OFFSET,
        offsetY: d.iconOffsetY ?? g.iconSettings?.character?.offsetY ?? DEFAULTS.ICON_OFFSET,
      },
      reminder: g.iconSettings?.reminder ?? {
        scale: DEFAULTS.ICON_SCALE,
        offsetX: DEFAULTS.ICON_OFFSET,
        offsetY: DEFAULTS.ICON_OFFSET,
      },
      meta: g.iconSettings?.meta ?? {
        scale: DEFAULTS.ICON_SCALE,
        offsetX: DEFAULTS.ICON_OFFSET,
        offsetY: DEFAULTS.ICON_OFFSET,
      },
    },
    // Ability text
    displayAbilityText: d.displayAbilityText ?? g.displayAbilityText,
    abilityTextFont: d.abilityTextFont ?? g.abilityTextFont,
    abilityTextColor: d.abilityTextColor ?? g.abilityTextColor,
    // Setup - apply hideSetupOverlay by setting setupStyle to empty string when hidden
    setupStyle: d.hideSetupOverlay === true ? '' : (d.setupStyle ?? g.setupStyle),
    // Accents
    accentEnabled: d.accentEnabled ?? g.accentEnabled,
    accentGeneration: d.accentGeneration ?? g.accentGeneration,
    maximumAccents: d.maximumAccents ?? g.maximumAccents,
    accentPopulationProbability: d.accentPopulationProbability ?? g.accentPopulationProbability,
    accentArcSpan: d.accentArcSpan ?? g.accentArcSpan,
    accentSlots: d.accentSlots ?? g.accentSlots,
    enableLeftAccent: d.enableLeftAccent ?? g.enableLeftAccent,
    enableRightAccent: d.enableRightAccent ?? g.enableRightAccent,
    sideAccentProbability: d.sideAccentProbability ?? g.sideAccentProbability,
  };
}

/**
 * Keys that map from DecorativeOverrides to GenerationOptions for accent settings.
 * Used for mapping partial GenerationOptions updates back to DecorativeOverrides.
 */
export const ACCENT_DECORATIVE_KEYS = [
  'accentEnabled',
  'accentGeneration',
  'maximumAccents',
  'accentPopulationProbability',
  'accentArcSpan',
  'accentSlots',
  'enableLeftAccent',
  'enableRightAccent',
  'sideAccentProbability',
] as const;

/**
 * Maps GenerationOptions changes to DecorativeOverrides updates for accent settings.
 * Only includes keys that are present in the options object.
 *
 * @param options - Partial GenerationOptions with accent settings
 * @returns Partial DecorativeOverrides with mapped accent values
 */
export function mapAccentOptionsToDecorative(
  options: Partial<GenerationOptions>
): Partial<DecorativeOverrides> {
  const updates: Partial<DecorativeOverrides> = {};

  for (const key of ACCENT_DECORATIVE_KEYS) {
    if (key in options) {
      (updates as Record<string, unknown>)[key] = (options as Record<string, unknown>)[key];
    }
  }

  return updates;
}
