/**
 * Blood on the Clocktower Token Generator
 * Package Extractor Unit Tests
 */

import JSZip from 'jszip';
import { beforeEach, describe, expect, it } from 'vitest';
import { PackageValidationError } from '../../errors.js';
import type { Character, PackageManifest } from '../../types/index.js';
import { PackageExtractor } from '../packageExtractor.js';

// Mock data
const mockManifest: PackageManifest = {
  version: 'v2025.12.03-r6',
  releaseDate: '2025-12-03T12:00:00Z',
  contentHash: 'abc123def456',
  schemaVersion: 1,
  characterCount: 2,
  reminderTokenCount: 5,
  jinxCount: 0,
  metadata: {
    author: 'Phauks',
    repository: 'https://github.com/Phauks/Blood-on-the-Clocktower---Official-Data-Sync',
  },
};

const mockCharacters: Character[] = [
  {
    id: 'washerwoman',
    name: 'Washerwoman',
    team: 'townsfolk',
    ability: 'You start knowing that 1 of 2 players is a particular Townsfolk.',
    image: 'https://example.com/washerwoman.webp',
    setup: false,
    reminders: ['Townsfolk', 'Wrong'],
    edition: 'tb',
  },
  {
    id: 'librarian',
    name: 'Librarian',
    team: 'townsfolk',
    ability: 'You start knowing that 1 of 2 players is a particular Outsider.',
    image: 'https://example.com/librarian.webp',
    setup: false,
    reminders: ['Outsider', 'Wrong'],
    edition: 'tb',
  },
];

/**
 * Helper function to create a mock ZIP blob
 */
async function createMockZip(options: {
  includeManifest?: boolean;
  includeCharacters?: boolean;
  includeIcons?: boolean;
  manifest?: Partial<PackageManifest>;
  characters?: Character[];
}): Promise<Blob> {
  const zip = new JSZip();

  if (options.includeManifest !== false) {
    const manifest = { ...mockManifest, ...options.manifest };
    zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  }

  if (options.includeCharacters !== false) {
    const characters = options.characters || mockCharacters;
    zip.file('characters.json', JSON.stringify(characters, null, 2));
  }

  if (options.includeIcons !== false) {
    const iconsFolder = zip.folder('icons');
    if (iconsFolder) {
      // Create mock WebP blobs
      iconsFolder.file('washerwoman.webp', new Blob(['mock image data'], { type: 'image/webp' }));
      iconsFolder.file('librarian.webp', new Blob(['mock image data'], { type: 'image/webp' }));
    }
  }

  return await zip.generateAsync({ type: 'blob' });
}

describe('PackageExtractor', () => {
  let extractor: PackageExtractor;

  beforeEach(() => {
    extractor = new PackageExtractor();
  });

  describe('extract', () => {
    it('should extract valid package successfully', async () => {
      const zipBlob = await createMockZip({});
      const extracted = await extractor.extract(zipBlob);

      expect(extracted.manifest).toBeDefined();
      expect(extracted.manifest.version).toBe('v2025.12.03-r6');
      expect(extracted.characters).toHaveLength(2);
      expect(extracted.icons.size).toBe(2);
    });

    it('should throw error for missing manifest', async () => {
      const zipBlob = await createMockZip({ includeManifest: false });
      await expect(extractor.extract(zipBlob)).rejects.toThrow(PackageValidationError);
      await expect(extractor.extract(zipBlob)).rejects.toThrow(/manifest/i);
    });

    it('should throw error for missing characters.json', async () => {
      const zipBlob = await createMockZip({ includeCharacters: false });
      await expect(extractor.extract(zipBlob)).rejects.toThrow(PackageValidationError);
      await expect(extractor.extract(zipBlob)).rejects.toThrow(/characters\.json/i);
    });

    it('should throw error for missing icons folder', async () => {
      const zipBlob = await createMockZip({ includeIcons: false });
      await expect(extractor.extract(zipBlob)).rejects.toThrow(PackageValidationError);
      await expect(extractor.extract(zipBlob)).rejects.toThrow(/icons/i);
    });

    it('should validate character count matches manifest', async () => {
      const zipBlob = await createMockZip({
        manifest: { characterCount: 5 }, // Wrong count
      });

      await expect(extractor.extract(zipBlob)).rejects.toThrow(PackageValidationError);
      await expect(extractor.extract(zipBlob)).rejects.toThrow(/count mismatch/i);
    });

    it('should validate manifest required fields', async () => {
      // Create ZIP manually to avoid auto-filling from mockManifest
      const zip = new JSZip();
      const invalidManifest = {
        version: 'v2025.12.03-r6',
        // Missing other required fields like releaseDate, contentHash, etc.
      };
      zip.file('manifest.json', JSON.stringify(invalidManifest));
      zip.file('characters.json', JSON.stringify(mockCharacters));
      const iconsFolder = zip.folder('icons');
      if (iconsFolder) {
        iconsFolder.file('washerwoman.webp', new Blob(['mock'], { type: 'image/webp' }));
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });

      await expect(extractor.extract(zipBlob)).rejects.toThrow(PackageValidationError);
    });

    it('should validate version format', async () => {
      const zipBlob = await createMockZip({
        manifest: { version: 'invalid-version' },
      });

      await expect(extractor.extract(zipBlob)).rejects.toThrow(PackageValidationError);
      await expect(extractor.extract(zipBlob)).rejects.toThrow(/version format/i);
    });

    it('should validate schema version', async () => {
      const zipBlob = await createMockZip({
        manifest: { schemaVersion: 999 },
      });

      await expect(extractor.extract(zipBlob)).rejects.toThrow(PackageValidationError);
      await expect(extractor.extract(zipBlob)).rejects.toThrow(/schema version/i);
    });

    it('should validate character required fields', async () => {
      const invalidCharacters = [
        {
          // Missing required fields
          name: 'Invalid Character',
        },
      ] as Character[];

      const zipBlob = await createMockZip({
        characters: invalidCharacters,
        manifest: { characterCount: 1 },
      });

      await expect(extractor.extract(zipBlob)).rejects.toThrow(PackageValidationError);
      await expect(extractor.extract(zipBlob)).rejects.toThrow(/required field/i);
    });

    it('should validate character team values', async () => {
      const invalidCharacters = [
        {
          id: 'test',
          name: 'Test',
          team: 'invalid-team' as any,
          image: 'test.webp',
        },
      ];

      const zipBlob = await createMockZip({
        characters: invalidCharacters,
        manifest: { characterCount: 1 },
      });

      await expect(extractor.extract(zipBlob)).rejects.toThrow(PackageValidationError);
      await expect(extractor.extract(zipBlob)).rejects.toThrow(/team value/i);
    });

    it('should extract character icons correctly', async () => {
      const zipBlob = await createMockZip({});
      const extracted = await extractor.extract(zipBlob);

      expect(extracted.icons.has('washerwoman')).toBe(true);
      expect(extracted.icons.has('librarian')).toBe(true);

      const washerwomanIcon = extracted.icons.get('washerwoman');
      expect(washerwomanIcon).toBeInstanceOf(Blob);
    });
  });

  describe('verifyContentHash', () => {
    it('should verify matching content hash', async () => {
      const zipBlob = await createMockZip({});
      const extracted = await extractor.extract(zipBlob);

      // Compute the actual hash
      const charactersJson = JSON.stringify(extracted.characters);
      const encoder = new TextEncoder();
      const data = encoder.encode(charactersJson);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const computedHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      // Update manifest with correct hash
      extracted.manifest.contentHash = computedHash;

      const isValid = await extractor.verifyContentHash(extracted);
      expect(isValid).toBe(true);
    });

    it('should detect mismatched content hash', async () => {
      const zipBlob = await createMockZip({});
      const extracted = await extractor.extract(zipBlob);

      // Manifest has wrong hash (abc123def456)
      const isValid = await extractor.verifyContentHash(extracted);
      expect(isValid).toBe(false);
    });
  });

  describe('getPackageStats', () => {
    it('should return accurate package statistics', async () => {
      const zipBlob = await createMockZip({});
      const extracted = await extractor.extract(zipBlob);

      const stats = extractor.getPackageStats(extracted);

      expect(stats.characterCount).toBe(2);
      expect(stats.iconCount).toBe(2);
      expect(stats.version).toBe('v2025.12.03-r6');
      expect(stats.totalIconSizeBytes).toBeGreaterThan(0);
      expect(stats.totalIconSizeMB).toBeGreaterThan(0);
    });
  });

  describe('validateStructure', () => {
    it('should validate correct structure', async () => {
      const zipBlob = await createMockZip({});
      const isValid = await extractor.validateStructure(zipBlob);
      expect(isValid).toBe(true);
    });

    it('should reject invalid structure', async () => {
      const zipBlob = await createMockZip({ includeManifest: false });
      const isValid = await extractor.validateStructure(zipBlob);
      expect(isValid).toBe(false);
    });

    it('should reject structure missing characters.json', async () => {
      const zipBlob = await createMockZip({ includeCharacters: false });
      const isValid = await extractor.validateStructure(zipBlob);
      expect(isValid).toBe(false);
    });

    it('should reject structure missing icons folder', async () => {
      const zipBlob = await createMockZip({ includeIcons: false });
      const isValid = await extractor.validateStructure(zipBlob);
      expect(isValid).toBe(false);
    });

    it('should handle invalid ZIP files', async () => {
      const invalidBlob = new Blob(['not a zip file'], { type: 'application/zip' });
      const isValid = await extractor.validateStructure(invalidBlob);
      expect(isValid).toBe(false);
    });
  });
});
