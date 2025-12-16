import { useCallback } from 'react';
import { useToast } from '../../../../contexts/ToastContext';
import { useTokenContext } from '../../../../contexts/TokenContext';
import { useStudioNavigation } from '../../../../hooks/useStudioNavigation';
import { useTokenDeletion } from '../../../../hooks/useTokenDeletion';
import { useTokenGrouping } from '../../../../hooks/useTokenGrouping';
import styles from '../../../../styles/components/tokens/TokenGrid.module.css';
import { buildTokenMetadata, embedPngMetadata } from '../../../../ts/export/pngMetadata';
import type { Token } from '../../../../ts/types/index.js';
import { canvasToBlob, downloadFile } from '../../../../ts/utils/imageUtils';
import { logger } from '../../../../ts/utils/logger';
import type { TabType } from '../../../Layout/TabNavigation';
import { ConfirmDialog } from '../../../Shared/ModalBase/ConfirmDialog';
import { TokenCard } from './TokenCard';

interface TokenGridProps {
  /** Optional tokens array - when provided, uses these instead of context */
  tokens?: Token[];
  /** When true, hides editing controls (context menu, delete, set as example) */
  readOnly?: boolean;
  /** Click handler for tokens - required when not readOnly */
  onTokenClick?: (token: Token) => void;
  /** Tab change handler - for navigating to Studio */
  onTabChange?: (tab: TabType) => void;
}

export function TokenGrid({
  tokens: propTokens,
  readOnly = false,
  onTokenClick,
  onTabChange,
}: TokenGridProps) {
  const {
    isLoading,
    error,
    tokens: contextTokens,
    setTokens,
    characters,
    setCharacters,
    setExampleToken,
    updateGenerationOptions,
    generationOptions,
  } = useTokenContext();
  const { addToast } = useToast();

  // Use prop tokens if provided, otherwise use context tokens directly (no filtering)
  const displayTokens = propTokens ?? contextTokens;
  const allTokens = propTokens ?? contextTokens;

  const handleSetAsExample = useCallback(
    (token: Token) => {
      setExampleToken(token);
    },
    [setExampleToken]
  );

  // Download single token as PNG
  const handleDownloadToken = useCallback(
    async (token: Token) => {
      try {
        let blob = await canvasToBlob(token.canvas);

        // Embed metadata if enabled in settings
        if (generationOptions.pngSettings?.embedMetadata) {
          const metadata = buildTokenMetadata(token);
          blob = await embedPngMetadata(blob, metadata);
        }

        const filename = `${token.filename}.png`;
        downloadFile(blob, filename);
        addToast(`Downloaded ${token.name}`, 'success');
      } catch (error) {
        logger.error('TokenGrid', 'Failed to download token', error);
        addToast('Failed to download token', 'error');
      }
    },
    [generationOptions.pngSettings, addToast]
  );

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

  // For readOnly mode with prop tokens, skip loading/error states
  if (!propTokens && allTokens.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No tokens generated yet. Upload or paste a JSON script to get started.</p>
      </div>
    );
  }

  if (!propTokens && isLoading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.spinner}></div>
        <p>Generating tokens...</p>
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
            <details open className={styles.collapsible}>
              <summary className={styles.sectionHeader}>Character Tokens</summary>
              <div id="characterTokenGrid" className={styles.grid}>
                {grouping.groupedCharacterTokens.map((group) => (
                  <TokenCard
                    key={group.token.filename}
                    token={group.token}
                    count={group.count}
                    variants={group.variants}
                    onCardClick={readOnly ? undefined : onTokenClick}
                    onSetAsExample={readOnly ? undefined : handleSetAsExample}
                    onDelete={readOnly ? undefined : deletion.handleDeleteRequest}
                    onEditInStudio={readOnly ? undefined : studioNav.editInStudio}
                    onDownload={readOnly ? undefined : handleDownloadToken}
                  />
                ))}
              </div>
            </details>
          </div>
        )}

        {grouping.groupedReminderTokens.length > 0 && (
          <div className={styles.section}>
            <details open className={styles.collapsible}>
              <summary className={styles.sectionHeader}>Reminder Tokens</summary>
              <div id="reminderTokenGrid" className={`${styles.grid} ${styles.gridReminders}`}>
                {grouping.groupedReminderTokens.map((group) => (
                  <TokenCard
                    key={group.token.filename}
                    token={group.token}
                    count={group.count}
                    variants={group.variants}
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

        {grouping.groupedMetaTokens.length > 0 && (
          <div className={styles.section}>
            <details open className={styles.collapsible}>
              <summary className={styles.sectionHeader}>Meta Tokens</summary>
              <div id="metaTokenGrid" className={styles.grid}>
                {grouping.groupedMetaTokens.map((group) => (
                  <TokenCard
                    key={group.token.filename}
                    token={group.token}
                    count={group.count}
                    variants={group.variants}
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
