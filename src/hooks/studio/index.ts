/**
 * Studio Hooks
 *
 * Hooks for Studio/editor navigation and functionality.
 *
 * @module hooks/studio
 */

export type {
  LoadedAssetInfo,
  UseAssetCanvasOperationsOptions,
  UseAssetCanvasOperationsResult,
} from './useAssetCanvasOperations.js';
export { useAssetCanvasOperations } from './useAssetCanvasOperations.js';
// Asset Editor - Orchestrator
export type { EffectState, UseAssetEditorResult } from './useAssetEditor.js';
export { useAssetEditor } from './useAssetEditor.js';
// Asset Editor - Sub-hooks (for direct use or testing)
export type {
  UseAssetEffectStateOptions,
  UseAssetEffectStateResult,
} from './useAssetEffectState.js';
export { DEFAULT_EFFECTS, useAssetEffectState } from './useAssetEffectState.js';

export type { UseAssetUIStateResult } from './useAssetUIState.js';
export { useAssetUIState } from './useAssetUIState.js';

// Legacy - will be removed after Studio simplification
export { useStudioNavigation } from './useStudioNavigation.js';
