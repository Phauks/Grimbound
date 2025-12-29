import { describe, expect, it } from 'vitest';
import {
  calculateTokenCounts,
  countReminders,
  createCharacterTemplate,
  getAllCharacterImageUrls,
  getBestPreviewCharacter,
  getCharacterImageUrl,
  getGlobalReminders,
  groupByTeam,
  isIdLinkedToName,
  validateCharacter,
} from '@/ts/data/characterUtils';
import type { Character } from '@/ts/types';

// Helper to create mock characters
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
    uuid: 'test-uuid',
    source: 'custom',
    ...overrides,
  } as Character;
}

describe('characterUtils', () => {
  describe('validateCharacter', () => {
    it('should return valid for complete character', () => {
      const result = validateCharacter({
        name: 'Test',
        team: 'townsfolk',
        image: 'test.png',
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for missing name', () => {
      const result = validateCharacter({
        team: 'townsfolk',
        image: 'test.png',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing character name');
    });

    it('should return error for missing team', () => {
      const result = validateCharacter({
        name: 'Test',
        image: 'test.png',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing team type');
    });

    it('should return error for invalid team', () => {
      const result = validateCharacter({
        name: 'Test',
        team: 'invalid' as Character['team'],
        image: 'test.png',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Invalid team type'))).toBe(true);
    });

    it('should return error for missing image', () => {
      const result = validateCharacter({
        name: 'Test',
        team: 'townsfolk',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing character image');
    });

    it('should return multiple errors', () => {
      const result = validateCharacter({});
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('should accept all valid teams', () => {
      const validTeams = ['townsfolk', 'outsider', 'minion', 'demon', 'traveller', 'fabled'] as const;
      for (const team of validTeams) {
        const result = validateCharacter({ name: 'Test', team, image: 'test.png' });
        expect(result.valid).toBe(true);
      }
    });
  });

  describe('getCharacterImageUrl', () => {
    it('should return string image directly', () => {
      expect(getCharacterImageUrl('test.png')).toBe('test.png');
    });

    it('should return first image from array', () => {
      expect(getCharacterImageUrl(['first.png', 'second.png'])).toBe('first.png');
    });

    it('should return empty string for undefined', () => {
      expect(getCharacterImageUrl(undefined)).toBe('');
    });

    it('should return empty string for empty array', () => {
      expect(getCharacterImageUrl([])).toBe('');
    });

    it('should return empty string for empty string', () => {
      expect(getCharacterImageUrl('')).toBe('');
    });
  });

  describe('getAllCharacterImageUrls', () => {
    it('should wrap string in array', () => {
      expect(getAllCharacterImageUrls('test.png')).toEqual(['test.png']);
    });

    it('should return array as-is', () => {
      expect(getAllCharacterImageUrls(['a.png', 'b.png'])).toEqual(['a.png', 'b.png']);
    });

    it('should return empty array for undefined', () => {
      expect(getAllCharacterImageUrls(undefined)).toEqual([]);
    });

    it('should return empty array for empty array', () => {
      expect(getAllCharacterImageUrls([])).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      expect(getAllCharacterImageUrls('')).toEqual([]);
    });
  });

  describe('countReminders', () => {
    it('should return 0 for no reminders', () => {
      const char = createMockCharacter({ reminders: undefined });
      expect(countReminders(char)).toBe(0);
    });

    it('should return 0 for empty reminders', () => {
      const char = createMockCharacter({ reminders: [] });
      expect(countReminders(char)).toBe(0);
    });

    it('should count reminders in array', () => {
      const char = createMockCharacter({
        reminders: [{ text: 'Reminder 1' }, { text: 'Reminder 2' }],
      });
      expect(countReminders(char)).toBe(2);
    });

    it('should handle non-array reminders', () => {
      const char = createMockCharacter({ reminders: 'invalid' as unknown as Character['reminders'] });
      expect(countReminders(char)).toBe(0);
    });
  });

  describe('getGlobalReminders', () => {
    it('should return empty array for no global reminders', () => {
      const char = createMockCharacter({ remindersGlobal: undefined });
      expect(getGlobalReminders(char)).toEqual([]);
    });

    it('should return empty array for empty global reminders', () => {
      const char = createMockCharacter({ remindersGlobal: [] });
      expect(getGlobalReminders(char)).toEqual([]);
    });

    it('should return global reminders array', () => {
      const char = createMockCharacter({ remindersGlobal: ['Global 1', 'Global 2'] });
      expect(getGlobalReminders(char)).toEqual(['Global 1', 'Global 2']);
    });

    it('should handle non-array global reminders', () => {
      const char = createMockCharacter({
        remindersGlobal: 'invalid' as unknown as Character['remindersGlobal'],
      });
      expect(getGlobalReminders(char)).toEqual([]);
    });
  });

  describe('groupByTeam', () => {
    it('should group characters by team', () => {
      const chars = [
        createMockCharacter({ name: 'Town1', team: 'townsfolk' }),
        createMockCharacter({ name: 'Town2', team: 'townsfolk' }),
        createMockCharacter({ name: 'Demon1', team: 'demon' }),
      ];

      const groups = groupByTeam(chars);

      expect(groups.townsfolk).toHaveLength(2);
      expect(groups.demon).toHaveLength(1);
      expect(groups.minion).toHaveLength(0);
    });

    it('should default to townsfolk for invalid team', () => {
      const chars = [createMockCharacter({ name: 'Unknown', team: 'invalid' as Character['team'] })];

      const groups = groupByTeam(chars);

      expect(groups.townsfolk).toHaveLength(1);
    });

    it('should default to townsfolk for missing team', () => {
      const chars = [createMockCharacter({ name: 'NoTeam', team: undefined })];

      const groups = groupByTeam(chars);

      expect(groups.townsfolk).toHaveLength(1);
    });

    it('should handle empty array', () => {
      const groups = groupByTeam([]);

      expect(groups.townsfolk).toHaveLength(0);
      expect(groups.demon).toHaveLength(0);
    });

    it('should be case-insensitive', () => {
      const chars = [createMockCharacter({ name: 'Test', team: 'DEMON' as Character['team'] })];

      const groups = groupByTeam(chars);

      expect(groups.demon).toHaveLength(1);
    });
  });

  describe('calculateTokenCounts', () => {
    it('should calculate character counts by team', () => {
      const chars = [
        createMockCharacter({ team: 'townsfolk' }),
        createMockCharacter({ team: 'townsfolk' }),
        createMockCharacter({ team: 'demon' }),
      ];

      const counts = calculateTokenCounts(chars);

      expect(counts.townsfolk.characters).toBe(2);
      expect(counts.demon.characters).toBe(1);
      expect(counts.total.characters).toBe(3);
    });

    it('should calculate reminder counts', () => {
      const chars = [
        createMockCharacter({
          team: 'townsfolk',
          reminders: [{ text: 'R1' }, { text: 'R2' }],
        }),
        createMockCharacter({ team: 'demon', reminders: [{ text: 'R3' }] }),
      ];

      const counts = calculateTokenCounts(chars);

      expect(counts.townsfolk.reminders).toBe(2);
      expect(counts.demon.reminders).toBe(1);
      expect(counts.total.reminders).toBe(3);
    });

    it('should handle empty array', () => {
      const counts = calculateTokenCounts([]);

      expect(counts.total.characters).toBe(0);
      expect(counts.total.reminders).toBe(0);
    });
  });

  describe('getBestPreviewCharacter', () => {
    it('should return null for empty array', () => {
      expect(getBestPreviewCharacter([])).toBeNull();
    });

    it('should prefer character with setup and reminders', () => {
      const chars = [
        createMockCharacter({ name: 'NoSetup', setup: false, reminders: [{ text: 'R' }] }),
        createMockCharacter({ name: 'WithBoth', setup: true, reminders: [{ text: 'R' }] }),
        createMockCharacter({ name: 'NoReminders', setup: true, reminders: [] }),
      ];

      const best = getBestPreviewCharacter(chars);

      expect(best?.name).toBe('WithBoth');
    });

    it('should prefer character with reminders if no setup+reminders', () => {
      const chars = [
        createMockCharacter({ name: 'NoReminders', reminders: [] }),
        createMockCharacter({ name: 'WithReminders', reminders: [{ text: 'R' }] }),
      ];

      const best = getBestPreviewCharacter(chars);

      expect(best?.name).toBe('WithReminders');
    });

    it('should fallback to first character', () => {
      const chars = [
        createMockCharacter({ name: 'First', reminders: [] }),
        createMockCharacter({ name: 'Second', reminders: [] }),
      ];

      const best = getBestPreviewCharacter(chars);

      expect(best?.name).toBe('First');
    });
  });

  describe('createCharacterTemplate', () => {
    it('should create character with default values', async () => {
      const char = await createCharacterTemplate();

      expect(char.name.length).toBeGreaterThan(0);
      expect(char.team).toBe('townsfolk');
      expect(char.id).toBe(char.name.toLowerCase().replace(/[^a-z0-9]/g, ''));
      expect(char.source).toBe('custom');
    });

    it('should use provided name', async () => {
      const char = await createCharacterTemplate({ name: 'Custom Hero' });

      expect(char.name).toBe('Custom Hero');
    });

    it('should use provided team', async () => {
      const char = await createCharacterTemplate({ team: 'demon' });

      expect(char.team).toBe('demon');
    });

    it('should use provided id', async () => {
      const char = await createCharacterTemplate({ id: 'custom_id' });

      expect(char.id).toBe('custom_id');
    });

    it('should derive id from name if not provided', async () => {
      const char = await createCharacterTemplate({ name: 'My Character' });

      expect(char.id).toBe('my_character');
    });

    it('should generate stable uuid', async () => {
      const char1 = await createCharacterTemplate({ name: 'Test', id: 'test' });
      const char2 = await createCharacterTemplate({ name: 'Test', id: 'test' });

      expect(char1.uuid).toBe(char2.uuid);
    });

    it('should have empty arrays for reminders', async () => {
      const char = await createCharacterTemplate();

      expect(char.reminders).toEqual([]);
      expect(char.remindersGlobal).toEqual([]);
    });

    it('should have empty ability', async () => {
      const char = await createCharacterTemplate();

      expect(char.ability).toBe('');
    });
  });

  describe('isIdLinkedToName', () => {
    it('should return true when id matches name-derived id', () => {
      const char = createMockCharacter({ id: 'my_character', name: 'My Character' });
      expect(isIdLinkedToName(char)).toBe(true);
    });

    it('should return false when id does not match', () => {
      const char = createMockCharacter({ id: 'custom_id', name: 'My Character' });
      expect(isIdLinkedToName(char)).toBe(false);
    });

    it('should handle simple names', () => {
      const char = createMockCharacter({ id: 'washerwoman', name: 'Washerwoman' });
      expect(isIdLinkedToName(char)).toBe(true);
    });

    it('should handle names with special characters', () => {
      const char = createMockCharacter({ id: 'poboy', name: "Po'boy" });
      expect(isIdLinkedToName(char)).toBe(true);
    });
  });
});
