import { createProject } from '@test/factories/projectFactory';
import { createMockProjectDatabase } from '@test/mocks/services/mockProjectService';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IProjectDatabase } from '@/ts/services/project/IProjectService';

describe('ProjectService Integration', () => {
  let mockDb: IProjectDatabase;

  beforeEach(() => {
    mockDb = createMockProjectDatabase();
    vi.clearAllMocks();
  });

  describe('Project CRUD Operations', () => {
    it('should save and retrieve a project', async () => {
      const project = createProject({ name: 'Test Project' });

      await mockDb.saveProject(project);
      expect(mockDb.saveProject).toHaveBeenCalledWith(project);

      const loaded = await mockDb.loadProject(project.id);
      expect(loaded).toEqual(project);
    });

    it('should return null for non-existent project', async () => {
      const loaded = await mockDb.loadProject('non-existent-id');
      expect(loaded).toBeNull();
    });

    it('should list all saved projects', async () => {
      const project1 = createProject({ name: 'Project 1' });
      const project2 = createProject({ name: 'Project 2' });

      await mockDb.saveProject(project1);
      await mockDb.saveProject(project2);

      const projects = await mockDb.listProjects();
      expect(projects).toHaveLength(2);
      expect(projects.map((p) => p.name)).toContain('Project 1');
      expect(projects.map((p) => p.name)).toContain('Project 2');
    });

    it('should delete a project', async () => {
      const project = createProject();

      await mockDb.saveProject(project);
      await mockDb.deleteProject(project.id);

      const loaded = await mockDb.loadProject(project.id);
      expect(loaded).toBeNull();
    });
  });

  describe('Storage Quota', () => {
    it('should return storage quota information', async () => {
      const quota = await mockDb.getStorageQuota();

      expect(quota).toHaveProperty('usage');
      expect(quota).toHaveProperty('quota');
      expect(quota).toHaveProperty('usageMB');
      expect(quota).toHaveProperty('quotaMB');
      expect(quota).toHaveProperty('percentUsed');
    });
  });

  describe('Clear All Data', () => {
    it('should clear all data', async () => {
      const project = createProject();
      await mockDb.saveProject(project);

      await mockDb.clearAll();

      const projects = await mockDb.listProjects();
      expect(projects).toHaveLength(0);
    });
  });
});
