/**
 * Delete Project Modal
 *
 * Confirmation modal for deleting a project with warning.
 */

import { useState, useEffect } from 'react';
import { useProjects } from '../../hooks/useProjects';
import { useToast } from '../../contexts/ToastContext';
import type { Project } from '../../ts/types/project.js';
import styles from '../../styles/components/layout/Modal.module.css';

interface DeleteProjectModalProps {
  isOpen: boolean;
  project: Project | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DeleteProjectModal({
  isOpen,
  project,
  onClose,
  onSuccess,
}: DeleteProjectModalProps) {
  const { deleteProject, isLoading } = useProjects();
  const { addToast } = useToast();
  const [error, setError] = useState<string | null>(null);

  // Reset error when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, isLoading]);

  const handleDelete = async () => {
    if (!project) return;

    try {
      setError(null);
      const projectName = project.name;
      await deleteProject(project.id);
      addToast(`Project "${projectName}" deleted successfully`, 'success');
      onSuccess?.();
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete project';
      setError(errorMessage);
      addToast(errorMessage, 'error');
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  if (!isOpen || !project) return null;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="deleteProjectTitle"
    >
      <div className={styles.backdrop} onClick={handleBackdropClick} />
      <div className={styles.container} style={{ maxWidth: '480px' }}>
        <div className={styles.header}>
          <h2 id="deleteProjectTitle" className={styles.title}>
            Delete Project
          </h2>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close"
            disabled={isLoading}
          >
            ×
          </button>
        </div>

        <div className={styles.body}>
          <p
            style={{
              color: 'var(--text-secondary)',
              marginBottom: 'var(--spacing-md)',
              lineHeight: '1.6',
            }}
          >
            Are you sure you want to delete <strong>"{project.name}"</strong>?
          </p>

          <div
            style={{
              padding: '12px',
              background: '#fff3e0',
              border: '1px solid #ff9800',
              borderRadius: 'var(--border-radius)',
              marginBottom: 'var(--spacing-lg)',
            }}
          >
            <p style={{ margin: 0, color: '#e65100', fontSize: '14px', lineHeight: '1.6' }}>
              ⚠️ <strong>Warning:</strong> This action cannot be undone. All project data,
              including custom icons and snapshots, will be permanently deleted.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div
              style={{
                padding: '10px 12px',
                background: '#ffebee',
                border: '1px solid #ef5350',
                borderRadius: 'var(--border-radius)',
                color: '#c62828',
                fontSize: '14px',
                marginBottom: 'var(--spacing-md)',
              }}
            >
              {error}
            </div>
          )}

          {/* Actions */}
          <div
            style={{
              display: 'flex',
              gap: 'var(--spacing-sm)',
              justifyContent: 'flex-end',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              style={{
                padding: '10px 20px',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius)',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={isLoading}
              style={{
                padding: '10px 20px',
                background: isLoading ? '#999' : '#d32f2f',
                color: 'white',
                border: 'none',
                borderRadius: 'var(--border-radius)',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              {isLoading ? 'Deleting...' : 'Delete Project'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
