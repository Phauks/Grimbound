/**
 * Studio Hooks
 *
 * Hooks for Studio/editor navigation and functionality.
 *
 * @module hooks/studio
 */

export { useAssetEditor } from './useAssetEditor.js';
export type { AssetEditorState, UseAssetEditorResult } from './useAssetEditor.js';

// Legacy - will be removed after Studio simplification
export { useStudioNavigation } from './useStudioNavigation.js';
