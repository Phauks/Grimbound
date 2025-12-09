/**
 * IndexedDB Database for Project Management
 *
 * This module defines the IndexedDB schema using Dexie.js for storing:
 * - Projects (complete project data)
 * - Custom icons (user-uploaded character images)
 * - Auto-save snapshots (for recovery)
 *
 * @module db/projectDb
 */

import Dexie, { Table } from 'dexie';
import type {
  DBProject,
  DBCustomIcon,
  DBAutoSaveSnapshot,
  StorageQuota,
} from '../types/project.js';

// ============================================================================
// Database Class
// ============================================================================

/**
 * Main database class for project management
 *
 * Schema Version 1:
 * - projects: Stores complete project data
 * - customIcons: Stores user-uploaded character icons
 * - autoSaveSnapshots: Stores auto-save state snapshots
 */
export class ProjectDatabase extends Dexie {
  // Table definitions
  projects!: Table<DBProject, string>;
  customIcons!: Table<DBCustomIcon, string>;
  autoSaveSnapshots!: Table<DBAutoSaveSnapshot, string>;

  constructor() {
    super('botc-token-generator-projects');

    // Define schema version 1
    this.version(1).stores({
      // Projects table
      // Primary key: id
      // Indexes: name, lastModifiedAt, lastAccessedAt, tags (multi-entry)
      projects: 'id, name, lastModifiedAt, lastAccessedAt, *tags',

      // Custom icons table
      // Primary key: id
      // Indexes: characterId, projectId
      customIcons: 'id, characterId, projectId',

      // Auto-save snapshots table
      // Primary key: id
      // Indexes: projectId, timestamp
      autoSaveSnapshots: 'id, projectId, timestamp',
    });
  }

  // ==========================================================================
  // Storage Quota Management
  // ==========================================================================

  /**
   * Get current storage quota information
   *
   * @returns Storage quota details including usage and available space
   */
  async getStorageQuota(): Promise<StorageQuota> {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;

      return {
        usage,
        quota,
        usageMB: usage / (1024 * 1024),
        quotaMB: quota / (1024 * 1024),
        percentUsed: quota > 0 ? (usage / quota) * 100 : 0,
      };
    }

    // Fallback if Storage API not available
    return {
      usage: 0,
      quota: 0,
      usageMB: 0,
      quotaMB: 0,
      percentUsed: 0,
    };
  }

  // ==========================================================================
  // Database Utilities
  // ==========================================================================

  /**
   * Clear all data from the database
   * WARNING: This is destructive and cannot be undone
   */
  async clearAll(): Promise<void> {
    await this.transaction('rw', this.projects, this.customIcons, this.autoSaveSnapshots, async () => {
      await this.projects.clear();
      await this.customIcons.clear();
      await this.autoSaveSnapshots.clear();
    });
  }

  /**
   * Get database statistics
   */
  async getStats() {
    const [projectCount, iconCount, snapshotCount, quota] = await Promise.all([
      this.projects.count(),
      this.customIcons.count(),
      this.autoSaveSnapshots.count(),
      this.getStorageQuota(),
    ]);

    return {
      projectCount,
      iconCount,
      snapshotCount,
      quota,
    };
  }

  /**
   * Delete old auto-save snapshots for a project, keeping only the most recent N
   *
   * @param projectId - Project ID
   * @param keepCount - Number of snapshots to keep (default: 10)
   */
  async cleanupOldSnapshots(projectId: string, keepCount: number = 10): Promise<void> {
    // Get all snapshots for this project, sorted by timestamp descending
    const snapshots = await this.autoSaveSnapshots
      .where('projectId')
      .equals(projectId)
      .reverse()
      .sortBy('timestamp');

    // If we have more than keepCount, delete the oldest ones
    if (snapshots.length > keepCount) {
      const snapshotsToDelete = snapshots.slice(keepCount);
      const idsToDelete = snapshotsToDelete.map((s) => s.id);
      await this.autoSaveSnapshots.bulkDelete(idsToDelete);
    }
  }

  /**
   * Delete all data associated with a project
   * Includes the project itself, custom icons, and auto-save snapshots
   *
   * @param projectId - Project ID to delete
   */
  async deleteProjectData(projectId: string): Promise<void> {
    await this.transaction('rw', this.projects, this.customIcons, this.autoSaveSnapshots, async () => {
      // Delete project
      await this.projects.delete(projectId);

      // Delete associated custom icons
      await this.customIcons.where('projectId').equals(projectId).delete();

      // Delete associated snapshots
      await this.autoSaveSnapshots.where('projectId').equals(projectId).delete();
    });
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Singleton database instance
 * Use this throughout the application to access the database
 */
export const projectDb = new ProjectDatabase();
