/**
 * useJsonEditor Hook
 *
 * Manages JSON editing state with debounced parsing, validation,
 * and synchronization with external data sources.
 *
 * @module hooks/editors/useJsonEditor
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { logger } from '@/ts/utils/logger.js';

export interface UseJsonEditorOptions<T> {
  /** The source data to serialize to JSON */
  data: T;
  /** Transform data before serializing (e.g., strip internal fields) */
  transformForDisplay?: (data: T) => Partial<T>;
  /** Callback when valid JSON is parsed and ready to apply */
  onApply: (parsed: Partial<T>) => void;
  /** Fields to preserve when applying changes (e.g., uuid) */
  preserveFields?: (keyof T)[];
  /** Debounce delay in milliseconds */
  debounceMs?: number;
}

export interface UseJsonEditorResult {
  /** Current JSON text */
  text: string;
  /** Current parse error, if any */
  error: string | null;
  /** Whether the user is actively editing */
  isEditing: boolean;
  /** Handle text changes */
  onChange: (newText: string) => void;
  /** Handle blur - apply changes immediately */
  onBlur: () => void;
  /** Format the current JSON */
  format: () => void;
  /** Copy JSON to clipboard */
  copy: () => Promise<void>;
  /** Download JSON as file */
  download: (filename: string) => void;
  /** Force sync from external data */
  syncFromData: () => void;
}

/**
 * Hook for managing JSON editing with validation and debouncing.
 *
 * Features:
 * - Debounced parsing to avoid lag during typing
 * - Tracks editing state to prevent external overwrites
 * - Format, copy, and download utilities
 * - Preserves specified fields when applying changes
 *
 * @example
 * ```tsx
 * const json = useJsonEditor({
 *   data: character,
 *   transformForDisplay: (char) => {
 *     const { uuid, source, ...rest } = char;
 *     return rest;
 *   },
 *   onApply: (parsed) => {
 *     onReplaceCharacter({ ...parsed, uuid: character.uuid });
 *   },
 *   preserveFields: ['uuid'],
 * });
 *
 * return (
 *   <>
 *     <textarea value={json.text} onChange={(e) => json.onChange(e.target.value)} />
 *     {json.error && <div className="error">{json.error}</div>}
 *     <button onClick={json.format}>Format</button>
 *     <button onClick={json.copy}>Copy</button>
 *   </>
 * );
 * ```
 */
export function useJsonEditor<T extends object>({
  data,
  transformForDisplay,
  onApply,
  preserveFields = [],
  debounceMs = 500,
}: UseJsonEditorOptions<T>): UseJsonEditorResult {
  const getDisplayData = useCallback(
    (d: T) => (transformForDisplay ? transformForDisplay(d) : d),
    [transformForDisplay]
  );

  const [text, setText] = useState(() => JSON.stringify(getDisplayData(data), null, 2));
  const [error, setError] = useState<string | null>(null);

  const isEditingRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync from external data when not editing
  useEffect(() => {
    if (!isEditingRef.current) {
      setText(JSON.stringify(getDisplayData(data), null, 2));
      setError(null);
    }
  }, [data, getDisplayData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const applyParsed = useCallback(
    (parsed: Record<string, unknown>) => {
      // Preserve specified fields from original data
      const result = { ...parsed };
      for (const field of preserveFields) {
        if (field in data) {
          result[field as string] = data[field];
        }
      }
      onApply(result as Partial<T>);
    },
    [data, preserveFields, onApply]
  );

  const onChange = useCallback(
    (newText: string) => {
      setText(newText);
      isEditingRef.current = true;

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Debounce parsing and applying
      debounceTimerRef.current = setTimeout(() => {
        try {
          const parsed = JSON.parse(newText);
          setError(null);
          applyParsed(parsed);

          // After applying, allow sync again with small delay
          setTimeout(() => {
            isEditingRef.current = false;
          }, 100);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Invalid JSON');
        }
      }, debounceMs);
    },
    [applyParsed, debounceMs]
  );

  const onBlur = useCallback(() => {
    // Clear debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    try {
      const parsed = JSON.parse(text);
      setError(null);
      applyParsed(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON');
    }

    // Allow syncing again
    isEditingRef.current = false;
  }, [text, applyParsed]);

  const format = useCallback(() => {
    try {
      const parsed = JSON.parse(text);
      setText(JSON.stringify(parsed, null, 2));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot format: Invalid JSON');
    }
  }, [text]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      logger.error('useJsonEditor', 'Failed to copy to clipboard', err);
    }
  }, [text]);

  const download = useCallback(
    (filename: string) => {
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename.endsWith('.json') ? filename : `${filename}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [text]
  );

  const syncFromData = useCallback(() => {
    setText(JSON.stringify(getDisplayData(data), null, 2));
    setError(null);
    isEditingRef.current = false;
  }, [data, getDisplayData]);

  return {
    text,
    error,
    isEditing: isEditingRef.current,
    onChange,
    onBlur,
    format,
    copy,
    download,
    syncFromData,
  };
}

export default useJsonEditor;
