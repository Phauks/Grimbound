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
// Presets Hook - re-exports types from the hook
export type { Preset, PresetTier, PresetWithTier } from './usePresets';
export { usePresets } from './usePresets';
