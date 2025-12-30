import { describe, expect, it } from 'vitest';
import type { DecorativeOverrides, GenerationOptions } from '@/ts/types';
import {
  ACCENT_DECORATIVE_KEYS,
  createEffectiveOptions,
  mapAccentOptionsToDecorative,
} from '@/ts/utils/decorativeUtils';

// Minimal mock generation options
function createMockGenerationOptions(
  overrides: Partial<GenerationOptions> = {}
): GenerationOptions {
  return {
    characterBackgroundStyle: 'default',
    characterNameFont: 'Arial',
    characterNameColor: '#FFFFFF',
    displayAbilityText: true,
    abilityTextFont: 'Georgia',
    abilityTextColor: '#EEEEEE',
    setupStyle: 'standard',
    fontSpacing: {
      characterName: 1,
      characterText: 1,
      reminderText: 1,
      metaName: 1,
      metaText: 1,
    },
    textShadow: {
      characterName: 4,
      characterText: 3,
      reminderText: 4,
      metaName: 4,
      metaText: 4,
    },
    iconSettings: {
      character: { scale: 1.0, offsetX: 0, offsetY: 0 },
      reminder: { scale: 1.0, offsetX: 0, offsetY: 0 },
      meta: { scale: 1.0, offsetX: 0, offsetY: 0 },
    },
    accentEnabled: true,
    accentGeneration: 'random',
    maximumAccents: 3,
    accentPopulationProbability: 0.5,
    accentArcSpan: 90,
    accentSlots: [true, true, true],
    enableLeftAccent: true,
    enableRightAccent: true,
    sideAccentProbability: 0.3,
    ...overrides,
  } as GenerationOptions;
}

describe('decorativeUtils', () => {
  describe('createEffectiveOptions', () => {
    it('should return global options unchanged when decoratives is undefined', () => {
      const globalOptions = createMockGenerationOptions();

      const result = createEffectiveOptions(globalOptions, undefined);

      expect(result).toBe(globalOptions);
    });

    it('should return global options unchanged when useCustomSettings is false', () => {
      const globalOptions = createMockGenerationOptions();
      const decoratives: DecorativeOverrides = {
        useCustomSettings: false,
        backgroundStyle: 'custom',
      };

      const result = createEffectiveOptions(globalOptions, decoratives);

      expect(result).toBe(globalOptions);
    });

    it('should merge decorative overrides when useCustomSettings is true', () => {
      const globalOptions = createMockGenerationOptions();
      const decoratives: DecorativeOverrides = {
        useCustomSettings: true,
        backgroundStyle: 'custom-bg',
        nameFont: 'CustomFont',
        nameColor: '#FF0000',
      };

      const result = createEffectiveOptions(globalOptions, decoratives);

      expect(result.characterBackgroundStyle).toBe('custom-bg');
      expect(result.characterNameFont).toBe('CustomFont');
      expect(result.characterNameColor).toBe('#FF0000');
    });

    it('should preserve global options for fields not overridden', () => {
      const globalOptions = createMockGenerationOptions({
        displayAbilityText: true,
        abilityTextFont: 'Georgia',
      });
      const decoratives: DecorativeOverrides = {
        useCustomSettings: true,
        nameFont: 'CustomFont',
      };

      const result = createEffectiveOptions(globalOptions, decoratives);

      expect(result.displayAbilityText).toBe(true);
      expect(result.abilityTextFont).toBe('Georgia');
    });

    it('should apply ability text overrides', () => {
      const globalOptions = createMockGenerationOptions();
      const decoratives: DecorativeOverrides = {
        useCustomSettings: true,
        displayAbilityText: false,
        abilityTextFont: 'Times',
        abilityTextColor: '#00FF00',
      };

      const result = createEffectiveOptions(globalOptions, decoratives);

      expect(result.displayAbilityText).toBe(false);
      expect(result.abilityTextFont).toBe('Times');
      expect(result.abilityTextColor).toBe('#00FF00');
    });

    it('should build font spacing from decoratives', () => {
      const globalOptions = createMockGenerationOptions();
      const decoratives: DecorativeOverrides = {
        useCustomSettings: true,
        nameFontSpacing: 5,
        abilityTextFontSpacing: 3,
      };

      const result = createEffectiveOptions(globalOptions, decoratives);

      expect(result.fontSpacing?.characterName).toBe(5);
      expect(result.fontSpacing?.characterText).toBe(3);
    });

    it('should build text shadow from decoratives', () => {
      const globalOptions = createMockGenerationOptions();
      const decoratives: DecorativeOverrides = {
        useCustomSettings: true,
        nameTextShadow: 8,
        abilityTextShadow: 6,
      };

      const result = createEffectiveOptions(globalOptions, decoratives);

      expect(result.textShadow?.characterName).toBe(8);
      expect(result.textShadow?.characterText).toBe(6);
    });

    it('should build icon settings from decoratives', () => {
      const globalOptions = createMockGenerationOptions();
      const decoratives: DecorativeOverrides = {
        useCustomSettings: true,
        iconScale: 1.5,
        iconOffsetX: 10,
        iconOffsetY: -5,
      };

      const result = createEffectiveOptions(globalOptions, decoratives);

      expect(result.iconSettings?.character?.scale).toBe(1.5);
      expect(result.iconSettings?.character?.offsetX).toBe(10);
      expect(result.iconSettings?.character?.offsetY).toBe(-5);
    });

    it('should preserve reminder and meta icon settings from global', () => {
      const globalOptions = createMockGenerationOptions({
        iconSettings: {
          character: { scale: 1.0, offsetX: 0, offsetY: 0 },
          reminder: { scale: 0.8, offsetX: 5, offsetY: 5 },
          meta: { scale: 0.9, offsetX: 2, offsetY: 2 },
        },
      });
      const decoratives: DecorativeOverrides = {
        useCustomSettings: true,
        iconScale: 1.2,
      };

      const result = createEffectiveOptions(globalOptions, decoratives);

      expect(result.iconSettings?.reminder?.scale).toBe(0.8);
      expect(result.iconSettings?.meta?.scale).toBe(0.9);
    });

    it('should hide setup overlay when hideSetupOverlay is true', () => {
      const globalOptions = createMockGenerationOptions({ setupStyle: 'standard' });
      const decoratives: DecorativeOverrides = {
        useCustomSettings: true,
        hideSetupOverlay: true,
      };

      const result = createEffectiveOptions(globalOptions, decoratives);

      expect(result.setupStyle).toBe('');
    });

    it('should use decorative setupStyle when hideSetupOverlay is false', () => {
      const globalOptions = createMockGenerationOptions({ setupStyle: 'standard' });
      const decoratives: DecorativeOverrides = {
        useCustomSettings: true,
        hideSetupOverlay: false,
        setupStyle: 'custom-setup',
      };

      const result = createEffectiveOptions(globalOptions, decoratives);

      expect(result.setupStyle).toBe('custom-setup');
    });

    it('should fall back to global setupStyle when decorative not specified', () => {
      const globalOptions = createMockGenerationOptions({ setupStyle: 'global-setup' });
      const decoratives: DecorativeOverrides = {
        useCustomSettings: true,
      };

      const result = createEffectiveOptions(globalOptions, decoratives);

      expect(result.setupStyle).toBe('global-setup');
    });

    it('should build accent settings from decoratives', () => {
      const globalOptions = createMockGenerationOptions();
      const decoratives: DecorativeOverrides = {
        useCustomSettings: true,
        accentEnabled: false,
        maximumAccents: 5,
        accentPopulationProbability: 0.8,
      };

      const result = createEffectiveOptions(globalOptions, decoratives);

      expect(result.accentEnabled).toBe(false);
      expect(result.maximumAccents).toBe(5);
      expect(result.accentPopulationProbability).toBe(0.8);
    });

    it('should use defaults when neither decorative nor global provides values', () => {
      const globalOptions = {
        fontSpacing: undefined,
        textShadow: undefined,
        iconSettings: undefined,
      } as unknown as GenerationOptions;
      const decoratives: DecorativeOverrides = {
        useCustomSettings: true,
      };

      const result = createEffectiveOptions(globalOptions, decoratives);

      // Should use DEFAULTS from decorativeUtils
      expect(result.fontSpacing?.characterName).toBe(0);
      expect(result.textShadow?.characterName).toBe(4);
      expect(result.iconSettings?.character?.scale).toBe(1.0);
    });
  });

  describe('ACCENT_DECORATIVE_KEYS', () => {
    it('should contain all accent-related keys', () => {
      expect(ACCENT_DECORATIVE_KEYS).toContain('accentEnabled');
      expect(ACCENT_DECORATIVE_KEYS).toContain('accentGeneration');
      expect(ACCENT_DECORATIVE_KEYS).toContain('maximumAccents');
      expect(ACCENT_DECORATIVE_KEYS).toContain('accentPopulationProbability');
      expect(ACCENT_DECORATIVE_KEYS).toContain('accentArcSpan');
      expect(ACCENT_DECORATIVE_KEYS).toContain('accentSlots');
      expect(ACCENT_DECORATIVE_KEYS).toContain('enableLeftAccent');
      expect(ACCENT_DECORATIVE_KEYS).toContain('enableRightAccent');
      expect(ACCENT_DECORATIVE_KEYS).toContain('sideAccentProbability');
    });

    it('should have 9 keys total', () => {
      expect(ACCENT_DECORATIVE_KEYS).toHaveLength(9);
    });
  });

  describe('mapAccentOptionsToDecorative', () => {
    it('should return empty object for empty options', () => {
      const result = mapAccentOptionsToDecorative({});

      expect(result).toEqual({});
    });

    it('should map accentEnabled', () => {
      const result = mapAccentOptionsToDecorative({ accentEnabled: false });

      expect(result.accentEnabled).toBe(false);
    });

    it('should map maximumAccents', () => {
      const result = mapAccentOptionsToDecorative({ maximumAccents: 7 });

      expect(result.maximumAccents).toBe(7);
    });

    it('should map multiple accent options', () => {
      const result = mapAccentOptionsToDecorative({
        accentEnabled: true,
        maximumAccents: 5,
        accentPopulationProbability: 0.6,
        enableLeftAccent: false,
      });

      expect(result.accentEnabled).toBe(true);
      expect(result.maximumAccents).toBe(5);
      expect(result.accentPopulationProbability).toBe(0.6);
      expect(result.enableLeftAccent).toBe(false);
    });

    it('should ignore non-accent keys', () => {
      const result = mapAccentOptionsToDecorative({
        displayAbilityText: true,
        characterNameFont: 'Arial',
        maximumAccents: 3,
      } as Partial<GenerationOptions>);

      expect(result.maximumAccents).toBe(3);
      expect('displayAbilityText' in result).toBe(false);
      expect('characterNameFont' in result).toBe(false);
    });

    it('should map accentSlots array', () => {
      const slots = [true, false, true];
      const result = mapAccentOptionsToDecorative({ accentSlots: slots });

      expect(result.accentSlots).toEqual(slots);
    });

    it('should map sideAccentProbability', () => {
      const result = mapAccentOptionsToDecorative({ sideAccentProbability: 0.4 });

      expect(result.sideAccentProbability).toBe(0.4);
    });

    it('should map accentArcSpan', () => {
      const result = mapAccentOptionsToDecorative({ accentArcSpan: 120 });

      expect(result.accentArcSpan).toBe(120);
    });

    it('should map accentGeneration', () => {
      const result = mapAccentOptionsToDecorative({ accentGeneration: 'fixed' });

      expect(result.accentGeneration).toBe('fixed');
    });
  });
});
