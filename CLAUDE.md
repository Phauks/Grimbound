# Claude Code Generation Guide for Clocktower Token Generator

> **Purpose**: This document is Claude's primary reference for understanding the codebase, making consistent changes, and maintaining code quality. Claude MUST consult this before making any modifications.

---

## CRITICAL: Documentation Maintenance Requirements

**Claude MUST maintain documentation whenever making code changes:**

1. **After adding new utilities/functions**: Update the relevant module table in this document
2. **After modifying architecture**: Update ARCHITECTURE.md
3. **After adding features**: Update ROADMAP.md to reflect completion or new items
4. **After fixing bugs**: Update CHANGELOG.md under [Unreleased]
5. **After changing APIs**: Update JSDoc comments AND this document

**Documentation is NOT optional** - undocumented code creates technical debt and hampers future development. Every significant change requires corresponding documentation updates.

---

## Pre-Implementation Checklist

**Before writing ANY new code, Claude MUST:**

### 1. Search for Existing Utilities (In Order)

| Priority | Location | Contains |
|----------|----------|----------|
| 1 | `src/ts/utils/` | General utilities (strings, images, JSON, colors, async, **logger**, **errorUtils**) |
| 2 | `src/ts/canvas/` | Canvas rendering (text, shapes, images, QR codes, **gradients**, **pooling**) |
| 3 | `src/ts/data/` | Data loading and script parsing |
| 4 | `src/ts/sync/` | GitHub data synchronization (IndexedDB, Cache API) |
| 5 | `src/ts/export/` | Export utilities (PDF, PNG, ZIP, metadata) |
| 6 | `src/ts/generation/` | Token generation with **Strategy Pattern** and **DI** |
| 7 | `src/ts/cache/` | **Multi-tier caching** with policies and strategies |
| 8 | `src/ts/services/` | Service layer (project management, upload processing) |
| 9 | `src/ts/studio/` | Studio/editor functionality |
| 10 | `src/hooks/` | Custom React hooks (35+ hooks for various concerns) |
| 11 | `src/contexts/` | React contexts for global state |
| 12 | `src/ts/constants.ts` | Layout ratios, colors, timing |
| 13 | `src/ts/config.ts` | Application configuration |
| 14 | `src/ts/types/` | Type definitions |
| 15 | `src/ts/errors.ts` | Custom error hierarchy |

### 2. Check Before Creating

- [ ] Does a utility already exist? (Search by intent, not just name)
- [ ] Is there a similar pattern elsewhere?
- [ ] Should this be a constant instead of inline value?
- [ ] Should this be a type in `types/`?
- [ ] Should this be an error class in `errors.ts`?

### 3. Prefer Composition Over Creation

Combine existing utilities rather than writing new ones. Example:
```typescript
// Instead of writing new image loading logic:
import { loadImage } from '@/ts/utils/imageUtils.js';
import { resolveCharacterImageUrl } from '@/ts/utils/characterImageResolver.js';

const { url } = await resolveCharacterImageUrl(imageUrl, characterId);
const image = await loadImage(url);
```

---

## Core Programming Principles

### DRY (Don't Repeat Yourself)

**Violations to Watch For:**
- Similar code in multiple files
- Magic numbers appearing in multiple places
- Duplicated validation logic
- Repeated error handling patterns

**Solutions:**
```typescript
// BAD: Magic numbers everywhere
const imgSize = diameter * 0.65;
const textRadius = radius * 0.85;

// GOOD: Named constants
import { CHARACTER_LAYOUT } from '@/ts/constants.js';
const imgSize = diameter * CHARACTER_LAYOUT.IMAGE_SIZE_RATIO;
const textRadius = radius * CHARACTER_LAYOUT.CURVED_TEXT_RADIUS;
```

### SOLID Principles

**Single Responsibility:**
- Each module should have ONE clear purpose
- Functions should do ONE thing well
- Classes should have ONE reason to change

**Open/Closed:**
- Use Strategy Pattern for extensibility (see `iconLayoutStrategies.ts`)
- Add new behavior through new classes, not modifying existing ones

**Dependency Inversion:**
- Depend on abstractions, not concretions
- Use dependency injection for testability
```typescript
// GOOD: Injected dependency
class TokenGenerator {
  constructor(
    options: TokenGeneratorOptions,
    private imageCache: IImageCache = globalImageCache
  ) {}
}
```

### WYSIWYG (What You See Is What You Get)

- Code should be self-documenting
- Variable names should clearly indicate purpose
- Function names should describe action and subject
- Avoid clever tricks that obscure intent

---

## Module Architecture

### Directory Structure

```
src/
├── ts/                          # Core TypeScript modules
│   ├── canvas/                  # Canvas rendering
│   │   ├── index.ts             # Barrel export
│   │   ├── canvasUtils.ts       # Base canvas operations
│   │   ├── canvasOptimizations.ts # Performance utilities
│   │   ├── canvasPool.ts        # Canvas reuse pool
│   │   ├── gradientUtils.ts     # Gradient rendering
│   │   ├── accentDrawing.ts     # Decorative elements
│   │   ├── qrGeneration.ts      # QR code generation
│   │   ├── textDrawing.ts       # Text rendering
│   │   └── backgroundEffects/   # Modular background system
│   │       ├── index.ts         # Module barrel export
│   │       ├── BackgroundRenderer.ts # Main orchestrator
│   │       ├── noise/           # Procedural noise utilities
│   │       │   ├── perlin.ts    # Perlin noise
│   │       │   └── fbm.ts       # FBM, turbulence
│   │       ├── textures/        # Strategy pattern textures
│   │       │   ├── TextureStrategy.ts # Interface + base
│   │       │   └── [11 texture files] # Marble, clouds, etc.
│   │       └── effects/         # Visual effects
│   │           ├── VignetteEffect.ts
│   │           ├── InnerGlowEffect.ts
│   │           └── VibranceEffect.ts
│   │
│   ├── cache/                   # Multi-tier caching system
│   │   ├── index.ts             # Barrel export
│   │   ├── CacheManager.ts      # Cache facade (application layer)
│   │   ├── CacheInvalidationService.ts
│   │   ├── TabPreRenderService.ts # Unified tab hover pre-rendering
│   │   ├── charactersPreRenderHelpers.ts
│   │   ├── core/                # Core cache types & interfaces
│   │   ├── manager/             # Pre-render cache manager
│   │   ├── policies/            # Eviction & warming policies
│   │   ├── strategies/          # Pre-render strategies
│   │   └── utils/               # EventEmitter, hashUtils, helpers
│   │
│   ├── data/                    # Data loading and parsing
│   │   ├── index.ts             # Barrel export
│   │   ├── dataLoader.ts        # I/O operations
│   │   ├── scriptParser.ts      # JSON parsing & validation
│   │   ├── characterUtils.ts    # Character utilities
│   │   ├── characterLookup.ts   # O(1) character validation
│   │   └── exampleScripts.ts    # Predefined scripts
│   │
│   ├── export/                  # Export functionality
│   │   ├── index.ts             # Barrel export
│   │   ├── pdfGenerator.ts      # PDF generation
│   │   ├── zipExporter.ts       # ZIP creation
│   │   ├── pngExporter.ts       # PNG download
│   │   ├── pngMetadata.ts       # PNG tEXt chunks
│   │   └── completePackageExporter.ts
│   │
│   ├── generation/              # Token generation
│   │   ├── index.ts             # Barrel export
│   │   ├── TokenGenerator.ts    # Main generator (orchestration)
│   │   ├── TokenImageRenderer.ts # Image rendering logic
│   │   ├── TokenTextRenderer.ts # Text rendering logic
│   │   ├── batchGenerator.ts    # Batch operations
│   │   ├── presets.ts           # Preset configurations
│   │   ├── ImageCacheAdapter.ts # Cache adapter for DI
│   │   └── iconLayoutStrategies.ts # Strategy pattern
│   │
│   ├── nightOrder/              # Night order sheet generation
│   │   ├── index.ts
│   │   ├── nightOrderLayout.ts
│   │   ├── nightOrderTypes.ts
│   │   └── specialEntries.ts
│   │
│   ├── services/                # Service layer
│   │   ├── ServiceContainer.ts  # Lightweight DI container
│   │   ├── project/             # Project management
│   │   │   ├── IProjectService.ts  # Interfaces (DI contracts)
│   │   │   ├── ProjectService.ts   # Main orchestrator (uses DI)
│   │   │   ├── ProjectDatabaseService.ts
│   │   │   ├── ProjectExporter.ts
│   │   │   └── ProjectImporter.ts
│   │   └── upload/              # File upload processing
│   │       ├── IUploadServices.ts  # Interfaces (DI contracts)
│   │       ├── FileValidationService.ts
│   │       ├── ImageProcessingService.ts
│   │       ├── AssetStorageService.ts
│   │       ├── AssetSuggestionService.ts
│   │       └── assetResolver.ts
│   │
│   ├── studio/                  # Studio/editor features
│   │   ├── index.ts
│   │   ├── backgroundRemoval.ts
│   │   ├── canvasOverlay.ts
│   │   ├── characterPresets.ts
│   │   ├── layerManager.ts
│   │   ├── logoTemplates.ts
│   │   ├── memoryManager.ts
│   │   └── navigationHelpers.ts
│   │
│   ├── sync/                    # GitHub data synchronization
│   │   ├── index.ts             # Barrel export
│   │   ├── ISyncServices.ts     # Interfaces (DI contracts)
│   │   ├── dataSyncService.ts   # Main orchestrator (uses DI)
│   │   ├── githubReleaseClient.ts
│   │   ├── packageExtractor.ts
│   │   ├── storageManager.ts    # IndexedDB + Cache API
│   │   ├── versionManager.ts
│   │   └── migrationHelper.ts
│   │
│   ├── types/                   # Type definitions
│   │   ├── index.ts             # Main types
│   │   ├── tokenOptions.ts
│   │   ├── project.ts
│   │   ├── navigation.ts
│   │   ├── measurement.ts
│   │   ├── backgroundEffects.ts
│   │   └── declarations/        # Module declarations
│   │
│   ├── ui/                      # UI utilities
│   │   └── index.ts
│   │
│   ├── utils/                   # General utilities
│   │   ├── index.ts             # Barrel export
│   │   ├── asyncUtils.ts        # Debounce, array shuffling
│   │   ├── characterImageResolver.ts # SSOT for images
│   │   ├── classNames.ts        # CSS utility
│   │   ├── colorUtils.ts        # Color manipulation
│   │   ├── errorUtils.ts        # Error handling helpers
│   │   ├── imageCache.ts        # Global image cache
│   │   ├── imageUtils.ts        # Image loading
│   │   ├── jsonUtils.ts         # JSON operations
│   │   ├── logger.ts            # Structured logging
│   │   ├── measurementUtils.ts
│   │   ├── nameGenerator.ts     # Unique names
│   │   ├── progressUtils.ts     # Progress tracking
│   │   ├── scriptSorting.ts
│   │   ├── storageKeys.ts       # localStorage keys
│   │   ├── stringUtils.ts       # String manipulation
│   │   └── tokenGrouping.ts     # Token grouping
│   │
│   ├── config.ts                # Application config
│   ├── constants.ts             # Layout constants
│   ├── constants/               # Additional constants
│   │   └── builtInAssets.ts
│   ├── errors.ts                # Error hierarchy
│   ├── themes.ts                # Theme definitions
│   └── index.ts                 # Root barrel export
│
├── components/                  # React components
│   ├── Layout/                  # App shell, header, footer
│   ├── Modals/                  # Modal dialogs
│   ├── Shared/                  # Reusable components
│   │   ├── Assets/              # Asset-related
│   │   ├── Controls/            # Input controls
│   │   ├── Downloads/           # Download UI
│   │   ├── Drawer/              # Drawer panels
│   │   ├── Feedback/            # Status indicators
│   │   ├── Form/                # Form elements
│   │   ├── Json/                # JSON editor
│   │   ├── ModalBase/           # Modal primitives
│   │   ├── Options/             # Options panels
│   │   ├── Selectors/           # Selection UI
│   │   └── UI/                  # Generic UI
│   ├── ViewComponents/          # View-specific components
│   │   ├── CharactersComponents/
│   │   ├── JsonComponents/
│   │   ├── ProjectsComponents/
│   │   ├── ScriptComponents/
│   │   ├── StudioComponents/
│   │   └── TokensComponents/
│   └── Views/                   # Main views
│
├── contexts/                    # React contexts
│   ├── TokenContext.tsx
│   ├── ProjectContext.tsx
│   ├── DataSyncContext.tsx
│   └── ...
│
├── hooks/                       # Custom React hooks (35+)
│   ├── index.ts                 # Barrel export
│   ├── useTokenGenerator.ts
│   ├── useProjectAutoSave.ts
│   ├── usePreRenderCache.ts
│   └── ... (see full list below)
│
└── styles/                      # CSS modules
    ├── components/              # Component styles
    ├── layouts/                 # Layout styles
    └── index.css                # Global styles
```

---

## Key Patterns & Implementations

### Pattern 1: Structured Logging

**ALWAYS use the logger instead of console.**

```typescript
// BAD
console.log('Loading data...');
console.error('Failed:', error);

// GOOD
import { logger } from '@/ts/utils/logger.js';

logger.info('DataLoader', 'Loading data...');
logger.error('DataLoader', 'Failed to load', error);

// Child loggers for modules
const syncLogger = logger.child('DataSync');
syncLogger.debug('Checking for updates');

// Performance timing
const result = await logger.time('TokenGen', 'Generate tokens', async () => {
  return await generateAllTokens(characters);
});
```

### Pattern 2: Error Handling

**Use typed error classes and the ErrorHandler utility.**

```typescript
import {
  TokenCreationError,
  ValidationError,
  ErrorHandler
} from '@/ts/errors.js';

// Throwing errors
throw new TokenCreationError('Failed to render', characterName, originalError);
throw new ValidationError('Invalid script', validationErrors);

// Handling errors
try {
  await generateToken(character);
} catch (error) {
  const message = ErrorHandler.getUserMessage(error);
  ErrorHandler.log(error, 'TokenGeneration');
}
```

**Error Class Hierarchy:**
- `TokenGeneratorError` (base)
  - `DataLoadError` - JSON/API loading failures
  - `ValidationError` - Data validation (includes `validationErrors[]`)
  - `TokenCreationError` - Canvas/generation (includes `tokenName`)
  - `PDFGenerationError` - PDF export
  - `ZipCreationError` - ZIP export
  - `ResourceNotFoundError` - Missing resources (includes `resourceType`, `resourceName`)
  - `UIInitializationError` - DOM issues (includes `missingElements[]`)
  - `DataSyncError` - Sync operations (includes `syncOperation`)
  - `StorageError` - Storage issues (includes `storageType`)
  - `GitHubAPIError` - GitHub API (includes `statusCode`, `rateLimited`)
  - `PackageValidationError` - Package issues (includes `validationType`)

### Pattern 3: Strategy Pattern (Icon Layout)

```typescript
// iconLayoutStrategies.ts
export interface IconLayoutStrategy {
  calculate(context: LayoutContext): IconLayout;
}

export class CharacterIconStrategy implements IconLayoutStrategy {
  calculate(context: LayoutContext): IconLayout { /* ... */ }
}

export class ReminderIconStrategy implements IconLayoutStrategy {
  calculate(context: LayoutContext): IconLayout { /* ... */ }
}

// Factory for creating strategies
export const IconLayoutStrategyFactory = {
  create(tokenType: TokenTypeValue, ...args): IconLayoutStrategy {
    switch (tokenType) {
      case TokenType.CHARACTER:
        return new CharacterIconStrategy(...args);
      case TokenType.REMINDER:
        return new ReminderIconStrategy();
      // ...
    }
  }
};

// Usage in TokenGenerator
const strategy = IconLayoutStrategyFactory.create(tokenType, hasAbilityText);
const layout = strategy.calculate(context);
```

### Pattern 3b: Strategy Pattern (Texture Generation)

```typescript
// backgroundEffects/textures/TextureStrategy.ts
export interface TextureStrategy {
  generate(context: TextureContext): TextureResult;
  readonly name: string;
}

export abstract class BaseTextureStrategy implements TextureStrategy {
  abstract readonly name: string;
  abstract generate(context: TextureContext): TextureResult;

  protected isInCircle(x: number, y: number, center: number): boolean { /* ... */ }
  protected forEachCircularPixel(context: TextureContext, callback: Function): ImageData { /* ... */ }
}

// Individual texture files: MarbleTexture.ts, CloudsTexture.ts, etc.
export class MarbleTextureStrategy extends BaseTextureStrategy {
  readonly name = 'marble';
  generate(context: TextureContext): TextureResult {
    // Use noise utilities to generate marble pattern
    return { success: true };
  }
}

// Factory for creating strategies
const strategy = TextureFactory.create('marble');
strategy?.generate(textureContext);

// Extending with custom textures
TextureFactory.register('custom', new CustomTextureStrategy());
```

### Pattern 4: Dependency Injection

The codebase uses **constructor injection with default parameters** for testability while maintaining convenient usage.

#### Interface Definitions

Interfaces live in dedicated files (e.g., `IProjectService.ts`, `IUploadServices.ts`, `ISyncServices.ts`):

```typescript
// src/ts/services/project/IProjectService.ts
export interface IProjectDatabase {
  saveProject(project: Project): Promise<void>;
  loadProject(id: string): Promise<Project | null>;
  deleteProject(id: string): Promise<void>;
  listProjects(): Promise<Project[]>;
}

// src/ts/services/upload/IUploadServices.ts
export interface IFileValidationService {
  validate(file: File, assetType: AssetType): Promise<ValidationResult>;
  detectMimeType(file: File): Promise<string>;
}

// src/ts/sync/ISyncServices.ts
export interface IStorageManager {
  initialize(): Promise<void>;
  storeCharacters(characters: Character[], version: string): Promise<void>;
  getCharacter(id: string): Promise<CachedCharacter | null>;
}
```

#### Constructor Injection Pattern

Services accept dependencies via constructor with **defaults for production usage**:

```typescript
// src/ts/services/project/ProjectService.ts
export interface ProjectServiceDeps {
  database: IProjectDatabase;
  exporter: IProjectExporter;
  importer: IProjectImporter;
}

export class ProjectService implements IProjectService {
  private readonly db: IProjectDatabase;
  private readonly exporter: IProjectExporter;
  private readonly importer: IProjectImporter;

  constructor(deps: Partial<ProjectServiceDeps> = {}) {
    // Defaults to singleton instances for production
    this.db = deps.database ?? projectDatabaseService;
    this.exporter = deps.exporter ?? projectExporter;
    this.importer = deps.importer ?? projectImporter;
  }

  async createProject(options: CreateProjectOptions): Promise<Project> {
    // Use injected dependency, not direct import
    await this.db.saveProject(project);
    return project;
  }
}

// Singleton for application use
export const projectService = new ProjectService();
```

#### Testing with Mocks

```typescript
import { describe, it, expect, vi } from 'vitest';
import { ProjectService } from './ProjectService';

describe('ProjectService', () => {
  it('should save project to database', async () => {
    // Create mock dependencies
    const mockDb = {
      saveProject: vi.fn().mockResolvedValue(undefined),
      loadProject: vi.fn(),
      deleteProject: vi.fn(),
      listProjects: vi.fn(),
    };

    // Inject mock
    const service = new ProjectService({ database: mockDb });

    await service.createProject({ name: 'Test Project' });

    expect(mockDb.saveProject).toHaveBeenCalled();
  });
});
```

#### React Component DI (ServiceContext)

For React components and hooks, use `ServiceContext` to access services:

```typescript
import { useAssetStorageService, useProjectService } from '@/contexts/ServiceContext';

export function MyComponent() {
  // Get services from DI context
  const assetStorageService = useAssetStorageService();
  const projectService = useProjectService();

  // Use in callbacks - remember to include in dependency arrays
  const handleSave = useCallback(async () => {
    await projectService.saveProject(project);
  }, [projectService, project]);
}
```

**Available Hooks**:
- `useProjectService()` - Project CRUD, export/import
- `useProjectDatabaseService()` - Low-level DB operations
- `useAssetStorageService()` - Asset CRUD, URLs, queries
- `useFileUploadService()` - File upload orchestration
- `useFileValidationService()` - File validation
- `useDataSyncService()` - GitHub sync, characters

**Factory Hooks** (return factory functions for creating new instances):
- `useProjectExporter()` - Returns `() => IProjectExporter` for creating exporter instances
- `useProjectImporter()` - Returns `() => IProjectImporter` for creating importer instances

**Testing with ServiceProvider Overrides**:
```typescript
<ServiceProvider overrides={{ projectService: mockProjectService }}>
  <ComponentUnderTest />
</ServiceProvider>
```

#### Service Container (Optional)

For complex scenarios, use the lightweight `ServiceContainer`:

```typescript
import { ServiceContainer, ServiceTokens } from '@/ts/services/ServiceContainer.js';

// Create container
const container = new ServiceContainer();

// Register services
container.registerSingleton(ServiceTokens.ProjectDatabase, () => new ProjectDatabaseService());
container.register(ServiceTokens.ProjectService, (c) =>
  new ProjectService({
    database: c.resolve(ServiceTokens.ProjectDatabase),
  })
);

// Resolve with dependencies
const projectService = container.resolve<IProjectService>(ServiceTokens.ProjectService);

// Create scoped container for testing
const testContainer = container.createScope();
testContainer.registerInstance(ServiceTokens.ProjectDatabase, mockDatabase);
```

#### Available Interface Files

| File | Interfaces |
|------|------------|
| `src/ts/services/project/IProjectService.ts` | `IProjectService`, `IProjectDatabase`, `IProjectExporter`, `IProjectImporter` |
| `src/ts/services/upload/IUploadServices.ts` | `IFileValidationService`, `IImageProcessingService`, `IAssetStorageService`, `IFileUploadService` |
| `src/ts/sync/ISyncServices.ts` | `IGitHubReleaseClient`, `IStorageManager`, `IPackageExtractor`, `IDataSyncService` |
| `src/ts/generation/TokenImageRenderer.ts` | `IImageCache` |

#### DI Best Practices

1. **Always define interfaces** in dedicated files (`I*.ts`)
2. **Use constructor injection** with `Partial<Deps>` for optional overrides
3. **Provide defaults** pointing to singleton instances
4. **Export singleton** at bottom of file for production use
5. **Name deps consistently**: `database`, `exporter`, `storage`, etc.
6. **Create `*Deps` interface** documenting all dependencies

### Pattern 5: Custom Hooks Extraction

```typescript
// BAD: Complex component with mixed concerns
export function TokenGrid() {
  const [tokenToDelete, setTokenToDelete] = useState(null);
  const handleDelete = useCallback(...); // 30 lines
  const confirmDelete = useCallback(...); // 20 lines
  // Component is 200+ lines
}

// GOOD: Extract to custom hooks
import { useTokenDeletion, useTokenGrouping } from '@/hooks';

export function TokenGrid() {
  const deletion = useTokenDeletion({ tokens, setTokens });
  const grouped = useTokenGrouping(tokens);
  // Component is now 50 lines
}
```

### Pattern 6: Character Image Resolution (SSOT)

```typescript
// ALWAYS use the SSOT utility for character images
import { resolveCharacterImageUrl } from '@/ts/utils/characterImageResolver.js';

const result = await resolveCharacterImageUrl(imageUrl, characterId);
// result.url = resolved URL (http/data/blob)
// result.source = 'asset' | 'external' | 'sync' | 'fallback'
// result.blobUrl = blob URL to cleanup (if source is 'sync')

// For batch resolution in hooks
import { resolveCharacterImages } from '@/ts/utils/characterImageResolver.js';
const { urls, blobUrls } = await resolveCharacterImages(characters);

// For React components
import { useCharacterImageResolver } from '@/hooks/useCharacterImageResolver';
const { resolvedUrls, isLoading } = useCharacterImageResolver({ characters });
```

### Pattern 7: Unified Tab Pre-Rendering (Facade Pattern)

```typescript
// TabPreRenderService provides unified API for all tab hover pre-rendering
import { tabPreRenderService, type PreRenderableTab } from '@/ts/cache/index.js';

// Trigger pre-render when hovering over tabs
const handleTabHover = (tabId: EditorTab) => {
  const preRenderableTabs: PreRenderableTab[] = ['characters', 'tokens', 'script'];
  if (!preRenderableTabs.includes(tabId as PreRenderableTab)) return;

  tabPreRenderService.preRenderTab(tabId as PreRenderableTab, {
    characters,
    tokens,
    scriptMeta,
    generationOptions,
    lastSelectedCharacterUuid,
  });
};

// Access cached data in target components
const cached = tabPreRenderService.getCachedNightOrder(scriptData);
if (cached) {
  // Use cached night order immediately - no loading state needed
  setFirstNight(cached.firstNight);
  setOtherNight(cached.otherNight);
}

// Get cached token data URLs
const dataUrl = tabPreRenderService.getCachedTokenDataUrl(token.filename);

// Clear caches when needed
tabPreRenderService.clearCache('script');  // Clear specific tab
tabPreRenderService.clearAll();             // Clear all caches
```

**Supported Tabs**:
- `'characters'` - Delegates to CacheManager strategy system
- `'tokens'` - Encodes token canvases to data URLs
- `'script'` - Pre-computes night order data structures

**Why**: Consolidates scattered pre-render logic into single, consistent API. Ensures cache keys match between pre-render trigger and lookup.

---

## Utility Reference

### Utils Module (`src/ts/utils/`)

| Module | Purpose | Key Functions |
|--------|---------|---------------|
| `logger.ts` | Structured logging | `logger.debug/info/warn/error()`, `logger.time()`, `logger.child()` |
| `errorUtils.ts` | Error handling | `handleAsyncOperation()`, `retryOperation()` |
| `stringUtils.ts` | String manipulation | `sanitizeFilename()`, `generateUniqueFilename()`, `capitalize()` |
| `imageUtils.ts` | Image loading | `loadImage()`, `loadLocalImage()`, `canvasToBlob()`, `downloadFile()` |
| `imageCache.ts` | Global image cache | `globalImageCache.get()`, `.clear()`, `.stats()` |
| `characterImageResolver.ts` | **SSOT** for images | `resolveCharacterImageUrl()`, `resolveCharacterImages()` |
| `jsonUtils.ts` | JSON operations | `formatJson()`, `validateJson()`, `deepClone()` |
| `colorUtils.ts` | Color manipulation | `hexToRgb()`, `parseHexColor()`, `rgbToHsl()`, `hslToRgb()`, `interpolateColors()` |
| `classNames.ts` | CSS classes | `cn()` (classnames utility) |
| `progressUtils.ts` | Progress tracking | `createProgressState()`, `updateProgress()` |
| `tokenGrouping.ts` | Token organization | `groupTokensByTeam()`, `sortTokens()` |
| `scriptSorting.ts` | Script sorting | `sortCharactersByTeam()` |
| `storageKeys.ts` | localStorage keys | Constants for storage key names |
| `nameGenerator.ts` | Unique names | `generateUniqueName()` |

### Canvas Module (`src/ts/canvas/`)

| Module | Purpose | Key Functions |
|--------|---------|---------------|
| `canvasUtils.ts` | Base operations | `createCanvas()`, `createCircularClipPath()`, `wrapText()`, `drawImageCover()` |
| `canvasOptimizations.ts` | Performance | `measureTextCached()`, `pathCache` |
| `canvasPool.ts` | Canvas reuse | `acquireCanvas()`, `releaseCanvas()` |
| `textDrawing.ts` | Text rendering | `drawCurvedText()`, `drawCenteredWrappedText()`, `drawAbilityText()` |
| `accentDrawing.ts` | Decorations | `drawAccents()` |
| `qrGeneration.ts` | QR codes | `generateStyledQRCode()` |
| `gradientUtils.ts` | Gradients | `createBackgroundGradient()`, `getCSSGradient()` |
| `backgroundEffects/` | **Background system** | `renderBackground()`, `TextureFactory`, `applyEffects()` |

### Background Effects Submodule (`src/ts/canvas/backgroundEffects/`)

| Module | Purpose | Key Exports |
|--------|---------|-------------|
| `BackgroundRenderer.ts` | Main orchestrator | `renderBackground()`, `renderTexturePreview()` |
| `noise/perlin.ts` | Perlin noise | `perlin2D()`, `initPermutation()` |
| `noise/fbm.ts` | Fractal noise | `fbm()`, `turbulence()`, `ridgedNoise()` |
| `textures/TextureStrategy.ts` | Interface | `TextureStrategy`, `BaseTextureStrategy`, `TextureContext` |
| `textures/index.ts` | Factory | `TextureFactory.create()`, `TextureFactory.register()` |
| `effects/index.ts` | Effects | `applyEffects()`, `VignetteEffect`, `InnerGlowEffect` |
| `effects/VibranceEffect.ts` | Post-processing | `applyVibrance()`, `isVibranceEnabled()` |

**Available Textures**: marble, clouds, watercolor, perlin, radial-fade, organic-cells, silk-flow, parchment, linen, wood-grain, brushed-metal

### Cache Module (`src/ts/cache/`)

| Module | Purpose | Key Exports |
|--------|---------|-------------|
| `CacheManager.ts` | Cache facade | `cacheManager.preRender()`, `.clearCache()`, `.getStats()` |
| `TabPreRenderService.ts` | Unified tab pre-render | `tabPreRenderService.preRenderTab()`, `.getCachedNightOrder()`, `.getCachedTokenDataUrl()`, `.getCachedCharacterImageUrl()` |
| `CacheInvalidationService.ts` | Cache lifecycle | `cacheInvalidationService.invalidate()`, `.subscribe()` |
| `utils/hashUtils.ts` | Hash utilities | `simpleHash()`, `hashArray()`, `hashObject()`, `combineHashes()` |
| `utils/EventEmitter.ts` | Typed events | `EventEmitter` class |
| `policies/WarmingPolicy.ts` | Pre-warming | `WarmingPolicyManager`, `AppStartWarmingPolicy`, `ProjectOpenWarmingPolicy` |
| `policies/LRUEvictionPolicy.ts` | LRU eviction | `LRUEvictionPolicy` |
| `strategies/CharactersPreRenderStrategy.ts` | Character pre-render | `CharactersPreRenderStrategy` |
| `strategies/TokensPreRenderStrategy.ts` | Token pre-render | `TokensPreRenderStrategy` |
| `strategies/ProjectPreRenderStrategy.ts` | Project pre-render | `ProjectPreRenderStrategy` |

### Hooks (`src/hooks/`)

| Hook | Purpose |
|------|---------|
| `useTokenGenerator` | Token generation orchestration |
| `useTokenGrouping` | Token sorting/grouping logic |
| `useTokenDeletion` | Token deletion with confirmation |
| `useProjectAutoSave` | Auto-save functionality |
| `usePreRenderCache` | Cache warming/management |
| `useProjectCacheWarming` | Project-specific warming |
| `usePresets` | Preset management |
| `useExport` | Export operations |
| `useFilters` | Filter state management |
| `useScriptData` | Script data loading |
| `useCharacterImageResolver` | Image URL resolution |
| `useFileUpload` | File upload handling |
| `useCacheManager` | Cache lifecycle |
| `useCacheStats` | Cache statistics |
| `useStorageQuota` | Storage monitoring |
| `useProjects` | Project CRUD |
| `useSelection` | Selection state |
| `useUndoStack` | Undo/redo |
| `useModalBehavior` | Modal interactions |
| `useContextMenu` | Context menu state |
| `useTabSynchronization` | Multi-tab sync |
| `useStudioNavigation` | Studio navigation |
| `useTokenDetailEditor` | Token editing |
| `usePWAInstall` | PWA installation |
| `useAutoSavePreference` | Auto-save settings |
| `useAutoSaveTrigger` | Auto-save timing |
| `useAutoSaveDetector` | Change detection |
| `useAutoSaveTelemetry` | Save metrics |
| `useHasUnsavedWork` | Dirty state |
| `useExpandablePanel` | Panel expansion |
| `useIntersectionObserver` | Visibility detection |
| `useAutoResizeTextarea` | Textarea sizing |
| `useBuiltInAssets` | Asset loading |
| `useAssetManager` | Asset CRUD |

---

## Constants & Configuration

### Layout Constants (`src/ts/constants.ts`)

```typescript
// Character token layout
CHARACTER_LAYOUT = {
  IMAGE_SIZE_RATIO: 0.55,
  CURVED_TEXT_RADIUS: 0.88,
  ABILITY_TEXT_Y_POSITION: 0.62,
  ABILITY_TEXT_MAX_WIDTH: 0.85,
  TOKEN_COUNT_Y_POSITION: 0.15,
  // ... etc
}

// Reminder token layout
REMINDER_LAYOUT = {
  IMAGE_SIZE_RATIO: 0.5,
  CURVED_TEXT_RADIUS: 0.85,
}

// Meta token layout
META_TOKEN_LAYOUT = { /* ... */ }

// QR token layout
QR_TOKEN_LAYOUT = { /* ... */ }

// Colors
DEFAULT_COLORS = {
  TEXT_PRIMARY: '#FFFFFF',
  BADGE_BACKGROUND: 'rgba(0, 0, 0, 0.7)',
  FALLBACK_BACKGROUND: '#1a1a2e',
}
```

### Configuration (`src/ts/config.ts`)

```typescript
CONFIG = {
  TOKEN: {
    ROLE_DIAMETER_INCHES: 1.0,
    REMINDER_DIAMETER_INCHES: 0.75,
  },
  FONTS: {
    CHARACTER_NAME: { SIZE_RATIO: 0.08 },
    REMINDER_TEXT: { SIZE_RATIO: 0.12 },
    ABILITY_TEXT: { SIZE_RATIO: 0.05, LINE_HEIGHT: 1.2 },
  },
  ASSETS: {
    CHARACTER_BACKGROUNDS: '/images/Character Backgrounds/',
    SETUP_OVERLAYS: '/images/Setup Overlays/',
  },
  // ... etc
}
```

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

### Areas for Improvement (Address These)

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

## Code Review Checklist

Before committing any code, verify:

- [ ] **Use `@/` path aliases** - no `../../../` imports
- [ ] NO `console.log/error/warn` - use `logger` instead
- [ ] NO magic numbers - use constants
- [ ] NO duplicated code - extract to utilities
- [ ] Complex hooks extracted to separate files
- [ ] Dependencies injected, not hard-coded
- [ ] Event emitters use typed event maps
- [ ] Functions < 50 lines preferred
- [ ] Classes < 300 lines preferred
- [ ] No `any` types (use generics or `unknown`)
- [ ] JSDoc comments on public APIs
- [ ] Error handling uses error classes
- [ ] **Documentation updated** (this file, ARCHITECTURE.md, ROADMAP.md as needed)

---

## Import Conventions

### Path Aliases (REQUIRED)

This project uses the `@/` path alias to avoid deeply nested relative imports. **All imports MUST use the `@/` alias.**

```typescript
// ✅ CORRECT: Use @/ alias
import { createCanvas, drawCurvedText } from '@/ts/canvas/index.js';
import { TokenGenerator } from '@/ts/generation/index.js';
import { logger } from '@/ts/utils/index.js';
import { useTokenGenerator } from '@/hooks/useTokenGenerator';
import styles from '@/styles/components/layout/ViewLayout.module.css';

// ✅ CORRECT: Root barrel (for multiple modules)
import { createCanvas, logger, TokenGenerator } from '@/ts/index.js';

// ❌ WRONG: Relative imports with ../
// import { logger } from '../../../ts/utils/logger.js';
// import styles from '../../styles/components/Button.module.css';

// ⚠️ ACCEPTABLE: Relative imports within same directory or one level up
import { ViewLayoutPanel } from './ViewLayoutPanel';
import type { ButtonProps } from '../types';
```

### Alias Configuration

The `@` alias maps to `src/`:

| Alias Path | Resolves To |
|------------|-------------|
| `@/ts/*` | `src/ts/*` |
| `@/components/*` | `src/components/*` |
| `@/hooks/*` | `src/hooks/*` |
| `@/contexts/*` | `src/contexts/*` |
| `@/styles/*` | `src/styles/*` |

**Configuration files:**
- `tsconfig.json` - TypeScript path resolution
- `vite.config.ts` - Vite bundler resolution
- `vitest.config.ts` - Test runner resolution

### Barrel Exports

Prefer importing from barrel (`index.ts`) files when available:

```typescript
// Preferred: Import from barrel
import { createCanvas, drawCurvedText } from '@/ts/canvas/index.js';

// Avoid: Direct file imports (bypasses barrels)
// import { createCanvas } from '@/ts/canvas/canvasUtils.js';
```

---

## Testing Standards

### Test File Organization

- Place tests in `__tests__/` directories adjacent to source
- Name files: `*.test.ts` or `*.spec.ts`
- Mock external dependencies in `__mocks__/`

### Coverage Requirements

- Minimum 80% coverage for new code
- All bug fixes require regression tests
- Critical paths require integration tests

### Test Patterns

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('TokenGenerator', () => {
  let generator: TokenGenerator;
  let mockCache: IImageCache;

  beforeEach(() => {
    mockCache = { get: vi.fn(), clear: vi.fn() };
    generator = new TokenGenerator({}, mockCache);
  });

  it('should generate character token with valid input', async () => {
    mockCache.get.mockResolvedValue(mockImage);
    const canvas = await generator.generateCharacterToken(mockCharacter);
    expect(canvas).toBeInstanceOf(HTMLCanvasElement);
  });

  it('should throw ValidationError for invalid character', async () => {
    await expect(generator.generateCharacterToken({}))
      .rejects.toThrow(ValidationError);
  });
});
```

---

## When to Create New Code

### Create New Utilities When:
- Functionality is used in 2+ places
- Logic is complex enough to warrant abstraction
- It fits a clear domain (strings, images, canvas, etc.)

### Create New Constants When:
- A magic number appears in code
- A value might need to change in the future
- The value has semantic meaning

### Create New Types When:
- An object shape is used in multiple places
- Type safety would catch potential bugs
- Documentation would help understanding

### Create New Error Classes When:
- Error needs specific context (token name, resource type)
- Error requires special handling
- User-facing message differs significantly

---

*Last updated: 2025-12-18*
*Version: v0.3.6*

**Remember: Documentation is part of the code. Undocumented features are incomplete features.**
