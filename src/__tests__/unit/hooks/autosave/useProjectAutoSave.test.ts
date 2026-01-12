/**
 * Unit tests for useProjectAutoSave hook
 *
 * Tests cover:
 * - Hook returns expected values
 * - Orchestration of useAutoSave (unified hook)
 * - isAutoSaveEnabled based on currentProject
 * - isUserEnabled based on enabled parameter
 * - useUnsavedChangesWarning functionality
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as ProjectContextModule from '@/contexts/ProjectContext';
import * as UseAutoSaveModule from '@/hooks/autosave/useAutoSave';
import { useProjectAutoSave, useUnsavedChangesWarning } from '@/hooks/autosave/useProjectAutoSave';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@/contexts/ProjectContext');
vi.mock('@/hooks/autosave/useAutoSave');

// ============================================================================
// Test Helpers
// ============================================================================

const createMockProjectContext = (overrides = {}) => ({
  currentProject: null,
  setCurrentProject: vi.fn(),
  projects: [],
  setProjects: vi.fn(),
  projectsLoaded: false,
  projectsLoading: false,
  autoSaveStatus: {
    isDirty: false,
    state: 'idle',
    lastSavedAt: null,
  },
  ...overrides,
});

const createMockAutoSaveResult = (overrides = {}) => ({
  saveNow: vi.fn(),
  conflictModalProps: {
    isOpen: false,
    onResolve: vi.fn(),
    onClose: vi.fn(),
  },
  telemetry: {
    saveCount: 0,
    errorCount: 0,
    lastError: null,
  },
  ...overrides,
});

// ============================================================================
// Tests
// ============================================================================

describe('useProjectAutoSave', () => {
  let mockProjectContext: ReturnType<typeof createMockProjectContext>;
  let mockAutoSaveResult: ReturnType<typeof createMockAutoSaveResult>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockProjectContext = createMockProjectContext();
    mockAutoSaveResult = createMockAutoSaveResult();

    vi.spyOn(ProjectContextModule, 'useProjectContext').mockReturnValue(
      mockProjectContext as ReturnType<typeof ProjectContextModule.useProjectContext>
    );
    vi.spyOn(UseAutoSaveModule, 'useAutoSave').mockReturnValue(mockAutoSaveResult);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // Hook Initialization
  // --------------------------------------------------------------------------

  describe('Hook Initialization', () => {
    it('should return expected values', () => {
      const { result } = renderHook(() => useProjectAutoSave());

      expect(result.current).toHaveProperty('saveNow');
      expect(result.current).toHaveProperty('conflictModalProps');
      expect(result.current).toHaveProperty('telemetry');
      expect(result.current).toHaveProperty('isAutoSaveEnabled');
      expect(result.current).toHaveProperty('isUserEnabled');
    });

    it('should call useAutoSave with enabled parameter', () => {
      renderHook(() => useProjectAutoSave(true));

      expect(UseAutoSaveModule.useAutoSave).toHaveBeenCalledWith(true);
    });

    it('should pass enabled=false to useAutoSave when disabled', () => {
      renderHook(() => useProjectAutoSave(false));

      expect(UseAutoSaveModule.useAutoSave).toHaveBeenCalledWith(false);
    });

    it('should default enabled to true', () => {
      renderHook(() => useProjectAutoSave());

      expect(UseAutoSaveModule.useAutoSave).toHaveBeenCalledWith(true);
    });
  });

  // --------------------------------------------------------------------------
  // isAutoSaveEnabled
  // --------------------------------------------------------------------------

  describe('isAutoSaveEnabled', () => {
    it('should be false when no current project', () => {
      const { result } = renderHook(() => useProjectAutoSave());

      expect(result.current.isAutoSaveEnabled).toBe(false);
    });

    it('should be true when current project exists', () => {
      mockProjectContext = createMockProjectContext({
        currentProject: { id: 'project-1', name: 'Test Project' },
      });
      vi.spyOn(ProjectContextModule, 'useProjectContext').mockReturnValue(
        mockProjectContext as ReturnType<typeof ProjectContextModule.useProjectContext>
      );

      const { result } = renderHook(() => useProjectAutoSave());

      expect(result.current.isAutoSaveEnabled).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // isUserEnabled
  // --------------------------------------------------------------------------

  describe('isUserEnabled', () => {
    it('should reflect enabled parameter when true', () => {
      const { result } = renderHook(() => useProjectAutoSave(true));

      expect(result.current.isUserEnabled).toBe(true);
    });

    it('should reflect enabled parameter when false', () => {
      const { result } = renderHook(() => useProjectAutoSave(false));

      expect(result.current.isUserEnabled).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // saveNow
  // --------------------------------------------------------------------------

  describe('saveNow', () => {
    it('should delegate to useAutoSave.saveNow', () => {
      const { result } = renderHook(() => useProjectAutoSave());

      act(() => {
        result.current.saveNow();
      });

      expect(mockAutoSaveResult.saveNow).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // conflictModalProps
  // --------------------------------------------------------------------------

  describe('conflictModalProps', () => {
    it('should pass through conflictModalProps from useAutoSave', () => {
      const customProps = {
        isOpen: true,
        onResolve: vi.fn(),
        onClose: vi.fn(),
      };
      mockAutoSaveResult = createMockAutoSaveResult({ conflictModalProps: customProps });
      vi.spyOn(UseAutoSaveModule, 'useAutoSave').mockReturnValue(mockAutoSaveResult);

      const { result } = renderHook(() => useProjectAutoSave());

      expect(result.current.conflictModalProps.isOpen).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // telemetry
  // --------------------------------------------------------------------------

  describe('telemetry', () => {
    it('should pass through telemetry from useAutoSave', () => {
      const customTelemetry = {
        saveCount: 5,
        errorCount: 1,
        lastError: 'Some error',
      };
      mockAutoSaveResult = createMockAutoSaveResult({ telemetry: customTelemetry });
      vi.spyOn(UseAutoSaveModule, 'useAutoSave').mockReturnValue(mockAutoSaveResult);

      const { result } = renderHook(() => useProjectAutoSave());

      expect(result.current.telemetry.saveCount).toBe(5);
      expect(result.current.telemetry.errorCount).toBe(1);
      expect(result.current.telemetry.lastError).toBe('Some error');
    });
  });
});

// ============================================================================
// useUnsavedChangesWarning Tests
// ============================================================================

describe('useUnsavedChangesWarning', () => {
  let mockProjectContext: ReturnType<typeof createMockProjectContext>;
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockProjectContext = createMockProjectContext();
    vi.spyOn(ProjectContextModule, 'useProjectContext').mockReturnValue(
      mockProjectContext as ReturnType<typeof ProjectContextModule.useProjectContext>
    );

    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should add beforeunload event listener on mount', () => {
    renderHook(() => useUnsavedChangesWarning());

    expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  it('should remove beforeunload event listener on unmount', () => {
    const { unmount } = renderHook(() => useUnsavedChangesWarning());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  it('should prevent unload when isDirty is true', () => {
    mockProjectContext = createMockProjectContext({
      autoSaveStatus: { isDirty: true, state: 'idle', lastSavedAt: null },
    });
    vi.spyOn(ProjectContextModule, 'useProjectContext').mockReturnValue(
      mockProjectContext as ReturnType<typeof ProjectContextModule.useProjectContext>
    );

    renderHook(() => useUnsavedChangesWarning());

    // Get the handler that was registered
    const handler = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === 'beforeunload'
    )?.[1] as (e: BeforeUnloadEvent) => void;

    expect(handler).toBeDefined();

    // Simulate beforeunload event
    const event = new Event('beforeunload') as BeforeUnloadEvent;
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    handler(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
    // Note: returnValue behavior varies in jsdom, so we just verify preventDefault was called
  });

  it('should prevent unload when state is saving', () => {
    mockProjectContext = createMockProjectContext({
      autoSaveStatus: { isDirty: false, state: 'saving', lastSavedAt: null },
    });
    vi.spyOn(ProjectContextModule, 'useProjectContext').mockReturnValue(
      mockProjectContext as ReturnType<typeof ProjectContextModule.useProjectContext>
    );

    renderHook(() => useUnsavedChangesWarning());

    // Get the handler that was registered
    const handler = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === 'beforeunload'
    )?.[1] as (e: BeforeUnloadEvent) => void;

    expect(handler).toBeDefined();

    // Simulate beforeunload event
    const event = new Event('beforeunload') as BeforeUnloadEvent;
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    handler(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('should not prevent unload when no unsaved changes and not saving', () => {
    mockProjectContext = createMockProjectContext({
      autoSaveStatus: { isDirty: false, state: 'idle', lastSavedAt: null },
    });
    vi.spyOn(ProjectContextModule, 'useProjectContext').mockReturnValue(
      mockProjectContext as ReturnType<typeof ProjectContextModule.useProjectContext>
    );

    renderHook(() => useUnsavedChangesWarning());

    // Get the handler that was registered
    const handler = addEventListenerSpy.mock.calls.find(
      (call) => call[0] === 'beforeunload'
    )?.[1] as (e: BeforeUnloadEvent) => void;

    expect(handler).toBeDefined();

    // Simulate beforeunload event
    const event = new Event('beforeunload') as BeforeUnloadEvent;
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

    handler(event);

    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });
});
