/**
 * Editor Hooks
 *
 * Custom React hooks for managing editors and presets.
 *
 * @module hooks/editors
 */

export type {
  UseCodeMirrorEditorOptions,
  UseCodeMirrorEditorResult,
} from './useCodeMirrorEditor';
// CodeMirror Editor Hook
export { useCodeMirrorEditor } from './useCodeMirrorEditor';
export type {
  UseJsonEditorOptions,
  UseJsonEditorResult,
} from './useJsonEditor';
// JSON Editor Hook
export { useJsonEditor } from './useJsonEditor';
export type { CustomPreset } from './usePresets';
// Presets Hook
export { usePresets } from './usePresets';
