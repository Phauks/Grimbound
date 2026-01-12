import { useState } from 'react';
import type { TabType } from '@/components/Layout/TabNavigation';
import { GenerationProgressOverlay } from '@/components/Shared/Feedback/GenerationProgressOverlay';
import { ConfirmDialog } from '@/components/Shared/ModalBase/ConfirmDialog';
import { useToast } from '@/contexts/ToastContext';
import { useTokenContext } from '@/contexts/TokenContext';
import { useStudioNavigation, useTokenDeletion, useTokenGrouping } from '@/hooks';
import styles from '@/styles/components/tokens/TokenGrid.module.css';
import type { Token } from '@/ts/types/index.js';
import { downloadFile, getTokenBlob } from '@/ts/utils/imageUtils';
import { logger } from '@/ts/utils/logger';
import {
  getStorageItem,
  STORAGE_KEYS,
  type StorageKey,
  setStorageItem,
} from '@/ts/utils/storageKeys';
import { TokenCard } from './TokenCard';

/**
 * Helper to get initial section open state from localStorage
 */
function getInitialSectionState(key: StorageKey, defaultValue: boolean): boolean {
  const stored = getStorageItem(key);
  if (stored === null) return defaultValue;
  return stored === 'true';
}

/** Meta token types that should be set as example meta token (not character) */
const META_TOKEN_TYPES = new Set(['script-name', 'almanac', 'pandemonium', 'bootlegger', 'jinx']);

interface TokenGridProps {
  /** Optional tokens array - when provided, uses these instead of context */
  tokens?: Token[];
  /** When true, hides editing controls (context menu, delete, set as example) */
  readOnly?: boolean;
  /** Click handler for tokens - required when not readOnly */
  onTokenClick?: (token: Token) => void;
  /** Tab change handler - for navigating to Studio */
  onTabChange?: (tab: TabType) => void;
  /** Cache version - triggers re-render of TokenCards when cache is updated */
  cacheVersion?: number;
}

export function TokenGrid({
  tokens: propTokens,
  readOnly = false,
  onTokenClick,
  onTabChange,
  cacheVersion,
}: TokenGridProps) {
  const {
    isLoading,
    error,
    tokens: contextTokens,
    setTokens,
    characters,
    setCharacters,
    setExampleCharacterToken,
    setExampleMetaToken,
    updateGenerationOptions,
    setMetadata,
    getMetadata,
    generationProgress,
  } = useTokenContext();
  const { addToast } = useToast();

  // Derive current isOfficial and hasDecorativeOverrides from character state
  // This ensures tags update when character properties change without regeneration
  const enrichedTokens = (() => {
    const tokensToEnrich = propTokens ?? contextTokens;
    return tokensToEnrich.map((token) => {
      // Only enrich tokens that have a parent character
      if (!token.parentUuid) return token;

      // Find the current character data
      const character = characters.find((c) => c.uuid === token.parentUuid);
      if (!character) return token;

      // Get current metadata for decorative overrides
      const metadata = getMetadata(token.parentUuid);
      const currentIsOfficial = character.source === 'official';
      const currentHasDecorativeOverrides = metadata?.decoratives?.useCustomSettings ?? false;

      // Only create new object if values changed
      if (
        token.isOfficial === currentIsOfficial &&
        token.hasDecorativeOverrides === currentHasDecorativeOverrides
      ) {
        return token;
      }

      return {
        ...token,
        isOfficial: currentIsOfficial,
        hasDecorativeOverrides: currentHasDecorativeOverrides,
      };
    });
  })();

  // Use enriched tokens for display
  const displayTokens = enrichedTokens;
  const allTokens = enrichedTokens;

  const handleSetAsExample = (token: Token) => {
    // Route meta tokens to the meta example slot, character/reminder to character slot
    if (META_TOKEN_TYPES.has(token.type)) {
      setExampleMetaToken(token);
    } else {
      setExampleCharacterToken(token);
    }
  };

  // Download single token as PNG
  const handleDownloadToken = (token: Token) => {
    try {
      const blob = getTokenBlob(token);
      const filename = `${token.filename}.png`;
      downloadFile(blob, filename);
      addToast(`Downloaded ${token.name}`, 'success');
    } catch (error) {
      logger.error('TokenGrid', 'Failed to download token', error);
      addToast('Failed to download token', 'error');
    }
  };

  // Clear decorative overrides for a token's character
  const handleClearOverrides = (token: Token) => {
    if (!token.parentUuid) {
      addToast('Cannot clear overrides: no character associated', 'error');
      return;
    }

    // Clear the decoratives by setting useCustomSettings to false
    setMetadata(token.parentUuid, {
      decoratives: { useCustomSettings: false },
    });

    addToast(`Cleared overrides for ${token.name}. Regenerate tokens to see changes.`, 'success');
  };

  // Use custom hooks for token management
  const deletion = useTokenDeletion({
    tokens: allTokens,
    characters,
    setTokens,
    setCharacters,
    updateGenerationOptions,
  });

  const grouping = useTokenGrouping(displayTokens);

  const studioNav = useStudioNavigation({ onTabChange });

  // Section open/closed state - persisted to localStorage
  const [charactersOpen, setCharactersOpen] = useState(() =>
    getInitialSectionState(STORAGE_KEYS.TOKEN_SECTION_CHARACTERS_OPEN, true)
  );
  const [remindersOpen, setRemindersOpen] = useState(() =>
    getInitialSectionState(STORAGE_KEYS.TOKEN_SECTION_REMINDERS_OPEN, true)
  );
  const [metaOpen, setMetaOpen] = useState(() =>
    getInitialSectionState(STORAGE_KEYS.TOKEN_SECTION_META_OPEN, true)
  );

  // Handlers to toggle and persist section state using onToggle event
  const handleCharactersToggle = (e: React.ToggleEvent<HTMLDetailsElement>) => {
    const isOpen = e.currentTarget.open;
    setCharactersOpen(isOpen);
    setStorageItem(STORAGE_KEYS.TOKEN_SECTION_CHARACTERS_OPEN, String(isOpen));
  };

  const handleRemindersToggle = (e: React.ToggleEvent<HTMLDetailsElement>) => {
    const isOpen = e.currentTarget.open;
    setRemindersOpen(isOpen);
    setStorageItem(STORAGE_KEYS.TOKEN_SECTION_REMINDERS_OPEN, String(isOpen));
  };

  const handleMetaToggle = (e: React.ToggleEvent<HTMLDetailsElement>) => {
    const isOpen = e.currentTarget.open;
    setMetaOpen(isOpen);
    setStorageItem(STORAGE_KEYS.TOKEN_SECTION_META_OPEN, String(isOpen));
  };

  // Show loading overlay first - before empty state check
  // This prevents brief flash of "No tokens" message when generation starts
  // Show overlay when generation is in progress and we're not in readOnly mode
  // (readOnly is for external token display that doesn't care about context loading)
  if (!readOnly && isLoading && generationProgress) {
    return <GenerationProgressOverlay progress={generationProgress} />;
  }

  // For readOnly mode with prop tokens, skip loading/error states
  if (!propTokens && allTokens.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No tokens generated yet. Upload or paste a JSON script to get started.</p>
      </div>
    );
  }

  if (!propTokens && error) {
    return (
      <div className={styles.errorState}>
        <p className={styles.errorMessage}>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.tokenContainer}>
        {grouping.groupedCharacterTokens.length > 0 && (
          <div className={styles.section}>
            <details
              open={charactersOpen}
              className={styles.collapsible}
              onToggle={handleCharactersToggle}
            >
              <summary className={styles.sectionHeader}>Character Tokens</summary>
              <div id="characterTokenGrid" className={styles.grid}>
                {grouping.groupedCharacterTokens.map((group) => (
                  <TokenCard
                    key={group.token.filename}
                    token={group.token}
                    count={group.count}
                    variants={group.variants}
                    cacheVersion={cacheVersion}
                    onCardClick={readOnly ? undefined : onTokenClick}
                    onSetAsExample={readOnly ? undefined : handleSetAsExample}
                    onDelete={readOnly ? undefined : deletion.handleDeleteRequest}
                    onEditInStudio={readOnly ? undefined : studioNav.editInStudio}
                    onDownload={readOnly ? undefined : handleDownloadToken}
                    onClearOverrides={readOnly ? undefined : handleClearOverrides}
                  />
                ))}
              </div>
            </details>
          </div>
        )}

        {grouping.groupedReminderTokens.length > 0 && (
          <div className={styles.section}>
            <details
              open={remindersOpen}
              className={styles.collapsible}
              onToggle={handleRemindersToggle}
            >
              <summary className={styles.sectionHeader}>Reminder Tokens</summary>
              <div id="reminderTokenGrid" className={`${styles.grid} ${styles.gridReminders}`}>
                {grouping.groupedReminderTokens.map((group) => (
                  <TokenCard
                    key={group.token.filename}
                    token={group.token}
                    count={group.count}
                    variants={group.variants}
                    cacheVersion={cacheVersion}
                    onCardClick={readOnly ? undefined : onTokenClick}
                    onSetAsExample={readOnly ? undefined : handleSetAsExample}
                    onDelete={readOnly ? undefined : deletion.handleDeleteRequest}
                    onDownload={readOnly ? undefined : handleDownloadToken}
                    onClearOverrides={readOnly ? undefined : handleClearOverrides}
                  />
                ))}
              </div>
            </details>
          </div>
        )}

        {grouping.groupedMetaTokens.length > 0 && (
          <div className={styles.section}>
            <details open={metaOpen} className={styles.collapsible} onToggle={handleMetaToggle}>
              <summary className={styles.sectionHeader}>Meta Tokens</summary>
              <div id="metaTokenGrid" className={styles.grid}>
                {grouping.groupedMetaTokens.map((group) => (
                  <TokenCard
                    key={group.token.filename}
                    token={group.token}
                    count={group.count}
                    variants={group.variants}
                    cacheVersion={cacheVersion}
                    onCardClick={readOnly ? undefined : onTokenClick}
                    onSetAsExample={readOnly ? undefined : handleSetAsExample}
                    onDelete={readOnly ? undefined : deletion.handleDeleteRequest}
                    onDownload={readOnly ? undefined : handleDownloadToken}
                  />
                ))}
              </div>
            </details>
          </div>
        )}

        {displayTokens.length === 0 && (
          <div className={styles.emptyState}>
            <p>No tokens to display.</p>
          </div>
        )}
      </div>

      {!readOnly && (
        <ConfirmDialog
          isOpen={deletion.tokenToDelete !== null}
          title="Delete Token"
          message={`Are you sure you want to delete the token "${deletion.tokenToDelete?.name}"? This action cannot be undone.`}
          onConfirm={deletion.confirmDelete}
          onClose={deletion.cancelDelete}
          confirmText="Delete"
          cancelText="Cancel"
        />
      )}
    </div>
  );
}
