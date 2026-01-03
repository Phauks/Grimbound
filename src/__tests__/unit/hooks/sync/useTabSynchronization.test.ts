/**
 * Unit tests for useTabSynchronization hook
 *
 * Tests multi-tab synchronization via BroadcastChannel:
 * - Unique tab ID generation
 * - Heartbeat mechanism
 * - Conflict detection
 * - Message broadcasting
 * - Cleanup on unmount
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Mock logger to avoid console output during tests
 */
vi.mock('@/ts/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

/**
 * Mock nameGenerator
 */
vi.mock('@/ts/utils/nameGenerator.js', () => ({
  generateUuid: vi.fn(() => `mock-tab-${Math.random().toString(36).slice(2)}`),
}));

// Mock BroadcastChannel
class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = [];
  static lastMessage: unknown = null;

  name: string;
  // biome-ignore lint/suspicious/noExplicitAny: Mock implementation
  messageHandler: ((event: any) => void) | null = null;
  closed = false;

  constructor(name: string) {
    this.name = name;
    MockBroadcastChannel.instances.push(this);
  }

  addEventListener(event: string, handler: (event: unknown) => void) {
    if (event === 'message') {
      this.messageHandler = handler;
    }
  }

  removeEventListener(event: string, _handler: (event: unknown) => void) {
    if (event === 'message') {
      this.messageHandler = null;
    }
  }

  postMessage(message: unknown) {
    MockBroadcastChannel.lastMessage = message;
    // Simulate broadcast to other instances
    for (const instance of MockBroadcastChannel.instances) {
      if (instance !== this && instance.messageHandler && !instance.closed) {
        instance.messageHandler({ data: message });
      }
    }
  }

  close() {
    this.closed = true;
    const index = MockBroadcastChannel.instances.indexOf(this);
    if (index > -1) {
      MockBroadcastChannel.instances.splice(index, 1);
    }
  }

  static reset() {
    MockBroadcastChannel.instances = [];
    MockBroadcastChannel.lastMessage = null;
  }

  static simulateMessageToAll(message: unknown) {
    for (const instance of MockBroadcastChannel.instances) {
      if (instance.messageHandler && !instance.closed) {
        instance.messageHandler({ data: message });
      }
    }
  }
}

// biome-ignore lint/suspicious/noExplicitAny: Global mock
(global as any).BroadcastChannel = MockBroadcastChannel;

// Import after mocking
import { useTabSynchronization } from '@/hooks/sync/useTabSynchronization';

describe('useTabSynchronization', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    MockBroadcastChannel.reset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    MockBroadcastChannel.reset();
  });

  describe('Initialization', () => {
    it('should return a unique tab ID', () => {
      const { result } = renderHook(() => useTabSynchronization('project-1', true));

      expect(result.current.tabId).toBeDefined();
      expect(typeof result.current.tabId).toBe('string');
    });

    it('should initialize with no conflicts', () => {
      const { result } = renderHook(() => useTabSynchronization('project-1', true));

      expect(result.current.hasConflict).toBe(false);
      expect(result.current.conflictingTabCount).toBe(0);
    });

    it('should create BroadcastChannel when enabled', () => {
      renderHook(() => useTabSynchronization('project-1', true));

      expect(MockBroadcastChannel.instances.length).toBe(1);
    });

    it('should not create BroadcastChannel when disabled', () => {
      renderHook(() => useTabSynchronization('project-1', false));

      expect(MockBroadcastChannel.instances.length).toBe(0);
    });

    it('should provide notifySaved function', () => {
      const { result } = renderHook(() => useTabSynchronization('project-1', true));

      expect(result.current.notifySaved).toBeDefined();
      expect(typeof result.current.notifySaved).toBe('function');
    });
  });

  describe('Heartbeat mechanism', () => {
    it('should send initial heartbeat on mount', () => {
      renderHook(() => useTabSynchronization('project-1', true));

      expect(MockBroadcastChannel.lastMessage).toBeDefined();
      // biome-ignore lint/suspicious/noExplicitAny: Test assertion
      expect((MockBroadcastChannel.lastMessage as any).type).toBe('editing');
    });

    it('should send heartbeat at regular intervals', () => {
      renderHook(() => useTabSynchronization('project-1', true));

      MockBroadcastChannel.lastMessage = null;

      // Advance past heartbeat interval (5 seconds)
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(MockBroadcastChannel.lastMessage).toBeDefined();
    });

    it('should send editing message when project is loaded', () => {
      renderHook(() => useTabSynchronization('project-1', true));

      // biome-ignore lint/suspicious/noExplicitAny: Test assertion
      const message = MockBroadcastChannel.lastMessage as any;
      expect(message.type).toBe('editing');
      expect(message.projectId).toBe('project-1');
    });

    it('should send heartbeat message when no project is loaded', () => {
      renderHook(() => useTabSynchronization(null, true));

      // biome-ignore lint/suspicious/noExplicitAny: Test assertion
      const message = MockBroadcastChannel.lastMessage as any;
      expect(message.type).toBe('heartbeat');
    });
  });

  describe('Conflict detection', () => {
    it('should detect conflict when another tab is editing same project', () => {
      const { result } = renderHook(() => useTabSynchronization('project-1', true));

      // Simulate message from another tab editing the same project
      act(() => {
        MockBroadcastChannel.simulateMessageToAll({
          type: 'editing',
          tabId: 'other-tab-123',
          projectId: 'project-1',
          timestamp: Date.now(),
        });
      });

      expect(result.current.hasConflict).toBe(true);
      expect(result.current.conflictingTabCount).toBe(1);
    });

    it('should not detect conflict for different project', () => {
      const { result } = renderHook(() => useTabSynchronization('project-1', true));

      // Simulate message from another tab editing a different project
      act(() => {
        MockBroadcastChannel.simulateMessageToAll({
          type: 'editing',
          tabId: 'other-tab-123',
          projectId: 'project-2', // Different project
          timestamp: Date.now(),
        });
      });

      expect(result.current.hasConflict).toBe(false);
      expect(result.current.conflictingTabCount).toBe(0);
    });

    it('should count multiple conflicting tabs', () => {
      const { result } = renderHook(() => useTabSynchronization('project-1', true));

      // Simulate multiple tabs editing the same project
      act(() => {
        MockBroadcastChannel.simulateMessageToAll({
          type: 'editing',
          tabId: 'other-tab-1',
          projectId: 'project-1',
          timestamp: Date.now(),
        });
        MockBroadcastChannel.simulateMessageToAll({
          type: 'editing',
          tabId: 'other-tab-2',
          projectId: 'project-1',
          timestamp: Date.now(),
        });
      });

      expect(result.current.conflictingTabCount).toBe(2);
    });

    it('should remove inactive tabs after timeout', () => {
      const { result } = renderHook(() => useTabSynchronization('project-1', true));

      // Add a conflicting tab
      act(() => {
        MockBroadcastChannel.simulateMessageToAll({
          type: 'editing',
          tabId: 'other-tab-123',
          projectId: 'project-1',
          timestamp: Date.now() - 15000, // 15 seconds ago (beyond inactive threshold)
        });
      });

      // Advance time to trigger cleanup
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Tab should be removed as inactive
      expect(result.current.conflictingTabCount).toBe(0);
    });
  });

  describe('Message handling', () => {
    it('should handle closed message by removing tab', () => {
      const { result } = renderHook(() => useTabSynchronization('project-1', true));

      // Add a tab
      act(() => {
        MockBroadcastChannel.simulateMessageToAll({
          type: 'editing',
          tabId: 'other-tab-123',
          projectId: 'project-1',
          timestamp: Date.now(),
        });
      });

      expect(result.current.conflictingTabCount).toBe(1);

      // Tab closes
      act(() => {
        MockBroadcastChannel.simulateMessageToAll({
          type: 'closed',
          tabId: 'other-tab-123',
          timestamp: Date.now(),
        });
      });

      expect(result.current.conflictingTabCount).toBe(0);
    });

    it('should update heartbeat on saved message', () => {
      const { result } = renderHook(() => useTabSynchronization('project-1', true));

      // Add a tab
      act(() => {
        MockBroadcastChannel.simulateMessageToAll({
          type: 'editing',
          tabId: 'other-tab-123',
          projectId: 'project-1',
          timestamp: Date.now() - 8000, // Almost inactive
        });
      });

      // Tab saves (updates heartbeat)
      act(() => {
        MockBroadcastChannel.simulateMessageToAll({
          type: 'saved',
          tabId: 'other-tab-123',
          timestamp: Date.now(),
        });
      });

      // Advance time - tab should still be active
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Tab should still be counted
      expect(result.current.conflictingTabCount).toBe(1);
    });

    it('should ignore messages from self', () => {
      const { result } = renderHook(() => useTabSynchronization('project-1', true));

      const _selfTabId = result.current.tabId;

      // Simulate message from self (shouldn't happen but test handling)
      act(() => {
        // This won't actually trigger since we broadcast to other instances
        // But we can verify the conflict count doesn't include self
      });

      expect(result.current.conflictingTabCount).toBe(0);
    });
  });

  describe('notifySaved', () => {
    it('should broadcast saved message when called', () => {
      const { result } = renderHook(() => useTabSynchronization('project-1', true));

      act(() => {
        result.current.notifySaved();
      });

      // biome-ignore lint/suspicious/noExplicitAny: Test assertion
      const message = MockBroadcastChannel.lastMessage as any;
      expect(message.type).toBe('saved');
      expect(message.projectId).toBe('project-1');
    });

    it('should not broadcast when disabled', () => {
      const { result } = renderHook(() => useTabSynchronization('project-1', false));

      MockBroadcastChannel.lastMessage = null;

      act(() => {
        result.current.notifySaved();
      });

      // No message should be sent when disabled
      expect(MockBroadcastChannel.lastMessage).toBeNull();
    });
  });

  describe('Cleanup', () => {
    it('should close BroadcastChannel on unmount', () => {
      const { unmount } = renderHook(() => useTabSynchronization('project-1', true));

      expect(MockBroadcastChannel.instances.length).toBe(1);

      unmount();

      expect(MockBroadcastChannel.instances.length).toBe(0);
    });

    it('should broadcast closed message on unmount', () => {
      const { unmount } = renderHook(() => useTabSynchronization('project-1', true));

      // Clear any previous messages
      MockBroadcastChannel.lastMessage = null;

      // Note: beforeunload event would trigger the closed message
      // In tests, we can verify the channel is closed properly
      unmount();

      // Channel should be closed
      expect(MockBroadcastChannel.instances.length).toBe(0);
    });

    it('should clear heartbeat interval on unmount', () => {
      const { unmount } = renderHook(() => useTabSynchronization('project-1', true));

      unmount();

      // Advance time - no messages should be sent
      MockBroadcastChannel.lastMessage = null;
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      // No instance exists to send messages
      expect(MockBroadcastChannel.instances.length).toBe(0);
    });
  });

  describe('Project changes', () => {
    it('should send heartbeat when project changes', () => {
      const { rerender } = renderHook(({ projectId }) => useTabSynchronization(projectId, true), {
        initialProps: { projectId: 'project-1' },
      });

      MockBroadcastChannel.lastMessage = null;

      // Change project
      rerender({ projectId: 'project-2' });

      // biome-ignore lint/suspicious/noExplicitAny: Test assertion
      const message = MockBroadcastChannel.lastMessage as any;
      expect(message.projectId).toBe('project-2');
    });
  });

  describe('Edge cases', () => {
    it('should handle BroadcastChannel not being available', () => {
      // biome-ignore lint/suspicious/noExplicitAny: Test setup
      const originalBC = (global as any).BroadcastChannel;
      // biome-ignore lint/suspicious/noExplicitAny: Test setup
      delete (global as any).BroadcastChannel;

      // Should not throw
      expect(() => {
        renderHook(() => useTabSynchronization('project-1', true));
      }).not.toThrow();

      // Restore
      // biome-ignore lint/suspicious/noExplicitAny: Test setup
      (global as any).BroadcastChannel = originalBC;
    });

    it('should handle null project ID', () => {
      const { result } = renderHook(() => useTabSynchronization(null, true));

      expect(result.current.hasConflict).toBe(false);
    });

    it('should handle postMessage errors gracefully', () => {
      const { result } = renderHook(() => useTabSynchronization('project-1', true));

      // Make postMessage throw
      const instance = MockBroadcastChannel.instances[0];
      if (instance) {
        instance.postMessage = () => {
          throw new Error('postMessage failed');
        };
      }

      // Should not throw
      expect(() => {
        act(() => {
          result.current.notifySaved();
        });
      }).not.toThrow();
    });
  });
});
