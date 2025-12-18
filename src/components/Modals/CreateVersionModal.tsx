/**
 * Create Version Modal
 *
 * Modal for creating a new semantic version of a project.
 * Provides version number input with validation, quick increment buttons,
 * release notes, and optional tags.
 */

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import styles from '@/styles/components/modals/CreateVersionModal.module.css';
import { projectDb } from '@/ts/db/projectDb';
import type { Project, VersionIncrementType } from '@/ts/types/project';
import { logger } from '@/ts/utils/logger';
import { Modal } from '@/components/Shared/ModalBase/Modal';
import { Alert } from '@/components/Shared/UI/Alert';
import { Button } from '@/components/Shared/UI/Button';

interface CreateVersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onVersionCreated: () => void;
}

export function CreateVersionModal({
  isOpen,
  onClose,
  project,
  onVersionCreated,
}: CreateVersionModalProps) {
  const { addToast } = useToast();

  const [versionNumber, setVersionNumber] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [tags, setTags] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSuggestedVersion = useCallback(async () => {
    try {
      const suggested = await projectDb.suggestNextVersion(project.id, 'minor');
      setVersionNumber(suggested);
      logger.debug('CreateVersionModal', `Suggested version: ${suggested}`);
    } catch (err) {
      logger.error('CreateVersionModal', 'Failed to suggest version', err);
      setVersionNumber('1.0.0'); // Fallback
    }
  }, [project.id]);

  // Suggest next version on mount
  useEffect(() => {
    if (isOpen) {
      loadSuggestedVersion();
      setReleaseNotes('');
      setTags('');
      setError(null);
    }
  }, [isOpen, loadSuggestedVersion]);

  const handleBumpVersion = async (incrementType: VersionIncrementType) => {
    try {
      const suggested = await projectDb.suggestNextVersion(project.id, incrementType);
      setVersionNumber(suggested);
    } catch (err) {
      logger.error('CreateVersionModal', 'Failed to bump version', err);
    }
  };

  const validateVersionNumber = (version: string): boolean => {
    const semanticVersionRegex = /^\d+\.\d+(\.\d+)?$/;
    return semanticVersionRegex.test(version);
  };

  const handleCreate = async () => {
    try {
      setError(null);

      // Validate version number
      if (!versionNumber.trim()) {
        setError('Version number is required');
        return;
      }

      if (!validateVersionNumber(versionNumber)) {
        setError('Invalid version format. Use: major.minor or major.minor.patch (e.g., 1.2.0)');
        return;
      }

      setIsCreating(true);
      logger.info('CreateVersionModal', 'Creating version', {
        projectId: project.id,
        versionNumber,
      });

      // Parse tags from comma-separated input
      const parsedTags = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      // Create version from current project state
      await projectDb.createProjectVersion(
        project.id,
        versionNumber,
        project.state,
        releaseNotes.trim() || undefined,
        parsedTags.length > 0 ? parsedTags : undefined
      );

      logger.info('CreateVersionModal', `Version ${versionNumber} created successfully`);
      addToast(`Version ${versionNumber} created!`, 'success');

      // Notify parent and close modal
      onVersionCreated();
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create version';
      logger.error('CreateVersionModal', 'Failed to create version', err);
      setError(errorMessage);
      addToast(errorMessage, 'error');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Version"
      size="medium"
      preventClose={isCreating}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            loading={isCreating}
            loadingText="Creating..."
          >
            Create Version
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        {/* Version Number Field */}
        <div className={styles.field}>
          <label htmlFor="versionNumber" className={styles.label}>
            Version Number<span className={styles.required}>*</span>
          </label>
          <input
            id="versionNumber"
            type="text"
            value={versionNumber}
            onChange={(e) => setVersionNumber(e.target.value)}
            placeholder="1.0.0"
            pattern="^\d+\.\d+(\.\d+)?$"
            className={styles.input}
            disabled={isCreating}
          />
          <p className={styles.hint}>Format: major.minor or major.minor.patch (e.g., 1.2.0)</p>
        </div>

        {/* Quick Increment Buttons */}
        <div className={styles.quickActions}>
          <Button
            variant="secondary"
            size="small"
            onClick={() => handleBumpVersion('major')}
            disabled={isCreating}
          >
            Bump Major
          </Button>
          <Button
            variant="secondary"
            size="small"
            onClick={() => handleBumpVersion('minor')}
            disabled={isCreating}
          >
            Bump Minor
          </Button>
          <Button
            variant="secondary"
            size="small"
            onClick={() => handleBumpVersion('patch')}
            disabled={isCreating}
          >
            Bump Patch
          </Button>
        </div>

        {/* Release Notes Field */}
        <div className={styles.field}>
          <label htmlFor="releaseNotes" className={styles.label}>
            Release Notes <span className={styles.optional}>(Optional)</span>
          </label>
          <textarea
            id="releaseNotes"
            value={releaseNotes}
            onChange={(e) => setReleaseNotes(e.target.value)}
            placeholder="Describe what changed in this version..."
            rows={4}
            className={styles.textarea}
            disabled={isCreating}
          />
        </div>

        {/* Tags Field */}
        <div className={styles.field}>
          <label htmlFor="tags" className={styles.label}>
            Tags <span className={styles.optional}>(Optional)</span>
          </label>
          <input
            id="tags"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="alpha, beta, stable (comma-separated)"
            className={styles.input}
            disabled={isCreating}
          />
          <p className={styles.hint}>
            Add tags to categorize this version (e.g., "alpha", "beta", "stable")
          </p>
        </div>

        {/* Info Alert */}
        <Alert variant="info" title="Version Snapshot">
          This will create a permanent snapshot of your current project state with semantic version{' '}
          <strong>{versionNumber || '1.0.0'}</strong>.
        </Alert>

        {/* Error Alert */}
        {error && (
          <Alert variant="error" style={{ marginTop: 'var(--spacing-md)' }}>
            {error}
          </Alert>
        )}
      </div>
    </Modal>
  );
}
