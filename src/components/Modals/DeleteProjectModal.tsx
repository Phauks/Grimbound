/**
 * Delete Project Modal
 *
 * Confirmation modal for deleting a project with warning.
 * Migrated to use unified Modal, Button, and Alert components.
 */

import { useEffect, useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { useProjects } from '../../hooks/useProjects';
import type { Project } from '../../ts/types/project.js';
import { Modal } from '../Shared/ModalBase/Modal';
import { Alert } from '../Shared/UI/Alert';
import { Button } from '../Shared/UI/Button';

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

  if (!project) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Project"
      size="small"
      preventClose={isLoading}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            loading={isLoading}
            loadingText="Deleting..."
          >
            Delete Project
          </Button>
        </>
      }
    >
      <p
        style={{
          color: 'var(--text-secondary)',
          marginBottom: 'var(--spacing-md)',
          lineHeight: 1.6,
        }}
      >
        Are you sure you want to delete <strong>"{project.name}"</strong>?
      </p>

      <Alert variant="warning" title="Warning">
        This action cannot be undone. All project data, including custom icons and snapshots, will
        be permanently deleted.
      </Alert>

      {error && (
        <Alert variant="error" style={{ marginTop: 'var(--spacing-md)' }}>
          {error}
        </Alert>
      )}
    </Modal>
  );
}
