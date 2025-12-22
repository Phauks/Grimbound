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
 * - asyncUtils: debounce, array shuffling
 * - compressionUtils: gzip compression/decompression for storage optimization
 */

export type { TextSegment } from './abilityTextParser.js';
// Ability text parser utilities (for bold [] rendering on tokens)
export {
  getLineSegments,
  hasSetupBrackets,
  parseAbilityText,
} from './abilityTextParser.js';
// Re-export types
export type { DebouncedFunction } from './asyncUtils.js';
// Async/timing utilities
export {
  debounce,
  shuffleArray,
} from './asyncUtils.js';
// Character filtering utilities (for enable/disable feature)
export {
  countDisabledCharacters,
  filterEnabledCharacters,
  getCharacterSelectionSummary,
  getEnabledCharacterUuids,
  isCharacterEnabled,
} from './characterFiltering.js';
export type {
  BatchResolveResult,
  ResolvedImage,
  ResolveOptions,
} from './characterImageResolver.js';
// Character image resolution utilities (SSOT for all character icon resolution)
export {
  clearIconUrlCache,
  extractCharacterIdFromPath,
  getCachedIconUrl,
  getFirstImageUrl,
  getIconUrlCacheStats,
  hasIconUrlCached,
  isExternalUrl,
  isLocalAssetPath,
  prewarmIconCache,
  resolveCharacterImages,
  resolveCharacterImageUrl,
  resolveLocalAssetPath,
  setCachedIconUrl,
} from './characterImageResolver.js';
// Class name utilities
export {
  cn,
  createVariantClasses,
} from './classNames.js';
// Color utilities
export {
  getContrastColor,
  hexToRgb,
  hslToRgb,
  interpolateColors,
  parseHexColor,
  rgbToHsl,
} from './colorUtils.js';
// Compression utilities
export {
  compressJSON,
  compressString,
  decompressBlob,
  decompressJSON,
  getCompressionRatio,
  getCompressionStats,
  isCompressionSupported,
} from './compressionUtils.js';
export type {
  AsyncOperationOptions,
  ErrorHandlingOptions,
  RetryOptions,
} from './errorUtils.js';
// Error handling utilities
export {
  clearHookError,
  guardAgainstUndefined,
  handleAsyncOperation,
  handleHookError,
  retryOperation,
  validateRequiredFields,
} from './errorUtils.js';
// Global image cache
export { globalImageCache } from './imageCache.js';
// Image utilities
export {
  applyCorsProxy,
  canvasToBlob,
  checkFontsLoaded,
  downloadFile,
  loadImage,
  loadLocalImage,
} from './imageUtils.js';
// JSON utilities
export {
  condenseScript,
  deepClone,
  formatJson,
  getCleanJsonForExport,
  hasCondensableReferences,
  stripInternalFields,
  validateJson,
} from './jsonUtils.js';
export type { LoggerConfig } from './logger.js';
// Logger utilities
export {
  ContextLogger,
  enableDebugLogging,
  enableTimestamps,
  Logger,
  LogLevel,
  logger,
} from './logger.js';
// Measurement utilities (SSOT for all unit conversions)
export {
  BLEED_CONFIG,
  convertConfigToDisplayUnit,
  DECIMAL_PLACES,
  formatMeasurement,
  fromCanonicalInches,
  getUnitSuffix,
  ICON_OFFSET_CONFIG,
  inchesToMm,
  inchesToPixels,
  MM_PER_INCH,
  mmToInches,
  PDF_OFFSET_CONFIG,
  pixelsToInches,
  roundToStep,
  STEP_SIZES,
  toCanonicalInches,
} from './measurementUtils.js';
// Name generation utilities
export {
  generateMultipleNames,
  generateRandomName,
  generateUuid,
  nameToId,
} from './nameGenerator.js';
export type { ProgressCallback, ProgressState } from './progressUtils.js';
// Progress tracking utilities
export {
  createProgressState,
  getProgressPercentage,
  resetProgress,
  updateProgress,
} from './progressUtils.js';
// Script encoder utilities (for official BOTC Script Tool integration)
export {
  decodeScriptFromUrl,
  encodeScriptForUrl,
  getOfficialScriptToolUrl,
  openInOfficialScriptTool,
} from './scriptEncoder.js';
export type { ScriptSortOptions, SortOrder } from './scriptSorting.js';
// Script sorting utilities
export {
  getScriptSortStats,
  isScriptJsonSortedBySAO,
  isScriptSortedBySAO,
  SAO_ABILITY_PREFIXES,
  SAO_TEAM_ORDER,
  sortScriptBySAO,
  sortScriptJsonBySAO,
} from './scriptSorting.js';
// Storage utilities
export {
  getStorageItem,
  removeStorageItem,
  STORAGE_KEYS,
  type StorageKey,
  setStorageItem,
} from './storageKeys.js';
// String utilities
export {
  capitalize,
  generateUniqueFilename,
  sanitizeFilename,
} from './stringUtils.js';
export type {
  ArrayDiffResult,
  DiffSegment,
  TextDiffResult,
} from './textDiff.js';
// Text diff utilities (for version comparison)
export {
  diffArrays,
  diffText,
  formatValueForDisplay,
  valuesAreDifferent,
} from './textDiff.js';
export type {
  FormatIssue,
  FormatPattern,
} from './textFormatAnalyzer.js';
// Text format analyzer utilities
export {
  analyzeReminderText,
  FORMAT_PATTERNS,
  getIssueSummary,
  hasFormatIssues,
  normalizeReminderText,
} from './textFormatAnalyzer.js';
