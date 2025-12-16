/**
 * Blood on the Clocktower Token Generator
 * Save as New Project Button - Prompts user to save their work as a new project
 *
 * Features:
 * - Appears only when work exists without an active project
 * - Inline editing: Click to enter project name
 * - Press Enter or blur to create project
 * - Press Escape to cancel
 * - Badge-style button matching auto-save indicator design
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTokenContext } from '../../../contexts/TokenContext';
import { useProjects } from '../../../hooks/useProjects.js';
import styles from '../../../styles/components/shared/AutoSaveIndicator.module.css';
import { logger } from '../../../ts/utils/index.js';

interface SaveAsNewProjectButtonProps {
  /** Optional callback for tab navigation */
  onTabChange?: (tab: string) => void;
}

export function SaveAsNewProjectButton({ onTabChange }: SaveAsNewProjectButtonProps) {
  const { createProject } = useProjects();
  const { scriptMeta } = useTokenContext();
  const [isEditing, setIsEditing] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEditing = useCallback(() => {
    setIsEditing(true);
    // Use script name if available, otherwise fallback to default
    setProjectName(scriptMeta?.name || 'Untitled Project');
  }, [scriptMeta?.name]);

  const handleCancelEditing = useCallback(() => {
    setIsEditing(false);
    setProjectName('');
  }, []);

  const handleSaveProject = useCallback(async () => {
    const trimmedName = projectName.trim();

    // Don't save if name is empty
    if (!trimmedName) {
      handleCancelEditing();
      return;
    }

    try {
      setIsSaving(true);
      logger.info('SaveAsNewProject', 'Creating new project from unsaved work', {
        projectName: trimmedName,
      });

      // Create project (this will capture current TokenContext state)
      await createProject(trimmedName);

      logger.info('SaveAsNewProject', `Project created successfully: ${trimmedName}`);

      // Reset state
      setIsEditing(false);
      setProjectName('');

      // Navigate to Projects tab if callback provided
      if (onTabChange) {
        onTabChange('projects');
      }
    } catch (error) {
      logger.error('SaveAsNewProject', 'Failed to create project', error);
    } finally {
      setIsSaving(false);
    }
  }, [projectName, createProject, onTabChange, handleCancelEditing]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSaveProject();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancelEditing();
      }
    },
    [handleSaveProject, handleCancelEditing]
  );

  const handleBlur = useCallback(() => {
    // Small delay to allow click events to register first
    setTimeout(() => {
      if (isEditing) {
        handleSaveProject();
      }
    }, 150);
  }, [isEditing, handleSaveProject]);

  // Show input field when editing
  if (isEditing) {
    return (
      <div className={styles.saveButton} style={{ padding: '4px 8px' }}>
        <span className={styles.icon}>💾</span>
        <input
          ref={inputRef}
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={isSaving}
          placeholder="Project name..."
          className={styles.inlineInput}
          style={{
            border: 'none',
            background: 'transparent',
            color: 'inherit',
            fontSize: '13px',
            fontWeight: 500,
            outline: 'none',
            width: '150px',
            padding: '2px 4px',
          }}
        />
      </div>
    );
  }

  // Show button when not editing
  return (
    <button
      type="button"
      className={styles.saveButton}
      onClick={handleStartEditing}
      disabled={isSaving}
      aria-label="Save as new project"
      title="Click to enter project name and save"
    >
      <span className={styles.icon}>{isSaving ? '⟳' : '💾'}</span>
      <span className={styles.label}>{isSaving ? 'Saving...' : 'Save as New Project'}</span>
    </button>
  );
}
