/**
 * IconDrawer Component
 *
 * A slide-out drawer for icon settings across all token types (Character, Reminder, Meta).
 * Uses token type tabs in header and 3-column layout for content.
 *
 * Extends SettingsDrawer with token type tabs and optional link toggle.
 *
 * @module components/Shared/Drawer/IconDrawer
 */

import type { ReactNode } from 'react';
import { DrawerTokenTabs, type TabGroup } from '@/components/Shared/Controls';
import { SettingsDrawer } from './SettingsDrawer';

export type TokenType = 'character' | 'reminder' | 'meta';

export interface IconDrawerProps {
  /** Whether the drawer is open */
  isOpen: boolean;
  /** Called when the drawer should close (cancel) */
  onClose: () => void;
  /** Called when apply is clicked */
  onApply: () => void;
  /** Called when reset is clicked */
  onReset: () => void;
  /** Currently active token type */
  activeTokenType: TokenType;
  /** Called when token type tab is clicked */
  onTokenTypeChange: (tokenType: TokenType) => void;
  /** Drawer content - 3 columns for character/reminder/meta */
  children: ReactNode;
  /** Optional title override */
  title?: string;
  /** Whether Character/Meta settings are linked */
  isLinked?: boolean;
  /** Called when link toggle is clicked */
  onLinkToggle?: () => void;
}

export function IconDrawer({
  isOpen,
  onClose,
  onApply,
  onReset,
  activeTokenType,
  onTokenTypeChange,
  children,
  title = 'Icon Settings',
  isLinked = false,
  onLinkToggle,
}: IconDrawerProps) {
  // Build tab groups with optional link toggle
  const groups: TabGroup[] = [
    {
      tabs: [
        { id: 'character', label: 'Character' },
        { id: 'meta', label: 'Meta' },
      ],
      link: onLinkToggle
        ? {
            isLinked,
            onToggle: onLinkToggle,
            ariaLabel: 'Link Character and Meta icon settings',
          }
        : undefined,
    },
    {
      tabs: [{ id: 'reminder', label: 'Reminder' }],
    },
  ];

  const headerSlot = (
    <DrawerTokenTabs
      groups={groups}
      activeTab={activeTokenType}
      onTabChange={(id) => onTokenTypeChange(id as TokenType)}
    />
  );

  return (
    <SettingsDrawer
      isOpen={isOpen}
      onClose={onClose}
      onApply={onApply}
      onReset={onReset}
      title={title}
      titleIcon="🎯"
      headerSlot={headerSlot}
    >
      {children}
    </SettingsDrawer>
  );
}
