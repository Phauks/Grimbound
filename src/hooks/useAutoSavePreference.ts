/**
 * Auto-Save Preference Hook
 *
 * Manages user's auto-save enabled/disabled preference with localStorage persistence.
 * Preference is loaded on mount and saved whenever it changes.
 *
 * @module hooks/useAutoSavePreference
 */

import { useCallback, useEffect, useState } from 'react';
import { logger } from '../ts/utils/index.js';
import { getStorageItem, STORAGE_KEYS, setStorageItem } from '../ts/utils/storageKeys.js';

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
  const [isEnabled, setIsEnabled] = useState<boolean>(true); // Default: enabled

  // Load preference from localStorage on mount
  useEffect(() => {
    const stored = getStorageItem(STORAGE_KEYS.AUTO_SAVE_ENABLED);

    if (stored !== null) {
      const enabled = stored === 'true';
      setIsEnabled(enabled);
      logger.debug(
        'AutoSavePreference',
        `Loaded preference from localStorage: ${enabled ? 'enabled' : 'disabled'}`
      );
    } else {
      // No preference stored yet - use default (enabled)
      logger.debug('AutoSavePreference', 'No stored preference, using default: enabled');
    }
  }, []);

  /**
   * Toggle auto-save enabled/disabled state
   */
  const toggleAutoSave = useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
    setStorageItem(STORAGE_KEYS.AUTO_SAVE_ENABLED, String(enabled));
    logger.info('AutoSavePreference', `Auto-save ${enabled ? 'enabled' : 'disabled'} by user`);
  }, []);

  return {
    isEnabled,
    toggleAutoSave,
  };
}
