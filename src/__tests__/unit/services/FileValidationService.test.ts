/**
 * Unit tests for FileValidationService
 *
 * Tests cover:
 * - File type validation (MIME type detection)
 * - Size validation
 * - Image dimension validation
 * - Transparency detection
 * - Edge cases and error handling
 *
 * @module services/upload/__tests__/FileValidationService.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MB } from '@/ts/services/upload/constants';
import { FileValidationService } from '@/ts/services/upload/FileValidationService';
import type { AssetType } from '@/ts/services/upload/types';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create a mock File with specific content
 */
function createMockFile(
  content: ArrayBuffer | Uint8Array,
  filename: string = 'test.png',
  mimeType: string = 'image/png'
): File {
  const blob = new Blob([content], { type: mimeType });
  return new File([blob], filename, { type: mimeType });
}

/**
 * Create a mock PNG file (with PNG magic bytes)
 */
function createPngFile(filename: string = 'test.png', size: number = 1 * MB): File {
  const pngMagicBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const content = new Uint8Array(size);
  content.set(pngMagicBytes);
  return createMockFile(content, filename, 'image/png');
}

/**
 * Create a mock JPEG file (with JPEG magic bytes)
 */
function createJpegFile(filename: string = 'test.jpg', size: number = 1 * MB): File {
  const jpegMagicBytes = new Uint8Array([0xff, 0xd8, 0xff]);
  const content = new Uint8Array(size);
  content.set(jpegMagicBytes);
  return createMockFile(content, filename, 'image/jpeg');
}

/**
 * Create a mock WebP file (with WebP magic bytes)
 */
function createWebPFile(filename: string = 'test.webp', size: number = 1 * MB): File {
  const riffSignature = new Uint8Array([0x52, 0x49, 0x46, 0x46]);
  const webpSignature = new Uint8Array([0x57, 0x45, 0x42, 0x50]);
  const content = new Uint8Array(size);
  content.set(riffSignature, 0);
  content.set(webpSignature, 8);
  return createMockFile(content, filename, 'image/webp');
}

/**
 * Create a mock GIF file (with GIF magic bytes)
 */
function createGifFile(filename: string = 'test.gif', size: number = 100 * 1024): File {
  const gifMagicBytes = new Uint8Array([0x47, 0x49, 0x46, 0x38]);
  const content = new Uint8Array(size);
  content.set(gifMagicBytes);
  return createMockFile(content, filename, 'image/gif');
}

/**
 * Create a mock SVG file (with SVG content)
 */
function createSvgFile(filename: string = 'test.svg'): File {
  const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="50"/></svg>';
  return new File([svgContent], filename, { type: 'image/svg+xml' });
}

/**
 * Setup mock for image loading with specific dimensions
 */
function setupImageMock(width: number, height: number, shouldFail: boolean = false): void {
  global.Image = class MockImage {
    onload: (() => void) | null = null;
    onerror: ((error: Event) => void) | null = null;
    naturalWidth = width;
    naturalHeight = height;
    src = '';

    constructor() {
      // Use setTimeout to ensure async behavior
      setTimeout(() => {
        if (shouldFail && this.onerror) {
          this.onerror(new Event('error'));
        } else if (this.onload) {
          this.onload();
        }
      }, 0);
    }
  } as unknown as typeof Image;
}

// ============================================================================
// Test Suites
// ============================================================================

describe('FileValidationService', () => {
  let service: FileValidationService;

  beforeEach(() => {
    service = new FileValidationService();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // MIME Type Detection Tests
  // ==========================================================================

  describe('detectMimeType', () => {
    it('should detect PNG files by magic bytes', async () => {
      const file = createPngFile();
      const mimeType = await service.detectMimeType(file);
      expect(mimeType).toBe('image/png');
    });

    it('should detect JPEG files by magic bytes', async () => {
      const file = createJpegFile();
      const mimeType = await service.detectMimeType(file);
      expect(mimeType).toBe('image/jpeg');
    });

    it('should detect WebP files by magic bytes', async () => {
      const file = createWebPFile();
      const mimeType = await service.detectMimeType(file);
      expect(mimeType).toBe('image/webp');
    });

    it('should detect GIF files by magic bytes', async () => {
      const file = createGifFile();
      const mimeType = await service.detectMimeType(file);
      expect(mimeType).toBe('image/gif');
    });

    it('should detect SVG files from content', async () => {
      const file = createSvgFile();
      const mimeType = await service.detectMimeType(file);
      expect(mimeType).toBe('image/svg+xml');
    });

    it('should fallback to file.type when magic bytes do not match', async () => {
      const unknownContent = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
      const file = createMockFile(unknownContent, 'test.unknown', 'application/unknown');
      const mimeType = await service.detectMimeType(file);
      expect(mimeType).toBe('application/unknown');
    });

    it('should fallback to application/octet-stream when file.type is empty', async () => {
      const unknownContent = new Uint8Array([0x00, 0x01, 0x02, 0x03]);
      const file = createMockFile(unknownContent, 'test.unknown', '');
      const mimeType = await service.detectMimeType(file);
      expect(mimeType).toBe('application/octet-stream');
    });

    it('should handle errors during detection gracefully', async () => {
      const file = new File(['content'], 'test.png', { type: 'image/png' });
      vi.spyOn(file, 'slice').mockRejectedValueOnce(new Error('Read error'));

      const mimeType = await service.detectMimeType(file);
      expect(mimeType).toBe('image/png'); // Falls back to file.type
    });
  });

  // ==========================================================================
  // File Size Validation Tests
  // ==========================================================================

  describe('validate - file size', () => {
    beforeEach(() => {
      setupImageMock(500, 500);
    });

    it('should accept files within size limits', async () => {
      const file = createPngFile('test.png', 2 * MB);
      const result = await service.validate(file, 'character-icon');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject files that exceed size limits', async () => {
      const file = createPngFile('test.png', 10 * MB); // Exceeds 5MB limit for character-icon
      const result = await service.validate(file, 'character-icon');
      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(expect.stringContaining('File too large'));
    });

    it('should accept files at exactly max size', async () => {
      const maxSize = 5 * MB;
      const file = createPngFile('test.png', maxSize);
      const result = await service.validate(file, 'character-icon');
      // Valid if file size equals max size
      expect(result.errors.filter((e) => e.includes('File too large'))).toHaveLength(0);
    });

    it('should include correct file size in error message', async () => {
      const file = createPngFile('test.png', 6 * MB);
      const result = await service.validate(file, 'character-icon');
      expect(result.errors[0]).toMatch(/6\.0MB/);
      expect(result.errors[0]).toMatch(/5\.0MB/);
    });

    it('should handle different size limits for different asset types', async () => {
      const file = createPngFile('test.png', 15 * MB);
      // character-icon: 5MB max (should fail)
      const charResult = await service.validate(file, 'character-icon');
      expect(charResult.valid).toBe(false);

      // script-background: 20MB max (should pass)
      const scriptResult = await service.validate(file, 'script-background');
      expect(scriptResult.errors.filter((e) => e.includes('File too large'))).toHaveLength(0);
    });
  });

  // ==========================================================================
  // MIME Type Validation Tests
  // ==========================================================================

  describe('validate - MIME type validation', () => {
    beforeEach(() => {
      setupImageMock(500, 500);
    });

    it('should accept allowed MIME types', async () => {
      const pngFile = createPngFile();
      const result = await service.validate(pngFile, 'character-icon');
      expect(result.errors.filter((e) => e.includes('Invalid file type'))).toHaveLength(0);
    });

    it('should reject disallowed MIME types', async () => {
      const gifFile = createGifFile();
      const result = await service.validate(gifFile, 'character-icon'); // GIF not allowed for character-icon
      expect(result.errors).toContainEqual(expect.stringContaining('Invalid file type'));
    });

    it('should include allowed extensions in error message', async () => {
      const gifFile = createGifFile();
      const result = await service.validate(gifFile, 'character-icon');
      expect(result.errors[0]).toMatch(/\.png.*\.jpg.*\.jpeg.*\.webp/i);
    });

    it('should accept different MIME types for different asset types', async () => {
      const jpegFile = createJpegFile();

      // character-icon: allows JPEG
      const charResult = await service.validate(jpegFile, 'character-icon');
      expect(charResult.errors.filter((e) => e.includes('Invalid file type'))).toHaveLength(0);

      // token-background: does not allow JPEG
      const bgResult = await service.validate(jpegFile, 'token-background');
      expect(bgResult.errors).toContainEqual(expect.stringContaining('Invalid file type'));
    });
  });

  // ==========================================================================
  // Image Dimension Tests
  // ==========================================================================

  describe('getImageDimensions', () => {
    it('should return image dimensions', async () => {
      const file = createPngFile();
      setupImageMock(640, 480);

      const dimensions = await service.getImageDimensions(file);
      expect(dimensions.width).toBe(640);
      expect(dimensions.height).toBe(480);
    });

    it('should reject if image fails to load', async () => {
      const file = createPngFile();
      setupImageMock(0, 0, true); // shouldFail = true

      await expect(service.getImageDimensions(file)).rejects.toThrow('Failed to load image');
    });

    it('should clean up object URLs after loading', async () => {
      const file = createPngFile();
      const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL');

      try {
        setupImageMock(100, 100);
        await service.getImageDimensions(file);
        expect(revokeObjectURL).toHaveBeenCalled();
      } finally {
        revokeObjectURL.mockRestore();
      }
    });
  });

  describe('validate - dimension validation', () => {
    beforeEach(() => {
      setupImageMock(500, 500);
    });

    it('should validate minimum width', async () => {
      setupImageMock(100, 200); // Below 200px min width
      const file = createPngFile();
      const result = await service.validate(file, 'character-icon');
      expect(result.errors).toContainEqual(expect.stringContaining('Image too narrow'));
      expect(result.errors[result.errors.length - 1]).toMatch(/100px.*200px/);
    });

    it('should validate minimum height', async () => {
      setupImageMock(200, 100); // Below 200px min height
      const file = createPngFile();
      const result = await service.validate(file, 'character-icon');
      expect(result.errors).toContainEqual(expect.stringContaining('Image too short'));
    });

    it('should warn about maximum width (not error)', async () => {
      setupImageMock(3000, 3000); // Above 2048px max
      const file = createPngFile();
      const result = await service.validate(file, 'character-icon');
      expect(result.valid).toBe(true); // Still valid, just with warnings
      expect(result.warnings).toContainEqual(expect.stringContaining('will be resized'));
      expect(result.warnings[0]).toMatch(/3000px.*2048px/);
    });

    it('should warn about maximum height', async () => {
      setupImageMock(500, 3000); // Above 2048px max height
      const file = createPngFile();
      const result = await service.validate(file, 'character-icon');
      expect(result.warnings).toContainEqual(expect.stringContaining('will be resized'));
    });
  });

  // ==========================================================================
  // Square Requirement Tests
  // ==========================================================================

  describe('validate - square requirement', () => {
    it('should allow square images when requireSquare is true', async () => {
      setupImageMock(500, 500);
      const file = createPngFile();
      const result = await service.validate(file, 'token-background');
      expect(result.warnings.filter((w) => w.includes('not square'))).toHaveLength(0);
    });

    it('should warn about non-square images when requireSquare is true', async () => {
      setupImageMock(600, 500);
      const file = createPngFile();
      const result = await service.validate(file, 'token-background');
      expect(result.warnings).toContainEqual(expect.stringContaining('not square'));
      expect(result.warnings[0]).toMatch(/600×500/);
    });

    it('should allow nearly square images (within 5% tolerance)', async () => {
      setupImageMock(525, 500); // 5% difference
      const file = createPngFile();
      const result = await service.validate(file, 'token-background');
      // Should not warn about square if within tolerance
      expect(result.warnings.filter((w) => w.includes('not square'))).toHaveLength(0);
    });

    it('should not require square for character-icon', async () => {
      setupImageMock(600, 400);
      const file = createPngFile();
      const result = await service.validate(file, 'character-icon');
      expect(result.warnings.filter((w) => w.includes('not square'))).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Transparency Detection Tests
  // ==========================================================================

  describe('checkTransparency', () => {
    it('should return false for JPEG (never has transparency)', async () => {
      const file = createJpegFile();
      const hasAlpha = await service.checkTransparency(file, 'image/jpeg');
      expect(hasAlpha).toBe(false);
    });

    it('should return true for SVG (assumes transparency)', async () => {
      const file = createSvgFile();
      const hasAlpha = await service.checkTransparency(file, 'image/svg+xml');
      expect(hasAlpha).toBe(true);
    });

    it('should return true for GIF (assumes transparency)', async () => {
      const file = createGifFile();
      const hasAlpha = await service.checkTransparency(file, 'image/gif');
      expect(hasAlpha).toBe(true);
    });

    it('should sample transparency for PNG', async () => {
      setupImageMock(100, 100);
      // Mock canvas for transparency checking
      vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
        const element = document.createElement(tagName);
        if (tagName === 'canvas') {
          const mockContext = {
            drawImage: vi.fn(),
            getImageData: vi.fn().mockReturnValue({
              data: new Uint8ClampedArray([
                255,
                255,
                255,
                255, // Opaque
                255,
                255,
                255,
                128, // Transparent
              ]),
            }),
          };
          vi.spyOn(element, 'getContext').mockReturnValue(
            mockContext as unknown as CanvasRenderingContext2D
          );
        }
        return element;
      });

      const file = createPngFile();
      const hasAlpha = await service.checkTransparency(file, 'image/png');
      expect(hasAlpha).toBe(true);
    });

    it('should return true for unknown formats (assumes transparency)', async () => {
      const file = createPngFile();
      const hasAlpha = await service.checkTransparency(file, 'image/unknown');
      expect(hasAlpha).toBe(true);
    });

    it('should return true on sampling error', async () => {
      setupImageMock(0, 0, true); // shouldFail = true
      const file = createPngFile();

      const hasAlpha = await service.checkTransparency(file, 'image/png');
      expect(hasAlpha).toBe(true); // Assumes transparency on error
    });
  });

  describe('validate - transparency requirement', () => {
    beforeEach(() => {
      setupImageMock(500, 500);
      vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
        const element = document.createElement(tagName);
        if (tagName === 'canvas') {
          const mockContext = {
            drawImage: vi.fn(),
            getImageData: vi.fn().mockReturnValue({
              data: new Uint8ClampedArray([255, 255, 255, 255]), // All opaque
            }),
          };
          vi.spyOn(element, 'getContext').mockReturnValue(
            mockContext as unknown as CanvasRenderingContext2D
          );
        }
        return element;
      });
    });

    it('should warn if transparency required but not detected', async () => {
      const file = createJpegFile(); // JPEG has no transparency
      const result = await service.validate(file, 'token-background'); // Requires transparency
      expect(result.warnings).toContainEqual(expect.stringContaining('may not have transparency'));
    });

    it('should not warn if transparency detected', async () => {
      vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
        const element = document.createElement(tagName);
        if (tagName === 'canvas') {
          const mockContext = {
            drawImage: vi.fn(),
            getImageData: vi.fn().mockReturnValue({
              data: new Uint8ClampedArray([
                255,
                255,
                255,
                255,
                255,
                255,
                255,
                200, // Second pixel is transparent
              ]),
            }),
          };
          vi.spyOn(element, 'getContext').mockReturnValue(
            mockContext as unknown as CanvasRenderingContext2D
          );
        }
        return element;
      });

      const file = createPngFile();
      const result = await service.validate(file, 'token-background');
      expect(result.warnings.filter((w) => w.includes('transparency'))).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Configuration and Helper Method Tests
  // ==========================================================================

  describe('getConfig', () => {
    it('should return correct config for character-icon', () => {
      const config = service.getConfig('character-icon');
      expect(config.allowedMimeTypes).toContain('image/png');
      expect(config.allowedMimeTypes).toContain('image/jpeg');
      expect(config.maxSize).toBe(5 * MB);
      expect(config.minWidth).toBe(200);
    });

    it('should return correct config for token-background', () => {
      const config = service.getConfig('token-background');
      expect(config.allowedMimeTypes).toContain('image/png');
      expect(config.allowedMimeTypes).not.toContain('image/jpeg');
      expect(config.maxSize).toBe(10 * MB);
      expect(config.requireSquare).toBe(true);
      expect(config.requireTransparency).toBe(true);
    });

    it('should return correct config for different asset types', () => {
      const configs: AssetType[] = [
        'character-icon',
        'token-background',
        'script-background',
        'setup-overlay',
        'accent',
        'logo',
        'studio-icon',
        'studio-logo',
        'studio-project',
      ];

      configs.forEach((assetType) => {
        const config = service.getConfig(assetType);
        expect(config.allowedMimeTypes).toBeDefined();
        expect(config.allowedExtensions).toBeDefined();
        expect(config.maxSize).toBeGreaterThan(0);
      });
    });
  });

  describe('getAllowedFilesDescription', () => {
    it('should include extensions', () => {
      const description = service.getAllowedFilesDescription('character-icon');
      expect(description).toContain('.png');
      expect(description).toContain('.jpg');
      expect(description).toContain('.jpeg');
      expect(description).toContain('.webp');
    });

    it('should include max size in MB', () => {
      const description = service.getAllowedFilesDescription('character-icon');
      expect(description).toContain('5');
      expect(description).toContain('MB');
    });

    it('should format size correctly for different asset types', () => {
      const charDesc = service.getAllowedFilesDescription('character-icon');
      expect(charDesc).toMatch(/5MB/);

      const bgDesc = service.getAllowedFilesDescription('token-background');
      expect(bgDesc).toMatch(/10MB/);

      const scriptDesc = service.getAllowedFilesDescription('script-background');
      expect(scriptDesc).toMatch(/20MB/);
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('validate - integration tests', () => {
    beforeEach(() => {
      setupImageMock(540, 540);
    });

    it('should validate a valid character icon file', async () => {
      const file = createPngFile('avatar.png', 2 * MB);
      const result = await service.validate(file, 'character-icon');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.detectedMimeType).toBe('image/png');
      expect(result.dimensions).toEqual({ width: 540, height: 540 });
    });

    it('should fail validation with multiple errors', async () => {
      setupImageMock(100, 100); // Too narrow and too short
      const file = createGifFile('test.gif', 10 * MB); // Wrong type, too large, wrong dimensions
      const result = await service.validate(file, 'character-icon');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1); // Multiple errors
      expect(result.errors).toContainEqual(expect.stringContaining('Invalid file type'));
      expect(result.errors).toContainEqual(expect.stringContaining('File too large'));
    });

    it('should validate SVG logo correctly', async () => {
      const file = createSvgFile('logo.svg');
      const result = await service.validate(file, 'logo');
      expect(result.valid).toBe(true);
      expect(result.detectedMimeType).toBe('image/svg+xml');
    });

    it('should return dimensions even for SVG files that do not render', async () => {
      const file = createSvgFile('logo.svg');
      const result = await service.validate(file, 'logo');
      // SVG might fail to load as image, but should still be valid
      // Since SVG is accepted for logos
      expect(result.detectedMimeType).toBe('image/svg+xml');
    });
  });

  // ==========================================================================
  // Edge Cases and Error Handling
  // ==========================================================================

  describe('edge cases and error handling', () => {
    it('should detect PNG from small files', async () => {
      const smallPng = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'tiny.png', {
        type: 'image/png',
      });
      const mimeType = await service.detectMimeType(smallPng);
      expect(mimeType).toBe('image/png');
    });

    it('should handle file with no extension', async () => {
      const file = createPngFile('noextension');
      const mimeType = await service.detectMimeType(file);
      expect(mimeType).toBe('image/png'); // Detected from magic bytes
    });

    it('should handle file with wrong extension but correct content', async () => {
      const file = createPngFile('test.jpg'); // PNG content but .jpg extension
      const mimeType = await service.detectMimeType(file);
      expect(mimeType).toBe('image/png'); // Detected correctly
    });

    it('should handle corrupted JPEG magic bytes gracefully', async () => {
      const corruptedJpeg = new Uint8Array([0xff, 0xd8, 0x00]); // Incomplete JPEG header
      const file = createMockFile(corruptedJpeg, 'corrupt.jpg', 'image/jpeg');
      const mimeType = await service.detectMimeType(file);
      expect(mimeType).toBe('image/jpeg'); // Falls back to file.type
    });

    it('should detect SVG with XML declaration', async () => {
      const svgWithXml = '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"></svg>';
      const file = new File([svgWithXml], 'test.svg', { type: 'image/svg+xml' });
      const mimeType = await service.detectMimeType(file);
      expect(mimeType).toBe('image/svg+xml');
    });

    it('should reject SVG that looks like text but is not SVG', async () => {
      const fakeXml = '<?xml version="1.0"?><notsvg></notsvg>';
      const file = new File([fakeXml], 'fake.xml', { type: 'text/xml' });
      const mimeType = await service.detectMimeType(file);
      expect(mimeType).toBe('text/xml'); // Correctly identifies as XML, not SVG
    });

    it('should handle size validation at max boundaries', () => {
      const service = new FileValidationService();
      const config = service.getConfig('character-icon');
      expect(config.maxSize).toBe(5 * MB);
    });
  });

  // ==========================================================================
  // Asset Type Specific Tests
  // ==========================================================================

  describe('asset type specific validation', () => {
    beforeEach(() => {
      setupImageMock(1920, 1080);
    });

    it('should validate script-background with higher size limit', async () => {
      const file = createPngFile('script-bg.png', 15 * MB);
      const result = await service.validate(file, 'script-background');
      expect(result.errors.filter((e) => e.includes('File too large'))).toHaveLength(0);
    });

    it('should validate accent with small size limit', async () => {
      const file = createPngFile('accent.png', 800 * 1024); // 800KB
      const result = await service.validate(file, 'accent');
      expect(result.errors.filter((e) => e.includes('File too large'))).toHaveLength(0);
    });

    it('should allow JPEG for script-background but not token-background', async () => {
      const jpegFile = createJpegFile('bg.jpg', 15 * MB);

      const scriptResult = await service.validate(jpegFile, 'script-background');
      expect(scriptResult.errors.filter((e) => e.includes('Invalid file type'))).toHaveLength(0);

      const bgResult = await service.validate(jpegFile, 'token-background');
      expect(bgResult.errors).toContainEqual(expect.stringContaining('Invalid file type'));
    });

    it('should allow SVG for logo but not character-icon', async () => {
      const svgFile = createSvgFile('logo.svg');

      const logoResult = await service.validate(svgFile, 'logo');
      expect(logoResult.errors.filter((e) => e.includes('Invalid file type'))).toHaveLength(0);

      const charResult = await service.validate(svgFile, 'character-icon');
      expect(charResult.errors).toContainEqual(expect.stringContaining('Invalid file type'));
    });

    it('should validate studio types with proper configurations', async () => {
      setupImageMock(540, 540);
      const file = createPngFile('studio-icon.png', 5 * MB);

      const studioIconResult = await service.validate(file, 'studio-icon');
      expect(studioIconResult.valid).toBe(true);

      const studioProjectResult = await service.validate(file, 'studio-project');
      expect(studioProjectResult.valid).toBe(true);
    });
  });

  // ==========================================================================
  // Image Loading Error Scenarios
  // ==========================================================================

  describe('image loading error scenarios', () => {
    it('should include error message when image fails to load', async () => {
      setupImageMock(0, 0, true); // shouldFail = true
      const file = createPngFile();

      const result = await service.validate(file, 'character-icon');
      expect(result.errors).toContainEqual(
        expect.stringContaining('Could not read image dimensions')
      );
    });

    it('should continue validation even if image loading fails', async () => {
      setupImageMock(0, 0, true); // shouldFail = true
      const file = createPngFile('test.png', 2 * MB);

      const result = await service.validate(file, 'character-icon');
      // Should still validate mime type and size
      expect(result.detectedMimeType).toBe('image/png');
      expect(result.errors.filter((e) => e.includes('File too large'))).toHaveLength(0);
    });

    it('should return detected mime type even if dimensions fail', async () => {
      setupImageMock(0, 0, true); // shouldFail = true
      const file = createPngFile();

      const result = await service.validate(file, 'character-icon');
      expect(result.detectedMimeType).toBe('image/png');
      expect(result.dimensions).toBeUndefined();
    });
  });
});
