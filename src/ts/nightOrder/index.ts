/**
 * Night Order Module
 *
 * Exports all night order related types, utilities, and constants.
 */

// PDF Export using Hybrid mode (Snapdom + pdf-lib text overlay) - Faster
export {
  downloadNightOrderPdfHybrid,
  generateNightOrderPdfHybrid,
  getNightOrderPdfBlobHybrid,
} from './hybridPdfExporter.js';
// Layout & Scaling
export type { PaginatedEntries, ScaleConfig } from './nightOrderLayout.js';
export {
  AVAILABLE_HEIGHT,
  BASELINE_ABILITY_FONT_SIZE,
  BASELINE_ENTRY_HEIGHT,
  BASELINE_ENTRY_SPACING,
  BASELINE_HEADER_FONT,
  BASELINE_ICON_SIZE,
  BASELINE_NAME_FONT_SIZE,
  calculateEntriesPerPage,
  calculateScaleConfig,
  estimateEntryHeight,
  FOOTER_HEIGHT,
  formatScalePercentage,
  getFullScaleConfig,
  getScaleWarning,
  HEADER_HEIGHT,
  inchesToPoints,
  MARGIN,
  MARGIN_SIDE,
  MAX_SCALE_FACTOR,
  MIN_SCALE_FACTOR,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  paginateEntries,
  pointsToInches,
} from './nightOrderLayout.js';
// PDF Export using Snapdom (true WYSIWYG) - Legacy mode
export type {
  ExportPhase,
  NightOrderPdfOptions,
  ProgressCallback,
} from './nightOrderPdfExporter.js';
export {
  downloadNightOrderPdf,
  generateNightOrderPdf,
  getNightOrderPdfBlob,
} from './nightOrderPdfExporter.js';
// Sync utilities
export {
  buildInitialNightOrderArray,
  buildMetaNightOrderArrays,
  syncNightOrderToJson,
  updateCharacterNightNumbers,
} from './nightOrderSync.js';
// Types
export type {
  NightOrderContextActions,
  NightOrderContextState,
  NightOrderContextValue,
  NightOrderEntry,
  NightOrderEntryType,
  NightOrderSource,
  NightOrderState,
  NightType,
  ScriptMetaWithNightOrder,
  SpecialEntryId,
} from './nightOrderTypes.js';
export { isSpecialEntryId, SPECIAL_ENTRY_IDS } from './nightOrderTypes.js';
// Utilities
export type {
  AbilityTextSegment,
  NightOrderResult,
  NightOrderStats,
} from './nightOrderUtils.js';
export {
  buildNightOrder,
  characterToNightOrderEntry,
  clearNightOrderCache,
  getCachedNightOrder,
  getNightOrderStats,
  getTeamColor,
  moveNightOrderEntry,
  parseAbilityText,
  preRenderNightOrder,
  shouldShowEntry,
} from './nightOrderUtils.js';
// Night Sheet Renderer (for direct canvas capture)
export {
  areFontsWarmed,
  getFontWarmingStatus,
  preloadSnapdom,
  type RenderOptions,
  type RenderResult,
  renderNightSheetToCanvas,
  warmDefaultNightSheetFonts,
  warmFonts,
} from './nightSheetRenderer.js';
// Special entries
export {
  DAWN_ENTRY,
  DEMON_INFO_ENTRY,
  DUSK_ENTRY,
  getEndEntries,
  getInfoEntries,
  getSpecialEntriesForNight,
  getSpecialEntry,
  getStartEntries,
  isSpecialEntry,
  MINION_INFO_ENTRY,
  SPECIAL_ENTRIES,
} from './specialEntries.js';
// Text extraction for hybrid mode
export type { ExtractedText, TextExtractionResult } from './textExtractor.js';
export { extractTextFromContainer, scaleTextPositions } from './textExtractor.js';
