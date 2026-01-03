/**
 * Preset Migration Helper
 *
 * Migrates legacy CUSTOM_PRESETS data to the new GLOBAL_PRESETS format.
 * This handles the transition from the old preset system to the new
 * two-tier (global/local) preset system.
 *
 * @module utils/presetMigration
 */

import type { GenerationOptions, Preset } from '@/ts/types/index.js';
import { logger } from './logger.js';
import { STORAGE_KEYS } from './storageKeys.js';

/**
 * Legacy CustomPreset format (pre-v0.6.0)
 */
interface LegacyCustomPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  settings: GenerationOptions;
}

/**
 * Convert a legacy CustomPreset to the new Preset format
 */
function convertLegacyPreset(legacy: LegacyCustomPreset): Preset {
  const now = Date.now();
  return {
    id: legacy.id,
    name: legacy.name,
    description: legacy.description || '',
    icon: legacy.icon || '🎨',
    settings: legacy.settings,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Migrate legacy CUSTOM_PRESETS to new GLOBAL_PRESETS format.
 *
 * This function:
 * 1. Checks if old data exists and new data doesn't
 * 2. Converts each legacy preset to the new format
 * 3. Saves to the new storage key
 * 4. Removes the old storage key
 *
 * Safe to call multiple times - will only migrate once.
 *
 * @returns true if migration was performed, false otherwise
 */
export function migratePresets(): boolean {
  try {
    const oldData = localStorage.getItem(STORAGE_KEYS.CUSTOM_PRESETS);
    const newData = localStorage.getItem(STORAGE_KEYS.GLOBAL_PRESETS);

    // Only migrate if old data exists and new data doesn't
    if (!oldData || newData) {
      return false;
    }

    const oldPresets: LegacyCustomPreset[] = JSON.parse(oldData);

    if (!Array.isArray(oldPresets)) {
      logger.warn('PresetMigration', 'Old presets data is not an array, skipping migration');
      return false;
    }

    // Convert each legacy preset to new format
    const migratedPresets = oldPresets.map(convertLegacyPreset);

    // Save to new storage key
    localStorage.setItem(STORAGE_KEYS.GLOBAL_PRESETS, JSON.stringify(migratedPresets));

    // Remove old storage key
    localStorage.removeItem(STORAGE_KEYS.CUSTOM_PRESETS);

    // Also clean up the old DEFAULT_PRESET key since we no longer use it
    localStorage.removeItem(STORAGE_KEYS.DEFAULT_PRESET);

    logger.info('PresetMigration', `Migrated ${migratedPresets.length} presets from legacy format`);

    return true;
  } catch (error) {
    logger.error('PresetMigration', 'Failed to migrate presets', error);
    // Don't remove old data on failure - user can try again
    return false;
  }
}

/**
 * Check if migration is needed (for diagnostic purposes)
 */
export function isMigrationNeeded(): boolean {
  try {
    const oldData = localStorage.getItem(STORAGE_KEYS.CUSTOM_PRESETS);
    const newData = localStorage.getItem(STORAGE_KEYS.GLOBAL_PRESETS);
    return Boolean(oldData && !newData);
  } catch {
    return false;
  }
}
