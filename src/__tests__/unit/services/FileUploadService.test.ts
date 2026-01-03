/**
 * Unit tests for FileUploadService
 *
 * Tests cover:
 * - Single and multiple file uploads
 * - Progress callbacks
 * - Clipboard uploads
 * - URL uploads
 * - Blob uploads
 * - Validation errors
 * - Processing errors
 * - Utility methods (getAcceptString, isValidFileType)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FileUploadService } from '@/ts/services/upload/FileUploadService';
import type {
  IAssetStorageService,
  IFileValidationService,
  IImageProcessingService,
} from '@/ts/services/upload/IUploadServices';
import type {
  AssetType,
  DBAsset,
  UploadConfig,
  ValidationResult,
} from '@/ts/services/upload/types';

// ============================================================================
// Test Helpers
// ============================================================================

const createMockFile = (
  name: string = 'test.png',
  type: string = 'image/png',
  _size: number = 1024
): File => {
  const blob = new Blob(['test content'], { type });
  return new File([blob], name, { type });
};

const createMockBlob = (type: string = 'image/png'): Blob => new Blob(['test content'], { type });

const createMockDBAsset = (overrides: Partial<DBAsset> = {}): DBAsset => ({
  id: 'asset-123',
  type: 'character-icon',
  projectId: null,
  blob: createMockBlob(),
  thumbnail: createMockBlob(),
  metadata: {
    filename: 'test.png',
    mimeType: 'image/png',
    size: 1024,
    width: 256,
    height: 256,
    uploadedAt: Date.now(),
    sourceType: 'upload',
  },
  linkedTo: [],
  ...overrides,
});

const createMockValidationService = (): IFileValidationService => ({
  validate: vi.fn().mockResolvedValue({
    valid: true,
    errors: [],
    warnings: [],
    detectedMimeType: 'image/png',
    dimensions: { width: 256, height: 256 },
  } as ValidationResult),
  detectMimeType: vi.fn().mockResolvedValue('image/png'),
  getImageDimensions: vi.fn().mockResolvedValue({ width: 256, height: 256 }),
  checkTransparency: vi.fn().mockResolvedValue(true),
  getConfig: vi.fn().mockReturnValue({
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    allowedExtensions: ['.png', '.jpg', '.jpeg', '.webp'],
    maxSize: 5 * 1024 * 1024,
  }),
  getAllowedFilesDescription: vi.fn().mockReturnValue('PNG, JPEG, or WebP images'),
});

const createMockProcessingService = (): IImageProcessingService => ({
  process: vi.fn().mockResolvedValue({
    blob: createMockBlob(),
    thumbnail: createMockBlob(),
    metadata: {
      filename: 'test.png',
      mimeType: 'image/png',
      size: 1024,
      width: 256,
      height: 256,
    },
  }),
  generateThumbnail: vi.fn().mockResolvedValue(createMockBlob()),
  loadImage: vi.fn(),
  resizeImage: vi.fn(),
  crop: vi.fn(),
  rotate: vi.fn(),
  hashBlob: vi.fn().mockResolvedValue('abc123'),
  hashProcessedImage: vi.fn().mockResolvedValue({ mainHash: 'abc123', thumbnailHash: 'def456' }),
});

const createMockStorageService = (): IAssetStorageService => ({
  save: vi.fn().mockResolvedValue('asset-123'),
  getById: vi.fn().mockResolvedValue(createMockDBAsset()),
  getByIdWithUrl: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  bulkDelete: vi.fn(),
  bulkUpdate: vi.fn(),
  list: vi.fn(),
  count: vi.fn(),
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

const createUploadConfig = (overrides: Partial<UploadConfig> = {}): UploadConfig => ({
  assetType: 'character-icon',
  ...overrides,
});

// ============================================================================
// Tests
// ============================================================================

describe('FileUploadService', () => {
  let service: FileUploadService;
  let mockValidation: IFileValidationService;
  let mockProcessing: IImageProcessingService;
  let mockStorage: IAssetStorageService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockValidation = createMockValidationService();
    mockProcessing = createMockProcessingService();
    mockStorage = createMockStorageService();

    service = new FileUploadService({
      fileValidation: mockValidation,
      imageProcessing: mockProcessing,
      assetStorage: mockStorage,
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
      expect(service).toBeInstanceOf(FileUploadService);
    });

    it('should create instance with default dependencies', () => {
      const defaultService = new FileUploadService();
      expect(defaultService).toBeInstanceOf(FileUploadService);
    });
  });

  // --------------------------------------------------------------------------
  // upload - Single File
  // --------------------------------------------------------------------------

  describe('upload - Single File', () => {
    it('should upload a single file successfully', async () => {
      const file = createMockFile();
      const config = createUploadConfig();

      const results = await service.upload(file, config);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      if (results[0].success) {
        expect(results[0].assetId).toBe('asset-123');
        expect(results[0].asset).toBeDefined();
      }
    });

    it('should validate file before processing', async () => {
      const file = createMockFile();
      const config = createUploadConfig();

      await service.upload(file, config);

      expect(mockValidation.validate).toHaveBeenCalledWith(file, 'character-icon');
    });

    it('should process file after validation', async () => {
      const file = createMockFile();
      const config = createUploadConfig();

      await service.upload(file, config);

      expect(mockProcessing.process).toHaveBeenCalledWith(file, 'character-icon');
    });

    it('should save processed file to storage', async () => {
      const file = createMockFile();
      const config = createUploadConfig();

      await service.upload(file, config);

      expect(mockStorage.save).toHaveBeenCalled();
      expect(mockStorage.getById).toHaveBeenCalledWith('asset-123');
    });

    it('should return error when validation fails', async () => {
      vi.mocked(mockValidation.validate).mockResolvedValue({
        valid: false,
        errors: ['File too large', 'Invalid format'],
        warnings: [],
      });

      const file = createMockFile();
      const config = createUploadConfig();

      const results = await service.upload(file, config);

      expect(results[0].success).toBe(false);
      if (!results[0].success) {
        expect(results[0].error).toBe('File too large; Invalid format');
      }
    });

    it('should skip processing when skipProcessing is true', async () => {
      const file = createMockFile();
      const config = createUploadConfig({ skipProcessing: true });

      await service.upload(file, config);

      expect(mockProcessing.process).not.toHaveBeenCalled();
      expect(mockProcessing.generateThumbnail).toHaveBeenCalledWith(file);
    });

    it('should include projectId when provided', async () => {
      const file = createMockFile();
      const config = createUploadConfig({ projectId: 'project-456' });

      await service.upload(file, config);

      const saveCall = vi.mocked(mockStorage.save).mock.calls[0][0];
      expect(saveCall.projectId).toBe('project-456');
    });

    it('should link to character when characterId provided', async () => {
      const file = createMockFile();
      const config = createUploadConfig({ characterId: 'char-789' });

      await service.upload(file, config);

      const saveCall = vi.mocked(mockStorage.save).mock.calls[0][0];
      expect(saveCall.linkedTo).toContain('char-789');
    });
  });

  // --------------------------------------------------------------------------
  // upload - Multiple Files
  // --------------------------------------------------------------------------

  describe('upload - Multiple Files', () => {
    it('should upload multiple files', async () => {
      const files = [
        createMockFile('file1.png'),
        createMockFile('file2.png'),
        createMockFile('file3.png'),
      ];
      const config = createUploadConfig();

      const results = await service.upload(files, config);

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it('should continue uploading when one file fails validation', async () => {
      vi.mocked(mockValidation.validate)
        .mockResolvedValueOnce({ valid: true, errors: [], warnings: [] })
        .mockResolvedValueOnce({ valid: false, errors: ['Invalid'], warnings: [] })
        .mockResolvedValueOnce({ valid: true, errors: [], warnings: [] });

      const files = [
        createMockFile('file1.png'),
        createMockFile('file2.png'),
        createMockFile('file3.png'),
      ];
      const config = createUploadConfig();

      const results = await service.upload(files, config);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[2].success).toBe(true);
    });

    it('should handle processing errors for individual files', async () => {
      vi.mocked(mockProcessing.process)
        .mockResolvedValueOnce({
          blob: createMockBlob(),
          thumbnail: createMockBlob(),
          metadata: {
            filename: 'file1.png',
            mimeType: 'image/png',
            size: 1024,
            width: 256,
            height: 256,
          },
        })
        .mockRejectedValueOnce(new Error('Processing failed'))
        .mockResolvedValueOnce({
          blob: createMockBlob(),
          thumbnail: createMockBlob(),
          metadata: {
            filename: 'file3.png',
            mimeType: 'image/png',
            size: 1024,
            width: 256,
            height: 256,
          },
        });

      const files = [
        createMockFile('file1.png'),
        createMockFile('file2.png'),
        createMockFile('file3.png'),
      ];
      const config = createUploadConfig();

      const results = await service.upload(files, config);

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      if (!results[1].success) {
        expect(results[1].error).toBe('Processing failed');
      }
      expect(results[2].success).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Progress Callbacks
  // --------------------------------------------------------------------------

  describe('Progress Callbacks', () => {
    it('should call progress callback during upload', async () => {
      const onProgress = vi.fn();
      const files = [createMockFile('file1.png'), createMockFile('file2.png')];
      const config = createUploadConfig({ onProgress });

      await service.upload(files, config);

      // Should be called for each file (before and after each)
      expect(onProgress).toHaveBeenCalled();
    });

    it('should report progress from 0 to 100', async () => {
      const progressValues: number[] = [];
      const onProgress = vi.fn((progress: number) => progressValues.push(progress));
      const files = [createMockFile('file1.png'), createMockFile('file2.png')];
      const config = createUploadConfig({ onProgress });

      await service.upload(files, config);

      // First file: 25% (midway), 50% (complete)
      // Second file: 75% (midway), 100% (complete)
      expect(progressValues).toContain(50);
      expect(progressValues).toContain(100);
    });
  });

  // --------------------------------------------------------------------------
  // uploadFromClipboard
  // --------------------------------------------------------------------------

  describe('uploadFromClipboard', () => {
    it('should return null when no clipboard data', async () => {
      const event = { clipboardData: null } as ClipboardEvent;
      const config = createUploadConfig();

      const result = await service.uploadFromClipboard(event, config);

      expect(result).toBeNull();
    });

    it('should return null when no items in clipboard', async () => {
      const event = {
        clipboardData: { items: [] },
      } as unknown as ClipboardEvent;
      const config = createUploadConfig();

      const result = await service.uploadFromClipboard(event, config);

      expect(result).toBeNull();
    });

    it('should upload image from clipboard', async () => {
      const mockFile = createMockFile('image.png', 'image/png');
      const mockItem = {
        type: 'image/png',
        getAsFile: () => mockFile,
      };
      const event = {
        clipboardData: { items: [mockItem] },
      } as unknown as ClipboardEvent;
      const config = createUploadConfig();

      const result = await service.uploadFromClipboard(event, config);

      expect(result).not.toBeNull();
      expect(result?.success).toBe(true);
    });

    it('should generate filename with timestamp for pasted images', async () => {
      const mockFile = createMockFile('image.png', 'image/png');
      const mockItem = {
        type: 'image/png',
        getAsFile: () => mockFile,
      };
      const event = {
        clipboardData: { items: [mockItem] },
      } as unknown as ClipboardEvent;
      const config = createUploadConfig();

      await service.uploadFromClipboard(event, config);

      const validateCall = vi.mocked(mockValidation.validate).mock.calls[0][0];
      expect(validateCall.name).toMatch(/^pasted_\d+\.png$/);
    });

    it('should skip non-image items', async () => {
      const mockItem = {
        type: 'text/plain',
        getAsFile: () => null,
      };
      const event = {
        clipboardData: { items: [mockItem] },
      } as unknown as ClipboardEvent;
      const config = createUploadConfig();

      const result = await service.uploadFromClipboard(event, config);

      expect(result).toBeNull();
    });

    it('should handle upload errors gracefully', async () => {
      vi.mocked(mockValidation.validate).mockRejectedValue(new Error('Validation crashed'));

      const mockFile = createMockFile('image.png', 'image/png');
      const mockItem = {
        type: 'image/png',
        getAsFile: () => mockFile,
      };
      const event = {
        clipboardData: { items: [mockItem] },
      } as unknown as ClipboardEvent;
      const config = createUploadConfig();

      const result = await service.uploadFromClipboard(event, config);

      expect(result?.success).toBe(false);
      if (!result?.success) {
        expect(result?.error).toBe('Validation crashed');
      }
    });
  });

  // --------------------------------------------------------------------------
  // uploadFromUrl
  // --------------------------------------------------------------------------

  describe('uploadFromUrl', () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(createMockBlob('image/png')),
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should fetch and upload image from URL', async () => {
      const url = 'https://example.com/image.png';
      const config = createUploadConfig();

      const result = await service.uploadFromUrl(url, config);

      expect(fetch).toHaveBeenCalledWith(url);
      expect(result.success).toBe(true);
    });

    it('should extract filename from URL path', async () => {
      const url = 'https://example.com/path/to/myimage.png';
      const config = createUploadConfig();

      await service.uploadFromUrl(url, config);

      const validateCall = vi.mocked(mockValidation.validate).mock.calls[0][0];
      expect(validateCall.name).toBe('myimage.png');
    });

    it('should add extension if missing from URL', async () => {
      const url = 'https://example.com/path/to/myimage';
      const config = createUploadConfig();

      await service.uploadFromUrl(url, config);

      const validateCall = vi.mocked(mockValidation.validate).mock.calls[0][0];
      expect(validateCall.name).toBe('myimage.png');
    });

    it('should return error when fetch fails', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      } as Response);

      const url = 'https://example.com/notfound.png';
      const config = createUploadConfig();

      const result = await service.uploadFromUrl(url, config);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Failed to fetch image');
      }
    });

    it('should return error when network error occurs', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      const url = 'https://example.com/image.png';
      const config = createUploadConfig();

      const result = await service.uploadFromUrl(url, config);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Network error');
      }
    });
  });

  // --------------------------------------------------------------------------
  // uploadFromBlob
  // --------------------------------------------------------------------------

  describe('uploadFromBlob', () => {
    it('should upload blob with provided filename', async () => {
      const blob = createMockBlob('image/png');
      const filename = 'custom-name.png';
      const config = createUploadConfig();

      const result = await service.uploadFromBlob(blob, filename, config);

      expect(result.success).toBe(true);
      const validateCall = vi.mocked(mockValidation.validate).mock.calls[0][0];
      expect(validateCall.name).toBe(filename);
    });

    it('should set source type to editor', async () => {
      const blob = createMockBlob('image/png');
      const config = createUploadConfig();

      await service.uploadFromBlob(blob, 'test.png', config);

      const saveCall = vi.mocked(mockStorage.save).mock.calls[0][0];
      expect(saveCall.metadata.sourceType).toBe('editor');
    });
  });

  // --------------------------------------------------------------------------
  // getAcceptString
  // --------------------------------------------------------------------------

  describe('getAcceptString', () => {
    it('should return comma-separated MIME types', () => {
      const result = service.getAcceptString('character-icon');

      expect(result).toBe('image/png,image/jpeg,image/webp');
    });

    it('should call fileValidation.getConfig', () => {
      service.getAcceptString('token-background');

      expect(mockValidation.getConfig).toHaveBeenCalledWith('token-background');
    });
  });

  // --------------------------------------------------------------------------
  // isValidFileType
  // --------------------------------------------------------------------------

  describe('isValidFileType', () => {
    it('should return true for allowed MIME type', () => {
      const file = createMockFile('test.png', 'image/png');

      const result = service.isValidFileType(file, 'character-icon');

      expect(result).toBe(true);
    });

    it('should return false for disallowed MIME type', () => {
      const file = createMockFile('test.bmp', 'image/bmp');

      const result = service.isValidFileType(file, 'character-icon');

      expect(result).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Error Handling
  // --------------------------------------------------------------------------

  describe('Error Handling', () => {
    it('should handle storage save failure', async () => {
      vi.mocked(mockStorage.save).mockRejectedValue(new Error('Database error'));

      const file = createMockFile();
      const config = createUploadConfig();

      const results = await service.upload(file, config);

      expect(results[0].success).toBe(false);
      if (!results[0].success) {
        expect(results[0].error).toBe('Database error');
      }
    });

    it('should handle storage getById returning null', async () => {
      vi.mocked(mockStorage.getById).mockResolvedValue(undefined);

      const file = createMockFile();
      const config = createUploadConfig();

      const results = await service.upload(file, config);

      expect(results[0].success).toBe(false);
      if (!results[0].success) {
        expect(results[0].error).toBe('Failed to retrieve saved asset');
      }
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases
  // --------------------------------------------------------------------------

  describe('Edge Cases', () => {
    it('should handle empty file array', async () => {
      const config = createUploadConfig();

      const results = await service.upload([], config);

      expect(results).toHaveLength(0);
    });

    it('should handle different asset types', async () => {
      const assetTypes: AssetType[] = [
        'character-icon',
        'token-background',
        'setup-overlay',
        'logo',
      ];

      for (const assetType of assetTypes) {
        vi.clearAllMocks();
        const file = createMockFile();
        const config = createUploadConfig({ assetType });

        await service.upload(file, config);

        expect(mockValidation.validate).toHaveBeenCalledWith(file, assetType);
        expect(mockProcessing.process).toHaveBeenCalledWith(file, assetType);
      }
    });

    it('should use correct extension for different MIME types', async () => {
      // Only test image types that start with 'image/' since clipboard upload
      // skips non-image items
      const mimeTypes = [
        { type: 'image/png', ext: 'png' },
        { type: 'image/jpeg', ext: 'jpg' },
        { type: 'image/webp', ext: 'webp' },
        { type: 'image/gif', ext: 'gif' },
        { type: 'image/svg+xml', ext: 'svg' },
      ];

      for (const { type, ext } of mimeTypes) {
        vi.clearAllMocks();
        // Re-setup mocks after clearing
        vi.mocked(mockValidation.validate).mockResolvedValue({
          valid: true,
          errors: [],
          warnings: [],
          detectedMimeType: type,
          dimensions: { width: 256, height: 256 },
        });

        const mockFile = createMockFile('image', type);
        const mockItem = {
          type,
          getAsFile: () => mockFile,
        };
        const event = {
          clipboardData: { items: [mockItem] },
        } as unknown as ClipboardEvent;
        const config = createUploadConfig();

        await service.uploadFromClipboard(event, config);

        const validateCall = vi.mocked(mockValidation.validate).mock.calls[0][0];
        expect(validateCall.name).toMatch(new RegExp(`\\.${ext}$`));
      }
    });
  });
});
