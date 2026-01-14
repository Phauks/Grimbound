/**
 * CharactersView Component
 *
 * Main view for character editing, preview, and management.
 * Uses extracted hooks for better separation of concerns.
 *
 * @module components/Views/CharactersView
 */

import { useEffect, useRef, useState } from 'react';
import { ViewLayout } from '@/components/Layout/ViewLayout';
import { ErrorBoundary, UnifiedErrorDisplay } from '@/components/Shared';
import { OfficialCharacterDrawer } from '@/components/Shared/Drawer';
import { Button } from '@/components/Shared/UI/Button';
import { CharacterNavigation } from '@/components/ViewComponents/CharactersComponents/CharacterNavigation';
import { MetaEditor } from '@/components/ViewComponents/CharactersComponents/MetaEditor';
import { TokenEditor } from '@/components/ViewComponents/CharactersComponents/TokenEditor';
import type { JinxPreviewData } from '@/components/ViewComponents/CharactersComponents/TokenEditor/index';
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
import { useResizableSidebar } from '@/hooks/ui';
import previewStyles from '@/styles/components/characterEditor/TokenPreview.module.css';
import layoutStyles from '@/styles/components/layout/ViewLayout.module.css';
import styles from '@/styles/components/views/Views.module.css';
import { isMetaToken } from '@/ts/export/zipExporter.js';
import type { Token } from '@/ts/types/index.js';
import { updateMetaInJson } from '@/ts/ui/detailViewUtils.js';
import { logger } from '@/ts/utils/logger.js';

interface CharactersViewProps {
  initialToken?: Token;
  selectedCharacterUuid?: string;
  onCharacterSelect?: (characterUuid: string) => void;
  createNewCharacter?: boolean;
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

  // Resizable sidebar
  const { width: sidebarWidth, isDragging, handleProps } = useResizableSidebar();

  // Determine the initial character UUID
  const getInitialCharacterUuid = () => {
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
  };

  // Selection state
  const [selectedCharacterUuid, setSelectedCharacterUuid] = useState<string>(() =>
    getInitialCharacterUuid()
  );
  const [selectedMetaToken, setSelectedMetaToken] = useState<Token | null>(
    initialToken && isMetaToken(initialToken) ? initialToken : null
  );
  const [isMetaSelected, setIsMetaSelected] = useState(!!selectedMetaToken);
  const [isOfficialDrawerOpen, setIsOfficialDrawerOpen] = useState(false);

  // Jinx preview state
  const [jinxPreviewToken, setJinxPreviewToken] = useState<Token | null>(null);
  const [previewedJinxIndex, setPreviewedJinxIndex] = useState<number | null>(null);
  // Generation counter for cancellation (incremented each time we start generating)
  const jinxGenerationRef = useRef(0);

  // Track original UUID for character operations
  const originalCharacterUuidRef = useRef<string>(selectedCharacterUuid);

  /**
   * Internal setter that also clears jinx preview and optionally notifies parent.
   * Used by useCharacterOperations when it needs to change selection.
   * This eliminates the "clear jinx on character change" effect.
   */
  const setSelectedCharacterUuidWithEffects = (uuid: string, notifyParent = true) => {
    setSelectedCharacterUuid(uuid);
    // Clear jinx preview when character changes (increment counter to cancel any pending generation)
    jinxGenerationRef.current++;
    setJinxPreviewToken(null);
    setPreviewedJinxIndex(null);
    // Notify parent if requested and uuid is truthy
    if (notifyParent && uuid) {
      onCharacterSelect?.(uuid);
    }
  };

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
      // Use wrapper that clears jinx and notifies parent (eliminates useEffect)
      setSelectedCharacterUuid: setSelectedCharacterUuidWithEffects,
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
    isMetaSelected,
    addToast,
    setDownloads,
    clearDownloads,
  });

  // Sync with external selected UUID
  // Note: We DON'T notify parent here because change originates FROM parent
  const prevExternalUuidRef = useRef(externalSelectedUuid);
  useEffect(() => {
    if (externalSelectedUuid && externalSelectedUuid !== prevExternalUuidRef.current) {
      prevExternalUuidRef.current = externalSelectedUuid;
      // Inline the logic instead of calling wrapper (avoids dependency on wrapper function)
      setSelectedCharacterUuid(externalSelectedUuid);
      // Clear jinx preview when character changes (increment counter to cancel any pending generation)
      jinxGenerationRef.current++;
      setJinxPreviewToken(null);
      setPreviewedJinxIndex(null);
      // DON'T notify parent since change originates FROM parent
    }
  }, [externalSelectedUuid]);

  // Selected character (from source or edited)
  const selectedCharacter =
    editedCharacter || characters.find((c) => c.uuid === selectedCharacterUuid);

  // Check if selected character is official
  const isSelectedCharacterOfficial = selectedCharacter?.source === 'official';

  // Handle character selection
  const handleSelectCharacter = (newCharacterUuid: string) => {
    originalCharacterUuidRef.current = newCharacterUuid;
    // Use wrapper that clears jinx preview and notifies parent
    setSelectedCharacterUuidWithEffects(newCharacterUuid);
    setSelectedMetaToken(null);
    setIsMetaSelected(false);

    // Apply cached tokens if available for instant display
    applyCachedTokens(newCharacterUuid);
  };

  // Handle meta token selection
  const handleSelectMetaToken = (token: Token) => {
    setSelectedMetaToken(token);
    setSelectedCharacterUuid('');
    setIsMetaSelected(true);
  };

  // Handle meta selection (no specific token)
  const handleSelectMeta = () => {
    setSelectedMetaToken(null);
    setSelectedCharacterUuid('');
    setIsMetaSelected(true);
  };

  // Handle jinx preview - generates token directly (moved from useEffect to event handler)
  const handlePreviewJinx = async (data: JinxPreviewData | null) => {
    if (!data) {
      // Clear jinx preview (increment counter to cancel any pending generation)
      jinxGenerationRef.current++;
      setJinxPreviewToken(null);
      setPreviewedJinxIndex(null);
      return;
    }

    // Find the index of this jinx in the character's jinxes array
    const jinxes = data.character.jinxes || [];
    const index = jinxes.findIndex((j) => j.id === data.jinx.id && j.reason === data.jinx.reason);
    setPreviewedJinxIndex(index >= 0 ? index : 0);

    // Increment generation counter and capture it for cancellation check
    const generationId = ++jinxGenerationRef.current;

    try {
      const { TokenGenerator } = await import('@/ts/generation/TokenGenerator.js');
      const generator = new TokenGenerator(generationOptions);

      const canvas = await generator.generateJinxToken(
        data.jinx,
        data.character,
        data.targetCharacter
      );

      // Check if this generation is still valid (hasn't been superseded)
      if (generationId !== jinxGenerationRef.current) return;

      // Create a Token object for display
      // Extract first image from array if needed
      const getFirstImage = (img: string | string[]): string =>
        Array.isArray(img) ? img[0] || '' : img || '';

      const token: Token = {
        name: `${data.character.name} & ${data.targetCharacter.name}`,
        type: 'jinx',
        team: 'meta',
        canvas,
        diameter: canvas.width,
        filename: `jinx_${data.character.id}_${data.targetCharacter.id}.png`,
        jinxData: {
          reason: data.jinx.reason,
          char1: {
            id: data.character.id,
            name: data.character.name,
            image: getFirstImage(data.character.image),
          },
          char2: {
            id: data.targetCharacter.id,
            name: data.targetCharacter.name,
            image: getFirstImage(data.targetCharacter.image),
          },
        },
      };

      setJinxPreviewToken(token);
    } catch (error) {
      // Only set error state if this generation is still valid
      if (generationId === jinxGenerationRef.current) {
        logger.error('CharactersView', 'Failed to generate jinx preview', error);
        setJinxPreviewToken(null);
      }
    }
  };

  // NOTE: Jinx generation was moved from useEffect to handlePreviewJinx event handler.
  // Jinx clearing is handled in setSelectedCharacterUuidWithEffects wrapper.

  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <UnifiedErrorDisplay context="Characters" error={error} onRetry={resetErrorBoundary} />
      )}
    >
      <ViewLayout variant="3-panel">
        {/* Left Panel - Character Navigation (Resizable) */}
        <ViewLayout.Panel
          position="left"
          resizable
          resizableWidth={sidebarWidth}
          isResizing={isDragging}
          onWidthChange={handleProps.onMouseDown}
          scrollable
        >
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
              {selectedMetaToken?.dataUrl ? (
                <div className={styles.metaTokenPreview}>
                  <img
                    src={selectedMetaToken.dataUrl}
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
            // Character preview (or jinx preview when active)
            <div className={`${layoutStyles.contentPanel} ${styles.customizePreview}`}>
              {jinxPreviewToken?.dataUrl ? (
                // Jinx token preview
                <div className={styles.jinxTokenPreview}>
                  <img
                    src={jinxPreviewToken.dataUrl}
                    alt={jinxPreviewToken.name}
                    className={styles.jinxTokenImage}
                  />
                  <button
                    type="button"
                    className={styles.closeJinxPreview}
                    onClick={() => handlePreviewJinx(null)}
                    aria-label="Close jinx preview"
                  >
                    ×
                  </button>
                </div>
              ) : previewCharacterToken ? (
                <TokenPreview
                  characterToken={previewCharacterToken}
                  reminderTokens={previewReminderTokens}
                  onReminderClick={(reminder) => {
                    const parentCharName = reminder.parentCharacter;
                    if (parentCharName) {
                      const char = characters.find((c) => c.name === parentCharName);
                      // Use wrapper to clear jinx and notify parent
                      if (char?.uuid) setSelectedCharacterUuidWithEffects(char.uuid);
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
              key={selectedCharacterUuid}
              character={selectedCharacter}
              onEditChange={handleEditChange}
              onReplaceCharacter={handleReplaceCharacter}
              onRefreshPreview={regeneratePreview}
              onPreviewVariant={handlePreviewVariant}
              isOfficial={isSelectedCharacterOfficial}
              onPreviewJinx={handlePreviewJinx}
              previewedJinxIndex={previewedJinxIndex}
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
