/**
 * Unit tests for ProjectService
 *
 * Tests all public methods including CRUD operations, project switching,
 * import/export, and auto-save functionality.
 *
 * Uses dependency injection to mock database, exporter, and importer.
 */

import {
  createProject,
  createProjectOptions,
  resetProjectFactory,
} from '@test/factories/projectFactory';
import { createMockProjectDatabase } from '@test/mocks/services/mockProjectService';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  IProjectDatabase,
  IProjectExporter,
  IProjectImporter,
} from '@/ts/services/project/IProjectService';
import { ProjectService } from '@/ts/services/project/ProjectService';

// ============================================================================
// Test Setup
// ============================================================================

describe('ProjectService', () => {
  let service: ProjectService;
  let mockDb: IProjectDatabase;
  let mockExporter: IProjectExporter;
  let mockImporter: IProjectImporter;

  beforeEach(() => {
    resetProjectFactory();

    // Create mock dependencies
    mockDb = createMockProjectDatabase();

    mockExporter = {
      exportAsZip: vi.fn().mockResolvedValue(new Blob(['mock-zip'], { type: 'application/zip' })),
      generateFilename: vi.fn().mockReturnValue('test-project-2024-01-01.zip'),
    };

    mockImporter = {
      importFromZip: vi.fn().mockImplementation(async () => createProject()),
      validateZip: vi.fn().mockResolvedValue({ isValid: true, errors: [] }),
      previewZip: vi.fn().mockResolvedValue({ name: 'Test Project', fileCount: 5 }),
    };

    // Create service with injected dependencies
    service = new ProjectService({
      database: mockDb,
      exporter: mockExporter,
      importer: mockImporter,
    });
  });

  // ==========================================================================
  // CRUD Operations: Create
  // ==========================================================================

  describe('createProject', () => {
    it('should create a project with required fields', async () => {
      const options = createProjectOptions({ name: 'My Project', description: 'Test description' });

      const project = await service.createProject(options);

      expect(project).toBeDefined();
      expect(project.id).toBeDefined();
      expect(project.name).toBe('My Project');
      expect(project.description).toBe('Test description');
      expect(project.createdAt).toBeDefined();
      expect(project.lastModifiedAt).toBeDefined();
      expect(project.lastAccessedAt).toBeDefined();
    });

    it('should save project to database', async () => {
      const options = createProjectOptions({ name: 'Saved Project' });

      const project = await service.createProject(options);

      expect(mockDb.saveProject).toHaveBeenCalledWith(
        expect.objectContaining({ id: project.id, name: 'Saved Project' })
      );
    });

    it('should initialize default state', async () => {
      const options = createProjectOptions({ name: 'Test' });

      const project = await service.createProject(options);

      expect(project.state).toBeDefined();
      expect(project.state.jsonInput).toBe('');
      expect(project.state.characters).toEqual([]);
      expect(project.state.customIcons).toEqual([]);
      expect(project.state.scriptMeta).toBeNull();
      expect(project.state.schemaVersion).toBe(1);
    });

    it('should initialize default stats', async () => {
      const options = createProjectOptions({ name: 'Test' });

      const project = await service.createProject(options);

      expect(project.stats).toBeDefined();
      expect(project.stats.characterCount).toBe(0);
      expect(project.stats.tokenCount).toBe(0);
      expect(project.stats.reminderCount).toBe(0);
      expect(project.stats.customIconCount).toBe(0);
      expect(project.stats.presetCount).toBe(0);
    });

    it('should initialize default thumbnail', async () => {
      const options = createProjectOptions({ name: 'Test' });

      const project = await service.createProject(options);

      expect(project.thumbnail).toBeDefined();
      expect(project.thumbnail.type).toBe('auto');
    });

    it('should use custom thumbnail type if provided', async () => {
      const options = createProjectOptions({ name: 'Test', thumbnailType: 'none' });

      const project = await service.createProject(options);

      expect(project.thumbnail.type).toBe('none');
    });

    it('should initialize empty tags by default', async () => {
      const options = createProjectOptions({ name: 'Test' });

      const project = await service.createProject(options);

      expect(project.tags).toEqual([]);
    });

    it('should preserve custom tags if provided', async () => {
      const options = createProjectOptions({ name: 'Test', tags: ['tag1', 'tag2'] });

      const project = await service.createProject(options);

      expect(project.tags).toEqual(['tag1', 'tag2']);
    });

    it('should preserve custom state if provided', async () => {
      const customState = { jsonInput: '[{"id":"test"}]', characters: [] };
      const options = createProjectOptions({ name: 'Test', state: customState });

      const project = await service.createProject(options);

      expect(project.state.jsonInput).toBe('[{"id":"test"}]');
    });

    it('should set schema version to 1', async () => {
      const options = createProjectOptions({ name: 'Test' });

      const project = await service.createProject(options);

      expect(project.schemaVersion).toBe(1);
    });

    it('should generate unique IDs for multiple projects', async () => {
      const options1 = createProjectOptions({ name: 'Project 1' });
      const options2 = createProjectOptions({ name: 'Project 2' });

      const project1 = await service.createProject(options1);
      const project2 = await service.createProject(options2);

      expect(project1.id).not.toBe(project2.id);
    });
  });

  // ==========================================================================
  // CRUD Operations: Read
  // ==========================================================================

  describe('getProject', () => {
    it('should return project by ID', async () => {
      const project = createProject({ name: 'Test Project' });
      await mockDb.saveProject(project);

      const retrieved = await service.getProject(project.id);

      expect(retrieved).toEqual(project);
    });

    it('should return null for non-existent project', async () => {
      const retrieved = await service.getProject('non-existent-id');

      expect(retrieved).toBeNull();
    });

    it('should update lastAccessedAt timestamp', async () => {
      const project = createProject({ name: 'Test Project' });
      await mockDb.saveProject(project);

      const timeBefore = Date.now();
      const retrieved = await service.getProject(project.id);
      const timeAfter = Date.now();

      expect(retrieved?.lastAccessedAt).toBeGreaterThanOrEqual(timeBefore);
      expect(retrieved?.lastAccessedAt).toBeLessThanOrEqual(timeAfter);
    });

    it('should save updated project after accessing', async () => {
      const project = createProject({ name: 'Test Project' });
      await mockDb.saveProject(project);

      await service.getProject(project.id);

      expect(mockDb.saveProject).toHaveBeenCalledWith(expect.objectContaining({ id: project.id }));
    });

    it('should handle database errors gracefully', async () => {
      mockDb.loadProject = vi.fn().mockRejectedValueOnce(new Error('DB Error'));

      await expect(service.getProject('test-id')).rejects.toThrow('DB Error');
    });
  });

  // ==========================================================================
  // CRUD Operations: Update
  // ==========================================================================

  describe('updateProject', () => {
    it('should update project fields', async () => {
      const project = createProject({ name: 'Original Name' });
      await mockDb.saveProject(project);

      const updated = await service.updateProject(project.id, { name: 'Updated Name' });

      expect(updated.name).toBe('Updated Name');
    });

    it('should preserve ID during update', async () => {
      const project = createProject();
      await mockDb.saveProject(project);

      const updated = await service.updateProject(project.id, {
        name: 'New Name',
        // biome-ignore lint/suspicious/noExplicitAny: Testing that ID cannot be changed
        id: 'should-not-change' as any,
      });

      expect(updated.id).toBe(project.id);
    });

    it('should update lastModifiedAt timestamp', async () => {
      const project = createProject();
      const originalModifiedAt = project.lastModifiedAt;
      await mockDb.saveProject(project);

      // Delay to ensure timestamp difference (at least 2ms for reliable comparison)
      await new Promise((resolve) => setTimeout(resolve, 2));

      const updated = await service.updateProject(project.id, { name: 'New Name' });

      expect(updated.lastModifiedAt).toBeGreaterThanOrEqual(originalModifiedAt);
      expect(updated.lastModifiedAt).toBeGreaterThanOrEqual(Date.now() - 10);
    });

    it('should save to database', async () => {
      const project = createProject();
      await mockDb.saveProject(project);

      const _updated = await service.updateProject(project.id, { name: 'Updated Name' });

      expect(mockDb.saveProject).toHaveBeenCalledWith(
        expect.objectContaining({ id: project.id, name: 'Updated Name' })
      );
    });

    it('should update current project if it matches', async () => {
      const project = createProject({ name: 'Original' });
      await mockDb.saveProject(project);

      await service.switchToProject(project.id);
      await service.updateProject(project.id, { name: 'Updated' });

      const current = service.getCurrentProject();
      expect(current?.name).toBe('Updated');
    });

    it('should throw error for non-existent project', async () => {
      await expect(service.updateProject('non-existent-id', { name: 'New Name' })).rejects.toThrow(
        'Project not found'
      );
    });

    it('should handle partial updates', async () => {
      const project = createProject({ name: 'Original', description: 'Original Description' });
      await mockDb.saveProject(project);

      const updated = await service.updateProject(project.id, { name: 'Updated' });

      expect(updated.name).toBe('Updated');
      expect(updated.description).toBe('Original Description');
    });

    it('should handle database errors', async () => {
      const project = createProject();
      mockDb.loadProject = vi.fn().mockRejectedValueOnce(new Error('DB Error'));

      await expect(service.updateProject(project.id, { name: 'New Name' })).rejects.toThrow(
        'DB Error'
      );
    });
  });

  // ==========================================================================
  // CRUD Operations: Delete
  // ==========================================================================

  describe('deleteProject', () => {
    it('should delete project from database', async () => {
      const project = createProject();
      await mockDb.saveProject(project);

      await service.deleteProject(project.id);

      expect(mockDb.deleteProject).toHaveBeenCalledWith(project.id);
    });

    it('should clear current project if deleted', async () => {
      const project = createProject();
      await mockDb.saveProject(project);
      await service.switchToProject(project.id);

      await service.deleteProject(project.id);

      expect(service.getCurrentProject()).toBeNull();
    });

    it('should not affect current project if different project deleted', async () => {
      const project1 = createProject({ name: 'Project 1' });
      const project2 = createProject({ name: 'Project 2' });
      await mockDb.saveProject(project1);
      await mockDb.saveProject(project2);
      await service.switchToProject(project1.id);

      await service.deleteProject(project2.id);

      expect(service.getCurrentProject()?.id).toBe(project1.id);
    });

    it('should handle database errors', async () => {
      mockDb.deleteProject = vi.fn().mockRejectedValueOnce(new Error('DB Error'));

      await expect(service.deleteProject('test-id')).rejects.toThrow('DB Error');
    });
  });

  // ==========================================================================
  // List Projects
  // ==========================================================================

  describe('listProjects', () => {
    it('should return empty list when no projects exist', async () => {
      const projects = await service.listProjects();

      expect(projects).toEqual([]);
    });

    it('should return all projects', async () => {
      const project1 = createProject({ name: 'Project 1' });
      const project2 = createProject({ name: 'Project 2' });
      await mockDb.saveProject(project1);
      await mockDb.saveProject(project2);

      const projects = await service.listProjects();

      expect(projects).toHaveLength(2);
      expect(projects.map((p) => p.name)).toContain('Project 1');
      expect(projects.map((p) => p.name)).toContain('Project 2');
    });

    it('should filter by tags', async () => {
      const project1 = createProject({ name: 'Project 1', tags: ['favorites'] });
      const project2 = createProject({ name: 'Project 2', tags: ['archived'] });
      await mockDb.saveProject(project1);
      await mockDb.saveProject(project2);

      const projects = await service.listProjects({ filter: { tags: ['favorites'] } });

      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe('Project 1');
    });

    it('should filter by multiple tags (OR logic)', async () => {
      const project1 = createProject({ name: 'Project 1', tags: ['tag1'] });
      const project2 = createProject({ name: 'Project 2', tags: ['tag2'] });
      const project3 = createProject({ name: 'Project 3', tags: ['tag3'] });
      await mockDb.saveProject(project1);
      await mockDb.saveProject(project2);
      await mockDb.saveProject(project3);

      const projects = await service.listProjects({ filter: { tags: ['tag1', 'tag2'] } });

      expect(projects).toHaveLength(2);
      expect(projects.map((p) => p.name)).toContain('Project 1');
      expect(projects.map((p) => p.name)).toContain('Project 2');
    });

    it('should filter by search query in name', async () => {
      const project1 = createProject({ name: 'Blood on the Clocktower' });
      const project2 = createProject({ name: 'Resistance' });
      await mockDb.saveProject(project1);
      await mockDb.saveProject(project2);

      const projects = await service.listProjects({ filter: { searchQuery: 'blood' } });

      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe('Blood on the Clocktower');
    });

    it('should filter by search query in description', async () => {
      const project1 = createProject({ name: 'Project 1', description: 'Contains keywords' });
      const project2 = createProject({ name: 'Project 2', description: 'Different content' });
      await mockDb.saveProject(project1);
      await mockDb.saveProject(project2);

      const projects = await service.listProjects({ filter: { searchQuery: 'keywords' } });

      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe('Project 1');
    });

    it('should sort by lastModifiedAt descending by default', async () => {
      const project1 = createProject({ name: 'Project 1', lastModifiedAt: 1000 });
      const project2 = createProject({ name: 'Project 2', lastModifiedAt: 2000 });
      const project3 = createProject({ name: 'Project 3', lastModifiedAt: 1500 });
      await mockDb.saveProject(project1);
      await mockDb.saveProject(project2);
      await mockDb.saveProject(project3);

      const projects = await service.listProjects();

      expect(projects.map((p) => p.name)).toEqual(['Project 2', 'Project 3', 'Project 1']);
    });

    it('should sort by custom field ascending', async () => {
      const project1 = createProject({ name: 'Zebra' });
      const project2 = createProject({ name: 'Apple' });
      const project3 = createProject({ name: 'Mango' });
      await mockDb.saveProject(project1);
      await mockDb.saveProject(project2);
      await mockDb.saveProject(project3);

      const projects = await service.listProjects({ sortBy: 'name', sortOrder: 'asc' });

      expect(projects.map((p) => p.name)).toEqual(['Apple', 'Mango', 'Zebra']);
    });

    it('should apply pagination limit', async () => {
      const projects_to_create = Array.from({ length: 5 }, (_, i) =>
        createProject({ name: `Project ${i + 1}` })
      );
      for (const p of projects_to_create) {
        await mockDb.saveProject(p);
      }

      const projects = await service.listProjects({ limit: 2 });

      expect(projects).toHaveLength(2);
    });

    it('should apply pagination offset', async () => {
      const projects_to_create = Array.from({ length: 5 }, (_, i) =>
        createProject({ name: `Project ${i + 1}`, lastModifiedAt: i * 1000 })
      );
      for (const p of projects_to_create) {
        await mockDb.saveProject(p);
      }

      const projects = await service.listProjects({ limit: 2, offset: 2 });

      expect(projects).toHaveLength(2);
    });

    it('should handle case-insensitive search', async () => {
      const project = createProject({ name: 'BLOOD ON THE CLOCKTOWER' });
      await mockDb.saveProject(project);

      const projects = await service.listProjects({ filter: { searchQuery: 'blood' } });

      expect(projects).toHaveLength(1);
    });

    it('should handle case-insensitive sorting', async () => {
      const project1 = createProject({ name: 'zebra' });
      const project2 = createProject({ name: 'Apple' });
      await mockDb.saveProject(project1);
      await mockDb.saveProject(project2);

      const projects = await service.listProjects({ sortBy: 'name', sortOrder: 'asc' });

      expect(projects[0].name).toBe('Apple');
      expect(projects[1].name).toBe('zebra');
    });

    it('should combine filters and sorting', async () => {
      const project1 = createProject({ name: 'Zebra', tags: ['favorite'] });
      const project2 = createProject({ name: 'Apple', tags: ['favorite'] });
      const project3 = createProject({ name: 'Mango', tags: ['archived'] });
      await mockDb.saveProject(project1);
      await mockDb.saveProject(project2);
      await mockDb.saveProject(project3);

      const projects = await service.listProjects({
        filter: { tags: ['favorite'] },
        sortBy: 'name',
        sortOrder: 'asc',
      });

      expect(projects).toHaveLength(2);
      expect(projects.map((p) => p.name)).toEqual(['Apple', 'Zebra']);
    });
  });

  // ==========================================================================
  // Project Switching
  // ==========================================================================

  describe('switchToProject', () => {
    it('should set current project', async () => {
      const project = createProject();
      await mockDb.saveProject(project);

      await service.switchToProject(project.id);

      expect(service.getCurrentProject()?.id).toBe(project.id);
    });

    it('should load project from database', async () => {
      const project = createProject();
      await mockDb.saveProject(project);

      await service.switchToProject(project.id);

      expect(mockDb.loadProject).toHaveBeenCalledWith(project.id);
    });

    it('should throw error for non-existent project', async () => {
      await expect(service.switchToProject('non-existent-id')).rejects.toThrow('Project not found');
    });

    it('should update lastAccessedAt when switching', async () => {
      const project = createProject();
      await mockDb.saveProject(project);

      await service.switchToProject(project.id);

      const current = service.getCurrentProject();
      expect(current?.lastAccessedAt).toBeDefined();
      expect(current?.lastAccessedAt).toBeGreaterThan(0);
    });

    it('should allow switching between projects', async () => {
      const project1 = createProject({ name: 'Project 1' });
      const project2 = createProject({ name: 'Project 2' });
      await mockDb.saveProject(project1);
      await mockDb.saveProject(project2);

      await service.switchToProject(project1.id);
      expect(service.getCurrentProject()?.name).toBe('Project 1');

      await service.switchToProject(project2.id);
      expect(service.getCurrentProject()?.name).toBe('Project 2');
    });
  });

  describe('getCurrentProject', () => {
    it('should return null when no project is active', () => {
      const current = service.getCurrentProject();

      expect(current).toBeNull();
    });

    it('should return current project after switching', async () => {
      const project = createProject();
      await mockDb.saveProject(project);

      await service.switchToProject(project.id);

      expect(service.getCurrentProject()).toEqual(expect.objectContaining({ id: project.id }));
    });

    it('should return null after deleting current project', async () => {
      const project = createProject();
      await mockDb.saveProject(project);
      await service.switchToProject(project.id);

      await service.deleteProject(project.id);

      expect(service.getCurrentProject()).toBeNull();
    });
  });

  // ==========================================================================
  // Import/Export
  // ==========================================================================

  describe('exportProject', () => {
    it('should export project as ZIP', async () => {
      const project = createProject();
      await mockDb.saveProject(project);

      const blob = await service.exportProject(project.id);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/zip');
    });

    it('should load project before exporting', async () => {
      const project = createProject();
      await mockDb.saveProject(project);

      await service.exportProject(project.id);

      expect(mockDb.loadProject).toHaveBeenCalledWith(project.id);
    });

    it('should call exporter with correct project', async () => {
      const project = createProject();
      await mockDb.saveProject(project);

      await service.exportProject(project.id, { includeAssets: true });

      expect(mockExporter.exportAsZip).toHaveBeenCalledWith(
        expect.objectContaining({ id: project.id }),
        expect.objectContaining({ includeAssets: true })
      );
    });

    it('should throw error for non-existent project', async () => {
      await expect(service.exportProject('non-existent-id')).rejects.toThrow('Project not found');
    });

    it('should pass export options to exporter', async () => {
      const project = createProject();
      await mockDb.saveProject(project);
      // biome-ignore lint/suspicious/noExplicitAny: Testing with extra export options
      const exportOptions = { includeAssets: true, format: 'advanced' as any };

      await service.exportProject(project.id, exportOptions);

      expect(mockExporter.exportAsZip).toHaveBeenCalledWith(expect.anything(), exportOptions);
    });

    it('should handle exporter errors', async () => {
      const project = createProject();
      await mockDb.saveProject(project);
      mockExporter.exportAsZip = vi.fn().mockRejectedValueOnce(new Error('Export failed'));

      await expect(service.exportProject(project.id)).rejects.toThrow('Export failed');
    });
  });

  describe('exportAndDownload', () => {
    it('should load project before exporting', async () => {
      const project = createProject();
      await mockDb.saveProject(project);

      // Mock DOM methods
      const mockLink = { href: '', download: '', click: vi.fn() };
      // biome-ignore lint/suspicious/noExplicitAny: Mock implementation requires any type
      vi.spyOn(document, 'createElement').mockReturnValueOnce(mockLink as any);
      vi.spyOn(document, 'body', 'get').mockReturnValue({
        appendChild: vi.fn(),
        removeChild: vi.fn(),
        // biome-ignore lint/suspicious/noExplicitAny: Mock implementation requires any type
      } as any);
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
      vi.spyOn(URL, 'revokeObjectURL');

      await service.exportAndDownload(project.id);

      expect(mockDb.loadProject).toHaveBeenCalledWith(project.id);
    });

    it('should generate filename for download', async () => {
      const project = createProject({ name: 'My Project' });
      await mockDb.saveProject(project);

      // Mock DOM methods
      const mockLink = { href: '', download: '', click: vi.fn() };
      // biome-ignore lint/suspicious/noExplicitAny: Mock implementation requires any type
      vi.spyOn(document, 'createElement').mockReturnValueOnce(mockLink as any);
      vi.spyOn(document, 'body', 'get').mockReturnValue({
        appendChild: vi.fn(),
        removeChild: vi.fn(),
        // biome-ignore lint/suspicious/noExplicitAny: Mock implementation requires any type
      } as any);
      vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
      vi.spyOn(URL, 'revokeObjectURL');

      await service.exportAndDownload(project.id);

      expect(mockExporter.generateFilename).toHaveBeenCalledWith('My Project');
    });

    it('should throw error for non-existent project', async () => {
      await expect(service.exportAndDownload('non-existent-id')).rejects.toThrow(
        'Project not found'
      );
    });

    it('should handle export errors', async () => {
      const project = createProject();
      await mockDb.saveProject(project);
      mockExporter.exportAsZip = vi.fn().mockRejectedValueOnce(new Error('Export failed'));

      await expect(service.exportAndDownload(project.id)).rejects.toThrow('Export failed');
    });
  });

  describe('importProject', () => {
    it('should import project from ZIP file', async () => {
      const file = new File(['mock-zip'], 'project.zip', { type: 'application/zip' });
      const importedProject = createProject({ name: 'Imported Project' });
      mockImporter.importFromZip = vi.fn().mockResolvedValueOnce(importedProject);

      const result = await service.importProject(file);

      expect(result).toEqual(importedProject);
    });

    it('should save imported project to database', async () => {
      const file = new File(['mock-zip'], 'project.zip', { type: 'application/zip' });
      const importedProject = createProject();
      mockImporter.importFromZip = vi.fn().mockResolvedValueOnce(importedProject);

      await service.importProject(file);

      expect(mockDb.saveProject).toHaveBeenCalledWith(importedProject);
    });

    it('should call importer with correct file', async () => {
      const file = new File(['mock-zip'], 'project.zip', { type: 'application/zip' });
      mockImporter.importFromZip = vi.fn().mockResolvedValueOnce(createProject());

      await service.importProject(file);

      expect(mockImporter.importFromZip).toHaveBeenCalledWith(file);
    });

    it('should handle import errors', async () => {
      const file = new File(['invalid'], 'invalid.zip');
      mockImporter.importFromZip = vi.fn().mockRejectedValueOnce(new Error('Invalid ZIP'));

      await expect(service.importProject(file)).rejects.toThrow('Invalid ZIP');
    });

    it('should handle database save errors after import', async () => {
      const file = new File(['mock-zip'], 'project.zip');
      const importedProject = createProject();
      mockImporter.importFromZip = vi.fn().mockResolvedValueOnce(importedProject);
      mockDb.saveProject = vi.fn().mockRejectedValueOnce(new Error('Save failed'));

      await expect(service.importProject(file)).rejects.toThrow('Save failed');
    });
  });

  // ==========================================================================
  // Auto-Save
  // ==========================================================================

  describe('saveCurrentState', () => {
    it('should update auto-save status to saved', async () => {
      const project = createProject();
      await mockDb.saveProject(project);
      await service.switchToProject(project.id);

      await service.saveCurrentState();

      const status = service.getAutoSaveStatus();
      expect(status.state).toBe('saved');
      expect(status.isDirty).toBe(false);
    });

    it('should update lastSavedAt timestamp', async () => {
      const project = createProject();
      // biome-ignore lint/suspicious/noExplicitAny: Testing private currentProject field
      (service as any).currentProject = project;

      const timeBefore = Date.now();
      await service.saveCurrentState();
      const timeAfter = Date.now();

      const status = service.getAutoSaveStatus();
      expect(status.lastSavedAt).toBeGreaterThanOrEqual(timeBefore);
      expect(status.lastSavedAt).toBeLessThanOrEqual(timeAfter);
    });

    it('should throw error when no active project', async () => {
      await expect(service.saveCurrentState()).rejects.toThrow('No active project to save');
    });

    it('should work after switching projects', async () => {
      const project = createProject();
      await mockDb.saveProject(project);
      await service.switchToProject(project.id);

      await service.saveCurrentState();

      const status = service.getAutoSaveStatus();
      expect(status.state).toBe('saved');
    });
  });

  describe('getAutoSaveStatus', () => {
    it('should return initial auto-save status', () => {
      const status = service.getAutoSaveStatus();

      expect(status.state).toBe('idle');
      expect(status.isDirty).toBe(false);
    });

    it('should return updated status after save', async () => {
      const project = createProject();
      // biome-ignore lint/suspicious/noExplicitAny: Testing private currentProject field
      (service as any).currentProject = project;

      await service.saveCurrentState();

      const status = service.getAutoSaveStatus();
      expect(status.state).toBe('saved');
      expect(status.isDirty).toBe(false);
    });

    it('should include lastSavedAt after save', async () => {
      const project = createProject();
      // biome-ignore lint/suspicious/noExplicitAny: Testing private currentProject field
      (service as any).currentProject = project;

      await service.saveCurrentState();

      const status = service.getAutoSaveStatus();
      expect(status.lastSavedAt).toBeDefined();
    });
  });

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  describe('getStorageQuota', () => {
    it('should return storage quota from database', async () => {
      const quota = await service.getStorageQuota();

      expect(quota).toBeDefined();
      expect(quota).toHaveProperty('usage');
      expect(quota).toHaveProperty('quota');
    });

    it('should delegate to database service', async () => {
      await service.getStorageQuota();

      expect(mockDb.getStorageQuota).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockDb.getStorageQuota = vi.fn().mockRejectedValueOnce(new Error('Quota error'));

      await expect(service.getStorageQuota()).rejects.toThrow('Quota error');
    });
  });

  describe('getStats', () => {
    it('should return statistics including project count', async () => {
      const project1 = createProject();
      const project2 = createProject();
      await mockDb.saveProject(project1);
      await mockDb.saveProject(project2);

      const stats = await service.getStats();

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('projectCount');
      expect(stats.projectCount).toBe(2);
    });

    it('should include storage quota in stats', async () => {
      const stats = await service.getStats();

      expect(stats).toHaveProperty('quota');
      expect(stats.quota).toBeDefined();
    });

    it('should handle empty project list', async () => {
      const stats = await service.getStats();

      expect(stats.projectCount).toBe(0);
    });

    it('should handle database errors', async () => {
      mockDb.listProjects = vi.fn().mockRejectedValueOnce(new Error('List error'));

      await expect(service.getStats()).rejects.toThrow('List error');
    });
  });

  // ==========================================================================
  // Dependency Injection
  // ==========================================================================

  describe('Dependency Injection', () => {
    it('should accept injected database dependency', () => {
      const customDb = createMockProjectDatabase();
      const customService = new ProjectService({ database: customDb });

      expect(customService).toBeDefined();
    });

    it('should accept injected exporter dependency', () => {
      const customExporter: IProjectExporter = {
        exportAsZip: vi.fn(),
        generateFilename: vi.fn(),
      };
      const customService = new ProjectService({ exporter: customExporter });

      expect(customService).toBeDefined();
    });

    it('should accept injected importer dependency', () => {
      const customImporter: IProjectImporter = {
        importFromZip: vi.fn(),
        validateZip: vi.fn(),
        previewZip: vi.fn(),
      };
      const customService = new ProjectService({ importer: customImporter });

      expect(customService).toBeDefined();
    });

    it('should accept multiple injected dependencies', () => {
      const customDb = createMockProjectDatabase();
      const customExporter: IProjectExporter = {
        exportAsZip: vi.fn(),
        generateFilename: vi.fn(),
      };
      const customImporter: IProjectImporter = {
        importFromZip: vi.fn(),
        validateZip: vi.fn(),
        previewZip: vi.fn(),
      };

      const customService = new ProjectService({
        database: customDb,
        exporter: customExporter,
        importer: customImporter,
      });

      expect(customService).toBeDefined();
    });

    it('should work with empty dependency object', () => {
      const customService = new ProjectService({});

      expect(customService).toBeDefined();
    });

    it('should work with undefined dependencies', () => {
      const customService = new ProjectService();

      expect(customService).toBeDefined();
    });
  });

  // ==========================================================================
  // Integration Scenarios
  // ==========================================================================

  describe('Integration Scenarios', () => {
    it('should create, retrieve, update, and delete project', async () => {
      // Create
      const options = createProjectOptions({ name: 'Full Lifecycle' });
      const created = await service.createProject(options);

      // Retrieve
      const retrieved = await service.getProject(created.id);
      expect(retrieved?.name).toBe('Full Lifecycle');

      // Update
      const updated = await service.updateProject(created.id, { name: 'Updated Name' });
      expect(updated.name).toBe('Updated Name');

      // Delete
      await service.deleteProject(created.id);
      const deleted = await service.getProject(created.id);
      expect(deleted).toBeNull();
    });

    it('should create and export project', async () => {
      const options = createProjectOptions({ name: 'Export Test' });
      const created = await service.createProject(options);

      const blob = await service.exportProject(created.id);

      expect(blob).toBeInstanceOf(Blob);
      expect(mockExporter.exportAsZip).toHaveBeenCalled();
    });

    it('should import and list projects', async () => {
      const file = new File(['mock-zip'], 'project.zip');
      const importedProject = createProject({ name: 'Imported' });
      mockImporter.importFromZip = vi.fn().mockResolvedValueOnce(importedProject);

      await service.importProject(file);

      const projects = await service.listProjects();
      expect(projects).toContainEqual(expect.objectContaining({ name: 'Imported' }));
    });

    it('should manage multiple projects with switching', async () => {
      const project1 = createProject({ name: 'Project 1' });
      const project2 = createProject({ name: 'Project 2' });
      await mockDb.saveProject(project1);
      await mockDb.saveProject(project2);

      await service.switchToProject(project1.id);
      expect(service.getCurrentProject()?.name).toBe('Project 1');

      await service.updateProject(project1.id, { name: 'Updated Project 1' });

      await service.switchToProject(project2.id);
      expect(service.getCurrentProject()?.name).toBe('Project 2');

      const projects = await service.listProjects();
      expect(projects).toHaveLength(2);
    });

    it('should maintain auto-save state across operations', async () => {
      const project = createProject();
      await mockDb.saveProject(project);
      await service.switchToProject(project.id);

      let status = service.getAutoSaveStatus();
      expect(status.state).toBe('idle');

      await service.saveCurrentState();

      status = service.getAutoSaveStatus();
      expect(status.state).toBe('saved');

      await service.updateProject(project.id, { name: 'Updated' });

      status = service.getAutoSaveStatus();
      expect(status.state).toBe('saved');
    });
  });
});
