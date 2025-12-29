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
  /** Cache system log level */
  CACHE_LOG_LEVEL: 'cache:logLevel',
  /** Auto-save telemetry data */
  AUTO_SAVE_TELEMETRY: 'botc-autosave-telemetry',
  /** Recently used colors in color pickers */
  RECENT_COLORS: 'clocktower_recent_colors',
  /** Token grid section collapse states */
  TOKEN_SECTION_CHARACTERS_OPEN: 'clocktower_token_section_characters_open',
  TOKEN_SECTION_REMINDERS_OPEN: 'clocktower_token_section_reminders_open',
  TOKEN_SECTION_META_OPEN: 'clocktower_token_section_meta_open',
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
