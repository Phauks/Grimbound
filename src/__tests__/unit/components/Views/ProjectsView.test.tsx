/**
 * Unit tests for ProjectsView component
 *
 * Tests cover:
 * - Basic rendering and layout
 * - Project selection behavior
 * - Project creation
 * - Project import/export modals
 * - Project deletion with modal
 * - Project duplication
 * - Icon management modal
 * - Last project loading
 * - Initial project ID handling
 * - Selected project sync with projects list
 *
 * @module __tests__/unit/components/Views/ProjectsView.test
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectsView } from '@/components/Views/ProjectsView';
import * as ToastContextModule from '@/contexts/ToastContext';
import * as TokenContextModule from '@/contexts/TokenContext';
import * as UseProjectsModule from '@/hooks';
import type { GenerationOptions } from '@/ts/types/index';
import type { Project, ProjectState } from '@/ts/types/project';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@/contexts/ToastContext');
vi.mock('@/contexts/TokenContext');
vi.mock('@/hooks', () => ({
  useProjects: vi.fn(),
}));

// Mock child components
vi.mock('@/components/Layout/ViewLayout', () => {
  const MockPanel = ({
    children,
    position,
  }: {
    children: ReactNode;
    position: string;
    width?: string;
    scrollable?: boolean;
  }) => <div data-testid={`panel-${position}`}>{children}</div>;

  const ViewLayout = ({ children }: { children: ReactNode; variant?: string }) => (
    <div data-testid="view-layout">{children}</div>
  );
  ViewLayout.Panel = MockPanel;

  return { ViewLayout };
});

vi.mock('@/components/Shared', () => ({
  ErrorBoundary: ({ children }: { children: ReactNode }) => <>{children}</>,
  UnifiedErrorDisplay: () => <div>Error Fallback</div>,
}));

vi.mock('@/components/ViewComponents/ProjectsComponents/ProjectNavigation', () => ({
  ProjectNavigation: ({
    projects,
    selectedProjectId,
    currentProjectId,
    onSelectProject,
    onCreateProject,
    onIconManagement,
    onDeleteProject,
  }: {
    projects: Project[];
    selectedProjectId: string | null;
    currentProjectId: string | null;
    onSelectProject: (id: string) => void;
    onCreateProject: () => void;
    onIconManagement: () => void;
    onDeleteProject: (project: Project) => void;
  }) => (
    <div data-testid="project-navigation">
      <span data-testid="project-count">{projects.length}</span>
      <span data-testid="selected-id">{selectedProjectId || 'none'}</span>
      <span data-testid="current-id">{currentProjectId || 'none'}</span>
      {projects.map((p) => (
        <button
          key={p.id}
          type="button"
          data-testid={`select-${p.id}`}
          onClick={() => onSelectProject(p.id)}
        >
          {p.name}
        </button>
      ))}
      <button type="button" data-testid="create-btn" onClick={onCreateProject}>
        Create
      </button>
      <button type="button" data-testid="icon-mgmt-btn" onClick={onIconManagement}>
        Icons
      </button>
      {projects.length > 0 && (
        <button type="button" data-testid="delete-btn" onClick={() => onDeleteProject(projects[0])}>
          Delete
        </button>
      )}
    </div>
  ),
}));

vi.mock('@/components/ViewComponents/ProjectsComponents/ProjectEditor', () => ({
  ProjectEditor: ({
    project,
    onExport,
    onDelete,
    onDuplicate,
    onCreateProject,
    onImportProject,
    onLoadLastProject,
    lastProject,
  }: {
    project: Project | null;
    onExport: (project: Project) => void;
    onDelete: (project: Project) => void;
    onDuplicate: (project: Project) => void;
    onCreateProject: () => void;
    onImportProject: () => void;
    onLoadLastProject: () => void;
    lastProject: Project | null;
  }) => (
    <div data-testid="project-editor">
      <span data-testid="editor-project-name">{project?.name || 'No project'}</span>
      <span data-testid="last-project-name">{lastProject?.name || 'None'}</span>
      {project && (
        <>
          <button type="button" data-testid="export-btn" onClick={() => onExport(project)}>
            Export
          </button>
          <button type="button" data-testid="editor-delete-btn" onClick={() => onDelete(project)}>
            Delete
          </button>
          <button type="button" data-testid="duplicate-btn" onClick={() => onDuplicate(project)}>
            Duplicate
          </button>
        </>
      )}
      <button type="button" data-testid="editor-create-btn" onClick={onCreateProject}>
        Create
      </button>
      <button type="button" data-testid="editor-import-btn" onClick={onImportProject}>
        Import
      </button>
      {lastProject && (
        <button type="button" data-testid="load-last-btn" onClick={onLoadLastProject}>
          Load Last
        </button>
      )}
    </div>
  ),
}));

vi.mock('@/components/Modals/DeleteProjectModal', () => ({
  DeleteProjectModal: ({
    isOpen,
    project,
    onClose,
    onSuccess,
  }: {
    isOpen: boolean;
    project: Project | null;
    onClose: () => void;
    onSuccess: () => void;
  }) =>
    isOpen ? (
      <div data-testid="delete-modal">
        <span data-testid="delete-modal-project">{project?.name}</span>
        <button type="button" data-testid="delete-confirm" onClick={onSuccess}>
          Confirm Delete
        </button>
        <button type="button" data-testid="delete-cancel" onClick={onClose}>
          Cancel
        </button>
      </div>
    ) : null,
}));

vi.mock('@/components/Modals/ExportProjectModal', () => ({
  ExportProjectModal: ({
    isOpen,
    project,
    onClose,
  }: {
    isOpen: boolean;
    project: Project | null;
    onClose: () => void;
  }) =>
    isOpen ? (
      <div data-testid="export-modal">
        <span data-testid="export-modal-project">{project?.name}</span>
        <button type="button" data-testid="export-close" onClick={onClose}>
          Close
        </button>
      </div>
    ) : null,
}));

vi.mock('@/components/Modals/ImportProjectModal', () => ({
  ImportProjectModal: ({
    isOpen,
    onClose,
    onImport,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onImport: (id: string) => void;
  }) =>
    isOpen ? (
      <div data-testid="import-modal">
        <button
          type="button"
          data-testid="import-success"
          onClick={() => onImport('imported-project-id')}
        >
          Import Success
        </button>
        <button type="button" data-testid="import-close" onClick={onClose}>
          Close
        </button>
      </div>
    ) : null,
}));

vi.mock('@/components/Modals/IconManagementModal', () => ({
  IconManagementModal: ({
    isOpen,
    onClose,
    characters,
    customIcons,
    onUpdateIcons,
  }: {
    isOpen: boolean;
    onClose: () => void;
    characters: unknown[];
    customIcons: unknown[];
    onUpdateIcons: (icons: unknown[]) => void;
  }) =>
    isOpen ? (
      <div data-testid="icon-modal">
        <span data-testid="icon-modal-chars">{characters.length}</span>
        <span data-testid="icon-modal-icons">{customIcons.length}</span>
        <button
          type="button"
          data-testid="icon-update"
          onClick={() => onUpdateIcons([{ id: 'new-icon' }])}
        >
          Update Icons
        </button>
        <button type="button" data-testid="icon-close" onClick={onClose}>
          Close
        </button>
      </div>
    ) : null,
}));

vi.mock('@/ts/utils/logger.js', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

// ============================================================================
// Test Helpers
// ============================================================================

const createMockGenerationOptions = (): GenerationOptions => ({
  displayAbilityText: true,
  generateBootleggerRules: false,
  tokenCount: true,
  setupStyle: 'official',
  reminderBackground: 'Moss',
  characterBackground: 'Moon Phases',
  characterNameFont: 'Dumbledore',
  characterReminderFont: 'Dumbledore',
  scriptNameToken: false,
  almanacToken: false,
  pandemoniumToken: false,
});

const createMockProjectState = (overrides: Partial<ProjectState> = {}): ProjectState => ({
  jsonInput: '[]',
  characters: [],
  scriptMeta: null,
  characterMetadata: {},
  generationOptions: createMockGenerationOptions(),
  customIcons: [],
  filters: { teams: [], tokenTypes: [], display: [], reminders: [] },
  schemaVersion: 1,
  ...overrides,
});

const createMockProject = (overrides: Partial<Project> = {}): Project =>
  ({
    id: 'project-1',
    name: 'Test Project',
    description: 'A test project',
    createdAt: Date.now(),
    lastModifiedAt: Date.now(),
    lastAccessedAt: Date.now() - 1000, // 1 second ago
    state: createMockProjectState(),
    thumbnail: { type: 'auto' },
    stats: {
      characterCount: 0,
      tokenCount: 0,
      reminderCount: 0,
      customIconCount: 0,
      presetCount: 0,
    },
    schemaVersion: 1,
    ...overrides,
  }) as Project;

const createMockUseProjects = (overrides = {}) => ({
  projects: [],
  currentProject: null,
  isLoading: false,
  projectsLoaded: true,
  error: null,
  loadProjects: vi.fn().mockResolvedValue(undefined),
  createProject: vi
    .fn()
    .mockResolvedValue(createMockProject({ id: 'new-project', name: 'New Project' })),
  deleteProject: vi.fn().mockResolvedValue(undefined),
  loadProject: vi.fn().mockResolvedValue(undefined),
  updateProject: vi.fn().mockResolvedValue(undefined),
  saveCurrentProject: vi.fn().mockResolvedValue(undefined),
  activateProject: vi.fn().mockResolvedValue(undefined),
  duplicateProject: vi.fn().mockResolvedValue(createMockProject({ id: 'duplicated' })),
  ...overrides,
});

const createMockTokenContext = (overrides = {}) => ({
  characters: [],
  tokens: [],
  jsonInput: '[]',
  setJsonInput: vi.fn(),
  setCharacters: vi.fn(),
  setTokens: vi.fn(),
  generationOptions: createMockGenerationOptions(),
  updateGenerationOptions: vi.fn(),
  characterMetadata: new Map(),
  setMetadata: vi.fn(),
  deleteMetadata: vi.fn(),
  getMetadata: vi.fn(() => ({ decoratives: undefined })),
  clearAllMetadata: vi.fn(),
  officialData: [],
  setOfficialData: vi.fn(),
  isCharacterEnabled: vi.fn(() => true),
  setCharacterEnabled: vi.fn(),
  setAllCharactersEnabled: vi.fn(),
  getEnabledCharacters: vi.fn(() => []),
  enabledCharacterUuids: new Set<string>(),
  characterSelectionSummary: { enabled: 0, disabled: 0, total: 0 },
  scriptMeta: null,
  setScriptMeta: vi.fn(),
  filters: { teams: [], tokenTypes: [], display: [], reminders: [], origin: [] },
  updateFilters: vi.fn(),
  exampleCharacterToken: null,
  setExampleCharacterToken: vi.fn(),
  exampleMetaToken: null,
  setExampleMetaToken: vi.fn(),
  isLoading: false,
  setIsLoading: vi.fn(),
  error: null,
  setError: vi.fn(),
  warnings: [],
  setWarnings: vi.fn(),
  generationProgress: null,
  setGenerationProgress: vi.fn(),
  lastGeneratedJsonHash: null,
  setLastGeneratedJsonHash: vi.fn(),
  syncStatus: {
    state: 'idle' as const,
    dataSource: 'offline' as const,
    currentVersion: null,
    availableVersion: null,
    lastSync: null,
    error: null,
  },
  isSyncInitialized: true,
  ...overrides,
});

const createMockToastContext = () => ({
  toasts: [],
  addToast: vi.fn(),
  removeToast: vi.fn(),
});

// ============================================================================
// Tests
// ============================================================================

describe('ProjectsView', () => {
  let mockUseProjects: ReturnType<typeof createMockUseProjects>;
  let mockToastContext: ReturnType<typeof createMockToastContext>;
  let mockTokenContext: ReturnType<typeof createMockTokenContext>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    mockUseProjects = createMockUseProjects();
    mockToastContext = createMockToastContext();
    mockTokenContext = createMockTokenContext();

    vi.spyOn(UseProjectsModule, 'useProjects').mockReturnValue(mockUseProjects);
    vi.spyOn(ToastContextModule, 'useToast').mockReturnValue(mockToastContext);
    vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
      mockTokenContext as ReturnType<typeof TokenContextModule.useTokenContext>
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // Basic Rendering
  // --------------------------------------------------------------------------

  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      render(<ProjectsView />);

      expect(screen.getByTestId('view-layout')).toBeInTheDocument();
    });

    it('should render left and right panels', () => {
      render(<ProjectsView />);

      expect(screen.getByTestId('panel-left')).toBeInTheDocument();
      expect(screen.getByTestId('panel-right')).toBeInTheDocument();
    });

    it('should render ProjectNavigation', () => {
      render(<ProjectsView />);

      expect(screen.getByTestId('project-navigation')).toBeInTheDocument();
    });

    it('should render ProjectEditor', () => {
      render(<ProjectsView />);

      expect(screen.getByTestId('project-editor')).toBeInTheDocument();
    });

    it('should pass projects to ProjectNavigation', () => {
      const projects = [
        createMockProject({ id: 'p1', name: 'Project 1' }),
        createMockProject({ id: 'p2', name: 'Project 2' }),
      ];
      mockUseProjects = createMockUseProjects({ projects });
      vi.spyOn(UseProjectsModule, 'useProjects').mockReturnValue(mockUseProjects);

      render(<ProjectsView />);

      expect(screen.getByTestId('project-count')).toHaveTextContent('2');
    });
  });

  // --------------------------------------------------------------------------
  // Project Selection
  // --------------------------------------------------------------------------

  describe('Project Selection', () => {
    it('should select project when clicked in navigation', async () => {
      const projects = [createMockProject({ id: 'p1', name: 'Project 1' })];
      mockUseProjects = createMockUseProjects({ projects });
      vi.spyOn(UseProjectsModule, 'useProjects').mockReturnValue(mockUseProjects);

      render(<ProjectsView />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('select-p1'));
      });

      expect(screen.getByTestId('selected-id')).toHaveTextContent('p1');
      expect(screen.getByTestId('editor-project-name')).toHaveTextContent('Project 1');
    });

    it('should show no project selected initially', () => {
      render(<ProjectsView />);

      expect(screen.getByTestId('selected-id')).toHaveTextContent('none');
      expect(screen.getByTestId('editor-project-name')).toHaveTextContent('No project');
    });

    it('should show current project ID in navigation', () => {
      const currentProject = createMockProject({ id: 'current-1', name: 'Current' });
      mockUseProjects = createMockUseProjects({
        projects: [currentProject],
        currentProject,
      });
      vi.spyOn(UseProjectsModule, 'useProjects').mockReturnValue(mockUseProjects);

      render(<ProjectsView />);

      expect(screen.getByTestId('current-id')).toHaveTextContent('current-1');
    });
  });

  // --------------------------------------------------------------------------
  // Initial Project ID
  // --------------------------------------------------------------------------

  describe('Initial Project ID', () => {
    it('should select initial project if provided', async () => {
      const projects = [
        createMockProject({ id: 'p1', name: 'Project 1' }),
        createMockProject({ id: 'p2', name: 'Project 2' }),
      ];
      mockUseProjects = createMockUseProjects({ projects });
      vi.spyOn(UseProjectsModule, 'useProjects').mockReturnValue(mockUseProjects);

      render(<ProjectsView initialProjectId="p2" />);

      await waitFor(() => {
        expect(screen.getByTestId('selected-id')).toHaveTextContent('p2');
      });
    });

    it('should not select if initial project ID not found', async () => {
      const projects = [createMockProject({ id: 'p1', name: 'Project 1' })];
      mockUseProjects = createMockUseProjects({ projects });
      vi.spyOn(UseProjectsModule, 'useProjects').mockReturnValue(mockUseProjects);

      render(<ProjectsView initialProjectId="nonexistent" />);

      await waitFor(() => {
        expect(screen.getByTestId('selected-id')).toHaveTextContent('none');
      });
    });
  });

  // --------------------------------------------------------------------------
  // Project Creation
  // --------------------------------------------------------------------------

  describe('Project Creation', () => {
    it('should call createProject when create button clicked', async () => {
      render(<ProjectsView />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('create-btn'));
        vi.advanceTimersByTime(100);
      });

      expect(mockUseProjects.createProject).toHaveBeenCalled();
    });

    it('should show success toast on project creation', async () => {
      render(<ProjectsView />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('create-btn'));
        vi.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(mockToastContext.addToast).toHaveBeenCalledWith('New project created!', 'success');
      });
    });

    it('should select newly created project', async () => {
      const newProject = createMockProject({ id: 'new-id', name: 'New Project' });
      mockUseProjects = createMockUseProjects({
        createProject: vi.fn().mockResolvedValue(newProject),
      });
      vi.spyOn(UseProjectsModule, 'useProjects').mockReturnValue(mockUseProjects);

      render(<ProjectsView />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('create-btn'));
        vi.advanceTimersByTime(100);
      });

      // The project selection happens after a small timeout
      await waitFor(() => {
        expect(screen.getByTestId('editor-project-name')).toHaveTextContent('New Project');
      });
    });

    it('should show error toast on creation failure', async () => {
      mockUseProjects = createMockUseProjects({
        createProject: vi.fn().mockRejectedValue(new Error('Creation failed')),
      });
      vi.spyOn(UseProjectsModule, 'useProjects').mockReturnValue(mockUseProjects);

      render(<ProjectsView />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('create-btn'));
        vi.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(mockToastContext.addToast).toHaveBeenCalledWith('Failed to create project', 'error');
      });
    });
  });

  // --------------------------------------------------------------------------
  // Import Modal
  // --------------------------------------------------------------------------

  describe('Import Modal', () => {
    it('should open import modal when import button clicked', async () => {
      render(<ProjectsView />);

      expect(screen.queryByTestId('import-modal')).not.toBeInTheDocument();

      await act(async () => {
        // Import button is in ProjectEditor, not ProjectNavigation
        fireEvent.click(screen.getByTestId('editor-import-btn'));
      });

      expect(screen.getByTestId('import-modal')).toBeInTheDocument();
    });

    it('should close import modal on close', async () => {
      render(<ProjectsView />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('editor-import-btn'));
      });

      expect(screen.getByTestId('import-modal')).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(screen.getByTestId('import-close'));
      });

      expect(screen.queryByTestId('import-modal')).not.toBeInTheDocument();
    });

    it('should select imported project on success', async () => {
      const importedProject = createMockProject({ id: 'imported-project-id', name: 'Imported' });
      mockUseProjects = createMockUseProjects({
        projects: [importedProject],
      });
      vi.spyOn(UseProjectsModule, 'useProjects').mockReturnValue(mockUseProjects);

      render(<ProjectsView />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('editor-import-btn'));
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('import-success'));
      });

      expect(screen.queryByTestId('import-modal')).not.toBeInTheDocument();
      expect(screen.getByTestId('editor-project-name')).toHaveTextContent('Imported');
    });
  });

  // --------------------------------------------------------------------------
  // Export Modal
  // --------------------------------------------------------------------------

  describe('Export Modal', () => {
    it('should open export modal when export button clicked', async () => {
      const project = createMockProject({ id: 'p1', name: 'Project 1' });
      mockUseProjects = createMockUseProjects({ projects: [project] });
      vi.spyOn(UseProjectsModule, 'useProjects').mockReturnValue(mockUseProjects);

      render(<ProjectsView />);

      // First select the project
      await act(async () => {
        fireEvent.click(screen.getByTestId('select-p1'));
      });

      // Then export
      await act(async () => {
        fireEvent.click(screen.getByTestId('export-btn'));
      });

      expect(screen.getByTestId('export-modal')).toBeInTheDocument();
      expect(screen.getByTestId('export-modal-project')).toHaveTextContent('Project 1');
    });

    it('should close export modal on close', async () => {
      const project = createMockProject({ id: 'p1', name: 'Project 1' });
      mockUseProjects = createMockUseProjects({ projects: [project] });
      vi.spyOn(UseProjectsModule, 'useProjects').mockReturnValue(mockUseProjects);

      render(<ProjectsView />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('select-p1'));
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('export-btn'));
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('export-close'));
      });

      expect(screen.queryByTestId('export-modal')).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Delete Modal
  // --------------------------------------------------------------------------

  describe('Delete Modal', () => {
    it('should open delete modal when delete button clicked', async () => {
      const project = createMockProject({ id: 'p1', name: 'Project 1' });
      mockUseProjects = createMockUseProjects({ projects: [project] });
      vi.spyOn(UseProjectsModule, 'useProjects').mockReturnValue(mockUseProjects);

      render(<ProjectsView />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('delete-btn'));
      });

      expect(screen.getByTestId('delete-modal')).toBeInTheDocument();
      expect(screen.getByTestId('delete-modal-project')).toHaveTextContent('Project 1');
    });

    it('should close delete modal on cancel', async () => {
      const project = createMockProject({ id: 'p1', name: 'Project 1' });
      mockUseProjects = createMockUseProjects({ projects: [project] });
      vi.spyOn(UseProjectsModule, 'useProjects').mockReturnValue(mockUseProjects);

      render(<ProjectsView />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('delete-btn'));
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('delete-cancel'));
      });

      expect(screen.queryByTestId('delete-modal')).not.toBeInTheDocument();
    });

    it('should clear selection when selected project is deleted', async () => {
      const project = createMockProject({ id: 'p1', name: 'Project 1' });
      mockUseProjects = createMockUseProjects({ projects: [project] });
      vi.spyOn(UseProjectsModule, 'useProjects').mockReturnValue(mockUseProjects);

      render(<ProjectsView />);

      // Select the project first
      await act(async () => {
        fireEvent.click(screen.getByTestId('select-p1'));
      });

      expect(screen.getByTestId('selected-id')).toHaveTextContent('p1');

      // Open delete modal
      await act(async () => {
        fireEvent.click(screen.getByTestId('delete-btn'));
      });

      // Confirm deletion
      await act(async () => {
        fireEvent.click(screen.getByTestId('delete-confirm'));
      });

      expect(screen.queryByTestId('delete-modal')).not.toBeInTheDocument();
      expect(screen.getByTestId('selected-id')).toHaveTextContent('none');
    });
  });

  // --------------------------------------------------------------------------
  // Project Duplication
  // --------------------------------------------------------------------------

  describe('Project Duplication', () => {
    it('should call duplicateProject when duplicate button clicked', async () => {
      const project = createMockProject({ id: 'p1', name: 'Project 1' });
      mockUseProjects = createMockUseProjects({ projects: [project] });
      vi.spyOn(UseProjectsModule, 'useProjects').mockReturnValue(mockUseProjects);

      render(<ProjectsView />);

      // Select project
      await act(async () => {
        fireEvent.click(screen.getByTestId('select-p1'));
      });

      // Duplicate
      await act(async () => {
        fireEvent.click(screen.getByTestId('duplicate-btn'));
      });

      expect(mockUseProjects.duplicateProject).toHaveBeenCalledWith('p1');
    });

    it('should select duplicated project', async () => {
      const project = createMockProject({ id: 'p1', name: 'Project 1' });
      const duplicatedProject = createMockProject({ id: 'dup-1', name: 'Project 1 (Copy)' });
      mockUseProjects = createMockUseProjects({
        projects: [project],
        duplicateProject: vi.fn().mockResolvedValue(duplicatedProject),
      });
      vi.spyOn(UseProjectsModule, 'useProjects').mockReturnValue(mockUseProjects);

      render(<ProjectsView />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('select-p1'));
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('duplicate-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('editor-project-name')).toHaveTextContent('Project 1 (Copy)');
      });
    });
  });

  // --------------------------------------------------------------------------
  // Icon Management Modal
  // --------------------------------------------------------------------------

  describe('Icon Management Modal', () => {
    it('should show alert when no current project', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(<ProjectsView />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('icon-mgmt-btn'));
      });

      expect(alertSpy).toHaveBeenCalledWith(
        'Please create or activate a project first to manage custom icons'
      );
      expect(screen.queryByTestId('icon-modal')).not.toBeInTheDocument();

      alertSpy.mockRestore();
    });

    it('should open icon modal when current project exists', async () => {
      const currentProject = createMockProject({ id: 'current', name: 'Current Project' });
      mockUseProjects = createMockUseProjects({ currentProject });
      vi.spyOn(UseProjectsModule, 'useProjects').mockReturnValue(mockUseProjects);

      render(<ProjectsView />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('icon-mgmt-btn'));
      });

      expect(screen.getByTestId('icon-modal')).toBeInTheDocument();
    });

    it('should close icon modal on close', async () => {
      const currentProject = createMockProject({ id: 'current', name: 'Current Project' });
      mockUseProjects = createMockUseProjects({ currentProject });
      vi.spyOn(UseProjectsModule, 'useProjects').mockReturnValue(mockUseProjects);

      render(<ProjectsView />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('icon-mgmt-btn'));
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('icon-close'));
      });

      expect(screen.queryByTestId('icon-modal')).not.toBeInTheDocument();
    });

    it('should call updateProject when icons updated', async () => {
      const currentProject = createMockProject({
        id: 'current',
        name: 'Current Project',
        state: createMockProjectState({ customIcons: [] }),
      });
      mockUseProjects = createMockUseProjects({ currentProject });
      vi.spyOn(UseProjectsModule, 'useProjects').mockReturnValue(mockUseProjects);

      render(<ProjectsView />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('icon-mgmt-btn'));
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('icon-update'));
      });

      expect(mockUseProjects.updateProject).toHaveBeenCalledWith('current', {
        state: expect.objectContaining({
          customIcons: [{ id: 'new-icon' }],
        }),
      });
    });
  });

  // --------------------------------------------------------------------------
  // Last Project Loading
  // --------------------------------------------------------------------------

  describe('Last Project Loading', () => {
    it('should show last project in editor', () => {
      const projects = [
        createMockProject({ id: 'current', name: 'Current', lastAccessedAt: Date.now() }),
        createMockProject({ id: 'last', name: 'Last Used', lastAccessedAt: Date.now() - 5000 }),
      ];
      const currentProject = projects[0];
      mockUseProjects = createMockUseProjects({ projects, currentProject });
      vi.spyOn(UseProjectsModule, 'useProjects').mockReturnValue(mockUseProjects);

      render(<ProjectsView />);

      // Last project should be the one that's not current
      expect(screen.getByTestId('last-project-name')).toHaveTextContent('Last Used');
    });

    it('should activate last project when load last clicked', async () => {
      const projects = [
        createMockProject({ id: 'current', name: 'Current', lastAccessedAt: Date.now() }),
        createMockProject({ id: 'last', name: 'Last Used', lastAccessedAt: Date.now() - 5000 }),
      ];
      const currentProject = projects[0];
      mockUseProjects = createMockUseProjects({ projects, currentProject });
      vi.spyOn(UseProjectsModule, 'useProjects').mockReturnValue(mockUseProjects);

      render(<ProjectsView />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('load-last-btn'));
      });

      expect(mockUseProjects.activateProject).toHaveBeenCalledWith('last');
    });

    it('should show success toast on load last project', async () => {
      const projects = [
        createMockProject({ id: 'current', name: 'Current', lastAccessedAt: Date.now() }),
        createMockProject({ id: 'last', name: 'Last Used', lastAccessedAt: Date.now() - 5000 }),
      ];
      const currentProject = projects[0];
      mockUseProjects = createMockUseProjects({ projects, currentProject });
      vi.spyOn(UseProjectsModule, 'useProjects').mockReturnValue(mockUseProjects);

      render(<ProjectsView />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('load-last-btn'));
      });

      await waitFor(() => {
        expect(mockToastContext.addToast).toHaveBeenCalledWith(
          'Project "Last Used" is now active!',
          'success'
        );
      });
    });

    it('should show error toast if activation fails', async () => {
      const projects = [
        createMockProject({ id: 'current', name: 'Current', lastAccessedAt: Date.now() }),
        createMockProject({ id: 'last', name: 'Last Used', lastAccessedAt: Date.now() - 5000 }),
      ];
      const currentProject = projects[0];
      mockUseProjects = createMockUseProjects({
        projects,
        currentProject,
        activateProject: vi.fn().mockRejectedValue(new Error('Activation failed')),
      });
      vi.spyOn(UseProjectsModule, 'useProjects').mockReturnValue(mockUseProjects);

      render(<ProjectsView />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('load-last-btn'));
      });

      await waitFor(() => {
        expect(mockToastContext.addToast).toHaveBeenCalledWith(
          'Failed to activate project',
          'error'
        );
      });
    });
  });

  // --------------------------------------------------------------------------
  // Selected Project Sync
  // --------------------------------------------------------------------------

  describe('Selected Project Sync', () => {
    it('should update selected project when projects list changes', async () => {
      const project = createMockProject({ id: 'p1', name: 'Original Name' });
      mockUseProjects = createMockUseProjects({ projects: [project] });
      vi.spyOn(UseProjectsModule, 'useProjects').mockReturnValue(mockUseProjects);

      const { rerender } = render(<ProjectsView />);

      // Select project
      await act(async () => {
        fireEvent.click(screen.getByTestId('select-p1'));
      });

      expect(screen.getByTestId('editor-project-name')).toHaveTextContent('Original Name');

      // Update project in list
      const updatedProject = createMockProject({ id: 'p1', name: 'Updated Name' });
      mockUseProjects = createMockUseProjects({ projects: [updatedProject] });
      vi.spyOn(UseProjectsModule, 'useProjects').mockReturnValue(mockUseProjects);

      rerender(<ProjectsView />);

      await waitFor(() => {
        expect(screen.getByTestId('editor-project-name')).toHaveTextContent('Updated Name');
      });
    });

    // Note: The component deliberately doesn't clear selection when a project
    // is removed from the list (see component comment about race conditions with
    // newly created projects). Deletion is handled explicitly via the delete modal.
    // See "should clear selection when selected project is deleted" test above.
  });
});
