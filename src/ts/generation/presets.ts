/**
 * Blood on the Clocktower Token Generator
 * Preset Utilities
 *
 * This module provides utilities for the preset system.
 * All presets are user-created; no built-in presets ship with the app.
 *
 * Presets are stored in two tiers:
 * - Global: localStorage (available across all projects)
 * - Local: ProjectState (travel with project exports/imports)
 *
 * @module generation/presets
 */

import type { GenerationOptions, Preset } from '@/ts/types/index.js';
import { DEFAULT_GENERATION_OPTIONS } from '@/ts/types/tokenOptions.js';
import { generateUuid } from '@/ts/utils/index.js';

/**
 * Create a new preset from current settings
 *
 * @param name - Display name for the preset
 * @param description - Optional description
 * @param icon - Emoji icon for visual identification
 * @param settings - Generation options to save
 * @returns New Preset object with generated ID and timestamps
 */
export function createPreset(
  name: string,
  description: string,
  icon: string,
  settings: GenerationOptions
): Preset {
  const now = Date.now();
  return {
    id: `preset_${generateUuid()}`,
    name,
    description,
    icon,
    settings: { ...settings }, // Deep copy to avoid mutations
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Get the default generation options.
 * Used for the "Reset to Defaults" functionality.
 *
 * @returns A copy of DEFAULT_GENERATION_OPTIONS
 */
export function getDefaultOptions(): GenerationOptions {
  return { ...DEFAULT_GENERATION_OPTIONS };
}

/**
 * Create a copy of an existing preset with a new ID
 *
 * @param preset - The preset to duplicate
 * @param nameSuffix - Optional suffix to add to the name (default: " (Copy)")
 * @returns New Preset object with fresh ID and timestamps
 */
export function duplicatePreset(preset: Preset, nameSuffix = ' (Copy)'): Preset {
  const now = Date.now();
  return {
    id: `preset_${generateUuid()}`,
    name: `${preset.name}${nameSuffix}`,
    description: preset.description,
    icon: preset.icon,
    settings: { ...preset.settings },
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Validate that an object has the required Preset fields
 *
 * @param obj - Object to validate
 * @returns true if object is a valid Preset
 */
export function isValidPreset(obj: unknown): obj is Preset {
  if (typeof obj !== 'object' || obj === null) return false;

  const preset = obj as Record<string, unknown>;

  return (
    typeof preset.id === 'string' &&
    typeof preset.name === 'string' &&
    typeof preset.settings === 'object' &&
    preset.settings !== null
  );
}
