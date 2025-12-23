# Clocktower Token Generator - Architecture Documentation

> **Purpose**: This document describes the system architecture, design decisions, and technical implementation details of the Clocktower Token Generator.

> **Location**: This file lives in `.claude/rules/` and is loaded by Claude Code when architectural context is needed.

**Last Updated**: 2025-12-20
**Version**: v0.4.0

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Application Layers](#application-layers)
4. [Data Flow](#data-flow)
5. [State Management](#state-management)
6. [Module Architecture](#module-architecture)
7. [Design Patterns](#design-patterns)
8. [Storage Architecture](#storage-architecture)
9. [Caching Strategy](#caching-strategy)
10. [Error Handling](#error-handling)
11. [Security Considerations](#security-considerations)
12. [Performance Optimizations](#performance-optimizations)
13. [Architecture Decision Records](#architecture-decision-records)

---

## System Overview

The Clocktower Token Generator is a client-side web application that generates printable tokens for the Blood on the Clocktower board game. It features:

- **Offline-first architecture** with GitHub data synchronization
- **Canvas-based rendering** for high-quality token generation
- **Multi-format export** (PDF, PNG, ZIP)
- **Project management** with auto-save and versioning
- **React-based UI** with TypeScript

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface                           │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │Projects │ │ Script  │ │ Tokens  │ │ Studio  │ │ Export  │  │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘  │
│       └───────────┴───────────┴───────────┴───────────┘        │
│                              │                                  │
├──────────────────────────────┼──────────────────────────────────┤
│                     React Contexts                              │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐  │
│  │TokenContext│ │ProjectCtx  │ │DataSyncCtx │ │ ThemeCtx   │  │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                     Custom Hooks (35+)                          │
│  useTokenGenerator, useProjectAutoSave, usePreRenderCache...   │
├─────────────────────────────────────────────────────────────────┤
│                     Core Services Layer                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │Generation│ │  Sync    │ │  Export  │ │  Cache   │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
├─────────────────────────────────────────────────────────────────┤
│                     Storage Layer                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                       │
│  │IndexedDB │ │Cache API │ │localStorage                      │
│  │(Dexie)   │ │ (images) │ │(settings)│                       │
│  └──────────┘ └──────────┘ └──────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| Framework | React | 19.x | UI components |
| Language | TypeScript | 5.7.x | Type safety |
| Build Tool | Vite | 7.3.x | Development & bundling |
| Styling | CSS Modules | - | Scoped styles |

### Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| dexie | 4.x | IndexedDB wrapper |
| jsPDF | 2.5.x | PDF generation |
| JSZip | 3.10.x | ZIP creation |
| qr-code-styling | 1.6.x | QR code generation |
| @dnd-kit | 6.x | Drag and drop |
| @imgly/background-removal | 1.4.x | AI background removal |

### Development Tools

| Tool | Purpose |
|------|---------|
| Vitest | Unit testing |
| Biome | Linting & formatting |
| TypeScript | Type checking |

---

## Application Layers

### Layer 1: Views (Components)

The UI is organized into main views:

```
src/components/Views/
├── ProjectsView.tsx      # Project management
├── ScriptView.tsx        # Script JSON editing
├── CharactersView.tsx    # Character editing
├── TokensView.tsx        # Token preview & export
├── StudioView.tsx        # Asset creation
├── TownSquareView.tsx    # Game helper
├── JsonView.tsx          # Raw JSON editing
└── VersionsView.tsx      # Version history
```

### Layer 2: Shared Components

Reusable components organized by function:

```
src/components/Shared/
├── Assets/        # Asset management (thumbnails, upload)
├── Controls/      # Input controls (sliders, uploaders)
├── Drawer/        # Side panel drawers
├── Feedback/      # Status indicators, progress bars
├── Form/          # Form elements (input, checkbox, select)
├── Json/          # JSON editor components
├── ModalBase/     # Modal primitives
├── Options/       # Configuration panels
├── Selectors/     # Font, color, asset selectors
└── UI/            # Generic UI (buttons, alerts, toast)
```

### Layer 3: React Contexts

Global state providers:

```typescript
// TokenContext - Token generation state
interface TokenContextType {
  tokens: Token[];
  setTokens: (tokens: Token[]) => void;
  options: TokenGeneratorOptions;
  setOptions: (options: TokenGeneratorOptions) => void;
  // ...
}

// ProjectContext - Project management
interface ProjectContextType {
  currentProject: Project | null;
  projects: Project[];
  saveProject: () => Promise<void>;
  // ...
}

// DataSyncContext - GitHub sync state
interface DataSyncContextType {
  syncStatus: SyncStatus;
  characters: Character[];
  checkForUpdates: () => Promise<void>;
  // ...
}
```

### Layer 4: Custom Hooks

35+ hooks that encapsulate business logic:

```typescript
// Token generation orchestration
const { tokens, isGenerating, generate } = useTokenGenerator(options);

// Project auto-save
const { isSaving, hasUnsavedChanges } = useProjectAutoSave(project);

// Cache management
const { warmCache, cacheStats } = usePreRenderCache(characters);
```

### Layer 5: Core Services

TypeScript modules in `src/ts/`:

| Module | Responsibility |
|--------|----------------|
| `generation/` | Token canvas generation |
| `sync/` | GitHub data synchronization |
| `export/` | PDF, PNG, ZIP export |
| `cache/` | Multi-tier caching |
| `canvas/` | Canvas rendering utilities |
| `data/` | Data loading and parsing |
| `services/` | Project and upload services |

---

## Data Flow

### Token Generation Flow

```
┌──────────────┐     ┌───────────────┐     ┌────────────────┐
│ Script JSON  │────▶│ Parse & Valid │────▶│ Character List │
└──────────────┘     └───────────────┘     └───────┬────────┘
                                                    │
                                                    ▼
┌──────────────┐     ┌───────────────┐     ┌────────────────┐
│ Token Canvas │◀────│TokenGenerator │◀────│ Merge Options  │
└──────┬───────┘     └───────────────┘     └────────────────┘
       │
       ▼
┌──────────────┐     ┌───────────────┐
│ Export (PDF) │────▶│  User Download │
│ Export (ZIP) │     └───────────────┘
│ Export (PNG) │
└──────────────┘
```

### Data Sync Flow

```
┌───────────┐     ┌──────────────────┐     ┌─────────────┐
│ App Load  │────▶│ StorageManager   │────▶│ Load Cached │
└───────────┘     │ getCharacters()  │     │   Data      │
                  └──────────────────┘     └──────┬──────┘
                                                   │
                         ┌─────────────────────────┘
                         ▼
                  ┌──────────────────┐
                  │ DataSyncService  │
                  │ checkForUpdates()│
                  └────────┬─────────┘
                           │ (background)
                           ▼
                  ┌──────────────────┐
                  │ GitHub Release   │
                  │ Client (ETag)    │
                  └────────┬─────────┘
                           │ if newer
                           ▼
                  ┌──────────────────┐     ┌─────────────┐
                  │ PackageExtractor │────▶│ Store in    │
                  │ extract & valid  │     │ IndexedDB + │
                  └──────────────────┘     │ Cache API   │
                                           └─────────────┘
```

---

## State Management

### Context Hierarchy

```
<ThemeProvider>
  <DataSyncProvider>
    <ProjectProvider>
      <TokenProvider>
        <App />
      </TokenProvider>
    </ProjectProvider>
  </DataSyncProvider>
</ThemeProvider>
```

### State Categories

| Category | Storage | Scope | Examples |
|----------|---------|-------|----------|
| UI State | React State | Component | Modal open, selection |
| Session State | React Context | App-wide | Current project, tokens |
| User Preferences | localStorage | Persistent | Theme, auto-save |
| Project Data | IndexedDB | Persistent | Projects, versions |
| Character Data | IndexedDB + Cache | Persistent | Characters, images |

### Data Persistence Strategy

```typescript
// User preferences (small, sync needed)
localStorage.setItem(STORAGE_KEYS.THEME, 'dark');

// Project data (structured, large)
await projectDb.projects.put(project);

// Character data (large dataset)
await storageManager.storeCharacters(characters);

// Character images (binary, large)
await caches.open('character-icons').put(url, response);
```

---

## Module Architecture

### Token Generation Module

```
src/ts/generation/
├── index.ts                    # Barrel export
├── TokenGenerator.ts           # Canvas rendering (~640 lines)
│   ├── generateCharacterToken() → HTMLCanvasElement
│   ├── generateReminderToken() → HTMLCanvasElement
│   ├── generateScriptNameToken() → HTMLCanvasElement
│   ├── generatePandemoniumToken() → HTMLCanvasElement
│   ├── generateAlmanacQRToken() → HTMLCanvasElement
│   └── generateBootleggerToken() → HTMLCanvasElement
├── TokenFactory.ts             # Token object creation (~200 lines)
│   ├── createCharacterToken()  # Character Token from canvas
│   ├── createReminderToken()   # Reminder Token from canvas
│   ├── createMetaToken()       # Meta Token from canvas
│   ├── emit()                  # Call callback and return token
│   └── emitAndPush()           # Emit and push to array
├── batchGenerator.ts           # Batch orchestration (~630 lines)
│   ├── generateAllTokens()     # Main entry point
│   ├── generateScriptNameTokenOnly()
│   ├── BatchContext            # Context object for reduced params
│   ├── generateMetaTokens()    # Meta token orchestration
│   └── generateCharacterAndReminderTokens()
├── TokenImageRenderer.ts       # Image rendering
├── TokenTextRenderer.ts        # Text rendering
├── presets.ts                  # Preset configurations
├── ImageCacheAdapter.ts        # DI adapter
└── iconLayoutStrategies.ts     # Strategy pattern
```

**Separation of Concerns:**
- `TokenGenerator`: Pure canvas rendering (low-level) - "how to draw a token"
- `TokenFactory`: Token object creation (metadata assembly) - "how to package a canvas"
- `batchGenerator`: Orchestration (high-level) - "which tokens to generate, in what order"

### Sync Module

```
src/ts/sync/
├── index.ts                    # Barrel + singleton
├── ISyncServices.ts            # DI interfaces (contracts)
├── dataSyncService.ts          # Orchestrator (uses DI)
│   ├── initialize()
│   ├── checkForUpdates()
│   ├── downloadAndInstall()
│   └── Event system
├── githubReleaseClient.ts      # GitHub API
├── packageExtractor.ts         # ZIP handling
├── storageManager.ts           # IndexedDB + Cache
├── versionManager.ts           # Version comparison
└── migrationHelper.ts          # Legacy migration
```

### Background Effects Module

```
src/ts/canvas/backgroundEffects/
├── index.ts                    # Module barrel export
├── BackgroundRenderer.ts       # Main orchestrator
│   ├── renderBackground()      # Complete rendering pipeline
│   └── renderTexturePreview()  # Preview-only rendering
├── noise/                      # Procedural noise utilities
│   ├── index.ts                # Barrel export
│   ├── perlin.ts               # Perlin noise implementation
│   │   ├── initPermutation()   # Seed-based initialization
│   │   └── perlin2D()          # 2D noise function
│   └── fbm.ts                  # Fractal noise
│       ├── fbm()               # Fractal Brownian Motion
│       ├── turbulence()        # Absolute-value noise
│       └── ridgedNoise()       # Ridge patterns
├── textures/                   # Strategy pattern textures
│   ├── index.ts                # Factory + barrel export
│   ├── TextureStrategy.ts      # Interface + base class
│   └── [11 texture files]      # Individual strategies
│       ├── MarbleTexture.ts
│       ├── CloudsTexture.ts
│       ├── WatercolorTexture.ts
│       ├── PerlinTexture.ts
│       ├── RadialFadeTexture.ts
│       ├── OrganicCellsTexture.ts
│       ├── SilkFlowTexture.ts
│       ├── ParchmentTexture.ts
│       ├── LinenTexture.ts
│       ├── WoodGrainTexture.ts
│       └── BrushedMetalTexture.ts
└── effects/                    # Visual effects
    ├── index.ts                # Effect orchestration
    ├── EffectStrategy.ts       # Interface
    ├── VignetteEffect.ts       # Edge darkening
    ├── InnerGlowEffect.ts      # Rim lighting
    └── VibranceEffect.ts       # Smart saturation
```

### Cache Module

```
src/ts/cache/
├── index.ts                    # Barrel export
├── CacheManager.ts             # Cache facade (application layer)
├── CacheInvalidationService.ts # Cache lifecycle
├── TabPreRenderService.ts      # Unified tab hover pre-rendering
├── charactersPreRenderHelpers.ts
├── core/                       # Core types & interfaces
│   └── types.ts                # PreRenderContextType, CacheEntry, etc.
├── manager/
│   └── PreRenderCacheManager.ts
├── policies/
│   └── LRUEvictionPolicy.ts    # LRU eviction
├── strategies/
│   ├── CharactersPreRenderStrategy.ts
│   ├── TokensPreRenderStrategy.ts
│   └── ProjectPreRenderStrategy.ts
└── utils/
    ├── EventEmitter.ts         # Typed events
    ├── hashUtils.ts            # Shared hash utilities
    └── index.ts
```

**TabPreRenderService** is a Facade that unifies all tab hover pre-rendering:
- `preRenderTab(tab, context)` - Trigger pre-render for any supported tab
- `getCachedNightOrder(scriptData)` - Get cached night order if available
- `getCachedTokenDataUrl(filename)` - Get cached token data URL
- Internally routes to CacheManager for heavy operations (characters) or module-level caches for lightweight data (script night order, token data URLs)

### Services Module

```
src/ts/services/
├── ServiceContainer.ts         # Lightweight DI container
├── project/                    # Project management
│   ├── IProjectService.ts      # DI interfaces (contracts)
│   ├── ProjectService.ts       # Main orchestrator (uses DI)
│   ├── ProjectDatabaseService.ts
│   ├── ProjectExporter.ts      # Export (uses DI)
│   └── ProjectImporter.ts
└── upload/                     # File upload processing
    ├── IUploadServices.ts      # DI interfaces (contracts)
    ├── FileUploadService.ts    # Main orchestrator (uses DI)
    ├── FileValidationService.ts
    ├── ImageProcessingService.ts
    ├── AssetStorageService.ts
    ├── AssetArchiveService.ts
    ├── AssetSuggestionService.ts
    ├── assetResolver.ts
    └── types.ts
```

---

## Design Patterns

### Strategy Pattern (Icon Layout)

```typescript
// Interface
interface IconLayoutStrategy {
  calculate(context: LayoutContext): IconLayout;
}

// Concrete strategies
class CharacterIconStrategy implements IconLayoutStrategy { }
class ReminderIconStrategy implements IconLayoutStrategy { }
class MetaIconStrategy implements IconLayoutStrategy { }

// Factory
const strategy = IconLayoutStrategyFactory.create(tokenType, ...args);
const layout = strategy.calculate(context);
```

**Why**: Token types have different layout requirements. Strategy pattern allows adding new token types without modifying existing code (Open/Closed principle).

### Strategy Pattern (Texture Generation)

```typescript
// Interface + Base class
interface TextureStrategy {
  generate(context: TextureContext): TextureResult;
  readonly name: string;
}

abstract class BaseTextureStrategy implements TextureStrategy {
  protected isInCircle(x: number, y: number, center: number): boolean;
  protected forEachCircularPixel(context: TextureContext, callback: Function): ImageData;
}

// Concrete strategies (11 textures)
class MarbleTextureStrategy extends BaseTextureStrategy { }
class CloudsTextureStrategy extends BaseTextureStrategy { }
// ... etc

// Factory with registration
const strategy = TextureFactory.create('marble');
TextureFactory.register('custom', new CustomTextureStrategy());
```

**Why**: 11 different texture algorithms with shared utilities. Strategy pattern enables:
- Adding new textures without modifying existing code
- Unit testing individual textures in isolation
- Registering custom textures at runtime

### Singleton Pattern (Services)

```typescript
// Global logger instance
export const logger = new Logger();

// Global image cache
export const globalImageCache = new ImageCache();

// Data sync service singleton
export const dataSyncService = new DataSyncService();
```

**Why**: These services manage shared resources (console, image memory, sync state) that should have single instances.

### Factory Pattern (Canvas Creation)

```typescript
function createCanvas(diameter: number, options?: CanvasOptions): CanvasContext {
  const canvas = document.createElement('canvas');
  const dpi = options?.dpi || 300;
  canvas.width = diameter;
  canvas.height = diameter;
  // ... setup
  return { canvas, ctx, center, radius };
}
```

**Why**: Encapsulates canvas setup complexity and ensures consistent initialization.

### Observer Pattern (Event System)

```typescript
// Typed event emitter
interface SyncEvents {
  'checking': [];
  'downloading': [progress: number];
  'success': [characters: Character[]];
  'error': [error: Error];
}

dataSyncService.on('downloading', (progress) => {
  updateProgressBar(progress);
});
```

**Why**: Decouples sync state from UI, allows multiple subscribers.

### Dependency Injection (Constructor Injection Pattern)

The codebase uses **constructor injection with default parameters** for testability while maintaining zero breaking changes to existing code.

#### React Context DI (ServiceContext)

For React components and hooks, services are provided via `ServiceContext`:

```typescript
// src/contexts/ServiceContext.tsx
export interface ServiceRegistry {
  projectService: IProjectService;
  projectDatabaseService: IProjectDatabase;
  assetStorageService: IAssetStorageService;
  fileUploadService: IFileUploadService;
  fileValidationService: IFileValidationService;
  dataSyncService: IDataSyncService;
}

// Hook usage in components
const assetStorageService = useAssetStorageService();
const projectService = useProjectService();

// Testing with overrides
<ServiceProvider overrides={{ projectService: mockProjectService }}>
  <App />
</ServiceProvider>
```

**Available Hooks**: `useProjectService()`, `useProjectDatabaseService()`, `useAssetStorageService()`, `useFileUploadService()`, `useFileValidationService()`, `useDataSyncService()`

**Factory Hooks** (for classes that need fresh instances per-use):
- `useProjectExporter()` - Returns `() => IProjectExporter`
- `useProjectImporter()` - Returns `() => IProjectImporter`

#### Interface-Based DI

```typescript
// Interface files define contracts
// src/ts/services/project/IProjectService.ts
export interface IProjectDatabase {
  saveProject(project: Project): Promise<void>;
  loadProject(id: string): Promise<Project | null>;
}

// src/ts/services/upload/IUploadServices.ts
export interface IAssetStorageService {
  save(data: CreateAssetData): Promise<string>;
  getById(id: string): Promise<DBAsset | undefined>;
}

// src/ts/sync/ISyncServices.ts
export interface IStorageManager {
  initialize(): Promise<void>;
  storeCharacters(characters: Character[], version: string): Promise<void>;
}
```

#### Constructor Injection with Defaults

```typescript
// Dependencies interface
export interface ProjectServiceDeps {
  database: IProjectDatabase;
  exporter: IProjectExporter;
  importer: IProjectImporter;
}

export class ProjectService implements IProjectService {
  private readonly db: IProjectDatabase;
  private readonly exporter: IProjectExporter;

  // Partial<Deps> allows any subset of dependencies
  constructor(deps: Partial<ProjectServiceDeps> = {}) {
    // Defaults to singleton instances for production
    this.db = deps.database ?? projectDatabaseService;
    this.exporter = deps.exporter ?? projectExporter;
  }
}

// Singleton for application use (backward compatible)
export const projectService = new ProjectService();
```

#### Services Using This Pattern

| Service | Dependencies Injected |
|---------|----------------------|
| `ProjectService` | `IProjectDatabase`, `IProjectExporter`, `IProjectImporter` |
| `ProjectExporter` | `IAssetStorageService` |
| `FileUploadService` | `IAssetStorageService`, `IFileValidationService`, `IImageProcessingService` |
| `DataSyncService` | `IStorageManager`, `IGitHubReleaseClient`, `IPackageExtractor` |
| `TokenGenerator` | `IImageCache` |

#### Testing with Mocks

```typescript
const mockDb = { saveProject: vi.fn(), loadProject: vi.fn() };
const mockExporter = { exportAsZip: vi.fn() };
const service = new ProjectService({
  database: mockDb,
  exporter: mockExporter
});

// Test behavior
await service.createProject(options);
expect(mockDb.saveProject).toHaveBeenCalled();
```

**Why**:
- Enables unit testing by allowing mock injection
- Zero breaking changes - existing code continues to work
- Services depend on abstractions, not concretions (SOLID)
- Loose coupling improves maintainability

---

## Storage Architecture

### IndexedDB Schema (via Dexie)

```typescript
// Character data store
interface CharacterStore {
  id: string;           // Primary key
  name: string;
  team: Team;
  ability: string;
  image: string;        // URL or asset reference
  // ...
}

// Project store
interface ProjectStore {
  id: string;           // UUID
  name: string;
  script: ScriptEntry[];
  options: TokenGeneratorOptions;
  createdAt: Date;
  updatedAt: Date;
  versions: ProjectVersion[];
}

// Sync metadata
interface SyncMetadata {
  key: string;          // 'sync-metadata'
  version: string;      // vYYYY.MM.DD-rN
  lastChecked: Date;
  etag?: string;
}
```

### Cache API Usage

```typescript
// Character icon cache
const cache = await caches.open('character-icons-v1');
await cache.put(iconUrl, imageResponse);

// Retrieval
const response = await cache.match(iconUrl);
if (response) {
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
```

### Storage Quotas

| Storage | Typical Usage | Quota Strategy |
|---------|---------------|----------------|
| IndexedDB | 2-5 MB | No explicit limit |
| Cache API | 15-20 MB | LRU eviction |
| localStorage | < 100 KB | Settings only |

---

## Caching Strategy

### Multi-tier Cache

```
┌─────────────────────────────────────────┐
│           Request for Image             │
└───────────────────┬─────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│     L1: In-Memory (globalImageCache)    │
│     - HTMLImageElement instances        │
│     - LRU eviction at 100 items         │
└───────────────────┬─────────────────────┘
                    │ miss
                    ▼
┌─────────────────────────────────────────┐
│     L2: Cache API (character-icons)     │
│     - Binary blob storage               │
│     - Persistent across sessions        │
└───────────────────┬─────────────────────┘
                    │ miss
                    ▼
┌─────────────────────────────────────────┐
│     L3: Network (GitHub/External)       │
│     - CORS proxy for external images    │
│     - Response cached to L2             │
└─────────────────────────────────────────┘
```

### Cache Warming Strategy

```typescript
// Project-based warming
const strategy = new ProjectPreRenderStrategy();
strategy.warmForProject(project);  // Pre-loads project characters

// Batch warming
await generator.prewarmImageCache(characters);
```

### Cache Invalidation

```typescript
// On new sync data
cacheInvalidationService.invalidateCharacterCache();

// On options change affecting render
cacheInvalidationService.invalidateTokenCache();
```

---

## Error Handling

### Error Hierarchy

```
TokenGeneratorError (base)
├── DataLoadError           - Loading failures
├── ValidationError         - Data validation (validationErrors[])
├── TokenCreationError      - Generation (tokenName)
├── PDFGenerationError      - PDF export
├── ZipCreationError        - ZIP export
├── ResourceNotFoundError   - Missing resources (type, name)
├── UIInitializationError   - DOM issues (missingElements[])
├── DataSyncError           - Sync operations (syncOperation)
├── StorageError            - Storage issues (storageType)
├── GitHubAPIError          - GitHub API (statusCode, rateLimited)
└── PackageValidationError  - Package issues (validationType)
```

### Error Handling Pattern

```typescript
// Throwing with context
throw new TokenCreationError(
  'Failed to render character image',
  character.name,
  originalError
);

// Handling with ErrorHandler
try {
  await operation();
} catch (error) {
  const userMessage = ErrorHandler.getUserMessage(error);
  ErrorHandler.log(error, 'ComponentName');

  if (ErrorHandler.shouldShowToUser(error)) {
    showToast(userMessage);
  }
}
```

### Error Boundary Pattern

```typescript
// React error boundary for component trees
<ErrorBoundary fallback={<ErrorFallback />}>
  <TokenGrid />
</ErrorBoundary>
```

---

## Security Considerations

### CORS Handling

```typescript
// External images via CORS proxy (uses CONFIG.API.CORS_PROXY)
import { applyCorsProxy, loadImage } from '@/ts/utils/imageUtils.js';

// Method 1: Use applyCorsProxy for explicit proxying
const proxyUrl = applyCorsProxy(originalUrl);

// Method 2: loadImage auto-handles CORS with fallback to proxy
const image = await loadImage(externalUrl);

// Local assets direct (no proxy needed)
const localImage = await loadLocalImage('/images/icon.webp');
```

### Input Validation

```typescript
// Script JSON validation
const { isValid, errors, characters } = parseScriptData(jsonInput);

// Character ID validation
const isValidId = characterLookupService.isValid(characterId);
```

### Storage Security

- No sensitive data in localStorage (settings only)
- No credentials stored client-side
- GitHub API uses unauthenticated requests (rate limited)

---

## Performance Optimizations

### Canvas Optimizations

```typescript
// Canvas pooling
const canvas = canvasPool.acquire(diameter);
// ... use canvas
canvasPool.release(canvas);

// Text measurement caching
const width = measureTextCached(ctx, text, font);

// Path caching for repeated shapes
const path = pathCache.get(pathKey) || createAndCachePath(pathKey);
```

### React Optimizations

```typescript
// Memoization
const memoizedTokens = useMemo(() => groupTokens(tokens), [tokens]);

// Callback stability
const handleClick = useCallback(() => { /* ... */ }, [dependency]);

// Virtualization for large lists
<VirtualizedList items={characters} />
```

### Bundle Optimization

```typescript
// Dynamic imports for heavy libraries
const jsPDF = await import('jspdf');
const JSZip = await import('jszip');

// Code splitting by route
const StudioView = lazy(() => import('./Views/StudioView'));
```

### Rendering Optimizations

```typescript
// Batch token generation
const tokens = await generateAllTokens(characters, options);

// Web Workers for heavy computation (planned)
const worker = new Worker('./tokenWorker.js');
```

---

## Architecture Decision Records

### ADR-001: IndexedDB + Cache API over localStorage

**Context**: Need persistent storage for character data (2-5 MB) and images (15-20 MB).

**Decision**: Use IndexedDB via Dexie for structured data, Cache API for binary images.

**Rationale**:
- localStorage limited to 5 MB
- IndexedDB supports structured queries
- Cache API designed for asset caching
- Both support offline scenarios

### ADR-002: Strategy Pattern for Icon Layout

**Context**: Different token types have varying layout requirements.

**Decision**: Implement IconLayoutStrategy interface with concrete implementations.

**Rationale**:
- Open/Closed principle - new types don't modify existing code
- Testable - strategies can be unit tested independently
- Maintainable - layout logic concentrated in strategy classes

### ADR-003: Deferred CodeMirror Integration

**Context**: Want rich JSON editor with autocomplete and validation.

**Decision**: Defer to v0.4.x release.

**Rationale**:
- Bundle size impact (+150-200 KB gzipped)
- Core sync functionality higher priority
- Current textarea works for basic use
- Can be added incrementally

### ADR-004: React Context over Redux/Zustand

**Context**: Need global state management.

**Decision**: Use React Context with custom hooks.

**Rationale**:
- Simpler mental model
- No additional dependencies
- Sufficient for current complexity
- Re-evaluate at v0.5.x if needed

### ADR-005: Singleton Services

**Context**: Services like logging, image cache, and sync need shared state.

**Decision**: Export singleton instances.

**Rationale**:
- Simple access pattern
- Consistent state across app
- Can be replaced for testing via DI

### ADR-006: Modular Background Effects Architecture

**Context**: Background effects system was a single 1181-line file mixing noise generation, 11 texture algorithms, visual effects, and color utilities.

**Decision**: Refactor into modular architecture with Strategy pattern.

**Structure**:
```
backgroundEffects/
├── BackgroundRenderer.ts    # Orchestrator (~250 lines)
├── noise/                   # Reusable noise utilities
├── textures/               # Strategy pattern (11 files, ~50 lines each)
└── effects/                # Visual effect strategies
```

**Rationale**:
- **Single Responsibility**: Each texture/effect is its own file
- **Open/Closed**: Add new textures without modifying existing code
- **Testability**: Strategies can be unit tested independently
- **Maintainability**: Find and modify specific textures quickly
- **Extensibility**: `TextureFactory.register()` for custom textures

**Trade-offs**:
- More files to navigate (mitigated by barrel exports)
- Slightly more complex import structure
- Initial refactoring effort

### ADR-007: Constructor Injection with Default Parameters

**Context**: Services had hard-coded singleton dependencies, making unit testing difficult and violating Dependency Inversion Principle.

**Decision**: Refactor services to use constructor injection with `Partial<Deps>` pattern, maintaining backward compatibility via default parameters.

**Pattern**:
```typescript
export interface ServiceDeps {
  dependency1: IDependency1;
  dependency2: IDependency2;
}

export class Service {
  constructor(deps: Partial<ServiceDeps> = {}) {
    this.dep1 = deps.dependency1 ?? singletonInstance;
    this.dep2 = deps.dependency2 ?? anotherSingleton;
  }
}

// Backward compatible singleton
export const serviceInstance = new Service();
```

**Services Refactored**:
- `ProjectService` (database, exporter, importer)
- `ProjectExporter` (assetStorage)
- `FileUploadService` (assetStorage, fileValidation, imageProcessing)
- `DataSyncService` (storageManager, githubClient, packageExtractor)

**Interface Files Created**:
- `IProjectService.ts` - Project service contracts
- `IUploadServices.ts` - Upload/asset service contracts
- `ISyncServices.ts` - Sync service contracts

**Rationale**:
- **Zero breaking changes** - existing code continues to work
- **Full testability** - all dependencies can be mocked
- **SOLID compliance** - depends on abstractions, not concretions
- **Gradual adoption** - can refactor services incrementally

**Trade-offs**:
- More boilerplate (interfaces + deps type)
- Must maintain interface/implementation parity
- Slightly more complex constructors

### ADR-008: Unified Tab Pre-Render Service (Facade Pattern)

**Context**: Tab hover pre-rendering was scattered across multiple locations:
- `TabNavigation.tsx` had separate functions for characters, tokens, and script pre-rendering
- `NightOrderContext.tsx` had its own cache lookup logic
- Cache keys didn't always match between pre-render trigger and lookup, causing cache misses

**Decision**: Create `TabPreRenderService` as a unified Facade for all tab hover pre-rendering.

**Implementation**:
```typescript
// Single service handles all tab pre-rendering
class TabPreRenderService {
  preRenderTab(tab: PreRenderableTab, context: TabPreRenderContext): TabPreRenderResult;
  getCachedNightOrder(scriptData: ScriptEntry[]): { firstNight, otherNight } | null;
  getCachedTokenDataUrl(filename: string): string | undefined;
  clearCache(tab: PreRenderableTab): void;
}

// Types
type PreRenderableTab = 'characters' | 'tokens' | 'script';
```

**Routing Strategy**:
- `characters` → Delegates to `CacheManager` strategy system (heavy canvas operations)
- `tokens` → Module-level cache for data URL encoding
- `script` → Module-level cache for night order computation

**Rationale**:
- **Single API** - One import, one method call for pre-rendering
- **Cache key consistency** - Same service hashes data identically for store and lookup
- **Appropriate caching** - Heavy operations use worker pool; lightweight data uses simple caches
- **Future-proof** - Easy to add new tab types without modifying callers

**Trade-offs**:
- Adds indirection layer
- Must maintain service as tabs evolve
- Module-level caches don't share eviction policies with CacheManager

### ADR-009: SSOT Character Image Resolution in Token Generation

**Context**: Token generation used `getCharacterImageUrl()` (simple string extraction) which bypassed the SSOT (`resolveCharacterImageUrl`) causing asset references and sync storage images to fail.

**Decision**: Integrate SSOT into `batchGenerator.ts` by pre-resolving all character image URLs at the entry point of `generateAllTokens()`.

**Implementation**:
```typescript
// Pre-resolve before generation
const resolvedImageUrls = await preResolveCharacterImageUrls(characters, generateVariants);

// Store in BatchContext for O(1) lookup
interface BatchContext {
  resolvedImageUrls: Map<string, string>;  // characterId:variantIndex -> resolved URL
}

// Use resolved URLs in generation functions
const resolvedUrl = ctx.resolvedImageUrls.get(`${character.id}:${variant.variantIndex}`);
```

**Rationale**:
- **Unified resolution path** - All character image types handled consistently
- **Asset references work** - `asset:uuid` properly resolved
- **Sync storage supported** - Official character images from IndexedDB
- **Performance** - Batch parallel resolution before generation starts
- **Minimal changes** - Resolved URLs flow through existing code

**Trade-offs**:
- Additional async step before generation
- Memory for resolved URL map (negligible for typical scripts)
- Must maintain map key format consistency

---

## Future Architecture Considerations

### Potential Improvements

1. **Web Workers** for token generation (non-blocking UI)
2. **Service Worker** for true offline support and background sync
3. **Delta Updates** for incremental data sync
4. **Shared Workers** for multi-tab coordination
5. **WASM** for performance-critical canvas operations

### Scalability Concerns

| Area | Current | Potential Solution |
|------|---------|-------------------|
| Large scripts (100+ chars) | Adequate | Virtual scrolling |
| Many tokens (500+) | Slow render | Progressive loading |
| Concurrent tabs | Conflict potential | BroadcastChannel |
| Mobile devices | Not optimized | Responsive redesign |

---

## Codebase Quality Analysis

### Strengths (Maintain These)

1. **Well-organized module structure** with barrel exports
2. **Comprehensive error hierarchy** with contextual information
3. **Environment-aware logging** that auto-filters in production
4. **Strategy pattern** for extensible token layouts
5. **Strong TypeScript** with strict mode enabled
6. **Separation of concerns** across modules
7. **Extensive test coverage** for sync module (92 tests)
8. **Constants/config** properly separated from logic
9. **Custom hooks** extract complex logic from components
10. **SSOT** for character image resolution

### Areas for Improvement

1. **Inconsistent DI**: Not all classes accept injected dependencies
2. **Test coverage gaps**: Many hooks and components lack unit tests

### Clever Solutions Worth Noting

1. **Icon Layout Strategies** (`iconLayoutStrategies.ts`): Clean strategy pattern
2. **Character Lookup Service**: O(1) validation via Map
3. **Multi-tier caching**: Policies + strategies for intelligent cache management
4. **Event-based sync**: Non-blocking updates with progress events
5. **Canvas pooling**: Reuse canvases for performance
6. **Circular text layout calculation**: Smart text wrapping for circular tokens
7. **TokenGenerator composition**: Orchestration + TokenImageRenderer + TokenTextRenderer
8. **TabPreRenderService**: Facade pattern for unified tab pre-rendering with consistent cache keys

### Technical Debt to Track

1. Add tests for custom hooks
2. Complete dependency injection across all services
3. Implement comprehensive E2E test suite
4. Add unit tests for TokenImageRenderer and TokenTextRenderer

---

*This document should be updated whenever significant architectural changes are made. See ROADMAP.md for planned changes.*
