/**
 * Background Image URL Resolver Hook
 *
 * Resolves background image URLs from various formats:
 * - Asset references (asset:uuid) -> IndexedDB via AssetStorageService
 * - Built-in asset IDs (character_background_1) -> resolved to path
 * - Direct URLs (http/https/data/blob) -> used as-is
 *
 * Used by BackgroundPreview and DrawerImageThumbnail components.
 *
 * @module hooks/characters/useBackgroundImageUrl
 */

import { useEffect, useState } from 'react';
import { useAssetStorageService } from '@/contexts/ServiceContext';
import { getBuiltInAssetPath, isBuiltInAsset } from '@/ts/constants/builtInAssets.js';
import { extractAssetId, isAssetReference } from '@/ts/services/upload/assetResolver.js';
import type { AssetType } from '@/ts/services/upload/types.js';

// ============================================================================
// Types
// ============================================================================

interface UseBackgroundImageUrlOptions {
  /** The imageUrl value to resolve (may be asset ref, built-in ID, or direct URL) */
  imageUrl: string | undefined;
  /** Asset type for built-in asset resolution (default: 'token-background') */
  assetType?: AssetType;
}

interface UseBackgroundImageUrlResult {
  /** The resolved URL ready for display, or null if not resolved */
  resolvedUrl: string | null;
  /** Whether the URL is currently being resolved */
  isLoading: boolean;
  /** Error message if resolution failed */
  error: string | null;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to resolve background image URLs from various formats
 *
 * Resolution order:
 * 1. Asset references (asset:uuid) -> Query IndexedDB via AssetStorageService
 * 2. Built-in asset IDs (character_background_1) -> Get path from builtInAssets
 * 3. Direct URLs (http/https/data/blob) -> Use as-is
 *
 * @example
 * const { resolvedUrl, isLoading, error } = useBackgroundImageUrl({
 *   imageUrl: style.imageUrl,
 * });
 *
 * // Use resolvedUrl for display
 * <img src={resolvedUrl ?? ''} />
 */
export function useBackgroundImageUrl({
  imageUrl,
  assetType = 'token-background',
}: UseBackgroundImageUrlOptions): UseBackgroundImageUrlResult {
  const assetStorageService = useAssetStorageService();
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Early return if no URL
    if (!imageUrl) {
      setResolvedUrl(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Capture as const for type narrowing in nested closure
    const urlToResolve = imageUrl;
    let cancelled = false;

    async function resolve() {
      setIsLoading(true);
      setError(null);

      try {
        let url: string | null = null;

        // 1. Check for asset reference (asset:uuid format)
        if (isAssetReference(urlToResolve)) {
          const assetId = extractAssetId(urlToResolve);
          if (assetId) {
            const asset = await assetStorageService.getByIdWithUrl(assetId);
            url = asset?.url ?? null;
          }
        }
        // 2. Check for built-in asset ID (character_background_1)
        else if (isBuiltInAsset(urlToResolve, assetType)) {
          url = getBuiltInAssetPath(urlToResolve, assetType);
        }
        // 3. Direct URL (http/https/data/blob)
        else {
          url = urlToResolve;
        }

        if (!cancelled) {
          setResolvedUrl(url);
          setError(url ? null : 'Asset not found');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to resolve URL');
          setResolvedUrl(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    resolve();

    // Cleanup: prevent state update if component unmounts or deps change
    return () => {
      cancelled = true;
    };
  }, [assetStorageService, imageUrl, assetType]);

  return { resolvedUrl, isLoading, error };
}
