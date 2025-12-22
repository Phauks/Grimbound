/**
 * Hooks Barrel Export
 *
 * Central export point for all custom React hooks.
 * Hooks are organized into domain-based subdirectories for scalability.
 *
 * @module hooks
 */

// ============================================================================
// Asset Hooks
// ============================================================================
export {
  type AssetPreviewState,
  type AssetSource,
  type UseAssetPreviewOptions,
  useAssetManager,
  useAssetPreview,
  useBuiltInAssets,
  useFileUpload,
} from './assets/index.js';
// ============================================================================
// Auto-Save Hooks
// ============================================================================
export {
  type AutoSaveTelemetry,
  type AutoSaveTelemetryStats,
  useAutoSaveDetector,
  useAutoSavePreference,
  useAutoSaveTelemetry,
  useAutoSaveTrigger,
  useProjectAutoSave,
  useUnsavedChangesWarning,
} from './autosave/index.js';
// ============================================================================
// Cache Hooks
// ============================================================================
export { useCacheManager, useCacheStats, usePreRenderCache } from './cache/index.js';
// ============================================================================
// Character Hooks
// ============================================================================
export {
  type UseCharacterDownloadsOptions,
  type UseCharacterDownloadsResult,
  type UseCharacterEditorOptions,
  type UseCharacterEditorResult,
  type UseCharacterOperationsOptions,
  type UseCharacterOperationsResult,
  useBackgroundImageUrl,
  useCharacterDownloads,
  useCharacterEditor,
  useCharacterImageResolver,
  useCharacterOperations,
} from './characters/index.js';
// ============================================================================
// Editor Hooks
// ============================================================================
export {
  type CustomPreset,
  type UseCodeMirrorEditorOptions,
  type UseCodeMirrorEditorResult,
  type UseJsonEditorOptions,
  type UseJsonEditorResult,
  useCodeMirrorEditor,
  useJsonEditor,
  usePresets,
} from './editors/index.js';
// ============================================================================
// Export Hooks
// ============================================================================
export {
  type UseExportDownloadsResult,
  type UseScriptPdfDownloadsOptions,
  useExport,
  useExportDownloads,
  useScriptPdfDownloads,
} from './export/index.js';
// ============================================================================
// Project Hooks
// ============================================================================
export { useProjects } from './projects/index.js';
// ============================================================================
// PWA Hooks
// ============================================================================
export {
  type PWAInstallState,
  usePWAInstall,
} from './pwa/index.js';
// ============================================================================
// Script Hooks
// ============================================================================
export {
  type FormatIssue,
  type FormatIssuesSummary,
  type GroupedReminder,
  type ScriptAnalysis,
  type ScriptTransformationHandlers,
  type UseGroupedRemindersOptions,
  type UseGroupedRemindersResult,
  type UseScriptTransformationsOptions,
  type UseScriptTransformationsResult,
  useGroupedReminders,
  useScriptData,
  useScriptTransformations,
} from './scripts/index.js';
// ============================================================================
// Studio Hooks
// ============================================================================
export { useStudioNavigation } from './studio/index.js';
// ============================================================================
// Sync Hooks
// ============================================================================
export {
  useHasUnsavedWork,
  useStorageQuota,
  useTabSynchronization,
} from './sync/index.js';
// ============================================================================
// Token Hooks
// ============================================================================
export {
  type TokenGroup,
  type UseMissingTokenGeneratorResult,
  type UseTokenGroupingReturn,
  type UseTokenPreviewCacheOptions,
  type UseTokenPreviewCacheResult,
  useMissingTokenGenerator,
  useTokenDeletion,
  useTokenDetailEditor,
  useTokenGenerator,
  useTokenGrouping,
  useTokenPreviewCache,
} from './tokens/index.js';
// ============================================================================
// UI Hooks
// ============================================================================
export {
  type PanelPosition,
  type UseDraggableListOptions,
  type UseDraggableListResult,
  type UseDrawerStateOptions,
  type UseDrawerStateReturn,
  type UseExpandablePanelOptions,
  type UseExpandablePanelReturn,
  type UseSelectionOptions,
  type UseSelectionReturn,
  useAutoResizeTextarea,
  useContextMenu,
  useDraggableList,
  useDrawerState,
  useExpandablePanel,
  useFilters,
  useIntersectionObserver,
  useModalBehavior,
  useSelection,
  useUndoStack,
} from './ui/index.js';
