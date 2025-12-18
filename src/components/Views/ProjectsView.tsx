/**
 * Projects View
 *
 * Unified project management interface with left sidebar (ProjectNavigation)
 * and right panel (ProjectEditor). Follows CharactersView pattern.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { useTokenContext } from '@/contexts/TokenContext';
import { useProjects } from '@/hooks/useProjects';
import { generateScriptNameTokenOnly } from '@/ts/generation/batchGenerator.js';
import type { Token } from '@/ts/types/index.js';
import type { CustomIconMetadata, Project } from '@/ts/types/project.js';
import { logger } from '@/ts/utils/logger.js';
import { ViewLayout } from '@/components/Layout/ViewLayout';
import { DeleteProjectModal } from '@/components/Modals/DeleteProjectModal';
import { ExportProjectModal } from '@/components/Modals/ExportProjectModal';
import { IconManagementModal } from '@/components/Modals/IconManagementModal';
import { ImportProjectModal } from '@/components/Modals/ImportProjectModal';
import { ProjectEditor } from '@/components/ViewComponents/ProjectsComponents/ProjectEditor';
import { ProjectNavigation } from '@/components/ViewComponents/ProjectsComponents/ProjectNavigation';

interface ProjectsViewProps {
  initialProjectId?: string;
}

export function ProjectsView({ initialProjectId }: ProjectsViewProps) {
  const {
    projects,
    currentProject,
    updateProject,
    duplicateProject,
    createProject,
    activateProject,
  } = useProjects();
  const { characters } = useTokenContext();
  const { addToast } = useToast();

  // Selected project for editing - initialize to current/active project if available
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Cache for pre-rendered script name tokens by project ID
  const scriptNameTokenCache = useRef<Map<string, Token>>(new Map());
  const hoverAbortControllers = useRef<Map<string, AbortController>>(new Map());

  // Initialize selectedProject to the active project on mount
  useEffect(() => {
    if (!hasInitialized && projects.length > 0) {
      if (initialProjectId) {
        const project = projects.find((p) => p.id === initialProjectId);
        if (project) {
          setSelectedProject(project);
        }
      }
      setHasInitialized(true);
    }
  }, [projects, initialProjectId, hasInitialized]);

  // Keep selectedProject in sync with the projects list (updates after saves)
  useEffect(() => {
    if (selectedProject) {
      const updatedProject = projects.find((p) => p.id === selectedProject.id);
      if (updatedProject && updatedProject !== selectedProject) {
        setSelectedProject(updatedProject);
      } else if (!updatedProject) {
        // Project was deleted
        setSelectedProject(null);
      }
    }
  }, [projects, selectedProject]);

  // Modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [projectToExport, setProjectToExport] = useState<Project | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [iconManagementModalOpen, setIconManagementModalOpen] = useState(false);

  // Handlers
  const handleSelectProject = useCallback(
    (projectId: string) => {
      const project = projects.find((p) => p.id === projectId);
      setSelectedProject(project || null);
    },
    [projects]
  );

  // Pre-render script name token on hover
  const handleHoverProject = useCallback(
    (projectId: string) => {
      // Skip if already in cache
      if (scriptNameTokenCache.current.has(projectId)) {
        return;
      }

      // Skip if already generating for this project
      if (hoverAbortControllers.current.has(projectId)) {
        return;
      }

      const project = projects.find((p) => p.id === projectId);
      if (!project?.state?.scriptMeta?.name) {
        return;
      }

      const abortController = new AbortController();
      hoverAbortControllers.current.set(projectId, abortController);

      // Generate script name token in background
      generateScriptNameTokenOnly(
        project.state.generationOptions,
        project.state.scriptMeta,
        abortController.signal
      )
        .then((token) => {
          if (token) {
            scriptNameTokenCache.current.set(projectId, token);
          }
          hoverAbortControllers.current.delete(projectId);
        })
        .catch((err) => {
          if (err?.name !== 'AbortError') {
            logger.error('ProjectsView', 'Failed to pre-render script name token', err);
          }
          hoverAbortControllers.current.delete(projectId);
        });
    },
    [projects]
  );

  const handleCreateProject = useCallback(async () => {
    try {
      const timestamp = new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
      const newProject = await createProject(`New Project - ${timestamp}`);
      if (newProject) {
        // Delay selection to allow projects array to update
        setTimeout(() => {
          setSelectedProject(newProject);
        }, 50);
        addToast('New project created!', 'success');
      }
    } catch (err) {
      logger.error('ProjectsView', 'Failed to create project', err);
      addToast('Failed to create project', 'error');
    }
  }, [createProject, addToast]);

  const handleImportProject = useCallback(() => {
    setImportModalOpen(true);
  }, []);

  const handleIconManagement = useCallback(() => {
    if (!currentProject) {
      alert('Please create or activate a project first to manage custom icons');
      return;
    }
    setIconManagementModalOpen(true);
  }, [currentProject]);

  const handleExportProject = useCallback((project: Project) => {
    setProjectToExport(project);
    setExportModalOpen(true);
  }, []);

  const handleDeleteProject = useCallback((project: Project) => {
    setProjectToDelete(project);
    setDeleteModalOpen(true);
  }, []);

  const handleDuplicateProject = useCallback(
    async (project: Project) => {
      try {
        const newProject = await duplicateProject(project.id);
        if (newProject) {
          setSelectedProject(newProject);
        }
      } catch (err) {
        logger.error('ProjectsView', 'Failed to duplicate project', err);
      }
    },
    [duplicateProject]
  );

  const handleUpdateIcons = useCallback(
    async (icons: CustomIconMetadata[]) => {
      if (!currentProject) return;
      await updateProject(currentProject.id, {
        state: { ...currentProject.state, customIcons: icons },
      });
    },
    [currentProject, updateProject]
  );

  const handleImportSuccess = useCallback(
    (projectId: string) => {
      setImportModalOpen(false);
      // Select the newly imported project
      const project = projects.find((p) => p.id === projectId);
      if (project) {
        setSelectedProject(project);
      }
    },
    [projects]
  );

  const handleDeleteSuccess = useCallback(() => {
    setDeleteModalOpen(false);
    // Clear selection if deleted project was selected
    if (selectedProject?.id === projectToDelete?.id) {
      setSelectedProject(null);
    }
    setProjectToDelete(null);
  }, [selectedProject, projectToDelete]);

  // Calculate last project (most recently accessed, excluding current)
  const lastProject = useMemo(() => {
    return (
      projects
        .filter((p) => !currentProject || p.id !== currentProject.id)
        .sort((a, b) => b.lastAccessedAt - a.lastAccessedAt)[0] || null
    );
  }, [projects, currentProject]);

  const handleLoadLastProject = useCallback(async () => {
    if (lastProject) {
      // Select the project
      setSelectedProject(lastProject);

      // Also activate it as the current project
      try {
        await activateProject(lastProject.id);
        addToast(`Project "${lastProject.name}" is now active!`, 'success');
      } catch (_error) {
        addToast('Failed to activate project', 'error');
      }
    }
  }, [lastProject, activateProject, addToast]);

  return (
    <>
      {/* Main unified layout: Left sidebar + Right panel */}
      <ViewLayout variant="2-panel">
        {/* Left Sidebar - Project Navigation */}
        <ViewLayout.Panel position="left" width="left" scrollable>
          <ProjectNavigation
            projects={projects}
            selectedProjectId={selectedProject?.id || null}
            currentProjectId={currentProject?.id || null}
            onSelectProject={handleSelectProject}
            onHoverProject={handleHoverProject}
            onCreateProject={handleCreateProject}
            onImportProject={handleImportProject}
            onIconManagement={handleIconManagement}
            onDeleteProject={handleDeleteProject}
          />
        </ViewLayout.Panel>

        {/* Right Panel - Project Editor */}
        <ViewLayout.Panel position="right" width="flex" scrollable>
          <ProjectEditor
            project={selectedProject}
            scriptNameTokenCache={scriptNameTokenCache.current}
            onExport={handleExportProject}
            onDelete={handleDeleteProject}
            onDuplicate={handleDuplicateProject}
            onCreateProject={handleCreateProject}
            onImportProject={handleImportProject}
            onLoadLastProject={handleLoadLastProject}
            lastProject={lastProject}
          />
        </ViewLayout.Panel>
      </ViewLayout>

      {/* Modals */}
      <DeleteProjectModal
        isOpen={deleteModalOpen}
        project={projectToDelete}
        onClose={() => {
          setDeleteModalOpen(false);
          setProjectToDelete(null);
        }}
        onSuccess={handleDeleteSuccess}
      />
      <ExportProjectModal
        isOpen={exportModalOpen}
        onClose={() => {
          setExportModalOpen(false);
          setProjectToExport(null);
        }}
        project={projectToExport}
      />
      <ImportProjectModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={handleImportSuccess}
      />
      {currentProject && (
        <IconManagementModal
          isOpen={iconManagementModalOpen}
          onClose={() => setIconManagementModalOpen(false)}
          characters={characters}
          customIcons={currentProject.state.customIcons || []}
          onUpdateIcons={handleUpdateIcons}
        />
      )}
    </>
  );
}
