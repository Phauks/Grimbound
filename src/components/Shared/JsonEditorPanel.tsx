import { useRef, useEffect, useCallback } from 'react'
import { JsonHighlight } from '../ScriptInput/JsonHighlight'
import styles from '../../styles/components/shared/JsonEditorPanel.module.css'

interface JsonEditorPanelProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onValidJson?: (parsed: any) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  debounceMs?: number
  minHeight?: string
  className?: string
  disabled?: boolean
  showError?: boolean
}

/**
 * Reusable JSON editor with syntax highlighting and debounced parsing
 * Used in ScriptInput and TokenEditor to avoid code duplication
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
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const highlightRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const errorRef = useRef<string | null>(null)

  // Debounced parse and validation
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      try {
        const parsed = JSON.parse(value)
        errorRef.current = null
        if (onValidJson) {
          onValidJson(parsed)
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Invalid JSON'
        errorRef.current = errorMessage
      }
    }, debounceMs)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [value, debounceMs, onValidJson])

  // Sync scroll between textarea and highlight overlay
  const handleScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft
    }
  }, [])

  return (
    <div className={`${styles.editorContainer} ${className || ''}`} style={{ minHeight }}>
      {/* Syntax highlighting overlay */}
      <div ref={highlightRef} className={styles.highlightOverlay} aria-hidden="true">
        <JsonHighlight json={value} />
      </div>

      {/* Editable textarea */}
      <textarea
        ref={textareaRef}
        className={styles.textarea}
        value={value}
        onChange={onChange}
        onScroll={handleScroll}
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
  )
}
