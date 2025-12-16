/**
 * Hooks Barrel Export
 *
 * Central export point for all custom React hooks.
 * Organized by category for easy discovery.
 */

// ============================================================================
// Project Management Hooks
// ============================================================================
export { useProjects } from './useProjects.js';
export { useProjectAutoSave } from './useProjectAutoSave.js';
export { useProjectCacheWarming } from './useProjectCacheWarming.js';
export { useHasUnsavedWork } from './useHasUnsavedWork.js';

// ============================================================================
// Token Management Hooks
// ============================================================================
export { useTokenGenerator } from './useTokenGenerator.js';
export { useTokenDetailEditor } from './useTokenDetailEditor.js';
export { useTokenDeletion } from './useTokenDeletion.js';
export { useTokenGrouping } from './useTokenGrouping.js';
export { useCharacterImageResolver } from './useCharacterImageResolver.js';

// ============================================================================
// Script & Data Hooks
// ============================================================================
export { useScriptData } from './useScriptData.js';
export { useFilters } from './useFilters.js';
export { usePresets } from './usePresets.js';

// ============================================================================
// Export & File Management Hooks
// ============================================================================
export { useExport } from './useExport.js';
export { useFileUpload } from './useFileUpload.js';
export { useAssetManager } from './useAssetManager.js';
export { useBuiltInAssets } from './useBuiltInAssets.js';

// ============================================================================
// Studio & Navigation Hooks
// ============================================================================
export { useStudioNavigation } from './useStudioNavigation.js';
export { useTabSynchronization } from './useTabSynchronization.js';

// ============================================================================
// Cache Management Hooks
// ============================================================================
export { usePreRenderCache } from './usePreRenderCache.js';
export { useCacheManager } from './useCacheManager.js';
export { useCacheStats } from './useCacheStats.js';

// ============================================================================
// UI & Interaction Hooks
// ============================================================================
export { useContextMenu } from './useContextMenu.js';
export { useModalBehavior } from './useModalBehavior.js';
export { useUndoStack } from './useUndoStack.js';
export { useIntersectionObserver } from './useIntersectionObserver.js';
export { useAutoResizeTextarea } from './useAutoResizeTextarea.js';
export { useExpandablePanel, type UseExpandablePanelOptions, type UseExpandablePanelReturn, type PanelPosition } from './useExpandablePanel.js';
export { useSelection, type UseSelectionOptions, type UseSelectionReturn } from './useSelection.js';

// ============================================================================
// Auto-Save Hooks
// ============================================================================
export { useAutoSaveDetector } from './useAutoSaveDetector.js';
export { useAutoSavePreference } from './useAutoSavePreference.js';
export { useAutoSaveTrigger } from './useAutoSaveTrigger.js';
export { useAutoSaveTelemetry, type AutoSaveTelemetry, type AutoSaveTelemetryStats } from './useAutoSaveTelemetry.js';

// ============================================================================
// Utility Hooks
// ============================================================================
export { useStorageQuota } from './useStorageQuota.js';

// ============================================================================
// PWA Hooks
// ============================================================================
export { usePWAInstall, type PWAInstallState } from './usePWAInstall.js';
