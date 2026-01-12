import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TabType } from '@/components/Layout/TabNavigation';
import { ViewLayout } from '@/components/Layout/ViewLayout';
import { ErrorBoundary, UnifiedErrorDisplay } from '@/components/Shared';
import { AppearancePanel } from '@/components/Shared/Options/AppearancePanel';
import { PresetSection } from '@/components/ViewComponents/TokensComponents/Presets/PresetSection';
import { TokenGrid } from '@/components/ViewComponents/TokensComponents/TokenGrid/TokenGrid';
import { TokenPreviewRow } from '@/components/ViewComponents/TokensComponents/TokenGrid/TokenPreviewRow';
import { type DownloadItem, useDownloadsContext } from '@/contexts/DownloadsContext';
import { PanelCoordinationProvider } from '@/contexts/PanelCoordinationContext';
import { useToast } from '@/contexts/ToastContext';
import { useTokenContext } from '@/contexts/TokenContext';
import { useExport, useMissingTokenGenerator, useTokenGenerator } from '@/hooks';
import layoutStyles from '@/styles/components/layout/ViewLayout.module.css';
import styles from '@/styles/components/views/Views.module.css';
import { createTokensZip, isMetaToken, tokensToBundleData } from '@/ts/export/zipExporter';
import type { Token } from '@/ts/types/index';
import { downloadFile } from '@/ts/utils/imageUtils';
import { logger } from '@/ts/utils/logger';

interface TokensViewProps {
  onTokenClick: (token: Token) => void;
  onTabChange: (tab: TabType) => void;
}

export function TokensView({ onTokenClick, onTabChange }: TokensViewProps) {
  const {
    tokens,
    characters,
    generationOptions,
    updateGenerationOptions,
    isLoading,
    characterSelectionSummary,
    enabledCharacterUuids,
  } = useTokenContext();
  const { setDownloads, clearDownloads } = useDownloadsContext();
  const { addToast } = useToast();
  const { generateMissingTokens, hasMissingTokens } = useMissingTokenGenerator();
  const { generateTokens } = useTokenGenerator();
  const { downloadPdf, isExporting } = useExport();

  // Ref to ensure token check only runs once per mount
  const hasCheckedMissingRef = useRef(false);

  // Generate tokens on mount:
  // - If no tokens exist, use full generation (includes meta tokens)
  // - If some tokens exist but some characters are missing, use incremental generation
  // The ref guard prevents re-triggering when function references change due to token updates
  useEffect(() => {
    if (hasCheckedMissingRef.current) return;
    if (characters.length === 0) return; // No characters to generate tokens for
    hasCheckedMissingRef.current = true;

    if (tokens.length === 0) {
      // No tokens at all - use full generation (includes meta tokens)
      generateTokens();
    } else if (hasMissingTokens()) {
      // Some tokens exist but characters are missing - use incremental generation
      generateMissingTokens();
    }
  }, [tokens.length, characters.length, hasMissingTokens, generateMissingTokens, generateTokens]);

  // Cache version is now managed by useTokenGenerator which pre-renders during generation
  // This value triggers re-render if tokens need to be re-cached (e.g., after tab switch)
  const [cacheReady] = useState(0);

  // Filter tokens to only show enabled characters (meta tokens always shown)
  // useMemo required: used as dependency for useCallback handlers in useEffect deps
  const displayTokens = useMemo(
    () =>
      tokens.filter((t) => {
        // Meta tokens always shown
        if (isMetaToken(t)) return true;
        // Character/reminder tokens filtered by enabled status
        return t.parentUuid && enabledCharacterUuids.has(t.parentUuid);
      }),
    [tokens, enabledCharacterUuids]
  );

  // Filter tokens by type (using filtered display tokens)
  // useMemo required: used as dependency for useCallback handlers in useEffect deps
  const characterTokens = useMemo(
    () => displayTokens.filter((t) => t.type === 'character'),
    [displayTokens]
  );
  const reminderTokens = useMemo(
    () => displayTokens.filter((t) => t.type === 'reminder'),
    [displayTokens]
  );
  const metaTokens = useMemo(() => displayTokens.filter((t) => isMetaToken(t)), [displayTokens]);

  // Download handler for character tokens
  // useCallback required: used as useEffect dependency
  const handleDownloadCharacterTokens = useCallback(async () => {
    if (characterTokens.length === 0) return;
    try {
      const blob = await createTokensZip(characterTokens, null, {
        saveInTeamFolders: true,
        saveRemindersSeparately: false,
        metaTokenFolder: false,
        includeScriptJson: false,
        compressionLevel: 'normal',
      });
      downloadFile(blob, 'character_tokens.zip');
      addToast(`Downloaded ${characterTokens.length} character tokens`, 'success');
    } catch (error) {
      logger.error('TokensView', 'Failed to download character tokens', error);
      addToast('Failed to download character tokens', 'error');
    }
  }, [characterTokens, addToast]);

  // Download handler for reminder tokens
  // useCallback required: used as useEffect dependency
  const handleDownloadReminderTokens = useCallback(async () => {
    if (reminderTokens.length === 0) return;
    try {
      const blob = await createTokensZip(reminderTokens, null, {
        saveInTeamFolders: true,
        saveRemindersSeparately: false,
        metaTokenFolder: false,
        includeScriptJson: false,
        compressionLevel: 'normal',
      });
      downloadFile(blob, 'reminder_tokens.zip');
      addToast(`Downloaded ${reminderTokens.length} reminder tokens`, 'success');
    } catch (error) {
      logger.error('TokensView', 'Failed to download reminder tokens', error);
      addToast('Failed to download reminder tokens', 'error');
    }
  }, [reminderTokens, addToast]);

  // Download handler for meta tokens
  // useCallback required: used as useEffect dependency
  const handleDownloadMetaTokens = useCallback(async () => {
    if (metaTokens.length === 0) return;
    try {
      const blob = await createTokensZip(metaTokens, null, {
        saveInTeamFolders: false,
        saveRemindersSeparately: false,
        metaTokenFolder: false,
        includeScriptJson: false,
        compressionLevel: 'normal',
      });
      downloadFile(blob, 'meta_tokens.zip');
      addToast(`Downloaded ${metaTokens.length} meta tokens`, 'success');
    } catch (error) {
      logger.error('TokensView', 'Failed to download meta tokens', error);
      addToast('Failed to download meta tokens', 'error');
    }
  }, [metaTokens, addToast]);

  // Register downloads for this view - always register with proper disabled states
  useEffect(() => {
    const hasTokens = tokens.length > 0;

    const downloads: DownloadItem[] = [
      {
        id: 'character-tokens',
        icon: '🎭',
        label: 'Character Tokens',
        description:
          characterTokens.length > 0
            ? `${characterTokens.length} tokens (ZIP)`
            : 'Generate tokens first',
        action: handleDownloadCharacterTokens,
        getBlob: () => tokensToBundleData(characterTokens),
        disabled: characterTokens.length === 0,
        disabledReason: 'Generate tokens first',
        category: 'token-sets',
        sourceView: 'tokens',
      },
      {
        id: 'reminder-tokens',
        icon: '🔔',
        label: 'Reminder Tokens',
        description:
          reminderTokens.length > 0
            ? `${reminderTokens.length} tokens (ZIP)`
            : 'Generate tokens first',
        action: handleDownloadReminderTokens,
        getBlob: () => tokensToBundleData(reminderTokens),
        disabled: reminderTokens.length === 0,
        disabledReason: 'Generate tokens first',
        category: 'token-sets',
        sourceView: 'tokens',
      },
      {
        id: 'meta-tokens',
        icon: '📜',
        label: 'Meta Tokens',
        description: metaTokens.length > 0 ? `${metaTokens.length} tokens (ZIP)` : 'No meta tokens',
        action: handleDownloadMetaTokens,
        getBlob: () => tokensToBundleData(metaTokens),
        disabled: metaTokens.length === 0,
        disabledReason: 'No meta tokens available',
        category: 'token-sets',
        sourceView: 'tokens',
      },
      {
        id: 'token-print-sheet',
        icon: '🖨️',
        label: 'Token Print Sheet',
        description: hasTokens ? `${tokens.length} tokens (PDF)` : 'Generate tokens first',
        action: downloadPdf,
        disabled: !hasTokens || isExporting,
        disabledReason: hasTokens ? 'Export in progress' : 'Generate tokens first',
        category: 'token-sets',
        sourceView: 'tokens',
      },
    ];

    setDownloads(downloads);
    return () => clearDownloads();
  }, [
    tokens,
    characterTokens,
    reminderTokens,
    metaTokens,
    handleDownloadCharacterTokens,
    handleDownloadReminderTokens,
    handleDownloadMetaTokens,
    downloadPdf,
    isExporting,
    setDownloads,
    clearDownloads,
  ]);

  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <UnifiedErrorDisplay context="Tokens" error={error} onRetry={resetErrorBoundary} />
      )}
    >
      <ViewLayout variant="2-panel">
        {/* Left Sidebar - Presets and Options */}
        <ViewLayout.Panel position="left" width="left" scrollable>
          <PanelCoordinationProvider>
            <div className={layoutStyles.panelContent}>
              <details className={layoutStyles.sidebarCard}>
                <summary className={layoutStyles.sectionHeader}>Presets</summary>
                <div className={layoutStyles.optionSection}>
                  <PresetSection />
                </div>
              </details>

              <details className={layoutStyles.sidebarCard} open>
                <summary className={layoutStyles.sectionHeader}>Options</summary>
                <div className={layoutStyles.optionSection}>
                  <AppearancePanel
                    generationOptions={generationOptions}
                    onOptionChange={updateGenerationOptions}
                    characters={characters}
                  />
                </div>
              </details>
            </div>
          </PanelCoordinationProvider>
        </ViewLayout.Panel>

        {/* Right Content - Token Grid */}
        <ViewLayout.Panel position="right" width="flex" scrollable>
          <TokenPreviewRow />
          {/* Show notification when characters are excluded */}
          {characterSelectionSummary.disabled > 0 && !isLoading && (
            <div className={styles.exclusionNotice}>
              <span className={styles.exclusionIcon}>⚠</span>
              <span className={styles.exclusionText}>
                {characterSelectionSummary.disabled} character
                {characterSelectionSummary.disabled !== 1 ? 's' : ''} excluded
              </span>
              <button
                type="button"
                className={styles.exclusionLink}
                onClick={() => onTabChange('projects')}
              >
                Manage in Projects
              </button>
            </div>
          )}
          <TokenGrid
            tokens={displayTokens}
            onTokenClick={onTokenClick}
            onTabChange={onTabChange}
            cacheVersion={cacheReady}
          />
        </ViewLayout.Panel>
      </ViewLayout>
    </ErrorBoundary>
  );
}
