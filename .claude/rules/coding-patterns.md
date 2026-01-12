# Coding Patterns Reference

> Reference documentation for design patterns and coding conventions used in this codebase.

---

## React Compiler (Automatic Memoization)

**This codebase uses React Compiler (`babel-plugin-react-compiler`) for automatic memoization.**

### What This Means

- **DO NOT use `useCallback`** - The compiler handles function memoization automatically
- **DO NOT use `useMemo`** - The compiler handles value memoization automatically
- **DO NOT use `React.memo`** - The compiler handles component memoization automatically
- **DO NOT use `forwardRef`** - React 19 supports ref as a regular prop

### Exception: useEffect Dependencies

**React Compiler cannot change `useEffect` dependency arrays.** When a value is explicitly listed as a dependency, it must have a stable reference to avoid infinite loops.

**KEEP `useCallback`** only when the function is used as a dependency in `useEffect`:

```typescript
// KEEP - callback is in useEffect deps
const loadData = useCallback(async () => {
  const result = await fetchData();
  setData(result);
}, [fetchData]);

useEffect(() => {
  loadData();
}, [loadData]); // loadData is a dependency

// REMOVE - callback is NOT in useEffect deps
const handleClick = () => {  // No useCallback needed
  doSomething();
};
```

**KEEP `useMemo`** only when the computed value is used as a dependency in `useEffect`:

```typescript
// KEEP - computed array is in useEffect deps
const enrichedItems = useMemo(
  () => items.map(item => ({ ...item, extra: compute(item) })),
  [items]
);

useEffect(() => {
  processItems(enrichedItems);
}, [enrichedItems]); // enrichedItems is a dependency

// REMOVE - computed value is NOT in useEffect deps
const filteredItems = items.filter(i => i.active); // No useMemo needed
return <List items={filteredItems} />;
```

**Why this matters:** Arrays/objects created via `.map()`, `.filter()`, `new Map()`, etc. are NEW references every render. If used as `useEffect` dependencies without `useMemo`, the effect runs every render → setState → re-render → **infinite loop**.

### ref-as-prop Pattern (React 19)

```typescript
// OLD: forwardRef pattern
const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  return <input ref={ref} {...props} />;
});

// NEW: ref as regular prop
interface InputProps {
  ref?: React.Ref<HTMLInputElement>;
  // ... other props
}

function Input({ ref, ...props }: InputProps) {
  return <input ref={ref} {...props} />;
}
```

### Verification

The React Compiler is configured in `vite.config.ts`:
```typescript
react({
  babel: {
    plugins: ['babel-plugin-react-compiler'],
  },
}),
```

Run `npx vite build` to verify - successful build with no compiler errors confirms it's working.

---

## useEffect Guidelines

### When to Use useEffect

✅ **Appropriate uses:**
- External subscriptions (event listeners, WebSocket, BroadcastChannel)
- Data fetching (async operations)
- DOM measurements that need layout
- Timer cleanup (setTimeout/setInterval cleanup)
- Third-party library integration

❌ **Avoid useEffect for:**
- Derived state (use `useMemo` or compute during render)
- Resetting state when props change (use `key` prop or event handlers)
- **Prop sync** (use state-during-render pattern - see below)
- Transforming data for rendering (compute in render)
- Effect chains (one effect triggers another via state)

### Patterns

**localStorage Initialization:**
```typescript
// BAD: Empty-dep effect
const [value, setValue] = useState(null);
useEffect(() => {
  setValue(localStorage.getItem('key'));
}, []);

// GOOD: useState initializer
const [value, setValue] = useState(() => localStorage.getItem('key'));
```

**Derived State:**
```typescript
// BAD: Effect to compute derived value
const [fullName, setFullName] = useState('');
useEffect(() => {
  setFullName(`${firstName} ${lastName}`);
}, [firstName, lastName]);

// GOOD: Compute during render
const fullName = `${firstName} ${lastName}`;
// Or with useMemo if expensive
const fullName = useMemo(() => expensiveComputation(firstName, lastName), [firstName, lastName]);
```

**Effect Chains:**
```typescript
// BAD: Effect chain (one effect triggers another)
useEffect(() => {
  setIsDirty(true);
  incrementVersion(); // Triggers another effect!
}, [state]);

useEffect(() => {
  if (isDirty) save();
}, [isDirty, version]);

// GOOD: Single unified effect
useEffect(() => {
  if (stateChanged(state, previousState)) {
    scheduleSave();
  }
}, [state]);
```

**Prop Sync - State During Render (PREFERRED):**
```typescript
// PREFERRED: React's "adjusting state during render" pattern
// Faster than useEffect (synchronous, no extra render cycle)
// This is the officially recommended React pattern for prop sync

// Track previous value for comparison
const [prevValue, setPrevValue] = useState<T>(value);

// Sync during render - NOT in useEffect
if (value !== prevValue) {
  setPrevValue(value);
  // Only sync if this is an external change (not our own update reflected back)
  if (value !== lastSentValueRef.current) {
    setLocalValue(value);
    lastSentValueRef.current = value;
  }
}

// For object values, use JSON comparison:
const [prevValueJson, setPrevValueJson] = useState(() => JSON.stringify(value));
const valueJson = JSON.stringify(value);

if (valueJson !== prevValueJson) {
  setPrevValueJson(valueJson);
  setPendingValue(value);
}
```

**Why state-during-render is better than useEffect for prop sync:**
- **Faster**: Synchronous update, no extra render cycle
- **Simpler**: No dependency array concerns
- **Official**: React's recommended pattern per "You Might Not Need an Effect"
- **Predictable**: State is consistent within the same render

**Real examples in codebase:**
- `useControlledField.ts` - Single controlled input with debouncing
- `useControlledFields.ts` - Multiple controlled inputs
- `useExpandablePanel.ts` - Panel state management
- `UnifiedSettingsBox.tsx` - Settings selector state

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
- Use Strategy Pattern for extensibility (see below)
- Add new behavior through new classes, not modifying existing ones

**Dependency Inversion:**
- Depend on abstractions, not concretions
- Use dependency injection for testability

---

## Pattern 1: Structured Logging

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

---

## Pattern 2: Error Handling

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

---

## Pattern 3: Strategy Pattern (Icon Layout)

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

---

## Pattern 3b: Strategy Pattern (Texture Generation)

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

---

## Pattern 4: Dependency Injection

The codebase uses **constructor injection with default parameters** for testability while maintaining convenient usage.

### Interface Definitions

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

### Constructor Injection Pattern

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

### Testing with Mocks

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

### React Component DI (ServiceContext)

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

### Available Interface Files

| File | Interfaces |
|------|------------|
| `src/ts/services/project/IProjectService.ts` | `IProjectService`, `IProjectDatabase`, `IProjectExporter`, `IProjectImporter` |
| `src/ts/services/upload/IUploadServices.ts` | `IFileValidationService`, `IImageProcessingService`, `IAssetStorageService`, `IFileUploadService` |
| `src/ts/services/fonts/IFontServices.ts` | `IFontProvider`, `IFontRegistry` |
| `src/ts/sync/ISyncServices.ts` | `IGitHubReleaseClient`, `IStorageManager`, `IPackageExtractor`, `IDataSyncService` |
| `src/ts/generation/TokenImageRenderer.ts` | `IImageCache` |
| `src/ts/cache/ICacheManager.ts` | `ICacheManager` |

### DI Best Practices

1. **Always define interfaces** in dedicated files (`I*.ts`)
2. **Use constructor injection** with `Partial<Deps>` for optional overrides
3. **Provide defaults** pointing to singleton instances
4. **Export singleton** at bottom of file for production use
5. **Name deps consistently**: `database`, `exporter`, `storage`, etc.
6. **Create `*Deps` interface** documenting all dependencies

---

## Pattern 5: Custom Hooks Extraction

Extract complex component logic into focused hooks that each handle a single responsibility.

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

**Real-World Example: CharactersView Refactoring**

The CharactersView component was refactored from ~1,163 lines to ~390 lines by extracting 4 focused hooks:

| Hook | Purpose | Key Features |
|------|---------|--------------|
| `useCharacterEditor` | Editing state | Dirty tracking, debounced save, flush on unmount |
| `useCharacterOperations` | CRUD operations | Add, delete, duplicate, change team |
| `useTokenPreviewCache` | Preview management | Hover pre-rendering, cache invalidation |
| `useCharacterDownloads` | Download actions | Context registration, ZIP/PNG exports |

```typescript
// CharactersView.tsx - Clean orchestration
export function CharactersView({ initialToken, selectedCharacterUuid, ... }) {
  // Context and state
  const { characters, tokens, ... } = useTokenContext();
  const [selectedCharacterUuid, setSelectedCharacterUuid] = useState(...);

  // Hook composition - each handles one concern
  const { editedCharacter, isDirty, handleEditChange } = useCharacterEditor({
    selectedCharacterUuid, characters, jsonInput, setJsonInput, ...
  });

  const { previewCharacterToken, handleHoverCharacter } = useTokenPreviewCache({
    editedCharacter, generationOptions, ...
  });

  const { handleAddCharacter, handleDeleteCharacter } = useCharacterOperations({
    characters, tokens, selectedCharacterUuid, ...
  });

  useCharacterDownloads({
    displayCharacterToken: previewCharacterToken, ...
  });

  // Component focuses on rendering, not logic
  return <ViewLayout>...</ViewLayout>;
}
```

**Hook Interface Pattern:**
```typescript
// Define clear Options and Result interfaces
interface UseCharacterEditorOptions {
  selectedCharacterUuid: string;
  characters: Character[];
  // ... other dependencies
}

interface UseCharacterEditorResult {
  editedCharacter: Character | null;
  isDirty: boolean;
  handleEditChange: <K extends keyof Character>(field: K, value: Character[K]) => void;
  // ... other returns
}

export function useCharacterEditor(options: UseCharacterEditorOptions): UseCharacterEditorResult {
  // Implementation
}
```

---

## Pattern 6: Character Image Resolution (SSOT)

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

---

## Pattern 7: Unified Tab Pre-Rendering (Facade Pattern)

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

## Import Conventions

### Path Aliases (REQUIRED)

```typescript
// CORRECT: Use @/ alias
import { createCanvas, drawCurvedText } from '@/ts/canvas/index.js';
import { TokenGenerator } from '@/ts/generation/index.js';
import { logger } from '@/ts/utils/index.js';
import { useTokenGenerator } from '@/hooks/useTokenGenerator';
import styles from '@/styles/components/layout/ViewLayout.module.css';

// CORRECT: Root barrel (for multiple modules)
import { createCanvas, logger, TokenGenerator } from '@/ts/index.js';

// WRONG: Relative imports with ../
// import { logger } from '../../../ts/utils/logger.js';

// ACCEPTABLE: Relative imports within same directory or one level up
import { ViewLayoutPanel } from './ViewLayoutPanel';
import type { ButtonProps } from '../types';
```

### Alias Configuration

| Alias Path | Resolves To |
|------------|-------------|
| `@/ts/*` | `src/ts/*` |
| `@/components/*` | `src/components/*` |
| `@/hooks/*` | `src/hooks/*` |
| `@/contexts/*` | `src/contexts/*` |
| `@/styles/*` | `src/styles/*` |

### Barrel Exports

Prefer importing from barrel (`index.ts`) files when available:

```typescript
// Preferred: Import from barrel
import { createCanvas, drawCurvedText } from '@/ts/canvas/index.js';

// Avoid: Direct file imports (bypasses barrels)
// import { createCanvas } from '@/ts/canvas/canvasUtils.js';
```

---

*Last updated: 2026-01-12*
