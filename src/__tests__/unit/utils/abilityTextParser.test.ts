/**
 * Tests for ability text parser utilities
 */

import { describe, expect, it } from 'vitest';
import {
  combineAbilityWithSetup,
  hasSetupBrackets,
  parseAbilityText,
  splitAbilityText,
} from '@/ts/utils/abilityTextParser';

describe('abilityTextParser', () => {
  // ============================================
  // parseAbilityText tests
  // ============================================

  describe('parseAbilityText', () => {
    it('should return single non-bold segment for text without brackets', () => {
      const result = parseAbilityText('Each night, you learn something.');
      expect(result).toEqual([{ text: 'Each night, you learn something.', isBold: false }]);
    });

    it('should mark bracketed text as bold', () => {
      const result = parseAbilityText('Each night* [except the first], you learn...');
      expect(result).toEqual([
        { text: 'Each night* ', isBold: false },
        { text: '[except the first]', isBold: true },
        { text: ', you learn...', isBold: false },
      ]);
    });

    it('should handle brackets at the end', () => {
      const result = parseAbilityText('Some ability. [+1 Outsider]');
      expect(result).toEqual([
        { text: 'Some ability. ', isBold: false },
        { text: '[+1 Outsider]', isBold: true },
      ]);
    });

    it('should handle brackets at the start', () => {
      const result = parseAbilityText('[+1 Outsider] Some ability.');
      expect(result).toEqual([
        { text: '[+1 Outsider]', isBold: true },
        { text: ' Some ability.', isBold: false },
      ]);
    });

    it('should handle empty brackets', () => {
      const result = parseAbilityText('Some ability []');
      expect(result).toEqual([
        { text: 'Some ability ', isBold: false },
        { text: '[]', isBold: true },
      ]);
    });

    it('should handle unclosed brackets as non-bold', () => {
      const result = parseAbilityText('Some ability [unclosed');
      expect(result).toEqual([
        { text: 'Some ability ', isBold: false },
        { text: '[unclosed', isBold: false },
      ]);
    });
  });

  // ============================================
  // hasSetupBrackets tests
  // ============================================

  describe('hasSetupBrackets', () => {
    it('should return true for text with brackets', () => {
      expect(hasSetupBrackets('Some text [setup]')).toBe(true);
    });

    it('should return true for text with empty brackets', () => {
      expect(hasSetupBrackets('Some text []')).toBe(true);
    });

    it('should return false for text without brackets', () => {
      expect(hasSetupBrackets('Some text without brackets')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(hasSetupBrackets('')).toBe(false);
    });

    it('should return false for unclosed bracket', () => {
      expect(hasSetupBrackets('Some text [unclosed')).toBe(false);
    });
  });

  // ============================================
  // splitAbilityText tests
  // ============================================

  describe('splitAbilityText', () => {
    it('should split ability with setup at end', () => {
      const result = splitAbilityText('Each night, learn something. [+1 Outsider]');
      expect(result.abilityWithoutSetup).toBe('Each night, learn something.');
      expect(result.setupContent).toBe('+1 Outsider');
    });

    it('should split ability with setup in middle', () => {
      const result = splitAbilityText('You start knowing [+2 Outsiders] in play.');
      expect(result.abilityWithoutSetup).toBe('You start knowing in play.');
      expect(result.setupContent).toBe('+2 Outsiders');
    });

    it('should handle empty brackets', () => {
      const result = splitAbilityText('Some ability []');
      expect(result.abilityWithoutSetup).toBe('Some ability');
      expect(result.setupContent).toBe('');
    });

    it('should handle no brackets', () => {
      const result = splitAbilityText('Some ability without setup');
      expect(result.abilityWithoutSetup).toBe('Some ability without setup');
      expect(result.setupContent).toBe('');
    });

    it('should handle brackets at the start', () => {
      const result = splitAbilityText('[+1 Outsider] causes extra evil.');
      expect(result.abilityWithoutSetup).toBe('causes extra evil.');
      expect(result.setupContent).toBe('+1 Outsider');
    });

    it('should handle only brackets', () => {
      const result = splitAbilityText('[+1 Outsider]');
      expect(result.abilityWithoutSetup).toBe('');
      expect(result.setupContent).toBe('+1 Outsider');
    });

    it('should handle unclosed brackets as regular text', () => {
      const result = splitAbilityText('Some ability [unclosed');
      expect(result.abilityWithoutSetup).toBe('Some ability [unclosed');
      expect(result.setupContent).toBe('');
    });

    it('should trim trailing whitespace from ability', () => {
      const result = splitAbilityText('Some ability   [setup]');
      expect(result.abilityWithoutSetup).toBe('Some ability');
      expect(result.setupContent).toBe('setup');
    });

    it('should normalize multiple spaces in ability', () => {
      const result = splitAbilityText('Some  ability  text [setup]');
      expect(result.abilityWithoutSetup).toBe('Some ability text');
      expect(result.setupContent).toBe('setup');
    });
  });

  // ============================================
  // combineAbilityWithSetup tests
  // ============================================

  describe('combineAbilityWithSetup', () => {
    it('should combine with proper spacing', () => {
      expect(combineAbilityWithSetup('Each night, learn.', '+1 Outsider')).toBe(
        'Each night, learn. [+1 Outsider]'
      );
    });

    it('should add space if ability does not end with space', () => {
      expect(combineAbilityWithSetup('Each night', '+1 Outsider')).toBe('Each night [+1 Outsider]');
    });

    it('should not add extra space if ability ends with space', () => {
      expect(combineAbilityWithSetup('Each night ', '+1 Outsider')).toBe(
        'Each night [+1 Outsider]'
      );
    });

    it('should return ability only if setup is empty', () => {
      expect(combineAbilityWithSetup('Each night, learn.', '')).toBe('Each night, learn.');
    });

    it('should return ability only if setup is whitespace', () => {
      expect(combineAbilityWithSetup('Each night, learn.', '   ')).toBe('Each night, learn.');
    });

    it('should handle empty ability', () => {
      expect(combineAbilityWithSetup('', '+1 Outsider')).toBe('[+1 Outsider]');
    });

    it('should trim both ability and setup', () => {
      expect(combineAbilityWithSetup('  Some ability  ', '  setup text  ')).toBe(
        'Some ability [setup text]'
      );
    });

    it('should handle both empty', () => {
      expect(combineAbilityWithSetup('', '')).toBe('');
    });
  });
});
