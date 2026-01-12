/**
 * Version Card Component
 *
 * Displays a single version in the timeline with metadata, summary, and actions.
 * Shows whether the version matches the current project state.
 */

import { Button } from '@/components/Shared/UI/Button';
import styles from '@/styles/components/projects/VersionCard.module.css';
import type { Project, ProjectVersion } from '@/ts/types/project';

interface VersionCardProps {
  version: ProjectVersion;
  project: Project;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onRestore: () => void;
}

export function VersionCard({
  version,
  project,
  onSelect,
  onDelete,
  onDuplicate,
  onRestore,
}: VersionCardProps) {
  // Check if this version matches the current project state
  const isCurrent = (() => {
    // Simple comparison: compare the JSON stringified states
    // This is a basic check - could be enhanced with deep comparison
    try {
      const versionState = JSON.stringify(version.stateSnapshot);
      const projectState = JSON.stringify(project.state);
      return versionState === projectState;
    } catch {
      return false;
    }
  })();

  // Format timestamp
  const formattedDate = (() => {
    const date = new Date(version.createdAt);
    const now = Date.now();
    const diff = now - version.createdAt;

    // Less than 1 minute
    if (diff < 60000) {
      return 'Just now';
    }

    // Less than 1 hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    }

    // Less than 1 day
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    }

    // Less than 7 days
    if (diff < 604800000) {
      const days = Math.floor(diff / 86400000);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }

    // Otherwise show formatted date
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
      hour: 'numeric',
      minute: '2-digit',
    });
  })();

  // Extract summary stats from snapshot
  const stats = (() => {
    const snapshot = version.stateSnapshot;
    return {
      characterCount: snapshot.characters?.length || 0,
      customIconCount: snapshot.customIcons?.length || 0,
      scriptName: snapshot.scriptMeta?.name || null,
    };
  })();

  return (
    <div className={`${styles.card} ${isCurrent ? styles.current : ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.versionNumber}>v{version.versionNumber}</span>
          {isCurrent && <span className={styles.currentBadge}>Current</span>}
          {version.tags?.map((tag) => (
            <span key={tag} className={styles.tag}>
              {tag}
            </span>
          ))}
        </div>

        <div className={styles.headerRight}>
          <span className={styles.timestamp} title={new Date(version.createdAt).toLocaleString()}>
            {formattedDate}
          </span>
        </div>
      </div>

      {/* Release Notes */}
      {version.releaseNotes && (
        <div className={styles.releaseNotes}>
          <p>{version.releaseNotes}</p>
        </div>
      )}

      {/* Snapshot Summary */}
      <div className={styles.summary}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryIcon}>👥</span>
          <span className={styles.summaryText}>
            {stats.characterCount} character{stats.characterCount !== 1 ? 's' : ''}
          </span>
        </div>

        {stats.customIconCount > 0 && (
          <div className={styles.summaryItem}>
            <span className={styles.summaryIcon}>🎨</span>
            <span className={styles.summaryText}>
              {stats.customIconCount} custom icon{stats.customIconCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {stats.scriptName && (
          <div className={styles.summaryItem}>
            <span className={styles.summaryIcon}>📜</span>
            <span className={styles.summaryText}>{stats.scriptName}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <Button variant="secondary" size="small" onClick={onSelect}>
          👁️ View Details
        </Button>

        <Button variant="secondary" size="small" onClick={onDuplicate}>
          📋 Duplicate
        </Button>

        {!isCurrent && (
          <Button variant="secondary" size="small" onClick={onRestore}>
            ↩️ Restore
          </Button>
        )}

        <Button variant="danger" size="small" onClick={onDelete}>
          🗑️ Delete
        </Button>
      </div>

      {/* Publishing Status (Future) */}
      {version.isPublished && (
        <div className={styles.publishedBadge}>
          <span className={styles.publishedIcon}>🌐</span>
          <span className={styles.publishedText}>
            Published
            {version.downloadCount !== undefined && version.downloadCount > 0 && (
              <>
                {' '}
                · {version.downloadCount} download{version.downloadCount !== 1 ? 's' : ''}
              </>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
