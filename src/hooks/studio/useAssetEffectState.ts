/**
 * useAssetEffectState Hook
 *
 * Manages non-destructive effect state for the Studio asset editor.
 * Effects (team color, border, inversion) are stored as state and can be
 * toggled independently without stacking.
 *
 * Extracted from useAssetEditor for better separation of concerns.
 *
 * @module hooks/studio/useAssetEffectState
 */

import { useCallback, useMemo, useState } from 'react';
import { type BorderOptions, TEAM_COLOR_PRESETS, type TeamColorPreset } from '@/ts/studio/index.js';
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

/**
 * Options for useAssetEffectState hook.
 * Note: All image validation is done by the orchestrator (useAssetEditor).
 */
export type UseAssetEffectStateOptions = Record<string, never>;

export interface UseAssetEffectStateResult {
  /** Current effect state */
  effects: EffectState;
  /** Selected team color preset */
  selectedPreset: TeamColorPreset | null;
  /** Custom color value */
  customColor: string | null;
  /** Border options */
  borderOptions: BorderOptions | null;
  /** Whether any effects are applied */
  hasChanges: boolean;
  /** Whether undo is available */
  canUndo: boolean;
  /** Whether reset is available */
  canReset: boolean;
  /** Available team color presets */
  presets: TeamColorPreset[];

  /** Apply a team color preset (or null to remove) */
  applyTeamColor: (preset: TeamColorPreset | null) => void;
  /** Apply a custom hex color */
  applyCustomColor: (hexColor: string) => void;
  /** Apply border with given options */
  applyBorder: (options: Partial<BorderOptions>, skipUndo?: boolean) => void;
  /** Remove border */
  removeBorder: () => void;
  /** Toggle color inversion */
  invertColors: () => void;
  /** Undo last effect change */
  undo: () => void;
  /** Reset all effects to default */
  reset: () => void;
  /** Clear all state (for when image is cleared) */
  clear: () => void;
}

/** Default effect state - no effects applied */
export const DEFAULT_EFFECTS: EffectState = {
  teamColorPreset: null,
  customColor: null,
  borderOptions: null,
  inverted: false,
};

// ============================================================================
// Hook Implementation
// ============================================================================

export function useAssetEffectState(
  _options: UseAssetEffectStateOptions = {}
): UseAssetEffectStateResult {
  // Effect state (non-destructive - applied during render)
  const [effects, setEffects] = useState<EffectState>(DEFAULT_EFFECTS);

  // Previous effect state for undo
  const [previousEffects, setPreviousEffects] = useState<EffectState | null>(null);

  // ============================================================================
  // Helper Functions
  // ============================================================================

  /** Save current effects for undo */
  const saveForUndo = useCallback(() => {
    setPreviousEffects({ ...effects });
  }, [effects]);

  // ============================================================================
  // Actions
  // ============================================================================

  const applyTeamColor = useCallback(
    (preset: TeamColorPreset | null) => {
      // Note: Image validation is done by the orchestrator (useAssetEditor)
      saveForUndo();
      setEffects((prev) => ({
        ...prev,
        teamColorPreset: preset,
        customColor: null, // Clear custom color when applying preset
      }));

      if (preset) {
        logger.info('AssetEffectState', `Applied team color: ${preset.displayName}`);
      } else {
        logger.info('AssetEffectState', 'Removed team color');
      }
    },
    [saveForUndo]
  );

  const applyCustomColor = useCallback(
    (hexColor: string) => {
      // Note: Image validation is done by the orchestrator (useAssetEditor)
      saveForUndo();
      setEffects((prev) => ({
        ...prev,
        teamColorPreset: null, // Clear preset when applying custom
        customColor: hexColor,
      }));

      logger.info('AssetEffectState', `Applied custom color: ${hexColor}`);
    },
    [saveForUndo]
  );

  const applyBorder = useCallback(
    (options: Partial<BorderOptions>, skipUndo: boolean = false) => {
      // Note: Image validation is done by the orchestrator (useAssetEditor)
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
        logger.info(
          'AssetEffectState',
          `Applied border: ${options.width ?? 3}px ${options.color ?? '#FFFFFF'}`
        );
      }
    },
    [saveForUndo]
  );

  const removeBorder = useCallback(() => {
    saveForUndo();
    setEffects((prev) => ({
      ...prev,
      borderOptions: null,
    }));
    logger.info('AssetEffectState', 'Removed border');
  }, [saveForUndo]);

  const invertColors = useCallback(() => {
    // Note: Image validation is done by the orchestrator (useAssetEditor)
    saveForUndo();
    setEffects((prev) => ({
      ...prev,
      inverted: !prev.inverted,
    }));

    logger.info('AssetEffectState', 'Toggled color inversion');
  }, [saveForUndo]);

  const undo = useCallback(() => {
    if (previousEffects) {
      setEffects(previousEffects);
      setPreviousEffects(null);
    }
  }, [previousEffects]);

  const reset = useCallback(() => {
    // Note: Image validation is done by the orchestrator (useAssetEditor)
    saveForUndo();
    setEffects(DEFAULT_EFFECTS);
  }, [saveForUndo]);

  const clear = useCallback(() => {
    setEffects(DEFAULT_EFFECTS);
    setPreviousEffects(null);
  }, []);

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
    effects,
    selectedPreset: effects.teamColorPreset,
    customColor: effects.customColor,
    borderOptions: effects.borderOptions,
    hasChanges,
    canUndo: previousEffects !== null,
    canReset: hasChanges,
    presets: TEAM_COLOR_PRESETS,

    applyTeamColor,
    applyCustomColor,
    applyBorder,
    removeBorder,
    invertColors,
    undo,
    reset,
    clear,
  };
}

export default useAssetEffectState;
