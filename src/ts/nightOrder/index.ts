/**
 * Night Order Module
 *
 * Exports all night order related types, utilities, and constants.
 */

// Types
export type {
    NightOrderEntry,
    NightOrderEntryType,
    NightType,
    NightOrderSource,
    NightOrderState,
    NightOrderContextState,
    NightOrderContextActions,
    NightOrderContextValue,
    ScriptMetaWithNightOrder,
    SpecialEntryId,
} from './nightOrderTypes.js';

export { SPECIAL_ENTRY_IDS, isSpecialEntryId } from './nightOrderTypes.js';

// Special entries
export {
    DUSK_ENTRY,
    DAWN_ENTRY,
    MINION_INFO_ENTRY,
    DEMON_INFO_ENTRY,
    SPECIAL_ENTRIES,
    getSpecialEntry,
    isSpecialEntry,
    getSpecialEntriesForNight,
    getStartEntries,
    getEndEntries,
    getInfoEntries,
} from './specialEntries.js';

// Utilities
export type {
    NightOrderResult,
    AbilityTextSegment,
    NightOrderStats,
} from './nightOrderUtils.js';

export {
    characterToNightOrderEntry,
    buildNightOrder,
    moveNightOrderEntry,
    parseAbilityText,
    getTeamColor,
    shouldShowEntry,
    getNightOrderStats,
} from './nightOrderUtils.js';

// Layout & Scaling
export type { ScaleConfig } from './nightOrderLayout.js';

export {
    PAGE_HEIGHT,
    PAGE_WIDTH,
    MARGIN,
    MARGIN_SIDE,
    HEADER_HEIGHT,
    FOOTER_HEIGHT,
    AVAILABLE_HEIGHT,
    BASELINE_ENTRY_HEIGHT,
    BASELINE_ICON_SIZE,
    BASELINE_NAME_FONT_SIZE,
    BASELINE_ABILITY_FONT_SIZE,
    BASELINE_ENTRY_SPACING,
    BASELINE_HEADER_FONT,
    MIN_SCALE_FACTOR,
    MAX_SCALE_FACTOR,
    estimateEntryHeight,
    calculateScaleConfig,
    pointsToInches,
    inchesToPoints,
    formatScalePercentage,
    getScaleWarning,
} from './nightOrderLayout.js';

// PDF Export using pdf-lib (fast, native OTF support)
export type {
    ExportPhase,
    ProgressCallback,
    NightOrderPdfOptions,
} from './nightOrderPdfLib.js';

export {
    generateNightOrderPdf,
    downloadNightOrderPdf,
    getNightOrderPdfBlob,
} from './nightOrderPdfLib.js';

// Font loading utilities
export type { FontSet } from './fontLoader.js';

export {
    loadFonts,
    preloadFonts,
    clearFontCache,
    getCachedFontCount,
} from './fontLoader.js';
