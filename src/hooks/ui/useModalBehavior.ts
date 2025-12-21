/**
 * useModalBehavior Hook
 *
 * Centralized modal behavior management including:
 * - Escape key handling
 * - Body scroll locking
 * - Backdrop click handling
 *
 * This hook eliminates ~50 lines of duplicated code across 9+ modal components.
 *
 * @module hooks/ui/useModalBehavior
 */

import { useCallback, useEffect } from 'react';

interface UseModalBehaviorOptions {
  /** Whether the modal is currently open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Whether pressing Escape should close the modal (default: true) */
  closeOnEscape?: boolean;
  /** Whether clicking the backdrop should close the modal (default: true) */
  closeOnBackdrop?: boolean;
  /** Whether to prevent closing (e.g., during loading states) */
  preventClose?: boolean;
}

interface UseModalBehaviorReturn {
  /** Click handler for backdrop element */
  handleBackdropClick: (e: React.MouseEvent) => void;
}

/**
 * Hook for managing common modal behaviors
 *
 * @example
 * ```tsx
 * function MyModal({ isOpen, onClose }) {
 *   const { handleBackdropClick } = useModalBehavior({
 *     isOpen,
 *     onClose,
 *     preventClose: isLoading,
 *   })
 *
 *   return (
 *     <div className={styles.overlay}>
 *       <div className={styles.backdrop} onClick={handleBackdropClick} />
 *       <div className={styles.content}>...</div>
 *     </div>
 *   )
 * }
 * ```
 */
export function useModalBehavior({
  isOpen,
  onClose,
  closeOnEscape = true,
  closeOnBackdrop = true,
  preventClose = false,
}: UseModalBehaviorOptions): UseModalBehaviorReturn {
  // Handle escape key press
  useEffect(() => {
    if (!(isOpen && closeOnEscape)) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !preventClose) {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, closeOnEscape, preventClose]);

  // Handle body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    // Store original overflow value
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    // Calculate scrollbar width to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    // Apply scroll lock
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      // Restore original values
      document.body.style.overflow = originalOverflow || '';
      document.body.style.paddingRight = originalPaddingRight || '';
    };
  }, [isOpen]);

  // Backdrop click handler
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      // Only close if clicking directly on the backdrop (not its children)
      if (e.target === e.currentTarget && closeOnBackdrop && !preventClose) {
        onClose();
      }
    },
    [onClose, closeOnBackdrop, preventClose]
  );

  return { handleBackdropClick };
}

export default useModalBehavior;
