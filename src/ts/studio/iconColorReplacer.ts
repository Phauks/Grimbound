/**
 * Icon Color Replacer
 *
 * Selective color replacement for character icons using HSL manipulation.
 * Preserves white/gray/black areas while changing colored regions.
 *
 * Uses centralized TEAM_COLORS from constants.ts as single source of truth.
 */

import { TEAM_COLORS, type TeamColorKey } from '@/ts/constants.js';
import { hexToRgb, hslToRgb, rgbToHsl } from '@/ts/utils/colorUtils.js';

// ============================================================================
// Types
// ============================================================================

export interface ColorReplacementOptions {
  /** Target hue (0-360) - the color to change to */
  targetHue: number;
  /** Saturation threshold (0-1) - pixels below this are considered neutral */
  saturationThreshold: number;
  /** Whether to preserve original lightness (recommended: true) */
  preserveLightness: boolean;
  /** Saturation multiplier (1.0 = no change, >1 = more vivid) */
  saturationBoost: number;
}

export interface SplitColorConfig {
  left: { hue: number; hex: string };
  right: { hue: number; hex: string };
}

export interface TeamColorPreset {
  id: string;
  name: string;
  displayName: string;
  targetHue: number;
  saturationBoost: number;
  previewColor: string;
  /** Optional split color configuration for dual-allegiance teams like Traveler */
  split?: SplitColorConfig;
}

// ============================================================================
// Team Color Presets - Built from centralized TEAM_COLORS
// ============================================================================

/**
 * Build team color presets from centralized TEAM_COLORS constant.
 * This ensures all team colors come from a single source of truth.
 */
function buildTeamColorPresets(): TeamColorPreset[] {
  const teamKeys: TeamColorKey[] = [
    'townsfolk',
    'outsider',
    'minion',
    'demon',
    'traveler',
    'fabled',
    'loric',
  ];

  return teamKeys.map((key) => {
    const color = TEAM_COLORS[key];
    // Convert key to display name (capitalize first letter)
    const displayName = key.charAt(0).toUpperCase() + key.slice(1);

    // Check if this team has split colors (like Traveler)
    const splitConfig =
      'split' in color && color.split
        ? {
            left: { hue: color.split.left.hue, hex: color.split.left.hex },
            right: { hue: color.split.right.hue, hex: color.split.right.hex },
          }
        : undefined;

    return {
      id: key,
      name: key,
      displayName,
      targetHue: color.hue,
      saturationBoost: color.saturationBoost,
      previewColor: color.hex,
      split: splitConfig,
    };
  });
}

export const TEAM_COLOR_PRESETS: TeamColorPreset[] = buildTeamColorPresets();

// ============================================================================
// Default Options
// ============================================================================

export const DEFAULT_COLOR_OPTIONS: ColorReplacementOptions = {
  targetHue: 210, // Blue (Townsfolk)
  saturationThreshold: 0.15, // 15% - good for clean vector art
  preserveLightness: true,
  saturationBoost: 1.0,
};

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Replace colors in an image selectively based on saturation.
 * Neutral colors (white, gray, black) are preserved.
 * Colored pixels have their hue replaced with the target hue.
 *
 * @param imageData - Source image data
 * @param options - Color replacement options
 * @returns New ImageData with replaced colors
 */
export function replaceIconColor(
  imageData: ImageData,
  options: Partial<ColorReplacementOptions> = {}
): ImageData {
  const opts: ColorReplacementOptions = { ...DEFAULT_COLOR_OPTIONS, ...options };

  const output = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );

  const data = output.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Skip fully transparent pixels
    if (a < 10) continue;

    // Convert to HSL
    const [_h, s, l] = rgbToHsl(r, g, b);

    // Only modify pixels above saturation threshold
    if (s > opts.saturationThreshold) {
      // Calculate new saturation with boost
      const newSaturation = Math.min(1, s * opts.saturationBoost);

      // Use target hue, adjusted saturation, preserve or adjust lightness
      const newLightness = opts.preserveLightness ? l : l;

      // Convert back to RGB
      const [newR, newG, newB] = hslToRgb(opts.targetHue, newSaturation, newLightness);

      data[i] = newR;
      data[i + 1] = newG;
      data[i + 2] = newB;
      // Alpha unchanged
    }
    // Neutral pixels (s <= threshold) are left unchanged
  }

  return output;
}

/**
 * Replace colors with a split (left/right) color scheme.
 * Left half of image uses leftHue, right half uses rightHue.
 * Neutral colors (white, gray, black) are preserved.
 *
 * @param imageData - Source image data
 * @param splitConfig - Left and right color configuration
 * @param options - Additional color replacement options
 * @returns New ImageData with split colors applied
 */
export function replaceIconColorSplit(
  imageData: ImageData,
  splitConfig: SplitColorConfig,
  options: Partial<Omit<ColorReplacementOptions, 'targetHue'>> = {}
): ImageData {
  const opts = {
    saturationThreshold: DEFAULT_COLOR_OPTIONS.saturationThreshold,
    preserveLightness: DEFAULT_COLOR_OPTIONS.preserveLightness,
    saturationBoost: DEFAULT_COLOR_OPTIONS.saturationBoost,
    ...options,
  };

  const { width, height } = imageData;
  const centerX = width / 2;

  const output = new ImageData(new Uint8ClampedArray(imageData.data), width, height);

  const data = output.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // Skip fully transparent pixels
      if (a < 10) continue;

      // Convert to HSL
      const [_h, s, l] = rgbToHsl(r, g, b);

      // Only modify pixels above saturation threshold
      if (s > opts.saturationThreshold) {
        // Determine which hue to use based on x position
        const targetHue = x < centerX ? splitConfig.left.hue : splitConfig.right.hue;

        // Calculate new saturation with boost
        const newSaturation = Math.min(1, s * opts.saturationBoost);

        // Preserve lightness
        const newLightness = opts.preserveLightness ? l : l;

        // Convert back to RGB
        const [newR, newG, newB] = hslToRgb(targetHue, newSaturation, newLightness);

        data[i] = newR;
        data[i + 1] = newG;
        data[i + 2] = newB;
        // Alpha unchanged
      }
      // Neutral pixels (s <= threshold) are left unchanged
    }
  }

  return output;
}

/**
 * Replace colors using a hex color instead of hue value.
 * Extracts the hue from the hex color and applies it.
 *
 * @param imageData - Source image data
 * @param hexColor - Target color as hex string (e.g., '#3B5998')
 * @param options - Additional options (excluding targetHue)
 * @returns New ImageData with replaced colors
 */
export function replaceIconColorWithHex(
  imageData: ImageData,
  hexColor: string,
  options: Partial<Omit<ColorReplacementOptions, 'targetHue'>> = {}
): ImageData {
  const rgb = hexToRgb(hexColor);
  if (!rgb) {
    // Return unchanged if invalid color
    return new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
  }

  // Extract hue from the target color
  const [targetHue, targetSat] = rgbToHsl(rgb.r, rgb.g, rgb.b);

  // Use the target color's saturation as a reference for boost
  // If target is very saturated, boost less; if desaturated, boost more
  const autoBoost = options.saturationBoost ?? (targetSat > 0.5 ? 1.0 : 1.2);

  return replaceIconColor(imageData, {
    ...options,
    targetHue,
    saturationBoost: autoBoost,
  });
}

/**
 * Apply a team color preset to an image.
 * Automatically handles split colors (like Traveler) vs single colors.
 *
 * @param imageData - Source image data
 * @param presetId - ID of the team color preset
 * @param options - Override options
 * @returns New ImageData with preset applied
 */
export function applyTeamColorPreset(
  imageData: ImageData,
  presetId: string,
  options: Partial<ColorReplacementOptions> = {}
): ImageData {
  const preset = TEAM_COLOR_PRESETS.find((p) => p.id === presetId);
  if (!preset) {
    // Return unchanged if preset not found
    return new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
  }

  // Use split color function if preset has split configuration
  if (preset.split) {
    return replaceIconColorSplit(imageData, preset.split, {
      saturationBoost: preset.saturationBoost,
      ...options,
    });
  }

  // Standard single-color replacement
  return replaceIconColor(imageData, {
    targetHue: preset.targetHue,
    saturationBoost: preset.saturationBoost,
    ...options,
  });
}

/**
 * Analyze an image to detect optimal saturation threshold.
 * Finds the "valley" between neutral and colored pixel distributions.
 *
 * @param imageData - Source image data
 * @returns Suggested saturation threshold (0-1)
 */
export function detectOptimalThreshold(imageData: ImageData): number {
  const histogram = new Array(100).fill(0);
  const data = imageData.data;

  // Build saturation histogram
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 128) continue; // Skip transparent pixels

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const [, s] = rgbToHsl(r, g, b);

    histogram[Math.min(99, Math.floor(s * 100))]++;
  }

  // Find valley between neutral (low sat) and colored (high sat) peaks
  // Look in the 10-35% range for the minimum
  let valleyIndex = 15; // Default 0.15
  let minCount = Infinity;

  for (let i = 10; i < 35; i++) {
    if (histogram[i] < minCount) {
      minCount = histogram[i];
      valleyIndex = i;
    }
  }

  return valleyIndex / 100;
}

/**
 * Get preset by ID
 */
export function getTeamPresetById(id: string): TeamColorPreset | undefined {
  return TEAM_COLOR_PRESETS.find((p) => p.id === id);
}

/**
 * Convert hue (0-360) to approximate hex color for preview
 */
export function hueToPreviewColor(hue: number): string {
  const [r, g, b] = hslToRgb(hue, 0.7, 0.5);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
