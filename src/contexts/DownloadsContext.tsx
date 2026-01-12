/**
 * Downloads Context
 *
 * Provides a centralized way for views to register their available downloads.
 * The DownloadsDrawer reads from this context to display view-specific options.
 *
 * @module contexts/DownloadsContext
 */

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import type { BundleData } from '@/ts/export/zipExporter.js';

// Re-export BundleData for consumers (SSOT is zipExporter)
export type { BundleData };

/**
 * Download categories for grouping in ExportView
 */
export type DownloadCategory =
  | 'featured'
  | 'json'
  | 'tokens'
  | 'script'
  | 'token-sets'
  | 'character';

/**
 * Represents a single downloadable item
 */
export interface DownloadItem {
  /** Unique identifier for this download option */
  id: string;
  /** Icon to display (emoji or icon component) */
  icon: string;
  /** Primary label for the download */
  label: string;
  /** Secondary description text */
  description: string;
  /** Function to execute the download */
  action: () => Promise<void> | void;
  /** Optional: Returns blob data for bundling into combined ZIP (used by Download All) */
  getBlob?: () => Promise<BundleData | BundleData[] | null>;
  /** Whether this download is currently disabled */
  disabled?: boolean;
  /** Reason why the download is disabled */
  disabledReason?: string;
  /** Optional: Show loading state during action */
  showProgress?: boolean;
  /** Category for grouping in ExportView */
  category: DownloadCategory;
  /** Show in Featured section (always visible in ExportView) */
  featured?: boolean;
  /** Which view registered this download (for debugging) */
  sourceView?: string;
}

/**
 * Downloads context value
 */
interface DownloadsContextValue {
  /** Currently registered download items */
  downloads: DownloadItem[];
  /** Whether the drawer is open */
  isOpen: boolean;
  /** Open the downloads drawer */
  openDrawer: () => void;
  /** Close the downloads drawer */
  closeDrawer: () => void;
  /** Toggle the drawer open/closed */
  toggleDrawer: () => void;
  /** Register downloads for the current view (replaces previous) */
  setDownloads: (downloads: DownloadItem[]) => void;
  /** Clear all downloads (call when view unmounts) */
  clearDownloads: () => void;
  /** Currently executing download ID (for loading state) */
  executingId: string | null;
  /** Execute a download action with loading state */
  executeDownload: (item: DownloadItem) => Promise<void>;
}

const DownloadsContext = createContext<DownloadsContextValue | null>(null);

/**
 * Downloads Provider
 * Wrap your app with this to enable downloads drawer functionality.
 */
export function DownloadsProvider({ children }: { children: ReactNode }) {
  const [downloads, setDownloadsState] = useState<DownloadItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);

  // useCallback required: these functions are exposed in context and may be used as useEffect dependencies
  const openDrawer = useCallback(() => setIsOpen(true), []);
  const closeDrawer = useCallback(() => setIsOpen(false), []);
  const toggleDrawer = useCallback(() => setIsOpen((prev) => !prev), []);

  // useCallback required: these functions are used as useEffect dependencies by consumers
  const setDownloads = useCallback((newDownloads: DownloadItem[]) => {
    setDownloadsState(newDownloads);
  }, []);

  const clearDownloads = useCallback(() => {
    setDownloadsState([]);
  }, []);

  // useCallback required: exposed in context value
  const executeDownload = useCallback(async (item: DownloadItem) => {
    if (item.disabled) return;

    try {
      setExecutingId(item.id);
      await item.action();
    } finally {
      setExecutingId(null);
    }
  }, []);

  // useMemo required: context value object must be stable to prevent consumer re-renders
  const value: DownloadsContextValue = useMemo(
    () => ({
      downloads,
      isOpen,
      openDrawer,
      closeDrawer,
      toggleDrawer,
      setDownloads,
      clearDownloads,
      executingId,
      executeDownload,
    }),
    [
      downloads,
      isOpen,
      openDrawer,
      closeDrawer,
      toggleDrawer,
      setDownloads,
      clearDownloads,
      executingId,
      executeDownload,
    ]
  );

  return <DownloadsContext.Provider value={value}>{children}</DownloadsContext.Provider>;
}

/**
 * Hook to access downloads context
 */
export function useDownloadsContext(): DownloadsContextValue {
  const context = useContext(DownloadsContext);
  if (!context) {
    throw new Error('useDownloadsContext must be used within a DownloadsProvider');
  }
  return context;
}

/**
 * Convenience hook for registering downloads in a view
 * Call this in useEffect to register/unregister downloads when view mounts/unmounts
 */
export function useRegisterDownloads(downloads: DownloadItem[], _deps: unknown[] = []) {
  const { setDownloads, clearDownloads } = useDownloadsContext();

  // Use useEffect to register downloads when component mounts or deps change
  // Note: This should be called with useEffect in the consuming component
  return {
    register: () => setDownloads(downloads),
    unregister: clearDownloads,
  };
}
