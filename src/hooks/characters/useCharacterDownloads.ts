/**
 * useCharacterDownloads Hook
 *
 * Manages character token download operations:
 * - Download character token as PNG
 * - Download reminder tokens as ZIP
 * - Download all tokens as ZIP
 * - Download character definition as JSON
 * - Registers downloads with DownloadsContext
 *
 * Extracted from CharactersView for better separation of concerns.
 *
 * @module hooks/characters/useCharacterDownloads
 */

import { useCallback, useEffect, useState } from 'react';
import type { BundleData, DownloadItem } from '@/contexts/DownloadsContext';
import type { Character, Token } from '@/ts/types/index.js';
import {
  downloadCharacterTokenOnly,
  downloadCharacterTokensAsZip,
  downloadReminderTokensOnly,
} from '@/ts/ui/detailViewUtils.js';
import { getTokenBlob } from '@/ts/utils/imageUtils.js';
import { logger } from '@/ts/utils/logger.js';

export interface UseCharacterDownloadsOptions {
  /** The character token to display/download */
  displayCharacterToken: Token | null;
  /** The reminder tokens to display/download */
  displayReminderTokens: Token[];
  /** The edited character (for JSON export) */
  editedCharacter: Character | null;
  /** The selected character from source data */
  selectedCharacter: Character | undefined;
  /** Whether meta is selected (hides character downloads) */
  isMetaSelected: boolean;
  /** Toast notification function */
  addToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  /** Set downloads for DownloadsContext */
  setDownloads: (downloads: DownloadItem[]) => void;
  /** Clear downloads on unmount */
  clearDownloads: () => void;
}

export interface UseCharacterDownloadsResult {
  /** Download all tokens (character + reminders) as ZIP */
  handleDownloadAll: () => Promise<void>;
  /** Download character token only as PNG */
  handleDownloadCharacter: () => void;
  /** Download reminder tokens only as ZIP */
  handleDownloadReminders: () => Promise<void>;
  /** Download character definition as JSON */
  handleDownloadJson: () => void;
  /** Whether a download is in progress */
  isDownloading: boolean;
}

/**
 * Hook for managing character download operations.
 *
 * @example
 * ```tsx
 * const {
 *   handleDownloadAll,
 *   handleDownloadCharacter,
 *   isDownloading,
 * } = useCharacterDownloads({
 *   displayCharacterToken,
 *   displayReminderTokens,
 *   editedCharacter,
 *   selectedCharacter,
 *   isMetaSelected,
 *   addToast,
 *   setDownloads,
 *   clearDownloads,
 * });
 * ```
 */
export function useCharacterDownloads({
  displayCharacterToken,
  displayReminderTokens,
  editedCharacter,
  selectedCharacter,
  isMetaSelected,
  addToast,
  setDownloads,
  clearDownloads,
}: UseCharacterDownloadsOptions): UseCharacterDownloadsResult {
  const [isDownloading, setIsDownloading] = useState(false);

  // Get character data (prefer edited over selected)
  const charData = editedCharacter || selectedCharacter;

  // Download all tokens as ZIP
  const handleDownloadAll = async () => {
    if (!displayCharacterToken) return;

    setIsDownloading(true);
    try {
      await downloadCharacterTokensAsZip(
        displayCharacterToken,
        displayReminderTokens,
        selectedCharacter?.name || charData?.name || 'character',
        charData
      );
      addToast(`Downloaded ${selectedCharacter?.name} tokens`, 'success');
    } catch (error) {
      logger.error('useCharacterDownloads', 'Failed to download tokens', error);
      addToast('Failed to download tokens', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  // Download character token only
  const handleDownloadCharacter = useCallback(() => {
    if (!displayCharacterToken) return;

    setIsDownloading(true);
    try {
      downloadCharacterTokenOnly(displayCharacterToken, selectedCharacter?.name || 'character');
      addToast(`Downloaded ${selectedCharacter?.name} character token`, 'success');
    } catch (error) {
      logger.error('useCharacterDownloads', 'Failed to download character token', error);
      addToast('Failed to download character token', 'error');
    } finally {
      setIsDownloading(false);
    }
  }, [displayCharacterToken, selectedCharacter, addToast]);

  // Download reminder tokens only
  const handleDownloadReminders = useCallback(async () => {
    if (displayReminderTokens.length === 0) {
      addToast('No reminder tokens to download', 'warning');
      return;
    }

    setIsDownloading(true);
    try {
      await downloadReminderTokensOnly(
        displayReminderTokens,
        selectedCharacter?.name || 'character'
      );
      addToast(`Downloaded ${selectedCharacter?.name} reminder tokens`, 'success');
    } catch (error) {
      logger.error('useCharacterDownloads', 'Failed to download reminder tokens', error);
      addToast('Failed to download reminder tokens', 'error');
    } finally {
      setIsDownloading(false);
    }
  }, [displayReminderTokens, selectedCharacter, addToast]);

  // Download character JSON
  const handleDownloadJson = useCallback(() => {
    if (!charData) return;

    // Strip internal fields (uuid, source) from exported JSON
    const { uuid, source, ...exportableChar } = charData;
    const jsonText = JSON.stringify(exportableChar, null, 2);
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${charData.id || charData.name || 'character'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast(`Downloaded ${charData.name}.json`, 'success');
  }, [charData, addToast]);

  // Register downloads with DownloadsContext - always register with proper disabled states
  useEffect(() => {
    const hasCharacter = !!charData && !isMetaSelected;
    const hasCharacterToken = !!displayCharacterToken;
    const hasReminderTokens = displayReminderTokens.length > 0;

    // Always register downloads, but disable when no character or meta selected
    const downloads: DownloadItem[] = [
      {
        id: 'character-token',
        icon: '🎴',
        label: 'Character Token',
        description: hasCharacter && charData?.name ? `${charData.name} PNG` : 'Select a character',
        action: handleDownloadCharacter,
        getBlob: async (): Promise<BundleData | null> => {
          if (!displayCharacterToken) return null;
          try {
            const blob = getTokenBlob(displayCharacterToken);
            return { blob, filename: displayCharacterToken.filename };
          } catch {
            return null;
          }
        },
        disabled: !(hasCharacter && hasCharacterToken),
        disabledReason: hasCharacter ? 'Generate token first' : 'Select a character',
        category: 'character',
        sourceView: 'characters',
      },
      {
        id: 'reminder-tokens',
        icon: '🔔',
        label: 'Reminder Tokens',
        description:
          hasCharacter && hasReminderTokens
            ? `${displayReminderTokens.length} reminders (ZIP)`
            : hasCharacter
              ? 'No reminders'
              : 'Select a character',
        action: handleDownloadReminders,
        getBlob: async (): Promise<BundleData[]> => {
          const results: BundleData[] = [];
          for (const token of displayReminderTokens) {
            try {
              const blob = getTokenBlob(token);
              results.push({ blob, filename: token.filename });
            } catch {
              // Skip tokens that fail to convert
            }
          }
          return results;
        },
        disabled: !(hasCharacter && hasReminderTokens),
        disabledReason: hasCharacter ? 'No reminder tokens' : 'Select a character',
        category: 'character',
        sourceView: 'characters',
      },
      {
        id: 'character-json',
        icon: '📄',
        label: 'Character JSON',
        description:
          hasCharacter && charData?.name ? `${charData.name}.json` : 'Select a character',
        action: handleDownloadJson,
        getBlob: async (): Promise<BundleData | null> => {
          if (!charData) return null;
          const { uuid, source, ...exportableChar } = charData;
          const jsonText = JSON.stringify(exportableChar, null, 2);
          const blob = new Blob([jsonText], { type: 'application/json' });
          return { blob, filename: `${charData.id || charData.name || 'character'}.json` };
        },
        disabled: !hasCharacter,
        disabledReason: 'Select a character',
        category: 'character',
        sourceView: 'characters',
      },
    ];

    setDownloads(downloads);
    return () => clearDownloads();
  }, [
    charData,
    displayCharacterToken,
    displayReminderTokens,
    isMetaSelected,
    handleDownloadCharacter,
    handleDownloadReminders,
    handleDownloadJson,
    setDownloads,
    clearDownloads,
  ]);

  return {
    handleDownloadAll,
    handleDownloadCharacter,
    handleDownloadReminders,
    handleDownloadJson,
    isDownloading,
  };
}
