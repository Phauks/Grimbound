/**
 * useAssetEditor Hook
 *
 * Non-destructive state management for the Studio asset editor.
 * Effects (team color, border) are stored as state and applied on-demand,
 * allowing each effect to be toggled independently without stacking.
 *
 * This is an orchestrator hook that composes:
 * - useAssetEffectState: Effect values, presets, undo
 * - useAssetCanvasOperations: Canvas rendering, load, save
 * - useAssetUIState: Loading, processing, error state
 *
 * Rendering pipeline:
 *   originalCanvas → [team color] → [border] → renderedCanvas
 *
 * @module hooks/studio/useAssetEditor
 */

import { useCallback } from 'react';
import { useAssetStorageService } from '@/contexts/ServiceContext.js';
import type { BorderOptions, TeamColorPreset } from '@/ts/studio/index.js';
import { useAssetCanvasOperations } from './useAssetCanvasOperations.js';
import { useAssetEffectState } from './useAssetEffectState.js';
import { useAssetUIState } from './useAssetUIState.js';

// ============================================================================
// Types
// ============================================================================

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

// Re-export types from sub-hooks for convenience
export type { EffectState } from './useAssetEffectState.js';

// ============================================================================
// Hook Implementation
// ============================================================================

export function useAssetEditor(): UseAssetEditorResult {
  const assetStorageService = useAssetStorageService();

  // UI state management
  const uiState = useAssetUIState();

  // Effect state management (needs to know if image is loaded)
  const effectState = useAssetEffectState({
    hasImage: false, // Will be updated via canvas operations
    onError: uiState.setError,
  });

  // Canvas operations (needs effects for rendering)
  const canvasOps = useAssetCanvasOperations({
    assetStorageService,
    effects: effectState.effects,
    onLoadStart: () => uiState.setIsLoading(true),
    onLoadEnd: () => uiState.setIsLoading(false),
    onProcessStart: uiState.startProcessing,
    onProcessEnd: uiState.endProcessing,
    onError: uiState.setError,
    onEffectsReset: effectState.clear,
  });

  // Update effect state's hasImage based on canvas
  // This is done by wrapping effect methods to check canvas state
  const applyTeamColor = useCallback(
    (preset: TeamColorPreset | null) => {
      if (!canvasOps.originalCanvas) {
        uiState.setError('No image loaded');
        return;
      }
      effectState.applyTeamColor(preset);
    },
    [canvasOps.originalCanvas, effectState, uiState]
  );

  const applyCustomColor = useCallback(
    (hexColor: string) => {
      if (!canvasOps.originalCanvas) {
        uiState.setError('No image loaded');
        return;
      }
      effectState.applyCustomColor(hexColor);
    },
    [canvasOps.originalCanvas, effectState, uiState]
  );

  const applyBorder = useCallback(
    (options: Partial<BorderOptions>, skipUndo?: boolean) => {
      if (!canvasOps.originalCanvas) {
        uiState.setError('No image loaded');
        return;
      }
      effectState.applyBorder(options, skipUndo);
    },
    [canvasOps.originalCanvas, effectState, uiState]
  );

  const invertColors = useCallback(() => {
    if (!canvasOps.originalCanvas) {
      uiState.setError('No image loaded');
      return;
    }
    effectState.invertColors();
  }, [canvasOps.originalCanvas, effectState, uiState]);

  const reset = useCallback(() => {
    if (canvasOps.originalCanvas) {
      effectState.reset();
    }
  }, [canvasOps.originalCanvas, effectState]);

  const clear = useCallback(() => {
    canvasOps.clear();
    effectState.clear();
    uiState.reset();
  }, [canvasOps, effectState, uiState]);

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // Rendered canvas
    currentCanvas: canvasOps.currentCanvas,

    // State
    originalCanvas: canvasOps.originalCanvas,
    loadedAssetId: canvasOps.loadedAsset.id,
    loadedAssetName: canvasOps.loadedAsset.name,
    isLoading: uiState.isLoading,
    isProcessing: uiState.isProcessing,
    processingMessage: uiState.processingMessage,
    error: uiState.error,

    // Effect state (for UI)
    selectedPreset: effectState.selectedPreset,
    customColor: effectState.customColor,
    borderOptions: effectState.borderOptions,
    hasChanges: effectState.hasChanges,

    // Actions
    loadFromFile: canvasOps.loadFromFile,
    loadFromAsset: canvasOps.loadFromAsset,
    applyTeamColor,
    applyCustomColor,
    applyBorder,
    removeBorder: effectState.removeBorder,
    invertColors,
    undo: effectState.undo,
    reset,
    clear,
    save: canvasOps.save,

    // Helpers
    canUndo: effectState.canUndo,
    canReset: effectState.canReset,
    presets: effectState.presets,
  };
}

export default useAssetEditor;
