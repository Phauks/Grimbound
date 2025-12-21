/**
 * TokenEditor Component (Refactored)
 *
 * Main character editing interface with tabbed navigation.
 * This is the orchestration layer that composes specialized tab components.
 *
 * Tabs:
 * - Gameplay: Character ID, name, team, images, ability, reminders, night order
 * - Almanac: Flavor, overview, examples, how to run, tips
 * - Decoratives: Per-character visual overrides
 * - JSON: Raw JSON editing with metadata view
 *
 * @module components/CharactersComponents/TokenEditor
 */

import { memo, useCallback, useState } from 'react';
import { useTokenContext } from '@/contexts/TokenContext';
import type { Character, DecorativeOverrides } from '@/ts/types/index.js';
import { CharacterDecorativesPanel } from './CharacterDecorativesPanel';
import {
  type TokenEditorTab,
  GameplayTabContent,
  AlmanacTabContent,
  JsonTabContent,
} from './TokenEditor/index';
import styles from '@/styles/components/characterEditor/TokenEditor.module.css';

interface TokenEditorProps {
  character: Character;
  onEditChange: (field: keyof Character, value: Character[keyof Character]) => void;
  onReplaceCharacter?: (character: Character) => void;
  onRefreshPreview?: () => void;
  onPreviewVariant?: (imageUrl: string | undefined) => void;
  isOfficial?: boolean;
}

/**
 * TokenEditor - Main character editing interface
 *
 * Refactored to use composition with specialized tab components:
 * - GameplayTabContent: Core character data editing
 * - AlmanacTabContent: Flavor and guidance text
 * - CharacterDecorativesPanel: Visual customization
 * - JsonTabContent: Raw JSON editing
 */
export const TokenEditor = memo(function TokenEditor({
  character,
  onEditChange,
  onReplaceCharacter,
  onRefreshPreview,
  onPreviewVariant,
  isOfficial = false,
}: TokenEditorProps) {
  // Access metadata store from context
  const { getMetadata, setMetadata, generationOptions } = useTokenContext();
  const charUuid = character.uuid || '';
  const metadata = getMetadata(charUuid);
  const decoratives = metadata.decoratives || {};
  const isIdLinked = metadata.idLinkedToName ?? true;

  // Active tab state
  const [activeTab, setActiveTab] = useState<TokenEditorTab>('info');

  // Handle decoratives changes
  const handleDecorativesChange = useCallback(
    (updates: Partial<DecorativeOverrides>) => {
      if (charUuid) {
        setMetadata(charUuid, { decoratives: { ...decoratives, ...updates } });
      }
    },
    [charUuid, decoratives, setMetadata]
  );

  // Handle ID link toggle
  const handleIdLinkChange = useCallback(
    (linked: boolean) => {
      if (charUuid) {
        setMetadata(charUuid, { idLinkedToName: linked });
      }
    },
    [charUuid, setMetadata]
  );

  // Convert official character to custom
  const handleConvertToCustom = useCallback(() => {
    onEditChange('source', 'custom');
  }, [onEditChange]);

  return (
    <div className={styles.editor}>
      <div className={styles.tabsContainer}>
        {/* Tab Navigation */}
        <div className={styles.tabsNav}>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === 'info' ? styles.active : ''}`}
            onClick={() => setActiveTab('info')}
          >
            Gameplay
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === 'almanac' ? styles.active : ''}`}
            onClick={() => setActiveTab('almanac')}
          >
            Almanac
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === 'decoratives' ? styles.active : ''}`}
            onClick={() => setActiveTab('decoratives')}
          >
            Decoratives
          </button>
          <button
            type="button"
            className={`${styles.tabButton} ${activeTab === 'json' ? styles.active : ''}`}
            onClick={() => setActiveTab('json')}
          >
            JSON
          </button>
        </div>

        {/* Official Character Banner */}
        {isOfficial && (
          <div
            className={styles.officialBanner}
            title="This is an official character. Editing is disabled to preserve the original data."
          >
            <div className={styles.officialLeft}>
              <span className={styles.officialBadge}>Official</span>
              <a
                href={`https://wiki.bloodontheclocktower.com/${encodeURIComponent(character.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.wikiLink}
                title="View on Wiki"
              >
                <svg
                  className={styles.wikiIcon}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="16"
                  height="16"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                </svg>
              </a>
            </div>
            <div className={styles.officialActions}>
              <button
                type="button"
                className={styles.convertButton}
                onClick={handleConvertToCustom}
                title="Create a custom copy that can be edited"
              >
                Convert to Custom
              </button>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'info' && (
          <GameplayTabContent
            character={character}
            isOfficial={isOfficial}
            onEditChange={onEditChange}
            onReplaceCharacter={onReplaceCharacter}
            onRefreshPreview={onRefreshPreview}
            onPreviewVariant={onPreviewVariant}
            charUuid={charUuid}
            isIdLinked={isIdLinked}
            onIdLinkChange={handleIdLinkChange}
          />
        )}

        {activeTab === 'almanac' && (
          <AlmanacTabContent
            character={character}
            isOfficial={isOfficial}
            onEditChange={onEditChange}
          />
        )}

        {activeTab === 'decoratives' && (
          <CharacterDecorativesPanel
            character={character}
            decoratives={decoratives}
            generationOptions={generationOptions}
            onDecorativesChange={handleDecorativesChange}
          />
        )}

        {activeTab === 'json' && (
          <JsonTabContent
            character={character}
            isOfficial={isOfficial}
            onReplaceCharacter={onReplaceCharacter}
            charUuid={charUuid}
            metadata={{
              idLinkedToName: isIdLinked,
              decoratives,
            }}
          />
        )}
      </div>
    </div>
  );
});

export default TokenEditor;
