import { useCallback, useEffect, useMemo, useState } from 'react';
import { type DownloadItem, useDownloadsContext } from '../../contexts/DownloadsContext';
import { useToast } from '../../contexts/ToastContext';
import { useTokenContext } from '../../contexts/TokenContext';
import { type CustomPreset, usePresets } from '../../hooks/usePresets';
import layoutStyles from '../../styles/components/layout/ViewLayout.module.css';
import styles from '../../styles/components/views/Views.module.css';
import { createTokensZip, isMetaToken } from '../../ts/export/zipExporter';
import type { Token } from '../../ts/types/index';
import { downloadFile } from '../../ts/utils/imageUtils';
import { logger } from '../../ts/utils/logger';
import type { TabType } from '../Layout/TabNavigation';
import { ViewLayout } from '../Layout/ViewLayout';
import { AdditionalOptionsPanel } from '../Shared/Options/AdditionalOptionsPanel';
import { AppearancePanel } from '../Shared/Options/AppearancePanel';
import { PresetSection } from '../ViewComponents/TokensComponents/Presets/PresetSection';
import { TokenGrid } from '../ViewComponents/TokensComponents/TokenGrid/TokenGrid';
import { TokenPreviewRow } from '../ViewComponents/TokensComponents/TokenGrid/TokenPreviewRow';

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
    jsonInput,
  } = useTokenContext();
  const { setDownloads, clearDownloads } = useDownloadsContext();
  const { addToast } = useToast();
  const { getCustomPresets } = usePresets();
  // Initialize with presets directly to avoid flash of empty state
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>(() => getCustomPresets());

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

  const handleDownloadAllTokens = useCallback(async () => {
    if (!tokens.length) return;

    try {
      const blob = await createTokensZip(
        tokens,
        null,
        {
          saveInTeamFolders: true,
          saveRemindersSeparately: true,
          metaTokenFolder: true,
          includeScriptJson: true,
          compressionLevel: 'normal',
        },
        jsonInput,
        generationOptions.pngSettings
      );
      downloadFile(blob, 'all_tokens.zip');
      addToast(`Downloaded ${tokens.length} tokens`, 'success');
    } catch (error) {
      logger.error('TokensView', 'Failed to download all tokens', error);
      addToast('Failed to download all tokens', 'error');
    }
  }, [tokens, jsonInput, generationOptions.pngSettings, addToast]);

  // Register downloads for this view
  useEffect(() => {
    const downloads: DownloadItem[] = [];

    if (tokens.length > 0) {
      downloads.push(
        {
          id: 'character-tokens',
          icon: '🎭',
          label: 'Character Tokens',
          description:
            characterTokens.length > 0
              ? `${characterTokens.length} tokens (ZIP)`
              : 'No character tokens',
          action: handleDownloadCharacterTokens,
          disabled: characterTokens.length === 0,
          disabledReason: 'No character tokens generated',
        },
        {
          id: 'reminder-tokens',
          icon: '🔔',
          label: 'Reminder Tokens',
          description:
            reminderTokens.length > 0
              ? `${reminderTokens.length} tokens (ZIP)`
              : 'No reminder tokens',
          action: handleDownloadReminderTokens,
          disabled: reminderTokens.length === 0,
          disabledReason: 'No reminder tokens generated',
        },
        {
          id: 'meta-tokens',
          icon: '📜',
          label: 'Meta Tokens',
          description:
            metaTokens.length > 0 ? `${metaTokens.length} tokens (ZIP)` : 'No meta tokens',
          action: handleDownloadMetaTokens,
          disabled: metaTokens.length === 0,
          disabledReason: 'No meta tokens generated',
        },
        {
          id: 'all-tokens',
          icon: '📦',
          label: 'All Tokens',
          description: `${tokens.length} tokens + script.json (ZIP)`,
          action: handleDownloadAllTokens,
          disabled: false,
        }
      );
    }

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
    handleDownloadAllTokens,
    setDownloads,
    clearDownloads,
  ]);

  return (
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
            <summary className={layoutStyles.sectionHeader}>Additional Options</summary>
            <div className={layoutStyles.optionSection}>
              <AdditionalOptionsPanel
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
        <div className={styles.galleryHeader}>
          {isLoading && generationProgress && (
            <div className={styles.generationProgress}>
              Generating {generationProgress.current}/{generationProgress.total}...
            </div>
          )}
        </div>
        <TokenGrid onTokenClick={onTokenClick} onTabChange={onTabChange} />
      </ViewLayout.Panel>
    </ViewLayout>
  );
}
