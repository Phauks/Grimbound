/**
 * Unified Textarea Component
 *
 * Consistent textarea styling across the application.
 * Supports standard HTML textarea attributes plus custom styling options.
 * Auto-resize mode expands the textarea to fit all content without scrolling.
 */

import { forwardRef, type TextareaHTMLAttributes, useCallback, useEffect, useRef } from 'react';
import styles from '@/styles/components/shared/Form.module.css';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Textarea size variant */
  size?: 'small' | 'medium' | 'large';
  /** Error state */
  error?: boolean;
  /** Error message to display */
  errorMessage?: string;
  /** Full width */
  fullWidth?: boolean;
  /** Auto-resize based on content - expands to show all text without scrolling */
  autoResize?: boolean;
  /** Minimum number of rows when autoResize is enabled */
  minRows?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      size = 'medium',
      error = false,
      errorMessage,
      fullWidth = false,
      autoResize = false,
      minRows = 2,
      className,
      disabled,
      value,
      onInput,
      ...props
    },
    forwardedRef
  ) => {
    // Internal ref for auto-resize functionality
    const internalRef = useRef<HTMLTextAreaElement>(null);

    // Use forwarded ref if provided, otherwise use internal ref
    const textareaRef = (forwardedRef as React.RefObject<HTMLTextAreaElement>) || internalRef;

    const textareaClasses = [
      styles.textarea,
      styles[`textarea${size.charAt(0).toUpperCase()}${size.slice(1)}`],
      error && styles.textareaError,
      disabled && styles.textareaDisabled,
      fullWidth && styles.fullWidth,
      autoResize && styles.textareaAutoResize,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const wrapperClasses = [styles.textareaWrapper, fullWidth && styles.fullWidth]
      .filter(Boolean)
      .join(' ');

    // Auto-resize function
    const resizeTextarea = useCallback(
      (textarea: HTMLTextAreaElement | null) => {
        if (!(textarea && autoResize)) return;

        // Get computed styles for calculating minimum height
        const computedStyle = window.getComputedStyle(textarea);
        const lineHeight = parseFloat(computedStyle.lineHeight) || 20;
        const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
        const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
        const borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
        const borderBottom = parseFloat(computedStyle.borderBottomWidth) || 0;

        // Calculate minimum height based on minRows
        const minHeight =
          lineHeight * minRows + paddingTop + paddingBottom + borderTop + borderBottom;

        // Reset height to auto to get accurate scrollHeight
        textarea.style.height = 'auto';

        // Set to scrollHeight or minHeight, whichever is larger
        const newHeight = Math.max(textarea.scrollHeight, minHeight);
        textarea.style.height = `${newHeight}px`;
      },
      [autoResize, minRows]
    );

    // Resize on mount and when value changes
    useEffect(() => {
      if (autoResize && textareaRef.current) {
        resizeTextarea(textareaRef.current);
      }
    }, [autoResize, resizeTextarea, textareaRef]);

    // Handle window resize
    useEffect(() => {
      if (!autoResize) return;

      const handleResize = () => {
        if (textareaRef.current) {
          resizeTextarea(textareaRef.current);
        }
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, [autoResize, resizeTextarea, textareaRef]);

    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
      if (autoResize) {
        resizeTextarea(e.currentTarget);
      }
      onInput?.(e);
    };

    // Callback ref to handle both forwarded ref and initial resize
    const setRef = (element: HTMLTextAreaElement | null) => {
      // Update internal ref
      (internalRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = element;

      // Update forwarded ref if it's a function or object
      if (typeof forwardedRef === 'function') {
        forwardedRef(element);
      } else if (forwardedRef) {
        (forwardedRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = element;
      }

      // Initial resize
      if (element && autoResize) {
        // Use requestAnimationFrame to ensure styles are computed
        requestAnimationFrame(() => resizeTextarea(element));
      }
    };

    return (
      <div className={wrapperClasses}>
        <textarea
          ref={setRef}
          className={textareaClasses}
          disabled={disabled}
          aria-invalid={error}
          value={value}
          onInput={handleInput}
          {...props}
        />
        {errorMessage && <span className={styles.errorText}>{errorMessage}</span>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
