/**
 * Blood on the Clocktower Token Generator
 * Version Manager - Version parsing and comparison for date-based versions
 *
 * Handles version strings in the format: vYYYY.MM.DD-rN
 * Example: v2025.12.03-r6
 */

import type { VersionInfo } from '../types/index.js';
import { ValidationError } from '../errors.js';

/**
 * Regular expression for parsing date-based version strings
 * Format: vYYYY.MM.DD-rN where:
 * - YYYY = 4-digit year
 * - MM = 2-digit month (01-12)
 * - DD = 2-digit day (01-31)
 * - N = revision number (1 or more digits)
 */
const VERSION_REGEX = /^v(\d{4})\.(\d{2})\.(\d{2})-r(\d+)$/;

/**
 * Version Manager class for handling version operations
 */
export class VersionManager {
    /**
     * Parse a version string into structured VersionInfo
     * @param versionString - Version string in format vYYYY.MM.DD-rN
     * @returns Parsed version information
     * @throws ValidationError if version string is invalid
     */
    static parse(versionString: string): VersionInfo {
        const match = versionString.match(VERSION_REGEX);

        if (!match) {
            throw new ValidationError(
                `Invalid version format: ${versionString}. Expected format: vYYYY.MM.DD-rN`,
                [`Version string must match pattern: vYYYY.MM.DD-rN (e.g., v2025.12.03-r6)`]
            );
        }

        const [, yearStr, monthStr, dayStr, revisionStr] = match;
        const year = parseInt(yearStr, 10);
        const month = parseInt(monthStr, 10);
        const day = parseInt(dayStr, 10);
        const revision = parseInt(revisionStr, 10);

        // Validate date ranges
        if (month < 1 || month > 12) {
            throw new ValidationError(
                `Invalid month in version: ${versionString}`,
                [`Month must be between 01 and 12, got: ${monthStr}`]
            );
        }

        if (day < 1 || day > 31) {
            throw new ValidationError(
                `Invalid day in version: ${versionString}`,
                [`Day must be between 01 and 31, got: ${dayStr}`]
            );
        }

        if (year < 2020 || year > 2100) {
            throw new ValidationError(
                `Invalid year in version: ${versionString}`,
                [`Year must be between 2020 and 2100, got: ${yearStr}`]
            );
        }

        return {
            year,
            month,
            day,
            revision,
            raw: versionString,
        };
    }

    /**
     * Compare two version strings
     * @param versionA - First version string
     * @param versionB - Second version string
     * @returns -1 if A < B, 0 if A === B, 1 if A > B
     */
    static compare(versionA: string, versionB: string): number {
        const a = this.parse(versionA);
        const b = this.parse(versionB);

        // Compare by year
        if (a.year !== b.year) {
            return a.year < b.year ? -1 : 1;
        }

        // Compare by month
        if (a.month !== b.month) {
            return a.month < b.month ? -1 : 1;
        }

        // Compare by day
        if (a.day !== b.day) {
            return a.day < b.day ? -1 : 1;
        }

        // Compare by revision
        if (a.revision !== b.revision) {
            return a.revision < b.revision ? -1 : 1;
        }

        return 0;
    }

    /**
     * Check if version A is newer than version B
     * @param versionA - First version string
     * @param versionB - Second version string
     * @returns true if A is newer than B
     */
    static isNewer(versionA: string, versionB: string): boolean {
        return this.compare(versionA, versionB) > 0;
    }

    /**
     * Check if version A is older than version B
     * @param versionA - First version string
     * @param versionB - Second version string
     * @returns true if A is older than B
     */
    static isOlder(versionA: string, versionB: string): boolean {
        return this.compare(versionA, versionB) < 0;
    }

    /**
     * Check if two versions are equal
     * @param versionA - First version string
     * @param versionB - Second version string
     * @returns true if versions are equal
     */
    static isEqual(versionA: string, versionB: string): boolean {
        return this.compare(versionA, versionB) === 0;
    }

    /**
     * Validate a version string without throwing
     * @param versionString - Version string to validate
     * @returns true if valid, false otherwise
     */
    static isValid(versionString: string): boolean {
        try {
            this.parse(versionString);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get a human-readable date string from a version
     * @param versionString - Version string
     * @returns Formatted date string (e.g., "December 3, 2025")
     */
    static toDateString(versionString: string): string {
        const version = this.parse(versionString);
        const date = new Date(version.year, version.month - 1, version.day);

        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    }

    /**
     * Get a human-readable version description
     * @param versionString - Version string
     * @returns Formatted description (e.g., "Version 6 from December 3, 2025")
     */
    static toDescription(versionString: string): string {
        const version = this.parse(versionString);
        const dateStr = this.toDateString(versionString);
        return `Version ${version.revision} from ${dateStr}`;
    }

    /**
     * Get the latest version from an array of version strings
     * @param versions - Array of version strings
     * @returns Latest version string
     * @throws ValidationError if array is empty
     */
    static getLatest(versions: string[]): string {
        if (versions.length === 0) {
            throw new ValidationError('Cannot get latest version from empty array');
        }

        return versions.reduce((latest, current) => {
            return this.isNewer(current, latest) ? current : latest;
        });
    }

    /**
     * Sort an array of version strings (newest first)
     * @param versions - Array of version strings
     * @returns Sorted array (newest to oldest)
     */
    static sortNewestFirst(versions: string[]): string[] {
        return [...versions].sort((a, b) => this.compare(b, a));
    }

    /**
     * Sort an array of version strings (oldest first)
     * @param versions - Array of version strings
     * @returns Sorted array (oldest to newest)
     */
    static sortOldestFirst(versions: string[]): string[] {
        return [...versions].sort((a, b) => this.compare(a, b));
    }
}

// Export singleton instance for convenience
export const versionManager = VersionManager;

export default VersionManager;
