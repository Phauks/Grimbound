import { useCallback, useRef } from 'react';
import { clearDataUrlCache } from '@/components/ViewComponents/TokensComponents/TokenGrid/TokenCard';
import { useTokenContext } from '@/contexts/TokenContext';
import { simpleHash } from '@/ts/cache/utils/hashUtils.js';
import { generateAllTokens } from '@/ts/generation/batchGenerator.js';
import type { ProgressCallback, Token, TokenCallback } from '@/ts/types/index.js';
import { logger } from '@/ts/utils/logger.js';

// Batch update interval for token UI updates (ms)
const TOKEN_BATCH_UPDATE_INTERVAL = 150;

export function useTokenGenerator() {
  const {
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

  const generateTokens = useCallback(
    async (externalProgressCallback?: ProgressCallback) => {
      // Log the call with stack trace to identify caller
      const stack = new Error().stack?.split('\n').slice(2, 5).join('\n') || 'unknown';
      logger.warn('useTokenGenerator', 'generateTokens called', {
        isGenerating: isGeneratingRef.current,
        caller: stack,
      });

      // Prevent concurrent generation - this stops infinite loops
      if (isGeneratingRef.current) {
        logger.debug('useTokenGenerator', 'Generation already in progress, skipping');
        return;
      }

      // Filter to only enabled characters
      const enabledCharacters = getEnabledCharacters();

      if (enabledCharacters.length === 0) {
        setError('No characters to generate tokens for (all characters are disabled)');
        return;
      }

      // Cancel any in-flight generation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      isGeneratingRef.current = true;

      try {
        setIsLoading(true);
        setError(null);
        setGenerationProgress({ current: 0, total: enabledCharacters.length });

        // Reset tokens array for new generation
        tokensRef.current = [];
        setTokens([]);

        // Clear the data URL cache since we're regenerating tokens
        clearDataUrlCache();

        // Clear any pending batch update
        if (batchUpdateTimerRef.current) {
          clearTimeout(batchUpdateTimerRef.current);
          batchUpdateTimerRef.current = null;
        }

        const progressCallback: ProgressCallback = (current, total) => {
          setGenerationProgress({ current, total });
          if (externalProgressCallback) {
            externalProgressCallback(current, total);
          }
        };

        // Batched token callback - reduces UI updates to avoid cascading effects
        // Tokens accumulate in tokensRef and UI updates every TOKEN_BATCH_UPDATE_INTERVAL ms
        let needsUpdate = false;
        const tokenCallback: TokenCallback = (token: Token) => {
          tokensRef.current = [...tokensRef.current, token];
          needsUpdate = true;

          // Schedule batched UI update if not already scheduled
          if (!batchUpdateTimerRef.current) {
            batchUpdateTimerRef.current = setTimeout(() => {
              if (needsUpdate) {
                setTokens([...tokensRef.current]);
                needsUpdate = false;
              }
              batchUpdateTimerRef.current = null;
            }, TOKEN_BATCH_UPDATE_INTERVAL);
          }
        };

        // Generate tokens with incremental updates and abort support
        // Only generate for enabled characters
        await generateAllTokens(
          enabledCharacters,
          generationOptions,
          progressCallback,
          scriptMeta || undefined,
          tokenCallback,
          signal,
          characterMetadata
        );

        // Final update to ensure all tokens are shown
        if (batchUpdateTimerRef.current) {
          clearTimeout(batchUpdateTimerRef.current);
          batchUpdateTimerRef.current = null;
        }
        setTokens([...tokensRef.current]);

        // Record the JSON hash to prevent duplicate generation on navigation
        setLastGeneratedJsonHash(simpleHash(jsonInput));
        setError(null);
      } catch (err) {
        // Don't treat abort as an error
        if (err instanceof DOMException && err.name === 'AbortError') {
          logger.debug('useTokenGenerator', 'Token generation was cancelled');
          return;
        }
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate tokens';
        setError(errorMessage);
        logger.error('useTokenGenerator', 'Token generation error:', err);
      } finally {
        logger.warn('useTokenGenerator', 'Generation completing, releasing lock');
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
    ]
  );

  // Cancel function for external use
  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return { generateTokens, cancelGeneration };
}
