/**
 * File Upload Module - Constants
 *
 * Per-asset-type validation rules and configuration.
 * Uses tag-based categorization system (type:* tags).
 *
 * @module services/upload/constants
 */

import { getTypeFromTags, type TypeTagValue } from './tagUtils.js';
import type { AssetTypeConfig } from './types.js';

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
// Tag-Based Asset Type Configurations
// ============================================================================

/**
 * Configuration for each asset type tag
 * Keys are TypeTagValue (e.g., 'icon', 'token-background')
 */
export const TAG_TYPE_CONFIGS: Record<TypeTagValue, AssetTypeConfig> = {
  icon: {
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
    thumbnailSize: 128, // Standard grid display
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
    thumbnailSize: 256, // Larger - needs detail for background preview
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
    thumbnailSize: 512, // Large - high-res preview needed for layout assessment
  },

  setup: {
    allowedMimeTypes: ['image/png', 'image/webp'],
    allowedExtensions: ['.png', '.webp'],
    maxSize: 5 * MB,
    minWidth: 200,
    maxWidth: 2048,
    minHeight: 200,
    maxHeight: 2048,
    requireSquare: true,
    requireTransparency: true,
    thumbnailSize: 128, // Standard size for setup tokens
  },

  accent: {
    allowedMimeTypes: ['image/png', 'image/webp'],
    allowedExtensions: ['.png', '.webp'],
    maxSize: 1 * MB,
    minWidth: 50,
    maxWidth: 512,
    minHeight: 25,
    maxHeight: 256,
    requireSquare: false,
    requireTransparency: true,
    thumbnailSize: 64, // Small decorative element
  },

  logo: {
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
    allowedExtensions: ['.png', '.jpg', '.jpeg', '.webp', '.svg'],
    maxSize: 2 * MB,
    minWidth: 64,
    maxWidth: 4096,
    minHeight: 64,
    maxHeight: 4096,
    requireSquare: false,
    requireTransparency: false,
    thumbnailSize: 96, // Small-medium UI element
  },

  'studio-icon': {
    allowedMimeTypes: ['image/png', 'image/webp'],
    allowedExtensions: ['.png', '.webp'],
    maxSize: 10 * MB,
    minWidth: 200,
    maxWidth: 4096,
    minHeight: 200,
    maxHeight: 4096,
    requireSquare: false,
    requireTransparency: true,
    thumbnailSize: 128, // Standard grid display like character-icon
  },

  'studio-logo': {
    allowedMimeTypes: ['image/png', 'image/webp'],
    allowedExtensions: ['.png', '.webp'],
    maxSize: 5 * MB,
    minWidth: 64,
    maxWidth: 4096,
    minHeight: 64,
    maxHeight: 4096,
    requireSquare: false,
    requireTransparency: true,
    thumbnailSize: 96, // Similar to logo
  },

  'studio-project': {
    allowedMimeTypes: ['image/png', 'image/webp'],
    allowedExtensions: ['.png', '.webp'],
    maxSize: 50 * MB, // Large multi-layer projects
    minWidth: 200,
    maxWidth: 8192,
    minHeight: 200,
    maxHeight: 8192,
    requireSquare: false,
    requireTransparency: true,
    thumbnailSize: 256, // Larger for better layer preview
  },
};

// ============================================================================
// Config Lookup Helpers
// ============================================================================

/**
 * Get configuration for an asset by its tags array
 * @returns Config for the type tag, or undefined if no valid type tag
 */
export const getConfigByTags = (tags: string[]): AssetTypeConfig | undefined => {
  const type = getTypeFromTags(tags);
  return type ? TAG_TYPE_CONFIGS[type] : undefined;
};

/**
 * Get configuration for an asset type tag value
 */
export const getConfigByType = (type: TypeTagValue): AssetTypeConfig => TAG_TYPE_CONFIGS[type];

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
 * Folder paths in ZIP export for each asset type tag
 */
export const TAG_ZIP_PATHS: Record<TypeTagValue, string> = {
  icon: 'assets/icons/',
  'token-background': 'assets/token-backgrounds/',
  'script-background': 'assets/script-backgrounds/',
  setup: 'assets/setup-overlays/',
  accent: 'assets/accents/',
  logo: 'assets/logos/',
  'studio-icon': 'assets/studio-icons/',
  'studio-logo': 'assets/studio-logos/',
  'studio-project': 'assets/studio-projects/',
};

/**
 * Get ZIP path for an asset by its tags
 */
export const getZipPathByTags = (tags: string[]): string | undefined => {
  const type = getTypeFromTags(tags);
  return type ? TAG_ZIP_PATHS[type] : undefined;
};

// ============================================================================
// UI Labels
// ============================================================================

/**
 * Plural labels for asset type tags
 */
export const TAG_TYPE_LABELS_PLURAL: Record<TypeTagValue, string> = {
  icon: 'Icons',
  'token-background': 'Token Backgrounds',
  'script-background': 'Script Backgrounds',
  setup: 'Setup Overlays',
  accent: 'Accents',
  logo: 'Logos',
  'studio-icon': 'Studio Icons',
  'studio-logo': 'Studio Logos',
  'studio-project': 'Studio Projects',
};

/**
 * Icons for asset type tags (emoji)
 */
export const TAG_TYPE_ICONS: Record<TypeTagValue, string> = {
  icon: '👤',
  'token-background': '🎨',
  'script-background': '📜',
  setup: '✨',
  accent: '🍃',
  logo: '🏷️',
  'studio-icon': '✨',
  'studio-logo': '🎭',
  'studio-project': '📦',
};
