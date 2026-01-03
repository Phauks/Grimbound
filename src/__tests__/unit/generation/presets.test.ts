import { describe, expect, it } from 'vitest';
import {
  createPreset,
  duplicatePreset,
  getDefaultOptions,
  isValidPreset,
} from '@/ts/generation/presets';
import { DEFAULT_GENERATION_OPTIONS } from '@/ts/types/tokenOptions';

describe('preset utilities', () => {
  describe('createPreset', () => {
    it('should create a preset with all required fields', () => {
      const preset = createPreset(
        'Test Preset',
        'A test description',
        '🎨',
        DEFAULT_GENERATION_OPTIONS
      );

      expect(preset.id).toMatch(/^preset_/);
      expect(preset.name).toBe('Test Preset');
      expect(preset.description).toBe('A test description');
      expect(preset.icon).toBe('🎨');
      expect(preset.settings).toBeDefined();
      expect(preset.createdAt).toBeTypeOf('number');
      expect(preset.updatedAt).toBeTypeOf('number');
    });

    it('should generate unique IDs for each preset', () => {
      const preset1 = createPreset('Preset 1', '', '📦', DEFAULT_GENERATION_OPTIONS);
      const preset2 = createPreset('Preset 2', '', '📦', DEFAULT_GENERATION_OPTIONS);

      expect(preset1.id).not.toBe(preset2.id);
    });

    it('should create a deep copy of settings', () => {
      const originalSettings = { ...DEFAULT_GENERATION_OPTIONS };
      const preset = createPreset('Test', '', '📦', originalSettings);

      // Modify original should not affect preset
      originalSettings.displayAbilityText = !originalSettings.displayAbilityText;

      expect(preset.settings.displayAbilityText).not.toBe(originalSettings.displayAbilityText);
    });

    it('should set createdAt and updatedAt to same value on creation', () => {
      const preset = createPreset('Test', '', '📦', DEFAULT_GENERATION_OPTIONS);

      expect(preset.createdAt).toBe(preset.updatedAt);
    });
  });

  describe('duplicatePreset', () => {
    it('should create a copy with new ID', () => {
      const original = createPreset('Original', 'Desc', '🎯', DEFAULT_GENERATION_OPTIONS);
      const copy = duplicatePreset(original);

      expect(copy.id).not.toBe(original.id);
      expect(copy.id).toMatch(/^preset_/);
    });

    it('should append (Copy) suffix by default', () => {
      const original = createPreset('Original', 'Desc', '🎯', DEFAULT_GENERATION_OPTIONS);
      const copy = duplicatePreset(original);

      expect(copy.name).toBe('Original (Copy)');
    });

    it('should allow custom suffix', () => {
      const original = createPreset('Original', 'Desc', '🎯', DEFAULT_GENERATION_OPTIONS);
      const copy = duplicatePreset(original, ' v2');

      expect(copy.name).toBe('Original v2');
    });

    it('should allow empty suffix for cross-tier copy', () => {
      const original = createPreset('Original', 'Desc', '🎯', DEFAULT_GENERATION_OPTIONS);
      const copy = duplicatePreset(original, '');

      expect(copy.name).toBe('Original');
    });

    it('should preserve description and icon', () => {
      const original = createPreset(
        'Original',
        'Test description',
        '🌟',
        DEFAULT_GENERATION_OPTIONS
      );
      const copy = duplicatePreset(original);

      expect(copy.description).toBe('Test description');
      expect(copy.icon).toBe('🌟');
    });

    it('should create new timestamps', () => {
      const original = createPreset('Original', 'Desc', '🎯', DEFAULT_GENERATION_OPTIONS);
      // Simulate time passing
      const copy = duplicatePreset(original);

      expect(copy.createdAt).toBeGreaterThanOrEqual(original.createdAt);
      expect(copy.updatedAt).toBeGreaterThanOrEqual(original.updatedAt);
    });

    it('should create a deep copy of settings', () => {
      const original = createPreset('Original', 'Desc', '🎯', DEFAULT_GENERATION_OPTIONS);
      const copy = duplicatePreset(original);

      // Modify copy settings should not affect original
      copy.settings.displayAbilityText = !copy.settings.displayAbilityText;

      expect(original.settings.displayAbilityText).not.toBe(copy.settings.displayAbilityText);
    });
  });

  describe('getDefaultOptions', () => {
    it('should return a copy of DEFAULT_GENERATION_OPTIONS', () => {
      const defaults = getDefaultOptions();

      expect(defaults).toEqual(DEFAULT_GENERATION_OPTIONS);
    });

    it('should return a new object each time', () => {
      const defaults1 = getDefaultOptions();
      const defaults2 = getDefaultOptions();

      expect(defaults1).not.toBe(defaults2);
      expect(defaults1).toEqual(defaults2);
    });

    it('should not be affected by mutations', () => {
      const defaults1 = getDefaultOptions();
      defaults1.displayAbilityText = !defaults1.displayAbilityText;

      const defaults2 = getDefaultOptions();

      expect(defaults2.displayAbilityText).toBe(DEFAULT_GENERATION_OPTIONS.displayAbilityText);
    });
  });

  describe('isValidPreset', () => {
    it('should return true for valid preset', () => {
      const preset = createPreset('Test', 'Desc', '📦', DEFAULT_GENERATION_OPTIONS);

      expect(isValidPreset(preset)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isValidPreset(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isValidPreset(undefined)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isValidPreset('string')).toBe(false);
      expect(isValidPreset(123)).toBe(false);
      expect(isValidPreset(true)).toBe(false);
    });

    it('should return false for object missing id', () => {
      const invalid = {
        name: 'Test',
        settings: {},
      };

      expect(isValidPreset(invalid)).toBe(false);
    });

    it('should return false for object missing name', () => {
      const invalid = {
        id: 'preset_123',
        settings: {},
      };

      expect(isValidPreset(invalid)).toBe(false);
    });

    it('should return false for object missing settings', () => {
      const invalid = {
        id: 'preset_123',
        name: 'Test',
      };

      expect(isValidPreset(invalid)).toBe(false);
    });

    it('should return false for object with null settings', () => {
      const invalid = {
        id: 'preset_123',
        name: 'Test',
        settings: null,
      };

      expect(isValidPreset(invalid)).toBe(false);
    });

    it('should return true for minimal valid object', () => {
      const minimal = {
        id: 'preset_123',
        name: 'Test',
        settings: {},
      };

      expect(isValidPreset(minimal)).toBe(true);
    });
  });
});
