/**
 * Asset Storage Service
 *
 * Handles CRUD operations for assets in IndexedDB.
 * Provides methods for querying, filtering, and managing asset lifecycle.
 *
 * @module services/upload/AssetStorageService
 */

import { projectDb } from '../../ts/db/projectDb.js';
import type { DBAsset, AssetType, AssetMetadata } from '../../ts/types/project.js';
import type { AssetFilter, AssetWithUrl, ExportableAsset } from './types.js';
import { ASSET_ZIP_PATHS } from './constants.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Data needed to create a new asset (without id)
 */
export interface CreateAssetData {
  type: AssetType;
  projectId: string | null;
  blob: Blob;
  thumbnail: Blob;
  metadata: AssetMetadata;
  linkedTo?: string[];
}

/**
 * URL cache entry with revocation tracking
 */
interface UrlCacheEntry {
  url: string;
  thumbnailUrl: string;
  refCount: number;
}

// ============================================================================
// AssetStorageService
// ============================================================================

/**
 * Service for managing asset storage in IndexedDB
 */
export class AssetStorageService {
  /** Cache of object URLs for assets */
  private urlCache: Map<string, UrlCacheEntry> = new Map();

  // ==========================================================================
  // CRUD Operations
  // ==========================================================================

  /**
   * Save a new asset to the database
   *
   * @param data - Asset data (without id)
   * @returns Created asset ID
   */
  async save(data: CreateAssetData): Promise<string> {
    const id = crypto.randomUUID();
    const asset: DBAsset = {
      id,
      type: data.type,
      projectId: data.projectId,
      blob: data.blob,
      thumbnail: data.thumbnail,
      metadata: data.metadata,
      linkedTo: data.linkedTo ?? [],
    };

    await projectDb.assets.add(asset);
    return id;
  }

  /**
   * Get an asset by ID
   *
   * @param id - Asset ID
   * @returns Asset or undefined if not found
   */
  async getById(id: string): Promise<DBAsset | undefined> {
    return projectDb.assets.get(id);
  }

  /**
   * Get an asset with object URLs for display
   *
   * @param id - Asset ID
   * @returns Asset with URLs or undefined
   */
  async getByIdWithUrl(id: string): Promise<AssetWithUrl | undefined> {
    const asset = await this.getById(id);
    if (!asset) return undefined;
    return this.attachUrls(asset);
  }

  /**
   * Update an existing asset
   *
   * @param id - Asset ID
   * @param updates - Partial asset data to update
   */
  async update(id: string, updates: Partial<Omit<DBAsset, 'id'>>): Promise<void> {
    // Revoke cached URLs if blob is being updated
    if (updates.blob || updates.thumbnail) {
      this.revokeUrl(id);
    }

    await projectDb.assets.update(id, updates);
  }

  /**
   * Delete an asset by ID
   *
   * @param id - Asset ID
   */
  async delete(id: string): Promise<void> {
    this.revokeUrl(id);
    await projectDb.assets.delete(id);
  }

  /**
   * Delete multiple assets by ID
   *
   * @param ids - Array of asset IDs
   */
  async bulkDelete(ids: string[]): Promise<void> {
    ids.forEach((id) => this.revokeUrl(id));
    await projectDb.assets.bulkDelete(ids);
  }

  // ==========================================================================
  // Query Operations
  // ==========================================================================

  /**
   * Get all assets matching a filter
   *
   * @param filter - Filter options
   * @returns Filtered assets
   */
  async list(filter: AssetFilter = {}): Promise<DBAsset[]> {
    let collection = projectDb.assets.toCollection();

    // Apply type filter
    if (filter.type) {
      const types = Array.isArray(filter.type) ? filter.type : [filter.type];
      collection = projectDb.assets.where('type').anyOf(types);
    }

    // Get all results first
    let results = await collection.toArray();

    // Apply project filter
    if (filter.projectId !== undefined && filter.projectId !== 'all') {
      results = results.filter((a) => a.projectId === filter.projectId);
    }

    // Apply search filter
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      results = results.filter((a) =>
        a.metadata.filename.toLowerCase().includes(searchLower)
      );
    }

    // Apply orphaned filter
    if (filter.orphanedOnly) {
      results = results.filter((a) => a.linkedTo.length === 0);
    }

    // Apply sorting
    const sortBy = filter.sortBy ?? 'uploadedAt';
    const sortDir = filter.sortDirection ?? 'desc';
    results.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (sortBy) {
        case 'filename':
          aVal = a.metadata.filename.toLowerCase();
          bVal = b.metadata.filename.toLowerCase();
          break;
        case 'size':
          aVal = a.metadata.size;
          bVal = b.metadata.size;
          break;
        case 'type':
          aVal = a.type;
          bVal = b.type;
          break;
        case 'uploadedAt':
        default:
          aVal = a.metadata.uploadedAt;
          bVal = b.metadata.uploadedAt;
      }

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return results;
  }

  /**
   * Get all assets with object URLs
   *
   * @param filter - Filter options
   * @returns Assets with URLs
   */
  async listWithUrls(filter: AssetFilter = {}): Promise<AssetWithUrl[]> {
    const assets = await this.list(filter);
    return assets.map((a) => this.attachUrls(a));
  }

  /**
   * Get assets by type
   *
   * @param type - Asset type
   * @returns Assets of that type
   */
  async getByType(type: AssetType): Promise<DBAsset[]> {
    return projectDb.assets.where('type').equals(type).toArray();
  }

  /**
   * Get assets for a specific project
   *
   * @param projectId - Project ID
   * @returns Project assets
   */
  async getByProject(projectId: string): Promise<DBAsset[]> {
    return projectDb.assets.where('projectId').equals(projectId).toArray();
  }

  /**
   * Get all global assets (not associated with any project)
   *
   * @returns Global assets
   */
  async getGlobal(): Promise<DBAsset[]> {
    // Note: Dexie doesn't index null well, so we filter manually
    const all = await projectDb.assets.toArray();
    return all.filter((a) => a.projectId === null);
  }

  /**
   * Get orphaned assets (not linked to any character)
   *
   * @returns Orphaned assets
   */
  async getOrphaned(): Promise<DBAsset[]> {
    const all = await projectDb.assets.toArray();
    return all.filter((a) => a.linkedTo.length === 0);
  }

  /**
   * Get assets linked to a specific character
   *
   * @param characterId - Character ID
   * @returns Assets linked to that character
   */
  async getByCharacter(characterId: string): Promise<DBAsset[]> {
    return projectDb.assets.where('linkedTo').equals(characterId).toArray();
  }

  // ==========================================================================
  // Linking Operations
  // ==========================================================================

  /**
   * Link an asset to a character
   *
   * @param assetId - Asset ID
   * @param characterId - Character ID to link
   */
  async linkToCharacter(assetId: string, characterId: string): Promise<void> {
    const asset = await this.getById(assetId);
    if (!asset) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    if (!asset.linkedTo.includes(characterId)) {
      await this.update(assetId, {
        linkedTo: [...asset.linkedTo, characterId],
      });
    }
  }

  /**
   * Unlink an asset from a character
   *
   * @param assetId - Asset ID
   * @param characterId - Character ID to unlink
   */
  async unlinkFromCharacter(assetId: string, characterId: string): Promise<void> {
    const asset = await this.getById(assetId);
    if (!asset) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    await this.update(assetId, {
      linkedTo: asset.linkedTo.filter((id) => id !== characterId),
    });
  }

  /**
   * Replace all links for a character (useful when changing icon)
   *
   * @param characterId - Character ID
   * @param newAssetId - New asset ID (or null to unlink all)
   * @param assetType - Type of asset being linked
   */
  async replaceCharacterLink(
    characterId: string,
    newAssetId: string | null,
    assetType: AssetType
  ): Promise<void> {
    // Find and unlink all existing assets of this type for this character
    const existingAssets = await this.getByCharacter(characterId);
    const assetsOfType = existingAssets.filter((a) => a.type === assetType);

    for (const asset of assetsOfType) {
      await this.unlinkFromCharacter(asset.id, characterId);
    }

    // Link new asset if provided
    if (newAssetId) {
      await this.linkToCharacter(newAssetId, characterId);
    }
  }

  // ==========================================================================
  // Scope Operations
  // ==========================================================================

  /**
   * Promote an asset to global (remove project association)
   *
   * @param id - Asset ID
   */
  async promoteToGlobal(id: string): Promise<void> {
    await this.update(id, { projectId: null });
  }

  /**
   * Move an asset to a specific project
   *
   * @param id - Asset ID
   * @param projectId - Target project ID
   */
  async moveToProject(id: string, projectId: string): Promise<void> {
    await this.update(id, { projectId });
  }

  // ==========================================================================
  // URL Management
  // ==========================================================================

  /**
   * Get an object URL for an asset's blob
   * URLs are cached and should be released when no longer needed
   *
   * @param id - Asset ID
   * @returns Object URL or null if asset not found
   */
  async getAssetUrl(id: string): Promise<string | null> {
    // Check cache first
    const cached = this.urlCache.get(id);
    if (cached) {
      cached.refCount++;
      return cached.url;
    }

    // Load asset and create URL
    const asset = await this.getById(id);
    if (!asset) return null;

    const url = URL.createObjectURL(asset.blob);
    const thumbnailUrl = URL.createObjectURL(asset.thumbnail);

    this.urlCache.set(id, { url, thumbnailUrl, refCount: 1 });
    return url;
  }

  /**
   * Get an object URL for an asset's thumbnail
   *
   * @param id - Asset ID
   * @returns Thumbnail URL or null if asset not found
   */
  async getThumbnailUrl(id: string): Promise<string | null> {
    // Check cache first
    const cached = this.urlCache.get(id);
    if (cached) {
      cached.refCount++;
      return cached.thumbnailUrl;
    }

    // Load asset and create URLs
    const asset = await this.getById(id);
    if (!asset) return null;

    const url = URL.createObjectURL(asset.blob);
    const thumbnailUrl = URL.createObjectURL(asset.thumbnail);

    this.urlCache.set(id, { url, thumbnailUrl, refCount: 1 });
    return thumbnailUrl;
  }

  /**
   * Release a URL (decrements ref count, revokes when zero)
   *
   * @param id - Asset ID
   */
  releaseUrl(id: string): void {
    const cached = this.urlCache.get(id);
    if (cached) {
      cached.refCount--;
      if (cached.refCount <= 0) {
        this.revokeUrl(id);
      }
    }
  }

  /**
   * Force revoke and remove URL from cache
   *
   * @param id - Asset ID
   */
  revokeUrl(id: string): void {
    const cached = this.urlCache.get(id);
    if (cached) {
      URL.revokeObjectURL(cached.url);
      URL.revokeObjectURL(cached.thumbnailUrl);
      this.urlCache.delete(id);
    }
  }

  /**
   * Revoke all cached URLs (cleanup)
   */
  revokeAllUrls(): void {
    for (const [id] of this.urlCache) {
      this.revokeUrl(id);
    }
  }

  // ==========================================================================
  // Export Helpers
  // ==========================================================================

  /**
   * Get all assets for export (for a project, including linked global assets)
   *
   * @param projectId - Project ID
   * @returns Assets ready for ZIP export
   */
  async getExportableAssets(projectId: string): Promise<ExportableAsset[]> {
    // Get project-scoped assets
    const projectAssets = await this.getByProject(projectId);

    // Get global assets that are linked to any character in this project
    // We need to get the project first to know which characters are in it
    const project = await projectDb.projects.get(projectId);
    if (!project) {
      return this.toExportable(projectAssets);
    }

    // Parse project state to get character IDs
    let characterIds: string[] = [];
    try {
      const state = JSON.parse(project.stateJson);
      characterIds = state.characters?.map((c: { id: string }) => c.id) ?? [];
    } catch {
      // If we can't parse state, just export project assets
      return this.toExportable(projectAssets);
    }

    // Get global assets linked to these characters
    const globalAssets = await this.getGlobal();
    const linkedGlobalAssets = globalAssets.filter((asset) =>
      asset.linkedTo.some((charId) => characterIds.includes(charId))
    );

    // Combine and deduplicate
    const allAssets = [...projectAssets, ...linkedGlobalAssets];
    const uniqueAssets = allAssets.filter(
      (asset, index, arr) => arr.findIndex((a) => a.id === asset.id) === index
    );

    return this.toExportable(uniqueAssets);
  }

  /**
   * Convert DB assets to exportable format
   */
  private toExportable(assets: DBAsset[]): ExportableAsset[] {
    return assets.map((asset) => ({
      id: asset.id,
      type: asset.type,
      filename: this.generateExportFilename(asset),
      blob: asset.blob,
      metadata: asset.metadata,
    }));
  }

  /**
   * Generate a unique filename for export
   */
  private generateExportFilename(asset: DBAsset): string {
    const path = ASSET_ZIP_PATHS[asset.type];
    // Include ID prefix to ensure uniqueness
    const shortId = asset.id.split('-')[0];
    return `${path}${shortId}_${asset.metadata.filename}`;
  }

  // ==========================================================================
  // Statistics
  // ==========================================================================

  /**
   * Get storage statistics for assets
   *
   * @param filter - Optional filter
   * @returns Statistics
   */
  async getStats(filter: AssetFilter = {}): Promise<{
    count: number;
    totalSize: number;
    totalSizeMB: number;
    byType: Record<AssetType, { count: number; size: number }>;
  }> {
    const assets = await this.list(filter);

    const byType: Record<AssetType, { count: number; size: number }> = {
      'character-icon': { count: 0, size: 0 },
      'token-background': { count: 0, size: 0 },
      'script-background': { count: 0, size: 0 },
      'setup-flower': { count: 0, size: 0 },
      'leaf': { count: 0, size: 0 },
      'logo': { count: 0, size: 0 },
    };

    let totalSize = 0;
    for (const asset of assets) {
      const size = asset.metadata.size + (asset.thumbnail?.size ?? 0);
      totalSize += size;
      byType[asset.type].count++;
      byType[asset.type].size += size;
    }

    return {
      count: assets.length,
      totalSize,
      totalSizeMB: totalSize / (1024 * 1024),
      byType,
    };
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  /**
   * Delete all orphaned assets
   *
   * @returns Number of deleted assets
   */
  async cleanupOrphans(): Promise<number> {
    const orphans = await this.getOrphaned();
    await this.bulkDelete(orphans.map((a) => a.id));
    return orphans.length;
  }

  /**
   * Delete all assets for a project (including cleanup)
   *
   * @param projectId - Project ID
   */
  async deleteProjectAssets(projectId: string): Promise<void> {
    const assets = await this.getByProject(projectId);
    await this.bulkDelete(assets.map((a) => a.id));
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  /**
   * Attach object URLs to an asset
   */
  private attachUrls(asset: DBAsset): AssetWithUrl {
    let cached = this.urlCache.get(asset.id);

    if (!cached) {
      const url = URL.createObjectURL(asset.blob);
      const thumbnailUrl = URL.createObjectURL(asset.thumbnail);
      cached = { url, thumbnailUrl, refCount: 1 };
      this.urlCache.set(asset.id, cached);
    } else {
      cached.refCount++;
    }

    return {
      ...asset,
      url: cached.url,
      thumbnailUrl: cached.thumbnailUrl,
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Singleton instance of AssetStorageService
 */
export const assetStorageService = new AssetStorageService();
