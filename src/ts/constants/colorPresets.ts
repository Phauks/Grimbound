/**
 * Color Preset Constants
 *
 * Centralized color preset data for color picker components.
 * Extracted from ColorPreviewSelector to enable reuse across the codebase.
 *
 * @module constants/colorPresets
 */

// ============================================================================
// Types
// ============================================================================

/** A named color preset with optional grouping */
export interface ColorPreset {
  /** Color value in hex format */
  value: string;
  /** Display name for the color */
  name: string;
  /** Optional group/category */
  group?: string;
}

// ============================================================================
// Theme Color Presets
// ============================================================================

/**
 * Default color presets organized by theme/purpose
 * Groups: Neutral, Theme, Teams, Vivid
 */
export const DEFAULT_COLOR_PRESETS: ColorPreset[] = [
  // Neutrals
  { value: '#FFFFFF', name: 'White', group: 'Neutral' },
  { value: '#F5F5F5', name: 'Off White', group: 'Neutral' },
  { value: '#E0E0E0', name: 'Light Gray', group: 'Neutral' },
  { value: '#808080', name: 'Gray', group: 'Neutral' },
  { value: '#404040', name: 'Dark Gray', group: 'Neutral' },
  { value: '#1A1A1A', name: 'Charcoal', group: 'Neutral' },
  { value: '#000000', name: 'Black', group: 'Neutral' },

  // Blood on the Clocktower Theme
  { value: '#8B0000', name: 'Blood Red', group: 'Theme' },
  { value: '#C9A227', name: 'Accent Gold', group: 'Theme' },
  { value: '#2C3E50', name: 'Midnight', group: 'Theme' },

  // Team Colors
  { value: '#1A5F2A', name: 'Townsfolk', group: 'Teams' },
  { value: '#1A3F5F', name: 'Outsider', group: 'Teams' },
  { value: '#5F1A3F', name: 'Minion', group: 'Teams' },
  { value: '#8B0000', name: 'Demon', group: 'Teams' },
  { value: '#5F4F1A', name: 'Traveller', group: 'Teams' },
  { value: '#4F1A5F', name: 'Fabled', group: 'Teams' },

  // Vivid Colors
  { value: '#E74C3C', name: 'Red', group: 'Vivid' },
  { value: '#E67E22', name: 'Orange', group: 'Vivid' },
  { value: '#F1C40F', name: 'Yellow', group: 'Vivid' },
  { value: '#27AE60', name: 'Green', group: 'Vivid' },
  { value: '#3498DB', name: 'Blue', group: 'Vivid' },
  { value: '#9B59B6', name: 'Purple', group: 'Vivid' },
];

// ============================================================================
// Basic Colors Grid
// ============================================================================

/**
 * Standard basic colors (8 columns x 6 rows = 48 colors)
 * Organized as rainbow columns, lightest to darkest rows
 */
export const BASIC_COLORS: string[] = [
  // Row 1: Pastel/Light
  '#FF9999',
  '#FFCC99',
  '#FFFF99',
  '#99FF99',
  '#99FFFF',
  '#99CCFF',
  '#9999FF',
  '#FF99FF',
  // Row 2: Vivid/Bright
  '#FF0000',
  '#FF8000',
  '#FFFF00',
  '#00FF00',
  '#00FFFF',
  '#0080FF',
  '#0000FF',
  '#FF00FF',
  // Row 3: Muted
  '#BF6060',
  '#BF9060',
  '#BFBF60',
  '#60BF60',
  '#60BFBF',
  '#6090BF',
  '#6060BF',
  '#BF60BF',
  // Row 4: Medium
  '#B30000',
  '#B35900',
  '#B3B300',
  '#00B300',
  '#00B3B3',
  '#0059B3',
  '#0000B3',
  '#B300B3',
  // Row 5: Dark
  '#660000',
  '#663300',
  '#666600',
  '#006600',
  '#006666',
  '#003366',
  '#000066',
  '#660066',
  // Row 6: Grayscale
  '#FFFFFF',
  '#D9D9D9',
  '#B3B3B3',
  '#808080',
  '#4D4D4D',
  '#333333',
  '#1A1A1A',
  '#000000',
];

/** Number of columns in the basic colors grid */
export const BASIC_COLORS_COLUMNS = 8;

/** Number of rows in the basic colors grid */
export const BASIC_COLORS_ROWS = 6;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get color display name from presets or common names
 *
 * @param hex - Hex color to look up
 * @param presets - Optional custom presets (defaults to DEFAULT_COLOR_PRESETS)
 * @returns The preset name if found, or 'Custom' for unknown colors
 */
export function getColorDisplayName(
  hex: string,
  presets: ColorPreset[] = DEFAULT_COLOR_PRESETS
): string {
  const normalized = hex.toUpperCase();
  const preset = presets.find((p) => p.value.toUpperCase() === normalized);
  if (preset) return preset.name;

  // Common color names fallback
  const commonNames: Record<string, string> = {
    '#FFFFFF': 'White',
    '#000000': 'Black',
    '#FF0000': 'Red',
    '#00FF00': 'Lime',
    '#0000FF': 'Blue',
    '#FFFF00': 'Yellow',
    '#FF00FF': 'Magenta',
    '#00FFFF': 'Cyan',
  };

  return commonNames[normalized] || 'Custom';
}

/**
 * Get presets filtered by group
 *
 * @param group - Group name to filter by
 * @param presets - Optional custom presets (defaults to DEFAULT_COLOR_PRESETS)
 * @returns Array of presets matching the group
 */
export function getPresetsByGroup(
  group: string,
  presets: ColorPreset[] = DEFAULT_COLOR_PRESETS
): ColorPreset[] {
  return presets.filter((p) => p.group === group);
}

/**
 * Get all unique groups from presets
 *
 * @param presets - Optional custom presets (defaults to DEFAULT_COLOR_PRESETS)
 * @returns Array of unique group names
 */
export function getPresetGroups(presets: ColorPreset[] = DEFAULT_COLOR_PRESETS): string[] {
  const groups = new Set<string>();
  for (const preset of presets) {
    if (preset.group) {
      groups.add(preset.group);
    }
  }
  return Array.from(groups);
}
