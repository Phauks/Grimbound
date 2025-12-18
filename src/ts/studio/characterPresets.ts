/**
 * Character Preset System
 *
 * Provides color presets for Blood on the Clocktower character alignments
 * and utilities for recoloring images to match character types
 */

import type { CharacterPreset } from '@/ts/types/index.js';

/**
 * Character alignment color presets
 */
export const CHARACTER_PRESETS: CharacterPreset[] = [
  {
    id: 'good',
    name: 'good',
    displayName: 'Good',
    colors: { primary: '#3B5998' }, // Blue
  },
  {
    id: 'evil',
    name: 'evil',
    displayName: 'Evil',
    colors: { primary: '#CC0000' }, // Red
  },
  {
    id: 'traveler',
    name: 'traveler',
    displayName: 'Traveler',
    colors: { primary: '#3B5998', secondary: '#CC0000' }, // Blue + Red
  },
  {
    id: 'fabled',
    name: 'fabled',
    displayName: 'Fabled',
    colors: { primary: '#FFD700' }, // Gold
  },
  {
    id: 'loric',
    name: 'loric',
    displayName: 'Loric',
    colors: { primary: '#228B22' }, // Green
  },
  {
    id: 'good-traveler',
    name: 'good-traveler',
    displayName: 'Good Traveler',
    colors: { primary: '#3B5998', secondary: '#8B4513' }, // Blue + Brown
  },
  {
    id: 'evil-traveler',
    name: 'evil-traveler',
    displayName: 'Evil Traveler',
    colors: { primary: '#8B4513', secondary: '#CC0000' }, // Brown + Red
  },
];

/**
 * Apply character preset to image
 *
 * Converts image to grayscale then applies color overlay based on preset
 */
export function applyCharacterPreset(
  imageData: ImageData,
  preset: CharacterPreset,
  intensity: number = 1.0
): ImageData {
  // Validate intensity (0-1 range)
  const validIntensity = Math.max(0, Math.min(1, intensity));

  // Create output image data
  const output = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );

  // If intensity is 0, return original image
  if (validIntensity === 0) {
    return output;
  }

  // Convert to grayscale first
  const grayscale = convertToGrayscale(imageData);

  // Apply color overlay
  const recolored = applyColorOverlay(grayscale, preset.colors, validIntensity);

  return recolored;
}

/**
 * Convert image to grayscale while preserving alpha channel
 */
function convertToGrayscale(imageData: ImageData): ImageData {
  const output = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );

  for (let i = 0; i < output.data.length; i += 4) {
    const r = output.data[i];
    const g = output.data[i + 1];
    const b = output.data[i + 2];
    // Alpha channel preserved at i + 3

    // Use luminosity method for better grayscale conversion
    // Human eye is more sensitive to green, then red, then blue
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

    output.data[i] = gray;
    output.data[i + 1] = gray;
    output.data[i + 2] = gray;
  }

  return output;
}

/**
 * Apply color overlay to grayscale image
 */
function applyColorOverlay(
  imageData: ImageData,
  colors: { primary: string; secondary?: string },
  intensity: number
): ImageData {
  const output = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );

  // Parse primary color
  const primaryRgb = hexToRgb(colors.primary);

  // If no secondary color, apply single color overlay
  if (!colors.secondary) {
    return applySingleColorOverlay(output, primaryRgb, intensity);
  }

  // Parse secondary color
  const secondaryRgb = hexToRgb(colors.secondary);

  // Apply dual-tone gradient (top to bottom)
  return applyGradientOverlay(output, primaryRgb, secondaryRgb, intensity);
}

/**
 * Apply single color overlay using multiply blend mode
 */
function applySingleColorOverlay(
  imageData: ImageData,
  rgb: { r: number; g: number; b: number },
  intensity: number
): ImageData {
  const output = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );

  for (let i = 0; i < output.data.length; i += 4) {
    const gray = output.data[i]; // Grayscale value (R=G=B)

    // Multiply blend mode: base * overlay / 255
    // This darkens the image based on the overlay color
    const r = Math.round((gray * rgb.r) / 255);
    const g = Math.round((gray * rgb.g) / 255);
    const b = Math.round((gray * rgb.b) / 255);

    // Blend with original based on intensity
    output.data[i] = Math.round(gray * (1 - intensity) + r * intensity);
    output.data[i + 1] = Math.round(gray * (1 - intensity) + g * intensity);
    output.data[i + 2] = Math.round(gray * (1 - intensity) + b * intensity);
    // Alpha channel unchanged
  }

  return output;
}

/**
 * Apply gradient overlay from primary (top) to secondary (bottom)
 */
function applyGradientOverlay(
  imageData: ImageData,
  primaryRgb: { r: number; g: number; b: number },
  secondaryRgb: { r: number; g: number; b: number },
  intensity: number
): ImageData {
  const output = new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );

  const height = imageData.height;

  for (let y = 0; y < height; y++) {
    // Calculate gradient position (0 at top, 1 at bottom)
    const gradientPos = y / (height - 1);

    // Interpolate between primary and secondary colors
    const overlayR = Math.round(primaryRgb.r * (1 - gradientPos) + secondaryRgb.r * gradientPos);
    const overlayG = Math.round(primaryRgb.g * (1 - gradientPos) + secondaryRgb.g * gradientPos);
    const overlayB = Math.round(primaryRgb.b * (1 - gradientPos) + secondaryRgb.b * gradientPos);

    // Apply to all pixels in this row
    for (let x = 0; x < imageData.width; x++) {
      const i = (y * imageData.width + x) * 4;
      const gray = output.data[i]; // Grayscale value

      // Multiply blend mode
      const r = Math.round((gray * overlayR) / 255);
      const g = Math.round((gray * overlayG) / 255);
      const b = Math.round((gray * overlayB) / 255);

      // Blend with original based on intensity
      output.data[i] = Math.round(gray * (1 - intensity) + r * intensity);
      output.data[i + 1] = Math.round(gray * (1 - intensity) + g * intensity);
      output.data[i + 2] = Math.round(gray * (1 - intensity) + b * intensity);
      // Alpha channel unchanged
    }
  }

  return output;
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  // Remove # if present
  const cleanHex = hex.replace(/^#/, '');

  // Parse hex values
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  return { r, g, b };
}

/**
 * Get preset by ID
 */
export function getPresetById(id: string): CharacterPreset | undefined {
  return CHARACTER_PRESETS.find((preset) => preset.id === id);
}

/**
 * Get preset by name
 */
export function getPresetByName(name: string): CharacterPreset | undefined {
  return CHARACTER_PRESETS.find((preset) => preset.name === name);
}
