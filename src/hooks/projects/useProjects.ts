/**
 * Projects Management Hook
 *
 * Manages project CRUD operations with clean error handling using:
 * - handleAsyncOperation from errorUtils
 * - logger from utils
 * - Structured async patterns
 *
 * @module hooks/projects/useProjects
 */

import { useCallback, useEffect, useState } from 'react';
import { useProjectContext } from '@/contexts/ProjectContext';
import { useProjectService } from '@/contexts/ServiceContext';
import { useTokenContext } from '@/contexts/TokenContext';
import type { CreateProjectOptions, ListProjectsOptions, Project } from '@/ts/types/project.js';
import { handleAsyncOperation, logger } from '@/ts/utils/index.js';

export function useProjects() {
  const { currentProject, setCurrentProject, projects, setProjects } = useProjectContext();
  const projectService = useProjectService();
  const {
    characters,
    scriptMeta,
    generationOptions,
    jsonInput,
    filters,
    characterMetadata,
    setCharacters,
    setScriptMeta,
    setJsonInput,
    setTokens,
    updateGenerationOptions,
    setMetadata,
    clearAllMetadata,
  } = useTokenContext();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load all projects
   */
  const loadProjects = useCallback(
    async (options?: ListProjectsOptions) => {
      await handleAsyncOperation(
        () => projectService.listProjects(options),
        'Load projects',
        setIsLoading,
        setError,
        {
          successMessage: `Loaded ${projects.length} projects`,
          onSuccess: (loadedProjects) => {
            setProjects(loadedProjects as Project[]);
          },
        }
      );
    },
    [projectService, setProjects, projects.length]
  );

  /**
   * Create a new project from current state
   */
  const createProject = useCallback(
    async (name: string, description?: string) => {
      const options: CreateProjectOptions = {
        name,
        description,
        state: {
          jsonInput,
          characters,
          scriptMeta,
          characterMetadata: Object.fromEntries(characterMetadata),
          generationOptions: { ...generationOptions },
          customIcons: [],
          filters,
          schemaVersion: 1,
        },
      };

      const project = await handleAsyncOperation(
        () => projectService.createProject(options),
        'Create project',
        setIsLoading,
        setError,
        {
          successMessage: `Project "${name}" created successfully`,
          onSuccess: (createdProject) => {
            setCurrentProject(createdProject as Project);
            // Refresh project list
            loadProjects().catch((err) =>
              logger.warn('Create project', 'Failed to refresh project list', err)
            );
          },
        }
      );

      return project as Project | undefined;
    },
    [
      projectService,
      jsonInput,
      characters,
      scriptMeta,
      characterMetadata,
      generationOptions,
      filters,
      setCurrentProject,
      loadProjects,
    ]
  );

  /**
   * Delete a project
   */
  const deleteProject = useCallback(
    async (projectId: string) => {
      await handleAsyncOperation(
        () => projectService.deleteProject(projectId),
        'Delete project',
        setIsLoading,
        setError,
        {
          successMessage: `Project deleted successfully`,
          onSuccess: () => {
            // If we deleted the current project, clear it
            if (currentProject?.id === projectId) {
              setCurrentProject(null);
              logger.info('Delete project', 'Current project cleared');
            }
            // Refresh project list
            loadProjects().catch((err) =>
              logger.warn('Delete project', 'Failed to refresh project list', err)
            );
          },
        }
      );
    },
    [projectService, currentProject, setCurrentProject, loadProjects]
  );

  /**
   * Load a specific project
   */
  const loadProject = useCallback(
    async (projectId: string) => {
      const project = await handleAsyncOperation(
        () => projectService.getProject(projectId),
        'Load project',
        setIsLoading,
        setError,
        {
          successMessage: 'Project loaded successfully',
          onSuccess: (loadedProject) => {
            const proj = loadedProject as Project;
            setCurrentProject(proj);

            // Restore project state
            if (proj.state) {
              logger.debug('Load project', 'Restoring project state', {
                characterCount: proj.state.characters?.length,
                hasScriptMeta: !!proj.state.scriptMeta,
              });

              setCharacters(proj.state.characters || []);
              setScriptMeta(proj.state.scriptMeta || null);
              setJsonInput(proj.state.jsonInput || '');
              setTokens(proj.state.tokens || []);

              if (proj.state.generationOptions) {
                updateGenerationOptions(proj.state.generationOptions);
              }

              if (proj.state.characterMetadata) {
                clearAllMetadata();
                Object.entries(proj.state.characterMetadata).forEach(([uuid, metadata]) => {
                  setMetadata(uuid, metadata);
                });
              }
            }
          },
        }
      );

      return project as Project | undefined;
    },
    [
      projectService,
      setCurrentProject,
      setCharacters,
      setScriptMeta,
      setJsonInput,
      setTokens,
      updateGenerationOptions,
      setMetadata,
      clearAllMetadata,
    ]
  );

  /**
   * Update an existing project
   */
  const updateProject = useCallback(
    async (projectId: string, updates: Partial<Project>) => {
      const project = await handleAsyncOperation(
        () => projectService.updateProject(projectId, updates),
        'Update project',
        setIsLoading,
        setError,
        {
          successMessage: 'Project updated successfully',
          onSuccess: (updatedProject) => {
            // If we updated the current project, refresh it
            if (currentProject?.id === projectId) {
              setCurrentProject(updatedProject as Project);
            }
            // Refresh project list
            loadProjects().catch((err) =>
              logger.warn('Update project', 'Failed to refresh project list', err)
            );
          },
        }
      );

      return project as Project | undefined;
    },
    [projectService, currentProject, setCurrentProject, loadProjects]
  );

  /**
   * Save current state to the active project
   */
  const saveCurrentProject = useCallback(async () => {
    if (!currentProject) {
      setError('No project is currently loaded');
      logger.warn('Save current project', 'Attempted to save with no current project');
      return;
    }

    const updates: Partial<Project> = {
      state: {
        jsonInput,
        characters,
        scriptMeta,
        characterMetadata: Object.fromEntries(characterMetadata),
        generationOptions: { ...generationOptions },
        customIcons: [],
        filters,
        schemaVersion: 1,
      },
      lastModifiedAt: Date.now(),
    };

    await updateProject(currentProject.id, updates);
  }, [
    currentProject,
    jsonInput,
    characters,
    scriptMeta,
    characterMetadata,
    generationOptions,
    filters,
    updateProject,
  ]);

  /**
   * Activate a project (load and make current)
   * Pass empty string to deactivate current project
   */
  const activateProject = useCallback(
    async (projectId: string) => {
      if (!projectId) {
        // Deactivate current project
        setCurrentProject(null);
        setCharacters([]);
        setScriptMeta(null);
        setJsonInput('');
        setTokens([]);
        clearAllMetadata();
        logger.info('Activate project', 'Deactivated current project');
        return;
      }
      return loadProject(projectId);
    },
    [
      loadProject,
      setCurrentProject,
      setCharacters,
      setScriptMeta,
      setJsonInput,
      setTokens,
      clearAllMetadata,
    ]
  );

  /**
   * Duplicate a project
   */
  const duplicateProject = useCallback(
    async (projectId: string) => {
      // First load the source project
      const sourceProject = (await handleAsyncOperation(
        () => projectService.getProject(projectId),
        'Load project for duplication',
        setIsLoading,
        setError
      )) as Project | undefined;

      if (!sourceProject) {
        logger.warn('Duplicate project', 'Source project not found', { projectId });
        return undefined;
      }

      // Create a copy with a new name
      const duplicateName = `${sourceProject.name} (Copy)`;
      const options: CreateProjectOptions = {
        name: duplicateName,
        description: sourceProject.description,
        state: sourceProject.state,
      };

      const newProject = await handleAsyncOperation(
        () => projectService.createProject(options),
        'Duplicate project',
        setIsLoading,
        setError,
        {
          successMessage: `Project duplicated as "${duplicateName}"`,
          onSuccess: () => {
            // Refresh project list
            loadProjects().catch((err) =>
              logger.warn('Duplicate project', 'Failed to refresh project list', err)
            );
          },
        }
      );

      return newProject as Project | undefined;
    },
    [projectService, loadProjects]
  );

  // Auto-load projects on mount
  useEffect(() => {
    logger.info('useProjects', 'Hook mounted, loading projects');
    loadProjects().catch((err) =>
      logger.error('useProjects', 'Failed to load projects on mount', err)
    );
  }, [loadProjects]);

  return {
    // State
    projects,
    currentProject,
    isLoading,
    error,

    // Operations
    loadProjects,
    createProject,
    deleteProject,
    loadProject,
    updateProject,
    saveCurrentProject,
    activateProject,
    duplicateProject,
  };
}

export default useProjects;
