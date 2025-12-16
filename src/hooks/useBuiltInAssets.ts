/**
 * useBuiltInAssets Hook
 *
 * Provides a unified view of built-in assets and user-uploaded assets,
 * with utilities for resolving asset URLs and getting display labels.
 *
 * @module hooks/useBuiltInAssets
 *
 * @example
 * ```tsx
 * const { assets, isLoading, resolveUrl, getLabel } = useBuiltInAssets({
 *   assetType: 'token-background',
 *   projectId: currentProjectId,
 * });
 * ```
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { AssetType, AssetWithUrl } from '../ts/services/upload/types.js'
import { assetStorageService } from '../ts/services/upload/index.js'
import { isAssetReference, extractAssetId } from '../ts/services/upload/assetResolver.js'
import {
  getBuiltInAssets,
  getBuiltInAssetPath,
  getBuiltInAsset,
  isBuiltInAsset,
  type BuiltInAsset,
} from '../ts/constants/builtInAssets.js'

// ============================================================================
// Types
// ============================================================================

export interface UseBuiltInAssetsOptions {
  /** Asset type to filter */
  assetType: AssetType
  /** Project ID for project-scoped assets */
  projectId?: string
  /** Include global (non-project) assets */
  includeGlobal?: boolean
}

export interface MergedAsset {
  /** Unique identifier */
  id: string
  /** Display label */
  label: string
  /** Source: built-in, user upload, or global */
  source: 'builtin' | 'user' | 'global'
  /** URL for display (sync for built-in, async for user) */
  thumbnailUrl: string | null
  /** Full resolution URL */
  fullUrl: string | null
  /** Original asset data (for user assets) */
  userAsset?: AssetWithUrl
  /** Built-in asset data */
  builtInAsset?: BuiltInAsset
}

export interface UseBuiltInAssetsReturn {
  /** Merged list of built-in + user assets */
  assets: MergedAsset[]
  /** Built-in assets only */
  builtInAssets: BuiltInAsset[]
  /** User-uploaded assets only */
  userAssets: AssetWithUrl[]
  /** Loading state */
  isLoading: boolean
  /** Error state */
  error: string | null
  /** Resolve any asset value to a displayable URL */
  resolveUrl: (value: string) => Promise<string | null>
  /** Get display label for an asset value */
  getLabel: (value: string) => string
  /** Check if a value is a built-in asset */
  isBuiltIn: (value: string) => boolean
  /** Refresh user assets */
  refresh: () => Promise<void>
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useBuiltInAssets({
  assetType,
  projectId,
  includeGlobal = true,
}: UseBuiltInAssetsOptions): UseBuiltInAssetsReturn {
  const [userAssets, setUserAssets] = useState<AssetWithUrl[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get built-in assets for this type (static, no loading needed)
  const builtInAssets = useMemo(() => getBuiltInAssets(assetType), [assetType])

  // Load user assets
  const loadUserAssets = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // If includeGlobal is true and we have a projectId, we need to fetch both
      // project-specific and global assets. Use 'all' to get everything then filter.
      const assets = await assetStorageService.listWithUrls({
        type: assetType,
        projectId: includeGlobal ? 'all' : (projectId ?? null),
      })

      // If we have a projectId and includeGlobal, filter to show project + global assets
      const filteredAssets = projectId && includeGlobal
        ? assets.filter(a => a.projectId === projectId || a.projectId === null)
        : assets

      setUserAssets(filteredAssets)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assets')
      setUserAssets([])
    } finally {
      setIsLoading(false)
    }
  }, [assetType, projectId, includeGlobal])

  // Load on mount and when dependencies change
  useEffect(() => {
    loadUserAssets()
  }, [loadUserAssets])

  // Merge built-in and user assets
  const assets = useMemo((): MergedAsset[] => {
    const merged: MergedAsset[] = []

    // Add built-in assets first
    for (const asset of builtInAssets) {
      merged.push({
        id: asset.id,
        label: asset.label,
        source: 'builtin',
        thumbnailUrl: asset.thumbnail ?? asset.src,
        fullUrl: asset.src,
        builtInAsset: asset,
      })
    }

    // Add user assets
    for (const asset of userAssets) {
      merged.push({
        id: `asset:${asset.id}`,
        label: asset.metadata?.filename ?? 'Custom Asset',
        source: asset.projectId ? 'user' : 'global',
        thumbnailUrl: asset.thumbnailUrl ?? null,
        fullUrl: asset.url ?? null,
        userAsset: asset,
      })
    }

    return merged
  }, [builtInAssets, userAssets])

  // Resolve any asset value to a URL
  const resolveUrl = useCallback(async (value: string): Promise<string | null> => {
    if (!value || value === 'none') return null

    // Check if it's a built-in asset
    const builtInPath = getBuiltInAssetPath(value, assetType)
    if (builtInPath) return builtInPath

    // Check if it's an asset reference
    if (isAssetReference(value)) {
      const assetId = extractAssetId(value)
      if (!assetId) return null

      try {
        const asset = await assetStorageService.getByIdWithUrl(assetId)
        return asset?.url ?? null
      } catch {
        return null
      }
    }

    // Fallback: try as a direct path
    return value
  }, [assetType])

  // Get label for any asset value
  const getLabel = useCallback((value: string): string => {
    if (!value || value === 'none') return 'None'

    // Check built-in
    const builtIn = getBuiltInAsset(value, assetType)
    if (builtIn) return builtIn.label

    // Check loaded user assets
    if (isAssetReference(value)) {
      const assetId = extractAssetId(value)
      const userAsset = userAssets.find(a => a.id === assetId)
      if (userAsset) {
        return userAsset.metadata?.filename ?? 'Custom Asset'
      }
    }

    return 'Custom Asset'
  }, [assetType, userAssets])

  // Check if value is a built-in asset
  const isBuiltIn = useCallback((value: string): boolean => {
    return isBuiltInAsset(value, assetType)
  }, [assetType])

  return {
    assets,
    builtInAssets,
    userAssets,
    isLoading,
    error,
    resolveUrl,
    getLabel,
    isBuiltIn,
    refresh: loadUserAssets,
  }
}

export default useBuiltInAssets
