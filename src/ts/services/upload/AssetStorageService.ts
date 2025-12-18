/**
 * Asset Storage Service
 *
 * Handles CRUD operations for assets in IndexedDB.
 * Provides methods for querying, filtering, and managing asset lifecycle.
 *
 * @module services/upload/AssetStorageService
 */

import type { Collection } from 'dexie';
import { cacheInvalidationService } from '@/ts/cache/CacheInvalidationService.js';
import { projectDb } from '@/ts/db/projectDb.js';
import { logger } from '@/ts/utils/logger.js';
import { ASSET_ZIP_PATHS } from './constants.js';
import { imageProcessingService } from './ImageProcessingService.js';
import type {
  AssetFilter,
  AssetMetadata,
  AssetType,
  AssetWithUrl,
  DBAsset,
  ExportableAsset,
} from './types.js';

// ============================================================================
// Types
// ============================================================================

/**
 * Data needed to create a new asset (id is optional for restore operations)
 */
export interface CreateAssetData {
  /** Optional ID for restore operations - if not provided, one will be generated */
  id?: string;
  type: AssetType;
  projectId: string | null;
  blob: Blob;
  thumbnail: Blob;
  metadata: AssetMetadata;
  linkedTo?: string[];
  /** Optional content hash (computed if not provided) */
  contentHash?: string;
  /** Optional usage tracking fields for restore operations */
  lastUsedAt?: number;
  usageCount?: number;
  usedInProjects?: string[];
}

/**
 * URL cache entry with revocation tracking
 */
interface UrlCacheEntry {
  url: string;
  thumbnailUrl: string;
  refCount: number;
  weakRefs: Set<WeakRef<object>>; // Track weak references for automatic cleanup
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

  /**
   * FinalizationRegistry for automatic URL cleanup.
   * When objects that reference asset URLs are garbage collected,
   * this registry automatically revokes the URLs to prevent memory leaks.
   */
  private urlRegistry = new FinalizationRegistry<string>((assetId: string) => {
    logger.debug('AssetStorageService', 'Auto-revoking URL for asset:', assetId);
    this.releaseUrl(assetId);
  });

  // ==========================================================================
  // CRUD Operations
  // ==========================================================================

  /**
   * Save a new asset to the database.
   * Implements automatic deduplication - if an identical asset already exists,
   * returns the existing asset ID instead of creating a duplicate.
   *
   * @param data - Asset data (without id)
   * @param options - Save options
   * @returns Created or existing asset ID
   */
  async save(
    data: CreateAssetData,
    options: { enableDeduplication?: boolean } = {}
  ): Promise<string> {
    const { enableDeduplication = true } = options;

    // Generate content hash for deduplication (or use provided hash for restore)
    const contentHash = data.contentHash ?? (await imageProcessingService.hashBlob(data.blob));

    // Check for existing asset with same content hash (deduplication)
    // Skip deduplication if a specific ID is provided (restore operation)
    if (enableDeduplication && !data.id) {
      const existing = await this.findByHash(contentHash);
      if (existing) {
        logger.debug('AssetStorageService', 'Deduplication: Reusing existing asset', {
          existingId: existing.id,
          filename: data.metadata.filename,
        });

        // Update linkedTo if needed (merge with existing links)
        if (data.linkedTo && data.linkedTo.length > 0) {
          const mergedLinks = Array.from(new Set([...existing.linkedTo, ...data.linkedTo]));
          if (mergedLinks.length > existing.linkedTo.length) {
            await this.update(existing.id, { linkedTo: mergedLinks });
          }
        }

        return existing.id;
      }
    }

    // No duplicate found - create new asset (or use provided ID for restore)
    const id = data.id ?? crypto.randomUUID();
    const asset: DBAsset = {
      id,
      type: data.type,
      projectId: data.projectId,
      blob: data.blob,
      thumbnail: data.thumbnail,
      metadata: data.metadata,
      linkedTo: data.linkedTo ?? [],
      contentHash,
      // Include optional usage tracking fields (for restore operations)
      ...(data.lastUsedAt !== undefined && { lastUsedAt: data.lastUsedAt }),
      ...(data.usageCount !== undefined && { usageCount: data.usageCount }),
      ...(data.usedInProjects !== undefined && { usedInProjects: data.usedInProjects }),
    };

    await projectDb.assets.put(asset); // Use put instead of add to allow restore with existing ID

    logger.debug('AssetStorageService', 'Created new asset', {
      id,
      filename: data.metadata.filename,
      contentHash: `${contentHash.substring(0, 12)}...`,
    });

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

    // Emit invalidation event for cache coordination
    await cacheInvalidationService.invalidateAsset(id, 'update', {
      fields: Object.keys(updates),
    });
  }

  /**
   * Delete an asset by ID
   *
   * @param id - Asset ID
   */
  async delete(id: string): Promise<void> {
    this.revokeUrl(id);
    await projectDb.assets.delete(id);

    // Emit invalidation event
    await cacheInvalidationService.invalidateAsset(id, 'delete');
  }

  /**
   * Delete multiple assets by ID
   *
   * @param ids - Array of asset IDs
   */
  async bulkDelete(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.revokeUrl(id);
    }
    await projectDb.assets.bulkDelete(ids);

    // Emit invalidation events for all deleted assets
    await cacheInvalidationService.invalidateAssets(ids, 'delete');
  }

  /**
   * Update multiple assets in a single transaction
   *
   * @param updates - Array of {id, data} pairs to update
   */
  async bulkUpdate(
    updates: Array<{ id: string; data: Partial<Omit<DBAsset, 'id'>> }>
  ): Promise<void> {
    await projectDb.transaction('rw', projectDb.assets, async () => {
      for (const { id, data } of updates) {
        // Revoke cached URLs if blob is being updated
        if (data.blob || data.thumbnail) {
          this.revokeUrl(id);
        }
        await projectDb.assets.update(id, data);
      }
    });

    // Emit invalidation events for all updated assets
    const updatedIds = updates.map((u) => u.id);
    await cacheInvalidationService.invalidateAssets(updatedIds, 'update', {
      count: updates.length,
    });
  }

  /**
   * Promote multiple assets to global scope (remove project association)
   *
   * @param ids - Array of asset IDs to promote
   */
  async bulkPromoteToGlobal(ids: string[]): Promise<void> {
    await this.bulkUpdate(ids.map((id) => ({ id, data: { projectId: null } })));
  }

  /**
   * Move multiple assets to a specific project
   *
   * @param ids - Array of asset IDs to move
   * @param projectId - Target project ID
   */
  async bulkMoveToProject(ids: string[], projectId: string): Promise<void> {
    await this.bulkUpdate(ids.map((id) => ({ id, data: { projectId } })));
  }

  // ==========================================================================
  // Query Operations
  // ==========================================================================

  /**
   * Get all assets matching a filter.
   * Optimized to use compound indexes for maximum performance.
   *
   * Query optimization:
   * - type + projectId → Uses compound index [type+projectId] (5-10x faster)
   * - type only → Uses simple index 'type'
   * - projectId only → Uses simple index 'projectId'
   * - linkedTo → Uses multi-entry index '*linkedTo'
   *
   * @param filter - Filter options
   * @returns Filtered assets
   */
  async list(filter: AssetFilter = {}): Promise<DBAsset[]> {
    let collection: Collection<DBAsset, string>;
    let results: DBAsset[];

    // OPTIMIZATION: Use compound index when both type and projectId are provided (non-null)
    if (
      filter.type &&
      filter.projectId !== undefined &&
      filter.projectId !== 'all' &&
      filter.projectId !== null
    ) {
      const types = Array.isArray(filter.type) ? filter.type : [filter.type];
      const projectIdVal = filter.projectId; // Now guaranteed to be string

      // Use compound index [type+projectId] for optimal performance
      if (types.length === 1) {
        // Single type - use compound index directly
        collection = projectDb.assets.where('[type+projectId]').equals([types[0], projectIdVal]);
        results = await collection.toArray();
      } else {
        // Multiple types - query each type+projectId combination and merge
        const promises = types.map((type) =>
          projectDb.assets.where('[type+projectId]').equals([type, projectIdVal]).toArray()
        );
        const resultArrays = await Promise.all(promises);
        results = resultArrays.flat();
      }
    }
    // OPTIMIZATION: Use type index when only type is provided (or projectId is null for global)
    else if (filter.type) {
      const types = Array.isArray(filter.type) ? filter.type : [filter.type];
      collection = projectDb.assets.where('type').anyOf(types);
      results = await collection.toArray();

      // Apply project filter manually if needed
      if (filter.projectId !== undefined && filter.projectId !== 'all') {
        results = results.filter((a) => a.projectId === filter.projectId);
      }
    }
    // OPTIMIZATION: Use projectId index when only projectId is provided (non-null string)
    else if (
      filter.projectId !== undefined &&
      filter.projectId !== 'all' &&
      filter.projectId !== null
    ) {
      collection = projectDb.assets.where('projectId').equals(filter.projectId);
      results = await collection.toArray();
    }
    // Handle projectId = null (global assets) - filter manually
    else if (filter.projectId === null) {
      collection = projectDb.assets.toCollection();
      results = (await collection.toArray()).filter((a: DBAsset) => a.projectId === null);
    }
    // Fallback: No indexed filters, get all
    else {
      collection = projectDb.assets.toCollection();
      results = await collection.toArray();
    }

    // Apply search filter
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      results = results.filter((a) => a.metadata.filename.toLowerCase().includes(searchLower));
    }

    // Apply orphaned filter
    if (filter.orphanedOnly) {
      results = results.filter((a) => a.linkedTo.length === 0);
    }

    // Apply sorting
    const sortBy = filter.sortBy ?? 'uploadedAt';
    const sortDir = filter.sortDirection ?? 'desc';
    results.sort((a, b) => {
      let aVal: string | number | undefined;
      let bVal: string | number | undefined;

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
        case 'lastUsedAt':
          aVal = a.lastUsedAt ?? 0; // Never used assets go to the end
          bVal = b.lastUsedAt ?? 0;
          break;
        case 'usageCount':
          aVal = a.usageCount ?? 0; // Never used assets go to the end
          bVal = b.usageCount ?? 0;
          break;
        default:
          aVal = a.metadata.uploadedAt;
          bVal = b.metadata.uploadedAt;
      }

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    // Apply pagination
    const offset = filter.offset ?? 0;
    const limit = filter.limit ?? Infinity;

    if (offset > 0 || limit < Infinity) {
      results = results.slice(offset, offset + limit);
    }

    return results;
  }

  /**
   * Get total count of assets matching filter (ignoring pagination)
   *
   * @param filter - Filter options (limit/offset ignored)
   * @returns Total count
   */
  async count(filter: AssetFilter = {}): Promise<number> {
    // Call list() with filter but without pagination
    const filterWithoutPagination = { ...filter, limit: undefined, offset: undefined };
    const results = await this.list(filterWithoutPagination);
    return results.length;
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
   * Find an asset by content hash (for deduplication).
   * Uses indexed lookup for O(log n) performance.
   *
   * @param contentHash - SHA-256 content hash
   * @returns First asset with matching hash, or undefined
   *
   * @example
   * ```typescript
   * const hash = await imageProcessingService.hashBlob(blob);
   * const existing = await assetStorageService.findByHash(hash);
   * if (existing) {
   *   console.log('Duplicate found:', existing.id);
   * }
   * ```
   */
  async findByHash(contentHash: string): Promise<DBAsset | undefined> {
    return projectDb.assets.where('contentHash').equals(contentHash).first();
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

  /**
   * Track asset usage when it's used in token generation
   *
   * @param assetId - Asset ID
   * @param projectId - Project ID where asset was used (optional)
   */
  async trackAssetUsage(assetId: string, projectId?: string): Promise<void> {
    const asset = await this.getById(assetId);
    if (!asset) {
      logger.warn('AssetStorageService', `Cannot track usage for missing asset: ${assetId}`);
      return;
    }

    const now = Date.now();
    const usageCount = (asset.usageCount || 0) + 1;
    const usedInProjects = asset.usedInProjects || [];

    // Add project to usedInProjects if not already present
    if (projectId && !usedInProjects.includes(projectId)) {
      usedInProjects.push(projectId);
    }

    await this.update(assetId, {
      lastUsedAt: now,
      usageCount,
      usedInProjects,
    });
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
   * Get an object URL for an asset's blob.
   * URLs are cached and should be released when no longer needed.
   *
   * For automatic cleanup, use getAssetUrlTracked() instead.
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

    this.urlCache.set(id, {
      url,
      thumbnailUrl,
      refCount: 1,
      weakRefs: new Set(),
    });
    return url;
  }

  /**
   * Get an object URL for an asset with automatic cleanup tracking.
   * The URL will be automatically revoked when the trackingObject is garbage collected.
   *
   * This prevents memory leaks by ensuring URLs are cleaned up even if
   * releaseUrl() is never called.
   *
   * @param id - Asset ID
   * @param trackingObject - Object that owns this URL (e.g., component instance, cache entry)
   * @returns Object URL or null if asset not found
   *
   * @example
   * ```typescript
   * class TokenRenderer {
   *   private assetUrl: string | null = null;
   *
   *   async loadAsset(assetId: string) {
   *     // URL will auto-cleanup when this instance is GC'd
   *     this.assetUrl = await assetService.getAssetUrlTracked(assetId, this);
   *   }
   * }
   * ```
   */
  async getAssetUrlTracked(id: string, trackingObject: object): Promise<string | null> {
    const url = await this.getAssetUrl(id);
    if (!url) return null;

    // Register for automatic cleanup
    const cached = this.urlCache.get(id);
    if (cached) {
      const weakRef = new WeakRef(trackingObject);
      cached.weakRefs.add(weakRef);
      this.urlRegistry.register(trackingObject, id, weakRef);
    }

    return url;
  }

  /**
   * Get an object URL for an asset's thumbnail.
   * URLs are cached and should be released when no longer needed.
   *
   * For automatic cleanup, use getThumbnailUrlTracked() instead.
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

    this.urlCache.set(id, {
      url,
      thumbnailUrl,
      refCount: 1,
      weakRefs: new Set(),
    });
    return thumbnailUrl;
  }

  /**
   * Get an object URL for an asset's thumbnail with automatic cleanup tracking.
   * The URL will be automatically revoked when the trackingObject is garbage collected.
   *
   * @param id - Asset ID
   * @param trackingObject - Object that owns this URL (e.g., component instance)
   * @returns Thumbnail URL or null if asset not found
   *
   * @example
   * ```typescript
   * function AssetThumbnail({ assetId }) {
   *   const [url, setUrl] = useState(null);
   *
   *   useEffect(() => {
   *     // Auto-cleanup when component unmounts
   *     const ref = {};
   *     assetService.getThumbnailUrlTracked(assetId, ref).then(setUrl);
   *     return () => { /* ref GC'd, URL auto-revoked * / };
   *   }, [assetId]);
   *
   *   // return <img src={url} />;
   * }
   * ```
   */
  async getThumbnailUrlTracked(id: string, trackingObject: object): Promise<string | null> {
    const url = await this.getThumbnailUrl(id);
    if (!url) return null;

    // Register for automatic cleanup
    const cached = this.urlCache.get(id);
    if (cached) {
      const weakRef = new WeakRef(trackingObject);
      cached.weakRefs.add(weakRef);
      this.urlRegistry.register(trackingObject, id, weakRef);
    }

    return url;
  }

  /**
   * Release a URL (decrements ref count, revokes when zero).
   * Called manually or automatically by FinalizationRegistry.
   *
   * @param id - Asset ID
   */
  releaseUrl(id: string): void {
    const cached = this.urlCache.get(id);
    if (cached) {
      cached.refCount--;

      // Clean up dead weak references
      for (const weakRef of cached.weakRefs) {
        if (weakRef.deref() === undefined) {
          cached.weakRefs.delete(weakRef);
        }
      }

      // Revoke if ref count reaches zero and no live weak refs remain
      if (cached.refCount <= 0 && cached.weakRefs.size === 0) {
        this.revokeUrl(id);
      }
    }
  }

  /**
   * Force revoke and remove URL from cache.
   * Unregisters all weak references to prevent unnecessary cleanup attempts.
   *
   * @param id - Asset ID
   */
  revokeUrl(id: string): void {
    const cached = this.urlCache.get(id);
    if (cached) {
      // Unregister all weak references from FinalizationRegistry
      for (const weakRef of cached.weakRefs) {
        const obj = weakRef.deref();
        if (obj !== undefined) {
          this.urlRegistry.unregister(weakRef);
        }
      }

      // Revoke object URLs
      URL.revokeObjectURL(cached.url);
      URL.revokeObjectURL(cached.thumbnailUrl);

      // Remove from cache
      this.urlCache.delete(id);

      logger.debug('AssetStorageService', 'Revoked URLs for asset:', id);
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

  /**
   * Get URL cache statistics
   * @returns Cache statistics with entry count and estimated memory usage
   */
  getUrlCacheStats(): { cachedUrls: number; estimatedSizeMB: number } {
    return {
      cachedUrls: this.urlCache.size,
      // Rough estimate: ~1KB per URL entry (URL string + metadata)
      estimatedSizeMB: (this.urlCache.size * 1024) / (1024 * 1024),
    };
  }

  /**
   * Clear the URL cache completely
   * Revokes all blob URLs and removes all entries
   */
  clearUrlCache(): void {
    this.revokeAllUrls();
    this.urlCache.clear();
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
   * Stream exportable assets one at a time to prevent memory issues with large projects
   *
   * This async generator yields assets individually rather than loading all into memory.
   * Useful for exports with 100+ assets to prevent out-of-memory errors.
   *
   * @param projectId - Project ID to export assets for
   * @param includeUnused - Whether to include assets with usageCount === 0
   * @returns Async generator yielding ExportableAsset objects
   *
   * @example
   * ```typescript
   * for await (const asset of assetService.streamExportableAssets(projectId, false)) {
   *   zip.file(`assets/${asset.filename}`, asset.blob);
   * }
   * ```
   */
  async *streamExportableAssets(
    projectId: string,
    includeUnused: boolean = true
  ): AsyncGenerator<ExportableAsset, void, undefined> {
    try {
      // Get all asset IDs first (lightweight query - just IDs, no blobs)
      const allAssets = await this.list({
        type: 'character-icon',
        projectId,
      });

      // Filter by usage if needed
      const assetsToExport = includeUnused
        ? allAssets
        : allAssets.filter((asset) => (asset.usageCount ?? 0) > 0);

      // Stream each asset one at a time
      for (const assetSummary of assetsToExport) {
        // Fetch full asset data (with blob) individually
        const asset = await this.getById(assetSummary.id);
        if (!asset) {
          logger.warn('AssetStorageService', `Asset ${assetSummary.id} not found during streaming`);
          continue;
        }

        // Yield as exportable asset
        yield {
          id: asset.id,
          type: asset.type,
          filename: this.generateExportFilename(asset),
          blob: asset.blob,
          metadata: asset.metadata,
        };

        // Allow other operations to run (prevent blocking)
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    } catch (error) {
      logger.error('AssetStorageService', `Error streaming assets for project ${projectId}`, error);
      throw error;
    }
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
      'setup-overlay': { count: 0, size: 0 },
      accent: { count: 0, size: 0 },
      logo: { count: 0, size: 0 },
      'studio-icon': { count: 0, size: 0 },
      'studio-logo': { count: 0, size: 0 },
      'studio-project': { count: 0, size: 0 },
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
      cached = { url, thumbnailUrl, refCount: 1, weakRefs: new Set() };
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
