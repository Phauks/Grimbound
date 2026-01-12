/**
 * BatchOperationsBar Component
 *
 * Action bar that appears when multiple assets are selected.
 * Provides bulk operations: star/unstar, move to folder, add tag, delete.
 *
 * @module components/Shared/Assets/BatchOperationsBar
 */

import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import styles from '@/styles/components/shared/BatchOperationsBar.module.css';
import { cn } from '@/ts/utils/classNames.js';

// ============================================================================
// Types
// ============================================================================

export interface BatchOperationsBarProps {
  /** Number of selected assets */
  selectedCount: number;
  /** Whether all selected assets are starred */
  allStarred: boolean;
  /** Called to toggle star on all selected */
  onToggleStar: () => void;
  /** Called to move all selected to a folder */
  onMoveToFolder: (folderPath: string | null) => void;
  /** Called to add a tag to all selected */
  onAddTag: (tag: string) => void;
  /** Called to delete all selected */
  onDelete: () => void;
  /** Called to deselect all */
  onDeselectAll: () => void;
  /** Available folders */
  folders: string[];
  /** Whether operations are in progress */
  isProcessing?: boolean;
  /** Additional CSS class */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function BatchOperationsBar({
  selectedCount,
  allStarred,
  onToggleStar,
  onMoveToFolder,
  onAddTag,
  onDelete,
  onDeselectAll,
  folders,
  isProcessing = false,
  className,
}: BatchOperationsBarProps) {
  const [isFolderDropdownOpen, setIsFolderDropdownOpen] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isFolderDropdownOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsFolderDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isFolderDropdownOpen]);

  const handleFolderSelect = (folder: string | null) => {
    onMoveToFolder(folder);
    setIsFolderDropdownOpen(false);
  };

  const handleTagSubmit = () => {
    const trimmed = tagInput.trim();
    if (trimmed) {
      onAddTag(trimmed);
      setTagInput('');
    }
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTagSubmit();
    }
  };

  // Don't render if nothing selected
  if (selectedCount === 0) return null;

  return (
    <div className={cn(styles.container, isProcessing && styles.processing, className)}>
      {/* Selection info */}
      <div className={styles.selectionInfo}>
        <span className={styles.selectionCount}>{selectedCount}</span>
        <span className={styles.selectionLabel}>
          {selectedCount === 1 ? 'asset' : 'assets'} selected
        </span>
      </div>

      <div className={styles.separator} />

      {/* Action buttons */}
      <div className={styles.actions}>
        {/* Star/Unstar */}
        <button
          type="button"
          className={cn(styles.actionButton, styles.starButton, allStarred && styles.active)}
          onClick={onToggleStar}
          title={allStarred ? 'Unstar all' : 'Star all'}
        >
          <span className={styles.actionIcon}>{allStarred ? '⭐' : '☆'}</span>
          {allStarred ? 'Unstar' : 'Star'}
        </button>

        {/* Move to folder dropdown */}
        <div className={styles.folderDropdown} ref={dropdownRef}>
          <button
            type="button"
            className={styles.actionButton}
            onClick={() => setIsFolderDropdownOpen(!isFolderDropdownOpen)}
            aria-expanded={isFolderDropdownOpen}
            aria-haspopup="listbox"
          >
            <span className={styles.actionIcon}>📁</span>
            Move to...
          </button>

          {isFolderDropdownOpen && (
            <div className={styles.dropdownContent} role="listbox">
              <button
                type="button"
                className={styles.dropdownItem}
                onClick={() => handleFolderSelect(null)}
              >
                <span className={styles.dropdownItemIcon}>📂</span>
                Unfiled (Root)
              </button>
              {folders.length > 0 && <div className={styles.dropdownDivider} />}
              {folders.map((folder) => (
                <button
                  key={folder}
                  type="button"
                  className={styles.dropdownItem}
                  onClick={() => handleFolderSelect(folder)}
                >
                  <span className={styles.dropdownItemIcon}>📁</span>
                  {folder}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Add tag */}
        <div className={styles.tagInput}>
          <input
            type="text"
            className={styles.tagInputField}
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="Add tag..."
            maxLength={30}
          />
          <button
            type="button"
            className={styles.tagSubmitButton}
            onClick={handleTagSubmit}
            disabled={!tagInput.trim()}
            title="Add tag"
          >
            +
          </button>
        </div>

        {/* Delete */}
        <button
          type="button"
          className={styles.deleteButton}
          onClick={onDelete}
          title="Delete selected"
        >
          <span className={styles.actionIcon}>🗑️</span>
          Delete
        </button>
      </div>

      {/* Deselect all */}
      <button type="button" className={styles.deselectButton} onClick={onDeselectAll}>
        Deselect all
      </button>
    </div>
  );
}
