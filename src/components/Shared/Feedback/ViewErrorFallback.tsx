/**
 * UnifiedErrorDisplay Component
 *
 * Unified error fallback UI that works for both view-level and app-level errors.
 * Provides a user-friendly error message with retry, reload, and reporting options.
 *
 * Variants:
 * - 'view': For ErrorBoundary fallbacks within views (default)
 * - 'app': For top-level app errors (full-page, includes reload button)
 * - 'minimal': Compact display without technical details
 *
 * @module components/Shared/Feedback/ViewErrorFallback
 */

import { useState } from 'react';
import styles from '@/styles/components/shared/ViewErrorFallback.module.css';

// ============================================================================
// Types
// ============================================================================

export type ErrorDisplayVariant = 'view' | 'app' | 'minimal';

export interface UnifiedErrorDisplayProps {
  /** The error that was caught */
  error?: Error;
  /** Context where the error occurred (e.g., "Characters", "Script") */
  context?: string;
  /** Display variant - 'view' for views, 'app' for top-level, 'minimal' for compact */
  variant?: ErrorDisplayVariant;
  /** Function to retry/reset the component */
  onRetry?: () => void;
  /** Function to reload the page (shown in 'app' variant) */
  onReload?: () => void;
  /** Whether to show expandable technical details (default: true, false for 'minimal') */
  showTechnicalDetails?: boolean;
  /** Whether to show the Report Issue button (default: true) */
  showReportButton?: boolean;
}

// ============================================================================
// UnifiedErrorDisplay Component
// ============================================================================

/**
 * Unified error fallback UI for all error contexts.
 *
 * Displays a friendly error message with context, retry, reload, and reporting options.
 * Supports multiple variants for different use cases.
 *
 * @example
 * ```tsx
 * // View-level error (within ErrorBoundary)
 * <ErrorBoundary
 *   fallbackRender={({ error, resetErrorBoundary }) => (
 *     <UnifiedErrorDisplay
 *       error={error}
 *       context="Characters"
 *       onRetry={resetErrorBoundary}
 *     />
 *   )}
 * >
 *   <CharactersView />
 * </ErrorBoundary>
 *
 * // App-level error (in main.tsx)
 * <UnifiedErrorDisplay
 *   error={error}
 *   variant="app"
 *   onRetry={resetErrorBoundary}
 *   onReload={() => location.reload()}
 * />
 *
 * // Minimal inline error
 * <UnifiedErrorDisplay
 *   error={error}
 *   variant="minimal"
 *   onRetry={handleRetry}
 * />
 * ```
 */
export function UnifiedErrorDisplay({
  error,
  context,
  variant = 'view',
  onRetry,
  onReload,
  showTechnicalDetails,
  showReportButton = true,
}: UnifiedErrorDisplayProps) {
  const [copied, setCopied] = useState(false);

  // Determine if technical details should be shown
  const shouldShowTechnicalDetails =
    showTechnicalDetails ?? (variant !== 'minimal' && !!error?.stack);

  // Determine if report button should be shown
  const shouldShowReportButton = showReportButton && variant !== 'minimal';

  // Build error text for clipboard
  const getErrorText = () => {
    if (!error) return '';
    const contextStr = context ? ` in ${context}` : '';
    return `Error${contextStr}\n\nMessage: ${error.message}\n\nStack Trace:\n${error.stack || 'No stack trace available'}`;
  };

  const handleCopyError = async () => {
    const errorText = getErrorText();
    if (!errorText) return;

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
  };

  // Build container class based on variant
  const containerClass =
    variant === 'app'
      ? `${styles.container} ${styles.appVariant}`
      : variant === 'minimal'
        ? `${styles.container} ${styles.minimalVariant}`
        : styles.container;

  // Build message based on context
  const getMessage = () => {
    if (context) {
      return (
        <>
          An error occurred in the <strong>{context}</strong> view.
        </>
      );
    }
    return 'An unexpected error occurred.';
  };

  return (
    <div className={containerClass} role="alert">
      <div className={styles.content}>
        {variant !== 'minimal' && (
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
        )}

        <h2 className={styles.title}>Something went wrong</h2>

        <p className={styles.message}>
          {getMessage()}
          {error?.message && <span className={styles.errorDetail}>{error.message}</span>}
        </p>

        <div className={styles.actions}>
          {onRetry && (
            <button type="button" className={styles.retryButton} onClick={onRetry}>
              Try Again
            </button>
          )}

          {(variant === 'app' || onReload) && (
            <button
              type="button"
              className={styles.reloadButton}
              onClick={onReload ?? (() => location.reload())}
            >
              Reload Page
            </button>
          )}

          {shouldShowReportButton && (
            <button
              type="button"
              className={styles.reportButton}
              onClick={() => {
                window.open(
                  'https://github.com/Phauks/Grimbound/issues',
                  '_blank',
                  'noopener,noreferrer'
                );
              }}
            >
              Report Issue
            </button>
          )}
        </div>

        {shouldShowTechnicalDetails && error?.stack && (
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

        {variant === 'app' && (
          <p className={styles.consoleHint}>Check the browser console for more details</p>
        )}
      </div>
    </div>
  );
}
