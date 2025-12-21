import { useCallback, useMemo, useRef, useState } from 'react';
import { useTokenContext } from '@/contexts/TokenContext';
import { createCompletePackage } from '@/ts/export/completePackageExporter.js';
import { PDFGenerator } from '@/ts/export/pdfGenerator.js';
import { createTokensZip } from '@/ts/export/zipExporter.js';
import type { ProgressCallback } from '@/ts/types/index.js';
import {
  downloadFile,
  getCleanJsonForExport,
  logger,
  sanitizeFilename,
} from '@/ts/utils/index.js';

export type ExportStep = 'zip' | 'pdf' | 'json' | 'style' | 'tokens' | null;

interface DownloadOptions {
  step: ExportStep;
  filename: string;
  requiresTokens?: boolean;
  requiresJson?: boolean;
  exportFn: (progressCallback?: ProgressCallback) => Promise<Blob | undefined>;
}

export function useExport() {
  const { tokens, generationOptions, scriptMeta, jsonInput, enabledCharacterUuids } = useTokenContext();
  const [isExporting, setIsExporting] = useState(false);

  // Filter tokens to only include those from enabled characters
  // Meta tokens are always included
  const enabledTokens = useMemo(() => {
    return tokens.filter((token) => {
      // Meta tokens (script-name, almanac, pandemonium, bootlegger) are always included
      if (
        token.type === 'script-name' ||
        token.type === 'almanac' ||
        token.type === 'pandemonium' ||
        token.type === 'bootlegger'
      ) {
        return true;
      }

      // Character tokens: check characterData.uuid
      if (token.type === 'character' && token.characterData?.uuid) {
        return enabledCharacterUuids.has(token.characterData.uuid);
      }

      // Reminder tokens: check parentUuid (links to parent character)
      if (token.type === 'reminder' && token.parentUuid) {
        return enabledCharacterUuids.has(token.parentUuid);
      }

      // Include tokens without UUID tracking (shouldn't happen, but safe fallback)
      return true;
    });
  }, [tokens, enabledCharacterUuids]);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(
    null
  );
  const [exportStep, setExportStep] = useState<ExportStep>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  // Track if we're in a downloadAll operation to avoid resetting state
  const isDownloadingAllRef = useRef(false);

  const getBaseFilename = useCallback(() => {
    if (scriptMeta?.name) {
      return sanitizeFilename(scriptMeta.name);
    }
    return 'clocktower_tokens';
  }, [scriptMeta]);

  // Cancel any in-progress export
  const cancelExport = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    isDownloadingAllRef.current = false;
    setIsExporting(false);
    setExportProgress(null);
    setExportStep(null);
  }, []);

  // Unified download function that handles all export types
  const executeDownload = useCallback(
    async (options: DownloadOptions) => {
      const { step, filename, requiresTokens = false, requiresJson = false, exportFn } = options;

      // Validation - use enabledTokens for token-based exports
      if (requiresTokens && enabledTokens.length === 0) return;
      if (requiresJson && !jsonInput) return;

      const isPartOfDownloadAll = isDownloadingAllRef.current;

      // Only initialize state if this is a standalone call
      if (!isPartOfDownloadAll) {
        cancelExport();
        abortControllerRef.current = new AbortController();
        setIsExporting(true);
        setExportStep(step);
      }

      try {
        // Create progress callback if needed
        const progressCallback: ProgressCallback | undefined = requiresTokens
          ? (current, total) => {
              if (abortControllerRef.current?.signal.aborted) {
                throw new DOMException('Export cancelled', 'AbortError');
              }
              setExportProgress({ current, total });
            }
          : undefined;

        // Set initial progress for token-based exports
        if (requiresTokens && progressCallback) {
          setExportProgress({ current: 0, total: enabledTokens.length });
        }

        // Execute the export function
        const result = await exportFn(progressCallback);

        // Check if cancelled before downloading
        if (abortControllerRef.current?.signal.aborted) {
          throw new DOMException('Export cancelled', 'AbortError');
        }

        // Download the file if a blob was returned
        if (result instanceof Blob) {
          downloadFile(result, filename);
        }
      } catch (error) {
        // Don't log abort errors as they're intentional
        if (error instanceof DOMException && error.name === 'AbortError') {
          logger.debug('useExport', `${step} export cancelled`);
          return;
        }
        logger.error('useExport', `${step} export error:`, error);
        throw error;
      } finally {
        // Only reset state if this is a standalone call
        if (!isPartOfDownloadAll) {
          setIsExporting(false);
          setExportProgress(null);
          setExportStep(null);
          abortControllerRef.current = null;
        }
      }
    },
    [enabledTokens, jsonInput, cancelExport]
  );

  const downloadZip = useCallback(async () => {
    const zipSettings = {
      saveInTeamFolders: generationOptions.zipSettings?.saveInTeamFolders ?? true,
      saveRemindersSeparately: generationOptions.zipSettings?.saveRemindersSeparately ?? true,
      metaTokenFolder: generationOptions.zipSettings?.metaTokenFolder ?? true,
      includeScriptJson: generationOptions.zipSettings?.includeScriptJson ?? false,
      compressionLevel: generationOptions.zipSettings?.compressionLevel ?? ('normal' as const),
    };

    await executeDownload({
      step: 'zip',
      filename: `${getBaseFilename()}.zip`,
      requiresTokens: true,
      exportFn: async (progressCallback) => {
        return await createTokensZip(
          enabledTokens,
          progressCallback ?? null,
          zipSettings,
          zipSettings.includeScriptJson ? jsonInput : undefined,
          generationOptions.pngSettings
        );
      },
    });
  }, [enabledTokens, generationOptions, jsonInput, getBaseFilename, executeDownload]);

  const downloadPdf = useCallback(async () => {
    const pdfGenerator = new PDFGenerator({
      tokenPadding: generationOptions.pdfPadding ?? 0.25, // Default 1/4" padding
      xOffset: generationOptions.pdfXOffset ?? 0, // Inches
      yOffset: generationOptions.pdfYOffset ?? 0, // Inches
      imageQuality: generationOptions.pdfImageQuality ?? 0.9,
      bleed: generationOptions.pdfBleed ?? 0.125, // Default 1/8" bleed
    });

    await executeDownload({
      step: 'pdf',
      filename: `${getBaseFilename()}.pdf`,
      requiresTokens: true,
      exportFn: async (progressCallback) => {
        await pdfGenerator.downloadPDF(
          enabledTokens,
          `${getBaseFilename()}.pdf`,
          progressCallback ?? null
        );
        return undefined;
      },
    });
  }, [enabledTokens, generationOptions, getBaseFilename, executeDownload]);

  const downloadJson = useCallback(async () => {
    await executeDownload({
      step: 'json',
      filename: `${getBaseFilename()}.json`,
      requiresJson: true,
      exportFn: async () => {
        // Strip internal fields (uuid) from exported JSON
        const cleanJson = getCleanJsonForExport(jsonInput);
        return new Blob([cleanJson], { type: 'application/json' });
      },
    });
  }, [jsonInput, getBaseFilename, executeDownload]);

  const downloadStyleFormat = useCallback(async () => {
    await executeDownload({
      step: 'style',
      filename: `${getBaseFilename()}_style.json`,
      exportFn: async () => {
        const styleData = {
          version: '1.0',
          name: scriptMeta?.name ? `${scriptMeta.name} Style` : 'Custom Style',
          generationOptions,
          exportedAt: new Date().toISOString(),
        };
        return new Blob([JSON.stringify(styleData, null, 2)], { type: 'application/json' });
      },
    });
  }, [generationOptions, scriptMeta, getBaseFilename, executeDownload]);

  const downloadAll = useCallback(async () => {
    if (enabledTokens.length === 0) return;

    // Mark that we're in a downloadAll operation
    isDownloadingAllRef.current = true;
    abortControllerRef.current = new AbortController();

    try {
      setIsExporting(true);

      const baseFilename = getBaseFilename();
      const zipSettings = {
        saveInTeamFolders: generationOptions.zipSettings?.saveInTeamFolders ?? true,
        saveRemindersSeparately: generationOptions.zipSettings?.saveRemindersSeparately ?? true,
        metaTokenFolder: generationOptions.zipSettings?.metaTokenFolder ?? true,
        includeScriptJson: false,
        compressionLevel: generationOptions.zipSettings?.compressionLevel ?? ('normal' as const),
      };

      const blob = await createCompletePackage({
        tokens: enabledTokens,
        scriptJson: jsonInput,
        generationOptions,
        zipSettings,
        scriptMeta,
        baseFilename,
        signal: abortControllerRef.current.signal,
        progressCallback: (step, current, total) => {
          setExportStep(step);
          setExportProgress({ current, total });
        },
      });

      downloadFile(blob, `${baseFilename}_complete.zip`);
    } catch (error) {
      // Don't log abort errors as they're intentional
      if (error instanceof DOMException && error.name === 'AbortError') {
        logger.debug('useExport', 'Download All cancelled');
        return;
      }
      logger.error('useExport', 'Download All error:', error);
      throw error;
    } finally {
      isDownloadingAllRef.current = false;
      abortControllerRef.current = null;
      setIsExporting(false);
      setExportProgress(null);
      setExportStep(null);
    }
  }, [enabledTokens, generationOptions, scriptMeta, jsonInput, getBaseFilename]);

  return {
    downloadZip,
    downloadPdf,
    downloadJson,
    downloadStyleFormat,
    downloadAll,
    cancelExport,
    isExporting,
    exportProgress,
    exportStep,
    getBaseFilename,
  };
}
