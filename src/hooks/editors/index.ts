/**
 * Editor Hooks
 *
 * Custom React hooks for managing editors and presets.
 *
 * @module hooks/editors
 */

// JSON Editor Hook
export { useJsonEditor } from './useJsonEditor';
export type {
  UseJsonEditorOptions,
  UseJsonEditorResult,
} from './useJsonEditor';

// CodeMirror Editor Hook
export { useCodeMirrorEditor } from './useCodeMirrorEditor';
export type {
  UseCodeMirrorEditorOptions,
  UseCodeMirrorEditorResult,
} from './useCodeMirrorEditor';

// Presets Hook
export { usePresets } from './usePresets';
export type { CustomPreset } from './usePresets';
