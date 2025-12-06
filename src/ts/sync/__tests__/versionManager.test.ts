/**
 * Blood on the Clocktower Token Generator
 * Version Manager Unit Tests
 */

import { describe, it, expect } from 'vitest';
import { VersionManager } from '../versionManager.js';
import { ValidationError } from '../../errors.js';

describe('VersionManager', () => {
    describe('parse', () => {
        it('should parse valid version strings', () => {
            const version = VersionManager.parse('v2025.12.03-r6');
            expect(version).toEqual({
                year: 2025,
                month: 12,
                day: 3,
                revision: 6,
                raw: 'v2025.12.03-r6',
            });
        });

        it('should parse version with single-digit revision', () => {
            const version = VersionManager.parse('v2024.01.15-r1');
            expect(version).toEqual({
                year: 2024,
                month: 1,
                day: 15,
                revision: 1,
                raw: 'v2024.01.15-r1',
            });
        });

        it('should parse version with multi-digit revision', () => {
            const version = VersionManager.parse('v2025.06.20-r123');
            expect(version).toEqual({
                year: 2025,
                month: 6,
                day: 20,
                revision: 123,
                raw: 'v2025.06.20-r123',
            });
        });

        it('should throw ValidationError for invalid format', () => {
            expect(() => VersionManager.parse('invalid')).toThrow(ValidationError);
            expect(() => VersionManager.parse('2025.12.03-r6')).toThrow(ValidationError);
            expect(() => VersionManager.parse('v2025.12.03')).toThrow(ValidationError);
            expect(() => VersionManager.parse('v2025-12-03-r6')).toThrow(ValidationError);
        });

        it('should throw ValidationError for invalid month', () => {
            expect(() => VersionManager.parse('v2025.00.03-r6')).toThrow(ValidationError);
            expect(() => VersionManager.parse('v2025.13.03-r6')).toThrow(ValidationError);
        });

        it('should throw ValidationError for invalid day', () => {
            expect(() => VersionManager.parse('v2025.12.00-r6')).toThrow(ValidationError);
            expect(() => VersionManager.parse('v2025.12.32-r6')).toThrow(ValidationError);
        });

        it('should throw ValidationError for invalid year', () => {
            expect(() => VersionManager.parse('v2019.12.03-r6')).toThrow(ValidationError);
            expect(() => VersionManager.parse('v2101.12.03-r6')).toThrow(ValidationError);
        });
    });

    describe('compare', () => {
        it('should return 0 for equal versions', () => {
            expect(VersionManager.compare('v2025.12.03-r6', 'v2025.12.03-r6')).toBe(0);
        });

        it('should compare by year', () => {
            expect(VersionManager.compare('v2025.12.03-r6', 'v2024.12.03-r6')).toBe(1);
            expect(VersionManager.compare('v2024.12.03-r6', 'v2025.12.03-r6')).toBe(-1);
        });

        it('should compare by month when years are equal', () => {
            expect(VersionManager.compare('v2025.12.03-r6', 'v2025.11.03-r6')).toBe(1);
            expect(VersionManager.compare('v2025.11.03-r6', 'v2025.12.03-r6')).toBe(-1);
        });

        it('should compare by day when year and month are equal', () => {
            expect(VersionManager.compare('v2025.12.15-r6', 'v2025.12.10-r6')).toBe(1);
            expect(VersionManager.compare('v2025.12.10-r6', 'v2025.12.15-r6')).toBe(-1);
        });

        it('should compare by revision when date is equal', () => {
            expect(VersionManager.compare('v2025.12.03-r6', 'v2025.12.03-r5')).toBe(1);
            expect(VersionManager.compare('v2025.12.03-r5', 'v2025.12.03-r6')).toBe(-1);
        });

        it('should handle complex comparisons', () => {
            expect(VersionManager.compare('v2025.12.03-r6', 'v2024.12.04-r10')).toBe(1);
            expect(VersionManager.compare('v2025.01.01-r1', 'v2025.12.31-r100')).toBe(-1);
        });
    });

    describe('isNewer', () => {
        it('should return true when first version is newer', () => {
            expect(VersionManager.isNewer('v2025.12.03-r6', 'v2025.12.03-r5')).toBe(true);
            expect(VersionManager.isNewer('v2025.12.04-r1', 'v2025.12.03-r6')).toBe(true);
        });

        it('should return false when first version is older or equal', () => {
            expect(VersionManager.isNewer('v2025.12.03-r5', 'v2025.12.03-r6')).toBe(false);
            expect(VersionManager.isNewer('v2025.12.03-r6', 'v2025.12.03-r6')).toBe(false);
        });
    });

    describe('isOlder', () => {
        it('should return true when first version is older', () => {
            expect(VersionManager.isOlder('v2025.12.03-r5', 'v2025.12.03-r6')).toBe(true);
            expect(VersionManager.isOlder('v2025.12.03-r6', 'v2025.12.04-r1')).toBe(true);
        });

        it('should return false when first version is newer or equal', () => {
            expect(VersionManager.isOlder('v2025.12.03-r6', 'v2025.12.03-r5')).toBe(false);
            expect(VersionManager.isOlder('v2025.12.03-r6', 'v2025.12.03-r6')).toBe(false);
        });
    });

    describe('isEqual', () => {
        it('should return true for equal versions', () => {
            expect(VersionManager.isEqual('v2025.12.03-r6', 'v2025.12.03-r6')).toBe(true);
        });

        it('should return false for different versions', () => {
            expect(VersionManager.isEqual('v2025.12.03-r6', 'v2025.12.03-r5')).toBe(false);
            expect(VersionManager.isEqual('v2025.12.03-r6', 'v2025.12.04-r6')).toBe(false);
        });
    });

    describe('isValid', () => {
        it('should return true for valid version strings', () => {
            expect(VersionManager.isValid('v2025.12.03-r6')).toBe(true);
            expect(VersionManager.isValid('v2024.01.01-r1')).toBe(true);
        });

        it('should return false for invalid version strings', () => {
            expect(VersionManager.isValid('invalid')).toBe(false);
            expect(VersionManager.isValid('v2025.13.03-r6')).toBe(false);
            expect(VersionManager.isValid('2025.12.03-r6')).toBe(false);
        });
    });

    describe('toDateString', () => {
        it('should format version as human-readable date', () => {
            const dateStr = VersionManager.toDateString('v2025.12.03-r6');
            expect(dateStr).toBe('December 3, 2025');
        });

        it('should handle different months', () => {
            expect(VersionManager.toDateString('v2025.01.15-r1')).toBe('January 15, 2025');
            expect(VersionManager.toDateString('v2025.06.20-r2')).toBe('June 20, 2025');
        });
    });

    describe('toDescription', () => {
        it('should format version as human-readable description', () => {
            const desc = VersionManager.toDescription('v2025.12.03-r6');
            expect(desc).toBe('Version 6 from December 3, 2025');
        });
    });

    describe('getLatest', () => {
        it('should return the latest version from an array', () => {
            const versions = [
                'v2025.12.03-r5',
                'v2025.12.03-r6',
                'v2025.12.04-r1',
                'v2025.12.03-r4',
            ];
            expect(VersionManager.getLatest(versions)).toBe('v2025.12.04-r1');
        });

        it('should throw ValidationError for empty array', () => {
            expect(() => VersionManager.getLatest([])).toThrow(ValidationError);
        });
    });

    describe('sortNewestFirst', () => {
        it('should sort versions from newest to oldest', () => {
            const versions = [
                'v2025.12.03-r5',
                'v2025.12.03-r6',
                'v2025.12.04-r1',
                'v2025.12.03-r4',
            ];
            const sorted = VersionManager.sortNewestFirst(versions);
            expect(sorted).toEqual([
                'v2025.12.04-r1',
                'v2025.12.03-r6',
                'v2025.12.03-r5',
                'v2025.12.03-r4',
            ]);
        });

        it('should not mutate original array', () => {
            const versions = ['v2025.12.03-r5', 'v2025.12.03-r6'];
            const original = [...versions];
            VersionManager.sortNewestFirst(versions);
            expect(versions).toEqual(original);
        });
    });

    describe('sortOldestFirst', () => {
        it('should sort versions from oldest to newest', () => {
            const versions = [
                'v2025.12.03-r6',
                'v2025.12.03-r5',
                'v2025.12.04-r1',
                'v2025.12.03-r4',
            ];
            const sorted = VersionManager.sortOldestFirst(versions);
            expect(sorted).toEqual([
                'v2025.12.03-r4',
                'v2025.12.03-r5',
                'v2025.12.03-r6',
                'v2025.12.04-r1',
            ]);
        });

        it('should not mutate original array', () => {
            const versions = ['v2025.12.03-r6', 'v2025.12.03-r5'];
            const original = [...versions];
            VersionManager.sortOldestFirst(versions);
            expect(versions).toEqual(original);
        });
    });
});
