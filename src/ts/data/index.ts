/**
 * Blood on the Clocktower Token Generator
 * Data Module - Barrel export for all data loading and parsing functionality
 */

// Character lookup service
export {
  CharacterLookupService,
  type CharacterLookupServiceDeps,
  characterLookup,
} from './characterLookup.js';
// Character utilities
export {
  calculateTokenCounts,
  countReminders,
  getCharacterImageUrl,
  getGlobalReminders,
  groupByTeam,
  validateCharacter,
} from './characterUtils.js';
// Data loading (I/O operations)
export {
  loadExampleScript,
  loadJsonFile,
} from './dataLoader.js';
export type { ICharacterLookupService } from './ICharacterLookup.js';
// Script parsing
export {
  extractScriptMeta,
  isCharacter,
  isIdReference,
  isScriptMeta,
  parseScriptData,
  type ScriptValidationResult,
  validateAndParseScript,
} from './scriptParser.js';
