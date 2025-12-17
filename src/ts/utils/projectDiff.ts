/**
 * Project State Diff Utility
 *
 * Calculates differences between two ProjectState objects for version comparison.
 * Useful for showing what changed between versions in the UI.
 */

import type { Character } from '../types/index';
import type { ProjectState } from '../types/project';

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
