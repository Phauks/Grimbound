import { useCallback } from 'react';
import { useTokenContext } from '../../contexts/TokenContext';
import styles from '../../styles/components/layout/TabNavigation.module.css';
import { preRenderFirstCharacter } from '../../ts/cache/index.js';
import { preRenderGalleryTokens } from '../ViewComponents/TokensComponents/TokenGrid/TokenCard';

export type EditorTab =
  | 'projects'
  | 'json'
  | 'tokens'
  | 'characters'
  | 'script'
  | 'studio'
  | 'export'
  | 'town-square';
export type TabType = EditorTab; // Legacy alias for backwards compatibility

interface TabNavigationProps {
  activeTab: EditorTab;
  onTabChange: (tab: EditorTab) => void;
  lastSelectedCharacterUuid?: string;
}

export function TabNavigation({
  activeTab,
  onTabChange,
  lastSelectedCharacterUuid,
}: TabNavigationProps) {
  const { tokens, jsonInput, characters, generationOptions } = useTokenContext();
  const _hasTokens = tokens.length > 0;
  const _hasScript = jsonInput.trim() !== '';

  // Pre-render tokens when hovering over tabs
  const handleTabHover = useCallback(
    (tabId: EditorTab) => {
      if (tabId === 'characters' && characters.length > 0) {
        // Pre-render the last selected character (or first if none selected)
        let characterToPreRender = characters[0]; // Default fallback

        if (lastSelectedCharacterUuid) {
          const lastSelected = characters.find((c) => c.uuid === lastSelectedCharacterUuid);
          if (lastSelected) {
            characterToPreRender = lastSelected;
          }
        }

        preRenderFirstCharacter(characterToPreRender, generationOptions);
      } else if (tabId === 'tokens' && tokens.length > 0) {
        // Pre-render data URLs for gallery tokens (first 20)
        preRenderGalleryTokens(tokens, 20);
      }
    },
    [characters, generationOptions, tokens, lastSelectedCharacterUuid]
  );

  const tabs: { id: EditorTab; label: string; disabled?: boolean }[] = [
    { id: 'projects', label: 'Projects' },
    { id: 'json', label: 'JSON' },
    { id: 'tokens', label: 'Tokens' },
    { id: 'characters', label: 'Characters' },
    { id: 'script', label: 'Script' },
    { id: 'studio', label: 'Studio' },
    { id: 'export', label: 'Export' },
    { id: 'town-square', label: 'Town Square' },
  ];

  return (
    <nav className={styles.tabNavigation}>
      {tabs.map((tab) => (
        <button
          type="button"
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
  );
}
