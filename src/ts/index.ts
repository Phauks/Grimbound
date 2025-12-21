/**
 * Blood on the Clocktower Token Generator
 * Root Barrel Export - Main entry point for all TypeScript modules
 *
 * This module provides a convenient single import point for all public APIs.
 * For more granular imports, use the individual module paths.
 *
 * Module Organization:
 * - canvas/   : Canvas drawing utilities (text, shapes, images)
 * - data/     : Data loading and script parsing
 * - export/   : PDF, PNG, and ZIP export functionality
 * - generation/ : Token generation and presets
 * - types/    : TypeScript type definitions
 * - ui/       : UI utility functions
 * - utils/    : General utility functions
 */

// ============================================================================
// Canvas Module
// ============================================================================
export {
  applyAbilityTextShadow,
  applyConfigurableShadow,
  applyTextShadow,
  type CanvasContext,
  type CanvasOptions,
  type CenteredTextOptions,
  type CurvedTextOptions,
  clearShadow,
  // Canvas utilities
  createCanvas,
  createCircularClipPath,
  drawAbilityText,
  drawCenteredText,
  drawCenteredWrappedText,
  // Text drawing
  drawCurvedText,
  drawImageCover,
  // Accent drawing
  drawAccents,
  drawMultiLineText,
  drawQROverlayText,
  drawTwoLineCenteredText,
  fillCircle,
  // QR generation
  generateStyledQRCode,
  type AccentDrawingOptions,
  measureCharacterWidths,
  type Point,
  QR_DEFAULTS,
  type StyledQRCodeOptions,
  strokeCircle,
  wrapText,
} from './canvas/index.js';
// ============================================================================
// Configuration
// ============================================================================
export { default as CONFIG } from './config.js';
export * from './constants.js';
// ============================================================================
// Data Module
// ============================================================================
export {
  calculateTokenCounts,
  countReminders,
  extractScriptMeta,
  getCharacterImageUrl,
  getGlobalReminders,
  groupByTeam,
  isCharacter,
  isIdReference,
  isScriptMeta,
  // Data loading
  loadExampleScript,
  loadJsonFile,
  // Script parsing
  parseScriptData,
  type ScriptValidationResult,
  validateAndParseScript,
  // Character utilities
  validateCharacter,
} from './data/index.js';
// ============================================================================
// Export Module
// ============================================================================
export {
  buildTokenMetadata,
  createCharacterMetadata,
  createMetaTokenMetadata,
  createReminderMetadata,
  createTokensZip,
  downloadTokenPNG,
  embedPngMetadata,
  PDFGenerator,
  type PngMetadata,
} from './export/index.js';
// ============================================================================
// Generation Module
// ============================================================================
export {
  generateAllTokens,
  getPreset,
  getPresetNames,
  PRESETS,
  TokenGenerator,
} from './generation/index.js';
// ============================================================================
// Types (re-exported for convenience)
// ============================================================================
export type {
  Character,
  CharacterValidationResult,
  GenerationOptions,
  PresetConfig,
  PresetName,
  ProgressCallback,
  ScriptEntry,
  ScriptMeta,
  Team,
  TeamCounts,
  Token,
  TokenCounts,
} from './types/index.js';
// ============================================================================
// UI Module
// ============================================================================
export {
  // Detail view utilities
  downloadCharacterTokenOnly,
  downloadCharacterTokensAsZip,
  downloadReminderTokensOnly,
  getCharacterChanges,
  regenerateCharacterAndReminders,
  regenerateSingleToken,
  updateCharacterInJson,
  // CodeMirror theme utilities
  createCodeMirrorTheme,
  createBaseTheme,
  createSyntaxHighlighting,
} from './ui/index.js';
// ============================================================================
// Utilities
// ============================================================================
export {
  canvasToBlob,
  capitalize,
  checkFontsLoaded,
  // Progress utilities
  createProgressState,
  debounce,
  deepClone,
  downloadFile,
  // JSON utilities
  formatJson,
  // String utilities
  generateUniqueFilename,
  getContrastColor,
  // Color utilities
  hexToRgb,
  // Image utilities
  loadImage,
  loadLocalImage,
  type ProgressState,
  sanitizeFilename,
  // Async utilities
  shuffleArray,
  updateProgress,
  validateJson,
} from './utils/index.js';
