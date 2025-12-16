/**
 * IndexedDB Database for Project Management
 *
 * This module defines the IndexedDB schema using Dexie.js for storing:
 * - Projects (complete project data)
 * - Assets (user-uploaded images and resources)
 * - Auto-save snapshots (for recovery)
 *
 * @module db/projectDb
 */

import Dexie, { Table } from 'dexie';
import type {
  DBProject,
  DBAutoSaveSnapshot,
  DBProjectVersion,
  DBCustomIcon,
  ProjectState,
  ProjectVersion,
  StorageQuota,
} from '../types/project.js';
import type { DBAsset } from '../services/upload/types.js';

// ============================================================================
// Database Class
// ============================================================================

/**
 * Main database class for project management
 *
 * Schema Version 1:
 * - projects: Stores complete project data
 * - autoSaveSnapshots: Stores auto-save state snapshots
 *
 * Schema Version 2:
 * - assets: Stores user-uploaded assets (backgrounds, icons, logos)
 *   - Added compound indexes for optimized queries: [type+projectId]
 *   - Multi-entry index for linkedTo (many-to-many character relationships)
 *   - Timestamp index for sorting by upload date
 *
 * Schema Version 3:
 * - assets: Added contentHash index for deduplication
 *
 * Schema Version 4:
 * - assets: Added lastUsedAt and usageCount indexes for usage analytics
 *
 * Schema Version 5:
 * - projectVersions: Stores manual version snapshots with semantic versioning
 *   - Added compound index [projectId+versionMajor+versionMinor] for version sorting
 *   - Timestamp index for chronological ordering
 */
export class ProjectDatabase extends Dexie {
  // Table definitions
  projects!: Table<DBProject, string>;
  autoSaveSnapshots!: Table<DBAutoSaveSnapshot, string>;
  assets!: Table<DBAsset, string>;
  projectVersions!: Table<DBProjectVersion, string>;
  customIcons!: Table<DBCustomIcon, string>;

  constructor() {
    super('botc-token-generator-projects');

    // Define schema version 1 (original schema)
    this.version(1).stores({
      // Projects table
      // Primary key: id
      // Indexes: name, lastModifiedAt, lastAccessedAt, tags (multi-entry)
      projects: 'id, name, lastModifiedAt, lastAccessedAt, *tags',

      // Auto-save snapshots table
      // Primary key: id
      // Indexes: projectId, timestamp
      autoSaveSnapshots: 'id, projectId, timestamp',
    });

    // Define schema version 2 (add assets table with optimized indexes)
    this.version(2).stores({
      // Keep existing tables (Dexie requires re-declaring all tables in new version)
      projects: 'id, name, lastModifiedAt, lastAccessedAt, *tags',
      autoSaveSnapshots: 'id, projectId, timestamp',

      // NEW: Assets table with compound indexes for performance
      // Primary key: id
      // Simple indexes: type, projectId, uploadedAt
      // Compound index: [type+projectId] - enables fast queries like "all backgrounds for project X"
      // Multi-entry index: *linkedTo - enables many-to-many character relationships
      assets: 'id, type, projectId, [type+projectId], *linkedTo, uploadedAt',
    });

    // Define schema version 3 (add contentHash index for deduplication)
    this.version(3).stores({
      // Keep existing tables
      projects: 'id, name, lastModifiedAt, lastAccessedAt, *tags',
      autoSaveSnapshots: 'id, projectId, timestamp',

      // UPDATE: Assets table - add contentHash index for fast duplicate detection
      assets: 'id, type, projectId, [type+projectId], *linkedTo, uploadedAt, contentHash',
    });

    // Define schema version 4 (add usage tracking indexes)
    this.version(4).stores({
      // Keep existing tables
      projects: 'id, name, lastModifiedAt, lastAccessedAt, *tags',
      autoSaveSnapshots: 'id, projectId, timestamp',

      // UPDATE: Assets table - add lastUsedAt and usageCount indexes for usage analytics
      // Enables sorting by "most used" and "least used" for cleanup decisions
      assets: 'id, type, projectId, [type+projectId], *linkedTo, uploadedAt, contentHash, lastUsedAt, usageCount',
    });

    // Define schema version 5 (add project versions table)
    this.version(5).stores({
      // Keep existing tables
      projects: 'id, name, lastModifiedAt, lastAccessedAt, *tags',
      autoSaveSnapshots: 'id, projectId, timestamp',
      assets: 'id, type, projectId, [type+projectId], *linkedTo, uploadedAt, contentHash, lastUsedAt, usageCount',

      // NEW: Project versions table
      // Primary key: id
      // Indexes: projectId (for querying all versions of a project)
      //          [projectId+versionMajor+versionMinor] (compound index for version sorting)
      //          createdAt (for chronological ordering)
      projectVersions: 'id, projectId, [projectId+versionMajor+versionMinor], createdAt',
    });

    // Define schema version 6 (add custom icons table)
    this.version(6).stores({
      // Keep existing tables
      projects: 'id, name, lastModifiedAt, lastAccessedAt, *tags',
      autoSaveSnapshots: 'id, projectId, timestamp',
      assets: 'id, type, projectId, [type+projectId], *linkedTo, uploadedAt, contentHash, lastUsedAt, usageCount',
      projectVersions: 'id, projectId, [projectId+versionMajor+versionMinor], createdAt',

      // NEW: Custom icons table
      // Primary key: id
      // Compound index: [characterId+projectId] for unique character-project lookup
      // Indexes: characterId, projectId for filtering
      customIcons: 'id, characterId, projectId, [characterId+projectId]',
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
    // Clear all tables individually - Dexie transaction supports max 6 tables
    await this.projects.clear();
    await this.autoSaveSnapshots.clear();
    await this.assets.clear();
    await this.projectVersions.clear();
    await this.customIcons.clear();
  }

  /**
   * Get database statistics
   */
  async getStats() {
    const [projectCount, assetCount, snapshotCount, versionCount, quota] = await Promise.all([
      this.projects.count(),
      this.assets.count(),
      this.autoSaveSnapshots.count(),
      this.projectVersions.count(),
      this.getStorageQuota(),
    ]);

    return {
      projectCount,
      assetCount,
      snapshotCount,
      versionCount,
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
   * Includes the project itself, project assets, auto-save snapshots, and versions
   *
   * @param projectId - Project ID to delete
   */
  async deleteProjectData(projectId: string): Promise<void> {
    await this.transaction('rw', this.projects, this.assets, this.autoSaveSnapshots, this.projectVersions, async () => {
      // Delete project
      await this.projects.delete(projectId);

      // Delete associated project assets
      await this.assets.where('projectId').equals(projectId).delete();

      // Delete associated snapshots
      await this.autoSaveSnapshots.where('projectId').equals(projectId).delete();

      // Delete associated versions
      await this.projectVersions.where('projectId').equals(projectId).delete();
    });
  }

  // ==========================================================================
  // Project Version Management
  // ==========================================================================

  /**
   * Create a new project version
   *
   * @param projectId - Parent project ID
   * @param versionNumber - Semantic version string (e.g., "1.2.0")
   * @param stateSnapshot - Project state at version creation
   * @param releaseNotes - Optional release notes/changelog
   * @param tags - Optional tags (e.g., ["alpha", "stable"])
   * @returns Created version
   */
  async createProjectVersion(
    projectId: string,
    versionNumber: string,
    stateSnapshot: ProjectState,
    releaseNotes?: string,
    tags?: string[]
  ): Promise<ProjectVersion> {
    const [major, minor, patch] = this.parseSemanticVersion(versionNumber);

    const dbVersion: DBProjectVersion = {
      id: crypto.randomUUID(),
      projectId,
      versionNumber,
      versionMajor: major,
      versionMinor: minor,
      versionPatch: patch || 0,
      stateJson: JSON.stringify(stateSnapshot),
      createdAt: Date.now(),
      releaseNotes,
      tags,
    };

    await this.projectVersions.add(dbVersion);

    // Return as ProjectVersion interface
    return {
      id: dbVersion.id,
      projectId: dbVersion.projectId,
      versionNumber: dbVersion.versionNumber,
      versionMajor: dbVersion.versionMajor,
      versionMinor: dbVersion.versionMinor,
      versionPatch: dbVersion.versionPatch,
      stateSnapshot,
      createdAt: dbVersion.createdAt,
      releaseNotes: dbVersion.releaseNotes,
      tags: dbVersion.tags,
    };
  }

  /**
   * Load all versions for a project, sorted by creation date (newest first)
   *
   * @param projectId - Project ID
   * @returns Array of versions
   */
  async loadProjectVersions(projectId: string): Promise<ProjectVersion[]> {
    const dbVersions = await this.projectVersions
      .where('projectId')
      .equals(projectId)
      .reverse()
      .sortBy('createdAt');

    return dbVersions.map((dbv) => ({
      id: dbv.id,
      projectId: dbv.projectId,
      versionNumber: dbv.versionNumber,
      versionMajor: dbv.versionMajor,
      versionMinor: dbv.versionMinor,
      versionPatch: dbv.versionPatch,
      stateSnapshot: JSON.parse(dbv.stateJson),
      createdAt: dbv.createdAt,
      releaseNotes: dbv.releaseNotes,
      tags: dbv.tags,
      isPublished: dbv.isPublished,
      publishedAt: dbv.publishedAt,
      downloadCount: dbv.downloadCount,
      networkId: dbv.networkId,
    }));
  }

  /**
   * Get the latest version for a project
   *
   * @param projectId - Project ID
   * @returns Latest version or null if no versions exist
   */
  async getLatestProjectVersion(projectId: string): Promise<ProjectVersion | null> {
    const versions = await this.loadProjectVersions(projectId);
    return versions[0] || null;
  }

  /**
   * Delete a specific version
   *
   * @param versionId - Version ID to delete
   */
  async deleteProjectVersion(versionId: string): Promise<void> {
    await this.projectVersions.delete(versionId);
  }

  /**
   * Parse semantic version string into components
   *
   * @param version - Semantic version string (e.g., "1.2.0" or "1.2")
   * @returns [major, minor, patch?]
   * @throws Error if version format is invalid
   */
  private parseSemanticVersion(version: string): [number, number, number?] {
    const match = version.match(/^(\d+)\.(\d+)(?:\.(\d+))?$/);
    if (!match) {
      throw new Error(`Invalid semantic version: ${version}. Use format: major.minor or major.minor.patch`);
    }
    return [
      parseInt(match[1]),
      parseInt(match[2]),
      match[3] ? parseInt(match[3]) : undefined,
    ];
  }

  /**
   * Suggest the next version number based on existing versions
   *
   * @param projectId - Project ID
   * @param incrementType - Type of increment (major, minor, or patch)
   * @returns Suggested next version string
   */
  async suggestNextVersion(
    projectId: string,
    incrementType: 'major' | 'minor' | 'patch' = 'minor'
  ): Promise<string> {
    const versions = await this.loadProjectVersions(projectId);

    // If no versions exist, start with 1.0.0
    if (versions.length === 0) {
      return '1.0.0';
    }

    const latest = versions[0];
    let { versionMajor, versionMinor, versionPatch } = latest;

    if (incrementType === 'major') {
      versionMajor += 1;
      versionMinor = 0;
      versionPatch = 0;
    } else if (incrementType === 'minor') {
      versionMinor += 1;
      versionPatch = 0;
    } else {
      versionPatch += 1;
    }

    return `${versionMajor}.${versionMinor}.${versionPatch}`;
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
