import { describe, expect, it } from 'vitest';
import { ValidationError } from '@/ts/errors';
import { VersionManager } from '@/ts/sync/versionManager';

describe('VersionManager', () => {
  describe('parse', () => {
    it('should parse valid version string', () => {
      const result = VersionManager.parse('v2025.12.03-r6');
      expect(result.year).toBe(2025);
      expect(result.month).toBe(12);
      expect(result.day).toBe(3);
      expect(result.revision).toBe(6);
      expect(result.raw).toBe('v2025.12.03-r6');
    });

    it('should parse single-digit revision', () => {
      const result = VersionManager.parse('v2024.01.15-r1');
      expect(result.revision).toBe(1);
    });

    it('should parse multi-digit revision', () => {
      const result = VersionManager.parse('v2024.06.20-r123');
      expect(result.revision).toBe(123);
    });

    it('should throw ValidationError for invalid format', () => {
      expect(() => VersionManager.parse('invalid')).toThrow(ValidationError);
      expect(() => VersionManager.parse('2025.12.03-r1')).toThrow(ValidationError); // Missing 'v'
      expect(() => VersionManager.parse('v2025-12-03-r1')).toThrow(ValidationError); // Wrong separator
      expect(() => VersionManager.parse('v2025.12.03')).toThrow(ValidationError); // Missing revision
      expect(() => VersionManager.parse('v25.12.03-r1')).toThrow(ValidationError); // 2-digit year
    });

    it('should throw ValidationError for invalid month', () => {
      expect(() => VersionManager.parse('v2025.00.15-r1')).toThrow(ValidationError);
      expect(() => VersionManager.parse('v2025.13.15-r1')).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid day', () => {
      expect(() => VersionManager.parse('v2025.12.00-r1')).toThrow(ValidationError);
      expect(() => VersionManager.parse('v2025.12.32-r1')).toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid year', () => {
      expect(() => VersionManager.parse('v2019.12.15-r1')).toThrow(ValidationError);
      expect(() => VersionManager.parse('v2101.12.15-r1')).toThrow(ValidationError);
    });
  });

  describe('compare', () => {
    it('should return 0 for equal versions', () => {
      expect(VersionManager.compare('v2025.12.03-r6', 'v2025.12.03-r6')).toBe(0);
    });

    it('should compare by year', () => {
      expect(VersionManager.compare('v2024.12.03-r1', 'v2025.12.03-r1')).toBe(-1);
      expect(VersionManager.compare('v2025.12.03-r1', 'v2024.12.03-r1')).toBe(1);
    });

    it('should compare by month when year is equal', () => {
      expect(VersionManager.compare('v2025.06.03-r1', 'v2025.12.03-r1')).toBe(-1);
      expect(VersionManager.compare('v2025.12.03-r1', 'v2025.06.03-r1')).toBe(1);
    });

    it('should compare by day when year and month are equal', () => {
      expect(VersionManager.compare('v2025.12.01-r1', 'v2025.12.15-r1')).toBe(-1);
      expect(VersionManager.compare('v2025.12.15-r1', 'v2025.12.01-r1')).toBe(1);
    });

    it('should compare by revision when date is equal', () => {
      expect(VersionManager.compare('v2025.12.03-r1', 'v2025.12.03-r6')).toBe(-1);
      expect(VersionManager.compare('v2025.12.03-r6', 'v2025.12.03-r1')).toBe(1);
    });

    it('should handle different revision numbers', () => {
      expect(VersionManager.compare('v2025.12.03-r5', 'v2025.12.03-r10')).toBe(-1);
      expect(VersionManager.compare('v2025.12.03-r99', 'v2025.12.03-r100')).toBe(-1);
    });
  });

  describe('isNewer', () => {
    it('should return true when first version is newer', () => {
      expect(VersionManager.isNewer('v2025.12.03-r6', 'v2025.12.03-r1')).toBe(true);
      expect(VersionManager.isNewer('v2025.12.03-r1', 'v2024.12.03-r1')).toBe(true);
    });

    it('should return false when first version is older', () => {
      expect(VersionManager.isNewer('v2025.12.03-r1', 'v2025.12.03-r6')).toBe(false);
      expect(VersionManager.isNewer('v2024.12.03-r1', 'v2025.12.03-r1')).toBe(false);
    });

    it('should return false when versions are equal', () => {
      expect(VersionManager.isNewer('v2025.12.03-r6', 'v2025.12.03-r6')).toBe(false);
    });
  });

  describe('isOlder', () => {
    it('should return true when first version is older', () => {
      expect(VersionManager.isOlder('v2025.12.03-r1', 'v2025.12.03-r6')).toBe(true);
      expect(VersionManager.isOlder('v2024.12.03-r1', 'v2025.12.03-r1')).toBe(true);
    });

    it('should return false when first version is newer', () => {
      expect(VersionManager.isOlder('v2025.12.03-r6', 'v2025.12.03-r1')).toBe(false);
      expect(VersionManager.isOlder('v2025.12.03-r1', 'v2024.12.03-r1')).toBe(false);
    });

    it('should return false when versions are equal', () => {
      expect(VersionManager.isOlder('v2025.12.03-r6', 'v2025.12.03-r6')).toBe(false);
    });
  });

  describe('isEqual', () => {
    it('should return true for equal versions', () => {
      expect(VersionManager.isEqual('v2025.12.03-r6', 'v2025.12.03-r6')).toBe(true);
    });

    it('should return false for different versions', () => {
      expect(VersionManager.isEqual('v2025.12.03-r6', 'v2025.12.03-r5')).toBe(false);
      expect(VersionManager.isEqual('v2025.12.03-r1', 'v2024.12.03-r1')).toBe(false);
    });
  });

  describe('isValid', () => {
    it('should return true for valid versions', () => {
      expect(VersionManager.isValid('v2025.12.03-r6')).toBe(true);
      expect(VersionManager.isValid('v2020.01.01-r1')).toBe(true);
      expect(VersionManager.isValid('v2100.12.31-r999')).toBe(true);
    });

    it('should return false for invalid versions', () => {
      expect(VersionManager.isValid('invalid')).toBe(false);
      expect(VersionManager.isValid('v2025.13.01-r1')).toBe(false);
      expect(VersionManager.isValid('v2025.12.32-r1')).toBe(false);
      expect(VersionManager.isValid('')).toBe(false);
    });
  });

  describe('toDateString', () => {
    it('should return formatted date string', () => {
      const result = VersionManager.toDateString('v2025.12.03-r6');
      expect(result).toContain('December');
      expect(result).toContain('3');
      expect(result).toContain('2025');
    });

    it('should format single-digit days correctly', () => {
      const result = VersionManager.toDateString('v2025.01.05-r1');
      expect(result).toContain('January');
      expect(result).toContain('5');
    });
  });

  describe('toDescription', () => {
    it('should return human-readable description', () => {
      const result = VersionManager.toDescription('v2025.12.03-r6');
      expect(result).toContain('Version 6');
      expect(result).toContain('December');
      expect(result).toContain('2025');
    });

    it('should include revision number', () => {
      const result = VersionManager.toDescription('v2025.06.15-r42');
      expect(result).toContain('Version 42');
    });
  });

  describe('getLatest', () => {
    it('should return the latest version from array', () => {
      const versions = ['v2024.01.01-r1', 'v2025.12.03-r6', 'v2025.06.15-r2'];
      const result = VersionManager.getLatest(versions);
      expect(result).toBe('v2025.12.03-r6');
    });

    it('should handle single version', () => {
      const versions = ['v2025.01.01-r1'];
      const result = VersionManager.getLatest(versions);
      expect(result).toBe('v2025.01.01-r1');
    });

    it('should throw ValidationError for empty array', () => {
      expect(() => VersionManager.getLatest([])).toThrow(ValidationError);
    });

    it('should handle versions with same date but different revisions', () => {
      const versions = ['v2025.12.03-r1', 'v2025.12.03-r5', 'v2025.12.03-r3'];
      const result = VersionManager.getLatest(versions);
      expect(result).toBe('v2025.12.03-r5');
    });
  });

  describe('sortNewestFirst', () => {
    it('should sort versions from newest to oldest', () => {
      const versions = ['v2024.01.01-r1', 'v2025.12.03-r6', 'v2025.06.15-r2'];
      const result = VersionManager.sortNewestFirst(versions);
      expect(result[0]).toBe('v2025.12.03-r6');
      expect(result[1]).toBe('v2025.06.15-r2');
      expect(result[2]).toBe('v2024.01.01-r1');
    });

    it('should not mutate original array', () => {
      const versions = ['v2024.01.01-r1', 'v2025.12.03-r6'];
      const original = [...versions];
      VersionManager.sortNewestFirst(versions);
      expect(versions).toEqual(original);
    });

    it('should handle empty array', () => {
      const result = VersionManager.sortNewestFirst([]);
      expect(result).toEqual([]);
    });

    it('should handle single version', () => {
      const result = VersionManager.sortNewestFirst(['v2025.01.01-r1']);
      expect(result).toEqual(['v2025.01.01-r1']);
    });
  });

  describe('sortOldestFirst', () => {
    it('should sort versions from oldest to newest', () => {
      const versions = ['v2025.12.03-r6', 'v2024.01.01-r1', 'v2025.06.15-r2'];
      const result = VersionManager.sortOldestFirst(versions);
      expect(result[0]).toBe('v2024.01.01-r1');
      expect(result[1]).toBe('v2025.06.15-r2');
      expect(result[2]).toBe('v2025.12.03-r6');
    });

    it('should not mutate original array', () => {
      const versions = ['v2025.12.03-r6', 'v2024.01.01-r1'];
      const original = [...versions];
      VersionManager.sortOldestFirst(versions);
      expect(versions).toEqual(original);
    });

    it('should handle empty array', () => {
      const result = VersionManager.sortOldestFirst([]);
      expect(result).toEqual([]);
    });
  });
});
