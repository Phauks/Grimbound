/**
 * Version Selector Component
 *
 * A dropdown selector for quick version access in the Project Editor.
 * Shows "Current (editing)" as default, with options for all saved versions.
 *
 * When a version is selected (other than "Current"), it triggers Compare Mode
 * to show a data diff between the current state and the selected version.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from '@/styles/components/projects/VersionSelector.module.css';
import { projectDb } from '@/ts/db/projectDb';
import type { Project, ProjectVersion } from '@/ts/types/project';
import { logger } from '@/ts/utils/logger';

interface VersionSelectorProps {
  /** The current project to load versions for */
  project: Project;
  /** Currently selected version (null = "Current" editing state) */
  selectedVersion: ProjectVersion | null;
  /** Callback when a version is selected (null = Current) */
  onVersionSelect: (version: ProjectVersion | null) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
}

/**
 * Format relative time from a timestamp
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
  if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
}

export function VersionSelector({
  project,
  selectedVersion,
  onVersionSelect,
  disabled = false,
}: VersionSelectorProps) {
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load versions on mount and when project changes
  useEffect(() => {
    const loadVersions = async () => {
      try {
        setIsLoading(true);
        const loaded = await projectDb.loadProjectVersions(project.id);
        // Sort by version number (newest first)
        const sorted = loaded.sort((a, b) => {
          if (a.versionMajor !== b.versionMajor) return b.versionMajor - a.versionMajor;
          if (a.versionMinor !== b.versionMinor) return b.versionMinor - a.versionMinor;
          return b.versionPatch - a.versionPatch;
        });
        setVersions(sorted);
      } catch (error) {
        logger.error('VersionSelector', 'Failed to load versions', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadVersions();
  }, [project.id]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = useCallback(() => {
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  }, [disabled]);

  const handleSelect = useCallback(
    (version: ProjectVersion | null) => {
      onVersionSelect(version);
      setIsOpen(false);
    },
    [onVersionSelect]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      } else if (event.key === 'Enter' || event.key === ' ') {
        handleToggle();
      }
    },
    [handleToggle]
  );

  // Display label for the selector
  const displayLabel = selectedVersion ? `v${selectedVersion.versionNumber}` : 'Current';

  // If no versions, don't show the selector
  if (!isLoading && versions.length === 0) {
    return null;
  }

  return (
    <div ref={containerRef} className={`${styles.container} ${disabled ? styles.disabled : ''}`}>
      <label className={styles.label}>Version:</label>

      <button
        type="button"
        className={`${styles.selector} ${isOpen ? styles.selectorOpen : ''}`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        disabled={disabled || isLoading}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={styles.selectedValue}>
          {isLoading ? (
            <span className={styles.loading}>Loading...</span>
          ) : (
            <>
              <span className={styles.versionLabel}>{displayLabel}</span>
              {selectedVersion && (
                <span className={styles.timestamp}>
                  {formatRelativeTime(selectedVersion.createdAt)}
                </span>
              )}
              {!selectedVersion && <span className={styles.editingBadge}>editing</span>}
            </>
          )}
        </span>
        <span className={styles.arrow}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && !isLoading && (
        <div className={styles.dropdown} role="listbox">
          {/* Current (editing) option */}
          <button
            type="button"
            className={`${styles.option} ${!selectedVersion ? styles.optionSelected : ''}`}
            onClick={() => handleSelect(null)}
            role="option"
            aria-selected={!selectedVersion}
          >
            <span className={styles.optionLabel}>Current</span>
            <span className={styles.optionMeta}>editing</span>
          </button>

          {versions.length > 0 && <div className={styles.divider} />}

          {/* Version options */}
          {versions.map((version) => (
            <button
              key={version.id}
              type="button"
              className={`${styles.option} ${selectedVersion?.id === version.id ? styles.optionSelected : ''}`}
              onClick={() => handleSelect(version)}
              role="option"
              aria-selected={selectedVersion?.id === version.id}
            >
              <span className={styles.optionLabel}>v{version.versionNumber}</span>
              <span className={styles.optionMeta}>{formatRelativeTime(version.createdAt)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
