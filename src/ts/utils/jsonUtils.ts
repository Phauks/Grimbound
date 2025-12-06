/**
 * Blood on the Clocktower Token Generator
 * JSON Utility Functions
 */

import type { ValidationResult, ScriptEntry } from '../types/index.js';

/**
 * Format JSON with pretty printing
 * @param jsonString - JSON string to format
 * @returns Formatted JSON string
 */
export function formatJson(jsonString: string): string {
    try {
        const parsed = JSON.parse(jsonString) as unknown;
        return JSON.stringify(parsed, null, 2);
    } catch {
        return jsonString;
    }
}

/**
 * Validate JSON string
 * @param jsonString - JSON string to validate
 * @returns Validation result with valid boolean and error message
 */
export function validateJson(jsonString: string): ValidationResult {
    if (!jsonString.trim()) {
        return { valid: false, error: 'JSON is empty' };
    }
    try {
        const parsed = JSON.parse(jsonString) as unknown;
        if (!Array.isArray(parsed)) {
            return { valid: false, error: 'JSON must be an array' };
        }
        return { valid: true, data: parsed as ScriptEntry[] };
    } catch (e) {
        const error = e instanceof Error ? e.message : 'Unknown error';
        return { valid: false, error: `Invalid JSON: ${error}` };
    }
}

/**
 * Deep clone an object using structuredClone (with JSON fallback for older browsers).
 * structuredClone handles more types (Date, RegExp, Map, Set, ArrayBuffer, etc.) and circular references.
 * Falls back to JSON serialization for environments without structuredClone support.
 * 
 * @param obj - Object to clone
 * @returns Cloned object
 */
export function deepClone<T>(obj: T): T {
    if (obj === null || obj === undefined) {
        return obj;
    }
    // Use structuredClone if available (Chrome 98+, Firefox 94+, Safari 15.4+)
    if (typeof structuredClone === 'function') {
        return structuredClone(obj);
    }
    // Fallback to JSON serialization for older browsers
    return JSON.parse(JSON.stringify(obj)) as T;
}

/**
 * Strip internal fields (like uuid) from a character or script entry object.
 * Used when exporting JSON to keep the output clean.
 * @param entry - Object to strip internal fields from
 * @returns Object with internal fields removed
 */
export function stripInternalFields<T extends Record<string, unknown>>(entry: T): Omit<T, 'uuid'> {
    if (typeof entry !== 'object' || entry === null) return entry;
    const { uuid, ...rest } = entry;
    return rest as Omit<T, 'uuid'>;
}

/**
 * Clean JSON string by stripping internal fields (uuid) from all entries.
 * Used for exporting script JSON without internal generator state.
 * @param jsonString - JSON string to clean
 * @returns Cleaned JSON string with internal fields removed
 */
export function getCleanJsonForExport(jsonString: string): string {
    try {
        const parsed = JSON.parse(jsonString);
        if (!Array.isArray(parsed)) return jsonString;
        
        const cleaned = parsed.map(entry => {
            // If it's an object (character or meta), strip uuid
            if (typeof entry === 'object' && entry !== null) {
                return stripInternalFields(entry as Record<string, unknown>);
            }
            // String IDs stay as-is
            return entry;
        });
        
        return JSON.stringify(cleaned, null, 2);
    } catch {
        return jsonString;
    }
}
