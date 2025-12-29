/**
 * PanelCoordinationContext
 *
 * Coordinates expandable panels so only one can be open at a time.
 * Panels register their close function, and when any panel opens,
 * all other panels are closed first.
 *
 * @module contexts/PanelCoordinationContext
 */

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';

interface PanelCoordinationContextType {
  /** Register a panel's close function. Returns an unregister function. */
  registerPanel: (id: string, closePanel: () => void) => () => void;
  /** Close all registered panels except the one with the given ID */
  closeOtherPanels: (exceptId?: string) => void;
}

const PanelCoordinationContext = createContext<PanelCoordinationContextType | null>(null);

export function PanelCoordinationProvider({ children }: { children: ReactNode }) {
  const panelsRef = useRef<Map<string, () => void>>(new Map());

  const registerPanel = useCallback((id: string, closePanel: () => void) => {
    panelsRef.current.set(id, closePanel);
    return () => {
      panelsRef.current.delete(id);
    };
  }, []);

  const closeOtherPanels = useCallback((exceptId?: string) => {
    for (const [id, closePanel] of panelsRef.current) {
      if (id !== exceptId) {
        closePanel();
      }
    }
  }, []);

  const value = useMemo(
    () => ({ registerPanel, closeOtherPanels }),
    [registerPanel, closeOtherPanels]
  );

  return (
    <PanelCoordinationContext.Provider value={value}>{children}</PanelCoordinationContext.Provider>
  );
}

/**
 * Hook to use panel coordination.
 * Returns undefined if not within a PanelCoordinationProvider (graceful degradation).
 */
export function usePanelCoordination(): PanelCoordinationContextType | undefined {
  return useContext(PanelCoordinationContext) ?? undefined;
}

/**
 * Hook that registers a panel and returns an onWillOpen callback.
 * Call this in components with expandable panels.
 *
 * @param panelId Unique identifier for this panel
 * @param getCloseFunction Function that returns the current close function
 */
export function useCoordinatedPanel(
  panelId: string,
  getCloseFunction: () => (() => void) | undefined
) {
  const coordination = usePanelCoordination();
  const closeFnRef = useRef(getCloseFunction);
  closeFnRef.current = getCloseFunction;

  // Register on mount with a wrapper that calls the current close function
  useEffect(() => {
    if (!coordination) return;
    return coordination.registerPanel(panelId, () => {
      closeFnRef.current()?.();
    });
  }, [coordination, panelId]);

  // Return the onWillOpen callback that closes other panels
  const onWillOpen = useCallback(() => {
    coordination?.closeOtherPanels(panelId);
  }, [coordination, panelId]);

  return onWillOpen;
}
