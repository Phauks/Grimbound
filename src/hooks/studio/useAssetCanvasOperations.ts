/**
 * useAssetCanvasOperations Hook
 *
 * Manages canvas operations for the Studio asset editor:
 * - Loading images from files or assets
 * - Rendering the canvas with applied effects
 * - Saving the rendered canvas as an asset
 *
 * Extracted from useAssetEditor for better separation of concerns.
 *
 * @module hooks/studio/useAssetCanvasOperations
 */

import { useCallback, useMemo, useState } from 'react';
import type { IAssetStorageService } from '@/ts/services/upload/IUploadServices.js';
import {
  addIconBorder,
  replaceIconColor,
  replaceIconColorSplit,
  replaceIconColorWithHex,
} from '@/ts/studio/index.js';
import { logger } from '@/ts/utils/logger.js';
import type { EffectState } from './useAssetEffectState.js';

// ============================================================================
// Types
// ============================================================================

export interface LoadedAssetInfo {
  /** ID of the loaded asset (null if loaded from file) */
  id: string | null;
  /** Name of the loaded asset */
  name: string | null;
}

export interface UseAssetCanvasOperationsOptions {
  /** Asset storage service for loading/saving assets */
  assetStorageService: IAssetStorageService;
  /** Current effect state to apply during rendering */
  effects: EffectState;
  /** Callback when loading starts */
  onLoadStart?: () => void;
  /** Callback when loading ends */
  onLoadEnd?: () => void;
  /** Callback when processing starts */
  onProcessStart?: (message: string) => void;
  /** Callback when processing ends */
  onProcessEnd?: () => void;
  /** Callback when an error occurs */
  onError?: (message: string) => void;
  /** Callback when effects should be reset (after save or load) */
  onEffectsReset?: () => void;
}

export interface UseAssetCanvasOperationsResult {
  /** The original loaded canvas (before effects) */
  originalCanvas: HTMLCanvasElement | null;
  /** The rendered canvas (with effects applied) */
  currentCanvas: HTMLCanvasElement | null;
  /** Info about the currently loaded asset */
  loadedAsset: LoadedAssetInfo;

  /** Load an image from a File or Blob */
  loadFromFile: (file: File | Blob) => Promise<void>;
  /** Load an image from an asset in storage */
  loadFromAsset: (assetId: string, assetName?: string) => Promise<void>;
  /** Save the current rendered image as an asset */
  save: (name: string, overwrite?: boolean) => Promise<string>;
  /** Clear all canvas state */
  clear: () => void;
}

// ============================================================================
// Utilities
// ============================================================================

/** Clone a canvas element */
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

/** Generate a thumbnail from a canvas */
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

/** Sanitize a filename */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-z0-9_-]/gi, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
}

/** Load an image from a File/Blob into a canvas */
function loadImageToCanvas(file: File | Blob): Promise<HTMLCanvasElement> {
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
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useAssetCanvasOperations({
  assetStorageService,
  effects,
  onLoadStart,
  onLoadEnd,
  onProcessStart,
  onProcessEnd,
  onError,
  onEffectsReset,
}: UseAssetCanvasOperationsOptions): UseAssetCanvasOperationsResult {
  // Core state
  const [originalCanvas, setOriginalCanvas] = useState<HTMLCanvasElement | null>(null);
  const [loadedAssetId, setLoadedAssetId] = useState<string | null>(null);
  const [loadedAssetName, setLoadedAssetName] = useState<string | null>(null);

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
      const ctx = canvas.getContext('2d');
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
      logger.error('AssetCanvasOperations', 'Failed to render canvas', err);
      return cloneCanvas(originalCanvas);
    }
  }, [originalCanvas, effects]);

  // ============================================================================
  // Actions
  // ============================================================================

  const loadFromFile = useCallback(
    async (file: File | Blob) => {
      onLoadStart?.();

      try {
        const canvas = await loadImageToCanvas(file);

        setOriginalCanvas(canvas);
        setLoadedAssetId(null);
        setLoadedAssetName(file instanceof File ? file.name : 'Imported Image');
        onEffectsReset?.();

        logger.info('AssetCanvasOperations', 'Loaded image from file');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load image';
        onError?.(message);
        logger.error('AssetCanvasOperations', 'Failed to load image', err);
      } finally {
        onLoadEnd?.();
      }
    },
    [onLoadStart, onLoadEnd, onError, onEffectsReset]
  );

  const loadFromAsset = useCallback(
    async (assetId: string, assetName?: string) => {
      onLoadStart?.();

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
        onEffectsReset?.();

        logger.info('AssetCanvasOperations', `Loaded asset: ${assetId}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load asset';
        onError?.(message);
        logger.error('AssetCanvasOperations', 'Failed to load asset', err);
      } finally {
        onLoadEnd?.();
      }
    },
    [assetStorageService, onLoadStart, onLoadEnd, onError, onEffectsReset]
  );

  const save = useCallback(
    async (name: string, overwrite: boolean = false): Promise<string> => {
      if (!currentCanvas) {
        throw new Error('No image to save');
      }

      onProcessStart?.('Saving...');

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
          logger.info('AssetCanvasOperations', `Updated asset: ${assetId}`);
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
          logger.info('AssetCanvasOperations', `Saved new asset: ${assetId}`);
        }

        // After saving, the saved version becomes the new "original"
        // and we reset effects since they're now baked in
        setOriginalCanvas(cloneCanvas(currentCanvas));
        setLoadedAssetId(assetId);
        setLoadedAssetName(name);
        onEffectsReset?.();

        return assetId;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save';
        onError?.(message);
        logger.error('AssetCanvasOperations', 'Failed to save', err);
        throw err;
      } finally {
        onProcessEnd?.();
      }
    },
    [
      currentCanvas,
      loadedAssetId,
      assetStorageService,
      onProcessStart,
      onProcessEnd,
      onError,
      onEffectsReset,
    ]
  );

  const clear = useCallback(() => {
    setOriginalCanvas(null);
    setLoadedAssetId(null);
    setLoadedAssetName(null);
  }, []);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    originalCanvas,
    currentCanvas,
    loadedAsset: {
      id: loadedAssetId,
      name: loadedAssetName,
    },

    loadFromFile,
    loadFromAsset,
    save,
    clear,
  };
}

export default useAssetCanvasOperations;
