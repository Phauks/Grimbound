/**
 * Preset Type Definitions
 *
 * Defines the unified preset structure used for both global and local presets.
 * - Global presets: Stored in localStorage, available across all projects
 * - Local presets: Stored in ProjectState, travel with project exports/imports
 *
 * @module types/presets
 */

import type { GenerationOptions } from './index.js';

/**
 * A preset configuration that can be applied to restore generation settings.
 * Used for both global presets (localStorage) and local presets (per-project).
 */
export interface Preset {
  /** Unique identifier (format: "preset_<uuid>") */
  id: string;
  /** Display name */
  name: string;
  /** Optional description */
  description: string;
  /** Emoji icon for visual identification */
  icon: string;
  /** Saved generation options */
  settings: GenerationOptions;
  /** Creation timestamp (ms since epoch) */
  createdAt: number;
  /** Last modification timestamp (ms since epoch) */
  updatedAt: number;
}

/** Preset storage tier */
export type PresetTier = 'global' | 'local';

/** Preset with tier information for UI display */
export interface PresetWithTier extends Preset {
  tier: PresetTier;
}
