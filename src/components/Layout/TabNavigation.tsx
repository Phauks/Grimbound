import { useCallback } from 'react';
import { useTokenContext } from '@/contexts/TokenContext';
import styles from '@/styles/components/layout/TabNavigation.module.css';
import { type PreRenderableTab, tabPreRenderService } from '@/ts/cache/index.js';

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
  const { tokens, jsonInput, characters, scriptMeta, generationOptions } = useTokenContext();
  const _hasTokens = tokens.length > 0;
  const _hasScript = jsonInput.trim() !== '';

  // Pre-render data when hovering over tabs (unified service)
  const handleTabHover = useCallback(
    (tabId: EditorTab) => {
      // Only pre-render for supported tabs with data
      const preRenderableTabs: PreRenderableTab[] = ['characters', 'tokens', 'script'];
      if (!preRenderableTabs.includes(tabId as PreRenderableTab)) return;
      if (characters.length === 0 && tokens.length === 0) return;

      tabPreRenderService.preRenderTab(tabId as PreRenderableTab, {
        characters,
        tokens,
        scriptMeta,
        generationOptions,
        lastSelectedCharacterUuid,
      });
    },
    [characters, scriptMeta, generationOptions, tokens, lastSelectedCharacterUuid]
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
