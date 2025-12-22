/**
 * Project Management Type Definitions
 *
 * These types define the data structures for the local-first project management system.
 * Projects are stored in IndexedDB and can be exported/imported as ZIP files.
 *
 * @module types/project
 */

import type {
  Character,
  CharacterMetadata,
  GenerationOptions,
  ScriptMeta,
  Token,
} from './index.js';

// ============================================================================
// Project Entity
// ============================================================================

/**
 * Main project entity representing a complete saved state
 */
export interface Project {
  // Identifiers
  id: string; // UUID v4
  name: string; // User-friendly name
  description?: string; // Optional description
  privateNotes?: string; // Private notes (not exported)

  // Project content metadata
  gameplay?: string; // Gameplay style description
  difficulty?: string; // Difficulty level
  storytellerTips?: string; // Tips for running the script
  changelog?: string; // Version history

  // Timestamps
  createdAt: number; // Unix timestamp (ms)
  lastModifiedAt: number; // Unix timestamp (ms)
  lastAccessedAt: number; // Unix timestamp (ms)

  // Visual metadata
  thumbnail: ProjectThumbnail; // Thumbnail configuration
  tags?: string[]; // User-defined tags
  color?: string; // Hex color for card badge

  // Application state snapshot
  state: ProjectState; // Complete app state

  // Statistics
  stats: ProjectStats; // Computed statistics

  // Versioning
  schemaVersion: number; // For migrations (current: 1)

  // Cloud sync (future)
  cloudSync?: CloudSyncMetadata; // Reserved for v2.0
}

// ============================================================================
// Project State
// ============================================================================

/**
 * Complete application state snapshot
 */
export interface ProjectState {
  // Script data
  jsonInput: string; // Raw JSON input
  characters: Character[]; // Parsed characters
  scriptMeta: ScriptMeta | null; // Script metadata (_meta)

  // Character metadata (decorative overrides, etc.)
  characterMetadata: Record<string, CharacterMetadata>;

  // Generation options
  generationOptions: GenerationOptions; // Token generation settings

  // Custom character icons
  customIcons: CustomIconMetadata[]; // User-uploaded icons

  // Filter state (optional - can reset to defaults)
  filters?: ProjectFilters;

  // Generated tokens (for cache warming, not persisted to IndexedDB)
  tokens?: Token[];

  // Schema version
  schemaVersion: number; // Current: 1
}

// Note: CharacterMetadata and GenerationOptions are imported from the main types file to avoid duplication
// Re-export CharacterMetadata for backward compatibility
export type { CharacterMetadata };

/**
 * UI filter state
 */
export interface ProjectFilters {
  teams: string[];
  tokenTypes: string[];
  display: string[];
  reminders: string[];
}

// ============================================================================
// Custom Icons
// ============================================================================

/**
 * Custom character icon metadata
 */
export interface CustomIconMetadata {
  characterId: string; // Character UUID or ID
  characterName: string; // For display
  filename: string; // Filename in ZIP (e.g., "imp.webp")
  source: 'uploaded' | 'url' | 'official-override';

  // Storage
  dataUrl?: string; // Base64 for in-memory (not exported to ZIP)
  storedInIndexedDB: boolean; // Whether icon is in DB

  // Metadata
  fileSize?: number; // Bytes
  mimeType?: string; // 'image/webp', 'image/png', etc.
  lastModified?: number; // Timestamp
}

/**
 * Custom icon blob storage (for IndexedDB)
 */
export interface CustomIcon {
  characterId: string; // Primary key
  projectId: string; // Which project owns this
  characterName: string;
  filename: string;
  blob: Blob; // Actual image data
  mimeType: string;
  fileSize: number;
  uploadedAt: number;
}

// ============================================================================
// Thumbnails
// ============================================================================

/**
 * Project thumbnail type
 */
export type ThumbnailType = 'auto' | 'token' | 'script-name' | 'script-logo' | 'custom';

/**
 * Project thumbnail configuration
 */
export interface ProjectThumbnail {
  type: ThumbnailType;

  // Auto-generated from first token
  auto?: {
    dataUrl: string; // Base64 data URL
    generatedAt: number; // Timestamp
  };

  // User-selected token thumbnail
  token?: {
    characterId: string;
    characterName: string;
    tokenType: 'character' | 'reminder';
    dataUrl: string;
  };

  // Text-based script name thumbnail
  scriptName?: {
    scriptName: string;
    dataUrl: string; // Generated text thumbnail
    generatedAt: number;
  };

  // Script logo as thumbnail
  scriptLogo?: {
    logoUrl: string; // Original URL
    scriptName: string;
    dataUrl: string; // Cached/resized version
  };

  // Custom uploaded image
  custom?: {
    filename: string;
    dataUrl: string;
    uploadedAt: number;
  };
}

// ============================================================================
// Statistics
// ============================================================================

/**
 * Project statistics (computed values)
 */
export interface ProjectStats {
  characterCount: number;
  tokenCount: number; // Generated tokens
  reminderCount: number;
  customIconCount: number;
  presetCount: number;
  lastGeneratedAt?: number; // Last token generation
}

// ============================================================================
// Cloud Sync (Future - v2.0)
// ============================================================================

/**
 * Cloud sync metadata (reserved for future use)
 */
export interface CloudSyncMetadata {
  syncEnabled: boolean;
  lastSyncedAt?: number;
  syncId?: string; // Server-side ID
  conflictState?: 'none' | 'local-newer' | 'remote-newer' | 'diverged';
  lastSyncHash?: string; // For conflict detection
}

// ============================================================================
// Auto-Save
// ============================================================================

/**
 * Auto-save snapshot for recovery
 */
export interface AutoSaveSnapshot {
  id: string; // UUID
  projectId: string; // Which project
  timestamp: number; // When saved
  stateSnapshot: ProjectState; // Full state
}

// ============================================================================
// Project Versioning
// ============================================================================

/**
 * Manual project version (semantic versioning milestone)
 */
export interface ProjectVersion {
  // Primary identifiers
  id: string; // UUID for this version
  projectId: string; // Parent project ID

  // Version information
  versionNumber: string; // Semantic version (e.g., "1.2.0")
  versionMajor: number; // Major version (for sorting/comparison)
  versionMinor: number; // Minor version
  versionPatch: number; // Patch version (default 0)

  // Content snapshot
  stateSnapshot: ProjectState; // Full project state at version creation

  // Metadata
  createdAt: number; // Unix timestamp (ms)
  releaseNotes?: string; // User-provided changelog/description
  tags?: string[]; // Optional tags (e.g., ["alpha", "stable"])

  // Future publishing fields (placeholders, not implemented yet)
  isPublished?: boolean; // True if shared to network
  publishedAt?: number; // Timestamp of publication
  downloadCount?: number; // How many times downloaded
  networkId?: string; // Unique ID on shared network
}

/**
 * Version increment type for semantic versioning
 */
export type VersionIncrementType = 'major' | 'minor' | 'patch';

/**
 * Auto-save status indicator
 */
export interface AutoSaveStatus {
  state: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedAt?: number; // Timestamp
  error?: string; // Error message if failed
  isDirty: boolean; // Has unsaved changes
}

// ============================================================================
// Service Options
// ============================================================================

/**
 * Options for creating a new project
 */
export interface CreateProjectOptions {
  name: string;
  description?: string;
  tags?: string[];
  color?: string;
  thumbnailType?: ProjectThumbnail['type'];
  state?: Partial<ProjectState>; // Can provide partial state
}

/**
 * Options for listing projects
 */
export interface ListProjectsOptions {
  sortBy?: 'name' | 'createdAt' | 'lastModifiedAt' | 'lastAccessedAt';
  sortOrder?: 'asc' | 'desc';
  filter?: {
    tags?: string[];
    searchQuery?: string; // Search in name/description
  };
  limit?: number;
  offset?: number;
}

/**
 * Options for exporting a project
 */
export interface ExportOptions {
  includeAssets?: boolean; // Default: true - Include assets in export
  includeUnusedAssets?: boolean; // Default: true - Include assets with usageCount === 0
  includeThumbnail?: boolean; // Default: true
  compressImages?: boolean; // Default: false (future)
  includeCustomIcons?: boolean; // Default: true - Include custom character icons
}

// ============================================================================
// Import/Export
// ============================================================================

/**
 * ZIP package manifest
 */
export interface ProjectManifest {
  format: string; // "blood-on-the-clocktower-project-package"
  formatVersion: string; // "1.0.0"
  generator: string; // "BotC Token Generator"
  generatorVersion: string; // App version
  generatorUrl: string; // App URL
  exportedAt: string; // ISO 8601 timestamp

  files: {
    projectData: string; // "project.json"
    thumbnail?: string; // "thumbnail.png"
    customIcons: string[]; // ["icons/imp.webp", ...]
  };

  stats: {
    totalSizeBytes: number;
    uncompressedBytes: number;
    compressionRatio: number;
    iconCount: number;
    characterCount: number;
  };

  compatibility: {
    minGeneratorVersion: string; // Minimum app version needed
    schemaVersion: number; // Data schema version
  };
}

/**
 * Validation result for imports
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Preview data for import
 */
export interface ProjectPreview {
  name: string;
  description?: string;
  characterCount: number;
  customIconCount: number;
  thumbnailDataUrl?: string;
  tags?: string[];
  estimatedSizeBytes: number;
  manifest: ProjectManifest;
}

// ============================================================================
// Storage
// ============================================================================

/**
 * Storage quota information
 */
export interface StorageQuota {
  usage: number; // Bytes used
  quota: number; // Bytes available
  usageMB: number; // MB used
  quotaMB: number; // MB available
  percentUsed: number; // Percentage (0-100)
}

// ============================================================================
// Database Entities (for IndexedDB)
// ============================================================================

/**
 * Project entity as stored in IndexedDB
 */
export interface DBProject {
  id: string; // Primary key
  name: string;
  description?: string;
  createdAt: number;
  lastModifiedAt: number;
  lastAccessedAt: number;
  thumbnailDataUrl: string; // Stored as data URL
  thumbnailConfig: ProjectThumbnail; // Full config
  tags: string[];
  color?: string;
  stateJson: string; // JSON.stringify(ProjectState)
  stats: ProjectStats;
  schemaVersion: number;
}

/**
 * Custom icon entity as stored in IndexedDB
 */
export interface DBCustomIcon {
  id: string; // Primary key (UUID)
  characterId: string; // Indexed
  projectId: string; // Indexed
  characterName: string;
  filename: string;
  dataUrl: string; // Base64 data URL
  mimeType: string;
  fileSize: number;
  uploadedAt: number;
}

/**
 * Auto-save snapshot entity as stored in IndexedDB
 */
export interface DBAutoSaveSnapshot {
  id: string; // Primary key (UUID)
  projectId: string; // Indexed
  timestamp: number; // Indexed
  stateJson: string; // JSON.stringify(ProjectState)
}

/**
 * Project version entity as stored in IndexedDB
 */
export interface DBProjectVersion {
  id: string; // Primary key (UUID)
  projectId: string; // Indexed
  versionNumber: string; // Semantic version
  versionMajor: number; // Indexed (compound with versionMinor)
  versionMinor: number; // Indexed (compound with versionMajor)
  versionPatch: number; // Patch version
  stateJson: string; // JSON.stringify(ProjectState)
  createdAt: number; // Indexed
  releaseNotes?: string; // Optional changelog
  tags?: string[]; // Optional tags
  isPublished?: boolean; // Future: publication status
  publishedAt?: number; // Future: publication timestamp
  downloadCount?: number; // Future: download count
  networkId?: string; // Future: network ID
}
