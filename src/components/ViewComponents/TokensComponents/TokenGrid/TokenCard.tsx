import { memo, useEffect, useMemo, useState } from 'react';
import type { ContextMenuItem } from '@/components/Shared/UI/ContextMenu';
import { ContextMenu } from '@/components/Shared/UI/ContextMenu';
import { useContextMenu, useIntersectionObserver } from '@/hooks';
import styles from '@/styles/components/tokens/TokenCard.module.css';
import { TEAM_LABELS } from '@/ts/config.js';
import type { Team, Token } from '@/ts/types/index.js';

// Module-level cache for data URLs - persists across tab switches
// Key: token filename, Value: data URL
const dataUrlCache = new Map<string, string>();

// Check WebP support once (WebP encoding is ~3-4x faster than PNG)
let webpSupported: boolean | null = null;
function supportsWebP(): boolean {
  if (webpSupported !== null) return webpSupported;
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  webpSupported = canvas.toDataURL('image/webp').startsWith('data:image/webp');
  return webpSupported;
}

// Get optimal data URL format
function encodeCanvas(canvas: HTMLCanvasElement): string {
  // WebP is ~3-4x faster and produces smaller files
  // Fall back to PNG for browsers without WebP support
  return supportsWebP() ? canvas.toDataURL('image/webp', 0.92) : canvas.toDataURL('image/png');
}

// Clear cache when tokens are regenerated (called from outside)
export function clearDataUrlCache(): void {
  dataUrlCache.clear();
}

// Pre-render data URLs for ALL tokens synchronously during generation
// This ensures cache is populated before TokenGrid renders
let isPreRenderingGallery = false;

// Cache version counter - increments when pre-render completes to trigger re-renders
let cacheVersion = 0;
export function getCacheVersion(): number {
  return cacheVersion;
}

export function preRenderGalleryTokens(tokens: Token[], onComplete?: () => void): void {
  if (isPreRenderingGallery || tokens.length === 0) return;

  isPreRenderingGallery = true;

  // Tokens now have pre-encoded dataUrl from TokenFactory
  // Just populate the cache with the existing dataUrls
  for (const token of tokens) {
    if (dataUrlCache.has(token.filename)) continue;
    // Use pre-encoded dataUrl if available, otherwise encode canvas (fallback)
    if (token.dataUrl) {
      dataUrlCache.set(token.filename, token.dataUrl);
    } else if (token.canvas && token.canvas.width > 1) {
      dataUrlCache.set(token.filename, encodeCanvas(token.canvas));
    }
  }

  isPreRenderingGallery = false;
  cacheVersion++;
  onComplete?.();
}

interface TokenCardProps {
  token: Token;
  count?: number;
  variants?: Token[]; // Array of variant tokens for cycling
  cacheVersion?: number; // Triggers re-render when cache is updated
  onCardClick?: (token: Token) => void;
  onSetAsExample?: (token: Token) => void;
  onDelete?: (token: Token) => void;
  onEditInStudio?: (token: Token) => void; // Navigate to Studio with token image
  onDownload?: (token: Token) => void; // Download single token as PNG
  onClearOverrides?: (token: Token) => void; // Clear decorative overrides for this token's character
}

// Map team names to CSS Module class names
const teamClassMap: Record<string, string> = {
  townsfolk: styles.teamTownsfolk,
  outsider: styles.teamOutsider,
  minion: styles.teamMinion,
  demon: styles.teamDemon,
  traveller: styles.teamTraveller,
  traveler: styles.teamTraveller,
  fabled: styles.teamFabled,
  loric: styles.teamLoric,
  meta: styles.teamMeta,
};

/**
 * Custom comparison function for React.memo
 * Only re-render if the token's filename changes (indicates a new/different token)
 * or if the onCardClick handler changes
 */
function arePropsEqual(prevProps: TokenCardProps, nextProps: TokenCardProps): boolean {
  return (
    prevProps.token.filename === nextProps.token.filename &&
    prevProps.count === nextProps.count &&
    prevProps.variants?.length === nextProps.variants?.length &&
    prevProps.cacheVersion === nextProps.cacheVersion &&
    prevProps.onCardClick === nextProps.onCardClick &&
    prevProps.onSetAsExample === nextProps.onSetAsExample &&
    prevProps.onDelete === nextProps.onDelete &&
    prevProps.onEditInStudio === nextProps.onEditInStudio &&
    prevProps.onDownload === nextProps.onDownload &&
    prevProps.onClearOverrides === nextProps.onClearOverrides
  );
}

function TokenCardComponent({
  token,
  count = 1,
  variants = [],
  cacheVersion: _cacheVersion, // Used by memo comparison to trigger re-render
  onCardClick,
  onSetAsExample,
  onDelete,
  onEditInStudio,
  onDownload,
  onClearOverrides,
}: TokenCardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasRendered, setHasRendered] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [activeVariantIndex, setActiveVariantIndex] = useState(0);

  // Context menu state using shared hook
  const contextMenu = useContextMenu();

  // Determine the currently displayed token (considering variants)
  const hasVariants = variants.length > 1;
  const displayToken = hasVariants ? variants[activeVariantIndex] || token : token;

  // Check if we have a cached data URL (instant on tab switch)
  const cachedDataUrl = dataUrlCache.get(displayToken.filename);

  // Lazy rendering: only render when token scrolls into view
  // Uses 200px rootMargin to pre-render tokens before they're visible
  // triggerOnce: true keeps the image rendered after scrolling away
  const { ref: containerRef, isVisible } = useIntersectionObserver<HTMLButtonElement>({
    rootMargin: '200px',
    threshold: 0.1,
    triggerOnce: true,
  });

  // Get data URL from token (pre-encoded) or cache
  // Canvas encoding is now done in TokenFactory, so this is just cache lookup
  const imageDataUrl = useMemo(() => {
    // Return cached value immediately if available
    if (cachedDataUrl) return cachedDataUrl;

    // Use pre-encoded dataUrl from token if available
    if (displayToken.dataUrl) {
      dataUrlCache.set(displayToken.filename, displayToken.dataUrl);
      return displayToken.dataUrl;
    }

    // Only encode when visible and not cached (legacy fallback)
    if (!(displayToken.canvas && displayToken.canvas.width > 1 && isVisible)) return null;

    // Fallback: encode on-demand (shouldn't happen with new TokenFactory)
    const dataUrl = encodeCanvas(displayToken.canvas);
    dataUrlCache.set(displayToken.filename, dataUrl);
    return dataUrl;
  }, [displayToken.dataUrl, displayToken.canvas, displayToken.filename, isVisible, cachedDataUrl]);

  useEffect(() => {
    // If we have cached data or newly generated data, mark as rendered
    if ((cachedDataUrl || (isVisible && imageDataUrl)) && !hasRendered) {
      setIsLoading(false);
      setHasRendered(true);
    }
  }, [isVisible, imageDataUrl, hasRendered, cachedDataUrl]);

  // Reset loading state when variant changes
  useEffect(() => {
    if (hasVariants) {
      const variantCached = dataUrlCache.get(displayToken.filename);
      if (!variantCached) {
        setIsLoading(true);
        setHasRendered(false);
        setIsImageLoaded(false);
      }
    }
  }, [hasVariants, displayToken.filename]);

  // Handle image load for smooth fade-in transition
  const handleImageLoad = () => {
    setIsImageLoaded(true);
  };

  const handleCardClick = () => {
    onCardClick?.(displayToken);
  };

  const handlePrevVariant = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setActiveVariantIndex((prev) => (prev - 1 + variants.length) % variants.length);
  };

  const handleNextVariant = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setActiveVariantIndex((prev) => (prev + 1) % variants.length);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (onSetAsExample || onDelete || onEditInStudio || onDownload || onClearOverrides) {
      contextMenu.onContextMenu(e);
    }
  };

  // Build context menu items
  const contextMenuItems: ContextMenuItem[] = useMemo(() => {
    const items: ContextMenuItem[] = [];

    // Download token as PNG
    if (onDownload) {
      items.push({
        icon: '⬇️',
        label: 'Download PNG',
        onClick: () => onDownload(displayToken),
      });
    }

    // Edit in Studio (for character tokens with images)
    if (onEditInStudio && displayToken.type === 'character') {
      items.push({
        icon: '🎨',
        label: 'Edit in Studio',
        onClick: () => onEditInStudio(displayToken),
      });
    }

    if (onSetAsExample) {
      items.push({
        icon: '⭐',
        label: 'Set as Example',
        onClick: () => onSetAsExample(displayToken),
      });
    }
    if (onDelete) {
      items.push({
        icon: '🗑️',
        label: 'Delete',
        variant: 'danger',
        onClick: () => onDelete(displayToken),
      });
    }

    // Clear decorative overrides (only show if token has overrides)
    if (onClearOverrides && displayToken.hasDecorativeOverrides) {
      items.push({
        icon: '🔄',
        label: 'Clear Overrides',
        onClick: () => onClearOverrides(displayToken),
      });
    }

    return items;
  }, [onSetAsExample, onDelete, onEditInStudio, onDownload, onClearOverrides, displayToken]);

  // Get team display name for character, reminder, and meta tokens
  const getTeamDisplay = () => {
    if (displayToken.type === 'character' || displayToken.type === 'reminder') {
      const teamKey = displayToken.team.toLowerCase() as Team;
      return TEAM_LABELS[teamKey] || displayToken.team;
    }
    if (
      displayToken.type === 'script-name' ||
      displayToken.type === 'almanac' ||
      displayToken.type === 'pandemonium' ||
      displayToken.type === 'bootlegger' ||
      displayToken.type === 'jinx'
    ) {
      return 'Meta';
    }
    return null;
  };

  const teamDisplay = getTeamDisplay();

  // Get team class for styling
  const getTeamClass = (): string => {
    if (displayToken.type === 'character' || displayToken.type === 'reminder') {
      const teamKey = displayToken.team.toLowerCase();
      return teamClassMap[teamKey] || '';
    }
    if (
      displayToken.type === 'script-name' ||
      displayToken.type === 'almanac' ||
      displayToken.type === 'pandemonium' ||
      displayToken.type === 'bootlegger' ||
      displayToken.type === 'jinx'
    ) {
      return teamClassMap.meta || '';
    }
    return '';
  };

  const teamClass = getTeamClass();

  return (
    <>
      <button
        type="button"
        ref={containerRef}
        className={styles.card}
        onClick={handleCardClick}
        onContextMenu={handleContextMenu}
        title={`Click to view details: ${displayToken.name}${count > 1 ? ` (×${count})` : ''}${hasVariants ? ` (variant ${activeVariantIndex + 1}/${variants.length})` : ''}`}
      >
        {count > 1 && (
          <span className={styles.countBadge} title={`${count} copies`}>
            ×{count}
          </span>
        )}
        <div className={styles.canvasContainer}>
          {/* Show skeleton until image is fully loaded for smooth transition */}
          {/* If cached, render immediately without waiting for visibility */}
          {!((cachedDataUrl || isVisible) && isImageLoaded) && <div className={styles.skeleton} />}
          {isVisible && isLoading && !imageDataUrl && (
            <div className={styles.loading}>Loading...</div>
          )}
          {(cachedDataUrl || isVisible) && imageDataUrl && (
            <img
              src={imageDataUrl}
              alt={displayToken.name}
              className={`${styles.canvas} ${isImageLoaded ? styles.canvasLoaded : ''}`}
              title={displayToken.filename}
              onLoad={handleImageLoad}
            />
          )}
        </div>

        <div className={styles.footer}>
          <div className={styles.info}>
            <div className={styles.name}>{displayToken.name}</div>
            <div className={styles.metadata}>
              {teamDisplay && <span className={`${styles.team} ${teamClass}`}>{teamDisplay}</span>}
              {displayToken.isOfficial && <span className={styles.official}>Official</span>}
              {displayToken.hasDecorativeOverrides && (
                <span className={styles.customized} title="Has custom decorative settings">
                  Customized
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Variant navigation */}
        {hasVariants && (
          <div className={styles.variantNav}>
            <button
              type="button"
              className={styles.variantButton}
              onClick={handlePrevVariant}
              aria-label="Previous variant"
              title="Previous variant"
            >
              ◀
            </button>
            <span className={styles.variantIndicator}>
              v{activeVariantIndex + 1}/{variants.length}
            </span>
            <button
              type="button"
              className={styles.variantButton}
              onClick={handleNextVariant}
              aria-label="Next variant"
              title="Next variant"
            >
              ▶
            </button>
          </div>
        )}
      </button>

      {/* Context menu */}
      <ContextMenu
        ref={contextMenu.menuRef}
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        items={contextMenuItems}
        onClose={contextMenu.close}
      />
    </>
  );
}

/**
 * Memoized TokenCard component
 * Prevents re-renders when parent re-renders but token hasn't changed
 */
export const TokenCard = memo(TokenCardComponent, arePropsEqual);
