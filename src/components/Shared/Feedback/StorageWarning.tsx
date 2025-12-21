/**
 * Storage Warning Banner Component
 *
 * Displays warnings when IndexedDB storage quota is running low.
 * Provides one-click cleanup options.
 */

import { useState } from 'react';
import type { StorageWarningInfo } from '@/hooks/sync/useStorageQuota.js';
import { logger } from '@/ts/utils/logger.js';
import styles from './StorageWarning.module.css';

// ============================================================================
// Types
// ============================================================================

export interface StorageWarningProps {
  /** Warning information from useStorageQuota */
  warning: StorageWarningInfo;
  /** Cleanup function */
  onCleanup: () => Promise<{ orphaned: number; old: number }>;
  /** Optional callback when warning is dismissed */
  onDismiss?: () => void;
  /** Show dismiss button (default: true) */
  dismissible?: boolean;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Storage warning banner with cleanup actions.
 *
 * @example
 * ```tsx
 * function App() {
 *   const { warning, cleanup } = useStorageQuota()
 *
 *   return (
 *     <>
 *       {warning.level !== 'none' && (
 *         <StorageWarning warning={warning} onCleanup={cleanup} />
 *       )}
 *       <MainContent />
 *     </>
 *   )
 * }
 * ```
 */
export function StorageWarning({
  warning,
  onCleanup,
  onDismiss,
  dismissible = true,
}: StorageWarningProps) {
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<{ orphaned: number; old: number } | null>(
    null
  );
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't render if no warning or dismissed
  if (warning.level === 'none' || isDismissed) {
    return null;
  }

  const handleCleanup = async () => {
    setIsCleaningUp(true);
    setCleanupResult(null);

    try {
      const result = await onCleanup();
      setCleanupResult(result);

      // Auto-dismiss after successful cleanup if no assets were deleted
      if (result.orphaned === 0 && result.old === 0) {
        setTimeout(() => {
          handleDismiss();
        }, 3000);
      }
    } catch (error) {
      logger.error('StorageWarning', 'Cleanup failed', error);
    } finally {
      setIsCleaningUp(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const bannerClass = `${styles.banner} ${styles[warning.level]}`;

  return (
    <div className={bannerClass} role="alert" aria-live="polite">
      <div className={styles.content}>
        {/* Icon */}
        <div className={styles.icon}>{warning.level === 'critical' ? '⚠️' : 'ℹ️'}</div>

        {/* Message */}
        <div className={styles.message}>
          <div className={styles.title}>{warning.message}</div>

          {/* Suggestions */}
          {warning.suggestions.length > 0 && (
            <ul className={styles.suggestions}>
              {warning.suggestions.map((suggestion) => (
                <li key={suggestion}>{suggestion}</li>
              ))}
            </ul>
          )}

          {/* Cleanup Result */}
          {cleanupResult && (
            <div className={styles.result}>
              ✅ Cleanup complete: Removed {cleanupResult.orphaned} orphaned assets
              {cleanupResult.old > 0 && ` and ${cleanupResult.old} old assets`}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button
            type="button"
            onClick={handleCleanup}
            disabled={isCleaningUp}
            className={styles.cleanupButton}
            aria-label="Clean up unused assets"
          >
            {isCleaningUp ? 'Cleaning...' : 'Clean Up'}
          </button>

          {dismissible && (
            <button
              type="button"
              onClick={handleDismiss}
              className={styles.dismissButton}
              aria-label="Dismiss warning"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar (if quota info available) */}
      {warning.quota && (
        <div
          className={styles.progressBar}
          role="progressbar"
          aria-valuenow={Math.round(warning.quota.percentage)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Storage usage: ${Math.round(warning.quota.percentage)}%`}
        >
          <div className={styles.progressFill} style={{ width: `${warning.quota.percentage}%` }} />
        </div>
      )}
    </div>
  );
}

export default StorageWarning;
