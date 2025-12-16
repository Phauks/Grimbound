/**
 * Auto-Save Detector Hook
 *
 * Detects when project state changes and marks it as dirty.
 * Does NOT handle saving - that's useAutoSaveTrigger's job.
 *
 * @module hooks/useAutoSaveDetector
 */

import { useEffect, useRef } from 'react';
import { useProjectContext } from '../contexts/ProjectContext.js';
import { useTokenContext } from '../contexts/TokenContext.js';
import { logger } from '../ts/utils/index.js';

/**
 * Detects when project state changes and marks it as dirty
 *
 * This hook watches all token-related state and compares it to the previous
 * state. When a change is detected, it sets the isDirty flag in ProjectContext.
 *
 * Key design decisions:
 * - Only sets isDirty flag - doesn't save
 * - Minimal dependencies (no callbacks, no status objects)
 * - Simple string comparison (can optimize to deep equality later)
 * - Resets when project changes
 */
export function useAutoSaveDetector() {
  const { currentProject, setIsDirty, setAutoSaveStatus, incrementChangeVersion } =
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

  const previousStateRef = useRef<string | null>(null);
  const previousSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    logger.debug('AutoSaveDetector', 'Effect triggered', {
      hasProject: !!currentProject,
      projectId: currentProject?.id,
      characterCount: characters.length,
      tokensCount: tokens.length,
    });

    // No project = no detection needed
    if (!currentProject) {
      previousStateRef.current = null;
      previousSignatureRef.current = null;
      setIsDirty(false);
      logger.debug('AutoSaveDetector', 'No project - clearing dirty flag');
      return;
    }

    // PERFORMANCE OPTIMIZATION: Shallow signature check first
    // This is much faster than JSON.stringify and catches most changes
    const shallowSignature = `${characters.length}|${tokens.length}|${jsonInput.length}|${filters.teams.join(',')}|${filters.tokenTypes.join(',')}|${characterMetadata.size}`;

    // Quick check: if shallow signature matches, state likely hasn't changed
    if (previousSignatureRef.current === shallowSignature) {
      logger.debug('AutoSaveDetector', 'Shallow signature unchanged - skipping deep comparison');
      return;
    }

    // Shallow signature differs - do deep comparison with JSON.stringify
    const currentState = JSON.stringify({
      characters,
      scriptMeta,
      generationOptions,
      jsonInput,
      filters,
      characterMetadata: Object.fromEntries(characterMetadata),
      tokens: tokens.map((t) => ({ name: t.name, type: t.type, filename: t.filename })), // Lightweight token representation
    });

    // First run - just store state
    if (previousStateRef.current === null) {
      previousStateRef.current = currentState;
      logger.debug('AutoSaveDetector', 'Initial state captured for project', {
        projectId: currentProject.id,
        projectName: currentProject.name,
        stateLength: currentState.length,
      });
      return;
    }

    // Compare states
    const stateChanged = previousStateRef.current !== currentState;
    logger.debug('AutoSaveDetector', 'State comparison', {
      projectId: currentProject.id,
      stateChanged,
      prevLength: previousStateRef.current.length,
      currLength: currentState.length,
    });

    if (stateChanged) {
      logger.info('AutoSaveDetector', 'State changed - marking dirty and incrementing version', {
        projectId: currentProject.id,
      });

      // Update isDirty flag, status, AND increment change version
      setIsDirty(true);
      setAutoSaveStatus({
        state: 'idle',
        isDirty: true,
      });
      incrementChangeVersion(); // This will trigger the trigger effect!

      previousStateRef.current = currentState;
      previousSignatureRef.current = shallowSignature; // Track signature for next comparison
    } else {
      logger.debug('AutoSaveDetector', 'State unchanged - no dirty flag set');
    }
  }, [
    currentProject?.id,
    characters,
    scriptMeta,
    generationOptions,
    jsonInput,
    filters,
    characterMetadata,
    tokens,
    setIsDirty,
    setAutoSaveStatus,
    incrementChangeVersion,
    currentProject,
  ]);
}
