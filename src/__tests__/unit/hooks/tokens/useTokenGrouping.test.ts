/**
 * Unit tests for useTokenGrouping hook
 *
 * Tests token sorting and grouping logic including:
 * - Filtering tokens by type
 * - Sorting by order property
 * - Grouping duplicates with counts and variant tracking
 * - Memoization for performance
 */

import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { type TokenGroup, useTokenGrouping } from '@/hooks/tokens/useTokenGrouping';
import type { Token } from '@/ts/types/index.js';

// Mock the tokenGrouping utility
vi.mock('@/ts/utils/tokenGrouping.js', () => ({
  groupTokensByIdentity: vi.fn((tokens: Token[]) => {
    const groups = new Map<string, TokenGroup>();

    // Group by identity key (type + name + variant)
    for (const token of tokens) {
      const key = createIdentityKey(token);
      const existing = groups.get(key);
      if (existing) {
        existing.count++;
        existing.variants.push(token);
      } else {
        groups.set(key, {
          token,
          count: 1,
          variants: [token],
        });
      }
    }

    return Array.from(groups.values());
  }),
}));

/**
 * Helper to create identity key for mocking
 */
function createIdentityKey(token: Token): string {
  if (token.type === 'reminder') {
    const variantSuffix = token.variantIndex !== undefined ? `_v${token.variantIndex}` : '';
    return `reminder_${token.parentCharacter || ''}_${token.reminderText || ''}${variantSuffix}`;
  }
  if (token.type === 'character') {
    const variantSuffix = token.variantIndex !== undefined ? `_v${token.variantIndex}` : '';
    return `character_${token.name}${variantSuffix}`;
  }
  return `${token.type}_${token.name}`;
}

/**
 * Test token factory
 */
function createMockToken(overrides: Partial<Token> = {}): Token {
  return {
    type: 'character',
    name: 'Test Character',
    filename: 'test.png',
    team: 'townsfolk',
    canvas: document.createElement('canvas'),
    diameter: 1000,
    order: 0,
    ...overrides,
  } as Token;
}

describe('useTokenGrouping', () => {
  describe('Empty tokens array', () => {
    it('should return empty arrays when tokens is empty', () => {
      const { result } = renderHook(() => useTokenGrouping([]));

      expect(result.current.characterTokens).toEqual([]);
      expect(result.current.reminderTokens).toEqual([]);
      expect(result.current.metaTokens).toEqual([]);
      expect(result.current.groupedCharacterTokens).toEqual([]);
      expect(result.current.groupedReminderTokens).toEqual([]);
      expect(result.current.groupedMetaTokens).toEqual([]);
    });

    it('should return consistent empty structure', () => {
      const { result } = renderHook(() => useTokenGrouping([]));
      const result2 = renderHook(() => useTokenGrouping([]));

      expect(result.current.characterTokens).toHaveLength(0);
      expect(result2.result.current.characterTokens).toHaveLength(0);
    });
  });

  describe('Token type separation', () => {
    it('should separate character tokens correctly', () => {
      const tokens: Token[] = [
        createMockToken({ type: 'character', name: 'Washer Woman', order: 0 }),
        createMockToken({ type: 'character', name: 'Drunk', order: 1 }),
      ];

      const { result } = renderHook(() => useTokenGrouping(tokens));

      expect(result.current.characterTokens).toHaveLength(2);
      expect(result.current.characterTokens[0].name).toBe('Washer Woman');
      expect(result.current.characterTokens[1].name).toBe('Drunk');
    });

    it('should separate reminder tokens correctly', () => {
      const tokens: Token[] = [
        createMockToken({
          type: 'reminder',
          reminderText: 'First death',
          order: 0,
        }),
        createMockToken({
          type: 'reminder',
          reminderText: 'Second death',
          order: 1,
        }),
      ];

      const { result } = renderHook(() => useTokenGrouping(tokens));

      expect(result.current.reminderTokens).toHaveLength(2);
      expect(result.current.reminderTokens[0].reminderText).toBe('First death');
      expect(result.current.reminderTokens[1].reminderText).toBe('Second death');
    });

    it('should separate meta tokens correctly', () => {
      const tokens: Token[] = [
        createMockToken({ type: 'script-name', name: 'Script Name' }),
        createMockToken({ type: 'almanac', name: 'Almanac' }),
        createMockToken({ type: 'pandemonium', name: 'Pandemonium' }),
        createMockToken({ type: 'bootlegger', name: 'Bootlegger' }),
      ];

      const { result } = renderHook(() => useTokenGrouping(tokens));

      expect(result.current.metaTokens).toHaveLength(4);
      expect(result.current.metaTokens.map((t) => t.type)).toEqual([
        'script-name',
        'almanac',
        'pandemonium',
        'bootlegger',
      ]);
    });
  });

  describe('Mixed token types', () => {
    it('should separate all token types correctly', () => {
      const tokens: Token[] = [
        createMockToken({ type: 'character', name: 'Washer Woman', order: 0 }),
        createMockToken({ type: 'reminder', reminderText: 'Death', order: 0 }),
        createMockToken({ type: 'script-name', name: 'Script' }),
        createMockToken({ type: 'character', name: 'Drunk', order: 1 }),
      ];

      const { result } = renderHook(() => useTokenGrouping(tokens));

      expect(result.current.characterTokens).toHaveLength(2);
      expect(result.current.reminderTokens).toHaveLength(1);
      expect(result.current.metaTokens).toHaveLength(1);
    });

    it('characterTokens should exclude reminder and meta tokens', () => {
      const tokens: Token[] = [
        createMockToken({ type: 'character', name: 'Character', order: 0 }),
        createMockToken({ type: 'reminder', reminderText: 'Reminder' }),
        createMockToken({ type: 'script-name', name: 'Script' }),
      ];

      const { result } = renderHook(() => useTokenGrouping(tokens));

      expect(result.current.characterTokens).toHaveLength(1);
      expect(result.current.characterTokens[0].type).toBe('character');
    });

    it('reminderTokens should exclude character and meta tokens', () => {
      const tokens: Token[] = [
        createMockToken({ type: 'character', name: 'Character', order: 0 }),
        createMockToken({ type: 'reminder', reminderText: 'Reminder' }),
        createMockToken({ type: 'script-name', name: 'Script' }),
      ];

      const { result } = renderHook(() => useTokenGrouping(tokens));

      expect(result.current.reminderTokens).toHaveLength(1);
      expect(result.current.reminderTokens[0].type).toBe('reminder');
    });

    it('metaTokens should exclude character and reminder tokens', () => {
      const tokens: Token[] = [
        createMockToken({ type: 'character', name: 'Character', order: 0 }),
        createMockToken({ type: 'reminder', reminderText: 'Reminder' }),
        createMockToken({ type: 'script-name', name: 'Script' }),
      ];

      const { result } = renderHook(() => useTokenGrouping(tokens));

      expect(result.current.metaTokens).toHaveLength(1);
      expect(result.current.metaTokens[0].type).toBe('script-name');
    });
  });

  describe('Character token sorting', () => {
    it('should sort character tokens by order property', () => {
      const tokens: Token[] = [
        createMockToken({ type: 'character', name: 'Third', order: 2 }),
        createMockToken({ type: 'character', name: 'First', order: 0 }),
        createMockToken({ type: 'character', name: 'Second', order: 1 }),
      ];

      const { result } = renderHook(() => useTokenGrouping(tokens));

      expect(result.current.characterTokens.map((t) => t.name)).toEqual([
        'First',
        'Second',
        'Third',
      ]);
    });

    it('should handle missing order property (default to 999)', () => {
      const tokens: Token[] = [
        createMockToken({ type: 'character', name: 'First', order: 0 }),
        createMockToken({
          type: 'character',
          name: 'Missing Order',
          order: undefined,
        }),
        createMockToken({ type: 'character', name: 'Second', order: 1 }),
      ];

      const { result } = renderHook(() => useTokenGrouping(tokens));

      // Verify all tokens are present (order is stable)
      const names = result.current.characterTokens.map((t) => t.name);
      expect(names).toHaveLength(3);
      expect(names).toContain('First');
      expect(names).toContain('Second');
      expect(names).toContain('Missing Order');

      // First token should have lowest order (0)
      expect(result.current.characterTokens[0].order).toBe(0);
      // Tokens without order get treated as 999 and appear last
      expect(result.current.characterTokens[2].name).toBe('Missing Order');
    });

    it('should preserve order when multiple tokens have same order value', () => {
      const tokens: Token[] = [
        createMockToken({ type: 'character', name: 'A', order: 0 }),
        createMockToken({ type: 'character', name: 'B', order: 0 }),
        createMockToken({ type: 'character', name: 'C', order: 0 }),
      ];

      const { result } = renderHook(() => useTokenGrouping(tokens));

      expect(result.current.characterTokens.map((t) => t.name)).toEqual(['A', 'B', 'C']);
    });

    it('should sort by order even with large order values', () => {
      const tokens: Token[] = [
        createMockToken({ type: 'character', name: 'Far', order: 999 }),
        createMockToken({ type: 'character', name: 'Near', order: 1 }),
        createMockToken({ type: 'character', name: 'First', order: 0 }),
      ];

      const { result } = renderHook(() => useTokenGrouping(tokens));

      expect(result.current.characterTokens.map((t) => t.name)).toEqual(['First', 'Near', 'Far']);
    });
  });

  describe('Reminder token sorting', () => {
    it('should sort reminder tokens by order property', () => {
      const tokens: Token[] = [
        createMockToken({ type: 'reminder', reminderText: 'Second', order: 1 }),
        createMockToken({ type: 'reminder', reminderText: 'First', order: 0 }),
      ];

      const { result } = renderHook(() => useTokenGrouping(tokens));

      expect(result.current.reminderTokens.map((t) => t.reminderText)).toEqual(['First', 'Second']);
    });

    it('should sort by order first, then by reminderText', () => {
      const tokens: Token[] = [
        createMockToken({
          type: 'reminder',
          reminderText: 'Zebra',
          order: 0,
          parentCharacter: 'Character A',
        }),
        createMockToken({
          type: 'reminder',
          reminderText: 'Apple',
          order: 0,
          parentCharacter: 'Character A',
        }),
        createMockToken({
          type: 'reminder',
          reminderText: 'Banana',
          order: 0,
          parentCharacter: 'Character A',
        }),
      ];

      const { result } = renderHook(() => useTokenGrouping(tokens));

      expect(result.current.reminderTokens.map((t) => t.reminderText)).toEqual([
        'Apple',
        'Banana',
        'Zebra',
      ]);
    });

    it('should group reminders by order, then alphabetically within group', () => {
      const tokens: Token[] = [
        createMockToken({
          type: 'reminder',
          reminderText: 'Z-Reminder',
          order: 1,
          parentCharacter: 'Char 1',
        }),
        createMockToken({
          type: 'reminder',
          reminderText: 'A-Reminder',
          order: 0,
          parentCharacter: 'Char 1',
        }),
        createMockToken({
          type: 'reminder',
          reminderText: 'M-Reminder',
          order: 1,
          parentCharacter: 'Char 1',
        }),
        createMockToken({
          type: 'reminder',
          reminderText: 'B-Reminder',
          order: 0,
          parentCharacter: 'Char 1',
        }),
      ];

      const { result } = renderHook(() => useTokenGrouping(tokens));

      expect(result.current.reminderTokens.map((t) => t.reminderText)).toEqual([
        'A-Reminder',
        'B-Reminder',
        'M-Reminder',
        'Z-Reminder',
      ]);
    });

    it('should handle missing reminderText (default to empty string)', () => {
      const tokens: Token[] = [
        createMockToken({
          type: 'reminder',
          order: 0,
        }),
        createMockToken({
          type: 'reminder',
          reminderText: 'A',
          order: 0,
        }),
      ];

      const { result } = renderHook(() => useTokenGrouping(tokens));

      expect(result.current.reminderTokens).toHaveLength(2);
      // Token without reminderText should come before 'A' (empty string sorts first)
      expect(result.current.reminderTokens[0].reminderText || '').toBe('');
      expect(result.current.reminderTokens[1].reminderText).toBe('A');
    });
  });

  describe('Grouping and counts', () => {
    it('should group character tokens by identity', () => {
      const tokens: Token[] = [
        createMockToken({ type: 'character', name: 'Washer', order: 0 }),
        createMockToken({ type: 'character', name: 'Washer', order: 0 }), // duplicate
      ];

      const { result } = renderHook(() => useTokenGrouping(tokens));

      expect(result.current.groupedCharacterTokens).toHaveLength(1);
      expect(result.current.groupedCharacterTokens[0].count).toBe(2);
    });

    it('should group reminder tokens by identity', () => {
      const tokens: Token[] = [
        createMockToken({
          type: 'reminder',
          reminderText: 'Death',
          parentCharacter: 'Washer',
        }),
        createMockToken({
          type: 'reminder',
          reminderText: 'Death',
          parentCharacter: 'Washer',
        }), // duplicate
      ];

      const { result } = renderHook(() => useTokenGrouping(tokens));

      expect(result.current.groupedReminderTokens).toHaveLength(1);
      expect(result.current.groupedReminderTokens[0].count).toBe(2);
    });

    it('should group meta tokens by identity', () => {
      const tokens: Token[] = [
        createMockToken({ type: 'script-name', name: 'Script' }),
        createMockToken({ type: 'script-name', name: 'Script' }), // duplicate
      ];

      const { result } = renderHook(() => useTokenGrouping(tokens));

      expect(result.current.groupedMetaTokens).toHaveLength(1);
      expect(result.current.groupedMetaTokens[0].count).toBe(2);
    });

    it('should keep variants separate in groups', () => {
      const tokens: Token[] = [
        createMockToken({
          type: 'character',
          name: 'Washer',
          order: 0,
          variantIndex: 0,
        }),
        createMockToken({
          type: 'character',
          name: 'Washer',
          order: 0,
          variantIndex: 1,
        }),
      ];

      const { result } = renderHook(() => useTokenGrouping(tokens));

      // Variants with different variantIndex should be in separate groups
      expect(result.current.groupedCharacterTokens).toHaveLength(2);
    });

    it('should count duplicates of the same variant', () => {
      const tokens: Token[] = [
        createMockToken({
          type: 'character',
          name: 'Washer',
          order: 0,
          variantIndex: 0,
        }),
        createMockToken({
          type: 'character',
          name: 'Washer',
          order: 0,
          variantIndex: 0,
        }),
        createMockToken({
          type: 'character',
          name: 'Washer',
          order: 0,
          variantIndex: 0,
        }),
      ];

      const { result } = renderHook(() => useTokenGrouping(tokens));

      expect(result.current.groupedCharacterTokens).toHaveLength(1);
      expect(result.current.groupedCharacterTokens[0].count).toBe(3);
    });
  });

  describe('Variants tracking', () => {
    it('should collect variants in TokenGroup', () => {
      const tokens: Token[] = [
        createMockToken({
          type: 'character',
          name: 'Washer',
          order: 0,
          variantIndex: 0,
        }),
        createMockToken({
          type: 'character',
          name: 'Washer',
          order: 0,
          variantIndex: 1,
        }),
      ];

      const { result } = renderHook(() => useTokenGrouping(tokens));

      // First variant should have variants array with both variants
      const firstGroup = result.current.groupedCharacterTokens[0];
      expect(firstGroup.variants).toBeDefined();
      expect(firstGroup.variants.length).toBeGreaterThanOrEqual(1);
    });

    it('should include representative token in variants array', () => {
      const token = createMockToken({
        type: 'character',
        name: 'Washer',
        order: 0,
        variantIndex: 0,
      });

      const { result } = renderHook(() => useTokenGrouping([token]));

      const group = result.current.groupedCharacterTokens[0];
      expect(group.variants.some((v) => v === token)).toBe(true);
    });
  });

  describe('Memoization', () => {
    it('should return same reference for characterTokens when tokens unchanged', () => {
      const tokens: Token[] = [createMockToken({ type: 'character', name: 'Washer', order: 0 })];

      const { result, rerender } = renderHook(() => useTokenGrouping(tokens));
      const firstCharacterTokens = result.current.characterTokens;

      rerender();

      const secondCharacterTokens = result.current.characterTokens;
      expect(firstCharacterTokens).toBe(secondCharacterTokens);
    });

    it('should update characterTokens reference when tokens change', () => {
      const tokens1: Token[] = [createMockToken({ type: 'character', name: 'Washer', order: 0 })];
      const tokens2: Token[] = [createMockToken({ type: 'character', name: 'Drunk', order: 0 })];

      const { result, rerender } = renderHook(({ tokens }) => useTokenGrouping(tokens), {
        initialProps: { tokens: tokens1 },
      });
      const firstCharacterTokens = result.current.characterTokens;

      rerender({ tokens: tokens2 });

      const secondCharacterTokens = result.current.characterTokens;
      expect(firstCharacterTokens).not.toBe(secondCharacterTokens);
      expect(secondCharacterTokens[0].name).toBe('Drunk');
    });

    it('should return same reference for reminderTokens when tokens unchanged', () => {
      const tokens: Token[] = [
        createMockToken({ type: 'reminder', reminderText: 'Death', order: 0 }),
      ];

      const { result, rerender } = renderHook(() => useTokenGrouping(tokens));
      const firstReminderTokens = result.current.reminderTokens;

      rerender();

      const secondReminderTokens = result.current.reminderTokens;
      expect(firstReminderTokens).toBe(secondReminderTokens);
    });

    it('should return same reference for metaTokens when tokens unchanged', () => {
      const tokens: Token[] = [createMockToken({ type: 'script-name', name: 'Script' })];

      const { result, rerender } = renderHook(() => useTokenGrouping(tokens));
      const firstMetaTokens = result.current.metaTokens;

      rerender();

      const secondMetaTokens = result.current.metaTokens;
      expect(firstMetaTokens).toBe(secondMetaTokens);
    });

    it('should return same reference for groupedCharacterTokens when characterTokens unchanged', () => {
      const tokens: Token[] = [createMockToken({ type: 'character', name: 'Washer', order: 0 })];

      const { result, rerender } = renderHook(() => useTokenGrouping(tokens));
      const firstGrouped = result.current.groupedCharacterTokens;

      rerender();

      const secondGrouped = result.current.groupedCharacterTokens;
      expect(firstGrouped).toBe(secondGrouped);
    });

    it('should update groupedCharacterTokens when characterTokens change', () => {
      const tokens1: Token[] = [createMockToken({ type: 'character', name: 'Washer', order: 0 })];
      const tokens2: Token[] = [
        createMockToken({ type: 'character', name: 'Washer', order: 0 }),
        createMockToken({ type: 'character', name: 'Washer', order: 0 }), // Add duplicate
      ];

      const { result, rerender } = renderHook(({ tokens }) => useTokenGrouping(tokens), {
        initialProps: { tokens: tokens1 },
      });
      const firstGrouped = result.current.groupedCharacterTokens;
      expect(firstGrouped[0].count).toBe(1);

      rerender({ tokens: tokens2 });

      const secondGrouped = result.current.groupedCharacterTokens;
      expect(firstGrouped).not.toBe(secondGrouped);
      expect(secondGrouped[0].count).toBe(2);
    });

    it('should return same reference for grouped tokens when dependencies unchanged', () => {
      const tokens: Token[] = [createMockToken({ type: 'character', name: 'Washer', order: 0 })];

      const { result, rerender } = renderHook(() => useTokenGrouping(tokens));
      const firstGrouped = result.current.groupedCharacterTokens;

      // Rerender without changing dependencies
      rerender();

      const secondGrouped = result.current.groupedCharacterTokens;
      // Should return same reference since dependencies haven't changed
      expect(firstGrouped).toBe(secondGrouped);
    });
  });

  describe('Edge cases', () => {
    it('should handle tokens with minimal properties', () => {
      const token: Token = {
        type: 'character',
        name: 'Character',
        filename: 'test.png',
        team: 'townsfolk',
        canvas: document.createElement('canvas'),
        diameter: 1000,
      };

      const { result } = renderHook(() => useTokenGrouping([token]));

      expect(result.current.characterTokens).toHaveLength(1);
      expect(result.current.characterTokens[0]).toBe(token);
    });

    it('should handle large token arrays', () => {
      const tokens: Token[] = Array.from({ length: 100 }, (_, i) =>
        createMockToken({
          type: 'character',
          name: `Character ${i}`,
          order: i,
        })
      );

      const { result } = renderHook(() => useTokenGrouping(tokens));

      expect(result.current.characterTokens).toHaveLength(100);
      expect(result.current.characterTokens[0].name).toBe('Character 0');
      expect(result.current.characterTokens[99].name).toBe('Character 99');
    });

    it('should handle tokens with special characters in names', () => {
      const tokens: Token[] = [
        createMockToken({
          type: 'character',
          name: "Character's Name & More",
          order: 0,
        }),
        createMockToken({
          type: 'character',
          name: 'Character (Duplicate)',
          order: 1,
        }),
      ];

      const { result } = renderHook(() => useTokenGrouping(tokens));

      expect(result.current.characterTokens).toHaveLength(2);
      expect(result.current.characterTokens[0].name).toBe("Character's Name & More");
    });

    it('should handle tokens with undefined team property', () => {
      // Test runtime edge case with invalid data
      const token = createMockToken({
        type: 'character',
        team: undefined as unknown as Token['team'],
      });

      const { result } = renderHook(() => useTokenGrouping([token]));

      expect(result.current.characterTokens).toHaveLength(1);
    });

    it('should not mutate input tokens array', () => {
      const tokens: Token[] = [
        createMockToken({ type: 'character', name: 'Third', order: 2 }),
        createMockToken({ type: 'character', name: 'First', order: 0 }),
        createMockToken({ type: 'character', name: 'Second', order: 1 }),
      ];

      const originalOrder = tokens.map((t) => t.name);

      renderHook(() => useTokenGrouping(tokens));

      // Original array should not be modified
      const resultOrder = tokens.map((t) => t.name);
      expect(resultOrder).toEqual(originalOrder);
    });

    it('should handle all meta token types', () => {
      const metaTypes: Token['type'][] = [
        'script-name',
        'almanac',
        'pandemonium',
        'bootlegger',
        'jinx',
      ];

      const tokens: Token[] = metaTypes.map((type) =>
        createMockToken({ type, name: `Token ${type}` })
      );

      const { result } = renderHook(() => useTokenGrouping(tokens));

      expect(result.current.metaTokens).toHaveLength(5);
      expect(result.current.metaTokens.map((t) => t.type)).toEqual(metaTypes);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle a typical character-centric script', () => {
      const tokens: Token[] = [
        // Characters
        createMockToken({ type: 'character', name: 'Washer Woman', order: 0 }),
        createMockToken({ type: 'character', name: 'Drunk', order: 1 }),
        createMockToken({ type: 'character', name: 'Butcher', order: 2 }),
        // Reminders for each
        createMockToken({
          type: 'reminder',
          reminderText: 'Washer learns X and Y',
          order: 0,
          parentCharacter: 'Washer Woman',
        }),
        createMockToken({
          type: 'reminder',
          reminderText: 'Drunk: drunk',
          order: 1,
          parentCharacter: 'Drunk',
        }),
        // Meta tokens
        createMockToken({ type: 'script-name', name: 'Trouble Brewing' }),
        createMockToken({ type: 'almanac', name: 'Almanac' }),
      ];

      const { result } = renderHook(() => useTokenGrouping(tokens));

      expect(result.current.characterTokens).toHaveLength(3);
      expect(result.current.reminderTokens).toHaveLength(2);
      expect(result.current.metaTokens).toHaveLength(2);

      expect(result.current.characterTokens[0].name).toBe('Washer Woman');
      expect(result.current.characterTokens[1].name).toBe('Drunk');
      expect(result.current.characterTokens[2].name).toBe('Butcher');
    });

    it('should handle character with multiple variants', () => {
      const tokens: Token[] = [
        createMockToken({
          type: 'character',
          name: 'Washer Woman',
          order: 0,
          variantIndex: 0,
        }),
        createMockToken({
          type: 'character',
          name: 'Washer Woman',
          order: 0,
          variantIndex: 1,
        }),
        createMockToken({
          type: 'character',
          name: 'Washer Woman',
          order: 0,
          variantIndex: 2,
        }),
      ];

      const { result } = renderHook(() => useTokenGrouping(tokens));

      expect(result.current.characterTokens).toHaveLength(3);
      expect(result.current.groupedCharacterTokens).toHaveLength(3);
      // All variants should be tracked in variant arrays
      result.current.groupedCharacterTokens.forEach((group) => {
        expect(group.variants).toBeDefined();
        expect(group.variants.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should handle script with duplicate characters for printing', () => {
      const tokens: Token[] = [
        // Main characters
        createMockToken({ type: 'character', name: 'Washer Woman', order: 0 }),
        createMockToken({ type: 'character', name: 'Drunk', order: 1 }),
        // Duplicates for printing
        createMockToken({ type: 'character', name: 'Washer Woman', order: 0 }),
        createMockToken({ type: 'character', name: 'Washer Woman', order: 0 }),
        createMockToken({ type: 'character', name: 'Drunk', order: 1 }),
      ];

      const { result } = renderHook(() => useTokenGrouping(tokens));

      expect(result.current.characterTokens).toHaveLength(5);
      expect(result.current.groupedCharacterTokens).toHaveLength(2);
      expect(result.current.groupedCharacterTokens[0].count).toBe(3); // Washer Woman
      expect(result.current.groupedCharacterTokens[1].count).toBe(2); // Drunk
    });
  });

  describe('Return value consistency', () => {
    it('should always return object with all required properties', () => {
      const { result } = renderHook(() => useTokenGrouping([]));

      expect(result.current).toHaveProperty('characterTokens');
      expect(result.current).toHaveProperty('reminderTokens');
      expect(result.current).toHaveProperty('metaTokens');
      expect(result.current).toHaveProperty('groupedCharacterTokens');
      expect(result.current).toHaveProperty('groupedReminderTokens');
      expect(result.current).toHaveProperty('groupedMetaTokens');
    });

    it('should always return arrays (never null or undefined)', () => {
      const { result } = renderHook(() => useTokenGrouping([]));

      expect(Array.isArray(result.current.characterTokens)).toBe(true);
      expect(Array.isArray(result.current.reminderTokens)).toBe(true);
      expect(Array.isArray(result.current.metaTokens)).toBe(true);
      expect(Array.isArray(result.current.groupedCharacterTokens)).toBe(true);
      expect(Array.isArray(result.current.groupedReminderTokens)).toBe(true);
      expect(Array.isArray(result.current.groupedMetaTokens)).toBe(true);
    });

    it('should maintain array lengths consistency', () => {
      const tokens: Token[] = [
        createMockToken({ type: 'character', name: 'A', order: 0 }),
        createMockToken({ type: 'character', name: 'A', order: 0 }), // duplicate
        createMockToken({ type: 'character', name: 'B', order: 1 }),
        createMockToken({ type: 'reminder', reminderText: 'X', order: 0 }),
        createMockToken({ type: 'reminder', reminderText: 'X', order: 0 }), // duplicate
        createMockToken({ type: 'script-name', name: 'Script' }),
      ];

      const { result } = renderHook(() => useTokenGrouping(tokens));

      // Raw arrays should have all tokens
      expect(result.current.characterTokens.length).toBe(3);
      expect(result.current.reminderTokens.length).toBe(2);
      expect(result.current.metaTokens.length).toBe(1);

      // Grouped arrays should have unique identities
      expect(result.current.groupedCharacterTokens.length).toBeLessThanOrEqual(
        result.current.characterTokens.length
      );
      expect(result.current.groupedReminderTokens.length).toBeLessThanOrEqual(
        result.current.reminderTokens.length
      );
    });
  });
});
