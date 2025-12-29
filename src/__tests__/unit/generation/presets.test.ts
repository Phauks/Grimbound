import { describe, expect, it } from 'vitest';
import { getPreset, getPresetNames, PRESETS } from '@/ts/generation/presets';

describe('presets', () => {
  describe('PRESETS', () => {
    it('should have classic preset', () => {
      expect(PRESETS.classic).toBeDefined();
      expect(PRESETS.classic.name).toBe('Default');
    });

    it('should have fullbloom preset', () => {
      expect(PRESETS.fullbloom).toBeDefined();
      expect(PRESETS.fullbloom.name).toBe('Full Bloom');
    });

    it('should have minimal preset', () => {
      expect(PRESETS.minimal).toBeDefined();
      expect(PRESETS.minimal.name).toBe('Minimal');
    });

    it('should have required fields on all presets', () => {
      for (const [key, preset] of Object.entries(PRESETS)) {
        expect(preset.name, `${key} should have name`).toBeDefined();
        expect(preset.description, `${key} should have description`).toBeDefined();
        expect(preset.icon, `${key} should have icon`).toBeDefined();
        expect(preset.settings, `${key} should have settings`).toBeDefined();
      }
    });

    it('classic should have default settings reference', () => {
      // Classic uses DEFAULT_GENERATION_OPTIONS
      expect(PRESETS.classic.settings).toBeDefined();
    });

    it('fullbloom should have decorative settings', () => {
      const settings = PRESETS.fullbloom.settings;
      expect(settings.displayAbilityText).toBe(true);
      expect(settings.maximumAccents).toBe(5);
      expect(settings.pandemoniumToken).toBe(true);
    });

    it('minimal should have reduced settings', () => {
      const settings = PRESETS.minimal.settings;
      expect(settings.displayAbilityText).toBe(false);
      expect(settings.maximumAccents).toBe(0);
      expect(settings.pandemoniumToken).toBe(false);
    });

    it('fullbloom should have font spacing', () => {
      const spacing = PRESETS.fullbloom.settings.fontSpacing;
      expect(spacing?.characterName).toBe(2);
      expect(spacing?.characterText).toBe(1);
    });

    it('minimal should have zero font spacing', () => {
      const spacing = PRESETS.minimal.settings.fontSpacing;
      expect(spacing?.characterName).toBe(0);
      expect(spacing?.characterText).toBe(0);
    });

    it('fullbloom should have text shadow settings', () => {
      const shadow = PRESETS.fullbloom.settings.textShadow;
      expect(shadow?.characterName).toBe(6);
      expect(shadow?.characterText).toBe(4);
    });

    it('minimal should have reduced text shadow', () => {
      const shadow = PRESETS.minimal.settings.textShadow;
      expect(shadow?.characterName).toBe(2);
      expect(shadow?.characterText).toBe(2);
    });

    it('fullbloom should have zip settings for organization', () => {
      const zip = PRESETS.fullbloom.settings.zipSettings;
      expect(zip?.saveInTeamFolders).toBe(true);
      expect(zip?.saveRemindersSeparately).toBe(true);
      expect(zip?.includeScriptJson).toBe(true);
    });

    it('minimal should have simplified zip settings', () => {
      const zip = PRESETS.minimal.settings.zipSettings;
      expect(zip?.saveInTeamFolders).toBe(false);
      expect(zip?.saveRemindersSeparately).toBe(false);
      expect(zip?.includeScriptJson).toBe(false);
    });
  });

  describe('getPreset', () => {
    it('should return classic preset', () => {
      const preset = getPreset('classic');
      expect(preset.name).toBe('Default');
    });

    it('should return fullbloom preset', () => {
      const preset = getPreset('fullbloom');
      expect(preset.name).toBe('Full Bloom');
    });

    it('should return minimal preset', () => {
      const preset = getPreset('minimal');
      expect(preset.name).toBe('Minimal');
    });

    it('should return same object as PRESETS', () => {
      expect(getPreset('classic')).toBe(PRESETS.classic);
      expect(getPreset('fullbloom')).toBe(PRESETS.fullbloom);
      expect(getPreset('minimal')).toBe(PRESETS.minimal);
    });
  });

  describe('getPresetNames', () => {
    it('should return array of preset names', () => {
      const names = getPresetNames();
      expect(Array.isArray(names)).toBe(true);
    });

    it('should include classic', () => {
      const names = getPresetNames();
      expect(names).toContain('classic');
    });

    it('should include fullbloom', () => {
      const names = getPresetNames();
      expect(names).toContain('fullbloom');
    });

    it('should include minimal', () => {
      const names = getPresetNames();
      expect(names).toContain('minimal');
    });

    it('should have same count as PRESETS keys', () => {
      const names = getPresetNames();
      expect(names.length).toBe(Object.keys(PRESETS).length);
    });

    it('should return same names as PRESETS keys', () => {
      const names = getPresetNames();
      const keys = Object.keys(PRESETS);
      expect(names.sort()).toEqual(keys.sort());
    });
  });
});
