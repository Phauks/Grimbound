/**
 * Script View
 *
 * Main view for the Script tab.
 * Contains sub-tabs for different script-related features:
 * - Night Order: View and customize night order sheets
 * - Player Script: (Coming soon) Player-facing script view
 *
 * Note: NightOrderProvider is now at the app root level (App.tsx)
 * and auto-initializes from TokenContext.
 */

import { useState } from 'react';
import { NightOrderView } from '@/components/ViewComponents/ScriptComponents/NightOrderView';
import type { ScriptSubTab } from '@/components/ViewComponents/ScriptComponents/ScriptTabNavigation';

interface ScriptViewProps {
  /** Callback when "Edit Character" is selected from night order context menu */
  onEditCharacter?: (characterId: string) => void;
}

export function ScriptView({ onEditCharacter }: ScriptViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<ScriptSubTab>('night-order');

  if (activeSubTab === 'night-order') {
    return (
      <NightOrderView
        activeTab={activeSubTab}
        onTabChange={setActiveSubTab}
        onEditCharacter={onEditCharacter}
      />
    );
  }

  // Player script placeholder - not yet implemented
  return null;
}
