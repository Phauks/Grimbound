/**
 * CodeMirrorEditor Component
 *
 * A React wrapper around CodeMirror 6 for JSON editing.
 * Provides syntax highlighting, linting, and theme integration.
 *
 * Features:
 * - Line numbers with active line highlighting
 * - Fold gutter for collapsing JSON blocks (click ▼/▶)
 * - Bracket matching with visual feedback
 * - Search and replace (Ctrl+F / Ctrl+H)
 * - JSON syntax highlighting and linting
 * - Undo/redo history (Ctrl+Z / Ctrl+Y)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useCodeMirrorEditor } from '@/hooks';
import styles from '@/styles/components/shared/CodeMirrorEditor.module.css';

export interface CodeMirrorEditorProps {
  /** The JSON string value */
  value: string;
  /** Called when the value changes */
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
  /** Whether to show inline error display (not used - CodeMirror shows lint markers) */
  showError?: boolean;
  /** Expose editor control functions to parent */
  onEditorReady?: (controls: EditorControls) => void;
  /** Whether to show the info/help indicator (default: true) */
  showInfoIndicator?: boolean;
  /** Whether to show line numbers (default: true) */
  showLineNumbers?: boolean;
  /** Whether to show fold gutter (default: true) */
  showFoldGutter?: boolean;
}

export interface EditorControls {
  undo: () => boolean;
  redo: () => boolean;
  openSearch: () => void;
}

/**
 * CodeMirror 6 based JSON editor with syntax highlighting and linting.
 *
 * Features:
 * - Line numbers with active line highlighting
 * - Fold gutter for collapsing JSON blocks
 * - Bracket matching with visual feedback
 * - Search and replace (Ctrl+F / Ctrl+H)
 * - JSON syntax highlighting with theme integration
 * - Real-time JSON linting with error markers
 * - Built-in undo/redo with keyboard shortcuts
 * - Controlled component pattern
 * - Theme synchronization with application themes
 */
export function CodeMirrorEditor({
  value,
  onChange,
  onValidJson,
  placeholder = 'Enter JSON...',
  debounceMs = 300,
  minHeight = '200px',
  className,
  disabled = false,
  onEditorReady,
  showInfoIndicator = true,
  showLineNumbers = true,
  showFoldGutter = true,
}: CodeMirrorEditorProps) {
  const onEditorReadyRef = useRef(onEditorReady);
  onEditorReadyRef.current = onEditorReady;

  const [showTooltip, setShowTooltip] = useState(false);

  const { containerRef, triggerUndo, triggerRedo, openSearch } = useCodeMirrorEditor({
    value,
    onChange,
    onValidJson,
    placeholder,
    disabled,
    debounceMs,
    showLintGutter: true,
    showLineNumbers,
    showFoldGutter,
  });

  // Expose editor controls to parent
  useEffect(() => {
    if (onEditorReadyRef.current) {
      onEditorReadyRef.current({
        undo: triggerUndo,
        redo: triggerRedo,
        openSearch,
      });
    }
  }, [triggerUndo, triggerRedo, openSearch]);

  // Handle drag and drop for JSON files
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const file = e.dataTransfer.files[0];
      if (file && (file.type === 'application/json' || file.name.endsWith('.json'))) {
        try {
          const text = await file.text();
          onChange(text);
        } catch {
          // Failed to read file, ignore
        }
      }
    },
    [onChange]
  );

  return (
    <div
      className={`${styles.editorContainer} ${disabled ? styles.disabled : ''} ${className || ''}`}
      style={{ minHeight }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      role="application"
      aria-label="JSON editor with drag and drop support"
    >
      <div ref={containerRef} className={styles.codeMirrorWrapper} />

      {/* Info indicator with keyboard shortcuts tooltip */}
      {showInfoIndicator && (
        <button
          type="button"
          className={styles.infoIndicator}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onClick={() => setShowTooltip(!showTooltip)}
          aria-label="Editor keyboard shortcuts"
          aria-expanded={showTooltip}
        >
          Shortcuts
          {showTooltip && (
            <div className={styles.infoTooltip}>
              <div className={styles.tooltipTitle}>Editor Shortcuts</div>
              <div className={styles.shortcutList}>
                <div className={styles.shortcutItem}>
                  <span className={styles.shortcutKey}>Ctrl+F</span>
                  <span>Search</span>
                </div>
                <div className={styles.shortcutItem}>
                  <span className={styles.shortcutKey}>Ctrl+H</span>
                  <span>Replace</span>
                </div>
                <div className={styles.shortcutItem}>
                  <span className={styles.shortcutKey}>Ctrl+Z</span>
                  <span>Undo</span>
                </div>
                <div className={styles.shortcutItem}>
                  <span className={styles.shortcutKey}>Ctrl+Y</span>
                  <span>Redo</span>
                </div>
                <div className={styles.shortcutItem}>
                  <span className={styles.shortcutKey}>Tab</span>
                  <span>Indent</span>
                </div>
                <div className={styles.shortcutItem}>
                  <span className={styles.shortcutKey}>Ctrl+[</span>
                  <span>Fold block</span>
                </div>
                <div className={styles.shortcutItem}>
                  <span className={styles.shortcutKey}>Ctrl+]</span>
                  <span>Unfold block</span>
                </div>
              </div>
              <div className={styles.tooltipFooter}>Click line numbers to select lines</div>
            </div>
          )}
        </button>
      )}
    </div>
  );
}
