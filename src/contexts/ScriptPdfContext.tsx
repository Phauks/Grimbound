/**
 * Script PDF Context
 *
 * Provides state management for script PDF generation settings.
 * Manages unified settings for Player Script and Night Order PDFs,
 * with localStorage persistence and deep partial updates.
 */

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { DEFAULT_SCRIPT_PDF_SETTINGS } from '@/ts/scriptPdf/constants.js';
import type {
  DeepPartial,
  ExportProgress,
  ScriptPdfContextValue,
  ScriptPdfSettings,
} from '@/ts/scriptPdf/types.js';
import { logger } from '@/ts/utils/logger.js';
import { getStorageItem, STORAGE_KEYS, setStorageItem } from '@/ts/utils/storageKeys.js';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Deep merge two objects, with source values taking precedence.
 * Unlike typical deep merge, this preserves explicit `undefined` values
 * when the key exists in the source object (allows clearing values).
 */
function deepMerge<T extends object>(target: T, source: DeepPartial<T>): T {
  const result = { ...target };
  const sourceKeys = new Set(Object.keys(source));

  for (const key of sourceKeys as Set<keyof T>) {
    const sourceValue = source[key];
    const targetValue = target[key];

    if (
      sourceValue !== undefined &&
      sourceValue !== null &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === 'object' &&
      targetValue !== null &&
      !Array.isArray(targetValue)
    ) {
      // Recursively merge objects
      result[key] = deepMerge(targetValue as object, sourceValue as object) as T[keyof T];
    } else {
      // Use source value directly (including explicit undefined to clear values)
      // Since we're iterating over Object.keys(source), we know the key exists
      result[key] = sourceValue as T[keyof T];
    }
  }

  return result;
}

/**
 * Load settings from localStorage, merging with defaults
 */
function loadSettings(): ScriptPdfSettings {
  try {
    const stored = getStorageItem(STORAGE_KEYS.SCRIPT_PDF_SETTINGS);
    if (stored) {
      const parsed = JSON.parse(stored) as DeepPartial<ScriptPdfSettings>;
      return deepMerge(DEFAULT_SCRIPT_PDF_SETTINGS, parsed);
    }
  } catch (err) {
    logger.warn('ScriptPdfContext', 'Failed to load settings from storage', err);
  }
  return { ...DEFAULT_SCRIPT_PDF_SETTINGS };
}

/**
 * Save settings to localStorage
 */
function saveSettings(settings: ScriptPdfSettings): void {
  try {
    setStorageItem(STORAGE_KEYS.SCRIPT_PDF_SETTINGS, JSON.stringify(settings));
  } catch (err) {
    logger.warn('ScriptPdfContext', 'Failed to save settings to storage', err);
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

const ScriptPdfContext = createContext<ScriptPdfContextValue | undefined>(undefined);

interface ScriptPdfProviderProps {
  children: ReactNode;
  /** Optional initial settings override (for testing) */
  initialSettings?: ScriptPdfSettings;
}

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

export function ScriptPdfProvider({ children, initialSettings }: ScriptPdfProviderProps) {
  // Initialize settings from localStorage or defaults
  const [settings, setSettings] = useState<ScriptPdfSettings>(
    () => initialSettings ?? loadSettings()
  );

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress>({
    phase: 'idle',
    current: 0,
    total: 0,
  });

  // Track if we should persist (skip on initial mount)
  const isInitialMount = useRef(true);

  // Persist settings to localStorage when they change
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    saveSettings(settings);
  }, [settings]);

  /**
   * Update settings with deep partial merge
   * useCallback required: exposed in context value
   */
  const updateSettings = useCallback((updates: DeepPartial<ScriptPdfSettings>) => {
    setSettings((prev) => deepMerge(prev, updates));
  }, []);

  /**
   * Reset settings to defaults
   * useCallback required: exposed in context value
   */
  const resetSettings = useCallback(() => {
    setSettings({ ...DEFAULT_SCRIPT_PDF_SETTINGS });
    logger.info('ScriptPdfContext', 'Settings reset to defaults');
  }, []);

  /**
   * Reorder characters in custom order
   * useCallback required: exposed in context value
   */
  const reorderCharacters = useCallback((fromIndex: number, toIndex: number) => {
    setSettings((prev) => {
      const currentOrder = prev.playerScript.customOrder ?? [];
      if (currentOrder.length === 0) {
        logger.warn('ScriptPdfContext', 'Cannot reorder - no custom order set');
        return prev;
      }

      const newOrder = [...currentOrder];
      const [removed] = newOrder.splice(fromIndex, 1);
      newOrder.splice(toIndex, 0, removed);

      return {
        ...prev,
        playerScript: {
          ...prev.playerScript,
          customOrder: newOrder,
        },
      };
    });
  }, []);

  /**
   * Reset character order (clear custom order)
   * useCallback required: exposed in context value
   */
  const resetCharacterOrder = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      playerScript: {
        ...prev.playerScript,
        customOrder: undefined,
      },
    }));
    logger.info('ScriptPdfContext', 'Character order reset to SAO');
  }, []);

  /**
   * Export Player Script PDF
   * (Placeholder - implementation in Phase 6)
   * useCallback required: exposed in context value
   */
  const exportPlayerScript = useCallback(async () => {
    if (isExporting) return;

    setIsExporting(true);
    setExportProgress({ phase: 'rendering', current: 0, total: 2 });

    try {
      // Phase 6 implementation will go here
      logger.info('ScriptPdfContext', 'exportPlayerScript called - not yet implemented');

      // Simulate progress for now
      setExportProgress({ phase: 'generating', current: 1, total: 2 });
      await new Promise((resolve) => setTimeout(resolve, 100));
      setExportProgress({ phase: 'saving', current: 2, total: 2 });
    } catch (err) {
      logger.error('ScriptPdfContext', 'Export failed', err);
      throw err;
    } finally {
      setIsExporting(false);
      setExportProgress({ phase: 'idle', current: 0, total: 0 });
    }
  }, [isExporting]);

  /**
   * Export Night Order PDF
   * (Placeholder - implementation in Phase 6)
   * useCallback required: exposed in context value
   */
  const exportNightOrder = useCallback(async () => {
    if (isExporting) return;

    setIsExporting(true);
    setExportProgress({ phase: 'rendering', current: 0, total: 2 });

    try {
      logger.info('ScriptPdfContext', 'exportNightOrder called - not yet implemented');
      setExportProgress({ phase: 'generating', current: 1, total: 2 });
      await new Promise((resolve) => setTimeout(resolve, 100));
      setExportProgress({ phase: 'saving', current: 2, total: 2 });
    } catch (err) {
      logger.error('ScriptPdfContext', 'Export failed', err);
      throw err;
    } finally {
      setIsExporting(false);
      setExportProgress({ phase: 'idle', current: 0, total: 0 });
    }
  }, [isExporting]);

  /**
   * Export both Player Script and Night Order PDFs
   * useCallback required: exposed in context value
   */
  const exportAll = useCallback(async () => {
    if (isExporting) return;

    setIsExporting(true);
    setExportProgress({ phase: 'rendering', current: 0, total: 4 });

    try {
      logger.info('ScriptPdfContext', 'exportAll called - not yet implemented');

      // Player Script
      setExportProgress({ phase: 'rendering', current: 1, total: 4, message: 'Player Script...' });
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Night Order
      setExportProgress({ phase: 'rendering', current: 2, total: 4, message: 'Night Order...' });
      await new Promise((resolve) => setTimeout(resolve, 100));

      setExportProgress({ phase: 'saving', current: 4, total: 4 });
    } catch (err) {
      logger.error('ScriptPdfContext', 'Export all failed', err);
      throw err;
    } finally {
      setIsExporting(false);
      setExportProgress({ phase: 'idle', current: 0, total: 0 });
    }
  }, [isExporting]);

  // useMemo required: context value object must be stable to prevent consumer re-renders
  const value: ScriptPdfContextValue = useMemo(
    () => ({
      settings,
      isExporting,
      exportProgress,
      updateSettings,
      resetSettings,
      reorderCharacters,
      resetCharacterOrder,
      exportPlayerScript,
      exportNightOrder,
      exportAll,
    }),
    [
      settings,
      isExporting,
      exportProgress,
      updateSettings,
      resetSettings,
      reorderCharacters,
      resetCharacterOrder,
      exportPlayerScript,
      exportNightOrder,
      exportAll,
    ]
  );

  return <ScriptPdfContext.Provider value={value}>{children}</ScriptPdfContext.Provider>;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook to use the Script PDF context
 * @throws Error if used outside of ScriptPdfProvider
 */
export function useScriptPdf(): ScriptPdfContextValue {
  const context = useContext(ScriptPdfContext);
  if (context === undefined) {
    throw new Error('useScriptPdf must be used within a ScriptPdfProvider');
  }
  return context;
}

/**
 * Hook to optionally use the Script PDF context
 * Returns undefined if used outside of ScriptPdfProvider
 */
export function useScriptPdfOptional(): ScriptPdfContextValue | undefined {
  return useContext(ScriptPdfContext);
}

/**
 * Hook to access only the settings (for components that don't need actions)
 */
export function useScriptPdfSettings(): ScriptPdfSettings {
  const { settings } = useScriptPdf();
  return settings;
}
