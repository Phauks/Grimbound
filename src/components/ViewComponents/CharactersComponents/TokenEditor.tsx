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

import { memo, useCallback, useEffect, useState } from 'react';
import { useDataSync } from '@/contexts/DataSyncContext';
import { useToast } from '@/contexts/ToastContext';
import { useTokenContext } from '@/contexts/TokenContext';
import styles from '@/styles/components/characterEditor/TokenEditor.module.css';
import type { Character, DecorativeOverrides } from '@/ts/types/index.js';
import { ensureUniqueId, generateStableUuid, getOtherCharacterIds } from '@/ts/utils/index.js';
import { CharacterDecorativesPanel } from './CharacterDecorativesPanel';
import {
  AlmanacTabContent,
  GameplayTabContent,
  type JinxPreviewData,
  JsonTabContent,
  type TokenEditorTab,
} from './TokenEditor/index';

interface TokenEditorProps {
  character: Character;
  onEditChange: (field: keyof Character, value: Character[keyof Character]) => void;
  onReplaceCharacter?: (character: Character) => void;
  onRefreshPreview?: () => void;
  onPreviewVariant?: (imageUrl: string | undefined) => void;
  isOfficial?: boolean;
  /** Callback to preview a jinx token */
  onPreviewJinx?: (data: JinxPreviewData | null) => void;
  /** Index of currently previewed jinx */
  previewedJinxIndex?: number | null;
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
  onPreviewJinx,
  previewedJinxIndex,
}: TokenEditorProps) {
  // Access metadata store from context
  const { getMetadata, setMetadata, generationOptions, characters } = useTokenContext();
  const { getCharacters, isInitialized } = useDataSync();
  const { addToast } = useToast();
  const charUuid = character.uuid || '';
  const metadata = getMetadata(charUuid);
  const decoratives = metadata.decoratives || {};
  const isIdLinked = metadata.idLinkedToName ?? true;

  // Load official characters for jinx editor
  const [officialCharacters, setOfficialCharacters] = useState<Character[]>([]);
  useEffect(() => {
    if (isInitialized) {
      getCharacters().then(setOfficialCharacters);
    }
  }, [isInitialized, getCharacters]);

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

  // Convert official character to custom with unique ID handling
  const handleConvertToCustom = useCallback(async () => {
    if (!onReplaceCharacter) {
      // Fallback to simple source change if replace not available
      onEditChange('source', 'custom');
      return;
    }

    // Get other character IDs to check for collisions
    const otherIds = getOtherCharacterIds(characters, character.uuid);

    // Ensure unique ID
    const { id: uniqueId, wasRenamed, originalId } = ensureUniqueId(character.id, otherIds);

    // Generate new UUID based on the (possibly new) ID
    const newUuid = await generateStableUuid(uniqueId, character.name);

    // Create the custom version with unique ID
    const customCharacter: Character = {
      ...character,
      id: uniqueId,
      uuid: newUuid,
      source: 'custom',
    };

    // Replace the character
    onReplaceCharacter(customCharacter);

    // Set metadata - break ID link since we're now custom
    setMetadata(newUuid, {
      ...metadata,
      idLinkedToName: false,
    });

    // Show toast notification
    if (wasRenamed) {
      addToast(
        `Converted to custom. ID renamed from '${originalId}' to '${uniqueId}' to avoid conflict.`,
        'info'
      );
    } else {
      addToast(`Converted '${character.name}' to custom character.`, 'success');
    }
  }, [character, characters, metadata, onEditChange, onReplaceCharacter, setMetadata, addToast]);

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

        {/* Tab Content - Banner rendered inside each tab for sticky scroll behavior */}
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
            scriptCharacters={characters}
            officialCharacters={officialCharacters}
            onPreviewJinx={onPreviewJinx}
            previewedJinxIndex={previewedJinxIndex}
            onConvertToCustom={handleConvertToCustom}
          />
        )}

        {activeTab === 'almanac' && (
          <AlmanacTabContent
            character={character}
            isOfficial={isOfficial}
            onEditChange={onEditChange}
            onConvertToCustom={handleConvertToCustom}
          />
        )}

        {activeTab === 'decoratives' && (
          <CharacterDecorativesPanel
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
            onConvertToCustom={handleConvertToCustom}
          />
        )}
      </div>
    </div>
  );
});

export default TokenEditor;
