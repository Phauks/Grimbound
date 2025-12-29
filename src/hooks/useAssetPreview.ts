/**
 * useAssetPreview Hook
 *
 * Resolves an asset value (built-in ID, "asset:uuid", or "none") to a preview URL
 * and metadata. Handles async loading states and error recovery.
 *
 * @module hooks/useAssetPreview
 */

import { useEffect, useState } from 'react';
import { useAssetStorageService } from '@/contexts/ServiceContext';
import { getBuiltInAsset, isBuiltInAsset } from '@/ts/constants/builtInAssets.js';
import { extractAssetId, isAssetReference } from '@/ts/services/upload/assetResolver.js';
import type { IAssetStorageService } from '@/ts/services/upload/IUploadServices.js';
import type { AssetType } from '@/ts/services/upload/types.js';

// ============================================================================
// Types
// ============================================================================

/** Source classification for the resolved asset */
export type AssetSource = 'builtin' | 'user' | 'global' | 'none';

/** Resolved asset preview state */
export interface AssetPreviewState {
  /** Preview URL (thumbnail or full image) */
  previewUrl: string | null;
  /** Display label for the asset */
  label: string;
  /** Source classification */
  source: AssetSource;
  /** Whether resolution is in progress */
  isLoading: boolean;
}

/** Hook options */
export interface UseAssetPreviewOptions {
  /** Current value: built-in ID, "asset:uuid", or "none" */
  value: string;
  /** Asset type for filtering built-in assets */
  assetType: AssetType;
  /** Label to show when value is "none" or empty */
  noneLabel?: string;
  /** Fallback label for direct paths */
  fallbackLabel?: string;
}

/** Source label mapping */
const SOURCE_LABELS: Record<AssetSource, string> = {
  none: 'No selection',
  builtin: 'Built-in',
  user: 'My Upload',
  global: 'Global',
};

// ============================================================================
// Resolution Helpers (extracted to reduce cognitive complexity)
// ============================================================================

/** Create empty/none state */
function createNoneState(noneLabel: string): AssetPreviewState {
  return {
    previewUrl: null,
    label: noneLabel,
    source: 'none',
    isLoading: false,
  };
}

/** Try to resolve as built-in asset */
function tryResolveBuiltIn(value: string, assetType: AssetType): AssetPreviewState | null {
  if (!isBuiltInAsset(value, assetType)) return null;

  const builtIn = getBuiltInAsset(value, assetType);
  if (!builtIn) return null;

  return {
    previewUrl: builtIn.thumbnail ?? builtIn.src,
    label: builtIn.label,
    source: 'builtin',
    isLoading: false,
  };
}

/** Try to resolve as user/global asset reference */
async function tryResolveAssetReference(
  value: string,
  assetStorageService: IAssetStorageService
): Promise<AssetPreviewState | null> {
  if (!isAssetReference(value)) return null;

  const assetId = extractAssetId(value);
  if (!assetId) return null;

  try {
    const asset = await assetStorageService.getByIdWithUrl(assetId);
    if (!asset) return null;

    return {
      previewUrl: asset.thumbnailUrl ?? asset.url ?? null,
      label: asset.metadata?.filename ?? 'Custom Asset',
      source: asset.projectId ? 'user' : 'global',
      isLoading: false,
    };
  } catch {
    return null;
  }
}

/** Create fallback state for direct paths */
function createFallbackState(value: string, fallbackLabel?: string): AssetPreviewState {
  return {
    previewUrl: value,
    label: fallbackLabel ?? 'Custom',
    source: 'builtin',
    isLoading: false,
  };
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Resolves an asset value to preview state including URL, label, and source.
 *
 * @example
 * ```tsx
 * const { previewUrl, label, source, isLoading } = useAssetPreview({
 *   value: 'asset:123-456',
 *   assetType: 'token-background',
 * });
 * ```
 */
export function useAssetPreview({
  value,
  assetType,
  noneLabel = 'None',
  fallbackLabel,
}: UseAssetPreviewOptions): AssetPreviewState & { sourceLabel: string } {
  const assetStorageService = useAssetStorageService();

  const [state, setState] = useState<AssetPreviewState>({
    previewUrl: null,
    label: noneLabel,
    source: 'none',
    isLoading: false,
  });

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      // Handle empty or "none" value
      if (!value || value === 'none') {
        setState(createNoneState(noneLabel));
        return;
      }

      setState((prev) => ({ ...prev, isLoading: true }));

      // Try built-in asset
      const builtInState = tryResolveBuiltIn(value, assetType);
      if (builtInState && !cancelled) {
        setState(builtInState);
        return;
      }

      // Try asset reference
      const assetState = await tryResolveAssetReference(value, assetStorageService);
      if (assetState && !cancelled) {
        setState(assetState);
        return;
      }

      // Fallback: treat as direct path
      if (!cancelled) {
        setState(createFallbackState(value, fallbackLabel));
      }
    }

    resolve();

    return () => {
      cancelled = true;
    };
  }, [value, assetType, noneLabel, fallbackLabel, assetStorageService]);

  return {
    ...state,
    sourceLabel: SOURCE_LABELS[state.source],
  };
}

export default useAssetPreview;
