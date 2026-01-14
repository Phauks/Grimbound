/**
 * Unit tests for ProjectImporter
 *
 * Tests cover:
 * - importFromZip with valid ZIP packages
 * - validateZip with size checks and structure validation
 * - previewZip for previewing without import
 * - Version compatibility checking
 * - Custom icon loading
 * - Error handling
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectImporter } from '@/ts/services/project/ProjectImporter';
import type { CustomIconMetadata, Project, ProjectManifest } from '@/ts/types/project.js';

// ============================================================================
// Mock JSZip
// ============================================================================

const mockZipFiles: Record<string, { async: (type: string) => Promise<string | Blob> }> = {};
const mockLoadAsync = vi.fn();

vi.mock('jszip', () => ({
  default: {
    loadAsync: (...args: unknown[]) => mockLoadAsync(...args),
  },
}));

// Mock CONFIG (needs both named export and default export)
vi.mock('@/ts/config.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/ts/config.js')>();
  const CONFIG = {
    ...original.CONFIG,
    VERSION: '0.3.0',
  };
  return {
    ...original,
    CONFIG,
    default: CONFIG,
  };
});

// Mock generateUuid
vi.mock('@/ts/utils/nameGenerator.js', () => ({
  generateUuid: vi.fn().mockReturnValue('new-uuid-123'),
}));

// Mock FileReader class
class MockFileReader {
  result: string | ArrayBuffer | null = 'data:image/png;base64,mockdata';
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readAsDataURL(_blob: Blob): void {
    // Synchronously trigger onload after a microtask to ensure the listener is set
    Promise.resolve().then(() => {
      if (this.onload) {
        this.onload();
      }
    });
  }
}

// Helper function to check if any string in array contains substring
const arrayContainsString = (arr: string[], substring: string): boolean =>
  arr.some((item) => item.includes(substring));

// ============================================================================
// Test Helpers
// ============================================================================

const createMockManifest = (overrides: Partial<ProjectManifest> = {}): ProjectManifest => ({
  format: 'blood-on-the-clocktower-project-package',
  formatVersion: '1.0.0',
  generator: 'BotC Token Generator',
  generatorVersion: '0.2.0',
  generatorUrl: 'http://localhost:3000',
  exportedAt: new Date().toISOString(),
  files: {
    projectData: 'project.json',
    thumbnail: 'thumbnail.png',
    customIcons: [],
  },
  stats: {
    totalSizeBytes: 1024,
    uncompressedBytes: 2048,
    compressionRatio: 0.5,
    iconCount: 0,
    characterCount: 5,
  },
  compatibility: {
    minGeneratorVersion: '0.2.0',
    schemaVersion: 1,
  },
  ...overrides,
});

const createMockProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'project-123',
  name: 'Test Project',
  description: 'A test project',
  schemaVersion: 1,
  createdAt: Date.now(),
  lastModifiedAt: Date.now(),
  lastAccessedAt: Date.now(),
  state: {
    characters: [],
    options: {} as Project['state']['options'],
    scriptMeta: { name: 'Test Script', author: 'Test Author' },
    scriptJson: '[]',
    customIcons: [],
  },
  stats: {
    characterCount: 5,
    tokenCount: 10,
    reminderCount: 15,
    customIconCount: 0,
    hasLogo: false,
  },
  tags: ['test'],
  thumbnail: { type: 'none' },
  ...overrides,
});

const createMockIconMetadata = (
  overrides: Partial<CustomIconMetadata> = {}
): CustomIconMetadata => ({
  id: 'icon-123',
  filename: 'custom-icon.png',
  mimeType: 'image/png',
  originalFilename: 'custom-icon.png',
  characterId: 'washerwoman',
  assetType: 'character',
  ...overrides,
});

const createMockFile = (
  name: string,
  size: number,
  content: ArrayBuffer = new ArrayBuffer(size)
): File => new File([content], name, { type: 'application/zip' });

const setupMockZipFiles = (files: Record<string, unknown>) => {
  // Clear existing files
  for (const key of Object.keys(mockZipFiles)) {
    delete mockZipFiles[key];
  }

  // Add new files
  for (const [filename, content] of Object.entries(files)) {
    mockZipFiles[filename] = {
      async: vi.fn().mockImplementation((type: string) => {
        if (type === 'text') {
          return Promise.resolve(typeof content === 'string' ? content : JSON.stringify(content));
        }
        if (type === 'blob') {
          return Promise.resolve(new Blob([JSON.stringify(content)], { type: 'image/png' }));
        }
        return Promise.resolve(content);
      }),
    };
  }

  mockLoadAsync.mockResolvedValue({
    files: mockZipFiles,
  });
};

// ============================================================================
// Tests
// ============================================================================

describe('ProjectImporter', () => {
  let importer: ProjectImporter;

  beforeEach(() => {
    vi.clearAllMocks();

    // Stub FileReader globally
    vi.stubGlobal('FileReader', MockFileReader);

    importer = new ProjectImporter();

    // Default valid ZIP setup
    setupMockZipFiles({
      'manifest.json': createMockManifest(),
      'project.json': createMockProject(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // --------------------------------------------------------------------------
  // validateZip
  // --------------------------------------------------------------------------

  describe('validateZip', () => {
    it('should return valid for a proper ZIP', async () => {
      const file = createMockFile('test.zip', 1024);

      const result = await importer.validateZip(file);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject file exceeding max size', async () => {
      const file = createMockFile('large.zip', 51 * 1024 * 1024); // 51MB

      const result = await importer.validateZip(file);

      expect(result.valid).toBe(false);
      expect(arrayContainsString(result.errors, 'exceeds maximum allowed')).toBe(true);
    });

    it('should warn for large files under max', async () => {
      const file = createMockFile('medium.zip', 15 * 1024 * 1024); // 15MB

      const result = await importer.validateZip(file);

      expect(result.valid).toBe(true);
      expect(arrayContainsString(result.warnings, 'quite large')).toBe(true);
    });

    it('should warn for non-.zip extension', async () => {
      const file = createMockFile('package.tar', 1024);

      const result = await importer.validateZip(file);

      expect(arrayContainsString(result.warnings, 'does not have .zip extension')).toBe(true);
    });

    it('should fail if ZIP cannot be parsed', async () => {
      mockLoadAsync.mockRejectedValue(new Error('Not a valid ZIP'));
      const file = createMockFile('invalid.zip', 1024);

      const result = await importer.validateZip(file);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File is not a valid ZIP archive');
    });

    it('should fail if manifest.json is missing', async () => {
      setupMockZipFiles({
        'project.json': createMockProject(),
      });
      const file = createMockFile('test.zip', 1024);

      const result = await importer.validateZip(file);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required file: manifest.json');
    });

    it('should fail if project.json is missing', async () => {
      setupMockZipFiles({
        'manifest.json': createMockManifest(),
      });
      const file = createMockFile('test.zip', 1024);

      const result = await importer.validateZip(file);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required file: project.json');
    });

    it('should fail for invalid package format', async () => {
      setupMockZipFiles({
        'manifest.json': createMockManifest({
          format: 'wrong-format' as 'blood-on-the-clocktower-project-package',
        }),
        'project.json': createMockProject(),
      });
      const file = createMockFile('test.zip', 1024);

      const result = await importer.validateZip(file);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid package format');
    });

    it('should warn if generator version is higher than current', async () => {
      setupMockZipFiles({
        'manifest.json': createMockManifest({
          compatibility: {
            minGeneratorVersion: '99.0.0',
            schemaVersion: 1,
          },
        }),
        'project.json': createMockProject(),
      });
      const file = createMockFile('test.zip', 1024);

      const result = await importer.validateZip(file);

      expect(arrayContainsString(result.warnings, 'requires generator version 99.0.0')).toBe(true);
    });

    it('should fail for invalid manifest.json', async () => {
      mockZipFiles['manifest.json'] = {
        async: vi.fn().mockResolvedValue('not valid json'),
      };
      mockZipFiles['project.json'] = {
        async: vi.fn().mockResolvedValue(JSON.stringify(createMockProject())),
      };
      mockLoadAsync.mockResolvedValue({ files: mockZipFiles });

      const file = createMockFile('test.zip', 1024);

      const result = await importer.validateZip(file);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('manifest.json is not valid JSON');
    });

    it('should fail for invalid project.json', async () => {
      mockZipFiles['manifest.json'] = {
        async: vi.fn().mockResolvedValue(JSON.stringify(createMockManifest())),
      };
      mockZipFiles['project.json'] = {
        async: vi.fn().mockResolvedValue('not valid json'),
      };
      mockLoadAsync.mockResolvedValue({ files: mockZipFiles });

      const file = createMockFile('test.zip', 1024);

      const result = await importer.validateZip(file);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('project.json is not valid JSON');
    });
  });

  // --------------------------------------------------------------------------
  // importFromZip
  // --------------------------------------------------------------------------

  describe('importFromZip', () => {
    it('should import a valid ZIP file', async () => {
      const file = createMockFile('test.zip', 1024);

      const result = await importer.importFromZip(file);

      expect(result).toBeDefined();
      expect(result.id).toBe('new-uuid-123'); // Generated UUID
      expect(result.name).toBe('Test Project');
    });

    it('should generate new timestamps for imported project', async () => {
      const file = createMockFile('test.zip', 1024);
      const before = Date.now();

      const result = await importer.importFromZip(file);

      const after = Date.now();
      expect(result.createdAt).toBeGreaterThanOrEqual(before);
      expect(result.createdAt).toBeLessThanOrEqual(after);
      expect(result.lastModifiedAt).toBeGreaterThanOrEqual(before);
      expect(result.lastAccessedAt).toBeGreaterThanOrEqual(before);
    });

    it('should throw for invalid ZIP', async () => {
      mockLoadAsync.mockRejectedValue(new Error('Invalid ZIP'));
      const file = createMockFile('invalid.zip', 1024);

      await expect(importer.importFromZip(file)).rejects.toThrow('Invalid ZIP file');
    });

    it('should throw for incompatible version', async () => {
      setupMockZipFiles({
        'manifest.json': createMockManifest({
          compatibility: {
            minGeneratorVersion: '99.0.0',
            schemaVersion: 1,
          },
        }),
        'project.json': createMockProject(),
      });
      const file = createMockFile('test.zip', 1024);

      await expect(importer.importFromZip(file)).rejects.toThrow(
        'requires generator version 99.0.0'
      );
    });

    it('should load custom icons from ZIP', async () => {
      const iconMetadata = createMockIconMetadata();
      setupMockZipFiles({
        'manifest.json': createMockManifest(),
        'project.json': createMockProject({
          state: {
            ...createMockProject().state,
            customIcons: [iconMetadata],
          },
        }),
        'icons/custom-icon.png': new Blob(['icon-data'], { type: 'image/png' }),
      });

      // FileReader is already stubbed globally in beforeEach

      const file = createMockFile('test.zip', 1024);

      const result = await importer.importFromZip(file);

      expect(result.state.customIcons).toHaveLength(1);
      expect(result.state.customIcons[0].dataUrl).toBe('data:image/png;base64,mockdata');
      expect(result.state.customIcons[0].storedInIndexedDB).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // previewZip
  // --------------------------------------------------------------------------

  describe('previewZip', () => {
    it('should return preview data', async () => {
      const file = createMockFile('test.zip', 1024);

      const result = await importer.previewZip(file);

      expect(result.name).toBe('Test Project');
      expect(result.characterCount).toBe(5);
      expect(result.estimatedSizeBytes).toBe(1024);
    });

    it('should include thumbnail if available', async () => {
      setupMockZipFiles({
        'manifest.json': createMockManifest({
          files: {
            projectData: 'project.json',
            thumbnail: 'thumbnail.png',
            customIcons: [],
          },
        }),
        'project.json': createMockProject(),
        'thumbnail.png': new Blob(['thumbnail-data'], { type: 'image/png' }),
      });

      // FileReader is already stubbed globally in beforeEach

      const file = createMockFile('test.zip', 1024);

      const result = await importer.previewZip(file);

      expect(result.thumbnailDataUrl).toBe('data:image/png;base64,mockdata');
    });

    it('should include tags', async () => {
      setupMockZipFiles({
        'manifest.json': createMockManifest(),
        'project.json': createMockProject({ tags: ['custom', 'script'] }),
      });
      const file = createMockFile('test.zip', 1024);

      const result = await importer.previewZip(file);

      expect(result.tags).toEqual(['custom', 'script']);
    });

    it('should include manifest', async () => {
      const file = createMockFile('test.zip', 1024);

      const result = await importer.previewZip(file);

      expect(result.manifest).toBeDefined();
      expect(result.manifest.format).toBe('blood-on-the-clocktower-project-package');
    });
  });

  // --------------------------------------------------------------------------
  // Version Comparison
  // --------------------------------------------------------------------------

  describe('Version Comparison', () => {
    // Access private method via prototype for testing
    const compareVersions = (v1: string, v2: string): number =>
      (
        importer as unknown as { compareVersions: (v1: string, v2: string) => number }
      ).compareVersions(v1, v2);

    it('should return 0 for equal versions', () => {
      expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
      expect(compareVersions('0.2.0', '0.2.0')).toBe(0);
    });

    it('should return -1 when first version is lower', () => {
      expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
      expect(compareVersions('0.1.0', '0.2.0')).toBe(-1);
      expect(compareVersions('0.0.1', '0.0.2')).toBe(-1);
    });

    it('should return 1 when first version is higher', () => {
      expect(compareVersions('2.0.0', '1.0.0')).toBe(1);
      expect(compareVersions('0.2.0', '0.1.0')).toBe(1);
      expect(compareVersions('0.0.2', '0.0.1')).toBe(1);
    });

    it('should handle versions with different part counts', () => {
      expect(compareVersions('1.0', '1.0.0')).toBe(0);
      expect(compareVersions('1.0.0', '1.0')).toBe(0);
      expect(compareVersions('1', '1.0.0')).toBe(0);
      expect(compareVersions('1.1', '1.0.1')).toBe(1);
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases
  // --------------------------------------------------------------------------

  describe('Edge Cases', () => {
    it('should handle missing customIcons in project state', async () => {
      const projectWithoutIcons = createMockProject();
      projectWithoutIcons.state.customIcons = [];

      setupMockZipFiles({
        'manifest.json': createMockManifest(),
        'project.json': projectWithoutIcons,
      });
      const file = createMockFile('test.zip', 1024);

      const result = await importer.importFromZip(file);

      expect(result.state.customIcons).toEqual([]);
    });

    it('should handle missing icon file in ZIP', async () => {
      const iconMetadata = createMockIconMetadata();
      setupMockZipFiles({
        'manifest.json': createMockManifest(),
        'project.json': createMockProject({
          state: {
            ...createMockProject().state,
            customIcons: [iconMetadata],
          },
        }),
        // Note: icons/custom-icon.png is missing
      });
      const file = createMockFile('test.zip', 1024);

      const result = await importer.importFromZip(file);

      // Icon should be skipped if not found
      expect(result.state.customIcons).toHaveLength(0);
    });

    it('should handle no thumbnail in manifest', async () => {
      setupMockZipFiles({
        'manifest.json': createMockManifest({
          files: {
            projectData: 'project.json',
            thumbnail: undefined,
            customIcons: [],
          },
        }),
        'project.json': createMockProject(),
      });
      const file = createMockFile('test.zip', 1024);

      const result = await importer.previewZip(file);

      expect(result.thumbnailDataUrl).toBeUndefined();
    });

    it('should handle no minGeneratorVersion in compatibility', async () => {
      setupMockZipFiles({
        'manifest.json': createMockManifest({
          compatibility: {
            minGeneratorVersion: undefined as unknown as string,
            schemaVersion: 1,
          },
        }),
        'project.json': createMockProject(),
      });
      const file = createMockFile('test.zip', 1024);

      // Should not throw
      const result = await importer.importFromZip(file);
      expect(result).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // Error Handling
  // --------------------------------------------------------------------------

  describe('Error Handling', () => {
    it('should handle JSZip load failure gracefully', async () => {
      mockLoadAsync.mockRejectedValue(new Error('Corrupt ZIP'));
      const file = createMockFile('corrupt.zip', 1024);

      const validation = await importer.validateZip(file);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('File is not a valid ZIP archive');
    });

    it('should handle missing manifest in extractManifest', async () => {
      mockLoadAsync.mockResolvedValue({
        files: {
          'project.json': {
            async: vi.fn().mockResolvedValue(JSON.stringify(createMockProject())),
          },
        },
      });
      const file = createMockFile('test.zip', 1024);

      await expect(importer.importFromZip(file)).rejects.toThrow('Invalid ZIP file');
    });
  });

  // --------------------------------------------------------------------------
  // Byte Formatting (Private Method via Integration Test)
  // --------------------------------------------------------------------------

  describe('Byte Formatting', () => {
    it('should format bytes correctly in error messages', async () => {
      const file = createMockFile('huge.zip', 60 * 1024 * 1024); // 60MB

      const result = await importer.validateZip(file);

      expect(result.errors[0]).toContain('60.0 MB');
      expect(result.errors[0]).toContain('50.0 MB');
    });

    it('should format KB correctly', async () => {
      const file = createMockFile('medium.zip', 12 * 1024 * 1024); // 12MB (warning threshold)

      const result = await importer.validateZip(file);

      expect(result.warnings[0]).toContain('12.0 MB');
    });
  });
});
