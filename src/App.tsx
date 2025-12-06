import { useState, useCallback } from 'react'
import { TokenProvider } from './contexts/TokenContext'
import { ToastProvider } from './contexts/ToastContext'
import { AppHeader } from './components/Layout/AppHeader'
import { AppFooter } from './components/Layout/AppFooter'
import { TabNavigation, type TabType } from './components/Layout/TabNavigation'
import { SettingsModal } from './components/Modals/SettingsModal'
import { InfoModal } from './components/Modals/InfoModal'
import { AnnouncementsModal } from './components/Modals/AnnouncementsModal'
import { SyncDetailsModal } from './components/Modals/SyncDetailsModal'
import { ToastContainer } from './components/Shared/Toast'
import { EditorView } from './components/Views/EditorView'
import { GalleryView } from './components/Views/GalleryView'
import { CustomizeView } from './components/Views/CustomizeView'
import { ScriptView } from './components/Views/ScriptView'
import { DownloadView } from './components/Views/DownloadView'
import type { Token } from './ts/types/index.js'
import layoutStyles from './styles/components/layout/AppLayout.module.css'

function AppContent() {
  const [showSettings, setShowSettings] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [showAnnouncements, setShowAnnouncements] = useState(false)
  const [showSyncDetails, setShowSyncDetails] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('editor')
  const [selectedTokenForCustomize, setSelectedTokenForCustomize] = useState<Token | undefined>(undefined)
  const [createNewCharacter, setCreateNewCharacter] = useState(false)

  const handleTokenClick = useCallback((token: Token) => {
    setSelectedTokenForCustomize(token)
    setCreateNewCharacter(false)
    setActiveTab('customize')
  }, [])

  const handleTabChange = useCallback((tab: TabType) => {
    // Reset createNewCharacter when manually changing tabs
    if (tab !== 'customize') {
      setCreateNewCharacter(false)
    }
    setActiveTab(tab)
  }, [])

  const handleNavigateToCustomize = useCallback(() => {
    setSelectedTokenForCustomize(undefined)
    setCreateNewCharacter(true) // Signal to create new character
    setActiveTab('customize')
  }, [])

  const renderActiveView = () => {
    switch (activeTab) {
      case 'editor':
        return <EditorView onNavigateToCustomize={handleNavigateToCustomize} />
      case 'gallery':
        return <GalleryView onTokenClick={handleTokenClick} />
      case 'customize':
        return (
          <CustomizeView 
            initialToken={selectedTokenForCustomize}
            onGoToGallery={() => setActiveTab('gallery')}
            createNewCharacter={createNewCharacter}
          />
        )
      case 'script':
        return <ScriptView />
      case 'download':
        return <DownloadView />
      default:
        return <EditorView onNavigateToCustomize={handleNavigateToCustomize} />
    }
  }

  return (
    <div className={layoutStyles.appContainer}>
      <AppHeader
        onSettingsClick={() => setShowSettings(true)}
        onInfoClick={() => setShowInfo(true)}
        onAnnouncementsClick={() => setShowAnnouncements(true)}
        onSyncDetailsClick={() => setShowSyncDetails(true)}
      />
      <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />
      <main className={`${layoutStyles.mainContent} ${layoutStyles.tabViewContent}`}>
        {renderActiveView()}
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
      <TokenProvider>
        <AppContent />
      </TokenProvider>
    </ToastProvider>
  )
}
