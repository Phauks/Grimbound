import type { Character } from '@/ts/types';

let idCounter = 0;

type CharacterOverrides = Partial<Character>;

/**
 * Create a test character with sensible defaults.
 * Override any property by passing it in the overrides object.
 */
export function createCharacter(overrides: CharacterOverrides = {}): Character {
  idCounter++;
  const id = overrides.id ?? `test-character-${idCounter}`;
  const name = overrides.name ?? `Test Character ${idCounter}`;

  return {
    id,
    name,
    team: overrides.team ?? 'townsfolk',
    ability: overrides.ability ?? 'This is a test ability for testing purposes.',
    image: overrides.image ?? `https://example.com/icons/${id}.png`,
    firstNight: overrides.firstNight ?? 0,
    otherNight: overrides.otherNight ?? 0,
    firstNightReminder: overrides.firstNightReminder ?? '',
    otherNightReminder: overrides.otherNightReminder ?? '',
    reminders: overrides.reminders ?? [],
    remindersGlobal: overrides.remindersGlobal ?? [],
    setup: overrides.setup ?? false,
    ...overrides,
  };
}

/**
 * Create multiple test characters.
 */
export function createCharacters(count: number, overrides: CharacterOverrides = {}): Character[] {
  return Array.from({ length: count }, () => createCharacter(overrides));
}

/**
 * Create a Townsfolk character.
 */
export function createTownsfolk(overrides: CharacterOverrides = {}): Character {
  return createCharacter({ team: 'townsfolk', ...overrides });
}

/**
 * Create an Outsider character.
 */
export function createOutsider(overrides: CharacterOverrides = {}): Character {
  return createCharacter({ team: 'outsider', ...overrides });
}

/**
 * Create a Minion character.
 */
export function createMinion(overrides: CharacterOverrides = {}): Character {
  return createCharacter({ team: 'minion', ...overrides });
}

/**
 * Create a Demon character.
 */
export function createDemon(overrides: CharacterOverrides = {}): Character {
  return createCharacter({ team: 'demon', ...overrides });
}

/**
 * Create a Traveller character.
 */
export function createTraveller(overrides: CharacterOverrides = {}): Character {
  return createCharacter({ team: 'traveller', ...overrides });
}

/**
 * Create a Fabled character.
 */
export function createFabled(overrides: CharacterOverrides = {}): Character {
  return createCharacter({ team: 'fabled', ...overrides });
}

/**
 * Create a character with reminders.
 */
export function createCharacterWithReminders(
  reminderTexts: string[],
  overrides: CharacterOverrides = {}
): Character {
  return createCharacter({
    reminders: reminderTexts,
    ...overrides,
  });
}

/**
 * Create a character that appears in night order.
 */
export function createNightCharacter(overrides: CharacterOverrides = {}): Character {
  return createCharacter({
    firstNight: 10,
    firstNightReminder: 'First night reminder text',
    otherNight: 20,
    otherNightReminder: 'Other night reminder text',
    ...overrides,
  });
}

/**
 * Create a complete script cast (one of each team type).
 */
export function createScriptCast(): Character[] {
  return [
    createTownsfolk({ name: 'Washerwoman', id: 'washerwoman' }),
    createTownsfolk({ name: 'Librarian', id: 'librarian' }),
    createTownsfolk({ name: 'Investigator', id: 'investigator' }),
    createOutsider({ name: 'Drunk', id: 'drunk' }),
    createMinion({ name: 'Poisoner', id: 'poisoner' }),
    createDemon({ name: 'Imp', id: 'imp' }),
  ];
}

/**
 * Reset the ID counter. Call in afterEach for predictable IDs.
 */
export function resetCharacterFactory(): void {
  idCounter = 0;
}
