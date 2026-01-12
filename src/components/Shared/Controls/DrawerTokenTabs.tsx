/**
 * DrawerTokenTabs Component
 *
 * A shared tab component for drawer headers that supports multiple tab groups
 * with optional link toggles between tabs.
 *
 * Used by BackgroundDrawer, IconDrawer, and FontDrawer for consistent
 * token type selection UI.
 *
 * @module components/Shared/Controls/DrawerTokenTabs
 */

import { Fragment } from 'react';
import styles from '@/styles/components/shared/DrawerTokenTabs.module.css';
import { SettingsLinkToggle } from './SettingsLinkToggle';

export interface TabConfig {
  id: string;
  label: string;
}

export interface TabGroup {
  tabs: TabConfig[];
  /** If provided, shows link toggle between tabs in this group */
  link?: {
    isLinked: boolean;
    onToggle: () => void;
    ariaLabel: string;
  };
}

export interface DrawerTokenTabsProps {
  /** Tab groups - each group can have a link toggle between its tabs */
  groups: TabGroup[];
  /** Currently active tab id */
  activeTab: string;
  /** Called when a tab is clicked */
  onTabChange: (tabId: string) => void;
}

export function DrawerTokenTabs({ groups, activeTab, onTabChange }: DrawerTokenTabsProps) {
  return (
    <div className={styles.tokenTypeTabs}>
      {groups.map((group) => (
        <div key={group.tabs[0]?.id ?? 'empty'} className={styles.tabGroup}>
          {group.tabs.map((tab, tabIndex) => (
            <Fragment key={tab.id}>
              {/* Show link toggle BETWEEN tabs (after first tab) */}
              {tabIndex === 1 && group.link && (
                <SettingsLinkToggle
                  isLinked={group.link.isLinked}
                  onToggle={group.link.onToggle}
                  ariaLabel={group.link.ariaLabel}
                  size="small"
                />
              )}
              <button
                type="button"
                className={`${styles.tokenTypeTab} ${activeTab === tab.id ? styles.tokenTypeTabActive : ''}`}
                onClick={() => onTabChange(tab.id)}
              >
                {tab.label}
              </button>
            </Fragment>
          ))}
        </div>
      ))}
    </div>
  );
}
