import { useState, useCallback, useEffect } from 'react'
import { TokenProvider, useTokenContext } from './contexts/TokenContext'
import { StudioProvider } from './contexts/StudioContext'
import { ToastProvider } from './contexts/ToastContext'
import { ProjectProvider, useProjectContext } from './contexts/ProjectContext'
import { DownloadsProvider } from './contexts/DownloadsContext'
import { AppHeader } from './components/Layout/AppHeader'
import { useProjectAutoSave, useUnsavedChangesWarning } from './hooks/useProjectAutoSave'
import { useStorageQuota } from './hooks/useStorageQuota'
import { AppFooter } from './components/Layout/AppFooter'
import { SettingsModal } from './components/Modals/SettingsModal'
import { InfoModal } from './components/Modals/InfoModal'
import { AnnouncementsModal } from './components/Modals/AnnouncementsModal'
import { SyncDetailsModal } from './components/Modals/SyncDetailsModal'
import { AssetManagerModal } from './components/Modals/AssetManagerModal'
import { TabConflictModal } from './components/Modals/TabConflictModal'
import { StorageWarning } from './components/Shared/Feedback/StorageWarning'
import { ToastContainer } from './components/Shared/UI/Toast'
import { DownloadsDrawer } from './components/Shared/Downloads'
import { AppShell } from './components/Layout/AppShell'
import { warmingPolicyManager } from './ts/cache/index.js'
import { logger } from './ts/utils/logger.js'
import layoutStyles from './styles/components/layout/AppLayout.module.css'

function AppContent() {
  const { currentProject, setSaveNow } = useProjectContext()
  const { generationOptions } = useTokenContext()

  // Enable auto-save and unsaved changes warning
  const { saveNow, conflictModalProps } = useProjectAutoSave() // Auto-save always enabled
  useUnsavedChangesWarning()

  // Expose saveNow to context for AutoSaveIndicator
  useEffect(() => {
    if (setSaveNow && saveNow) {
      setSaveNow(saveNow)
    }
  }, [saveNow, setSaveNow])

  // Monitor storage quota
  const { warning, cleanup } = useStorageQuota({
    checkInterval: 5 * 60 * 1000, // Check every 5 minutes
    warningThreshold: 80,          // Warn at 80%
    criticalThreshold: 90          // Critical at 90%
  })

  // Warm caches on app start (runs once)
  useEffect(() => {
    const warmAppStartCaches = async () => {
      try {
        logger.debug('App', 'Warming caches on app start');

        await warmingPolicyManager.warm(
          { route: '/' },
          (policy, loaded, total, message) => {
            logger.debug('App', `Warming progress - ${policy}:`, {
              loaded,
              total,
              message
            });
          }
        );

        logger.debug('App', 'App start cache warming complete');
      } catch (error) {
        logger.warn('App', 'App start cache warming failed:', error);
      }
    };

    // Run warming during idle time to avoid blocking initial render
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(warmAppStartCaches, { timeout: 3000 });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(warmAppStartCaches, 500);
    }
  }, []); // Empty deps = run only once on mount

  // Modal states
  const [showSettings, setShowSettings] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [showAnnouncements, setShowAnnouncements] = useState(false)
  const [showSyncDetails, setShowSyncDetails] = useState(false)
  const [showAssetManager, setShowAssetManager] = useState(false)

  // Disable default right-click menu app-wide, except for text inputs
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    const tagName = target.tagName.toLowerCase()
    // Allow default context menu for text inputs (copy/paste functionality)
    if (tagName === 'textarea' || tagName === 'input') {
      return
    }
    e.preventDefault()
  }, [])

  return (
    <div className={layoutStyles.appContainer} onContextMenu={handleContextMenu}>
      <AppHeader
        onSettingsClick={() => setShowSettings(true)}
        onInfoClick={() => setShowInfo(true)}
        onAnnouncementsClick={() => setShowAnnouncements(true)}
        onSyncDetailsClick={() => setShowSyncDetails(true)}
        onAssetManagerClick={() => setShowAssetManager(true)}
        currentProjectName={currentProject?.name}
      />

      {/* Storage Warning Banner */}
      {warning.level !== 'none' && (
        <div style={{ padding: '0 1rem' }}>
          <StorageWarning warning={warning} onCleanup={cleanup} />
        </div>
      )}

      <main className={layoutStyles.mainContent}>
        <AppShell />
      </main>
      <AppFooter />

      {/* Modals */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onOpenSyncDetails={() => setShowSyncDetails(true)}
      />
      <InfoModal isOpen={showInfo} onClose={() => setShowInfo(false)} />
      <AnnouncementsModal isOpen={showAnnouncements} onClose={() => setShowAnnouncements(false)} />

      {/* Tab Conflict Modal (from auto-save hook) */}
      <TabConflictModal {...conflictModalProps} />
      <SyncDetailsModal isOpen={showSyncDetails} onClose={() => setShowSyncDetails(false)} />
      <AssetManagerModal
        isOpen={showAssetManager}
        onClose={() => setShowAssetManager(false)}
        projectId={currentProject?.id}
        generationOptions={generationOptions}
      />

      {/* Toast Notifications */}
      <ToastContainer />

      {/* Downloads Drawer - slides in from right edge */}
      <DownloadsDrawer />
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <ProjectProvider>
        <TokenProvider>
          <StudioProvider>
            <DownloadsProvider>
              <AppContent />
            </DownloadsProvider>
          </StudioProvider>
        </TokenProvider>
      </ProjectProvider>
    </ToastProvider>
  )
}
