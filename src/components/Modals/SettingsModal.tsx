import { useEffect, useRef } from 'react'
import { useToast } from '../../contexts/ToastContext'
import { useTokenContext } from '../../contexts/TokenContext'
import type { DPIOption } from '../../ts/types/index'
import styles from '../../styles/components/layout/Modal.module.css'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const { addToast } = useToast()
  const { generationOptions, updateGenerationOptions } = useTokenContext()

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

  const handleWipeData = () => {
    if (confirm('Are you sure you want to clear all local data? This cannot be undone.')) {
      localStorage.clear()
      addToast('All local data has been cleared', 'success')
      onClose()
      // Reload page to reset state
      setTimeout(() => window.location.reload(), 500)
    }
  }


  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="settingsModalTitle">
      <div className={styles.backdrop} onClick={handleBackdropClick} />
      <div className={styles.container} ref={contentRef}>
        <div className={styles.header}>
          <h2 id="settingsModalTitle" className={styles.title}>Global Settings</h2>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close settings"
          >
            ×
          </button>
        </div>
        <div className={styles.body}>
          <div className="option-group">
            <label className="option-label" htmlFor="dpiSetting">
              <span>Image Quality (DPI)</span>
            </label>
            <div className="select-with-tooltip">
              <select
                id="dpiSetting"
                className="select-input"
                value={generationOptions.dpi}
                onChange={(e) => updateGenerationOptions({ dpi: parseInt(e.target.value) as DPIOption })}
              >
                <option value="300">300 DPI (Standard)</option>
                <option value="600">600 DPI (High Quality)</option>
              </select>
              <span className="tooltip-text">Higher DPI creates larger, more detailed token images</span>
            </div>
          </div>

          <div className="option-group disabled-tbi">
            <label className="option-label" htmlFor="colorSchema">
              <span>Color Schema</span>
              <span className="badge-tbi">TBI</span>
            </label>
            <select id="colorSchema" className="select-input" disabled>
              <option value="dark">Dark (Default)</option>
              <option value="light">Light</option>
              <option value="high-contrast">High Contrast</option>
            </select>
          </div>

          <div
            className="settings-data-section"
            style={{
              marginTop: 'var(--spacing-lg)',
              paddingTop: 'var(--spacing-lg)',
              borderTop: '1px solid var(--border-color)',
            }}
          >
            <h3 style={{
              fontSize: '1rem',
              color: 'var(--color-accent)',
              marginBottom: 'var(--spacing-md)',
              fontWeight: 600,
            }}>Data Management</h3>
            <button
              type="button"
              onClick={handleWipeData}
              className="btn-danger"
              title="Clear all saved settings and data"
            >
              🗑️ Delete All Local Data
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
