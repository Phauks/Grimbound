/**
 * Use Has Unsaved Work Hook
 *
 * Detects if the user has started work without an active project.
 * This is useful for prompting the user to save their work as a new project.
 *
 * @module hooks/sync/useHasUnsavedWork
 */

import { useMemo } from 'react';
import { useProjectContext } from '@/contexts/ProjectContext.js';
import { useTokenContext } from '@/contexts/TokenContext.js';

/**
 * Hook to detect if user has unsaved work
 *
 * Returns true if:
 * - No active project exists (currentProject === null)
 * - AND user has started working (has JSON input, characters, or tokens)
 *
 * @returns boolean - True if user has unsaved work without a project
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const hasUnsavedWork = useHasUnsavedWork();
 *
 *   if (hasUnsavedWork) {
 *     return <SaveAsNewProjectButton />;
 *   }
 * }
 * ```
 */
export function useHasUnsavedWork(): boolean {
  const { currentProject } = useProjectContext();
  const { jsonInput, characters, tokens } = useTokenContext();

  return useMemo(() => {
    // If there's already a project, no need to prompt
    if (currentProject) {
      return false;
    }

    // Has work if any of these conditions are met:
    const hasJsonInput = jsonInput.trim() !== '';
    const hasCharacters = characters.length > 0;
    const hasTokens = tokens.length > 0;

    return hasJsonInput || hasCharacters || hasTokens;
  }, [currentProject, jsonInput, characters, tokens]);
}
