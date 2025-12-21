/**
 * Hooks Barrel Export
 *
 * Central export point for all custom React hooks.
 * Hooks are organized into domain-based subdirectories for scalability.
 *
 * @module hooks
 */

// ============================================================================
// Token Hooks
// ============================================================================
export {
  useTokenGenerator,
  useMissingTokenGenerator,
  type UseMissingTokenGeneratorResult,
  useTokenGrouping,
  type TokenGroup,
  type UseTokenGroupingReturn,
  useTokenPreviewCache,
  type UseTokenPreviewCacheOptions,
  type UseTokenPreviewCacheResult,
  useTokenDeletion,
  useTokenDetailEditor,
  useTokenEditorLocalState,
  type TokenEditorLocalState,
  type UseTokenEditorLocalStateOptions,
  type UseTokenEditorLocalStateResult,
} from './tokens/index.js';

// ============================================================================
// Character Hooks
// ============================================================================
export {
  useCharacterEditor,
  type UseCharacterEditorOptions,
  type UseCharacterEditorResult,
  useCharacterOperations,
  type UseCharacterOperationsOptions,
  type UseCharacterOperationsResult,
  useCharacterDownloads,
  type UseCharacterDownloadsOptions,
  type UseCharacterDownloadsResult,
  useCharacterImageResolver,
  useBackgroundImageUrl,
} from './characters/index.js';

// ============================================================================
// Auto-Save Hooks
// ============================================================================
export {
  useProjectAutoSave,
  useUnsavedChangesWarning,
  useAutoSaveDetector,
  useAutoSaveTrigger,
  useAutoSavePreference,
  useAutoSaveTelemetry,
  type AutoSaveTelemetry,
  type AutoSaveTelemetryStats,
} from './autosave/index.js';

// ============================================================================
// Cache Hooks
// ============================================================================
export {
  useCacheManager,
  useCacheStats,
  usePreRenderCache,
  useProjectCacheWarming,
} from './cache/index.js';

// ============================================================================
// Export Hooks
// ============================================================================
export {
  useExport,
  useScriptPdfDownloads,
  useExportDownloads,
  type UseScriptPdfDownloadsOptions,
  type UseExportDownloadsResult,
} from './export/index.js';

// ============================================================================
// Script Hooks
// ============================================================================
export {
  useScriptData,
  useScriptTransformations,
  type FormatIssue,
  type FormatIssuesSummary,
  type ScriptAnalysis,
  type ScriptTransformationHandlers,
  type UseScriptTransformationsOptions,
  type UseScriptTransformationsResult,
  useGroupedReminders,
  type GroupedReminder,
  type UseGroupedRemindersOptions,
  type UseGroupedRemindersResult,
} from './scripts/index.js';

// ============================================================================
// Asset Hooks
// ============================================================================
export {
  useAssetManager,
  useBuiltInAssets,
  useFileUpload,
} from './assets/index.js';

// ============================================================================
// Editor Hooks
// ============================================================================
export {
  useJsonEditor,
  type UseJsonEditorOptions,
  type UseJsonEditorResult,
  useCodeMirrorEditor,
  type UseCodeMirrorEditorOptions,
  type UseCodeMirrorEditorResult,
  usePresets,
  type CustomPreset,
} from './editors/index.js';

// ============================================================================
// UI Hooks
// ============================================================================
export {
  useSelection,
  type UseSelectionOptions,
  type UseSelectionReturn,
  useUndoStack,
  useModalBehavior,
  useContextMenu,
  useExpandablePanel,
  type PanelPosition,
  type UseExpandablePanelOptions,
  type UseExpandablePanelReturn,
  useDraggableList,
  type UseDraggableListOptions,
  type UseDraggableListResult,
  useFilters,
  useAutoResizeTextarea,
  useIntersectionObserver,
} from './ui/index.js';

// ============================================================================
// Sync Hooks
// ============================================================================
export {
  useTabSynchronization,
  useHasUnsavedWork,
  useStorageQuota,
} from './sync/index.js';

// ============================================================================
// PWA Hooks
// ============================================================================
export {
  usePWAInstall,
  type PWAInstallState,
} from './pwa/index.js';

// ============================================================================
// Studio Hooks
// ============================================================================
export {
  useStudioNavigation,
} from './studio/index.js';

// ============================================================================
// Project Hooks
// ============================================================================
export {
  useProjects,
} from './projects/index.js';
