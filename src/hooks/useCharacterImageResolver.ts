/**
 * Character Image Resolver Hook
 *
 * React hook wrapper around the SSOT character image resolution utility.
 * Handles lifecycle management (cleanup of blob URLs) and loading state.
 *
 * Used by CharacterNavigation, CharacterListView, and similar components.
 *
 * @see src/ts/utils/characterImageResolver.ts for the core resolution logic
 */

import { useEffect, useMemo, useState } from 'react';
import { useTokenContext } from '../contexts/TokenContext.js';
import type { Character } from '../ts/types/index.js';
import { getFirstImageUrl, resolveCharacterImages } from '../ts/utils/characterImageResolver.js';
import { logger } from '../ts/utils/logger.js';

interface UseCharacterImageResolverOptions {
  /** Characters to resolve images for */
  characters: Character[];
}

interface UseCharacterImageResolverResult {
  /** Map of character UUID -> resolved image URL */
  resolvedUrls: Map<string, string>;
  /** Whether images are currently being resolved */
  isLoading: boolean;
}

/**
 * Hook to resolve character icon URLs
 *
 * Uses the SSOT characterImageResolver utility for resolution logic.
 * Handles React lifecycle (cleanup, state management, loading indicator).
 *
 * Resolution sources (via utility):
 * - Asset references (asset:uuid) -> AssetStorageService
 * - External URLs (http/https/data/blob) -> used as-is
 * - Character ID paths -> dataSyncService
 * - Fallback to official character data from context
 *
 * @example
 * const { resolvedUrls, isLoading } = useCharacterImageResolver({ characters })
 * const iconUrl = resolvedUrls.get(character.uuid)
 */
export function useCharacterImageResolver({
  characters,
}: UseCharacterImageResolverOptions): UseCharacterImageResolverResult {
  const { officialData } = useTokenContext();
  const [resolvedUrls, setResolvedUrls] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  // Build a map of official character data for image fallback lookup
  const officialCharMap = useMemo(() => {
    const map = new Map<string, Character>();
    for (const char of officialData) {
      if (char.id) {
        map.set(char.id.toLowerCase(), char);
      }
    }
    return map;
  }, [officialData]);

  // Enrich characters with fallback images from official data before resolution
  const enrichedCharacters = useMemo(() => {
    return characters.map((char) => {
      // If character already has an image, use it as-is
      const existingImage = getFirstImageUrl(char.image as string | string[] | undefined);
      if (existingImage) return char;

      // Try to get image from official character data
      const officialChar = officialCharMap.get(char.id.toLowerCase());
      if (officialChar) {
        const officialImage = getFirstImageUrl(officialChar.image as string | string[] | undefined);
        if (officialImage) {
          return { ...char, image: officialImage };
        }
      }

      return char;
    });
  }, [characters, officialCharMap]);

  // Resolve character images using SSOT utility
  useEffect(() => {
    if (enrichedCharacters.length === 0) return;

    let isMounted = true;
    let blobUrlsToCleanup: string[] = [];

    const doResolve = async () => {
      setIsLoading(true);

      try {
        const { urls, blobUrls } = await resolveCharacterImages(enrichedCharacters);
        blobUrlsToCleanup = blobUrls;

        if (isMounted) {
          setResolvedUrls(urls);
        }
      } catch (error) {
        logger.error('useCharacterImageResolver', 'Failed to resolve images:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    doResolve();

    // Cleanup: revoke blob URLs when component unmounts or characters change
    return () => {
      isMounted = false;
      blobUrlsToCleanup.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [enrichedCharacters]);

  return { resolvedUrls, isLoading };
}
