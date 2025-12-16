import { useEffect, useState, memo, useMemo } from 'react'
import { useIntersectionObserver } from '../../../../hooks/useIntersectionObserver.js'
import { useContextMenu } from '../../../../hooks/useContextMenu'
import { ContextMenu } from '../../../Shared/UI/ContextMenu'
import type { ContextMenuItem } from '../../../Shared/UI/ContextMenu'
import { TEAM_LABELS } from '../../../../ts/config.js'
import type { Token, Team } from '../../../../ts/types/index.js'
import styles from '../../../../styles/components/tokens/TokenCard.module.css'

// Module-level cache for data URLs - persists across tab switches
// Key: token filename, Value: data URL
const dataUrlCache = new Map<string, string>()

// Clear cache when tokens are regenerated (called from outside)
export function clearDataUrlCache(): void {
  dataUrlCache.clear()
}

// Pre-render data URLs for tokens (called on gallery tab hover)
// Only encodes first N tokens to avoid blocking
let isPreRenderingGallery = false
export function preRenderGalleryTokens(tokens: Token[], maxTokens: number = 20): void {
  if (isPreRenderingGallery) return
  isPreRenderingGallery = true
  
  // Use requestIdleCallback or setTimeout to avoid blocking
  const encode = () => {
    let count = 0
    for (const token of tokens) {
      if (count >= maxTokens) break
      if (!token.canvas) continue
      if (dataUrlCache.has(token.filename)) continue
      
      // Encode and cache
      dataUrlCache.set(token.filename, token.canvas.toDataURL('image/png'))
      count++
    }
    isPreRenderingGallery = false
  }
  
  // Use requestIdleCallback if available, otherwise setTimeout
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(encode, { timeout: 100 })
  } else {
    setTimeout(encode, 0)
  }
}

interface TokenCardProps {
  token: Token
  count?: number
  variants?: Token[]  // Array of variant tokens for cycling
  onCardClick?: (token: Token) => void
  onSetAsExample?: (token: Token) => void
  onDelete?: (token: Token) => void
  onEditInStudio?: (token: Token) => void  // Navigate to Studio with token image
  onDownload?: (token: Token) => void  // Download single token as PNG
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
}

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
    prevProps.onCardClick === nextProps.onCardClick &&
    prevProps.onSetAsExample === nextProps.onSetAsExample &&
    prevProps.onDelete === nextProps.onDelete &&
    prevProps.onEditInStudio === nextProps.onEditInStudio &&
    prevProps.onDownload === nextProps.onDownload
  )
}

function TokenCardComponent({ token, count = 1, variants = [], onCardClick, onSetAsExample, onDelete, onEditInStudio, onDownload }: TokenCardProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasRendered, setHasRendered] = useState(false)
  const [activeVariantIndex, setActiveVariantIndex] = useState(0)
  
  // Context menu state using shared hook
  const contextMenu = useContextMenu()

  // Determine the currently displayed token (considering variants)
  const hasVariants = variants.length > 1
  const displayToken = hasVariants ? variants[activeVariantIndex] || token : token

  // Check if we have a cached data URL (instant on tab switch)
  const cachedDataUrl = dataUrlCache.get(displayToken.filename)

  // Lazy rendering: only render when token scrolls into view
  // Uses 200px rootMargin to pre-render tokens before they're visible
  // triggerOnce: true keeps the image rendered after scrolling away
  const { ref: containerRef, isVisible } = useIntersectionObserver<HTMLDivElement>({
    rootMargin: '200px',
    threshold: 0.1,
    triggerOnce: true
  })

  // Generate data URL from canvas only when visible (lazy encoding)
  // Uses cache to avoid re-encoding on tab switches
  const imageDataUrl = useMemo(() => {
    // Return cached value immediately if available
    if (cachedDataUrl) return cachedDataUrl
    
    // Only encode when visible and not cached
    if (!displayToken.canvas || !isVisible) return null
    
    const dataUrl = displayToken.canvas.toDataURL('image/png')
    // Store in cache for future tab switches
    dataUrlCache.set(displayToken.filename, dataUrl)
    return dataUrl
  }, [displayToken.canvas, displayToken.filename, isVisible, cachedDataUrl])

  useEffect(() => {
    // If we have cached data or newly generated data, mark as rendered
    if ((cachedDataUrl || (isVisible && imageDataUrl)) && !hasRendered) {
      setIsLoading(false)
      setHasRendered(true)
    }
  }, [isVisible, imageDataUrl, hasRendered, cachedDataUrl])

  // Reset loading state when variant changes
  useEffect(() => {
    if (hasVariants) {
      const variantCached = dataUrlCache.get(displayToken.filename)
      if (!variantCached) {
        setIsLoading(true)
        setHasRendered(false)
      }
    }
  }, [activeVariantIndex, hasVariants, displayToken.filename])

  const handleCardClick = () => {
    onCardClick?.(displayToken)
  }

  const handlePrevVariant = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click
    setActiveVariantIndex((prev) => (prev - 1 + variants.length) % variants.length)
  }

  const handleNextVariant = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click
    setActiveVariantIndex((prev) => (prev + 1) % variants.length)
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    if (onSetAsExample || onDelete || onEditInStudio || onDownload) {
      contextMenu.onContextMenu(e)
    }
  }

  // Build context menu items
  const contextMenuItems: ContextMenuItem[] = useMemo(() => {
    const items: ContextMenuItem[] = []

    // Download token as PNG
    if (onDownload) {
      items.push({
        icon: '⬇️',
        label: 'Download PNG',
        onClick: () => onDownload(displayToken),
      })
    }

    // Edit in Studio (for character tokens with images)
    if (onEditInStudio && displayToken.type === 'character') {
      items.push({
        icon: '🎨',
        label: 'Edit in Studio',
        onClick: () => onEditInStudio(displayToken),
      })
    }

    if (onSetAsExample) {
      items.push({
        icon: '⭐',
        label: 'Set as Example',
        onClick: () => onSetAsExample(displayToken),
      })
    }
    if (onDelete) {
      items.push({
        icon: '🗑️',
        label: 'Delete',
        variant: 'danger',
        onClick: () => onDelete(displayToken),
      })
    }
    return items
  }, [onSetAsExample, onDelete, onEditInStudio, onDownload, displayToken])

  // Get team display name for character, reminder, and meta tokens
  const getTeamDisplay = () => {
    if (displayToken.type === 'character' || displayToken.type === 'reminder') {
      const teamKey = displayToken.team.toLowerCase() as Team
      return TEAM_LABELS[teamKey] || displayToken.team
    }
    if (displayToken.type === 'script-name' || displayToken.type === 'almanac' || displayToken.type === 'pandemonium' || displayToken.type === 'bootlegger') {
      return 'Meta'
    }
    return null
  }

  const teamDisplay = getTeamDisplay()

  // Get team class for styling
  const getTeamClass = (): string => {
    if (displayToken.type === 'character' || displayToken.type === 'reminder') {
      const teamKey = displayToken.team.toLowerCase()
      return teamClassMap[teamKey] || ''
    }
    if (displayToken.type === 'script-name' || displayToken.type === 'almanac' || displayToken.type === 'pandemonium' || displayToken.type === 'bootlegger') {
      return teamClassMap['meta'] || ''
    }
    return ''
  }

  const teamClass = getTeamClass()

  return (
    <>
      <div
        ref={containerRef}
        className={styles.card}
        onClick={handleCardClick}
        onContextMenu={handleContextMenu}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleCardClick()
          }
        }}
        title={`Click to view details: ${displayToken.name}${count > 1 ? ` (×${count})` : ''}${hasVariants ? ` (variant ${activeVariantIndex + 1}/${variants.length})` : ''}`}
      >
      {count > 1 && (
        <span className={styles.countBadge} title={`${count} copies`}>×{count}</span>
      )}
      <div className={styles.canvasContainer}>
        {/* Show skeleton when not visible, loading text when drawing */}
        {!isVisible && <div className={styles.skeleton} />}
        {isVisible && isLoading && <div className={styles.loading}>Loading...</div>}
        {isVisible && imageDataUrl && (
          <img
            src={imageDataUrl}
            alt={displayToken.name}
            className={styles.canvas}
            title={displayToken.filename}
          />
        )}
      </div>

      <div className={styles.footer}>
        <div className={styles.info}>
          <div className={styles.name}>{displayToken.name}</div>
          <div className={styles.metadata}>
            {teamDisplay && (
              <span className={`${styles.team} ${teamClass}`}>{teamDisplay}</span>
            )}
            {displayToken.isOfficial && (
              <span className={styles.official}>Official</span>
            )}
          </div>
        </div>
      </div>

      {/* Variant navigation */}
      {hasVariants && (
        <div className={styles.variantNav}>
          <button 
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
            className={styles.variantButton} 
            onClick={handleNextVariant}
            aria-label="Next variant"
            title="Next variant"
          >
            ▶
          </button>
        </div>
      )}
    </div>

    {/* Context menu */}
    <ContextMenu
      ref={contextMenu.menuRef}
      isOpen={contextMenu.isOpen}
      position={contextMenu.position}
      items={contextMenuItems}
      onClose={contextMenu.close}
    />
  </>
  )
}

/**
 * Memoized TokenCard component
 * Prevents re-renders when parent re-renders but token hasn't changed
 */
export const TokenCard = memo(TokenCardComponent, arePropsEqual)
