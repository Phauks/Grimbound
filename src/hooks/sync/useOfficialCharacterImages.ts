/**
 * useOfficialCharacterImages Hook
 *
 * Handles loading character images from the sync cache with progressive
 * loading, blob URL management, and automatic cleanup.
 *
 * @module hooks/sync/useOfficialCharacterImages
 */

import { useEffect, useRef, useState } from 'react';
import { hashArray } from '@/ts/cache/index.js';
import type { Character } from '@/ts/types/index.js';
import { logger } from '@/ts/utils/logger.js';

/** Batch size for progressive image loading */
const IMAGE_BATCH_SIZE = 20;

interface UseOfficialCharacterImagesOptions {
  /** Characters to load images for */
  characters: Character[];
  /** Whether loading should be active */
  isActive: boolean;
  /** Function to get character image blob from cache */
  getCharacterImage: (characterId: string) => Promise<Blob | null>;
}

interface UseOfficialCharacterImagesReturn {
  /** Map of character ID to blob URL (or null if not loaded) */
  imageUrls: Map<string, string | null>;
  /** Whether images are still loading */
  isLoading: boolean;
}

/**
 * Hook for loading official character images from the sync cache
 *
 * Features:
 * - Progressive batch loading for smoother UX
 * - Automatic blob URL cleanup on unmount
 * - State updates during loading for progressive display
 *
 * @example
 * ```tsx
 * const { imageUrls, isLoading } = useOfficialCharacterImages({
 *   characters: officialCharacters,
 *   isActive: isDrawerOpen,
 *   getCharacterImage: dataSyncContext.getCharacterImage,
 * });
 * ```
 */
export function useOfficialCharacterImages({
  characters,
  isActive,
  getCharacterImage,
}: UseOfficialCharacterImagesOptions): UseOfficialCharacterImagesReturn {
  const [imageUrls, setImageUrls] = useState<Map<string, string | null>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const blobUrlsRef = useRef<string[]>([]);

  // Compute stable hash for dependency comparison (prevents infinite loops)
  // Array references change on every render even with same content
  const charactersHash = hashArray(characters, (c) => c.id);

  // Track previous hash to detect actual changes
  const prevCharactersHashRef = useRef(charactersHash);

  // Store characters in ref for use inside effect without triggering re-runs
  const charactersRef = useRef(characters);
  charactersRef.current = characters;

  useEffect(() => {
    const currentCharacters = charactersRef.current;

    // If not active, we're done (nothing to do)
    if (!isActive) {
      setIsLoading(false);
      return;
    }

    // Skip if characters hash hasn't changed (satisfies exhaustive-deps)
    if (prevCharactersHashRef.current === charactersHash && currentCharacters.length > 0) {
      return;
    }
    prevCharactersHashRef.current = charactersHash;

    // If active but no characters yet, stay in loading state
    // This prevents a flash when characters are being loaded by the parent
    if (currentCharacters.length === 0) {
      return;
    }

    let isMounted = true;

    async function loadImages() {
      setIsLoading(true);
      const urlMap = new Map<string, string | null>();
      const newBlobUrls: string[] = [];

      // Load images in batches for smoother UX
      for (let i = 0; i < currentCharacters.length; i += IMAGE_BATCH_SIZE) {
        const batch = currentCharacters.slice(i, i + IMAGE_BATCH_SIZE);
        await Promise.all(
          batch.map(async (char) => {
            try {
              const blob = await getCharacterImage(char.id);
              if (blob && isMounted) {
                const blobUrl = URL.createObjectURL(blob);
                urlMap.set(char.id, blobUrl);
                newBlobUrls.push(blobUrl);
              } else {
                urlMap.set(char.id, null);
              }
            } catch {
              urlMap.set(char.id, null);
            }
          })
        );

        // Update state progressively
        if (isMounted) {
          setImageUrls(new Map(urlMap));
        }
      }

      blobUrlsRef.current = newBlobUrls;

      logger.debug(
        'useOfficialCharacterImages',
        `Loaded ${currentCharacters.length} characters, ${newBlobUrls.length} images`
      );

      if (isMounted) {
        setIsLoading(false);
      }
    }

    loadImages();

    // Cleanup blob URLs when effect reruns or unmounts
    return () => {
      isMounted = false;
      blobUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      blobUrlsRef.current = [];
    };
  }, [isActive, charactersHash, getCharacterImage]);

  return { imageUrls, isLoading };
}
