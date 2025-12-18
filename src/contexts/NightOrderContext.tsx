/**
 * Night Order Context
 *
 * Provides state management for the Night Order sheet feature.
 * Tracks first night and other night order, including user customizations.
 */

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { tabPreRenderService } from '@/ts/cache/index.js';
import { extractScriptMeta } from '@/ts/data/scriptParser.js';
import type {
  NightOrderContextValue,
  NightOrderState,
  ScriptMetaWithNightOrder,
} from '@/ts/nightOrder/nightOrderTypes.js';
import { buildNightOrder, moveNightOrderEntry } from '@/ts/nightOrder/nightOrderUtils.js';
import type { ScriptEntry, ScriptMeta } from '@/ts/types/index.js';
import { logger } from '@/ts/utils/logger.js';

/**
 * Default empty night order state
 */
const createEmptyNightOrderState = (): NightOrderState => ({
  entries: [],
  source: 'numbers',
  customPositions: new Map(),
});

/**
 * Night Order Context
 */
const NightOrderContext = createContext<NightOrderContextValue | undefined>(undefined);

interface NightOrderProviderProps {
  children: ReactNode;
  /** Optional initial script data to pre-populate from cache */
  initialScriptData?: ScriptEntry[];
}

/**
 * Initialize state from cache if available.
 * Uses TabPreRenderService for unified cache access.
 */
function getInitialState(scriptData?: ScriptEntry[]): {
  firstNight: NightOrderState;
  otherNight: NightOrderState;
  scriptMeta: ScriptMeta | null;
} {
  if (!scriptData || scriptData.length === 0) {
    return {
      firstNight: createEmptyNightOrderState(),
      otherNight: createEmptyNightOrderState(),
      scriptMeta: null,
    };
  }

  // Check for pre-computed cache (via unified TabPreRenderService)
  const cached = tabPreRenderService.getCachedNightOrder(scriptData);
  if (cached) {
    logger.debug('NightOrderContext', 'Initializing from TabPreRenderService cache');
    const meta = extractScriptMeta(scriptData) as ScriptMetaWithNightOrder | null;
    return {
      firstNight: {
        entries: cached.firstNight.entries,
        source: cached.firstNight.source,
        customPositions: new Map(),
      },
      otherNight: {
        entries: cached.otherNight.entries,
        source: cached.otherNight.source,
        customPositions: new Map(),
      },
      scriptMeta: meta,
    };
  }

  return {
    firstNight: createEmptyNightOrderState(),
    otherNight: createEmptyNightOrderState(),
    scriptMeta: null,
  };
}

/**
 * Night Order Provider Component
 */
export function NightOrderProvider({ children, initialScriptData }: NightOrderProviderProps) {
  // Initialize state - use cache if available for instant display
  const initial = useMemo(() => getInitialState(initialScriptData), [initialScriptData]);

  // State
  const [firstNight, setFirstNight] = useState<NightOrderState>(initial.firstNight);
  const [otherNight, setOtherNight] = useState<NightOrderState>(initial.otherNight);
  const [scriptMeta, setScriptMeta] = useState<ScriptMeta | null>(initial.scriptMeta);
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize night order from script data.
   * Uses TabPreRenderService for unified cache access.
   */
  const initializeFromScript = useCallback((scriptData: ScriptEntry[]) => {
    setError(null);

    try {
      // Extract script metadata
      const meta = extractScriptMeta(scriptData) as ScriptMetaWithNightOrder | null;
      setScriptMeta(meta);

      // Check for pre-computed cache (via unified TabPreRenderService)
      const cached = tabPreRenderService.getCachedNightOrder(scriptData);

      if (cached) {
        // Use cached results - no loading state needed
        logger.debug('NightOrderContext', 'Using TabPreRenderService cached night order');
        setFirstNight({
          entries: cached.firstNight.entries,
          source: cached.firstNight.source,
          customPositions: new Map(),
        });
        setOtherNight({
          entries: cached.otherNight.entries,
          source: cached.otherNight.source,
          customPositions: new Map(),
        });
        setIsDirty(false);
        return;
      }

      // No cache - build fresh (show loading state for longer operations)
      setIsLoading(true);

      // Build first night order
      const firstNightResult = buildNightOrder(scriptData, 'first');
      setFirstNight({
        entries: firstNightResult.entries,
        source: firstNightResult.source,
        customPositions: new Map(),
      });

      // Build other night order
      const otherNightResult = buildNightOrder(scriptData, 'other');
      setOtherNight({
        entries: otherNightResult.entries,
        source: otherNightResult.source,
        customPositions: new Map(),
      });

      setIsDirty(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to build night order';
      setError(message);
      logger.error('NightOrderContext', 'Initialization error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Move an entry to a new position
   */
  const moveEntry = useCallback(
    (nightType: 'first' | 'other', entryId: string, newIndex: number) => {
      if (nightType === 'first') {
        setFirstNight((prev) => {
          const newEntries = moveNightOrderEntry(prev.entries, entryId, newIndex);
          if (newEntries === prev.entries) {
            return prev; // No change
          }

          // Update custom positions map
          const newPositions = new Map(prev.customPositions);
          newPositions.set(entryId, newIndex);

          return {
            ...prev,
            entries: newEntries,
            customPositions: newPositions,
          };
        });
      } else {
        setOtherNight((prev) => {
          const newEntries = moveNightOrderEntry(prev.entries, entryId, newIndex);
          if (newEntries === prev.entries) {
            return prev; // No change
          }

          // Update custom positions map
          const newPositions = new Map(prev.customPositions);
          newPositions.set(entryId, newIndex);

          return {
            ...prev,
            entries: newEntries,
            customPositions: newPositions,
          };
        });
      }
      setIsDirty(true);
    },
    []
  );

  /**
   * Reset ordering for a specific night type
   */
  const resetOrder = useCallback((nightType: 'first' | 'other') => {
    // To properly reset, we'd need to store the original script data
    // For now, just clear custom positions
    if (nightType === 'first') {
      setFirstNight((prev) => ({
        ...prev,
        customPositions: new Map(),
      }));
    } else {
      setOtherNight((prev) => ({
        ...prev,
        customPositions: new Map(),
      }));
    }
    setIsDirty(true);
  }, []);

  /**
   * Reset all ordering
   */
  const resetAll = useCallback(() => {
    setFirstNight((prev) => ({
      ...prev,
      customPositions: new Map(),
    }));
    setOtherNight((prev) => ({
      ...prev,
      customPositions: new Map(),
    }));
    setIsDirty(false);
  }, []);

  /**
   * Clear all data
   */
  const clear = useCallback(() => {
    setFirstNight(createEmptyNightOrderState());
    setOtherNight(createEmptyNightOrderState());
    setScriptMeta(null);
    setIsDirty(false);
    setError(null);
  }, []);

  // Memoize context value
  const value = useMemo<NightOrderContextValue>(
    () => ({
      // State
      firstNight,
      otherNight,
      scriptMeta,
      isDirty,
      isLoading,
      error,

      // Actions
      initializeFromScript,
      moveEntry,
      resetOrder,
      resetAll,
      clear,
    }),
    [
      firstNight,
      otherNight,
      scriptMeta,
      isDirty,
      isLoading,
      error,
      initializeFromScript,
      moveEntry,
      resetOrder,
      resetAll,
      clear,
    ]
  );

  return <NightOrderContext.Provider value={value}>{children}</NightOrderContext.Provider>;
}

/**
 * Hook to use the Night Order context
 */
export function useNightOrder(): NightOrderContextValue {
  const context = useContext(NightOrderContext);
  if (context === undefined) {
    throw new Error('useNightOrder must be used within a NightOrderProvider');
  }
  return context;
}

/**
 * Hook to check if Night Order context is available (optional usage)
 */
export function useNightOrderOptional(): NightOrderContextValue | undefined {
  return useContext(NightOrderContext);
}
