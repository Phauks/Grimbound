/**
 * Script PDF Module
 *
 * Unified module for generating script-related PDFs including:
 * - Player Script: Two-page document with character roles and backing sheet
 * - Night Order: First night and other nights reference sheets
 *
 * @module scriptPdf
 */

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type {
  // Player Script types
  BackgroundStyle,
  BackingContentType,
  BackingSheetSettings,
  ColumnLayout,
  ContentLocation,
  DeepPartial,
  ExportProgress,
  FontConfig,
  // Render types
  HybridRenderResult,
  MarginConfig,
  NightOrderIcon,
  NightOrderSettings,
  PlayerCountEntry,
  PlayerScriptCharacter,
  PlayerScriptData,
  PlayerScriptJinx,
  PlayerScriptOptions,
  PlayerScriptSettings,
  ScriptPdfContextValue,
  ScriptPdfSettings,
  TextPosition,
  TitleStyle,
} from './types.js';

// ============================================================================
// CONSTANT EXPORTS
// ============================================================================

export {
  DEFAULT_BACKING_SHEET_SETTINGS,
  // Default settings
  DEFAULT_MARGINS,
  DEFAULT_NIGHT_ORDER_SETTINGS,
  DEFAULT_PLAYER_SCRIPT_SETTINGS,
  // Background
  DEFAULT_SCRIPT_PDF_BACKGROUND,
  DEFAULT_SCRIPT_PDF_SETTINGS,
  FALLBACK_FONTS,
  // Miscellaneous
  FOOTER_TEXT,
  NIGHT_ORDER_FONTS,
  PAGE_HEIGHT_INCHES,
  PAGE_HEIGHT_PT,
  // Page dimensions
  PAGE_WIDTH_INCHES,
  PAGE_WIDTH_PT,
  // Player count table
  PLAYER_COUNT_TABLE,
  PLAYER_SCRIPT_BACK,
  // Fonts
  PLAYER_SCRIPT_FONTS,
  // Layout constants
  PLAYER_SCRIPT_FRONT,
  POINTS_PER_INCH,
  RENDER_DPI,
  SPECIAL_CHARACTERS,
  // Colors and labels
  TEAM_COLORS,
  TEAM_LABELS,
  UI_PREVIEW_HEIGHT,
  UI_PREVIEW_WIDTH,
} from './constants.js';

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

export {
  // Custom ordering
  applyCustomOrder,
  arrangeInColumns,
  // Layout calculations
  calculateAvailableHeight,
  // Column layout
  calculateOptimalColumns,
  // Jinx extraction
  extractActiveJinxes,
  // Night order
  extractNightOrderIcons,
  generateCustomOrderFromTeams,
  // Background image CSS
  getBackgroundImageStyles,
  getCharactersWithJinxes,
  // Player count table
  getPlayerCountTable,
  getTeamCountsForPlayers,
  groupCharactersByTeam,
  isImageBackground,
  logScriptPdfDebug,
  logScriptPdfError,
  // Logging
  logScriptPdfInfo,
  // Team ordering
  SCRIPT_TEAM_ORDER,
  separateCharactersByType,
  // Character conversion
  toPlayerScriptCharacter,
  toPlayerScriptCharacters,
  // Validation
  validateScriptForPlayerScript,
  willCharactersFit,
} from './utils.js';

// ============================================================================
// COMPONENT EXPORTS
// ============================================================================

export type {
  // Backing sheet
  NightOrderIconsBarProps,
  PlayerCountTableProps,
  PlayerScriptBackProps,
  // Front page
  PlayerScriptEntryProps,
  PlayerScriptFrontProps,
  TeamSectionProps,
} from './playerScript/index.js';

export {
  // Backing sheet components
  NightOrderIconsBar,
  PlayerCountTable,
  PlayerScriptBack,
  // Front page components
  PlayerScriptEntry,
  PlayerScriptFront,
  TeamSection,
} from './playerScript/index.js';

// ============================================================================
// PDF EXPORT EXPORTS
// ============================================================================

export type {
  // Player Script PDF
  ExportPhase,
  PlayerScriptExportData,
  PlayerScriptPdfOptions,
  PlayerScriptRenderOptions,
  PlayerScriptRenderResult,
  ProgressCallback,
} from './playerScript/index.js';

export {
  // Player Script PDF functions
  downloadPlayerScriptPdf,
  generatePlayerScriptPdf,
  getPlayerScriptPdfBlob,
  renderPlayerScriptForHybrid,
} from './playerScript/index.js';

// ============================================================================
// SHARED UTILITIES EXPORTS
// ============================================================================

export type {
  // Text extraction types
  ExtractedText,
  // Font types
  FontCache,
  TextExtractionResult,
} from './shared/index.js';

export {
  // PDF image utilities
  canvasToJpegBytes,
  captureWithSnapdom,
  createOffscreenContainer,
  drawBulletCircle,
  drawTextOnPage,
  drawTextWithoutLigatures,
  // Text extraction
  extractTextFromContainer,
  FONT_PATHS,
  getAscender,
  getFontForText,
  hasLigatureSequences,
  hideTextWithClipPath,
  // Hybrid renderer utilities
  IMAGE_LOAD_TIMEOUT,
  imageToDataUrl,
  // PDF constants
  JPEG_QUALITY,
  loadAllFonts,
  // PDF font loading
  loadFont,
  // PDF text rendering
  parseColor,
  preResolveImageUrls,
  removeContainer,
  resolveBackgroundImage,
  resolveScriptLogo,
  SCRIPT_FONT_FAMILIES,
  scaleTextPositions,
  waitForFonts,
  waitForImages,
} from './shared/index.js';
