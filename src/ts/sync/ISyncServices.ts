/**
 * Sync Services Interfaces
 *
 * Defines the contracts for data synchronization services.
 * These interfaces enable dependency injection and testing.
 *
 * @module sync/ISyncServices
 */

import type {
  CachedCharacter,
  Character,
  ExtractedPackage,
  GitHubAsset,
  GitHubRelease,
  StorageQuota,
  SyncStatus,
} from '@/ts/types/index.js';

// ============================================================================
// GitHub Release Client Interface
// ============================================================================

/**
 * Rate limit information from GitHub API headers
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  used: number;
}

/**
 * Client for fetching data from GitHub releases
 */
export interface IGitHubReleaseClient {
  /**
   * Fetch the latest release information
   * Uses ETag for conditional requests to save quota
   *
   * @param forceRefresh - Force a fresh fetch, ignoring ETag cache
   * @returns Latest release information, or null if not modified (304)
   */
  fetchLatestRelease(forceRefresh?: boolean): Promise<GitHubRelease | null>;

  /**
   * Download a ZIP asset from a GitHub release
   *
   * @param asset - The asset to download
   * @param onProgress - Optional progress callback (current bytes, total bytes)
   * @returns Blob containing the ZIP file
   */
  downloadAsset(
    asset: GitHubAsset,
    onProgress?: (current: number, total: number) => void
  ): Promise<Blob>;

  /**
   * Find a ZIP asset in a release
   *
   * @param release - GitHub release
   * @param pattern - Optional pattern to match (default: .zip)
   * @returns The ZIP asset or null if not found
   */
  findZipAsset(release: GitHubRelease, pattern?: string): GitHubAsset | null;

  /**
   * Get current rate limit information
   */
  getRateLimitInfo(): RateLimitInfo | null;

  /**
   * Clear the ETag cache (force fresh fetch on next request)
   */
  clearCache(): void;
}

// ============================================================================
// Storage Manager Interface
// ============================================================================

/**
 * Manager for persistent data storage using IndexedDB and Cache API
 */
export interface IStorageManager {
  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  /**
   * Initialize IndexedDB and Cache API
   * Safe to call multiple times - will only initialize once
   */
  initialize(): Promise<void>;

  /**
   * Close the database connection
   */
  close(): void;

  /**
   * Get database instance (for advanced operations)
   */
  getDatabase(): Promise<IDBDatabase>;

  // ---------------------------------------------------------------------------
  // Character Operations
  // ---------------------------------------------------------------------------

  /**
   * Store a single character in IndexedDB
   *
   * @param character - Character to store
   * @param version - Version string to tag the character with
   */
  storeCharacter(character: Character, version: string): Promise<void>;

  /**
   * Store multiple characters in a single transaction
   *
   * @param characters - Array of characters to store
   * @param version - Version string to tag characters with
   */
  storeCharacters(characters: Character[], version: string): Promise<void>;

  /**
   * Get a character by ID
   *
   * @param id - Character ID
   * @returns Character or null if not found
   */
  getCharacter(id: string): Promise<CachedCharacter | null>;

  /**
   * Get all characters
   *
   * @returns Array of all cached characters
   */
  getAllCharacters(): Promise<CachedCharacter[]>;

  /**
   * Search characters by name or ID (fuzzy match)
   *
   * @param query - Search query
   * @returns Array of matching characters
   */
  searchCharacters(query: string): Promise<CachedCharacter[]>;

  /**
   * Clear all characters from storage
   */
  clearCharacters(): Promise<void>;

  // ---------------------------------------------------------------------------
  // Metadata Operations
  // ---------------------------------------------------------------------------

  /**
   * Set a metadata value
   *
   * @param key - Metadata key
   * @param value - Metadata value
   */
  setMetadata(key: string, value: string | number | boolean): Promise<void>;

  /**
   * Get a metadata value
   *
   * @param key - Metadata key
   * @returns Metadata value or null if not found
   */
  getMetadata(key: string): Promise<string | number | boolean | null>;

  /**
   * Get all metadata
   *
   * @returns Map of all metadata key-value pairs
   */
  getAllMetadata(): Promise<Map<string, string | number | boolean>>;

  // ---------------------------------------------------------------------------
  // Settings Operations
  // ---------------------------------------------------------------------------

  /**
   * Set a setting value
   *
   * @param key - Setting key
   * @param value - Setting value
   */
  setSetting(key: string, value: unknown): Promise<void>;

  /**
   * Get a setting value
   *
   * @param key - Setting key
   * @returns Setting value or null if not found
   */
  getSetting(key: string): Promise<unknown>;

  // ---------------------------------------------------------------------------
  // Cache API Operations (Character Images)
  // ---------------------------------------------------------------------------

  /**
   * Cache a character image
   *
   * @param characterId - Character ID
   * @param imageBlob - Image blob (WebP format)
   */
  cacheImage(characterId: string, imageBlob: Blob): Promise<void>;

  /**
   * Get a cached character image
   *
   * @param characterId - Character ID
   * @returns Image blob or null if not cached
   */
  getImage(characterId: string): Promise<Blob | null>;

  /**
   * Clear all cached images
   */
  clearImageCache(): Promise<void>;

  // ---------------------------------------------------------------------------
  // Storage Quota Operations
  // ---------------------------------------------------------------------------

  /**
   * Get storage quota information
   */
  getStorageQuota(): Promise<StorageQuota>;

  /**
   * Check if storage is near quota limit
   *
   * @returns true if usage is above warning threshold
   */
  isNearQuota(): Promise<boolean>;

  /**
   * Check if storage is available for storing data
   *
   * @param requiredMB - Required space in MB
   * @returns true if enough space is available
   */
  hasSpace(requiredMB: number): Promise<boolean>;

  // ---------------------------------------------------------------------------
  // Utility Operations
  // ---------------------------------------------------------------------------

  /**
   * Clear all data (characters, metadata, settings, images)
   */
  clearAll(): Promise<void>;
}

// ============================================================================
// Package Extractor Interface
// ============================================================================

/**
 * Service for extracting and validating data packages
 */
export interface IPackageExtractor {
  /**
   * Extract a ZIP package containing character data and icons
   *
   * @param zipBlob - The ZIP file as a Blob
   * @returns Extracted package data
   */
  extract(zipBlob: Blob): Promise<ExtractedPackage>;

  /**
   * Verify the content hash of an extracted package
   *
   * @param pkg - The extracted package
   * @returns true if the content hash matches
   */
  verifyContentHash(pkg: ExtractedPackage): Promise<boolean>;
}

// ============================================================================
// Version Manager Interface
// ============================================================================

/**
 * Service for comparing and managing version strings
 */
export interface IVersionManager {
  /**
   * Parse a version string into components
   *
   * @param version - Version string (e.g., "v1.2.3" or "1.2.3")
   * @returns Parsed version object or null if invalid
   */
  parse(version: string): { major: number; minor: number; patch: number } | null;

  /**
   * Compare two version strings
   *
   * @param a - First version
   * @param b - Second version
   * @returns -1 if a < b, 0 if a == b, 1 if a > b
   */
  compare(a: string, b: string): number;

  /**
   * Check if version a is newer than version b
   */
  isNewer(a: string, b: string): boolean;

  /**
   * Check if version a is older than version b
   */
  isOlder(a: string, b: string): boolean;

  /**
   * Check if two versions are equal
   */
  isEqual(a: string, b: string): boolean;
}

// ============================================================================
// Data Sync Service Interface
// ============================================================================

/**
 * Sync event types
 */
export type SyncEventType =
  | 'initialized'
  | 'checking'
  | 'downloading'
  | 'extracting'
  | 'success'
  | 'error'
  | 'progress';

/**
 * Sync event data
 */
export interface SyncEvent {
  type: SyncEventType;
  status: SyncStatus;
  data?: {
    version?: string;
    progress?: { current: number; total: number };
    error?: Error;
  };
}

/**
 * Sync event listener
 */
export type SyncEventListener = (event: SyncEvent) => void;

/**
 * Main data synchronization service
 */
export interface IDataSyncService {
  /**
   * Initialize the sync service
   * - Initializes storage
   * - Loads cached data immediately (if available)
   * - Checks for updates in background (non-blocking)
   */
  initialize(): Promise<void>;

  /**
   * Check for updates from GitHub
   * Non-blocking - can be called independently
   *
   * @returns true if an update is available
   */
  checkForUpdates(): Promise<boolean>;

  /**
   * Download and install an update
   * Downloads ZIP, extracts, validates, and stores in IndexedDB
   */
  downloadAndInstall(): Promise<void>;

  /**
   * Get all characters from cache
   */
  getCharacters(): Promise<Character[]>;

  /**
   * Get a character by ID
   */
  getCharacter(id: string): Promise<Character | null>;

  /**
   * Search characters by name or ID
   */
  searchCharacters(query: string): Promise<Character[]>;

  /**
   * Get a character's image from the cache
   *
   * @param characterId - Character ID (e.g., 'washerwoman')
   * @returns Image blob or null if not cached
   */
  getCharacterImage(characterId: string): Promise<Blob | null>;

  /**
   * Check if a character image is cached
   *
   * @param characterId - Character ID
   * @returns true if image is cached
   */
  hasCharacterImage(characterId: string): Promise<boolean>;

  /**
   * Get current sync status
   */
  getStatus(): SyncStatus;

  /**
   * Clear all cached data and force re-download
   */
  clearCacheAndResync(): Promise<void>;

  /**
   * Stop periodic update checks
   */
  stopPeriodicUpdateChecks(): void;

  /**
   * Add event listener
   */
  addEventListener(listener: SyncEventListener): void;

  /**
   * Remove event listener
   */
  removeEventListener(listener: SyncEventListener): void;

  /**
   * Check if service is initialized
   */
  readonly initialized: boolean;
}

// ============================================================================
// Dependency Injection Types
// ============================================================================

/**
 * Dependencies for DataSyncService
 */
export interface DataSyncServiceDeps {
  storageManager: IStorageManager;
  githubReleaseClient: IGitHubReleaseClient;
  packageExtractor: IPackageExtractor;
}
