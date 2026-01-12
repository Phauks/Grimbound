/**
 * Hook for Script PDF Download Options
 *
 * Registers download options for the Script view in the Downloads drawer.
 * Currently provides:
 * - "Script PDF (Official Tool)" - Opens script in official BOTC Script Tool
 *
 * Future options will include:
 * - Custom print view with local PDF generation
 *
 * @module hooks/export/useScriptPdfDownloads
 */

import { useCallback, useEffect } from 'react';
import { type DownloadItem, useDownloadsContext } from '@/contexts/DownloadsContext';
import type { Character, ScriptMeta } from '@/ts/types/index';
import { logger } from '@/ts/utils/logger.js';
import { getOfficialScriptToolUrl } from '@/ts/utils/scriptEncoder.js';

export interface UseScriptPdfDownloadsOptions {
  /** Array of characters in the script */
  characters: Character[];
  /** Optional script metadata */
  scriptMeta?: ScriptMeta | null;
}

/**
 * Hook to register script PDF download options in the Downloads drawer
 *
 * @param options - Characters and metadata for the script
 *
 * @example
 * ```tsx
 * function ScriptView() {
 *   const { characters, scriptMeta } = useTokenContext();
 *
 *   // Register downloads when this view is mounted
 *   useScriptPdfDownloads({ characters, scriptMeta });
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function useScriptPdfDownloads({ characters, scriptMeta }: UseScriptPdfDownloadsOptions) {
  const { setDownloads, clearDownloads } = useDownloadsContext();

  // Build the script data array for encoding
  const scriptData = (() => {
    if (!characters || characters.length === 0) {
      return [];
    }

    // Include meta if present, followed by characters
    if (scriptMeta) {
      return [scriptMeta, ...characters];
    }
    return characters;
  })();

  // Handler to open in official tool
  const handleOpenInOfficialTool = useCallback(() => {
    if (scriptData.length === 0) {
      logger.warn('ScriptPdfDownloads', 'No script data to export');
      return;
    }

    const url = getOfficialScriptToolUrl(scriptData);
    logger.info('ScriptPdfDownloads', 'Opening official BOTC Script Tool', {
      characterCount: characters.length,
      hasMeta: !!scriptMeta,
    });

    window.open(url, '_blank');
  }, [scriptData, characters.length, scriptMeta]);

  // Build download items
  const hasCharacters = characters && characters.length > 0;
  const characterCount = characters?.length ?? 0;

  // Register/unregister downloads when content changes
  useEffect(() => {
    const downloads: DownloadItem[] = [
      {
        id: 'script-pdf-official',
        icon: '📜',
        label: 'Script PDF',
        description: hasCharacters
          ? `Open in official BOTC Script Tool (${characterCount} characters)`
          : 'No characters in script',
        action: handleOpenInOfficialTool,
        disabled: !hasCharacters,
        disabledReason: hasCharacters ? undefined : 'Add characters to your script first',
        category: 'script',
        sourceView: 'script',
      },
    ];
    setDownloads(downloads);
    return () => clearDownloads();
  }, [hasCharacters, characterCount, handleOpenInOfficialTool, setDownloads, clearDownloads]);
}
