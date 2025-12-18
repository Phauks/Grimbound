/**
 * Script View
 *
 * Main view for the Script tab.
 * Contains sub-tabs for different script-related features:
 * - Night Order: View and customize night order sheets
 * - Player Script: (Coming soon) Player-facing script view
 */

import { useMemo, useState } from 'react';
import { NightOrderProvider } from '@/contexts/NightOrderContext';
import { useTokenContext } from '@/contexts/TokenContext';
import styles from '@/styles/components/views/Views.module.css';
import { NightOrderView } from '@/components/ViewComponents/ScriptComponents/NightOrderView';
import type { ScriptSubTab } from '@/components/ViewComponents/ScriptComponents/ScriptTabNavigation';

interface ScriptViewProps {
  /** Callback when "Edit Character" is selected from night order context menu */
  onEditCharacter?: (characterId: string) => void;
}

export function ScriptView({ onEditCharacter }: ScriptViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<ScriptSubTab>('night-order');
  const { characters, scriptMeta } = useTokenContext();

  // Build script data array for initializing NightOrderProvider from cache
  const initialScriptData = useMemo(
    () => (scriptMeta ? [scriptMeta, ...characters] : characters),
    [characters, scriptMeta]
  );

  return (
    <div className={styles.scriptView}>
      <div className={styles.scriptContent}>
        {activeSubTab === 'night-order' && (
          <NightOrderProvider initialScriptData={initialScriptData}>
            <NightOrderView
              activeTab={activeSubTab}
              onTabChange={setActiveSubTab}
              onEditCharacter={onEditCharacter}
            />
          </NightOrderProvider>
        )}

        {activeSubTab === 'player-script' && (
          <div className={styles.scriptViewPlaceholder}>
            <div className={styles.placeholderIcon}>📜</div>
            <h2>Player Script</h2>
            <p>Coming Soon</p>
            <p className={styles.placeholderDescription}>
              This feature will generate a player-facing script view showing characters and their
              abilities in a printable format.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
