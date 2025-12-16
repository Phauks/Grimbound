/**
 * Blood on the Clocktower Token Generator
 * Auto-Save Status Indicator - Visual indicator showing project auto-save status
 *
 * Features:
 * - Shows current auto-save state (idle, saving, saved, error)
 * - Color-coded status badge
 * - Tooltip with last saved timestamp
 * - Manual "Save Now" button
 */

import { useCallback, useState } from 'react';
import { useProjectContext } from '../../../contexts/ProjectContext';
import styles from '../../../styles/components/shared/AutoSaveIndicator.module.css';
import type { AutoSaveStatus } from '../../../ts/types/project.js';
import { ProjectHistoryModal } from '../../Modals/ProjectHistoryModal';

export function AutoSaveIndicator() {
  const { currentProject, autoSaveStatus, lastSavedAt } = useProjectContext();
  const [showTooltip, setShowTooltip] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Determine if auto-save is enabled (has active project)
  const isAutoSaveEnabled = !!currentProject;

  const getStatusInfo = useCallback(
    (status: AutoSaveStatus): { label: string; icon: string; color: string } => {
      if (!isAutoSaveEnabled) {
        return { label: 'No Project', icon: '⚠', color: 'warning' };
      }

      switch (status.state) {
        case 'saving':
          return { label: 'Saving...', icon: '⟳', color: 'info' };
        case 'saved':
          return { label: 'Saved', icon: '✓', color: 'success' };
        case 'error':
          return { label: 'Error', icon: '!', color: 'error' };
        default:
          if (status.isDirty) {
            return { label: 'Unsaved', icon: '●', color: 'warning' };
          }
          return { label: 'Idle', icon: '○', color: 'idle' };
      }
    },
    [isAutoSaveEnabled]
  );

  const statusInfo = getStatusInfo(autoSaveStatus);

  const getTooltipText = () => {
    const lines: string[] = [];

    // Project name
    if (currentProject) {
      lines.push(`Project: ${currentProject.name}`);
    } else {
      lines.push('No active project');
    }

    // Status
    lines.push(`Status: ${statusInfo.label}`);

    // Helpful message when no project is active
    if (!isAutoSaveEnabled) {
      lines.push('Create or load a project to enable auto-save');
    } else {
      lines.push('Auto-save: Enabled (saves every 2 seconds)');
    }

    // Last saved
    if (lastSavedAt) {
      const timeSince = formatTimeSince(lastSavedAt);
      lines.push(`Last saved: ${timeSince}`);
    }

    // Dirty state
    if (autoSaveStatus.isDirty) {
      lines.push('Unsaved changes');
    }

    // Error
    if (autoSaveStatus.error) {
      lines.push(`Error: ${autoSaveStatus.error}`);
    }

    return lines.join('\n');
  };

  return (
    <div className={styles.container}>
      {/* Status Indicator */}
      <div
        className={`${styles.indicator} ${styles[statusInfo.color]}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label={`Auto-save status: ${statusInfo.label}`}
        title={getTooltipText()}
      >
        <span
          className={`${styles.icon} ${autoSaveStatus.state === 'saving' ? styles.spinning : ''}`}
          aria-hidden="true"
        >
          {statusInfo.icon}
        </span>
        <span className={styles.label}>{statusInfo.label}</span>

        {/* Tooltip */}
        {showTooltip && (
          <div className={styles.tooltip} role="tooltip">
            {getTooltipText()
              .split('\n')
              .map((line, i) => (
                <div key={i}>{line}</div>
              ))}
          </div>
        )}
      </div>

      {/* View History Button */}
      {isAutoSaveEnabled && (
        <button
          type="button"
          className={styles.historyButton}
          onClick={() => setShowHistoryModal(true)}
          aria-label="View version history"
          title="View version history"
        >
          🕒
        </button>
      )}

      {/* Project History Modal (unified timeline with versions + snapshots) */}
      {currentProject && (
        <ProjectHistoryModal
          isOpen={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          project={currentProject}
        />
      )}
    </div>
  );
}

/**
 * Format time difference in human-readable format
 */
function formatTimeSince(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 10) {
    return 'just now';
  }

  if (seconds < 60) {
    return `${seconds}s ago`;
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
