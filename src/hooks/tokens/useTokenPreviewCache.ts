/**
 * useTokenPreviewCache Hook
 *
 * Manages token preview generation and caching:
 * - Preview character token state
 * - Preview reminder tokens state
 * - Pre-render cache on hover for instant display
 * - Skip regeneration for cached tokens
 * - Cache invalidation on options change
 *
 * Extracted from CharactersView for better separation of concerns.
 *
 * @module hooks/tokens/useTokenPreviewCache
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getPreRenderedTokens, hashOptions } from '@/ts/cache/index.js';
import { HOVER_DELAY_MS } from '@/ts/data/characterUtils.js';
import type { Character, DecorativeOverrides, GenerationOptions, Token } from '@/ts/types/index.js';
import { regenerateCharacterAndReminders } from '@/ts/ui/detailViewUtils.js';
import { createEffectiveOptions } from '@/ts/utils/decorativeUtils.js';
import { logger } from '@/ts/utils/logger.js';

/** Cached token entry */
interface CachedTokens {
  characterToken: Token;
  reminderTokens: Token[];
}

export interface UseTokenPreviewCacheOptions {
  /** The character being edited */
  editedCharacter: Character | null;
  /** Current generation options */
  generationOptions: GenerationOptions;
  /** Per-character decorative overrides for live preview */
  decoratives?: DecorativeOverrides;
  /** Initial token from gallery click */
  initialToken?: Token;
  /** All tokens for looking up reminders */
  tokens: Token[];
  /** All characters for lookups */
  characters: Character[];
  /** Currently selected character UUID */
  selectedCharacterUuid: string;
}

export interface UseTokenPreviewCacheResult {
  /** The preview character token to display */
  previewCharacterToken: Token | null;
  /** The preview reminder tokens to display */
  previewReminderTokens: Token[];
  /** Pre-render tokens when hovering over a character */
  handleHoverCharacter: (uuid: string) => void;
  /** Apply cached tokens when selecting a character (returns true if cache hit) */
  applyCachedTokens: (uuid: string) => boolean;
  /** Regenerate preview for current character */
  regeneratePreview: () => Promise<void>;
  /** Preview a specific variant image */
  handlePreviewVariant: (imageUrl: string | undefined) => Promise<void>;
  /** Invalidate cache for a character */
  invalidateCache: (uuid: string) => void;
  /** Clear all cached tokens */
  clearCache: () => void;
}

/**
 * Check if a token is a meta token (not character or reminder)
 */
function isMetaToken(token?: Token): boolean {
  return !!token && token.type !== 'character' && token.type !== 'reminder';
}

/**
 * Hook for managing token preview generation and caching.
 *
 * @example
 * ```tsx
 * const {
 *   previewCharacterToken,
 *   previewReminderTokens,
 *   handleHoverCharacter,
 *   applyCachedTokens,
 *   regeneratePreview,
 * } = useTokenPreviewCache({
 *   editedCharacter,
 *   generationOptions,
 *   initialToken,
 *   tokens,
 *   characters,
 *   selectedCharacterUuid,
 * });
 * ```
 */
export function useTokenPreviewCache({
  editedCharacter,
  generationOptions,
  decoratives,
  initialToken,
  tokens,
  characters,
  selectedCharacterUuid,
}: UseTokenPreviewCacheOptions): UseTokenPreviewCacheResult {
  // Effective character: editedCharacter OR fallback to finding by UUID
  const effectiveCharacter =
    editedCharacter ?? characters.find((c) => c.uuid === selectedCharacterUuid) ?? null;

  // Compute effective options by merging global options with per-character decoratives
  const effectiveOptions = useMemo(
    () => createEffectiveOptions(generationOptions, decoratives),
    [generationOptions, decoratives]
  );

  // Initialize preview state from initial token or shared pre-render cache
  const getInitialPreviewToken = (): Token | null => {
    if (initialToken?.type === 'character') return initialToken;

    // Check shared pre-render cache
    if (selectedCharacterUuid && !isMetaToken(initialToken)) {
      const cached = getPreRenderedTokens(selectedCharacterUuid, effectiveOptions);
      if (cached) return cached.characterToken;
    }
    return null;
  };

  const getInitialReminderTokens = (): Token[] => {
    if (initialToken && !isMetaToken(initialToken)) {
      if (initialToken.type === 'reminder' && initialToken.parentUuid) {
        return tokens.filter(
          (t) => t.type === 'reminder' && t.parentUuid === initialToken.parentUuid
        );
      }
      if (initialToken.type === 'character' && initialToken.parentUuid) {
        return tokens.filter(
          (t) => t.type === 'reminder' && t.parentUuid === initialToken.parentUuid
        );
      }
    }

    // Check shared pre-render cache
    if (selectedCharacterUuid && !isMetaToken(initialToken)) {
      const cached = getPreRenderedTokens(selectedCharacterUuid, effectiveOptions);
      if (cached) return cached.reminderTokens;
    }
    return [];
  };

  // Preview token state
  const [previewCharacterToken, setPreviewCharacterToken] = useState<Token | null>(
    getInitialPreviewToken
  );
  const [previewReminderTokens, setPreviewReminderTokens] =
    useState<Token[]>(getInitialReminderTokens);

  // Pre-render cache for hover optimization - keyed by UUID+optionsHash
  const preRenderCacheRef = useRef<Map<string, CachedTokens>>(new Map());
  const preRenderingRef = useRef<Set<string>>(new Set());
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentOptionsHashRef = useRef<string>(hashOptions(effectiveOptions));
  const skipRegenerateForUuidRef = useRef<string | null>(
    (() => {
      if (initialToken?.type === 'character') return selectedCharacterUuid;
      if (selectedCharacterUuid && getPreRenderedTokens(selectedCharacterUuid, effectiveOptions)) {
        return selectedCharacterUuid;
      }
      return null;
    })()
  );

  // Clear pre-render cache when options change since cached tokens would be stale
  useEffect(() => {
    const newHash = hashOptions(effectiveOptions);
    if (currentOptionsHashRef.current !== newHash) {
      currentOptionsHashRef.current = newHash;
      preRenderCacheRef.current.clear();
    }
  }, [effectiveOptions]);

  // Regenerate preview when character or options change (including decoratives)
  useEffect(() => {
    if (!effectiveCharacter) {
      setPreviewCharacterToken(null);
      setPreviewReminderTokens([]);
      return;
    }

    // Skip if we just applied cached tokens for this character
    if (skipRegenerateForUuidRef.current === effectiveCharacter.uuid) {
      skipRegenerateForUuidRef.current = null;
      return;
    }

    let cancelled = false;

    regenerateCharacterAndReminders(effectiveCharacter, effectiveOptions)
      .then(({ characterToken, reminderTokens }) => {
        if (!cancelled) {
          setPreviewCharacterToken(characterToken);
          setPreviewReminderTokens(reminderTokens);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          logger.error('useTokenPreviewCache', 'Failed to regenerate preview', error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [effectiveCharacter, effectiveOptions]);

  // Hover handler - pre-render character token on hover
  // Note: Hover pre-rendering uses global options since we don't have decoratives for other characters
  const handleHoverCharacter = useCallback(
    (characterUuid: string) => {
      // Clear any pending hover timeout
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }

      const cacheKey = `${characterUuid}:${currentOptionsHashRef.current}`;

      // Skip if already selected, cached, or currently rendering
      if (characterUuid === selectedCharacterUuid) return;
      if (preRenderCacheRef.current.has(cacheKey)) return;
      if (preRenderingRef.current.has(cacheKey)) return;

      // Small delay to avoid pre-rendering on quick mouse-overs
      hoverTimeoutRef.current = setTimeout(() => {
        const char = characters.find((c) => c.uuid === characterUuid);
        if (!char) return;

        // Double-check still not cached/rendering after delay
        if (preRenderCacheRef.current.has(cacheKey)) return;
        if (preRenderingRef.current.has(cacheKey)) return;

        preRenderingRef.current.add(cacheKey);

        // Use global options for hover pre-render (other characters' decoratives not available here)
        regenerateCharacterAndReminders(char, generationOptions)
          .then(({ characterToken, reminderTokens }) => {
            preRenderCacheRef.current.set(cacheKey, { characterToken, reminderTokens });
          })
          .catch((err) => logger.error('useTokenPreviewCache', 'Pre-render failed', err))
          .finally(() => {
            preRenderingRef.current.delete(cacheKey);
          });
      }, HOVER_DELAY_MS);
    },
    [characters, generationOptions, selectedCharacterUuid]
  );

  // Apply cached tokens when selecting a character
  const applyCachedTokens = useCallback((uuid: string): boolean => {
    // Clear hover timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    const cacheKey = `${uuid}:${currentOptionsHashRef.current}`;
    const cached = preRenderCacheRef.current.get(cacheKey);

    if (cached) {
      setPreviewCharacterToken(cached.characterToken);
      setPreviewReminderTokens(cached.reminderTokens);
      preRenderCacheRef.current.delete(cacheKey);
      skipRegenerateForUuidRef.current = uuid;
      return true;
    }

    return false;
  }, []);

  // Regenerate preview for current character
  const regeneratePreview = useCallback(async () => {
    if (!effectiveCharacter) return;

    try {
      const { characterToken, reminderTokens } = await regenerateCharacterAndReminders(
        effectiveCharacter,
        effectiveOptions
      );
      setPreviewCharacterToken(characterToken);
      setPreviewReminderTokens(reminderTokens);
    } catch (error) {
      logger.error('useTokenPreviewCache', 'Failed to regenerate preview', error);
    }
  }, [effectiveCharacter, effectiveOptions]);

  // Preview a specific variant image
  const handlePreviewVariant = useCallback(
    async (imageUrl: string | undefined) => {
      if (!effectiveCharacter) return;

      try {
        const { characterToken, reminderTokens } = await regenerateCharacterAndReminders(
          effectiveCharacter,
          effectiveOptions,
          imageUrl
        );
        setPreviewCharacterToken(characterToken);
        setPreviewReminderTokens(reminderTokens);
      } catch (error) {
        logger.error('useTokenPreviewCache', 'Failed to preview variant', error);
      }
    },
    [effectiveCharacter, effectiveOptions]
  );

  // Invalidate cache for a character
  const invalidateCache = useCallback((uuid: string) => {
    const cacheKey = `${uuid}:${currentOptionsHashRef.current}`;
    preRenderCacheRef.current.delete(cacheKey);
  }, []);

  // Clear all cached tokens
  const clearCache = useCallback(() => {
    preRenderCacheRef.current.clear();
  }, []);

  return {
    previewCharacterToken,
    previewReminderTokens,
    handleHoverCharacter,
    applyCachedTokens,
    regeneratePreview,
    handlePreviewVariant,
    invalidateCache,
    clearCache,
  };
}

export default useTokenPreviewCache;
