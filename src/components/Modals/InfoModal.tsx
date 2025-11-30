import { useEffect } from 'react'
import styles from '../../styles/components/layout/Modal.module.css'

interface InfoModalProps {
  isOpen: boolean
  onClose: () => void
}

export function InfoModal({ isOpen, onClose }: InfoModalProps) {
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
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="infoModalTitle">
      <div className={styles.backdrop} onClick={handleBackdropClick} />
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 id="infoModalTitle" className={styles.title}>About this Tool</h2>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close info"
          >
            ×
          </button>
        </div>
        <div className={styles.body}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)', lineHeight: '1.6' }}>
            Blood on the Clocktower Token Generator is a tool for creating custom tokens for the Blood on the Clocktower game.
          </p>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-lg)', lineHeight: '1.6' }}>
            Support the creator and keep this project alive:
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--spacing-lg)' }}>
            <a href="https://ko-fi.com/I2I61EZLCT" target="_blank" rel="noopener noreferrer">
              <img
                height="36"
                style={{ border: '0px', height: '36px' }}
                src="https://storage.ko-fi.com/cdn/kofi3.png?v=6"
                alt="Buy Me a Coffee at ko-fi.com"
              />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
