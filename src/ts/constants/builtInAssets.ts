/**
 * Built-in Decorative Assets
 *
 * Centralized definitions for all built-in decorative assets
 * (backgrounds, setup flowers, leaves) that ship with the application.
 *
 * @module ts/constants/builtInAssets
 */

import { CONFIG } from '../config.js';
import type { AssetType } from '../services/upload/types.js';

// ============================================================================
// Types
// ============================================================================

export interface BuiltInAsset {
  /** Unique identifier for the asset */
  id: string;
  /** Display label */
  label: string;
  /** Path to the asset image */
  src: string;
  /** Path to thumbnail (defaults to src if not provided) */
  thumbnail?: string;
  /** Asset type category */
  type: AssetType;
  /** Always 'builtin' for built-in assets */
  source: 'builtin';
}

// ============================================================================
// Built-in Token Backgrounds
// ============================================================================

export const BUILT_IN_BACKGROUNDS: BuiltInAsset[] = Array.from({ length: 7 }, (_, i) => ({
  id: `character_background_${i + 1}`,
  label: `Background ${i + 1}`,
  src: `${CONFIG.ASSETS.CHARACTER_BACKGROUNDS}character_background_${i + 1}.webp`,
  type: 'token-background' as AssetType,
  source: 'builtin' as const,
}));

// ============================================================================
// Built-in Setup Flowers
// ============================================================================

export const BUILT_IN_FLOWERS: BuiltInAsset[] = Array.from({ length: 7 }, (_, i) => ({
  id: `setup_flower_${i + 1}`,
  label: `Flower ${i + 1}`,
  src: `${CONFIG.ASSETS.SETUP_FLOWERS}setup_flower_${i + 1}.webp`,
  type: 'setup-flower' as AssetType,
  source: 'builtin' as const,
}));

// ============================================================================
// Built-in Leaf Styles
// ============================================================================

export const BUILT_IN_LEAVES: BuiltInAsset[] = [
  {
    id: 'classic',
    label: 'Classic',
    src: `${CONFIG.ASSETS.LEAVES}leaves/classic/leaf_1.webp`,
    type: 'leaf' as AssetType,
    source: 'builtin' as const,
  },
];

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get all built-in assets of a specific type
 */
export function getBuiltInAssets(type: AssetType): BuiltInAsset[] {
  switch (type) {
    case 'token-background':
      return BUILT_IN_BACKGROUNDS;
    case 'setup-flower':
      return BUILT_IN_FLOWERS;
    case 'leaf':
      return BUILT_IN_LEAVES;
    default:
      return [];
  }
}

/**
 * Check if a value represents a built-in asset
 */
export function isBuiltInAsset(value: string, type?: AssetType): boolean {
  if (!value || value === 'none') return false;

  const checkAssets = type
    ? getBuiltInAssets(type)
    : [...BUILT_IN_BACKGROUNDS, ...BUILT_IN_FLOWERS, ...BUILT_IN_LEAVES];

  return checkAssets.some((asset) => asset.id === value);
}

/**
 * Get the file path for a built-in asset by its ID
 */
export function getBuiltInAssetPath(id: string, type?: AssetType): string | null {
  const checkAssets = type
    ? getBuiltInAssets(type)
    : [...BUILT_IN_BACKGROUNDS, ...BUILT_IN_FLOWERS, ...BUILT_IN_LEAVES];

  const asset = checkAssets.find((a) => a.id === id);
  return asset?.src ?? null;
}

/**
 * Get a built-in asset by its ID
 */
export function getBuiltInAsset(id: string, type?: AssetType): BuiltInAsset | null {
  const checkAssets = type
    ? getBuiltInAssets(type)
    : [...BUILT_IN_BACKGROUNDS, ...BUILT_IN_FLOWERS, ...BUILT_IN_LEAVES];

  return checkAssets.find((a) => a.id === id) ?? null;
}

/**
 * Get the display label for an asset value (built-in or asset reference)
 */
export function getAssetLabel(value: string, type?: AssetType): string {
  if (!value || value === 'none') return 'None';

  const asset = getBuiltInAsset(value, type);
  if (asset) return asset.label;

  // For asset references, return a generic label
  // The actual label should be fetched from the asset manager
  return 'Custom Asset';
}
