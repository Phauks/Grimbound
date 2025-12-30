import { describe, expect, it } from 'vitest';
import type { Character, ScriptEntry } from '@/ts/types';
import {
  getScriptSortStats,
  isScriptJsonSortedBySAO,
  isScriptSortedBySAO,
  SAO_ABILITY_PREFIXES,
  SAO_TEAM_ORDER,
  sortScriptBySAO,
  sortScriptJsonBySAO,
} from '@/ts/utils/scriptSorting';

// Helper to create mock characters
function createMockCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'test',
    name: 'Test',
    team: 'townsfolk',
    ability: 'Test ability',
    ...overrides,
  } as Character;
}

describe('scriptSorting', () => {
  describe('SAO_TEAM_ORDER', () => {
    it('should have teams in correct order', () => {
      expect(SAO_TEAM_ORDER[0]).toBe('townsfolk');
      expect(SAO_TEAM_ORDER[1]).toBe('outsider');
      expect(SAO_TEAM_ORDER[2]).toBe('minion');
      expect(SAO_TEAM_ORDER[3]).toBe('demon');
      expect(SAO_TEAM_ORDER[4]).toBe('traveller');
      expect(SAO_TEAM_ORDER[5]).toBe('fabled');
      expect(SAO_TEAM_ORDER[6]).toBe('loric');
    });

    it('should have 7 teams', () => {
      expect(SAO_TEAM_ORDER).toHaveLength(7);
    });
  });

  describe('SAO_ABILITY_PREFIXES', () => {
    it('should start with "You start knowing"', () => {
      expect(SAO_ABILITY_PREFIXES[0]).toBe('You start knowing');
    });

    it('should include common prefixes', () => {
      expect(SAO_ABILITY_PREFIXES).toContain('Each night');
      expect(SAO_ABILITY_PREFIXES).toContain('Once per game');
      expect(SAO_ABILITY_PREFIXES).toContain('When you die');
      expect(SAO_ABILITY_PREFIXES).toContain('If you');
    });

    it('should have more specific prefixes before general ones', () => {
      const eachNightStarIndex = SAO_ABILITY_PREFIXES.indexOf('Each night*');
      const eachNightIndex = SAO_ABILITY_PREFIXES.indexOf('Each night');
      expect(eachNightStarIndex).toBeLessThan(eachNightIndex);

      const oncePerGameNightIndex = SAO_ABILITY_PREFIXES.indexOf('Once per game, at night');
      const oncePerGameIndex = SAO_ABILITY_PREFIXES.indexOf('Once per game');
      expect(oncePerGameNightIndex).toBeLessThan(oncePerGameIndex);
    });
  });

  describe('sortScriptBySAO', () => {
    it('should sort characters by team', () => {
      const demon = createMockCharacter({ id: 'demon1', name: 'Demon', team: 'demon' });
      const townsfolk = createMockCharacter({ id: 'town1', name: 'Townsfolk', team: 'townsfolk' });
      const minion = createMockCharacter({ id: 'minion1', name: 'Minion', team: 'minion' });

      const result = sortScriptBySAO([demon, townsfolk, minion]);

      expect((result[0] as Character).team).toBe('townsfolk');
      expect((result[1] as Character).team).toBe('minion');
      expect((result[2] as Character).team).toBe('demon');
    });

    it('should keep _meta at the beginning', () => {
      const meta = { id: '_meta', name: 'Test Script' };
      const char = createMockCharacter({ id: 'char1', name: 'Character' });

      const result = sortScriptBySAO([char, meta]);

      expect((result[0] as { id: string }).id).toBe('_meta');
    });

    it('should sort by ability prefix within same team', () => {
      const startKnowing = createMockCharacter({
        id: 'a',
        name: 'A',
        team: 'townsfolk',
        ability: 'You start knowing something',
      });
      const eachNight = createMockCharacter({
        id: 'b',
        name: 'B',
        team: 'townsfolk',
        ability: 'Each night, do something',
      });

      const result = sortScriptBySAO([eachNight, startKnowing]);

      expect((result[0] as Character).id).toBe('a'); // "You start knowing" comes first
      expect((result[1] as Character).id).toBe('b');
    });

    it('should sort by ability length within same prefix group', () => {
      const short = createMockCharacter({
        id: 'short',
        name: 'Short',
        team: 'townsfolk',
        ability: 'Each night, X',
      });
      const long = createMockCharacter({
        id: 'long',
        name: 'Long',
        team: 'townsfolk',
        ability: 'Each night, do something very long and complex',
      });

      const result = sortScriptBySAO([long, short]);

      expect((result[0] as Character).id).toBe('short');
      expect((result[1] as Character).id).toBe('long');
    });

    it('should sort by name length then alphabetically as tiebreaker', () => {
      // SAO sorts by name length first (shorter first), then alphabetically
      // Use same-length names to test alphabetical tiebreaker
      const cat = createMockCharacter({ id: 'cat', name: 'Cat', team: 'townsfolk', ability: 'X' });
      const ant = createMockCharacter({ id: 'ant', name: 'Ant', team: 'townsfolk', ability: 'X' });
      const bat = createMockCharacter({ id: 'bat', name: 'Bat', team: 'townsfolk', ability: 'X' });

      const result = sortScriptBySAO([cat, ant, bat]);

      // All same length, so alphabetical
      expect((result[0] as Character).name).toBe('Ant');
      expect((result[1] as Character).name).toBe('Bat');
      expect((result[2] as Character).name).toBe('Cat');
    });

    it('should sort by name length before alphabetical', () => {
      // Shorter names come first even if alphabetically later
      const alice = createMockCharacter({
        id: 'alice',
        name: 'Alice',
        team: 'townsfolk',
        ability: 'X',
      });
      const bo = createMockCharacter({ id: 'bo', name: 'Bo', team: 'townsfolk', ability: 'X' });

      const result = sortScriptBySAO([alice, bo]);

      expect((result[0] as Character).name).toBe('Bo'); // Shorter
      expect((result[1] as Character).name).toBe('Alice');
    });

    it('should handle empty array', () => {
      const result = sortScriptBySAO([]);
      expect(result).toEqual([]);
    });

    it('should handle string IDs with officialData lookup', () => {
      const officialData: Character[] = [
        createMockCharacter({ id: 'washerwoman', name: 'Washerwoman', team: 'townsfolk' }),
        createMockCharacter({ id: 'imp', name: 'Imp', team: 'demon' }),
      ];

      const result = sortScriptBySAO(['imp', 'washerwoman'], { officialData });

      expect(result[0]).toBe('washerwoman');
      expect(result[1]).toBe('imp');
    });

    it('should handle {id: string} format with officialData lookup', () => {
      const officialData: Character[] = [
        createMockCharacter({ id: 'washerwoman', name: 'Washerwoman', team: 'townsfolk' }),
        createMockCharacter({ id: 'imp', name: 'Imp', team: 'demon' }),
      ];

      const result = sortScriptBySAO([{ id: 'imp' }, { id: 'washerwoman' }], { officialData });

      expect((result[0] as { id: string }).id).toBe('washerwoman');
      expect((result[1] as { id: string }).id).toBe('imp');
    });

    it('should preserve unresolvable entries at the end', () => {
      const char = createMockCharacter({ id: 'known', name: 'Known' });
      const unknown = 'unknown_character';

      const result = sortScriptBySAO([unknown, char], { officialData: [] });

      expect(result[0]).toEqual(char);
      expect(result[1]).toBe(unknown);
    });

    it('should not mutate original array', () => {
      const original: ScriptEntry[] = [
        createMockCharacter({ id: 'b', team: 'demon' }),
        createMockCharacter({ id: 'a', team: 'townsfolk' }),
      ];
      const copy = [...original];

      sortScriptBySAO(original);

      expect(original).toEqual(copy);
    });
  });

  describe('sortScriptJsonBySAO', () => {
    it('should sort JSON string and return formatted result', () => {
      const input = JSON.stringify([
        { id: 'imp', name: 'Imp', team: 'demon', ability: 'X' },
        { id: 'washerwoman', name: 'Washerwoman', team: 'townsfolk', ability: 'Y' },
      ]);

      const result = sortScriptJsonBySAO(input);
      const parsed = JSON.parse(result);

      expect(parsed[0].team).toBe('townsfolk');
      expect(parsed[1].team).toBe('demon');
    });

    it('should throw error for non-array JSON', () => {
      expect(() => sortScriptJsonBySAO('{"id": "test"}')).toThrow();
    });

    it('should throw error for invalid JSON', () => {
      expect(() => sortScriptJsonBySAO('invalid json')).toThrow();
    });
  });

  describe('isScriptSortedBySAO', () => {
    it('should return true for empty array', () => {
      expect(isScriptSortedBySAO([])).toBe(true);
    });

    it('should return true for single character', () => {
      const chars = [createMockCharacter()];
      expect(isScriptSortedBySAO(chars)).toBe(true);
    });

    it('should return true for correctly sorted script', () => {
      const chars: ScriptEntry[] = [
        createMockCharacter({ id: 'a', name: 'A', team: 'townsfolk' }),
        createMockCharacter({ id: 'b', name: 'B', team: 'outsider' }),
        createMockCharacter({ id: 'c', name: 'C', team: 'minion' }),
        createMockCharacter({ id: 'd', name: 'D', team: 'demon' }),
      ];
      expect(isScriptSortedBySAO(chars)).toBe(true);
    });

    it('should return false for incorrectly sorted script', () => {
      const chars: ScriptEntry[] = [
        createMockCharacter({ id: 'a', name: 'A', team: 'demon' }),
        createMockCharacter({ id: 'b', name: 'B', team: 'townsfolk' }),
      ];
      expect(isScriptSortedBySAO(chars)).toBe(false);
    });

    it('should ignore _meta entries', () => {
      const chars: ScriptEntry[] = [
        { id: '_meta', name: 'Script' },
        createMockCharacter({ id: 'a', name: 'A', team: 'townsfolk' }),
      ];
      expect(isScriptSortedBySAO(chars)).toBe(true);
    });

    it('should work with string IDs and officialData', () => {
      const officialData: Character[] = [
        createMockCharacter({ id: 'washerwoman', name: 'Washerwoman', team: 'townsfolk' }),
        createMockCharacter({ id: 'imp', name: 'Imp', team: 'demon' }),
      ];

      expect(isScriptSortedBySAO(['washerwoman', 'imp'], { officialData })).toBe(true);
      expect(isScriptSortedBySAO(['imp', 'washerwoman'], { officialData })).toBe(false);
    });
  });

  describe('isScriptJsonSortedBySAO', () => {
    it('should return true for sorted JSON', () => {
      const input = JSON.stringify([
        { id: 'a', name: 'A', team: 'townsfolk', ability: 'X' },
        { id: 'b', name: 'B', team: 'demon', ability: 'Y' },
      ]);
      expect(isScriptJsonSortedBySAO(input)).toBe(true);
    });

    it('should return false for unsorted JSON', () => {
      const input = JSON.stringify([
        { id: 'a', name: 'A', team: 'demon', ability: 'X' },
        { id: 'b', name: 'B', team: 'townsfolk', ability: 'Y' },
      ]);
      expect(isScriptJsonSortedBySAO(input)).toBe(false);
    });

    it('should return null for invalid JSON', () => {
      expect(isScriptJsonSortedBySAO('invalid')).toBeNull();
    });

    it('should return null for non-array JSON', () => {
      expect(isScriptJsonSortedBySAO('{"id": "test"}')).toBeNull();
    });
  });

  describe('getScriptSortStats', () => {
    it('should return correct character count', () => {
      const chars: ScriptEntry[] = [
        createMockCharacter({ id: 'a' }),
        createMockCharacter({ id: 'b' }),
        createMockCharacter({ id: 'c' }),
      ];
      const stats = getScriptSortStats(chars);
      expect(stats.characterCount).toBe(3);
    });

    it('should return team counts', () => {
      const chars: ScriptEntry[] = [
        createMockCharacter({ team: 'townsfolk' }),
        createMockCharacter({ team: 'townsfolk' }),
        createMockCharacter({ team: 'demon' }),
        createMockCharacter({ team: 'minion' }),
      ];
      const stats = getScriptSortStats(chars);

      expect(stats.teamCounts.townsfolk).toBe(2);
      expect(stats.teamCounts.demon).toBe(1);
      expect(stats.teamCounts.minion).toBe(1);
      expect(stats.teamCounts.outsider).toBe(0);
    });

    it('should detect _meta presence', () => {
      const withMeta: ScriptEntry[] = [{ id: '_meta', name: 'Script' }, createMockCharacter()];
      const withoutMeta: ScriptEntry[] = [createMockCharacter()];

      expect(getScriptSortStats(withMeta).hasMeta).toBe(true);
      expect(getScriptSortStats(withoutMeta).hasMeta).toBe(false);
    });

    it('should return isSorted status', () => {
      const sorted: ScriptEntry[] = [
        createMockCharacter({ team: 'townsfolk' }),
        createMockCharacter({ team: 'demon' }),
      ];
      const unsorted: ScriptEntry[] = [
        createMockCharacter({ team: 'demon' }),
        createMockCharacter({ team: 'townsfolk' }),
      ];

      expect(getScriptSortStats(sorted).isSorted).toBe(true);
      expect(getScriptSortStats(unsorted).isSorted).toBe(false);
    });

    it('should handle empty array', () => {
      const stats = getScriptSortStats([]);
      expect(stats.characterCount).toBe(0);
      expect(stats.hasMeta).toBe(false);
      expect(stats.isSorted).toBe(true);
    });

    it('should default undefined team to townsfolk', () => {
      const chars: ScriptEntry[] = [createMockCharacter({ team: undefined })];
      const stats = getScriptSortStats(chars);
      expect(stats.teamCounts.townsfolk).toBe(1);
    });
  });
});
