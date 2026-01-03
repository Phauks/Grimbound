/**
 * Unit tests for batchGenerator.ts
 *
 * Tests batch token generation orchestration including:
 * - Token count calculation
 * - Meta token generation
 * - Character and reminder token generation
 * - Progress tracking and callbacks
 * - Abort handling
 * - SSOT image URL resolution integration
 */

import {
  createCharacter,
  createCharacterWithReminders,
  createScriptCast,
  resetCharacterFactory,
} from '@test/factories/characterFactory';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import type {
  DetailedProgressCallback,
  GenerationOptions,
  GenerationProgress,
  ProgressCallback,
  ScriptMeta,
  Token,
  TokenCallback,
} from '@/ts/types';

// Mock dependencies before importing the module under test
// Use class syntax for mocks that will be instantiated with `new`
vi.mock('@/ts/generation/TokenGenerator', () => ({
  TokenGenerator: class MockTokenGenerator {
    generateCharacterToken = vi.fn().mockResolvedValue(document.createElement('canvas'));
    generateReminderToken = vi.fn().mockResolvedValue(document.createElement('canvas'));
    generatePandemoniumToken = vi.fn().mockResolvedValue(document.createElement('canvas'));
    generateScriptNameToken = vi.fn().mockResolvedValue(document.createElement('canvas'));
    generateAlmanacQRToken = vi.fn().mockResolvedValue(document.createElement('canvas'));
    generateBootleggerToken = vi.fn().mockResolvedValue(document.createElement('canvas'));
    generateJinxToken = vi.fn().mockResolvedValue(document.createElement('canvas'));
    calculateBootleggerLayout = vi.fn().mockReturnValue({ totalHeight: 100 });
    prewarmImageCache = vi.fn().mockResolvedValue(undefined);
  },
}));

vi.mock('@/ts/generation/TokenFactory', () => ({
  TokenFactory: class MockTokenFactory {
    private tokenCallback?: ((token: Token) => void) | null;

    constructor(_dpi: number, tokenCallback?: ((token: Token) => void) | null) {
      this.tokenCallback = tokenCallback;
    }

    createCharacterToken = vi.fn().mockImplementation(({ character, filename }) => ({
      type: 'character',
      name: character.name,
      filename,
      team: character.team,
      canvas: document.createElement('canvas'),
    }));
    createReminderToken = vi.fn().mockImplementation(({ character, reminderText, filename }) => ({
      type: 'reminder',
      name: `${character.name} - ${reminderText}`,
      filename,
      team: character.team,
      reminderText,
      canvas: document.createElement('canvas'),
    }));
    createMetaToken = vi.fn().mockImplementation(({ type, name, filename }) => ({
      type,
      name,
      filename,
      team: 'meta',
      canvas: document.createElement('canvas'),
    }));
    emit = vi.fn().mockImplementation((token: Token) => {
      this.tokenCallback?.(token);
      return token;
    });
    emitAndPush = vi.fn().mockImplementation((token: Token, tokens: Token[]) => {
      this.tokenCallback?.(token);
      tokens.push(token);
    });
  },
}));

vi.mock('@/ts/utils/characterImageResolver', () => ({
  resolveCharacterImageUrl: vi.fn().mockResolvedValue({
    url: 'https://resolved.example.com/icon.png',
    source: 'external',
  }),
}));

vi.mock('@/ts/services/upload/assetResolver', () => ({
  createPreloadTasks: vi.fn().mockReturnValue([]),
  preResolveAssetsWithPriority: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/ts/generation/teamVariantGenerator', () => ({
  createRecoloredImageUrl: vi.fn().mockResolvedValue('https://recolored.example.com/icon.png'),
  getTeamDisplayName: vi.fn().mockImplementation((team) => {
    const names: Record<string, string> = {
      townsfolk: 'Townsfolk',
      outsider: 'Outsider',
      minion: 'Minion',
      demon: 'Demon',
    };
    return names[team] || team;
  }),
  getTeamsToGenerate: vi.fn().mockReturnValue([]),
}));

vi.mock('@/ts/utils/decorativeUtils', () => ({
  createEffectiveOptions: vi.fn().mockImplementation((options) => options),
}));

// Import after mocks are set up
import {
  calculateTokenCountsByType,
  generateAllTokens,
  generateCharacterTokens,
  generateMeta,
  generateReminders,
} from '@/ts/generation/batchGenerator';

// ============================================================================
// Test Setup
// ============================================================================

describe('batchGenerator', () => {
  beforeEach(() => {
    resetCharacterFactory();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // calculateTokenCountsByType
  // ==========================================================================

  describe('calculateTokenCountsByType', () => {
    it('should return zero counts for empty character array', () => {
      const result = calculateTokenCountsByType([], {}, null);

      expect(result).toEqual({
        character: 0,
        reminder: 0,
        meta: 0,
        total: 0,
      });
    });

    it('should count basic character tokens', () => {
      const characters = [
        createCharacter({ name: 'Char 1' }),
        createCharacter({ name: 'Char 2' }),
        createCharacter({ name: 'Char 3' }),
      ];

      const result = calculateTokenCountsByType(characters, {}, null);

      expect(result.character).toBe(3);
      expect(result.reminder).toBe(0);
      expect(result.meta).toBe(0);
      expect(result.total).toBe(3);
    });

    it('should count reminder tokens from characters', () => {
      const characters = [
        createCharacterWithReminders(['Reminder 1', 'Reminder 2']),
        createCharacterWithReminders(['Reminder 3']),
      ];

      const result = calculateTokenCountsByType(characters, {}, null);

      expect(result.character).toBe(2);
      expect(result.reminder).toBe(3);
      expect(result.total).toBe(5);
    });

    it('should count pandemonium token when enabled', () => {
      const result = calculateTokenCountsByType([], { pandemoniumToken: true }, null);

      expect(result.meta).toBe(1);
      expect(result.total).toBe(1);
    });

    it('should count script name token when enabled and name exists', () => {
      const scriptMeta: ScriptMeta = { name: 'Test Script' };

      const result = calculateTokenCountsByType([], { scriptNameToken: true }, scriptMeta);

      expect(result.meta).toBe(1);
      expect(result.total).toBe(1);
    });

    it('should not count script name token when name is missing', () => {
      const result = calculateTokenCountsByType([], { scriptNameToken: true }, null);

      expect(result.meta).toBe(0);
    });

    it('should count almanac token when enabled and almanac URL exists', () => {
      const scriptMeta: ScriptMeta = {
        name: 'Test Script',
        almanac: 'https://almanac.example.com',
      };

      const result = calculateTokenCountsByType([], { almanacToken: true }, scriptMeta);

      expect(result.meta).toBe(1);
    });

    it('should count bootlegger tokens when enabled', () => {
      const scriptMeta: ScriptMeta = {
        bootlegger: ['Rule 1', 'Rule 2', 'Rule 3'],
      };

      const result = calculateTokenCountsByType([], { generateBootleggerRules: true }, scriptMeta);

      expect(result.meta).toBe(3);
    });

    it('should count jinx tokens when enabled and jinxes exist', () => {
      const characters = [
        createCharacter({
          id: 'char1',
          name: 'Char 1',
          jinxes: [{ id: 'char2', reason: 'Test jinx' }],
        }),
        createCharacter({ id: 'char2', name: 'Char 2' }),
      ];

      const result = calculateTokenCountsByType(characters, { jinxTokens: true }, null);

      expect(result.meta).toBe(1); // One jinx pair
    });

    it('should not count jinxes when target character is not on script', () => {
      const characters = [
        createCharacter({
          id: 'char1',
          name: 'Char 1',
          jinxes: [{ id: 'char3', reason: 'Test jinx' }], // char3 not on script
        }),
        createCharacter({ id: 'char2', name: 'Char 2' }),
      ];

      const result = calculateTokenCountsByType(characters, { jinxTokens: true }, null);

      expect(result.meta).toBe(0);
    });

    it('should count all meta token types combined', () => {
      const scriptMeta: ScriptMeta = {
        name: 'Test Script',
        almanac: 'https://almanac.example.com',
        bootlegger: ['Rule 1'],
      };
      const options: Partial<GenerationOptions> = {
        pandemoniumToken: true,
        scriptNameToken: true,
        almanacToken: true,
        generateBootleggerRules: true,
      };

      const result = calculateTokenCountsByType([], options, scriptMeta);

      expect(result.meta).toBe(4); // pandemonium + script + almanac + 1 bootlegger
    });

    it('should calculate total correctly with all token types', () => {
      const characters = [createCharacterWithReminders(['Rem1', 'Rem2']), createCharacter()];
      const scriptMeta: ScriptMeta = { name: 'Test' };
      const options: Partial<GenerationOptions> = {
        pandemoniumToken: true,
        scriptNameToken: true,
      };

      const result = calculateTokenCountsByType(characters, options, scriptMeta);

      expect(result.character).toBe(2);
      expect(result.reminder).toBe(2);
      expect(result.meta).toBe(2);
      expect(result.total).toBe(6);
    });
  });

  // ==========================================================================
  // generateAllTokens - Basic Functionality
  // ==========================================================================

  describe('generateAllTokens', () => {
    it('should generate tokens for characters', async () => {
      const characters = createScriptCast();

      const tokens = await generateAllTokens(characters);

      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens.some((t) => t.type === 'character')).toBe(true);
    });

    it('should generate reminder tokens when characters have reminders', async () => {
      const characters = [
        createCharacterWithReminders(['Dead', 'Poisoned']),
        createCharacterWithReminders(['Wrong Info']),
      ];

      const tokens = await generateAllTokens(characters);

      const reminderTokens = tokens.filter((t) => t.type === 'reminder');
      expect(reminderTokens.length).toBe(3);
    });

    it('should return empty array for empty character list', async () => {
      const tokens = await generateAllTokens([]);

      expect(tokens).toEqual([]);
    });

    it('should skip characters without names', async () => {
      const characters = [
        createCharacter({ name: '' }),
        createCharacter({ name: 'Valid Character' }),
      ];

      const tokens = await generateAllTokens(characters);

      // Only the valid character should generate a token
      const charTokens = tokens.filter((t) => t.type === 'character');
      expect(charTokens.length).toBe(1);
    });
  });

  // ==========================================================================
  // generateAllTokens - Meta Tokens
  // ==========================================================================

  describe('generateAllTokens - Meta Tokens', () => {
    it('should generate pandemonium token when enabled', async () => {
      const tokens = await generateAllTokens(
        [createCharacter()],
        { pandemoniumToken: true },
        null,
        null
      );

      const pandemoniumToken = tokens.find((t) => t.type === 'pandemonium');
      expect(pandemoniumToken).toBeDefined();
      expect(pandemoniumToken?.name).toBe('Pandemonium Institute');
    });

    it('should generate script name token when enabled', async () => {
      const scriptMeta: ScriptMeta = { name: 'Trouble Brewing', author: 'BOTC Team' };

      const tokens = await generateAllTokens(
        [createCharacter()],
        { scriptNameToken: true },
        null,
        scriptMeta
      );

      const scriptToken = tokens.find((t) => t.type === 'script-name');
      expect(scriptToken).toBeDefined();
      expect(scriptToken?.name).toBe('Trouble Brewing');
    });

    it('should generate almanac QR token when enabled', async () => {
      const scriptMeta: ScriptMeta = {
        name: 'Custom Script',
        almanac: 'https://almanac.example.com/script',
      };

      const tokens = await generateAllTokens(
        [createCharacter()],
        { almanacToken: true },
        null,
        scriptMeta
      );

      const almanacToken = tokens.find((t) => t.type === 'almanac');
      expect(almanacToken).toBeDefined();
    });

    it('should generate bootlegger tokens when enabled', async () => {
      const scriptMeta: ScriptMeta = {
        bootlegger: ['Custom rule 1', 'Custom rule 2'],
      };

      const tokens = await generateAllTokens(
        [createCharacter()],
        { generateBootleggerRules: true },
        null,
        scriptMeta
      );

      const bootleggerTokens = tokens.filter((t) => t.type === 'bootlegger');
      expect(bootleggerTokens.length).toBe(2);
    });

    it('should skip empty bootlegger entries', async () => {
      const scriptMeta: ScriptMeta = {
        bootlegger: ['Valid rule', '', '  ', 'Another rule'],
      };

      const tokens = await generateAllTokens(
        [createCharacter()],
        { generateBootleggerRules: true },
        null,
        scriptMeta
      );

      const bootleggerTokens = tokens.filter((t) => t.type === 'bootlegger');
      expect(bootleggerTokens.length).toBe(2);
    });

    it('should generate jinx tokens when enabled and jinxes exist', async () => {
      const characters = [
        createCharacter({
          id: 'washerwoman',
          name: 'Washerwoman',
          jinxes: [{ id: 'drunk', reason: 'Special interaction' }],
        }),
        createCharacter({ id: 'drunk', name: 'Drunk' }),
      ];

      const tokens = await generateAllTokens(characters, { jinxTokens: true });

      const jinxTokens = tokens.filter((t) => t.type === 'jinx');
      expect(jinxTokens.length).toBe(1);
    });

    it('should avoid duplicate jinx tokens for symmetric relationships', async () => {
      const characters = [
        createCharacter({
          id: 'char1',
          name: 'Char 1',
          jinxes: [{ id: 'char2', reason: 'Jinx A->B' }],
        }),
        createCharacter({
          id: 'char2',
          name: 'Char 2',
          jinxes: [{ id: 'char1', reason: 'Jinx B->A' }],
        }),
      ];

      const tokens = await generateAllTokens(characters, { jinxTokens: true });

      const jinxTokens = tokens.filter((t) => t.type === 'jinx');
      // Should only generate one jinx token, not two
      expect(jinxTokens.length).toBe(1);
    });
  });

  // ==========================================================================
  // generateAllTokens - Callbacks
  // ==========================================================================

  describe('generateAllTokens - Callbacks', () => {
    it('should call progress callback with updates', async () => {
      const progressCallback: ProgressCallback = vi.fn();
      const characters = [createCharacter(), createCharacter()];

      await generateAllTokens(characters, {}, progressCallback);

      expect(progressCallback).toHaveBeenCalled();
    });

    it('should call token callback for each generated token', async () => {
      const tokenCallback: TokenCallback = vi.fn();
      const characters = [createCharacter()];

      await generateAllTokens(characters, {}, null, null, tokenCallback);

      expect(tokenCallback).toHaveBeenCalled();
    });

    it('should call detailed progress callback with phase info', async () => {
      const detailedProgressCallback: DetailedProgressCallback = vi.fn();
      const characters = [createCharacter()];

      await generateAllTokens(
        characters,
        { pandemoniumToken: true },
        null,
        null,
        null,
        undefined,
        undefined,
        detailedProgressCallback
      );

      expect(detailedProgressCallback).toHaveBeenCalled();
      const calls = (detailedProgressCallback as Mock).mock.calls;
      expect(calls.length).toBeGreaterThan(0);

      // First call should have phase info
      const firstCall = calls[0][0] as GenerationProgress;
      expect(firstCall).toHaveProperty('phase');
      expect(firstCall).toHaveProperty('overall');
    });
  });

  // ==========================================================================
  // generateAllTokens - Abort Handling
  // ==========================================================================

  describe('generateAllTokens - Abort Handling', () => {
    it('should throw when signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        generateAllTokens([createCharacter()], {}, null, null, null, controller.signal)
      ).rejects.toThrow('Token generation aborted');
    });

    it('should check abort signal before processing', async () => {
      const controller = new AbortController();
      const characters = Array.from({ length: 20 }, () => createCharacter());

      // Pre-abort the signal
      controller.abort();

      // Should reject immediately since signal is already aborted
      await expect(
        generateAllTokens(characters, {}, null, null, null, controller.signal)
      ).rejects.toThrow('Token generation aborted');
    });

    it('should include abort message in thrown error', async () => {
      const controller = new AbortController();
      controller.abort();

      try {
        await generateAllTokens([createCharacter()], {}, null, null, null, controller.signal);
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toBe('Token generation aborted');
      }
    });
  });

  // ==========================================================================
  // Partial Generation Functions
  // ==========================================================================

  describe('generateCharacterTokens', () => {
    it('should generate only character tokens', async () => {
      const characters = [createCharacterWithReminders(['Reminder 1']), createCharacter()];

      const tokens = await generateCharacterTokens(characters);

      // Should only have character tokens, no reminders
      expect(tokens.every((t) => t.type === 'character')).toBe(true);
    });

    it('should return tokens for all characters', async () => {
      const characters = createScriptCast();

      const tokens = await generateCharacterTokens(characters);

      expect(tokens.length).toBe(characters.length);
    });

    it('should respect abort signal', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        generateCharacterTokens([createCharacter()], {}, null, null, null, controller.signal)
      ).rejects.toThrow('Token generation aborted');
    });
  });

  describe('generateReminders', () => {
    it('should generate only reminder tokens', async () => {
      const characters = [
        createCharacterWithReminders(['Dead', 'Poisoned']),
        createCharacterWithReminders(['Wrong Info']),
      ];

      const tokens = await generateReminders(characters);

      // Should only have reminder tokens
      expect(tokens.every((t) => t.type === 'reminder')).toBe(true);
      expect(tokens.length).toBe(3);
    });

    it('should return empty array for characters without reminders', async () => {
      const characters = [createCharacter(), createCharacter()];

      const tokens = await generateReminders(characters);

      expect(tokens).toEqual([]);
    });

    it('should respect abort signal', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        generateReminders(
          [createCharacterWithReminders(['Test'])],
          {},
          null,
          null,
          null,
          controller.signal
        )
      ).rejects.toThrow('Token generation aborted');
    });
  });

  describe('generateMeta', () => {
    it('should generate only meta tokens', async () => {
      const scriptMeta: ScriptMeta = {
        name: 'Test Script',
        almanac: 'https://example.com',
      };
      const options: Partial<GenerationOptions> = {
        pandemoniumToken: true,
        scriptNameToken: true,
        almanacToken: true,
      };

      const tokens = await generateMeta([createCharacter()], options, null, scriptMeta);

      // All tokens should be meta types
      const metaTypes = ['pandemonium', 'script-name', 'almanac', 'bootlegger', 'jinx'];
      expect(tokens.every((t) => metaTypes.includes(t.type))).toBe(true);
    });

    it('should return empty array when no meta options enabled', async () => {
      const tokens = await generateMeta([createCharacter()], {}, null, null);

      expect(tokens).toEqual([]);
    });

    it('should respect abort signal', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        generateMeta(
          [createCharacter()],
          { pandemoniumToken: true },
          null,
          null,
          null,
          controller.signal
        )
      ).rejects.toThrow('Token generation aborted');
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle characters with multiple image variants', async () => {
      const characters = [
        createCharacter({
          name: 'Multi-Image Char',
          image: ['image1.png', 'image2.png', 'image3.png'],
        }),
      ];

      const tokens = await generateAllTokens(characters, { generateImageVariants: true });

      // Should generate multiple character tokens for variants
      const charTokens = tokens.filter((t) => t.type === 'character');
      expect(charTokens.length).toBe(3);
    });

    it('should handle characters with empty reminders array', async () => {
      const characters = [createCharacter({ reminders: [] })];

      const tokens = await generateAllTokens(characters);

      const reminderTokens = tokens.filter((t) => t.type === 'reminder');
      expect(reminderTokens.length).toBe(0);
    });

    it('should handle characters with undefined reminders', async () => {
      const characters = [createCharacter({ reminders: undefined })];

      const tokens = await generateAllTokens(characters);

      const reminderTokens = tokens.filter((t) => t.type === 'reminder');
      expect(reminderTokens.length).toBe(0);
    });

    it('should handle null scriptMeta gracefully', async () => {
      const tokens = await generateAllTokens(
        [createCharacter()],
        {
          scriptNameToken: true,
          almanacToken: true,
          generateBootleggerRules: true,
        },
        null,
        null // null scriptMeta
      );

      // Should not generate any meta tokens that require scriptMeta
      const metaTokens = tokens.filter((t) =>
        ['script-name', 'almanac', 'bootlegger'].includes(t.type)
      );
      expect(metaTokens.length).toBe(0);
    });

    it('should generate tokens in correct order (characters before meta)', async () => {
      const scriptMeta: ScriptMeta = { name: 'Test' };
      const characters = [createCharacter()];

      const tokens = await generateAllTokens(
        characters,
        { pandemoniumToken: true, scriptNameToken: true },
        null,
        scriptMeta
      );

      // Find indices
      const charIndex = tokens.findIndex((t) => t.type === 'character');
      const metaIndex = tokens.findIndex(
        (t) => t.type === 'pandemonium' || t.type === 'script-name'
      );

      // Character tokens should come before meta tokens
      expect(charIndex).toBeLessThan(metaIndex);
    });

    it('should handle large character lists efficiently', async () => {
      const characters = Array.from({ length: 50 }, (_, i) =>
        createCharacter({ name: `Character ${i + 1}` })
      );

      const startTime = Date.now();
      const tokens = await generateAllTokens(characters);
      const elapsed = Date.now() - startTime;

      expect(tokens.length).toBe(50);
      // Should complete in reasonable time (mocked, so should be fast)
      expect(elapsed).toBeLessThan(5000);
    });

    it('should handle special characters in character names', async () => {
      const characters = [
        createCharacter({ name: "The Baron's Minion" }),
        createCharacter({ name: 'Character <with> Special & Chars' }),
        createCharacter({ name: 'Unicode: 日本語' }),
      ];

      const tokens = await generateAllTokens(characters);

      expect(tokens.length).toBe(3);
    });
  });

  // ==========================================================================
  // Integration with Options
  // ==========================================================================

  describe('Options Integration', () => {
    it('should respect generateImageVariants option', async () => {
      const characters = [createCharacter({ image: ['img1.png', 'img2.png'] })];

      // With variants disabled
      const tokensNoVariants = await generateAllTokens(characters, {
        generateImageVariants: false,
      });
      // With variants enabled
      const tokensWithVariants = await generateAllTokens(characters, {
        generateImageVariants: true,
      });

      expect(tokensWithVariants.length).toBeGreaterThan(tokensNoVariants.length);
    });

    it('should handle hideScriptNameAuthor option', async () => {
      const scriptMeta: ScriptMeta = { name: 'Test Script', author: 'Author Name' };

      // Should not throw with either option value
      await expect(
        generateAllTokens(
          [createCharacter()],
          { scriptNameToken: true, hideScriptNameAuthor: true },
          null,
          scriptMeta
        )
      ).resolves.toBeDefined();

      await expect(
        generateAllTokens(
          [createCharacter()],
          { scriptNameToken: true, hideScriptNameAuthor: false },
          null,
          scriptMeta
        )
      ).resolves.toBeDefined();
    });
  });
});
