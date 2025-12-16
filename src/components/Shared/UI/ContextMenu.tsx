import { createPortal } from 'react-dom'
import { forwardRef } from 'react'
import type { ContextMenuPosition } from '../../../hooks/useContextMenu'
import styles from '../../../styles/components/shared/ContextMenu.module.css'

export interface ContextMenuItem {
  /** Icon to display (emoji or text) */
  icon?: string
  /** Label text for the menu item */
  label: string
  /** Optional description for tooltip */
  description?: string
  /** Click handler (optional if submenu is provided) */
  onClick?: () => void
  /** Visual variant - 'danger' shows red styling */
  variant?: 'default' | 'danger'
  /** Whether the item is disabled */
  disabled?: boolean
  /** Submenu items for nested menus */
  submenu?: ContextMenuItem[]
}

export interface ContextMenuProps {
  /** Whether the menu is visible */
  isOpen: boolean
  /** Position of the menu */
  position: ContextMenuPosition | null
  /** Menu items to render */
  items: ContextMenuItem[]
  /** Called when the menu should close */
  onClose: () => void
  /** Optional className for the menu container */
  className?: string
}

/**
 * Reusable context menu component that renders via Portal to document.body.
 * Supports keyboard navigation, danger variants, and consistent styling.
 */
export const ContextMenu = forwardRef<HTMLDivElement, ContextMenuProps>(
  ({ isOpen, position, items, onClose, className }, ref) => {
    if (!isOpen || !position || items.length === 0) {
      return null
    }

    const handleItemClick = (item: ContextMenuItem) => {
      if (item.disabled || !item.onClick) return
      item.onClick()
      onClose()
    }

    const menu = (
      <div
        ref={ref}
        className={`${styles.contextMenu} ${className || ''}`}
        style={{
          position: 'fixed',
          top: position.y,
          left: position.x,
        }}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.preventDefault()}
        role="menu"
        aria-label="Context menu"
      >
        {items.map((item, index) => (
          <button
            key={`${item.label}-${index}`}
            className={`${styles.contextMenuItem} ${item.variant === 'danger' ? styles.danger : ''} ${item.disabled ? styles.disabled : ''}`}
            onClick={() => handleItemClick(item)}
            disabled={item.disabled}
            role="menuitem"
            title={item.description}
          >
            {item.icon && <span className={styles.menuIcon}>{item.icon}</span>}
            <span className={styles.menuLabel}>{item.label}</span>
          </button>
        ))}
      </div>
    )

    // Render via Portal to document.body for proper stacking
    return createPortal(menu, document.body)
  }
)

ContextMenu.displayName = 'ContextMenu'
