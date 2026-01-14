/**
 * Unit tests for PackageExtractor
 *
 * Tests ZIP extraction, manifest validation, character parsing,
 * icon extraction, content hash verification, and error handling.
 */

import JSZip from 'jszip';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DataSyncError, PackageValidationError } from '@/ts/errors';
import { PackageExtractor } from '@/ts/sync/packageExtractor';
import type { Character, ExtractedPackage, PackageManifest } from '@/ts/types';

// ============================================================================
// Test Fixtures
// ============================================================================

const createValidManifest = (overrides: Partial<PackageManifest> = {}): PackageManifest => ({
  version: 'v2025.01.01-r1',
  contentHash: 'abcdef1234567890',
  schemaVersion: 1,
  characterCount: 2,
  ...overrides,
});

const createValidCharacter = (overrides: Partial<Character> = {}): Character => ({
  id: 'washerwoman',
  name: 'Washerwoman',
  team: 'townsfolk',
  ability: 'You start knowing 1 of 2 players: one is a Townsfolk.',
  ...overrides,
});

/**
 * Create a mock ZIP file with specified contents
 */
async function createMockZip(options: {
  manifest?: PackageManifest | null;
  characters?: Character[] | null;
  icons?: { [filename: string]: string };
  invalidJson?: boolean;
}): Promise<Blob> {
  const zip = new JSZip();

  // Add manifest
  if (options.manifest !== null) {
    const manifestContent = options.invalidJson
      ? 'invalid json {'
      : JSON.stringify(options.manifest ?? createValidManifest());
    zip.file('manifest.json', manifestContent);
  }

  // Add characters
  if (options.characters !== null) {
    const charactersContent = options.invalidJson
      ? 'invalid json ['
      : JSON.stringify(
          options.characters ?? [
            createValidCharacter(),
            createValidCharacter({ id: 'imp', name: 'Imp', team: 'demon' }),
          ]
        );
    zip.file('characters.json', charactersContent);
  }

  // Add icons folder with files
  if (options.icons) {
    for (const [filename, content] of Object.entries(options.icons)) {
      zip.file(`icons/${filename}`, content);
    }
  }

  return await zip.generateAsync({ type: 'blob' });
}

// ============================================================================
// Tests
// ============================================================================

describe('PackageExtractor', () => {
  let extractor: PackageExtractor;

  beforeEach(() => {
    extractor = new PackageExtractor();
  });

  // ==========================================================================
  // Successful Extraction
  // ==========================================================================

  describe('extract', () => {
    it('should extract a valid package', async () => {
      const zipBlob = await createMockZip({
        manifest: createValidManifest({ characterCount: 1 }),
        characters: [createValidCharacter()],
        icons: { 'washerwoman.webp': 'fake-image-data' },
      });

      const result = await extractor.extract(zipBlob);

      expect(result).toBeDefined();
      expect(result.characters).toHaveLength(1);
      expect(result.manifest).toBeDefined();
      expect(result.icons).toBeInstanceOf(Map);
    });

    it('should extract manifest correctly', async () => {
      const manifest = createValidManifest({
        version: 'v2025.12.28-r5',
        contentHash: 'abc123',
        characterCount: 1,
      });
      const zipBlob = await createMockZip({
        manifest,
        characters: [createValidCharacter()],
        icons: { 'washerwoman.webp': 'data' },
      });

      const result = await extractor.extract(zipBlob);

      expect(result.manifest.version).toBe('v2025.12.28-r5');
      expect(result.manifest.contentHash).toBe('abc123');
      expect(result.manifest.schemaVersion).toBe(1);
      expect(result.manifest.characterCount).toBe(1);
    });

    it('should extract characters correctly', async () => {
      const characters = [
        createValidCharacter({ id: 'washerwoman', name: 'Washerwoman', team: 'townsfolk' }),
        createValidCharacter({ id: 'imp', name: 'Imp', team: 'demon' }),
      ];
      const zipBlob = await createMockZip({
        characters,
        icons: { 'washerwoman.webp': 'data1', 'imp.webp': 'data2' },
      });

      const result = await extractor.extract(zipBlob);

      expect(result.characters).toHaveLength(2);
      expect(result.characters[0].id).toBe('washerwoman');
      expect(result.characters[0].name).toBe('Washerwoman');
      expect(result.characters[1].id).toBe('imp');
      expect(result.characters[1].team).toBe('demon');
    });

    it('should extract icons correctly', async () => {
      const zipBlob = await createMockZip({
        characters: [
          createValidCharacter({ id: 'washerwoman' }),
          createValidCharacter({ id: 'imp' }),
        ],
        icons: {
          'washerwoman.webp': 'image-data-1',
          'imp.webp': 'image-data-2',
        },
      });

      const result = await extractor.extract(zipBlob);

      expect(result.icons.size).toBe(2);
      expect(result.icons.has('washerwoman')).toBe(true);
      expect(result.icons.has('imp')).toBe(true);
    });

    it('should extract icons from subdirectories', async () => {
      const zipBlob = await createMockZip({
        manifest: createValidManifest({ characterCount: 1 }),
        characters: [createValidCharacter({ id: 'steward' })],
        icons: {
          'carousel/steward.webp': 'steward-image',
        },
      });

      const result = await extractor.extract(zipBlob);

      expect(result.icons.size).toBe(1);
      expect(result.icons.has('steward')).toBe(true);
    });

    it('should handle package without optional characterCount', async () => {
      const manifest = createValidManifest();
      delete manifest.characterCount;
      const zipBlob = await createMockZip({
        manifest,
        characters: [createValidCharacter()],
        icons: { 'washerwoman.webp': 'data' },
      });

      const result = await extractor.extract(zipBlob);

      expect(result.characters).toHaveLength(1);
    });
  });

  // ==========================================================================
  // Manifest Validation
  // ==========================================================================

  describe('manifest validation', () => {
    it('should throw PackageValidationError if manifest is missing', async () => {
      const zipBlob = await createMockZip({
        manifest: null,
        characters: [createValidCharacter()],
        icons: { 'washerwoman.webp': 'data' },
      });

      await expect(extractor.extract(zipBlob)).rejects.toThrow(PackageValidationError);
      await expect(extractor.extract(zipBlob)).rejects.toThrow('Package missing manifest.json');
    });

    it('should throw PackageValidationError if manifest has invalid JSON', async () => {
      const zipBlob = await createMockZip({
        invalidJson: true,
        characters: [createValidCharacter()],
        icons: { 'washerwoman.webp': 'data' },
      });

      await expect(extractor.extract(zipBlob)).rejects.toThrow(PackageValidationError);
      await expect(extractor.extract(zipBlob)).rejects.toThrow('Failed to parse manifest.json');
    });

    it('should throw PackageValidationError if manifest is missing version', async () => {
      const manifest = createValidManifest();
      delete (manifest as Partial<PackageManifest>).version;
      const zipBlob = await createMockZip({
        manifest,
        characters: [createValidCharacter()],
        icons: { 'washerwoman.webp': 'data' },
      });

      await expect(extractor.extract(zipBlob)).rejects.toThrow(PackageValidationError);
      await expect(extractor.extract(zipBlob)).rejects.toThrow(
        'Manifest missing required field: version'
      );
    });

    it('should throw PackageValidationError if manifest is missing contentHash', async () => {
      const manifest = createValidManifest();
      delete (manifest as Partial<PackageManifest>).contentHash;
      const zipBlob = await createMockZip({
        manifest,
        characters: [createValidCharacter()],
        icons: { 'washerwoman.webp': 'data' },
      });

      await expect(extractor.extract(zipBlob)).rejects.toThrow(PackageValidationError);
      await expect(extractor.extract(zipBlob)).rejects.toThrow(
        'Manifest missing required field: contentHash'
      );
    });

    it('should throw PackageValidationError if manifest is missing schemaVersion', async () => {
      const manifest = createValidManifest();
      delete (manifest as Partial<PackageManifest>).schemaVersion;
      const zipBlob = await createMockZip({
        manifest,
        characters: [createValidCharacter()],
        icons: { 'washerwoman.webp': 'data' },
      });

      await expect(extractor.extract(zipBlob)).rejects.toThrow(PackageValidationError);
      await expect(extractor.extract(zipBlob)).rejects.toThrow(
        'Manifest missing required field: schemaVersion'
      );
    });

    it('should accept version format YYYY.MM.DD-rN', async () => {
      const manifest = createValidManifest({ version: 'v2025.12.28-r1', characterCount: 1 });
      const zipBlob = await createMockZip({
        manifest,
        characters: [createValidCharacter()],
        icons: { 'washerwoman.webp': 'data' },
      });

      const result = await extractor.extract(zipBlob);

      expect(result.manifest.version).toBe('v2025.12.28-r1');
    });

    it('should accept version format without v prefix', async () => {
      const manifest = createValidManifest({ version: '2025.12.28-r1', characterCount: 1 });
      const zipBlob = await createMockZip({
        manifest,
        characters: [createValidCharacter()],
        icons: { 'washerwoman.webp': 'data' },
      });

      const result = await extractor.extract(zipBlob);

      expect(result.manifest.version).toBe('2025.12.28-r1');
    });

    it('should accept version format YYYY.MM.DD without revision', async () => {
      const manifest = createValidManifest({ version: '2025.12.28', characterCount: 1 });
      const zipBlob = await createMockZip({
        manifest,
        characters: [createValidCharacter()],
        icons: { 'washerwoman.webp': 'data' },
      });

      const result = await extractor.extract(zipBlob);

      expect(result.manifest.version).toBe('2025.12.28');
    });

    it('should throw PackageValidationError for invalid version format', async () => {
      const manifest = createValidManifest({ version: '2025-12-28' });
      const zipBlob = await createMockZip({
        manifest,
        characters: [createValidCharacter()],
        icons: { 'washerwoman.webp': 'data' },
      });

      await expect(extractor.extract(zipBlob)).rejects.toThrow(PackageValidationError);
      await expect(extractor.extract(zipBlob)).rejects.toThrow('Invalid version format');
    });

    it('should throw PackageValidationError for unsupported schema version', async () => {
      const manifest = createValidManifest({ schemaVersion: 2 });
      const zipBlob = await createMockZip({
        manifest,
        characters: [createValidCharacter()],
        icons: { 'washerwoman.webp': 'data' },
      });

      await expect(extractor.extract(zipBlob)).rejects.toThrow(PackageValidationError);
      await expect(extractor.extract(zipBlob)).rejects.toThrow('Unsupported schema version');
    });
  });

  // ==========================================================================
  // Characters Validation
  // ==========================================================================

  describe('characters validation', () => {
    it('should throw PackageValidationError if characters.json is missing', async () => {
      const zipBlob = await createMockZip({
        manifest: createValidManifest(),
        characters: null,
        icons: { 'washerwoman.webp': 'data' },
      });

      await expect(extractor.extract(zipBlob)).rejects.toThrow(PackageValidationError);
      await expect(extractor.extract(zipBlob)).rejects.toThrow('Package missing characters.json');
    });

    it('should throw PackageValidationError if characters.json has invalid JSON', async () => {
      const zipBlob = await createMockZip({
        invalidJson: true,
        icons: { 'washerwoman.webp': 'data' },
      });

      await expect(extractor.extract(zipBlob)).rejects.toThrow(PackageValidationError);
    });

    it('should throw PackageValidationError if characters.json is not an array', async () => {
      const zip = new JSZip();
      zip.file('manifest.json', JSON.stringify(createValidManifest()));
      zip.file('characters.json', JSON.stringify({ notAnArray: true }));
      zip.file('icons/test.webp', 'data');
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      await expect(extractor.extract(zipBlob)).rejects.toThrow(PackageValidationError);
      await expect(extractor.extract(zipBlob)).rejects.toThrow(
        'characters.json must contain an array'
      );
    });

    it('should throw PackageValidationError if character is missing id', async () => {
      const character = createValidCharacter();
      delete (character as Partial<Character>).id;
      const zipBlob = await createMockZip({
        characters: [character],
        icons: { 'test.webp': 'data' },
      });

      await expect(extractor.extract(zipBlob)).rejects.toThrow(PackageValidationError);
      await expect(extractor.extract(zipBlob)).rejects.toThrow(
        'Character missing required field: id'
      );
    });

    it('should throw PackageValidationError if character is missing name', async () => {
      const character = createValidCharacter();
      delete (character as Partial<Character>).name;
      const zipBlob = await createMockZip({
        characters: [character],
        icons: { 'test.webp': 'data' },
      });

      await expect(extractor.extract(zipBlob)).rejects.toThrow(PackageValidationError);
      await expect(extractor.extract(zipBlob)).rejects.toThrow(
        'Character missing required field: name'
      );
    });

    it('should throw PackageValidationError if character is missing team', async () => {
      const character = createValidCharacter();
      delete (character as Partial<Character>).team;
      const zipBlob = await createMockZip({
        characters: [character],
        icons: { 'test.webp': 'data' },
      });

      await expect(extractor.extract(zipBlob)).rejects.toThrow(PackageValidationError);
      await expect(extractor.extract(zipBlob)).rejects.toThrow(
        'Character missing required field: team'
      );
    });

    it('should throw PackageValidationError for invalid team value', async () => {
      const character = createValidCharacter({ team: 'invalid-team' as never });
      const zipBlob = await createMockZip({
        characters: [character],
        icons: { 'test.webp': 'data' },
      });

      await expect(extractor.extract(zipBlob)).rejects.toThrow(PackageValidationError);
      await expect(extractor.extract(zipBlob)).rejects.toThrow('Invalid team value');
    });

    it('should accept all valid team types', async () => {
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
      const characters = validTeams.map((team, i) =>
        createValidCharacter({ id: `char${i}`, team: team as never })
      );
      const icons = Object.fromEntries(characters.map((c) => [`${c.id}.webp`, 'data']));
      const zipBlob = await createMockZip({
        manifest: createValidManifest({ characterCount: validTeams.length }),
        characters,
        icons,
      });

      const result = await extractor.extract(zipBlob);

      expect(result.characters).toHaveLength(validTeams.length);
    });

    it('should throw PackageValidationError if character count does not match manifest', async () => {
      const zipBlob = await createMockZip({
        manifest: createValidManifest({ characterCount: 5 }),
        characters: [createValidCharacter(), createValidCharacter({ id: 'imp' })],
        icons: { 'washerwoman.webp': 'data', 'imp.webp': 'data' },
      });

      await expect(extractor.extract(zipBlob)).rejects.toThrow(PackageValidationError);
      await expect(extractor.extract(zipBlob)).rejects.toThrow('Character count mismatch');
    });
  });

  // ==========================================================================
  // Icons Extraction
  // ==========================================================================

  describe('icon extraction', () => {
    it('should throw PackageValidationError if icons folder is missing', async () => {
      const zipBlob = await createMockZip({
        manifest: createValidManifest(),
        characters: [createValidCharacter()],
        icons: undefined,
      });

      await expect(extractor.extract(zipBlob)).rejects.toThrow(PackageValidationError);
      await expect(extractor.extract(zipBlob)).rejects.toThrow('Package missing icons/ folder');
    });

    it('should only extract .webp files from icons folder', async () => {
      const zipBlob = await createMockZip({
        manifest: createValidManifest({ characterCount: 1 }),
        characters: [createValidCharacter()],
        icons: {
          'washerwoman.webp': 'valid-image',
          'readme.txt': 'not-an-image',
          'icon.png': 'wrong-format',
        },
      });

      const result = await extractor.extract(zipBlob);

      expect(result.icons.size).toBe(1);
      expect(result.icons.has('washerwoman')).toBe(true);
    });

    it('should extract character ID from icon filename', async () => {
      const zipBlob = await createMockZip({
        manifest: createValidManifest({ characterCount: 1 }),
        characters: [createValidCharacter({ id: 'washerwoman' })],
        icons: {
          'washerwoman.webp': 'image-data',
        },
      });

      const result = await extractor.extract(zipBlob);

      expect(result.icons.has('washerwoman')).toBe(true);
    });

    it('should handle icons in nested subdirectories', async () => {
      const zipBlob = await createMockZip({
        characters: [
          createValidCharacter({ id: 'steward' }),
          createValidCharacter({ id: 'baron' }),
        ],
        icons: {
          'carousel/steward.webp': 'steward-image',
          'experimental/baron.webp': 'baron-image',
        },
      });

      const result = await extractor.extract(zipBlob);

      expect(result.icons.size).toBe(2);
      expect(result.icons.has('steward')).toBe(true);
      expect(result.icons.has('baron')).toBe(true);
    });

    it('should convert icon files to blobs', async () => {
      const zipBlob = await createMockZip({
        manifest: createValidManifest({ characterCount: 1 }),
        characters: [createValidCharacter({ id: 'washerwoman' })],
        icons: {
          'washerwoman.webp': 'fake-binary-data',
        },
      });

      const result = await extractor.extract(zipBlob);

      const blob = result.icons.get('washerwoman');
      expect(blob).toBeInstanceOf(Blob);
    });
  });

  // ==========================================================================
  // Content Hash Verification
  // ==========================================================================

  describe('verifyContentHash', () => {
    it('should return true for valid content hash', async () => {
      const characters = [createValidCharacter()];
      const charactersJson = JSON.stringify(characters);
      const encoder = new TextEncoder();
      const data = encoder.encode(charactersJson);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const contentHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      const manifest = createValidManifest({ contentHash });
      const extractedPackage: ExtractedPackage = {
        characters,
        manifest,
        icons: new Map(),
      };

      const isValid = await extractor.verifyContentHash(extractedPackage);

      expect(isValid).toBe(true);
    });

    it('should return false for invalid content hash', async () => {
      const extractedPackage: ExtractedPackage = {
        characters: [createValidCharacter()],
        manifest: createValidManifest({ contentHash: 'invalid-hash' }),
        icons: new Map(),
      };

      const isValid = await extractor.verifyContentHash(extractedPackage);

      expect(isValid).toBe(false);
    });

    it('should return false on hash computation error', async () => {
      const extractedPackage: ExtractedPackage = {
        characters: [createValidCharacter()],
        manifest: createValidManifest(),
        icons: new Map(),
      };

      // Mock crypto.subtle.digest to throw
      const originalDigest = crypto.subtle.digest;
      crypto.subtle.digest = vi.fn().mockRejectedValueOnce(new Error('Hash error'));

      const isValid = await extractor.verifyContentHash(extractedPackage);

      expect(isValid).toBe(false);

      // Restore original
      crypto.subtle.digest = originalDigest;
    });
  });

  // ==========================================================================
  // Package Statistics
  // ==========================================================================

  describe('getPackageStats', () => {
    it('should return accurate package statistics', async () => {
      const extractedPackage: ExtractedPackage = {
        characters: [
          createValidCharacter({ id: 'washerwoman' }),
          createValidCharacter({ id: 'imp' }),
        ],
        manifest: createValidManifest({ version: 'v2025.12.28-r1' }),
        icons: new Map([
          ['washerwoman', new Blob(['icon1'], { type: 'image/webp' })],
          ['imp', new Blob(['icon2'], { type: 'image/webp' })],
        ]),
      };

      const stats = extractor.getPackageStats(extractedPackage);

      expect(stats.characterCount).toBe(2);
      expect(stats.iconCount).toBe(2);
      expect(stats.version).toBe('v2025.12.28-r1');
      expect(stats.totalIconSizeBytes).toBeGreaterThan(0);
      expect(stats.totalIconSizeMB).toBeGreaterThan(0);
    });

    it('should calculate icon size correctly', async () => {
      const blob1 = new Blob([new Uint8Array(1024)], { type: 'image/webp' }); // 1 KB
      const blob2 = new Blob([new Uint8Array(2048)], { type: 'image/webp' }); // 2 KB

      const extractedPackage: ExtractedPackage = {
        characters: [createValidCharacter(), createValidCharacter({ id: 'imp' })],
        manifest: createValidManifest(),
        icons: new Map([
          ['washerwoman', blob1],
          ['imp', blob2],
        ]),
      };

      const stats = extractor.getPackageStats(extractedPackage);

      expect(stats.totalIconSizeBytes).toBe(3072); // 1024 + 2048
      expect(stats.totalIconSizeMB).toBeCloseTo(3072 / (1024 * 1024));
    });

    it('should handle empty icon map', async () => {
      const extractedPackage: ExtractedPackage = {
        characters: [createValidCharacter()],
        manifest: createValidManifest(),
        icons: new Map(),
      };

      const stats = extractor.getPackageStats(extractedPackage);

      expect(stats.iconCount).toBe(0);
      expect(stats.totalIconSizeBytes).toBe(0);
      expect(stats.totalIconSizeMB).toBe(0);
    });
  });

  // ==========================================================================
  // Structure Validation
  // ==========================================================================

  describe('validateStructure', () => {
    it('should return true for valid package structure', async () => {
      const zipBlob = await createMockZip({
        manifest: createValidManifest(),
        characters: [createValidCharacter()],
        icons: { 'washerwoman.webp': 'data' },
      });

      const isValid = await extractor.validateStructure(zipBlob);

      expect(isValid).toBe(true);
    });

    it('should return false if manifest is missing', async () => {
      const zipBlob = await createMockZip({
        manifest: null,
        characters: [createValidCharacter()],
        icons: { 'washerwoman.webp': 'data' },
      });

      const isValid = await extractor.validateStructure(zipBlob);

      expect(isValid).toBe(false);
    });

    it('should return false if characters.json is missing', async () => {
      const zipBlob = await createMockZip({
        manifest: createValidManifest(),
        characters: null,
        icons: { 'washerwoman.webp': 'data' },
      });

      const isValid = await extractor.validateStructure(zipBlob);

      expect(isValid).toBe(false);
    });

    it('should return false if icons folder is missing', async () => {
      const zipBlob = await createMockZip({
        manifest: createValidManifest(),
        characters: [createValidCharacter()],
        icons: undefined,
      });

      const isValid = await extractor.validateStructure(zipBlob);

      expect(isValid).toBe(false);
    });

    it('should return false for invalid ZIP blob', async () => {
      const invalidBlob = new Blob(['not a zip file']);

      const isValid = await extractor.validateStructure(invalidBlob);

      expect(isValid).toBe(false);
    });

    it('should not validate contents deeply', async () => {
      // Structure validation should only check file existence, not content validity
      const zip = new JSZip();
      zip.file('manifest.json', 'invalid json {');
      zip.file('characters.json', 'invalid json [');
      zip.file('icons/test.webp', 'data');
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      const isValid = await extractor.validateStructure(zipBlob);

      // Should be true because files exist, even though content is invalid
      expect(isValid).toBe(true);
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  describe('error handling', () => {
    it('should wrap unknown errors in DataSyncError', async () => {
      const invalidBlob = new Blob(['completely invalid data']);

      await expect(extractor.extract(invalidBlob)).rejects.toThrow(DataSyncError);
      await expect(extractor.extract(invalidBlob)).rejects.toThrow('Failed to extract package');
    });

    it('should preserve PackageValidationError', async () => {
      const zipBlob = await createMockZip({
        manifest: null,
        characters: [createValidCharacter()],
        icons: { 'test.webp': 'data' },
      });

      await expect(extractor.extract(zipBlob)).rejects.toThrow(PackageValidationError);
    });

    it('should include cause in DataSyncError', async () => {
      const invalidBlob = new Blob(['invalid']);

      try {
        await extractor.extract(invalidBlob);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(DataSyncError);
        if (error instanceof DataSyncError) {
          expect(error.cause).toBeDefined();
          expect(error.syncOperation).toBe('extraction');
        }
      }
    });
  });

  // ==========================================================================
  // Singleton Export
  // ==========================================================================

  describe('singleton export', () => {
    it('should export a singleton instance', async () => {
      // Module exports named singleton, not default export
      const { packageExtractor: importedExtractor } = await import('@/ts/sync/packageExtractor');

      expect(importedExtractor).toBeDefined();
      expect(importedExtractor).toBeInstanceOf(PackageExtractor);
    });

    it('should allow creating multiple instances', () => {
      const extractor1 = new PackageExtractor();
      const extractor2 = new PackageExtractor();

      expect(extractor1).not.toBe(extractor2);
    });
  });
});
