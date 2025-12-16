/**
 * Hooks Barrel Export
 *
 * Central export point for all custom React hooks.
 * Organized by category for easy discovery.
 */

export { useAssetManager } from './useAssetManager.js';
export { useAutoResizeTextarea } from './useAutoResizeTextarea.js';
// ============================================================================
// Auto-Save Hooks
// ============================================================================
export { useAutoSaveDetector } from './useAutoSaveDetector.js';
export { useAutoSavePreference } from './useAutoSavePreference.js';
export {
  type AutoSaveTelemetry,
  type AutoSaveTelemetryStats,
  useAutoSaveTelemetry,
} from './useAutoSaveTelemetry.js';
export { useAutoSaveTrigger } from './useAutoSaveTrigger.js';
export { useBuiltInAssets } from './useBuiltInAssets.js';
export { useCacheManager } from './useCacheManager.js';
export { useCacheStats } from './useCacheStats.js';
export { useCharacterImageResolver } from './useCharacterImageResolver.js';
// ============================================================================
// UI & Interaction Hooks
// ============================================================================
export { useContextMenu } from './useContextMenu.js';
export {
  type PanelPosition,
  type UseExpandablePanelOptions,
  type UseExpandablePanelReturn,
  useExpandablePanel,
} from './useExpandablePanel.js';

// ============================================================================
// Export & File Management Hooks
// ============================================================================
export { useExport } from './useExport.js';
export { useFileUpload } from './useFileUpload.js';
export { useFilters } from './useFilters.js';
export { useHasUnsavedWork } from './useHasUnsavedWork.js';
export { useIntersectionObserver } from './useIntersectionObserver.js';
export { useModalBehavior } from './useModalBehavior.js';

// ============================================================================
// Cache Management Hooks
// ============================================================================
export { usePreRenderCache } from './usePreRenderCache.js';
export { usePresets } from './usePresets.js';
export { useProjectAutoSave } from './useProjectAutoSave.js';
export { useProjectCacheWarming } from './useProjectCacheWarming.js';
// ============================================================================
// Project Management Hooks
// ============================================================================
export { useProjects } from './useProjects.js';
// ============================================================================
// PWA Hooks
// ============================================================================
export { type PWAInstallState, usePWAInstall } from './usePWAInstall.js';
// ============================================================================
// Script & Data Hooks
// ============================================================================
export { useScriptData } from './useScriptData.js';
export { type UseSelectionOptions, type UseSelectionReturn, useSelection } from './useSelection.js';
// ============================================================================
// Utility Hooks
// ============================================================================
export { useStorageQuota } from './useStorageQuota.js';
// ============================================================================
// Studio & Navigation Hooks
// ============================================================================
export { useStudioNavigation } from './useStudioNavigation.js';
export { useTabSynchronization } from './useTabSynchronization.js';
export { useTokenDeletion } from './useTokenDeletion.js';
export { useTokenDetailEditor } from './useTokenDetailEditor.js';
// ============================================================================
// Token Management Hooks
// ============================================================================
export { useTokenGenerator } from './useTokenGenerator.js';
export { useTokenGrouping } from './useTokenGrouping.js';
export { useUndoStack } from './useUndoStack.js';
