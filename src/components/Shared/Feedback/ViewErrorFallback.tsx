/**
 * ViewErrorFallback Component
 *
 * Fallback UI displayed when an error occurs in a View component.
 * Provides a user-friendly error message and retry option.
 *
 * @module components/Shared/Feedback/ViewErrorFallback
 */

import { useCallback, useState } from 'react';
import styles from '@/styles/components/shared/ViewErrorFallback.module.css';

// ============================================================================
// Types
// ============================================================================

export interface ViewErrorFallbackProps {
  /** Name of the view that encountered the error */
  view: string;
  /** The error that was caught (optional) */
  error?: Error;
  /** Function to retry/reset the view */
  onRetry?: () => void;
}

// ============================================================================
// ViewErrorFallback Component
// ============================================================================

/**
 * Error fallback UI for View components.
 *
 * Displays a friendly error message with the view name and an optional
 * retry button. Used with ErrorBoundary to gracefully handle view errors.
 *
 * @example
 * ```tsx
 * <ErrorBoundary
 *   fallbackRender={({ error, resetErrorBoundary }) => (
 *     <ViewErrorFallback
 *       view="Characters"
 *       error={error}
 *       onRetry={resetErrorBoundary}
 *     />
 *   )}
 * >
 *   <CharactersView />
 * </ErrorBoundary>
 * ```
 */
export function ViewErrorFallback({ view, error, onRetry }: ViewErrorFallbackProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyError = useCallback(async () => {
    if (!error) return;

    const errorText = `Error in ${view} View\n\nMessage: ${error.message}\n\nStack Trace:\n${error.stack || 'No stack trace available'}`;

    try {
      await navigator.clipboard.writeText(errorText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = errorText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [error, view]);

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.icon}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            role="img"
            aria-label="Error icon"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>

        <h2 className={styles.title}>Something went wrong</h2>

        <p className={styles.message}>
          An error occurred in the <strong>{view}</strong> view.
          {error?.message && <span className={styles.errorDetail}>{error.message}</span>}
        </p>

        <div className={styles.actions}>
          {onRetry && (
            <button type="button" className={styles.retryButton} onClick={onRetry}>
              Try Again
            </button>
          )}

          <button
            type="button"
            className={styles.reportButton}
            onClick={() => {
              window.open(
                'https://github.com/anthropics/claude-code/issues',
                '_blank',
                'noopener,noreferrer'
              );
            }}
          >
            Report Issue
          </button>
        </div>

        {error?.stack && (
          <details className={styles.details}>
            <summary>Technical Details</summary>
            <div className={styles.stackContainer}>
              <pre className={styles.stack}>{error.stack}</pre>
              <button
                type="button"
                className={styles.copyButton}
                onClick={handleCopyError}
                title="Copy error details to clipboard"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

export default ViewErrorFallback;
