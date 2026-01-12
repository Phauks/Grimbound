import { describe, expect, it } from 'vitest';
import {
  addTagToAll,
  analyzeSelectionTags,
  removeTagFromAll,
} from '@/ts/services/upload/batchTagUtils.js';

// Mock asset type with tags field
interface MockAsset {
  id: string;
  tags: string[];
}

const createMockAsset = (id: string, tags: string[]): MockAsset => ({
  id,
  tags,
});

describe('batchTagUtils', () => {
  describe('analyzeSelectionTags', () => {
    it('should identify common tags (present in all)', () => {
      const assets = [
        createMockAsset('1', ['type:icon', 'homebrew']),
        createMockAsset('2', ['type:icon', 'homebrew', 'starred']),
        createMockAsset('3', ['type:icon', 'homebrew']),
      ];

      const result = analyzeSelectionTags(assets);

      expect(result.common).toContain('type:icon');
      expect(result.common).toContain('homebrew');
      expect(result.common).not.toContain('starred');
    });

    it('should identify partial tags with counts', () => {
      const assets = [
        createMockAsset('1', ['type:icon', 'starred']),
        createMockAsset('2', ['type:icon', 'starred']),
        createMockAsset('3', ['type:icon']),
      ];

      const result = analyzeSelectionTags(assets);

      expect(result.partial.get('starred')).toBe(2);
    });

    it('should return all unique tags', () => {
      const assets = [
        createMockAsset('1', ['type:icon', 'a']),
        createMockAsset('2', ['type:icon', 'b']),
        createMockAsset('3', ['type:icon', 'c']),
      ];

      const result = analyzeSelectionTags(assets);

      expect(result.all).toContain('type:icon');
      expect(result.all).toContain('a');
      expect(result.all).toContain('b');
      expect(result.all).toContain('c');
    });

    it('should handle empty selection', () => {
      const result = analyzeSelectionTags([]);

      expect(result.common).toEqual([]);
      expect(result.partial.size).toBe(0);
      expect(result.all).toEqual([]);
    });

    it('should handle single asset', () => {
      const assets = [createMockAsset('1', ['type:icon', 'starred'])];

      const result = analyzeSelectionTags(assets);

      expect(result.common).toEqual(['type:icon', 'starred']);
      expect(result.partial.size).toBe(0);
    });
  });

  describe('addTagToAll', () => {
    it('should add tag to all assets', () => {
      const assets = [
        createMockAsset('1', ['type:icon']),
        createMockAsset('2', ['type:icon', 'starred']),
      ];

      const result = addTagToAll(assets, 'homebrew');

      expect(result[0].tags).toContain('homebrew');
      expect(result[1].tags).toContain('homebrew');
    });

    it('should not duplicate existing tags', () => {
      const assets = [createMockAsset('1', ['type:icon', 'homebrew'])];

      const result = addTagToAll(assets, 'homebrew');

      expect(result[0].tags.filter((t) => t === 'homebrew')).toHaveLength(1);
    });

    it('should not mutate original assets', () => {
      const assets = [createMockAsset('1', ['type:icon'])];
      const originalTags = [...assets[0].tags];

      addTagToAll(assets, 'homebrew');

      expect(assets[0].tags).toEqual(originalTags);
    });
  });

  describe('removeTagFromAll', () => {
    it('should remove tag from all assets', () => {
      const assets = [
        createMockAsset('1', ['type:icon', 'starred']),
        createMockAsset('2', ['type:icon', 'starred']),
      ];

      const result = removeTagFromAll(assets, 'starred');

      expect(result[0].tags).not.toContain('starred');
      expect(result[1].tags).not.toContain('starred');
    });

    it('should handle assets without the tag', () => {
      const assets = [
        createMockAsset('1', ['type:icon', 'starred']),
        createMockAsset('2', ['type:icon']),
      ];

      const result = removeTagFromAll(assets, 'starred');

      expect(result[0].tags).not.toContain('starred');
      expect(result[1].tags).toEqual(['type:icon']);
    });

    it('should not mutate original assets', () => {
      const assets = [createMockAsset('1', ['type:icon', 'starred'])];
      const originalTags = [...assets[0].tags];

      removeTagFromAll(assets, 'starred');

      expect(assets[0].tags).toEqual(originalTags);
    });
  });
});
