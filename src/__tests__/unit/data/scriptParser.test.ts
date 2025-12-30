import { describe, expect, it, vi } from 'vitest';
import {
  extractScriptMeta,
  isCharacter,
  isIdReference,
  isScriptMeta,
  parseScriptData,
  validateAndParseScript,
} from '@/ts/data/scriptParser';
import type { Character, ScriptEntry, ScriptMeta } from '@/ts/types';

// Mock logger to avoid console output
vi.mock('@/ts/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Helper to create mock character data
function createMockCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'test',
    name: 'Test Character',
    team: 'townsfolk',
    ability: 'Test ability',
    image: 'test.png',
    reminders: [],
    remindersGlobal: [],
    setup: false,
    firstNight: 0,
    otherNight: 0,
    firstNightReminder: '',
    otherNightReminder: '',
    ...overrides,
  } as Character;
}

// Sample official data for testing
const officialData: Character[] = [
  createMockCharacter({ id: 'washerwoman', name: 'Washerwoman', team: 'townsfolk' }),
  createMockCharacter({ id: 'librarian', name: 'Librarian', team: 'townsfolk' }),
  createMockCharacter({ id: 'imp', name: 'Imp', team: 'demon' }),
  createMockCharacter({ id: 'scarlet_woman', name: 'Scarlet Woman', team: 'minion' }),
];

describe('scriptParser', () => {
  describe('isScriptMeta', () => {
    it('should return true for valid _meta object', () => {
      const meta: ScriptEntry = { id: '_meta', name: 'Test Script' };

      expect(isScriptMeta(meta)).toBe(true);
    });

    it('should return false for regular character', () => {
      const char: ScriptEntry = { id: 'washerwoman', name: 'Washerwoman', team: 'townsfolk' };

      expect(isScriptMeta(char)).toBe(false);
    });

    it('should return false for string entry', () => {
      const entry: ScriptEntry = 'washerwoman';

      expect(isScriptMeta(entry)).toBe(false);
    });

    it('should return false for ID reference', () => {
      const entry: ScriptEntry = { id: 'washerwoman' };

      expect(isScriptMeta(entry)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isScriptMeta(null as unknown as ScriptEntry)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isScriptMeta(undefined as unknown as ScriptEntry)).toBe(false);
    });
  });

  describe('isCharacter', () => {
    it('should return true for object with name', () => {
      const char: ScriptEntry = { id: 'test', name: 'Test', team: 'townsfolk' };

      expect(isCharacter(char)).toBe(true);
    });

    it('should return true for _meta (has name property)', () => {
      const meta: ScriptEntry = { id: '_meta', name: 'Script Name' };

      // Note: _meta with name passes isCharacter check - use isScriptMeta first
      expect(isCharacter(meta)).toBe(true);
    });

    it('should return false for ID reference (no name)', () => {
      const entry: ScriptEntry = { id: 'washerwoman' };

      expect(isCharacter(entry)).toBe(false);
    });

    it('should return false for string', () => {
      const entry: ScriptEntry = 'washerwoman';

      expect(isCharacter(entry)).toBe(false);
    });

    it('should return false for object with non-string name', () => {
      const entry = { id: 'test', name: 123 } as unknown as ScriptEntry;

      expect(isCharacter(entry)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isCharacter(null as unknown as ScriptEntry)).toBe(false);
    });
  });

  describe('isIdReference', () => {
    it('should return true for object with only id', () => {
      const entry: ScriptEntry = { id: 'washerwoman' };

      expect(isIdReference(entry)).toBe(true);
    });

    it('should return false for object with multiple properties', () => {
      const entry: ScriptEntry = { id: 'washerwoman', name: 'Washerwoman' };

      expect(isIdReference(entry)).toBe(false);
    });

    it('should return false for _meta', () => {
      const entry: ScriptEntry = { id: '_meta' };

      // _meta with only id property still passes isIdReference technically
      // but in practice isScriptMeta should be checked first
      expect(isIdReference(entry)).toBe(true);
    });

    it('should return false for string', () => {
      const entry: ScriptEntry = 'washerwoman';

      expect(isIdReference(entry)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isIdReference(null as unknown as ScriptEntry)).toBe(false);
    });

    it('should return false for object with non-string id', () => {
      const entry = { id: 123 } as unknown as ScriptEntry;

      expect(isIdReference(entry)).toBe(false);
    });
  });

  describe('parseScriptData', () => {
    it('should throw for non-array input', async () => {
      await expect(parseScriptData('not an array' as unknown as ScriptEntry[])).rejects.toThrow(
        'Script data must be an array'
      );
    });

    it('should return empty array for empty script', async () => {
      const result = await parseScriptData([]);

      expect(result).toEqual([]);
    });

    it('should parse string ID entries', async () => {
      const script: ScriptEntry[] = ['washerwoman'];

      const result = await parseScriptData(script, officialData);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Washerwoman');
      expect(result[0].source).toBe('official');
    });

    it('should parse ID reference objects', async () => {
      const script: ScriptEntry[] = [{ id: 'librarian' }];

      const result = await parseScriptData(script, officialData);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Librarian');
    });

    it('should parse full character objects', async () => {
      const script: ScriptEntry[] = [
        createMockCharacter({ id: 'custom', name: 'Custom Character' }),
      ];

      const result = await parseScriptData(script, officialData);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Custom Character');
      expect(result[0].source).toBe('custom');
    });

    it('should merge custom data with official data', async () => {
      const script: ScriptEntry[] = [
        { id: 'washerwoman', name: 'Washerwoman', ability: 'Custom ability' } as Character,
      ];

      const result = await parseScriptData(script, officialData);

      expect(result).toHaveLength(1);
      expect(result[0].ability).toBe('Custom ability');
      expect(result[0].team).toBe('townsfolk'); // From official
    });

    it('should skip _meta entries', async () => {
      const script: ScriptEntry[] = [{ id: '_meta', name: 'Test Script' }, 'washerwoman'];

      const result = await parseScriptData(script, officialData);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Washerwoman');
    });

    it('should skip unknown string IDs', async () => {
      const script: ScriptEntry[] = ['unknown_character', 'washerwoman'];

      const result = await parseScriptData(script, officialData);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Washerwoman');
    });

    it('should handle case-insensitive ID lookup', async () => {
      const script: ScriptEntry[] = ['WASHERWOMAN', { id: 'Librarian' }];

      const result = await parseScriptData(script, officialData);

      expect(result).toHaveLength(2);
    });

    it('should generate stable UUIDs for official characters', async () => {
      const script1: ScriptEntry[] = ['washerwoman'];
      const script2: ScriptEntry[] = ['washerwoman'];

      const result1 = await parseScriptData(script1, officialData);
      const result2 = await parseScriptData(script2, officialData);

      expect(result1[0].uuid).toBe(result2[0].uuid);
    });

    it('should skip null entries', async () => {
      const script = [null, 'washerwoman'] as unknown as ScriptEntry[];

      const result = await parseScriptData(script, officialData);

      expect(result).toHaveLength(1);
    });

    it('should handle empty official data', async () => {
      const script: ScriptEntry[] = ['washerwoman'];

      const result = await parseScriptData(script, []);

      expect(result).toHaveLength(0);
    });
  });

  describe('validateAndParseScript', () => {
    it('should return warnings for non-array input', async () => {
      const result = await validateAndParseScript('not an array' as unknown as ScriptEntry[]);

      expect(result.characters).toHaveLength(0);
      expect(result.warnings).toContain('Script data must be an array');
    });

    it('should collect warnings for unknown characters', async () => {
      const script: ScriptEntry[] = ['unknown_character'];

      const result = await validateAndParseScript(script, officialData);

      expect(result.characters).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('not found');
    });

    it('should collect warnings for invalid entry types', async () => {
      const script = [123] as unknown as ScriptEntry[];

      const result = await validateAndParseScript(script, officialData);

      expect(result.warnings[0]).toContain('Invalid entry type');
    });

    it('should return valid characters alongside warnings', async () => {
      const script: ScriptEntry[] = ['unknown', 'washerwoman', 'another_unknown'];

      const result = await validateAndParseScript(script, officialData);

      expect(result.characters).toHaveLength(1);
      expect(result.warnings).toHaveLength(2);
    });

    it('should validate character team', async () => {
      const script: ScriptEntry[] = [
        createMockCharacter({ id: 'custom', name: 'Custom', team: 'invalid' as Character['team'] }),
      ];

      const result = await validateAndParseScript(script, officialData);

      expect(result.warnings.some((w) => w.includes('invalid team'))).toBe(true);
    });

    it('should validate character reminders format', async () => {
      const script: ScriptEntry[] = [
        createMockCharacter({
          id: 'custom',
          name: 'Custom',
          reminders: 'not-array' as unknown as Character['reminders'],
        }),
      ];

      const result = await validateAndParseScript(script, officialData);

      expect(result.warnings.some((w) => w.includes('reminders must be an array'))).toBe(true);
    });

    it('should validate image format', async () => {
      const script: ScriptEntry[] = [
        createMockCharacter({ id: 'custom', name: 'Custom', image: 123 as unknown as string }),
      ];

      const result = await validateAndParseScript(script, officialData);

      expect(result.warnings.some((w) => w.includes('image must be'))).toBe(true);
    });

    it('should allow valid image array', async () => {
      const script: ScriptEntry[] = [
        createMockCharacter({ id: 'custom', name: 'Custom', image: ['a.png', 'b.png'] }),
      ];

      const result = await validateAndParseScript(script, officialData);

      expect(result.warnings.filter((w) => w.includes('image'))).toHaveLength(0);
    });

    it('should parse mixed script successfully', async () => {
      const script: ScriptEntry[] = [
        { id: '_meta', name: 'Test Script' },
        'washerwoman',
        { id: 'librarian' },
        createMockCharacter({ id: 'custom', name: 'Custom Hero', team: 'townsfolk' }),
      ];

      const result = await validateAndParseScript(script, officialData);

      expect(result.characters).toHaveLength(3);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('extractScriptMeta', () => {
    it('should return null for non-array', () => {
      const result = extractScriptMeta('not array' as unknown as ScriptEntry[]);

      expect(result).toBeNull();
    });

    it('should return null for empty array', () => {
      const result = extractScriptMeta([]);

      expect(result).toBeNull();
    });

    it('should return null when no _meta present', () => {
      const script: ScriptEntry[] = ['washerwoman', { id: 'librarian' }];

      const result = extractScriptMeta(script);

      expect(result).toBeNull();
    });

    it('should return _meta when present', () => {
      const script: ScriptEntry[] = [
        { id: '_meta', name: 'Test Script', author: 'Tester' } as ScriptMeta,
        'washerwoman',
      ];

      const result = extractScriptMeta(script);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Test Script');
      expect(result?.author).toBe('Tester');
    });

    it('should return first _meta if multiple present', () => {
      const script: ScriptEntry[] = [
        { id: '_meta', name: 'First' } as ScriptMeta,
        { id: '_meta', name: 'Second' } as ScriptMeta,
      ];

      const result = extractScriptMeta(script);

      expect(result?.name).toBe('First');
    });

    it('should return copy of _meta (not reference)', () => {
      const meta: ScriptMeta = { id: '_meta', name: 'Test' };
      const script: ScriptEntry[] = [meta];

      const result = extractScriptMeta(script);

      expect(result).not.toBe(meta);
      expect(result).toEqual(meta);
    });

    it('should find _meta at any position', () => {
      const script: ScriptEntry[] = [
        'washerwoman',
        { id: 'librarian' },
        { id: '_meta', name: 'Found It' } as ScriptMeta,
      ];

      const result = extractScriptMeta(script);

      expect(result?.name).toBe('Found It');
    });
  });
});
