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
    // Canvas utilities
    createCanvas,
    createCircularClipPath,
    applyTextShadow,
    applyAbilityTextShadow,
    clearShadow,
    wrapText,
    drawImageCover,
    fillCircle,
    strokeCircle,
    drawCenteredText,
    drawMultiLineText,
    measureCharacterWidths,
    type Point,
    type CanvasContext,
    type CanvasOptions,
    // Text drawing
    drawCurvedText,
    drawCenteredWrappedText,
    drawTwoLineCenteredText,
    drawAbilityText,
    drawQROverlayText,
    applyConfigurableShadow,
    type CurvedTextOptions,
    type CenteredTextOptions,
    // Leaf drawing
    drawLeaves,
    type LeafDrawingOptions,
    // QR generation
    generateStyledQRCode,
    QR_DEFAULTS,
    type StyledQRCodeOptions,
} from './canvas/index.js';

// ============================================================================
// Data Module
// ============================================================================
export {
    // Data loading
    loadExampleScript,
    loadJsonFile,
    // Script parsing
    parseScriptData,
    validateAndParseScript,
    extractScriptMeta,
    isScriptMeta,
    isCharacter,
    isIdReference,
    type ScriptValidationResult,
    // Character utilities
    validateCharacter,
    getCharacterImageUrl,
    countReminders,
    getGlobalReminders,
    groupByTeam,
    calculateTokenCounts,
} from './data/index.js';

// ============================================================================
// Export Module
// ============================================================================
export {
    PDFGenerator,
    createTokensZip,
    downloadTokenPNG,
    embedPngMetadata,
    createCharacterMetadata,
    createReminderMetadata,
    createMetaTokenMetadata,
    buildTokenMetadata,
    type PngMetadata,
} from './export/index.js';

// ============================================================================
// Generation Module
// ============================================================================
export {
    TokenGenerator,
    generateAllTokens,
    PRESETS,
    getPreset,
    getPresetNames,
} from './generation/index.js';

// ============================================================================
// UI Module
// ============================================================================
export {
    // Detail view utilities
    regenerateSingleToken,
    regenerateCharacterAndReminders,
    updateCharacterInJson,
    downloadCharacterTokensAsZip,
    downloadCharacterTokenOnly,
    downloadReminderTokensOnly,
    getCharacterChanges,
    // JSON highlighting
    tokenizeJSON,
    TOKEN_CLASS_MAP,
    type HighlightToken,
} from './ui/index.js';

// ============================================================================
// Utilities
// ============================================================================
export {
    // String utilities
    generateUniqueFilename,
    sanitizeFilename,
    capitalize,
    // Image utilities
    loadImage,
    loadLocalImage,
    canvasToBlob,
    downloadFile,
    checkFontsLoaded,
    // JSON utilities
    formatJson,
    validateJson,
    deepClone,
    // Color utilities
    hexToRgb,
    getContrastColor,
    // Async utilities
    shuffleArray,
    debounce,
    sleep,
    // Progress utilities
    createProgressState,
    updateProgress,
    type ProgressState,
} from './utils/index.js';

// ============================================================================
// Configuration
// ============================================================================
export { default as CONFIG } from './config.js';
export * from './constants.js';

// ============================================================================
// Types (re-exported for convenience)
// ============================================================================
export type {
    Character,
    Team,
    Token,
    ScriptEntry,
    ScriptMeta,
    GenerationOptions,
    ProgressCallback,
    TokenCounts,
    TeamCounts,
    CharacterValidationResult,
    PresetConfig,
    PresetName,
} from './types/index.js';
