import { describe, expect, it } from 'vitest';
import type { Token } from '@/ts/types';
import { groupTokensByIdentity } from '@/ts/utils/tokenGrouping';

// Helper to create mock tokens
function createMockToken(overrides: Partial<Token> = {}): Token {
  return {
    id: 'test-token',
    type: 'character',
    name: 'Test Character',
    filename: 'test.png',
    canvas: document.createElement('canvas'),
    team: 'townsfolk',
    ...overrides,
  } as Token;
}

describe('tokenGrouping', () => {
  describe('groupTokensByIdentity', () => {
    it('should return empty array for empty input', () => {
      const result = groupTokensByIdentity([]);
      expect(result).toEqual([]);
    });

    it('should return single grouped token for single input', () => {
      const token = createMockToken({ name: 'Washerwoman' });
      const result = groupTokensByIdentity([token]);

      expect(result).toHaveLength(1);
      expect(result[0].token.name).toBe('Washerwoman');
      expect(result[0].count).toBe(1);
      expect(result[0].allTokens).toHaveLength(1);
    });

    it('should group duplicate character tokens', () => {
      const token1 = createMockToken({ id: 'tok1', name: 'Washerwoman' });
      const token2 = createMockToken({ id: 'tok2', name: 'Washerwoman' });
      const token3 = createMockToken({ id: 'tok3', name: 'Washerwoman' });

      const result = groupTokensByIdentity([token1, token2, token3]);

      expect(result).toHaveLength(1);
      expect(result[0].count).toBe(3);
      expect(result[0].allTokens).toHaveLength(3);
    });

    it('should keep different characters separate', () => {
      const washerwoman = createMockToken({ name: 'Washerwoman' });
      const librarian = createMockToken({ name: 'Librarian' });

      const result = groupTokensByIdentity([washerwoman, librarian]);

      expect(result).toHaveLength(2);
      expect(result.find((g) => g.token.name === 'Washerwoman')).toBeDefined();
      expect(result.find((g) => g.token.name === 'Librarian')).toBeDefined();
    });

    it('should keep character token variants separate', () => {
      const variant0 = createMockToken({ name: 'Washerwoman', variantIndex: 0 });
      const variant1 = createMockToken({ name: 'Washerwoman', variantIndex: 1 });

      const result = groupTokensByIdentity([variant0, variant1]);

      // Variants are grouped under the main entry but kept in variants array
      expect(result).toHaveLength(1);
      expect(result[0].variants).toHaveLength(2);
      expect(result[0].variants[0].variantIndex).toBe(0);
      expect(result[0].variants[1].variantIndex).toBe(1);
    });

    it('should group duplicate reminder tokens', () => {
      const reminder1 = createMockToken({
        type: 'reminder',
        name: 'Reminder',
        parentCharacter: 'Washerwoman',
        reminderText: 'Is the Drunk',
      });
      const reminder2 = createMockToken({
        type: 'reminder',
        name: 'Reminder',
        parentCharacter: 'Washerwoman',
        reminderText: 'Is the Drunk',
      });

      const result = groupTokensByIdentity([reminder1, reminder2]);

      expect(result).toHaveLength(1);
      expect(result[0].count).toBe(2);
    });

    it('should keep different reminder texts separate', () => {
      const reminder1 = createMockToken({
        type: 'reminder',
        name: 'Reminder',
        parentCharacter: 'Washerwoman',
        reminderText: 'Is the Drunk',
      });
      const reminder2 = createMockToken({
        type: 'reminder',
        name: 'Reminder',
        parentCharacter: 'Washerwoman',
        reminderText: 'Townsfolk',
      });

      const result = groupTokensByIdentity([reminder1, reminder2]);

      expect(result).toHaveLength(2);
    });

    it('should keep reminders from different parents separate', () => {
      const reminder1 = createMockToken({
        type: 'reminder',
        name: 'Reminder',
        parentCharacter: 'Washerwoman',
        reminderText: 'Is the Drunk',
      });
      const reminder2 = createMockToken({
        type: 'reminder',
        name: 'Reminder',
        parentCharacter: 'Librarian',
        reminderText: 'Is the Drunk',
      });

      const result = groupTokensByIdentity([reminder1, reminder2]);

      expect(result).toHaveLength(2);
    });

    it('should keep reminder token variants separate', () => {
      const reminder0 = createMockToken({
        type: 'reminder',
        parentCharacter: 'Washerwoman',
        reminderText: 'Is the Drunk',
        variantIndex: 0,
      });
      const reminder1 = createMockToken({
        type: 'reminder',
        parentCharacter: 'Washerwoman',
        reminderText: 'Is the Drunk',
        variantIndex: 1,
      });

      const result = groupTokensByIdentity([reminder0, reminder1]);

      expect(result).toHaveLength(1);
      expect(result[0].variants).toHaveLength(2);
    });

    it('should handle meta tokens', () => {
      const meta1 = createMockToken({ type: 'meta', name: 'Script Name' });
      const meta2 = createMockToken({ type: 'meta', name: 'Script Name' });

      const result = groupTokensByIdentity([meta1, meta2]);

      expect(result).toHaveLength(1);
      expect(result[0].count).toBe(2);
    });

    it('should sort variants by variantIndex', () => {
      const variant2 = createMockToken({ name: 'Test', variantIndex: 2 });
      const variant0 = createMockToken({ name: 'Test', variantIndex: 0 });
      const variant1 = createMockToken({ name: 'Test', variantIndex: 1 });

      const result = groupTokensByIdentity([variant2, variant0, variant1]);

      expect(result).toHaveLength(1);
      expect(result[0].variants[0].variantIndex).toBe(0);
      expect(result[0].variants[1].variantIndex).toBe(1);
      expect(result[0].variants[2].variantIndex).toBe(2);
    });

    it('should handle mixed token types', () => {
      const character = createMockToken({ type: 'character', name: 'Washerwoman' });
      const reminder = createMockToken({
        type: 'reminder',
        name: 'Reminder',
        parentCharacter: 'Washerwoman',
        reminderText: 'Is the Drunk',
      });
      const meta = createMockToken({ type: 'meta', name: 'Script Name' });

      const result = groupTokensByIdentity([character, reminder, meta]);

      expect(result).toHaveLength(3);
    });

    it('should preserve all tokens in allTokens array', () => {
      const token1 = createMockToken({ id: 'tok1', name: 'Washerwoman' });
      const token2 = createMockToken({ id: 'tok2', name: 'Washerwoman' });

      const result = groupTokensByIdentity([token1, token2]);

      expect(result[0].allTokens).toContain(token1);
      expect(result[0].allTokens).toContain(token2);
    });

    it('should set first token as representative', () => {
      const token1 = createMockToken({ id: 'first', name: 'Washerwoman' });
      const token2 = createMockToken({ id: 'second', name: 'Washerwoman' });

      const result = groupTokensByIdentity([token1, token2]);

      expect(result[0].token.id).toBe('first');
    });

    it('should handle tokens without variantIndex as single variant', () => {
      const token = createMockToken({ name: 'Washerwoman' });

      const result = groupTokensByIdentity([token]);

      expect(result[0].variants).toHaveLength(1);
      expect(result[0].variants[0]).toBe(token);
    });

    it('should handle large numbers of duplicates', () => {
      const tokens = Array.from({ length: 100 }, (_, i) =>
        createMockToken({ id: `tok-${i}`, name: 'Washerwoman' })
      );

      const result = groupTokensByIdentity(tokens);

      expect(result).toHaveLength(1);
      expect(result[0].count).toBe(100);
      expect(result[0].allTokens).toHaveLength(100);
    });
  });
});
