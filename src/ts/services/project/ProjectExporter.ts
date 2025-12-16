/**
 * Project Exporter Service
 *
 * Handles exporting projects as ZIP packages with:
 * - project.json (project data)
 * - manifest.json (package metadata)
 * - thumbnail.png (project thumbnail)
 * - assets/ folder (character icons and other assets)
 *
 * Features:
 * - Fetches assets from AssetStorageService (new unified system)
 * - Filters unused assets (usageCount === 0) when includeUnusedAssets = false
 * - Converts assets to customIcons format in project.json for backward compatibility
 * - Supports legacy projects with customIcons in ProjectState
 * - Automatic streaming mode for large projects (50+ assets) to prevent OOM errors
 * - Smart memory management: loads assets one-at-a-time when streaming
 *
 * @module services/project/ProjectExporter
 */

import JSZip from 'jszip';
import type { IProjectExporter } from './IProjectService.js';
import type {
  Project,
  ExportOptions,
  ProjectManifest,
  CustomIconMetadata,
} from '../../types/project.js';
import type { DBAsset } from '../upload/types.js';
import { sanitizeFilename } from '../../utils/stringUtils.js';
import { downloadFile } from '../../utils/imageUtils.js';
import { CONFIG } from '../../config.js';
import { assetStorageService } from '../upload/AssetStorageService.js';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_EXPORT_OPTIONS: Required<ExportOptions> = {
  includeAssets: true,
  includeUnusedAssets: true,
  includeThumbnail: true,
  compressImages: false, // Future feature
  includeCustomIcons: true,
};

// ============================================================================
// ProjectExporter Implementation
// ============================================================================

/**
 * Service for exporting projects as ZIP files
 */
export class ProjectExporter implements IProjectExporter {
  /**
   * Export a project as a ZIP file
   *
   * @param project - Project to export
   * @param options - Export options
   * @returns ZIP file as Blob
   */
  async exportAsZip(project: Project, options: ExportOptions = {}): Promise<Blob> {
    const opts = { ...DEFAULT_EXPORT_OPTIONS, ...options };

    // Create new ZIP instance
    const zip = new JSZip();

    // Determine if we should use streaming (for large projects)
    const STREAMING_THRESHOLD = 50; // Use streaming for 50+ assets
    const assetCount = opts.includeAssets
      ? await assetStorageService.count({ type: 'character-icon', projectId: project.id })
      : 0;
    const useStreaming = assetCount >= STREAMING_THRESHOLD;

    // Fetch assets for metadata (lightweight - for project.json and manifest)
    let projectAssets: DBAsset[] = [];
    if (opts.includeAssets && !useStreaming) {
      // Small projects: fetch all assets upfront
      projectAssets = await this.fetchProjectAssets(project.id, opts.includeUnusedAssets);
    } else if (opts.includeAssets && useStreaming) {
      // Large projects: fetch lightweight metadata only
      projectAssets = await assetStorageService.list({
        type: 'character-icon',
        projectId: project.id,
      });
      if (!opts.includeUnusedAssets) {
        projectAssets = projectAssets.filter((asset) => (asset.usageCount ?? 0) > 0);
      }
    }

    // 1. Add project.json (project data without embedded images)
    const projectData = await this.prepareProjectData(project, projectAssets);
    zip.file('project.json', JSON.stringify(projectData, null, 2));

    // 2. Add manifest.json (package metadata)
    const manifest = await this.generateManifest(project, projectAssets, opts);
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));

    // 3. Add thumbnail (if enabled and available)
    if (opts.includeThumbnail) {
      await this.addThumbnail(zip, project);
    }

    // 4. Add assets (if enabled and available)
    if (opts.includeAssets && assetCount > 0) {
      if (useStreaming) {
        console.log(
          `[ProjectExporter] Using streaming export for ${assetCount} assets (threshold: ${STREAMING_THRESHOLD})`
        );
        await this.addAssetsStreaming(zip, project.id, opts.includeUnusedAssets);
      } else {
        await this.addAssets(zip, projectAssets);
      }
    }

    // 5. Generate ZIP blob
    const blob = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    return blob;
  }

  /**
   * Export and download a project as a ZIP file
   *
   * @param project - Project to export
   * @param options - Export options
   */
  async exportAndDownload(project: Project, options: ExportOptions = {}): Promise<void> {
    const blob = await this.exportAsZip(project, options);
    const filename = this.generateFilename(project.name);
    downloadFile(blob, filename);
  }

  /**
   * Generate a filename for export
   *
   * @param projectName - Project name
   * @returns Sanitized filename with timestamp and .zip extension
   */
  generateFilename(projectName: string): string {
    const sanitized = sanitizeFilename(projectName);
    const timestamp = Date.now();
    return `${sanitized}_${timestamp}.zip`;
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Fetch assets for a project with optional filtering
   *
   * @param projectId - Project ID
   * @param includeUnused - Whether to include assets with usageCount === 0
   * @returns Array of assets to export
   */
  private async fetchProjectAssets(
    projectId: string,
    includeUnused: boolean
  ): Promise<DBAsset[]> {
    try {
      // Fetch all character-icon assets for this project
      const assets = await assetStorageService.list({
        type: 'character-icon',
        projectId,
      });

      // Filter out unused assets if requested
      if (!includeUnused) {
        return assets.filter((asset) => (asset.usageCount ?? 0) > 0);
      }

      return assets;
    } catch (error) {
      console.warn(`Failed to fetch assets for project ${projectId}:`, error);
      return [];
    }
  }

  /**
   * Prepare project data for export (strip out data URLs to keep file clean)
   */
  private async prepareProjectData(
    project: Project,
    assets: DBAsset[]
  ): Promise<Project> {
    // Deep clone to avoid mutating original
    const exportData: Project = JSON.parse(JSON.stringify(project));

    // Convert assets to customIcons format for backward compatibility
    exportData.state.customIcons = assets.map((asset) =>
      this.assetToCustomIconMetadata(asset)
    );

    return exportData;
  }

  /**
   * Convert DBAsset to CustomIconMetadata for backward compatibility
   */
  private assetToCustomIconMetadata(asset: DBAsset): CustomIconMetadata {
    // Extract character info from linkedTo
    const characterId = asset.linkedTo[0] || 'unknown';
    const characterName = asset.metadata.filename.replace(/\.[^/.]+$/, ''); // Remove extension

    return {
      characterId,
      characterName,
      filename: asset.metadata.filename,
      source: asset.metadata.sourceType === 'upload' ? 'uploaded' : 'url',
      dataUrl: undefined, // Will be in assets/ folder
      storedInIndexedDB: false,
      fileSize: asset.metadata.size,
      mimeType: asset.metadata.mimeType,
      lastModified: asset.metadata.uploadedAt,
    };
  }

  /**
   * Generate manifest.json for the ZIP package
   */
  private async generateManifest(
    project: Project,
    assets: DBAsset[],
    options: Required<ExportOptions>
  ): Promise<ProjectManifest> {
    const assetFiles = options.includeAssets
      ? assets.map((asset) => `assets/${asset.metadata.filename}`)
      : [];

    // Calculate file sizes (approximate)
    const projectData = await this.prepareProjectData(project, assets);
    const projectJsonSize = JSON.stringify(projectData).length;
    const manifestJsonSize = 500; // Approximate
    const thumbnailSize = options.includeThumbnail ? this.estimateThumbnailSize(project) : 0;
    const assetsSize = assets.reduce((sum, asset) => sum + asset.metadata.size, 0);
    const totalUncompressed = projectJsonSize + manifestJsonSize + thumbnailSize + assetsSize;

    return {
      format: 'blood-on-the-clocktower-project-package',
      formatVersion: '1.0.0',
      generator: 'BotC Token Generator',
      generatorVersion: CONFIG.VERSION,
      generatorUrl: window.location.origin,
      exportedAt: new Date().toISOString(),

      files: {
        projectData: 'project.json',
        thumbnail: options.includeThumbnail ? 'thumbnail.png' : undefined,
        customIcons: assetFiles, // Using new assets system
      },

      stats: {
        totalSizeBytes: 0, // Will be calculated after ZIP generation
        uncompressedBytes: totalUncompressed,
        compressionRatio: 0, // Will be calculated after ZIP generation
        iconCount: assets.length,
        characterCount: project.stats.characterCount,
      },

      compatibility: {
        minGeneratorVersion: '0.2.0',
        schemaVersion: project.schemaVersion,
      },
    };
  }

  /**
   * Add thumbnail to ZIP package
   */
  private async addThumbnail(zip: JSZip, project: Project): Promise<void> {
    const dataUrl = this.getThumbnailDataUrl(project.thumbnail);
    if (!dataUrl) {
      return; // No thumbnail available
    }

    try {
      // Convert data URL to blob
      const blob = await this.dataUrlToBlob(dataUrl);

      // Determine file extension from mime type
      const extension = this.getExtensionFromMimeType(blob.type);

      // Add to ZIP
      zip.file(`thumbnail.${extension}`, blob);
    } catch (error) {
      console.warn('Failed to add thumbnail to ZIP:', error);
      // Continue export without thumbnail
    }
  }

  /**
   * Add assets to ZIP package
   */
  private async addAssets(zip: JSZip, assets: DBAsset[]): Promise<void> {
    const assetsFolder = zip.folder('assets');
    if (!assetsFolder) {
      throw new Error('Failed to create assets folder in ZIP');
    }

    for (const asset of assets) {
      try {
        // Use the blob directly from the asset
        assetsFolder.file(asset.metadata.filename, asset.blob);
      } catch (error) {
        console.warn(`Failed to add asset ${asset.metadata.filename}:`, error);
        // Continue with other assets
      }
    }
  }

  /**
   * Add assets to ZIP using streaming (for large projects)
   *
   * This method uses an async generator to load assets one at a time,
   * preventing memory issues with projects containing 100+ assets.
   *
   * @param zip - JSZip instance
   * @param projectId - Project ID
   * @param includeUnused - Whether to include unused assets
   */
  private async addAssetsStreaming(
    zip: JSZip,
    projectId: string,
    includeUnused: boolean
  ): Promise<void> {
    const assetsFolder = zip.folder('assets');
    if (!assetsFolder) {
      throw new Error('Failed to create assets folder in ZIP');
    }

    // Stream assets one at a time
    for await (const asset of assetStorageService.streamExportableAssets(
      projectId,
      includeUnused
    )) {
      try {
        assetsFolder.file(asset.filename, asset.blob);
      } catch (error) {
        console.warn(`Failed to add asset ${asset.filename}:`, error);
        // Continue with other assets
      }
    }
  }

  /**
   * Extract data URL from thumbnail config
   */
  private getThumbnailDataUrl(thumbnail: Project['thumbnail']): string | undefined {
    switch (thumbnail.type) {
      case 'auto':
        return thumbnail.auto?.dataUrl;
      case 'token':
        return thumbnail.token?.dataUrl;
      case 'script-logo':
        return thumbnail.scriptLogo?.dataUrl;
      case 'custom':
        return thumbnail.custom?.dataUrl;
      default:
        return undefined;
    }
  }

  /**
   * Convert data URL to Blob
   */
  private async dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const response = await fetch(dataUrl);
    return response.blob();
  }

  /**
   * Get file extension from MIME type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const map: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };
    return map[mimeType] || 'png';
  }

  /**
   * Estimate thumbnail size (rough approximation)
   */
  private estimateThumbnailSize(project: Project): number {
    const dataUrl = this.getThumbnailDataUrl(project.thumbnail);
    if (!dataUrl) {
      return 0;
    }

    // Base64 encoded data is roughly 4/3 the size of binary data
    // Data URL format: "data:image/png;base64,..."
    const base64Data = dataUrl.split(',')[1] || '';
    return Math.floor((base64Data.length * 3) / 4);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Singleton instance of ProjectExporter
 */
export const projectExporter = new ProjectExporter();
