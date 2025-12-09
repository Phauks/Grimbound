import { useState, useEffect, useCallback, useRef } from 'react'

export interface ContextMenuPosition {
  x: number
  y: number
}

export interface UseContextMenuOptions<TData = undefined> {
  /** Controlled mode: external isOpen state */
  isOpen?: boolean
  /** Controlled mode: external toggle handler */
  onToggle?: (open: boolean) => void
  /** Position strategy: 'mouse' (default) positions at cursor, 'element' positions relative to element */
  positionMode?: 'mouse' | 'element'
  /** Offset from element when using positionMode: 'element' */
  elementOffset?: { x: number; y: number }
}

export interface UseContextMenuReturn<TData = undefined> {
  /** Whether the context menu is open */
  isOpen: boolean
  /** The position of the context menu */
  position: ContextMenuPosition | null
  /** Associated data (e.g., characterId, tokenId) */
  data: TData | null
  /** Open the context menu at the mouse position or relative to element */
  open: (e: React.MouseEvent, data?: TData, element?: HTMLElement | null) => void
  /** Close the context menu */
  close: () => void
  /** Ref to attach to the menu container for click-outside detection */
  menuRef: React.RefObject<HTMLDivElement | null>
  /** Handler to attach to an element's onContextMenu */
  onContextMenu: (e: React.MouseEvent, data?: TData, element?: HTMLElement | null) => void
}

/**
 * Hook for managing context menu state with support for:
 * - Self-contained or controlled mode (parent-managed state)
 * - Mouse-based or element-based positioning
 * - Automatic click-outside and Escape key handling
 * - Associated data storage (e.g., which item was right-clicked)
 */
export function useContextMenu<TData = undefined>(
  options: UseContextMenuOptions<TData> = {}
): UseContextMenuReturn<TData> {
  const {
    isOpen: controlledIsOpen,
    onToggle,
    positionMode = 'mouse',
    elementOffset = { x: 8, y: 0 },
  } = options

  // Internal state for self-contained mode
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const [position, setPosition] = useState<ContextMenuPosition | null>(null)
  const [data, setData] = useState<TData | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  // Determine if we're in controlled mode
  const isControlled = controlledIsOpen !== undefined
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen

  const close = useCallback(() => {
    if (isControlled) {
      onToggle?.(false)
    } else {
      setInternalIsOpen(false)
    }
    setPosition(null)
    setData(null)
  }, [isControlled, onToggle])

  const open = useCallback(
    (e: React.MouseEvent, itemData?: TData, element?: HTMLElement | null) => {
      e.preventDefault()
      e.stopPropagation()

      let pos: ContextMenuPosition

      if (positionMode === 'element' && element) {
        const rect = element.getBoundingClientRect()
        pos = {
          x: rect.right + elementOffset.x,
          y: rect.top + elementOffset.y,
        }
      } else {
        pos = {
          x: e.clientX,
          y: e.clientY,
        }
      }

      setPosition(pos)
      setData(itemData ?? (null as TData | null))

      if (isControlled) {
        onToggle?.(true)
      } else {
        setInternalIsOpen(true)
      }
    },
    [positionMode, elementOffset, isControlled, onToggle]
  )

  // Click outside and Escape key handling
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (menuRef.current && !menuRef.current.contains(target)) {
        close()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close()
      }
    }

    // Use requestAnimationFrame to delay adding the listener
    // This avoids catching the opening click/right-click
    const frameId = requestAnimationFrame(() => {
      document.addEventListener('mousedown', handleClickOutside)
    })
    document.addEventListener('keydown', handleEscape)

    return () => {
      cancelAnimationFrame(frameId)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, close])

  // Convenience handler for onContextMenu prop
  const onContextMenu = useCallback(
    (e: React.MouseEvent, itemData?: TData, element?: HTMLElement | null) => {
      open(e, itemData, element)
    },
    [open]
  )

  return {
    isOpen,
    position,
    data,
    open,
    close,
    menuRef,
    onContextMenu,
  }
}
