import { useEffect, useRef, useState } from 'react'
import { useToast } from '../../contexts/ToastContext'
import { useTokenContext } from '../../contexts/TokenContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useDataSync } from '../../contexts/DataSyncContext'
import { getThemeIds, UI_THEMES } from '../../ts/themes'
import { storageManager } from '../../ts/sync/index.js'
import type { DPIOption } from '../../ts/types/index'
import styles from '../../styles/components/layout/Modal.module.css'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onOpenSyncDetails?: () => void
}

export function SettingsModal({ isOpen, onClose, onOpenSyncDetails }: SettingsModalProps) {
  const contentRef = useRef<HTMLDivElement>(null)
  const { addToast } = useToast()
  const { generationOptions, updateGenerationOptions } = useTokenContext()
  const { currentThemeId, setTheme } = useTheme()
  const { status: syncStatus, isInitialized: isSyncInitialized } = useDataSync()
  const [autoSync, setAutoSync] = useState(true)

  // Load auto-sync setting from storage
  useEffect(() => {
    if (isOpen && isSyncInitialized) {
      storageManager.getSetting('autoSync').then((value) => {
        if (value !== null) {
          setAutoSync(value as boolean)
        }
      })
    }
  }, [isOpen, isSyncInitialized])

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

  const handleAutoSyncChange = async (enabled: boolean) => {
    try {
      await storageManager.setSetting('autoSync', enabled)
      setAutoSync(enabled)
      addToast(`Auto-sync ${enabled ? 'enabled' : 'disabled'}`, 'success')
    } catch (error) {
      console.error('Failed to update auto-sync setting:', error)
      addToast('Failed to update setting', 'error')
    }
  }

  const handleOpenSyncDetails = () => {
    if (onOpenSyncDetails) {
      onClose() // Close settings modal first
      setTimeout(() => onOpenSyncDetails(), 100) // Small delay for smooth transition
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
      <div className={`${styles.container} ${styles.containerLarge}`} ref={contentRef}>
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
          <div className={styles.settingsColumns}>
            {/* Left Column - General Settings */}
            <div className={styles.settingsColumnLeft}>
              <div className={styles.optionGroup}>
                <label className={styles.optionLabel} htmlFor="dpiSetting">
                  <span>Image Quality (DPI)</span>
                </label>
                <div className={styles.selectWithTooltip}>
                  <select
                    id="dpiSetting"
                    className={styles.selectInput}
                    value={generationOptions.dpi}
                    onChange={(e) => updateGenerationOptions({ dpi: parseInt(e.target.value) as DPIOption })}
                  >
                    <option value="300">300 DPI (Standard)</option>
                    <option value="600">600 DPI (High Quality)</option>
                  </select>
                  <span className={styles.tooltipText}>Higher DPI creates larger, more detailed token images</span>
                </div>
              </div>

              <div className={styles.optionGroup}>
                <label className={styles.optionLabel} htmlFor="colorSchema">
                  <span>Color Theme</span>
                </label>
                <div className={styles.selectWithTooltip}>
                  <select
                    id="colorSchema"
                    className={styles.selectInput}
                    value={currentThemeId}
                    onChange={(e) => setTheme(e.target.value)}
                  >
                    {getThemeIds().map(themeId => {
                      const theme = UI_THEMES[themeId]
                      return (
                        <option key={themeId} value={themeId}>
                          {theme.icon} {theme.name}
                        </option>
                      )
                    })}
                  </select>
                  <span className={styles.tooltipText}>Choose a color theme for the application interface</span>
                </div>
              </div>
            </div>

            {/* Right Column - Data Sync & Management */}
            <div className={styles.settingsColumnRight}>
              {/* Data Synchronization Section */}
              <div className={styles.settingsDataSectionInline}>
                <h3>Data Synchronization</h3>
                <div className={styles.syncSettingsInfo}>
                  <p className={styles.syncStatus}>
                    Status: <strong>{syncStatus.state === 'success' ? '✓ Synced' : syncStatus.state}</strong>
                    {syncStatus.currentVersion && <span> • Version {syncStatus.currentVersion}</span>}
                  </p>
                  <p className={styles.syncSource}>
                    Source: {syncStatus.dataSource === 'github' ? 'GitHub Releases' :
                             syncStatus.dataSource === 'cache' ? 'Local Cache' :
                             syncStatus.dataSource === 'offline' ? 'Offline' : 'Unknown'}
                  </p>
                </div>

                <div className={styles.optionGroup}>
                  <label className={styles.optionLabel}>
                    <input
                      type="checkbox"
                      checked={autoSync}
                      onChange={(e) => handleAutoSyncChange(e.target.checked)}
                      disabled={!isSyncInitialized}
                    />
                    <span>Automatically check for updates</span>
                  </label>
                  <span className={styles.tooltipText}>
                    When enabled, the app will periodically check for new character data from GitHub
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleOpenSyncDetails}
                  className={styles.btnSecondary}
                  title="View detailed sync information"
                >
                  ⚙️ View Sync Details
                </button>
              </div>

              {/* Data Management Section */}
              <div className={styles.settingsDataSectionInline}>
                <h3>Data Management</h3>
                <button
                  type="button"
                  onClick={handleWipeData}
                  className={styles.btnDanger}
                  title="Clear all saved settings and data"
                >
                  🗑️ Delete All Local Data
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
