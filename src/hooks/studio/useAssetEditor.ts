/**
 * useAssetEditor Hook
 *
 * Non-destructive state management for the Studio asset editor.
 * Effects (team color, border) are stored as state and applied on-demand,
 * allowing each effect to be toggled independently without stacking.
 *
 * Rendering pipeline:
 *   originalCanvas → [team color] → [border] → renderedCanvas
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAssetStorageService } from '@/contexts/ServiceContext';
import {
  TEAM_COLOR_PRESETS,
  replaceIconColor,
  replaceIconColorWithHex,
  replaceIconColorSplit,
  addIconBorder,
  type TeamColorPreset,
  type BorderOptions,
} from '@/ts/studio/index';
import { logger } from '@/ts/utils/logger.js';

// ============================================================================
// Types
// ============================================================================

/** Effect state - stored separately from canvas, applied on render */
export interface EffectState {
  /** Team color preset (mutually exclusive with customColor) */
  teamColorPreset: TeamColorPreset | null;
  /** Custom hex color (mutually exclusive with teamColorPreset) */
  customColor: string | null;
  /** Border options */
  borderOptions: BorderOptions | null;
  /** Whether colors are inverted */
  inverted: boolean;
}

export interface AssetEditorState {
  // Image state
  originalCanvas: HTMLCanvasElement | null;

  // Loaded asset info
  loadedAssetId: string | null;
  loadedAssetName: string | null;

  // Effect state (non-destructive)
  effects: EffectState;

  // UI state
  isLoading: boolean;
  isProcessing: boolean;
  processingMessage: string;

  // Error state
  error: string | null;
}

export interface UseAssetEditorResult {
  // Rendered canvas (derived from original + effects)
  currentCanvas: HTMLCanvasElement | null;

  // State
  originalCanvas: HTMLCanvasElement | null;
  loadedAssetId: string | null;
  loadedAssetName: string | null;
  isLoading: boolean;
  isProcessing: boolean;
  processingMessage: string;
  error: string | null;

  // Effect state (for UI display)
  selectedPreset: TeamColorPreset | null;
  customColor: string | null;
  borderOptions: BorderOptions | null;
  hasChanges: boolean;

  // Actions
  loadFromFile: (file: File | Blob) => Promise<void>;
  loadFromAsset: (assetId: string, assetName?: string) => Promise<void>;
  applyTeamColor: (preset: TeamColorPreset | null) => void;
  applyCustomColor: (hexColor: string) => void;
  applyBorder: (options: Partial<BorderOptions>, skipUndo?: boolean) => void;
  removeBorder: () => void;
  invertColors: () => void;
  reset: () => void;
  clear: () => void;
  save: (name: string, overwrite?: boolean) => Promise<string>;

  // Helpers
  canUndo: boolean;
  canReset: boolean;
  presets: TeamColorPreset[];
  undo: () => void;
}

/** Default effect state - no effects applied */
const DEFAULT_EFFECTS: EffectState = {
  teamColorPreset: null,
  customColor: null,
  borderOptions: null,
  inverted: false,
};

// ============================================================================
// Hook Implementation
// ============================================================================

export function useAssetEditor(): UseAssetEditorResult {
  const assetStorageService = useAssetStorageService();

  // Core state
  const [originalCanvas, setOriginalCanvas] = useState<HTMLCanvasElement | null>(null);
  const [loadedAssetId, setLoadedAssetId] = useState<string | null>(null);
  const [loadedAssetName, setLoadedAssetName] = useState<string | null>(null);

  // Effect state (non-destructive - applied during render)
  const [effects, setEffects] = useState<EffectState>(DEFAULT_EFFECTS);

  // Previous effect state for undo
  const [previousEffects, setPreviousEffects] = useState<EffectState | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // Rendering Pipeline
  // ============================================================================

  /**
   * Render the canvas by applying all effects to the original.
   * This is memoized and recalculates when original or effects change.
   */
  const currentCanvas = useMemo(() => {
    if (!originalCanvas) return null;

    try {
      // Start with a clone of the original
      let canvas = cloneCanvas(originalCanvas);
      let ctx = canvas.getContext('2d');
      if (!ctx) return canvas;

      // Step 1: Apply team color or custom color
      if (effects.teamColorPreset || effects.customColor) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let result: ImageData;

        if (effects.teamColorPreset) {
          const preset = effects.teamColorPreset;
          if (preset.split) {
            // Split color (like Traveler)
            result = replaceIconColorSplit(imageData, preset.split, {
              saturationBoost: preset.saturationBoost,
              saturationThreshold: 0.15,
              preserveLightness: true,
            });
          } else {
            // Single color
            result = replaceIconColor(imageData, {
              targetHue: preset.targetHue,
              saturationBoost: preset.saturationBoost,
              saturationThreshold: 0.15,
              preserveLightness: true,
            });
          }
        } else if (effects.customColor) {
          result = replaceIconColorWithHex(imageData, effects.customColor, {
            saturationThreshold: 0.15,
            preserveLightness: true,
          });
        } else {
          result = imageData;
        }

        ctx.putImageData(result, 0, 0);
      }

      // Step 2: Apply color inversion
      if (effects.inverted) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          data[i] = 255 - data[i];
          data[i + 1] = 255 - data[i + 1];
          data[i + 2] = 255 - data[i + 2];
        }
        ctx.putImageData(imageData, 0, 0);
      }

      // Step 3: Apply border (this creates a new, larger canvas)
      if (effects.borderOptions) {
        canvas = addIconBorder(canvas, effects.borderOptions);
      }

      return canvas;
    } catch (err) {
      logger.error('AssetEditor', 'Failed to render canvas', err);
      return cloneCanvas(originalCanvas);
    }
  }, [originalCanvas, effects]);

  // ============================================================================
  // Helper Functions
  // ============================================================================

  /**
   * Save current effects for undo
   */
  const saveForUndo = useCallback(() => {
    setPreviousEffects({ ...effects });
  }, [effects]);

  /**
   * Load an image from a File/Blob into a canvas
   */
  const loadImageToCanvas = useCallback((file: File | Blob): Promise<HTMLCanvasElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
        }
        URL.revokeObjectURL(url);
        resolve(canvas);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }, []);

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Load an image from a File or Blob
   */
  const loadFromFile = useCallback(
    async (file: File | Blob) => {
      setIsLoading(true);
      setError(null);

      try {
        const canvas = await loadImageToCanvas(file);

        setOriginalCanvas(canvas);
        setLoadedAssetId(null);
        setLoadedAssetName(file instanceof File ? file.name : 'Imported Image');
        setEffects(DEFAULT_EFFECTS);
        setPreviousEffects(null);

        logger.info('AssetEditor', 'Loaded image from file');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load image';
        setError(message);
        logger.error('AssetEditor', 'Failed to load image', err);
      } finally {
        setIsLoading(false);
      }
    },
    [loadImageToCanvas]
  );

  /**
   * Load an image from an asset in storage
   */
  const loadFromAsset = useCallback(
    async (assetId: string, assetName?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const url = await assetStorageService.getAssetUrl(assetId);
        if (!url) {
          throw new Error('Asset not found');
        }

        const response = await fetch(url);
        const blob = await response.blob();
        const canvas = await loadImageToCanvas(blob);

        setOriginalCanvas(canvas);
        setLoadedAssetId(assetId);
        setLoadedAssetName(assetName || 'Asset');
        setEffects(DEFAULT_EFFECTS);
        setPreviousEffects(null);

        logger.info('AssetEditor', `Loaded asset: ${assetId}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load asset';
        setError(message);
        logger.error('AssetEditor', 'Failed to load asset', err);
      } finally {
        setIsLoading(false);
      }
    },
    [assetStorageService, loadImageToCanvas]
  );

  /**
   * Apply a team color preset (or null to remove)
   */
  const applyTeamColor = useCallback(
    (preset: TeamColorPreset | null) => {
      if (!originalCanvas) {
        setError('No image loaded');
        return;
      }

      saveForUndo();
      setEffects((prev) => ({
        ...prev,
        teamColorPreset: preset,
        customColor: null, // Clear custom color when applying preset
      }));

      if (preset) {
        logger.info('AssetEditor', `Applied team color: ${preset.displayName}`);
      } else {
        logger.info('AssetEditor', 'Removed team color');
      }
    },
    [originalCanvas, saveForUndo]
  );

  /**
   * Apply a custom color
   */
  const applyCustomColor = useCallback(
    (hexColor: string) => {
      if (!originalCanvas) {
        setError('No image loaded');
        return;
      }

      saveForUndo();
      setEffects((prev) => ({
        ...prev,
        teamColorPreset: null, // Clear preset when applying custom
        customColor: hexColor,
      }));

      logger.info('AssetEditor', `Applied custom color: ${hexColor}`);
    },
    [originalCanvas, saveForUndo]
  );

  /**
   * Apply border with given options
   * @param options - Border options to apply
   * @param skipUndo - If true, don't save undo state (for live updates)
   */
  const applyBorder = useCallback(
    (options: Partial<BorderOptions>, skipUndo: boolean = false) => {
      if (!originalCanvas) {
        setError('No image loaded');
        return;
      }

      if (!skipUndo) {
        saveForUndo();
      }
      setEffects((prev) => ({
        ...prev,
        borderOptions: {
          width: options.width ?? prev.borderOptions?.width ?? 3,
          color: options.color ?? prev.borderOptions?.color ?? '#FFFFFF',
          style: options.style ?? prev.borderOptions?.style ?? 'solid',
        },
      }));

      if (!skipUndo) {
        logger.info('AssetEditor', `Applied border: ${options.width ?? 3}px ${options.color ?? '#FFFFFF'}`);
      }
    },
    [originalCanvas, saveForUndo]
  );

  /**
   * Remove border
   */
  const removeBorder = useCallback(() => {
    saveForUndo();
    setEffects((prev) => ({
      ...prev,
      borderOptions: null,
    }));
    logger.info('AssetEditor', 'Removed border');
  }, [saveForUndo]);

  /**
   * Toggle color inversion
   */
  const invertColors = useCallback(() => {
    if (!originalCanvas) {
      setError('No image loaded');
      return;
    }

    saveForUndo();
    setEffects((prev) => ({
      ...prev,
      inverted: !prev.inverted,
    }));

    logger.info('AssetEditor', 'Toggled color inversion');
  }, [originalCanvas, saveForUndo]);

  /**
   * Undo last effect change
   */
  const undo = useCallback(() => {
    if (previousEffects) {
      setEffects(previousEffects);
      setPreviousEffects(null);
    }
  }, [previousEffects]);

  /**
   * Reset all effects
   */
  const reset = useCallback(() => {
    if (originalCanvas) {
      saveForUndo();
      setEffects(DEFAULT_EFFECTS);
    }
  }, [originalCanvas, saveForUndo]);

  /**
   * Clear all state
   */
  const clear = useCallback(() => {
    setOriginalCanvas(null);
    setLoadedAssetId(null);
    setLoadedAssetName(null);
    setEffects(DEFAULT_EFFECTS);
    setPreviousEffects(null);
    setError(null);
  }, []);

  /**
   * Save the current rendered image as an asset
   */
  const save = useCallback(
    async (name: string, overwrite: boolean = false): Promise<string> => {
      if (!currentCanvas) {
        throw new Error('No image to save');
      }

      setIsProcessing(true);
      setProcessingMessage('Saving...');
      setError(null);

      try {
        // Convert canvas to blob
        const blob = await new Promise<Blob>((resolve, reject) => {
          currentCanvas.toBlob(
            (b) => {
              if (b) resolve(b);
              else reject(new Error('Failed to convert canvas to blob'));
            },
            'image/png',
            1.0
          );
        });

        // Generate thumbnail
        const thumbnailBlob = await generateThumbnail(currentCanvas, 128);

        let assetId: string;

        if (overwrite && loadedAssetId) {
          // Update existing asset
          await assetStorageService.update(loadedAssetId, {
            blob,
            thumbnail: thumbnailBlob,
            metadata: {
              filename: `${sanitizeFilename(name)}.png`,
              mimeType: 'image/png',
              size: blob.size,
              width: currentCanvas.width,
              height: currentCanvas.height,
              uploadedAt: Date.now(),
              editedAt: Date.now(),
              sourceType: 'editor',
            },
          });
          assetId = loadedAssetId;
          logger.info('AssetEditor', `Updated asset: ${assetId}`);
        } else {
          // Save as new asset
          assetId = await assetStorageService.save({
            type: 'character-icon',
            projectId: null,
            blob,
            thumbnail: thumbnailBlob,
            metadata: {
              filename: `${sanitizeFilename(name)}.png`,
              mimeType: 'image/png',
              size: blob.size,
              width: currentCanvas.width,
              height: currentCanvas.height,
              uploadedAt: Date.now(),
              sourceType: 'editor',
            },
          });
          logger.info('AssetEditor', `Saved new asset: ${assetId}`);
        }

        // After saving, the saved version becomes the new "original"
        // and we reset effects since they're now baked in
        setOriginalCanvas(cloneCanvas(currentCanvas));
        setLoadedAssetId(assetId);
        setLoadedAssetName(name);
        setEffects(DEFAULT_EFFECTS);
        setPreviousEffects(null);

        return assetId;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save';
        setError(message);
        logger.error('AssetEditor', 'Failed to save', err);
        throw err;
      } finally {
        setIsProcessing(false);
        setProcessingMessage('');
      }
    },
    [currentCanvas, loadedAssetId, assetStorageService]
  );

  // ============================================================================
  // Derived State
  // ============================================================================

  const hasChanges = useMemo(() => {
    return (
      effects.teamColorPreset !== null ||
      effects.customColor !== null ||
      effects.borderOptions !== null ||
      effects.inverted
    );
  }, [effects]);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // Rendered canvas
    currentCanvas,

    // State
    originalCanvas,
    loadedAssetId,
    loadedAssetName,
    isLoading,
    isProcessing,
    processingMessage,
    error,

    // Effect state (for UI)
    selectedPreset: effects.teamColorPreset,
    customColor: effects.customColor,
    borderOptions: effects.borderOptions,
    hasChanges,

    // Actions
    loadFromFile,
    loadFromAsset,
    applyTeamColor,
    applyCustomColor,
    applyBorder,
    removeBorder,
    invertColors,
    undo,
    reset,
    clear,
    save,

    // Helpers
    canUndo: previousEffects !== null,
    canReset: hasChanges,
    presets: TEAM_COLOR_PRESETS,
  };
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Clone a canvas element
 */
function cloneCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(source, 0, 0);
  }
  return canvas;
}

/**
 * Generate a thumbnail from a canvas
 */
async function generateThumbnail(canvas: HTMLCanvasElement, size: number): Promise<Blob> {
  const scale = Math.min(size / canvas.width, size / canvas.height);
  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = Math.round(canvas.width * scale);
  thumbCanvas.height = Math.round(canvas.height * scale);

  const ctx = thumbCanvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
  }

  return new Promise((resolve, reject) => {
    thumbCanvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to generate thumbnail'));
      },
      'image/jpeg',
      0.8
    );
  });
}

/**
 * Sanitize a filename
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-z0-9_-]/gi, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
}
