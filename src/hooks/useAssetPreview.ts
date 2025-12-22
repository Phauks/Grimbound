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
        setState({
          previewUrl: null,
          label: noneLabel,
          source: 'none',
          isLoading: false,
        });
        return;
      }

      setState((prev) => ({ ...prev, isLoading: true }));

      // Try built-in asset first
      if (isBuiltInAsset(value, assetType)) {
        const builtIn = getBuiltInAsset(value, assetType);
        if (builtIn && !cancelled) {
          setState({
            previewUrl: builtIn.thumbnail ?? builtIn.src,
            label: builtIn.label,
            source: 'builtin',
            isLoading: false,
          });
          return;
        }
      }

      // Try asset reference (asset:uuid format)
      if (isAssetReference(value)) {
        const assetId = extractAssetId(value);
        if (assetId) {
          try {
            const asset = await assetStorageService.getByIdWithUrl(assetId);
            if (!cancelled && asset) {
              setState({
                previewUrl: asset.thumbnailUrl ?? asset.url ?? null,
                label: asset.metadata?.filename ?? 'Custom Asset',
                source: asset.projectId ? 'user' : 'global',
                isLoading: false,
              });
              return;
            }
          } catch {
            // Asset not found - fall through to fallback
          }
        }
      }

      // Fallback: treat as direct path
      if (!cancelled) {
        setState({
          previewUrl: value,
          label: fallbackLabel ?? 'Custom',
          source: 'builtin',
          isLoading: false,
        });
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
