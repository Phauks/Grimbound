/**
 * useProjectTokens Hook
 *
 * Manages token generation for project preview, handling both active and
 * non-active project states with proper abort handling and caching.
 *
 * Extracted from ProjectEditor for single responsibility.
 *
 * @module hooks/projects/useProjectTokens
 */

import { useEffect, useRef, useState } from 'react';
import { generateAllTokens } from '@/ts/generation/batchGenerator.js';
import type { GenerationProgress, Token } from '@/ts/types/index.js';
import type { Project } from '@/ts/types/project.js';
import { logger } from '@/ts/utils/logger.js';

// ============================================================================
// Types
// ============================================================================

export type DisplayMode = 'tokens' | 'list' | 'json';

export interface UseProjectTokensOptions {
  /** The project to generate tokens for */
  project: Project | null;
  /** Whether this project is currently active in the app */
  isActiveProject: boolean;
  /** Current display mode (tokens are only generated when mode is 'tokens') */
  displayMode: DisplayMode;
  /** Context tokens from TokenContext (used for active projects) */
  contextTokens: Token[];
  /** Setter for context tokens (used to update TokenContext) */
  setContextTokens: (tokens: Token[]) => void;
}

export interface UseProjectTokensResult {
  /** Tokens to display (either context tokens or preview tokens) */
  displayTokens: Token[];
  /** Whether token generation is in progress */
  isGenerating: boolean;
  /** Detailed generation progress (null when not generating) */
  generationProgress: GenerationProgress | null;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing token generation for project preview.
 *
 * Handles two scenarios:
 * 1. **Active project**: Uses tokens from TokenContext, generates if empty
 * 2. **Non-active project**: Generates preview tokens locally
 *
 * Features:
 * - Automatic abort on project change or unmount
 * - Lazy generation (only when display mode is 'tokens')
 * - Caches last generated tokens for transfer to context
 *
 * @example
 * ```tsx
 * const { displayTokens, isGenerating } = useProjectTokens({
 *   project,
 *   isActiveProject: currentProject?.id === project?.id,
 *   displayMode,
 *   contextTokens: tokens,
 *   setContextTokens: setTokens,
 * });
 *
 * if (isGenerating) return <LoadingSpinner />;
 * return <TokenGrid tokens={displayTokens} />;
 * ```
 */
export function useProjectTokens({
  project,
  isActiveProject,
  displayMode,
  contextTokens,
  setContextTokens,
}: UseProjectTokensOptions): UseProjectTokensResult {
  const [previewTokens, setPreviewTokens] = useState<Token[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastPreviewTokensRef = useRef<Token[]>([]);

  // Cleanup on unmount
  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    []
  );

  // Generate preview tokens for non-active projects
  useEffect(() => {
    if (!project || isActiveProject) {
      // Transfer preview tokens to context when project becomes active
      if (isActiveProject && lastPreviewTokensRef.current.length > 0) {
        setContextTokens(lastPreviewTokensRef.current);
        lastPreviewTokensRef.current = [];
      }
      setPreviewTokens([]);
      setIsGenerating(false);
      abortControllerRef.current?.abort();
      return;
    }

    // Only generate when in tokens display mode
    if (displayMode !== 'tokens' || previewTokens.length > 0) {
      setIsGenerating(false);
      return;
    }

    const generate = async () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();
      setIsGenerating(true);

      try {
        const generated = await generateAllTokens(
          project.state.characters,
          project.state.generationOptions,
          null, // progressCallback
          project.state.scriptMeta,
          null, // tokenCallback
          abortControllerRef.current.signal,
          undefined, // characterMetadata
          setGenerationProgress // detailedProgressCallback
        );
        setPreviewTokens(generated);
        lastPreviewTokensRef.current = generated;
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          logger.error('useProjectTokens', 'Failed to generate preview tokens', err);
        }
      } finally {
        setIsGenerating(false);
        setGenerationProgress(null);
      }
    };

    generate();
  }, [project?.id, isActiveProject, displayMode, previewTokens.length, project, setContextTokens]);

  // Generate tokens for active project after page refresh
  useEffect(() => {
    if (
      !(project && isActiveProject) ||
      contextTokens.length > 0 ||
      isGenerating ||
      displayMode !== 'tokens'
    ) {
      return;
    }

    const generate = async () => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();
      setIsGenerating(true);

      try {
        const generated = await generateAllTokens(
          project.state.characters,
          project.state.generationOptions,
          null, // progressCallback
          project.state.scriptMeta,
          null, // tokenCallback
          abortControllerRef.current.signal,
          undefined, // characterMetadata
          setGenerationProgress // detailedProgressCallback
        );
        setContextTokens(generated);
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          logger.error('useProjectTokens', 'Failed to generate tokens for active project', err);
        }
      } finally {
        setIsGenerating(false);
        setGenerationProgress(null);
      }
    };

    generate();
  }, [
    project?.id,
    isActiveProject,
    contextTokens.length,
    isGenerating,
    displayMode,
    project,
    setContextTokens,
  ]);

  const displayTokens = isActiveProject ? contextTokens : previewTokens;

  return { displayTokens, isGenerating, generationProgress };
}
