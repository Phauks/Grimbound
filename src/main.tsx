import { registerSW } from 'virtual:pwa-register';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/Shared/Feedback/ErrorBoundary';
import { DataSyncProvider } from './contexts/DataSyncContext';
import { FontProvider } from './contexts/FontContext';
import { ServiceProvider } from './contexts/ServiceContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { logger } from './ts/utils/logger.js';
import { migratePresets } from './ts/utils/presetMigration.js';
import './styles/index.css';

// ============================================================================
// Data Migrations (run before React mounts)
// ============================================================================

// Migrate legacy presets from old format to new two-tier system
migratePresets();

// ============================================================================
// Global Error Handlers & Error UI
// ============================================================================

const errorLogger = logger.child('GlobalError');

/**
 * Escape HTML to prevent XSS in error messages.
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Error page theme colors (matches colors.css base theme).
 * Hardcoded because CSS may not be loaded when errors occur.
 */
const ERROR_THEME = {
  bg: '#1a1a1a',
  text: '#f5f5f5',
  textSecondary: '#b0b0b0',
  textMuted: '#808080',
  errorLight: '#ff6b6b',
  errorBorder: '#e74c3c',
  errorBg: 'rgba(231, 76, 60, 0.1)',
  primary: '#8b0000',
  border: '#404040',
} as const;

/**
 * Generate error page HTML. Used by both pre-React error handler and React ErrorBoundary.
 * @param message - The error message to display
 * @param options - Additional options
 * @param options.showTryAgain - Whether to show a "Try Again" button (React ErrorBoundary only)
 * @param options.useThemeVars - Whether to use CSS variables (only works after CSS loads)
 */
function createErrorPageHtml(
  message: string,
  options: { showTryAgain?: boolean; useThemeVars?: boolean } = {}
): string {
  const { showTryAgain = false, useThemeVars = false } = options;
  const escaped = escapeHtml(message);
  const escapedForJs = escaped.replace(/'/g, "\\'");

  // Use CSS variables when React has loaded (theme-aware), otherwise hardcoded values
  const colors = useThemeVars
    ? {
        bg: 'var(--bg-main, #1a1a1a)',
        text: 'var(--text-primary, #f5f5f5)',
        textSecondary: 'var(--text-secondary, #b0b0b0)',
        textMuted: 'var(--text-muted, #808080)',
        errorLight: 'var(--color-error-light, #ff6b6b)',
        errorBorder: 'var(--color-error, #e74c3c)',
        errorBg: 'var(--color-danger-subtle, rgba(231, 76, 60, 0.1))',
        primary: 'var(--color-primary, #8b0000)',
        border: 'var(--border-color, #404040)',
      }
    : ERROR_THEME;

  const tryAgainButton = showTryAgain
    ? `
        <button
          data-action="try-again"
          style="
            background: ${colors.primary};
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 6px;
            cursor: pointer;
            font-size: 1rem;
          "
        >
          Try Again
        </button>`
    : '';

  return `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 2rem;
      background: ${colors.bg};
      color: ${colors.text};
      font-family: system-ui, -apple-system, sans-serif;
      text-align: center;
    ">
      <div style="
        background: ${colors.errorBg};
        border: 1px solid ${colors.errorBorder};
        border-radius: 8px;
        padding: 2rem;
        max-width: 500px;
      ">
        <h1 style="color: ${colors.errorLight}; margin: 0 0 1rem 0; font-size: 1.5rem;">
          Something went wrong
        </h1>
        <p style="color: ${colors.textSecondary}; margin: 0 0 1rem 0; font-size: 0.9rem; word-break: break-word;">
          ${escaped}
        </p>
        <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap;">
          <button
            data-action="copy"
            data-message="${escapedForJs}"
            onclick="navigator.clipboard.writeText(this.dataset.message).then(function(){this.textContent='Copied!';setTimeout(function(){this.textContent='Copy Error';}.bind(this),2000);}.bind(this))"
            style="
              background: transparent;
              color: ${colors.textSecondary};
              border: 1px solid ${colors.border};
              padding: 0.75rem 1.5rem;
              border-radius: 6px;
              cursor: pointer;
              font-size: 1rem;
            "
          >
            Copy Error
          </button>${tryAgainButton}
          <button
            onclick="location.reload()"
            style="
              background: ${showTryAgain ? 'transparent' : colors.primary};
              color: ${showTryAgain ? colors.textSecondary : 'white'};
              border: ${showTryAgain ? `1px solid ${colors.border}` : 'none'};
              padding: 0.75rem 1.5rem;
              border-radius: 6px;
              cursor: pointer;
              font-size: 1rem;
            "
          >
            Reload Page
          </button>
        </div>
      </div>
      <p style="color: ${colors.textMuted}; margin-top: 1rem; font-size: 0.8rem;">
        Check the browser console for more details
      </p>
    </div>
  `;
}

/**
 * Display an error message in the DOM when React can't render.
 * Only shows if React hasn't mounted yet (loading state still visible).
 */
function showGlobalError(message: string): void {
  const rootElement = document.getElementById('root');
  if (!rootElement) return;

  const hasLoadingState = rootElement.querySelector('[data-loading-state]');
  const isEmpty = rootElement.children.length === 0;

  if (hasLoadingState || isEmpty) {
    rootElement.innerHTML = createErrorPageHtml(message, { useThemeVars: false });
  }
}

/**
 * Global handler for uncaught JavaScript errors.
 */
window.onerror = (message, source, lineno, colno, error) => {
  errorLogger.error('Uncaught error', {
    message,
    source,
    lineno,
    colno,
    error: error?.stack || error?.message,
  });
  showGlobalError(error?.message || String(message));
  return false;
};

/**
 * Global handler for unhandled promise rejections.
 */
window.onunhandledrejection = (event) => {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason);
  errorLogger.error('Unhandled promise rejection', {
    message,
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  showGlobalError(message);
};

// Create child logger for PWA operations
const pwaLogger = logger.child('PWA');

// Register service worker for PWA functionality
// Using autoUpdate mode - the app will automatically update when a new version is available
const updateSW = registerSW({
  onNeedRefresh() {
    // A new version is available - the service worker will update automatically
    // Log for debugging, but don't interrupt the user
    pwaLogger.info('New content available, will update on next reload');
  },
  onOfflineReady() {
    pwaLogger.info('App is ready to work offline');
  },
  onRegisteredSW(swUrl, registration) {
    pwaLogger.info('Service worker registered:', swUrl);

    // Check for updates periodically (every hour)
    if (registration) {
      setInterval(
        () => {
          registration.update();
        },
        60 * 60 * 1000
      );
    }
  },
  onRegisterError(error) {
    pwaLogger.error('Service worker registration failed:', error);
  },
});

// Export updateSW for manual update triggering if needed
(window as { updateSW?: typeof updateSW }).updateSW = updateSW;

// ============================================================================
// App Error Fallback
// ============================================================================

/** CSS variable colors with fallbacks (for React component after CSS loads) */
const THEME_VARS = {
  bg: 'var(--bg-main, #1a1a1a)',
  text: 'var(--text-primary, #f5f5f5)',
  textSecondary: 'var(--text-secondary, #b0b0b0)',
  textMuted: 'var(--text-muted, #808080)',
  errorLight: 'var(--color-error-light, #ff6b6b)',
  errorBorder: 'var(--color-error, #e74c3c)',
  errorBg: 'var(--color-danger-subtle, rgba(231, 76, 60, 0.1))',
  primary: 'var(--color-primary, #8b0000)',
  border: 'var(--border-color, #404040)',
} as const;

/**
 * Fallback UI shown when React's ErrorBoundary catches an error.
 * Uses shared theme constants for consistent styling.
 */
function AppErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(error.message).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
        background: THEME_VARS.bg,
        color: THEME_VARS.text,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          background: THEME_VARS.errorBg,
          border: `1px solid ${THEME_VARS.errorBorder}`,
          borderRadius: '8px',
          padding: '2rem',
          maxWidth: '500px',
        }}
      >
        <h1 style={{ color: THEME_VARS.errorLight, margin: '0 0 1rem 0', fontSize: '1.5rem' }}>
          Something went wrong
        </h1>
        <p
          style={{
            color: THEME_VARS.textSecondary,
            margin: '0 0 1rem 0',
            fontSize: '0.9rem',
            wordBreak: 'break-word',
          }}
        >
          {error.message}
        </p>
        <div
          style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}
        >
          <button
            type="button"
            onClick={handleCopy}
            style={{
              background: 'transparent',
              color: THEME_VARS.textSecondary,
              border: `1px solid ${THEME_VARS.border}`,
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            {copied ? 'Copied!' : 'Copy Error'}
          </button>
          <button
            type="button"
            onClick={resetErrorBoundary}
            style={{
              background: THEME_VARS.primary,
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            Try Again
          </button>
          <button
            type="button"
            onClick={() => location.reload()}
            style={{
              background: 'transparent',
              color: THEME_VARS.textSecondary,
              border: `1px solid ${THEME_VARS.border}`,
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            Reload Page
          </button>
        </div>
      </div>
      <p style={{ color: THEME_VARS.textMuted, marginTop: '1rem', fontSize: '0.8rem' }}>
        Check the browser console for more details
      </p>
    </div>
  );
}

// ============================================================================
// React App Mount
// ============================================================================

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <AppErrorFallback error={error} resetErrorBoundary={resetErrorBoundary} />
      )}
      onError={(error, errorInfo) => {
        errorLogger.error('React error boundary caught error', {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
        });
      }}
    >
      <ThemeProvider>
        <ServiceProvider>
          <FontProvider>
            <DataSyncProvider>
              <App />
            </DataSyncProvider>
          </FontProvider>
        </ServiceProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
