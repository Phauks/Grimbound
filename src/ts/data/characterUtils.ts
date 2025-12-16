/**
 * Blood on the Clocktower Token Generator
 * Character Utilities - Character data manipulation and counting
 */

import CONFIG from '../config.js';
import type {
  Character,
  CharacterValidationResult,
  Team,
  TeamCounts,
  TokenCounts,
} from '../types/index.js';

// ============================================================================
// Character Validation
// ============================================================================

/**
 * Validate character data has required fields
 * @param character - Character object
 * @returns Validation result
 */
export function validateCharacter(character: Partial<Character>): CharacterValidationResult {
  const errors: string[] = [];

  if (!character.name) {
    errors.push('Missing character name');
  }

  if (!character.team) {
    errors.push('Missing team type');
  } else if (!CONFIG.TEAMS.includes(character.team as Team)) {
    errors.push(`Invalid team type: ${character.team}`);
  }

  // Image can be string or array
  if (!character.image) {
    errors.push('Missing character image');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Character Data Accessors
// ============================================================================

/**
 * Get image URL from character image field
 * Handles both string and array formats
 * @param imageField - Image field value
 * @returns Image URL
 */
export function getCharacterImageUrl(imageField: string | string[] | undefined): string {
  if (typeof imageField === 'string') {
    return imageField;
  }
  if (Array.isArray(imageField) && imageField.length > 0) {
    return imageField[0]; // Use first image (default/good version)
  }
  return '';
}

/**
 * Get all image URLs from character image field
 * Used for generating variant tokens
 * @param imageField - Image field value
 * @returns Array of image URLs
 */
export function getAllCharacterImageUrls(imageField: string | string[] | undefined): string[] {
  if (typeof imageField === 'string') {
    return imageField ? [imageField] : [];
  }
  if (Array.isArray(imageField) && imageField.length > 0) {
    return imageField;
  }
  return [];
}

/**
 * Count reminders for a character
 * @param character - Character object
 * @returns Number of reminders
 */
export function countReminders(character: Character): number {
  if (!character.reminders) {
    return 0;
  }
  if (Array.isArray(character.reminders)) {
    return character.reminders.length;
  }
  return 0;
}

/**
 * Get global reminders for a character (used for tokens that affect other characters)
 * @param character - Character object
 * @returns Array of global reminder strings
 */
export function getGlobalReminders(character: Character): string[] {
  if (!character.remindersGlobal) {
    return [];
  }
  if (Array.isArray(character.remindersGlobal)) {
    return character.remindersGlobal;
  }
  return [];
}

// ============================================================================
// Character Grouping and Counting
// ============================================================================

/**
 * Group characters by team
 * @param characters - Array of character objects
 * @returns Object with team names as keys and character arrays as values
 */
export function groupByTeam(characters: Character[]): Record<Team, Character[]> {
  const groups: Record<Team, Character[]> = {
    townsfolk: [],
    outsider: [],
    minion: [],
    demon: [],
    traveller: [],
    fabled: [],
    loric: [],
    meta: [],
  };

  characters.forEach((char) => {
    const team = (char.team || 'townsfolk').toLowerCase() as Team;
    if (groups[team]) {
      groups[team].push(char);
    } else {
      groups.townsfolk.push(char);
    }
  });

  return groups;
}

/**
 * Calculate token counts by team
 * @param characters - Array of character objects
 * @returns Counts object with character and reminder counts per team
 */
export function calculateTokenCounts(characters: Character[]): TokenCounts {
  const counts: Record<Team, TeamCounts> = {
    townsfolk: { characters: 0, reminders: 0 },
    outsider: { characters: 0, reminders: 0 },
    minion: { characters: 0, reminders: 0 },
    demon: { characters: 0, reminders: 0 },
    traveller: { characters: 0, reminders: 0 },
    fabled: { characters: 0, reminders: 0 },
    loric: { characters: 0, reminders: 0 },
    meta: { characters: 0, reminders: 0 },
  };

  characters.forEach((char) => {
    const team = (char.team || 'townsfolk').toLowerCase() as Team;
    if (counts[team]) {
      counts[team].characters++;
      counts[team].reminders += countReminders(char);
    }
  });

  // Calculate totals in a single iteration
  let totalCharacters = 0;
  let totalReminders = 0;
  for (const team of CONFIG.TEAMS) {
    totalCharacters += counts[team].characters;
    totalReminders += counts[team].reminders;
  }

  return {
    ...counts,
    total: {
      characters: totalCharacters,
      reminders: totalReminders,
    },
  };
}

// ============================================================================
// Preview Character Selection
// ============================================================================

/**
 * Select the best character for preview/example purposes.
 * Priority order:
 * 1. Character with both setup flag AND reminders (shows most visual features)
 * 2. Character with reminders (enables reminder token preview)
 * 3. First character in list (fallback)
 *
 * @param characters - Array of characters to choose from
 * @returns The best character for preview, or null if array is empty
 */
export function getBestPreviewCharacter(characters: Character[]): Character | null {
  if (characters.length === 0) return null;

  // Best: has both setup AND reminders (shows setup flower + reminder preview)
  const withSetupAndReminders = characters.find(
    (c) => c.setup && c.reminders && c.reminders.length > 0
  );
  if (withSetupAndReminders) return withSetupAndReminders;

  // Next best: has reminders (useful for reminder preview)
  const withReminders = characters.find((c) => c.reminders && c.reminders.length > 0);
  if (withReminders) return withReminders;

  // Fallback: first character
  return characters[0];
}

export default {
  validateCharacter,
  getCharacterImageUrl,
  getAllCharacterImageUrls,
  countReminders,
  getGlobalReminders,
  groupByTeam,
  calculateTokenCounts,
  getBestPreviewCharacter,
};
