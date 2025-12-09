import { memo, useRef, useMemo } from 'react'
import { useContextMenu } from '../../hooks/useContextMenu'
import { ContextMenu } from '../Shared/ContextMenu'
import type { ContextMenuItem } from '../Shared/ContextMenu'
import { cn } from '../../ts/utils'
import styles from '../../styles/components/presets/PresetCard.module.css'

interface MenuItemConfig {
  icon: string
  label: string
  description?: string
  onClick: () => void
}

interface PresetCardProps {
  icon: string
  name: string
  title: string
  isActive?: boolean
  onApply: () => void
  onMenuToggle: (e?: React.MouseEvent) => void
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
    const cardRef = useRef<HTMLDivElement>(null)

    // Use context menu hook in controlled mode (parent manages open state)
    const contextMenu = useContextMenu({
      isOpen: menuIsOpen,
      onToggle: (open) => {
        if (!open) onMenuToggle()
      },
      positionMode: 'element',
      elementOffset: { x: 8, y: 0 },
    })

    // Convert MenuItemConfig to ContextMenuItem format
    const contextMenuItems: ContextMenuItem[] = useMemo(() => {
      return menuItems.map((item) => ({
        icon: item.icon,
        label: item.label,
        description: item.description,
        onClick: item.onClick,
      }))
    }, [menuItems])

    const cardClasses = cn(
      styles.card,
      isActive && styles.active,
      isAddButton && styles.cardAdd,
      isDragging && styles.dragging,
      isDropTarget && styles.dropTarget,
    )

    const handleContextMenu = (e: React.MouseEvent) => {
      if (menuItems.length > 0) {
        e.preventDefault()
        // Open context menu positioned relative to the card element
        contextMenu.open(e, undefined, cardRef.current)
        onMenuToggle(e)
      }
    }

    // Calculate position for element-based positioning
    const menuPosition = useMemo(() => {
      if (!menuIsOpen || !cardRef.current) return null
      const rect = cardRef.current.getBoundingClientRect()
      return {
        x: rect.right + 8,
        y: rect.top,
      }
    }, [menuIsOpen])

    return (
      <div
        ref={cardRef}
        className={cardClasses}
        onClick={onApply}
        onContextMenu={handleContextMenu}
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

        {/* Context menu using shared component */}
        <ContextMenu
          ref={contextMenu.menuRef}
          isOpen={menuIsOpen}
          position={menuPosition}
          items={contextMenuItems}
          onClose={() => onMenuToggle()}
        />
      </div>
    )
  }
)

PresetCard.displayName = 'PresetCard'
