/**
 * Blood on the Clocktower Token Generator
 * Utility Functions
 */

import type { RGB, ValidationResult, ScriptEntry } from './types/index.js';

/**
 * Debounce function to limit rate of function calls
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: unknown[]) => void>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    return function executedFunction(...args: Parameters<T>): void {
        const later = (): void => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Load an image from URL with CORS handling
 * @param url - Image URL
 * @returns Loaded image element
 */
export async function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = (): void => resolve(img);
        img.onerror = (): void => reject(new Error(`Failed to load image from: ${url}. This may be due to CORS restrictions or the image not being accessible.`));
        img.src = url;
    });
}

/**
 * Load an image from local path
 * @param path - Local file path
 * @returns Loaded image element
 */
export async function loadLocalImage(path: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = (): void => resolve(img);
        img.onerror = (): void => reject(new Error(`Failed to load local image: ${path}`));
        img.src = path;
    });
}

/**
 * Convert hex color to RGB object
 * @param hex - Hex color string
 * @returns RGB object with r, g, b properties
 */
export function hexToRgb(hex: string): RGB | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

/**
 * Generate a unique filename suffix for duplicates
 * @param nameCount - Map tracking name occurrences
 * @param baseName - Base filename
 * @returns Filename with suffix if needed
 */
export function generateUniqueFilename(nameCount: Map<string, number>, baseName: string): string {
    if (!nameCount.has(baseName)) {
        nameCount.set(baseName, 0);
    }
    const count = nameCount.get(baseName) ?? 0;
    nameCount.set(baseName, count + 1);

    if (count === 0) {
        return baseName;
    }
    return `${baseName}_${String(count).padStart(2, '0')}`;
}

/**
 * Sanitize filename by removing invalid characters
 * @param filename - Original filename
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
    return filename
        .replace(/[<>:"/\\|?*]/g, '')
        .replace(/\s+/g, '_')
        .trim();
}

/**
 * Convert canvas to blob
 * @param canvas - Canvas element
 * @param type - MIME type
 * @param quality - Quality (0-1)
 * @returns Image blob
 */
export async function canvasToBlob(
    canvas: HTMLCanvasElement,
    type: string = 'image/png',
    quality: number = 1
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob);
            } else {
                reject(new Error('Failed to convert canvas to blob'));
            }
        }, type, quality);
    });
}

/**
 * Download a file
 * @param data - File data (Blob or data URL)
 * @param filename - Download filename
 */
export function downloadFile(data: Blob | string, filename: string): void {
    const link = document.createElement('a');
    if (data instanceof Blob) {
        link.href = URL.createObjectURL(data);
    } else {
        link.href = data;
    }
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (data instanceof Blob) {
        URL.revokeObjectURL(link.href);
    }
}

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
 * Sleep for specified milliseconds
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after delay
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get contrast color (black or white) for given background
 * @param hexColor - Background hex color
 * @returns '#000000' or '#FFFFFF'
 */
export function getContrastColor(hexColor: string): string {
    const rgb = hexToRgb(hexColor);
    if (!rgb) return '#000000';

    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

/**
 * Check if fonts are loaded
 * @param fontNames - Array of font names to check
 * @returns Whether fonts are loaded
 */
export async function checkFontsLoaded(fontNames: string[]): Promise<boolean> {
    if (!document.fonts) {
        // Fallback for older browsers
        return new Promise(resolve => setTimeout(() => resolve(true), 500));
    }

    try {
        await document.fonts.ready;
        const checks = fontNames.map(name => document.fonts.check(`16px "${name}"`));
        return checks.every(loaded => loaded);
    } catch {
        return false;
    }
}

/**
 * Deep clone an object using JSON serialization.
 * Note: This method has limitations:
 * - Does not handle functions, undefined, symbols, or circular references
 * - Date objects are converted to strings
 * - RegExp objects are converted to empty objects
 * For simple configuration objects and data, this is sufficient.
 * @param obj - Object to clone (must be JSON-serializable)
 * @returns Cloned object
 */
export function deepClone<T>(obj: T): T {
    if (obj === null || obj === undefined) {
        return obj;
    }
    return JSON.parse(JSON.stringify(obj)) as T;
}

/**
 * Capitalize first letter of string
 * @param str - String to capitalize
 * @returns Capitalized string
 */
export function capitalize(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export default {
    debounce,
    loadImage,
    loadLocalImage,
    hexToRgb,
    generateUniqueFilename,
    sanitizeFilename,
    canvasToBlob,
    downloadFile,
    formatJson,
    validateJson,
    sleep,
    getContrastColor,
    checkFontsLoaded,
    deepClone,
    capitalize
};
