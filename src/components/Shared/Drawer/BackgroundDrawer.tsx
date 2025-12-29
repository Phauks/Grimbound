/**
 * BackgroundDrawer Component
 *
 * A slide-out drawer for background settings that positions itself
 * below the TokenPreviewRow to keep previews always visible.
 *
 * Extends SettingsDrawer with token type tabs (Character/Meta/Reminder)
 * and optional link toggle between Character and Meta.
 *
 * @module components/Shared/Drawer/BackgroundDrawer
 */

import { memo, type ReactNode, useMemo } from 'react';
import { DrawerTokenTabs, type TabGroup } from '@/components/Shared/Controls';
import { SettingsDrawer } from './SettingsDrawer';

export type TokenType = 'character' | 'reminder' | 'meta';

export interface BackgroundDrawerProps {
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
  /** Drawer content */
  children: ReactNode;
  /** Optional title override */
  title?: string;
  /** Whether Character/Meta settings are linked */
  isLinked?: boolean;
  /** Called when link toggle is clicked */
  onLinkToggle?: () => void;
}

export const BackgroundDrawer = memo(function BackgroundDrawer({
  isOpen,
  onClose,
  onApply,
  onReset,
  activeTokenType,
  onTokenTypeChange,
  children,
  title = 'Background Settings',
  isLinked = false,
  onLinkToggle,
}: BackgroundDrawerProps) {
  // Build tab groups with optional link toggle
  const groups = useMemo(
    (): TabGroup[] => [
      {
        tabs: [
          { id: 'character', label: 'Character' },
          { id: 'meta', label: 'Meta' },
        ],
        link: onLinkToggle
          ? {
              isLinked,
              onToggle: onLinkToggle,
              ariaLabel: 'Link Character and Meta background settings',
            }
          : undefined,
      },
      {
        tabs: [{ id: 'reminder', label: 'Reminder' }],
      },
    ],
    [isLinked, onLinkToggle]
  );

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
      titleIcon="🎨"
      headerSlot={headerSlot}
    >
      {children}
    </SettingsDrawer>
  );
});

export default BackgroundDrawer;
