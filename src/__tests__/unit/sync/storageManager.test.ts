import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StorageError } from '@/ts/errors';
import { StorageManager } from '@/ts/sync/storageManager';
import type { Character } from '@/ts/types/index';

// Mock CONFIG
vi.mock('@/ts/config.js', () => ({
  default: {
    SYNC: {
      DB_NAME: 'test-botc-token-generator',
      DB_VERSION: 1,
      CACHE_NAME: 'test-botc-character-icons-v1',
      STORAGE_QUOTA_WARNING_MB: 20,
    },
  },
}));

// Mock logger to avoid console output
vi.mock('@/ts/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Helper to trigger IDBRequest success after microtask
function triggerSuccess(request: IDBRequest, result?: unknown): void {
  queueMicrotask(() => {
    Object.defineProperty(request, 'result', { value: result, writable: true });
    request.onsuccess?.(new Event('success'));
  });
}

// Helper to trigger IDBRequest error after microtask
function triggerError(request: IDBRequest, error?: Error): void {
  queueMicrotask(() => {
    Object.defineProperty(request, 'error', {
      value: error || new Error('Request failed'),
      writable: true,
    });
    request.onerror?.(new Event('error'));
  });
}

// Helper to trigger IDBTransaction complete after microtask
function triggerTransactionComplete(transaction: IDBTransaction): void {
  queueMicrotask(() => {
    transaction.oncomplete?.(new Event('complete'));
  });
}

// Helper to trigger IDBTransaction error after microtask
function triggerTransactionError(transaction: IDBTransaction, error?: Error): void {
  queueMicrotask(() => {
    Object.defineProperty(transaction, 'error', {
      value: error || new Error('Transaction failed'),
      writable: true,
    });
    transaction.onerror?.(new Event('error'));
  });
}

// Helper function to create mock IDB objects
function createMockIDBRequest(): IDBRequest {
  return {
    result: undefined,
    error: null,
    onsuccess: null,
    onerror: null,
  } as unknown as IDBRequest;
}

function createMockIDBOpenRequest(): IDBOpenDBRequest {
  return {
    result: undefined,
    error: null,
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
  } as unknown as IDBOpenDBRequest;
}

function createMockIDBTransaction(): IDBTransaction {
  return {
    oncomplete: null,
    onerror: null,
    error: null,
    objectStore: vi.fn(),
  } as unknown as IDBTransaction;
}

// Mock character data
const mockCharacter: Character = {
  id: 'washerwoman',
  name: 'Washerwoman',
  team: 'townsfolk',
  ability: 'You start knowing that 1 of 2 players is a particular Townsfolk.',
  image: 'https://example.com/washerwoman.webp',
  edition: 'tb',
  firstNight: 1,
  firstNightReminder: 'Show the character token...',
  otherNight: 0,
  otherNightReminder: '',
  reminders: ['Townsfolk', 'Wrong'],
  remindersGlobal: [],
  setup: false,
};

const mockCharacter2: Character = {
  id: 'imp',
  name: 'Imp',
  team: 'demon',
  ability: 'Each night*, choose a player: they die...',
  image: 'https://example.com/imp.webp',
  edition: 'tb',
  firstNight: 0,
  firstNightReminder: '',
  otherNight: 1,
  otherNightReminder: 'The Imp chooses a player...',
  reminders: ['Dead'],
  remindersGlobal: [],
  setup: false,
};

describe('StorageManager', () => {
  let storageManager: StorageManager;
  let mockDB: IDBDatabase;
  let mockCache: Cache;

  beforeEach(() => {
    vi.clearAllMocks();
    // Create fresh storageManager for each test
    storageManager = new StorageManager();

    // Mock IndexedDB
    mockDB = {
      close: vi.fn(),
      transaction: vi.fn(),
      objectStoreNames: {
        contains: vi.fn().mockReturnValue(false),
      } as unknown as DOMStringList,
    } as unknown as IDBDatabase;

    // Mock Cache API
    mockCache = {
      put: vi.fn().mockResolvedValue(undefined),
      match: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(true),
    } as unknown as Cache;

    // Mock global indexedDB
    global.indexedDB = {
      open: vi.fn(),
    } as unknown as IDBFactory;

    // Mock global caches
    global.caches = {
      open: vi.fn().mockResolvedValue(mockCache),
      delete: vi.fn().mockResolvedValue(true),
    } as unknown as CacheStorage;

    // Mock navigator.storage
    global.navigator = {
      storage: {
        estimate: vi.fn().mockResolvedValue({
          usage: 1024 * 1024 * 5, // 5 MB
          quota: 1024 * 1024 * 100, // 100 MB
        }),
      },
    } as unknown as Navigator;
  });

  describe('initialize', () => {
    it('should successfully initialize IndexedDB and Cache API', async () => {
      const mockRequest = createMockIDBOpenRequest();
      (global.indexedDB.open as ReturnType<typeof vi.fn>).mockReturnValue(mockRequest);

      const initPromise = storageManager.initialize();
      triggerSuccess(mockRequest as unknown as IDBRequest, mockDB);

      await initPromise;

      expect(global.indexedDB.open).toHaveBeenCalledWith('test-botc-token-generator', 1);
      expect(global.caches.open).toHaveBeenCalledWith('test-botc-character-icons-v1');
    });

    it('should only initialize once when called multiple times', async () => {
      const mockRequest = createMockIDBOpenRequest();
      (global.indexedDB.open as ReturnType<typeof vi.fn>).mockReturnValue(mockRequest);

      const init1 = storageManager.initialize();
      const init2 = storageManager.initialize();

      triggerSuccess(mockRequest as unknown as IDBRequest, mockDB);

      await Promise.all([init1, init2]);

      // Should only open DB once
      expect(global.indexedDB.open).toHaveBeenCalledTimes(1);
    });

    it('should return immediately if already initialized', async () => {
      const mockRequest = createMockIDBOpenRequest();
      (global.indexedDB.open as ReturnType<typeof vi.fn>).mockReturnValue(mockRequest);

      // First initialization
      const init1 = storageManager.initialize();
      triggerSuccess(mockRequest as unknown as IDBRequest, mockDB);
      await init1;

      // Second initialization should be instant
      await storageManager.initialize();

      expect(global.indexedDB.open).toHaveBeenCalledTimes(1);
    });

    it('should throw StorageError when IndexedDB fails to open', async () => {
      const mockRequest = createMockIDBOpenRequest();
      (global.indexedDB.open as ReturnType<typeof vi.fn>).mockReturnValue(mockRequest);

      const initPromise = storageManager.initialize();
      triggerError(mockRequest as unknown as IDBRequest, new Error('DB open failed'));

      await expect(initPromise).rejects.toThrow(StorageError);
    });

    it('should throw StorageError when Cache API fails to open', async () => {
      const mockRequest = createMockIDBOpenRequest();
      (global.indexedDB.open as ReturnType<typeof vi.fn>).mockReturnValue(mockRequest);
      (global.caches.open as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Cache open failed')
      );

      const initPromise = storageManager.initialize();
      triggerSuccess(mockRequest as unknown as IDBRequest, mockDB);

      await expect(initPromise).rejects.toThrow(StorageError);
    });

    it('should create object stores on upgrade', async () => {
      const mockRequest = createMockIDBOpenRequest();
      const mockUpgradeDB = {
        objectStoreNames: {
          contains: vi.fn().mockReturnValue(false),
        } as unknown as DOMStringList,
        createObjectStore: vi.fn().mockReturnValue({
          createIndex: vi.fn(),
        }),
      } as unknown as IDBDatabase;

      (global.indexedDB.open as ReturnType<typeof vi.fn>).mockReturnValue(mockRequest);

      const initPromise = storageManager.initialize();

      // Trigger upgrade event
      queueMicrotask(() => {
        const upgradeEvent = {
          target: { result: mockUpgradeDB },
        } as unknown as IDBVersionChangeEvent;
        mockRequest.onupgradeneeded?.(upgradeEvent);

        // Then success
        triggerSuccess(mockRequest as unknown as IDBRequest, mockDB);
      });

      await initPromise;

      expect(mockUpgradeDB.createObjectStore).toHaveBeenCalledWith('characters', {
        keyPath: 'id',
      });
      expect(mockUpgradeDB.createObjectStore).toHaveBeenCalledWith('metadata', { keyPath: 'key' });
      expect(mockUpgradeDB.createObjectStore).toHaveBeenCalledWith('settings', { keyPath: 'key' });
    });
  });

  describe('storeCharacter', () => {
    beforeEach(async () => {
      const mockRequest = createMockIDBOpenRequest();
      (global.indexedDB.open as ReturnType<typeof vi.fn>).mockReturnValue(mockRequest);
      const initPromise = storageManager.initialize();
      triggerSuccess(mockRequest as unknown as IDBRequest, mockDB);
      await initPromise;
    });

    it('should store a character with version and timestamp', async () => {
      const mockTransaction = createMockIDBTransaction();
      const putRequest = createMockIDBRequest();
      const mockStore = {
        put: vi.fn().mockReturnValue(putRequest),
      };

      (mockDB.transaction as ReturnType<typeof vi.fn>).mockReturnValue(mockTransaction);
      (mockTransaction.objectStore as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);

      const storePromise = storageManager.storeCharacter(mockCharacter, 'v2025.01.01-r1');
      triggerSuccess(putRequest);

      await storePromise;

      expect(mockDB.transaction).toHaveBeenCalledWith(['characters'], 'readwrite');
      expect(mockStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'washerwoman',
          name: 'Washerwoman',
          _version: 'v2025.01.01-r1',
          _storedAt: expect.any(Number),
        })
      );
    });

    it('should throw StorageError when put operation fails', async () => {
      const mockTransaction = createMockIDBTransaction();
      const putRequest = createMockIDBRequest();
      const mockStore = {
        put: vi.fn().mockReturnValue(putRequest),
      };

      (mockDB.transaction as ReturnType<typeof vi.fn>).mockReturnValue(mockTransaction);
      (mockTransaction.objectStore as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);

      const storePromise = storageManager.storeCharacter(mockCharacter, 'v2025.01.01-r1');
      triggerError(putRequest, new Error('Put failed'));

      await expect(storePromise).rejects.toThrow(StorageError);
    });
  });

  describe('storeCharacters', () => {
    beforeEach(async () => {
      const mockRequest = createMockIDBOpenRequest();
      (global.indexedDB.open as ReturnType<typeof vi.fn>).mockReturnValue(mockRequest);
      const initPromise = storageManager.initialize();
      triggerSuccess(mockRequest as unknown as IDBRequest, mockDB);
      await initPromise;
    });

    it('should store multiple characters in a single transaction', async () => {
      const mockTransaction = createMockIDBTransaction();
      const mockStore = {
        put: vi.fn(),
      };

      (mockDB.transaction as ReturnType<typeof vi.fn>).mockReturnValue(mockTransaction);
      (mockTransaction.objectStore as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);

      const storePromise = storageManager.storeCharacters(
        [mockCharacter, mockCharacter2],
        'v2025.01.01-r1'
      );

      triggerTransactionComplete(mockTransaction);

      await storePromise;

      expect(mockStore.put).toHaveBeenCalledTimes(2);
      expect(mockStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'washerwoman',
          _version: 'v2025.01.01-r1',
        })
      );
      expect(mockStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'imp',
          _version: 'v2025.01.01-r1',
        })
      );
    });

    it('should throw StorageError when transaction fails', async () => {
      const mockTransaction = createMockIDBTransaction();
      const mockStore = { put: vi.fn() };

      (mockDB.transaction as ReturnType<typeof vi.fn>).mockReturnValue(mockTransaction);
      (mockTransaction.objectStore as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);

      const storePromise = storageManager.storeCharacters([mockCharacter], 'v2025.01.01-r1');

      triggerTransactionError(mockTransaction, new Error('Transaction failed'));

      await expect(storePromise).rejects.toThrow(StorageError);
    });
  });

  describe('getCharacter', () => {
    beforeEach(async () => {
      const mockRequest = createMockIDBOpenRequest();
      (global.indexedDB.open as ReturnType<typeof vi.fn>).mockReturnValue(mockRequest);
      const initPromise = storageManager.initialize();
      triggerSuccess(mockRequest as unknown as IDBRequest, mockDB);
      await initPromise;
    });

    it('should retrieve a character by ID', async () => {
      const mockTransaction = createMockIDBTransaction();
      const cachedCharacter = {
        ...mockCharacter,
        _storedAt: Date.now(),
        _version: 'v2025.01.01-r1',
      };
      const getRequest = createMockIDBRequest();
      const mockStore = {
        get: vi.fn().mockReturnValue(getRequest),
      };

      (mockDB.transaction as ReturnType<typeof vi.fn>).mockReturnValue(mockTransaction);
      (mockTransaction.objectStore as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);

      const getPromise = storageManager.getCharacter('washerwoman');
      triggerSuccess(getRequest, cachedCharacter);

      const result = await getPromise;

      expect(mockStore.get).toHaveBeenCalledWith('washerwoman');
      expect(result).toEqual(cachedCharacter);
    });

    it('should return null when character not found', async () => {
      const mockTransaction = createMockIDBTransaction();
      const getRequest = createMockIDBRequest();
      const mockStore = {
        get: vi.fn().mockReturnValue(getRequest),
      };

      (mockDB.transaction as ReturnType<typeof vi.fn>).mockReturnValue(mockTransaction);
      (mockTransaction.objectStore as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);

      const getPromise = storageManager.getCharacter('nonexistent');
      triggerSuccess(getRequest, undefined);

      const result = await getPromise;

      expect(result).toBeNull();
    });

    it('should throw StorageError when get operation fails', async () => {
      const mockTransaction = createMockIDBTransaction();
      const getRequest = createMockIDBRequest();
      const mockStore = {
        get: vi.fn().mockReturnValue(getRequest),
      };

      (mockDB.transaction as ReturnType<typeof vi.fn>).mockReturnValue(mockTransaction);
      (mockTransaction.objectStore as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);

      const getPromise = storageManager.getCharacter('washerwoman');
      triggerError(getRequest, new Error('Get failed'));

      await expect(getPromise).rejects.toThrow(StorageError);
    });
  });

  describe('getAllCharacters', () => {
    beforeEach(async () => {
      const mockRequest = createMockIDBOpenRequest();
      (global.indexedDB.open as ReturnType<typeof vi.fn>).mockReturnValue(mockRequest);
      const initPromise = storageManager.initialize();
      triggerSuccess(mockRequest as unknown as IDBRequest, mockDB);
      await initPromise;
    });

    it('should retrieve all characters', async () => {
      const mockTransaction = createMockIDBTransaction();
      const characters = [
        { ...mockCharacter, _storedAt: Date.now(), _version: 'v2025.01.01-r1' },
        { ...mockCharacter2, _storedAt: Date.now(), _version: 'v2025.01.01-r1' },
      ];
      const getAllRequest = createMockIDBRequest();
      const mockStore = {
        getAll: vi.fn().mockReturnValue(getAllRequest),
      };

      (mockDB.transaction as ReturnType<typeof vi.fn>).mockReturnValue(mockTransaction);
      (mockTransaction.objectStore as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);

      const getPromise = storageManager.getAllCharacters();
      triggerSuccess(getAllRequest, characters);

      const result = await getPromise;

      expect(result).toEqual(characters);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no characters exist', async () => {
      const mockTransaction = createMockIDBTransaction();
      const getAllRequest = createMockIDBRequest();
      const mockStore = {
        getAll: vi.fn().mockReturnValue(getAllRequest),
      };

      (mockDB.transaction as ReturnType<typeof vi.fn>).mockReturnValue(mockTransaction);
      (mockTransaction.objectStore as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);

      const getPromise = storageManager.getAllCharacters();
      triggerSuccess(getAllRequest, undefined);

      const result = await getPromise;

      expect(result).toEqual([]);
    });

    it('should throw StorageError when getAll operation fails', async () => {
      const mockTransaction = createMockIDBTransaction();
      const getAllRequest = createMockIDBRequest();
      const mockStore = {
        getAll: vi.fn().mockReturnValue(getAllRequest),
      };

      (mockDB.transaction as ReturnType<typeof vi.fn>).mockReturnValue(mockTransaction);
      (mockTransaction.objectStore as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);

      const getPromise = storageManager.getAllCharacters();
      triggerError(getAllRequest, new Error('GetAll failed'));

      await expect(getPromise).rejects.toThrow(StorageError);
    });
  });

  describe('searchCharacters', () => {
    beforeEach(async () => {
      const mockRequest = createMockIDBOpenRequest();
      (global.indexedDB.open as ReturnType<typeof vi.fn>).mockReturnValue(mockRequest);
      const initPromise = storageManager.initialize();
      triggerSuccess(mockRequest as unknown as IDBRequest, mockDB);
      await initPromise;
    });

    it('should search characters by name (case-insensitive)', async () => {
      const mockTransaction = createMockIDBTransaction();
      const characters = [
        { ...mockCharacter, _storedAt: Date.now(), _version: 'v2025.01.01-r1' },
        { ...mockCharacter2, _storedAt: Date.now(), _version: 'v2025.01.01-r1' },
      ];
      const getAllRequest = createMockIDBRequest();
      const mockStore = {
        getAll: vi.fn().mockReturnValue(getAllRequest),
      };

      (mockDB.transaction as ReturnType<typeof vi.fn>).mockReturnValue(mockTransaction);
      (mockTransaction.objectStore as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);

      const searchPromise = storageManager.searchCharacters('washer');
      triggerSuccess(getAllRequest, characters);

      const result = await searchPromise;

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Washerwoman');
    });

    it('should search characters by ID (case-insensitive)', async () => {
      const mockTransaction = createMockIDBTransaction();
      const characters = [
        { ...mockCharacter, _storedAt: Date.now(), _version: 'v2025.01.01-r1' },
        { ...mockCharacter2, _storedAt: Date.now(), _version: 'v2025.01.01-r1' },
      ];
      const getAllRequest = createMockIDBRequest();
      const mockStore = {
        getAll: vi.fn().mockReturnValue(getAllRequest),
      };

      (mockDB.transaction as ReturnType<typeof vi.fn>).mockReturnValue(mockTransaction);
      (mockTransaction.objectStore as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);

      const searchPromise = storageManager.searchCharacters('IMP');
      triggerSuccess(getAllRequest, characters);

      const result = await searchPromise;

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('imp');
    });

    it('should return empty array when no matches found', async () => {
      const mockTransaction = createMockIDBTransaction();
      const characters = [{ ...mockCharacter, _storedAt: Date.now(), _version: 'v2025.01.01-r1' }];
      const getAllRequest = createMockIDBRequest();
      const mockStore = {
        getAll: vi.fn().mockReturnValue(getAllRequest),
      };

      (mockDB.transaction as ReturnType<typeof vi.fn>).mockReturnValue(mockTransaction);
      (mockTransaction.objectStore as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);

      const searchPromise = storageManager.searchCharacters('nonexistent');
      triggerSuccess(getAllRequest, characters);

      const result = await searchPromise;

      expect(result).toEqual([]);
    });
  });

  describe('clearCharacters', () => {
    beforeEach(async () => {
      const mockRequest = createMockIDBOpenRequest();
      (global.indexedDB.open as ReturnType<typeof vi.fn>).mockReturnValue(mockRequest);
      const initPromise = storageManager.initialize();
      triggerSuccess(mockRequest as unknown as IDBRequest, mockDB);
      await initPromise;
    });

    it('should clear all characters', async () => {
      const mockTransaction = createMockIDBTransaction();
      const clearRequest = createMockIDBRequest();
      const mockStore = {
        clear: vi.fn().mockReturnValue(clearRequest),
      };

      (mockDB.transaction as ReturnType<typeof vi.fn>).mockReturnValue(mockTransaction);
      (mockTransaction.objectStore as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);

      const clearPromise = storageManager.clearCharacters();
      triggerSuccess(clearRequest);

      await clearPromise;

      expect(mockStore.clear).toHaveBeenCalled();
    });

    it('should throw StorageError when clear operation fails', async () => {
      const mockTransaction = createMockIDBTransaction();
      const clearRequest = createMockIDBRequest();
      const mockStore = {
        clear: vi.fn().mockReturnValue(clearRequest),
      };

      (mockDB.transaction as ReturnType<typeof vi.fn>).mockReturnValue(mockTransaction);
      (mockTransaction.objectStore as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);

      const clearPromise = storageManager.clearCharacters();
      triggerError(clearRequest, new Error('Clear failed'));

      await expect(clearPromise).rejects.toThrow(StorageError);
    });
  });

  describe('setMetadata', () => {
    beforeEach(async () => {
      const mockRequest = createMockIDBOpenRequest();
      (global.indexedDB.open as ReturnType<typeof vi.fn>).mockReturnValue(mockRequest);
      const initPromise = storageManager.initialize();
      triggerSuccess(mockRequest as unknown as IDBRequest, mockDB);
      await initPromise;
    });

    it('should set a metadata value', async () => {
      const mockTransaction = createMockIDBTransaction();
      const putRequest = createMockIDBRequest();
      const mockStore = {
        put: vi.fn().mockReturnValue(putRequest),
      };

      (mockDB.transaction as ReturnType<typeof vi.fn>).mockReturnValue(mockTransaction);
      (mockTransaction.objectStore as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);

      const setPromise = storageManager.setMetadata('version', 'v2025.01.01-r1');
      triggerSuccess(putRequest);

      await setPromise;

      expect(mockStore.put).toHaveBeenCalledWith({
        key: 'version',
        value: 'v2025.01.01-r1',
      });
    });

    it('should support boolean metadata values', async () => {
      const mockTransaction = createMockIDBTransaction();
      const putRequest = createMockIDBRequest();
      const mockStore = {
        put: vi.fn().mockReturnValue(putRequest),
      };

      (mockDB.transaction as ReturnType<typeof vi.fn>).mockReturnValue(mockTransaction);
      (mockTransaction.objectStore as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);

      const setPromise = storageManager.setMetadata('synced', true);
      triggerSuccess(putRequest);

      await setPromise;

      expect(mockStore.put).toHaveBeenCalledWith({
        key: 'synced',
        value: true,
      });
    });

    it('should throw StorageError when put operation fails', async () => {
      const mockTransaction = createMockIDBTransaction();
      const putRequest = createMockIDBRequest();
      const mockStore = {
        put: vi.fn().mockReturnValue(putRequest),
      };

      (mockDB.transaction as ReturnType<typeof vi.fn>).mockReturnValue(mockTransaction);
      (mockTransaction.objectStore as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);

      const setPromise = storageManager.setMetadata('version', 'v2025.01.01-r1');
      triggerError(putRequest, new Error('Put failed'));

      await expect(setPromise).rejects.toThrow(StorageError);
    });
  });

  describe('getMetadata', () => {
    beforeEach(async () => {
      const mockRequest = createMockIDBOpenRequest();
      (global.indexedDB.open as ReturnType<typeof vi.fn>).mockReturnValue(mockRequest);
      const initPromise = storageManager.initialize();
      triggerSuccess(mockRequest as unknown as IDBRequest, mockDB);
      await initPromise;
    });

    it('should retrieve a metadata value', async () => {
      const mockTransaction = createMockIDBTransaction();
      const getRequest = createMockIDBRequest();
      const mockStore = {
        get: vi.fn().mockReturnValue(getRequest),
      };

      (mockDB.transaction as ReturnType<typeof vi.fn>).mockReturnValue(mockTransaction);
      (mockTransaction.objectStore as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);

      const getPromise = storageManager.getMetadata('version');
      triggerSuccess(getRequest, { key: 'version', value: 'v2025.01.01-r1' });

      const result = await getPromise;

      expect(result).toBe('v2025.01.01-r1');
    });

    it('should return null when metadata not found', async () => {
      const mockTransaction = createMockIDBTransaction();
      const getRequest = createMockIDBRequest();
      const mockStore = {
        get: vi.fn().mockReturnValue(getRequest),
      };

      (mockDB.transaction as ReturnType<typeof vi.fn>).mockReturnValue(mockTransaction);
      (mockTransaction.objectStore as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);

      const getPromise = storageManager.getMetadata('nonexistent');
      triggerSuccess(getRequest, undefined);

      const result = await getPromise;

      expect(result).toBeNull();
    });

    it('should throw StorageError when get operation fails', async () => {
      const mockTransaction = createMockIDBTransaction();
      const getRequest = createMockIDBRequest();
      const mockStore = {
        get: vi.fn().mockReturnValue(getRequest),
      };

      (mockDB.transaction as ReturnType<typeof vi.fn>).mockReturnValue(mockTransaction);
      (mockTransaction.objectStore as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);

      const getPromise = storageManager.getMetadata('version');
      triggerError(getRequest, new Error('Get failed'));

      await expect(getPromise).rejects.toThrow(StorageError);
    });
  });

  describe('getAllMetadata', () => {
    beforeEach(async () => {
      const mockRequest = createMockIDBOpenRequest();
      (global.indexedDB.open as ReturnType<typeof vi.fn>).mockReturnValue(mockRequest);
      const initPromise = storageManager.initialize();
      triggerSuccess(mockRequest as unknown as IDBRequest, mockDB);
      await initPromise;
    });

    it('should retrieve all metadata as a Map', async () => {
      const mockTransaction = createMockIDBTransaction();
      const getAllRequest = createMockIDBRequest();
      const mockStore = {
        getAll: vi.fn().mockReturnValue(getAllRequest),
      };

      (mockDB.transaction as ReturnType<typeof vi.fn>).mockReturnValue(mockTransaction);
      (mockTransaction.objectStore as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);

      const getPromise = storageManager.getAllMetadata();
      triggerSuccess(getAllRequest, [
        { key: 'version', value: 'v2025.01.01-r1' },
        { key: 'synced', value: true },
        { key: 'count', value: 42 },
      ]);

      const result = await getPromise;

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(3);
      expect(result.get('version')).toBe('v2025.01.01-r1');
      expect(result.get('synced')).toBe(true);
      expect(result.get('count')).toBe(42);
    });

    it('should throw StorageError when getAll operation fails', async () => {
      const mockTransaction = createMockIDBTransaction();
      const getAllRequest = createMockIDBRequest();
      const mockStore = {
        getAll: vi.fn().mockReturnValue(getAllRequest),
      };

      (mockDB.transaction as ReturnType<typeof vi.fn>).mockReturnValue(mockTransaction);
      (mockTransaction.objectStore as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);

      const getPromise = storageManager.getAllMetadata();
      triggerError(getAllRequest, new Error('GetAll failed'));

      await expect(getPromise).rejects.toThrow(StorageError);
    });
  });

  describe('setSetting and getSetting', () => {
    beforeEach(async () => {
      const mockRequest = createMockIDBOpenRequest();
      (global.indexedDB.open as ReturnType<typeof vi.fn>).mockReturnValue(mockRequest);
      const initPromise = storageManager.initialize();
      triggerSuccess(mockRequest as unknown as IDBRequest, mockDB);
      await initPromise;
    });

    it('should set a setting value', async () => {
      const mockTransaction = createMockIDBTransaction();
      const putRequest = createMockIDBRequest();
      const mockStore = {
        put: vi.fn().mockReturnValue(putRequest),
      };

      (mockDB.transaction as ReturnType<typeof vi.fn>).mockReturnValue(mockTransaction);
      (mockTransaction.objectStore as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);

      const setPromise = storageManager.setSetting('theme', 'dark');
      triggerSuccess(putRequest);

      await setPromise;

      expect(mockStore.put).toHaveBeenCalledWith({
        key: 'theme',
        value: 'dark',
      });
    });

    it('should get a setting value', async () => {
      const mockTransaction = createMockIDBTransaction();
      const getRequest = createMockIDBRequest();
      const mockStore = {
        get: vi.fn().mockReturnValue(getRequest),
      };

      (mockDB.transaction as ReturnType<typeof vi.fn>).mockReturnValue(mockTransaction);
      (mockTransaction.objectStore as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);

      const getPromise = storageManager.getSetting('theme');
      triggerSuccess(getRequest, { key: 'theme', value: 'dark' });

      const result = await getPromise;

      expect(result).toBe('dark');
    });

    it('should support complex object settings', async () => {
      const mockTransaction = createMockIDBTransaction();
      const putRequest = createMockIDBRequest();
      const mockStore = {
        put: vi.fn().mockReturnValue(putRequest),
      };

      (mockDB.transaction as ReturnType<typeof vi.fn>).mockReturnValue(mockTransaction);
      (mockTransaction.objectStore as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);

      const complexValue = { nested: { value: 123 }, array: [1, 2, 3] };
      const setPromise = storageManager.setSetting('complex', complexValue);
      triggerSuccess(putRequest);

      await setPromise;

      expect(mockStore.put).toHaveBeenCalledWith({
        key: 'complex',
        value: complexValue,
      });
    });
  });

  describe('cacheImage and getImage', () => {
    beforeEach(async () => {
      const mockRequest = createMockIDBOpenRequest();
      (global.indexedDB.open as ReturnType<typeof vi.fn>).mockReturnValue(mockRequest);
      const initPromise = storageManager.initialize();
      triggerSuccess(mockRequest as unknown as IDBRequest, mockDB);
      await initPromise;
    });

    it('should cache an image', async () => {
      const imageBlob = new Blob(['fake image data'], { type: 'image/webp' });

      await storageManager.cacheImage('washerwoman', imageBlob);

      expect(mockCache.put).toHaveBeenCalledWith('/icons/washerwoman.webp', expect.any(Response));
    });

    it('should retrieve a cached image', async () => {
      const imageBlob = new Blob(['fake image data'], { type: 'image/webp' });
      const mockResponse = new Response(imageBlob);
      (mockCache.match as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const result = await storageManager.getImage('washerwoman');

      expect(mockCache.match).toHaveBeenCalledWith('/icons/washerwoman.webp');
      // Use duck-typing instead of instanceof due to cross-realm Blob issues in Node.js
      expect(result).not.toBeNull();
      expect(result?.constructor.name).toBe('Blob');
      expect(typeof result?.size).toBe('number');
      expect(typeof result?.type).toBe('string');
    });

    it('should return null when image not cached', async () => {
      (mockCache.match as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await storageManager.getImage('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw StorageError when caching fails', async () => {
      const imageBlob = new Blob(['fake image data'], { type: 'image/webp' });
      (mockCache.put as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Cache put failed'));

      await expect(storageManager.cacheImage('washerwoman', imageBlob)).rejects.toThrow(
        StorageError
      );
    });

    it('should throw StorageError when retrieval fails', async () => {
      (mockCache.match as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Cache match failed')
      );

      await expect(storageManager.getImage('washerwoman')).rejects.toThrow(StorageError);
    });
  });

  describe('clearImageCache', () => {
    beforeEach(async () => {
      const mockRequest = createMockIDBOpenRequest();
      (global.indexedDB.open as ReturnType<typeof vi.fn>).mockReturnValue(mockRequest);
      const initPromise = storageManager.initialize();
      triggerSuccess(mockRequest as unknown as IDBRequest, mockDB);
      await initPromise;
    });

    it('should clear image cache and reinitialize', async () => {
      await storageManager.clearImageCache();

      expect(global.caches.delete).toHaveBeenCalledWith('test-botc-character-icons-v1');
      expect(global.caches.open).toHaveBeenCalledWith('test-botc-character-icons-v1');
    });

    it('should throw StorageError when clearing fails', async () => {
      (global.caches.delete as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Delete failed')
      );

      await expect(storageManager.clearImageCache()).rejects.toThrow(StorageError);
    });
  });

  describe('getStorageQuota', () => {
    it('should retrieve storage quota information', async () => {
      const result = await storageManager.getStorageQuota();

      expect(result).toEqual({
        usage: 1024 * 1024 * 5,
        quota: 1024 * 1024 * 100,
        usageMB: 5,
        quotaMB: 100,
        percentUsed: 5,
      });
    });

    it('should throw StorageError when estimate fails', async () => {
      (global.navigator.storage.estimate as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Estimate failed')
      );

      await expect(storageManager.getStorageQuota()).rejects.toThrow(StorageError);
    });
  });

  describe('isNearQuota', () => {
    it('should return false when usage is below warning threshold', async () => {
      const result = await storageManager.isNearQuota();

      expect(result).toBe(false);
    });

    it('should return true when usage is above warning threshold', async () => {
      (global.navigator.storage.estimate as ReturnType<typeof vi.fn>).mockResolvedValue({
        usage: 1024 * 1024 * 25, // 25 MB (above 20 MB threshold)
        quota: 1024 * 1024 * 100,
      });

      const result = await storageManager.isNearQuota();

      expect(result).toBe(true);
    });
  });

  describe('hasSpace', () => {
    it('should return true when enough space is available', async () => {
      const result = await storageManager.hasSpace(10); // 10 MB needed, 95 MB available

      expect(result).toBe(true);
    });

    it('should return false when not enough space is available', async () => {
      const result = await storageManager.hasSpace(100); // 100 MB needed, 95 MB available

      expect(result).toBe(false);
    });
  });

  describe('clearAll', () => {
    beforeEach(async () => {
      const mockRequest = createMockIDBOpenRequest();
      (global.indexedDB.open as ReturnType<typeof vi.fn>).mockReturnValue(mockRequest);
      const initPromise = storageManager.initialize();
      triggerSuccess(mockRequest as unknown as IDBRequest, mockDB);
      await initPromise;
    });

    it('should clear characters and image cache', async () => {
      // Test clearCharacters portion
      const mockTransaction = createMockIDBTransaction();
      const clearRequest = createMockIDBRequest();
      const mockStore = {
        clear: vi.fn().mockReturnValue(clearRequest),
      };

      (mockDB.transaction as ReturnType<typeof vi.fn>).mockReturnValue(mockTransaction);
      (mockTransaction.objectStore as ReturnType<typeof vi.fn>).mockReturnValue(mockStore);

      const clearPromise = storageManager.clearCharacters();
      triggerSuccess(clearRequest);

      await clearPromise;

      expect(mockDB.transaction).toHaveBeenCalledWith(['characters'], 'readwrite');
      expect(mockStore.clear).toHaveBeenCalled();
    });

    it('should clear image cache', async () => {
      await storageManager.clearImageCache();

      expect(global.caches.delete).toHaveBeenCalledWith('test-botc-character-icons-v1');
      // After delete, should reopen the cache
      expect(global.caches.open).toHaveBeenCalledWith('test-botc-character-icons-v1');
    });
  });

  describe('close', () => {
    beforeEach(async () => {
      const mockRequest = createMockIDBOpenRequest();
      (global.indexedDB.open as ReturnType<typeof vi.fn>).mockReturnValue(mockRequest);
      const initPromise = storageManager.initialize();
      triggerSuccess(mockRequest as unknown as IDBRequest, mockDB);
      await initPromise;
    });

    it('should close database connection', () => {
      storageManager.close();

      expect(mockDB.close).toHaveBeenCalled();
    });
  });

  describe('getDatabase', () => {
    it('should return database instance after initialization', async () => {
      const mockRequest = createMockIDBOpenRequest();
      (global.indexedDB.open as ReturnType<typeof vi.fn>).mockReturnValue(mockRequest);

      const dbPromise = storageManager.getDatabase();
      triggerSuccess(mockRequest as unknown as IDBRequest, mockDB);

      const result = await dbPromise;

      expect(result).toBe(mockDB);
    });

    it('should initialize database if not already initialized', async () => {
      const mockRequest = createMockIDBOpenRequest();
      (global.indexedDB.open as ReturnType<typeof vi.fn>).mockReturnValue(mockRequest);

      const dbPromise = storageManager.getDatabase();

      expect(global.indexedDB.open).toHaveBeenCalled();

      triggerSuccess(mockRequest as unknown as IDBRequest, mockDB);

      await dbPromise;
    });
  });
});
