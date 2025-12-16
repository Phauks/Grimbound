/**
 * Project Service Interfaces
 *
 * Defines the contracts for project management services.
 * These interfaces enable dependency injection and testing.
 *
 * @module services/project/IProjectService
 */

import type {
  AutoSaveSnapshot,
  AutoSaveStatus,
  CreateProjectOptions,
  CustomIcon,
  ExportOptions,
  ListProjectsOptions,
  Project,
  ProjectPreview,
  StorageQuota,
  ValidationResult,
} from '../../types/project.js';

// ============================================================================
// Main Project Service Interface
// ============================================================================

/**
 * Main project management service
 * Handles CRUD operations, project switching, and auto-save coordination
 */
export interface IProjectService {
  // ---------------------------------------------------------------------------
  // CRUD Operations
  // ---------------------------------------------------------------------------

  /**
   * Create a new project
   *
   * @param options - Project creation options
   * @returns Newly created project
   */
  createProject(options: CreateProjectOptions): Promise<Project>;

  /**
   * Get a project by ID
   *
   * @param id - Project ID
   * @returns Project if found, null otherwise
   */
  getProject(id: string): Promise<Project | null>;

  /**
   * Update a project
   *
   * @param id - Project ID
   * @param updates - Partial project data to update
   * @returns Updated project
   */
  updateProject(id: string, updates: Partial<Project>): Promise<Project>;

  /**
   * Delete a project and all associated data
   *
   * @param id - Project ID
   */
  deleteProject(id: string): Promise<void>;

  /**
   * List all projects with optional filtering and sorting
   *
   * @param options - Listing options
   * @returns Array of projects
   */
  listProjects(options?: ListProjectsOptions): Promise<Project[]>;

  // ---------------------------------------------------------------------------
  // Project Switching
  // ---------------------------------------------------------------------------

  /**
   * Switch to a different project
   * Saves current project if needed, then loads new project
   *
   * @param projectId - ID of project to switch to
   */
  switchToProject(projectId: string): Promise<void>;

  /**
   * Get the currently active project
   *
   * @returns Current project or null if none active
   */
  getCurrentProject(): Project | null;

  // ---------------------------------------------------------------------------
  // Import/Export
  // ---------------------------------------------------------------------------

  /**
   * Export a project as a ZIP file
   *
   * @param projectId - Project ID to export
   * @param options - Export options
   * @returns ZIP file as Blob
   */
  exportProject(projectId: string, options?: ExportOptions): Promise<Blob>;

  /**
   * Import a project from a ZIP file
   *
   * @param file - ZIP file to import
   * @returns Imported project
   */
  importProject(file: File): Promise<Project>;

  // ---------------------------------------------------------------------------
  // Auto-Save
  // ---------------------------------------------------------------------------

  /**
   * Save the current application state to the active project
   */
  saveCurrentState(): Promise<void>;

  /**
   * Get the current auto-save status
   *
   * @returns Auto-save status
   */
  getAutoSaveStatus(): AutoSaveStatus;
}

// ============================================================================
// Project Database Interface
// ============================================================================

/**
 * Database layer interface for project persistence
 */
export interface IProjectDatabase {
  // ---------------------------------------------------------------------------
  // Projects
  // ---------------------------------------------------------------------------

  /**
   * Save a project to the database
   */
  saveProject(project: Project): Promise<void>;

  /**
   * Load a project from the database
   */
  loadProject(id: string): Promise<Project | null>;

  /**
   * Delete a project from the database
   */
  deleteProject(id: string): Promise<void>;

  /**
   * List all projects
   */
  listProjects(): Promise<Project[]>;

  // ---------------------------------------------------------------------------
  // Custom Icons
  // ---------------------------------------------------------------------------

  /**
   * Save a custom icon
   */
  saveIcon(icon: CustomIcon): Promise<void>;

  /**
   * Load a custom icon
   */
  loadIcon(characterId: string, projectId: string): Promise<CustomIcon | null>;

  /**
   * Delete a custom icon
   */
  deleteIcon(characterId: string, projectId: string): Promise<void>;

  /**
   * Load all icons for a project
   */
  loadIconsForProject(projectId: string): Promise<CustomIcon[]>;

  // ---------------------------------------------------------------------------
  // Auto-Save Snapshots
  // ---------------------------------------------------------------------------

  /**
   * Save an auto-save snapshot
   */
  saveSnapshot(snapshot: AutoSaveSnapshot): Promise<void>;

  /**
   * Load snapshots for a project
   */
  loadSnapshots(projectId: string, limit?: number): Promise<AutoSaveSnapshot[]>;

  /**
   * Delete old snapshots, keeping only the most recent N
   */
  deleteOldSnapshots(projectId: string, keepCount: number): Promise<void>;

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  /**
   * Get storage quota information
   */
  getStorageQuota(): Promise<StorageQuota>;

  /**
   * Clear all data (use with caution!)
   */
  clearAll(): Promise<void>;
}

// ============================================================================
// Project Exporter Interface
// ============================================================================

/**
 * Handles exporting projects to ZIP files
 */
export interface IProjectExporter {
  /**
   * Export a project as a ZIP file
   *
   * @param project - Project to export
   * @param options - Export options
   * @returns ZIP file as Blob
   */
  exportAsZip(project: Project, options: ExportOptions): Promise<Blob>;

  /**
   * Generate a filename for export
   *
   * @param projectName - Project name
   * @returns Sanitized filename with timestamp
   */
  generateFilename(projectName: string): string;
}

// ============================================================================
// Project Importer Interface
// ============================================================================

/**
 * Handles importing projects from ZIP files
 */
export interface IProjectImporter {
  /**
   * Import a project from a ZIP file
   *
   * @param file - ZIP file to import
   * @returns Imported project
   */
  importFromZip(file: File): Promise<Project>;

  /**
   * Validate a ZIP file structure
   *
   * @param file - ZIP file to validate
   * @returns Validation result
   */
  validateZip(file: File): Promise<ValidationResult>;

  /**
   * Preview a ZIP file without importing
   *
   * @param file - ZIP file to preview
   * @returns Preview data
   */
  previewZip(file: File): Promise<ProjectPreview>;
}
