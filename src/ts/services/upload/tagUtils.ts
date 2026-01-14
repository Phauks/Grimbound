/**
 * Tag Utilities for Asset Management
 *
 * Provides helpers for working with the tag-based asset categorization system.
 * Tags use prefixes to distinguish system tags from user tags:
 * - `type:*` - Asset type (exactly one required)
 * - `team:*` - Team association (zero or more)
 * - (no prefix) - User-defined tags
 * - `starred` - Reserved for favorites
 *
 * @module services/upload/tagUtils
 */

import type { AssetType } from './types.js';

// ============================================================================
// Constants
// ============================================================================

/**
 * Valid type tags (exactly one required per asset)
 */
export const TYPE_TAGS = [
  'icon',
  'token-background',
  'script-background',
  'setup',
  'accent',
  'logo',
  'studio-icon',
  'studio-logo',
  'studio-project',
] as const;

export type TypeTagValue = (typeof TYPE_TAGS)[number];

/**
 * Valid team tags (zero or more per asset)
 */
export const TEAM_TAGS = [
  'townsfolk',
  'outsider',
  'minion',
  'demon',
  'traveller',
  'fabled',
  'loric',
] as const;

export type TeamTagValue = (typeof TEAM_TAGS)[number];

/**
 * Reserved tags with special behavior
 */
export const RESERVED_TAGS = ['starred'] as const;

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a tag is a system tag (type: or team: prefix)
 */
export const isSystemTag = (tag: string): boolean =>
  tag.startsWith('type:') || tag.startsWith('team:');

/**
 * Check if a tag is a type tag
 */
export const isTypeTag = (tag: string): boolean => tag.startsWith('type:');

/**
 * Check if a tag is a team tag
 */
export const isTeamTag = (tag: string): boolean => tag.startsWith('team:');

/**
 * Check if a tag is the starred reserved tag
 */
export const isStarredTag = (tag: string): boolean => tag === 'starred';

// ============================================================================
// Tag Extraction
// ============================================================================

/**
 * Extract the type value from a tags array (without prefix)
 * @returns Type value or null if no type tag found
 */
export const getTypeFromTags = (tags: string[]): TypeTagValue | null => {
  const typeTag = tags.find(isTypeTag);
  if (!typeTag) return null;
  return typeTag.replace('type:', '') as TypeTagValue;
};

/**
 * Extract all team values from a tags array (without prefix)
 */
export const getTeamsFromTags = (tags: string[]): TeamTagValue[] =>
  tags.filter(isTeamTag).map((t) => t.replace('team:', '') as TeamTagValue);

/**
 * Check if asset is starred
 */
export const isStarred = (tags: string[]): boolean => tags.includes('starred');

/**
 * Get only user-defined tags (not system or reserved)
 */
export const getUserTags = (tags: string[]): string[] =>
  tags.filter((t) => !isSystemTag(t) && t !== 'starred');

// ============================================================================
// Tag Manipulation
// ============================================================================

/**
 * Toggle a tag on/off in a tags array
 * @returns New tags array with tag added or removed
 */
export const toggleTag = (tags: string[], tag: string): string[] =>
  tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];

/**
 * Add a tag if not already present
 */
export const addTag = (tags: string[], tag: string): string[] =>
  tags.includes(tag) ? tags : [...tags, tag];

/**
 * Remove a tag if present
 */
export const removeTag = (tags: string[], tag: string): string[] => tags.filter((t) => t !== tag);

// ============================================================================
// Tag Validation
// ============================================================================

export interface TagValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a tags array for an asset
 * - Must have exactly one type:* tag
 * - Type tag must be a valid type
 * - Team tags must be valid teams
 */
export const validateTags = (tags: string[]): TagValidationResult => {
  const errors: string[] = [];

  // Check for exactly one type tag
  const typeTags = tags.filter(isTypeTag);
  if (typeTags.length !== 1) {
    errors.push('Must have exactly one type:* tag');
  }

  // Validate type tag value
  if (typeTags.length === 1) {
    const typeValue = typeTags[0].replace('type:', '');
    if (!TYPE_TAGS.includes(typeValue as TypeTagValue)) {
      errors.push(`Invalid type tag: type:${typeValue}`);
    }
  }

  // Validate team tags
  const teamTags = tags.filter(isTeamTag);
  for (const teamTag of teamTags) {
    const teamValue = teamTag.replace('team:', '');
    if (!TEAM_TAGS.includes(teamValue as TeamTagValue)) {
      errors.push(`Invalid team tag: ${teamTag}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// ============================================================================
// Tag Display Helpers
// ============================================================================

/**
 * Get display label for a type tag value
 */
export const getTypeLabel = (type: TypeTagValue): string => {
  const labels: Record<TypeTagValue, string> = {
    icon: 'Icon',
    'token-background': 'Token Background',
    'script-background': 'Script Background',
    setup: 'Setup',
    accent: 'Accent',
    logo: 'Logo',
    'studio-icon': 'Studio Icon',
    'studio-logo': 'Studio Logo',
    'studio-project': 'Studio Project',
  };
  return labels[type] || type;
};

/**
 * Get display label for a team tag value
 */
export const getTeamLabel = (team: TeamTagValue): string => {
  const labels: Record<TeamTagValue, string> = {
    townsfolk: 'Townsfolk',
    outsider: 'Outsider',
    minion: 'Minion',
    demon: 'Demon',
    traveller: 'Traveller',
    fabled: 'Fabled',
    loric: 'Loric',
  };
  return labels[team] || team;
};

/**
 * Create a type tag from a type value
 */
export const createTypeTag = (type: TypeTagValue): string => `type:${type}`;

/**
 * Create a team tag from a team value
 */
export const createTeamTag = (team: TeamTagValue): string => `team:${team}`;

/**
 * Check if a tags array has any type:* tag
 */
export const hasTypeTag = (tags: string[]): boolean => tags.some((t) => t.startsWith('type:'));

/**
 * Replace the type:* tag in a tags array with a new type
 * If no type:* tag exists, adds the new type tag
 * @returns New array with the type tag replaced (does not mutate)
 */
export const replaceTypeTag = (tags: string[], newType: TypeTagValue): string[] => {
  // Filter out old type tag and add new one
  const withoutType = tags.filter((t) => !t.startsWith('type:'));
  return [createTypeTag(newType), ...withoutType];
};

// ============================================================================
// Legacy AssetType Migration Helpers
// ============================================================================

// Note: AssetType import is at top of file

/**
 * Map from legacy AssetType values to new TypeTagValue
 * @deprecated Use TypeTagValue directly in new code
 */
const LEGACY_TYPE_MAP: Record<AssetType, TypeTagValue> = {
  'character-icon': 'icon',
  'token-background': 'token-background',
  'script-background': 'script-background',
  'setup-overlay': 'setup',
  accent: 'accent',
  logo: 'logo',
  'studio-icon': 'studio-icon',
  'studio-logo': 'studio-logo',
  'studio-project': 'studio-project',
};

/**
 * Convert AssetType to TypeTagValue
 */
export const legacyTypeToTagValue = (assetType: AssetType): TypeTagValue =>
  LEGACY_TYPE_MAP[assetType];

/**
 * Convert AssetType to type tag string (e.g., 'type:icon')
 */
export const legacyTypeToTag = (assetType: AssetType): string =>
  createTypeTag(LEGACY_TYPE_MAP[assetType]);
