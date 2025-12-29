import { createCharacter } from '@test/factories/characterFactory';
import { vi } from 'vitest';
import type { IDataSyncService, SyncEventListener } from '@/ts/sync/ISyncServices';
import type { Character, SyncStatus } from '@/ts/types';

/**
 * Create a mock DataSyncService for testing.
 */
export function createMockDataSyncService(
  overrides: Partial<IDataSyncService> = {}
): IDataSyncService {
  const defaultCharacters: Character[] = [
    createCharacter({ id: 'washerwoman', name: 'Washerwoman', team: 'townsfolk' }),
    createCharacter({ id: 'librarian', name: 'Librarian', team: 'townsfolk' }),
    createCharacter({ id: 'investigator', name: 'Investigator', team: 'townsfolk' }),
    createCharacter({ id: 'drunk', name: 'Drunk', team: 'outsider' }),
    createCharacter({ id: 'poisoner', name: 'Poisoner', team: 'minion' }),
    createCharacter({ id: 'imp', name: 'Imp', team: 'demon' }),
  ];

  const listeners: SyncEventListener[] = [];

  const defaultStatus: SyncStatus = {
    state: 'idle',
    dataSource: 'cache',
    currentVersion: 'v2024.01.01-r1',
    availableVersion: null,
    lastSync: new Date(),
    error: null,
  };

  return {
    initialize: vi.fn().mockResolvedValue(undefined),
    checkForUpdates: vi.fn().mockResolvedValue(false),
    downloadAndInstall: vi.fn().mockResolvedValue(undefined),
    getCharacters: vi.fn().mockResolvedValue(defaultCharacters),
    getCharacter: vi
      .fn()
      .mockImplementation(async (id: string) => defaultCharacters.find((c) => c.id === id) ?? null),
    searchCharacters: vi.fn().mockImplementation(async (query: string) => {
      const q = query.toLowerCase();
      return defaultCharacters.filter(
        (c) => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
      );
    }),
    getCharacterImage: vi.fn().mockResolvedValue(new Blob(['mock-image'], { type: 'image/webp' })),
    hasCharacterImage: vi.fn().mockResolvedValue(true),
    getStatus: vi.fn().mockReturnValue(defaultStatus),
    clearCacheAndResync: vi.fn().mockResolvedValue(undefined),
    stopPeriodicUpdateChecks: vi.fn(),
    addEventListener: vi.fn().mockImplementation((listener: SyncEventListener) => {
      listeners.push(listener);
    }),
    removeEventListener: vi.fn().mockImplementation((listener: SyncEventListener) => {
      const index = listeners.indexOf(listener);
      if (index > -1) listeners.splice(index, 1);
    }),
    initialized: true,
    ...overrides,
  };
}

/**
 * Create a mock DataSyncService with custom characters.
 */
export function createMockDataSyncServiceWithCharacters(
  characters: Character[],
  overrides: Partial<IDataSyncService> = {}
): IDataSyncService {
  const mock = createMockDataSyncService(overrides);

  mock.getCharacters = vi.fn().mockResolvedValue(characters);
  mock.getCharacter = vi
    .fn()
    .mockImplementation(async (id: string) => characters.find((c) => c.id === id) ?? null);
  mock.searchCharacters = vi.fn().mockImplementation(async (query: string) => {
    const q = query.toLowerCase();
    return characters.filter(
      (c) => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
    );
  });

  return mock;
}
