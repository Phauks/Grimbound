/**
 * Team Utilities
 *
 * Centralized utilities for team-related operations including
 * CSS class mapping and team normalization.
 *
 * @module ts/utils/teamUtils
 */

import { capitalize } from './stringUtils.js';

/**
 * Map of team names to CSS class suffixes.
 * Includes common aliases (traveler/traveller).
 */
export const TEAM_CLASS_MAP: Record<string, string> = {
  townsfolk: 'teamTownsfolk',
  outsider: 'teamOutsider',
  minion: 'teamMinion',
  demon: 'teamDemon',
  traveller: 'teamTraveller',
  traveler: 'teamTraveller',
  fabled: 'teamFabled',
  loric: 'teamLoric',
  meta: 'teamMeta',
} as const;

/**
 * Get the CSS class name for a team from a CSS module.
 *
 * @param team - Team name (case-insensitive)
 * @param styles - CSS module object with team classes
 * @returns The scoped CSS class name, or fallback to teamTownsfolk
 *
 * @example
 * ```typescript
 * import styles from './MyComponent.module.css';
 * const className = getTeamStyleClass('demon', styles);
 * // Returns styles.teamDemon
 * ```
 */
export function getTeamStyleClass(
  team: string | undefined,
  styles: Record<string, string>
): string {
  const teamLower = team?.toLowerCase() || 'townsfolk';
  const styleKey = TEAM_CLASS_MAP[teamLower] || `team${capitalize(teamLower)}`;
  return styles[styleKey] || styles.teamTownsfolk || '';
}

/**
 * Normalize team name to lowercase with consistent spelling.
 * Converts 'traveler' to 'traveller' for consistency.
 *
 * @param team - Team name to normalize
 * @returns Normalized team name
 */
export function normalizeTeamName(team: string | undefined): string {
  const teamLower = team?.toLowerCase() || 'townsfolk';
  // Normalize traveler -> traveller for consistency
  return teamLower === 'traveler' ? 'traveller' : teamLower;
}
