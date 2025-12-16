/**
 * Tab Synchronization Hook
 *
 * Detects and manages concurrent editing across multiple browser tabs.
 * Uses BroadcastChannel API to coordinate between tabs.
 *
 * Features:
 * - Unique tab ID generation
 * - Heartbeat mechanism to detect active tabs
 * - Edit conflict detection
 * - Tab coordination events
 *
 * @module hooks/useTabSynchronization
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { logger } from '../ts/utils/index.js';
import { generateUuid } from '../ts/utils/nameGenerator.js';

// Generate unique tab ID on module load (persists for session)
const TAB_ID = generateUuid();

// Heartbeat interval (5 seconds)
const HEARTBEAT_INTERVAL_MS = 5000;

// Consider tab inactive after missing 2 heartbeats (10 seconds)
const INACTIVE_THRESHOLD_MS = HEARTBEAT_INTERVAL_MS * 2;

/**
 * Message types for inter-tab communication
 */
type TabMessageType =
  | 'heartbeat' // Regular heartbeat to indicate tab is alive
  | 'editing' // Tab is actively editing a project
  | 'saved' // Tab saved changes
  | 'closed'; // Tab is closing

interface TabMessage {
  type: TabMessageType;
  tabId: string;
  projectId?: string;
  timestamp: number;
}

interface ActiveTab {
  tabId: string;
  lastHeartbeat: number;
  isEditing: boolean;
  projectId?: string;
}

interface TabSyncState {
  activeTabs: Map<string, ActiveTab>;
  hasConflict: boolean;
  conflictingTabCount: number;
}

/**
 * Hook for detecting and managing concurrent tab editing
 *
 * @param projectId - Current project ID (null if no project loaded)
 * @param enabled - Whether tab sync is enabled
 * @returns Tab synchronization state and control functions
 */
export function useTabSynchronization(projectId: string | null, enabled: boolean = true) {
  const [syncState, setSyncState] = useState<TabSyncState>({
    activeTabs: new Map(),
    hasConflict: false,
    conflictingTabCount: 0,
  });

  const channelRef = useRef<BroadcastChannel | null>(null);
  const heartbeatTimerRef = useRef<number | null>(null);
  const cleanupTimerRef = useRef<number | null>(null);
  const activeTabsRef = useRef<Map<string, ActiveTab>>(new Map());

  /**
   * Broadcast message to other tabs
   */
  const broadcast = useCallback(
    (message: Omit<TabMessage, 'tabId' | 'timestamp'>) => {
      if (!(channelRef.current && enabled)) return;

      const fullMessage: TabMessage = {
        ...message,
        tabId: TAB_ID,
        timestamp: Date.now(),
      };

      try {
        channelRef.current.postMessage(fullMessage);
        logger.debug('TabSync', 'Broadcasted message', {
          type: message.type,
          projectId: message.projectId,
        });
      } catch (error) {
        logger.error('TabSync', 'Failed to broadcast message', error);
      }
    },
    [enabled]
  );

  /**
   * Update active tabs and detect conflicts
   */
  const updateActiveTabs = useCallback(() => {
    const now = Date.now();
    const activeTabs = new Map(activeTabsRef.current);

    // Remove inactive tabs (missed heartbeats)
    for (const [tabId, tab] of activeTabs.entries()) {
      if (now - tab.lastHeartbeat > INACTIVE_THRESHOLD_MS) {
        logger.debug('TabSync', 'Tab inactive, removing', { tabId });
        activeTabs.delete(tabId);
      }
    }

    // Count tabs editing the same project
    let conflictingTabCount = 0;
    if (projectId) {
      for (const tab of activeTabs.values()) {
        if (tab.projectId === projectId && tab.isEditing) {
          conflictingTabCount++;
        }
      }
    }

    const hasConflict = conflictingTabCount > 0;

    activeTabsRef.current = activeTabs;
    setSyncState({
      activeTabs,
      hasConflict,
      conflictingTabCount,
    });

    if (hasConflict) {
      logger.warn('TabSync', 'Concurrent editing detected', {
        projectId,
        conflictingTabs: conflictingTabCount,
      });
    }
  }, [projectId]);

  /**
   * Handle incoming messages from other tabs
   */
  const handleMessage = useCallback(
    (event: MessageEvent<TabMessage>) => {
      const message = event.data;

      // Ignore messages from self
      if (message.tabId === TAB_ID) return;

      logger.debug('TabSync', 'Received message', {
        type: message.type,
        from: message.tabId.slice(0, 8),
      });

      const activeTabs = activeTabsRef.current;

      switch (message.type) {
        case 'heartbeat':
        case 'editing':
          activeTabs.set(message.tabId, {
            tabId: message.tabId,
            lastHeartbeat: message.timestamp,
            isEditing: message.type === 'editing',
            projectId: message.projectId,
          });
          break;

        case 'saved': {
          // Another tab saved - update their heartbeat
          const existingTab = activeTabs.get(message.tabId);
          if (existingTab) {
            existingTab.lastHeartbeat = message.timestamp;
          }
          break;
        }

        case 'closed':
          activeTabs.delete(message.tabId);
          break;
      }

      updateActiveTabs();
    },
    [updateActiveTabs]
  );

  /**
   * Send heartbeat to indicate this tab is alive
   */
  const sendHeartbeat = useCallback(() => {
    broadcast({
      type: projectId ? 'editing' : 'heartbeat',
      projectId: projectId || undefined,
    });
  }, [broadcast, projectId]);

  /**
   * Notify other tabs that we saved
   */
  const notifySaved = useCallback(() => {
    broadcast({
      type: 'saved',
      projectId: projectId || undefined,
    });
  }, [broadcast, projectId]);

  // Initialize BroadcastChannel
  useEffect(() => {
    if (!enabled || typeof BroadcastChannel === 'undefined') {
      logger.warn('TabSync', 'BroadcastChannel not available or disabled');
      return;
    }

    logger.info('TabSync', 'Initializing tab synchronization', { tabId: TAB_ID.slice(0, 8) });

    // Create broadcast channel
    channelRef.current = new BroadcastChannel('clocktower-token-generator');
    channelRef.current.addEventListener('message', handleMessage);

    // Send initial heartbeat
    sendHeartbeat();

    // Start heartbeat interval
    heartbeatTimerRef.current = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    // Start cleanup interval (check for inactive tabs)
    cleanupTimerRef.current = window.setInterval(updateActiveTabs, HEARTBEAT_INTERVAL_MS);

    // Notify other tabs when closing
    const handleUnload = () => {
      broadcast({ type: 'closed' });
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      // Cleanup
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
      }
      if (cleanupTimerRef.current) {
        clearInterval(cleanupTimerRef.current);
      }
      if (channelRef.current) {
        channelRef.current.removeEventListener('message', handleMessage);
        channelRef.current.close();
      }
      window.removeEventListener('beforeunload', handleUnload);

      logger.info('TabSync', 'Tab synchronization stopped');
    };
  }, [enabled, handleMessage, sendHeartbeat, broadcast, updateActiveTabs]);

  // Update editing status when project changes
  useEffect(() => {
    if (enabled && projectId) {
      sendHeartbeat();
    }
  }, [enabled, projectId, sendHeartbeat]);

  return {
    /** Unique identifier for this tab */
    tabId: TAB_ID,
    /** Current sync state */
    ...syncState,
    /** Notify other tabs that we saved */
    notifySaved,
  };
}
