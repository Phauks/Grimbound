/**
 * JsonEditorPanel Component
 *
 * Reusable JSON editor with syntax highlighting and debounced parsing.
 * Powered by CodeMirror 6 for better theming and editor features.
 *
 * This is a controlled component - the parent manages the value state.
 */

import { CodeMirrorEditor, type EditorControls } from './CodeMirrorEditor';

export interface JsonEditorPanelProps {
  /** The JSON string value */
  value: string;
  /** Called when the value changes with the new string value */
  onChange: (value: string) => void;
  /** Called when valid JSON is detected (debounced) */
  onValidJson?: (parsed: unknown) => void;
  /** Placeholder text shown when editor is empty */
  placeholder?: string;
  /** Debounce delay for JSON validation in ms */
  debounceMs?: number;
  /** Minimum height of the editor */
  minHeight?: string;
  /** Additional CSS class for the container */
  className?: string;
  /** Whether the editor is disabled/read-only */
  disabled?: boolean;
  /** Whether to show inline error display (not used with CodeMirror - lint markers shown instead) */
  showError?: boolean;
  /** Expose undo/redo functions to parent */
  onEditorReady?: (controls: EditorControls) => void;
}

/**
 * JSON editor with syntax highlighting and validation.
 *
 * Features:
 * - JSON syntax highlighting with theme integration
 * - Real-time JSON linting with error markers
 * - Built-in undo/redo (Ctrl+Z / Ctrl+Y)
 * - Controlled component pattern
 */
export function JsonEditorPanel({
  value,
  onChange,
  onValidJson,
  placeholder = 'Enter JSON...',
  debounceMs = 300,
  minHeight = '200px',
  className,
  disabled = false,
  onEditorReady,
}: JsonEditorPanelProps) {
  return (
    <CodeMirrorEditor
      value={value}
      onChange={onChange}
      onValidJson={onValidJson}
      placeholder={placeholder}
      debounceMs={debounceMs}
      minHeight={minHeight}
      className={className}
      disabled={disabled}
      onEditorReady={onEditorReady}
    />
  );
}
