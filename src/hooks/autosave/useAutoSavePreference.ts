/**
 * Auto-Save Preference Hook
 *
 * Manages user's auto-save enabled/disabled preference with localStorage persistence.
 * Preference is loaded on mount and saved whenever it changes.
 *
 * @module hooks/autosave/useAutoSavePreference
 */

import { useState } from 'react';
import { logger } from '@/ts/utils/index.js';
import { getStorageItem, STORAGE_KEYS, setStorageItem } from '@/ts/utils/storageKeys.js';

/**
 * Hook to manage auto-save preference
 *
 * @returns Object containing isEnabled state and toggleAutoSave function
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isEnabled, toggleAutoSave } = useAutoSavePreference();
 *
 *   return (
 *     <button onClick={() => toggleAutoSave(!isEnabled)}>
 *       Auto-save: {isEnabled ? 'ON' : 'OFF'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useAutoSavePreference() {
  // Load preference from localStorage via useState initializer (no effect needed)
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    const stored = getStorageItem(STORAGE_KEYS.AUTO_SAVE_ENABLED);
    if (stored !== null) {
      const enabled = stored === 'true';
      logger.debug(
        'AutoSavePreference',
        `Loaded preference from localStorage: ${enabled ? 'enabled' : 'disabled'}`
      );
      return enabled;
    }
    logger.debug('AutoSavePreference', 'No stored preference, using default: enabled');
    return true; // Default: enabled
  });

  /**
   * Toggle auto-save enabled/disabled state
   */
  const toggleAutoSave = (enabled: boolean) => {
    setIsEnabled(enabled);
    setStorageItem(STORAGE_KEYS.AUTO_SAVE_ENABLED, String(enabled));
    logger.info('AutoSavePreference', `Auto-save ${enabled ? 'enabled' : 'disabled'} by user`);
  };

  return {
    isEnabled,
    toggleAutoSave,
  };
}
