/**
 * Asset Testing Utilities
 *
 * Mock factories and helpers for testing asset storage and management.
 * Provides fixtures for characters, assets, and IndexedDB operations.
 *
 * @module services/upload/__tests__/testUtils
 */

import { expect } from 'vitest';
import type { Character } from '../../../types/index.js';
import { createAssetReference } from '../../../types/index.js';
import type { AssetMetadata, AssetType, DBAsset } from '../types.js';

// ============================================================================
// Mock Asset Factories
// ============================================================================

/**
 * Create mock assets for testing.
 *
 * @param count - Number of assets to create
 * @param options - Optional configuration
 * @returns Array of mock assets
 *
 * @example
 * ```typescript
 * const assets = createMockAssets(10, {
 *   type: 'character-icon',
 *   projectId: 'test-project'
 * });
 * ```
 */
export function createMockAssets(
  count: number,
  options: {
    type?: AssetType;
    projectId?: string | null;
    linkedTo?: string[];
    scope?: 'project' | 'global';
  } = {}
): DBAsset[] {
  const { type = 'character-icon', projectId = null, linkedTo = [], scope = 'project' } = options;

  return Array.from({ length: count }, (_, i) => {
    const id = `mock-asset-${i}-${Date.now()}`;
    const now = Date.now();

    return {
      id,
      type,
      blob: new Blob([`mock-data-${i}`], { type: 'image/png' }),
      thumbnail: new Blob([`mock-thumbnail-${i}`], { type: 'image/png' }),
      projectId: scope === 'global' ? null : projectId || `project-${i % 3}`,
      linkedTo: [...linkedTo],
      metadata: {
        filename: `asset-${i}.png`,
        mimeType: 'image/png',
        size: 1024 * (i + 1),
        width: 540,
        height: 540,
        uploadedAt: now - i * 1000,
        sourceType: 'upload' as const,
      },
      lastUsedAt: now - i * 500,
      usageCount: i % 5,
    };
  });
}

/**
 * Create a single mock asset with custom properties.
 *
 * @param overrides - Properties to override
 * @returns Mock asset
 *
 * @example
 * ```typescript
 * const asset = createMockAsset({
 *   name: 'Custom Character Icon',
 *   type: 'character-icon'
 * });
 * ```
 */
export function createMockAsset(overrides: Partial<DBAsset> = {}): DBAsset {
  const id = overrides.id || `mock-asset-${Date.now()}`;
  const now = Date.now();

  const base: DBAsset = {
    id,
    type: 'character-icon',
    blob: new Blob(['mock-data'], { type: 'image/png' }),
    thumbnail: new Blob(['mock-thumbnail'], { type: 'image/png' }),
    projectId: null,
    linkedTo: [],
    metadata: {
      filename: 'asset.png',
      mimeType: 'image/png',
      size: 1024,
      width: 540,
      height: 540,
      uploadedAt: now,
      sourceType: 'upload' as const,
    },
    lastUsedAt: now,
    usageCount: 0,
  };

  return { ...base, ...overrides } as DBAsset;
}

/**
 * Create mock asset metadata.
 *
 * @param overrides - Properties to override
 * @returns Mock metadata
 */
export function createMockAssetMetadata(overrides: Partial<AssetMetadata> = {}): AssetMetadata {
  const base: AssetMetadata = {
    filename: 'mock-asset.png',
    mimeType: 'image/png',
    size: 1024,
    width: 540,
    height: 540,
    uploadedAt: Date.now(),
    sourceType: 'upload',
  };

  return { ...base, ...overrides };
}

// ============================================================================
// Mock Character Factories
// ============================================================================

/**
 * Create mock characters for testing.
 *
 * @param count - Number of characters to create
 * @param options - Optional configuration
 * @returns Array of mock characters
 *
 * @example
 * ```typescript
 * const characters = createMockCharacters(5, {
 *   team: 'townsfolk',
 *   useAssetReferences: true
 * });
 * ```
 */
export function createMockCharacters(
  count: number,
  options: {
    team?: 'townsfolk' | 'outsider' | 'minion' | 'demon';
    useAssetReferences?: boolean;
    assetIdPrefix?: string;
  } = {}
): Character[] {
  const { team = 'townsfolk', useAssetReferences = false, assetIdPrefix = 'asset' } = options;

  return Array.from({ length: count }, (_, i) => ({
    id: `mock-character-${i}`,
    name: `Mock Character ${i}`,
    team,
    ability: `Mock ability for character ${i}`,
    image: useAssetReferences
      ? createAssetReference(`${assetIdPrefix}-${i}`)
      : `https://example.com/character-${i}.png`,
    setup: i % 3 === 0,
    reminders: i % 2 === 0 ? [`Reminder ${i}`] : [],
    uuid: `uuid-${i}`,
    source: 'custom' as const,
  }));
}

/**
 * Create a single mock character with custom properties.
 *
 * @param overrides - Properties to override
 * @returns Mock character
 *
 * @example
 * ```typescript
 * const character = createMockCharacter({
 *   name: 'The Washerwoman',
 *   team: 'townsfolk',
 *   image: createAssetReference('asset-123')
 * });
 * ```
 */
export function createMockCharacter(overrides: Partial<Character> = {}): Character {
  const base: Character = {
    id: 'mock-character',
    name: 'Mock Character',
    team: 'townsfolk',
    ability: 'Mock ability',
    image: 'https://example.com/character.png',
    setup: false,
    reminders: [],
    uuid: `uuid-${Date.now()}`,
    source: 'custom',
  };

  return { ...base, ...overrides };
}

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create blob URLs from assets for testing.
 * Simulates AssetStorageService.getByIdWithUrl() behavior.
 *
 * @param assets - Assets to create URLs for
 * @returns Map of asset ID to blob URL
 *
 * @example
 * ```typescript
 * const assets = createMockAssets(5);
 * const urlMap = createMockBlobUrls(assets);
 * expect(urlMap.get(assets[0].id)).toMatch(/^blob:/);
 * ```
 */
export function createMockBlobUrls(assets: DBAsset[]): Map<string, string> {
  const map = new Map<string, string>();

  for (const asset of assets) {
    // Create actual blob URL for realistic testing
    const url = URL.createObjectURL(asset.blob);
    map.set(asset.id, url);
  }

  return map;
}

/**
 * Cleanup blob URLs created during tests.
 * Call in afterEach() to prevent memory leaks.
 *
 * @param urlMap - Map of blob URLs to revoke
 *
 * @example
 * ```typescript
 * let urlMap: Map<string, string>;
 *
 * afterEach(() => {
 *   cleanupMockBlobUrls(urlMap);
 * });
 * ```
 */
export function cleanupMockBlobUrls(urlMap: Map<string, string>): void {
  for (const url of urlMap.values()) {
    URL.revokeObjectURL(url);
  }
  urlMap.clear();
}

/**
 * Group assets by type.
 * Useful for testing type-specific operations.
 *
 * @param assets - Assets to group
 * @returns Map of asset type to assets
 *
 * @example
 * ```typescript
 * const assets = createMockAssets(10);
 * const grouped = groupAssetsByType(assets);
 * expect(grouped.get('character-icon')).toHaveLength(10);
 * ```
 */
export function groupAssetsByType(assets: DBAsset[]): Map<AssetType, DBAsset[]> {
  const groups = new Map<AssetType, DBAsset[]>();

  for (const asset of assets) {
    const group = groups.get(asset.type) || [];
    group.push(asset);
    groups.set(asset.type, group);
  }

  return groups;
}

/**
 * Filter assets by various criteria.
 *
 * @param assets - Assets to filter
 * @param criteria - Filter criteria
 * @returns Filtered assets
 *
 * @example
 * ```typescript
 * const orphaned = filterAssets(assets, { orphaned: true });
 * const old = filterAssets(assets, { olderThan: 90 }); // 90 days
 * ```
 */
export function filterAssets(
  assets: DBAsset[],
  criteria: {
    orphaned?: boolean;
    unused?: boolean;
    olderThan?: number; // days
    type?: AssetType;
    projectId?: string | null;
  }
): DBAsset[] {
  return assets.filter((asset) => {
    if (criteria.orphaned !== undefined) {
      const isOrphaned = asset.linkedTo.length === 0;
      if (isOrphaned !== criteria.orphaned) return false;
    }

    if (criteria.unused !== undefined) {
      const isUnused = (asset.usageCount || 0) === 0;
      if (isUnused !== criteria.unused) return false;
    }

    if (criteria.olderThan !== undefined) {
      const ageMs = Date.now() - (asset.lastUsedAt || asset.metadata.uploadedAt);
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      if (ageDays < criteria.olderThan) return false;
    }

    if (criteria.type !== undefined && asset.type !== criteria.type) {
      return false;
    }

    if (criteria.projectId !== undefined && asset.projectId !== criteria.projectId) {
      return false;
    }

    return true;
  });
}

/**
 * Calculate total storage size of assets.
 *
 * @param assets - Assets to calculate size for
 * @returns Total size in bytes
 *
 * @example
 * ```typescript
 * const assets = createMockAssets(100);
 * const totalSize = calculateAssetStorageSize(assets);
 * const totalMB = totalSize / (1024 * 1024);
 * ```
 */
export function calculateAssetStorageSize(assets: DBAsset[]): number {
  return assets.reduce((total, asset) => {
    return total + asset.metadata.size + (asset.thumbnail?.size || 0);
  }, 0);
}

/**
 * Create mock File objects for upload testing.
 *
 * @param count - Number of files to create
 * @param type - File type (default: 'image/png')
 * @returns Array of File objects
 *
 * @example
 * ```typescript
 * const files = createMockFiles(3, 'image/png');
 * // Simulate file upload
 * await uploadService.processFiles(files);
 * ```
 */
export function createMockFiles(count: number, type: string = 'image/png'): File[] {
  return Array.from({ length: count }, (_, i) => {
    const blob = new Blob([`mock-file-data-${i}`], { type });
    return new File([blob], `mock-file-${i}.png`, { type });
  });
}

/**
 * Wait for IndexedDB transaction to complete.
 * Useful for testing async database operations.
 *
 * @param ms - Milliseconds to wait (default: 50)
 * @returns Promise that resolves after delay
 *
 * @example
 * ```typescript
 * await assetService.save(asset);
 * await waitForDb(); // Let transaction complete
 * const saved = await assetService.getById(asset.id);
 * ```
 */
export async function waitForDb(ms: number = 50): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Assert that two assets are equal (ignoring blob data).
 * Useful for testing asset operations without comparing blobs.
 *
 * @param actual - Actual asset
 * @param expected - Expected asset
 * @throws If assets don't match
 *
 * @example
 * ```typescript
 * const saved = await assetService.getById(asset.id);
 * assertAssetsEqual(saved, asset);
 * ```
 */
export function assertAssetsEqual(actual: DBAsset, expected: DBAsset): void {
  const actualCopy = { ...actual, blob: undefined, thumbnail: undefined };
  const expectedCopy = { ...expected, blob: undefined, thumbnail: undefined };

  expect(actualCopy).toEqual(expectedCopy);
}
