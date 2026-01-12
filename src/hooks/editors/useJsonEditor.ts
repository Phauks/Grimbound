/**
 * useJsonEditor Hook
 *
 * Manages JSON editing state with debounced parsing, validation,
 * and synchronization with external data sources.
 *
 * @module hooks/editors/useJsonEditor
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebouncedCallback } from '@/hooks/ui/useDebouncedCallback';
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

  // Store latest data in ref for applyParsed
  const dataRef = useRef(data);
  dataRef.current = data;

  // Sync from external data when not editing
  useEffect(() => {
    if (!isEditingRef.current) {
      setText(JSON.stringify(getDisplayData(data), null, 2));
      setError(null);
    }
  }, [data, getDisplayData]);

  const applyParsed = (parsed: Record<string, unknown>) => {
    // Preserve specified fields from original data
    const result = { ...parsed };
    for (const field of preserveFields) {
      if (field in dataRef.current) {
        result[field as string] = dataRef.current[field];
      }
    }
    onApply(result as Partial<T>);
  };

  // Debounced parsing and applying
  const { debouncedFn: debouncedParse, cancel: cancelDebounce } = useDebouncedCallback(
    (textToParse: string) => {
      try {
        const parsed = JSON.parse(textToParse);
        setError(null);
        applyParsed(parsed);

        // After applying, allow sync again with small delay
        setTimeout(() => {
          isEditingRef.current = false;
        }, 100);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invalid JSON');
      }
    },
    { delay: debounceMs }
  );

  const onChange = (newText: string) => {
    setText(newText);
    isEditingRef.current = true;
    debouncedParse(newText);
  };

  const onBlur = () => {
    cancelDebounce();

    try {
      const parsed = JSON.parse(text);
      setError(null);
      applyParsed(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid JSON');
    }

    // Allow syncing again
    isEditingRef.current = false;
  };

  const format = () => {
    try {
      const parsed = JSON.parse(text);
      setText(JSON.stringify(parsed, null, 2));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cannot format: Invalid JSON');
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      logger.error('useJsonEditor', 'Failed to copy to clipboard', err);
    }
  };

  const download = (filename: string) => {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.json') ? filename : `${filename}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const syncFromData = () => {
    setText(JSON.stringify(getDisplayData(data), null, 2));
    setError(null);
    isEditingRef.current = false;
  };

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
