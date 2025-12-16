import { useCallback, useEffect, useRef } from 'react';
import styles from '../../../styles/components/shared/JsonEditorPanel.module.css';
import { JsonHighlight } from '../../ViewComponents/JsonComponents/JsonHighlight';

interface JsonEditorPanelProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onValidJson?: (parsed: unknown) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  debounceMs?: number;
  minHeight?: string;
  className?: string;
  disabled?: boolean;
  showError?: boolean;
}

/**
 * Reusable JSON editor with syntax highlighting and debounced parsing
 * Used in ScriptInput and TokenEditor to avoid code duplication
 *
 * Performance: Uses CSS Grid overlay with auto-sizing textarea.
 * The parent container scrolls both elements together - no JS scroll sync needed.
 *
 * This is a controlled component - the parent manages the value state
 */
export function JsonEditorPanel({
  value,
  onChange,
  onValidJson,
  onKeyDown,
  placeholder = 'Enter JSON...',
  debounceMs = 300,
  minHeight = '200px',
  className,
  disabled = false,
  showError = true,
}: JsonEditorPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorRef = useRef<string | null>(null);

  // Auto-resize textarea to fit content (prevents internal scrolling)
  const autoResizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, []);

  // Auto-resize on content change
  useEffect(() => {
    autoResizeTextarea();
  }, [autoResizeTextarea]);

  // Debounced parse and validation
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      try {
        const parsed = JSON.parse(value);
        errorRef.current = null;
        if (onValidJson) {
          onValidJson(parsed);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Invalid JSON';
        errorRef.current = errorMessage;
      }
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [value, debounceMs, onValidJson]);

  return (
    <div className={`${styles.editorContainer} ${className || ''}`} style={{ minHeight }}>
      {/* Syntax highlighting overlay */}
      <div className={styles.highlightOverlay} aria-hidden="true">
        <JsonHighlight json={value} />
      </div>

      {/* Editable textarea */}
      <textarea
        ref={textareaRef}
        className={styles.textarea}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        spellCheck={false}
        disabled={disabled}
      />

      {/* Error display - only shown if parent wants to display errors inline */}
      {showError && errorRef.current && (
        <div className={styles.error}>
          <span className={styles.errorIcon}>⚠</span>
          {errorRef.current}
        </div>
      )}
    </div>
  );
}
