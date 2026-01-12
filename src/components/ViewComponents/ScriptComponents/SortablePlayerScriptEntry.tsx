/**
 * SortablePlayerScriptEntry Component
 *
 * Wrapper around PlayerScriptEntry that adds @dnd-kit sortable functionality.
 * Used in the PlayerScriptPreview for drag-and-drop character reordering.
 * Resolves character images using the same SSOT pattern as NightOrderEntry.
 */

import { useEffect, useRef, useState } from 'react';
import { tabPreRenderService } from '@/ts/cache/index.js';
import {
  type JinxIconInfo,
  PlayerScriptEntry,
} from '@/ts/scriptPdf/playerScript/PlayerScriptEntry';
import type { PlayerScriptCharacter } from '@/ts/scriptPdf/types.js';
import { resolveCharacterImageUrl } from '@/ts/utils/characterImageResolver.js';
import { SortableEntry } from './SortableEntry';

// ============================================================================
// TYPES
// ============================================================================

export interface SortablePlayerScriptEntryProps {
  /** Character to display */
  character: PlayerScriptCharacter;
  /** Resolved image URL */
  imageUrl: string;
  /** Whether using two-column layout */
  twoColumn?: boolean;
  /** Jinx icons to display inline (when inline jinx icons enabled) */
  jinxIcons?: JinxIconInfo[];
  /** Whether drag-and-drop is enabled */
  enableDragDrop?: boolean;
  /** Icon scale multiplier (0.5 to 1.5, default 1.0) */
  iconScale?: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SortablePlayerScriptEntry({
  character,
  imageUrl,
  twoColumn = false,
  jinxIcons = [],
  enableDragDrop = true,
  iconScale = 1.0,
}: SortablePlayerScriptEntryProps) {
  // Check for pre-cached image URL first (from TabPreRenderService)
  const cachedImageUrl = tabPreRenderService.getCachedCharacterImageUrl(character.id);

  // Resolve image URL using SSOT utility (handles asset refs, external URLs, and sync storage)
  // Initialize with cached URL if available for instant display
  const [resolvedImageUrl, setResolvedImageUrl] = useState<string>(cachedImageUrl || '');
  const [resolvedJinxIcons, setResolvedJinxIcons] = useState<JinxIconInfo[]>([]);

  // Resolve main character image
  useEffect(() => {
    // Skip async resolution if we already have a cached URL
    if (cachedImageUrl) {
      setResolvedImageUrl(cachedImageUrl);
      return;
    }

    let cancelled = false;
    const blobUrls: string[] = [];

    resolveCharacterImageUrl(imageUrl, character.id, { logContext: 'SortablePlayerScriptEntry' })
      .then((result) => {
        if (!cancelled) {
          // Track blob URLs for cleanup
          if (result.blobUrl) {
            blobUrls.push(result.blobUrl);
          }
          setResolvedImageUrl(result.url);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedImageUrl(imageUrl); // Fallback to original on error
        }
      });

    // Cleanup blob URLs on unmount or when image changes
    return () => {
      cancelled = true;
      for (const url of blobUrls) {
        URL.revokeObjectURL(url);
      }
    };
  }, [imageUrl, character.id, cachedImageUrl]);

  // Create stable dependency key based on jinx icon contents (not array reference)
  // This prevents infinite loops when parent passes a new array with same content
  const jinxIconsKey = jinxIcons.map((j) => `${j.id}:${j.imageUrl}`).join('|');

  // Use ref to access current jinxIcons without adding to effect dependencies
  const jinxIconsRef = useRef(jinxIcons);
  jinxIconsRef.current = jinxIcons;

  // Resolve jinx icon URLs
  // jinxIconsKey triggers re-run when content changes; ref provides stable access
  useEffect(() => {
    // Empty key means empty array - use key for empty check to satisfy exhaustive deps
    if (jinxIconsKey === '') {
      setResolvedJinxIcons([]);
      return;
    }

    const currentJinxIcons = jinxIconsRef.current;

    let cancelled = false;
    const blobUrls: string[] = [];

    Promise.all(
      currentJinxIcons.map(async (jinx) => {
        // Check cache first
        const cached = tabPreRenderService.getCachedCharacterImageUrl(jinx.id);
        if (cached) {
          return { ...jinx, imageUrl: cached };
        }

        try {
          const result = await resolveCharacterImageUrl(jinx.imageUrl, jinx.id, {
            logContext: 'SortablePlayerScriptEntry-jinx',
          });
          if (result.blobUrl) {
            blobUrls.push(result.blobUrl);
          }
          return { ...jinx, imageUrl: result.url };
        } catch {
          return jinx; // Keep original on error
        }
      })
    ).then((resolved) => {
      if (!cancelled) {
        setResolvedJinxIcons(resolved);
      }
    });

    return () => {
      cancelled = true;
      for (const url of blobUrls) {
        URL.revokeObjectURL(url);
      }
    };
  }, [jinxIconsKey]);

  return (
    <SortableEntry id={character.id} enableDragDrop={enableDragDrop}>
      <PlayerScriptEntry
        character={character}
        imageUrl={resolvedImageUrl}
        twoColumn={twoColumn}
        jinxIcons={resolvedJinxIcons}
        iconScale={iconScale}
      />
    </SortableEntry>
  );
}
