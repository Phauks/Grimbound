/**
 * Unit tests for useProjects hook
 *
 * Tests cover:
 * - Hook returns expected state and functions
 * - loadProjects operation
 * - createProject operation
 * - deleteProject operation
 * - loadProject operation with state restoration
 * - updateProject operation
 * - saveCurrentProject operation
 * - activateProject/deactivateProject
 * - duplicateProject operation
 * - Error handling
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as ProjectContextModule from '@/contexts/ProjectContext';
import * as ServiceContextModule from '@/contexts/ServiceContext';
import * as TokenContextModule from '@/contexts/TokenContext';
import { useProjects } from '@/hooks/projects/useProjects';
import type { Project, ProjectState } from '@/ts/types/project';
import type { GenerationOptions } from '@/ts/types/tokenOptions';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@/contexts/ProjectContext');
vi.mock('@/contexts/ServiceContext');
vi.mock('@/contexts/TokenContext');

// ============================================================================
// Test Helpers
// ============================================================================

const createMockProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'project-1',
  name: 'Test Project',
  description: 'A test project',
  createdAt: Date.now(),
  lastModifiedAt: Date.now(),
  state: createMockProjectState(),
  ...overrides,
});

const createMockProjectState = (overrides: Partial<ProjectState> = {}): ProjectState => ({
  jsonInput: '[]',
  characters: [],
  scriptMeta: null,
  characterMetadata: {},
  generationOptions: createMockGenerationOptions(),
  customIcons: [],
  filters: {},
  schemaVersion: 1,
  ...overrides,
});

const createMockGenerationOptions = (): GenerationOptions => ({
  diameter: 300,
  reminderDiameter: 200,
  dpi: 300,
  enableReminders: true,
  enableScriptNameToken: false,
  enablePandemoniumToken: false,
  enableAlmanacQRToken: false,
  enableBootleggerToken: false,
  teamVariants: [],
});

const createMockProjectContext = (overrides = {}) => ({
  currentProject: null,
  setCurrentProject: vi.fn(),
  projects: [],
  setProjects: vi.fn(),
  projectsLoaded: false,
  projectsLoading: false,
  ...overrides,
});

const createMockProjectService = (overrides = {}) => ({
  listProjects: vi.fn().mockResolvedValue([]),
  createProject: vi.fn().mockResolvedValue(createMockProject()),
  deleteProject: vi.fn().mockResolvedValue(undefined),
  getProject: vi.fn().mockResolvedValue(createMockProject()),
  updateProject: vi.fn().mockResolvedValue(createMockProject()),
  ...overrides,
});

const createMockTokenContext = (overrides = {}) => ({
  characters: [],
  scriptMeta: null,
  generationOptions: createMockGenerationOptions(),
  jsonInput: '[]',
  filters: {},
  characterMetadata: new Map(),
  setCharacters: vi.fn(),
  setScriptMeta: vi.fn(),
  setJsonInput: vi.fn(),
  setTokens: vi.fn(),
  updateGenerationOptions: vi.fn(),
  setMetadata: vi.fn(),
  clearAllMetadata: vi.fn(),
  ...overrides,
});

// ============================================================================
// Tests
// ============================================================================

describe('useProjects', () => {
  let mockProjectContext: ReturnType<typeof createMockProjectContext>;
  let mockProjectService: ReturnType<typeof createMockProjectService>;
  let mockTokenContext: ReturnType<typeof createMockTokenContext>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockProjectContext = createMockProjectContext();
    mockProjectService = createMockProjectService();
    mockTokenContext = createMockTokenContext();

    vi.spyOn(ProjectContextModule, 'useProjectContext').mockReturnValue(mockProjectContext);
    vi.spyOn(ServiceContextModule, 'useProjectService').mockReturnValue(mockProjectService);
    vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
      mockTokenContext as ReturnType<typeof TokenContextModule.useTokenContext>
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // Hook Initialization
  // --------------------------------------------------------------------------

  describe('Hook Initialization', () => {
    it('should return expected state and functions', () => {
      const { result } = renderHook(() => useProjects());

      // State
      expect(result.current).toHaveProperty('projects');
      expect(result.current).toHaveProperty('currentProject');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('projectsLoaded');
      expect(result.current).toHaveProperty('error');

      // Operations
      expect(result.current).toHaveProperty('loadProjects');
      expect(result.current).toHaveProperty('createProject');
      expect(result.current).toHaveProperty('deleteProject');
      expect(result.current).toHaveProperty('loadProject');
      expect(result.current).toHaveProperty('updateProject');
      expect(result.current).toHaveProperty('saveCurrentProject');
      expect(result.current).toHaveProperty('activateProject');
      expect(result.current).toHaveProperty('duplicateProject');
    });

    it('should combine loading states', () => {
      mockProjectContext = createMockProjectContext({ projectsLoading: true });
      vi.spyOn(ProjectContextModule, 'useProjectContext').mockReturnValue(mockProjectContext);

      const { result } = renderHook(() => useProjects());

      expect(result.current.isLoading).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // loadProjects
  // --------------------------------------------------------------------------

  describe('loadProjects', () => {
    it('should call projectService.listProjects', async () => {
      const { result } = renderHook(() => useProjects());

      await act(async () => {
        await result.current.loadProjects();
      });

      expect(mockProjectService.listProjects).toHaveBeenCalled();
    });

    it('should set projects on success', async () => {
      const projects = [
        createMockProject(),
        createMockProject({ id: 'project-2', name: 'Project 2' }),
      ];
      mockProjectService.listProjects.mockResolvedValue(projects);

      const { result } = renderHook(() => useProjects());

      await act(async () => {
        await result.current.loadProjects();
      });

      expect(mockProjectContext.setProjects).toHaveBeenCalledWith(projects);
    });

    it('should pass options to listProjects', async () => {
      const { result } = renderHook(() => useProjects());
      const options = { sortBy: 'name' as const, sortOrder: 'asc' as const };

      await act(async () => {
        await result.current.loadProjects(options);
      });

      expect(mockProjectService.listProjects).toHaveBeenCalledWith(options);
    });
  });

  // --------------------------------------------------------------------------
  // createProject
  // --------------------------------------------------------------------------

  describe('createProject', () => {
    it('should call projectService.createProject with state', async () => {
      const { result } = renderHook(() => useProjects());

      await act(async () => {
        await result.current.createProject('New Project', 'Description');
      });

      expect(mockProjectService.createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Project',
          description: 'Description',
          state: expect.any(Object),
        })
      );
    });

    it('should include current state in project', async () => {
      mockTokenContext = createMockTokenContext({
        jsonInput: '[{"id": "test"}]',
        characters: [{ id: 'char-1', name: 'Test Char' }],
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
        mockTokenContext as ReturnType<typeof TokenContextModule.useTokenContext>
      );

      const { result } = renderHook(() => useProjects());

      await act(async () => {
        await result.current.createProject('New Project');
      });

      expect(mockProjectService.createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          state: expect.objectContaining({
            jsonInput: '[{"id": "test"}]',
            characters: [{ id: 'char-1', name: 'Test Char' }],
          }),
        })
      );
    });

    it('should set current project on success', async () => {
      const newProject = createMockProject({ name: 'New Project' });
      mockProjectService.createProject.mockResolvedValue(newProject);

      const { result } = renderHook(() => useProjects());

      await act(async () => {
        await result.current.createProject('New Project');
      });

      expect(mockProjectContext.setCurrentProject).toHaveBeenCalledWith(newProject);
    });

    it('should return created project', async () => {
      const newProject = createMockProject({ name: 'New Project' });
      mockProjectService.createProject.mockResolvedValue(newProject);

      const { result } = renderHook(() => useProjects());
      let createdProject: Project | undefined;

      await act(async () => {
        createdProject = await result.current.createProject('New Project');
      });

      expect(createdProject).toEqual(newProject);
    });
  });

  // --------------------------------------------------------------------------
  // deleteProject
  // --------------------------------------------------------------------------

  describe('deleteProject', () => {
    it('should call projectService.deleteProject', async () => {
      const { result } = renderHook(() => useProjects());

      await act(async () => {
        await result.current.deleteProject('project-1');
      });

      expect(mockProjectService.deleteProject).toHaveBeenCalledWith('project-1');
    });

    it('should clear current project if deleted', async () => {
      mockProjectContext = createMockProjectContext({
        currentProject: createMockProject({ id: 'project-1' }),
      });
      vi.spyOn(ProjectContextModule, 'useProjectContext').mockReturnValue(mockProjectContext);

      const { result } = renderHook(() => useProjects());

      await act(async () => {
        await result.current.deleteProject('project-1');
      });

      expect(mockProjectContext.setCurrentProject).toHaveBeenCalledWith(null);
    });

    it('should not clear current project if different project deleted', async () => {
      mockProjectContext = createMockProjectContext({
        currentProject: createMockProject({ id: 'project-1' }),
      });
      vi.spyOn(ProjectContextModule, 'useProjectContext').mockReturnValue(mockProjectContext);

      const { result } = renderHook(() => useProjects());

      await act(async () => {
        await result.current.deleteProject('project-2');
      });

      expect(mockProjectContext.setCurrentProject).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // loadProject
  // --------------------------------------------------------------------------

  describe('loadProject', () => {
    it('should call projectService.getProject', async () => {
      const { result } = renderHook(() => useProjects());

      await act(async () => {
        await result.current.loadProject('project-1');
      });

      expect(mockProjectService.getProject).toHaveBeenCalledWith('project-1');
    });

    it('should set current project on success', async () => {
      const project = createMockProject();
      mockProjectService.getProject.mockResolvedValue(project);

      const { result } = renderHook(() => useProjects());

      await act(async () => {
        await result.current.loadProject('project-1');
      });

      expect(mockProjectContext.setCurrentProject).toHaveBeenCalledWith(project);
    });

    it('should restore project state', async () => {
      const projectState = createMockProjectState({
        jsonInput: '[{"id": "test"}]',
        characters: [
          { id: 'char-1', name: 'Test Char', team: 'townsfolk', ability: 'Test', image: '' },
        ],
        scriptMeta: { id: '_meta', name: 'Test Script' },
      });
      const project = createMockProject({ state: projectState });
      mockProjectService.getProject.mockResolvedValue(project);

      const { result } = renderHook(() => useProjects());

      await act(async () => {
        await result.current.loadProject('project-1');
      });

      expect(mockTokenContext.setCharacters).toHaveBeenCalledWith(projectState.characters);
      expect(mockTokenContext.setScriptMeta).toHaveBeenCalledWith(projectState.scriptMeta);
      expect(mockTokenContext.setJsonInput).toHaveBeenCalledWith(projectState.jsonInput);
    });

    it('should restore generation options', async () => {
      const projectState = createMockProjectState({
        generationOptions: { ...createMockGenerationOptions(), diameter: 500 },
      });
      const project = createMockProject({ state: projectState });
      mockProjectService.getProject.mockResolvedValue(project);

      const { result } = renderHook(() => useProjects());

      await act(async () => {
        await result.current.loadProject('project-1');
      });

      expect(mockTokenContext.updateGenerationOptions).toHaveBeenCalledWith(
        projectState.generationOptions
      );
    });

    it('should restore character metadata', async () => {
      const projectState = createMockProjectState({
        characterMetadata: {
          'char-1': { enabled: true },
          'char-2': { enabled: false },
        },
      });
      const project = createMockProject({ state: projectState });
      mockProjectService.getProject.mockResolvedValue(project);

      const { result } = renderHook(() => useProjects());

      await act(async () => {
        await result.current.loadProject('project-1');
      });

      expect(mockTokenContext.clearAllMetadata).toHaveBeenCalled();
      expect(mockTokenContext.setMetadata).toHaveBeenCalledWith('char-1', { enabled: true });
      expect(mockTokenContext.setMetadata).toHaveBeenCalledWith('char-2', { enabled: false });
    });

    it('should return loaded project', async () => {
      const project = createMockProject();
      mockProjectService.getProject.mockResolvedValue(project);

      const { result } = renderHook(() => useProjects());
      let loadedProject: Project | undefined;

      await act(async () => {
        loadedProject = await result.current.loadProject('project-1');
      });

      expect(loadedProject).toEqual(project);
    });
  });

  // --------------------------------------------------------------------------
  // updateProject
  // --------------------------------------------------------------------------

  describe('updateProject', () => {
    it('should call projectService.updateProject', async () => {
      const updates = { name: 'Updated Name' };
      const { result } = renderHook(() => useProjects());

      await act(async () => {
        await result.current.updateProject('project-1', updates);
      });

      expect(mockProjectService.updateProject).toHaveBeenCalledWith('project-1', updates);
    });

    it('should update current project if it is the updated one', async () => {
      const updatedProject = createMockProject({ name: 'Updated Name' });
      mockProjectService.updateProject.mockResolvedValue(updatedProject);
      mockProjectContext = createMockProjectContext({
        currentProject: createMockProject({ id: 'project-1' }),
      });
      vi.spyOn(ProjectContextModule, 'useProjectContext').mockReturnValue(mockProjectContext);

      const { result } = renderHook(() => useProjects());

      await act(async () => {
        await result.current.updateProject('project-1', { name: 'Updated Name' });
      });

      expect(mockProjectContext.setCurrentProject).toHaveBeenCalledWith(updatedProject);
    });

    it('should not update current project if different project updated', async () => {
      mockProjectContext = createMockProjectContext({
        currentProject: createMockProject({ id: 'project-1' }),
      });
      vi.spyOn(ProjectContextModule, 'useProjectContext').mockReturnValue(mockProjectContext);

      const { result } = renderHook(() => useProjects());

      await act(async () => {
        await result.current.updateProject('project-2', { name: 'Updated Name' });
      });

      expect(mockProjectContext.setCurrentProject).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // saveCurrentProject
  // --------------------------------------------------------------------------

  describe('saveCurrentProject', () => {
    it('should not save when no current project', async () => {
      const { result } = renderHook(() => useProjects());

      await act(async () => {
        await result.current.saveCurrentProject();
      });

      expect(mockProjectService.updateProject).not.toHaveBeenCalled();
      expect(result.current.error).toBe('No project is currently loaded');
    });

    it('should save current state to project', async () => {
      const currentProject = createMockProject({ id: 'project-1' });
      mockProjectContext = createMockProjectContext({ currentProject });
      vi.spyOn(ProjectContextModule, 'useProjectContext').mockReturnValue(mockProjectContext);

      mockTokenContext = createMockTokenContext({
        jsonInput: '[{"id": "updated"}]',
        characters: [{ id: 'char-1', name: 'Updated Char' }],
      });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
        mockTokenContext as ReturnType<typeof TokenContextModule.useTokenContext>
      );

      const { result } = renderHook(() => useProjects());

      await act(async () => {
        await result.current.saveCurrentProject();
      });

      expect(mockProjectService.updateProject).toHaveBeenCalledWith(
        'project-1',
        expect.objectContaining({
          state: expect.objectContaining({
            jsonInput: '[{"id": "updated"}]',
            characters: [{ id: 'char-1', name: 'Updated Char' }],
          }),
          lastModifiedAt: expect.any(Number),
        })
      );
    });
  });

  // --------------------------------------------------------------------------
  // activateProject
  // --------------------------------------------------------------------------

  describe('activateProject', () => {
    it('should load and activate project', async () => {
      const project = createMockProject();
      mockProjectService.getProject.mockResolvedValue(project);

      const { result } = renderHook(() => useProjects());

      await act(async () => {
        await result.current.activateProject('project-1');
      });

      expect(mockProjectService.getProject).toHaveBeenCalledWith('project-1');
    });

    it('should deactivate when empty string passed', async () => {
      const { result } = renderHook(() => useProjects());

      await act(async () => {
        await result.current.activateProject('');
      });

      expect(mockProjectContext.setCurrentProject).toHaveBeenCalledWith(null);
      expect(mockTokenContext.setCharacters).toHaveBeenCalledWith([]);
      expect(mockTokenContext.setScriptMeta).toHaveBeenCalledWith(null);
      expect(mockTokenContext.setJsonInput).toHaveBeenCalledWith('');
      expect(mockTokenContext.setTokens).toHaveBeenCalledWith([]);
      expect(mockTokenContext.clearAllMetadata).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // duplicateProject
  // --------------------------------------------------------------------------

  describe('duplicateProject', () => {
    it('should load source project first', async () => {
      const sourceProject = createMockProject({ name: 'Original' });
      mockProjectService.getProject.mockResolvedValue(sourceProject);

      const { result } = renderHook(() => useProjects());

      await act(async () => {
        await result.current.duplicateProject('project-1');
      });

      expect(mockProjectService.getProject).toHaveBeenCalledWith('project-1');
    });

    it('should create project with (Copy) suffix', async () => {
      const sourceProject = createMockProject({ name: 'Original' });
      mockProjectService.getProject.mockResolvedValue(sourceProject);

      const { result } = renderHook(() => useProjects());

      await act(async () => {
        await result.current.duplicateProject('project-1');
      });

      expect(mockProjectService.createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Original (Copy)',
        })
      );
    });

    it('should copy source project state', async () => {
      const sourceState = createMockProjectState({
        jsonInput: '[{"id": "test"}]',
        characters: [{ id: 'char-1', name: 'Test', team: 'townsfolk', ability: 'Test', image: '' }],
      });
      const sourceProject = createMockProject({ state: sourceState });
      mockProjectService.getProject.mockResolvedValue(sourceProject);

      const { result } = renderHook(() => useProjects());

      await act(async () => {
        await result.current.duplicateProject('project-1');
      });

      expect(mockProjectService.createProject).toHaveBeenCalledWith(
        expect.objectContaining({
          state: sourceState,
        })
      );
    });

    it('should return undefined if source not found', async () => {
      mockProjectService.getProject.mockResolvedValue(undefined);

      const { result } = renderHook(() => useProjects());
      let duplicatedProject: Project | undefined;

      await act(async () => {
        duplicatedProject = await result.current.duplicateProject('project-1');
      });

      expect(duplicatedProject).toBeUndefined();
      expect(mockProjectService.createProject).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // Error Handling
  // --------------------------------------------------------------------------

  describe('Error Handling', () => {
    it('should set error on loadProjects failure', async () => {
      mockProjectService.listProjects.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useProjects());

      await act(async () => {
        await result.current.loadProjects();
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    });

    it('should set error on createProject failure', async () => {
      mockProjectService.createProject.mockRejectedValue(new Error('Create failed'));

      const { result } = renderHook(() => useProjects());

      await act(async () => {
        await result.current.createProject('New Project');
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    });
  });
});
