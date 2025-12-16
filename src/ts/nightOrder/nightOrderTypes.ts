/**
 * Night Order Types
 *
 * Type definitions for the Night Order sheet feature.
 * These types support both _meta array ordering and per-character number ordering.
 */

import type { Character, ScriptMeta, Team } from '../types/index.js';

/**
 * Type of night order entry
 * - 'character': A regular character from the script
 * - 'special': A special entry like Dusk, Dawn, Minion Info, Demon Info
 */
export type NightOrderEntryType = 'character' | 'special';

/**
 * Which night(s) this entry appears on
 */
export type NightType = 'first' | 'other' | 'both';

/**
 * Represents a single entry in the night order
 */
export interface NightOrderEntry {
  /** Character ID or special ID (dusk, dawn, minioninfo, demoninfo) */
  id: string;

  /** Type of entry */
  type: NightOrderEntryType;

  /** Display name */
  name: string;

  /** Ability/reminder text - may contain *bold* markers for reminder tokens and :reminder: for circles */
  ability: string;

  /** Path to the character/special icon image */
  image: string;

  /** Team color for styling (townsfolk, outsider, minion, demon, etc.) */
  team?: Team | 'special';

  /**
   * Order number from character data (for sorting when no _meta array)
   * - Positive numbers: official ordering
   * - 0 or undefined: no official order (custom character)
   * - Negative numbers: special entries (dusk = -1000, dawn = 1000)
   */
  order: number;

  /** Whether this is an official character (from official data) */
  isOfficial: boolean;

  /**
   * Whether this entry can be moved by drag-and-drop
   * - true: Entry is locked in place (official chars, special entries)
   * - false: Entry can be freely repositioned (custom chars)
   */
  isLocked: boolean;

  /** Which night(s) this entry appears on */
  nightType: NightType;

  /** Original Character object reference (for character entries) */
  character?: Character;
}

/**
 * The source of the night order
 * - 'meta': Order comes from _meta.firstNight/otherNight arrays
 * - 'numbers': Order comes from per-character firstNight/otherNight numbers
 */
export type NightOrderSource = 'meta' | 'numbers';

/**
 * Night order state for a single night type
 */
export interface NightOrderState {
  /** The ordered entries */
  entries: NightOrderEntry[];

  /** Source of the ordering */
  source: NightOrderSource;

  /** User overrides for custom character positions (id -> index) */
  customPositions: Map<string, number>;
}

/**
 * Complete night order context state
 */
export interface NightOrderContextState {
  /** First night order */
  firstNight: NightOrderState;

  /** Other nights order */
  otherNight: NightOrderState;

  /** Script meta information */
  scriptMeta: ScriptMeta | null;

  /** Whether the night order has been modified from default */
  isDirty: boolean;

  /** Loading state */
  isLoading: boolean;

  /** Error message if any */
  error: string | null;
}

/**
 * Actions for the night order context
 */
export interface NightOrderContextActions {
  /** Initialize night order from script data */
  initializeFromScript: (script: (string | Character | ScriptMeta | { id: string })[]) => void;

  /** Move a custom character to a new position */
  moveEntry: (nightType: 'first' | 'other', entryId: string, newIndex: number) => void;

  /** Reset to default ordering */
  resetOrder: (nightType: 'first' | 'other') => void;

  /** Reset all ordering */
  resetAll: () => void;

  /** Clear all data */
  clear: () => void;
}

/**
 * Complete night order context value
 */
export interface NightOrderContextValue extends NightOrderContextState, NightOrderContextActions {}

/**
 * Extended ScriptMeta with night order arrays
 * This extends the base ScriptMeta to include the optional night order arrays
 */
export interface ScriptMetaWithNightOrder extends ScriptMeta {
  /** Array of character IDs for first night order */
  firstNight?: string[];

  /** Array of character IDs for other nights order */
  otherNight?: string[];
}

/**
 * Special entry IDs
 */
export const SPECIAL_ENTRY_IDS = {
  DUSK: 'dusk',
  DAWN: 'dawn',
  MINION_INFO: 'minioninfo',
  DEMON_INFO: 'demoninfo',
} as const;

/**
 * Type for special entry IDs
 */
export type SpecialEntryId = (typeof SPECIAL_ENTRY_IDS)[keyof typeof SPECIAL_ENTRY_IDS];

/**
 * Check if an ID is a special entry
 */
export function isSpecialEntryId(id: string): id is SpecialEntryId {
  return Object.values(SPECIAL_ENTRY_IDS).includes(id as SpecialEntryId);
}
