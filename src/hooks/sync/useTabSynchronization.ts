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
 * @module hooks/sync/useTabSynchronization
 */

import { useEffect, useRef, useState } from 'react';
import { logger } from '@/ts/utils/index.js';
import { generateUuid } from '@/ts/utils/nameGenerator.js';

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
  const broadcast = (message: Omit<TabMessage, 'tabId' | 'timestamp'>) => {
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
  };

  /**
   * Update active tabs and detect conflicts
   * Only updates state if something actually changed to avoid unnecessary re-renders
   */
  const updateActiveTabs = () => {
    const now = Date.now();
    const currentTabs = activeTabsRef.current;

    // Find inactive tabs
    const inactiveTabIds = [...currentTabs.entries()]
      .filter(([, tab]) => now - tab.lastHeartbeat > INACTIVE_THRESHOLD_MS)
      .map(([tabId]) => tabId);

    // Remove inactive tabs if any
    if (inactiveTabIds.length > 0) {
      const activeTabs = new Map(currentTabs);
      for (const tabId of inactiveTabIds) {
        logger.debug('TabSync', 'Tab inactive, removing', { tabId });
        activeTabs.delete(tabId);
      }
      activeTabsRef.current = activeTabs;
    }

    // Count conflicting tabs
    const conflictingTabCount = projectId
      ? [...activeTabsRef.current.values()].filter(
          (tab) => tab.projectId === projectId && tab.isEditing
        ).length
      : 0;

    const hasConflict = conflictingTabCount > 0;

    // Only update state if something changed
    setSyncState((prev) => {
      const unchanged =
        prev.hasConflict === hasConflict &&
        prev.conflictingTabCount === conflictingTabCount &&
        prev.activeTabs.size === activeTabsRef.current.size;

      if (unchanged) return prev;

      if (hasConflict) {
        logger.warn('TabSync', 'Concurrent editing detected', { projectId, conflictingTabCount });
      }

      return { activeTabs: activeTabsRef.current, hasConflict, conflictingTabCount };
    });
  };

  /**
   * Handle incoming messages from other tabs
   */
  const handleMessage = (event: MessageEvent<TabMessage>) => {
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
      default:
        // Unknown message type - ignore
        break;
    }

    updateActiveTabs();
  };

  /**
   * Send heartbeat to indicate this tab is alive
   */
  const sendHeartbeat = () => {
    broadcast({
      type: projectId ? 'editing' : 'heartbeat',
      projectId: projectId || undefined,
    });
  };

  /**
   * Notify other tabs that we saved
   */
  const notifySaved = () => {
    broadcast({
      type: 'saved',
      projectId: projectId || undefined,
    });
  };

  // Store callbacks in refs so the effect doesn't re-run when they change
  const handleMessageRef = useRef(handleMessage);
  const sendHeartbeatRef = useRef(sendHeartbeat);
  const broadcastRef = useRef(broadcast);
  const updateActiveTabsRef = useRef(updateActiveTabs);

  // Keep refs up to date
  useEffect(() => {
    handleMessageRef.current = handleMessage;
    sendHeartbeatRef.current = sendHeartbeat;
    broadcastRef.current = broadcast;
    updateActiveTabsRef.current = updateActiveTabs;
  });

  // Initialize BroadcastChannel - only depends on `enabled`
  useEffect(() => {
    if (!enabled || typeof BroadcastChannel === 'undefined') {
      logger.warn('TabSync', 'BroadcastChannel not available or disabled');
      return;
    }

    logger.info('TabSync', 'Initializing tab synchronization', { tabId: TAB_ID.slice(0, 8) });

    // Create broadcast channel
    channelRef.current = new BroadcastChannel('clocktower-token-generator');

    // Message handler wrapper that uses ref
    const messageHandler = (event: MessageEvent<TabMessage>) => {
      handleMessageRef.current(event);
    };
    channelRef.current.addEventListener('message', messageHandler);

    // Send initial heartbeat
    sendHeartbeatRef.current();

    // Start heartbeat interval (uses ref so it always calls latest version)
    heartbeatTimerRef.current = window.setInterval(() => {
      sendHeartbeatRef.current();
    }, HEARTBEAT_INTERVAL_MS);

    // Start cleanup interval (check for inactive tabs)
    cleanupTimerRef.current = window.setInterval(() => {
      updateActiveTabsRef.current();
    }, HEARTBEAT_INTERVAL_MS);

    // Notify other tabs when closing
    const handleUnload = () => {
      broadcastRef.current({ type: 'closed' });
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
        channelRef.current.removeEventListener('message', messageHandler);
        channelRef.current.close();
      }
      window.removeEventListener('beforeunload', handleUnload);

      logger.info('TabSync', 'Tab synchronization stopped');
    };
  }, [enabled]); // Only re-run when enabled changes!

  // Update editing status when project changes
  useEffect(() => {
    if (enabled && projectId) {
      sendHeartbeatRef.current();
    }
  }, [enabled, projectId]);

  return {
    /** Unique identifier for this tab */
    tabId: TAB_ID,
    /** Current sync state */
    ...syncState,
    /** Notify other tabs that we saved */
    notifySaved,
  };
}
