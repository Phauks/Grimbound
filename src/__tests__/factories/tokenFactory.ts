import type { Team, Token } from '@/ts/types';
import { createCharacter } from './characterFactory';

let idCounter = 0;

type TokenOverrides = Partial<Token>;

/**
 * Create a test token with sensible defaults.
 */
export function createToken(overrides: TokenOverrides = {}): Token {
  idCounter++;
  const name = overrides.name ?? `Test Token ${idCounter}`;
  const filename = overrides.filename ?? `test-token-${idCounter}.png`;

  return {
    type: overrides.type ?? 'character',
    name,
    filename,
    team: overrides.team ?? 'townsfolk',
    canvas: overrides.canvas ?? document.createElement('canvas'),
    diameter: overrides.diameter ?? 300,
    ...overrides,
  };
}

/**
 * Create a character token.
 */
export function createCharacterToken(overrides: TokenOverrides = {}): Token {
  const character = createCharacter();
  return createToken({
    type: 'character',
    name: character.name,
    characterData: character,
    ...overrides,
  });
}

/**
 * Create a reminder token.
 */
export function createReminderToken(reminderText: string, overrides: TokenOverrides = {}): Token {
  return createToken({
    type: 'reminder',
    reminderText,
    ...overrides,
  });
}

/**
 * Create a script name token.
 */
export function createScriptNameToken(overrides: TokenOverrides = {}): Token {
  return createToken({
    type: 'script-name',
    name: 'Script Name',
    team: 'meta',
    ...overrides,
  });
}

/**
 * Create an almanac QR token.
 */
export function createAlmanacToken(overrides: TokenOverrides = {}): Token {
  return createToken({
    type: 'almanac',
    name: 'Almanac',
    team: 'meta',
    ...overrides,
  });
}

/**
 * Create a pandemonium token.
 */
export function createPandemoniumToken(overrides: TokenOverrides = {}): Token {
  return createToken({
    type: 'pandemonium',
    name: 'Pandemonium',
    team: 'meta',
    ...overrides,
  });
}

/**
 * Create a bootlegger token.
 */
export function createBootleggerToken(overrides: TokenOverrides = {}): Token {
  return createToken({
    type: 'bootlegger',
    name: 'Bootlegger',
    team: 'meta',
    ...overrides,
  });
}

/**
 * Create multiple tokens.
 */
export function createTokens(count: number, overrides: TokenOverrides = {}): Token[] {
  return Array.from({ length: count }, () => createToken(overrides));
}

/**
 * Create a set of tokens for each team.
 */
export function createTokensByTeam(): Record<Team, Token[]> {
  const teams: Team[] = [
    'townsfolk',
    'outsider',
    'minion',
    'demon',
    'traveller',
    'fabled',
    'loric',
    'meta',
  ];
  return teams.reduce(
    (acc, team) => {
      acc[team] = [createToken({ team, name: `${team} Token` })];
      return acc;
    },
    {} as Record<Team, Token[]>
  );
}

/**
 * Reset the ID counter.
 */
export function resetTokenFactory(): void {
  idCounter = 0;
}
