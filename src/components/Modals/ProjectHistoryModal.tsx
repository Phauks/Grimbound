/**
 * Project History Modal
 *
 * Unified timeline view combining manual versions and auto-save snapshots.
 * Shows complete project history with diff viewing capability.
 *
 * Features:
 * - Combined timeline of versions + snapshots (chronologically sorted)
 * - Visual distinction between version types
 * - Diff viewer showing what changed from current state
 * - Restore functionality for both versions and snapshots
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { useProjects } from '../../hooks/useProjects';
import styles from '../../styles/components/modals/ProjectHistoryModal.module.css';
import { projectDb } from '../../ts/db/projectDb';
import type { AutoSaveSnapshot, Project, ProjectVersion } from '../../ts/types/project';
import { logger } from '../../ts/utils/logger';
import { calculateProjectDiff, getDiffSummary } from '../../ts/utils/projectDiff';
import { Modal } from '../Shared/ModalBase/Modal';
import { Button } from '../Shared/UI/Button';

interface ProjectHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

type TimelineItem =
  | { type: 'version'; data: ProjectVersion; timestamp: number }
  | { type: 'snapshot'; data: AutoSaveSnapshot; timestamp: number };

type TimelineTab = 'all' | 'versions' | 'snapshots';

export function ProjectHistoryModal({ isOpen, onClose, project }: ProjectHistoryModalProps) {
  const { updateProject } = useProjects();
  const { addToast } = useToast();

  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [snapshots, setSnapshots] = useState<AutoSaveSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<TimelineItem | null>(null);
  const [activeTab, setActiveTab] = useState<TimelineTab>('all');

  // Load auto-save snapshots from database
  const loadAutoSaveSnapshots = useCallback(
    async (projectId: string): Promise<AutoSaveSnapshot[]> => {
      const dbSnapshots = await projectDb.autoSaveSnapshots
        .where('projectId')
        .equals(projectId)
        .reverse()
        .sortBy('timestamp');

      return dbSnapshots.map((snap) => ({
        id: snap.id,
        projectId: snap.projectId,
        timestamp: snap.timestamp,
        stateSnapshot: JSON.parse(snap.stateJson),
      }));
    },
    []
  );

  const loadHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      logger.info('ProjectHistoryModal', 'Loading history', { projectId: project.id });

      const [loadedVersions, loadedSnapshots] = await Promise.all([
        projectDb.loadProjectVersions(project.id),
        loadAutoSaveSnapshots(project.id),
      ]);

      setVersions(loadedVersions);
      setSnapshots(loadedSnapshots);
      logger.info(
        'ProjectHistoryModal',
        `Loaded ${loadedVersions.length} versions, ${loadedSnapshots.length} snapshots`
      );
    } catch (error) {
      logger.error('ProjectHistoryModal', 'Failed to load history', error);
      addToast('Failed to load project history', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [project.id, addToast, loadAutoSaveSnapshots]);

  // Load history on mount
  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, loadHistory]);

  // Combine and sort timeline items, filtered by active tab
  const timeline = useMemo(() => {
    const items: TimelineItem[] = [];

    // Filter based on active tab
    if (activeTab === 'all' || activeTab === 'versions') {
      items.push(
        ...versions.map((v) => ({ type: 'version' as const, data: v, timestamp: v.createdAt }))
      );
    }
    if (activeTab === 'all' || activeTab === 'snapshots') {
      items.push(
        ...snapshots.map((s) => ({ type: 'snapshot' as const, data: s, timestamp: s.timestamp }))
      );
    }

    return items.sort((a, b) => b.timestamp - a.timestamp);
  }, [versions, snapshots, activeTab]);

  // Calculate diff for selected item
  const selectedDiff = useMemo(() => {
    if (!selectedItem) return null;

    const itemState =
      selectedItem.type === 'version'
        ? selectedItem.data.stateSnapshot
        : selectedItem.data.stateSnapshot;

    return calculateProjectDiff(itemState, project.state);
  }, [selectedItem, project.state]);

  const handleRestore = async (item: TimelineItem) => {
    const itemType = item.type === 'version' ? 'version' : 'snapshot';
    const itemLabel =
      item.type === 'version'
        ? `version ${item.data.versionNumber}`
        : `snapshot from ${formatTimestamp(item.timestamp)}`;

    if (!confirm(`Restore project to ${itemLabel}? Your current state will be replaced.`)) {
      return;
    }

    try {
      logger.info('ProjectHistoryModal', `Restoring ${itemType}`, {
        projectId: project.id,
        itemId: item.data.id,
      });

      const stateToRestore =
        item.type === 'version' ? item.data.stateSnapshot : item.data.stateSnapshot;

      await updateProject(project.id, {
        state: stateToRestore,
      });

      addToast(`Restored to ${itemLabel}`, 'success');
      onClose();
    } catch (error) {
      logger.error('ProjectHistoryModal', `Failed to restore ${itemType}`, error);
      addToast(`Failed to restore ${itemType}`, 'error');
    }
  };

  const handleDeleteVersion = async (versionId: string) => {
    if (!confirm('Delete this version? This cannot be undone.')) {
      return;
    }

    try {
      await projectDb.deleteProjectVersion(versionId);
      await loadHistory();
      setSelectedItem(null);
      addToast('Version deleted', 'success');
    } catch (error) {
      logger.error('ProjectHistoryModal', 'Failed to delete version', error);
      addToast('Failed to delete version', 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Project History" size="large">
      <div className={styles.container}>
        {/* Left Panel: Timeline */}
        <div className={styles.timeline}>
          <div className={styles.timelineHeader}>
            <h3>Timeline</h3>
            <p className={styles.timelineCount}>
              {versions.length} version{versions.length !== 1 ? 's' : ''}, {snapshots.length}{' '}
              snapshot{snapshots.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Tab Navigation */}
          <div className={styles.tabNav}>
            <button
              type="button"
              className={`${styles.tab} ${activeTab === 'all' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All ({versions.length + snapshots.length})
            </button>
            <button
              type="button"
              className={`${styles.tab} ${activeTab === 'versions' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('versions')}
            >
              🏷️ Versions ({versions.length})
            </button>
            <button
              type="button"
              className={`${styles.tab} ${activeTab === 'snapshots' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('snapshots')}
            >
              💾 Auto-Save ({snapshots.length})
            </button>
          </div>

          {isLoading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}>⟳</div>
              <p>Loading history...</p>
            </div>
          ) : timeline.length === 0 ? (
            <div className={styles.empty}>
              <p>No history yet</p>
            </div>
          ) : (
            <div className={styles.timelineList}>
              {timeline.map((item) => (
                <TimelineItemCard
                  key={`${item.type}-${item.data.id}`}
                  item={item}
                  isSelected={selectedItem?.data.id === item.data.id}
                  onSelect={() => setSelectedItem(item)}
                  onRestore={() => handleRestore(item)}
                  onDelete={
                    item.type === 'version' ? () => handleDeleteVersion(item.data.id) : undefined
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Panel: Details/Diff */}
        <div className={styles.details}>
          {!selectedItem ? (
            <div className={styles.emptyDetails}>
              <p>Select an item from the timeline to view details</p>
            </div>
          ) : (
            <div className={styles.detailsContent}>
              <div className={styles.detailsHeader}>
                <h3>
                  {selectedItem.type === 'version'
                    ? `Version ${selectedItem.data.versionNumber}`
                    : 'Auto-Save Snapshot'}
                </h3>
                <p className={styles.detailsTimestamp}>{formatTimestamp(selectedItem.timestamp)}</p>
              </div>

              {/* Release Notes (versions only) */}
              {selectedItem.type === 'version' && selectedItem.data.releaseNotes && (
                <div className={styles.releaseNotes}>
                  <h4>Release Notes</h4>
                  <p>{selectedItem.data.releaseNotes}</p>
                </div>
              )}

              {/* Diff Summary */}
              {selectedDiff && (
                <div className={styles.diff}>
                  <h4>Changes from Current State</h4>
                  {!selectedDiff.hasChanges ? (
                    <p className={styles.noChanges}>✓ Identical to current state</p>
                  ) : (
                    <>
                      <p className={styles.diffSummary}>{getDiffSummary(selectedDiff)}</p>

                      {/* Character Changes */}
                      {(selectedDiff.characters.added.length > 0 ||
                        selectedDiff.characters.removed.length > 0 ||
                        selectedDiff.characters.modified.length > 0) && (
                        <div className={styles.diffSection}>
                          <h5>Characters</h5>
                          {selectedDiff.characters.added.length > 0 && (
                            <div className={styles.diffItem}>
                              <span className={styles.diffLabel}>Added:</span>
                              <span>
                                {selectedDiff.characters.added.map((c) => c.name).join(', ')}
                              </span>
                            </div>
                          )}
                          {selectedDiff.characters.removed.length > 0 && (
                            <div className={styles.diffItem}>
                              <span className={styles.diffLabel}>Removed:</span>
                              <span>
                                {selectedDiff.characters.removed.map((c) => c.name).join(', ')}
                              </span>
                            </div>
                          )}
                          {selectedDiff.characters.modified.length > 0 && (
                            <div className={styles.diffItem}>
                              <span className={styles.diffLabel}>Modified:</span>
                              <span>
                                {selectedDiff.characters.modified.length} character
                                {selectedDiff.characters.modified.length !== 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Script Meta Changes */}
                      {selectedDiff.scriptMeta.changed && (
                        <div className={styles.diffSection}>
                          <h5>Script Metadata</h5>
                          {selectedDiff.scriptMeta.fields.name && (
                            <div className={styles.diffItem}>
                              <span className={styles.diffLabel}>Name:</span>
                              <span>
                                {selectedDiff.scriptMeta.fields.name.old || '(none)'} →{' '}
                                {selectedDiff.scriptMeta.fields.name.new || '(none)'}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ==========================================================================
// Timeline Item Card
// ==========================================================================

interface TimelineItemCardProps {
  item: TimelineItem;
  isSelected: boolean;
  onSelect: () => void;
  onRestore: () => void;
  onDelete?: () => void;
}

function TimelineItemCard({
  item,
  isSelected,
  onSelect,
  onRestore,
  onDelete,
}: TimelineItemCardProps) {
  const isVersion = item.type === 'version';

  return (
    <button
      type="button"
      className={`${styles.timelineItem} ${isSelected ? styles.selected : ''} ${isVersion ? styles.version : styles.snapshot}`}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      tabIndex={0}
      aria-pressed={isSelected}
      style={{
        width: '100%',
        textAlign: 'left',
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
      }}
    >
      <div className={styles.itemHeader}>
        <div className={styles.itemType}>
          {isVersion ? (
            <>
              <span className={styles.typeIcon}>🏷️</span>
              <span className={styles.typeLabelVersion}>v{item.data.versionNumber}</span>
            </>
          ) : (
            <>
              <span className={styles.typeIcon}>💾</span>
              <span className={styles.typeLabel}>Snapshot</span>
            </>
          )}
        </div>
        <span className={styles.itemTimestamp}>{formatTimestamp(item.timestamp)}</span>
      </div>

      {isVersion && item.data.releaseNotes && (
        <p className={styles.itemNotes}>{item.data.releaseNotes}</p>
      )}

      <div className={styles.itemActions}>
        <Button
          variant="secondary"
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onRestore();
          }}
        >
          ↩️ Restore
        </Button>
        {onDelete && (
          <Button
            variant="danger"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            🗑️ Delete
          </Button>
        )}
      </div>
    </button>
  );
}

// ==========================================================================
// Helpers
// ==========================================================================

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
