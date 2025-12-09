/**
 * Project Exporter Service
 *
 * Handles exporting projects as ZIP packages with:
 * - project.json (project data)
 * - manifest.json (package metadata)
 * - thumbnail.png (project thumbnail)
 * - icons/ folder (custom character icons)
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
import { sanitizeFilename } from '../../utils/stringUtils.js';
import { downloadFile } from '../../utils/imageUtils.js';
import { CONFIG } from '../../config.js';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_EXPORT_OPTIONS: Required<ExportOptions> = {
  includeCustomIcons: true,
  includeThumbnail: true,
  compressImages: false, // Future feature
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

    // 1. Add project.json (project data without embedded images)
    const projectData = this.prepareProjectData(project);
    zip.file('project.json', JSON.stringify(projectData, null, 2));

    // 2. Add manifest.json (package metadata)
    const manifest = await this.generateManifest(project, opts);
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));

    // 3. Add thumbnail (if enabled and available)
    if (opts.includeThumbnail) {
      await this.addThumbnail(zip, project);
    }

    // 4. Add custom icons (if enabled and available)
    if (opts.includeCustomIcons && project.state.customIcons.length > 0) {
      await this.addCustomIcons(zip, project.state.customIcons);
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
   * Prepare project data for export (strip out data URLs to keep file clean)
   */
  private prepareProjectData(project: Project): Project {
    // Deep clone to avoid mutating original
    const exportData: Project = JSON.parse(JSON.stringify(project));

    // Remove data URLs from custom icons (they'll be in icons/ folder)
    exportData.state.customIcons = exportData.state.customIcons.map((icon) => ({
      ...icon,
      dataUrl: undefined, // Remove data URL
      storedInIndexedDB: false, // This is for import reference
    }));

    return exportData;
  }

  /**
   * Generate manifest.json for the ZIP package
   */
  private async generateManifest(
    project: Project,
    options: Required<ExportOptions>
  ): Promise<ProjectManifest> {
    const customIconFiles = options.includeCustomIcons
      ? project.state.customIcons.map((icon) => `icons/${icon.filename}`)
      : [];

    // Calculate file sizes (approximate)
    const projectJsonSize = JSON.stringify(this.prepareProjectData(project)).length;
    const manifestJsonSize = 500; // Approximate
    const thumbnailSize = options.includeThumbnail ? this.estimateThumbnailSize(project) : 0;
    const iconsSize = project.state.customIcons.reduce((sum, icon) => sum + (icon.fileSize || 0), 0);
    const totalUncompressed = projectJsonSize + manifestJsonSize + thumbnailSize + iconsSize;

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
        customIcons: customIconFiles,
      },

      stats: {
        totalSizeBytes: 0, // Will be calculated after ZIP generation
        uncompressedBytes: totalUncompressed,
        compressionRatio: 0, // Will be calculated after ZIP generation
        iconCount: project.state.customIcons.length,
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
   * Add custom icons to ZIP package
   */
  private async addCustomIcons(
    zip: JSZip,
    customIcons: CustomIconMetadata[]
  ): Promise<void> {
    const iconsFolder = zip.folder('icons');
    if (!iconsFolder) {
      throw new Error('Failed to create icons folder in ZIP');
    }

    for (const icon of customIcons) {
      if (!icon.dataUrl) {
        console.warn(`Skipping icon ${icon.filename} - no data URL available`);
        continue;
      }

      try {
        const blob = await this.dataUrlToBlob(icon.dataUrl);
        iconsFolder.file(icon.filename, blob);
      } catch (error) {
        console.warn(`Failed to add icon ${icon.filename}:`, error);
        // Continue with other icons
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
