import { describe, expect, it } from 'vitest';
import {
  deriveFolderTree,
  type FolderNode,
  getAllFolderPaths,
  getAssetsInFolder,
  getFolderName,
  getParentFolder,
  validateFolderPath,
} from '@/ts/services/upload/folderUtils.js';

// Mock asset type with folder field
interface MockAsset {
  id: string;
  folder: string | null;
  tags: string[];
}

// Mock asset factory
const createMockAsset = (id: string, folder: string | null): MockAsset => ({
  id,
  folder,
  tags: ['type:icon'],
});

describe('folderUtils', () => {
  describe('validateFolderPath', () => {
    it('should accept valid folder names', () => {
      expect(validateFolderPath('Characters').valid).toBe(true);
      expect(validateFolderPath('My Icons').valid).toBe(true);
      expect(validateFolderPath('icons-2024').valid).toBe(true);
      expect(validateFolderPath('icons_v2').valid).toBe(true);
    });

    it('should accept valid nested paths', () => {
      expect(validateFolderPath('Characters/Townsfolk').valid).toBe(true);
      expect(validateFolderPath('A/B/C/D/E').valid).toBe(true);
    });

    it('should reject paths with leading slash', () => {
      const result = validateFolderPath('/Characters');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('leading');
    });

    it('should reject paths with trailing slash', () => {
      const result = validateFolderPath('Characters/');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('trailing');
    });

    it('should reject paths with empty segments', () => {
      const result = validateFolderPath('Characters//Townsfolk');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should reject empty string', () => {
      const result = validateFolderPath('');
      expect(result.valid).toBe(false);
    });

    it('should reject paths with invalid characters', () => {
      expect(validateFolderPath('Icons<>').valid).toBe(false);
      expect(validateFolderPath('Icons|Stuff').valid).toBe(false);
    });
  });

  describe('getParentFolder', () => {
    it('should return parent folder path', () => {
      expect(getParentFolder('Characters/Townsfolk')).toBe('Characters');
      expect(getParentFolder('A/B/C')).toBe('A/B');
    });

    it('should return null for root-level folders', () => {
      expect(getParentFolder('Characters')).toBeNull();
    });

    it('should return null for null input', () => {
      expect(getParentFolder(null)).toBeNull();
    });
  });

  describe('getFolderName', () => {
    it('should return folder name from path', () => {
      expect(getFolderName('Characters/Townsfolk')).toBe('Townsfolk');
      expect(getFolderName('Characters')).toBe('Characters');
    });

    it('should return empty string for null', () => {
      expect(getFolderName(null)).toBe('');
    });
  });

  describe('getAllFolderPaths', () => {
    it('should extract unique folder paths from assets', () => {
      const assets = [
        createMockAsset('1', 'Characters'),
        createMockAsset('2', 'Characters'),
        createMockAsset('3', 'Characters/Townsfolk'),
        createMockAsset('4', 'Backgrounds'),
        createMockAsset('5', null),
      ];

      const paths = getAllFolderPaths(assets);
      expect(paths).toEqual(['Backgrounds', 'Characters', 'Characters/Townsfolk']);
    });
  });

  describe('deriveFolderTree', () => {
    it('should build tree from assets', () => {
      const assets = [
        createMockAsset('1', 'Characters'),
        createMockAsset('2', 'Characters/Townsfolk'),
        createMockAsset('3', 'Characters/Townsfolk'),
        createMockAsset('4', 'Characters/Outsiders'),
        createMockAsset('5', 'Backgrounds'),
      ];

      const tree = deriveFolderTree(assets);

      expect(tree).toHaveLength(2); // Characters, Backgrounds

      const chars = tree.find((n) => n.name === 'Characters');
      expect(chars).toBeDefined();
      expect(chars!.assetCount).toBe(1); // Direct children only
      expect(chars!.children).toHaveLength(2); // Townsfolk, Outsiders

      const townsfolk = chars!.children.find((n) => n.name === 'Townsfolk');
      expect(townsfolk).toBeDefined();
      expect(townsfolk!.assetCount).toBe(2);
      expect(townsfolk!.path).toBe('Characters/Townsfolk');
    });

    it('should return empty array for no folders', () => {
      const assets = [createMockAsset('1', null), createMockAsset('2', null)];

      expect(deriveFolderTree(assets)).toEqual([]);
    });
  });

  describe('getAssetsInFolder', () => {
    const assets = [
      createMockAsset('1', null),
      createMockAsset('2', 'Characters'),
      createMockAsset('3', 'Characters/Townsfolk'),
      createMockAsset('4', 'Characters/Townsfolk'),
      createMockAsset('5', 'Backgrounds'),
    ];

    it('should get assets in root folder', () => {
      const result = getAssetsInFolder(assets, null);
      expect(result.map((a) => a.id)).toEqual(['1']);
    });

    it('should get assets in specific folder (exact match)', () => {
      const result = getAssetsInFolder(assets, 'Characters');
      expect(result.map((a) => a.id)).toEqual(['2']);
    });

    it('should get assets including subfolders', () => {
      const result = getAssetsInFolder(assets, 'Characters', true);
      expect(result.map((a) => a.id)).toEqual(['2', '3', '4']);
    });
  });
});
