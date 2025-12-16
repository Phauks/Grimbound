/**
 * Script Tab Navigation
 *
 * Sub-tab navigation within the Script view.
 * Currently supports:
 * - Night Order (active)
 * - Player Script (placeholder for future)
 */

import styles from '../../../styles/components/script/ScriptTabNavigation.module.css';

export type ScriptSubTab = 'night-order' | 'player-script';

interface ScriptTabNavigationProps {
  activeTab: ScriptSubTab;
  onTabChange: (tab: ScriptSubTab) => void;
}

interface TabConfig {
  id: ScriptSubTab;
  label: string;
  icon: string;
  disabled?: boolean;
  comingSoon?: boolean;
}

const TABS: TabConfig[] = [
  {
    id: 'night-order',
    label: 'Night Order',
    icon: '🌙',
  },
  {
    id: 'player-script',
    label: 'Player Script',
    icon: '📜',
    disabled: true,
    comingSoon: true,
  },
];

export function ScriptTabNavigation({ activeTab, onTabChange }: ScriptTabNavigationProps) {
  return (
    <nav className={styles.tabNavigation} aria-label="Script sub-navigation">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          aria-disabled={tab.disabled}
          className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''} ${tab.disabled ? styles.disabled : ''}`}
          onClick={() => !tab.disabled && onTabChange(tab.id)}
          disabled={tab.disabled}
        >
          <span className={styles.icon}>{tab.icon}</span>
          <span className={styles.label}>{tab.label}</span>
          {tab.comingSoon && <span className={styles.comingSoon}>Soon</span>}
        </button>
      ))}
    </nav>
  );
}
