/**
 * Blood on the Clocktower Token Generator
 * Sync Progress Bar - Visual progress indicator for downloads
 *
 * Features:
 * - Appears at top of viewport during downloads
 * - Shows progress percentage and data transferred
 * - Animated progress bar
 * - Dismissible (hides when complete or on error)
 */

import { useEffect, useState } from 'react';
import { useDataSync } from '../../../contexts/DataSyncContext';
import styles from '../../../styles/components/shared/SyncProgressBar.module.css';
import type { SyncEvent } from '../../../ts/sync/index.js';

export function SyncProgressBar() {
  const { status, subscribeToEvents } = useDataSync();
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState<string>('');

  // Subscribe to sync events for progress updates
  useEffect(() => {
    const unsubscribe = subscribeToEvents((event: SyncEvent) => {
      // Show progress bar when downloading/extracting
      if (event.type === 'downloading') {
        setIsVisible(true);
        setMessage('Downloading update...');
        if (event.data?.progress) {
          setProgress(event.data.progress);
        }
      } else if (event.type === 'extracting') {
        setIsVisible(true);
        setMessage('Installing update...');
        setProgress(null); // No progress for extraction
      } else if (event.type === 'progress' && event.data?.progress) {
        setProgress(event.data.progress);
      } else if (event.type === 'success') {
        // Keep visible for a moment to show completion
        setMessage('Update complete!');
        setTimeout(() => {
          setIsVisible(false);
          setProgress(null);
        }, 2000);
      } else if (event.type === 'error') {
        setMessage('Download failed');
        setTimeout(() => {
          setIsVisible(false);
          setProgress(null);
        }, 3000);
      }
    });

    return unsubscribe;
  }, [subscribeToEvents]);

  // Auto-hide if not downloading/extracting
  useEffect(() => {
    if (status.state !== 'downloading' && status.state !== 'extracting' && isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setProgress(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status.state, isVisible]);

  const getPercentage = (): number => {
    if (!progress || progress.total === 0) return 0;
    return Math.round((progress.current / progress.total) * 100);
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`;
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setProgress(null);
  };

  if (!isVisible) return null;

  const percentage = getPercentage();
  const isIndeterminate = !progress || progress.total === 0;

  return (
    <div className={styles.container}>
      <div className={styles.progressBar}>
        <div className={styles.info}>
          <span className={styles.message}>{message}</span>
          {progress && progress.total > 0 && (
            <span className={styles.stats}>
              {formatBytes(progress.current)} / {formatBytes(progress.total)} ({percentage}%)
            </span>
          )}
        </div>

        <div className={styles.barContainer}>
          <div
            className={`${styles.bar} ${isIndeterminate ? styles.indeterminate : ''}`}
            style={!isIndeterminate ? { width: `${percentage}%` } : undefined}
            role="progressbar"
            aria-valuenow={percentage}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>

        <button
          type="button"
          className={styles.dismissButton}
          onClick={handleDismiss}
          aria-label="Dismiss progress bar"
          title="Hide progress"
        >
          ×
        </button>
      </div>
    </div>
  );
}
