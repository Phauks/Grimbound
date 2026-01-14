/**
 * Built-in Decorative Assets
 *
 * Centralized definitions for all built-in decorative assets
 * (backgrounds, setup flowers, leaves) that ship with the application.
 *
 * @module ts/constants/builtInAssets
 */

import { CONFIG } from '@/ts/config.js';
import type { TypeTagValue } from '@/ts/services/upload/tagUtils.js';
import type { AssetType } from '@/ts/services/upload/types.js';

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

export const BUILT_IN_BACKGROUNDS: BuiltInAsset[] = Array.from({ length: 9 }, (_, i) => ({
  id: `character_background_${i + 1}`,
  label: `Background ${i + 1}`,
  src: `${CONFIG.ASSETS.CHARACTER_BACKGROUNDS}character_background_${i + 1}.webp`,
  type: 'token-background' as AssetType,
  source: 'builtin' as const,
}));

// ============================================================================
// Built-in Setup Overlays
// ============================================================================

export const BUILT_IN_SETUP_OVERLAYS: BuiltInAsset[] = Array.from({ length: 7 }, (_, i) => ({
  id: `setup_flower_${i + 1}`,
  label: `Setup ${i + 1}`,
  src: `${CONFIG.ASSETS.SETUP_OVERLAYS}setup_flower_${i + 1}.webp`,
  type: 'setup-overlay' as AssetType,
  source: 'builtin' as const,
}));

// ============================================================================
// Built-in Script Backgrounds
// ============================================================================

export const BUILT_IN_SCRIPT_BACKGROUNDS: BuiltInAsset[] = [
  {
    id: 'script_background_1',
    label: 'Script Background 1',
    src: `${CONFIG.ASSETS.SCRIPT_BACKGROUNDS}script_background_1.webp`,
    type: 'script-background' as AssetType,
    source: 'builtin' as const,
  },
];

// ============================================================================
// Built-in Accent Styles
// ============================================================================

export const BUILT_IN_ACCENTS: BuiltInAsset[] = [
  {
    id: 'classic',
    label: 'Classic',
    src: `${CONFIG.ASSETS.ACCENTS}leaves/classic/leaf_1.webp`,
    type: 'accent' as AssetType,
    source: 'builtin' as const,
  },
];

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get all built-in assets of a specific type
 * Accepts both legacy AssetType and new TypeTagValue
 */
export function getBuiltInAssets(type: AssetType | TypeTagValue): BuiltInAsset[] {
  switch (type) {
    case 'token-background':
      return BUILT_IN_BACKGROUNDS;
    case 'setup-overlay':
    case 'setup': // TypeTagValue
      return BUILT_IN_SETUP_OVERLAYS;
    case 'script-background':
      return BUILT_IN_SCRIPT_BACKGROUNDS;
    case 'accent':
      return BUILT_IN_ACCENTS;
    default:
      return [];
  }
}

/**
 * Check if a value represents a built-in asset
 * Accepts both legacy AssetType and new TypeTagValue
 */
export function isBuiltInAsset(value: string, type?: AssetType | TypeTagValue): boolean {
  if (!value || value === 'none') return false;

  const checkAssets = type
    ? getBuiltInAssets(type)
    : [
        ...BUILT_IN_BACKGROUNDS,
        ...BUILT_IN_SETUP_OVERLAYS,
        ...BUILT_IN_SCRIPT_BACKGROUNDS,
        ...BUILT_IN_ACCENTS,
      ];

  return checkAssets.some((asset) => asset.id === value);
}

/**
 * Get the file path for a built-in asset by its ID
 * Accepts both legacy AssetType and new TypeTagValue
 */
export function getBuiltInAssetPath(id: string, type?: AssetType | TypeTagValue): string | null {
  const checkAssets = type
    ? getBuiltInAssets(type)
    : [
        ...BUILT_IN_BACKGROUNDS,
        ...BUILT_IN_SETUP_OVERLAYS,
        ...BUILT_IN_SCRIPT_BACKGROUNDS,
        ...BUILT_IN_ACCENTS,
      ];

  const asset = checkAssets.find((a) => a.id === id);
  return asset?.src ?? null;
}

/**
 * Get a built-in asset by its ID
 * Accepts both legacy AssetType and new TypeTagValue
 */
export function getBuiltInAsset(id: string, type?: AssetType | TypeTagValue): BuiltInAsset | null {
  const checkAssets = type
    ? getBuiltInAssets(type)
    : [
        ...BUILT_IN_BACKGROUNDS,
        ...BUILT_IN_SETUP_OVERLAYS,
        ...BUILT_IN_SCRIPT_BACKGROUNDS,
        ...BUILT_IN_ACCENTS,
      ];

  return checkAssets.find((a) => a.id === id) ?? null;
}

/**
 * Get the display label for an asset value (built-in or asset reference)
 * Accepts both legacy AssetType and new TypeTagValue
 */
export function getAssetLabel(value: string, type?: AssetType | TypeTagValue): string {
  if (!value || value === 'none') return 'None';

  const asset = getBuiltInAsset(value, type);
  if (asset) return asset.label;

  // For asset references, return a generic label
  // The actual label should be fetched from the asset manager
  return 'Custom Asset';
}

// ============================================================================
// Virtual Folder Structure for Built-in Assets
// ============================================================================

/** Prefix for built-in virtual folders */
export const BUILTIN_FOLDER_PREFIX = '__builtin__';

/** Built-in virtual folder definitions */
export const BUILTIN_FOLDERS = {
  BACKGROUNDS: `${BUILTIN_FOLDER_PREFIX}/Backgrounds`,
  SETUP_OVERLAYS: `${BUILTIN_FOLDER_PREFIX}/Setup Overlays`,
  SCRIPT_BACKGROUNDS: `${BUILTIN_FOLDER_PREFIX}/Script Backgrounds`,
  ACCENTS: `${BUILTIN_FOLDER_PREFIX}/Accents`,
} as const;

/** All built-in virtual folder paths */
export const ALL_BUILTIN_FOLDERS = [
  BUILTIN_FOLDERS.BACKGROUNDS,
  BUILTIN_FOLDERS.SETUP_OVERLAYS,
  BUILTIN_FOLDERS.SCRIPT_BACKGROUNDS,
  BUILTIN_FOLDERS.ACCENTS,
] as const;

/**
 * Check if a folder path is a built-in virtual folder
 */
export function isBuiltInFolder(folder: string | null): boolean {
  if (!folder) return false;
  return folder.startsWith(BUILTIN_FOLDER_PREFIX);
}

/**
 * Get built-in assets for a virtual folder path
 */
export function getBuiltInAssetsForFolder(folder: string): BuiltInAsset[] {
  switch (folder) {
    case BUILTIN_FOLDERS.BACKGROUNDS:
      return BUILT_IN_BACKGROUNDS;
    case BUILTIN_FOLDERS.SETUP_OVERLAYS:
      return BUILT_IN_SETUP_OVERLAYS;
    case BUILTIN_FOLDERS.SCRIPT_BACKGROUNDS:
      return BUILT_IN_SCRIPT_BACKGROUNDS;
    case BUILTIN_FOLDERS.ACCENTS:
      return BUILT_IN_ACCENTS;
    default:
      return [];
  }
}
