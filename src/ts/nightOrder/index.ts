/**
 * Night Order Module
 *
 * Exports all night order related types, utilities, and constants.
 */

// Text extraction for PDF generation (re-exported from scriptPdf/shared)
export type { ExtractedText, TextExtractionResult } from '@/ts/scriptPdf/shared/index.js';
export { extractTextFromContainer, scaleTextPositions } from '@/ts/scriptPdf/shared/index.js';
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
// PDF Export
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
// Night Sheet Renderer
export type { HybridRenderOptions, HybridRenderResult } from './nightSheetRenderer.js';
export { renderNightSheet } from './nightSheetRenderer.js';
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
