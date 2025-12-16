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
 * - compressionUtils: gzip compression/decompression for storage optimization
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
    getCleanJsonForExport,
    condenseScript,
    hasCondensableReferences
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

// Script sorting utilities
export {
    sortScriptBySAO,
    sortScriptJsonBySAO,
    isScriptSortedBySAO,
    isScriptJsonSortedBySAO,
    getScriptSortStats,
    SAO_TEAM_ORDER,
    SAO_ABILITY_PREFIXES
} from './scriptSorting.js';

// Compression utilities
export {
    isCompressionSupported,
    compressString,
    decompressBlob,
    compressJSON,
    decompressJSON,
    getCompressionRatio,
    getCompressionStats
} from './compressionUtils.js';

// Logger utilities
export {
    logger,
    Logger,
    ContextLogger,
    LogLevel,
    enableDebugLogging,
    enableTimestamps
} from './logger.js';

// Error handling utilities
export {
    handleHookError,
    clearHookError,
    handleAsyncOperation,
    retryOperation,
    guardAgainstUndefined,
    validateRequiredFields
} from './errorUtils.js';

// Text format analyzer utilities
export {
    analyzeReminderText,
    normalizeReminderText,
    hasFormatIssues,
    getIssueSummary,
    FORMAT_PATTERNS
} from './textFormatAnalyzer.js';

// Ability text parser utilities (for bold [] rendering on tokens)
export {
    parseAbilityText,
    hasSetupBrackets,
    getLineSegments
} from './abilityTextParser.js';

// Character image resolution utilities (SSOT for all character icon resolution)
export {
    resolveCharacterImageUrl,
    resolveCharacterImages,
    isExternalUrl,
    extractCharacterIdFromPath,
    getFirstImageUrl
} from './characterImageResolver.js';

// Measurement utilities (SSOT for all unit conversions)
export {
    MM_PER_INCH,
    STEP_SIZES,
    DECIMAL_PLACES,
    inchesToMm,
    mmToInches,
    inchesToPixels,
    pixelsToInches,
    toCanonicalInches,
    fromCanonicalInches,
    getUnitSuffix,
    formatMeasurement,
    roundToStep,
    convertConfigToDisplayUnit,
    ICON_OFFSET_CONFIG,
    PDF_OFFSET_CONFIG,
    BLEED_CONFIG
} from './measurementUtils.js';

// Re-export types
export type { DebouncedFunction } from './asyncUtils.js';
export type { ProgressCallback, ProgressState } from './progressUtils.js';
export type { SortOrder, ScriptSortOptions } from './scriptSorting.js';
export type { LoggerConfig } from './logger.js';
export type {
    ErrorHandlingOptions,
    AsyncOperationOptions,
    RetryOptions
} from './errorUtils.js';
export type {
    FormatPattern,
    FormatIssue
} from './textFormatAnalyzer.js';
export type { TextSegment } from './abilityTextParser.js';
export type {
    ResolveOptions,
    ResolvedImage,
    BatchResolveResult
} from './characterImageResolver.js';
