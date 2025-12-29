import { createProject } from '@test/factories/projectFactory';
import { vi } from 'vitest';
import type { IProjectDatabase, IProjectService } from '@/ts/services/project/IProjectService';
import type {
  AutoSaveSnapshot,
  AutoSaveStatus,
  CustomIcon,
  Project,
  StorageQuota,
} from '@/ts/types/project';

/**
 * Create a mock ProjectService for testing.
 * All methods are vi.fn() mocks with sensible default implementations.
 */
export function createMockProjectService(
  overrides: Partial<IProjectService> = {}
): IProjectService {
  return {
    createProject: vi
      .fn()
      .mockImplementation(async (options) =>
        createProject({ name: options.name, description: options.description })
      ),
    getProject: vi.fn().mockResolvedValue(null),
    updateProject: vi
      .fn()
      .mockImplementation(async (id, updates) => createProject({ id, ...updates })),
    deleteProject: vi.fn().mockResolvedValue(undefined),
    listProjects: vi.fn().mockResolvedValue([]),
    switchToProject: vi.fn().mockResolvedValue(undefined),
    getCurrentProject: vi.fn().mockReturnValue(null),
    exportProject: vi.fn().mockResolvedValue(new Blob(['mock-zip'], { type: 'application/zip' })),
    importProject: vi.fn().mockImplementation(async () => createProject()),
    saveCurrentState: vi.fn().mockResolvedValue(undefined),
    getAutoSaveStatus: vi.fn().mockReturnValue({
      state: 'idle',
      isDirty: false,
    } as AutoSaveStatus),
    ...overrides,
  };
}

/**
 * Create a mock ProjectDatabase for testing.
 * Simulates an in-memory database.
 */
export function createMockProjectDatabase(
  overrides: Partial<IProjectDatabase> = {}
): IProjectDatabase {
  const projects = new Map<string, Project>();
  const icons = new Map<string, CustomIcon>();
  const snapshots = new Map<string, AutoSaveSnapshot[]>();

  return {
    // Projects
    saveProject: vi.fn().mockImplementation(async (project: Project) => {
      projects.set(project.id, project);
    }),
    loadProject: vi.fn().mockImplementation(async (id: string) => projects.get(id) ?? null),
    deleteProject: vi.fn().mockImplementation(async (id: string) => {
      projects.delete(id);
    }),
    listProjects: vi.fn().mockImplementation(async () => Array.from(projects.values())),

    // Custom Icons
    saveIcon: vi.fn().mockImplementation(async (icon: CustomIcon) => {
      icons.set(`${icon.projectId}:${icon.characterId}`, icon);
    }),
    loadIcon: vi
      .fn()
      .mockImplementation(
        async (characterId: string, projectId: string) =>
          icons.get(`${projectId}:${characterId}`) ?? null
      ),
    deleteIcon: vi.fn().mockImplementation(async (characterId: string, projectId: string) => {
      icons.delete(`${projectId}:${characterId}`);
    }),
    loadIconsForProject: vi
      .fn()
      .mockImplementation(async (projectId: string) =>
        Array.from(icons.values()).filter((i) => i.projectId === projectId)
      ),

    // Auto-Save Snapshots
    saveSnapshot: vi.fn().mockImplementation(async (snapshot: AutoSaveSnapshot) => {
      const existing = snapshots.get(snapshot.projectId) ?? [];
      existing.push(snapshot);
      snapshots.set(snapshot.projectId, existing);
    }),
    loadSnapshots: vi.fn().mockImplementation(async (projectId: string, limit?: number) => {
      const existing = snapshots.get(projectId) ?? [];
      return limit ? existing.slice(0, limit) : existing;
    }),
    deleteOldSnapshots: vi.fn().mockImplementation(async (projectId: string, keepCount: number) => {
      const existing = snapshots.get(projectId) ?? [];
      snapshots.set(projectId, existing.slice(0, keepCount));
    }),

    // Utilities
    getStorageQuota: vi.fn().mockResolvedValue({
      usage: 0,
      quota: 100_000_000,
      usageMB: 0,
      quotaMB: 100,
      percentUsed: 0,
    } as StorageQuota),
    clearAll: vi.fn().mockImplementation(async () => {
      projects.clear();
      icons.clear();
      snapshots.clear();
    }),
    ...overrides,
  };
}

/**
 * Helper to pre-populate mock database with projects.
 */
export function createMockProjectDatabaseWithData(initialProjects: Project[]): IProjectDatabase {
  const mock = createMockProjectDatabase();
  const projects = new Map<string, Project>();

  for (const project of initialProjects) {
    projects.set(project.id, project);
  }

  mock.loadProject = vi.fn().mockImplementation(async (id: string) => projects.get(id) ?? null);

  mock.listProjects = vi.fn().mockImplementation(async () => Array.from(projects.values()));

  return mock;
}
