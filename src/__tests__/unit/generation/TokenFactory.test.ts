/**
 * Unit tests for TokenFactory
 *
 * Tests token creation methods including character, reminder, and meta tokens.
 * Validates proper metadata assembly, callback emission, and edge cases.
 */

import { createCharacter, resetCharacterFactory } from '@test/factories/characterFactory';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CONFIG from '@/ts/config';
import type {
  CharacterTokenOptions,
  JinxTokenData,
  MetaTokenOptions,
  ReminderTokenOptions,
  VariantInfo,
} from '@/ts/generation/TokenFactory';
import { TokenFactory } from '@/ts/generation/TokenFactory';
import type { Character, Token, TokenCallback } from '@/ts/types';

// ============================================================================
// Test Setup
// ============================================================================

describe('TokenFactory', () => {
  let factory: TokenFactory;
  let mockCallback: TokenCallback;
  const TEST_DPI = 300;

  // Helper to create a mock canvas
  const createMockCanvas = (): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    canvas.width = 525;
    canvas.height = 525;
    return canvas;
  };

  beforeEach(() => {
    resetCharacterFactory();
    mockCallback = vi.fn();
    factory = new TokenFactory(TEST_DPI, mockCallback);
  });

  // ==========================================================================
  // Constructor
  // ==========================================================================

  describe('constructor', () => {
    it('should create factory with DPI and callback', () => {
      const testFactory = new TokenFactory(150, mockCallback);

      expect(testFactory).toBeDefined();
    });

    it('should create factory with DPI only (no callback)', () => {
      const testFactory = new TokenFactory(300);

      expect(testFactory).toBeDefined();
    });

    it('should create factory with null callback', () => {
      const testFactory = new TokenFactory(300, null);

      expect(testFactory).toBeDefined();
    });

    it('should calculate character diameter from DPI', () => {
      const testDPI = 150;
      const expectedDiameter = CONFIG.TOKEN.ROLE_DIAMETER_INCHES * testDPI;
      const testFactory = new TokenFactory(testDPI);

      const character = createCharacter();
      const canvas = createMockCanvas();
      const token = testFactory.createCharacterToken({
        canvas,
        character,
        filename: 'test.png',
        order: 1,
      });

      expect(token.diameter).toBe(expectedDiameter);
    });

    it('should calculate reminder diameter from DPI', () => {
      const testDPI = 150;
      const expectedDiameter = CONFIG.TOKEN.REMINDER_DIAMETER_INCHES * testDPI;
      const testFactory = new TokenFactory(testDPI);

      const character = createCharacter();
      const canvas = createMockCanvas();
      const token = testFactory.createReminderToken({
        canvas,
        character,
        reminderText: 'Test Reminder',
        filename: 'test.png',
        order: 1,
      });

      expect(token.diameter).toBe(expectedDiameter);
    });
  });

  // ==========================================================================
  // Character Tokens
  // ==========================================================================

  describe('createCharacterToken', () => {
    it('should create basic character token with required fields', () => {
      const character = createCharacter({ name: 'Washerwoman', team: 'townsfolk' });
      const canvas = createMockCanvas();
      const options: CharacterTokenOptions = {
        canvas,
        character,
        filename: 'washerwoman.png',
        order: 1,
      };

      const token = factory.createCharacterToken(options);

      expect(token).toBeDefined();
      expect(token.type).toBe('character');
      expect(token.name).toBe('Washerwoman');
      expect(token.filename).toBe('washerwoman.png');
      expect(token.team).toBe('townsfolk');
      expect(token.canvas).toBe(canvas);
      expect(token.order).toBe(1);
      expect(token.characterData).toBe(character);
    });

    it('should set correct diameter for character tokens', () => {
      const character = createCharacter();
      const canvas = createMockCanvas();
      const expectedDiameter = CONFIG.TOKEN.ROLE_DIAMETER_INCHES * TEST_DPI;

      const token = factory.createCharacterToken({
        canvas,
        character,
        filename: 'test.png',
        order: 1,
      });

      expect(token.diameter).toBe(expectedDiameter);
    });

    it('should default team to townsfolk if missing', () => {
      const character = createCharacter({ team: undefined as unknown as 'townsfolk' });
      const canvas = createMockCanvas();

      const token = factory.createCharacterToken({
        canvas,
        character,
        filename: 'test.png',
        order: 1,
      });

      expect(token.team).toBe('townsfolk');
    });

    it('should set hasReminders to true when character has reminders', () => {
      const character = createCharacter({ reminders: ['Reminder 1', 'Reminder 2'] });
      const canvas = createMockCanvas();

      const token = factory.createCharacterToken({
        canvas,
        character,
        filename: 'test.png',
        order: 1,
      });

      expect(token.hasReminders).toBe(true);
      expect(token.reminderCount).toBe(2);
    });

    it('should set hasReminders to false when character has no reminders', () => {
      const character = createCharacter({ reminders: [] });
      const canvas = createMockCanvas();

      const token = factory.createCharacterToken({
        canvas,
        character,
        filename: 'test.png',
        order: 1,
      });

      expect(token.hasReminders).toBe(false);
      expect(token.reminderCount).toBe(0);
    });

    it('should handle missing reminders array', () => {
      const character = createCharacter({ reminders: undefined });
      const canvas = createMockCanvas();

      const token = factory.createCharacterToken({
        canvas,
        character,
        filename: 'test.png',
        order: 1,
      });

      expect(token.hasReminders).toBe(false);
      expect(token.reminderCount).toBe(0);
    });

    it('should set parentUuid from character', () => {
      const character = createCharacter({ uuid: 'test-uuid-123' });
      const canvas = createMockCanvas();

      const token = factory.createCharacterToken({
        canvas,
        character,
        filename: 'test.png',
        order: 1,
      });

      expect(token.parentUuid).toBe('test-uuid-123');
    });

    it('should mark official characters correctly', () => {
      const character = createCharacter({ source: 'official' });
      const canvas = createMockCanvas();

      const token = factory.createCharacterToken({
        canvas,
        character,
        filename: 'test.png',
        order: 1,
      });

      expect(token.isOfficial).toBe(true);
    });

    it('should mark unofficial characters correctly', () => {
      const character = createCharacter({ source: 'custom' });
      const canvas = createMockCanvas();

      const token = factory.createCharacterToken({
        canvas,
        character,
        filename: 'test.png',
        order: 1,
      });

      expect(token.isOfficial).toBe(false);
    });

    it('should include imageUrl when provided', () => {
      const character = createCharacter();
      const canvas = createMockCanvas();
      const imageUrl = 'https://example.com/icon.png';

      const token = factory.createCharacterToken({
        canvas,
        character,
        filename: 'test.png',
        order: 1,
        imageUrl,
      });

      expect(token.imageUrl).toBe(imageUrl);
    });

    it('should include variant info when multiple variants exist', () => {
      const character = createCharacter();
      const canvas = createMockCanvas();
      const variantInfo: VariantInfo = {
        variantIndex: 0,
        totalVariants: 3,
      };

      const token = factory.createCharacterToken({
        canvas,
        character,
        filename: 'test.png',
        order: 1,
        variantInfo,
      });

      expect(token.variantIndex).toBe(0);
      expect(token.totalVariants).toBe(3);
    });

    it('should not include variant info when only one variant', () => {
      const character = createCharacter();
      const canvas = createMockCanvas();
      const variantInfo: VariantInfo = {
        variantIndex: 0,
        totalVariants: 1,
      };

      const token = factory.createCharacterToken({
        canvas,
        character,
        filename: 'test.png',
        order: 1,
        variantInfo,
      });

      expect(token.variantIndex).toBeUndefined();
      expect(token.totalVariants).toBeUndefined();
    });

    it('should mark token with decorative overrides', () => {
      const character = createCharacter();
      const canvas = createMockCanvas();

      const token = factory.createCharacterToken({
        canvas,
        character,
        filename: 'test.png',
        order: 1,
        hasDecorativeOverrides: true,
      });

      expect(token.hasDecorativeOverrides).toBe(true);
    });

    it('should not mark token without decorative overrides', () => {
      const character = createCharacter();
      const canvas = createMockCanvas();

      const token = factory.createCharacterToken({
        canvas,
        character,
        filename: 'test.png',
        order: 1,
        hasDecorativeOverrides: false,
      });

      expect(token.hasDecorativeOverrides).toBeUndefined();
    });
  });

  // ==========================================================================
  // Reminder Tokens
  // ==========================================================================

  describe('createReminderToken', () => {
    it('should create basic reminder token with required fields', () => {
      const character = createCharacter({ name: 'Imp', team: 'demon' });
      const canvas = createMockCanvas();
      const options: ReminderTokenOptions = {
        canvas,
        character,
        reminderText: 'Dead',
        filename: 'imp-dead.png',
        order: 1,
      };

      const token = factory.createReminderToken(options);

      expect(token).toBeDefined();
      expect(token.type).toBe('reminder');
      expect(token.name).toBe('Imp - Dead');
      expect(token.filename).toBe('imp-dead.png');
      expect(token.team).toBe('demon');
      expect(token.canvas).toBe(canvas);
      expect(token.order).toBe(1);
      expect(token.reminderText).toBe('Dead');
    });

    it('should set correct diameter for reminder tokens', () => {
      const character = createCharacter();
      const canvas = createMockCanvas();
      const expectedDiameter = CONFIG.TOKEN.REMINDER_DIAMETER_INCHES * TEST_DPI;

      const token = factory.createReminderToken({
        canvas,
        character,
        reminderText: 'Test',
        filename: 'test.png',
        order: 1,
      });

      expect(token.diameter).toBe(expectedDiameter);
    });

    it('should format name with character name and reminder text', () => {
      const character = createCharacter({ name: 'Poisoner' });
      const canvas = createMockCanvas();

      const token = factory.createReminderToken({
        canvas,
        character,
        reminderText: 'Poisoned',
        filename: 'test.png',
        order: 1,
      });

      expect(token.name).toBe('Poisoner - Poisoned');
    });

    it('should set parentCharacter name', () => {
      const character = createCharacter({ name: 'Spy' });
      const canvas = createMockCanvas();

      const token = factory.createReminderToken({
        canvas,
        character,
        reminderText: 'Wrong Info',
        filename: 'test.png',
        order: 1,
      });

      expect(token.parentCharacter).toBe('Spy');
    });

    it('should set parentUuid from character', () => {
      const character = createCharacter({ uuid: 'reminder-uuid-456' });
      const canvas = createMockCanvas();

      const token = factory.createReminderToken({
        canvas,
        character,
        reminderText: 'Test',
        filename: 'test.png',
        order: 1,
      });

      expect(token.parentUuid).toBe('reminder-uuid-456');
    });

    it('should mark official reminders correctly', () => {
      const character = createCharacter({ source: 'official' });
      const canvas = createMockCanvas();

      const token = factory.createReminderToken({
        canvas,
        character,
        reminderText: 'Test',
        filename: 'test.png',
        order: 1,
      });

      expect(token.isOfficial).toBe(true);
    });

    it('should include variant info when multiple variants exist', () => {
      const character = createCharacter();
      const canvas = createMockCanvas();
      const variantInfo: VariantInfo = {
        variantIndex: 1,
        totalVariants: 2,
      };

      const token = factory.createReminderToken({
        canvas,
        character,
        reminderText: 'Test',
        filename: 'test.png',
        order: 1,
        variantInfo,
      });

      expect(token.variantIndex).toBe(1);
      expect(token.totalVariants).toBe(2);
    });

    it('should not include variant info when only one variant', () => {
      const character = createCharacter();
      const canvas = createMockCanvas();
      const variantInfo: VariantInfo = {
        variantIndex: 0,
        totalVariants: 1,
      };

      const token = factory.createReminderToken({
        canvas,
        character,
        reminderText: 'Test',
        filename: 'test.png',
        order: 1,
        variantInfo,
      });

      expect(token.variantIndex).toBeUndefined();
      expect(token.totalVariants).toBeUndefined();
    });

    it('should mark token with decorative overrides', () => {
      const character = createCharacter();
      const canvas = createMockCanvas();

      const token = factory.createReminderToken({
        canvas,
        character,
        reminderText: 'Test',
        filename: 'test.png',
        order: 1,
        hasDecorativeOverrides: true,
      });

      expect(token.hasDecorativeOverrides).toBe(true);
    });

    it('should default team to townsfolk if missing', () => {
      const character = createCharacter({ team: undefined as unknown as 'townsfolk' });
      const canvas = createMockCanvas();

      const token = factory.createReminderToken({
        canvas,
        character,
        reminderText: 'Test',
        filename: 'test.png',
        order: 1,
      });

      expect(token.team).toBe('townsfolk');
    });
  });

  // ==========================================================================
  // Meta Tokens
  // ==========================================================================

  describe('createMetaToken', () => {
    it('should create script-name token', () => {
      const canvas = createMockCanvas();
      const options: MetaTokenOptions = {
        canvas,
        type: 'script-name',
        name: 'Trouble Brewing',
        filename: 'script-name.png',
        order: 0,
      };

      const token = factory.createMetaToken(options);

      expect(token).toBeDefined();
      expect(token.type).toBe('script-name');
      expect(token.name).toBe('Trouble Brewing');
      expect(token.filename).toBe('script-name.png');
      expect(token.team).toBe('meta');
      expect(token.canvas).toBe(canvas);
      expect(token.order).toBe(0);
    });

    it('should create almanac token', () => {
      const canvas = createMockCanvas();
      const options: MetaTokenOptions = {
        canvas,
        type: 'almanac',
        name: 'Almanac QR',
        filename: 'almanac.png',
      };

      const token = factory.createMetaToken(options);

      expect(token.type).toBe('almanac');
      expect(token.name).toBe('Almanac QR');
    });

    it('should create pandemonium token', () => {
      const canvas = createMockCanvas();
      const options: MetaTokenOptions = {
        canvas,
        type: 'pandemonium',
        name: 'Pandemonium Institute',
        filename: 'pandemonium.png',
      };

      const token = factory.createMetaToken(options);

      expect(token.type).toBe('pandemonium');
      expect(token.name).toBe('Pandemonium Institute');
    });

    it('should create bootlegger token', () => {
      const canvas = createMockCanvas();
      const options: MetaTokenOptions = {
        canvas,
        type: 'bootlegger',
        name: 'Custom Character',
        filename: 'bootlegger.png',
      };

      const token = factory.createMetaToken(options);

      expect(token.type).toBe('bootlegger');
      expect(token.name).toBe('Custom Character');
    });

    it('should create jinx token with jinxData', () => {
      const canvas = createMockCanvas();
      const jinxData: JinxTokenData = {
        reason: 'Test jinx reason',
        char1: { id: 'washerwoman', name: 'Washerwoman', image: 'washerwoman.png' },
        char2: { id: 'drunk', name: 'Drunk', image: 'drunk.png' },
      };
      const options: MetaTokenOptions = {
        canvas,
        type: 'jinx',
        name: 'Washerwoman/Drunk Jinx',
        filename: 'jinx-washerwoman-drunk.png',
        jinxData,
      };

      const token = factory.createMetaToken(options);

      expect(token.type).toBe('jinx');
      expect(token.name).toBe('Washerwoman/Drunk Jinx');
      expect(token.jinxData).toBe(jinxData);
      expect(token.jinxData?.reason).toBe('Test jinx reason');
      expect(token.jinxData?.char1.name).toBe('Washerwoman');
      expect(token.jinxData?.char2.name).toBe('Drunk');
    });

    it('should set correct diameter for meta tokens (uses character diameter)', () => {
      const canvas = createMockCanvas();
      const expectedDiameter = CONFIG.TOKEN.ROLE_DIAMETER_INCHES * TEST_DPI;

      const token = factory.createMetaToken({
        canvas,
        type: 'script-name',
        name: 'Test Script',
        filename: 'test.png',
      });

      expect(token.diameter).toBe(expectedDiameter);
    });

    it('should include order when provided', () => {
      const canvas = createMockCanvas();

      const token = factory.createMetaToken({
        canvas,
        type: 'almanac',
        name: 'Almanac',
        filename: 'almanac.png',
        order: 999,
      });

      expect(token.order).toBe(999);
    });

    it('should not include order when not provided', () => {
      const canvas = createMockCanvas();

      const token = factory.createMetaToken({
        canvas,
        type: 'almanac',
        name: 'Almanac',
        filename: 'almanac.png',
      });

      expect(token.order).toBeUndefined();
    });

    it('should set team to meta for all meta tokens', () => {
      const canvas = createMockCanvas();
      const types: Array<'script-name' | 'almanac' | 'pandemonium' | 'bootlegger' | 'jinx'> = [
        'script-name',
        'almanac',
        'pandemonium',
        'bootlegger',
        'jinx',
      ];

      for (const type of types) {
        const token = factory.createMetaToken({
          canvas,
          type,
          name: `Test ${type}`,
          filename: `${type}.png`,
        });

        expect(token.team).toBe('meta');
      }
    });
  });

  // ==========================================================================
  // Emission Helpers
  // ==========================================================================

  describe('emit', () => {
    it('should invoke callback with token', () => {
      const character = createCharacter();
      const canvas = createMockCanvas();
      const token = factory.createCharacterToken({
        canvas,
        character,
        filename: 'test.png',
        order: 1,
      });

      factory.emit(token);

      expect(mockCallback).toHaveBeenCalledWith(token);
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('should return the token', () => {
      const character = createCharacter();
      const canvas = createMockCanvas();
      const token = factory.createCharacterToken({
        canvas,
        character,
        filename: 'test.png',
        order: 1,
      });

      const returned = factory.emit(token);

      expect(returned).toBe(token);
    });

    it('should not throw when callback is null', () => {
      const factoryNoCallback = new TokenFactory(TEST_DPI, null);
      const character = createCharacter();
      const canvas = createMockCanvas();
      const token = factoryNoCallback.createCharacterToken({
        canvas,
        character,
        filename: 'test.png',
        order: 1,
      });

      expect(() => factoryNoCallback.emit(token)).not.toThrow();
    });

    it('should not throw when callback is undefined', () => {
      const factoryNoCallback = new TokenFactory(TEST_DPI);
      const character = createCharacter();
      const canvas = createMockCanvas();
      const token = factoryNoCallback.createCharacterToken({
        canvas,
        character,
        filename: 'test.png',
        order: 1,
      });

      expect(() => factoryNoCallback.emit(token)).not.toThrow();
    });
  });

  describe('emitAndPush', () => {
    it('should invoke callback with token', () => {
      const character = createCharacter();
      const canvas = createMockCanvas();
      const token = factory.createCharacterToken({
        canvas,
        character,
        filename: 'test.png',
        order: 1,
      });
      const tokens: Token[] = [];

      factory.emitAndPush(token, tokens);

      expect(mockCallback).toHaveBeenCalledWith(token);
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('should push token to array', () => {
      const character = createCharacter();
      const canvas = createMockCanvas();
      const token = factory.createCharacterToken({
        canvas,
        character,
        filename: 'test.png',
        order: 1,
      });
      const tokens: Token[] = [];

      factory.emitAndPush(token, tokens);

      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toBe(token);
    });

    it('should add token to existing array', () => {
      const character1 = createCharacter({ name: 'First' });
      const character2 = createCharacter({ name: 'Second' });
      const canvas1 = createMockCanvas();
      const canvas2 = createMockCanvas();

      const token1 = factory.createCharacterToken({
        canvas: canvas1,
        character: character1,
        filename: 'first.png',
        order: 1,
      });
      const token2 = factory.createCharacterToken({
        canvas: canvas2,
        character: character2,
        filename: 'second.png',
        order: 2,
      });

      const tokens: Token[] = [];
      factory.emitAndPush(token1, tokens);
      factory.emitAndPush(token2, tokens);

      expect(tokens).toHaveLength(2);
      expect(tokens[0]).toBe(token1);
      expect(tokens[1]).toBe(token2);
    });

    it('should not throw when callback is null', () => {
      const factoryNoCallback = new TokenFactory(TEST_DPI, null);
      const character = createCharacter();
      const canvas = createMockCanvas();
      const token = factoryNoCallback.createCharacterToken({
        canvas,
        character,
        filename: 'test.png',
        order: 1,
      });
      const tokens: Token[] = [];

      expect(() => factoryNoCallback.emitAndPush(token, tokens)).not.toThrow();
      expect(tokens).toHaveLength(1);
    });

    it('should not throw when callback is undefined', () => {
      const factoryNoCallback = new TokenFactory(TEST_DPI);
      const character = createCharacter();
      const canvas = createMockCanvas();
      const token = factoryNoCallback.createCharacterToken({
        canvas,
        character,
        filename: 'test.png',
        order: 1,
      });
      const tokens: Token[] = [];

      expect(() => factoryNoCallback.emitAndPush(token, tokens)).not.toThrow();
      expect(tokens).toHaveLength(1);
    });
  });

  // ==========================================================================
  // Edge Cases & Integration
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle character with all optional fields filled', () => {
      const character: Character = createCharacter({
        name: 'Full Character',
        team: 'demon',
        reminders: ['Reminder 1', 'Reminder 2'],
        uuid: 'full-uuid',
        source: 'official',
      });
      const canvas = createMockCanvas();
      const variantInfo: VariantInfo = { variantIndex: 2, totalVariants: 5 };

      const token = factory.createCharacterToken({
        canvas,
        character,
        filename: 'full.png',
        order: 10,
        imageUrl: 'https://example.com/full.png',
        variantInfo,
        hasDecorativeOverrides: true,
      });

      expect(token.name).toBe('Full Character');
      expect(token.team).toBe('demon');
      expect(token.hasReminders).toBe(true);
      expect(token.reminderCount).toBe(2);
      expect(token.parentUuid).toBe('full-uuid');
      expect(token.isOfficial).toBe(true);
      expect(token.imageUrl).toBe('https://example.com/full.png');
      expect(token.variantIndex).toBe(2);
      expect(token.totalVariants).toBe(5);
      expect(token.hasDecorativeOverrides).toBe(true);
    });

    it('should handle character with minimal fields', () => {
      const character = createCharacter({
        name: 'Minimal',
        team: 'townsfolk',
      });
      const canvas = createMockCanvas();

      const token = factory.createCharacterToken({
        canvas,
        character,
        filename: 'minimal.png',
        order: 1,
      });

      expect(token.name).toBe('Minimal');
      expect(token.team).toBe('townsfolk');
      expect(token.hasReminders).toBe(false);
      expect(token.reminderCount).toBe(0);
      expect(token.imageUrl).toBeUndefined();
      expect(token.variantIndex).toBeUndefined();
      expect(token.hasDecorativeOverrides).toBeUndefined();
    });

    it('should handle all team types', () => {
      const teams = ['townsfolk', 'outsider', 'minion', 'demon', 'traveller', 'fabled'] as const;
      const canvas = createMockCanvas();

      for (const team of teams) {
        const character = createCharacter({ team });
        const token = factory.createCharacterToken({
          canvas,
          character,
          filename: `${team}.png`,
          order: 1,
        });

        expect(token.team).toBe(team);
      }
    });
  });
});
