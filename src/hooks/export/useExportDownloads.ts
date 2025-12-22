/**
 * useExportDownloads Hook
 *
 * Aggregates all available downloads for the ExportView, organized by category.
 * Provides download items for Featured, JSON, Tokens, and Scripts sections.
 *
 * @module hooks/export/useExportDownloads
 */

import { useCallback, useMemo, useState } from 'react';
import type { BundleData, DownloadItem } from '@/contexts/DownloadsContext';
import { useNightOrder } from '@/contexts/NightOrderContext';
import { useTokenContext } from '@/contexts/TokenContext';
import { useExport } from '@/hooks';
import { createTokensZip, isMetaToken } from '@/ts/export/zipExporter.js';
import { downloadNightOrderPdf } from '@/ts/nightOrder/nightOrderPdfLib.js';
import type { Token } from '@/ts/types/index.js';
import { canvasToBlob, downloadFile } from '@/ts/utils/imageUtils.js';
import { logger } from '@/ts/utils/logger.js';
import { getOfficialScriptToolUrl } from '@/ts/utils/scriptEncoder.js';

export interface UseExportDownloadsResult {
  /** All download items */
  downloads: DownloadItem[];
  /** Featured downloads (always visible) */
  featuredDownloads: DownloadItem[];
  /** JSON downloads (script JSON, style format) */
  jsonDownloads: DownloadItem[];
  /** Token downloads (character, reminder, meta, print sheet, ZIP) */
  tokenDownloads: DownloadItem[];
  /** Script-related downloads (night order, player script, script PDF) */
  scriptDownloads: DownloadItem[];
  /** Currently executing download ID */
  executingId: string | null;
  /** Execute a download */
  executeDownload: (item: DownloadItem) => Promise<void>;
}

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

/**
 * Hook that aggregates all downloads for ExportView with categories.
 *
 * @example
 * ```tsx
 * const {
 *   featuredDownloads,
 *   jsonDownloads,
 *   tokenDownloads,
 *   scriptDownloads,
 *   executingId,
 *   executeDownload,
 * } = useExportDownloads();
 * ```
 */
export function useExportDownloads(): UseExportDownloadsResult {
  const { tokens, generationOptions, scriptMeta, jsonInput, getEnabledCharacters } =
    useTokenContext();

  const { downloadPdf, downloadJson, isExporting } = useExport();

  const { firstNight, otherNight } = useNightOrder();

  const [executingId, setExecutingId] = useState<string | null>(null);

  // Get enabled characters for filtering
  const enabledCharacters = useMemo(() => getEnabledCharacters(), [getEnabledCharacters]);
  const enabledCharacterUuids = useMemo(
    () => new Set(enabledCharacters.map((c) => c.uuid)),
    [enabledCharacters]
  );

  // Filter tokens by enabled characters
  const enabledTokens = useMemo(() => {
    return tokens.filter((t) => {
      // Meta tokens are always included
      if (isMetaToken(t)) return true;

      // Character tokens: check if the character is enabled via characterData.uuid
      if (t.type === 'character' && t.characterData?.uuid) {
        return enabledCharacterUuids.has(t.characterData.uuid);
      }

      // Reminder tokens: check if parent character is enabled
      if (t.type === 'reminder' && t.parentUuid) {
        return enabledCharacterUuids.has(t.parentUuid);
      }

      // Include tokens without UUID tracking (shouldn't happen, but safe fallback)
      return true;
    });
  }, [tokens, enabledCharacterUuids]);

  // Filter tokens by type (using enabled tokens)
  const characterTokens = useMemo(
    () => enabledTokens.filter((t) => t.type === 'character'),
    [enabledTokens]
  );
  const reminderTokens = useMemo(
    () => enabledTokens.filter((t) => t.type === 'reminder'),
    [enabledTokens]
  );
  const metaTokens = useMemo(() => enabledTokens.filter((t) => isMetaToken(t)), [enabledTokens]);

  const hasTokens = enabledTokens.length > 0;
  const hasCharacters = enabledCharacters.length > 0;
  const hasNightOrder =
    (firstNight?.entries.length ?? 0) > 0 || (otherNight?.entries.length ?? 0) > 0;

  // Download handlers for token sets
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
    } catch (error) {
      logger.error('useExportDownloads', 'Failed to download character tokens', error);
    }
  }, [characterTokens, generationOptions.pngSettings]);

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
    } catch (error) {
      logger.error('useExportDownloads', 'Failed to download reminder tokens', error);
    }
  }, [reminderTokens, generationOptions.pngSettings]);

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
    } catch (error) {
      logger.error('useExportDownloads', 'Failed to download meta tokens', error);
    }
  }, [metaTokens, generationOptions.pngSettings]);

  // Night Order PDF handler
  const handleDownloadNightOrder = useCallback(async () => {
    if (!(hasNightOrder && firstNight && otherNight)) return;
    try {
      const filename = scriptMeta?.name
        ? `${scriptMeta.name.replace(/[^a-zA-Z0-9]/g, '_')}_night_order.pdf`
        : 'night_order.pdf';
      await downloadNightOrderPdf(firstNight, otherNight, scriptMeta || null, filename, {
        includeFirstNight: true,
        includeOtherNight: true,
        showScriptName: true,
      });
    } catch (error) {
      logger.error('useExportDownloads', 'Failed to download night order PDF', error);
    }
  }, [firstNight, otherNight, scriptMeta, hasNightOrder]);

  // Script PDF (Official Tool) handler - uses enabled characters only
  const handleOpenScriptInOfficialTool = useCallback(() => {
    if (!hasCharacters) {
      logger.warn('useExportDownloads', 'No characters to export to script tool');
      return;
    }
    const scriptData = scriptMeta ? [scriptMeta, ...enabledCharacters] : enabledCharacters;
    const url = getOfficialScriptToolUrl(scriptData);
    logger.info('useExportDownloads', 'Opening official BOTC Script Tool', {
      characterCount: enabledCharacters.length,
      hasMeta: !!scriptMeta,
    });
    window.open(url, '_blank');
  }, [enabledCharacters, scriptMeta, hasCharacters]);

  // Build all downloads with categories
  const downloads = useMemo<DownloadItem[]>(() => {
    const items: DownloadItem[] = [];

    // === FEATURED DOWNLOADS ===

    // Token Print Sheet (PDF) - Featured
    items.push({
      id: 'pdf-print-sheet',
      icon: '🖨️',
      label: 'Token Print Sheet',
      description: hasTokens ? 'PDF for Avery labels' : 'Generate tokens first',
      action: downloadPdf,
      disabled: !hasTokens || isExporting,
      disabledReason: !hasTokens ? 'Generate tokens first' : 'Export in progress',
      category: 'tokens',
      featured: true,
      sourceView: 'export',
    });

    // Night Order PDF - Featured
    items.push({
      id: 'night-order-pdf',
      icon: '🌙',
      label: 'Night Order',
      description: scriptMeta?.name || 'First & Other nights',
      action: handleDownloadNightOrder,
      disabled: !hasNightOrder,
      disabledReason: 'Load a script first',
      category: 'script',
      featured: true,
      sourceView: 'export',
    });

    // Player Script - Featured (Coming Soon)
    items.push({
      id: 'player-script',
      icon: '📜',
      label: 'Player Script',
      description: 'Coming Soon',
      action: () => {},
      disabled: true,
      disabledReason: 'Coming soon',
      category: 'script',
      featured: true,
      sourceView: 'export',
    });

    // === JSON DOWNLOADS ===

    // Script JSON
    items.push({
      id: 'script-json',
      icon: '📋',
      label: 'Script JSON',
      description: scriptMeta?.name || 'Current script',
      action: downloadJson,
      disabled: !jsonInput?.trim() || isExporting,
      disabledReason: !jsonInput?.trim() ? 'No script data' : 'Export in progress',
      category: 'json',
      sourceView: 'export',
    });

    // === TOKEN DOWNLOADS ===

    // Character Tokens
    items.push({
      id: 'character-tokens',
      icon: '🎭',
      label: 'Character Tokens',
      description:
        characterTokens.length > 0
          ? `${characterTokens.length} tokens (ZIP)`
          : 'No character tokens',
      action: handleDownloadCharacterTokens,
      getBlob: () => tokensToBundleData(characterTokens),
      disabled: characterTokens.length === 0,
      disabledReason: 'No character tokens generated',
      category: 'tokens',
      sourceView: 'export',
    });

    // Reminder Tokens
    items.push({
      id: 'reminder-tokens',
      icon: '🔔',
      label: 'Reminder Tokens',
      description:
        reminderTokens.length > 0 ? `${reminderTokens.length} tokens (ZIP)` : 'No reminder tokens',
      action: handleDownloadReminderTokens,
      getBlob: () => tokensToBundleData(reminderTokens),
      disabled: reminderTokens.length === 0,
      disabledReason: 'No reminder tokens generated',
      category: 'tokens',
      sourceView: 'export',
    });

    // Meta Tokens
    items.push({
      id: 'meta-tokens',
      icon: '🔖',
      label: 'Meta Tokens',
      description: metaTokens.length > 0 ? `${metaTokens.length} tokens (ZIP)` : 'No meta tokens',
      action: handleDownloadMetaTokens,
      getBlob: () => tokensToBundleData(metaTokens),
      disabled: metaTokens.length === 0,
      disabledReason: 'No meta tokens generated',
      category: 'tokens',
      sourceView: 'export',
    });

    // Token Print Sheet (PDF) - Also in Tokens section
    items.push({
      id: 'token-print-sheet',
      icon: '🖨️',
      label: 'Token Print Sheet',
      description: hasTokens ? `${tokens.length} tokens (PDF)` : 'Generate tokens first',
      action: downloadPdf,
      disabled: !hasTokens || isExporting,
      disabledReason: !hasTokens ? 'Generate tokens first' : 'Export in progress',
      category: 'tokens',
      sourceView: 'export',
    });

    // === SCRIPT DOWNLOADS ===

    // Script PDF (Official Tool)
    items.push({
      id: 'script-pdf-official',
      icon: '📄',
      label: 'Script PDF',
      description: hasCharacters
        ? `Open in official BOTC Script Tool (${enabledCharacters.length} characters)`
        : 'No characters in script',
      action: handleOpenScriptInOfficialTool,
      disabled: !hasCharacters,
      disabledReason: !hasCharacters ? 'Add characters to your script first' : undefined,
      category: 'script',
      sourceView: 'export',
    });

    return items;
  }, [
    hasTokens,
    hasCharacters,
    hasNightOrder,
    characterTokens,
    reminderTokens,
    metaTokens,
    enabledCharacters,
    scriptMeta,
    jsonInput,
    isExporting,
    downloadPdf,
    downloadJson,
    handleDownloadCharacterTokens,
    handleDownloadReminderTokens,
    handleDownloadMetaTokens,
    handleDownloadNightOrder,
    handleOpenScriptInOfficialTool,
    tokens.length,
  ]);

  // Filter downloads by category
  const featuredDownloads = useMemo(() => downloads.filter((d) => d.featured), [downloads]);

  const jsonDownloads = useMemo(() => downloads.filter((d) => d.category === 'json'), [downloads]);

  const tokenDownloads = useMemo(
    () => downloads.filter((d) => d.category === 'tokens' && !d.featured),
    [downloads]
  );

  const scriptDownloads = useMemo(
    () => downloads.filter((d) => d.category === 'script'),
    [downloads]
  );

  // Execute download with loading state
  const executeDownload = useCallback(async (item: DownloadItem) => {
    if (item.disabled) return;

    try {
      setExecutingId(item.id);
      await item.action();
    } finally {
      setExecutingId(null);
    }
  }, []);

  return {
    downloads,
    featuredDownloads,
    jsonDownloads,
    tokenDownloads,
    scriptDownloads,
    executingId,
    executeDownload,
  };
}

export default useExportDownloads;
