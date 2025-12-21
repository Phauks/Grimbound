/**
 * Modal Component
 *
 * Unified modal wrapper that handles:
 * - Escape key to close
 * - Body scroll locking
 * - Backdrop click to close
 * - Accessibility (aria-modal, focus management)
 * - Consistent styling across the application
 *
 * This replaces 9+ different modal implementations with a single source of truth.
 *
 * @example
 * ```tsx
 * // Basic modal
 * <Modal isOpen={isOpen} onClose={onClose} title="Settings">
 *   <p>Modal content here</p>
 * </Modal>
 *
 * // Modal with footer actions
 * <Modal
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   title="Confirm Delete"
 *   size="small"
 *   footer={
 *     <>
 *       <Button variant="secondary" onClick={onClose}>Cancel</Button>
 *       <Button variant="danger" onClick={onDelete}>Delete</Button>
 *     </>
 *   }
 * >
 *   <p>Are you sure?</p>
 * </Modal>
 *
 * // Modal with loading state (prevents closing)
 * <Modal
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   title="Saving..."
 *   preventClose={isLoading}
 * >
 *   <p>Please wait...</p>
 * </Modal>
 * ```
 */

import { type ReactNode, useId } from 'react';
import { useModalBehavior } from '@/hooks';
import { cn } from '@/ts/utils';
import styles from './Modal.module.css';

export type ModalSize = 'small' | 'medium' | 'large' | 'xlarge' | 'full';

export interface ModalProps {
  /** Whether the modal is currently open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Modal title displayed in header */
  title: string;
  /** Size variant */
  size?: ModalSize;
  /** Modal body content */
  children: ReactNode;
  /** Footer content (typically action buttons) */
  footer?: ReactNode;
  /** Whether to prevent closing (e.g., during loading) */
  preventClose?: boolean;
  /** Additional CSS class for the container */
  className?: string;
  /** ID for aria-describedby */
  'aria-describedby'?: string;
}

const sizeClasses: Record<ModalSize, string> = {
  small: styles.sizeSmall,
  medium: styles.sizeMedium,
  large: styles.sizeLarge,
  xlarge: styles.sizeXLarge,
  full: styles.sizeFull,
};

export function Modal({
  isOpen,
  onClose,
  title,
  size = 'medium',
  children,
  footer,
  preventClose = false,
  className,
  'aria-describedby': ariaDescribedBy,
}: ModalProps) {
  const { handleBackdropClick } = useModalBehavior({
    isOpen,
    onClose,
    preventClose,
  });

  // Generate unique ID for title
  const generatedId = useId();
  const titleId = `modal-title-${generatedId}`;

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={ariaDescribedBy}
    >
      <div className={styles.backdrop} onClick={handleBackdropClick} role="presentation" />
      <div className={cn(styles.container, sizeClasses[size], className)}>
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            disabled={preventClose}
            aria-label="Close modal"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
}

// ============================================
// Compound Components for Complex Layouts
// ============================================

interface ModalBodyProps {
  children: ReactNode;
  compact?: boolean;
  className?: string;
}

/**
 * Modal body with optional compact padding
 */
Modal.Body = function ModalBody({ children, compact, className }: ModalBodyProps) {
  return (
    <div className={cn(styles.body, compact && styles.bodyCompact, className)}>{children}</div>
  );
};

interface ModalFooterProps {
  children: ReactNode;
  align?: 'start' | 'center' | 'end' | 'between';
  className?: string;
}

/**
 * Modal footer with alignment options
 */
Modal.Footer = function ModalFooter({ children, align = 'end', className }: ModalFooterProps) {
  const alignClass = {
    start: styles.footerStart,
    center: styles.footerCenter,
    end: styles.footerEnd,
    between: styles.footerBetween,
  }[align];

  return <div className={cn(styles.footer, alignClass, className)}>{children}</div>;
};

export default Modal;
