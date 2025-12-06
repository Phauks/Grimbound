import { useEffect } from 'react'
import styles from '../../styles/components/layout/Modal.module.css'

interface AnnouncementsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AnnouncementsModal({ isOpen, onClose }: AnnouncementsModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="announcementsModalTitle">
      <div className={styles.backdrop} onClick={handleBackdropClick} />
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 id="announcementsModalTitle" className={styles.title}>Announcements</h2>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close announcements"
          >
            ×
          </button>
        </div>
        <div className={styles.body}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)', lineHeight: '1.6' }}>
            No announcements at this time. Check back later for updates!
          </p>
        </div>
      </div>
    </div>
  )
}
