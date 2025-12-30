import { describe, expect, it } from 'vitest';
import type { Character, ScriptMeta } from '@/ts/types';
import {
  charactersToJson,
  condenseScript,
  deepClone,
  formatJson,
  getCleanJsonForExport,
  hasCondensableReferences,
  stripInternalFields,
  validateJson,
} from '@/ts/utils/jsonUtils';

describe('jsonUtils', () => {
  describe('formatJson', () => {
    it('should format valid JSON with indentation', () => {
      const input = '{"name":"test","value":123}';
      const result = formatJson(input);
      expect(result).toBe('{\n  "name": "test",\n  "value": 123\n}');
    });

    it('should format JSON arrays', () => {
      const input = '[1,2,3]';
      const result = formatJson(input);
      expect(result).toBe('[\n  1,\n  2,\n  3\n]');
    });

    it('should return original string for invalid JSON', () => {
      const input = 'not valid json';
      const result = formatJson(input);
      expect(result).toBe(input);
    });

    it('should handle empty objects', () => {
      const input = '{}';
      const result = formatJson(input);
      expect(result).toBe('{}');
    });

    it('should handle nested objects', () => {
      const input = '{"a":{"b":1}}';
      const result = formatJson(input);
      expect(result).toContain('"a": {');
      expect(result).toContain('"b": 1');
    });
  });

  describe('validateJson', () => {
    it('should return valid for valid JSON array', () => {
      const result = validateJson('[{"id":"test"}]');
      expect(result.valid).toBe(true);
      expect(result.data).toEqual([{ id: 'test' }]);
    });

    it('should return invalid for empty string', () => {
      const result = validateJson('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('JSON is empty');
    });

    it('should return invalid for whitespace only', () => {
      const result = validateJson('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('JSON is empty');
    });

    it('should return invalid for non-array JSON', () => {
      const result = validateJson('{"id":"test"}');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('JSON must be an array');
    });

    it('should return invalid for malformed JSON', () => {
      const result = validateJson('[{invalid}]');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid JSON');
    });

    it('should handle valid empty array', () => {
      const result = validateJson('[]');
      expect(result.valid).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle array of strings', () => {
      const result = validateJson('["washerwoman", "librarian"]');
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(['washerwoman', 'librarian']);
    });
  });

  describe('deepClone', () => {
    it('should clone simple objects', () => {
      const original = { name: 'test', value: 123 };
      const cloned = deepClone(original);
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
    });

    it('should clone nested objects', () => {
      const original = { a: { b: { c: 1 } } };
      const cloned = deepClone(original);
      expect(cloned).toEqual(original);
      expect(cloned.a).not.toBe(original.a);
      expect(cloned.a.b).not.toBe(original.a.b);
    });

    it('should clone arrays', () => {
      const original = [1, 2, { a: 3 }];
      const cloned = deepClone(original);
      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned[2]).not.toBe(original[2]);
    });

    it('should return null for null input', () => {
      expect(deepClone(null)).toBeNull();
    });

    it('should return undefined for undefined input', () => {
      expect(deepClone(undefined)).toBeUndefined();
    });

    it('should clone primitives', () => {
      expect(deepClone(42)).toBe(42);
      expect(deepClone('string')).toBe('string');
      expect(deepClone(true)).toBe(true);
    });
  });

  describe('stripInternalFields', () => {
    it('should remove uuid field', () => {
      const input = { id: 'test', name: 'Test', uuid: 'abc-123' };
      const result = stripInternalFields(input);
      expect(result).toEqual({ id: 'test', name: 'Test' });
      expect(result).not.toHaveProperty('uuid');
    });

    it('should remove source field', () => {
      const input = { id: 'test', name: 'Test', source: 'official' };
      const result = stripInternalFields(input);
      expect(result).toEqual({ id: 'test', name: 'Test' });
      expect(result).not.toHaveProperty('source');
    });

    it('should remove both uuid and source', () => {
      const input = { id: 'test', uuid: 'abc', source: 'custom', name: 'Test' };
      const result = stripInternalFields(input);
      expect(result).toEqual({ id: 'test', name: 'Test' });
    });

    it('should not modify object without internal fields', () => {
      const input = { id: 'test', name: 'Test' };
      const result = stripInternalFields(input);
      expect(result).toEqual({ id: 'test', name: 'Test' });
    });

    it('should handle null input', () => {
      const result = stripInternalFields(null as unknown as Record<string, unknown>);
      expect(result).toBeNull();
    });
  });

  describe('getCleanJsonForExport', () => {
    it('should strip uuid and source from all entries', () => {
      const input = JSON.stringify([
        { id: 'test1', name: 'Test 1', uuid: 'abc', source: 'official' },
        { id: 'test2', name: 'Test 2', uuid: 'def', source: 'custom' },
      ]);
      const result = JSON.parse(getCleanJsonForExport(input));
      expect(result[0]).not.toHaveProperty('uuid');
      expect(result[0]).not.toHaveProperty('source');
      expect(result[1]).not.toHaveProperty('uuid');
      expect(result[1]).not.toHaveProperty('source');
    });

    it('should preserve string entries', () => {
      const input = JSON.stringify(['washerwoman', 'librarian']);
      const result = JSON.parse(getCleanJsonForExport(input));
      expect(result).toEqual(['washerwoman', 'librarian']);
    });

    it('should handle mixed array', () => {
      const input = JSON.stringify([
        { id: '_meta', name: 'Script' },
        'washerwoman',
        { id: 'custom', name: 'Custom', uuid: 'abc' },
      ]);
      const result = JSON.parse(getCleanJsonForExport(input));
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ id: '_meta', name: 'Script' });
      expect(result[1]).toBe('washerwoman');
      expect(result[2]).not.toHaveProperty('uuid');
    });

    it('should return original string for invalid JSON', () => {
      const input = 'invalid json';
      expect(getCleanJsonForExport(input)).toBe(input);
    });

    it('should return original string for non-array JSON', () => {
      const input = '{"id": "test"}';
      expect(getCleanJsonForExport(input)).toBe(input);
    });
  });

  describe('hasCondensableReferences', () => {
    const officialData: Character[] = [
      { id: 'washerwoman', name: 'Washerwoman', team: 'townsfolk', ability: '' },
      { id: 'librarian', name: 'Librarian', team: 'townsfolk', ability: '' },
    ] as Character[];

    it('should return true for condensable object references', () => {
      const input = JSON.stringify([{ id: 'washerwoman' }]);
      expect(hasCondensableReferences(input, officialData)).toBe(true);
    });

    it('should return false for string references', () => {
      const input = JSON.stringify(['washerwoman']);
      expect(hasCondensableReferences(input, officialData)).toBe(false);
    });

    it('should return false for full character objects', () => {
      const input = JSON.stringify([{ id: 'washerwoman', name: 'Washerwoman' }]);
      expect(hasCondensableReferences(input, officialData)).toBe(false);
    });

    it('should return false for non-official characters', () => {
      const input = JSON.stringify([{ id: 'custom_char' }]);
      expect(hasCondensableReferences(input, officialData)).toBe(false);
    });

    it('should return false for invalid JSON', () => {
      expect(hasCondensableReferences('invalid', officialData)).toBe(false);
    });

    it('should return false for non-array JSON', () => {
      expect(hasCondensableReferences('{"id":"test"}', officialData)).toBe(false);
    });
  });

  describe('condenseScript', () => {
    const officialData: Character[] = [
      { id: 'washerwoman', name: 'Washerwoman', team: 'townsfolk', ability: '' },
      { id: 'librarian', name: 'Librarian', team: 'townsfolk', ability: '' },
    ] as Character[];

    it('should convert object references to string IDs', () => {
      const input = JSON.stringify([{ id: 'washerwoman' }, { id: 'librarian' }]);
      const result = JSON.parse(condenseScript(input, officialData));
      expect(result).toEqual(['washerwoman', 'librarian']);
    });

    it('should preserve string IDs', () => {
      const input = JSON.stringify(['washerwoman', 'librarian']);
      const result = JSON.parse(condenseScript(input, officialData));
      expect(result).toEqual(['washerwoman', 'librarian']);
    });

    it('should preserve full character objects', () => {
      const input = JSON.stringify([
        { id: 'washerwoman', name: 'Washerwoman', ability: 'Custom ability' },
      ]);
      const result = JSON.parse(condenseScript(input, officialData));
      expect(result[0]).toHaveProperty('name');
    });

    it('should preserve _meta objects', () => {
      const input = JSON.stringify([{ id: '_meta', name: 'My Script' }]);
      const result = JSON.parse(condenseScript(input, officialData));
      expect(result[0]).toEqual({ id: '_meta', name: 'My Script' });
    });

    it('should not condense non-official characters', () => {
      const input = JSON.stringify([{ id: 'custom_char' }]);
      const result = JSON.parse(condenseScript(input, officialData));
      expect(result[0]).toEqual({ id: 'custom_char' });
    });

    it('should return original string for invalid JSON', () => {
      const input = 'invalid json';
      expect(condenseScript(input, officialData)).toBe(input);
    });
  });

  describe('charactersToJson', () => {
    it('should convert official characters to string IDs', () => {
      const characters: Character[] = [
        {
          id: 'washerwoman',
          name: 'Washerwoman',
          team: 'townsfolk',
          ability: '',
          source: 'official',
        },
      ] as Character[];
      const result = JSON.parse(charactersToJson(characters, null));
      expect(result).toEqual(['washerwoman']);
    });

    it('should convert custom characters to full objects', () => {
      const characters: Character[] = [
        {
          id: 'custom',
          name: 'Custom',
          team: 'townsfolk',
          ability: 'Test ability',
          source: 'custom',
        },
      ] as Character[];
      const result = JSON.parse(charactersToJson(characters, null));
      expect(result[0]).toHaveProperty('id', 'custom');
      expect(result[0]).toHaveProperty('name', 'Custom');
      expect(result[0]).toHaveProperty('ability', 'Test ability');
    });

    it('should include meta entry first when provided', () => {
      const characters: Character[] = [
        {
          id: 'washerwoman',
          name: 'Washerwoman',
          team: 'townsfolk',
          ability: '',
          source: 'official',
        },
      ] as Character[];
      const meta: ScriptMeta = { id: '_meta', name: 'Test Script', author: 'Author' };
      const result = JSON.parse(charactersToJson(characters, meta));
      expect(result[0]).toEqual({ id: '_meta', name: 'Test Script', author: 'Author' });
      expect(result[1]).toBe('washerwoman');
    });

    it('should not include empty meta fields', () => {
      const characters: Character[] = [];
      const meta: ScriptMeta = { id: '_meta', name: 'Test Script' };
      const result = JSON.parse(charactersToJson(characters, meta));
      expect(result[0]).toEqual({ id: '_meta', name: 'Test Script' });
      expect(result[0]).not.toHaveProperty('author');
      expect(result[0]).not.toHaveProperty('logo');
    });

    it('should only include team if not townsfolk', () => {
      const characters: Character[] = [
        { id: 'custom1', name: 'Custom 1', team: 'townsfolk', ability: '', source: 'custom' },
        { id: 'custom2', name: 'Custom 2', team: 'demon', ability: '', source: 'custom' },
      ] as Character[];
      const result = JSON.parse(charactersToJson(characters, null));
      expect(result[0]).not.toHaveProperty('team');
      expect(result[1]).toHaveProperty('team', 'demon');
    });

    it('should include reminders if non-empty', () => {
      const characters: Character[] = [
        {
          id: 'custom',
          name: 'Custom',
          team: 'townsfolk',
          ability: '',
          source: 'custom',
          reminders: [{ text: 'Reminder 1' }],
        },
      ] as Character[];
      const result = JSON.parse(charactersToJson(characters, null));
      expect(result[0]).toHaveProperty('reminders');
    });

    it('should handle empty characters array', () => {
      const result = JSON.parse(charactersToJson([], null));
      expect(result).toEqual([]);
    });

    it('should handle empty characters with meta', () => {
      const meta: ScriptMeta = { id: '_meta', name: 'Empty Script' };
      const result = JSON.parse(charactersToJson([], meta));
      expect(result).toEqual([{ id: '_meta', name: 'Empty Script' }]);
    });
  });
});
