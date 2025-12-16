/**
 * Character Image Resolution - Single Source of Truth
 *
 * This module provides unified character image URL resolution for:
 * - Asset references (asset:uuid) -> resolved via AssetStorageService
 * - External URLs (http/https/data/blob) -> used as-is
 * - Official character paths -> resolved via dataSyncService
 *
 * Used by:
 * - useCharacterImageResolver hook (batch resolution for lists)
 * - NightOrderEntry component (single entry resolution)
 * - CharacterNavigation component (via hook)
 * - CharacterListView component (via hook)
 *
 * @module utils/characterImageResolver
 */

import { dataSyncService } from '../sync/index.js'
import { isAssetReference, resolveAssetUrl } from '../services/upload/assetResolver.js'
import type { Character } from '../types/index.js'
import { logger } from './logger.js'

// ============================================================================
// Types
// ============================================================================

/**
 * Options for resolving a character image URL
 */
export interface ResolveOptions {
  /** Skip dataSyncService lookup (for custom characters) */
  skipSyncStorage?: boolean
  /** Context for logging (e.g., 'NightOrderEntry', 'CharacterList') */
  logContext?: string
}

/**
 * Result of resolving a character image URL
 */
export interface ResolvedImage {
  /** The resolved URL (may be blob:, http:, asset:, data:, or original) */
  url: string
  /** Where the URL came from */
  source: 'asset' | 'external' | 'sync' | 'fallback'
  /** If source is 'sync', this is the blob URL that needs cleanup */
  blobUrl?: string
}

/**
 * Result of batch resolving character images
 */
export interface BatchResolveResult {
  /** Map of character UUID -> resolved URL */
  urls: Map<string, string>
  /** All blob URLs created (caller must revoke these on cleanup) */
  blobUrls: string[]
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a URL is an external URL (http/https/data/blob)
 *
 * @param url - URL string to check
 * @returns True if the URL is external (doesn't need resolution)
 */
export function isExternalUrl(url: string): boolean {
  return /^(https?:\/\/|data:|blob:)/.test(url)
}

/**
 * Extract a character ID from various path formats
 *
 * Handles:
 * - "washerwoman"
 * - "Icon_washerwoman.png"
 * - "icons/washerwoman.webp"
 * - "Icon_po_poisoner.png" (with underscores)
 *
 * @param path - File path or character ID string
 * @returns Extracted character ID in lowercase, or null if not parseable
 */
export function extractCharacterIdFromPath(path: string): string | null {
  // Get the filename from the path
  const segments = path.split('/')
  const filename = segments[segments.length - 1]

  // Match patterns: "Icon_washerwoman.png", "washerwoman", "washerwoman.webp"
  const match = filename.match(/^(?:Icon_)?([a-z0-9_]+)(?:\.(?:webp|png|jpg|jpeg|gif))?$/i)
  return match ? match[1].toLowerCase() : null
}

/**
 * Get the first image URL from a character's image field
 *
 * @param imageField - Character.image value (string, array, or undefined)
 * @returns First image URL or undefined
 */
export function getFirstImageUrl(imageField: string | string[] | undefined): string | undefined {
  if (!imageField) return undefined

  if (typeof imageField === 'string') {
    return imageField
  }

  if (Array.isArray(imageField) && imageField.length > 0) {
    const first = imageField[0]
    if (typeof first === 'string') {
      return first
    }
  }

  return undefined
}

// ============================================================================
// Core Resolution Functions
// ============================================================================

/**
 * Resolve a single character image URL to a displayable URL
 *
 * Resolution order:
 * 1. Empty URL -> return fallback
 * 2. Asset reference (asset:uuid) -> resolve via AssetStorageService
 * 3. External URL (http/https/data/blob) -> return as-is
 * 4. Path/ID -> try dataSyncService for official character images
 * 5. Fallback -> return original URL
 *
 * @param imageUrl - The image URL from character data (may be asset ref, URL, or path)
 * @param characterId - The character ID (used for sync storage lookup)
 * @param options - Resolution options
 * @returns Resolved image with URL and source metadata
 *
 * @example
 * // Resolve a single character image
 * const result = await resolveCharacterImageUrl(character.image, character.id)
 * if (result.url) {
 *   <img src={result.url} />
 * }
 *
 * // Cleanup blob URLs on unmount
 * if (result.blobUrl) {
 *   URL.revokeObjectURL(result.blobUrl)
 * }
 */
export async function resolveCharacterImageUrl(
  imageUrl: string | undefined,
  characterId: string,
  options: ResolveOptions = {}
): Promise<ResolvedImage> {
  const { skipSyncStorage = false, logContext } = options

  // 1. Empty URL -> fallback
  if (!imageUrl || !imageUrl.trim()) {
    return { url: '', source: 'fallback' }
  }

  try {
    // 2. Asset reference -> resolve via AssetStorageService
    if (isAssetReference(imageUrl)) {
      const resolvedUrl = await resolveAssetUrl(imageUrl)
      return {
        url: resolvedUrl || imageUrl,
        source: resolvedUrl ? 'asset' : 'fallback'
      }
    }

    // 3. External URL -> return as-is
    if (isExternalUrl(imageUrl)) {
      return { url: imageUrl, source: 'external' }
    }

    // 4. Try sync storage for official character images
    if (!skipSyncStorage) {
      // Extract character ID from the path if different from provided ID
      const extractedId = extractCharacterIdFromPath(imageUrl)
      const lookupId = extractedId || characterId

      try {
        const blob = await dataSyncService.getCharacterImage(lookupId)
        if (blob) {
          const blobUrl = URL.createObjectURL(blob)
          return { url: blobUrl, source: 'sync', blobUrl }
        }
      } catch (error) {
        // Silent fail - will fall through to fallback
        if (logContext) {
          logger.warn(logContext, `Failed to resolve from sync storage: ${lookupId}`)
        }
      }
    }

    // 5. Fallback -> return original URL
    return { url: imageUrl, source: 'fallback' }
  } catch (error) {
    if (logContext) {
      logger.error(logContext, `Failed to resolve character image: ${characterId}`, error)
    }
    return { url: imageUrl, source: 'fallback' }
  }
}

/**
 * Resolve images for a batch of characters
 *
 * This is optimized for list-based components that display many characters.
 * Returns a Map for O(1) lookup by UUID and tracks all blob URLs for cleanup.
 *
 * @param characters - Array of characters to resolve images for
 * @param officialCharMap - Optional map of official character data for fallback
 * @returns Map of UUIDs to resolved URLs and list of blob URLs to cleanup
 *
 * @example
 * const { urls, blobUrls } = await resolveCharacterImages(characters, officialCharMap)
 *
 * // Use in render
 * const iconUrl = urls.get(character.uuid)
 *
 * // Cleanup on unmount
 * useEffect(() => {
 *   return () => blobUrls.forEach(url => URL.revokeObjectURL(url))
 * }, [blobUrls])
 */
export async function resolveCharacterImages(
  characters: Character[],
  officialCharMap?: Map<string, Character>
): Promise<BatchResolveResult> {
  const urls = new Map<string, string>()
  const blobUrls: string[] = []

  for (const char of characters) {
    if (!char.uuid) continue

    // Get image URL from character or fallback to official data
    let imageUrl = getFirstImageUrl(char.image as string | string[] | undefined)

    if (!imageUrl && officialCharMap) {
      const officialChar = officialCharMap.get(char.id.toLowerCase())
      if (officialChar) {
        imageUrl = getFirstImageUrl(officialChar.image as string | string[] | undefined)
      }
    }

    if (!imageUrl) continue

    const result = await resolveCharacterImageUrl(imageUrl, char.id)

    if (result.url) {
      urls.set(char.uuid, result.url)
    }

    if (result.blobUrl) {
      blobUrls.push(result.blobUrl)
    }
  }

  return { urls, blobUrls }
}
