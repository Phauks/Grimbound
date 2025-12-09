import { useState, useCallback } from 'react'
import { TokenProvider } from './contexts/TokenContext'
import { ToastProvider } from './contexts/ToastContext'
import { ProjectProvider, useProjectContext } from './contexts/ProjectContext'
import { AppHeader } from './components/Layout/AppHeader'
import { useProjectAutoSave, useUnsavedChangesWarning } from './hooks/useProjectAutoSave'
import { AppFooter } from './components/Layout/AppFooter'
import { SettingsModal } from './components/Modals/SettingsModal'
import { InfoModal } from './components/Modals/InfoModal'
import { AnnouncementsModal } from './components/Modals/AnnouncementsModal'
import { SyncDetailsModal } from './components/Modals/SyncDetailsModal'
import { ToastContainer } from './components/Shared/Toast'
import { EditorPage } from './components/Pages'
import layoutStyles from './styles/components/layout/AppLayout.module.css'

function AppContent() {
  const { currentProject } = useProjectContext()

  // Enable auto-save and unsaved changes warning
  useProjectAutoSave()
  useUnsavedChangesWarning()

  // Modal states
  const [showSettings, setShowSettings] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [showAnnouncements, setShowAnnouncements] = useState(false)
  const [showSyncDetails, setShowSyncDetails] = useState(false)

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
        currentProjectName={currentProject?.name}
      />
      <main className={layoutStyles.mainContent}>
        <EditorPage />
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
      <SyncDetailsModal isOpen={showSyncDetails} onClose={() => setShowSyncDetails(false)} />

      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <ProjectProvider>
        <TokenProvider>
          <AppContent />
        </TokenProvider>
      </ProjectProvider>
    </ToastProvider>
  )
}
