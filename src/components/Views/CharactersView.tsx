/**
 * CharactersView Component
 *
 * Main view for character editing, preview, and management.
 * Uses extracted hooks for better separation of concerns.
 *
 * @module components/Views/CharactersView
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ViewLayout } from '@/components/Layout/ViewLayout';
import { ErrorBoundary, ViewErrorFallback } from '@/components/Shared';
import { OfficialCharacterDrawer } from '@/components/Shared/Drawer';
import { Button } from '@/components/Shared/UI/Button';
import { CharacterNavigation } from '@/components/ViewComponents/CharactersComponents/CharacterNavigation';
import { MetaEditor } from '@/components/ViewComponents/CharactersComponents/MetaEditor';
import { TokenEditor } from '@/components/ViewComponents/CharactersComponents/TokenEditor';
import { TokenPreview } from '@/components/ViewComponents/CharactersComponents/TokenPreview';
import { useDownloadsContext } from '@/contexts/DownloadsContext';
import { useToast } from '@/contexts/ToastContext';
import { useTokenContext } from '@/contexts/TokenContext';
import {
  useCharacterDownloads,
  useCharacterEditor,
  useCharacterOperations,
  useTokenPreviewCache,
} from '@/hooks';
import previewStyles from '@/styles/components/characterEditor/TokenPreview.module.css';
import layoutStyles from '@/styles/components/layout/ViewLayout.module.css';
import styles from '@/styles/components/views/Views.module.css';
import type { Token } from '@/ts/types/index.js';
import { updateMetaInJson } from '@/ts/ui/detailViewUtils.js';
import { logger } from '@/ts/utils/logger.js';

interface CharactersViewProps {
  initialToken?: Token;
  selectedCharacterUuid?: string;
  onCharacterSelect?: (characterUuid: string) => void;
  createNewCharacter?: boolean;
}

/**
 * Check if a token is a meta token (not character or reminder)
 */
function isMetaToken(token?: Token): boolean {
  return !!token && token.type !== 'character' && token.type !== 'reminder';
}

export function CharactersView({
  initialToken,
  selectedCharacterUuid: externalSelectedUuid,
  onCharacterSelect,
  createNewCharacter,
}: CharactersViewProps) {
  const {
    characters,
    tokens,
    jsonInput,
    setJsonInput,
    setCharacters,
    setTokens,
    generationOptions,
    setMetadata,
    deleteMetadata,
    getMetadata,
    scriptMeta,
    setScriptMeta,
  } = useTokenContext();
  const { addToast } = useToast();
  const { setDownloads, clearDownloads } = useDownloadsContext();

  // Determine the initial character UUID
  const getInitialCharacterUuid = useCallback(() => {
    if (isMetaToken(initialToken)) return '';

    if (externalSelectedUuid) {
      const byUuid = characters.find((c) => c.uuid === externalSelectedUuid);
      if (byUuid) return externalSelectedUuid;
    }

    if (!initialToken) return characters[0]?.uuid || '';

    if (initialToken.parentCharacter) {
      const char = characters.find((c) => c.name === initialToken.parentCharacter);
      if (char) return char.uuid || '';
    }

    if (initialToken.type === 'character') {
      const char = characters.find((c) => c.name === initialToken.name);
      if (char) return char.uuid || '';
    }

    return characters[0]?.uuid || '';
  }, [characters, externalSelectedUuid, initialToken]);

  // Selection state
  const [selectedCharacterUuid, setSelectedCharacterUuid] = useState<string>(() =>
    getInitialCharacterUuid()
  );
  const [selectedMetaToken, setSelectedMetaToken] = useState<Token | null>(
    initialToken && isMetaToken(initialToken) ? initialToken : null
  );
  const [isMetaSelected, setIsMetaSelected] = useState(!!selectedMetaToken);
  const [isOfficialDrawerOpen, setIsOfficialDrawerOpen] = useState(false);

  // Track original UUID for character operations
  const originalCharacterUuidRef = useRef<string>(selectedCharacterUuid);

  // Character editor hook
  const { editedCharacter, handleEditChange, handleReplaceCharacter } = useCharacterEditor({
    selectedCharacterUuid,
    characters,
    jsonInput,
    setJsonInput,
    setCharacters,
    setMetadata,
    onCacheInvalidate: (uuid) => invalidateCache(uuid),
  });

  // Get current character's decoratives for live preview
  const currentDecorative = getMetadata(selectedCharacterUuid).decoratives;

  // Token preview cache hook
  const {
    previewCharacterToken,
    previewReminderTokens,
    handleHoverCharacter,
    applyCachedTokens,
    regeneratePreview,
    handlePreviewVariant,
    invalidateCache,
  } = useTokenPreviewCache({
    editedCharacter,
    generationOptions,
    decoratives: currentDecorative,
    initialToken,
    tokens,
    characters,
    selectedCharacterUuid,
  });

  // Character operations hook
  const { handleAddCharacter, handleDeleteCharacter, handleDuplicateCharacter, handleChangeTeam } =
    useCharacterOperations({
      characters,
      tokens,
      jsonInput,
      generationOptions,
      setCharacters,
      setTokens,
      setJsonInput,
      setMetadata,
      deleteMetadata,
      getMetadata,
      addToast,
      selectedCharacterUuid,
      setSelectedCharacterUuid,
      setEditedCharacter: (char) => {
        if (char) handleReplaceCharacter(char);
        // When null, the editor resets via selection change
      },
      onCharacterCreated: (uuid) => {
        originalCharacterUuidRef.current = uuid;
      },
      createNewCharacter,
    });

  // Character downloads hook
  useCharacterDownloads({
    displayCharacterToken: previewCharacterToken,
    displayReminderTokens: previewReminderTokens,
    editedCharacter,
    selectedCharacter: characters.find((c) => c.uuid === selectedCharacterUuid),
    pngSettings: generationOptions.pngSettings ?? {
      embedMetadata: true,
      transparentBackground: false,
    },
    isMetaSelected,
    addToast,
    setDownloads,
    clearDownloads,
  });

  // Sync with external selected UUID
  const prevExternalUuidRef = useRef(externalSelectedUuid);
  useEffect(() => {
    if (externalSelectedUuid && externalSelectedUuid !== prevExternalUuidRef.current) {
      prevExternalUuidRef.current = externalSelectedUuid;
      setSelectedCharacterUuid(externalSelectedUuid);
    }
  }, [externalSelectedUuid]);

  // Notify parent of character selection changes
  useEffect(() => {
    if (onCharacterSelect && selectedCharacterUuid) {
      onCharacterSelect(selectedCharacterUuid);
    }
  }, [selectedCharacterUuid, onCharacterSelect]);

  // Selected character (from source or edited)
  const selectedCharacter = useMemo(
    () => editedCharacter || characters.find((c) => c.uuid === selectedCharacterUuid),
    [editedCharacter, selectedCharacterUuid, characters]
  );

  // Check if selected character is official
  const isSelectedCharacterOfficial = useMemo(() => {
    return selectedCharacter?.source === 'official';
  }, [selectedCharacter]);

  // Handle character selection
  const handleSelectCharacter = useCallback(
    (newCharacterUuid: string) => {
      originalCharacterUuidRef.current = newCharacterUuid;
      setSelectedCharacterUuid(newCharacterUuid);
      setSelectedMetaToken(null);
      setIsMetaSelected(false);

      // Apply cached tokens if available for instant display
      applyCachedTokens(newCharacterUuid);
    },
    [applyCachedTokens]
  );

  // Handle meta token selection
  const handleSelectMetaToken = useCallback((token: Token) => {
    setSelectedMetaToken(token);
    setSelectedCharacterUuid('');
    setIsMetaSelected(true);
  }, []);

  // Handle meta selection (no specific token)
  const handleSelectMeta = useCallback(() => {
    setSelectedMetaToken(null);
    setSelectedCharacterUuid('');
    setIsMetaSelected(true);
  }, []);

  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <ViewErrorFallback view="Characters" error={error} onRetry={resetErrorBoundary} />
      )}
    >
      <ViewLayout variant="3-panel">
        {/* Left Panel - Character Navigation */}
        <ViewLayout.Panel position="left" width="left" scrollable>
          <CharacterNavigation
            characters={characters}
            tokens={tokens}
            selectedCharacterUuid={selectedCharacterUuid}
            isMetaSelected={isMetaSelected}
            onSelectCharacter={handleSelectCharacter}
            onAddCharacter={handleAddCharacter}
            onAddOfficialCharacter={() => setIsOfficialDrawerOpen(true)}
            onDeleteCharacter={handleDeleteCharacter}
            onDuplicateCharacter={handleDuplicateCharacter}
            onSelectMetaToken={handleSelectMetaToken}
            onSelectMeta={handleSelectMeta}
            onChangeTeam={handleChangeTeam}
            onHoverCharacter={handleHoverCharacter}
          />
        </ViewLayout.Panel>

        {/* Center Panel - Preview */}
        <ViewLayout.Panel position="center" width="flex" scrollable>
          {isMetaSelected ? (
            // Meta preview
            <div className={`${layoutStyles.contentPanel} ${styles.customizePreview}`}>
              {selectedMetaToken ? (
                <div className={styles.metaTokenPreview}>
                  <img
                    src={selectedMetaToken.canvas.toDataURL('image/png')}
                    alt={selectedMetaToken.name}
                    className={styles.metaTokenImage}
                  />
                </div>
              ) : (
                <div className={styles.tokenPreviewPlaceholder}>
                  <span className={styles.metaPlaceholderIcon}>📜</span>
                  <p>Script Metadata</p>
                  <p className={styles.placeholderHint}>
                    Edit your script's meta information on the right.
                  </p>
                </div>
              )}
            </div>
          ) : selectedCharacter ? (
            // Character preview
            <div className={`${layoutStyles.contentPanel} ${styles.customizePreview}`}>
              {previewCharacterToken ? (
                <TokenPreview
                  characterToken={previewCharacterToken}
                  reminderTokens={previewReminderTokens}
                  onReminderClick={(reminder) => {
                    const parentCharName = reminder.parentCharacter;
                    if (parentCharName) {
                      const char = characters.find((c) => c.name === parentCharName);
                      if (char?.uuid) setSelectedCharacterUuid(char.uuid);
                    }
                  }}
                />
              ) : (
                <div className={previewStyles.previewArea}>
                  <div className={previewStyles.preview}>
                    <div className={styles.tokenPreviewPlaceholder}>
                      <p>Token preview will appear here after generating.</p>
                      <p className={styles.placeholderHint}>
                        Fill in character details on the right, then generate tokens.
                      </p>
                    </div>
                  </div>
                  <div className={previewStyles.reminders}>
                    <h4>Reminder Tokens</h4>
                    <div className={previewStyles.galleryContainer}>
                      <button
                        type="button"
                        className={previewStyles.galleryArrow}
                        disabled
                        aria-label="Show previous reminder"
                      >
                        ‹
                      </button>
                      <div className={previewStyles.gallery}>
                        <div className={previewStyles.empty}>
                          <span className={previewStyles.emptyText}>No reminder tokens</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className={previewStyles.galleryArrow}
                        disabled
                        aria-label="Show next reminder"
                      >
                        ›
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Empty state
            <div className={`${layoutStyles.contentPanel} ${styles.customizeEmptyState}`}>
              <div className={styles.emptyStateContent}>
                <h3>No Character Selected</h3>
                <p>Create a new character or load a script to get started.</p>
                <div className={styles.emptyStateButtons}>
                  <Button variant="primary" onClick={handleAddCharacter}>
                    ✨ Create New Character
                  </Button>
                  <Button variant="secondary" onClick={() => setIsOfficialDrawerOpen(true)}>
                    📚 Add Official Character
                  </Button>
                </div>
              </div>
            </div>
          )}
        </ViewLayout.Panel>

        {/* Right Panel - Editor */}
        <ViewLayout.Panel position="right" width="right" scrollable>
          {isMetaSelected ? (
            <MetaEditor
              scriptMeta={scriptMeta}
              onMetaChange={(updatedMeta) => {
                setScriptMeta(updatedMeta);
                try {
                  if (jsonInput.trim()) {
                    const updatedJson = updateMetaInJson(jsonInput, updatedMeta);
                    setJsonInput(updatedJson);
                  }
                } catch (e) {
                  logger.error('CharactersView', 'Failed to update meta in JSON', e);
                }
              }}
            />
          ) : selectedCharacter ? (
            <TokenEditor
              character={selectedCharacter}
              onEditChange={handleEditChange}
              onReplaceCharacter={handleReplaceCharacter}
              onRefreshPreview={regeneratePreview}
              onPreviewVariant={handlePreviewVariant}
              isOfficial={isSelectedCharacterOfficial}
            />
          ) : null}
        </ViewLayout.Panel>

        {/* Official Character Drawer */}
        <OfficialCharacterDrawer
          isOpen={isOfficialDrawerOpen}
          onClose={() => setIsOfficialDrawerOpen(false)}
        />
      </ViewLayout>
    </ErrorBoundary>
  );
}
