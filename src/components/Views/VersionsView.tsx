/**
 * Versions View Component
 *
 * Displays and manages manual project versions (semantic versioning milestones).
 * Part of the dual-track versioning system (separate from auto-save snapshots).
 *
 * Features:
 * - Timeline view of all versions
 * - Create new versions with semantic versioning
 * - View version details and diff
 * - Delete, duplicate, and restore versions
 * - Future-ready for publishing system
 */

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { useProjects } from '../../hooks/useProjects';
import styles from '../../styles/components/views/VersionsView.module.css';
import { projectDb } from '../../ts/db/projectDb';
import { projectService } from '../../ts/services/project';
import type { CreateProjectOptions, Project, ProjectVersion } from '../../ts/types/project';
import { logger } from '../../ts/utils/logger';
import { CreateVersionModal } from '../Modals/CreateVersionModal';
import { ProjectHistoryModal } from '../Modals/ProjectHistoryModal';
import { Button } from '../Shared/UI/Button';
import { VersionCard } from '../ViewComponents/ProjectsComponents/VersionCard';

interface VersionsViewProps {
  project: Project;
}

export function VersionsView({ project }: VersionsViewProps) {
  const { addToast } = useToast();
  const { updateProject } = useProjects();
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const loadVersions = useCallback(async () => {
    try {
      setIsLoading(true);
      logger.info('VersionsView', 'Loading versions', { projectId: project.id });

      const loaded = await projectDb.loadProjectVersions(project.id);
      setVersions(loaded);

      logger.info('VersionsView', `Loaded ${loaded.length} versions`);
    } catch (error) {
      logger.error('VersionsView', 'Failed to load versions', error);
      addToast('Failed to load versions', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [project.id, addToast]);

  // Load versions on mount and when project changes
  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  const handleCreateVersion = useCallback(() => {
    setCreateModalOpen(true);
  }, []);

  const handleVersionCreated = useCallback(() => {
    loadVersions();
    addToast('Version created successfully!', 'success');
  }, [loadVersions, addToast]);

  const handleDeleteVersion = useCallback(
    async (versionId: string) => {
      if (!confirm('Are you sure you want to delete this version? This cannot be undone.')) {
        return;
      }

      try {
        logger.info('VersionsView', 'Deleting version', { versionId });
        await projectDb.deleteProjectVersion(versionId);
        await loadVersions();
        addToast('Version deleted', 'success');
      } catch (error) {
        logger.error('VersionsView', 'Failed to delete version', error);
        addToast('Failed to delete version', 'error');
      }
    },
    [loadVersions, addToast]
  );

  const handleDuplicateVersion = useCallback(
    async (version: ProjectVersion) => {
      try {
        logger.info('VersionsView', 'Duplicating version', { versionId: version.id });

        // Create a new project from this version's state
        const newProjectName = `${project.name} (v${version.versionNumber} copy)`;
        const options: CreateProjectOptions = {
          name: newProjectName,
          description: `Copy of ${project.name} at version ${version.versionNumber}`,
          state: version.stateSnapshot,
        };

        const newProject = await projectService.createProject(options);

        if (newProject) {
          addToast(`Created project "${newProjectName}"`, 'success');
        }
      } catch (error) {
        logger.error('VersionsView', 'Failed to duplicate version', error);
        addToast('Failed to duplicate version', 'error');
      }
    },
    [project, addToast]
  );

  const handleRestoreVersion = useCallback(
    async (version: ProjectVersion) => {
      if (
        !confirm(
          `Restore project to version ${version.versionNumber}? Your current state will be replaced.`
        )
      ) {
        return;
      }

      try {
        logger.info('VersionsView', 'Restoring version', { versionId: version.id });

        // Update the project's state to match the version's snapshot
        await updateProject(project.id, {
          state: version.stateSnapshot,
        });

        await loadVersions();
        addToast(`Restored to version ${version.versionNumber}`, 'success');
      } catch (error) {
        logger.error('VersionsView', 'Failed to restore version', error);
        addToast('Failed to restore version', 'error');
      }
    },
    [project.id, updateProject, loadVersions, addToast]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}>⟳</div>
          <p>Loading versions...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (versions.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📦</div>
          <h2>No Versions Yet</h2>
          <p>Create your first version to mark a milestone in your project's development.</p>
          <p className={styles.emptyHint}>
            Versions help you track major changes and prepare scripts for publishing.
          </p>
          <Button variant="primary" onClick={handleCreateVersion}>
            🏷️ Create Version
          </Button>
        </div>

        <CreateVersionModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          project={project}
          onVersionCreated={handleVersionCreated}
        />
      </div>
    );
  }

  // Timeline view with versions
  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h2>Versions</h2>
          <p className={styles.versionCount}>
            {versions.length} version{versions.length !== 1 ? 's' : ''} created
          </p>
        </div>

        <Button variant="primary" onClick={handleCreateVersion}>
          🏷️ Create Version
        </Button>
      </div>

      {/* Version Timeline */}
      <div className={styles.timeline}>
        {versions.map((version) => (
          <VersionCard
            key={version.id}
            version={version}
            project={project}
            onSelect={() => setHistoryModalOpen(true)}
            onDelete={() => handleDeleteVersion(version.id)}
            onDuplicate={() => handleDuplicateVersion(version)}
            onRestore={() => handleRestoreVersion(version)}
          />
        ))}
      </div>

      {/* Modals */}
      <CreateVersionModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        project={project}
        onVersionCreated={handleVersionCreated}
      />

      {/* Project History Modal - Shows unified timeline with versions + snapshots and diff viewing */}
      <ProjectHistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        project={project}
      />
    </div>
  );
}
