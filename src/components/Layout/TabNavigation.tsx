import { useCallback } from 'react'
import { useTokenContext } from '../../contexts/TokenContext'
import { preRenderFirstCharacter } from '../../utils/customizePreRenderCache'
import { preRenderGalleryTokens } from '../TokenGrid/TokenCard'
import styles from '../../styles/components/layout/TabNavigation.module.css'

export type AppTab = 'editor' | 'gallery' | 'customize' | 'script' | 'download'
export type TabType = AppTab

interface TabNavigationProps {
  activeTab: AppTab
  onTabChange: (tab: AppTab) => void
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const { tokens, jsonInput, characters, generationOptions } = useTokenContext()
  const hasTokens = tokens.length > 0
  const hasScript = jsonInput.trim() !== ''

  // Pre-render tokens when hovering over tabs
  const handleTabHover = useCallback((tabId: AppTab) => {
    if (tabId === 'customize' && characters.length > 0) {
      // Pre-render the first character's token
      preRenderFirstCharacter(characters[0], generationOptions)
    } else if (tabId === 'gallery' && tokens.length > 0) {
      // Pre-render data URLs for gallery tokens (first 20)
      preRenderGalleryTokens(tokens, 20)
    }
  }, [characters, generationOptions, tokens])

  const tabs: { id: AppTab; label: string; disabled?: boolean }[] = [
    { id: 'editor', label: 'Editor' },
    { id: 'gallery', label: 'Gallery' },
    { id: 'customize', label: 'Customize' },
    { id: 'script', label: 'Script' },
    { id: 'download', label: 'Export' },
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
