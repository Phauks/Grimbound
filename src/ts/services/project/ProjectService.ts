/**
 * Project Service
 *
 * Main orchestrator for project management.
 * Coordinates database, export, import, and state management.
 *
 * @module services/project/ProjectService
 */

import type {
  AutoSaveStatus,
  CreateProjectOptions,
  ExportOptions,
  ListProjectsOptions,
  Project,
  ProjectState,
  ProjectStats,
  ProjectThumbnail,
} from '../../types/project.js';
import { generateUuid } from '../../utils/nameGenerator.js';
import type { IProjectService } from './IProjectService.js';
import { projectDatabaseService } from './ProjectDatabaseService.js';
import { projectExporter } from './ProjectExporter.js';
import { projectImporter } from './ProjectImporter.js';

// ============================================================================
// ProjectService Implementation
// ============================================================================

/**
 * Main project management service
 */
export class ProjectService implements IProjectService {
  private currentProject: Project | null = null;
  private autoSaveStatus: AutoSaveStatus = {
    state: 'idle',
    isDirty: false,
  };

  // ==========================================================================
  // CRUD Operations
  // ==========================================================================

  /**
   * Create a new project
   */
  async createProject(options: CreateProjectOptions): Promise<Project> {
    const now = Date.now();

    // Generate default thumbnail
    const thumbnail: ProjectThumbnail = {
      type: options.thumbnailType || 'auto',
    };

    // Create default stats
    const stats: ProjectStats = {
      characterCount: 0,
      tokenCount: 0,
      reminderCount: 0,
      customIconCount: 0,
      presetCount: 0,
    };

    // Create default state
    const defaultState: ProjectState = {
      jsonInput: '',
      characters: [],
      scriptMeta: null,
      characterMetadata: {},
      generationOptions: {} as any, // Will be populated from context
      customIcons: [],
      filters: {
        teams: [],
        tokenTypes: [],
        display: [],
        reminders: [],
      },
      schemaVersion: 1,
    };

    const state: ProjectState = options.state
      ? { ...defaultState, ...options.state }
      : defaultState;

    // Create project
    const project: Project = {
      id: generateUuid(),
      name: options.name,
      description: options.description,
      createdAt: now,
      lastModifiedAt: now,
      lastAccessedAt: now,
      thumbnail,
      tags: options.tags || [],
      color: options.color,
      state,
      stats,
      schemaVersion: 1,
    };

    // Save to database
    await projectDatabaseService.saveProject(project);

    return project;
  }

  /**
   * Get a project by ID
   */
  async getProject(id: string): Promise<Project | null> {
    const project = await projectDatabaseService.loadProject(id);

    if (project) {
      // Update last accessed timestamp
      project.lastAccessedAt = Date.now();
      await projectDatabaseService.saveProject(project);
    }

    return project;
  }

  /**
   * Update a project
   */
  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const existing = await projectDatabaseService.loadProject(id);
    if (!existing) {
      throw new Error(`Project not found: ${id}`);
    }

    const updated: Project = {
      ...existing,
      ...updates,
      id: existing.id, // Prevent ID change
      lastModifiedAt: Date.now(),
    };

    await projectDatabaseService.saveProject(updated);

    // Update current project if it's the one being updated
    if (this.currentProject?.id === id) {
      this.currentProject = updated;
    }

    return updated;
  }

  /**
   * Delete a project
   */
  async deleteProject(id: string): Promise<void> {
    await projectDatabaseService.deleteProject(id);

    // Clear current project if it was deleted
    if (this.currentProject?.id === id) {
      this.currentProject = null;
    }
  }

  /**
   * List all projects with optional filtering and sorting
   */
  async listProjects(options: ListProjectsOptions = {}): Promise<Project[]> {
    let projects = await projectDatabaseService.listProjects();

    // Filter by tags
    if (options.filter?.tags && options.filter.tags.length > 0) {
      projects = projects.filter((p) => p.tags?.some((tag) => options.filter.tags!.includes(tag)));
    }

    // Filter by search query
    if (options.filter?.searchQuery) {
      const query = options.filter.searchQuery.toLowerCase();
      projects = projects.filter(
        (p) => p.name.toLowerCase().includes(query) || p.description?.toLowerCase().includes(query)
      );
    }

    // Sort
    const sortBy = options.sortBy || 'lastModifiedAt';
    const sortOrder = options.sortOrder || 'desc';

    projects.sort((a, b) => {
      let aVal: any = a[sortBy];
      let bVal: any = b[sortBy];

      // Handle string comparison
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    // Pagination
    if (options.limit) {
      const offset = options.offset || 0;
      projects = projects.slice(offset, offset + options.limit);
    }

    return projects;
  }

  // ==========================================================================
  // Project Switching
  // ==========================================================================

  /**
   * Switch to a different project
   */
  async switchToProject(projectId: string): Promise<void> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    this.currentProject = project;
  }

  /**
   * Get the currently active project
   */
  getCurrentProject(): Project | null {
    return this.currentProject;
  }

  // ==========================================================================
  // Import/Export
  // ==========================================================================

  /**
   * Export a project as a ZIP file
   */
  async exportProject(projectId: string, options: ExportOptions = {}): Promise<Blob> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    return projectExporter.exportAsZip(project, options);
  }

  /**
   * Export and download a project
   */
  async exportAndDownload(projectId: string, options: ExportOptions = {}): Promise<void> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    await projectExporter.exportAndDownload(project, options);
  }

  /**
   * Import a project from a ZIP file
   */
  async importProject(file: File): Promise<Project> {
    const project = await projectImporter.importFromZip(file);

    // Save to database
    await projectDatabaseService.saveProject(project);

    return project;
  }

  // ==========================================================================
  // Auto-Save
  // ==========================================================================

  /**
   * Save the current application state
   */
  async saveCurrentState(): Promise<void> {
    if (!this.currentProject) {
      throw new Error('No active project to save');
    }

    // This will be called from the auto-save hook
    // which already handles the save logic
    // Just update the status
    this.autoSaveStatus = {
      state: 'saved',
      isDirty: false,
      lastSavedAt: Date.now(),
    };
  }

  /**
   * Get the current auto-save status
   */
  getAutoSaveStatus(): AutoSaveStatus {
    return this.autoSaveStatus;
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Get storage quota information
   */
  async getStorageQuota() {
    return projectDatabaseService.getStorageQuota();
  }

  /**
   * Get database statistics
   */
  async getStats() {
    const quota = await projectDatabaseService.getStorageQuota();
    const projects = await projectDatabaseService.listProjects();

    return {
      projectCount: projects.length,
      quota,
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Singleton instance of ProjectService
 */
export const projectService = new ProjectService();
