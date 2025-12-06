/**
 * Blood on the Clocktower Token Generator
 * Sync Status Indicator - Small visual indicator showing data sync status
 *
 * Features:
 * - Shows current sync state (synced, checking, downloading, error, offline)
 * - Color-coded status badge
 * - Tooltip with detailed information
 * - Clickable to open SyncDetailsModal
 */

import { useState, useCallback } from 'react';
import { useDataSync } from '../../contexts/DataSyncContext';
import type { SyncState } from '../../ts/types/index.js';
import styles from '../../styles/components/shared/SyncStatusIndicator.module.css';

interface SyncStatusIndicatorProps {
  onDetailsClick?: () => void;
}

export function SyncStatusIndicator({ onDetailsClick }: SyncStatusIndicatorProps) {
  const { status, isInitialized } = useDataSync();
  const [showTooltip, setShowTooltip] = useState(false);

  const getStatusInfo = useCallback((state: SyncState): { label: string; icon: string; color: string } => {
    switch (state) {
      case 'success':
        return { label: 'Synced', icon: '✓', color: 'success' };
      case 'checking':
        return { label: 'Checking', icon: '⟳', color: 'info' };
      case 'downloading':
        return { label: 'Downloading', icon: '↓', color: 'info' };
      case 'extracting':
        return { label: 'Installing', icon: '⚙', color: 'info' };
      case 'error':
        return { label: 'Error', icon: '!', color: 'error' };
      case 'idle':
      default:
        return { label: 'Offline', icon: '○', color: 'idle' };
    }
  }, []);

  const statusInfo = getStatusInfo(status.state);

  const getTooltipText = useCallback(() => {
    const lines: string[] = [];

    // Status
    lines.push(`Status: ${statusInfo.label}`);

    // Version
    if (status.currentVersion) {
      lines.push(`Version: ${status.currentVersion}`);
    }

    // Data source
    if (status.dataSource && status.dataSource !== 'offline') {
      const sourceLabel = status.dataSource === 'github' ? 'GitHub' :
                          status.dataSource === 'cache' ? 'Cached' :
                          status.dataSource === 'api' ? 'API' : 'Unknown';
      lines.push(`Source: ${sourceLabel}`);
    }

    // Last sync
    if (status.lastSync) {
      const timeSince = formatTimeSince(status.lastSync);
      lines.push(`Last sync: ${timeSince}`);
    }

    // Update available
    if (status.availableVersion && status.availableVersion !== status.currentVersion) {
      lines.push(`Update available: ${status.availableVersion}`);
    }

    // Error
    if (status.error) {
      lines.push(`Error: ${status.error}`);
    }

    return lines.join('\n');
  }, [status, statusInfo.label]);

  const handleClick = useCallback(() => {
    if (onDetailsClick) {
      onDetailsClick();
    }
  }, [onDetailsClick]);

  if (!isInitialized) {
    return null; // Don't show until initialized
  }

  return (
    <button
      type="button"
      className={`${styles.indicator} ${styles[statusInfo.color]}`}
      onClick={handleClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      aria-label={`Sync status: ${statusInfo.label}`}
      title={getTooltipText()}
    >
      <span className={styles.icon} aria-hidden="true">
        {statusInfo.icon}
      </span>
      <span className={styles.label}>{statusInfo.label}</span>

      {/* Update badge */}
      {status.availableVersion && status.availableVersion !== status.currentVersion && (
        <span className={styles.updateBadge} aria-label="Update available">
          1
        </span>
      )}

      {/* Tooltip */}
      {showTooltip && (
        <div className={styles.tooltip} role="tooltip">
          {getTooltipText().split('\n').map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}
    </button>
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
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
