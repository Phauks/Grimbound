import { beforeEach, describe, expect, it } from 'vitest';
import { capitalize, generateUniqueFilename, sanitizeFilename } from '@/ts/utils/stringUtils';

describe('stringUtils', () => {
  describe('sanitizeFilename', () => {
    it('should remove invalid characters', () => {
      expect(sanitizeFilename('file<>:"/\\|?*.png')).toBe('file.png');
    });

    it('should replace spaces with underscores', () => {
      expect(sanitizeFilename('my file name.png')).toBe('my_file_name.png');
    });

    it('should collapse multiple underscores', () => {
      expect(sanitizeFilename('file___name.png')).toBe('file_name.png');
    });

    it('should remove leading/trailing dots', () => {
      expect(sanitizeFilename('.hidden..file.png.')).toBe('hidden..file.png');
    });

    it('should handle reserved Windows names', () => {
      expect(sanitizeFilename('CON')).toBe('_CON');
      expect(sanitizeFilename('prn')).toBe('_prn');
      expect(sanitizeFilename('aux')).toBe('_aux');
    });

    it('should truncate long filenames', () => {
      const longName = 'a'.repeat(300);
      const result = sanitizeFilename(longName);
      expect(result.length).toBeLessThanOrEqual(200);
    });

    it('should return "unnamed" for empty input', () => {
      expect(sanitizeFilename('')).toBe('unnamed');
      expect(sanitizeFilename('   ')).toBe('unnamed');
      expect(sanitizeFilename('...')).toBe('unnamed');
    });

    it('should handle typical character names', () => {
      expect(sanitizeFilename('Washerwoman')).toBe('Washerwoman');
      expect(sanitizeFilename("Po'boy")).toBe("Po'boy");
      expect(sanitizeFilename('Town Crier')).toBe('Town_Crier');
    });
  });

  describe('generateUniqueFilename', () => {
    let nameCount: Map<string, number>;

    beforeEach(() => {
      nameCount = new Map();
    });

    it('should return original name for first occurrence', () => {
      const result = generateUniqueFilename(nameCount, 'test');
      expect(result).toBe('test');
    });

    it('should add suffix for subsequent occurrences', () => {
      generateUniqueFilename(nameCount, 'test');
      const result = generateUniqueFilename(nameCount, 'test');
      expect(result).toBe('test_01');
    });

    it('should increment suffix for multiple occurrences', () => {
      generateUniqueFilename(nameCount, 'test');
      generateUniqueFilename(nameCount, 'test');
      generateUniqueFilename(nameCount, 'test');
      const result = generateUniqueFilename(nameCount, 'test');
      expect(result).toBe('test_03');
    });

    it('should track different names separately', () => {
      generateUniqueFilename(nameCount, 'alpha');
      generateUniqueFilename(nameCount, 'beta');
      const result1 = generateUniqueFilename(nameCount, 'alpha');
      const result2 = generateUniqueFilename(nameCount, 'beta');
      expect(result1).toBe('alpha_01');
      expect(result2).toBe('beta_01');
    });
  });

  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
    });

    it('should lowercase rest of string', () => {
      expect(capitalize('HELLO')).toBe('Hello');
      expect(capitalize('hELLO')).toBe('Hello');
    });

    it('should handle empty string', () => {
      expect(capitalize('')).toBe('');
    });

    it('should handle single character', () => {
      expect(capitalize('a')).toBe('A');
      expect(capitalize('A')).toBe('A');
    });
  });
});
