/**
 * Unit tests for ProjectExporter
 *
 * Tests cover:
 * - exportAsZip creates proper ZIP structure
 * - exportAndDownload triggers download
 * - generateFilename sanitizes names
 * - Asset inclusion/exclusion options
 * - Thumbnail handling
 * - Streaming mode for large projects
 * - Error handling
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectExporter } from '@/ts/services/project/ProjectExporter';
import type { IAssetStorageService } from '@/ts/services/upload/IUploadServices';
import type { DBAsset, ExportableAsset } from '@/ts/services/upload/types';
import type { Project } from '@/ts/types/project';

// Mock JSZip
const mockZipFile = vi.fn();
const mockZipFolder = vi.fn();
const mockZipGenerateAsync = vi
  .fn()
  .mockResolvedValue(new Blob(['zip'], { type: 'application/zip' }));

vi.mock('jszip', () => ({
  default: class MockJSZip {
    file(...args: unknown[]) {
      return mockZipFile(...args);
    }
    folder(name: string) {
      mockZipFolder(name);
      return {
        file: mockZipFile,
      };
    }
    generateAsync(...args: unknown[]) {
      return mockZipGenerateAsync(...args);
    }
  },
}));

// Mock downloadFile
vi.mock('@/ts/utils/imageUtils', () => ({
  downloadFile: vi.fn(),
}));

import { downloadFile } from '@/ts/utils/imageUtils';

// ============================================================================
// Test Helpers
// ============================================================================

const createMockBlob = (type: string = 'image/png'): Blob => new Blob(['test content'], { type });

const createMockDBAsset = (overrides: Partial<DBAsset> = {}): DBAsset => ({
  id: 'asset-123',
  type: 'character-icon',
  projectId: 'project-456',
  blob: createMockBlob(),
  thumbnail: createMockBlob(),
  metadata: {
    filename: 'washerwoman.png',
    mimeType: 'image/png',
    size: 1024,
    width: 256,
    height: 256,
    uploadedAt: Date.now(),
    sourceType: 'upload',
  },
  linkedTo: ['washerwoman'],
  usageCount: 1,
  ...overrides,
});

const createMockProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'project-456',
  name: 'Test Script',
  schemaVersion: 1,
  createdAt: Date.now(),
  updatedAt: Date.now(),
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
    hasLogo: false,
  },
  thumbnail: {
    type: 'auto',
    auto: { dataUrl: 'data:image/png;base64,abc123', generatedAt: Date.now() },
  },
  ...overrides,
});

const createMockAssetStorage = (): IAssetStorageService => ({
  save: vi.fn(),
  getById: vi.fn(),
  getByIdWithUrl: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  bulkDelete: vi.fn(),
  bulkUpdate: vi.fn(),
  list: vi.fn().mockResolvedValue([]),
  count: vi.fn().mockResolvedValue(0),
  listWithUrls: vi.fn(),
  getByType: vi.fn(),
  findByHash: vi.fn(),
  getByProject: vi.fn(),
  getGlobal: vi.fn(),
  getOrphaned: vi.fn(),
  getByCharacter: vi.fn(),
  linkToCharacter: vi.fn(),
  unlinkFromCharacter: vi.fn(),
  replaceCharacterLink: vi.fn(),
  trackAssetUsage: vi.fn(),
  promoteToGlobal: vi.fn(),
  moveToProject: vi.fn(),
  bulkPromoteToGlobal: vi.fn(),
  bulkMoveToProject: vi.fn(),
  getAssetUrl: vi.fn(),
  getAssetUrlTracked: vi.fn(),
  getThumbnailUrl: vi.fn(),
  getThumbnailUrlTracked: vi.fn(),
  releaseUrl: vi.fn(),
  revokeUrl: vi.fn(),
  revokeAllUrls: vi.fn(),
  getUrlCacheStats: vi.fn(),
  clearUrlCache: vi.fn(),
  getExportableAssets: vi.fn(),
  streamExportableAssets: vi.fn(),
  getStats: vi.fn(),
  cleanupOrphans: vi.fn(),
  deleteProjectAssets: vi.fn(),
});

// ============================================================================
// Tests
// ============================================================================

describe('ProjectExporter', () => {
  let exporter: ProjectExporter;
  let mockAssetStorage: IAssetStorageService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockZipFile.mockClear();
    mockZipFolder.mockClear();
    mockZipGenerateAsync.mockClear();
    mockZipGenerateAsync.mockResolvedValue(new Blob(['zip'], { type: 'application/zip' }));

    mockAssetStorage = createMockAssetStorage();
    exporter = new ProjectExporter({ assetStorage: mockAssetStorage });

    // Mock fetch for data URL to blob conversion
    global.fetch = vi.fn().mockResolvedValue({
      blob: () => Promise.resolve(createMockBlob('image/png')),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // Constructor
  // --------------------------------------------------------------------------

  describe('Constructor', () => {
    it('should create instance with injected dependencies', () => {
      expect(exporter).toBeInstanceOf(ProjectExporter);
    });

    it('should create instance with default dependencies', () => {
      const defaultExporter = new ProjectExporter();
      expect(defaultExporter).toBeInstanceOf(ProjectExporter);
    });
  });

  // --------------------------------------------------------------------------
  // exportAsZip
  // --------------------------------------------------------------------------

  describe('exportAsZip', () => {
    it('should create a ZIP blob', async () => {
      const project = createMockProject();

      const result = await exporter.exportAsZip(project);

      expect(result).toBeInstanceOf(Blob);
    });

    it('should add project.json to ZIP', async () => {
      const project = createMockProject();

      await exporter.exportAsZip(project);

      expect(mockZipFile).toHaveBeenCalledWith(
        'project.json',
        expect.stringContaining('"id": "project-456"')
      );
    });

    it('should add manifest.json to ZIP', async () => {
      const project = createMockProject();

      await exporter.exportAsZip(project);

      expect(mockZipFile).toHaveBeenCalledWith(
        'manifest.json',
        expect.stringContaining('"format": "blood-on-the-clocktower-project-package"')
      );
    });

    it('should add thumbnail when available', async () => {
      const project = createMockProject({
        thumbnail: {
          type: 'auto',
          auto: { dataUrl: 'data:image/png;base64,abc123', generatedAt: Date.now() },
        },
      });

      await exporter.exportAsZip(project);

      expect(mockZipFile).toHaveBeenCalledWith('thumbnail.png', expect.any(Blob));
    });

    it('should skip thumbnail when type is none', async () => {
      const project = createMockProject({
        thumbnail: { type: 'none' },
      });

      await exporter.exportAsZip(project);

      const thumbnailCalls = mockZipFile.mock.calls.filter((call: [string, unknown]) =>
        call[0].startsWith('thumbnail')
      );
      expect(thumbnailCalls).toHaveLength(0);
    });

    it('should skip thumbnail when includeThumbnail is false', async () => {
      const project = createMockProject();

      await exporter.exportAsZip(project, { includeThumbnail: false });

      const thumbnailCalls = mockZipFile.mock.calls.filter((call: [string, unknown]) =>
        call[0].startsWith('thumbnail')
      );
      expect(thumbnailCalls).toHaveLength(0);
    });

    it('should create assets folder when includeAssets is true', async () => {
      const project = createMockProject();
      const assets = [createMockDBAsset()];
      vi.mocked(mockAssetStorage.list).mockResolvedValue(assets);
      vi.mocked(mockAssetStorage.count).mockResolvedValue(1);

      await exporter.exportAsZip(project, { includeAssets: true });

      expect(mockZipFolder).toHaveBeenCalledWith('assets');
    });

    it('should add assets to ZIP', async () => {
      const project = createMockProject();
      const assets = [
        createMockDBAsset({
          id: 'asset-1',
          metadata: { ...createMockDBAsset().metadata, filename: 'icon1.png' },
        }),
        createMockDBAsset({
          id: 'asset-2',
          metadata: { ...createMockDBAsset().metadata, filename: 'icon2.png' },
        }),
      ];
      vi.mocked(mockAssetStorage.list).mockResolvedValue(assets);
      vi.mocked(mockAssetStorage.count).mockResolvedValue(2);

      await exporter.exportAsZip(project, { includeAssets: true });

      expect(mockZipFile).toHaveBeenCalledWith('icon1.png', expect.any(Blob));
      expect(mockZipFile).toHaveBeenCalledWith('icon2.png', expect.any(Blob));
    });

    it('should filter unused assets when includeUnusedAssets is false', async () => {
      const project = createMockProject();
      const usedAsset = createMockDBAsset({ id: 'used', usageCount: 5 });
      const unusedAsset = createMockDBAsset({ id: 'unused', usageCount: 0 });
      vi.mocked(mockAssetStorage.list).mockResolvedValue([usedAsset, unusedAsset]);
      vi.mocked(mockAssetStorage.count).mockResolvedValue(2);

      await exporter.exportAsZip(project, { includeAssets: true, includeUnusedAssets: false });

      // Only the used asset should be added
      const assetFileCalls = mockZipFile.mock.calls.filter(
        (call: [string, unknown]) => call[0] === usedAsset.metadata.filename
      );
      expect(assetFileCalls).toHaveLength(1);
    });

    it('should skip assets when includeAssets is false', async () => {
      const project = createMockProject();
      const assets = [createMockDBAsset()];
      vi.mocked(mockAssetStorage.list).mockResolvedValue(assets);

      await exporter.exportAsZip(project, { includeAssets: false });

      expect(mockZipFolder).not.toHaveBeenCalledWith('assets');
    });

    it('should generate ZIP with compression', async () => {
      const project = createMockProject();

      await exporter.exportAsZip(project);

      expect(mockZipGenerateAsync).toHaveBeenCalledWith({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });
    });

    it('should convert assets to customIcons in project.json', async () => {
      const project = createMockProject();
      const assets = [createMockDBAsset({ linkedTo: ['washerwoman'] })];
      vi.mocked(mockAssetStorage.list).mockResolvedValue(assets);
      vi.mocked(mockAssetStorage.count).mockResolvedValue(1);

      await exporter.exportAsZip(project);

      const projectJsonCall = mockZipFile.mock.calls.find(
        (call: [string, unknown]) => call[0] === 'project.json'
      );
      expect(projectJsonCall).toBeDefined();
      const projectData = JSON.parse(projectJsonCall?.[1] as string);
      expect(projectData.state.customIcons).toHaveLength(1);
      expect(projectData.state.customIcons[0].characterId).toBe('washerwoman');
    });
  });

  // --------------------------------------------------------------------------
  // Streaming Mode
  // --------------------------------------------------------------------------

  describe('Streaming Mode', () => {
    it('should use streaming for 50+ assets', async () => {
      const project = createMockProject();
      vi.mocked(mockAssetStorage.count).mockResolvedValue(60);

      // Mock streaming generator
      async function* mockGenerator(): AsyncGenerator<ExportableAsset, void, undefined> {
        yield {
          id: '1',
          type: 'character-icon',
          filename: 'icon1.png',
          blob: createMockBlob(),
          metadata: createMockDBAsset().metadata,
        };
        yield {
          id: '2',
          type: 'character-icon',
          filename: 'icon2.png',
          blob: createMockBlob(),
          metadata: createMockDBAsset().metadata,
        };
      }
      vi.mocked(mockAssetStorage.streamExportableAssets).mockReturnValue(mockGenerator());

      await exporter.exportAsZip(project, { includeAssets: true });

      expect(mockAssetStorage.streamExportableAssets).toHaveBeenCalledWith(project.id, true);
    });

    it('should not use streaming for fewer than 50 assets', async () => {
      const project = createMockProject();
      const assets = [createMockDBAsset()];
      vi.mocked(mockAssetStorage.list).mockResolvedValue(assets);
      vi.mocked(mockAssetStorage.count).mockResolvedValue(10);

      await exporter.exportAsZip(project, { includeAssets: true });

      expect(mockAssetStorage.streamExportableAssets).not.toHaveBeenCalled();
      expect(mockAssetStorage.list).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // exportAndDownload
  // --------------------------------------------------------------------------

  describe('exportAndDownload', () => {
    it('should export and trigger download', async () => {
      const project = createMockProject({ name: 'My Script' });

      await exporter.exportAndDownload(project);

      expect(downloadFile).toHaveBeenCalledWith(
        expect.any(Blob),
        expect.stringMatching(/^My_Script_\d+\.zip$/)
      );
    });

    it('should pass options to exportAsZip', async () => {
      const project = createMockProject();

      await exporter.exportAndDownload(project, { includeAssets: false });

      // Verify assets were not included
      expect(mockZipFolder).not.toHaveBeenCalledWith('assets');
    });
  });

  // --------------------------------------------------------------------------
  // generateFilename
  // --------------------------------------------------------------------------

  describe('generateFilename', () => {
    it('should sanitize project name', () => {
      // sanitizeFilename skips invalid chars (: /) and replaces spaces with underscores
      // 'My Script: Test/Version' -> 'My_Script_TestVersion'
      const filename = exporter.generateFilename('My Script: Test/Version');

      expect(filename).toMatch(/^My_Script_TestVersion_\d+\.zip$/);
    });

    it('should include timestamp', () => {
      const before = Date.now();
      const filename = exporter.generateFilename('Test');
      const after = Date.now();

      const match = filename.match(/_(\d+)\.zip$/);
      expect(match).not.toBeNull();
      const timestamp = parseInt(match?.[1], 10);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });

    it('should end with .zip extension', () => {
      const filename = exporter.generateFilename('Test');

      expect(filename).toMatch(/\.zip$/);
    });
  });

  // --------------------------------------------------------------------------
  // Thumbnail Types
  // --------------------------------------------------------------------------

  describe('Thumbnail Types', () => {
    it('should handle token thumbnail type', async () => {
      const project = createMockProject({
        thumbnail: {
          type: 'token',
          token: { dataUrl: 'data:image/png;base64,token123', characterId: 'washerwoman' },
        },
      });

      await exporter.exportAsZip(project);

      expect(mockZipFile).toHaveBeenCalledWith('thumbnail.png', expect.any(Blob));
    });

    it('should handle script-logo thumbnail type', async () => {
      const project = createMockProject({
        thumbnail: {
          type: 'script-logo',
          scriptLogo: { dataUrl: 'data:image/png;base64,logo123' },
        },
      });

      await exporter.exportAsZip(project);

      expect(mockZipFile).toHaveBeenCalledWith('thumbnail.png', expect.any(Blob));
    });

    it('should handle custom thumbnail type', async () => {
      const project = createMockProject({
        thumbnail: {
          type: 'custom',
          custom: { dataUrl: 'data:image/png;base64,custom123', uploadedAt: Date.now() },
        },
      });

      await exporter.exportAsZip(project);

      expect(mockZipFile).toHaveBeenCalledWith('thumbnail.png', expect.any(Blob));
    });
  });

  // --------------------------------------------------------------------------
  // Manifest Generation
  // --------------------------------------------------------------------------

  describe('Manifest Generation', () => {
    it('should include format and version', async () => {
      const project = createMockProject();

      await exporter.exportAsZip(project);

      const manifestCall = mockZipFile.mock.calls.find(
        (call: [string, unknown]) => call[0] === 'manifest.json'
      );
      const manifest = JSON.parse(manifestCall?.[1] as string);
      expect(manifest.format).toBe('blood-on-the-clocktower-project-package');
      expect(manifest.formatVersion).toBe('1.0.0');
    });

    it('should include generator info', async () => {
      const project = createMockProject();

      await exporter.exportAsZip(project);

      const manifestCall = mockZipFile.mock.calls.find(
        (call: [string, unknown]) => call[0] === 'manifest.json'
      );
      const manifest = JSON.parse(manifestCall?.[1] as string);
      expect(manifest.generator).toBe('BotC Token Generator');
      expect(manifest.generatorVersion).toBeDefined();
    });

    it('should include export timestamp', async () => {
      const project = createMockProject();

      await exporter.exportAsZip(project);

      const manifestCall = mockZipFile.mock.calls.find(
        (call: [string, unknown]) => call[0] === 'manifest.json'
      );
      const manifest = JSON.parse(manifestCall?.[1] as string);
      expect(manifest.exportedAt).toBeDefined();
      expect(new Date(manifest.exportedAt).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should include file list', async () => {
      const project = createMockProject();
      const assets = [createMockDBAsset()];
      vi.mocked(mockAssetStorage.list).mockResolvedValue(assets);
      vi.mocked(mockAssetStorage.count).mockResolvedValue(1);

      await exporter.exportAsZip(project);

      const manifestCall = mockZipFile.mock.calls.find(
        (call: [string, unknown]) => call[0] === 'manifest.json'
      );
      const manifest = JSON.parse(manifestCall?.[1] as string);
      expect(manifest.files.projectData).toBe('project.json');
      expect(manifest.files.thumbnail).toBe('thumbnail.png');
      expect(manifest.files.customIcons).toContain('assets/washerwoman.png');
    });

    it('should include stats', async () => {
      const project = createMockProject({
        stats: { characterCount: 15, tokenCount: 30, reminderCount: 45, hasLogo: true },
      });

      await exporter.exportAsZip(project);

      const manifestCall = mockZipFile.mock.calls.find(
        (call: [string, unknown]) => call[0] === 'manifest.json'
      );
      const manifest = JSON.parse(manifestCall?.[1] as string);
      expect(manifest.stats.characterCount).toBe(15);
    });
  });

  // --------------------------------------------------------------------------
  // Error Handling
  // --------------------------------------------------------------------------

  describe('Error Handling', () => {
    it('should handle asset fetch errors gracefully', async () => {
      const project = createMockProject();
      vi.mocked(mockAssetStorage.list).mockRejectedValue(new Error('Database error'));
      vi.mocked(mockAssetStorage.count).mockResolvedValue(1);

      // Should not throw
      const result = await exporter.exportAsZip(project);

      expect(result).toBeInstanceOf(Blob);
    });

    it('should handle thumbnail conversion errors gracefully', async () => {
      const project = createMockProject({
        thumbnail: {
          type: 'auto',
          auto: { dataUrl: 'invalid-data-url', generatedAt: Date.now() },
        },
      });
      vi.mocked(fetch).mockRejectedValue(new Error('Invalid data URL'));

      // Should not throw
      const result = await exporter.exportAsZip(project);

      expect(result).toBeInstanceOf(Blob);
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases
  // --------------------------------------------------------------------------

  describe('Edge Cases', () => {
    it('should handle project with no assets', async () => {
      const project = createMockProject();
      vi.mocked(mockAssetStorage.list).mockResolvedValue([]);
      vi.mocked(mockAssetStorage.count).mockResolvedValue(0);

      const result = await exporter.exportAsZip(project);

      expect(result).toBeInstanceOf(Blob);
      expect(mockZipFolder).not.toHaveBeenCalledWith('assets');
    });

    it('should handle project with empty name', () => {
      // sanitizeFilename returns 'unnamed' as fallback for empty strings
      const filename = exporter.generateFilename('');

      expect(filename).toMatch(/^unnamed_\d+\.zip$/);
    });

    it('should handle asset with missing linkedTo', async () => {
      const project = createMockProject();
      const assetWithoutLink = createMockDBAsset({ linkedTo: [] });
      vi.mocked(mockAssetStorage.list).mockResolvedValue([assetWithoutLink]);
      vi.mocked(mockAssetStorage.count).mockResolvedValue(1);

      await exporter.exportAsZip(project);

      const projectJsonCall = mockZipFile.mock.calls.find(
        (call: [string, unknown]) => call[0] === 'project.json'
      );
      const projectData = JSON.parse(projectJsonCall?.[1] as string);
      expect(projectData.state.customIcons[0].characterId).toBe('unknown');
    });
  });
});
