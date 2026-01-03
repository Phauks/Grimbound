/**
 * Settings Modal
 *
 * Global application settings including sync and data management.
 * Theme selection has moved to the header ThemeSelector component.
 */

import { useEffect, useState } from 'react';
import { Modal } from '@/components/Shared/ModalBase/Modal';
import { Button } from '@/components/Shared/UI/Button';
import { useDataSync } from '@/contexts/DataSyncContext';
import { useToast } from '@/contexts/ToastContext';
import { useTokenContext } from '@/contexts/TokenContext';
import { storageManager } from '@/ts/sync/index.js';
import type { MeasurementUnit } from '@/ts/types/index';
import { logger } from '@/ts/utils/logger.js';
import styles from './SettingsModal.module.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSyncDetails?: () => void;
}

export function SettingsModal({ isOpen, onClose, onOpenSyncDetails }: SettingsModalProps) {
  const { addToast } = useToast();
  const { generationOptions, updateGenerationOptions } = useTokenContext();
  const { status: syncStatus, isInitialized: isSyncInitialized } = useDataSync();
  const [autoSync, setAutoSync] = useState(true);

  // Load auto-sync setting from storage
  useEffect(() => {
    if (isOpen && isSyncInitialized) {
      storageManager.getSetting('autoSync').then((value) => {
        if (value !== null) {
          setAutoSync(value as boolean);
        }
      });
    }
  }, [isOpen, isSyncInitialized]);

  const handleAutoSyncChange = async (enabled: boolean) => {
    try {
      await storageManager.setSetting('autoSync', enabled);
      setAutoSync(enabled);
      addToast(`Auto-sync ${enabled ? 'enabled' : 'disabled'}`, 'success');
    } catch (error) {
      logger.error('SettingsModal', 'Failed to update auto-sync setting', error);
      addToast('Failed to update setting', 'error');
    }
  };

  const handleOpenSyncDetails = () => {
    if (onOpenSyncDetails) {
      onClose();
      setTimeout(() => onOpenSyncDetails(), 100);
    }
  };

  const handleWipeData = () => {
    if (confirm('Are you sure you want to clear all local data? This cannot be undone.')) {
      localStorage.clear();
      addToast('All local data has been cleared', 'success');
      onClose();
      setTimeout(() => window.location.reload(), 500);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Global Settings" size="large">
      <div className={styles.columns}>
        {/* Left Column - General Settings */}
        <div className={styles.columnLeft}>
          <div className={styles.optionGroup}>
            <label className={styles.label} htmlFor="measurementUnit">
              Measurement Units
            </label>
            <div className={styles.selectWrapper}>
              <select
                id="measurementUnit"
                className={styles.select}
                value={generationOptions.measurementUnit || 'inches'}
                onChange={(e) =>
                  updateGenerationOptions({ measurementUnit: e.target.value as MeasurementUnit })
                }
              >
                <option value="inches">Inches (in)</option>
                <option value="millimeters">Millimeters (mm)</option>
              </select>
              <span className={styles.helpText}>
                Choose your preferred unit for offset and dimension measurements
              </span>
            </div>
          </div>
        </div>

        {/* Right Column - Data Sync & Management */}
        <div className={styles.columnRight}>
          {/* Data Synchronization Section */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Data Synchronization</h3>
            <div className={styles.syncInfo}>
              <p className={styles.syncStatus}>
                Status:{' '}
                <strong>{syncStatus.state === 'success' ? '✓ Synced' : syncStatus.state}</strong>
                {syncStatus.currentVersion && <span> • Version {syncStatus.currentVersion}</span>}
              </p>
              <p className={styles.syncSource}>
                Source:{' '}
                {syncStatus.dataSource === 'github'
                  ? 'GitHub Releases'
                  : syncStatus.dataSource === 'cache'
                    ? 'Local Cache'
                    : syncStatus.dataSource === 'offline'
                      ? 'Offline'
                      : 'Unknown'}
              </p>
            </div>

            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => handleAutoSyncChange(e.target.checked)}
                disabled={!isSyncInitialized}
              />
              <span>Automatically check for updates</span>
            </label>
            <span className={styles.helpText}>
              When enabled, the app will periodically check for new character data from GitHub
            </span>

            <Button
              variant="secondary"
              onClick={handleOpenSyncDetails}
              style={{ marginTop: 'var(--spacing-md)' }}
            >
              ⚙️ View Sync Details
            </Button>
          </div>

          {/* Data Management Section */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Data Management</h3>
            <Button variant="danger" onClick={handleWipeData}>
              🗑️ Delete All Local Data
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
