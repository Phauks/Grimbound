/**
 * Team Variant Generator
 *
 * Utility for auto-generating team color variants of character images.
 * Uses the studio's color replacement system to recolor images.
 *
 * @module generation/teamVariantGenerator
 */

import { TEAM_COLORS, TEAM_LABELS } from '@/ts/constants.js';
import {
  applyTeamColorPreset,
  replaceIconColorSplit,
  TEAM_COLOR_PRESETS,
} from '@/ts/studio/iconColorReplacer.js';
import type { AutoGenerateTeam, Team } from '@/ts/types/index.js';
import { logger } from '@/ts/utils/index.js';

// ============================================================================
// Types
// ============================================================================

export interface TeamVariantConfig {
  /** The target team to recolor to */
  targetTeam: AutoGenerateTeam;
  /** Display name for the team */
  displayName: string;
  /** Hex color for UI display */
  color: string;
}

export interface TeamVariantResult {
  /** The team this variant represents */
  team: AutoGenerateTeam;
  /** The recolored ImageData */
  imageData: ImageData;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Teams that can be auto-generated, with display info
 * Uses TEAM_COLORS and TEAM_LABELS from constants as SSOT
 */
export const TEAM_VARIANT_CONFIG: TeamVariantConfig[] = [
  { targetTeam: 'townsfolk', displayName: TEAM_LABELS.townsfolk, color: TEAM_COLORS.townsfolk.hex },
  { targetTeam: 'outsider', displayName: TEAM_LABELS.outsider, color: TEAM_COLORS.outsider.hex },
  { targetTeam: 'minion', displayName: TEAM_LABELS.minion, color: TEAM_COLORS.minion.hex },
  { targetTeam: 'demon', displayName: TEAM_LABELS.demon, color: TEAM_COLORS.demon.hex },
  { targetTeam: 'fabled', displayName: TEAM_LABELS.fabled, color: TEAM_COLORS.fabled.hex },
  { targetTeam: 'traveller', displayName: TEAM_LABELS.traveler, color: TEAM_COLORS.traveler.hex },
  { targetTeam: 'loric', displayName: TEAM_LABELS.loric, color: TEAM_COLORS.loric.hex },
];

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Normalize team name to handle aliases (e.g., 'traveler' -> 'traveller')
 */
function normalizeTeam(team: Team | string): Team {
  if (team === 'traveler') return 'traveller';
  return team as Team;
}

/**
 * Check if a character should get a variant for a given target team.
 * Returns false if the character is already that team.
 */
export function shouldGenerateTeamVariant(
  characterTeam: Team | string,
  targetTeam: AutoGenerateTeam
): boolean {
  const normalizedCharTeam = normalizeTeam(characterTeam);
  const normalizedTargetTeam = normalizeTeam(targetTeam);
  return normalizedCharTeam !== normalizedTargetTeam;
}

/**
 * Get list of teams to generate for a character, excluding their current team.
 */
export function getTeamsToGenerate(
  characterTeam: Team | string,
  enabledTeams: AutoGenerateTeam[]
): AutoGenerateTeam[] {
  return enabledTeams.filter((team) => shouldGenerateTeamVariant(characterTeam, team));
}

/**
 * Apply team color recoloring to an ImageData.
 * Uses the studio's color replacement system.
 *
 * @param imageData - Source image data to recolor
 * @param targetTeam - Target team to recolor to
 * @returns Recolored ImageData
 */
export function applyTeamRecolor(imageData: ImageData, targetTeam: AutoGenerateTeam): ImageData {
  // Find the preset for this team
  const preset = TEAM_COLOR_PRESETS.find((p) => p.id === targetTeam || p.id === 'traveler');

  if (!preset) {
    logger.warn('TeamVariantGenerator', `No preset found for team: ${targetTeam}`);
    return new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
  }

  // Handle traveler's split colors specially
  if (targetTeam === 'traveller' && preset.split) {
    return replaceIconColorSplit(imageData, preset.split, {
      saturationBoost: preset.saturationBoost,
    });
  }

  // Use standard team color preset
  return applyTeamColorPreset(imageData, targetTeam);
}

/**
 * Generate team variant ImageData from a canvas.
 * Extracts ImageData from canvas and applies team recoloring.
 *
 * @param canvas - Source canvas with character image
 * @param targetTeam - Target team to recolor to
 * @returns New canvas with recolored image
 */
export function generateTeamVariantCanvas(
  canvas: HTMLCanvasElement,
  targetTeam: AutoGenerateTeam
): HTMLCanvasElement {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    logger.error('TeamVariantGenerator', 'Failed to get 2D context from canvas');
    return canvas;
  }

  // Get the image data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Apply team recoloring
  const recoloredData = applyTeamRecolor(imageData, targetTeam);

  // Create a new canvas with the recolored image
  const newCanvas = document.createElement('canvas');
  newCanvas.width = canvas.width;
  newCanvas.height = canvas.height;
  const newCtx = newCanvas.getContext('2d');

  if (newCtx) {
    newCtx.putImageData(recoloredData, 0, 0);
  }

  return newCanvas;
}

/**
 * Apply team recoloring to an HTMLImageElement and return as ImageData.
 * This draws the image to a temporary canvas, applies recoloring, and returns the result.
 *
 * @param image - Source image element
 * @param targetTeam - Target team to recolor to
 * @returns Recolored ImageData
 */
export function recolorImage(image: HTMLImageElement, targetTeam: AutoGenerateTeam): ImageData {
  // Draw image to temporary canvas
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = image.naturalWidth || image.width;
  tempCanvas.height = image.naturalHeight || image.height;

  const ctx = tempCanvas.getContext('2d');
  if (!ctx) {
    logger.error('TeamVariantGenerator', 'Failed to create 2D context for image recoloring');
    return new ImageData(1, 1);
  }

  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

  return applyTeamRecolor(imageData, targetTeam);
}

/**
 * Create a recolored image element from source image.
 * Returns a new HTMLImageElement with the recolored data.
 *
 * @param image - Source image element
 * @param targetTeam - Target team to recolor to
 * @returns Promise resolving to recolored image element
 */
export async function createRecoloredImage(
  image: HTMLImageElement,
  targetTeam: AutoGenerateTeam
): Promise<HTMLImageElement> {
  // Draw image to canvas and apply recoloring
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = image.naturalWidth || image.width;
  tempCanvas.height = image.naturalHeight || image.height;

  const ctx = tempCanvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to create 2D context');
  }

  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
  const recoloredData = applyTeamRecolor(imageData, targetTeam);
  ctx.putImageData(recoloredData, 0, 0);

  // Convert to image element
  return new Promise((resolve, reject) => {
    const newImage = new Image();
    newImage.onload = () => resolve(newImage);
    newImage.onerror = reject;
    newImage.src = tempCanvas.toDataURL('image/png');
  });
}

/**
 * Get the display name for a team
 */
export function getTeamDisplayName(team: AutoGenerateTeam): string {
  const config = TEAM_VARIANT_CONFIG.find((c) => c.targetTeam === team);
  return config?.displayName ?? team;
}

/**
 * Create a recolored image data URL from a source image URL.
 * Loads the image, applies team recoloring to the icon only, and returns a data URL.
 *
 * @param imageUrl - Source image URL to load and recolor
 * @param targetTeam - Target team to recolor to
 * @returns Promise resolving to recolored image data URL
 */
export async function createRecoloredImageUrl(
  imageUrl: string,
  targetTeam: AutoGenerateTeam
): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';

    image.onload = () => {
      try {
        // Draw image to canvas and apply recoloring
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = image.naturalWidth || image.width;
        tempCanvas.height = image.naturalHeight || image.height;

        const ctx = tempCanvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to create 2D context'));
          return;
        }

        ctx.drawImage(image, 0, 0);
        const imageData = ctx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const recoloredData = applyTeamRecolor(imageData, targetTeam);
        ctx.putImageData(recoloredData, 0, 0);

        // Return as data URL
        resolve(tempCanvas.toDataURL('image/png'));
      } catch (error) {
        reject(error);
      }
    };

    image.onerror = () => {
      reject(new Error(`Failed to load image: ${imageUrl}`));
    };

    image.src = imageUrl;
  });
}
