/**
 * Project Importer Service
 *
 * Handles importing projects from ZIP packages with:
 * - ZIP structure validation
 * - Manifest compatibility checking
 * - Project data extraction
 * - Custom icon loading
 * - Preview generation
 *
 * @module services/project/ProjectImporter
 */

import JSZip from 'jszip';
import type { IProjectImporter } from './IProjectService.js';
import type {
  Project,
  ValidationResult,
  ProjectPreview,
  ProjectManifest,
  CustomIconMetadata,
} from '../../types/project.js';
import { generateUuid } from '../../utils/nameGenerator.js';
import { CONFIG } from '../../config.js';

// ============================================================================
// Constants
// ============================================================================

const REQUIRED_FILES = ['project.json', 'manifest.json'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit
const WARN_FILE_SIZE = 10 * 1024 * 1024; // 10MB warning threshold

// ============================================================================
// ProjectImporter Implementation
// ============================================================================

/**
 * Service for importing projects from ZIP files
 */
export class ProjectImporter implements IProjectImporter {
  /**
   * Import a project from a ZIP file
   *
   * @param file - ZIP file to import
   * @returns Imported project with new UUID
   */
  async importFromZip(file: File): Promise<Project> {
    // Validate ZIP structure
    const validation = await this.validateZip(file);
    if (!validation.valid) {
      throw new Error(`Invalid ZIP file: ${validation.errors.join(', ')}`);
    }

    // Load ZIP
    const zip = await JSZip.loadAsync(file);

    // Extract manifest
    const manifest = await this.extractManifest(zip);

    // Check compatibility
    this.checkCompatibility(manifest);

    // Extract project data
    const projectData = await this.extractProjectData(zip);

    // Load custom icons
    const customIcons = await this.loadCustomIcons(zip, projectData.state.customIcons);

    // Generate new UUID for imported project
    const importedProject: Project = {
      ...projectData,
      id: generateUuid(),
      createdAt: Date.now(),
      lastModifiedAt: Date.now(),
      lastAccessedAt: Date.now(),
      state: {
        ...projectData.state,
        customIcons,
      },
    };

    return importedProject;
  }

  /**
   * Validate a ZIP file structure
   *
   * @param file - ZIP file to validate
   * @returns Validation result with errors and warnings
   */
  async validateZip(file: File): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`File size (${this.formatBytes(file.size)}) exceeds maximum allowed (${this.formatBytes(MAX_FILE_SIZE)})`);
    } else if (file.size > WARN_FILE_SIZE) {
      warnings.push(`File size (${this.formatBytes(file.size)}) is quite large`);
    }

    // Check file extension
    if (!file.name.endsWith('.zip')) {
      warnings.push('File does not have .zip extension');
    }

    // Try to load as ZIP
    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(file);
    } catch (error) {
      errors.push('File is not a valid ZIP archive');
      return { valid: false, errors, warnings };
    }

    // Check for required files
    for (const requiredFile of REQUIRED_FILES) {
      if (!zip.files[requiredFile]) {
        errors.push(`Missing required file: ${requiredFile}`);
      }
    }

    // Validate manifest.json
    if (zip.files['manifest.json']) {
      try {
        const manifestText = await zip.files['manifest.json'].async('text');
        const manifest: ProjectManifest = JSON.parse(manifestText);

        // Check format
        if (manifest.format !== 'blood-on-the-clocktower-project-package') {
          errors.push('Invalid package format');
        }

        // Check version compatibility
        if (manifest.compatibility.minGeneratorVersion) {
          const minVersion = manifest.compatibility.minGeneratorVersion;
          if (this.compareVersions(CONFIG.VERSION, minVersion) < 0) {
            warnings.push(`This package requires generator version ${minVersion} or higher (current: ${CONFIG.VERSION})`);
          }
        }
      } catch (error) {
        errors.push('manifest.json is not valid JSON');
      }
    }

    // Validate project.json
    if (zip.files['project.json']) {
      try {
        const projectText = await zip.files['project.json'].async('text');
        JSON.parse(projectText);
      } catch (error) {
        errors.push('project.json is not valid JSON');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Preview a ZIP file without importing
   *
   * @param file - ZIP file to preview
   * @returns Preview data
   */
  async previewZip(file: File): Promise<ProjectPreview> {
    const zip = await JSZip.loadAsync(file);

    // Extract manifest and project data
    const manifest = await this.extractManifest(zip);
    const projectData = await this.extractProjectData(zip);

    // Extract thumbnail if available
    let thumbnailDataUrl: string | undefined;
    const thumbnailFile = manifest.files.thumbnail;
    if (thumbnailFile && zip.files[thumbnailFile]) {
      const blob = await zip.files[thumbnailFile].async('blob');
      thumbnailDataUrl = await this.blobToDataUrl(blob);
    }

    return {
      name: projectData.name,
      description: projectData.description,
      characterCount: projectData.stats.characterCount,
      customIconCount: projectData.stats.customIconCount,
      thumbnailDataUrl,
      tags: projectData.tags,
      estimatedSizeBytes: file.size,
      manifest,
    };
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Extract manifest.json from ZIP
   */
  private async extractManifest(zip: JSZip): Promise<ProjectManifest> {
    const manifestFile = zip.files['manifest.json'];
    if (!manifestFile) {
      throw new Error('manifest.json not found in ZIP');
    }

    const manifestText = await manifestFile.async('text');
    return JSON.parse(manifestText);
  }

  /**
   * Extract project.json from ZIP
   */
  private async extractProjectData(zip: JSZip): Promise<Project> {
    const projectFile = zip.files['project.json'];
    if (!projectFile) {
      throw new Error('project.json not found in ZIP');
    }

    const projectText = await projectFile.async('text');
    return JSON.parse(projectText);
  }

  /**
   * Load custom icons from ZIP
   */
  private async loadCustomIcons(
    zip: JSZip,
    iconMetadata: CustomIconMetadata[]
  ): Promise<CustomIconMetadata[]> {
    const loadedIcons: CustomIconMetadata[] = [];

    for (const metadata of iconMetadata) {
      const iconPath = `icons/${metadata.filename}`;
      const iconFile = zip.files[iconPath];

      if (!iconFile) {
        console.warn(`Custom icon not found in ZIP: ${iconPath}`);
        continue;
      }

      try {
        const blob = await iconFile.async('blob');
        const dataUrl = await this.blobToDataUrl(blob);

        loadedIcons.push({
          ...metadata,
          dataUrl,
          storedInIndexedDB: false, // Will be stored when project is saved
          fileSize: blob.size,
          mimeType: blob.type || metadata.mimeType,
          lastModified: Date.now(),
        });
      } catch (error) {
        console.warn(`Failed to load icon ${iconPath}:`, error);
      }
    }

    return loadedIcons;
  }

  /**
   * Check compatibility with current generator version
   */
  private checkCompatibility(manifest: ProjectManifest): void {
    const minVersion = manifest.compatibility.minGeneratorVersion;
    if (!minVersion) {
      return; // No minimum version specified
    }

    if (this.compareVersions(CONFIG.VERSION, minVersion) < 0) {
      throw new Error(
        `This package requires generator version ${minVersion} or higher (current: ${CONFIG.VERSION})`
      );
    }
  }

  /**
   * Compare semantic version strings
   * @returns -1 if v1 < v2, 0 if equal, 1 if v1 > v2
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;

      if (part1 < part2) return -1;
      if (part1 > part2) return 1;
    }

    return 0;
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
   * Format bytes as human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Singleton instance of ProjectImporter
 */
export const projectImporter = new ProjectImporter();
