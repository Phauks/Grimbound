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
import {
  getAnyBuiltInAssetPath,
  getBuiltInAssetPath,
  isAnyBuiltInAsset,
  isBuiltInAsset,
} from '@/ts/constants/builtInAssets.js';
import { extractAssetId, isAssetReference } from '@/ts/services/upload/assetResolver.js';
import type { IAssetStorageService } from '@/ts/services/upload/IUploadServices.js';
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
// Resolution Helpers (extracted to reduce cognitive complexity)
// ============================================================================

/** Try to resolve asset reference (asset:uuid format) */
async function tryResolveAssetReference(
  url: string,
  assetStorageService: IAssetStorageService
): Promise<string | null> {
  if (!isAssetReference(url)) return null;

  const assetId = extractAssetId(url);
  if (!assetId) return null;

  const asset = await assetStorageService.getByIdWithUrl(assetId);
  return asset?.url ?? null;
}

/**
 * Try to resolve built-in asset ID
 * First checks the specified asset type, then falls back to ALL built-in assets.
 * Design principle: Asset types are for organization, not restriction.
 */
function tryResolveBuiltInAsset(url: string, assetType: AssetType): string | null {
  // First try the specified type
  if (isBuiltInAsset(url, assetType)) {
    return getBuiltInAssetPath(url, assetType);
  }
  // Fallback: check ALL built-in assets regardless of type
  if (isAnyBuiltInAsset(url)) {
    return getAnyBuiltInAssetPath(url);
  }
  return null;
}

/**
 * Resolve URL from various formats
 * Returns resolved URL or the original URL if it's a direct URL
 */
async function resolveImageUrl(
  url: string,
  assetType: AssetType,
  assetStorageService: IAssetStorageService
): Promise<string | null> {
  // 1. Try asset reference
  const assetUrl = await tryResolveAssetReference(url, assetStorageService);
  if (assetUrl) return assetUrl;

  // 2. Try built-in asset
  const builtInUrl = tryResolveBuiltInAsset(url, assetType);
  if (builtInUrl) return builtInUrl;

  // 3. Direct URL (http/https/data/blob)
  return url;
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
        const url = await resolveImageUrl(urlToResolve, assetType, assetStorageService);

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
