/**
 * Editor Page
 *
 * Container page for the token editor interface including all sub-tabs
 * (Editor, Gallery, Customize, Script, Export).
 */

import { useState, useCallback } from 'react'
import { TabNavigation } from '../Layout/TabNavigation'
import type { TabType } from '../Layout/TabNavigation'
import { ProjectManagerPage } from './ProjectManagerPage'
import { EditorView } from '../Views/EditorView'
import { GalleryView } from '../Views/GalleryView'
import { CustomizeView } from '../Views/CustomizeView'
import { ScriptView } from '../Views/ScriptView'
import { DownloadView } from '../Views/DownloadView'
import { TownSquareView } from '../Views/TownSquareView'
import { useProjects } from '../../hooks/useProjects'
import { useToast } from '../../contexts/ToastContext'
import type { Token } from '../../ts/types/index.js'
import styles from '../../styles/components/pages/Pages.module.css'

export function EditorPage() {
  const [activeTab, setActiveTab] = useState<TabType>('projects')
  const [selectedTokenForCustomize, setSelectedTokenForCustomize] = useState<Token | undefined>(undefined)
  const [createNewCharacter, setCreateNewCharacter] = useState(false)
  const { createProject, activateProject, currentProject } = useProjects()
  const { addToast } = useToast()

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
    setCreateNewCharacter(true)
    setActiveTab('customize')
  }, [])

  const handleNavigateToProjects = useCallback(() => {
    setActiveTab('projects')
  }, [])

  const handleCreateProject = useCallback(async () => {
    try {
      const timestamp = new Date().toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      })
      const newProject = await createProject(`New Project - ${timestamp}`)
      if (newProject) {
        await activateProject(newProject.id)
      }
      addToast('New project created and activated!', 'success')
      setActiveTab('projects')
    } catch (err) {
      console.error('Failed to create project:', err)
      addToast('Failed to create project', 'error')
    }
  }, [createProject, activateProject, addToast])

  const renderActiveView = () => {
    switch (activeTab) {
      case 'projects':
        return <ProjectManagerPage initialProjectId={currentProject?.id} />
      case 'editor':
        return (
          <EditorView 
            onNavigateToCustomize={handleNavigateToCustomize}
            onNavigateToProjects={handleNavigateToProjects}
            onCreateProject={handleCreateProject}
          />
        )
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
      case 'town-square':
        return <TownSquareView />
      default:
        return <ProjectManagerPage />
    }
  }

  return (
    <div className={styles.pageContainer}>
      <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />
      <div className={styles.pageContent}>
        {renderActiveView()}
      </div>
    </div>
  )
}
