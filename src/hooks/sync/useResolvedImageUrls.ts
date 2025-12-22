/**
 * useResolvedImageUrls Hook
 *
 * Resolves image URLs from various sources (external, asset:, sync cache)
 * and manages blob URL lifecycle.
 *
 * @module hooks/sync/useResolvedImageUrls
 */

import { useEffect, useRef, useState } from 'react';
import { dataSyncService } from '@/ts/sync/index.js';
import { logger } from '@/ts/utils/logger.js';

interface UseResolvedImageUrlsOptions {
  /** Array of image URLs to resolve */
  imageUrls: string[];
  /** Whether resolution is enabled */
  enabled?: boolean;
}

interface UseResolvedImageUrlsReturn {
  /** Resolved URLs (blob URLs for sync cache, original for http/asset) */
  resolvedUrls: (string | null)[];
  /** Whether resolution is in progress */
  isLoading: boolean;
}

/**
 * Extract character ID from a path like "Icon_clockmaker.webp" or "/images/clockmaker.png"
 */
function extractCharacterId(path: string): string | null {
  const segments = path.split('/');
  const filename = segments[segments.length - 1];
  const match = filename.match(/^(?:Icon_)?([a-z_]+)(?:\.(?:webp|png|jpg|jpeg|gif))?$/i);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Hook for resolving image URLs with automatic blob URL cleanup
 *
 * Handles:
 * - HTTP/HTTPS URLs (passed through)
 * - asset: URLs (passed through)
 * - Local paths that reference sync cache characters
 *
 * @example
 * ```tsx
 * const { resolvedUrls, isLoading } = useResolvedImageUrls({
 *   imageUrls: character.images,
 *   enabled: true,
 * });
 * ```
 */
export function useResolvedImageUrls({
  imageUrls,
  enabled = true,
}: UseResolvedImageUrlsOptions): UseResolvedImageUrlsReturn {
  const [resolvedUrls, setResolvedUrls] = useState<(string | null)[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const blobUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!enabled || imageUrls.length === 0) {
      setResolvedUrls([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    const objectUrls: string[] = [];

    async function resolveImages() {
      setIsLoading(true);

      const resolved = await Promise.all(
        imageUrls.map(async (url) => {
          if (!url?.trim()) return null;

          // Pass through external URLs
          if (url.startsWith('http://') || url.startsWith('https://')) return url;

          // Pass through asset URLs
          if (url.startsWith('asset:')) return url;

          // Try to resolve from sync cache
          const characterId = extractCharacterId(url);
          if (characterId) {
            try {
              const blob = await dataSyncService.getCharacterImage(characterId);
              if (blob) {
                const objectUrl = URL.createObjectURL(blob);
                objectUrls.push(objectUrl);
                return objectUrl;
              }
            } catch (error) {
              logger.warn('useResolvedImageUrls', `Failed to resolve image: ${characterId}`, error);
            }
          }

          // Fall back to original URL
          return url;
        })
      );

      if (isMounted) {
        // Clean up old blob URLs before setting new ones
        blobUrlsRef.current.forEach((url) => {
          URL.revokeObjectURL(url);
        });
        blobUrlsRef.current = objectUrls;
        setResolvedUrls(resolved);
        setIsLoading(false);
      } else {
        // If unmounted during resolution, clean up new URLs
        objectUrls.forEach((url) => {
          URL.revokeObjectURL(url);
        });
      }
    }

    resolveImages();

    return () => {
      isMounted = false;
    };
  }, [imageUrls, enabled]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      blobUrlsRef.current = [];
    };
  }, []);

  return { resolvedUrls, isLoading };
}

export default useResolvedImageUrls;
