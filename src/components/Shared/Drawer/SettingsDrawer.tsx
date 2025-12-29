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

import { memo, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
 * Calculate drawer position based on the preview row element.
 * Drawer matches preview row width for visual alignment.
 */
function getDrawerPosition(): { top: number; left: number; right: number } {
  const previewRow = document.querySelector('[data-preview-row]');

  // Default fallbacks if preview row not found
  let top = 200;
  let left = 320;
  let right = 16;

  if (previewRow) {
    const rect = previewRow.getBoundingClientRect();
    top = rect.bottom + 8; // 8px gap below preview row
    left = rect.left;
    right = window.innerWidth - rect.right;
  }

  return { top, left, right };
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
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

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

export const SettingsDrawer = memo(function SettingsDrawer({
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
  const position = useDrawerPosition(isOpen);
  const { handleOverlayClick } = useDrawerCloseHandlers(isOpen, onClose);
  useDrawerAccessibility(isOpen, drawerRef, initialFocusSelector);

  // Early return if not rendering
  if (!shouldRender) return null;

  // Drawer styles with CSS custom properties
  const drawerStyle: React.CSSProperties = {
    '--drawer-top': `${position.top}px`,
    '--drawer-left': `${position.left}px`,
    '--drawer-right': `${position.right}px`,
  } as React.CSSProperties;

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
        className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`}
        style={drawerStyle}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? title}
      >
        {/* Header */}
        <div className={styles.drawerHeader}>
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
      </div>
    </>
  );

  return createPortal(drawerContent, document.body);
});

export default SettingsDrawer;
