import { useCallback, useRef } from 'react';
import {
  clearDataUrlCache,
  preRenderGalleryTokens,
} from '@/components/ViewComponents/TokensComponents/TokenGrid/TokenCard';
import { useTokenContext } from '@/contexts/TokenContext';
import { simpleHash } from '@/ts/cache/utils/hashUtils.js';
import { isMetaToken } from '@/ts/export/zipExporter.js';
import {
  calculateTokenCountsByType,
  generateAllTokens,
  generateCharacterTokens,
  generateMeta,
  generateReminders,
} from '@/ts/generation/batchGenerator.js';
import type {
  GenerationProgress,
  ProgressCallback,
  Token,
  TokenCallback,
} from '@/ts/types/index.js';
import { logger } from '@/ts/utils/logger.js';

// Batch update interval for token UI updates (ms)
const TOKEN_BATCH_UPDATE_INTERVAL = 150;

/** Token type filter for partial regeneration */
export type TokenTypeFilter = 'character' | 'reminder' | 'meta';

/**
 * Check if a token matches the given type filter
 */
function tokenMatchesFilter(token: Token, filter: TokenTypeFilter): boolean {
  switch (filter) {
    case 'character':
      return token.type === 'character';
    case 'reminder':
      return token.type === 'reminder';
    case 'meta':
      return isMetaToken(token);
    default:
      return false;
  }
}

/** Map token type filter to generation function */
function getGenerationFunction(typeFilter: TokenTypeFilter) {
  switch (typeFilter) {
    case 'character':
      return generateCharacterTokens;
    case 'reminder':
      return generateReminders;
    default:
      return generateMeta;
  }
}

/** Check if error is an abort signal */
function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

/** Extract error message from unknown error */
function extractErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Failed to generate tokens';
}

export function useTokenGenerator() {
  const {
    tokens,
    generationOptions,
    scriptMeta,
    jsonInput,
    setTokens,
    setIsLoading,
    setError,
    setGenerationProgress,
    setLastGeneratedJsonHash,
    getEnabledCharacters,
    characterMetadata,
  } = useTokenContext();

  // Use a ref to accumulate tokens incrementally during generation
  const tokensRef = useRef<Token[]>([]);
  // AbortController ref for cancelling in-flight generation
  const abortControllerRef = useRef<AbortController | null>(null);
  // Prevent concurrent generation
  const isGeneratingRef = useRef(false);
  // Batch update timer
  const batchUpdateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track if batch needs update (used by token callback closure)
  const needsUpdateRef = useRef(false);

  /** Clear any pending batch update timer */
  const clearBatchTimer = useCallback(() => {
    if (batchUpdateTimerRef.current) {
      clearTimeout(batchUpdateTimerRef.current);
      batchUpdateTimerRef.current = null;
    }
  }, []);

  /** Flush any pending batched tokens to UI */
  const flushBatchedTokens = useCallback(() => {
    clearBatchTimer();
    setTokens([...tokensRef.current]);
  }, [clearBatchTimer, setTokens]);

  /** Create a batched token callback that accumulates tokens and updates UI periodically */
  const createBatchedTokenCallback = useCallback((): TokenCallback => {
    needsUpdateRef.current = false;
    return (token: Token) => {
      tokensRef.current = [...tokensRef.current, token];
      needsUpdateRef.current = true;

      // Schedule batched UI update if not already scheduled
      if (!batchUpdateTimerRef.current) {
        batchUpdateTimerRef.current = setTimeout(() => {
          if (needsUpdateRef.current) {
            setTokens([...tokensRef.current]);
            needsUpdateRef.current = false;
          }
          batchUpdateTimerRef.current = null;
        }, TOKEN_BATCH_UPDATE_INTERVAL);
      }
    };
  }, [setTokens]);

  const generateTokens = useCallback(
    async (externalProgressCallback?: ProgressCallback) => {
      // Prevent concurrent generation
      if (isGeneratingRef.current) return;

      // Filter to only enabled characters
      const enabledCharacters = getEnabledCharacters();
      if (enabledCharacters.length === 0) {
        setError('No characters to generate tokens for (all characters are disabled)');
        return;
      }

      // Cancel any in-flight generation and setup new controller
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      isGeneratingRef.current = true;

      // Set loading states immediately so overlay shows before calculations
      setIsLoading(true);
      setError(null);
      setGenerationProgress({
        phase: 'meta',
        character: { current: 0, total: 0 },
        reminder: { current: 0, total: 0 },
        meta: { current: 0, total: 0 },
        overall: { current: 0, total: 0 },
      });

      try {
        // Pre-calculate token counts for accurate progress display
        const tokenCounts = calculateTokenCountsByType(
          enabledCharacters,
          generationOptions,
          scriptMeta || null
        );

        // Update progress with accurate counts
        setGenerationProgress({
          phase: 'meta',
          character: { current: 0, total: tokenCounts.character },
          reminder: { current: 0, total: tokenCounts.reminder },
          meta: { current: 0, total: tokenCounts.meta },
          overall: { current: 0, total: tokenCounts.total },
        });

        // Reset tokens array for new generation
        tokensRef.current = [];
        setTokens([]);
        clearDataUrlCache();
        clearBatchTimer();

        // Create batched token callback
        const tokenCallback = createBatchedTokenCallback();

        // Generate tokens with incremental updates and abort support
        await generateAllTokens(
          enabledCharacters,
          generationOptions,
          externalProgressCallback ?? (() => {}),
          scriptMeta || undefined,
          tokenCallback,
          signal,
          characterMetadata,
          setGenerationProgress
        );

        // Final update to ensure all tokens are shown
        flushBatchedTokens();

        // Pre-render all tokens to dataURLs while overlay is still showing
        // This prevents lag when switching to Tokens tab later
        preRenderGalleryTokens(tokensRef.current);

        setLastGeneratedJsonHash(simpleHash(jsonInput));
        setError(null);
      } catch (err) {
        if (isAbortError(err)) return;
        setError(extractErrorMessage(err));
        logger.error('useTokenGenerator', 'Token generation error:', err);
      } finally {
        setIsLoading(false);
        setGenerationProgress(null);
        abortControllerRef.current = null;
        isGeneratingRef.current = false;
      }
    },
    [
      getEnabledCharacters,
      generationOptions,
      scriptMeta,
      jsonInput,
      setTokens,
      setIsLoading,
      setError,
      setGenerationProgress,
      setLastGeneratedJsonHash,
      characterMetadata,
      clearBatchTimer,
      createBatchedTokenCallback,
      flushBatchedTokens,
    ]
  );

  // Cancel function for external use
  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  /**
   * Regenerate only tokens of a specific type while keeping other types unchanged.
   * Uses efficient partial generation that only creates the requested token type.
   * @param typeFilter - Which token type to regenerate ('character', 'reminder', or 'meta')
   */
  const regenerateByType = useCallback(
    async (typeFilter: TokenTypeFilter, externalProgressCallback?: ProgressCallback) => {
      // Prevent concurrent generation
      if (isGeneratingRef.current) return;

      const enabledCharacters = getEnabledCharacters();
      if (enabledCharacters.length === 0) {
        setError('No characters to generate tokens for (all characters are disabled)');
        return;
      }

      // Cancel any in-flight generation and setup new controller
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      isGeneratingRef.current = true;

      // Set loading states immediately so overlay shows before calculations
      setIsLoading(true);
      setError(null);
      setGenerationProgress({
        phase: typeFilter as GenerationProgress['phase'],
        character: { current: 0, total: 0 },
        reminder: { current: 0, total: 0 },
        meta: { current: 0, total: 0 },
        overall: { current: 0, total: 0 },
      });

      try {
        // Pre-calculate token counts for accurate progress display
        const fullCounts = calculateTokenCountsByType(
          enabledCharacters,
          generationOptions,
          scriptMeta || null
        );
        const typeTotal =
          typeFilter === 'character'
            ? fullCounts.character
            : typeFilter === 'reminder'
              ? fullCounts.reminder
              : fullCounts.meta;

        // Update progress with accurate counts
        setGenerationProgress({
          phase: typeFilter as GenerationProgress['phase'],
          character: { current: 0, total: typeFilter === 'character' ? fullCounts.character : 0 },
          reminder: { current: 0, total: typeFilter === 'reminder' ? fullCounts.reminder : 0 },
          meta: { current: 0, total: typeFilter === 'meta' ? fullCounts.meta : 0 },
          overall: { current: 0, total: typeTotal },
        });

        // Keep existing tokens that don't match the filter
        const existingTokensToKeep = tokens.filter((t) => !tokenMatchesFilter(t, typeFilter));
        clearDataUrlCache();
        clearBatchTimer();

        // Initialize with existing tokens we're keeping
        tokensRef.current = [...existingTokensToKeep];
        setTokens([...tokensRef.current]);

        // Create batched token callback
        const tokenCallback = createBatchedTokenCallback();

        // Use efficient partial generation
        const generateFn = getGenerationFunction(typeFilter);
        await generateFn(
          enabledCharacters,
          generationOptions,
          externalProgressCallback ?? (() => {}),
          scriptMeta || undefined,
          tokenCallback,
          signal,
          characterMetadata,
          setGenerationProgress
        );

        // Final update to ensure all tokens are shown
        flushBatchedTokens();

        // Pre-render all tokens to dataURLs while overlay is still showing
        preRenderGalleryTokens(tokensRef.current);

        setLastGeneratedJsonHash(simpleHash(jsonInput));
        setError(null);
      } catch (err) {
        if (isAbortError(err)) return;
        setError(extractErrorMessage(err));
        logger.error('useTokenGenerator', 'Token generation error:', err);
      } finally {
        setIsLoading(false);
        setGenerationProgress(null);
        abortControllerRef.current = null;
        isGeneratingRef.current = false;
      }
    },
    [
      tokens,
      getEnabledCharacters,
      generationOptions,
      scriptMeta,
      jsonInput,
      setTokens,
      setIsLoading,
      setError,
      setGenerationProgress,
      setLastGeneratedJsonHash,
      characterMetadata,
      clearBatchTimer,
      createBatchedTokenCallback,
      flushBatchedTokens,
    ]
  );

  // Convenience methods for partial regeneration
  const regenerateCharacterTokens = useCallback(
    (progressCallback?: ProgressCallback) => regenerateByType('character', progressCallback),
    [regenerateByType]
  );

  const regenerateReminderTokens = useCallback(
    (progressCallback?: ProgressCallback) => regenerateByType('reminder', progressCallback),
    [regenerateByType]
  );

  const regenerateMetaTokens = useCallback(
    (progressCallback?: ProgressCallback) => regenerateByType('meta', progressCallback),
    [regenerateByType]
  );

  return {
    generateTokens,
    cancelGeneration,
    regenerateCharacterTokens,
    regenerateReminderTokens,
    regenerateMetaTokens,
  };
}
