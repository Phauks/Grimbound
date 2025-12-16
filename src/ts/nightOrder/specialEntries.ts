/**
 * Special Night Order Entries
 *
 * Defines the special entries that appear in night order sheets:
 * - Dusk: Start of night phase
 * - Dawn: End of night phase
 * - Minion Info: First night only, minion wake-up information
 * - Demon Info: First night only, demon wake-up information
 */

import type { NightOrderEntry } from './nightOrderTypes.js';
import { SPECIAL_ENTRY_IDS } from './nightOrderTypes.js';

/**
 * Dusk - Always first in any night order
 */
export const DUSK_ENTRY: NightOrderEntry = {
    id: SPECIAL_ENTRY_IDS.DUSK,
    type: 'special',
    name: 'Dusk',
    ability: 'Start the Night Phase.',
    image: '/scripts/dusk.webp',
    team: 'special',
    order: -1000, // Very low to always sort first
    isOfficial: true,
    isLocked: true,
    nightType: 'both',
};

/**
 * Dawn - Always last in any night order
 */
export const DAWN_ENTRY: NightOrderEntry = {
    id: SPECIAL_ENTRY_IDS.DAWN,
    type: 'special',
    name: 'Dawn',
    ability: 'Wait for a few seconds. End the Night Phase.',
    image: '/scripts/dawn.webp',
    team: 'special',
    order: 1000, // Very high to always sort last
    isOfficial: true,
    isLocked: true,
    nightType: 'both',
};

/**
 * Minion Info - First night only
 * Shows when there are 7+ players
 */
export const MINION_INFO_ENTRY: NightOrderEntry = {
    id: SPECIAL_ENTRY_IDS.MINION_INFO,
    type: 'special',
    name: 'Minion Info',
    ability: 'If there are 7 or more players, wake all Minions: Show the *THIS IS THE DEMON* token. Point to the Demon. Show the *THESE ARE YOUR MINIONS* token. Point to the other Minions.',
    image: '/scripts/minioninfo.webp',
    team: 'special',
    order: 92.5, // Near end of first night, before Demon Info
    isOfficial: true,
    isLocked: true,
    nightType: 'first',
};

/**
 * Demon Info - First night only
 * Shows when there are 7+ players
 */
export const DEMON_INFO_ENTRY: NightOrderEntry = {
    id: SPECIAL_ENTRY_IDS.DEMON_INFO,
    type: 'special',
    name: 'Demon Info',
    ability: 'If there are 7 or more players, wake the Demon: Show the *THESE ARE YOUR MINIONS* token. Point to all Minions. Show the *THESE CHARACTERS ARE NOT IN PLAY* token. Show 3 not-in-play good character tokens.',
    image: '/scripts/demoninfo.webp',
    team: 'special',
    order: 95.5, // After Minion Info, near end of first night
    isOfficial: true,
    isLocked: true,
    nightType: 'first',
};

/**
 * All special entries for easy lookup
 */
export const SPECIAL_ENTRIES: Record<string, NightOrderEntry> = {
    [SPECIAL_ENTRY_IDS.DUSK]: DUSK_ENTRY,
    [SPECIAL_ENTRY_IDS.DAWN]: DAWN_ENTRY,
    [SPECIAL_ENTRY_IDS.MINION_INFO]: MINION_INFO_ENTRY,
    [SPECIAL_ENTRY_IDS.DEMON_INFO]: DEMON_INFO_ENTRY,
};

/**
 * Get a special entry by ID
 */
export function getSpecialEntry(id: string): NightOrderEntry | undefined {
    return SPECIAL_ENTRIES[id.toLowerCase()];
}

/**
 * Check if an ID represents a special entry
 */
export function isSpecialEntry(id: string): boolean {
    return id.toLowerCase() in SPECIAL_ENTRIES;
}

/**
 * Get all special entries for a specific night type
 */
export function getSpecialEntriesForNight(nightType: 'first' | 'other'): NightOrderEntry[] {
    const entries: NightOrderEntry[] = [DUSK_ENTRY];

    if (nightType === 'first') {
        entries.push(MINION_INFO_ENTRY);
        entries.push(DEMON_INFO_ENTRY);
    }

    entries.push(DAWN_ENTRY);

    return entries;
}

/**
 * Get entries that should appear at the start of the night
 * (currently just Dusk)
 */
export function getStartEntries(): NightOrderEntry[] {
    return [DUSK_ENTRY];
}

/**
 * Get entries that should appear at the end of the night
 * (currently just Dawn)
 */
export function getEndEntries(): NightOrderEntry[] {
    return [DAWN_ENTRY];
}

/**
 * Get info entries (Minion Info, Demon Info) for first night
 */
export function getInfoEntries(): NightOrderEntry[] {
    return [MINION_INFO_ENTRY, DEMON_INFO_ENTRY];
}
