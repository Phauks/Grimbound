/**
 * useAssetPreviewGenerator Hook
 *
 * Generates live token previews for asset selection in the Asset Manager.
 * Handles debounced generation, loading states, and cleanup.
 *
 * @module hooks/assets/useAssetPreviewGenerator
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDataSync } from '@/contexts/DataSyncContext.js';
import { useTokenContext } from '@/contexts/TokenContext.js';
import { FALLBACK_PREVIEW_CHARACTER_ID } from '@/ts/constants.js';
import { getBestPreviewCharacter } from '@/ts/data/characterUtils.js';
import { TokenGenerator } from '@/ts/generation/index.js';
import { createAssetReference } from '@/ts/services/upload/assetResolver.js';
import type { AssetType } from '@/ts/services/upload/index.js';
import { DEFAULT_BACKGROUND_STYLE } from '@/ts/types/backgroundEffects.js';
import type { BackgroundStyle, Character, GenerationOptions } from '@/ts/types/index.js';
import { logger } from '@/ts/utils/logger.js';

// ============================================================================
// Types
// ============================================================================

/** Token type for preview generation */
export type PreviewTokenType = 'character' | 'reminder' | 'meta';

export interface UseAssetPreviewGeneratorOptions {
  /** Generation options for live preview (enables preview) */
  generationOptions?: GenerationOptions;
  /** Which token type to show in preview (defaults to 'character') */
  previewTokenType?: PreviewTokenType;
  /** Current asset type filter */
  assetType?: AssetType | 'all';
  /** Initial asset type filter (for fallback) */
  initialAssetType?: AssetType;
  /** Selected asset ID (null, 'none', 'builtin:*', or user asset ID) */
  selectedAssetId: string | null;
  /** Debounce delay in ms (default: 150) */
  debounceMs?: number;
}

export interface UseAssetPreviewGeneratorReturn {
  /** Generated preview URL (data URL) */
  previewUrl: string | null;
  /** Whether preview is currently generating */
  isGenerating: boolean;
  /** Whether preview panel should be shown */
  showPreviewPanel: boolean;
  /** Character used for preview */
  sampleCharacter: Character | null;
  /** Reminder text used for reminder token preview */
  sampleReminderText: string;
}

// ============================================================================
// Hook
// ============================================================================

const DEBOUNCE_DELAY_MS = 150;

/**
 * Hook for generating asset preview tokens with debouncing
 */
export function useAssetPreviewGenerator(
  options: UseAssetPreviewGeneratorOptions
): UseAssetPreviewGeneratorReturn {
  const {
    generationOptions,
    previewTokenType = 'character',
    assetType,
    initialAssetType,
    selectedAssetId,
    debounceMs = DEBOUNCE_DELAY_MS,
  } = options;

  // Preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const generationIdRef = useRef(0);

  // Get character data from context for preview
  const { characters, scriptMeta, exampleToken } = useTokenContext();

  // Get official character data for fallback preview
  const { getCharacter, isInitialized: isSyncInitialized } = useDataSync();
  const [officialFallbackCharacter, setOfficialFallbackCharacter] = useState<Character | null>(
    null
  );

  // Fetch the official fallback character from synced data
  useEffect(() => {
    if (!isSyncInitialized) return;

    let mounted = true;
    getCharacter(FALLBACK_PREVIEW_CHARACTER_ID).then((character) => {
      if (mounted && character) {
        setOfficialFallbackCharacter(character);
      }
    });

    return () => {
      mounted = false;
    };
  }, [getCharacter, isSyncInitialized]);

  // Get the character for preview - prioritize example token, then best preview candidate
  const sampleCharacter = useMemo((): Character | null => {
    // If there's an example token set, use its character data
    if (exampleToken?.characterData) {
      return exampleToken.characterData;
    }
    // Use centralized selection logic (matches TokenPreviewRow)
    const bestPreview = getBestPreviewCharacter(characters);
    if (bestPreview) return bestPreview;

    // Use official character from synced data (null if not yet loaded)
    return officialFallbackCharacter;
  }, [characters, exampleToken, officialFallbackCharacter]);

  // Sample reminder text for reminder token preview
  const sampleReminderText = useMemo(() => {
    if (sampleCharacter?.reminders && sampleCharacter.reminders.length > 0) {
      return sampleCharacter.reminders[0];
    }
    return 'Reminder';
  }, [sampleCharacter]);

  // Map asset type to generation option property based on preview token type
  const getPreviewOptions = useCallback(
    (assetValue: string | null): Partial<GenerationOptions> => {
      if (!assetValue || assetValue === 'none') return {};

      const effectiveAssetType = initialAssetType || assetType;

      // Handle token backgrounds based on which token type we're previewing
      if (effectiveAssetType === 'token-background') {
        const imageStyle: BackgroundStyle = {
          ...DEFAULT_BACKGROUND_STYLE,
          sourceType: 'image',
          imageUrl: assetValue,
        };

        switch (previewTokenType) {
          case 'reminder':
            return { reminderBackgroundStyle: imageStyle };
          case 'meta':
            return { metaBackgroundStyle: imageStyle };
          default:
            return { characterBackgroundStyle: imageStyle };
        }
      }

      // Handle other asset types
      switch (effectiveAssetType) {
        case 'setup-overlay':
          return { setupStyle: assetValue };
        case 'accent':
          return { accentGeneration: assetValue };
        case 'script-background':
          return {
            metaBackgroundType: 'image' as const,
            metaBackground: assetValue,
          };
        default:
          return {};
      }
    },
    [initialAssetType, assetType, previewTokenType]
  );

  // Generate preview when modal opens or selection changes
  useEffect(() => {
    // Skip if no generation options provided
    if (!generationOptions) {
      setPreviewUrl(null);
      return;
    }

    // Skip character/reminder preview if no sample character available
    if (!sampleCharacter && previewTokenType !== 'meta') {
      setPreviewUrl(null);
      return;
    }

    const genId = ++generationIdRef.current;

    const generatePreview = async () => {
      setIsGenerating(true);

      try {
        // Get the asset value for preview options (if an asset is selected)
        let assetValue: string | null = null;
        if (selectedAssetId) {
          if (selectedAssetId === 'none') {
            assetValue = 'none';
          } else if (selectedAssetId.startsWith('builtin:')) {
            assetValue = selectedAssetId.replace('builtin:', '');
          } else {
            assetValue = createAssetReference(selectedAssetId);
          }
        }

        // Merge preview options with generation options
        const previewOptions = {
          ...generationOptions,
          ...(assetValue ? getPreviewOptions(assetValue) : {}),
          logoUrl: scriptMeta?.logo,
        };

        const generator = new TokenGenerator(previewOptions);
        let canvas: HTMLCanvasElement | null = null;

        // Generate the appropriate token type
        switch (previewTokenType) {
          case 'reminder':
            if (sampleCharacter) {
              canvas = await generator.generateReminderToken(sampleCharacter, sampleReminderText);
            }
            break;
          case 'meta':
            canvas = await generator.generateScriptNameToken(
              scriptMeta?.name || 'Custom Script',
              scriptMeta?.author
            );
            break;
          default:
            if (sampleCharacter) {
              canvas = await generator.generateCharacterToken(sampleCharacter);
            }
            break;
        }

        // Only update if this is still the current generation
        if (genId === generationIdRef.current && canvas) {
          setPreviewUrl(canvas.toDataURL('image/png'));
        }
      } catch (err) {
        if (genId === generationIdRef.current) {
          logger.error('AssetPreviewGenerator', 'Preview generation error', err);
          setPreviewUrl(null);
        }
      } finally {
        if (genId === generationIdRef.current) {
          setIsGenerating(false);
        }
      }
    };

    // Debounce preview generation
    const timeout = setTimeout(generatePreview, debounceMs);
    return () => clearTimeout(timeout);
  }, [
    selectedAssetId,
    generationOptions,
    sampleCharacter,
    sampleReminderText,
    scriptMeta,
    getPreviewOptions,
    previewTokenType,
    debounceMs,
  ]);

  // Determine if we should show the preview panel
  const showPreviewPanel = !!generationOptions;

  return {
    previewUrl,
    isGenerating,
    showPreviewPanel,
    sampleCharacter,
    sampleReminderText,
  };
}

export default useAssetPreviewGenerator;
