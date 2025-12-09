/**
 * Projects Management Hook
 *
 * Provides project CRUD operations and state management for UI components.
 *
 * @module hooks/useProjects
 */

import { useState, useEffect, useCallback } from 'react';
import { useProjectContext } from '../contexts/ProjectContext';
import { useTokenContext } from '../contexts/TokenContext';
import { projectService } from '../ts/services/project';
import type { Project, CreateProjectOptions, ListProjectsOptions } from '../ts/types/project.js';

export function useProjects() {
  const { currentProject, setCurrentProject, projects, setProjects } = useProjectContext();
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
  const loadProjects = useCallback(async (options?: ListProjectsOptions) => {
    try {
      setIsLoading(true);
      setError(null);
      const loadedProjects = await projectService.listProjects(options);
      setProjects(loadedProjects);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
      console.error('Failed to load projects:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Create a new project from current state
   */
  const createProject = useCallback(
    async (name: string, description?: string) => {
      try {
        setIsLoading(true);
        setError(null);

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

        const project = await projectService.createProject(options);
        setCurrentProject(project);
        await loadProjects(); // Refresh list

        return project;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create project');
        console.error('Failed to create project:', err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [
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
      try {
        setIsLoading(true);
        setError(null);

        await projectService.deleteProject(projectId);

        // If deleted project was current, clear it
        if (currentProject?.id === projectId) {
          setCurrentProject(null);
        }

        await loadProjects(); // Refresh list
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete project');
        console.error('Failed to delete project:', err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [currentProject, setCurrentProject, loadProjects]
  );

  /**
   * Load a project (without activating it)
   */
  const loadProject = useCallback(
    async (projectId: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const project = await projectService.getProject(projectId);
        if (!project) {
          throw new Error('Project not found');
        }

        setCurrentProject(project);
        return project;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load project');
        console.error('Failed to load project:', err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [setCurrentProject]
  );

  /**
   * Activate a project (load it and apply its state to TokenContext)
   * Pass empty string to deactivate the current project
   */
  const activateProject = useCallback(
    async (projectId: string) => {
      try {
        setIsLoading(true);
        setError(null);

        // Handle deactivation case
        if (!projectId) {
          setCurrentProject(null);
          // Clear all associated data to prevent stale information
          setJsonInput('');
          setCharacters([]);
          setTokens([]);
          setScriptMeta(null);
          clearAllMetadata();
          return null;
        }

        const project = await projectService.getProject(projectId);
        if (!project) {
          throw new Error('Project not found');
        }

        // Set as current project
        setCurrentProject(project);

        // Apply project state to TokenContext
        setJsonInput(project.state.jsonInput);
        setCharacters(project.state.characters);
        setScriptMeta(project.state.scriptMeta);

        // Apply generation options
        updateGenerationOptions(project.state.generationOptions);

        // Apply character metadata
        clearAllMetadata();
        if (project.state.characterMetadata) {
          Object.entries(project.state.characterMetadata).forEach(([uuid, metadata]) => {
            setMetadata(uuid, metadata);
          });
        }

        return project;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to activate project');
        console.error('Failed to activate project:', err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [
      setCurrentProject,
      setJsonInput,
      setCharacters,
      setTokens,
      setScriptMeta,
      updateGenerationOptions,
      clearAllMetadata,
      setMetadata,
    ]
  );

  /**
   * Export a project
   */
  const exportProject = useCallback(async (projectId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      await projectService.exportAndDownload(projectId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export project');
      console.error('Failed to export project:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Import a project
   */
  const importProject = useCallback(
    async (file: File) => {
      try {
        setIsLoading(true);
        setError(null);

        const project = await projectService.importProject(file);
        await loadProjects(); // Refresh list

        return project;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to import project');
        console.error('Failed to import project:', err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [loadProjects]
  );

  /**
   * Duplicate a project
   */
  const duplicateProject = useCallback(
    async (projectId: string) => {
      try {
        setIsLoading(true);
        setError(null);

        // Get the source project
        const sourceProject = await projectService.getProject(projectId);
        if (!sourceProject) {
          throw new Error('Project not found');
        }

        // Create a new project with copied state
        const options: CreateProjectOptions = {
          name: `${sourceProject.name} (Copy)`,
          description: sourceProject.description,
          state: {
            ...sourceProject.state,
          },
        };

        const newProject = await projectService.createProject(options);
        await loadProjects(); // Refresh list

        return newProject;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to duplicate project');
        console.error('Failed to duplicate project:', err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [loadProjects]
  );

  /**
   * Update project metadata
   */
  const updateProject = useCallback(
    async (projectId: string, updates: Partial<Project>) => {
      try {
        setIsLoading(true);
        setError(null);

        const updated = await projectService.updateProject(projectId, updates);

        // Update current project if it's the one being updated
        if (currentProject?.id === projectId) {
          setCurrentProject(updated);
        }

        await loadProjects(); // Refresh list

        return updated;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update project');
        console.error('Failed to update project:', err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [currentProject, setCurrentProject, loadProjects]
  );

  // Load projects on mount
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return {
    // State
    projects,
    currentProject,
    isLoading,
    error,

    // Actions
    createProject,
    loadProject,
    activateProject,
    updateProject,
    deleteProject,
    duplicateProject,
    exportProject,
    importProject,
    loadProjects,
  };
}
