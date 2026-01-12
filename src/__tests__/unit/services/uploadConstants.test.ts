import { describe, expect, it } from 'vitest';
import {
  getConfigByTags,
  getConfigByType,
  getZipPathByTags,
  TAG_TYPE_CONFIGS,
  TAG_TYPE_ICONS,
  TAG_TYPE_LABELS_PLURAL,
  TAG_ZIP_PATHS,
} from '@/ts/services/upload/constants.js';

describe('upload constants', () => {
  describe('TAG_TYPE_CONFIGS', () => {
    it('should have config for all type tags', () => {
      expect(TAG_TYPE_CONFIGS.icon).toBeDefined();
      expect(TAG_TYPE_CONFIGS['token-background']).toBeDefined();
      expect(TAG_TYPE_CONFIGS['script-background']).toBeDefined();
      expect(TAG_TYPE_CONFIGS.setup).toBeDefined();
      expect(TAG_TYPE_CONFIGS.accent).toBeDefined();
      expect(TAG_TYPE_CONFIGS.logo).toBeDefined();
      expect(TAG_TYPE_CONFIGS['studio-icon']).toBeDefined();
      expect(TAG_TYPE_CONFIGS['studio-logo']).toBeDefined();
      expect(TAG_TYPE_CONFIGS['studio-project']).toBeDefined();
    });

    it('should have valid config structure', () => {
      const iconConfig = TAG_TYPE_CONFIGS.icon;
      expect(iconConfig.allowedMimeTypes).toContain('image/png');
      expect(iconConfig.maxSize).toBeGreaterThan(0);
      expect(iconConfig.thumbnailSize).toBeGreaterThan(0);
    });
  });

  describe('getConfigByTags', () => {
    it('should return config for valid type tag', () => {
      const config = getConfigByTags(['type:icon', 'homebrew']);
      expect(config).toBeDefined();
      expect(config?.allowedMimeTypes).toContain('image/png');
    });

    it('should return undefined for missing type tag', () => {
      const config = getConfigByTags(['homebrew', 'starred']);
      expect(config).toBeUndefined();
    });

    it('should work with studio types', () => {
      const config = getConfigByTags(['type:studio-project']);
      expect(config).toBeDefined();
      expect(config?.maxSize).toBe(50 * 1024 * 1024); // 50 MB
    });
  });

  describe('getConfigByType', () => {
    it('should return config for type value', () => {
      const config = getConfigByType('icon');
      expect(config.allowedMimeTypes).toContain('image/png');
    });

    it('should return config for token-background', () => {
      const config = getConfigByType('token-background');
      expect(config.requireSquare).toBe(true);
      expect(config.requireTransparency).toBe(true);
    });
  });

  describe('TAG_ZIP_PATHS', () => {
    it('should have paths for all type tags', () => {
      expect(TAG_ZIP_PATHS.icon).toBe('assets/icons/');
      expect(TAG_ZIP_PATHS['token-background']).toBe('assets/token-backgrounds/');
      expect(TAG_ZIP_PATHS.setup).toBe('assets/setup-overlays/');
    });
  });

  describe('getZipPathByTags', () => {
    it('should return path for valid type tag', () => {
      expect(getZipPathByTags(['type:icon'])).toBe('assets/icons/');
      expect(getZipPathByTags(['type:setup', 'homebrew'])).toBe('assets/setup-overlays/');
    });

    it('should return undefined for missing type tag', () => {
      expect(getZipPathByTags(['homebrew'])).toBeUndefined();
    });
  });

  describe('TAG_TYPE_LABELS_PLURAL', () => {
    it('should have plural labels for all types', () => {
      expect(TAG_TYPE_LABELS_PLURAL.icon).toBe('Icons');
      expect(TAG_TYPE_LABELS_PLURAL['token-background']).toBe('Token Backgrounds');
      expect(TAG_TYPE_LABELS_PLURAL.setup).toBe('Setup Overlays');
    });
  });

  describe('TAG_TYPE_ICONS', () => {
    it('should have icons for all types', () => {
      expect(TAG_TYPE_ICONS.icon).toBeDefined();
      expect(TAG_TYPE_ICONS['token-background']).toBeDefined();
      expect(TAG_TYPE_ICONS.setup).toBeDefined();
    });
  });
});
