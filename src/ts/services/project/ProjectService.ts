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
} from '@/ts/types/project.js';
import type { GenerationOptions } from '@/ts/types/index.js';
import { generateUuid } from '@/ts/utils/nameGenerator.js';
import type { IProjectDatabase, IProjectExporter, IProjectImporter, IProjectService } from './IProjectService.js';
import { projectDatabaseService } from './ProjectDatabaseService.js';
import { projectExporter } from './ProjectExporter.js';
import { projectImporter } from './ProjectImporter.js';

// ============================================================================
// Dependency Injection Types
// ============================================================================

/**
 * Dependencies for ProjectService
 */
export interface ProjectServiceDeps {
  database: IProjectDatabase;
  exporter: IProjectExporter;
  importer: IProjectImporter;
}

// ============================================================================
// ProjectService Implementation
// ============================================================================

/**
 * Main project management service
 *
 * Uses constructor injection for testability. All dependencies have defaults
 * for convenient usage, but can be overridden for testing.
 *
 * @example
 * ```typescript
 * // Production usage (uses defaults)
 * const service = new ProjectService();
 *
 * // Testing with mocks
 * const mockDb = { saveProject: vi.fn(), loadProject: vi.fn(), ... };
 * const service = new ProjectService({ database: mockDb });
 * ```
 */
export class ProjectService implements IProjectService {
  private currentProject: Project | null = null;
  private autoSaveStatus: AutoSaveStatus = {
    state: 'idle',
    isDirty: false,
  };

  // Injected dependencies
  private readonly db: IProjectDatabase;
  private readonly exporter: IProjectExporter;
  private readonly importer: IProjectImporter;

  /**
   * Create a new ProjectService instance
   *
   * @param deps - Optional dependencies for injection (defaults to singleton instances)
   */
  constructor(deps: Partial<ProjectServiceDeps> = {}) {
    this.db = deps.database ?? projectDatabaseService;
    this.exporter = deps.exporter ?? projectExporter;
    this.importer = deps.importer ?? projectImporter;
  }

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
      generationOptions: {} as GenerationOptions, // Will be populated from context
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
    await this.db.saveProject(project);

    return project;
  }

  /**
   * Get a project by ID
   */
  async getProject(id: string): Promise<Project | null> {
    const project = await this.db.loadProject(id);

    if (project) {
      // Update last accessed timestamp
      project.lastAccessedAt = Date.now();
      await this.db.saveProject(project);
    }

    return project;
  }

  /**
   * Update a project
   */
  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const existing = await this.db.loadProject(id);
    if (!existing) {
      throw new Error(`Project not found: ${id}`);
    }

    const updated: Project = {
      ...existing,
      ...updates,
      id: existing.id, // Prevent ID change
      lastModifiedAt: Date.now(),
    };

    await this.db.saveProject(updated);

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
    await this.db.deleteProject(id);

    // Clear current project if it was deleted
    if (this.currentProject?.id === id) {
      this.currentProject = null;
    }
  }

  /**
   * List all projects with optional filtering and sorting
   */
  async listProjects(options: ListProjectsOptions = {}): Promise<Project[]> {
    let projects = await this.db.listProjects();

    // Filter by tags
    if (options.filter?.tags && options.filter.tags.length > 0) {
      const filterTags = options.filter.tags;
      projects = projects.filter((p) => p.tags?.some((tag) => filterTags.includes(tag)));
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
      let aVal: string | number | Date = a[sortBy] as string | number | Date;
      let bVal: string | number | Date = b[sortBy] as string | number | Date;

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

    return this.exporter.exportAsZip(project, options);
  }

  /**
   * Export and download a project
   */
  async exportAndDownload(projectId: string, options: ExportOptions = {}): Promise<void> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    // Use the exporter to create the zip first
    const zipBlob = await this.exporter.exportAsZip(project, options);
    const filename = this.exporter.generateFilename(project.name);

    // Download the file
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Import a project from a ZIP file
   */
  async importProject(file: File): Promise<Project> {
    const project = await this.importer.importFromZip(file);

    // Save to database
    await this.db.saveProject(project);

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
    return this.db.getStorageQuota();
  }

  /**
   * Get database statistics
   */
  async getStats() {
    const quota = await this.db.getStorageQuota();
    const projects = await this.db.listProjects();

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
