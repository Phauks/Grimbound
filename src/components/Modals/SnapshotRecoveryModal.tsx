/**
 * Blood on the Clocktower Token Generator
 * Snapshot Recovery Modal - Browse and restore auto-save snapshots
 *
 * Features:
 * - Lists all snapshots for current project
 * - Shows snapshot timestamp and character count
 * - Preview snapshot contents
 * - Restore snapshot to current project
 * - Delete individual snapshots
 */

import { useCallback, useEffect, useState } from 'react';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useProjectDatabaseService } from '@/contexts/ServiceContext';
import { useTokenContext } from '@/contexts/TokenContext';
import styles from '@/styles/components/modals/SnapshotRecoveryModal.module.css';
import type { AutoSaveSnapshot } from '@/ts/types/project.js';
import { logger } from '@/ts/utils/index.js';

interface SnapshotRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SnapshotRecoveryModal({ isOpen, onClose }: SnapshotRecoveryModalProps) {
  // Get service from DI context
  const projectDatabaseService = useProjectDatabaseService();

  const { currentProject, setCurrentProject } = useProjectContext();
  const { setCharacters, setScriptMeta, setJsonInput, clearAllMetadata } = useTokenContext();

  const [snapshots, setSnapshots] = useState<AutoSaveSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<AutoSaveSnapshot | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const loadSnapshots = useCallback(async () => {
    if (!currentProject) return;

    try {
      setIsLoading(true);
      setError(null);

      logger.debug('SnapshotRecoveryModal', 'Loading snapshots', {
        projectId: currentProject.id,
      });

      const loadedSnapshots = await projectDatabaseService.loadSnapshots(currentProject.id);

      // Sort by timestamp descending (newest first)
      loadedSnapshots.sort((a, b) => b.timestamp - a.timestamp);

      setSnapshots(loadedSnapshots);

      logger.info('SnapshotRecoveryModal', 'Snapshots loaded', {
        count: loadedSnapshots.length,
      });
    } catch (err) {
      logger.error('SnapshotRecoveryModal', 'Failed to load snapshots', err);
      setError('Failed to load snapshots. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [currentProject, projectDatabaseService]);

  // Load snapshots when modal opens
  useEffect(() => {
    if (isOpen && currentProject) {
      loadSnapshots();
    }
  }, [isOpen, currentProject?.id, currentProject, loadSnapshots]);

  const handleRestore = useCallback((snapshot: AutoSaveSnapshot) => {
    setSelectedSnapshot(snapshot);
    setShowConfirm(true);
  }, []);

  const confirmRestore = useCallback(async () => {
    if (!(selectedSnapshot && currentProject)) return;

    try {
      setIsLoading(true);
      setError(null);

      logger.info('SnapshotRecoveryModal', 'Restoring snapshot', {
        snapshotId: selectedSnapshot.id,
        timestamp: selectedSnapshot.timestamp,
      });

      // Restore state from snapshot
      const state = selectedSnapshot.stateSnapshot;

      // Update TokenContext
      setCharacters(state.characters || []);
      setScriptMeta(state.scriptMeta || null);
      setJsonInput(state.jsonInput || '');
      clearAllMetadata();

      // Update project in database
      const updatedProject = {
        ...currentProject,
        state,
        lastModifiedAt: Date.now(),
        lastAccessedAt: Date.now(),
      };

      await projectDatabaseService.saveProject(updatedProject);
      setCurrentProject(updatedProject);

      logger.info('SnapshotRecoveryModal', 'Snapshot restored successfully');

      // Close modal
      setShowConfirm(false);
      onClose();
    } catch (err) {
      logger.error('SnapshotRecoveryModal', 'Failed to restore snapshot', err);
      setError('Failed to restore snapshot. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedSnapshot,
    currentProject,
    projectDatabaseService,
    setCharacters,
    setScriptMeta,
    setJsonInput,
    clearAllMetadata,
    setCurrentProject,
    onClose,
  ]);

  const cancelRestore = useCallback(() => {
    setSelectedSnapshot(null);
    setShowConfirm(false);
  }, []);

  const formatTimestamp = useCallback((timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    // Relative time for recent snapshots
    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }

    // Absolute time for older snapshots
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: 'numeric',
      minute: '2-digit',
    });
  }, []);

  const getSnapshotSummary = useCallback((snapshot: AutoSaveSnapshot): string => {
    const state = snapshot.stateSnapshot;
    const charCount = state.characters?.length || 0;
    const scriptName = state.scriptMeta?.name || 'Unnamed script';

    return `${charCount} character${charCount !== 1 ? 's' : ''} • ${scriptName}`;
  }, []);

  if (!isOpen) return null;

  return (
    <button
      type="button"
      className={styles.overlay}
      onClick={onClose}
      aria-label="Close modal"
      onKeyDown={(e) => {
        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClose();
        }
      }}
      tabIndex={0}
      style={{ all: 'unset' }}
    >
      <div
        className={styles.modal}
        role="dialog"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            // Optionally close modal or handle as needed
          }
        }}
        aria-modal="true"
      >
        {/* Header */}
        <div className={styles.header}>
          <h2>Version History</h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {isLoading && !showConfirm && (
            <div className={styles.loading}>
              <div className={styles.spinner} />
              <p>Loading snapshots...</p>
            </div>
          )}

          {error && (
            <div className={styles.error}>
              <p>{error}</p>
              <button type="button" className={styles.retryButton} onClick={loadSnapshots}>
                Retry
              </button>
            </div>
          )}

          {!(isLoading || error) && snapshots.length === 0 && (
            <div className={styles.empty}>
              <p>No snapshots found.</p>
              <p className={styles.hint}>
                Snapshots are created automatically every time you save.
              </p>
            </div>
          )}

          {!(isLoading || error) && snapshots.length > 0 && !showConfirm && (
            <div className={styles.list}>
              <p className={styles.info}>
                {snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''} available (showing
                last 10)
              </p>

              {snapshots.map((snapshot) => (
                <div key={snapshot.id} className={styles.snapshotItem}>
                  <div className={styles.snapshotInfo}>
                    <div className={styles.snapshotTime}>{formatTimestamp(snapshot.timestamp)}</div>
                    <div className={styles.snapshotSummary}>{getSnapshotSummary(snapshot)}</div>
                  </div>
                  <button
                    type="button"
                    className={styles.restoreButton}
                    onClick={() => handleRestore(snapshot)}
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Confirmation Dialog */}
          {showConfirm && selectedSnapshot && (
            <div className={styles.confirm}>
              <h3>Restore Snapshot?</h3>
              <p>
                This will replace your current project state with the snapshot from{' '}
                <strong>{formatTimestamp(selectedSnapshot.timestamp)}</strong>.
              </p>
              <p className={styles.warning}>
                ⚠️ Your current unsaved changes will be lost. This action cannot be undone.
              </p>
              <div className={styles.confirmButtons}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={cancelRestore}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.confirmButton}
                  onClick={confirmRestore}
                  disabled={isLoading}
                >
                  {isLoading ? 'Restoring...' : 'Restore'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
