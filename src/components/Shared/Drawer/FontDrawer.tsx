/**
 * FontDrawer Component
 *
 * A slide-out drawer for comprehensive font settings with search,
 * filtering, and style controls.
 *
 * Extends SettingsDrawer with 5 token type tabs in 3 groups
 * (Character/Meta names, Character/Meta text, Reminder) and link toggles.
 *
 * @module components/Shared/Drawer/FontDrawer
 */

import { memo, type ReactNode, useMemo } from 'react';
import { DrawerTokenTabs, type TabGroup } from '@/components/Shared/Controls';
import { SettingsDrawer } from './SettingsDrawer';

export type TokenType = 'character' | 'meta' | 'characterText' | 'metaText' | 'reminder';

export interface FontDrawerProps {
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
  /** Whether Character/Meta Name settings are linked */
  isNameLinked?: boolean;
  /** Called when Character/Meta Name link toggle is clicked */
  onNameLinkToggle?: () => void;
  /** Whether Character Text/Meta Text settings are linked */
  isTextLinked?: boolean;
  /** Called when Character Text/Meta Text link toggle is clicked */
  onTextLinkToggle?: () => void;
}

export const FontDrawer = memo(function FontDrawer({
  isOpen,
  onClose,
  onApply,
  onReset,
  activeTokenType,
  onTokenTypeChange,
  children,
  title = 'Text Settings',
  isNameLinked = false,
  onNameLinkToggle,
  isTextLinked = false,
  onTextLinkToggle,
}: FontDrawerProps) {
  // Build tab groups - 3 groups with optional link toggles
  const groups = useMemo((): TabGroup[] => {
    return [
      // Group 1: Character Name ↔ Meta Name
      {
        tabs: [
          { id: 'character', label: 'Character Name' },
          { id: 'meta', label: 'Meta Name' },
        ],
        link: onNameLinkToggle
          ? {
              isLinked: isNameLinked,
              onToggle: onNameLinkToggle,
              ariaLabel: 'Link Character Name and Meta Name text settings',
            }
          : undefined,
      },
      // Group 2: Character Text ↔ Meta Text
      {
        tabs: [
          { id: 'characterText', label: 'Character Text' },
          { id: 'metaText', label: 'Meta Text' },
        ],
        link: onTextLinkToggle
          ? {
              isLinked: isTextLinked,
              onToggle: onTextLinkToggle,
              ariaLabel: 'Link Character Text and Meta Text text settings',
            }
          : undefined,
      },
      // Group 3: Reminder
      {
        tabs: [{ id: 'reminder', label: 'Reminder' }],
      },
    ];
  }, [isNameLinked, onNameLinkToggle, isTextLinked, onTextLinkToggle]);

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
      titleIcon="🔤"
      headerSlot={headerSlot}
      initialFocusSelector="[data-font-search]"
    >
      {children}
    </SettingsDrawer>
  );
});

export default FontDrawer;
