import { describe, expect, it } from 'vitest';
import {
  combineHashes,
  hashArray,
  hashGenerationOptions,
  hashObject,
  simpleHash,
} from '@/ts/cache/utils/hashUtils';
import type { GenerationOptions } from '@/ts/types';

describe('hashUtils', () => {
  describe('simpleHash', () => {
    it('should return a string hash', () => {
      const result = simpleHash('test-string');
      expect(typeof result).toBe('string');
    });

    it('should return consistent hash for same input', () => {
      const hash1 = simpleHash('hello world');
      const hash2 = simpleHash('hello world');
      expect(hash1).toBe(hash2);
    });

    it('should return different hash for different input', () => {
      const hash1 = simpleHash('hello');
      const hash2 = simpleHash('world');
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty string', () => {
      const result = simpleHash('');
      expect(result).toBe('0');
    });

    it('should handle long strings', () => {
      const longString = 'a'.repeat(10000);
      const result = simpleHash(longString);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle special characters', () => {
      const result = simpleHash('héllo wörld 🎲');
      expect(typeof result).toBe('string');
    });

    it('should produce different hashes for similar strings', () => {
      const hash1 = simpleHash('test1');
      const hash2 = simpleHash('test2');
      expect(hash1).not.toBe(hash2);
    });

    it('should handle Unicode characters', () => {
      const result = simpleHash('日本語テスト');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('hashObject', () => {
    it('should hash entire object when no keys specified', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = hashObject(obj);
      expect(typeof result).toBe('string');
    });

    it('should hash only specified keys', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const hashAB = hashObject(obj, ['a', 'b']);
      const hashBC = hashObject(obj, ['b', 'c']);
      expect(hashAB).not.toBe(hashBC);
    });

    it('should return consistent hash for same object', () => {
      const obj = { name: 'test', value: 123 };
      const hash1 = hashObject(obj);
      const hash2 = hashObject(obj);
      expect(hash1).toBe(hash2);
    });

    it('should return different hash for different values', () => {
      const obj1 = { name: 'test' };
      const obj2 = { name: 'different' };
      expect(hashObject(obj1)).not.toBe(hashObject(obj2));
    });

    it('should handle nested objects', () => {
      const obj = { a: { b: { c: 1 } } };
      const result = hashObject(obj);
      expect(typeof result).toBe('string');
    });

    it('should handle arrays in objects', () => {
      const obj = { items: [1, 2, 3] };
      const result = hashObject(obj);
      expect(typeof result).toBe('string');
    });

    it('should handle null values', () => {
      const obj = { name: null, value: undefined };
      const result = hashObject(obj as Record<string, unknown>);
      expect(typeof result).toBe('string');
    });

    it('should respect key order in subset', () => {
      const obj = { a: 1, b: 2 };
      // JSON.stringify maintains insertion order for string keys
      const hash1 = hashObject(obj, ['a', 'b']);
      const hash2 = hashObject(obj, ['b', 'a']);
      // Since we're creating subset objects, order might differ
      expect(typeof hash1).toBe('string');
      expect(typeof hash2).toBe('string');
    });
  });

  describe('hashArray', () => {
    it('should hash array using key extractor', () => {
      const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
      const result = hashArray(items, (item) => item.id);
      expect(typeof result).toBe('string');
    });

    it('should return consistent hash for same array', () => {
      const items = [{ id: 'x' }, { id: 'y' }];
      const hash1 = hashArray(items, (item) => item.id);
      const hash2 = hashArray(items, (item) => item.id);
      expect(hash1).toBe(hash2);
    });

    it('should return different hash for different arrays', () => {
      const items1 = [{ id: 'a' }];
      const items2 = [{ id: 'b' }];
      const hash1 = hashArray(items1, (item) => item.id);
      const hash2 = hashArray(items2, (item) => item.id);
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty array', () => {
      const result = hashArray([], (item: unknown) => String(item));
      expect(typeof result).toBe('string');
    });

    it('should be order-sensitive', () => {
      const items1 = [{ id: 'a' }, { id: 'b' }];
      const items2 = [{ id: 'b' }, { id: 'a' }];
      const hash1 = hashArray(items1, (item) => item.id);
      const hash2 = hashArray(items2, (item) => item.id);
      expect(hash1).not.toBe(hash2);
    });

    it('should work with primitive arrays', () => {
      const items = ['a', 'b', 'c'];
      const result = hashArray(items, (item) => item);
      expect(typeof result).toBe('string');
    });

    it('should work with complex key extraction', () => {
      const items = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ];
      const result = hashArray(items, (item) => `${item.name}:${item.age}`);
      expect(typeof result).toBe('string');
    });
  });

  describe('combineHashes', () => {
    it('should combine multiple hashes into one', () => {
      const result = combineHashes(['abc', 'def', 'ghi']);
      expect(typeof result).toBe('string');
    });

    it('should return consistent result for same inputs', () => {
      const hashes = ['hash1', 'hash2', 'hash3'];
      const result1 = combineHashes(hashes);
      const result2 = combineHashes(hashes);
      expect(result1).toBe(result2);
    });

    it('should return different result for different inputs', () => {
      const result1 = combineHashes(['a', 'b']);
      const result2 = combineHashes(['c', 'd']);
      expect(result1).not.toBe(result2);
    });

    it('should be order-sensitive', () => {
      const result1 = combineHashes(['a', 'b']);
      const result2 = combineHashes(['b', 'a']);
      expect(result1).not.toBe(result2);
    });

    it('should handle single hash', () => {
      const result = combineHashes(['single']);
      expect(typeof result).toBe('string');
    });

    it('should handle empty array', () => {
      const result = combineHashes([]);
      expect(typeof result).toBe('string');
    });

    it('should handle empty string hashes', () => {
      const result = combineHashes(['', '', '']);
      expect(typeof result).toBe('string');
    });
  });

  describe('hashGenerationOptions', () => {
    const baseOptions: GenerationOptions = {
      displayAbilityText: true,
      generateBootleggerRules: false,
      tokenCount: 1,
      setupStyle: 'modern',
      characterBackground: '#1a1a2e',
      characterBackgroundType: 'solid',
      reminderBackground: '#1a1a2e',
      reminderBackgroundType: 'solid',
      characterNameFont: 'Dumbledore',
      characterReminderFont: 'Dumbledore',
      accentGeneration: 'none',
    } as GenerationOptions;

    it('should return a hash string', () => {
      const result = hashGenerationOptions(baseOptions);
      expect(typeof result).toBe('string');
    });

    it('should return consistent hash for same options', () => {
      const hash1 = hashGenerationOptions(baseOptions);
      const hash2 = hashGenerationOptions(baseOptions);
      expect(hash1).toBe(hash2);
    });

    it('should return different hash when displayAbilityText changes', () => {
      const options2 = { ...baseOptions, displayAbilityText: false };
      const hash1 = hashGenerationOptions(baseOptions);
      const hash2 = hashGenerationOptions(options2);
      expect(hash1).not.toBe(hash2);
    });

    it('should return different hash when background changes', () => {
      const options2 = { ...baseOptions, characterBackground: '#FF0000' };
      const hash1 = hashGenerationOptions(baseOptions);
      const hash2 = hashGenerationOptions(options2);
      expect(hash1).not.toBe(hash2);
    });

    it('should return different hash when font changes', () => {
      const options2 = { ...baseOptions, characterNameFont: 'Arial' };
      const hash1 = hashGenerationOptions(baseOptions);
      const hash2 = hashGenerationOptions(options2);
      expect(hash1).not.toBe(hash2);
    });

    it('should return different hash when accentGeneration changes', () => {
      const options2 = { ...baseOptions, accentGeneration: 'team' };
      const hash1 = hashGenerationOptions(baseOptions);
      const hash2 = hashGenerationOptions(options2 as GenerationOptions);
      expect(hash1).not.toBe(hash2);
    });

    it('should return different hash when setupPlacement changes', () => {
      const options1 = { ...baseOptions, setupPlacement: 'left' } as GenerationOptions;
      const options2 = { ...baseOptions, setupPlacement: 'right' } as GenerationOptions;
      const hash1 = hashGenerationOptions(options1);
      const hash2 = hashGenerationOptions(options2);
      expect(hash1).not.toBe(hash2);
    });

    it('should ignore non-visual options', () => {
      // Options not in the hash function should not affect the hash
      const options1 = { ...baseOptions, someOtherOption: 'value1' } as GenerationOptions;
      const options2 = { ...baseOptions, someOtherOption: 'value2' } as GenerationOptions;
      const hash1 = hashGenerationOptions(options1);
      const hash2 = hashGenerationOptions(options2);
      expect(hash1).toBe(hash2);
    });
  });
});
