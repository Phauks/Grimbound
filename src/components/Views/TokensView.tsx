import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TabType } from '@/components/Layout/TabNavigation';
import { ViewLayout } from '@/components/Layout/ViewLayout';
import { ErrorBoundary, ViewErrorFallback } from '@/components/Shared';
import { AdditionalOptionsPanel } from '@/components/Shared/Options/AdditionalOptionsPanel';
import { AdditionalTokensPanel } from '@/components/Shared/Options/AdditionalTokensPanel';
import { AppearancePanel } from '@/components/Shared/Options/AppearancePanel';
import { PresetSection } from '@/components/ViewComponents/TokensComponents/Presets/PresetSection';
import { TokenGrid } from '@/components/ViewComponents/TokensComponents/TokenGrid/TokenGrid';
import { TokenPreviewRow } from '@/components/ViewComponents/TokensComponents/TokenGrid/TokenPreviewRow';
import {
  type BundleData,
  type DownloadItem,
  useDownloadsContext,
} from '@/contexts/DownloadsContext';
import { useToast } from '@/contexts/ToastContext';
import { useTokenContext } from '@/contexts/TokenContext';
import { type CustomPreset, useExport, useMissingTokenGenerator, usePresets } from '@/hooks';
import layoutStyles from '@/styles/components/layout/ViewLayout.module.css';
import styles from '@/styles/components/views/Views.module.css';
import { createTokensZip, isMetaToken } from '@/ts/export/zipExporter';
import type { Token } from '@/ts/types/index';
import { canvasToBlob, downloadFile } from '@/ts/utils/imageUtils';
import { logger } from '@/ts/utils/logger';

/**
 * Convert tokens to bundle data (blobs with filenames)
 */
async function tokensToBundleData(tokens: Token[]): Promise<BundleData[]> {
  const results: BundleData[] = [];
  for (const token of tokens) {
    try {
      const blob = await canvasToBlob(token.canvas);
      if (blob) {
        results.push({ blob, filename: token.filename });
      }
    } catch {
      // Skip tokens that fail to convert
    }
  }
  return results;
}

interface TokensViewProps {
  onTokenClick: (token: Token) => void;
  onTabChange: (tab: TabType) => void;
}

export function TokensView({ onTokenClick, onTabChange }: TokensViewProps) {
  const {
    tokens,
    generationOptions,
    updateGenerationOptions,
    generationProgress,
    isLoading,
    characterSelectionSummary,
  } = useTokenContext();
  const { setDownloads, clearDownloads } = useDownloadsContext();
  const { addToast } = useToast();
  const { getCustomPresets } = usePresets();
  const { generateMissingTokens, hasMissingTokens } = useMissingTokenGenerator();
  const { downloadPdf, isExporting } = useExport();
  // Initialize with presets directly to avoid flash of empty state
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>(() => getCustomPresets());

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

  // Filter tokens by type
  const characterTokens = useMemo(() => tokens.filter((t) => t.type === 'character'), [tokens]);
  const reminderTokens = useMemo(() => tokens.filter((t) => t.type === 'reminder'), [tokens]);
  const metaTokens = useMemo(() => tokens.filter((t) => isMetaToken(t)), [tokens]);

  // Download handlers
  const handleDownloadCharacterTokens = useCallback(async () => {
    if (!characterTokens.length) return;

    try {
      const blob = await createTokensZip(
        characterTokens,
        null,
        {
          saveInTeamFolders: true,
          saveRemindersSeparately: false,
          metaTokenFolder: false,
          includeScriptJson: false,
          compressionLevel: 'normal',
        },
        undefined,
        generationOptions.pngSettings
      );
      downloadFile(blob, 'character_tokens.zip');
      addToast(`Downloaded ${characterTokens.length} character tokens`, 'success');
    } catch (error) {
      logger.error('TokensView', 'Failed to download character tokens', error);
      addToast('Failed to download character tokens', 'error');
    }
  }, [characterTokens, generationOptions.pngSettings, addToast]);

  const handleDownloadReminderTokens = useCallback(async () => {
    if (!reminderTokens.length) return;

    try {
      const blob = await createTokensZip(
        reminderTokens,
        null,
        {
          saveInTeamFolders: true,
          saveRemindersSeparately: false,
          metaTokenFolder: false,
          includeScriptJson: false,
          compressionLevel: 'normal',
        },
        undefined,
        generationOptions.pngSettings
      );
      downloadFile(blob, 'reminder_tokens.zip');
      addToast(`Downloaded ${reminderTokens.length} reminder tokens`, 'success');
    } catch (error) {
      logger.error('TokensView', 'Failed to download reminder tokens', error);
      addToast('Failed to download reminder tokens', 'error');
    }
  }, [reminderTokens, generationOptions.pngSettings, addToast]);

  const handleDownloadMetaTokens = useCallback(async () => {
    if (!metaTokens.length) return;

    try {
      const blob = await createTokensZip(
        metaTokens,
        null,
        {
          saveInTeamFolders: false,
          saveRemindersSeparately: false,
          metaTokenFolder: false,
          includeScriptJson: false,
          compressionLevel: 'normal',
        },
        undefined,
        generationOptions.pngSettings
      );
      downloadFile(blob, 'meta_tokens.zip');
      addToast(`Downloaded ${metaTokens.length} meta tokens`, 'success');
    } catch (error) {
      logger.error('TokensView', 'Failed to download meta tokens', error);
      addToast('Failed to download meta tokens', 'error');
    }
  }, [metaTokens, generationOptions.pngSettings, addToast]);

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
        disabledReason: !hasTokens ? 'Generate tokens first' : 'Export in progress',
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
          <div className={layoutStyles.panelContent}>
            <details className={layoutStyles.sidebarCard}>
              <summary className={layoutStyles.sectionHeader}>Presets</summary>
              <div className={layoutStyles.optionSection}>
                <PresetSection
                  customPresets={customPresets}
                  onCustomPresetsChange={setCustomPresets}
                  onShowSaveModal={() => {}}
                />
              </div>
            </details>

            <details className={layoutStyles.sidebarCard} open>
              <summary className={layoutStyles.sectionHeader}>Options</summary>
              <div className={layoutStyles.optionSection}>
                <AppearancePanel
                  generationOptions={generationOptions}
                  onOptionChange={updateGenerationOptions}
                />
              </div>
            </details>

            <details className={layoutStyles.sidebarCard} open>
              <summary className={layoutStyles.sectionHeader}>Advanced Options</summary>
              <div className={layoutStyles.optionSection}>
                <AdditionalOptionsPanel
                  generationOptions={generationOptions}
                  onOptionChange={updateGenerationOptions}
                />
              </div>
            </details>

            <details className={layoutStyles.sidebarCard} open>
              <summary className={layoutStyles.sectionHeader}>Additional Tokens</summary>
              <div className={layoutStyles.optionSection}>
                <AdditionalTokensPanel
                  generationOptions={generationOptions}
                  onOptionChange={updateGenerationOptions}
                />
              </div>
            </details>
          </div>
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
            </div>
          )}
          {isLoading && generationProgress && (
            <div className={styles.galleryHeader}>
              <div className={styles.generationProgress}>
                Generating {generationProgress.current}/{generationProgress.total}...
              </div>
            </div>
          )}
          <TokenGrid onTokenClick={onTokenClick} onTabChange={onTabChange} />
        </ViewLayout.Panel>
      </ViewLayout>
    </ErrorBoundary>
  );
}
