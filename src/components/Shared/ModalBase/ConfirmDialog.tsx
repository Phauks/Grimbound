/**
 * ConfirmDialog Component
 *
 * A specialized modal for confirmation dialogs with optional warning display.
 * Replaces the Presets/ConfirmModal.tsx and similar confirmation patterns.
 *
 * @example
 * ```tsx
 * // Basic confirmation
 * <ConfirmDialog
 *   isOpen={showConfirm}
 *   onClose={() => setShowConfirm(false)}
 *   onConfirm={handleDelete}
 *   title="Delete Item"
 *   message="Are you sure you want to delete this item?"
 * />
 *
 * // Danger confirmation with warning
 * <ConfirmDialog
 *   isOpen={showConfirm}
 *   onClose={() => setShowConfirm(false)}
 *   onConfirm={handleDelete}
 *   title="Delete Project"
 *   message="Are you sure you want to delete this project?"
 *   variant="danger"
 *   confirmText="Delete"
 *   warning="This action cannot be undone. All data will be permanently deleted."
 *   loading={isDeleting}
 * />
 * ```
 */

import { Modal } from './Modal'
import { Button } from '../UI/Button'
import { Alert } from '../UI/Alert'

export interface ConfirmDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean
  /** Callback when dialog should close */
  onClose: () => void
  /** Callback when user confirms */
  onConfirm: () => void
  /** Dialog title */
  title: string
  /** Confirmation message */
  message: string
  /** Text for confirm button */
  confirmText?: string
  /** Text for cancel button */
  cancelText?: string
  /** Visual variant affecting confirm button */
  variant?: 'default' | 'danger'
  /** Whether action is in progress */
  loading?: boolean
  /** Loading text for confirm button */
  loadingText?: string
  /** Optional warning message displayed below the main message */
  warning?: string
  /** Optional error message to display */
  error?: string | null
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  loading = false,
  loadingText = 'Processing...',
  warning,
  error,
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="small"
      preventClose={loading}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
            loadingText={loadingText}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <p style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
        {message}
      </p>

      {warning && (
        <Alert variant="warning" title="Warning" style={{ marginTop: 'var(--spacing-md)' }}>
          {warning}
        </Alert>
      )}

      {error && (
        <Alert variant="error" style={{ marginTop: 'var(--spacing-md)' }}>
          {error}
        </Alert>
      )}
    </Modal>
  )
}

export default ConfirmDialog
