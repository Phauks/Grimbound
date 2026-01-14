/**
 * Unit tests for CharactersView component
 *
 * Tests cover:
 * - Basic rendering and layout
 * - Character selection (initial token, external UUID, first character)
 * - Meta token selection and display
 * - Character editor integration
 * - Token preview cache integration
 * - Character operations (add, delete, duplicate)
 * - Official character drawer
 * - Jinx preview functionality
 * - External UUID sync
 * - Character selection callback
 *
 * @module __tests__/unit/components/Views/CharactersView.test
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CharactersView } from '@/components/Views/CharactersView';
import * as DownloadsContextModule from '@/contexts/DownloadsContext';
import * as ToastContextModule from '@/contexts/ToastContext';
import * as TokenContextModule from '@/contexts/TokenContext';
import * as UseCharacterDownloadsModule from '@/hooks/characters/useCharacterDownloads';
import * as UseCharacterEditorModule from '@/hooks/characters/useCharacterEditor';
import * as UseCharacterOperationsModule from '@/hooks/characters/useCharacterOperations';
import * as UseTokenPreviewCacheModule from '@/hooks/tokens/useTokenPreviewCache';
import type { Character, GenerationOptions, Token } from '@/ts/types';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@/ts/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    time: vi.fn((_name: string, _msg: string, fn: () => unknown) => fn()),
    child: vi.fn(() => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}));

// Mock detailViewUtils to avoid TabPreRenderService issues
vi.mock('@/ts/ui/detailViewUtils.js', () => ({
  downloadCharacterTokensAsZip: vi.fn(),
  downloadCharacterTokenOnly: vi.fn(),
  downloadReminderTokensOnly: vi.fn(),
  regenerateCharacterAndReminders: vi.fn().mockResolvedValue({ tokens: [], reminders: [] }),
}));

// Mock usePWAInstall hook to avoid logger.child issues
vi.mock('@/hooks/pwa/usePWAInstall', () => ({
  usePWAInstall: vi.fn(() => ({
    canInstall: false,
    install: vi.fn(),
  })),
}));

// Mock cache module to avoid deep import chains
vi.mock('@/ts/cache/index.js', () => ({
  cacheManager: {
    preRender: vi.fn(),
    clearCache: vi.fn(),
    getStats: vi.fn(),
  },
  tabPreRenderService: {
    preRenderTab: vi.fn(),
    getCachedNightOrder: vi.fn(),
    getCachedTokenDataUrl: vi.fn(),
    getCachedCharacterImageUrl: vi.fn(),
    clearCache: vi.fn(),
    clearAll: vi.fn(),
  },
  CacheManager: vi.fn(),
  TabPreRenderService: vi.fn(),
}));

// Mock ServiceContext to avoid deep import chains (ProjectExporter, etc.)
vi.mock('@/contexts/ServiceContext', () => ({
  ServiceProvider: ({ children }: { children: React.ReactNode }) => children,
  useProjectService: vi.fn(() => ({
    createProject: vi.fn(),
    saveProject: vi.fn(),
  })),
  useProjectDatabaseService: vi.fn(() => ({
    getAll: vi.fn(),
  })),
  useAssetStorageService: vi.fn(() => ({
    getById: vi.fn(),
  })),
  useFileUploadService: vi.fn(() => ({
    upload: vi.fn(),
  })),
  useFileValidationService: vi.fn(() => ({
    validate: vi.fn(),
  })),
  useDataSyncService: vi.fn(() => ({
    getCharacters: vi.fn(),
  })),
  useProjectExporter: vi.fn(() => vi.fn()),
  useProjectImporter: vi.fn(() => vi.fn()),
}));

vi.mock('@/contexts/ToastContext');
vi.mock('@/contexts/DownloadsContext');
vi.mock('@/contexts/TokenContext');
vi.mock('@/hooks/characters/useCharacterEditor');
vi.mock('@/hooks/characters/useCharacterOperations');
vi.mock('@/hooks/characters/useCharacterDownloads');
vi.mock('@/hooks/tokens/useTokenPreviewCache');

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
  UnifiedErrorDisplay: () => <div data-testid="error-fallback">Error Fallback</div>,
}));

vi.mock('@/components/Shared/Drawer', () => ({
  OfficialCharacterDrawer: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
    isOpen ? (
      <div data-testid="official-drawer">
        <button type="button" data-testid="drawer-close" onClick={onClose}>
          Close
        </button>
      </div>
    ) : null,
}));

vi.mock('@/components/ViewComponents/CharactersComponents/CharacterNavigation', () => ({
  CharacterNavigation: ({
    characters,
    tokens,
    selectedCharacterUuid,
    isMetaSelected,
    onSelectCharacter,
    onAddCharacter,
    onAddOfficialCharacter,
    onDeleteCharacter,
    onDuplicateCharacter,
    onSelectMetaToken: _onSelectMetaToken,
    onSelectMeta,
    onChangeTeam,
    onHoverCharacter,
  }: {
    characters: Character[];
    tokens: Token[];
    selectedCharacterUuid: string;
    isMetaSelected: boolean;
    onSelectCharacter: (uuid: string) => void;
    onAddCharacter: () => void;
    onAddOfficialCharacter: () => void;
    onDeleteCharacter: (uuid?: string) => void;
    onDuplicateCharacter: (uuid: string) => void;
    onSelectMetaToken: (token: Token) => void;
    onSelectMeta: () => void;
    onChangeTeam: (uuid: string, team: string) => void;
    onHoverCharacter: (uuid: string) => void;
  }) => (
    <div data-testid="character-navigation">
      <span data-testid="nav-character-count">{characters.length}</span>
      <span data-testid="nav-token-count">{tokens.length}</span>
      <span data-testid="nav-selected-uuid">{selectedCharacterUuid || 'none'}</span>
      <span data-testid="nav-is-meta-selected">{isMetaSelected ? 'true' : 'false'}</span>
      {characters.map((c) => (
        <button
          key={c.uuid}
          type="button"
          data-testid={`select-char-${c.uuid}`}
          onClick={() => c.uuid && onSelectCharacter(c.uuid)}
          onMouseEnter={() => c.uuid && onHoverCharacter(c.uuid)}
        >
          {c.name}
        </button>
      ))}
      <button type="button" data-testid="add-char-btn" onClick={onAddCharacter}>
        Add Character
      </button>
      <button type="button" data-testid="add-official-btn" onClick={onAddOfficialCharacter}>
        Add Official
      </button>
      <button type="button" data-testid="delete-char-btn" onClick={() => onDeleteCharacter()}>
        Delete Character
      </button>
      <button
        type="button"
        data-testid="duplicate-char-btn"
        onClick={() => characters[0]?.uuid && onDuplicateCharacter(characters[0].uuid)}
      >
        Duplicate Character
      </button>
      <button type="button" data-testid="select-meta-btn" onClick={onSelectMeta}>
        Select Meta
      </button>
      <button
        type="button"
        data-testid="change-team-btn"
        onClick={() => characters[0]?.uuid && onChangeTeam(characters[0].uuid, 'demon')}
      >
        Change Team
      </button>
    </div>
  ),
}));

vi.mock('@/components/ViewComponents/CharactersComponents/MetaEditor', () => ({
  MetaEditor: ({
    scriptMeta,
    onMetaChange,
  }: {
    scriptMeta: unknown;
    onMetaChange: (meta: unknown) => void;
  }) => (
    <div data-testid="meta-editor">
      <span data-testid="meta-script-meta">{JSON.stringify(scriptMeta)}</span>
      <button
        type="button"
        data-testid="meta-change-btn"
        onClick={() => onMetaChange({ name: 'Updated Script' })}
      >
        Change Meta
      </button>
    </div>
  ),
}));

vi.mock('@/components/ViewComponents/CharactersComponents/TokenEditor', () => ({
  TokenEditor: ({
    character,
    onEditChange,
    onReplaceCharacter,
    onRefreshPreview,
    onPreviewVariant,
    isOfficial,
    onPreviewJinx,
    previewedJinxIndex,
  }: {
    character: Character;
    onEditChange: <K extends keyof Character>(field: K, value: Character[K]) => void;
    onReplaceCharacter: (char: Character) => void;
    onRefreshPreview: () => void;
    onPreviewVariant: (url?: string) => void;
    isOfficial: boolean;
    onPreviewJinx: (data: unknown) => void;
    previewedJinxIndex: number | null;
  }) => (
    <div data-testid="token-editor">
      <span data-testid="editor-char-name">{character.name}</span>
      <span data-testid="editor-is-official">{isOfficial ? 'true' : 'false'}</span>
      <span data-testid="editor-jinx-index">
        {previewedJinxIndex !== null ? previewedJinxIndex : 'null'}
      </span>
      <button
        type="button"
        data-testid="edit-name-btn"
        onClick={() => onEditChange('name', 'New Name')}
      >
        Edit Name
      </button>
      <button
        type="button"
        data-testid="replace-char-btn"
        onClick={() => onReplaceCharacter({ ...character, name: 'Replaced Character' })}
      >
        Replace Character
      </button>
      <button type="button" data-testid="refresh-btn" onClick={onRefreshPreview}>
        Refresh
      </button>
      <button
        type="button"
        data-testid="preview-variant-btn"
        onClick={() => onPreviewVariant('https://example.com/variant.png')}
      >
        Preview Variant
      </button>
      <button
        type="button"
        data-testid="preview-jinx-btn"
        onClick={() =>
          onPreviewJinx({
            character,
            targetCharacter: { id: 'target', name: 'Target' },
            jinx: { id: 'target', reason: 'Test jinx reason' },
          })
        }
      >
        Preview Jinx
      </button>
      <button type="button" data-testid="clear-jinx-btn" onClick={() => onPreviewJinx(null)}>
        Clear Jinx
      </button>
    </div>
  ),
}));

vi.mock('@/components/ViewComponents/CharactersComponents/TokenPreview', () => ({
  TokenPreview: ({
    characterToken,
    reminderTokens,
    onReminderClick,
  }: {
    characterToken: Token;
    reminderTokens: Token[];
    onReminderClick: (token: Token) => void;
  }) => (
    <div data-testid="token-preview">
      <span data-testid="preview-char-name">{characterToken.name}</span>
      <span data-testid="preview-reminder-count">{reminderTokens.length}</span>
      {reminderTokens.map((r, idx) => (
        <button
          key={`${r.filename}-${idx}`}
          type="button"
          data-testid={`reminder-click-${idx}`}
          onClick={() => onReminderClick(r)}
        >
          {r.reminderText || 'Reminder'}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('@/components/Shared/UI/Button', () => ({
  Button: ({
    children,
    onClick,
    variant,
  }: {
    children: ReactNode;
    onClick?: () => void;
    variant?: string;
  }) => (
    <button type="button" data-variant={variant} onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('@/ts/export/zipExporter.js', () => ({
  isMetaToken: (token: Token | undefined) =>
    token?.type === 'script-name' ||
    token?.type === 'pandemonium' ||
    token?.type === 'almanac' ||
    token?.type === 'bootlegger',
}));

vi.mock('@/ts/ui/detailViewUtils.js', () => ({
  updateMetaInJson: vi.fn((json: string, meta: unknown) => {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      return JSON.stringify([meta, ...parsed.slice(1)]);
    }
    return json;
  }),
}));

// Note: Logger mock is defined earlier in the file with child() method support

// ============================================================================
// Test Helpers
// ============================================================================

const createMockCharacter = (overrides: Partial<Character> = {}): Character => ({
  id: 'test-char',
  uuid: 'char-uuid-1',
  name: 'Test Character',
  team: 'townsfolk',
  ability: 'Test ability',
  image: 'https://example.com/image.png',
  firstNight: 0,
  otherNight: 0,
  firstNightReminder: '',
  otherNightReminder: '',
  reminders: [],
  remindersGlobal: [],
  setup: false,
  ...overrides,
});

const createMockToken = (overrides: Partial<Token> = {}): Token => ({
  type: 'character',
  name: 'Test Token',
  team: 'townsfolk',
  canvas: document.createElement('canvas'),
  diameter: 300,
  filename: 'test-token.png',
  ...overrides,
});

const createMockGenerationOptions = (): GenerationOptions =>
  ({
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
  }) as GenerationOptions;

const createMockTokenContext = (overrides = {}) => ({
  characters: [],
  tokens: [],
  jsonInput: '[]',
  setJsonInput: vi.fn(),
  setCharacters: vi.fn(),
  setTokens: vi.fn(),
  generationOptions: createMockGenerationOptions(),
  updateGenerationOptions: vi.fn(),
  // Character metadata
  characterMetadata: new Map(),
  setMetadata: vi.fn(),
  deleteMetadata: vi.fn(),
  getMetadata: vi.fn(() => ({ decoratives: undefined })),
  clearAllMetadata: vi.fn(),
  // Official data
  officialData: [],
  setOfficialData: vi.fn(),
  // Character enable/disable helpers
  isCharacterEnabled: vi.fn(() => true),
  setCharacterEnabled: vi.fn(),
  setAllCharactersEnabled: vi.fn(),
  getEnabledCharacters: vi.fn(() => []),
  enabledCharacterUuids: new Set<string>(),
  characterSelectionSummary: { enabled: 0, disabled: 0, total: 0 },
  // Script metadata
  scriptMeta: null,
  setScriptMeta: vi.fn(),
  // Filter state
  filters: {
    teams: [],
    tokenTypes: [],
    display: [],
    reminders: [],
    origin: [],
  },
  updateFilters: vi.fn(),
  // Example token states
  exampleCharacterToken: null,
  setExampleCharacterToken: vi.fn(),
  exampleMetaToken: null,
  setExampleMetaToken: vi.fn(),
  // UI state
  isLoading: false,
  setIsLoading: vi.fn(),
  error: null,
  setError: vi.fn(),
  warnings: [],
  setWarnings: vi.fn(),
  // Generation progress
  generationProgress: null,
  setGenerationProgress: vi.fn(),
  // Token generation session tracking
  lastGeneratedJsonHash: null,
  setLastGeneratedJsonHash: vi.fn(),
  // Sync status
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

const createMockUseCharacterEditor = (overrides = {}) => ({
  editedCharacter: null,
  isDirty: false,
  handleEditChange: vi.fn(),
  handleReplaceCharacter: vi.fn(),
  resetToCharacter: vi.fn(),
  originalCharacterUuid: '',
  ...overrides,
});

const createMockUseTokenPreviewCache = (overrides = {}) => ({
  previewCharacterToken: null,
  previewReminderTokens: [],
  handleHoverCharacter: vi.fn(),
  applyCachedTokens: vi.fn(() => false),
  regeneratePreview: vi.fn(),
  handlePreviewVariant: vi.fn(),
  invalidateCache: vi.fn(),
  clearCache: vi.fn(),
  ...overrides,
});

const createMockUseCharacterOperations = (overrides = {}) => ({
  handleAddCharacter: vi.fn(),
  handleDeleteCharacter: vi.fn(),
  handleDuplicateCharacter: vi.fn(),
  handleChangeTeam: vi.fn(),
  ...overrides,
});

const createMockUseCharacterDownloads = (overrides = {}) => ({
  handleDownloadAll: vi.fn(),
  handleDownloadCharacter: vi.fn(),
  handleDownloadReminders: vi.fn(),
  handleDownloadJson: vi.fn(),
  isDownloading: false,
  ...overrides,
});

const createMockToastContext = () => ({
  toasts: [],
  addToast: vi.fn(),
  removeToast: vi.fn(),
});

const createMockDownloadsContext = () => ({
  downloads: [],
  isOpen: false,
  openDrawer: vi.fn(),
  closeDrawer: vi.fn(),
  toggleDrawer: vi.fn(),
  setDownloads: vi.fn(),
  clearDownloads: vi.fn(),
  executingId: null,
  executeDownload: vi.fn(),
});

// ============================================================================
// Tests
// ============================================================================

describe('CharactersView', () => {
  let mockTokenContext: ReturnType<typeof createMockTokenContext>;
  let mockToastContext: ReturnType<typeof createMockToastContext>;
  let mockDownloadsContext: ReturnType<typeof createMockDownloadsContext>;
  let mockUseCharacterEditor: ReturnType<typeof createMockUseCharacterEditor>;
  let mockUseTokenPreviewCache: ReturnType<typeof createMockUseTokenPreviewCache>;
  let mockUseCharacterOperations: ReturnType<typeof createMockUseCharacterOperations>;
  let mockUseCharacterDownloads: ReturnType<typeof createMockUseCharacterDownloads>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockTokenContext = createMockTokenContext();
    mockToastContext = createMockToastContext();
    mockDownloadsContext = createMockDownloadsContext();
    mockUseCharacterEditor = createMockUseCharacterEditor();
    mockUseTokenPreviewCache = createMockUseTokenPreviewCache();
    mockUseCharacterOperations = createMockUseCharacterOperations();
    mockUseCharacterDownloads = createMockUseCharacterDownloads();

    vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
      mockTokenContext as ReturnType<typeof TokenContextModule.useTokenContext>
    );
    vi.spyOn(ToastContextModule, 'useToast').mockReturnValue(mockToastContext);
    vi.spyOn(DownloadsContextModule, 'useDownloadsContext').mockReturnValue(
      mockDownloadsContext as ReturnType<typeof DownloadsContextModule.useDownloadsContext>
    );
    vi.spyOn(UseCharacterEditorModule, 'useCharacterEditor').mockReturnValue(
      mockUseCharacterEditor
    );
    vi.spyOn(UseTokenPreviewCacheModule, 'useTokenPreviewCache').mockReturnValue(
      mockUseTokenPreviewCache
    );
    vi.spyOn(UseCharacterOperationsModule, 'useCharacterOperations').mockReturnValue(
      mockUseCharacterOperations
    );
    vi.spyOn(UseCharacterDownloadsModule, 'useCharacterDownloads').mockReturnValue(
      mockUseCharacterDownloads
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // Basic Rendering
  // --------------------------------------------------------------------------

  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      render(<CharactersView />);

      expect(screen.getByTestId('view-layout')).toBeInTheDocument();
    });

    it('should render three panels (left, center, right)', () => {
      render(<CharactersView />);

      expect(screen.getByTestId('panel-left')).toBeInTheDocument();
      expect(screen.getByTestId('panel-center')).toBeInTheDocument();
      expect(screen.getByTestId('panel-right')).toBeInTheDocument();
    });

    it('should render CharacterNavigation in left panel', () => {
      render(<CharactersView />);

      expect(screen.getByTestId('character-navigation')).toBeInTheDocument();
    });

    it('should pass characters and tokens to CharacterNavigation', () => {
      const characters = [createMockCharacter({ uuid: 'c1', name: 'Char 1' })];
      const tokens = [createMockToken({ name: 'Token 1' })];
      mockTokenContext = createMockTokenContext({ characters, tokens });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
        mockTokenContext as ReturnType<typeof TokenContextModule.useTokenContext>
      );

      render(<CharactersView />);

      expect(screen.getByTestId('nav-character-count')).toHaveTextContent('1');
      expect(screen.getByTestId('nav-token-count')).toHaveTextContent('1');
    });
  });

  // --------------------------------------------------------------------------
  // Character Selection
  // --------------------------------------------------------------------------

  describe('Character Selection', () => {
    it('should select first character by default when no props provided', () => {
      const characters = [
        createMockCharacter({ uuid: 'c1', name: 'Char 1' }),
        createMockCharacter({ uuid: 'c2', name: 'Char 2' }),
      ];
      mockTokenContext = createMockTokenContext({ characters });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
        mockTokenContext as ReturnType<typeof TokenContextModule.useTokenContext>
      );

      render(<CharactersView />);

      expect(screen.getByTestId('nav-selected-uuid')).toHaveTextContent('c1');
    });

    it('should select character based on externalSelectedUuid', () => {
      const characters = [
        createMockCharacter({ uuid: 'c1', name: 'Char 1' }),
        createMockCharacter({ uuid: 'c2', name: 'Char 2' }),
      ];
      mockTokenContext = createMockTokenContext({ characters });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
        mockTokenContext as ReturnType<typeof TokenContextModule.useTokenContext>
      );

      render(<CharactersView selectedCharacterUuid="c2" />);

      expect(screen.getByTestId('nav-selected-uuid')).toHaveTextContent('c2');
    });

    it('should update selection when character clicked in navigation', async () => {
      const characters = [
        createMockCharacter({ uuid: 'c1', name: 'Char 1' }),
        createMockCharacter({ uuid: 'c2', name: 'Char 2' }),
      ];
      mockTokenContext = createMockTokenContext({ characters });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
        mockTokenContext as ReturnType<typeof TokenContextModule.useTokenContext>
      );

      render(<CharactersView />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('select-char-c2'));
      });

      expect(screen.getByTestId('nav-selected-uuid')).toHaveTextContent('c2');
    });

    it('should call onCharacterSelect callback when character changes', async () => {
      const characters = [
        createMockCharacter({ uuid: 'c1', name: 'Char 1' }),
        createMockCharacter({ uuid: 'c2', name: 'Char 2' }),
      ];
      mockTokenContext = createMockTokenContext({ characters });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
        mockTokenContext as ReturnType<typeof TokenContextModule.useTokenContext>
      );

      const onCharacterSelect = vi.fn();
      render(<CharactersView onCharacterSelect={onCharacterSelect} />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('select-char-c2'));
      });

      expect(onCharacterSelect).toHaveBeenCalledWith('c2');
    });

    it('should apply cached tokens when selecting character', async () => {
      const characters = [
        createMockCharacter({ uuid: 'c1', name: 'Char 1' }),
        createMockCharacter({ uuid: 'c2', name: 'Char 2' }),
      ];
      mockTokenContext = createMockTokenContext({ characters });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
        mockTokenContext as ReturnType<typeof TokenContextModule.useTokenContext>
      );

      render(<CharactersView />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('select-char-c2'));
      });

      expect(mockUseTokenPreviewCache.applyCachedTokens).toHaveBeenCalledWith('c2');
    });
  });

  // --------------------------------------------------------------------------
  // Initial Token Selection
  // --------------------------------------------------------------------------

  describe('Initial Token Selection', () => {
    it('should select character based on initialToken parentCharacter', () => {
      const characters = [
        createMockCharacter({ uuid: 'c1', name: 'Char 1' }),
        createMockCharacter({ uuid: 'c2', name: 'Char 2' }),
      ];
      const initialToken = createMockToken({
        type: 'reminder',
        parentCharacter: 'Char 2',
      });
      mockTokenContext = createMockTokenContext({ characters });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
        mockTokenContext as ReturnType<typeof TokenContextModule.useTokenContext>
      );

      render(<CharactersView initialToken={initialToken} />);

      expect(screen.getByTestId('nav-selected-uuid')).toHaveTextContent('c2');
    });

    it('should select character based on initialToken name for character type', () => {
      const characters = [
        createMockCharacter({ uuid: 'c1', name: 'Char 1' }),
        createMockCharacter({ uuid: 'c2', name: 'Char 2' }),
      ];
      const initialToken = createMockToken({
        type: 'character',
        name: 'Char 2',
      });
      mockTokenContext = createMockTokenContext({ characters });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
        mockTokenContext as ReturnType<typeof TokenContextModule.useTokenContext>
      );

      render(<CharactersView initialToken={initialToken} />);

      expect(screen.getByTestId('nav-selected-uuid')).toHaveTextContent('c2');
    });

    it('should select meta when initialToken is meta token', () => {
      const initialToken = createMockToken({
        type: 'script-name',
        team: 'meta',
        name: 'Script Name',
      });

      render(<CharactersView initialToken={initialToken} />);

      expect(screen.getByTestId('nav-is-meta-selected')).toHaveTextContent('true');
    });
  });

  // --------------------------------------------------------------------------
  // Meta Selection
  // --------------------------------------------------------------------------

  describe('Meta Selection', () => {
    it('should show meta editor when meta is selected', async () => {
      render(<CharactersView />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('select-meta-btn'));
      });

      expect(screen.getByTestId('nav-is-meta-selected')).toHaveTextContent('true');
      expect(screen.getByTestId('meta-editor')).toBeInTheDocument();
    });

    it('should clear character selection when meta is selected', async () => {
      const characters = [createMockCharacter({ uuid: 'c1', name: 'Char 1' })];
      mockTokenContext = createMockTokenContext({ characters });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
        mockTokenContext as ReturnType<typeof TokenContextModule.useTokenContext>
      );

      render(<CharactersView />);

      expect(screen.getByTestId('nav-selected-uuid')).toHaveTextContent('c1');

      await act(async () => {
        fireEvent.click(screen.getByTestId('select-meta-btn'));
      });

      expect(screen.getByTestId('nav-selected-uuid')).toHaveTextContent('none');
    });

    it('should update script meta through meta editor', async () => {
      render(<CharactersView />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('select-meta-btn'));
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('meta-change-btn'));
      });

      expect(mockTokenContext.setScriptMeta).toHaveBeenCalledWith({ name: 'Updated Script' });
    });
  });

  // --------------------------------------------------------------------------
  // Token Preview
  // --------------------------------------------------------------------------

  describe('Token Preview', () => {
    it('should show token preview when character token is available', () => {
      const characters = [createMockCharacter({ uuid: 'c1', name: 'Char 1' })];
      const previewToken = createMockToken({ name: 'Preview Token' });
      mockTokenContext = createMockTokenContext({ characters });
      mockUseCharacterEditor = createMockUseCharacterEditor({
        editedCharacter: characters[0],
      });
      mockUseTokenPreviewCache = createMockUseTokenPreviewCache({
        previewCharacterToken: previewToken,
        previewReminderTokens: [],
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
        mockTokenContext as ReturnType<typeof TokenContextModule.useTokenContext>
      );
      vi.spyOn(UseCharacterEditorModule, 'useCharacterEditor').mockReturnValue(
        mockUseCharacterEditor
      );
      vi.spyOn(UseTokenPreviewCacheModule, 'useTokenPreviewCache').mockReturnValue(
        mockUseTokenPreviewCache
      );

      render(<CharactersView />);

      expect(screen.getByTestId('token-preview')).toBeInTheDocument();
      expect(screen.getByTestId('preview-char-name')).toHaveTextContent('Preview Token');
    });

    it('should show placeholder when no token preview available', () => {
      const characters = [createMockCharacter({ uuid: 'c1', name: 'Char 1' })];
      mockTokenContext = createMockTokenContext({ characters });
      mockUseCharacterEditor = createMockUseCharacterEditor({
        editedCharacter: characters[0],
      });
      mockUseTokenPreviewCache = createMockUseTokenPreviewCache({
        previewCharacterToken: null,
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
        mockTokenContext as ReturnType<typeof TokenContextModule.useTokenContext>
      );
      vi.spyOn(UseCharacterEditorModule, 'useCharacterEditor').mockReturnValue(
        mockUseCharacterEditor
      );
      vi.spyOn(UseTokenPreviewCacheModule, 'useTokenPreviewCache').mockReturnValue(
        mockUseTokenPreviewCache
      );

      render(<CharactersView />);

      expect(screen.queryByTestId('token-preview')).not.toBeInTheDocument();
    });

    it('should show empty state when no character is selected', () => {
      mockTokenContext = createMockTokenContext({ characters: [] });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
        mockTokenContext as ReturnType<typeof TokenContextModule.useTokenContext>
      );

      render(<CharactersView />);

      expect(screen.getByText('No Character Selected')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Token Editor
  // --------------------------------------------------------------------------

  describe('Token Editor', () => {
    it('should show token editor when character is selected', () => {
      const characters = [createMockCharacter({ uuid: 'c1', name: 'Char 1' })];
      mockTokenContext = createMockTokenContext({ characters });
      mockUseCharacterEditor = createMockUseCharacterEditor({
        editedCharacter: characters[0],
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
        mockTokenContext as ReturnType<typeof TokenContextModule.useTokenContext>
      );
      vi.spyOn(UseCharacterEditorModule, 'useCharacterEditor').mockReturnValue(
        mockUseCharacterEditor
      );

      render(<CharactersView />);

      expect(screen.getByTestId('token-editor')).toBeInTheDocument();
      expect(screen.getByTestId('editor-char-name')).toHaveTextContent('Char 1');
    });

    it('should pass isOfficial flag to token editor', () => {
      const characters = [createMockCharacter({ uuid: 'c1', name: 'Char 1', source: 'official' })];
      mockTokenContext = createMockTokenContext({ characters });
      mockUseCharacterEditor = createMockUseCharacterEditor({
        editedCharacter: characters[0],
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
        mockTokenContext as ReturnType<typeof TokenContextModule.useTokenContext>
      );
      vi.spyOn(UseCharacterEditorModule, 'useCharacterEditor').mockReturnValue(
        mockUseCharacterEditor
      );

      render(<CharactersView />);

      expect(screen.getByTestId('editor-is-official')).toHaveTextContent('true');
    });

    it('should call handleEditChange when editing field', async () => {
      const characters = [createMockCharacter({ uuid: 'c1', name: 'Char 1' })];
      mockTokenContext = createMockTokenContext({ characters });
      mockUseCharacterEditor = createMockUseCharacterEditor({
        editedCharacter: characters[0],
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
        mockTokenContext as ReturnType<typeof TokenContextModule.useTokenContext>
      );
      vi.spyOn(UseCharacterEditorModule, 'useCharacterEditor').mockReturnValue(
        mockUseCharacterEditor
      );

      render(<CharactersView />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('edit-name-btn'));
      });

      expect(mockUseCharacterEditor.handleEditChange).toHaveBeenCalledWith('name', 'New Name');
    });

    it('should call regeneratePreview when refresh clicked', async () => {
      const characters = [createMockCharacter({ uuid: 'c1', name: 'Char 1' })];
      mockTokenContext = createMockTokenContext({ characters });
      mockUseCharacterEditor = createMockUseCharacterEditor({
        editedCharacter: characters[0],
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
        mockTokenContext as ReturnType<typeof TokenContextModule.useTokenContext>
      );
      vi.spyOn(UseCharacterEditorModule, 'useCharacterEditor').mockReturnValue(
        mockUseCharacterEditor
      );

      render(<CharactersView />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('refresh-btn'));
      });

      expect(mockUseTokenPreviewCache.regeneratePreview).toHaveBeenCalled();
    });

    it('should call handlePreviewVariant when variant selected', async () => {
      const characters = [createMockCharacter({ uuid: 'c1', name: 'Char 1' })];
      mockTokenContext = createMockTokenContext({ characters });
      mockUseCharacterEditor = createMockUseCharacterEditor({
        editedCharacter: characters[0],
      });

      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
        mockTokenContext as ReturnType<typeof TokenContextModule.useTokenContext>
      );
      vi.spyOn(UseCharacterEditorModule, 'useCharacterEditor').mockReturnValue(
        mockUseCharacterEditor
      );

      render(<CharactersView />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('preview-variant-btn'));
      });

      expect(mockUseTokenPreviewCache.handlePreviewVariant).toHaveBeenCalledWith(
        'https://example.com/variant.png'
      );
    });
  });

  // --------------------------------------------------------------------------
  // Character Operations
  // --------------------------------------------------------------------------

  describe('Character Operations', () => {
    it('should call handleAddCharacter when add button clicked', async () => {
      render(<CharactersView />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('add-char-btn'));
      });

      expect(mockUseCharacterOperations.handleAddCharacter).toHaveBeenCalled();
    });

    it('should call handleDeleteCharacter when delete button clicked', async () => {
      render(<CharactersView />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('delete-char-btn'));
      });

      expect(mockUseCharacterOperations.handleDeleteCharacter).toHaveBeenCalled();
    });

    it('should call handleDuplicateCharacter when duplicate button clicked', async () => {
      const characters = [createMockCharacter({ uuid: 'c1', name: 'Char 1' })];
      mockTokenContext = createMockTokenContext({ characters });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
        mockTokenContext as ReturnType<typeof TokenContextModule.useTokenContext>
      );

      render(<CharactersView />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('duplicate-char-btn'));
      });

      expect(mockUseCharacterOperations.handleDuplicateCharacter).toHaveBeenCalledWith('c1');
    });

    it('should call handleChangeTeam when team change requested', async () => {
      const characters = [createMockCharacter({ uuid: 'c1', name: 'Char 1' })];
      mockTokenContext = createMockTokenContext({ characters });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
        mockTokenContext as ReturnType<typeof TokenContextModule.useTokenContext>
      );

      render(<CharactersView />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('change-team-btn'));
      });

      expect(mockUseCharacterOperations.handleChangeTeam).toHaveBeenCalledWith('c1', 'demon');
    });
  });

  // --------------------------------------------------------------------------
  // Official Character Drawer
  // --------------------------------------------------------------------------

  describe('Official Character Drawer', () => {
    it('should not show drawer initially', () => {
      render(<CharactersView />);

      expect(screen.queryByTestId('official-drawer')).not.toBeInTheDocument();
    });

    it('should show drawer when add official button clicked', async () => {
      render(<CharactersView />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('add-official-btn'));
      });

      expect(screen.getByTestId('official-drawer')).toBeInTheDocument();
    });

    it('should close drawer when close button clicked', async () => {
      render(<CharactersView />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('add-official-btn'));
      });

      expect(screen.getByTestId('official-drawer')).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(screen.getByTestId('drawer-close'));
      });

      expect(screen.queryByTestId('official-drawer')).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Hover Pre-rendering
  // --------------------------------------------------------------------------

  describe('Hover Pre-rendering', () => {
    it('should call handleHoverCharacter when hovering over character', async () => {
      const characters = [
        createMockCharacter({ uuid: 'c1', name: 'Char 1' }),
        createMockCharacter({ uuid: 'c2', name: 'Char 2' }),
      ];
      mockTokenContext = createMockTokenContext({ characters });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
        mockTokenContext as ReturnType<typeof TokenContextModule.useTokenContext>
      );

      render(<CharactersView />);

      await act(async () => {
        fireEvent.mouseEnter(screen.getByTestId('select-char-c2'));
      });

      expect(mockUseTokenPreviewCache.handleHoverCharacter).toHaveBeenCalledWith('c2');
    });
  });

  // --------------------------------------------------------------------------
  // Empty State Actions
  // --------------------------------------------------------------------------

  describe('Empty State Actions', () => {
    it('should show empty state with action buttons when no characters', () => {
      mockTokenContext = createMockTokenContext({ characters: [] });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
        mockTokenContext as ReturnType<typeof TokenContextModule.useTokenContext>
      );

      render(<CharactersView />);

      expect(screen.getByText('No Character Selected')).toBeInTheDocument();
      // Buttons have emoji prefixes
      expect(screen.getByText(/Create New Character/)).toBeInTheDocument();
      expect(screen.getByText(/Add Official Character/)).toBeInTheDocument();
    });

    it('should call handleAddCharacter from empty state button', async () => {
      mockTokenContext = createMockTokenContext({ characters: [] });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
        mockTokenContext as ReturnType<typeof TokenContextModule.useTokenContext>
      );

      render(<CharactersView />);

      const createButtons = screen.getAllByText(/Create New Character/);
      await act(async () => {
        fireEvent.click(createButtons[createButtons.length - 1]);
      });

      expect(mockUseCharacterOperations.handleAddCharacter).toHaveBeenCalled();
    });

    it('should open official drawer from empty state button', async () => {
      mockTokenContext = createMockTokenContext({ characters: [] });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
        mockTokenContext as ReturnType<typeof TokenContextModule.useTokenContext>
      );

      render(<CharactersView />);

      const addOfficialButtons = screen.getAllByText(/Add Official Character/);
      await act(async () => {
        fireEvent.click(addOfficialButtons[addOfficialButtons.length - 1]);
      });

      expect(screen.getByTestId('official-drawer')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // External UUID Sync
  // --------------------------------------------------------------------------

  describe('External UUID Sync', () => {
    it('should update selection when externalSelectedUuid changes', async () => {
      const characters = [
        createMockCharacter({ uuid: 'c1', name: 'Char 1' }),
        createMockCharacter({ uuid: 'c2', name: 'Char 2' }),
      ];
      mockTokenContext = createMockTokenContext({ characters });
      vi.spyOn(TokenContextModule, 'useTokenContext').mockReturnValue(
        mockTokenContext as ReturnType<typeof TokenContextModule.useTokenContext>
      );

      const { rerender } = render(<CharactersView selectedCharacterUuid="c1" />);

      expect(screen.getByTestId('nav-selected-uuid')).toHaveTextContent('c1');

      rerender(<CharactersView selectedCharacterUuid="c2" />);

      await waitFor(() => {
        expect(screen.getByTestId('nav-selected-uuid')).toHaveTextContent('c2');
      });
    });
  });

  // --------------------------------------------------------------------------
  // createNewCharacter Prop
  // --------------------------------------------------------------------------

  describe('createNewCharacter Prop', () => {
    it('should pass createNewCharacter to useCharacterOperations', () => {
      render(<CharactersView createNewCharacter />);

      expect(UseCharacterOperationsModule.useCharacterOperations).toHaveBeenCalledWith(
        expect.objectContaining({
          createNewCharacter: true,
        })
      );
    });
  });
});
