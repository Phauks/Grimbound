/**
 * Project Database Service
 *
 * Implements the IProjectDatabase interface using Dexie.js
 * Handles conversion between domain types and database entities
 *
 * @module services/project/ProjectDatabaseService
 */

import { projectDb } from '../../db/projectDb.js';
import type {
  AutoSaveSnapshot,
  CustomIcon,
  DBAutoSaveSnapshot,
  DBCustomIcon,
  DBProject,
  Project,
  StorageQuota,
} from '../../types/project.js';
import { generateUuid } from '../../utils/nameGenerator.js';
import type { IProjectDatabase } from './IProjectService.js';

// ============================================================================
// ProjectDatabaseService Implementation
// ============================================================================

/**
 * Database service for project persistence
 * Converts between domain types and database entities
 */
export class ProjectDatabaseService implements IProjectDatabase {
  // ==========================================================================
  // Projects
  // ==========================================================================

  /**
   * Save a project to the database
   */
  async saveProject(project: Project): Promise<void> {
    const dbProject = this.projectToDbProject(project);
    await projectDb.projects.put(dbProject);
  }

  /**
   * Load a project from the database
   */
  async loadProject(id: string): Promise<Project | null> {
    const dbProject = await projectDb.projects.get(id);
    if (!dbProject) {
      return null;
    }
    return this.dbProjectToProject(dbProject);
  }

  /**
   * Delete a project from the database
   * Also deletes associated custom icons and snapshots
   */
  async deleteProject(id: string): Promise<void> {
    await projectDb.deleteProjectData(id);
  }

  /**
   * List all projects
   */
  async listProjects(): Promise<Project[]> {
    const dbProjects = await projectDb.projects.toArray();
    return dbProjects.map((dbProject) => this.dbProjectToProject(dbProject));
  }

  // ==========================================================================
  // Custom Icons
  // ==========================================================================

  /**
   * Save a custom icon
   */
  async saveIcon(icon: CustomIcon): Promise<void> {
    const dbIcon: DBCustomIcon = {
      id: generateUuid(),
      characterId: icon.characterId,
      projectId: icon.projectId,
      characterName: icon.characterName,
      filename: icon.filename,
      dataUrl: await this.blobToDataUrl(icon.blob),
      mimeType: icon.mimeType,
      fileSize: icon.fileSize,
      uploadedAt: icon.uploadedAt,
    };

    await projectDb.customIcons.put(dbIcon);
  }

  /**
   * Load a custom icon
   */
  async loadIcon(characterId: string, projectId: string): Promise<CustomIcon | null> {
    const dbIcon = await projectDb.customIcons
      .where('[characterId+projectId]')
      .equals([characterId, projectId])
      .first();

    if (!dbIcon) {
      return null;
    }

    return this.dbIconToIcon(dbIcon);
  }

  /**
   * Delete a custom icon
   */
  async deleteIcon(characterId: string, projectId: string): Promise<void> {
    await projectDb.customIcons
      .where('[characterId+projectId]')
      .equals([characterId, projectId])
      .delete();
  }

  /**
   * Load all icons for a project
   */
  async loadIconsForProject(projectId: string): Promise<CustomIcon[]> {
    const dbIcons = await projectDb.customIcons.where('projectId').equals(projectId).toArray();

    return Promise.all(dbIcons.map((dbIcon) => this.dbIconToIcon(dbIcon)));
  }

  // ==========================================================================
  // Auto-Save Snapshots
  // ==========================================================================

  /**
   * Save an auto-save snapshot
   */
  async saveSnapshot(snapshot: AutoSaveSnapshot): Promise<void> {
    const dbSnapshot: DBAutoSaveSnapshot = {
      id: snapshot.id,
      projectId: snapshot.projectId,
      timestamp: snapshot.timestamp,
      stateJson: JSON.stringify(snapshot.stateSnapshot),
    };

    await projectDb.autoSaveSnapshots.put(dbSnapshot);

    // Clean up old snapshots (keep last 10)
    await projectDb.cleanupOldSnapshots(snapshot.projectId, 10);
  }

  /**
   * Load snapshots for a project
   */
  async loadSnapshots(projectId: string, limit: number = 10): Promise<AutoSaveSnapshot[]> {
    const dbSnapshots = await projectDb.autoSaveSnapshots
      .where('projectId')
      .equals(projectId)
      .reverse()
      .sortBy('timestamp');

    // Limit results
    const limitedSnapshots = dbSnapshots.slice(0, limit);

    return limitedSnapshots.map((dbSnapshot) => this.dbSnapshotToSnapshot(dbSnapshot));
  }

  /**
   * Delete old snapshots, keeping only the most recent N
   */
  async deleteOldSnapshots(projectId: string, keepCount: number): Promise<void> {
    await projectDb.cleanupOldSnapshots(projectId, keepCount);
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  /**
   * Get storage quota information
   */
  async getStorageQuota(): Promise<StorageQuota> {
    return projectDb.getStorageQuota();
  }

  /**
   * Clear all data (use with caution!)
   */
  async clearAll(): Promise<void> {
    await projectDb.clearAll();
  }

  // ==========================================================================
  // Type Conversion Helpers
  // ==========================================================================

  /**
   * Convert Project to DBProject
   */
  private projectToDbProject(project: Project): DBProject {
    return {
      id: project.id,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt,
      lastModifiedAt: project.lastModifiedAt,
      lastAccessedAt: project.lastAccessedAt,
      thumbnailDataUrl: this.getThumbnailDataUrl(project.thumbnail),
      thumbnailConfig: project.thumbnail,
      tags: project.tags || [],
      color: project.color,
      stateJson: JSON.stringify(project.state),
      stats: project.stats,
      schemaVersion: project.schemaVersion,
    };
  }

  /**
   * Convert DBProject to Project
   */
  private dbProjectToProject(dbProject: DBProject): Project {
    return {
      id: dbProject.id,
      name: dbProject.name,
      description: dbProject.description,
      createdAt: dbProject.createdAt,
      lastModifiedAt: dbProject.lastModifiedAt,
      lastAccessedAt: dbProject.lastAccessedAt,
      thumbnail: dbProject.thumbnailConfig,
      tags: dbProject.tags,
      color: dbProject.color,
      state: JSON.parse(dbProject.stateJson),
      stats: dbProject.stats,
      schemaVersion: dbProject.schemaVersion,
    };
  }

  /**
   * Convert DBCustomIcon to CustomIcon
   */
  private async dbIconToIcon(dbIcon: DBCustomIcon): Promise<CustomIcon> {
    const blob = await this.dataUrlToBlob(dbIcon.dataUrl);

    return {
      characterId: dbIcon.characterId,
      projectId: dbIcon.projectId,
      characterName: dbIcon.characterName,
      filename: dbIcon.filename,
      blob,
      mimeType: dbIcon.mimeType,
      fileSize: dbIcon.fileSize,
      uploadedAt: dbIcon.uploadedAt,
    };
  }

  /**
   * Convert DBAutoSaveSnapshot to AutoSaveSnapshot
   */
  private dbSnapshotToSnapshot(dbSnapshot: DBAutoSaveSnapshot): AutoSaveSnapshot {
    return {
      id: dbSnapshot.id,
      projectId: dbSnapshot.projectId,
      timestamp: dbSnapshot.timestamp,
      stateSnapshot: JSON.parse(dbSnapshot.stateJson),
    };
  }

  /**
   * Extract data URL from thumbnail config
   */
  private getThumbnailDataUrl(thumbnail: Project['thumbnail']): string {
    switch (thumbnail.type) {
      case 'auto':
        return thumbnail.auto?.dataUrl || '';
      case 'token':
        return thumbnail.token?.dataUrl || '';
      case 'script-logo':
        return thumbnail.scriptLogo?.dataUrl || '';
      case 'custom':
        return thumbnail.custom?.dataUrl || '';
      default:
        return '';
    }
  }

  /**
   * Convert Blob to data URL
   */
  private async blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Convert data URL to Blob
   */
  private async dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const response = await fetch(dataUrl);
    return response.blob();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Singleton instance of ProjectDatabaseService
 */
export const projectDatabaseService = new ProjectDatabaseService();
