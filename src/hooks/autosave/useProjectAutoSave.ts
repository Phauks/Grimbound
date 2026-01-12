/**
 * Auto-Save Hook for Project Management
 *
 * Provides automatic state persistence with debouncing and snapshot management.
 * Monitors TokenContext for changes and saves to the active project.
 *
 * Uses the unified useAutoSave hook which detects changes AND triggers saves
 * in a single effect, eliminating the previous effect chain.
 *
 * @module hooks/autosave/useProjectAutoSave
 */

import { useEffect } from 'react';
import { useProjectContext } from '@/contexts/ProjectContext.js';
import { useAutoSave } from './useAutoSave.js';

/**
 * Auto-save hook for active project
 *
 * @param enabled - Whether auto-save is enabled (default: true)
 *
 * Usage:
 * ```tsx
 * function MyComponent() {
 *   const { isEnabled } = useAutoSavePreference();
 *   const { saveNow } = useProjectAutoSave(isEnabled);
 *   // ...
 * }
 * ```
 */
export function useProjectAutoSave(enabled: boolean = true) {
  const { currentProject } = useProjectContext();

  // Unified auto-save: detects changes and triggers saves in one effect
  const { saveNow, conflictModalProps, telemetry } = useAutoSave(enabled);

  return {
    saveNow,
    conflictModalProps, // Pass through conflict modal props for parent to render
    telemetry, // Pass through telemetry stats for debugging/analytics
    isAutoSaveEnabled: !!currentProject,
    isUserEnabled: enabled,
  };
}

// ============================================================================
// Utility Hook for Unsaved Changes Warning
// ============================================================================

/**
 * Hook to warn user about unsaved changes before navigation
 *
 * Shows warning when:
 * - User has unsaved changes (isDirty)
 * - OR a save is currently in progress (state === 'saving')
 *
 * This prevents users from closing the tab while a save is pending,
 * which could result in data loss with the 2-second debounce delay.
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
      // Warn if there are unsaved changes OR a save is currently in progress
      const hasUnsavedChanges = autoSaveStatus.isDirty;
      const isSaving = autoSaveStatus.state === 'saving';

      if (hasUnsavedChanges || isSaving) {
        e.preventDefault();
        e.returnValue = ''; // Chrome requires returnValue to be set
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [autoSaveStatus.isDirty, autoSaveStatus.state]);
}
