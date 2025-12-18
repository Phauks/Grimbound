/**
 * BackgroundDrawer Component
 *
 * A slide-out drawer for background settings that positions itself
 * below the TokenPreviewRow to keep previews always visible.
 *
 * Key features:
 * - Portal rendering to body
 * - Positions below the preview row dynamically
 * - Smooth slide-up animation
 * - Click-outside and Escape key to close
 * - Keyboard accessible
 *
 * @module components/Shared/Drawer/BackgroundDrawer
 */

import { memo, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from '@/styles/components/shared/BackgroundDrawer.module.css';

export interface BackgroundDrawerProps {
  /** Whether the drawer is open */
  isOpen: boolean;
  /** Called when the drawer should close (cancel) */
  onClose: () => void;
  /** Called when apply is clicked */
  onApply: () => void;
  /** Called when reset is clicked */
  onReset: () => void;
  /** Token type label to display in header */
  tokenType: 'character' | 'reminder' | 'meta';
  /** Drawer content */
  children: ReactNode;
  /** Optional title override */
  title?: string;
}

/**
 * Calculate drawer position based on the preview row
 * Matches the preview row width exactly so drawer fits naturally in right panel
 */
function getDrawerPosition(): { top: number; left: number; right: number } {
  // Find the preview row element - drawer matches its width
  const previewRow = document.querySelector('[data-preview-row]');

  // Default fallbacks
  let top = 200;
  let left = 320;
  let right = 16;

  if (previewRow) {
    const rect = previewRow.getBoundingClientRect();
    top = rect.bottom + 8; // 8px gap below preview row
    left = rect.left; // Match preview row's left edge
    right = window.innerWidth - rect.right; // Match preview row's right edge
  }

  return { top, left, right };
}

export const BackgroundDrawer = memo(function BackgroundDrawer({
  isOpen,
  onClose,
  onApply,
  onReset,
  tokenType,
  children,
  title = 'Background Settings',
}: BackgroundDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 200, left: 320, right: 16 });

  // Update position when drawer opens or on resize
  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      setPosition(getDrawerPosition());
    };

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

  // Handle escape key to close
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

  // Handle click outside to close
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      // Only close if clicking the overlay itself, not the drawer content
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Focus management - focus first focusable element when opened
  useEffect(() => {
    if (isOpen && drawerRef.current) {
      const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length > 0) {
        // Focus the close button or first interactive element
        const closeButton =
          drawerRef.current.querySelector<HTMLButtonElement>('[data-close-button]');
        if (closeButton) {
          closeButton.focus();
        } else {
          focusableElements[0].focus();
        }
      }
    }
  }, [isOpen]);

  // Token type label for header
  const tokenTypeLabel = tokenType.charAt(0).toUpperCase() + tokenType.slice(1);

  // Drawer styles with CSS custom properties for position
  const drawerStyle: React.CSSProperties = {
    '--drawer-top': `${position.top}px`,
    '--drawer-left': `${position.left}px`,
    '--drawer-right': `${position.right}px`,
  } as React.CSSProperties;

  // Don't render anything if not open (for performance)
  // But we use CSS transitions, so we need to keep it in DOM briefly
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
    } else {
      // Keep in DOM during close animation
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!shouldRender) return null;

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
        aria-label={`${tokenTypeLabel} ${title}`}
      >
        {/* Header with title and action buttons */}
        <div className={styles.drawerHeader}>
          <h2 className={styles.drawerTitle}>
            <span className={styles.drawerTitleIcon}>🎨</span>
            {title}
            <span className={styles.tokenTypeLabel}>{tokenTypeLabel}</span>
          </h2>

          {/* Action buttons in header */}
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

        {/* Content - rendered from parent */}
        <div className={styles.drawerContent}>{children}</div>
      </div>
    </>
  );

  return createPortal(drawerContent, document.body);
});

export default BackgroundDrawer;
