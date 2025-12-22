/**
 * Project State Diff Utility
 *
 * Calculates differences between two ProjectState objects for version comparison.
 * Useful for showing what changed between versions in the UI.
 */

import type { Character } from '@/ts/types/index';
import type { ProjectState } from '@/ts/types/project';
import {
  type ArrayDiffResult,
  diffArrays,
  diffText,
  type TextDiffResult,
  valuesAreDifferent,
} from './textDiff.js';

// ==========================================================================
// Types
// ==========================================================================

export interface ProjectDiff {
  hasChanges: boolean;
  characters: CharacterDiff;
  scriptMeta: ScriptMetaDiff;
  generationOptions: GenerationOptionsDiff;
  customIcons: CustomIconsDiff;
  filters: FiltersDiff;
}

export interface CharacterDiff {
  added: Character[];
  removed: Character[];
  modified: ModifiedCharacter[];
  unchanged: number;
}

export interface ModifiedCharacter {
  character: Character;
  changes: string[]; // List of changed fields
}

export interface ScriptMetaDiff {
  changed: boolean;
  fields: {
    name?: { old: string | undefined; new: string | undefined };
    author?: { old: string | undefined; new: string | undefined };
    logo?: { old: string | undefined; new: string | undefined };
  };
}

export interface GenerationOptionsDiff {
  changed: boolean;
  fields: string[]; // List of changed option keys
}

export interface CustomIconsDiff {
  added: number;
  removed: number;
  changed: boolean;
}

export interface FiltersDiff {
  changed: boolean;
  fields: string[]; // List of changed filter keys
}

// ==========================================================================
// Detailed Diff Types (for expanded view)
// ==========================================================================

/** A single field change with old/new values and optional diff data */
export interface FieldChange<T = unknown> {
  fieldName: string;
  displayName: string;
  oldValue: T;
  newValue: T;
  /** Pre-computed word-level diff for text fields */
  textDiff?: TextDiffResult;
  /** Pre-computed diff for array fields */
  arrayDiff?: ArrayDiffResult<string>;
}

/** Character changes grouped by category */
export interface CharacterChangesGrouped {
  /** Text fields: ability, flavor, overview, examples, howToRun, tips, nightReminders */
  text: FieldChange<string | undefined>[];
  /** Array fields: reminders, remindersGlobal */
  arrays: FieldChange<string[] | undefined>[];
  /** Night order: firstNight, otherNight */
  nightOrder: FieldChange<number | undefined>[];
  /** Metadata: name, team, setup, edition, image */
  metadata: FieldChange<unknown>[];
}

/** Extended modified character with detailed change information */
export interface ModifiedCharacterDetailed {
  /** Current (new) version of character */
  currentCharacter: Character;
  /** Previous (old) version of character */
  previousCharacter: Character;
  /** List of field names that changed (for summary display) */
  changedFieldNames: string[];
  /** Detailed changes grouped by category */
  changes: CharacterChangesGrouped;
}

/** Extended character diff with detailed modifications */
export interface CharacterDiffDetailed {
  added: Character[];
  removed: Character[];
  modified: ModifiedCharacterDetailed[];
  unchanged: number;
}

/** Extended project diff with detailed character changes */
export interface ProjectDiffDetailed extends Omit<ProjectDiff, 'characters'> {
  characters: CharacterDiffDetailed;
}

// ==========================================================================
// Main Diff Function
// ==========================================================================

/**
 * Calculate the difference between two project states
 *
 * @param oldState - Previous project state
 * @param newState - New project state
 * @returns Structured diff showing all changes
 */
export function calculateProjectDiff(oldState: ProjectState, newState: ProjectState): ProjectDiff {
  return {
    hasChanges: !areStatesEqual(oldState, newState),
    characters: compareCharacters(oldState.characters, newState.characters),
    scriptMeta: compareScriptMeta(oldState.scriptMeta, newState.scriptMeta),
    generationOptions: compareGenerationOptions(
      oldState.generationOptions,
      newState.generationOptions
    ),
    customIcons: compareCustomIcons(oldState.customIcons, newState.customIcons),
    filters: compareFilters(oldState.filters, newState.filters),
  };
}

// ==========================================================================
// Comparison Functions
// ==========================================================================

/**
 * Quick equality check for states
 */
function areStatesEqual(state1: ProjectState, state2: ProjectState): boolean {
  try {
    return JSON.stringify(state1) === JSON.stringify(state2);
  } catch {
    return false;
  }
}

/**
 * Compare character arrays
 */
function compareCharacters(oldChars: Character[], newChars: Character[]): CharacterDiff {
  const oldMap = new Map(oldChars.map((c) => [c.id, c]));
  const newMap = new Map(newChars.map((c) => [c.id, c]));

  const added: Character[] = [];
  const removed: Character[] = [];
  const modified: ModifiedCharacter[] = [];
  let unchanged = 0;

  // Find added and modified
  for (const newChar of newChars) {
    const oldChar = oldMap.get(newChar.id);
    if (!oldChar) {
      added.push(newChar);
    } else {
      const changes = findCharacterChanges(oldChar, newChar);
      if (changes.length > 0) {
        modified.push({ character: newChar, changes });
      } else {
        unchanged++;
      }
    }
  }

  // Find removed
  for (const oldChar of oldChars) {
    if (!newMap.has(oldChar.id)) {
      removed.push(oldChar);
    }
  }

  return { added, removed, modified, unchanged };
}

/**
 * Find specific changes in a character
 */
function findCharacterChanges(oldChar: Character, newChar: Character): string[] {
  const changes: string[] = [];

  if (oldChar.name !== newChar.name) changes.push('name');
  if (oldChar.team !== newChar.team) changes.push('team');
  if (oldChar.ability !== newChar.ability) changes.push('ability');
  if (oldChar.image !== newChar.image) changes.push('image');
  if (JSON.stringify(oldChar.reminders) !== JSON.stringify(newChar.reminders)) {
    changes.push('reminders');
  }

  return changes;
}

/**
 * Compare script metadata
 */
function compareScriptMeta(
  oldMeta: ProjectState['scriptMeta'],
  newMeta: ProjectState['scriptMeta']
): ScriptMetaDiff {
  const fields: ScriptMetaDiff['fields'] = {};
  let changed = false;

  // Compare name
  if (oldMeta?.name !== newMeta?.name) {
    fields.name = { old: oldMeta?.name, new: newMeta?.name };
    changed = true;
  }

  // Compare author
  if (oldMeta?.author !== newMeta?.author) {
    fields.author = { old: oldMeta?.author, new: newMeta?.author };
    changed = true;
  }

  // Compare logo
  if (oldMeta?.logo !== newMeta?.logo) {
    fields.logo = { old: oldMeta?.logo, new: newMeta?.logo };
    changed = true;
  }

  return { changed, fields };
}

/**
 * Compare generation options
 */
function compareGenerationOptions(
  oldOptions: ProjectState['generationOptions'],
  newOptions: ProjectState['generationOptions']
): GenerationOptionsDiff {
  const fields: string[] = [];

  // Deep comparison of options object
  const oldKeys = Object.keys(oldOptions);
  const newKeys = Object.keys(newOptions);
  const allKeys = new Set([...oldKeys, ...newKeys]);

  for (const key of allKeys) {
    const oldValue = (oldOptions as unknown as Record<string, unknown>)[key];
    const newValue = (newOptions as unknown as Record<string, unknown>)[key];

    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      fields.push(key);
    }
  }

  return {
    changed: fields.length > 0,
    fields,
  };
}

/**
 * Compare custom icons
 */
function compareCustomIcons(
  oldIcons: ProjectState['customIcons'],
  newIcons: ProjectState['customIcons']
): CustomIconsDiff {
  const oldIds = new Set(oldIcons.map((i) => i.characterId));
  const newIds = new Set(newIcons.map((i) => i.characterId));

  let added = 0;
  let removed = 0;

  // Count added
  for (const id of newIds) {
    if (!oldIds.has(id)) added++;
  }

  // Count removed
  for (const id of oldIds) {
    if (!newIds.has(id)) removed++;
  }

  return {
    added,
    removed,
    changed: added > 0 || removed > 0,
  };
}

/**
 * Compare filters
 */
function compareFilters(
  oldFilters: ProjectState['filters'],
  newFilters: ProjectState['filters']
): FiltersDiff {
  const fields: string[] = [];

  if (!(oldFilters || newFilters)) {
    return { changed: false, fields: [] };
  }

  if (!(oldFilters && newFilters)) {
    return { changed: true, fields: ['all'] };
  }

  // Compare each filter array
  if (JSON.stringify(oldFilters.teams) !== JSON.stringify(newFilters.teams)) {
    fields.push('teams');
  }
  if (JSON.stringify(oldFilters.tokenTypes) !== JSON.stringify(newFilters.tokenTypes)) {
    fields.push('tokenTypes');
  }
  if (JSON.stringify(oldFilters.display) !== JSON.stringify(newFilters.display)) {
    fields.push('display');
  }
  if (JSON.stringify(oldFilters.reminders) !== JSON.stringify(newFilters.reminders)) {
    fields.push('reminders');
  }

  return {
    changed: fields.length > 0,
    fields,
  };
}

// ==========================================================================
// Summary Functions
// ==========================================================================

/**
 * Get a human-readable summary of the diff
 */
export function getDiffSummary(diff: ProjectDiff): string {
  const parts: string[] = [];

  if (!diff.hasChanges) {
    return 'No changes';
  }

  // Character changes
  if (diff.characters.added.length > 0) {
    parts.push(
      `${diff.characters.added.length} character${diff.characters.added.length !== 1 ? 's' : ''} added`
    );
  }
  if (diff.characters.removed.length > 0) {
    parts.push(
      `${diff.characters.removed.length} character${diff.characters.removed.length !== 1 ? 's' : ''} removed`
    );
  }
  if (diff.characters.modified.length > 0) {
    parts.push(
      `${diff.characters.modified.length} character${diff.characters.modified.length !== 1 ? 's' : ''} modified`
    );
  }

  // Script meta changes
  if (diff.scriptMeta.changed) {
    parts.push('script metadata changed');
  }

  // Generation options changes
  if (diff.generationOptions.changed) {
    parts.push('generation options changed');
  }

  // Custom icons changes
  if (diff.customIcons.changed) {
    parts.push(
      `${diff.customIcons.added + diff.customIcons.removed} custom icon${diff.customIcons.added + diff.customIcons.removed !== 1 ? 's' : ''} changed`
    );
  }

  // Filters changes
  if (diff.filters.changed) {
    parts.push('filters changed');
  }

  return parts.join(', ') || 'State changed';
}

/**
 * Get a count of total changes
 */
export function getChangeCount(diff: ProjectDiff): number {
  let count = 0;

  count += diff.characters.added.length;
  count += diff.characters.removed.length;
  count += diff.characters.modified.length;

  if (diff.scriptMeta.changed) count++;
  if (diff.generationOptions.changed) count++;
  if (diff.customIcons.changed) count++;
  if (diff.filters.changed) count++;

  return count;
}

// ==========================================================================
// Detailed Diff Functions
// ==========================================================================

/** Field name to display name mapping */
const FIELD_DISPLAY_NAMES: Record<string, string> = {
  ability: 'Ability',
  flavor: 'Flavor Text',
  overview: 'Overview',
  examples: 'Examples',
  howToRun: 'How to Run',
  tips: 'Tips',
  firstNightReminder: 'First Night Reminder',
  otherNightReminder: 'Other Night Reminder',
  reminders: 'Reminders',
  remindersGlobal: 'Global Reminders',
  firstNight: 'First Night Order',
  otherNight: 'Other Night Order',
  name: 'Name',
  team: 'Team',
  setup: 'Affects Setup',
  edition: 'Edition',
  image: 'Image',
};

/**
 * Convert camelCase field name to display name
 */
function getFieldDisplayName(fieldName: string): string {
  if (FIELD_DISPLAY_NAMES[fieldName]) {
    return FIELD_DISPLAY_NAMES[fieldName];
  }
  // Fallback: convert camelCase to Title Case
  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/** Text fields to compare (with word-level diff) */
const TEXT_FIELDS: (keyof Character)[] = [
  'ability',
  'flavor',
  'overview',
  'examples',
  'howToRun',
  'tips',
  'firstNightReminder',
  'otherNightReminder',
];

/** Array fields to compare */
const ARRAY_FIELDS: (keyof Character)[] = ['reminders', 'remindersGlobal'];

/** Night order fields (numeric) */
const NIGHT_ORDER_FIELDS: (keyof Character)[] = ['firstNight', 'otherNight'];

/** Metadata fields */
const METADATA_FIELDS: (keyof Character)[] = ['name', 'team', 'setup', 'edition', 'image'];

/**
 * Find detailed changes between two characters
 * Returns null if no changes found
 */
export function findCharacterChangesDetailed(
  oldChar: Character,
  newChar: Character
): ModifiedCharacterDetailed | null {
  const changedFieldNames: string[] = [];
  const changes: CharacterChangesGrouped = {
    text: [],
    arrays: [],
    nightOrder: [],
    metadata: [],
  };

  // Compare text fields (with word-level diff)
  for (const field of TEXT_FIELDS) {
    const oldValue = oldChar[field] as string | undefined;
    const newValue = newChar[field] as string | undefined;

    if (valuesAreDifferent(oldValue, newValue)) {
      changedFieldNames.push(field);
      const textDiff = diffText(oldValue, newValue);
      changes.text.push({
        fieldName: field,
        displayName: getFieldDisplayName(field),
        oldValue,
        newValue,
        textDiff,
      });
    }
  }

  // Compare array fields
  for (const field of ARRAY_FIELDS) {
    const oldValue = oldChar[field] as string[] | undefined;
    const newValue = newChar[field] as string[] | undefined;

    if (valuesAreDifferent(oldValue, newValue)) {
      changedFieldNames.push(field);
      const arrayDiff = diffArrays(oldValue, newValue);
      changes.arrays.push({
        fieldName: field,
        displayName: getFieldDisplayName(field),
        oldValue,
        newValue,
        arrayDiff,
      });
    }
  }

  // Compare night order fields
  for (const field of NIGHT_ORDER_FIELDS) {
    const oldValue = oldChar[field] as number | undefined;
    const newValue = newChar[field] as number | undefined;

    if (valuesAreDifferent(oldValue, newValue)) {
      changedFieldNames.push(field);
      changes.nightOrder.push({
        fieldName: field,
        displayName: getFieldDisplayName(field),
        oldValue,
        newValue,
      });
    }
  }

  // Compare metadata fields
  for (const field of METADATA_FIELDS) {
    const oldValue = oldChar[field];
    const newValue = newChar[field];

    if (valuesAreDifferent(oldValue, newValue)) {
      changedFieldNames.push(field);
      changes.metadata.push({
        fieldName: field,
        displayName: getFieldDisplayName(field),
        oldValue,
        newValue,
      });
    }
  }

  // Return null if no changes
  if (changedFieldNames.length === 0) {
    return null;
  }

  return {
    currentCharacter: newChar,
    previousCharacter: oldChar,
    changedFieldNames,
    changes,
  };
}

/**
 * Compare character arrays with detailed diff information
 */
function compareCharactersDetailed(
  oldChars: Character[],
  newChars: Character[]
): CharacterDiffDetailed {
  const oldMap = new Map(oldChars.map((c) => [c.id, c]));
  const newMap = new Map(newChars.map((c) => [c.id, c]));

  const added: Character[] = [];
  const removed: Character[] = [];
  const modified: ModifiedCharacterDetailed[] = [];
  let unchanged = 0;

  // Find added and modified
  for (const newChar of newChars) {
    const oldChar = oldMap.get(newChar.id);
    if (!oldChar) {
      added.push(newChar);
    } else {
      const detailedChanges = findCharacterChangesDetailed(oldChar, newChar);
      if (detailedChanges) {
        modified.push(detailedChanges);
      } else {
        unchanged++;
      }
    }
  }

  // Find removed
  for (const oldChar of oldChars) {
    if (!newMap.has(oldChar.id)) {
      removed.push(oldChar);
    }
  }

  return { added, removed, modified, unchanged };
}

/**
 * Calculate detailed difference between two project states
 * Use this for the expanded comparison view
 *
 * @param oldState - Previous project state
 * @param newState - New project state
 * @returns Detailed diff with full character change information
 */
export function calculateProjectDiffDetailed(
  oldState: ProjectState,
  newState: ProjectState
): ProjectDiffDetailed {
  return {
    hasChanges: !areStatesEqual(oldState, newState),
    characters: compareCharactersDetailed(oldState.characters, newState.characters),
    scriptMeta: compareScriptMeta(oldState.scriptMeta, newState.scriptMeta),
    generationOptions: compareGenerationOptions(
      oldState.generationOptions,
      newState.generationOptions
    ),
    customIcons: compareCustomIcons(oldState.customIcons, newState.customIcons),
    filters: compareFilters(oldState.filters, newState.filters),
  };
}

// Re-export types from textDiff for convenience
export type { ArrayDiffResult, TextDiffResult } from './textDiff.js';
