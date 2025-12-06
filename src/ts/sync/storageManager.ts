/**
 * Blood on the Clocktower Token Generator
 * Storage Manager - IndexedDB and Cache API wrapper for persistent data storage
 *
 * Manages:
 * - IndexedDB: Character data, metadata, settings
 * - Cache API: Character images (WebP format)
 * - Storage quota monitoring
 */

import CONFIG from '../config.js';
import type {
    Character,
    CachedCharacter,
    SyncMetadata,
    SyncSettings,
    StorageQuota,
} from '../types/index.js';
import { StorageError } from '../errors.js';

/**
 * Storage Manager class for persistent data storage
 */
export class StorageManager {
    private db: IDBDatabase | null = null;
    private initPromise: Promise<void> | null = null;
    private cache: Cache | null = null;

    /**
     * Initialize IndexedDB and Cache API
     * Safe to call multiple times - will only initialize once
     */
    async initialize(): Promise<void> {
        // Return existing initialization promise if already in progress
        if (this.initPromise) {
            return this.initPromise;
        }

        // If already initialized, return immediately
        if (this.db) {
            return Promise.resolve();
        }

        // Create new initialization promise
        this.initPromise = this._initializeDatabase().then(() => {
            this.initPromise = null;
        });

        return this.initPromise;
    }

    /**
     * Internal method to initialize the database
     */
    private async _initializeDatabase(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(CONFIG.SYNC.DB_NAME, CONFIG.SYNC.DB_VERSION);

            request.onerror = () => {
                reject(
                    new StorageError(
                        'Failed to open IndexedDB',
                        'indexeddb',
                        request.error as Error
                    )
                );
            };

            request.onsuccess = () => {
                this.db = request.result;

                // Initialize Cache API
                caches.open(CONFIG.SYNC.CACHE_NAME)
                    .then(cache => {
                        this.cache = cache;
                        resolve();
                    })
                    .catch(error => {
                        reject(
                            new StorageError(
                                'Failed to open Cache API',
                                'cache-api',
                                error instanceof Error ? error : new Error(String(error))
                            )
                        );
                    });
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Create object stores if they don't exist
                if (!db.objectStoreNames.contains('characters')) {
                    const characterStore = db.createObjectStore('characters', { keyPath: 'id' });
                    // Create indexes for efficient queries
                    characterStore.createIndex('team', 'team', { unique: false });
                    characterStore.createIndex('edition', 'edition', { unique: false });
                    characterStore.createIndex('_version', '_version', { unique: false });
                }

                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata', { keyPath: 'key' });
                }

                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }

    /**
     * Ensure database is initialized before operations
     */
    private async ensureInitialized(): Promise<IDBDatabase> {
        if (!this.db) {
            await this.initialize();
        }

        if (!this.db) {
            throw new StorageError('Database not initialized', 'indexeddb');
        }

        return this.db;
    }

    // ============================================================================
    // Character Operations
    // ============================================================================

    /**
     * Store a single character in IndexedDB
     * @param character - Character to store
     * @param version - Version string to tag the character with
     */
    async storeCharacter(character: Character, version: string): Promise<void> {
        const db = await this.ensureInitialized();

        const cachedCharacter: CachedCharacter = {
            ...character,
            _storedAt: Date.now(),
            _version: version,
        };

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['characters'], 'readwrite');
            const store = transaction.objectStore('characters');
            const request = store.put(cachedCharacter);

            request.onsuccess = () => resolve();
            request.onerror = () => {
                reject(
                    new StorageError(
                        `Failed to store character: ${character.id}`,
                        'indexeddb',
                        request.error as Error
                    )
                );
            };
        });
    }

    /**
     * Store multiple characters in a single transaction
     * @param characters - Array of characters to store
     * @param version - Version string to tag characters with
     */
    async storeCharacters(characters: Character[], version: string): Promise<void> {
        const db = await this.ensureInitialized();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['characters'], 'readwrite');
            const store = transaction.objectStore('characters');

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => {
                reject(
                    new StorageError(
                        'Failed to store characters',
                        'indexeddb',
                        transaction.error as Error
                    )
                );
            };

            for (const character of characters) {
                const cachedCharacter: CachedCharacter = {
                    ...character,
                    _storedAt: Date.now(),
                    _version: version,
                };
                store.put(cachedCharacter);
            }
        });
    }

    /**
     * Get a character by ID
     * @param id - Character ID
     * @returns Character or null if not found
     */
    async getCharacter(id: string): Promise<CachedCharacter | null> {
        const db = await this.ensureInitialized();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['characters'], 'readonly');
            const store = transaction.objectStore('characters');
            const request = store.get(id);

            request.onsuccess = () => {
                resolve(request.result || null);
            };

            request.onerror = () => {
                reject(
                    new StorageError(
                        `Failed to get character: ${id}`,
                        'indexeddb',
                        request.error as Error
                    )
                );
            };
        });
    }

    /**
     * Get all characters
     * @returns Array of all cached characters
     */
    async getAllCharacters(): Promise<CachedCharacter[]> {
        const db = await this.ensureInitialized();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['characters'], 'readonly');
            const store = transaction.objectStore('characters');
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result || []);
            };

            request.onerror = () => {
                reject(
                    new StorageError(
                        'Failed to get all characters',
                        'indexeddb',
                        request.error as Error
                    )
                );
            };
        });
    }

    /**
     * Search characters by name or ID (fuzzy match)
     * @param query - Search query
     * @returns Array of matching characters
     */
    async searchCharacters(query: string): Promise<CachedCharacter[]> {
        const allCharacters = await this.getAllCharacters();
        const lowerQuery = query.toLowerCase();

        return allCharacters.filter(character => {
            const nameMatch = character.name.toLowerCase().includes(lowerQuery);
            const idMatch = character.id.toLowerCase().includes(lowerQuery);
            return nameMatch || idMatch;
        });
    }

    /**
     * Clear all characters from storage
     */
    async clearCharacters(): Promise<void> {
        const db = await this.ensureInitialized();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['characters'], 'readwrite');
            const store = transaction.objectStore('characters');
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => {
                reject(
                    new StorageError(
                        'Failed to clear characters',
                        'indexeddb',
                        request.error as Error
                    )
                );
            };
        });
    }

    // ============================================================================
    // Metadata Operations
    // ============================================================================

    /**
     * Set a metadata value
     * @param key - Metadata key
     * @param value - Metadata value
     */
    async setMetadata(key: string, value: string | number | boolean): Promise<void> {
        const db = await this.ensureInitialized();

        const record: SyncMetadata = { key, value };

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['metadata'], 'readwrite');
            const store = transaction.objectStore('metadata');
            const request = store.put(record);

            request.onsuccess = () => resolve();
            request.onerror = () => {
                reject(
                    new StorageError(
                        `Failed to set metadata: ${key}`,
                        'indexeddb',
                        request.error as Error
                    )
                );
            };
        });
    }

    /**
     * Get a metadata value
     * @param key - Metadata key
     * @returns Metadata value or null if not found
     */
    async getMetadata(key: string): Promise<string | number | boolean | null> {
        const db = await this.ensureInitialized();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['metadata'], 'readonly');
            const store = transaction.objectStore('metadata');
            const request = store.get(key);

            request.onsuccess = () => {
                const result = request.result as SyncMetadata | undefined;
                resolve(result?.value ?? null);
            };

            request.onerror = () => {
                reject(
                    new StorageError(
                        `Failed to get metadata: ${key}`,
                        'indexeddb',
                        request.error as Error
                    )
                );
            };
        });
    }

    /**
     * Get all metadata
     * @returns Map of all metadata key-value pairs
     */
    async getAllMetadata(): Promise<Map<string, string | number | boolean>> {
        const db = await this.ensureInitialized();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['metadata'], 'readonly');
            const store = transaction.objectStore('metadata');
            const request = store.getAll();

            request.onsuccess = () => {
                const records = request.result as SyncMetadata[];
                const map = new Map<string, string | number | boolean>();
                for (const record of records) {
                    map.set(record.key, record.value);
                }
                resolve(map);
            };

            request.onerror = () => {
                reject(
                    new StorageError(
                        'Failed to get all metadata',
                        'indexeddb',
                        request.error as Error
                    )
                );
            };
        });
    }

    // ============================================================================
    // Settings Operations
    // ============================================================================

    /**
     * Set a setting value
     * @param key - Setting key
     * @param value - Setting value
     */
    async setSetting(key: string, value: unknown): Promise<void> {
        const db = await this.ensureInitialized();

        const record: SyncSettings = { key, value };

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            const request = store.put(record);

            request.onsuccess = () => resolve();
            request.onerror = () => {
                reject(
                    new StorageError(
                        `Failed to set setting: ${key}`,
                        'indexeddb',
                        request.error as Error
                    )
                );
            };
        });
    }

    /**
     * Get a setting value
     * @param key - Setting key
     * @returns Setting value or null if not found
     */
    async getSetting(key: string): Promise<unknown> {
        const db = await this.ensureInitialized();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get(key);

            request.onsuccess = () => {
                const result = request.result as SyncSettings | undefined;
                resolve(result?.value ?? null);
            };

            request.onerror = () => {
                reject(
                    new StorageError(
                        `Failed to get setting: ${key}`,
                        'indexeddb',
                        request.error as Error
                    )
                );
            };
        });
    }

    // ============================================================================
    // Cache API Operations (Character Images)
    // ============================================================================

    /**
     * Cache a character image
     * @param characterId - Character ID
     * @param imageBlob - Image blob (WebP format)
     */
    async cacheImage(characterId: string, imageBlob: Blob): Promise<void> {
        if (!this.cache) {
            await this.initialize();
        }

        if (!this.cache) {
            throw new StorageError('Cache API not initialized', 'cache-api');
        }

        const url = `/icons/${characterId}.webp`;
        const response = new Response(imageBlob, {
            headers: { 'Content-Type': 'image/webp' },
        });

        try {
            await this.cache.put(url, response);
        } catch (error) {
            throw new StorageError(
                `Failed to cache image: ${characterId}`,
                'cache-api',
                error instanceof Error ? error : new Error(String(error))
            );
        }
    }

    /**
     * Get a cached character image
     * @param characterId - Character ID
     * @returns Image blob or null if not cached
     */
    async getImage(characterId: string): Promise<Blob | null> {
        if (!this.cache) {
            await this.initialize();
        }

        if (!this.cache) {
            throw new StorageError('Cache API not initialized', 'cache-api');
        }

        const url = `/icons/${characterId}.webp`;

        try {
            const response = await this.cache.match(url);
            if (!response) {
                return null;
            }
            return await response.blob();
        } catch (error) {
            throw new StorageError(
                `Failed to get cached image: ${characterId}`,
                'cache-api',
                error instanceof Error ? error : new Error(String(error))
            );
        }
    }

    /**
     * Clear all cached images
     */
    async clearImageCache(): Promise<void> {
        try {
            await caches.delete(CONFIG.SYNC.CACHE_NAME);
            // Reinitialize cache
            this.cache = await caches.open(CONFIG.SYNC.CACHE_NAME);
        } catch (error) {
            throw new StorageError(
                'Failed to clear image cache',
                'cache-api',
                error instanceof Error ? error : new Error(String(error))
            );
        }
    }

    // ============================================================================
    // Storage Quota Operations
    // ============================================================================

    /**
     * Get storage quota information
     * @returns Storage quota details
     */
    async getStorageQuota(): Promise<StorageQuota> {
        try {
            const estimate = await navigator.storage.estimate();
            const usage = estimate.usage || 0;
            const quota = estimate.quota || 0;

            return {
                usage,
                quota,
                usageMB: usage / (1024 * 1024),
                quotaMB: quota / (1024 * 1024),
                percentUsed: quota > 0 ? (usage / quota) * 100 : 0,
            };
        } catch (error) {
            throw new StorageError(
                'Failed to get storage quota',
                'quota',
                error instanceof Error ? error : new Error(String(error))
            );
        }
    }

    /**
     * Check if storage is near quota limit
     * @returns true if usage is above warning threshold
     */
    async isNearQuota(): Promise<boolean> {
        const quota = await this.getStorageQuota();
        const warningThresholdMB = CONFIG.SYNC.STORAGE_QUOTA_WARNING_MB;
        return quota.usageMB >= warningThresholdMB;
    }

    /**
     * Check if storage is available for storing data
     * @param requiredMB - Required space in MB
     * @returns true if enough space is available
     */
    async hasSpace(requiredMB: number): Promise<boolean> {
        const quota = await this.getStorageQuota();
        const availableMB = quota.quotaMB - quota.usageMB;
        return availableMB >= requiredMB;
    }

    // ============================================================================
    // Utility Operations
    // ============================================================================

    /**
     * Clear all data (characters, metadata, settings, images)
     */
    async clearAll(): Promise<void> {
        await Promise.all([
            this.clearCharacters(),
            this.clearImageCache(),
        ]);

        // Clear metadata
        const db = await this.ensureInitialized();
        await new Promise<void>((resolve, reject) => {
            const transaction = db.transaction(['metadata', 'settings'], 'readwrite');
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            transaction.objectStore('metadata').clear();
            transaction.objectStore('settings').clear();
        });
    }

    /**
     * Close the database connection
     */
    close(): void {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
        this.cache = null;
    }

    /**
     * Get database instance (for advanced operations)
     * @returns IndexedDB database instance
     */
    async getDatabase(): Promise<IDBDatabase> {
        return this.ensureInitialized();
    }
}

// Export singleton instance
export const storageManager = new StorageManager();

export default storageManager;
