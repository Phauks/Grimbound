/**
 * Blood on the Clocktower Token Generator
 * Centralized localStorage Keys
 *
 * All localStorage keys used throughout the application are defined here
 * to ensure consistency and make key management easier.
 */

/**
 * Storage keys for user preferences and presets
 */
export const STORAGE_KEYS = {
  /** Custom user presets */
  CUSTOM_PRESETS: 'clocktower_custom_presets',
  /** Default preset selection */
  DEFAULT_PRESET: 'clocktower_default_preset',
  /** UI theme selection */
  THEME: 'clocktower_ui_theme',
  /** Custom themes created by user */
  CUSTOM_THEMES: 'clocktower_custom_themes',
  /** Auto-save enabled preference */
  AUTO_SAVE_ENABLED: 'clocktower_auto_save_enabled',
  /** Legacy key for preset migration */
  LEGACY_PRESETS: 'bloodOnTheClockTower_presets',
} as const;

/**
 * Type for storage key values
 */
export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

/**
 * Helper to safely get item from localStorage
 * Returns null if localStorage is not available or key doesn't exist
 */
export function getStorageItem(key: StorageKey): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Helper to safely set item in localStorage
 * Silently fails if localStorage is not available
 */
export function setStorageItem(key: StorageKey, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorage not available (e.g., private browsing in some browsers)
  }
}

/**
 * Helper to safely remove item from localStorage
 * Silently fails if localStorage is not available
 */
export function removeStorageItem(key: StorageKey): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // localStorage not available
  }
}
