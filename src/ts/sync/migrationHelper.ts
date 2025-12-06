/**
 * Blood on the Clocktower Token Generator
 * Migration Helper - Handles first-time setup and data migrations
 *
 * Features:
 * - Detect first-time vs returning users
 * - Migration flags to track completed migrations
 * - Version-specific migration logic
 */

import { storageManager } from './storageManager.js';

/**
 * Migration status information
 */
export interface MigrationStatus {
    isFirstTime: boolean;
    hasLegacyData: boolean;
    migrationsCompleted: string[];
    currentVersion: string | null;
}

/**
 * Migration Helper for managing data transitions
 */
export class MigrationHelper {
    /**
     * Check if this is a first-time user
     * @returns true if no previous data exists
     */
    async isFirstTimeUser(): Promise<boolean> {
        try {
            const hasVersion = await storageManager.getMetadata('version');
            const hasMigrated = await storageManager.getMetadata('migrated');

            return !hasVersion && !hasMigrated;
        } catch (error) {
            console.error('[MigrationHelper] Error checking first-time status:', error);
            return true; // Assume first-time on error
        }
    }

    /**
     * Check if user has legacy data (from before IndexedDB)
     * In this case, we're checking localStorage for any previous tokens or settings
     */
    async hasLegacyData(): Promise<boolean> {
        try {
            // Check for common localStorage keys that might exist from previous versions
            const keys = [
                'botc-tokens',
                'botc-settings',
                'botc-characters',
                'clocktower-data',
            ];

            for (const key of keys) {
                if (localStorage.getItem(key)) {
                    return true;
                }
            }

            return false;
        } catch (error) {
            console.error('[MigrationHelper] Error checking legacy data:', error);
            return false;
        }
    }

    /**
     * Get migration status
     */
    async getMigrationStatus(): Promise<MigrationStatus> {
        const isFirstTime = await this.isFirstTimeUser();
        const hasLegacyData = await this.hasLegacyData();
        const currentVersion = await storageManager.getMetadata('version') as string | null;

        // Get list of completed migrations
        const migrationsCompleted: string[] = [];
        const migrationFlags = [
            'migrated',
            'migration_v1_to_v2',
            'migration_indexeddb',
        ];

        for (const flag of migrationFlags) {
            const completed = await storageManager.getMetadata(flag);
            if (completed) {
                migrationsCompleted.push(flag);
            }
        }

        return {
            isFirstTime,
            hasLegacyData,
            migrationsCompleted,
            currentVersion,
        };
    }

    /**
     * Mark a migration as completed
     * @param migrationId - Unique identifier for the migration
     */
    async markMigrationCompleted(migrationId: string): Promise<void> {
        await storageManager.setMetadata(migrationId, true);
        console.log(`[MigrationHelper] Marked migration completed: ${migrationId}`);
    }

    /**
     * Check if a specific migration has been completed
     * @param migrationId - Migration identifier to check
     */
    async isMigrationCompleted(migrationId: string): Promise<boolean> {
        const completed = await storageManager.getMetadata(migrationId);
        return completed === true;
    }

    /**
     * Perform first-time setup
     * Sets initial flags and metadata
     */
    async performFirstTimeSetup(): Promise<void> {
        console.log('[MigrationHelper] Performing first-time setup...');

        try {
            // Mark as migrated (first-time users are "pre-migrated")
            await this.markMigrationCompleted('migrated');
            await this.markMigrationCompleted('migration_indexeddb');

            // Set initial settings
            await storageManager.setSetting('autoSync', true);
            await storageManager.setSetting('updateMode', 'auto');
            await storageManager.setSetting('dataSource', 'github');

            console.log('[MigrationHelper] First-time setup complete');
        } catch (error) {
            console.error('[MigrationHelper] First-time setup failed:', error);
            throw error;
        }
    }

    /**
     * Clear legacy data from localStorage
     * Call this after successfully migrating to IndexedDB
     */
    async clearLegacyData(): Promise<void> {
        console.log('[MigrationHelper] Clearing legacy data...');

        try {
            const keysToRemove = [
                'botc-tokens',
                'botc-settings',
                'botc-characters',
                'clocktower-data',
            ];

            for (const key of keysToRemove) {
                try {
                    localStorage.removeItem(key);
                } catch (error) {
                    console.warn(`[MigrationHelper] Failed to remove ${key}:`, error);
                }
            }

            console.log('[MigrationHelper] Legacy data cleared');
        } catch (error) {
            console.error('[MigrationHelper] Error clearing legacy data:', error);
            // Don't throw - this is not critical
        }
    }

    /**
     * Run all pending migrations
     * Checks which migrations need to run and executes them in order
     */
    async runPendingMigrations(): Promise<void> {
        console.log('[MigrationHelper] Checking for pending migrations...');

        const status = await this.getMigrationStatus();

        // If first-time user, just do first-time setup
        if (status.isFirstTime) {
            await this.performFirstTimeSetup();
            return;
        }

        // Check for specific migrations that need to run
        const migrations: Array<{
            id: string;
            name: string;
            run: () => Promise<void>;
        }> = [];

        // Example: Migration to IndexedDB (if they have legacy data but haven't migrated)
        if (status.hasLegacyData && !status.migrationsCompleted.includes('migration_indexeddb')) {
            migrations.push({
                id: 'migration_indexeddb',
                name: 'Migrate to IndexedDB',
                run: async () => {
                    console.log('[MigrationHelper] Running IndexedDB migration...');
                    // In this case, we don't actually need to migrate data
                    // since the old app didn't cache character data
                    // Just mark as completed and clear legacy data
                    await this.clearLegacyData();
                },
            });
        }

        // Run each pending migration
        for (const migration of migrations) {
            try {
                console.log(`[MigrationHelper] Running migration: ${migration.name}`);
                await migration.run();
                await this.markMigrationCompleted(migration.id);
            } catch (error) {
                console.error(`[MigrationHelper] Migration failed: ${migration.name}`, error);
                // Continue with other migrations even if one fails
            }
        }

        if (migrations.length === 0) {
            console.log('[MigrationHelper] No pending migrations');
        } else {
            console.log(`[MigrationHelper] Completed ${migrations.length} migration(s)`);
        }
    }

    /**
     * Reset all migration flags (for testing/development)
     * WARNING: This will cause migrations to run again
     */
    async resetMigrations(): Promise<void> {
        console.warn('[MigrationHelper] Resetting all migrations - use only for testing!');

        const migrationFlags = [
            'migrated',
            'migration_v1_to_v2',
            'migration_indexeddb',
        ];

        // Clear all migration flags from metadata
        // Note: We don't have a delete method, so we set to false
        for (const flag of migrationFlags) {
            await storageManager.setMetadata(flag, false);
        }
    }
}

// Export singleton instance
export const migrationHelper = new MigrationHelper();

export default migrationHelper;
