/**
 * Blood on the Clocktower Token Generator
 * Utility Functions - Barrel Export
 * 
 * This module re-exports all utility functions for convenient importing.
 * Functions are organized into domain-specific modules:
 * - stringUtils: filename sanitization, capitalize, unique names
 * - imageUtils: image loading, canvas operations, file downloads
 * - jsonUtils: JSON formatting, validation, deep cloning
 * - colorUtils: hex to RGB conversion, contrast colors
 * - asyncUtils: debounce, sleep, array shuffling
 */

// String utilities
export {
    generateUniqueFilename,
    sanitizeFilename,
    capitalize
} from './stringUtils.js';

// Image utilities
export {
    loadImage,
    loadLocalImage,
    canvasToBlob,
    downloadFile,
    checkFontsLoaded,
    applyCorsProxy
} from './imageUtils.js';

// JSON utilities
export {
    formatJson,
    validateJson,
    deepClone,
    stripInternalFields,
    getCleanJsonForExport
} from './jsonUtils.js';

// Storage utilities
export {
    STORAGE_KEYS,
    getStorageItem,
    setStorageItem,
    removeStorageItem,
    type StorageKey
} from './storageKeys.js';

// Color utilities
export {
    hexToRgb,
    getContrastColor
} from './colorUtils.js';

// Async/timing utilities
export {
    shuffleArray,
    debounce,
    sleep
} from './asyncUtils.js';

// Progress tracking utilities
export {
    createProgressState,
    updateProgress,
    resetProgress,
    getProgressPercentage
} from './progressUtils.js';

// Name generation utilities
export {
    generateRandomName,
    generateMultipleNames,
    nameToId,
    generateUuid
} from './nameGenerator.js';

// Global image cache
export { globalImageCache } from './imageCache.js';

// Class name utilities
export {
    cn,
    createVariantClasses
} from './classNames.js';

// Re-export types
export type { DebouncedFunction } from './asyncUtils.js';
export type { ProgressCallback, ProgressState } from './progressUtils.js';
