/**
 * TokenEditor Types
 *
 * Shared type definitions for TokenEditor and its sub-components.
 *
 * @module components/CharactersComponents/TokenEditor/types
 */

import type { Character, DecorativeOverrides, GenerationOptions } from '@/ts/types/index.js';

/**
 * Extended character type that includes the optional `special` property
 * used for app integration features (clocktower.online, etc.)
 */
export interface CharacterWithSpecial extends Character {
  special?: SpecialItem | SpecialItem[];
}

/** Special item for app integration features */
export interface SpecialItem {
  type?: string;
  name?: string;
  value?: string | number;
  time?: string;
  global?: string;
}

/**
 * Base props shared across all TokenEditor tab components
 */
export interface TokenEditorTabBaseProps {
  /** The character being edited */
  character: Character;
  /** Whether this is an official (read-only) character */
  isOfficial: boolean;
  /** Callback to update a single character field */
  onEditChange: (field: keyof Character, value: Character[keyof Character]) => void;
  /** Callback to replace the entire character */
  onReplaceCharacter?: (character: Character) => void;
}

/**
 * Props for the Gameplay tab
 */
export interface GameplayTabProps extends TokenEditorTabBaseProps {
  /** Callback when preview should refresh */
  onRefreshPreview?: () => void;
  /** Callback when user wants to preview a specific image variant */
  onPreviewVariant?: (imageUrl: string | undefined) => void;
  /** Character UUID for metadata operations */
  charUuid: string;
  /** Whether ID is linked to name */
  isIdLinked: boolean;
  /** Callback when ID link state changes */
  onIdLinkChange: (linked: boolean) => void;
}

/**
 * Props for the Almanac tab
 */
export interface AlmanacTabProps extends TokenEditorTabBaseProps {
  // Almanac tab uses base props only
}

/**
 * Props for the Decoratives tab
 */
export interface DecorativesTabProps {
  character: Character;
  decoratives: DecorativeOverrides;
  generationOptions: GenerationOptions;
  onDecorativesChange: (updates: Partial<DecorativeOverrides>) => void;
  projectId?: string;
}

/**
 * Props for the JSON tab
 */
export interface JsonTabProps extends TokenEditorTabBaseProps {
  /** Character UUID for metadata display */
  charUuid: string;
  /** Character metadata */
  metadata: {
    idLinkedToName: boolean;
    decoratives?: DecorativeOverrides;
  };
}

/**
 * Available tabs in the TokenEditor
 */
export type TokenEditorTab = 'info' | 'almanac' | 'decoratives' | 'json';

/**
 * Available sub-tabs in the JSON tab
 */
export type JsonSubTab = 'character' | 'metadata';

/**
 * Map of team names to CSS class suffixes
 */
export const TEAM_SELECT_CLASS_MAP: Record<string, string> = {
  townsfolk: 'teamTownsfolk',
  outsider: 'teamOutsider',
  minion: 'teamMinion',
  demon: 'teamDemon',
  traveller: 'teamTraveller',
  traveler: 'teamTraveller',
  fabled: 'teamFabled',
  loric: 'teamLoric',
};

/**
 * Available special types for app integration
 */
export const SPECIAL_TYPES = [
  'selection',
  'ability',
  'signal',
  'vote',
  'reveal',
  'player',
] as const;

/**
 * Available special names for app integration
 */
export const SPECIAL_NAMES = [
  'grimoire',
  'pointing',
  'ghost-votes',
  'distribute-roles',
  'bag-disabled',
  'bag-duplicate',
  'multiplier',
  'hidden',
  'replace-character',
  'player',
  'card',
  'open-eyes',
] as const;

/**
 * Available special times for app integration
 */
export const SPECIAL_TIMES = [
  '',
  'pregame',
  'day',
  'night',
  'firstNight',
  'firstDay',
  'otherNight',
  'otherDay',
] as const;

/**
 * Available special globals for app integration
 */
export const SPECIAL_GLOBALS = [
  '',
  'townsfolk',
  'outsider',
  'minion',
  'demon',
  'traveller',
  'dead',
] as const;
