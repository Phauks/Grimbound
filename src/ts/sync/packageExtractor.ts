/**
 * Blood on the Clocktower Token Generator
 * Package Extractor - Extract and validate GitHub release ZIP packages
 *
 * Features:
 * - ZIP extraction using JSZip
 * - Package structure validation
 * - Content hash verification (SHA-256)
 * - Character and icon extraction
 */

import JSZip from 'jszip';
import { DataSyncError, PackageValidationError } from '@/ts/errors.js';
import type { Character, ExtractedPackage, PackageManifest } from '@/ts/types/index.js';
import { logger } from '@/ts/utils/logger.js';

/**
 * Package Extractor for processing GitHub release ZIP files
 */
export class PackageExtractor {
  /**
   * Extract contents from a ZIP blob
   * @param zipBlob - The ZIP file as a Blob
   * @returns Extracted package contents
   */
  async extract(zipBlob: Blob): Promise<ExtractedPackage> {
    try {
      // Load ZIP file
      const zip = await JSZip.loadAsync(zipBlob);

      // Extract and validate manifest
      const manifest = await this.extractManifest(zip);

      // Extract characters
      const characters = await this.extractCharacters(zip);

      // Extract icons
      const icons = await this.extractIcons(zip);

      // Validate character count matches manifest
      if (manifest.characterCount !== undefined && characters.length !== manifest.characterCount) {
        throw new PackageValidationError(
          `Character count mismatch: manifest expects ${manifest.characterCount} but found ${characters.length}`,
          'structure'
        );
      }

      return {
        characters,
        manifest,
        icons,
      };
    } catch (error) {
      if (error instanceof PackageValidationError) {
        throw error;
      }

      throw new DataSyncError(
        'Failed to extract package',
        'extraction',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Extract and validate the manifest file
   */
  private async extractManifest(zip: JSZip): Promise<PackageManifest> {
    const manifestFile = zip.file('manifest.json');

    if (!manifestFile) {
      throw new PackageValidationError('Package missing manifest.json', 'structure');
    }

    try {
      const content = await manifestFile.async('string');
      const manifest = JSON.parse(content) as PackageManifest;

      // Validate required fields
      this.validateManifest(manifest);

      return manifest;
    } catch (error) {
      if (error instanceof PackageValidationError) {
        throw error;
      }

      throw new PackageValidationError(
        'Failed to parse manifest.json',
        'structure',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Validate manifest structure and required fields
   */
  private validateManifest(manifest: PackageManifest): void {
    const requiredFields = ['version', 'contentHash', 'schemaVersion'];

    for (const field of requiredFields) {
      if (!(field in manifest)) {
        throw new PackageValidationError(`Manifest missing required field: ${field}`, 'structure');
      }
    }

    // Validate version format (YYYY.MM.DD or vYYYY.MM.DD-rN)
    const versionRegex = /^v?\d{4}\.\d{2}\.\d{2}(-r\d+)?$/;
    if (!versionRegex.test(manifest.version)) {
      throw new PackageValidationError(
        `Invalid version format: ${manifest.version}. Expected YYYY.MM.DD or vYYYY.MM.DD-rN`,
        'structure'
      );
    }

    // Validate schema version
    if (manifest.schemaVersion !== 1) {
      throw new PackageValidationError(
        `Unsupported schema version: ${manifest.schemaVersion}. Expected 1`,
        'schema'
      );
    }
  }

  /**
   * Extract characters.json
   */
  private async extractCharacters(zip: JSZip): Promise<Character[]> {
    const charactersFile = zip.file('characters.json');

    if (!charactersFile) {
      throw new PackageValidationError('Package missing characters.json', 'structure');
    }

    try {
      const content = await charactersFile.async('string');
      const characters = JSON.parse(content) as Character[];

      if (!Array.isArray(characters)) {
        throw new PackageValidationError('characters.json must contain an array', 'structure');
      }

      // Validate each character has required fields
      for (const character of characters) {
        this.validateCharacter(character);
      }

      return characters;
    } catch (error) {
      if (error instanceof PackageValidationError) {
        throw error;
      }

      throw new PackageValidationError(
        'Failed to parse characters.json',
        'structure',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Validate a character has required fields
   */
  private validateCharacter(character: Character): void {
    const requiredFields = ['id', 'name', 'team'];

    for (const field of requiredFields) {
      if (!(field in character)) {
        throw new PackageValidationError(`Character missing required field: ${field}`, 'structure');
      }
    }

    // Validate team is a valid value
    const validTeams = [
      'townsfolk',
      'outsider',
      'minion',
      'demon',
      'traveller',
      'fabled',
      'loric',
      'meta',
    ];
    if (!validTeams.includes(character.team)) {
      throw new PackageValidationError(
        `Invalid team value: ${character.team}. Must be one of: ${validTeams.join(', ')}`,
        'structure'
      );
    }
  }

  /**
   * Extract character icons from icons/ folder
   */
  private async extractIcons(zip: JSZip): Promise<Map<string, Blob>> {
    const icons = new Map<string, Blob>();

    // Check if icons folder exists by trying to get it
    const hasIconsFolder = Object.keys(zip.files).some((path) => path.startsWith('icons/'));

    if (!hasIconsFolder) {
      throw new PackageValidationError('Package missing icons/ folder', 'structure');
    }

    const iconsFolder = zip.folder('icons');
    if (!iconsFolder) {
      throw new PackageValidationError('Package missing icons/ folder', 'structure');
    }

    // Get all files in icons/ folder
    const iconFiles: Array<{ name: string; file: JSZip.JSZipObject }> = [];
    iconsFolder.forEach((relativePath, file) => {
      // Only process .webp files (ignore directories)
      if (relativePath.endsWith('.webp') && !file.dir) {
        iconFiles.push({ name: relativePath, file });
      }
    });

    // Extract each icon
    for (const { name, file } of iconFiles) {
      try {
        const blob = await file.async('blob');

        // Extract character ID from filename
        // name could be "washerwoman.webp" or "carousel/steward.webp"
        // We want just the filename without extension
        const filename = name.split('/').pop() || name;
        const characterId = filename.replace('.webp', '');

        icons.set(characterId, blob);
      } catch (error) {
        logger.warn('PackageExtractor', `Failed to extract icon: ${name}`, error);
        // Continue with other icons even if one fails
      }
    }

    return icons;
  }

  /**
   * Verify package content hash (SHA-256)
   * @param extractedPackage - The extracted package
   * @returns true if hash matches, false otherwise
   */
  async verifyContentHash(extractedPackage: ExtractedPackage): Promise<boolean> {
    try {
      // Compute hash of characters data
      const charactersJson = JSON.stringify(extractedPackage.characters);
      const encoder = new TextEncoder();
      const data = encoder.encode(charactersJson);

      // Use SubtleCrypto for SHA-256
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);

      // Convert to hex string
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      // Compare with manifest hash
      const expectedHash = extractedPackage.manifest.contentHash;

      if (hashHex !== expectedHash) {
        logger.warn(
          'PackageExtractor',
          `Content hash mismatch: expected ${expectedHash}, got ${hashHex}`
        );
        return false;
      }

      return true;
    } catch (error) {
      logger.error('PackageExtractor', 'Failed to verify content hash:', error);
      return false;
    }
  }

  /**
   * Get package size statistics
   * @param extractedPackage - The extracted package
   * @returns Size information in bytes and MB
   */
  getPackageStats(extractedPackage: ExtractedPackage): {
    characterCount: number;
    iconCount: number;
    version: string;
    totalIconSizeBytes: number;
    totalIconSizeMB: number;
  } {
    let totalIconSize = 0;
    for (const blob of extractedPackage.icons.values()) {
      totalIconSize += blob.size;
    }

    return {
      characterCount: extractedPackage.characters.length,
      iconCount: extractedPackage.icons.size,
      version: extractedPackage.manifest.version,
      totalIconSizeBytes: totalIconSize,
      totalIconSizeMB: totalIconSize / (1024 * 1024),
    };
  }

  /**
   * Validate package structure without extracting all content
   * Quick check to ensure package is valid before full extraction
   * @param zipBlob - The ZIP file as a Blob
   * @returns true if structure is valid
   */
  async validateStructure(zipBlob: Blob): Promise<boolean> {
    try {
      const zip = await JSZip.loadAsync(zipBlob);

      // Check for required files
      const hasManifest = zip.file('manifest.json') !== null;
      const hasCharacters = zip.file('characters.json') !== null;
      const hasIconsFolder = Object.keys(zip.files).some((path) => path.startsWith('icons/'));

      return hasManifest && hasCharacters && hasIconsFolder;
    } catch (error) {
      logger.error('PackageExtractor', 'Structure validation failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const packageExtractor = new PackageExtractor();

export default packageExtractor;
