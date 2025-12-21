/**
 * useStudioNavigation Hook
 *
 * Manages navigation to Studio with token image conversion.
 * Extracted from TokenGrid component to follow Single Responsibility Principle.
 *
 * @module hooks/studio/useStudioNavigation
 */

import { useCallback } from 'react';
import type { TabType } from '@/components/Layout/TabNavigation';
import { navigateToStudioWithBlob } from '@/ts/studio/navigationHelpers.js';
import type { Token } from '@/ts/types/index.js';
import { globalImageCache } from '@/ts/utils/imageCache.js';
import { logger } from '@/ts/utils/logger.js';

interface UseStudioNavigationProps {
  /** Function to change tabs */
  onTabChange?: (tab: TabType) => void;
}

interface UseStudioNavigationReturn {
  /** Navigate to Studio with a token for editing */
  editInStudio: (token: Token) => Promise<void>;
}

/**
 * Hook for navigating to Studio with token images
 *
 * @param props - Hook configuration
 * @returns Studio navigation functions
 *
 * @example
 * ```tsx
 * const studioNav = useStudioNavigation({ onTabChange });
 *
 * // In your component:
 * <TokenCard onEditInStudio={studioNav.editInStudio} />
 * ```
 */
export function useStudioNavigation({
  onTabChange,
}: UseStudioNavigationProps): UseStudioNavigationReturn {
  /**
   * Load cached character icon and navigate to Studio
   */
  const editInStudio = useCallback(
    async (token: Token) => {
      if (!onTabChange) {
        logger.warn('useStudioNavigation', 'No onTabChange handler provided');
        return;
      }

      // Only works for character tokens (not reminders or meta tokens)
      if (token.type !== 'character') {
        logger.warn('useStudioNavigation', 'Can only edit character tokens', token.type);
        return;
      }

      try {
        // Try to get the original icon URL from token data
        let iconUrl: string | undefined = token.imageUrl;

        // Fallback to character.image if imageUrl not available
        if (!iconUrl && token.characterData?.image) {
          const charImage = token.characterData.image;
          // Handle both single string and array of images
          if (typeof charImage === 'string') {
            iconUrl = charImage;
          } else if (Array.isArray(charImage) && charImage.length > 0) {
            // Use the variant index if available, otherwise use first image
            const index = token.variantIndex ?? 0;
            iconUrl = charImage[index];
          }
        }

        if (!iconUrl) {
          logger.error('useStudioNavigation', 'No icon URL found for token', token.name);
          return;
        }

        logger.info('useStudioNavigation', 'Loading cached icon for Studio', {
          tokenName: token.name,
          iconUrl: `${iconUrl.substring(0, 50)}...`,
          isCached: globalImageCache.has(iconUrl),
        });

        // Get the cached image (it was loaded during token generation)
        const cachedImage = await globalImageCache.get(iconUrl);

        // Convert the cached HTMLImageElement to a blob
        const canvas = document.createElement('canvas');
        canvas.width = cachedImage.naturalWidth;
        canvas.height = cachedImage.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }
        ctx.drawImage(cachedImage, 0, 0);

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => {
            if (b) {
              resolve(b);
            } else {
              reject(new Error('Failed to convert canvas to blob'));
            }
          }, 'image/png');
        });

        logger.info('useStudioNavigation', 'Navigating to Studio with cached icon blob', {
          tokenName: token.name,
          blobSize: blob.size,
        });

        // Navigate to Studio with the cached icon blob in full edit mode
        // User can edit just the icon before it's used for token generation
        navigateToStudioWithBlob(
          blob,
          onTabChange,
          {
            characterName: token.name,
            source: 'tokens',
          },
          'full'
        );
      } catch (error) {
        logger.error('useStudioNavigation', 'Failed to edit in Studio', error);
      }
    },
    [onTabChange]
  );

  return {
    editInStudio,
  };
}

export default useStudioNavigation;
