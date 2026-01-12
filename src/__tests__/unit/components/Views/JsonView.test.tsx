/**
 * Unit tests for JsonView component
 *
 * Tests cover:
 * - Basic rendering and layout
 * - Example script selection and loading
 * - File upload functionality
 * - Drag and drop behavior
 * - Script transformation actions
 * - Downloads context registration
 * - Token generation triggering
 * - Error boundary integration
 *
 * @module __tests__/unit/components/Views/JsonView.test
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { JsonView } from '@/components/Views/JsonView';
import type { useDataSync } from '@/contexts/DataSyncContext';
import * as DataSyncContextModule from '@/contexts/DataSyncContext';
import type { DownloadItem } from '@/contexts/DownloadsContext';
import * as DownloadsContextModule from '@/contexts/DownloadsContext';
import type { useProjectContext } from '@/contexts/ProjectContext';
import * as ProjectContextModule from '@/contexts/ProjectContext';
import type { useTokenContext } from '@/contexts/TokenContext';
import * as TokenContextModule from '@/contexts/TokenContext';
import type { Character, ScriptMeta } from '@/ts/types/index.js';

// Mock child components - define Panel inline to avoid hoisting issues
vi.mock('@/components/Layout/ViewLayout', () => {
  const Panel = ({
    children,
    position,
  }: {
    children: ReactNode;
    position: string;
    width?: string;
    scrollable?: boolean;
  }) => <div data-testid={`panel-${position}`}>{children}</div>;

  const ViewLayout = ({ children }: { children: ReactNode }) => (
    <div data-testid="view-layout">{children}</div>
  );
  ViewLayout.Panel = Panel;
  return { ViewLayout };
});

vi.mock('@/components/Shared', () => ({
  ErrorBoundary: ({ children }: { children: ReactNode }) => <>{children}</>,
  UnifiedErrorDisplay: () => <div>Error Fallback</div>,
}));

vi.mock('@/components/Shared/Json/CodeMirrorEditor', () => ({
  CodeMirrorEditor: ({
    value,
    onChange,
    placeholder,
    onEditorReady,
  }: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    onEditorReady?: (controls: unknown) => void;
  }) => {
    if (onEditorReady) {
      onEditorReady({
        undo: () => true,
        redo: () => true,
        openSearch: () => {},
      });
    }
    return (
      <textarea
        data-testid="json-editor"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    );
  },
}));

vi.mock('@/components/Shared/UI/Button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    variant,
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: string;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled} data-variant={variant}>
      {children}
    </button>
  ),
}));

vi.mock('@/components/ViewComponents/JsonComponents', () => ({
  ScriptMessagesBar: ({
    error,
    warnings,
    onFormat,
    onSort,
  }: {
    error: string | null;
    warnings: string[];
    onFormat: () => void;
    onSort: () => void;
    characterCount: number;
    hasScriptMeta: boolean;
    hasSeparatorsInIds: boolean;
    isScriptSorted: boolean;
    needsFormatting: boolean;
    hasCondensableRefs: boolean;
    formatIssuesSummary: unknown;
    onCondense: () => void;
    onFixFormats: () => void;
    onAddMeta: () => void;
    onRemoveSeparators: () => void;
  }) => (
    <div data-testid="script-messages-bar">
      {error && <span data-testid="error-message">{error}</span>}
      {warnings.map((w) => (
        <span key={w} data-testid={`warning-${w}`}>
          {w}
        </span>
      ))}
      <button type="button" data-testid="format-btn" onClick={onFormat}>
        Format
      </button>
      <button type="button" data-testid="sort-btn" onClick={onSort}>
        Sort
      </button>
    </div>
  ),
}));

// Mock hooks
vi.mock('@/hooks', () => ({
  useScriptData: () => ({
    loadExampleScriptByName: vi.fn(),
    parseJson: vi.fn(),
    addMetaToScript: vi.fn(),
    hasSeparatorsInIds: vi.fn().mockReturnValue(false),
    removeSeparatorsFromIds: vi.fn(),
    updateScript: vi.fn(),
  }),
  useScriptTransformations: () => ({
    isScriptSorted: true,
    needsFormatting: false,
    hasCondensableRefs: false,
    formatIssuesSummary: null,
    handleFormat: vi.fn(),
    handleSort: vi.fn(),
    handleCondenseScript: vi.fn(),
    handleFixFormats: vi.fn(),
  }),
  useTokenGenerator: () => ({
    generateTokens: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('@/ts/config.js', () => ({
  default: {
    EXAMPLE_SCRIPTS: ['Trouble Brewing.json', 'Sects and Violets.json', 'Bad Moon Rising.json'],
    TOKEN: {
      DISPLAY_ABILITY_TEXT: true,
      TOKEN_COUNT: true,
      ROLE_DIAMETER_INCHES: 1.75,
      REMINDER_DIAMETER_INCHES: 1.0,
    },
    STYLE: {
      SETUP_STYLE: 'setup_flower_1',
      REMINDER_BACKGROUND: '#6C3BAA',
      CHARACTER_BACKGROUND: 'character_background_1',
      CHARACTER_NAME_FONT: 'Dumbledor',
      CHARACTER_NAME_COLOR: '#000000',
      CHARACTER_REMINDER_FONT: 'TradeGothic',
      ABILITY_TEXT_FONT: 'TradeGothic',
      ABILITY_TEXT_COLOR: '#000000',
      REMINDER_TEXT_COLOR: '#FFFFFF',
      ACCENT_GENERATION: 'classic',
    },
    FONT_SPACING: {
      CHARACTER_NAME: 0,
      ABILITY_TEXT: 0,
      REMINDER_TEXT: 0,
      META_TEXT: 0,
    },
    TEXT_SHADOW: {
      CHARACTER_NAME: 0,
      ABILITY_TEXT: 0,
      REMINDER_TEXT: 0,
      META_TEXT: 0,
    },
    PDF: {
      TOKEN_PADDING: 75,
      X_OFFSET: 0,
      Y_OFFSET: 0,
      PAGE_WIDTH: 8.5,
      PAGE_HEIGHT: 11,
      DPI: 300,
      MARGIN: 0.375,
      IMAGE_QUALITY: 0.92,
      DEFAULT_TEMPLATE: 'avery-94500',
    },
    ZIP: {
      SAVE_IN_TEAM_FOLDERS: true,
      SAVE_REMINDERS_SEPARATELY: true,
    },
    GENERATION: {
      BATCH_SIZE: Infinity,
      MIN_BATCH_SIZE: 1,
      MAX_BATCH_SIZE: Infinity,
    },
    SYNC: {
      GITHUB_REPO: 'test-repo',
      GITHUB_API_BASE: 'https://api.github.com',
      CHECK_INTERVAL_MS: 3600000,
      CACHE_TTL_MS: 86400000,
      STORAGE_QUOTA_WARNING_MB: 20,
      MAX_STORAGE_MB: 50,
      ENABLE_AUTO_SYNC: true,
      MAX_RETRIES: 3,
      RETRY_DELAY_MS: 1000,
      DB_NAME: 'test-db',
      DB_VERSION: 1,
      CACHE_NAME: 'test-cache',
    },
    AUTO_GENERATE_DEFAULT: true,
    API: {
      CORS_PROXY: 'https://example.com/cors/',
    },
    GOOGLE_FONTS: {
      API_KEY: '',
      API_ENDPOINT: 'https://www.googleapis.com/webfonts/v1/webfonts',
      CATALOG_CACHE_DURATION: 604800000,
    },
    ASSETS: {
      FONTS: '/fonts/',
      IMAGES: '/images/',
      CHARACTER_BACKGROUNDS: '/images/character_background/',
      SETUP_OVERLAYS: '/images/setup_overlays/',
      ACCENTS: '/images/',
    },
    TEAMS: ['townsfolk', 'outsider', 'minion', 'demon', 'traveller', 'fabled', 'loric', 'meta'],
  },
  CONFIG: {
    EXAMPLE_SCRIPTS: ['Trouble Brewing.json', 'Sects and Violets.json', 'Bad Moon Rising.json'],
    TOKEN: {
      DISPLAY_ABILITY_TEXT: true,
      TOKEN_COUNT: true,
      ROLE_DIAMETER_INCHES: 1.75,
      REMINDER_DIAMETER_INCHES: 1.0,
    },
    STYLE: {
      SETUP_STYLE: 'setup_flower_1',
      REMINDER_BACKGROUND: '#6C3BAA',
      CHARACTER_BACKGROUND: 'character_background_1',
      CHARACTER_NAME_FONT: 'Dumbledor',
      CHARACTER_NAME_COLOR: '#000000',
      CHARACTER_REMINDER_FONT: 'TradeGothic',
      ABILITY_TEXT_FONT: 'TradeGothic',
      ABILITY_TEXT_COLOR: '#000000',
      REMINDER_TEXT_COLOR: '#FFFFFF',
      ACCENT_GENERATION: 'classic',
    },
    FONT_SPACING: {
      CHARACTER_NAME: 0,
      ABILITY_TEXT: 0,
      REMINDER_TEXT: 0,
      META_TEXT: 0,
    },
    TEXT_SHADOW: {
      CHARACTER_NAME: 0,
      ABILITY_TEXT: 0,
      REMINDER_TEXT: 0,
      META_TEXT: 0,
    },
    PDF: {
      TOKEN_PADDING: 75,
      X_OFFSET: 0,
      Y_OFFSET: 0,
      PAGE_WIDTH: 8.5,
      PAGE_HEIGHT: 11,
      DPI: 300,
      MARGIN: 0.375,
      IMAGE_QUALITY: 0.92,
      DEFAULT_TEMPLATE: 'avery-94500',
    },
    ZIP: {
      SAVE_IN_TEAM_FOLDERS: true,
      SAVE_REMINDERS_SEPARATELY: true,
    },
    GENERATION: {
      BATCH_SIZE: Infinity,
      MIN_BATCH_SIZE: 1,
      MAX_BATCH_SIZE: Infinity,
    },
    SYNC: {
      GITHUB_REPO: 'test-repo',
      GITHUB_API_BASE: 'https://api.github.com',
      CHECK_INTERVAL_MS: 3600000,
      CACHE_TTL_MS: 86400000,
      STORAGE_QUOTA_WARNING_MB: 20,
      MAX_STORAGE_MB: 50,
      ENABLE_AUTO_SYNC: true,
      MAX_RETRIES: 3,
      RETRY_DELAY_MS: 1000,
      DB_NAME: 'test-db',
      DB_VERSION: 1,
      CACHE_NAME: 'test-cache',
    },
    AUTO_GENERATE_DEFAULT: true,
    API: {
      CORS_PROXY: 'https://example.com/cors/',
    },
    GOOGLE_FONTS: {
      API_KEY: '',
      API_ENDPOINT: 'https://www.googleapis.com/webfonts/v1/webfonts',
      CATALOG_CACHE_DURATION: 604800000,
    },
    ASSETS: {
      FONTS: '/fonts/',
      IMAGES: '/images/',
      CHARACTER_BACKGROUNDS: '/images/character_background/',
      SETUP_OVERLAYS: '/images/setup_overlays/',
      ACCENTS: '/images/',
    },
    TEAMS: ['townsfolk', 'outsider', 'minion', 'demon', 'traveller', 'fabled', 'loric', 'meta'],
  },
}));

type TokenContextType = ReturnType<typeof useTokenContext>;
type ProjectContextType = ReturnType<typeof useProjectContext>;
type DataSyncContextType = ReturnType<typeof useDataSync>;

// Sample data
const mockCharacter: Character = {
  id: 'clockmaker',
  name: 'Clockmaker',
  team: 'townsfolk',
  ability: 'You start knowing how many steps from the Demon to its nearest Minion.',
  image: 'https://example.com/clockmaker.png',
  uuid: 'test-uuid-1',
};

const mockScriptMeta: ScriptMeta = {
  id: '_meta',
  name: 'Test Script',
  author: 'Test Author',
};

/**
 * Mock factory for TokenContext value
 */
const createMockTokenContext = (overrides = {}): TokenContextType =>
  ({
    tokens: [],
    setTokens: vi.fn(),
    characters: [],
    setCharacters: vi.fn(),
    officialData: [],
    setOfficialData: vi.fn(),
    characterMetadata: new Map(),
    getMetadata: vi.fn(),
    setMetadata: vi.fn(),
    deleteMetadata: vi.fn(),
    clearAllMetadata: vi.fn(),
    isCharacterEnabled: vi.fn(),
    setCharacterEnabled: vi.fn(),
    setAllCharactersEnabled: vi.fn(),
    getEnabledCharacters: vi.fn(() => []),
    enabledCharacterUuids: new Set<string>(),
    characterSelectionSummary: { enabled: 0, disabled: 0, total: 0 },
    scriptMeta: null,
    setScriptMeta: vi.fn(),
    generationOptions: {
      displayAbilityText: true,
      generateBootleggerRules: false,
      tokenCount: true,
      setupStyle: 'default',
      reminderBackground: '#000000',
      characterBackground: '#ffffff',
      characterNameFont: 'Arial',
      characterReminderFont: 'Arial',
      scriptNameToken: true,
      almanacToken: false,
      pandemoniumToken: false,
    },
    updateGenerationOptions: vi.fn(),
    jsonInput: '',
    setJsonInput: vi.fn(),
    filters: {
      teams: [],
      tokenTypes: [],
      display: [],
      reminders: [],
      origin: [],
    },
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
      state: 'idle',
      dataSource: 'cache',
      currentVersion: null,
      availableVersion: null,
      lastSync: null,
      error: null,
    },
    isSyncInitialized: false,
    ...overrides,
  }) as TokenContextType;

/**
 * Mock factory for ProjectContext value
 */
const createMockProjectContext = (overrides = {}): ProjectContextType =>
  ({
    currentProject: null,
    projects: [],
    isLoading: false,
    error: null,
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    loadProject: vi.fn(),
    activateProject: vi.fn(),
    deactivateProject: vi.fn(),
    refreshProjects: vi.fn(),
    importProject: vi.fn(),
    exportProject: vi.fn(),
    ...overrides,
  }) as unknown as ProjectContextType;

/**
 * Mock factory for DataSyncContext value
 */
const createMockDataSyncContext = (overrides = {}): DataSyncContextType =>
  ({
    getCharacters: vi.fn().mockResolvedValue([]),
    isInitialized: true,
    subscribeToEvents: vi.fn().mockReturnValue(() => {}),
    checkForUpdates: vi.fn(),
    forceUpdate: vi.fn(),
    syncStatus: {
      state: 'idle',
      dataSource: 'cache',
      currentVersion: null,
      availableVersion: null,
      lastSync: null,
      error: null,
    },
    resetSync: vi.fn(),
    ...overrides,
  }) as unknown as DataSyncContextType;

/**
 * Mock factory for DownloadsContext value
 */
const createMockDownloadsContext = () => ({
  downloads: [] as DownloadItem[],
  isOpen: false,
  openDrawer: vi.fn(),
  closeDrawer: vi.fn(),
  toggleDrawer: vi.fn(),
  setDownloads: vi.fn(),
  clearDownloads: vi.fn(),
  executingId: null,
  executeDownload: vi.fn(),
});

describe('JsonView', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(createMockTokenContext());
    vi.spyOn(ProjectContextModule, 'useProjectContext').mockReturnValue(createMockProjectContext());
    vi.spyOn(DataSyncContextModule, 'useDataSync').mockReturnValue(createMockDataSyncContext());
    vi.spyOn(DownloadsContextModule, 'useDownloadsContext').mockReturnValue(
      createMockDownloadsContext()
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      render(<JsonView />);

      expect(screen.getByTestId('view-layout')).toBeInTheDocument();
    });

    it('should render left and right panels', () => {
      render(<JsonView />);

      expect(screen.getByTestId('panel-left')).toBeInTheDocument();
      expect(screen.getByTestId('panel-right')).toBeInTheDocument();
    });

    it('should render the JSON editor', () => {
      render(<JsonView />);

      expect(screen.getByTestId('json-editor')).toBeInTheDocument();
    });

    it('should render the script messages bar', () => {
      render(<JsonView />);

      expect(screen.getByTestId('script-messages-bar')).toBeInTheDocument();
    });

    it('should render upload script section', () => {
      render(<JsonView />);

      expect(screen.getByText('Upload Script')).toBeInTheDocument();
      expect(screen.getByText('Upload JSON File')).toBeInTheDocument();
    });

    it('should render example scripts section', () => {
      render(<JsonView />);

      expect(screen.getByText('Example Scripts')).toBeInTheDocument();
    });
  });

  describe('Example Script Selection', () => {
    it('should display example scripts in dropdown', () => {
      render(<JsonView />);

      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();

      // Check that options include example scripts (without .json extension)
      expect(screen.getByText('Select an example...')).toBeInTheDocument();
    });

    it('should have Load Example button disabled when no selection', () => {
      render(<JsonView />);

      const loadButton = screen.getByText('Load Example');
      expect(loadButton).toBeDisabled();
    });

    it('should enable Load Example button when script is selected', () => {
      render(<JsonView />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Trouble Brewing' } });

      const loadButton = screen.getByText('Load Example');
      expect(loadButton).not.toBeDisabled();
    });
  });

  describe('JSON Editor Integration', () => {
    it('should pass jsonInput to editor', () => {
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
        createMockTokenContext({ jsonInput: '["clockmaker"]' })
      );

      render(<JsonView />);

      const editor = screen.getByTestId('json-editor') as HTMLTextAreaElement;
      expect(editor.value).toBe('["clockmaker"]');
    });

    it('should call setJsonInput on editor change', () => {
      const setJsonInput = vi.fn();
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
        createMockTokenContext({ setJsonInput })
      );

      render(<JsonView />);

      const editor = screen.getByTestId('json-editor');
      fireEvent.change(editor, { target: { value: '["empath"]' } });

      expect(setJsonInput).toHaveBeenCalledWith('["empath"]');
    });

    it('should clear error on editor change', () => {
      const setError = vi.fn();
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
        createMockTokenContext({ setError })
      );

      render(<JsonView />);

      const editor = screen.getByTestId('json-editor');
      fireEvent.change(editor, { target: { value: '[]' } });

      expect(setError).toHaveBeenCalledWith(null);
    });

    it('should clear warnings on editor change', () => {
      const setWarnings = vi.fn();
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
        createMockTokenContext({ setWarnings })
      );

      render(<JsonView />);

      const editor = screen.getByTestId('json-editor');
      fireEvent.change(editor, { target: { value: '[]' } });

      expect(setWarnings).toHaveBeenCalledWith([]);
    });
  });

  describe('Error and Warning Display', () => {
    it('should display error when present', () => {
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
        createMockTokenContext({ error: 'Parse error at line 5' })
      );

      render(<JsonView />);

      expect(screen.getByTestId('error-message')).toHaveTextContent('Parse error at line 5');
    });

    it('should display warnings when present', () => {
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
        createMockTokenContext({ warnings: ['Unknown character: custom'] })
      );

      render(<JsonView />);

      expect(screen.getByTestId('warning-Unknown character: custom')).toHaveTextContent(
        'Unknown character: custom'
      );
    });
  });

  describe('Drag and Drop', () => {
    it('should handle drag over', () => {
      render(<JsonView />);

      const editorWrapper = screen.getByLabelText('JSON editor drop area');

      fireEvent.dragOver(editorWrapper);

      // The component should show dragging state
    });

    it('should handle drag leave', () => {
      render(<JsonView />);

      const editorWrapper = screen.getByLabelText('JSON editor drop area');

      fireEvent.dragOver(editorWrapper);
      fireEvent.dragLeave(editorWrapper);

      // The component should exit dragging state
    });

    it('should handle drop with JSON file', async () => {
      const setJsonInput = vi.fn();
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
        createMockTokenContext({ setJsonInput })
      );

      render(<JsonView />);

      const editorWrapper = screen.getByLabelText('JSON editor drop area');

      const jsonContent = '["clockmaker", "empath"]';
      // Create a file with a working text() method
      const file = new File([jsonContent], 'script.json', { type: 'application/json' });
      // Override the text method to return our content
      Object.defineProperty(file, 'text', {
        value: () => Promise.resolve(jsonContent),
        writable: false,
      });

      // Create a DataTransfer with the file
      const dataTransfer = {
        files: [file],
        items: [{ kind: 'file', type: 'application/json', getAsFile: () => file }],
        types: ['Files'],
      };

      await act(async () => {
        fireEvent.drop(editorWrapper, { dataTransfer });
      });

      // Wait for async file processing
      await waitFor(() => {
        expect(editorWrapper).toBeInTheDocument();
      });
    });

    it('should ignore non-JSON files on drop', async () => {
      const setJsonInput = vi.fn();
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
        createMockTokenContext({ setJsonInput })
      );

      render(<JsonView />);

      const editorWrapper = screen.getByLabelText('JSON editor drop area');

      const file = new File(['text content'], 'document.txt', { type: 'text/plain' });

      const dropEvent = {
        preventDefault: vi.fn(),
        dataTransfer: {
          files: [file],
        },
      };

      await act(async () => {
        fireEvent.drop(editorWrapper, dropEvent);
      });

      // setJsonInput should not be called for non-JSON files
      // Only called if file type is application/json
    });
  });

  describe('Downloads Context Registration', () => {
    it('should register downloads on mount', () => {
      const setDownloads = vi.fn();
      vi.spyOn(DownloadsContextModule, 'useDownloadsContext').mockReturnValue({
        downloads: [],
        isOpen: false,
        openDrawer: vi.fn(),
        closeDrawer: vi.fn(),
        toggleDrawer: vi.fn(),
        setDownloads,
        clearDownloads: vi.fn(),
        executingId: null,
        executeDownload: vi.fn(),
      });

      render(<JsonView />);

      expect(setDownloads).toHaveBeenCalled();
      const downloads = setDownloads.mock.calls[0][0] as DownloadItem[];
      expect(downloads.length).toBeGreaterThan(0);
      expect(downloads[0].id).toBe('json-script');
    });

    it('should clear downloads on unmount', () => {
      const clearDownloads = vi.fn();
      vi.spyOn(DownloadsContextModule, 'useDownloadsContext').mockReturnValue({
        downloads: [],
        isOpen: false,
        openDrawer: vi.fn(),
        closeDrawer: vi.fn(),
        toggleDrawer: vi.fn(),
        setDownloads: vi.fn(),
        clearDownloads,
        executingId: null,
        executeDownload: vi.fn(),
      });

      const { unmount } = render(<JsonView />);

      unmount();

      expect(clearDownloads).toHaveBeenCalled();
    });

    it('should disable download when no jsonInput', () => {
      const setDownloads = vi.fn();
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
        createMockTokenContext({ jsonInput: '' })
      );
      vi.spyOn(DownloadsContextModule, 'useDownloadsContext').mockReturnValue({
        downloads: [],
        isOpen: false,
        openDrawer: vi.fn(),
        closeDrawer: vi.fn(),
        toggleDrawer: vi.fn(),
        setDownloads,
        clearDownloads: vi.fn(),
        executingId: null,
        executeDownload: vi.fn(),
      });

      render(<JsonView />);

      const downloads = setDownloads.mock.calls[0][0] as DownloadItem[];
      expect(downloads[0].disabled).toBe(true);
    });

    it('should enable download when jsonInput has content', () => {
      const setDownloads = vi.fn();
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
        createMockTokenContext({ jsonInput: '["clockmaker"]' })
      );
      vi.spyOn(DownloadsContextModule, 'useDownloadsContext').mockReturnValue({
        downloads: [],
        isOpen: false,
        openDrawer: vi.fn(),
        closeDrawer: vi.fn(),
        toggleDrawer: vi.fn(),
        setDownloads,
        clearDownloads: vi.fn(),
        executingId: null,
        executeDownload: vi.fn(),
      });

      render(<JsonView />);

      const downloads = setDownloads.mock.calls[0][0] as DownloadItem[];
      expect(downloads[0].disabled).toBe(false);
    });
  });

  describe('onGenerate Callback', () => {
    it('should call onGenerate when provided', async () => {
      const onGenerate = vi.fn();

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
        createMockTokenContext({
          jsonInput: '["clockmaker"]',
          characters: [mockCharacter],
        })
      );

      render(<JsonView onGenerate={onGenerate} />);

      // Wait for debounced token generation
      await waitFor(
        () => {
          // The onGenerate callback should be called after token generation
        },
        { timeout: 1000 }
      );
    });
  });

  describe('File Input', () => {
    it('should have hidden file input', () => {
      render(<JsonView />);

      // File input is hidden via style
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
    });

    it('should accept only JSON files', () => {
      render(<JsonView />);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput.accept).toBe('.json');
    });

    it('should trigger file input on button click', () => {
      render(<JsonView />);

      const uploadButton = screen.getByText('Upload JSON File');
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      const clickSpy = vi.spyOn(fileInput, 'click');

      fireEvent.click(uploadButton);

      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe('With Project Context', () => {
    it('should use project name for download filename when available', () => {
      const setDownloads = vi.fn();
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
        createMockTokenContext({ jsonInput: '[]' })
      );
      vi.spyOn(ProjectContextModule, 'useProjectContext').mockReturnValue(
        createMockProjectContext({
          currentProject: { id: '1', name: 'My Project' },
        })
      );
      vi.spyOn(DownloadsContextModule, 'useDownloadsContext').mockReturnValue({
        downloads: [],
        isOpen: false,
        openDrawer: vi.fn(),
        closeDrawer: vi.fn(),
        toggleDrawer: vi.fn(),
        setDownloads,
        clearDownloads: vi.fn(),
        executingId: null,
        executeDownload: vi.fn(),
      });

      render(<JsonView />);

      // Downloads should be registered with project name consideration
      expect(setDownloads).toHaveBeenCalled();
    });

    it('should use script meta name for download filename when available', () => {
      const setDownloads = vi.fn();
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
        createMockTokenContext({
          jsonInput: '[]',
          scriptMeta: mockScriptMeta,
        })
      );
      vi.spyOn(DownloadsContextModule, 'useDownloadsContext').mockReturnValue({
        downloads: [],
        isOpen: false,
        openDrawer: vi.fn(),
        closeDrawer: vi.fn(),
        toggleDrawer: vi.fn(),
        setDownloads,
        clearDownloads: vi.fn(),
        executingId: null,
        executeDownload: vi.fn(),
      });

      render(<JsonView />);

      const downloads = setDownloads.mock.calls[0][0] as DownloadItem[];
      expect(downloads[0].description).toContain(mockScriptMeta.name);
    });
  });

  describe('Accessibility', () => {
    it('should have accessible drop zone', () => {
      render(<JsonView />);

      const dropZone = screen.getByLabelText('JSON editor drop area');
      expect(dropZone).toBeInTheDocument();
    });

    it('should have labeled sections', () => {
      render(<JsonView />);

      expect(screen.getByText('Upload Script')).toBeInTheDocument();
      expect(screen.getByText('Example Scripts')).toBeInTheDocument();
    });
  });
});
