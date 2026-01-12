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

/** Default icon settings for reminder and meta tokens */
const DEFAULT_ICON_SETTINGS = {
  scale: DEFAULTS.ICON_SCALE,
  offsetX: DEFAULTS.ICON_OFFSET,
  offsetY: DEFAULTS.ICON_OFFSET,
} as const;

/** Build font spacing settings from decoratives and global options */
function buildFontSpacing(
  d: DecorativeOverrides,
  g: GenerationOptions
): GenerationOptions['fontSpacing'] {
  return {
    characterName: d.nameFontSpacing ?? g.fontSpacing?.characterName ?? DEFAULTS.FONT_SPACING,
    characterText:
      d.abilityTextFontSpacing ?? g.fontSpacing?.characterText ?? DEFAULTS.FONT_SPACING,
    reminderText: g.fontSpacing?.reminderText ?? DEFAULTS.FONT_SPACING,
    metaName: g.fontSpacing?.metaName ?? DEFAULTS.FONT_SPACING,
    metaText: g.fontSpacing?.metaText ?? DEFAULTS.FONT_SPACING,
  };
}

/** Build text shadow settings from decoratives and global options */
function buildTextShadow(
  d: DecorativeOverrides,
  g: GenerationOptions
): GenerationOptions['textShadow'] {
  return {
    characterName: d.nameTextShadow ?? g.textShadow?.characterName ?? DEFAULTS.NAME_SHADOW_BLUR,
    characterText:
      d.abilityTextShadow ?? g.textShadow?.characterText ?? DEFAULTS.ABILITY_SHADOW_BLUR,
    reminderText: g.textShadow?.reminderText ?? DEFAULTS.NAME_SHADOW_BLUR,
    metaName: g.textShadow?.metaName ?? DEFAULTS.NAME_SHADOW_BLUR,
    metaText: g.textShadow?.metaText ?? DEFAULTS.NAME_SHADOW_BLUR,
  };
}

/** Build icon settings from decoratives and global options */
function buildIconSettings(
  d: DecorativeOverrides,
  g: GenerationOptions
): GenerationOptions['iconSettings'] {
  return {
    character: {
      scale: d.iconScale ?? g.iconSettings?.character?.scale ?? DEFAULTS.ICON_SCALE,
      offsetX: d.iconOffsetX ?? g.iconSettings?.character?.offsetX ?? DEFAULTS.ICON_OFFSET,
      offsetY: d.iconOffsetY ?? g.iconSettings?.character?.offsetY ?? DEFAULTS.ICON_OFFSET,
    },
    reminder: g.iconSettings?.reminder ?? DEFAULT_ICON_SETTINGS,
    meta: g.iconSettings?.meta ?? DEFAULT_ICON_SETTINGS,
  };
}

/** Build accent settings from decoratives and global options */
function buildAccentSettings(
  d: DecorativeOverrides,
  g: GenerationOptions
): Pick<
  GenerationOptions,
  | 'accentEnabled'
  | 'accentGeneration'
  | 'accentRadialOffset'
  | 'accentRotate180'
  | 'accentFlip'
  | 'accentLayer'
> {
  return {
    accentEnabled: d.accentEnabled ?? g.accentEnabled,
    accentGeneration: d.accentGeneration ?? g.accentGeneration,
    accentRadialOffset: d.accentRadialOffset ?? g.accentRadialOffset,
    accentRotate180: d.accentRotate180 ?? g.accentRotate180,
    accentFlip: d.accentFlip ?? g.accentFlip,
    accentLayer: d.accentLayer ?? g.accentLayer,
  };
}

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

  // Determine setup style: hidden if hideSetupOverlay is true
  const setupStyle = d.hideSetupOverlay === true ? '' : (d.setupStyle ?? g.setupStyle);

  return {
    ...globalOptions,
    // Background
    characterBackgroundStyle: d.backgroundStyle ?? g.characterBackgroundStyle,
    // Font
    characterNameFont: d.nameFont ?? g.characterNameFont,
    characterNameColor: d.nameColor ?? g.characterNameColor,
    fontSpacing: buildFontSpacing(d, g),
    textShadow: buildTextShadow(d, g),
    // Icon
    iconSettings: buildIconSettings(d, g),
    // Ability text
    displayAbilityText: d.displayAbilityText ?? g.displayAbilityText,
    abilityTextFont: d.abilityTextFont ?? g.abilityTextFont,
    abilityTextColor: d.abilityTextColor ?? g.abilityTextColor,
    // Setup
    setupStyle,
    setupPlacement: d.setupPlacement ?? g.setupPlacement,
    // Accents
    ...buildAccentSettings(d, g),
  };
}

/**
 * Keys that map from DecorativeOverrides to GenerationOptions for accent settings.
 * Used for mapping partial GenerationOptions updates back to DecorativeOverrides.
 *
 * Note: Accents are now deterministic based on character data, so only
 * accentEnabled, accentGeneration, accentRadialOffset, accentRotate180, accentFlip, and accentLayer are configurable.
 */
export const ACCENT_DECORATIVE_KEYS = [
  'accentEnabled',
  'accentGeneration',
  'accentRadialOffset',
  'accentRotate180',
  'accentFlip',
  'accentLayer',
] as const;

/**
 * Keys that map from DecorativeOverrides to GenerationOptions for decoratives settings
 * (setup overlay + accents). Used by DecorativesSettingsSelector conversion.
 */
export const DECORATIVES_KEYS = [
  // Setup settings
  'setupStyle',
  'setupPlacement',
  // Accent settings
  ...ACCENT_DECORATIVE_KEYS,
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

/**
 * Maps GenerationOptions changes to DecorativeOverrides updates for all decoratives settings
 * (setup overlay + accents). Used by CharacterDecorativesPanel with DecorativesSettingsSelector.
 *
 * @param options - Partial GenerationOptions with decoratives settings
 * @returns Partial DecorativeOverrides with mapped values
 */
export function mapDecorativesOptionsToDecorative(
  options: Partial<GenerationOptions>
): Partial<DecorativeOverrides> {
  const updates: Partial<DecorativeOverrides> = {};

  for (const key of DECORATIVES_KEYS) {
    if (key in options) {
      (updates as Record<string, unknown>)[key] = (options as Record<string, unknown>)[key];
    }
  }

  // Handle hideSetupOverlay: if setupStyle is 'none', set hideSetupOverlay to true
  if ('setupStyle' in options) {
    updates.hideSetupOverlay = options.setupStyle === 'none';
  }

  return updates;
}
