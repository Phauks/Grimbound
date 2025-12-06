import { memo, useRef, useEffect, useLayoutEffect, useId, useState } from 'react'
import type { CustomPreset } from '../../hooks/usePresets'
import type { PresetName } from '../../ts/types/index'
import { cn } from '../../ts/utils'
import styles from '../../styles/components/presets/PresetCard.module.css'

interface PresetCardProps {
  icon: string
  name: string
  title: string
  isActive?: boolean
  onApply: () => void
  onMenuToggle: () => void
  menuIsOpen?: boolean
  menuItems?: MenuItemConfig[]
  defaultStar?: boolean
  isAddButton?: boolean
  // Drag and drop props
  draggable?: boolean
  isDragging?: boolean
  isDropTarget?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDragLeave?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
}

interface MenuItemConfig {
  icon: string
  label: string
  description?: string
  onClick: () => void
}

export const PresetCard = memo(
  ({
    icon,
    name,
    title,
    isActive = false,
    onApply,
    onMenuToggle,
    menuIsOpen = false,
    menuItems = [],
    defaultStar = false,
    isAddButton = false,
    draggable = false,
    isDragging = false,
    isDropTarget = false,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop,
    onDragEnd,
  }: PresetCardProps) => {
    const menuContainerRef = useRef<HTMLDivElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const menuId = useId()
    const triggerId = useId()
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null)

    // Calculate menu position synchronously after DOM update
    useLayoutEffect(() => {
      if (menuIsOpen && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        // Only set position if the element has been laid out (non-zero dimensions)
        if (rect.width > 0 && rect.height > 0) {
          setMenuPosition({
            top: rect.top,
            left: rect.right + 8,
          })
        } else {
          // Element not yet laid out, try again on next frame
          requestAnimationFrame(() => {
            if (triggerRef.current) {
              const retryRect = triggerRef.current.getBoundingClientRect()
              setMenuPosition({
                top: retryRect.top,
                left: retryRect.right + 8,
              })
            }
          })
        }
      } else {
        setMenuPosition(null)
      }
    }, [menuIsOpen])

    // Close menu on click outside or Escape key
    useEffect(() => {
      if (!menuIsOpen) return

      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node
        // Check if click is outside both the container and the dropdown
        const isOutsideContainer = !menuContainerRef.current?.contains(target)
        const isOutsideDropdown = !dropdownRef.current?.contains(target)
        
        if (isOutsideContainer && isOutsideDropdown) {
          onMenuToggle()
        }
      }

      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          onMenuToggle()
        }
      }

      // Delay adding click listener to avoid catching the opening click
      const timeoutId = requestAnimationFrame(() => {
        document.addEventListener('mousedown', handleClickOutside)
      })
      document.addEventListener('keydown', handleEscape)

      return () => {
        cancelAnimationFrame(timeoutId)
        document.removeEventListener('mousedown', handleClickOutside)
        document.removeEventListener('keydown', handleEscape)
      }
    }, [menuIsOpen, onMenuToggle])

    const cardClasses = cn(
      styles.card,
      isActive && styles.active,
      isAddButton && styles.cardAdd,
      isDragging && styles.dragging,
      isDropTarget && styles.dropTarget,
    )

    return (
      <div
        className={cardClasses}
        onClick={onApply}
        title={title}
        role="button"
        tabIndex={0}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onApply()
          }
        }}
      >
        {defaultStar && <span className={styles.defaultStar}>⭐</span>}
        <span className={styles.icon}>{icon}</span>
        <span className={styles.name}>{name}</span>
        {menuItems.length > 0 && (
          <div ref={menuContainerRef} className={styles.menuContainer}>
            <button
              ref={triggerRef}
              id={triggerId}
              className={styles.menuTrigger}
              title="Preset options"
              aria-haspopup="menu"
              aria-expanded={menuIsOpen}
              aria-controls={menuId}
              onClick={(e) => {
                e.stopPropagation()
                onMenuToggle()
              }}
            >
              ⋮
            </button>
            {menuIsOpen && menuPosition && (
              <div
                ref={dropdownRef}
                id={menuId}
                role="menu"
                aria-labelledby={triggerId}
                className={cn(styles.menuDropdown, styles.active)}
                style={{
                  position: 'fixed',
                  top: menuPosition.top,
                  left: menuPosition.left,
                }}
              >
                {menuItems.map((item) => (
                  <button
                    key={item.label}
                    role="menuitem"
                    className={styles.menuItem}
                    data-tooltip={item.description}
                    onClick={(e) => {
                      e.stopPropagation()
                      item.onClick()
                    }}
                  >
                    <span className={styles.menuIcon}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }
)

PresetCard.displayName = 'PresetCard'
