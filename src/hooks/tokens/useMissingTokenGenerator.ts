/**
 * Hook to detect and generate tokens for characters that don't have them yet.
 * Useful for automatically filling in missing tokens when navigating to TokensView.
 */

import { useCallback, useRef } from 'react';
import { useTokenContext } from '@/contexts/TokenContext';
import { simpleHash } from '@/ts/cache/utils/hashUtils.js';
import { generateAllTokens } from '@/ts/generation/batchGenerator.js';
import type { Character, ProgressCallback, Token, TokenCallback } from '@/ts/types/index.js';
import { logger } from '@/ts/utils/logger.js';

export interface UseMissingTokenGeneratorResult {
  /**
   * Generate tokens for any characters that don't have tokens yet.
   * Appends new tokens to existing ones rather than replacing.
   * @returns Promise with number of new tokens generated
   */
  generateMissingTokens: () => Promise<number>;

  /**
   * Check if there are any characters without tokens
   */
  hasMissingTokens: () => boolean;

  /**
   * Get the list of characters that don't have tokens
   */
  getMissingCharacters: () => Character[];

  /**
   * Cancel any in-progress generation
   */
  cancelGeneration: () => void;
}

export function useMissingTokenGenerator(): UseMissingTokenGeneratorResult {
  const {
    tokens,
    generationOptions,
    jsonInput,
    lastGeneratedJsonHash,
    setTokens,
    setLastGeneratedJsonHash,
    isLoading,
    setIsLoading,
    setError,
    setGenerationProgress,
    getEnabledCharacters,
  } = useTokenContext();

  // AbortController ref for cancelling in-flight generation
  const abortControllerRef = useRef<AbortController | null>(null);
  // Track tokens during incremental generation
  const newTokensRef = useRef<Token[]>([]);

  /**
   * Get enabled characters that don't have corresponding tokens.
   * A character is considered "missing" if:
   * 1. It is enabled (not disabled in character metadata)
   * 2. There's no character token with its UUID as parentUuid
   * 3. Tokens haven't already been generated for this JSON content
   */
  const getMissingCharacters = useCallback((): Character[] => {
    // If tokens were already generated for this exact JSON content, return empty
    // This prevents duplicate generation on navigation between views
    const currentHash = simpleHash(jsonInput);
    if (lastGeneratedJsonHash === currentHash && tokens.length > 0) {
      return [];
    }

    // Create a set of character UUIDs that have tokens
    const characterUuidsWithTokens = new Set(
      tokens
        .filter((t) => t.type === 'character')
        .map((t) => t.parentUuid)
        .filter(Boolean)
    );

    // Only consider enabled characters when checking for missing tokens
    const enabledChars = getEnabledCharacters();

    // Find enabled characters without tokens
    return enabledChars.filter((char) => !characterUuidsWithTokens.has(char.uuid));
  }, [tokens, getEnabledCharacters, jsonInput, lastGeneratedJsonHash]);

  /**
   * Check if there are characters without tokens
   */
  const hasMissingTokens = useCallback((): boolean => {
    return getMissingCharacters().length > 0;
  }, [getMissingCharacters]);

  /**
   * Generate tokens for characters that don't have them yet.
   * Appends to existing tokens rather than replacing them.
   */
  const generateMissingTokens = useCallback(async (): Promise<number> => {
    // Skip if already loading (prevents double generation in React StrictMode)
    // isLoading is from context and persists across component remounts
    if (isLoading) {
      logger.debug('useMissingTokenGenerator', 'Skipping - generation already in progress');
      return 0;
    }

    const missingCharacters = getMissingCharacters();

    if (missingCharacters.length === 0) {
      logger.debug('useMissingTokenGenerator', 'No missing tokens to generate');
      return 0;
    }

    // Cancel any in-flight generation from this hook instance
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    logger.info(
      'useMissingTokenGenerator',
      `Generating tokens for ${missingCharacters.length} characters without tokens`
    );

    try {
      setIsLoading(true);
      setError(null);
      setGenerationProgress({ current: 0, total: missingCharacters.length });

      // Reset new tokens array
      newTokensRef.current = [];

      const progressCallback: ProgressCallback = (current, total) => {
        setGenerationProgress({ current, total });
      };

      // Capture existing tokens at the start of generation
      // This snapshot is used by all callbacks to avoid stale closure issues
      const existingTokens = [...tokens];

      // Incremental token callback - appends to existing tokens as they're generated
      const tokenCallback: TokenCallback = (token: Token) => {
        newTokensRef.current = [...newTokensRef.current, token];
        // Set state with captured existing tokens + accumulated new tokens
        setTokens([...existingTokens, ...newTokensRef.current]);
      };

      // Generate tokens only for missing characters
      // Note: We pass null for scriptMeta since meta tokens should already exist
      // (we only want to generate character/reminder tokens for missing chars)
      await generateAllTokens(
        missingCharacters,
        {
          ...generationOptions,
          // Disable meta tokens - we only want character tokens
          pandemoniumToken: false,
          scriptNameToken: false,
          almanacToken: false,
          generateBootleggerRules: false,
        },
        progressCallback,
        null, // No script meta - don't generate meta tokens
        tokenCallback,
        signal
      );

      // Note: No final setTokens needed - tokens already added incrementally via callback
      const newTokens = newTokensRef.current;
      setError(null);

      // Mark the JSON as processed to prevent duplicate generation
      setLastGeneratedJsonHash(simpleHash(jsonInput));

      logger.info('useMissingTokenGenerator', `Generated ${newTokens.length} new tokens`);
      return newTokens.length;
    } catch (err) {
      // Don't treat abort as an error
      if (err instanceof DOMException && err.name === 'AbortError') {
        logger.debug('useMissingTokenGenerator', 'Token generation was cancelled');
        return 0;
      }
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate tokens';
      setError(errorMessage);
      logger.error('useMissingTokenGenerator', 'Token generation error:', err);
      return 0;
    } finally {
      setIsLoading(false);
      setGenerationProgress(null);
      abortControllerRef.current = null;
    }
  }, [
    getMissingCharacters,
    tokens,
    generationOptions,
    jsonInput,
    isLoading,
    setTokens,
    setLastGeneratedJsonHash,
    setIsLoading,
    setError,
    setGenerationProgress,
  ]);

  /**
   * Cancel any in-progress generation
   */
  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    generateMissingTokens,
    hasMissingTokens,
    getMissingCharacters,
    cancelGeneration,
  };
}
