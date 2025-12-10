/**
 * File Upload Module - Constants
 *
 * Per-asset-type validation rules and configuration.
 *
 * @module services/upload/constants
 */

import type { AssetType, AssetTypeConfig } from './types.js';

// ============================================================================
// Size Constants
// ============================================================================

/** Bytes in a kilobyte */
export const KB = 1024;

/** Bytes in a megabyte */
export const MB = 1024 * KB;

// ============================================================================
// MIME Type Detection
// ============================================================================

/**
 * Magic bytes for common image formats
 * Used for MIME type detection beyond file extension
 */
export const MAGIC_BYTES: Record<string, Uint8Array> = {
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  'image/png': new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  // JPEG: FF D8 FF
  'image/jpeg': new Uint8Array([0xff, 0xd8, 0xff]),
  // WebP: 52 49 46 46 ... 57 45 42 50 (RIFF...WEBP)
  'image/webp': new Uint8Array([0x52, 0x49, 0x46, 0x46]),
  // GIF: 47 49 46 38
  'image/gif': new Uint8Array([0x47, 0x49, 0x46, 0x38]),
  // SVG: starts with '<' or '<?xml'
  'image/svg+xml': new Uint8Array([0x3c]),
};

/**
 * WebP secondary signature (at offset 8)
 */
export const WEBP_SIGNATURE = new Uint8Array([0x57, 0x45, 0x42, 0x50]);

// ============================================================================
// Asset Type Configurations
// ============================================================================

/**
 * Configuration for each asset type
 */
export const ASSET_TYPE_CONFIGS: Record<AssetType, AssetTypeConfig> = {
  'character-icon': {
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    allowedExtensions: ['.png', '.jpg', '.jpeg', '.webp'],
    maxSize: 5 * MB,
    minWidth: 200,
    maxWidth: 2048,
    minHeight: 200,
    maxHeight: 2048,
    requireSquare: false, // Prefer square but don't require
    requireTransparency: false,
    targetWidth: 540,
    targetHeight: 540,
    thumbnailSize: 128,
  },

  'token-background': {
    allowedMimeTypes: ['image/png', 'image/webp'],
    allowedExtensions: ['.png', '.webp'],
    maxSize: 10 * MB,
    minWidth: 540,
    maxWidth: 4096,
    minHeight: 540,
    maxHeight: 4096,
    requireSquare: true,
    requireTransparency: true,
    thumbnailSize: 128,
  },

  'script-background': {
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    allowedExtensions: ['.png', '.jpg', '.jpeg', '.webp'],
    maxSize: 20 * MB,
    minWidth: 1920,
    maxWidth: 8192,
    minHeight: 1080,
    maxHeight: 8192,
    requireSquare: false,
    requireTransparency: false,
    thumbnailSize: 128,
  },

  'setup-flower': {
    allowedMimeTypes: ['image/png', 'image/webp'],
    allowedExtensions: ['.png', '.webp'],
    maxSize: 5 * MB,
    minWidth: 200,
    maxWidth: 2048,
    minHeight: 200,
    maxHeight: 2048,
    requireSquare: true,
    requireTransparency: true,
    thumbnailSize: 128,
  },

  'leaf': {
    allowedMimeTypes: ['image/png', 'image/webp'],
    allowedExtensions: ['.png', '.webp'],
    maxSize: 1 * MB,
    minWidth: 50,
    maxWidth: 512,
    minHeight: 25,
    maxHeight: 256,
    requireSquare: false,
    requireTransparency: true,
    thumbnailSize: 64,
  },

  'logo': {
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
    allowedExtensions: ['.png', '.jpg', '.jpeg', '.webp', '.svg'],
    maxSize: 2 * MB,
    minWidth: 64,
    maxWidth: 4096,
    minHeight: 64,
    maxHeight: 4096,
    requireSquare: false,
    requireTransparency: false,
    thumbnailSize: 128,
  },
};

// ============================================================================
// Default Configuration
// ============================================================================

/**
 * Default thumbnail size if not specified
 */
export const DEFAULT_THUMBNAIL_SIZE = 128;

/**
 * Maximum thumbnail quality (0-1)
 */
export const THUMBNAIL_QUALITY = 0.8;

/**
 * Output format for processed images
 */
export const PROCESSED_IMAGE_FORMAT = 'image/webp';

/**
 * Output quality for processed images (0-1)
 */
export const PROCESSED_IMAGE_QUALITY = 0.9;

// ============================================================================
// ZIP Export Paths
// ============================================================================

/**
 * Folder paths in ZIP export for each asset type
 */
export const ASSET_ZIP_PATHS: Record<AssetType, string> = {
  'character-icon': 'assets/character-icons/',
  'token-background': 'assets/token-backgrounds/',
  'script-background': 'assets/script-backgrounds/',
  'setup-flower': 'assets/setup-flowers/',
  'leaf': 'assets/leaves/',
  'logo': 'assets/logos/',
};

// ============================================================================
// UI Labels
// ============================================================================

/**
 * Human-readable labels for asset types
 */
export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  'character-icon': 'Character Icon',
  'token-background': 'Token Background',
  'script-background': 'Script Background',
  'setup-flower': 'Setup Flower',
  'leaf': 'Leaf',
  'logo': 'Logo',
};

/**
 * Plural labels for asset types
 */
export const ASSET_TYPE_LABELS_PLURAL: Record<AssetType, string> = {
  'character-icon': 'Character Icons',
  'token-background': 'Token Backgrounds',
  'script-background': 'Script Backgrounds',
  'setup-flower': 'Setup Flowers',
  'leaf': 'Leaves',
  'logo': 'Logos',
};

/**
 * Icons for asset types (emoji or icon class)
 */
export const ASSET_TYPE_ICONS: Record<AssetType, string> = {
  'character-icon': '👤',
  'token-background': '🎨',
  'script-background': '📜',
  'setup-flower': '🌸',
  'leaf': '🍃',
  'logo': '🏷️',
};
