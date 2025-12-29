import { describe, expect, it } from 'vitest';
import { getContrastColor, hexToRgb, parseHexColor } from '@/ts/utils/colorUtils';

describe('colorUtils', () => {
  describe('hexToRgb', () => {
    it('should convert 6-digit hex with hash', () => {
      const result = hexToRgb('#FF5500');
      expect(result).toEqual({ r: 255, g: 85, b: 0 });
    });

    it('should convert 6-digit hex without hash', () => {
      const result = hexToRgb('FF5500');
      expect(result).toEqual({ r: 255, g: 85, b: 0 });
    });

    it('should convert 3-digit hex with hash', () => {
      const result = hexToRgb('#F50');
      expect(result).toEqual({ r: 255, g: 85, b: 0 });
    });

    it('should convert 3-digit hex without hash', () => {
      const result = hexToRgb('F50');
      expect(result).toEqual({ r: 255, g: 85, b: 0 });
    });

    it('should handle black (#000000)', () => {
      const result = hexToRgb('#000000');
      expect(result).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('should handle white (#FFFFFF)', () => {
      const result = hexToRgb('#FFFFFF');
      expect(result).toEqual({ r: 255, g: 255, b: 255 });
    });

    it('should handle lowercase hex', () => {
      const result = hexToRgb('#ff5500');
      expect(result).toEqual({ r: 255, g: 85, b: 0 });
    });

    it('should return null for invalid hex', () => {
      expect(hexToRgb('invalid')).toBeNull();
      expect(hexToRgb('#GG0000')).toBeNull();
      expect(hexToRgb('#12345')).toBeNull();
      expect(hexToRgb('')).toBeNull();
    });
  });

  describe('getContrastColor', () => {
    it('should return black for light backgrounds', () => {
      expect(getContrastColor('#FFFFFF')).toBe('#000000');
      expect(getContrastColor('#FFFF00')).toBe('#000000');
      expect(getContrastColor('#00FF00')).toBe('#000000');
    });

    it('should return white for dark backgrounds', () => {
      expect(getContrastColor('#000000')).toBe('#FFFFFF');
      expect(getContrastColor('#0000FF')).toBe('#FFFFFF');
      expect(getContrastColor('#800000')).toBe('#FFFFFF');
    });

    it('should return black for invalid hex', () => {
      expect(getContrastColor('invalid')).toBe('#000000');
    });
  });

  describe('parseHexColor', () => {
    it('should parse valid hex color', () => {
      const result = parseHexColor('#FF5500');
      expect(result).toEqual({ r: 255, g: 85, b: 0 });
    });

    it('should fallback to black for invalid hex', () => {
      const result = parseHexColor('invalid');
      expect(result).toEqual({ r: 0, g: 0, b: 0 });
    });
  });
});
