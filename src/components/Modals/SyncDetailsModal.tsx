/**
 * Blood on the Clocktower Token Generator
 * Sync Details Modal - Detailed sync information and controls
 *
 * Features:
 * - Display current version and data source
 * - Show cache statistics
 * - Manual update check button
 * - Clear cache option
 * - Error details and retry button
 *
 * Migrated to use unified Modal, Button, and Alert components.
 */

import { useCallback, useEffect, useState } from 'react';
import { useDataSync } from '../../contexts/DataSyncContext';
import styles from '../../styles/components/modals/SyncDetailsModal.module.css';
import CONFIG from '../../ts/config.js';
import { storageManager } from '../../ts/sync/index.js';
import { Modal } from '../Shared/ModalBase/Modal';
import { Alert } from '../Shared/UI/Alert';
import { Button } from '../Shared/UI/Button';

interface SyncDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CacheStats {
  characterCount: number;
  storageUsed: number;
  storageQuota: number;
  cacheAge: string | null;
}

export function SyncDetailsModal({ isOpen, onClose }: SyncDetailsModalProps) {
  const { status, isInitialized, checkForUpdates, downloadUpdate, clearCacheAndResync } =
    useDataSync();
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [cacheStats, setCacheStats] = useState<CacheStats>({
    characterCount: 0,
    storageUsed: 0,
    storageQuota: 0,
    cacheAge: null,
  });

  const loadCacheStats = useCallback(async () => {
    try {
      const characters = await storageManager.getAllCharacters();
      const quota = await storageManager.getStorageQuota();
      const lastSyncTimestamp = (await storageManager.getMetadata('lastSync')) as number | null;

      setCacheStats({
        characterCount: characters.length,
        storageUsed: quota.usage,
        storageQuota: quota.quota,
        cacheAge: lastSyncTimestamp ? formatTimeSince(new Date(lastSyncTimestamp)) : null,
      });
    } catch (error) {
      console.error('[SyncDetailsModal] Failed to load cache stats:', error);
    }
  }, []);

  // Load cache statistics
  useEffect(() => {
    if (isOpen && isInitialized) {
      loadCacheStats();
    }
  }, [isOpen, isInitialized, loadCacheStats]);

  const handleCheckForUpdates = useCallback(async () => {
    try {
      setIsChecking(true);
      const hasUpdate = await checkForUpdates();
      if (!hasUpdate) {
        alert('You are already on the latest version!');
      }
    } catch (error) {
      console.error('[SyncDetailsModal] Update check failed:', error);
      alert('Failed to check for updates. Please try again.');
    } finally {
      setIsChecking(false);
    }
  }, [checkForUpdates]);

  const handleDownloadUpdate = useCallback(async () => {
    try {
      setIsDownloading(true);
      await downloadUpdate();
      await loadCacheStats(); // Refresh stats after download
      alert('Update installed successfully!');
    } catch (error) {
      console.error('[SyncDetailsModal] Download failed:', error);
      alert('Failed to download update. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  }, [downloadUpdate, loadCacheStats]);

  const handleClearCache = useCallback(async () => {
    if (
      !confirm(
        'Are you sure you want to clear the cache? This will re-download all character data.'
      )
    ) {
      return;
    }

    try {
      setIsClearing(true);
      await clearCacheAndResync();
      await loadCacheStats(); // Refresh stats after clearing
      alert('Cache cleared and data resynced successfully!');
    } catch (error) {
      console.error('[SyncDetailsModal] Clear cache failed:', error);
      alert('Failed to clear cache. Please try again.');
    } finally {
      setIsClearing(false);
    }
  }, [clearCacheAndResync, loadCacheStats]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`;
  };

  const getDataSourceLabel = () => {
    switch (status.dataSource) {
      case 'github':
        return 'GitHub Releases';
      case 'cache':
        return 'Local Cache';
      case 'api':
        return 'Legacy API';
      default:
        return 'Offline';
    }
  };

  const getStatusLabel = () => {
    switch (status.state) {
      case 'success':
        return 'Synced';
      case 'checking':
        return 'Checking for updates...';
      case 'downloading':
        return 'Downloading...';
      case 'extracting':
        return 'Installing...';
      case 'error':
        return 'Error';
      default:
        return 'Idle';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Data Synchronization" size="medium">
      {/* Status Section */}
      <section className={styles.section}>
        <h3>Status</h3>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.label}>Current Status:</span>
            <span className={`${styles.value} ${styles[status.state]}`}>{getStatusLabel()}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.label}>Data Source:</span>
            <span className={styles.value}>{getDataSourceLabel()}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.label}>Current Version:</span>
            <span className={styles.value}>
              {status.currentVersion ? (
                <a
                  href={`https://github.com/${CONFIG.SYNC.GITHUB_REPO}/releases/tag/${status.currentVersion}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.versionLink}
                >
                  {status.currentVersion}
                </a>
              ) : (
                'Unknown'
              )}
            </span>
          </div>
          {status.lastSync && (
            <div className={styles.infoItem}>
              <span className={styles.label}>Last Sync:</span>
              <span className={styles.value}>{status.lastSync.toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Update Available */}
        {status.availableVersion && status.availableVersion !== status.currentVersion && (
          <Alert variant="info" style={{ marginTop: 'var(--spacing-md)' }}>
            <strong>Update Available:</strong> {status.availableVersion}
            <Button
              variant="accent"
              size="small"
              onClick={handleDownloadUpdate}
              loading={isDownloading}
              loadingText="Downloading..."
              style={{ marginLeft: 'var(--spacing-md)' }}
            >
              Download Now
            </Button>
          </Alert>
        )}

        {/* Error */}
        {status.error && (
          <Alert variant="error" style={{ marginTop: 'var(--spacing-md)' }}>
            {status.error}
          </Alert>
        )}
      </section>

      {/* Cache Statistics */}
      <section className={styles.section}>
        <h3>Cache Statistics</h3>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.label}>Characters Cached:</span>
            <span className={styles.value}>{cacheStats.characterCount}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.label}>Storage Used:</span>
            <span className={styles.value}>{formatBytes(cacheStats.storageUsed)}</span>
          </div>
          {cacheStats.cacheAge && (
            <div className={styles.infoItem}>
              <span className={styles.label}>Cache Age:</span>
              <span className={styles.value}>{cacheStats.cacheAge}</span>
            </div>
          )}
        </div>
      </section>

      {/* Actions */}
      <section className={styles.section}>
        <h3>Actions</h3>
        <div className={styles.actions}>
          <Button
            variant="secondary"
            onClick={handleCheckForUpdates}
            loading={isChecking}
            loadingText="Checking..."
          >
            Check for Updates
          </Button>
          <Button
            variant="danger"
            onClick={handleClearCache}
            loading={isClearing}
            loadingText="Clearing..."
          >
            Clear Cache & Resync
          </Button>
        </div>
      </section>
    </Modal>
  );
}

/**
 * Format time difference in human-readable format
 */
function formatTimeSince(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) {
    return 'just now';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}
