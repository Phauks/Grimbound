/**
 * Asset Archive Service - Archive and restore assets to reduce active DB size
 *
 * Allows users to export old/unused assets to ZIP archives and restore them later.
 * This helps manage IndexedDB storage limits by removing infrequently used assets
 * while preserving them for future restoration.
 *
 * Use Cases:
 * - Archive assets with usageCount === 0 (orphaned/unused)
 * - Archive assets not used in last 90 days (old)
 * - Free up IndexedDB space when approaching quota limits
 * - Restore archived assets when needed for a project
 *
 * Archive Format:
 * - ZIP file containing:
 *   - manifest.json (metadata about archived assets)
 *   - assets/ folder (asset blobs)
 *   - thumbnails/ folder (thumbnail blobs)
 *
 * @module services/upload/AssetArchiveService
 */

import JSZip from 'jszip';
import { downloadFile } from '@/ts/utils/imageUtils.js';
import { logger } from '@/ts/utils/logger.js';
import { sanitizeFilename } from '@/ts/utils/stringUtils.js';
import { assetStorageService } from './AssetStorageService.js';
import { getTypeFromTags } from './tagUtils.js';
import type { DBAsset } from './types.js';

/**
 * Archive manifest metadata
 */
interface ArchiveManifest {
  /** Archive format identifier */
  format: 'botc-asset-archive';
  /** Format version */
  version: '1.0.0';
  /** When archive was created */
  createdAt: string;
  /** Number of assets in archive */
  assetCount: number;
  /** Total uncompressed size in bytes */
  totalBytes: number;
  /** Asset type counts */
  assetTypes: Record<string, number>;
  /** Archive creation reason */
  reason?: string;
}

/**
 * Archive creation options
 */
interface ArchiveOptions {
  /** Custom filename (default: auto-generated) */
  filename?: string;
  /** Reason for archiving (stored in manifest) */
  reason?: string;
  /** Delete assets from DB after archiving (default: true) */
  deleteAfterArchive?: boolean;
}

/**
 * Restore options
 */
interface RestoreOptions {
  /** Project ID to restore assets to (null = global library) */
  projectId?: string | null;
  /** Skip assets that already exist in DB (default: true) */
  skipExisting?: boolean;
}

/**
 * Archive operation result
 */
interface ArchiveResult {
  success: boolean;
  archivedCount: number;
  totalBytes: number;
  filename: string;
  error?: string;
}

/**
 * Restore operation result
 */
interface RestoreResult {
  success: boolean;
  restoredCount: number;
  skippedCount: number;
  errors: string[];
}

/**
 * Asset Archive Service - Manages asset archiving and restoration
 */
export class AssetArchiveService {
  /**
   * Archive assets to a ZIP file
   *
   * Creates a ZIP archive containing assets and their metadata,
   * optionally deleting them from the active database.
   *
   * @param assetIds - Array of asset IDs to archive
   * @param options - Archive options
   * @returns Archive result with success status
   *
   * @example
   * ```typescript
   * // Archive orphaned assets
   * const orphans = await assetService.getOrphaned();
   * const result = await archiveService.archiveAssets(
   *   orphans.map(a => a.id),
   *   { reason: 'Orphaned assets cleanup' }
   * );
   * ```
   */
  async archiveAssets(assetIds: string[], options: ArchiveOptions = {}): Promise<ArchiveResult> {
    try {
      if (assetIds.length === 0) {
        return {
          success: false,
          archivedCount: 0,
          totalBytes: 0,
          filename: '',
          error: 'No assets provided for archiving',
        };
      }

      // Fetch assets to archive
      const assets = await Promise.all(assetIds.map((id) => assetStorageService.getById(id)));
      const validAssets = assets.filter((a): a is DBAsset => a !== null);

      if (validAssets.length === 0) {
        return {
          success: false,
          archivedCount: 0,
          totalBytes: 0,
          filename: '',
          error: 'No valid assets found',
        };
      }

      // Create ZIP archive
      const zip = new JSZip();
      const assetsFolder = zip.folder('assets');
      const thumbnailsFolder = zip.folder('thumbnails');

      if (!(assetsFolder && thumbnailsFolder)) {
        throw new Error('Failed to create ZIP folders');
      }

      let totalBytes = 0;
      const assetTypeCounts: Record<string, number> = {};

      // Add each asset to archive
      for (const asset of validAssets) {
        // Add main asset blob
        assetsFolder.file(`${asset.id}.${this.getExtension(asset)}`, asset.blob);

        // Add thumbnail blob
        thumbnailsFolder.file(`${asset.id}.${this.getExtension(asset)}`, asset.thumbnail);

        // Track stats
        totalBytes += asset.metadata.size;
        const assetType = getTypeFromTags(asset.tags) ?? 'icon';
        assetTypeCounts[assetType] = (assetTypeCounts[assetType] || 0) + 1;
      }

      // Create manifest
      const manifest: ArchiveManifest = {
        format: 'botc-asset-archive',
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        assetCount: validAssets.length,
        totalBytes,
        assetTypes: assetTypeCounts,
        reason: options.reason,
      };

      // Add manifest to ZIP
      zip.file('manifest.json', JSON.stringify(manifest, null, 2));

      // Add asset metadata
      const metadata = validAssets.map((asset) => ({
        id: asset.id,
        tags: asset.tags,
        folder: asset.folder,
        projectId: asset.projectId,
        metadata: asset.metadata,
        linkedTo: asset.linkedTo,
        contentHash: asset.contentHash,
        lastUsedAt: asset.lastUsedAt,
        usageCount: asset.usageCount,
        usedInProjects: asset.usedInProjects,
      }));
      zip.file('assets-metadata.json', JSON.stringify(metadata, null, 2));

      // Generate ZIP blob
      const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 }, // Maximum compression for archives
      });

      // Generate filename
      const filename =
        options.filename || this.generateArchiveFilename(validAssets.length, options.reason);

      // Download archive
      downloadFile(blob, filename);

      // Delete assets from DB if requested
      if (options.deleteAfterArchive !== false) {
        await Promise.all(assetIds.map((id) => assetStorageService.delete(id)));
      }

      return {
        success: true,
        archivedCount: validAssets.length,
        totalBytes,
        filename,
      };
    } catch (error) {
      logger.error('AssetArchiveService', 'Archive failed', error);
      return {
        success: false,
        archivedCount: 0,
        totalBytes: 0,
        filename: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Restore assets from a ZIP archive
   *
   * Extracts assets from a ZIP archive and restores them to the database.
   *
   * @param archiveFile - ZIP archive file
   * @param options - Restore options
   * @returns Restore result with counts and errors
   *
   * @example
   * ```typescript
   * // Restore from file input
   * const file = event.target.files[0];
   * const result = await archiveService.restoreArchive(file, {
   *   projectId: currentProjectId,
   *   skipExisting: true
   * });
   * console.log(`Restored ${result.restoredCount} assets`);
   * ```
   */
  async restoreArchive(
    archiveFile: File | Blob,
    options: RestoreOptions = {}
  ): Promise<RestoreResult> {
    const errors: string[] = [];
    let restoredCount = 0;
    let skippedCount = 0;

    try {
      const zip = await JSZip.loadAsync(archiveFile);
      await this.validateArchiveManifest(zip);
      const assetsMetadata = await this.loadAssetsMetadata(zip);

      for (const assetMeta of assetsMetadata) {
        const result = await this.restoreSingleAsset(zip, assetMeta, options);
        if (result.restored) restoredCount++;
        if (result.skipped) skippedCount++;
        if (result.error) errors.push(result.error);
      }

      return { success: errors.length === 0, restoredCount, skippedCount, errors };
    } catch (error) {
      logger.error('AssetArchiveService', 'Restore failed', error);
      return {
        success: false,
        restoredCount,
        skippedCount,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Validate the archive manifest exists and has correct format
   */
  private async validateArchiveManifest(zip: JSZip): Promise<void> {
    const manifestFile = zip.file('manifest.json');
    if (!manifestFile) {
      throw new Error('Invalid archive: missing manifest.json');
    }

    const manifestText = await manifestFile.async('text');
    const manifest: ArchiveManifest = JSON.parse(manifestText);

    if (manifest.format !== 'botc-asset-archive') {
      throw new Error('Invalid archive format');
    }
  }

  /**
   * Load and parse assets metadata from archive
   */
  private async loadAssetsMetadata(zip: JSZip): Promise<Partial<DBAsset>[]> {
    const metadataFile = zip.file('assets-metadata.json');
    if (!metadataFile) {
      throw new Error('Invalid archive: missing assets-metadata.json');
    }

    const metadataText = await metadataFile.async('text');
    return JSON.parse(metadataText);
  }

  /**
   * Restore a single asset from the archive
   */
  private async restoreSingleAsset(
    zip: JSZip,
    assetMeta: Partial<DBAsset>,
    options: RestoreOptions
  ): Promise<{ restored: boolean; skipped: boolean; error?: string }> {
    try {
      if (!assetMeta.id) {
        return { restored: false, skipped: false, error: 'Asset metadata missing ID' };
      }

      if (options.skipExisting !== false) {
        const existing = await assetStorageService.getById(assetMeta.id);
        if (existing) {
          return { restored: false, skipped: true };
        }
      }

      const files = this.getAssetFilesFromZip(zip, assetMeta);
      if (!files) {
        return {
          restored: false,
          skipped: false,
          error: `Missing files for asset ${assetMeta.id}`,
        };
      }

      // Validate required fields
      if (!assetMeta.tags || assetMeta.tags.length === 0 || !assetMeta.metadata) {
        return {
          restored: false,
          skipped: false,
          error: `Missing tags or metadata for asset ${assetMeta.id}`,
        };
      }

      const assetBlob = await files.assetFile.async('blob');
      const thumbnailBlob = await files.thumbnailFile.async('blob');

      await assetStorageService.save({
        id: assetMeta.id,
        tags: assetMeta.tags,
        folder: assetMeta.folder ?? null,
        projectId: options.projectId ?? assetMeta.projectId ?? null,
        blob: assetBlob,
        thumbnail: thumbnailBlob,
        metadata: assetMeta.metadata,
        linkedTo: assetMeta.linkedTo || [],
        contentHash: assetMeta.contentHash,
        lastUsedAt: assetMeta.lastUsedAt,
        usageCount: assetMeta.usageCount,
        usedInProjects: assetMeta.usedInProjects,
      });

      return { restored: true, skipped: false };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return {
        restored: false,
        skipped: false,
        error: `Failed to restore asset ${assetMeta.id}: ${errorMsg}`,
      };
    }
  }

  /**
   * Get asset and thumbnail files from the ZIP archive
   */
  private getAssetFilesFromZip(
    zip: JSZip,
    assetMeta: Partial<DBAsset>
  ): { assetFile: JSZip.JSZipObject; thumbnailFile: JSZip.JSZipObject } | null {
    const ext = this.getExtensionFromMetadata(assetMeta);
    const assetFile = zip.file(`assets/${assetMeta.id}.${ext}`);
    const thumbnailFile = zip.file(`thumbnails/${assetMeta.id}.${ext}`);

    if (!(assetFile && thumbnailFile)) {
      return null;
    }

    return { assetFile, thumbnailFile };
  }

  /**
   * Get archive recommendations based on asset usage
   *
   * Suggests assets that could be archived to free up space.
   *
   * @returns Object with orphaned, old, and unused asset IDs
   */
  async getArchiveRecommendations(): Promise<{
    orphaned: string[];
    old: string[];
    unused: string[];
  }> {
    const allAssets = await assetStorageService.list();
    const now = Date.now();
    const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;

    return {
      orphaned: allAssets.filter((a) => a.linkedTo.length === 0).map((a) => a.id),
      old: allAssets
        .filter((a) => {
          const lastUsed = a.lastUsedAt || a.metadata.uploadedAt;
          return lastUsed < ninetyDaysAgo;
        })
        .map((a) => a.id),
      unused: allAssets.filter((a) => (a.usageCount || 0) === 0).map((a) => a.id),
    };
  }

  /**
   * Generate a filename for the archive
   */
  private generateArchiveFilename(count: number, reason?: string): string {
    const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const sanitizedReason = reason ? sanitizeFilename(reason).substring(0, 20) : 'archive';
    return `botc-assets-${sanitizedReason}-${count}-${timestamp}.zip`;
  }

  /**
   * Get file extension from asset
   */
  private getExtension(asset: DBAsset): string {
    const mimeMap: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };
    return mimeMap[asset.metadata.mimeType] || 'png';
  }

  /**
   * Get file extension from asset metadata
   */
  private getExtensionFromMetadata(assetMeta: Partial<DBAsset>): string {
    if (!assetMeta.metadata?.mimeType) return 'png';
    const mimeMap: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };
    return mimeMap[assetMeta.metadata.mimeType] || 'png';
  }
}

/**
 * Singleton instance of AssetArchiveService
 */
export const assetArchiveService = new AssetArchiveService();
