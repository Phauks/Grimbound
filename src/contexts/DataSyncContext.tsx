/**
 * Blood on the Clocktower Token Generator
 * Data Sync Context - Provides sync service state to React components
 *
 * Features:
 * - Initializes DataSyncService on mount
 * - Provides sync status to components
 * - Exposes sync operations (checkForUpdates, clearCache, etc.)
 * - Listens to sync events and updates state
 */

import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { dataSyncService, type SyncEvent } from '../ts/sync/index.js';
import type { SyncStatus, Character } from '../ts/types/index.js';

interface DataSyncContextType {
  // Sync status
  status: SyncStatus;
  isInitialized: boolean;

  // Character data
  getCharacters: () => Promise<Character[]>;
  getCharacter: (id: string) => Promise<Character | null>;
  searchCharacters: (query: string) => Promise<Character[]>;

  // Sync operations
  checkForUpdates: () => Promise<boolean>;
  downloadUpdate: () => Promise<void>;
  clearCacheAndResync: () => Promise<void>;

  // Event subscription (for UI components that need real-time updates)
  subscribeToEvents: (listener: (event: SyncEvent) => void) => () => void;
}

const DataSyncContext = createContext<DataSyncContextType | undefined>(undefined);

interface DataSyncProviderProps {
  children: ReactNode;
}

export function DataSyncProvider({ children }: DataSyncProviderProps) {
  const [status, setStatus] = useState<SyncStatus>({
    state: 'idle',
    dataSource: 'offline',
    currentVersion: null,
    availableVersion: null,
    lastSync: null,
    error: null,
  });
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize sync service on mount
  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        console.log('[DataSyncContext] Initializing sync service...');

        // Subscribe to sync events before initialization
        const unsubscribe = dataSyncService.addEventListener((event) => {
          if (!mounted) return;

          console.log('[DataSyncContext] Sync event:', event.type, event.status);
          setStatus(event.status);

          if (event.type === 'initialized') {
            setIsInitialized(true);
          }
        });

        // Initialize the service
        await dataSyncService.initialize();

        // Get initial status
        if (mounted) {
          const initialStatus = dataSyncService.getStatus();
          setStatus(initialStatus);
          setIsInitialized(true);
          console.log('[DataSyncContext] Initialization complete:', initialStatus);
        }

        // Cleanup
        return () => {
          mounted = false;
          unsubscribe;
        };
      } catch (error) {
        console.error('[DataSyncContext] Initialization failed:', error);
        if (mounted) {
          setStatus({
            state: 'error',
            dataSource: 'offline',
            currentVersion: null,
            availableVersion: null,
            lastSync: null,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

  // Character data operations
  const getCharacters = useCallback(async () => {
    return dataSyncService.getCharacters();
  }, []);

  const getCharacter = useCallback(async (id: string) => {
    return dataSyncService.getCharacter(id);
  }, []);

  const searchCharacters = useCallback(async (query: string) => {
    return dataSyncService.searchCharacters(query);
  }, []);

  // Sync operations
  const checkForUpdates = useCallback(async () => {
    return dataSyncService.checkForUpdates();
  }, []);

  const downloadUpdate = useCallback(async () => {
    await dataSyncService.downloadAndInstall();
  }, []);

  const clearCacheAndResync = useCallback(async () => {
    await dataSyncService.clearCacheAndResync();
  }, []);

  // Event subscription for components that need real-time updates
  const subscribeToEvents = useCallback((listener: (event: SyncEvent) => void) => {
    dataSyncService.addEventListener(listener);
    return () => {
      dataSyncService.removeEventListener(listener);
    };
  }, []);

  const value: DataSyncContextType = {
    status,
    isInitialized,
    getCharacters,
    getCharacter,
    searchCharacters,
    checkForUpdates,
    downloadUpdate,
    clearCacheAndResync,
    subscribeToEvents,
  };

  return (
    <DataSyncContext.Provider value={value}>
      {children}
    </DataSyncContext.Provider>
  );
}

export function useDataSync() {
  const context = useContext(DataSyncContext);
  if (context === undefined) {
    throw new Error('useDataSync must be used within a DataSyncProvider');
  }
  return context;
}
