/**
 * SettingsDrawer Component
 *
 * A consolidated base drawer component for settings panels (Font, Background, Icon).
 * Handles all common drawer behavior:
 * - Portal rendering to body
 * - Dynamic positioning below preview row
 * - Smooth slide-up animation with enter/exit states
 * - Click-outside and Escape key to close
 * - Body scroll prevention
 * - Focus management
 *
 * Specific drawers (FontDrawer, BackgroundDrawer, IconDrawer) compose this base
 * with their own header configuration (tabs, link toggles, title icons).
 *
 * @module components/Shared/Drawer/SettingsDrawer
 */

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDraggablePosition } from '@/hooks/ui/useDraggablePosition';
import styles from '@/styles/components/shared/SettingsDrawer.module.css';

// ============================================================================
// Types
// ============================================================================

export interface SettingsDrawerProps {
  /** Whether the drawer is open */
  isOpen: boolean;
  /** Called when the drawer should close (via overlay click or escape key) */
  onClose: () => void;
  /** Called when Apply button is clicked */
  onApply: () => void;
  /** Called when Reset button is clicked */
  onReset: () => void;
  /** Drawer content (columns) */
  children: ReactNode;
  /** Title displayed in header */
  title: string;
  /** Icon displayed before title (emoji or element) */
  titleIcon?: ReactNode;
  /** Optional tabs/controls between title and action buttons */
  headerSlot?: ReactNode;
  /** Selector for element to focus when drawer opens (default: first focusable) */
  initialFocusSelector?: string;
  /** ARIA label for the drawer (defaults to title) */
  ariaLabel?: string;
}

// ============================================================================
// Position Utility
// ============================================================================

/**
 * Calculate drawer position based on anchor elements.
 * Tries multiple selectors in order:
 * 1. [data-preview-row] - TokensView preview row (position below)
 * 2. [data-settings-anchor] - General anchor element (position below)
 * 3. [data-left-panel] - Left sidebar (position to the right)
 */
function getDrawerPosition(): { top: number; left: number; right: number } {
  // Try preview row first (TokensView)
  const previewRow = document.querySelector('[data-preview-row]');
  if (previewRow) {
    const rect = previewRow.getBoundingClientRect();
    return {
      top: rect.bottom + 8, // 8px gap below preview row
      left: rect.left,
      right: window.innerWidth - rect.right,
    };
  }

  // Try general anchor element
  const anchor = document.querySelector('[data-settings-anchor]');
  if (anchor) {
    const rect = anchor.getBoundingClientRect();
    return {
      top: rect.bottom + 8,
      left: rect.left,
      right: window.innerWidth - rect.right,
    };
  }

  // Try left panel (NightOrderView/ScriptView layout)
  const leftPanel = document.querySelector('[data-left-panel]');
  if (leftPanel) {
    const rect = leftPanel.getBoundingClientRect();
    return {
      top: 56, // Below header
      left: rect.right + 16, // 16px gap to the right of sidebar
      right: 16,
    };
  }

  // Default fallbacks
  return { top: 200, left: 320, right: 16 };
}

// ============================================================================
// Custom Hooks for Drawer Behavior
// ============================================================================

/**
 * Manages drawer render state for enter/exit animations
 */
function useDrawerAnimation(isOpen: boolean): boolean {
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
    } else {
      // Keep in DOM during 300ms close animation
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return shouldRender;
}

/**
 * Manages dynamic positioning relative to preview row
 */
function useDrawerPosition(isOpen: boolean) {
  const [position, setPosition] = useState({ top: 200, left: 320, right: 16 });

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => setPosition(getDrawerPosition());

    // Initial position
    updatePosition();

    // Update on resize/scroll
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  return position;
}

/**
 * Handles escape key and click-outside close behavior
 */
function useDrawerCloseHandlers(isOpen: boolean, onClose: () => void) {
  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Click outside handler
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return { handleOverlayClick };
}

/**
 * Prevents body scroll and manages focus when drawer opens
 */
function useDrawerAccessibility(
  isOpen: boolean,
  drawerRef: React.RefObject<HTMLDivElement | null>,
  initialFocusSelector?: string
) {
  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Focus management
  useEffect(() => {
    if (isOpen && drawerRef.current) {
      // Try custom selector first
      if (initialFocusSelector) {
        const customFocus = drawerRef.current.querySelector<HTMLElement>(initialFocusSelector);
        if (customFocus) {
          customFocus.focus();
          return;
        }
      }

      // Fall back to first focusable element
      const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    }
  }, [isOpen, initialFocusSelector, drawerRef]);
}

// ============================================================================
// Component
// ============================================================================

export function SettingsDrawer({
  isOpen,
  onClose,
  onApply,
  onReset,
  children,
  title,
  titleIcon,
  headerSlot,
  initialFocusSelector,
  ariaLabel,
}: SettingsDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Use consolidated behavior hooks
  const shouldRender = useDrawerAnimation(isOpen);
  const defaultPosition = useDrawerPosition(isOpen);
  const { handleOverlayClick } = useDrawerCloseHandlers(isOpen, onClose);
  useDrawerAccessibility(isOpen, drawerRef, initialFocusSelector);

  // Draggable and resizable position hook
  const {
    dragState,
    isDragging,
    isResizing,
    dragHandleProps,
    getResizeHandleProps,
    resetPosition,
  } = useDraggablePosition({
    enabled: isOpen,
    minWidth: 650, // Ensure title, tabs, and buttons all fit
    minHeight: 150, // Keep header and some content visible
  });

  // Reset dragged position when drawer closes
  useEffect(() => {
    if (!isOpen) {
      resetPosition();
    }
  }, [isOpen, resetPosition]);

  // Early return if not rendering
  if (!shouldRender) return null;

  // Use dragged position/size if available, otherwise use default CSS positioning
  const drawerStyle: React.CSSProperties = dragState
    ? {
        position: 'fixed',
        top: dragState.position.y,
        left: dragState.position.x,
        width: dragState.size.width,
        height: dragState.size.height,
        right: 'auto',
      }
    : ({
        '--drawer-top': `${defaultPosition.top}px`,
        '--drawer-left': `${defaultPosition.left}px`,
        '--drawer-right': `${defaultPosition.right}px`,
      } as React.CSSProperties);

  const isInteracting = isDragging || isResizing;

  const drawerContent = (
    <>
      {/* Overlay */}
      <div
        className={`${styles.overlay} ${isOpen ? styles.overlayVisible : ''}`}
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        data-draggable-drawer
        className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''} ${isInteracting ? styles.drawerDragging : ''}`}
        style={drawerStyle}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? title}
      >
        {/* Header - Drag Handle */}
        <div className={`${styles.drawerHeader} ${styles.dragHandle}`} {...dragHandleProps}>
          <div className={styles.headerLeft}>
            <h2 className={styles.drawerTitle}>
              {titleIcon && <span className={styles.drawerTitleIcon}>{titleIcon}</span>}
              {title}
            </h2>

            {/* Optional header slot (tabs, link toggles, etc.) */}
            {headerSlot}
          </div>

          {/* Action buttons */}
          <div className={styles.headerActions}>
            <button type="button" className={styles.resetButton} onClick={onReset}>
              Reset
            </button>
            <button type="button" className={styles.cancelButton} onClick={onClose}>
              Cancel
            </button>
            <button type="button" className={styles.applyButton} onClick={onApply}>
              Apply
            </button>
          </div>
        </div>

        {/* Content */}
        <div className={styles.drawerContent}>{children}</div>

        {/* Resize handles - all edges */}
        <div className={styles.resizeHandleTop} {...getResizeHandleProps('top')} />
        <div className={styles.resizeHandleRight} {...getResizeHandleProps('right')} />
        <div className={styles.resizeHandleBottom} {...getResizeHandleProps('bottom')} />
        <div className={styles.resizeHandleLeft} {...getResizeHandleProps('left')} />
        {/* Resize handles - all corners */}
        <div className={styles.resizeHandleTopLeft} {...getResizeHandleProps('top-left')} />
        <div className={styles.resizeHandleTopRight} {...getResizeHandleProps('top-right')} />
        <div className={styles.resizeHandleBottomLeft} {...getResizeHandleProps('bottom-left')} />
        <div className={styles.resizeHandleBottomRight} {...getResizeHandleProps('bottom-right')} />
      </div>
    </>
  );

  return createPortal(drawerContent, document.body);
}
