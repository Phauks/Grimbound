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
import type {
  Character,
  CharacterMetadata,
  GenerationOptions,
  GenerationProgress,
  ScriptMeta,
  Token,
} from '@/ts/types/index.js';
import type { Project } from '@/ts/types/project.js';

// ============================================================================
// Types
// ============================================================================

export type DisplayMode = 'tokens' | 'list' | 'json';

/**
 * Type for the generateAllTokens function signature.
 * Matches the signature from batchGenerator.
 */
export type GenerateAllTokensFn = (
  characters: Character[],
  options: Partial<GenerationOptions>,
  progressCallback: ((current: number, total: number) => void) | null,
  scriptMeta: ScriptMeta | null,
  tokenCallback: ((token: Token) => void) | null,
  abortSignal?: AbortSignal,
  characterMetadata?: Map<string, CharacterMetadata>,
  detailedProgressCallback?: ((progress: GenerationProgress) => void) | null
) => Promise<Token[]>;

/**
 * Type for the logger interface used by this hook.
 */
export interface UseProjectTokensLogger {
  error: (module: string, message: string, error?: unknown) => void;
}

/**
 * Dependencies that must be injected.
 * This enables testing without loading heavy modules like TokenGenerator.
 */
export interface UseProjectTokensDeps {
  /** Token generation function */
  generateAllTokens: GenerateAllTokensFn;
  /** Logger instance */
  logger: UseProjectTokensLogger;
}

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
  /** Dependencies - required for DI pattern */
  deps: UseProjectTokensDeps;
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
  deps,
}: UseProjectTokensOptions): UseProjectTokensResult {
  const [previewTokens, setPreviewTokens] = useState<Token[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastPreviewTokensRef = useRef<Token[]>([]);

  // Track preview tokens in ref to avoid using state in dependency array
  // This prevents infinite loops when we check previewTokens.length
  const previewTokensRef = useRef<Token[]>([]);

  // Extract dependencies
  const { generateAllTokens, logger } = deps;

  // Cleanup on unmount
  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    []
  );

  // Generate preview tokens for non-active projects
  // Note: Removed isGenerating, previewTokens from deps to prevent infinite loops
  // Use abortControllerRef and previewTokensRef for guards instead
  useEffect(() => {
    if (!project || isActiveProject) {
      // Transfer preview tokens to context when project becomes active
      if (isActiveProject && lastPreviewTokensRef.current.length > 0) {
        setContextTokens(lastPreviewTokensRef.current);
        lastPreviewTokensRef.current = [];
      }
      // Only update state if values actually change
      if (previewTokensRef.current.length > 0) {
        setPreviewTokens([]);
        previewTokensRef.current = [];
      }
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      setIsGenerating(false);
      return;
    }

    // Only generate when in tokens display mode and no tokens yet
    if (displayMode !== 'tokens' || previewTokensRef.current.length > 0) {
      return;
    }

    // Prevent concurrent generation - use abortController presence as guard
    if (abortControllerRef.current) {
      return;
    }

    const generate = async () => {
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
        previewTokensRef.current = generated;
        lastPreviewTokensRef.current = generated;
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== 'AbortError') {
          logger.error('useProjectTokens', 'Failed to generate preview tokens', err);
        }
      } finally {
        setIsGenerating(false);
        setGenerationProgress(null);
        abortControllerRef.current = null;
      }
    };

    generate();
  }, [
    project?.id,
    isActiveProject,
    displayMode,
    project,
    setContextTokens,
    generateAllTokens,
    logger,
  ]);

  // Generate tokens for active project after page refresh
  // Note: Removed isGenerating from deps to prevent circular dependency
  // Use abortControllerRef as generation guard instead
  useEffect(() => {
    if (!(project && isActiveProject) || contextTokens.length > 0 || displayMode !== 'tokens') {
      return;
    }

    // Prevent concurrent generation - use abortController presence as guard
    if (abortControllerRef.current) {
      return;
    }

    const generate = async () => {
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
        abortControllerRef.current = null;
      }
    };

    generate();
  }, [
    project?.id,
    isActiveProject,
    contextTokens.length,
    displayMode,
    project,
    setContextTokens,
    generateAllTokens,
    logger,
  ]);

  const displayTokens = isActiveProject ? contextTokens : previewTokens;

  return { displayTokens, isGenerating, generationProgress };
}

// ============================================================================
// Type Aliases for Convenience
// ============================================================================

/**
 * Options for the production wrapper hook (deps not needed).
 * Use with useProjectTokensWithDeps from the separate file.
 */
export type UseProjectTokensWithDepsOptions = Omit<UseProjectTokensOptions, 'deps'>;
