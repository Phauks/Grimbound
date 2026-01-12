/**
 * Script PDF Utilities
 *
 * Shared utility functions for script PDF generation including
 * character grouping, sorting, jinx extraction, and layout calculations.
 */

import {
  DAWN_ENTRY,
  DEMON_INFO_ENTRY,
  DUSK_ENTRY,
  MINION_INFO_ENTRY,
} from '@/ts/nightOrder/specialEntries.js';
import type { BackgroundStyle, ImageFitMode } from '@/ts/types/backgroundEffects.js';
import type { Character, Team } from '@/ts/types/index.js';
import { compareSAO } from '@/ts/utils/index.js';
import { logger } from '@/ts/utils/logger.js';
import { PLAYER_COUNT_TABLE, PLAYER_SCRIPT_FRONT, SPECIAL_CHARACTERS } from './constants.js';
import type {
  ColumnLayout,
  NightOrderIcon,
  PlayerCountEntry,
  PlayerScriptCharacter,
  PlayerScriptJinx,
} from './types.js';

// ============================================================================
// TEAM ORDERING
// ============================================================================

/**
 * Teams to display on player script (excludes travellers, fabled handled separately)
 */
export const SCRIPT_TEAM_ORDER: readonly Team[] = ['townsfolk', 'outsider', 'minion', 'demon'];

/**
 * Group characters by team in display order
 *
 * @param characters - Characters to group
 * @returns Map of team to characters in that team
 */
export function groupCharactersByTeam(
  characters: PlayerScriptCharacter[]
): Map<Team, PlayerScriptCharacter[]> {
  const groups = new Map<Team, PlayerScriptCharacter[]>();

  // Initialize all teams in order
  for (const team of SCRIPT_TEAM_ORDER) {
    groups.set(team, []);
  }

  // Group characters
  for (const char of characters) {
    // Skip non-standard teams (handled separately)
    if (!SCRIPT_TEAM_ORDER.includes(char.team)) {
      continue;
    }

    const teamChars = groups.get(char.team);
    if (teamChars) {
      teamChars.push(char);
    }
  }

  return groups;
}

/**
 * Filter out fabled and travellers from main character list
 *
 * @param characters - All characters
 * @returns Object with main characters and fabled/travellers separated
 */
export function separateCharactersByType(characters: PlayerScriptCharacter[]): {
  main: PlayerScriptCharacter[];
  fabled: PlayerScriptCharacter[];
  travellers: PlayerScriptCharacter[];
} {
  const main: PlayerScriptCharacter[] = [];
  const fabled: PlayerScriptCharacter[] = [];
  const travellers: PlayerScriptCharacter[] = [];

  for (const char of characters) {
    if (char.team === 'fabled') {
      fabled.push(char);
    } else if (char.team === 'traveller') {
      travellers.push(char);
    } else if (SCRIPT_TEAM_ORDER.includes(char.team)) {
      main.push(char);
    }
  }

  return { main, fabled, travellers };
}

// ============================================================================
// CUSTOM ORDERING
// ============================================================================

/**
 * Apply custom ordering to characters within teams
 *
 * When no custom order is provided, sorts by SAO (Standard Amy Order).
 * Characters not in the custom order are placed at the end in SAO order.
 *
 * @param characters - Characters to sort
 * @param customOrder - Array of character IDs in desired order
 * @returns New sorted array (does not mutate original)
 */
export function applyCustomOrder(
  characters: PlayerScriptCharacter[],
  customOrder?: string[]
): PlayerScriptCharacter[] {
  // When no custom order, sort by SAO (Standard Amy Order)
  if (!customOrder || customOrder.length === 0) {
    return [...characters].sort((a, b) =>
      compareSAO(a as unknown as Character, b as unknown as Character)
    );
  }

  const orderMap = new Map(customOrder.map((id, index) => [id.toLowerCase(), index]));

  return [...characters].sort((a, b) => {
    const aIndex = orderMap.get(a.id.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = orderMap.get(b.id.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;

    // If both have custom positions, use those
    if (aIndex !== Number.MAX_SAFE_INTEGER && bIndex !== Number.MAX_SAFE_INTEGER) {
      return aIndex - bIndex;
    }

    // Characters without custom position come after those with
    if (aIndex === Number.MAX_SAFE_INTEGER && bIndex !== Number.MAX_SAFE_INTEGER) {
      return 1;
    }
    if (aIndex !== Number.MAX_SAFE_INTEGER && bIndex === Number.MAX_SAFE_INTEGER) {
      return -1;
    }

    // Both without custom position, sort by SAO
    return compareSAO(a as unknown as Character, b as unknown as Character);
  });
}

/**
 * Generate a custom order array from current character arrangement
 *
 * @param charactersByTeam - Characters grouped by team in current order
 * @returns Array of character IDs representing current order
 */
export function generateCustomOrderFromTeams(
  charactersByTeam: Map<Team, PlayerScriptCharacter[]>
): string[] {
  const order: string[] = [];

  for (const team of SCRIPT_TEAM_ORDER) {
    const chars = charactersByTeam.get(team) || [];
    for (const char of chars) {
      order.push(char.id);
    }
  }

  return order;
}

// ============================================================================
// COLUMN LAYOUT
// ============================================================================

/**
 * Calculate optimal column count based on character count
 *
 * @param totalCharacters - Total number of main characters
 * @param forcedLayout - If provided, use this layout instead of calculating
 * @returns 1 or 2 columns
 */
export function calculateOptimalColumns(
  totalCharacters: number,
  forcedLayout?: ColumnLayout
): 1 | 2 {
  if (forcedLayout === 1 || forcedLayout === 2) {
    return forcedLayout;
  }

  // Auto: Use single column for small scripts
  return totalCharacters <= PLAYER_SCRIPT_FRONT.SINGLE_COLUMN_MAX_CHARS ? 1 : 2;
}

/**
 * Arrange characters into columns for display
 *
 * For 2-column layout, characters flow top-to-bottom in first column,
 * then continue in second column.
 *
 * @param characters - Characters to arrange
 * @param columns - Number of columns (1 or 2)
 * @returns Array of columns, each containing characters
 */
export function arrangeInColumns(
  characters: PlayerScriptCharacter[],
  columns: 1 | 2
): PlayerScriptCharacter[][] {
  if (columns === 1) {
    return [characters];
  }

  const midpoint = Math.ceil(characters.length / 2);
  return [characters.slice(0, midpoint), characters.slice(midpoint)];
}

// ============================================================================
// JINX EXTRACTION
// ============================================================================

/**
 * Extract active jinxes from characters in the script
 *
 * Only includes jinxes where both characters are present in the script.
 *
 * @param characters - Characters in the script
 * @returns Array of jinx entries for display
 */
export function extractActiveJinxes(characters: Character[]): PlayerScriptJinx[] {
  const characterIds = new Set(characters.map((c) => c.id.toLowerCase()));
  const jinxes: PlayerScriptJinx[] = [];
  const seenPairs = new Set<string>();

  for (const char of characters) {
    if (!char.jinxes) continue;

    for (const jinx of char.jinxes) {
      const jinxedId = jinx.id.toLowerCase();

      // Only include if the jinxed character is also in the script
      if (!characterIds.has(jinxedId)) continue;

      // Create a unique key for this pair to avoid duplicates
      const pairKey = [char.id.toLowerCase(), jinxedId].sort().join('|');
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);

      const jinxedChar = characters.find((c) => c.id.toLowerCase() === jinxedId);
      if (!jinxedChar) continue;

      // Get first image if array
      const getImage = (c: Character): string => {
        if (Array.isArray(c.image)) {
          return c.image[0] || '';
        }
        return c.image || '';
      };

      jinxes.push({
        char1: {
          id: char.id,
          name: char.name,
          image: getImage(char),
        },
        char2: {
          id: jinxedChar.id,
          name: jinxedChar.name,
          image: getImage(jinxedChar),
        },
        reason: jinx.reason,
      });
    }
  }

  return jinxes;
}

/**
 * Get characters that have jinxes with other characters in the script
 *
 * @param characters - Characters in the script
 * @returns Set of character IDs that have active jinxes
 */
export function getCharactersWithJinxes(characters: Character[]): Set<string> {
  const characterIds = new Set(characters.map((c) => c.id.toLowerCase()));
  const jinxedChars = new Set<string>();

  for (const char of characters) {
    if (!char.jinxes) continue;

    for (const jinx of char.jinxes) {
      if (characterIds.has(jinx.id.toLowerCase())) {
        jinxedChars.add(char.id.toLowerCase());
        jinxedChars.add(jinx.id.toLowerCase());
      }
    }
  }

  return jinxedChars;
}

// ============================================================================
// CHARACTER CONVERSION
// ============================================================================

/**
 * Convert a Character to PlayerScriptCharacter
 *
 * @param character - Source character
 * @returns PlayerScriptCharacter for rendering
 */
export function toPlayerScriptCharacter(character: Character): PlayerScriptCharacter {
  return {
    id: character.id,
    name: character.name,
    team: character.team,
    ability: character.ability || '',
    image: Array.isArray(character.image) ? character.image[0] || '' : character.image || '',
    setup: character.setup,
    jinxes: character.jinxes,
    uuid: character.uuid,
  };
}

/**
 * Convert an array of Characters to PlayerScriptCharacters
 *
 * Filters out special entries (meta, dusk, dawn, etc.) and sorts by SAO.
 *
 * @param characters - Source characters
 * @returns Array of PlayerScriptCharacters sorted by SAO (Standard Amy Order)
 */
export function toPlayerScriptCharacters(characters: Character[]): PlayerScriptCharacter[] {
  // Filter out special entries first
  const excludedIds = SPECIAL_CHARACTERS.EXCLUDED_IDS as readonly string[];
  const filtered = characters.filter((c) => !excludedIds.includes(c.id.toLowerCase()));

  // Sort by SAO before converting
  const sorted = [...filtered].sort(compareSAO);

  // Convert to PlayerScriptCharacter
  return sorted.map(toPlayerScriptCharacter);
}

// ============================================================================
// NIGHT ORDER
// ============================================================================

/**
 * Extract night order icons from characters for backing sheet
 *
 * Includes special entries (dusk, dawn, minioninfo, demoninfo) at their correct positions.
 *
 * @param characters - Characters with night order data
 * @param nightType - 'first' or 'other'
 * @returns Array of night order icons sorted by order number
 */
export function extractNightOrderIcons(
  characters: Character[],
  nightType: 'first' | 'other'
): NightOrderIcon[] {
  const orderField = nightType === 'first' ? 'firstNight' : 'otherNight';

  // Get character entries with night order
  const characterEntries = characters
    .filter((c) => {
      const order = c[orderField];
      return typeof order === 'number' && order > 0;
    })
    .map((c) => ({
      id: c.id,
      image: Array.isArray(c.image) ? c.image[0] || '' : c.image || '',
      name: c.name,
      order: c[orderField] as number,
    }));

  // Build complete list with special entries
  const allEntries: Array<{ id: string; image: string; name: string; order: number }> = [];

  // Add Dusk at the beginning
  allEntries.push({
    id: DUSK_ENTRY.id,
    image: DUSK_ENTRY.image,
    name: DUSK_ENTRY.name,
    order: DUSK_ENTRY.order,
  });

  // Add character entries
  allEntries.push(...characterEntries);

  // For first night, add Minion Info and Demon Info at their positions
  if (nightType === 'first') {
    allEntries.push({
      id: MINION_INFO_ENTRY.id,
      image: MINION_INFO_ENTRY.image,
      name: MINION_INFO_ENTRY.name,
      order: MINION_INFO_ENTRY.order,
    });
    allEntries.push({
      id: DEMON_INFO_ENTRY.id,
      image: DEMON_INFO_ENTRY.image,
      name: DEMON_INFO_ENTRY.name,
      order: DEMON_INFO_ENTRY.order,
    });
  }

  // Add Dawn at the end
  allEntries.push({
    id: DAWN_ENTRY.id,
    image: DAWN_ENTRY.image,
    name: DAWN_ENTRY.name,
    order: DAWN_ENTRY.order,
  });

  // Sort by order
  allEntries.sort((a, b) => a.order - b.order);

  // Remove order field from result
  return allEntries.map(({ id, image, name }) => ({ id, image, name }));
}

// ============================================================================
// PLAYER COUNT TABLE
// ============================================================================

/**
 * Get the player count table data
 *
 * @returns Array of player count entries
 */
export function getPlayerCountTable(): PlayerCountEntry[] {
  return [...PLAYER_COUNT_TABLE];
}

/**
 * Get team counts for a specific player count
 *
 * @param playerCount - Number of players (5-15+)
 * @returns Team counts or undefined if not found
 */
export function getTeamCountsForPlayers(playerCount: number): PlayerCountEntry | undefined {
  if (playerCount >= 15) {
    return PLAYER_COUNT_TABLE.find((e) => e.players === '15+');
  }
  return PLAYER_COUNT_TABLE.find((e) => e.players === playerCount);
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Check if a script has enough characters for a valid player script
 *
 * @param characters - Characters in the script
 * @returns Object with validation result and details
 */
export function validateScriptForPlayerScript(characters: PlayerScriptCharacter[]): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  counts: { townsfolk: number; outsiders: number; minions: number; demons: number };
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  const counts = {
    townsfolk: 0,
    outsiders: 0,
    minions: 0,
    demons: 0,
  };

  for (const char of characters) {
    if (char.team === 'townsfolk') counts.townsfolk++;
    else if (char.team === 'outsider') counts.outsiders++;
    else if (char.team === 'minion') counts.minions++;
    else if (char.team === 'demon') counts.demons++;
  }

  // Minimum requirements
  if (counts.townsfolk < 3) {
    warnings.push(`Only ${counts.townsfolk} Townsfolk (minimum 3 recommended)`);
  }
  if (counts.demons < 1) {
    errors.push('No Demon in script');
  }
  if (counts.minions < 1) {
    warnings.push('No Minions in script (minimum 1 recommended)');
  }

  // Check for minimum viable game
  const totalMainChars = counts.townsfolk + counts.outsiders + counts.minions + counts.demons;
  if (totalMainChars < 5) {
    errors.push(`Only ${totalMainChars} characters (minimum 5 needed for a game)`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    counts,
  };
}

// ============================================================================
// LAYOUT CALCULATIONS
// ============================================================================

/**
 * Calculate available content height for front page
 *
 * @param margins - Page margins
 * @param hasAuthor - Whether author line is shown
 * @param hasJinxes - Whether jinxes section is on front
 * @param jinxCount - Number of jinxes
 * @param hasFabled - Whether fabled section is on front
 * @param fabledCount - Number of fabled characters
 * @returns Available height in inches for character entries
 */
export function calculateAvailableHeight(
  margins: { top: number; bottom: number },
  hasAuthor: boolean,
  hasJinxes: boolean,
  jinxCount: number,
  hasFabled: boolean,
  fabledCount: number
): number {
  const pageHeight = 11; // US Letter

  let usedHeight = margins.top + margins.bottom;
  usedHeight += PLAYER_SCRIPT_FRONT.HEADER_HEIGHT;
  usedHeight += PLAYER_SCRIPT_FRONT.FOOTER_HEIGHT;

  if (!hasAuthor) {
    usedHeight -= PLAYER_SCRIPT_FRONT.AUTHOR_MARGIN_TOP + 0.15; // Approximate author line height
  }

  if (hasJinxes && jinxCount > 0) {
    usedHeight += PLAYER_SCRIPT_FRONT.JINX_SECTION_MARGIN_TOP;
    usedHeight += jinxCount * PLAYER_SCRIPT_FRONT.JINX_ENTRY_HEIGHT;
  }

  if (hasFabled && fabledCount > 0) {
    usedHeight += PLAYER_SCRIPT_FRONT.FABLED_SECTION_MARGIN_TOP;
    usedHeight += fabledCount * PLAYER_SCRIPT_FRONT.FABLED_ENTRY_HEIGHT;
  }

  return Math.max(0, pageHeight - usedHeight);
}

/**
 * Check if characters will fit on front page
 *
 * @param characterCounts - Number of characters per team
 * @param columns - Column layout
 * @param availableHeight - Available height in inches
 * @returns Whether characters will fit
 */
export function willCharactersFit(
  characterCounts: { townsfolk: number; outsiders: number; minions: number; demons: number },
  columns: 1 | 2,
  availableHeight: number
): boolean {
  const totalChars =
    characterCounts.townsfolk +
    characterCounts.outsiders +
    characterCounts.minions +
    characterCounts.demons;

  const entryHeight =
    columns === 1 ? PLAYER_SCRIPT_FRONT.ENTRY_HEIGHT_1COL : PLAYER_SCRIPT_FRONT.ENTRY_HEIGHT_2COL;

  const teamCount = Object.values(characterCounts).filter((c) => c > 0).length;
  const teamSpacing = (teamCount - 1) * PLAYER_SCRIPT_FRONT.TEAM_SPACING;

  const totalEntryHeight = totalChars * (entryHeight + PLAYER_SCRIPT_FRONT.ENTRY_SPACING);

  if (columns === 1) {
    return totalEntryHeight + teamSpacing <= availableHeight;
  }

  // For 2 columns, height is halved
  return (totalEntryHeight + teamSpacing) / 2 <= availableHeight;
}

// ============================================================================
// LOGGING
// ============================================================================

const scriptPdfLogger = logger.child('ScriptPdf');

/**
 * Log script PDF generation info
 */
export function logScriptPdfInfo(message: string, data?: unknown): void {
  scriptPdfLogger.info(message, data);
}

/**
 * Log script PDF generation debug info
 */
export function logScriptPdfDebug(message: string, data?: unknown): void {
  scriptPdfLogger.debug(message, data);
}

/**
 * Log script PDF generation error
 */
export function logScriptPdfError(message: string, error?: unknown): void {
  scriptPdfLogger.error(message, error);
}

// ============================================================================
// BACKGROUND IMAGE CSS
// ============================================================================

/**
 * CSS properties for each fit mode
 */
const FIT_MODE_CSS: Record<
  ImageFitMode,
  { backgroundSize: string; backgroundRepeat: string; backgroundPosition: string }
> = {
  cover: {
    backgroundSize: 'cover',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center center',
  },
  contain: {
    backgroundSize: 'contain',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center center',
  },
  stretch: {
    backgroundSize: '100% 100%',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center center',
  },
  tile: {
    backgroundSize: '100%', // Will be overridden with tileScale
    backgroundRepeat: 'repeat',
    backgroundPosition: 'top left',
  },
  original: {
    backgroundSize: 'auto',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center center',
  },
};

/**
 * Generate CSS properties for background image styling
 *
 * Converts a BackgroundStyle with an image to React.CSSProperties
 * for use in Script PDF React components (PlayerScriptFront, PlayerScriptBack, NightOrder).
 *
 * @param backgroundStyle - The background style configuration
 * @param resolvedImageUrl - The resolved image URL (from asset resolver or direct URL)
 * @returns React.CSSProperties for the background
 *
 * @example
 * ```tsx
 * const bgStyles = getBackgroundImageStyles(settings.background, imageUrl);
 * return <div style={{ ...bgStyles, width: '8.5in', height: '11in' }}>...</div>;
 * ```
 */
export function getBackgroundImageStyles(
  backgroundStyle: BackgroundStyle,
  resolvedImageUrl: string | null | undefined
): React.CSSProperties {
  // If no image or not image mode, return white background
  if (!resolvedImageUrl || backgroundStyle.sourceType !== 'image') {
    return {
      backgroundColor: '#FFFFFF',
    };
  }

  const fitMode = backgroundStyle.imageFitMode || 'cover';
  const baseStyles = FIT_MODE_CSS[fitMode];

  // Calculate background size for tile mode with scale
  let backgroundSize = baseStyles.backgroundSize;
  if (fitMode === 'tile' && backgroundStyle.tileScale) {
    // tileScale of 1.0 = 100% (original size), 0.5 = 200% (smaller tiles), 2.0 = 50% (larger tiles)
    const sizePercent = 100 / backgroundStyle.tileScale;
    backgroundSize = `${sizePercent}%`;
  }

  // Calculate position with offsets
  let backgroundPosition = baseStyles.backgroundPosition;
  if (fitMode !== 'tile') {
    const offsetX = backgroundStyle.cropOffsetX ?? 0.5;
    const offsetY = backgroundStyle.cropOffsetY ?? 0.5;
    // Convert 0-1 range to percentage (0.5 = 50% = center)
    backgroundPosition = `${offsetX * 100}% ${offsetY * 100}%`;
  }

  return {
    backgroundImage: `url("${resolvedImageUrl}")`,
    backgroundSize,
    backgroundRepeat: baseStyles.backgroundRepeat,
    backgroundPosition,
    backgroundColor: '#FFFFFF', // Fallback for unfilled areas (contain, original)
  };
}

/**
 * Check if a background style uses an image
 *
 * @param backgroundStyle - The background style to check
 * @returns True if the background uses an image
 */
export function isImageBackground(backgroundStyle: BackgroundStyle): boolean {
  return backgroundStyle.sourceType === 'image' && Boolean(backgroundStyle.imageUrl);
}
