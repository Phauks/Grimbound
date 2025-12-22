/**
 * useAutoResizeTextarea Hook
 *
 * Automatically resizes a textarea to fit its content.
 * Handles initial mount, value changes, and user input.
 *
 * @module hooks/ui/useAutoResizeTextarea
 *
 * @example
 * const textareaRef = useAutoResizeTextarea({ value, enabled: true, minRows: 3 });
 * <textarea ref={textareaRef} value={value} onChange={...} />
 */

import { useCallback, useEffect, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface UseAutoResizeTextareaOptions {
  /** The current value of the textarea (triggers resize on change) */
  value: string | undefined;
  /** Whether auto-resize is enabled (default: true) */
  enabled?: boolean;
  /** Minimum number of rows to show (default: 2) */
  minRows?: number;
}

export interface UseAutoResizeTextareaResult {
  /** React ref to attach to the textarea element */
  ref: React.RefObject<HTMLTextAreaElement | null>;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook to auto-resize a textarea based on its content
 *
 * @example
 * ```tsx
 * const { ref } = useAutoResizeTextarea({ value: text, minRows: 3 });
 * return <textarea ref={ref} value={text} onChange={handleChange} />;
 * ```
 */
export function useAutoResizeTextarea({
  value: _value,
  enabled = true,
  minRows = 2,
}: UseAutoResizeTextareaOptions): React.RefObject<HTMLTextAreaElement | null> {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const textarea = textareaRef.current;
    if (!(textarea && enabled)) return;

    // Get computed styles for calculating minimum height
    const computedStyle = window.getComputedStyle(textarea);
    const lineHeight = parseFloat(computedStyle.lineHeight) || 20;
    const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
    const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
    const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
    const borderBottom = parseFloat(computedStyle.borderBottomWidth) || 0;

    // Calculate minimum height based on minRows
    const minHeight = lineHeight * minRows + paddingTop + paddingBottom + borderTop + borderBottom;

    // Reset height to auto to get accurate scrollHeight
    textarea.style.height = 'auto';

    // Set to scrollHeight or minHeight, whichever is larger
    const newHeight = Math.max(textarea.scrollHeight, minHeight);
    textarea.style.height = `${newHeight}px`;
  }, [enabled, minRows]);

  // Resize on mount
  useEffect(() => {
    resize();
  }, [resize]);

  // Resize when value changes
  useEffect(() => {
    resize();
  }, [resize]);

  // Handle window resize
  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [enabled, resize]);

  return textareaRef;
}

export default useAutoResizeTextarea;
