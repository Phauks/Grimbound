/**
 * Blood on the Clocktower Token Generator
 * Data Sync Service - Main orchestrator for GitHub release synchronization
 *
 * Features:
 * - Initialize storage on app load
 * - Load cached data immediately (non-blocking)
 * - Background update checks
 * - Download → Extract → Store pipeline
 * - Event emission for UI updates
 * - Graceful error handling with fallback
 */

import CONFIG from '../config.js';
import type {
    Character,
    CachedCharacter,
    SyncStatus,
    SyncState,
    DataSource,
} from '../types/index.js';
import { storageManager } from './storageManager.js';
import { githubReleaseClient } from './githubReleaseClient.js';
import { packageExtractor } from './packageExtractor.js';
import { VersionManager } from './versionManager.js';
import { DataSyncError, GitHubAPIError } from '../errors.js';
import { logger } from '../utils/logger.js';

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
 * Data Sync Service - Orchestrates all sync operations
 */
export class DataSyncService {
    private listeners: Set<SyncEventListener> = new Set();
    private currentStatus: SyncStatus = {
        state: 'idle',
        dataSource: 'offline',
        currentVersion: null,
        availableVersion: null,
        lastSync: null,
        error: null,
    };
    private initPromise: Promise<void> | null = null;
    private isInitialized = false;
    private updateCheckInterval: number | null = null;

    /**
     * Initialize the sync service
     * - Initializes storage
     * - Loads cached data immediately (if available)
     * - Checks for updates in background (non-blocking)
     */
    async initialize(): Promise<void> {
        // Return existing initialization promise if already in progress
        if (this.initPromise) {
            return this.initPromise;
        }

        // If already initialized, return immediately
        if (this.isInitialized) {
            return Promise.resolve();
        }

        this.initPromise = this._initialize().then(() => {
            this.initPromise = null;
            this.isInitialized = true;
        });

        return this.initPromise;
    }

    /**
     * Internal initialization logic
     */
    private async _initialize(): Promise<void> {
        logger.info('DataSyncService', 'Initializing...');

        try {
            // Initialize storage
            await storageManager.initialize();

            // Try to load cached data
            const cachedVersion = await storageManager.getMetadata('version') as string | null;
            const lastSyncTimestamp = await storageManager.getMetadata('lastSync') as number | null;

            if (cachedVersion) {
                // We have cached data!
                this.currentStatus = {
                    state: 'success',
                    dataSource: 'cache',
                    currentVersion: cachedVersion,
                    availableVersion: null,
                    lastSync: lastSyncTimestamp ? new Date(lastSyncTimestamp) : null,
                    error: null,
                };

                logger.info('DataSyncService', `Using cached data: ${cachedVersion}`);
                this.emitEvent('initialized', this.currentStatus);

                // Check for updates in background (non-blocking)
                this.checkForUpdates().catch(error => {
                    logger.warn('DataSyncService', 'Background update check failed:', error);
                });
            } else {
                // No cached data - need to download
                logger.info('DataSyncService', 'No cached data, downloading from GitHub...');

                this.currentStatus.state = 'checking';
                this.currentStatus.dataSource = 'github';
                this.emitEvent('checking', this.currentStatus);

                await this.downloadAndInstall();
            }

            // Start periodic update checks if enabled
            if (CONFIG.SYNC.ENABLE_AUTO_SYNC) {
                this.startPeriodicUpdateChecks();
            }
        } catch (error) {
            logger.error('DataSyncService', 'Initialization failed:', error);

            this.currentStatus = {
                state: 'error',
                dataSource: 'offline',
                currentVersion: null,
                availableVersion: null,
                lastSync: null,
                error: error instanceof Error ? error.message : 'Unknown error',
            };

            this.emitEvent('error', this.currentStatus, { error: error as Error });
            throw error;
        }
    }

    /**
     * Check for updates from GitHub
     * Non-blocking - can be called independently
     */
    async checkForUpdates(): Promise<boolean> {
        logger.info('DataSyncService', 'Checking for updates...');

        try {
            this.currentStatus.state = 'checking';
            this.emitEvent('checking', this.currentStatus);

            // Fetch latest release from GitHub
            const release = await githubReleaseClient.fetchLatestRelease();

            if (!release) {
                // 304 Not Modified - no update available
                logger.info('DataSyncService', 'No updates available (304 Not Modified)');
                this.currentStatus.state = 'success';
                this.emitEvent('success', this.currentStatus);
                return false;
            }

            const availableVersion = release.tag_name;
            const currentVersion = this.currentStatus.currentVersion;

            // Check if update is available
            if (currentVersion && VersionManager.isEqual(availableVersion, currentVersion)) {
                logger.info('DataSyncService', `Already on latest version: ${currentVersion}`);
                this.currentStatus.state = 'success';
                this.currentStatus.availableVersion = null;
                this.emitEvent('success', this.currentStatus);
                return false;
            }

            if (currentVersion && VersionManager.isOlder(availableVersion, currentVersion)) {
                logger.info('DataSyncService', `Cached version is newer: ${currentVersion} > ${availableVersion}`);
                this.currentStatus.state = 'success';
                this.currentStatus.availableVersion = null;
                this.emitEvent('success', this.currentStatus);
                return false;
            }

            // Update available!
            logger.info('DataSyncService', `Update available: ${availableVersion} (current: ${currentVersion || 'none'})`);
            this.currentStatus.availableVersion = availableVersion;
            return true;
        } catch (error) {
            if (error instanceof GitHubAPIError && error.rateLimited) {
                logger.warn('DataSyncService', 'Rate limited, will try again later');
                this.currentStatus.state = 'success'; // Don't show as error
                this.currentStatus.error = 'Rate limited';
                this.emitEvent('success', this.currentStatus);
            } else {
                logger.error('DataSyncService', 'Update check failed:', error);
                this.currentStatus.state = 'error';
                this.currentStatus.error = error instanceof Error ? error.message : 'Unknown error';
                this.emitEvent('error', this.currentStatus, { error: error as Error });
            }
            return false;
        }
    }

    /**
     * Download and install an update
     * Downloads ZIP, extracts, validates, and stores in IndexedDB
     */
    async downloadAndInstall(): Promise<void> {
        logger.info('DataSyncService', 'Starting download and install...');

        try {
            this.currentStatus.state = 'downloading';
            this.emitEvent('downloading', this.currentStatus);

            // Fetch latest release
            const release = await githubReleaseClient.fetchLatestRelease(true); // Force refresh

            if (!release) {
                throw new DataSyncError('No release found', 'download');
            }

            const version = release.tag_name;
            logger.info('DataSyncService', `Downloading version: ${version}`);

            // Find ZIP asset
            const zipAsset = githubReleaseClient.findZipAsset(release);
            if (!zipAsset) {
                throw new DataSyncError('No ZIP asset found in release', 'download');
            }

            // Download ZIP with progress
            const zipBlob = await githubReleaseClient.downloadAsset(zipAsset, (current, total) => {
                this.emitEvent('progress', this.currentStatus, {
                    progress: { current, total },
                });
            });

            // Extract package
            logger.info('DataSyncService', 'Extracting package...');
            this.currentStatus.state = 'extracting';
            this.emitEvent('extracting', this.currentStatus);

            const extractedPackage = await packageExtractor.extract(zipBlob);

            // Verify content hash
            const isValid = await packageExtractor.verifyContentHash(extractedPackage);
            if (!isValid) {
                logger.warn('DataSyncService', 'Content hash verification failed, but continuing...');
            }

            // Store characters in IndexedDB
            logger.info('DataSyncService', `Storing ${extractedPackage.characters.length} characters...`);
            await storageManager.storeCharacters(extractedPackage.characters, version);

            // Store icons in Cache API
            logger.info('DataSyncService', `Caching ${extractedPackage.icons.size} icons...`);
            for (const [characterId, iconBlob] of extractedPackage.icons) {
                await storageManager.cacheImage(characterId, iconBlob);
            }

            // Update metadata
            await storageManager.setMetadata('version', version);
            await storageManager.setMetadata('lastSync', Date.now());
            await storageManager.setMetadata('characterCount', extractedPackage.characters.length);
            await storageManager.setMetadata('contentHash', extractedPackage.manifest.contentHash);

            // Update status
            this.currentStatus = {
                state: 'success',
                dataSource: 'github',
                currentVersion: version,
                availableVersion: null,
                lastSync: new Date(),
                error: null,
            };

            logger.info('DataSyncService', `Successfully installed version: ${version}`);
            this.emitEvent('success', this.currentStatus, { version });
        } catch (error) {
            logger.error('DataSyncService', 'Download and install failed:', error);

            this.currentStatus.state = 'error';
            this.currentStatus.error = error instanceof Error ? error.message : 'Unknown error';
            this.emitEvent('error', this.currentStatus, { error: error as Error });

            throw error;
        }
    }

    /**
     * Get all characters from cache
     */
    async getCharacters(): Promise<Character[]> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const characters = await storageManager.getAllCharacters();

        // Strip internal fields before returning
        return characters.map(char => {
            const { _storedAt, _version, ...cleanChar } = char as CachedCharacter;
            return cleanChar;
        });
    }

    /**
     * Get a character by ID
     */
    async getCharacter(id: string): Promise<Character | null> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const character = await storageManager.getCharacter(id);

        if (!character) {
            return null;
        }

        // Strip internal fields
        const { _storedAt, _version, ...cleanChar } = character;
        return cleanChar;
    }

    /**
     * Search characters by name or ID
     */
    async searchCharacters(query: string): Promise<Character[]> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const characters = await storageManager.searchCharacters(query);

        // Strip internal fields
        return characters.map(char => {
            const { _storedAt, _version, ...cleanChar } = char;
            return cleanChar;
        });
    }

    /**
     * Get a character's image from the cache
     * @param characterId - Character ID (e.g., 'washerwoman')
     * @returns Image blob or null if not cached
     */
    async getCharacterImage(characterId: string): Promise<Blob | null> {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            return await storageManager.getImage(characterId);
        } catch (error) {
            logger.warn('DataSyncService', `Failed to get cached image for ${characterId}:`, error);
            return null;
        }
    }

    /**
     * Check if a character image is cached
     * @param characterId - Character ID
     * @returns true if image is cached
     */
    async hasCharacterImage(characterId: string): Promise<boolean> {
        const image = await this.getCharacterImage(characterId);
        return image !== null;
    }

    /**
     * Get current sync status
     */
    getStatus(): SyncStatus {
        return { ...this.currentStatus };
    }

    /**
     * Clear all cached data and force re-download
     */
    async clearCacheAndResync(): Promise<void> {
        logger.info('DataSyncService', 'Clearing cache and resyncing...');

        try {
            await storageManager.clearAll();
            githubReleaseClient.clearCache();

            this.currentStatus.currentVersion = null;
            this.currentStatus.lastSync = null;
            this.currentStatus.availableVersion = null;

            await this.downloadAndInstall();
        } catch (error) {
            logger.error('DataSyncService', 'Clear and resync failed:', error);
            throw error;
        }
    }

    /**
     * Start periodic update checks
     */
    private startPeriodicUpdateChecks(): void {
        if (this.updateCheckInterval !== null) {
            return; // Already running
        }

        logger.info('DataSyncService', `Starting periodic update checks every ${CONFIG.SYNC.CHECK_INTERVAL_MS}ms`);

        this.updateCheckInterval = window.setInterval(() => {
            this.checkForUpdates().catch(error => {
                logger.warn('DataSyncService', 'Periodic update check failed:', error);
            });
        }, CONFIG.SYNC.CHECK_INTERVAL_MS);
    }

    /**
     * Stop periodic update checks
     */
    stopPeriodicUpdateChecks(): void {
        if (this.updateCheckInterval !== null) {
            clearInterval(this.updateCheckInterval);
            this.updateCheckInterval = null;
            logger.info('DataSyncService', 'Stopped periodic update checks');
        }
    }

    /**
     * Add event listener
     */
    addEventListener(listener: SyncEventListener): void {
        this.listeners.add(listener);
    }

    /**
     * Remove event listener
     */
    removeEventListener(listener: SyncEventListener): void {
        this.listeners.delete(listener);
    }

    /**
     * Emit event to all listeners
     */
    private emitEvent(
        type: SyncEventType,
        status: SyncStatus,
        data?: SyncEvent['data']
    ): void {
        const event: SyncEvent = {
            type,
            status: { ...status },
            data,
        };

        for (const listener of this.listeners) {
            try {
                listener(event);
            } catch (error) {
                logger.error('DataSyncService', 'Event listener error:', error);
            }
        }
    }

    /**
     * Check if service is initialized
     */
    get initialized(): boolean {
        return this.isInitialized;
    }
}

// Export singleton instance
export const dataSyncService = new DataSyncService();

export default dataSyncService;
