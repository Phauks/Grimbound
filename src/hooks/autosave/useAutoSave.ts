/**
 * useAutoSave Hook
 *
 * Unified auto-save that detects changes AND triggers saves.
 * Eliminates the effect chain between detector and trigger.
 *
 * @module hooks/autosave/useAutoSave
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useProjectContext } from '@/contexts/ProjectContext.js';
import { useProjectDatabaseService } from '@/contexts/ServiceContext';
import { useTokenContext } from '@/contexts/TokenContext.js';
import type { AutoSaveSnapshot, Project, ProjectState } from '@/ts/types/project.js';
import type { DebouncedFunction } from '@/ts/utils/asyncUtils.js';
import { retryOperation } from '@/ts/utils/errorUtils.js';
import { debounce, logger } from '@/ts/utils/index.js';
import { generateUuid } from '@/ts/utils/nameGenerator.js';
import { useTabSynchronization } from '../sync/useTabSynchronization.js';
import { useAutoSaveTelemetry } from './useAutoSaveTelemetry.js';

const AUTO_SAVE_DEBOUNCE_MS = 2000;
const MAX_SNAPSHOTS = 10;

/**
 * Unified auto-save hook that detects changes and triggers saves
 *
 * This hook combines what was previously split between useAutoSaveDetector
 * and useAutoSaveTrigger. It watches state changes and directly schedules
 * debounced saves, eliminating the intermediate isDirty/changeVersion
 * state that created an effect chain.
 */
export function useAutoSave(enabled: boolean = true) {
  const projectDatabaseService = useProjectDatabaseService();

  const { currentProject, setIsDirty, setAutoSaveStatus, setLastSavedAt, setCurrentProject } =
    useProjectContext();

  const {
    characters,
    scriptMeta,
    generationOptions,
    jsonInput,
    filters,
    characterMetadata,
    tokens,
  } = useTokenContext();

  // Refs for change detection
  const previousStateRef = useRef<string | null>(null);
  const previousSignatureRef = useRef<string | null>(null);
  const pendingSaveRef = useRef(false);

  // Telemetry
  const { recordSaveAttempt, getStats } = useAutoSaveTelemetry();

  // Tab sync
  const { hasConflict, conflictingTabCount, notifySaved } = useTabSynchronization(
    currentProject?.id || null,
    enabled
  );

  // Conflict warning state
  const [showConflictWarning, setShowConflictWarning] = useState(false);
  const [hasShownWarning, setHasShownWarning] = useState(false);

  // Save function ref (stable reference to latest implementation)
  const saveProjectRef = useRef<(() => Promise<void>) | undefined>(undefined);

  saveProjectRef.current = async () => {
    if (!currentProject) {
      logger.warn('AutoSave', 'Save called but no current project');
      return;
    }

    pendingSaveRef.current = true;
    const startTime = performance.now();

    try {
      setAutoSaveStatus({ state: 'saving', isDirty: true });
      logger.info('AutoSave', 'Starting save...', {
        projectId: currentProject.id,
        projectName: currentProject.name,
        characterCount: characters.length,
      });

      const currentState: ProjectState = {
        jsonInput,
        characters,
        scriptMeta,
        characterMetadata: Object.fromEntries(characterMetadata),
        generationOptions: { ...generationOptions },
        customIcons: currentProject.state.customIcons || [],
        presets: currentProject.state.presets || [],
        filters,
        schemaVersion: 1,
      };

      const stats = {
        characterCount: characters.length,
        tokenCount: 0,
        reminderCount: characters.reduce((sum, char) => sum + (char.reminders?.length || 0), 0),
        customIconCount: currentState.customIcons.length,
        presetCount: currentState.presets?.length || 0,
        lastGeneratedAt: currentProject.stats.lastGeneratedAt,
      };

      const updatedProject: Project = {
        ...currentProject,
        state: currentState,
        stats,
        lastModifiedAt: Date.now(),
        lastAccessedAt: Date.now(),
      };

      await retryOperation(() => projectDatabaseService.saveProject(updatedProject), 'AutoSave', {
        maxAttempts: 3,
        delayMs: 1000,
        shouldRetry: (error) => {
          if (error instanceof Error && error.name === 'QuotaExceededError') {
            return false;
          }
          return true;
        },
      });

      const snapshot: AutoSaveSnapshot = {
        id: generateUuid(),
        projectId: currentProject.id,
        timestamp: Date.now(),
        stateSnapshot: currentState,
      };
      await projectDatabaseService.saveSnapshot(snapshot);
      await projectDatabaseService.deleteOldSnapshots(currentProject.id, MAX_SNAPSHOTS);

      setCurrentProject(updatedProject);
      const now = Date.now();
      setLastSavedAt(now);
      setIsDirty(false);
      setAutoSaveStatus({ state: 'saved', isDirty: false });

      const duration = performance.now() - startTime;
      recordSaveAttempt(true, duration);

      logger.info('AutoSave', 'Save completed', {
        projectId: currentProject.id,
        durationMs: Math.round(duration),
      });

      notifySaved();
    } catch (error) {
      const duration = performance.now() - startTime;
      recordSaveAttempt(false, duration);

      logger.error('AutoSave', 'Save failed', error);

      let errorMessage = 'Failed to save project';
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        errorMessage = 'Storage full. Delete old projects to free space.';
      }

      setAutoSaveStatus({ state: 'error', isDirty: true, error: errorMessage });
    } finally {
      pendingSaveRef.current = false;
    }
  };

  // Stable wrapper - useCallback needed because it's a useEffect dependency
  const saveProject = useCallback(async () => {
    await saveProjectRef.current?.();
  }, []); // Empty deps - saveProjectRef.current is always latest

  // Debounced save - recreated when saveProject changes (which is stable)
  const debouncedSaveRef = useRef<DebouncedFunction<() => Promise<void>> | null>(null);

  useEffect(() => {
    debouncedSaveRef.current = debounce(saveProject, AUTO_SAVE_DEBOUNCE_MS);
    logger.debug('AutoSave', 'Debounced save function created');

    return () => {
      debouncedSaveRef.current?.cancel();
    };
  }, [saveProject]);

  // Show conflict warning
  useEffect(() => {
    if (hasConflict && !hasShownWarning && currentProject) {
      logger.warn('AutoSave', 'Showing tab conflict warning');
      setShowConflictWarning(true);
      setHasShownWarning(true);
    }
  }, [hasConflict, hasShownWarning, currentProject]);

  // UNIFIED: Detect changes AND trigger save in ONE effect
  useEffect(() => {
    if (!enabled) {
      logger.debug('AutoSave', 'Disabled');
      return;
    }

    if (!currentProject) {
      previousStateRef.current = null;
      previousSignatureRef.current = null;
      setIsDirty(false);
      return;
    }

    // Quick signature check
    const shallowSignature = `${characters.length}|${tokens.length}|${jsonInput.length}|${filters.teams.join(',')}|${filters.tokenTypes.join(',')}|${characterMetadata.size}`;

    if (previousSignatureRef.current === shallowSignature) {
      return; // Likely no change
    }

    // Deep comparison
    const currentState = JSON.stringify({
      characters,
      scriptMeta,
      generationOptions,
      jsonInput,
      filters,
      characterMetadata: Object.fromEntries(characterMetadata),
      tokens: tokens.map((t) => ({ name: t.name, type: t.type, filename: t.filename })),
    });

    // First run - capture initial state
    if (previousStateRef.current === null) {
      previousStateRef.current = currentState;
      previousSignatureRef.current = shallowSignature;
      return;
    }

    // Compare
    const stateChanged = previousStateRef.current !== currentState;

    if (stateChanged) {
      logger.info('AutoSave', 'Change detected - scheduling save');

      setIsDirty(true);
      setAutoSaveStatus({ state: 'idle', isDirty: true });

      previousStateRef.current = currentState;
      previousSignatureRef.current = shallowSignature;

      // Trigger debounced save directly - no effect chain!
      if (!pendingSaveRef.current && debouncedSaveRef.current) {
        debouncedSaveRef.current();
      }
    }
  }, [
    enabled,
    currentProject?.id,
    currentProject,
    characters,
    scriptMeta,
    generationOptions,
    jsonInput,
    filters,
    characterMetadata,
    tokens,
    setIsDirty,
    setAutoSaveStatus,
  ]);

  // Manual save
  const saveNow = async () => {
    if (!currentProject) return;
    logger.info('AutoSave', 'Manual save triggered');
    await saveProject();
  };

  const handleConflictContinue = () => {
    setShowConflictWarning(false);
  };

  const handleConflictClose = () => {
    setShowConflictWarning(false);
  };

  return {
    saveNow,
    conflictModalProps: {
      isOpen: showConflictWarning,
      conflictingTabCount,
      onContinue: handleConflictContinue,
      onClose: handleConflictClose,
    },
    telemetry: getStats(),
  };
}
