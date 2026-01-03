import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TabType } from '@/components/Layout/TabNavigation';
import { ViewLayout } from '@/components/Layout/ViewLayout';
import { ErrorBoundary, ViewErrorFallback } from '@/components/Shared';
import { AppearancePanel } from '@/components/Shared/Options/AppearancePanel';
import { PresetSection } from '@/components/ViewComponents/TokensComponents/Presets/PresetSection';
import { TokenGrid } from '@/components/ViewComponents/TokensComponents/TokenGrid/TokenGrid';
import { TokenPreviewRow } from '@/components/ViewComponents/TokensComponents/TokenGrid/TokenPreviewRow';
import { type DownloadItem, useDownloadsContext } from '@/contexts/DownloadsContext';
import { PanelCoordinationProvider } from '@/contexts/PanelCoordinationContext';
import { useToast } from '@/contexts/ToastContext';
import { useTokenContext } from '@/contexts/TokenContext';
import { useExport, useMissingTokenGenerator } from '@/hooks';
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
  const { downloadPdf, isExporting } = useExport();

  // Ref to ensure missing token check only runs once per mount
  const hasCheckedMissingRef = useRef(false);

  // Generate missing tokens on mount (if any characters don't have tokens)
  // The ref guard prevents re-triggering when function references change due to token updates
  // The hash check in useMissingTokenGenerator provides additional protection
  useEffect(() => {
    if (hasCheckedMissingRef.current) return;
    hasCheckedMissingRef.current = true;

    if (hasMissingTokens()) {
      generateMissingTokens();
    }
  }, [hasMissingTokens, generateMissingTokens]);

  // Cache version is now managed by useTokenGenerator which pre-renders during generation
  // This value triggers re-render if tokens need to be re-cached (e.g., after tab switch)
  const [cacheReady] = useState(0);

  // Filter tokens to only show enabled characters (meta tokens always shown)
  const displayTokens = useMemo(() => {
    return tokens.filter((t) => {
      // Meta tokens always shown
      if (isMetaToken(t)) return true;
      // Character/reminder tokens filtered by enabled status
      return t.parentUuid && enabledCharacterUuids.has(t.parentUuid);
    });
  }, [tokens, enabledCharacterUuids]);

  // Filter tokens by type (using filtered display tokens)
  const characterTokens = useMemo(
    () => displayTokens.filter((t) => t.type === 'character'),
    [displayTokens]
  );
  const reminderTokens = useMemo(
    () => displayTokens.filter((t) => t.type === 'reminder'),
    [displayTokens]
  );
  const metaTokens = useMemo(() => displayTokens.filter((t) => isMetaToken(t)), [displayTokens]);

  // Factory for creating download handlers - reduces repetition
  const createDownloadHandler = useCallback(
    (tokenList: Token[], filename: string, tokenType: string, useTeamFolders: boolean) =>
      async () => {
        if (tokenList.length === 0) return;
        try {
          const blob = await createTokensZip(tokenList, null, {
            saveInTeamFolders: useTeamFolders,
            saveRemindersSeparately: false,
            metaTokenFolder: false,
            includeScriptJson: false,
            compressionLevel: 'normal',
          });
          downloadFile(blob, filename);
          addToast(`Downloaded ${tokenList.length} ${tokenType} tokens`, 'success');
        } catch (error) {
          logger.error('TokensView', `Failed to download ${tokenType} tokens`, error);
          addToast(`Failed to download ${tokenType} tokens`, 'error');
        }
      },
    [addToast]
  );

  // Download handlers using factory
  const handleDownloadCharacterTokens = useMemo(
    () => createDownloadHandler(characterTokens, 'character_tokens.zip', 'character', true),
    [createDownloadHandler, characterTokens]
  );

  const handleDownloadReminderTokens = useMemo(
    () => createDownloadHandler(reminderTokens, 'reminder_tokens.zip', 'reminder', true),
    [createDownloadHandler, reminderTokens]
  );

  const handleDownloadMetaTokens = useMemo(
    () => createDownloadHandler(metaTokens, 'meta_tokens.zip', 'meta', false),
    [createDownloadHandler, metaTokens]
  );

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
        <ViewErrorFallback view="Tokens" error={error} onRetry={resetErrorBoundary} />
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
