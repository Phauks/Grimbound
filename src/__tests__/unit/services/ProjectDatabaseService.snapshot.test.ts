/**
 * Unit tests for ProjectDatabaseService snapshot operations
 *
 * Tests auto-save snapshot persistence:
 * - Saving snapshots to IndexedDB
 * - Loading snapshots for a project
 * - Deleting old snapshots (retention policy)
 * - Snapshot state serialization/deserialization
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createDefaultProjectState,
  resetProjectFactory,
} from '@/__tests__/factories/projectFactory';
import type { AutoSaveSnapshot, ProjectState } from '@/ts/types/project';

/**
 * Mock logger to avoid console output during tests
 */
vi.mock('@/ts/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

/**
 * Mock the projectDb module using vi.hoisted() to ensure it's available during mock hoisting
 */
const mockProjectDb = vi.hoisted(() => ({
  projects: {
    put: vi.fn().mockResolvedValue(undefined),
    get: vi.fn(),
    toArray: vi.fn().mockResolvedValue([]),
  },
  customIcons: {
    put: vi.fn().mockResolvedValue(undefined),
    where: vi.fn().mockReturnValue({
      equals: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(null),
        delete: vi.fn().mockResolvedValue(undefined),
        toArray: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
  autoSaveSnapshots: {
    put: vi.fn().mockResolvedValue(undefined),
    where: vi.fn().mockReturnValue({
      equals: vi.fn().mockReturnValue({
        reverse: vi.fn().mockReturnValue({
          sortBy: vi.fn().mockResolvedValue([]),
        }),
        count: vi.fn().mockResolvedValue(0),
        toArray: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
  deleteProjectData: vi.fn().mockResolvedValue(undefined),
  cleanupOldSnapshots: vi.fn().mockResolvedValue(undefined),
  getStorageQuota: vi.fn().mockResolvedValue({
    usage: 0,
    quota: 100_000_000,
    usageMB: 0,
    quotaMB: 100,
    percentUsed: 0,
  }),
  clearAll: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/ts/db/projectDb.js', () => ({
  projectDb: mockProjectDb,
}));

vi.mock('@/ts/utils/nameGenerator.js', () => ({
  generateUuid: vi.fn(() => `mock-uuid-${Date.now()}`),
}));

// Import after mocking
import { ProjectDatabaseService } from '@/ts/services/project/ProjectDatabaseService';

describe('ProjectDatabaseService - Snapshot Operations', () => {
  let service: ProjectDatabaseService;

  beforeEach(() => {
    resetProjectFactory();
    vi.clearAllMocks();
    service = new ProjectDatabaseService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('saveSnapshot', () => {
    it('should save a snapshot to the database', async () => {
      const snapshot: AutoSaveSnapshot = {
        id: 'snapshot-1',
        projectId: 'project-1',
        timestamp: Date.now(),
        stateSnapshot: createDefaultProjectState(),
      };

      await service.saveSnapshot(snapshot);

      expect(mockProjectDb.autoSaveSnapshots.put).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'snapshot-1',
          projectId: 'project-1',
        })
      );
    });

    it('should serialize state to JSON', async () => {
      const state = createDefaultProjectState({
        jsonInput: '[{"id": "test"}]',
        characters: [],
      });

      const snapshot: AutoSaveSnapshot = {
        id: 'snapshot-1',
        projectId: 'project-1',
        timestamp: Date.now(),
        stateSnapshot: state,
      };

      await service.saveSnapshot(snapshot);

      const savedSnapshot = mockProjectDb.autoSaveSnapshots.put.mock.calls[0][0];
      expect(savedSnapshot.stateJson).toBeDefined();
      expect(typeof savedSnapshot.stateJson).toBe('string');

      // Parse and verify
      const parsed = JSON.parse(savedSnapshot.stateJson);
      expect(parsed.jsonInput).toBe('[{"id": "test"}]');
    });

    it('should trigger cleanup of old snapshots', async () => {
      const snapshot: AutoSaveSnapshot = {
        id: 'snapshot-1',
        projectId: 'project-1',
        timestamp: Date.now(),
        stateSnapshot: createDefaultProjectState(),
      };

      await service.saveSnapshot(snapshot);

      expect(mockProjectDb.cleanupOldSnapshots).toHaveBeenCalledWith('project-1', 10);
    });

    it('should preserve snapshot timestamp', async () => {
      const timestamp = 1704067200000; // Jan 1, 2024

      const snapshot: AutoSaveSnapshot = {
        id: 'snapshot-1',
        projectId: 'project-1',
        timestamp,
        stateSnapshot: createDefaultProjectState(),
      };

      await service.saveSnapshot(snapshot);

      const savedSnapshot = mockProjectDb.autoSaveSnapshots.put.mock.calls[0][0];
      expect(savedSnapshot.timestamp).toBe(timestamp);
    });

    it('should handle complex state with nested objects', async () => {
      const state = createDefaultProjectState({
        jsonInput: '[{"id": "washerwoman", "reminders": ["Townsfolk", "Minion"]}]',
        scriptMeta: { name: 'Test Script', author: 'Test Author' },
        generationOptions: {
          borderWidth: 5,
          borderColor: '#ffffff',
          nested: { value: true },
        },
      });

      const snapshot: AutoSaveSnapshot = {
        id: 'snapshot-1',
        projectId: 'project-1',
        timestamp: Date.now(),
        stateSnapshot: state,
      };

      await service.saveSnapshot(snapshot);

      const savedSnapshot = mockProjectDb.autoSaveSnapshots.put.mock.calls[0][0];
      const parsed = JSON.parse(savedSnapshot.stateJson);

      expect(parsed.scriptMeta.name).toBe('Test Script');
      expect(parsed.generationOptions.borderWidth).toBe(5);
    });
  });

  describe('loadSnapshots', () => {
    it('should load snapshots for a project', async () => {
      const mockDbSnapshots = [
        {
          id: 'snapshot-1',
          projectId: 'project-1',
          timestamp: Date.now(),
          stateJson: JSON.stringify(createDefaultProjectState()),
        },
        {
          id: 'snapshot-2',
          projectId: 'project-1',
          timestamp: Date.now() - 1000,
          stateJson: JSON.stringify(createDefaultProjectState()),
        },
      ];

      mockProjectDb.autoSaveSnapshots.where.mockReturnValue({
        equals: vi.fn().mockReturnValue({
          reverse: vi.fn().mockReturnValue({
            sortBy: vi.fn().mockResolvedValue(mockDbSnapshots),
          }),
        }),
      });

      const snapshots = await service.loadSnapshots('project-1');

      expect(snapshots).toHaveLength(2);
      expect(snapshots[0].id).toBe('snapshot-1');
      expect(snapshots[1].id).toBe('snapshot-2');
    });

    it('should deserialize state from JSON', async () => {
      const state = createDefaultProjectState({
        jsonInput: '[{"id": "test"}]',
      });

      const mockDbSnapshots = [
        {
          id: 'snapshot-1',
          projectId: 'project-1',
          timestamp: Date.now(),
          stateJson: JSON.stringify(state),
        },
      ];

      mockProjectDb.autoSaveSnapshots.where.mockReturnValue({
        equals: vi.fn().mockReturnValue({
          reverse: vi.fn().mockReturnValue({
            sortBy: vi.fn().mockResolvedValue(mockDbSnapshots),
          }),
        }),
      });

      const snapshots = await service.loadSnapshots('project-1');

      expect(snapshots[0].stateSnapshot).toBeDefined();
      expect(snapshots[0].stateSnapshot.jsonInput).toBe('[{"id": "test"}]');
    });

    it('should respect limit parameter', async () => {
      const mockDbSnapshots = Array.from({ length: 20 }, (_, i) => ({
        id: `snapshot-${i}`,
        projectId: 'project-1',
        timestamp: Date.now() - i * 1000,
        stateJson: JSON.stringify(createDefaultProjectState()),
      }));

      mockProjectDb.autoSaveSnapshots.where.mockReturnValue({
        equals: vi.fn().mockReturnValue({
          reverse: vi.fn().mockReturnValue({
            sortBy: vi.fn().mockResolvedValue(mockDbSnapshots),
          }),
        }),
      });

      const snapshots = await service.loadSnapshots('project-1', 5);

      expect(snapshots).toHaveLength(5);
    });

    it('should default to 10 snapshots', async () => {
      const mockDbSnapshots = Array.from({ length: 20 }, (_, i) => ({
        id: `snapshot-${i}`,
        projectId: 'project-1',
        timestamp: Date.now() - i * 1000,
        stateJson: JSON.stringify(createDefaultProjectState()),
      }));

      mockProjectDb.autoSaveSnapshots.where.mockReturnValue({
        equals: vi.fn().mockReturnValue({
          reverse: vi.fn().mockReturnValue({
            sortBy: vi.fn().mockResolvedValue(mockDbSnapshots),
          }),
        }),
      });

      const snapshots = await service.loadSnapshots('project-1');

      expect(snapshots).toHaveLength(10);
    });

    it('should return empty array when no snapshots exist', async () => {
      mockProjectDb.autoSaveSnapshots.where.mockReturnValue({
        equals: vi.fn().mockReturnValue({
          reverse: vi.fn().mockReturnValue({
            sortBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const snapshots = await service.loadSnapshots('project-1');

      expect(snapshots).toEqual([]);
    });

    it('should query by project ID', async () => {
      const mockEquals = vi.fn().mockReturnValue({
        reverse: vi.fn().mockReturnValue({
          sortBy: vi.fn().mockResolvedValue([]),
        }),
      });

      mockProjectDb.autoSaveSnapshots.where.mockReturnValue({
        equals: mockEquals,
      });

      await service.loadSnapshots('my-project-id');

      expect(mockProjectDb.autoSaveSnapshots.where).toHaveBeenCalledWith('projectId');
      expect(mockEquals).toHaveBeenCalledWith('my-project-id');
    });
  });

  describe('deleteOldSnapshots', () => {
    it('should delegate to projectDb cleanup', async () => {
      await service.deleteOldSnapshots('project-1', 5);

      expect(mockProjectDb.cleanupOldSnapshots).toHaveBeenCalledWith('project-1', 5);
    });

    it('should pass correct keep count', async () => {
      await service.deleteOldSnapshots('project-1', 15);

      expect(mockProjectDb.cleanupOldSnapshots).toHaveBeenCalledWith('project-1', 15);
    });
  });

  describe('Snapshot state integrity', () => {
    it('should preserve all state fields through save/load cycle', async () => {
      const originalState: ProjectState = {
        jsonInput: '[{"id": "washerwoman"}]',
        characters: [
          {
            uuid: 'char-1',
            id: 'washerwoman',
            name: 'Washerwoman',
            team: 'townsfolk',
            ability: 'Test ability',
            reminders: ['Townsfolk', 'Minion'],
          },
        ],
        scriptMeta: {
          name: 'Test Script',
          author: 'Test Author',
        },
        generationOptions: {
          borderWidth: 5,
          borderColor: '#ffffff',
        },
        filters: {
          teams: ['townsfolk', 'outsider'],
          tokenTypes: ['character', 'reminder'],
        },
        characterMetadata: {
          'char-1': { idLinkedToName: true },
        },
        customIcons: [],
        schemaVersion: 1,
      };

      // Simulate save
      const snapshot: AutoSaveSnapshot = {
        id: 'snapshot-1',
        projectId: 'project-1',
        timestamp: Date.now(),
        stateSnapshot: originalState,
      };

      await service.saveSnapshot(snapshot);

      // Get what was saved
      const savedDbSnapshot = mockProjectDb.autoSaveSnapshots.put.mock.calls[0][0];

      // Simulate load by setting up mock to return saved data
      mockProjectDb.autoSaveSnapshots.where.mockReturnValue({
        equals: vi.fn().mockReturnValue({
          reverse: vi.fn().mockReturnValue({
            sortBy: vi.fn().mockResolvedValue([savedDbSnapshot]),
          }),
        }),
      });

      const loadedSnapshots = await service.loadSnapshots('project-1', 1);
      const loadedState = loadedSnapshots[0].stateSnapshot;

      // Verify all fields preserved
      expect(loadedState.jsonInput).toBe(originalState.jsonInput);
      expect(loadedState.characters).toEqual(originalState.characters);
      expect(loadedState.scriptMeta).toEqual(originalState.scriptMeta);
      expect(loadedState.generationOptions).toEqual(originalState.generationOptions);
      expect(loadedState.filters).toEqual(originalState.filters);
      expect(loadedState.characterMetadata).toEqual(originalState.characterMetadata);
      expect(loadedState.schemaVersion).toBe(originalState.schemaVersion);
    });

    it('should handle empty state fields', async () => {
      const emptyState: ProjectState = {
        jsonInput: '',
        characters: [],
        scriptMeta: null,
        generationOptions: {},
        filters: { teams: [], tokenTypes: [] },
        characterMetadata: {},
        customIcons: [],
        schemaVersion: 1,
      };

      const snapshot: AutoSaveSnapshot = {
        id: 'snapshot-1',
        projectId: 'project-1',
        timestamp: Date.now(),
        stateSnapshot: emptyState,
      };

      await service.saveSnapshot(snapshot);

      const savedDbSnapshot = mockProjectDb.autoSaveSnapshots.put.mock.calls[0][0];
      const parsed = JSON.parse(savedDbSnapshot.stateJson);

      expect(parsed.jsonInput).toBe('');
      expect(parsed.characters).toEqual([]);
      expect(parsed.scriptMeta).toBeNull();
    });

    it('should handle special characters in JSON input', async () => {
      const stateWithSpecialChars: ProjectState = {
        jsonInput: '{"text": "Hello \\"World\\" with \\n newlines"}',
        characters: [],
        scriptMeta: null,
        generationOptions: {},
        filters: { teams: [], tokenTypes: [] },
        characterMetadata: {},
        customIcons: [],
        schemaVersion: 1,
      };

      const snapshot: AutoSaveSnapshot = {
        id: 'snapshot-1',
        projectId: 'project-1',
        timestamp: Date.now(),
        stateSnapshot: stateWithSpecialChars,
      };

      await service.saveSnapshot(snapshot);

      const savedDbSnapshot = mockProjectDb.autoSaveSnapshots.put.mock.calls[0][0];

      // Set up mock for load
      mockProjectDb.autoSaveSnapshots.where.mockReturnValue({
        equals: vi.fn().mockReturnValue({
          reverse: vi.fn().mockReturnValue({
            sortBy: vi.fn().mockResolvedValue([savedDbSnapshot]),
          }),
        }),
      });

      const loadedSnapshots = await service.loadSnapshots('project-1', 1);
      expect(loadedSnapshots[0].stateSnapshot.jsonInput).toBe(stateWithSpecialChars.jsonInput);
    });
  });

  describe('Error handling', () => {
    it('should propagate save errors', async () => {
      mockProjectDb.autoSaveSnapshots.put.mockRejectedValueOnce(new Error('Database error'));

      const snapshot: AutoSaveSnapshot = {
        id: 'snapshot-1',
        projectId: 'project-1',
        timestamp: Date.now(),
        stateSnapshot: createDefaultProjectState(),
      };

      await expect(service.saveSnapshot(snapshot)).rejects.toThrow('Database error');
    });

    it('should propagate load errors', async () => {
      mockProjectDb.autoSaveSnapshots.where.mockReturnValue({
        equals: vi.fn().mockReturnValue({
          reverse: vi.fn().mockReturnValue({
            sortBy: vi.fn().mockRejectedValue(new Error('Query error')),
          }),
        }),
      });

      await expect(service.loadSnapshots('project-1')).rejects.toThrow('Query error');
    });

    it('should handle invalid JSON in stored snapshot', async () => {
      const invalidDbSnapshot = {
        id: 'snapshot-1',
        projectId: 'project-1',
        timestamp: Date.now(),
        stateJson: 'invalid-json{{{',
      };

      mockProjectDb.autoSaveSnapshots.where.mockReturnValue({
        equals: vi.fn().mockReturnValue({
          reverse: vi.fn().mockReturnValue({
            sortBy: vi.fn().mockResolvedValue([invalidDbSnapshot]),
          }),
        }),
      });

      // JSON.parse will throw
      await expect(service.loadSnapshots('project-1')).rejects.toThrow();
    });
  });
});
