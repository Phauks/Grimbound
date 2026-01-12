/**
 * useAssetPreviewGenerator Hook
 *
 * Generates live token previews for asset selection in the Asset Manager.
 * Handles debounced generation, loading states, and cleanup.
 *
 * @module hooks/assets/useAssetPreviewGenerator
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTokenContext } from '@/contexts/TokenContext.js';
import { hashGenerationOptions } from '@/ts/cache/index.js';
import { DEFAULT_SAMPLE_CHARACTER } from '@/ts/constants.js';
import { getBestPreviewCharacter } from '@/ts/data/characterUtils.js';
import { TokenGenerator } from '@/ts/generation/index.js';
import { createAssetReference } from '@/ts/services/upload/assetResolver.js';
import type { TypeTagValue } from '@/ts/services/upload/tagUtils.js';
import { DEFAULT_BACKGROUND_STYLE } from '@/ts/types/backgroundEffects.js';
import type {
  BackgroundStyle,
  Character,
  GenerationOptions,
  ScriptMeta,
} from '@/ts/types/index.js';
import { logger } from '@/ts/utils/logger.js';

// ============================================================================
// Helper Functions (extracted to reduce cognitive complexity)
// ============================================================================

/**
 * Resolves a selected asset ID to an asset value string for preview options.
 * Handles 'none', 'builtin:*', and user asset IDs.
 */
function resolveAssetValue(selectedAssetId: string | null): string | null {
  if (!selectedAssetId) return null;
  if (selectedAssetId === 'none') return 'none';
  if (selectedAssetId.startsWith('builtin:')) {
    return selectedAssetId.replace('builtin:', '');
  }
  return createAssetReference(selectedAssetId);
}

/**
 * Generates the appropriate token canvas based on token type.
 */
async function generateTokenCanvas(
  generator: TokenGenerator,
  previewTokenType: PreviewTokenType,
  sampleCharacter: Character,
  sampleReminderText: string,
  scriptMeta: ScriptMeta | null
): Promise<HTMLCanvasElement> {
  switch (previewTokenType) {
    case 'reminder':
      return generator.generateReminderToken(sampleCharacter, sampleReminderText);
    case 'meta':
      return generator.generateScriptNameToken(
        scriptMeta?.name || 'Custom Script',
        scriptMeta?.author
      );
    default:
      return generator.generateCharacterToken(sampleCharacter);
  }
}

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
  assetType?: TypeTagValue | 'all';
  /** Initial asset type filter (for fallback) */
  initialAssetType?: TypeTagValue;
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
  /** Character used for preview (always available - defaults to Grimbound) */
  sampleCharacter: Character;
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
  const { characters, scriptMeta, exampleCharacterToken } = useTokenContext();

  // Get the character for preview - prioritize example token, then best preview candidate
  const sampleCharacter = ((): Character => {
    // If there's an example token set, use its character data
    if (exampleCharacterToken?.characterData) {
      return exampleCharacterToken.characterData;
    }
    // Use centralized selection logic (matches TokenPreviewRow)
    const bestPreview = getBestPreviewCharacter(characters);
    if (bestPreview) return bestPreview;

    // Use default sample character (always available)
    return DEFAULT_SAMPLE_CHARACTER;
  })();

  // Sample reminder text for reminder token preview
  const sampleReminderText =
    sampleCharacter?.reminders && sampleCharacter.reminders.length > 0
      ? sampleCharacter.reminders[0]
      : 'Reminder';

  // Compute stable hashes for dependency comparison (prevents infinite loops)
  // Objects created every render would cause effects to run infinitely
  const generationOptionsHash = generationOptions ? hashGenerationOptions(generationOptions) : '';
  const scriptMetaJson = scriptMeta ? JSON.stringify(scriptMeta) : '';

  // Store objects in refs for use inside effects without triggering re-runs
  const generationOptionsRef = useRef(generationOptions);
  generationOptionsRef.current = generationOptions;

  const sampleCharacterRef = useRef(sampleCharacter);
  sampleCharacterRef.current = sampleCharacter;

  const scriptMetaRef = useRef(scriptMeta);
  scriptMetaRef.current = scriptMeta;

  // Track previous values to detect actual changes
  const prevGenerationOptionsHashRef = useRef(generationOptionsHash);
  const prevSampleCharacterUuidRef = useRef(sampleCharacter?.uuid);
  const prevScriptMetaJsonRef = useRef(scriptMetaJson);

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
        case 'setup':
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
    const currentGenerationOptions = generationOptionsRef.current;
    const currentSampleCharacter = sampleCharacterRef.current;
    const currentScriptMeta = scriptMetaRef.current;
    const currentCharacterUuid = sampleCharacter?.uuid;

    // Reference hash values to satisfy exhaustive-deps (they trigger the effect)
    // Update prev refs - comparison ensures hashes are "used" in the effect
    if (prevGenerationOptionsHashRef.current !== generationOptionsHash) {
      prevGenerationOptionsHashRef.current = generationOptionsHash;
    }
    if (prevSampleCharacterUuidRef.current !== currentCharacterUuid) {
      prevSampleCharacterUuidRef.current = currentCharacterUuid;
    }
    if (prevScriptMetaJsonRef.current !== scriptMetaJson) {
      prevScriptMetaJsonRef.current = scriptMetaJson;
    }

    // Skip if no generation options provided
    if (!currentGenerationOptions) {
      setPreviewUrl(null);
      return;
    }

    const genId = ++generationIdRef.current;
    const isCurrentGeneration = () => genId === generationIdRef.current;

    const generatePreview = async () => {
      setIsGenerating(true);

      try {
        // Resolve asset value using extracted helper
        const assetValue = resolveAssetValue(selectedAssetId);

        // Merge preview options with generation options
        const previewOptions = {
          ...currentGenerationOptions,
          ...(assetValue ? getPreviewOptions(assetValue) : {}),
          logoUrl: currentScriptMeta?.logo,
        };

        const generator = new TokenGenerator(previewOptions);

        // Generate the appropriate token type using extracted helper
        const canvas = await generateTokenCanvas(
          generator,
          previewTokenType,
          currentSampleCharacter,
          sampleReminderText,
          currentScriptMeta
        );

        // Only update if this is still the current generation
        if (isCurrentGeneration() && canvas) {
          setPreviewUrl(canvas.toDataURL('image/png'));
        }
      } catch (err) {
        if (isCurrentGeneration()) {
          logger.error('AssetPreviewGenerator', 'Preview generation error', err);
          setPreviewUrl(null);
        }
      } finally {
        if (isCurrentGeneration()) {
          setIsGenerating(false);
        }
      }
    };

    // Debounce preview generation
    const timeout = setTimeout(generatePreview, debounceMs);
    return () => clearTimeout(timeout);
  }, [
    selectedAssetId,
    generationOptionsHash,
    sampleCharacter?.uuid,
    sampleReminderText,
    scriptMetaJson,
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
