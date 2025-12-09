/**
 * Auto-Save Hook for Project Management
 *
 * Provides automatic state persistence with debouncing and snapshot management.
 * Monitors TokenContext for changes and saves to the active project.
 *
 * @module hooks/useProjectAutoSave
 */

import { useEffect, useCallback, useRef } from 'react';
import { useTokenContext } from '../contexts/TokenContext';
import { useProjectContext } from '../contexts/ProjectContext';
import { projectDatabaseService } from '../ts/services/project';
import { debounce } from '../ts/utils/index.js';
import { generateUuid } from '../ts/utils/nameGenerator.js';
import type { Project, AutoSaveSnapshot, ProjectState } from '../ts/types/project.js';

// ============================================================================
// Constants
// ============================================================================

const AUTO_SAVE_DEBOUNCE_MS = 2000; // 2 seconds
const MAX_SNAPSHOTS = 10; // Keep last 10 snapshots

// ============================================================================
// Hook
// ============================================================================

/**
 * Auto-save hook for active project
 *
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   useProjectAutoSave();
 *   // ...
 * }
 * ```
 */
export function useProjectAutoSave() {
  const {
    characters,
    scriptMeta,
    generationOptions,
    jsonInput,
    filters,
    characterMetadata,
  } = useTokenContext();

  const {
    currentProject,
    setCurrentProject,
    autoSaveStatus,
    setAutoSaveStatus,
    setLastSavedAt,
  } = useProjectContext();

  // Track previous state to detect changes
  const previousStateRef = useRef<string | null>(null);

  /**
   * Create a project state snapshot from current TokenContext
   */
  const captureCurrentState = useCallback((): ProjectState => {
    return {
      jsonInput,
      characters,
      scriptMeta,
      characterMetadata: Object.fromEntries(characterMetadata),
      generationOptions: { ...generationOptions },
      customIcons: currentProject?.state.customIcons || [], // Preserve custom icons from project
      filters,
      schemaVersion: 1,
    };
  }, [characters, scriptMeta, generationOptions, jsonInput, filters, characterMetadata, currentProject]);

  /**
   * Save the current state to the active project
   */
  const saveProject = useCallback(async () => {
    if (!currentProject) {
      return; // No active project to save
    }

    try {
      // Update status to saving
      setAutoSaveStatus({
        state: 'saving',
        isDirty: false,
        lastSavedAt: autoSaveStatus.lastSavedAt,
      });

      // Capture current state
      const currentState = captureCurrentState();

      // Calculate stats
      const stats = {
        characterCount: characters.length,
        tokenCount: 0, // Will be updated when tokens are generated
        reminderCount: characters.reduce(
          (sum, char) => sum + (char.reminders?.length || 0),
          0
        ),
        customIconCount: currentState.customIcons.length,
        presetCount: 0,
        lastGeneratedAt: currentProject.stats.lastGeneratedAt,
      };

      // Create updated project
      const updatedProject: Project = {
        ...currentProject,
        state: currentState,
        stats,
        lastModifiedAt: Date.now(),
        lastAccessedAt: Date.now(),
      };

      // Save to database
      await projectDatabaseService.saveProject(updatedProject);

      // Save snapshot for undo/recovery
      const snapshot: AutoSaveSnapshot = {
        id: generateUuid(),
        projectId: currentProject.id,
        timestamp: Date.now(),
        stateSnapshot: currentState,
      };
      await projectDatabaseService.saveSnapshot(snapshot);

      // Clean up old snapshots
      await projectDatabaseService.deleteOldSnapshots(currentProject.id, MAX_SNAPSHOTS);

      // Update context
      setCurrentProject(updatedProject);
      const savedAt = Date.now();
      setLastSavedAt(savedAt);

      // Update status to saved
      setAutoSaveStatus({
        state: 'saved',
        isDirty: false,
        lastSavedAt: savedAt,
      });
    } catch (error) {
      console.error('Auto-save failed:', error);

      // Update status to error
      setAutoSaveStatus({
        state: 'error',
        isDirty: true,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [
    currentProject,
    captureCurrentState,
    characters,
    setCurrentProject,
    setAutoSaveStatus,
    setLastSavedAt,
    autoSaveStatus.lastSavedAt,
  ]);

  // Create debounced save function
  const debouncedSave = useRef(debounce(saveProject, AUTO_SAVE_DEBOUNCE_MS));

  /**
   * Trigger auto-save when state changes
   */
  useEffect(() => {
    if (!currentProject) {
      return; // No active project
    }

    // Serialize current state for comparison
    const currentState = JSON.stringify(captureCurrentState());

    // Check if state has changed
    if (previousStateRef.current === null) {
      // First render - just store state
      previousStateRef.current = currentState;
      return;
    }

    if (previousStateRef.current !== currentState) {
      // State has changed - mark as dirty and trigger debounced save
      setAutoSaveStatus({
        state: 'idle',
        isDirty: true,
        lastSavedAt: autoSaveStatus.lastSavedAt,
      });

      debouncedSave.current();
      previousStateRef.current = currentState;
    }
  }, [
    currentProject,
    captureCurrentState,
    setAutoSaveStatus,
    autoSaveStatus.lastSavedAt,
  ]);

  /**
   * Cancel pending saves on unmount
   */
  useEffect(() => {
    return () => {
      debouncedSave.current.cancel();
    };
  }, []);

  /**
   * Manual save function (for "Save Now" button)
   */
  const saveNow = useCallback(async () => {
    debouncedSave.current.cancel(); // Cancel debounced save
    await saveProject(); // Save immediately
  }, [saveProject]);

  return {
    saveNow,
    autoSaveStatus,
    isAutoSaveEnabled: !!currentProject,
  };
}

// ============================================================================
// Utility Hook for Unsaved Changes Warning
// ============================================================================

/**
 * Hook to warn user about unsaved changes before navigation
 *
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   useUnsavedChangesWarning();
 *   // ...
 * }
 * ```
 */
export function useUnsavedChangesWarning() {
  const { autoSaveStatus } = useProjectContext();

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (autoSaveStatus.isDirty) {
        e.preventDefault();
        e.returnValue = ''; // Chrome requires returnValue to be set
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [autoSaveStatus.isDirty]);
}
