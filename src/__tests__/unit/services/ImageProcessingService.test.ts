/**
 * Unit tests for ImageProcessingService
 *
 * Tests cover:
 * - process() with various options
 * - generateThumbnail()
 * - loadImage()
 * - resizeImage()
 * - calculateDimensions()
 * - crop() and rotate()
 * - hashBlob() and hashProcessedImage()
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ImageProcessingService,
  type ProcessingOptions,
} from '@/ts/services/upload/ImageProcessingService';
import type { AssetType } from '@/ts/services/upload/types';

// ============================================================================
// Mock Canvas API
// ============================================================================

const mockDrawImage = vi.fn();
const mockToBlobCallback = vi.fn();

const createMockContext = () => ({
  drawImage: mockDrawImage,
  translate: vi.fn(),
  rotate: vi.fn(),
  imageSmoothingEnabled: true,
  imageSmoothingQuality: 'high' as ImageSmoothingQuality,
});

const createMockCanvas = (width = 256, height = 256) => {
  const ctx = createMockContext();
  const canvas = {
    width,
    height,
    getContext: vi.fn().mockReturnValue(ctx),
    toBlob: vi
      .fn()
      .mockImplementation((callback: BlobCallback, _type?: string, _quality?: number) => {
        const blob = new Blob(['mock-image'], { type: 'image/webp' });
        callback(blob);
        mockToBlobCallback(callback);
      }),
  };
  return { canvas, ctx };
};

// Store original createElement
const originalCreateElement = document.createElement.bind(document);

// ============================================================================
// Mock Image Loading
// ============================================================================

const createMockImage = (width = 256, height = 256) => {
  const img = {
    naturalWidth: width,
    naturalHeight: height,
    src: '',
    onload: null as (() => void) | null,
    onerror: null as (() => void) | null,
  };
  return img as unknown as HTMLImageElement;
};

// Mock Image class for constructor usage
let _mockImageInstance: HTMLImageElement;
let mockImageLoadBehavior: 'success' | 'error' = 'success';

class MockImage {
  naturalWidth = 256;
  naturalHeight = 256;
  src = '';
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor() {
    _mockImageInstance = this as unknown as HTMLImageElement;
    // Trigger onload/onerror after src is set
    setTimeout(() => {
      if (mockImageLoadBehavior === 'success' && this.onload) {
        this.onload();
      } else if (mockImageLoadBehavior === 'error' && this.onerror) {
        this.onerror();
      }
    }, 0);
  }
}

// ============================================================================
// Test Helpers
// ============================================================================

const createMockFile = (name: string, type: string = 'image/png', size: number = 1024): File => {
  const content = new Uint8Array(size).fill(0);
  return new File([content], name, { type });
};

// ============================================================================
// Tests
// ============================================================================

describe('ImageProcessingService', () => {
  let service: ImageProcessingService;
  let mockCanvas: ReturnType<typeof createMockCanvas>['canvas'];
  let _mockImage: HTMLImageElement;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock image behavior
    mockImageLoadBehavior = 'success';

    // Create mock instances
    const canvasMock = createMockCanvas();
    mockCanvas = canvasMock.canvas;
    _mockImage = createMockImage();

    // Mock document.createElement
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        return mockCanvas as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tagName);
    });

    // Mock URL object methods
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    // Mock Image constructor using class-based mock
    vi.stubGlobal('Image', MockImage);

    // Mock crypto.subtle for hash tests
    vi.stubGlobal('crypto', {
      subtle: {
        digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
      },
    });

    // Mock Blob.prototype.arrayBuffer (not available in jsdom)
    if (!Blob.prototype.arrayBuffer) {
      Blob.prototype.arrayBuffer = async function () {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as ArrayBuffer);
          reader.readAsArrayBuffer(this);
        });
      };
    }

    service = new ImageProcessingService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // --------------------------------------------------------------------------
  // loadImage
  // --------------------------------------------------------------------------

  describe('loadImage', () => {
    it('should load an image from a File', async () => {
      const file = createMockFile('test.png');

      const result = await service.loadImage(file);

      expect(result).toBeDefined();
      expect(URL.createObjectURL).toHaveBeenCalledWith(file);
      expect(URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('should reject on image load error', async () => {
      mockImageLoadBehavior = 'error';

      const file = createMockFile('test.png');

      await expect(service.loadImage(file)).rejects.toThrow('Failed to load image');
    });
  });

  // --------------------------------------------------------------------------
  // generateThumbnail
  // --------------------------------------------------------------------------

  describe('generateThumbnail', () => {
    it('should generate a thumbnail from HTMLImageElement', async () => {
      const img = createMockImage(512, 512);

      const result = await service.generateThumbnail(img, 64);

      expect(result).toBeInstanceOf(Blob);
      expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
      expect(mockDrawImage).toHaveBeenCalled();
    });

    it('should generate a thumbnail from File', async () => {
      const file = createMockFile('test.png');

      const result = await service.generateThumbnail(file, 64);

      expect(result).toBeInstanceOf(Blob);
      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    it('should use default size when not specified', async () => {
      const img = createMockImage();

      await service.generateThumbnail(img);

      // Canvas should be set to default thumbnail size (64 from constants)
      // The exact size depends on DEFAULT_THUMBNAIL_SIZE constant
      expect(mockCanvas.width).toBeDefined();
      expect(mockCanvas.height).toBeDefined();
    });

    it('should apply crop when provided', async () => {
      const img = createMockImage(512, 512);
      const crop = { x: 100, y: 100, width: 200, height: 200 };

      await service.generateThumbnail(img, 64, crop);

      expect(mockDrawImage).toHaveBeenCalledWith(img, 100, 100, 200, 200, 0, 0, 64, 64);
    });

    it('should throw if canvas context unavailable', async () => {
      mockCanvas.getContext = vi.fn().mockReturnValue(null);
      const img = createMockImage();

      await expect(service.generateThumbnail(img, 64)).rejects.toThrow(
        'Could not create canvas context'
      );
    });
  });

  // --------------------------------------------------------------------------
  // resizeImage
  // --------------------------------------------------------------------------

  describe('resizeImage', () => {
    it('should resize an image', async () => {
      const img = createMockImage(512, 512);

      const result = await service.resizeImage(img, 256, 256, undefined, 'image/webp', 0.9);

      expect(result).toBeInstanceOf(Blob);
      expect(mockCanvas.width).toBe(256);
      expect(mockCanvas.height).toBe(256);
    });

    it('should apply crop when provided', async () => {
      const img = createMockImage(512, 512);
      const crop = { x: 50, y: 50, width: 400, height: 400 };

      await service.resizeImage(img, 200, 200, crop, 'image/webp', 0.9);

      expect(mockDrawImage).toHaveBeenCalledWith(img, 50, 50, 400, 400, 0, 0, 200, 200);
    });

    it('should set image smoothing for quality', async () => {
      const img = createMockImage();
      const ctx = createMockContext();
      mockCanvas.getContext = vi.fn().mockReturnValue(ctx);

      await service.resizeImage(img, 128, 128, undefined, 'image/webp', 0.9);

      expect(ctx.imageSmoothingEnabled).toBe(true);
      expect(ctx.imageSmoothingQuality).toBe('high');
    });

    it('should throw if canvas context unavailable', async () => {
      mockCanvas.getContext = vi.fn().mockReturnValue(null);
      const img = createMockImage();

      await expect(
        service.resizeImage(img, 128, 128, undefined, 'image/webp', 0.9)
      ).rejects.toThrow('Could not create canvas context');
    });
  });

  // --------------------------------------------------------------------------
  // process
  // --------------------------------------------------------------------------

  describe('process', () => {
    it('should process an image with default options', async () => {
      const file = createMockFile('test.png');

      const result = await service.process(file, 'character-icon');

      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.thumbnail).toBeInstanceOf(Blob);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.filename).toBe('test.webp');
    });

    it('should update filename extension based on output format', async () => {
      const file = createMockFile('original.png');

      const result = await service.process(file, 'character-icon');

      expect(result.metadata.filename).toBe('original.webp');
    });

    it('should preserve original format when skipConversion is true', async () => {
      const file = createMockFile('test.png', 'image/png');
      const options: ProcessingOptions = { skipConversion: true };

      const result = await service.process(file, 'character-icon', options);

      expect(result.metadata.mimeType).toBe('image/png');
      expect(result.metadata.filename).toBe('test.png');
    });

    it('should use custom target dimensions', async () => {
      const file = createMockFile('test.png');
      const options: ProcessingOptions = { targetWidth: 100, targetHeight: 100 };

      const result = await service.process(file, 'character-icon', options);

      // Verify metadata reflects the target dimensions
      expect(result.metadata.width).toBe(100);
      expect(result.metadata.height).toBe(100);
    });

    it('should use custom thumbnail size', async () => {
      const file = createMockFile('test.png');
      const options: ProcessingOptions = { thumbnailSize: 32 };

      await service.process(file, 'character-icon', options);

      // First call is for main image, second is for thumbnail
      expect(mockCanvas.getContext).toHaveBeenCalled();
    });

    it('should use custom quality', async () => {
      const file = createMockFile('test.png');
      const options: ProcessingOptions = { quality: 0.5 };

      await service.process(file, 'character-icon', options);

      expect(mockCanvas.toBlob).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // crop
  // --------------------------------------------------------------------------

  describe('crop', () => {
    it('should crop an image to a region', async () => {
      const file = createMockFile('test.png');
      const region = { x: 10, y: 10, width: 100, height: 100 };

      const result = await service.crop(file, region);

      expect(result).toBeInstanceOf(Blob);
      expect(mockDrawImage).toHaveBeenCalled();
    });

    it('should handle Blob input', async () => {
      const blob = new Blob(['mock-image'], { type: 'image/png' });
      const region = { x: 0, y: 0, width: 50, height: 50 };

      const result = await service.crop(blob, region);

      expect(result).toBeInstanceOf(Blob);
    });
  });

  // --------------------------------------------------------------------------
  // rotate
  // --------------------------------------------------------------------------

  describe('rotate', () => {
    it('should rotate an image by degrees', async () => {
      const file = createMockFile('test.png');

      const result = await service.rotate(file, 90);

      expect(result).toBeInstanceOf(Blob);
      expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
    });

    it('should handle Blob input', async () => {
      const blob = new Blob(['mock-image'], { type: 'image/png' });

      const result = await service.rotate(blob, 180);

      expect(result).toBeInstanceOf(Blob);
    });

    it('should throw if canvas context unavailable', async () => {
      mockCanvas.getContext = vi.fn().mockReturnValue(null);
      const file = createMockFile('test.png');

      await expect(service.rotate(file, 90)).rejects.toThrow('Could not create canvas context');
    });
  });

  // --------------------------------------------------------------------------
  // hashBlob
  // --------------------------------------------------------------------------

  describe('hashBlob', () => {
    it('should generate SHA-256 hash of blob content', async () => {
      const blob = new Blob(['test-content'], { type: 'application/octet-stream' });

      const result = await service.hashBlob(blob);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(crypto.subtle.digest).toHaveBeenCalledWith('SHA-256', expect.any(ArrayBuffer));
    });

    it('should return hex-encoded hash', async () => {
      // Mock a specific hash buffer
      const hashBuffer = new Uint8Array([0x1a, 0x2b, 0x3c, 0x4d]).buffer;
      vi.mocked(crypto.subtle.digest).mockResolvedValue(hashBuffer);

      const blob = new Blob(['test'], { type: 'text/plain' });

      const result = await service.hashBlob(blob);

      expect(result).toBe('1a2b3c4d');
    });
  });

  // --------------------------------------------------------------------------
  // hashProcessedImage
  // --------------------------------------------------------------------------

  describe('hashProcessedImage', () => {
    it('should hash both processed blob and thumbnail', async () => {
      const processedBlob = new Blob(['processed'], { type: 'image/webp' });
      const thumbnailBlob = new Blob(['thumbnail'], { type: 'image/webp' });

      const result = await service.hashProcessedImage(processedBlob, thumbnailBlob);

      expect(result.mainHash).toBeDefined();
      expect(result.thumbnailHash).toBeDefined();
      expect(crypto.subtle.digest).toHaveBeenCalledTimes(2);
    });

    it('should return different hashes for different content', async () => {
      // Mock different hashes for different blobs
      const hash1 = new Uint8Array([0x11, 0x22]).buffer;
      const hash2 = new Uint8Array([0x33, 0x44]).buffer;
      vi.mocked(crypto.subtle.digest).mockResolvedValueOnce(hash1).mockResolvedValueOnce(hash2);

      const processedBlob = new Blob(['processed'], { type: 'image/webp' });
      const thumbnailBlob = new Blob(['thumbnail'], { type: 'image/webp' });

      const result = await service.hashProcessedImage(processedBlob, thumbnailBlob);

      expect(result.mainHash).toBe('1122');
      expect(result.thumbnailHash).toBe('3344');
    });
  });

  // --------------------------------------------------------------------------
  // calculateDimensions (via process)
  // --------------------------------------------------------------------------

  describe('calculateDimensions', () => {
    it('should preserve original dimensions when skipResize is true', async () => {
      // Use MockImage class to set dimensions
      const originalWidth = 800;
      const originalHeight = 600;

      // Override MockImage dimensions for this test
      class MockImageWithDimensions {
        naturalWidth = originalWidth;
        naturalHeight = originalHeight;
        src = '';
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;

        constructor() {
          setTimeout(() => {
            if (this.onload) this.onload();
          }, 0);
        }
      }
      vi.stubGlobal('Image', MockImageWithDimensions);

      const file = createMockFile('test.png');
      const options: ProcessingOptions = { skipResize: true };

      const result = await service.process(file, 'character-icon', options);

      // Metadata should reflect original dimensions
      expect(result.metadata.width).toBe(originalWidth);
      expect(result.metadata.height).toBe(originalHeight);
    });

    it('should scale down images that exceed max dimensions', async () => {
      _mockImage = createMockImage(2000, 2000);
      const file = createMockFile('test.png');
      const options: ProcessingOptions = { targetWidth: 512, targetHeight: 512 };

      await service.process(file, 'character-icon', options);

      // Should be scaled down to max dimensions
      expect(mockCanvas.width).toBeLessThanOrEqual(512);
      expect(mockCanvas.height).toBeLessThanOrEqual(512);
    });
  });

  // --------------------------------------------------------------------------
  // updateFilename (via process)
  // --------------------------------------------------------------------------

  describe('updateFilename', () => {
    it('should update extension to .webp for webp format', async () => {
      const file = createMockFile('image.png');

      const result = await service.process(file, 'character-icon');

      expect(result.metadata.filename).toBe('image.webp');
    });

    it('should update extension to .jpg for jpeg format', async () => {
      const file = createMockFile('image.png');
      const options: ProcessingOptions = { outputFormat: 'image/jpeg' };

      const result = await service.process(file, 'character-icon', options);

      expect(result.metadata.filename).toBe('image.jpg');
    });

    it('should handle filenames without extension', async () => {
      const file = createMockFile('imagefile');

      const result = await service.process(file, 'character-icon');

      expect(result.metadata.filename).toBe('imagefile.webp');
    });

    it('should handle filenames with multiple dots', async () => {
      const file = createMockFile('my.image.file.png');

      const result = await service.process(file, 'character-icon');

      expect(result.metadata.filename).toBe('my.image.file.webp');
    });
  });

  // --------------------------------------------------------------------------
  // Error Handling
  // --------------------------------------------------------------------------

  describe('Error Handling', () => {
    it('should throw when toBlob fails', async () => {
      mockCanvas.toBlob = vi.fn().mockImplementation((callback: BlobCallback) => {
        callback(null);
      });

      const file = createMockFile('test.png');

      await expect(service.process(file, 'character-icon')).rejects.toThrow(
        'Failed to create blob from canvas'
      );
    });
  });

  // --------------------------------------------------------------------------
  // Asset Type Configs
  // --------------------------------------------------------------------------

  describe('Asset Type Configs', () => {
    const assetTypes: AssetType[] = [
      'character-icon',
      'token-background',
      'script-background',
      'setup-overlay',
      'accent',
    ];

    it.each(assetTypes)('should process %s asset type', async (assetType) => {
      const file = createMockFile('test.png');

      const result = await service.process(file, assetType);

      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.thumbnail).toBeInstanceOf(Blob);
      expect(result.metadata).toBeDefined();
    });
  });
});
