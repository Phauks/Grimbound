/**
 * ErrorBoundary Component
 *
 * React Error Boundary that catches JavaScript errors anywhere in its
 * child component tree, logs them, and displays a fallback UI.
 *
 * @module components/Shared/Feedback/ErrorBoundary
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logger } from '@/ts/utils/logger.js';

// ============================================================================
// Types
// ============================================================================

export interface ErrorBoundaryProps {
  /** Child components to render */
  children: ReactNode;
  /** Fallback UI to display when an error occurs */
  fallback?: ReactNode;
  /** Custom fallback render function with error details */
  fallbackRender?: (props: FallbackRenderProps) => ReactNode;
  /** Callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Whether to reset error state when children change */
  resetOnChildChange?: boolean;
}

export interface FallbackRenderProps {
  /** The error that was caught */
  error: Error;
  /** Function to reset the error boundary */
  resetErrorBoundary: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// ============================================================================
// ErrorBoundary Component
// ============================================================================

/**
 * Error Boundary component that catches errors in child components.
 *
 * @example
 * ```tsx
 * // Basic usage with fallback element
 * <ErrorBoundary fallback={<div>Something went wrong</div>}>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * // With fallback render function
 * <ErrorBoundary
 *   fallbackRender={({ error, resetErrorBoundary }) => (
 *     <div>
 *       <p>Error: {error.message}</p>
 *       <button onClick={resetErrorBoundary}>Try Again</button>
 *     </div>
 *   )}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * // With error callback
 * <ErrorBoundary
 *   onError={(error, errorInfo) => {
 *     reportErrorToService(error, errorInfo);
 *   }}
 *   fallback={<ErrorFallback />}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  /**
   * Update state when an error is caught
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  /**
   * Log the error and call the onError callback
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log to our structured logger
    logger.error('ErrorBoundary', 'Component error caught', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    // Call the onError callback if provided
    this.props.onError?.(error, errorInfo);
  }

  /**
   * Reset error state when children change (if enabled)
   */
  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (
      this.state.hasError &&
      this.props.resetOnChildChange &&
      prevProps.children !== this.props.children
    ) {
      this.resetErrorBoundary();
    }
  }

  /**
   * Reset the error boundary state
   */
  resetErrorBoundary = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, fallbackRender } = this.props;

    if (hasError && error) {
      // Use fallbackRender if provided
      if (fallbackRender) {
        return fallbackRender({
          error,
          resetErrorBoundary: this.resetErrorBoundary,
        });
      }

      // Use fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default fallback
      return (
        <div
          style={{
            padding: '20px',
            textAlign: 'center',
            color: 'var(--text-secondary, #666)',
          }}
        >
          <p>Something went wrong.</p>
          <button
            type="button"
            onClick={this.resetErrorBoundary}
            style={{
              marginTop: '10px',
              padding: '8px 16px',
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
