/**
 * DecorativesDrawer Component
 *
 * A slide-out drawer for decorative settings (Setup overlays and Accents)
 * that positions itself below the TokenPreviewRow to keep previews always visible.
 *
 * @module components/Shared/Drawer/DecorativesDrawer
 */

import { memo, type ReactNode } from 'react';
import { SettingsDrawer } from './SettingsDrawer';

export interface DecorativesDrawerProps {
  /** Whether the drawer is open */
  isOpen: boolean;
  /** Called when the drawer should close (cancel) */
  onClose: () => void;
  /** Called when apply is clicked */
  onApply: () => void;
  /** Called when reset is clicked */
  onReset: () => void;
  /** Drawer content */
  children: ReactNode;
  /** Optional title override */
  title?: string;
}

export const DecorativesDrawer = memo(function DecorativesDrawer({
  isOpen,
  onClose,
  onApply,
  onReset,
  children,
  title = 'Decorative Settings',
}: DecorativesDrawerProps) {
  return (
    <SettingsDrawer
      isOpen={isOpen}
      onClose={onClose}
      onApply={onApply}
      onReset={onReset}
      title={title}
      titleIcon="🎭"
    >
      {children}
    </SettingsDrawer>
  );
});

export default DecorativesDrawer;
