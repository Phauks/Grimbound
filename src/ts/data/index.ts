/**
 * Blood on the Clocktower Token Generator
 * Data Module - Barrel export for all data loading and parsing functionality
 */

// Data loading (I/O operations)
export {
    loadExampleScript,
    loadJsonFile,
} from './dataLoader.js';

// Script parsing
export {
    parseScriptData,
    validateAndParseScript,
    extractScriptMeta,
    isScriptMeta,
    isCharacter,
    isIdReference,
    type ScriptValidationResult,
} from './scriptParser.js';

// Character utilities
export {
    validateCharacter,
    getCharacterImageUrl,
    countReminders,
    getGlobalReminders,
    groupByTeam,
    calculateTokenCounts,
} from './characterUtils.js';

// Character lookup service
export {
    characterLookup,
    CharacterLookupService,
} from './characterLookup.js';
