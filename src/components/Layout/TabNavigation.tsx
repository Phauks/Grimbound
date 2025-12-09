import { useCallback } from 'react'
import { useTokenContext } from '../../contexts/TokenContext'
import { useProjects } from '../../hooks/useProjects'
import { preRenderFirstCharacter } from '../../utils/customizePreRenderCache'
import { preRenderGalleryTokens } from '../TokenGrid/TokenCard'
import styles from '../../styles/components/layout/TabNavigation.module.css'

export type EditorTab = 'projects' | 'editor' | 'gallery' | 'customize' | 'script' | 'download' | 'town-square'
export type TabType = EditorTab // Legacy alias for backwards compatibility

interface TabNavigationProps {
  activeTab: EditorTab
  onTabChange: (tab: EditorTab) => void
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const { tokens, jsonInput, characters, generationOptions } = useTokenContext()
  const hasTokens = tokens.length > 0
  const hasScript = jsonInput.trim() !== ''

  // Pre-render tokens when hovering over tabs
  const handleTabHover = useCallback((tabId: EditorTab) => {
    if (tabId === 'customize' && characters.length > 0) {
      // Pre-render the first character's token
      preRenderFirstCharacter(characters[0], generationOptions)
    } else if (tabId === 'gallery' && tokens.length > 0) {
      // Pre-render data URLs for gallery tokens (first 20)
      preRenderGalleryTokens(tokens, 20)
    }
  }, [characters, generationOptions, tokens])

  const tabs: { id: EditorTab; label: string; disabled?: boolean }[] = [
    { id: 'projects', label: 'Projects' },
    { id: 'editor', label: 'Editor' },
    { id: 'gallery', label: 'Gallery' },
    { id: 'customize', label: 'Customize' },
    { id: 'script', label: 'Script' },
    { id: 'download', label: 'Export' },
    { id: 'town-square', label: 'Town Square' },
  ]

  return (
    <nav className={styles.tabNavigation} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`${styles.tabButton} ${activeTab === tab.id ? styles.active : ''}`}
          onClick={() => !tab.disabled && onTabChange(tab.id)}
          onMouseEnter={() => handleTabHover(tab.id)}
          disabled={tab.disabled}
          aria-selected={activeTab === tab.id}
          role="tab"
        >
          <span className={styles.tabLabel}>{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
