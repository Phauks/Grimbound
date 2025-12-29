import { describe, expect, it } from 'vitest';
import {
  generateMultipleNames,
  generateRandomName,
  generateStableUuid,
  generateUuid,
  nameToId,
} from '@/ts/utils/nameGenerator';

describe('nameGenerator', () => {
  describe('generateRandomName', () => {
    it('should return a non-empty string', () => {
      const name = generateRandomName();
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    });

    it('should return different names on multiple calls (probabilistically)', () => {
      const names = new Set<string>();
      // Generate 100 names - should get at least a few unique ones
      for (let i = 0; i < 100; i++) {
        names.add(generateRandomName());
      }
      // With 700+ names in the list, 100 random selections should yield multiple unique
      expect(names.size).toBeGreaterThan(10);
    });
  });

  describe('generateMultipleNames', () => {
    it('should return requested number of names', () => {
      const names = generateMultipleNames(5);
      expect(names).toHaveLength(5);
    });

    it('should return unique names', () => {
      const names = generateMultipleNames(10);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(10);
    });

    it('should handle count of zero', () => {
      const names = generateMultipleNames(0);
      expect(names).toHaveLength(0);
    });

    it('should handle count of one', () => {
      const names = generateMultipleNames(1);
      expect(names).toHaveLength(1);
      expect(names[0].length).toBeGreaterThan(0);
    });

    it('should limit to available names', () => {
      // Request more names than exist (there are ~700)
      const names = generateMultipleNames(10000);
      expect(names.length).toBeLessThanOrEqual(10000);
      // All should be unique
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('should return all strings', () => {
      const names = generateMultipleNames(5);
      expect(names.every((n) => typeof n === 'string')).toBe(true);
    });
  });

  describe('nameToId', () => {
    it('should convert to lowercase', () => {
      expect(nameToId('HELLO')).toBe('hello');
      expect(nameToId('Hello')).toBe('hello');
    });

    it('should replace spaces with underscores', () => {
      expect(nameToId('Hello World')).toBe('hello_world');
      expect(nameToId('One Two Three')).toBe('one_two_three');
    });

    it('should remove special characters', () => {
      expect(nameToId("Po'boy")).toBe('poboy');
      expect(nameToId('Test-Name')).toBe('testname');
      expect(nameToId('Name@#$%')).toBe('name');
    });

    it('should trim whitespace', () => {
      expect(nameToId('  Hello  ')).toBe('hello');
      expect(nameToId('  Spaced  Name  ')).toBe('spaced_name');
    });

    it('should handle empty string', () => {
      expect(nameToId('')).toBe('');
    });

    it('should handle numbers', () => {
      expect(nameToId('Test123')).toBe('test123');
      expect(nameToId('123Test')).toBe('123test');
    });

    it('should collapse multiple spaces into single underscore', () => {
      expect(nameToId('Hello   World')).toBe('hello_world');
      expect(nameToId('One  Two   Three')).toBe('one_two_three');
    });

    it('should handle typical character names', () => {
      expect(nameToId('Washerwoman')).toBe('washerwoman');
      expect(nameToId('Scarlet Woman')).toBe('scarlet_woman');
      expect(nameToId('Town Crier')).toBe('town_crier');
    });
  });

  describe('generateUuid', () => {
    it('should return a valid UUID format', () => {
      const uuid = generateUuid();
      // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidRegex);
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = generateUuid();
      const uuid2 = generateUuid();
      expect(uuid1).not.toBe(uuid2);
    });

    it('should generate multiple unique UUIDs', () => {
      const uuids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        uuids.add(generateUuid());
      }
      expect(uuids.size).toBe(100);
    });
  });

  describe('generateStableUuid', () => {
    it('should return a valid UUID format', async () => {
      const uuid = await generateStableUuid('test', 'Test');
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidRegex);
    });

    it('should return same UUID for same inputs (deterministic)', async () => {
      const uuid1 = await generateStableUuid('washerwoman', 'Washerwoman');
      const uuid2 = await generateStableUuid('washerwoman', 'Washerwoman');
      expect(uuid1).toBe(uuid2);
    });

    it('should return different UUIDs for different IDs', async () => {
      const uuid1 = await generateStableUuid('washerwoman', 'Washerwoman');
      const uuid2 = await generateStableUuid('librarian', 'Librarian');
      expect(uuid1).not.toBe(uuid2);
    });

    it('should return different UUIDs for different names with same ID', async () => {
      const uuid1 = await generateStableUuid('test', 'Test One');
      const uuid2 = await generateStableUuid('test', 'Test Two');
      expect(uuid1).not.toBe(uuid2);
    });

    it('should normalize case in ID', async () => {
      const uuid1 = await generateStableUuid('TEST', 'Test');
      const uuid2 = await generateStableUuid('test', 'Test');
      expect(uuid1).toBe(uuid2);
    });

    it('should trim whitespace', async () => {
      const uuid1 = await generateStableUuid('  test  ', '  Test  ');
      const uuid2 = await generateStableUuid('test', 'Test');
      expect(uuid1).toBe(uuid2);
    });

    it('should handle special characters in name', async () => {
      const uuid = await generateStableUuid('poboy', "Po'boy");
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidRegex);
    });

    it('should be UUID version 5', async () => {
      const uuid = await generateStableUuid('test', 'Test');
      // UUID v5 has version nibble = 5 at position 14 (0-indexed)
      expect(uuid[14]).toBe('5');
    });

    it('should produce collision-free UUIDs for similar names', async () => {
      // Test that similar character names don't collide
      const uuids = await Promise.all([
        generateStableUuid('seamstress', 'Seamstress'),
        generateStableUuid('scapegoat', 'Scapegoat'),
        generateStableUuid('snake', 'Snake'),
        generateStableUuid('sailor', 'Sailor'),
      ]);

      const uniqueUuids = new Set(uuids);
      expect(uniqueUuids.size).toBe(4);
    });
  });
});
