/**
 * Projects View
 *
 * Unified project management interface with left sidebar (ProjectNavigation)
 * and right panel (ProjectEditor). Follows CharactersView pattern.
 */

import { useEffect, useState } from 'react';
import { ViewLayout } from '@/components/Layout/ViewLayout';
import { DeleteProjectModal } from '@/components/Modals/DeleteProjectModal';
import { ExportProjectModal } from '@/components/Modals/ExportProjectModal';
import { IconManagementModal } from '@/components/Modals/IconManagementModal';
import { ImportProjectModal } from '@/components/Modals/ImportProjectModal';
import { ErrorBoundary, UnifiedErrorDisplay } from '@/components/Shared';
import { ProjectEditor } from '@/components/ViewComponents/ProjectsComponents/ProjectEditor';
import { ProjectNavigation } from '@/components/ViewComponents/ProjectsComponents/ProjectNavigation';
import { useToast } from '@/contexts/ToastContext';
import { useTokenContext } from '@/contexts/TokenContext';
import { useProjects } from '@/hooks';
import { useResizableSidebar } from '@/hooks/ui';
import type { CustomIconMetadata, Project } from '@/ts/types/project.js';
import { logger } from '@/ts/utils/logger.js';

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
    loadProjects,
  } = useProjects();
  const { characters } = useTokenContext();
  const { addToast } = useToast();

  // Resizable sidebar
  const { width: sidebarWidth, isDragging, handleProps } = useResizableSidebar();

  // Selected project for editing - initialize to current/active project if available
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  // Track pending project ID to select after list refresh (for import)
  const [pendingSelectId, setPendingSelectId] = useState<string | null>(null);

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
  // Note: Don't clear selection if project not found - it might be a newly created project
  // not yet loaded. Deletion is handled explicitly via handleDeleteSuccess.
  useEffect(() => {
    if (selectedProject) {
      const updatedProject = projects.find((p) => p.id === selectedProject.id);
      if (updatedProject && updatedProject !== selectedProject) {
        setSelectedProject(updatedProject);
      }
    }
  }, [projects, selectedProject]);

  // Handle pending project selection (for imports)
  useEffect(() => {
    if (pendingSelectId) {
      const project = projects.find((p) => p.id === pendingSelectId);
      if (project) {
        setSelectedProject(project);
        setPendingSelectId(null);
      }
    }
  }, [projects, pendingSelectId]);

  // Modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [projectToExport, setProjectToExport] = useState<Project | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [iconManagementModalOpen, setIconManagementModalOpen] = useState(false);

  // Handlers
  const handleSelectProject = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    setSelectedProject(project || null);
  };

  const handleCreateProject = async () => {
    try {
      const timestamp = new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
      const newProject = await createProject(`New Project - ${timestamp}`);
      if (newProject) {
        // Select the new project immediately - sync effect will keep it updated
        setSelectedProject(newProject);
        addToast('New project created!', 'success');
      }
    } catch (err) {
      logger.error('ProjectsView', 'Failed to create project', err);
      addToast('Failed to create project', 'error');
    }
  };

  const handleImportProject = () => {
    setImportModalOpen(true);
  };

  const handleIconManagement = () => {
    if (!currentProject) {
      alert('Please create or activate a project first to manage custom icons');
      return;
    }
    setIconManagementModalOpen(true);
  };

  const handleExportProject = (project: Project) => {
    setProjectToExport(project);
    setExportModalOpen(true);
  };

  const handleDeleteProject = (project: Project) => {
    setProjectToDelete(project);
    setDeleteModalOpen(true);
  };

  const handleDuplicateProject = async (project: Project) => {
    try {
      const newProject = await duplicateProject(project.id);
      if (newProject) {
        setSelectedProject(newProject);
      }
    } catch (err) {
      logger.error('ProjectsView', 'Failed to duplicate project', err);
    }
  };

  const handleUpdateIcons = async (icons: CustomIconMetadata[]) => {
    if (!currentProject) return;
    await updateProject(currentProject.id, {
      state: { ...currentProject.state, customIcons: icons },
    });
  };

  const handleImportSuccess = (projectId: string) => {
    setImportModalOpen(false);
    // Set pending selection and refresh projects list
    // The pending selection effect will select it once the list updates
    setPendingSelectId(projectId);
    loadProjects();
  };

  const handleDeleteSuccess = () => {
    setDeleteModalOpen(false);
    // Clear selection if deleted project was selected
    if (selectedProject?.id === projectToDelete?.id) {
      setSelectedProject(null);
    }
    setProjectToDelete(null);
  };

  // Calculate last project (most recently accessed, excluding current)
  const lastProject =
    projects
      .filter((p) => !currentProject || p.id !== currentProject.id)
      .sort((a, b) => b.lastAccessedAt - a.lastAccessedAt)[0] || null;

  const handleLoadLastProject = async () => {
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
  };

  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <UnifiedErrorDisplay context="Projects" error={error} onRetry={resetErrorBoundary} />
      )}
    >
      {/* Main unified layout: Left sidebar + Right panel */}
      <ViewLayout variant="2-panel">
        {/* Left Sidebar - Project Navigation (Resizable) */}
        <ViewLayout.Panel
          position="left"
          resizable
          resizableWidth={sidebarWidth}
          isResizing={isDragging}
          onWidthChange={handleProps.onMouseDown}
          scrollable
        >
          <ProjectNavigation
            projects={projects}
            selectedProjectId={selectedProject?.id || null}
            currentProjectId={currentProject?.id || null}
            onSelectProject={handleSelectProject}
            onCreateProject={handleCreateProject}
            onIconManagement={handleIconManagement}
            onDeleteProject={handleDeleteProject}
          />
        </ViewLayout.Panel>

        {/* Right Panel - Project Editor */}
        <ViewLayout.Panel position="right" width="flex" scrollable>
          <ProjectEditor
            project={selectedProject}
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
    </ErrorBoundary>
  );
}
