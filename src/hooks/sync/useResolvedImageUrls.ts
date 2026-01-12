/**
 * useResolvedImageUrls Hook
 *
 * Resolves image URLs from various sources (external, asset:, sync cache)
 * using the SSOT characterImageResolver.
 *
 * @module hooks/sync/useResolvedImageUrls
 */

import { useEffect, useRef, useState } from 'react';
import { isAssetReference } from '@/ts/services/upload/assetResolver.js';
import {
  extractCharacterIdFromPath,
  isExternalUrl,
  resolveCharacterImageUrl,
} from '@/ts/utils/characterImageResolver.js';

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

/** Result of resolving a single URL */
interface ResolveResult {
  url: string | null;
  blobUrl: string | null;
}

/**
 * Resolve a single image URL using the SSOT characterImageResolver
 * Returns both the resolved URL and any blob URL that was created
 */
async function resolveSingleUrl(url: string): Promise<ResolveResult> {
  if (!url?.trim()) return { url: null, blobUrl: null };

  // External URLs (http/https/data/blob) pass through
  if (isExternalUrl(url)) return { url, blobUrl: null };

  // Asset references pass through (will be resolved by components)
  if (isAssetReference(url)) return { url, blobUrl: null };

  // Extract character ID for SSOT resolution
  const characterId = extractCharacterIdFromPath(url) || url;

  // Use SSOT to resolve the image
  const result = await resolveCharacterImageUrl(url, characterId, {
    logContext: 'useResolvedImageUrls',
  });

  return {
    url: result.url || null,
    blobUrl: result.blobUrl || null,
  };
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

  // Track previous content to prevent infinite loops when parent creates
  // new array references with same content
  const prevKeyRef = useRef<string>('');
  const currentKey = imageUrls.join('\x00');

  useEffect(() => {
    // Skip if content hasn't changed (prevents infinite loops from new array refs)
    if (prevKeyRef.current === currentKey && resolvedUrls.length > 0) {
      return;
    }
    prevKeyRef.current = currentKey;

    if (!enabled || imageUrls.length === 0) {
      setResolvedUrls([]);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function resolveImages() {
      setIsLoading(true);

      const results = await Promise.all(imageUrls.map(resolveSingleUrl));
      const resolved = results.map((r) => r.url);
      const newBlobUrls = results.map((r) => r.blobUrl).filter((u): u is string => u !== null);

      if (isMounted) {
        // Clean up old blob URLs before setting new ones
        for (const url of blobUrlsRef.current) {
          URL.revokeObjectURL(url);
        }
        blobUrlsRef.current = newBlobUrls;
        setResolvedUrls(resolved);
        setIsLoading(false);
      } else {
        // If unmounted during resolution, clean up new URLs
        for (const url of newBlobUrls) {
          URL.revokeObjectURL(url);
        }
      }
    }

    resolveImages();

    return () => {
      isMounted = false;
    };
  }, [imageUrls, enabled, currentKey, resolvedUrls.length]);

  // Cleanup blob URLs on unmount
  useEffect(
    () => () => {
      blobUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      blobUrlsRef.current = [];
    },
    []
  );

  return { resolvedUrls, isLoading };
}
