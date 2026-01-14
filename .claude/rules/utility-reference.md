# Utility Reference

> Comprehensive reference of all utility modules, functions, and hooks in the codebase.

---

## Utils Module (`src/ts/utils/`)

| Module | Purpose | Key Functions |
|--------|---------|---------------|
| `logger.ts` | Structured logging | `logger.debug/info/warn/error()`, `logger.time()`, `logger.child()` |
| `errorUtils.ts` | Error handling | `handleAsyncOperation()`, `retryOperation()` |
| `stringUtils.ts` | String manipulation | `sanitizeFilename()`, `generateUniqueFilename()`, `capitalize()` |
| `imageUtils.ts` | Image loading | `loadImage()`, `loadLocalImage()`, `canvasToBlob()`, `downloadFile()` |
| `imageCache.ts` | Global image cache | `globalImageCache.get()`, `.clear()`, `.stats()` |
| `characterImageResolver.ts` | **SSOT** for images | `resolveCharacterImageUrl()`, `resolveCharacterImages()` |
| `jsonUtils.ts` | JSON operations | `formatJson()`, `validateJson()`, `deepClone()`, `charactersToJson()` |
| `colorUtils.ts` | Color manipulation | `hexToRgb()`, `parseHexColor()`, `rgbToHsl()`, `hslToRgb()`, `interpolateColors()` |
| `decorativeUtils.ts` | Decorative merging | `createEffectiveOptions()`, `mapAccentOptionsToDecorative()` |
| `classNames.ts` | CSS classes | `cn()` (classnames utility) |
| `progressUtils.ts` | Progress tracking | `createProgressState()`, `updateProgress()` |
| `tokenGrouping.ts` | Token organization | `groupTokensByTeam()`, `sortTokens()` |
| `scriptSorting.ts` | Script sorting | `sortCharactersByTeam()` |
| `storageKeys.ts` | localStorage keys | `STORAGE_KEYS.*` (CUSTOM_PRESETS, THEME, AUTO_SAVE_ENABLED, CACHE_LOG_LEVEL, AUTO_SAVE_TELEMETRY, SIDEBAR_WIDTH_LEFT), `getStorageItem()`, `setStorageItem()` |
| `nameGenerator.ts` | Unique names | `generateUniqueName()` |
| `teamUtils.ts` | Team CSS mapping | `getTeamStyleClass()`, `normalizeTeamName()`, `TEAM_CLASS_MAP` |
| `searchUtils.ts` | **Modular search** | `searchFilter()`, `getSearchMatch()`, `parseSearchQuery()`, `matchesTerm()`, `levenshteinDistance()` |

---

## Search Module (`src/hooks/search/`)

| Hook | Purpose | Key Exports |
|------|---------|-------------|
| `useSearch.ts` | Generic search hook | `useSearch<T>()` - filtering, highlighting, query parsing |
| `useCharacterSearch.ts` | Character preset | `useCharacterSearch()` - searches name, ability, reminders |
| `useAssetSearch.ts` | Asset preset | `useAssetSearch()` - searches filename, type, tags |

**Features:**
- Fuzzy matching with Levenshtein distance (1-2 character tolerance)
- Multi-term AND logic ("night demon" requires both terms)
- Special character support (`*`, `+`, `[`, `]` match literally)
- Space/dash agnostic matching
- Search highlighting with position data

**Usage Pattern:**
```typescript
// Generic search
const { filteredItems, getMatch, isSearching } = useSearch({
  items: characters,
  query: searchTerm,
  config: { fields: (c) => [c.name, c.ability] }
});

// Character preset (pre-configured)
const { filteredCharacters, getMatch } = useCharacterSearch({
  characters: officialCharacters,
  searchTerm: 'night demon'
});

// With highlighting
<SearchHighlight match={getMatch(char.name)} />
<SearchHighlight match={getMatch(char.ability)} variant="subtle" />
```

---

## Canvas Module (`src/ts/canvas/`)

| Module | Purpose | Key Functions |
|--------|---------|---------------|
| `canvasUtils.ts` | Base operations | `createCanvas()`, `createCircularClipPath()`, `wrapText()`, `drawImageCover()` |
| `canvasOptimizations.ts` | Performance | `measureTextCached()`, `pathCache` |
| `canvasPool.ts` | Canvas reuse | `acquireCanvas()`, `releaseCanvas()` |
| `textDrawing.ts` | Text rendering | `drawCurvedText()`, `drawCenteredWrappedText()`, `drawAbilityText()` |
| `accentDrawing.ts` | Decorations | `drawAccents()` |
| `bleedUtils.ts` | **Print bleed** | `sampleEdgeColors()`, `generateBleedRing()`, `interpolateSampleColor()` |
| `qrGeneration.ts` | QR codes | `generateStyledQRCode()` |
| `gradientUtils.ts` | Gradients | `createBackgroundGradient()`, `getCSSGradient()` |
| `backgroundEffects/` | **Background system** | `renderBackground()`, `TextureFactory`, `applyEffects()` |

---

## Background Effects Submodule (`src/ts/canvas/backgroundEffects/`)

| Module | Purpose | Key Exports |
|--------|---------|-------------|
| `BackgroundRenderer.ts` | Main orchestrator | `renderBackground()`, `renderTexturePreview()` |
| `constants.ts` | Shared constants | Effect and texture constants |
| `noise/perlin.ts` | Perlin noise | `perlin2D()`, `initPermutation()` |
| `noise/fbm.ts` | Fractal noise | `fbm()`, `turbulence()`, `ridgedNoise()` |
| `textures/TextureStrategy.ts` | Interface | `TextureStrategy`, `BaseTextureStrategy`, `TextureContext` |
| `textures/index.ts` | Factory | `TextureFactory.create()`, `TextureFactory.register()` |
| `effects/index.ts` | Effects | `applyEffects()`, `VignetteEffect`, `InnerGlowEffect` |
| `effects/BorderEffect.ts` | Border rendering | `BorderEffect` |
| `effects/VibranceEffect.ts` | Post-processing | `applyVibrance()`, `isVibranceEnabled()` |

**Available Textures**: marble, clouds, watercolor, perlin, radial-fade, organic-cells, silk-flow, parchment, linen, wood-grain, brushed-metal

---

## Cache Module (`src/ts/cache/`)

| Module | Purpose | Key Exports |
|--------|---------|-------------|
| `CacheManager.ts` | Cache facade | `cacheManager.preRender()`, `.clearCache()`, `.getStats()` |
| `ICacheManager.ts` | Cache interface | `ICacheManager` |
| `TabPreRenderService.ts` | Unified tab pre-render (DI-enabled) | `TabPreRenderService`, `tabPreRenderService.preRenderTab()`, `.getCachedNightOrder()`, `.getCachedTokenDataUrl()`, `.getCachedCharacterImageUrl()` |
| `CacheInvalidationService.ts` | Cache lifecycle | `cacheInvalidationService.invalidate()`, `.subscribe()` |
| `adapters/LRUCacheAdapter.ts` | LRU cache adapter | `LRUCacheAdapter` |
| `core/interfaces.ts` | Core interfaces | Cache interfaces |
| `instances/fontCache.ts` | Font caching | Font cache singleton |
| `utils/hashUtils.ts` | Hash utilities | `simpleHash()`, `hashArray()`, `hashObject()`, `combineHashes()` |
| `utils/EventEmitter.ts` | Typed events | `EventEmitter` class |
| `utils/AdaptiveWorkerPool.ts` | Adaptive workers | `AdaptiveWorkerPool` |
| `utils/CacheLogger.ts` | Cache logging | Cache-specific logger |
| `utils/memoryEstimator.ts` | Memory estimation | Memory usage utilities |
| `utils/WorkerPool.ts` | Worker pooling | `WorkerPool` |
| `policies/LRUEvictionPolicy.ts` | LRU eviction | `LRUEvictionPolicy` |
| `strategies/CharactersPreRenderStrategy.ts` | Character pre-render | `CharactersPreRenderStrategy` |
| `strategies/TokensPreRenderStrategy.ts` | Token pre-render | `TokensPreRenderStrategy` |
| `strategies/ProjectPreRenderStrategy.ts` | Project pre-render | `ProjectPreRenderStrategy` |

---

## Generation Module (`src/ts/generation/`)

| Module | Purpose | Key Exports |
|--------|---------|-------------|
| `TokenGenerator.ts` | Canvas rendering | `TokenGenerator` (generates `HTMLCanvasElement`) |
| `TokenFactory.ts` | Token object creation | `TokenFactory`, `createCharacterToken()`, `createReminderToken()`, `createMetaToken()` |
| `batchGenerator.ts` | Batch orchestration | `generateAllTokens()`, `generateScriptNameTokenOnly()`, `BatchContext` |
| `TokenImageRenderer.ts` | Image rendering | `TokenImageRenderer`, `IImageCache` interface |
| `TokenTextRenderer.ts` | Text rendering | `TokenTextRenderer` |
| `QROptionsResolver.ts` | QR code options | QR code option resolution |
| `teamVariantGenerator.ts` | Team variants | Team variant generation |
| `presets.ts` | Preset configs | `PRESETS`, `getPreset()`, `applyPreset()` |
| `iconLayoutStrategies.ts` | Strategy pattern | `IconLayoutStrategy`, `IconLayoutStrategyFactory` |
| `ImageCacheAdapter.ts` | DI adapter | `ImageCacheAdapter` |

**Architecture Notes:**
- `TokenGenerator` handles pure canvas rendering (low-level)
- `TokenFactory` creates Token objects from canvases (metadata assembly)
- `batchGenerator` orchestrates both with progress tracking, abort handling, and parallel batching (high-level)
- **SSOT Integration**: `batchGenerator.generateAllTokens()` pre-resolves all character image URLs using `resolveCharacterImageUrl` before generation begins, ensuring proper handling of asset references, sync storage, and external URLs

---

## Data Module (`src/ts/data/`)

| Module | Purpose | Key Exports |
|--------|---------|-------------|
| `dataLoader.ts` | I/O operations | `loadJson()`, `loadCharacters()` |
| `scriptParser.ts` | JSON parsing | `parseScriptData()`, `validateAndParseScript()`, `extractScriptMeta()`, `isScriptMeta()`, `isCharacter()`, `isIdReference()` |
| `characterUtils.ts` | Character utilities | `getCharacterById()`, `mergeCharacters()` |
| `characterLookup.ts` | O(1) validation | `characterLookupService.isValid()` |
| `exampleScripts.ts` | Predefined scripts | `EXAMPLE_SCRIPTS` |

**scriptParser.ts Architecture:**
- Type guards: `isScriptMeta()`, `isCharacter()`, `isIdReference()`
- Handler functions: Strategy-like pattern for each entry type
- `ParsingContext`: Shared state across parsing operations
- Two modes: Strict (`parseScriptData`) logs warnings, lenient (`validateAndParseScript`) collects them

---

## Export Module (`src/ts/export/`)

| Module | Purpose | Key Exports |
|--------|---------|-------------|
| `pdfGenerator.ts` | PDF generation | `generatePDF()`, `PDFGenerator` |
| `zipExporter.ts` | ZIP creation | `createZip()`, `ZipExporter` |
| `pngExporter.ts` | PNG download | `downloadPng()`, `downloadAllTokens()` |
| `pngMetadata.ts` | PNG tEXt chunks | `embedMetadata()`, `extractMetadata()` |
| `completePackageExporter.ts` | Full export | `exportCompletePackage()` |

---

## Script PDF Module (`src/ts/scriptPdf/`)

| Module | Purpose | Key Exports |
|--------|---------|-------------|
| `types.ts` | Type definitions | `ScriptPdfSettings`, `PlayerScriptSettings`, `PlayerScriptCharacter`, `BackgroundStyle` (re-export) |
| `constants.ts` | Layout constants | `PAGE_WIDTH_PT`, `PLAYER_SCRIPT_FRONT`, `TEAM_COLORS`, `DEFAULT_SCRIPT_PDF_SETTINGS` |
| `utils.ts` | Shared utilities | `groupCharactersByTeam()`, `extractActiveJinxes()`, `calculateOptimalColumns()`, `validateScriptForPlayerScript()` |
| `playerScript/PlayerScriptEntry.tsx` | Character entry | `PlayerScriptEntry` - Single character row with icon, name, ability |
| `playerScript/TeamSection.tsx` | Team grouping | `TeamSection` - Team with vertical label and character grid |
| `playerScript/PlayerScriptFront.tsx` | Front page | `PlayerScriptFront` - Complete front page layout |
| `playerScript/PlayerScriptBack.tsx` | Backing sheet | `PlayerScriptBack` - Night order icons, logo/name, player count table |
| `playerScript/playerScriptRenderer.tsx` | Hybrid renderer | `renderPlayerScriptForHybrid()` - Offscreen render + text extraction |
| `playerScript/playerScriptPdfExporter.ts` | PDF export | `generatePlayerScriptPdf()`, `downloadPlayerScriptPdf()`, `getPlayerScriptPdfBlob()` |

**Key Types:**
- `ScriptPdfSettings` - Complete settings (common + playerScript + nightOrder)
- `CommonPdfSettings` - Shared margins + BackgroundStyle
- `PlayerScriptSettings` - Player script specific (fonts, content toggles, layout)
- `PlayerScriptCharacter` - Character data optimized for script rendering

**Key Utilities:**
```typescript
// Group characters by team for display
const groups = groupCharactersByTeam(characters);
// Returns Map<Team, PlayerScriptCharacter[]>

// Extract active jinxes between script characters
const jinxes = extractActiveJinxes(characters);
// Returns PlayerScriptJinx[]

// Calculate column layout
const columns = calculateOptimalColumns(totalChars, 'auto');
// Returns 1 or 2

// Validate script for generation
const { valid, errors, warnings, counts } = validateScriptForPlayerScript(chars);
```

**Background Presets:**
- `Classic Parchment` - Warm parchment with subtle texture
- `Clean White` - Pure white, no texture
- `Aged Paper` - Sepia with linen texture and vignette
- `Official Style` - Matches official BotC PDF style
- `Night Theme` - Dark background with marble texture

---

## Font Services Module (`src/ts/services/fonts/`)

| Module | Purpose | Key Exports |
|--------|---------|-------------|
| `FontRegistry.ts` | Font registration orchestrator | `FontRegistry`, `fontRegistry` singleton |
| `IFontServices.ts` | DI interfaces | `IFontProvider`, `IFontRegistry` |
| `BuiltInFontProvider.ts` | Built-in font loading | `BuiltInFontProvider` |
| `CustomFontProvider.ts` | Custom font loading | `CustomFontProvider` |
| `GoogleFontProvider.ts` | Google Fonts API | `GoogleFontProvider` |
| `fontDatabase.ts` | Font data storage | Font database utilities |

---

## Sync Module (`src/ts/sync/`)

| Module | Purpose | Key Exports |
|--------|---------|-------------|
| `dataSyncService.ts` | Main orchestrator | `dataSyncService.initialize()`, `.checkForUpdates()` |
| `githubReleaseClient.ts` | GitHub API | `GitHubReleaseClient` |
| `packageExtractor.ts` | ZIP handling | `PackageExtractor` |
| `storageManager.ts` | IndexedDB + Cache | `StorageManager` |
| `versionManager.ts` | Version comparison | `VersionManager`, `compareVersions()` |
| `migrationHelper.ts` | Legacy migration | `MigrationHelper` |

---

## Custom React Hooks (`src/hooks/`)

### Token Generation & Management

| Hook | Purpose |
|------|---------|
| `useTokenGenerator` | Token generation orchestration |
| `useTokenGrouping` | Token sorting/grouping logic |
| `useTokenDeletion` | Token deletion with confirmation |
| `useTokenDetailEditor` | Token editing |

### Project Management

| Hook | Purpose |
|------|---------|
| `useProjects` | Project CRUD |
| `useProjectAutoSave` | Auto-save functionality |
| `useProjectTokens` | Token generation for project preview (active/non-active projects) |
| `useOptionalFields` | Optional project field state management (privateNotes, difficulty, etc.) |

### Auto-Save System

| Hook | Purpose |
|------|---------|
| `useAutoSavePreference` | Auto-save settings |
| `useAutoSaveTrigger` | Auto-save timing |
| `useAutoSaveDetector` | Change detection |
| `useAutoSaveTelemetry` | Save metrics |
| `useHasUnsavedWork` | Dirty state |

### Cache & Performance

| Hook | Purpose |
|------|---------|
| `usePreRenderCache` | Cache warming/management |
| `useCacheManager` | Cache lifecycle |
| `useCacheStats` | Cache statistics |
| `useStorageQuota` | Storage monitoring |
| `useOfficialCharacterImages` | Load official character images with progressive batching |

### Character Management

| Hook | Purpose |
|------|---------|
| `useCharacterImageResolver` | Image URL resolution |
| `useCharacterEditor` | Edited character state, dirty tracking, debounced save |
| `useCharacterOperations` | **Orchestrator**: Add/delete/duplicate character, change team |
| `useCharacterCRUD` | Sub-hook: Add, delete, duplicate operations |
| `useCharacterMetadata` | Sub-hook: Team changes, metadata updates |
| `useCharacterDownloads` | Character download operations, DownloadsContext registration |
| `useTokenPreviewCache` | Preview generation, hover pre-rendering, cache management, live decorative updates |
| `useBackgroundImageUrl` | Background image URL resolution |
| `useJinxOperations` | Jinx add/remove/update operations |

### Data & Scripts

| Hook | Purpose |
|------|---------|
| `useScriptData` | Script data loading |
| `useScriptTransformations` | Script data transformations |
| `useGroupedReminders` | Reminder grouping logic |
| `useScriptPdfDrawer` | Script PDF settings drawer state (open/close, tabs, pending values) |
| `usePlayerScriptOrder` | Character ordering for player script (drag-and-drop, SAO reset) |
| `usePresets` | Preset management |
| `useFilters` | Filter state management |

### Export & Download

| Hook | Purpose |
|------|---------|
| `useExport` | Export operations |
| `useExportDownloads` | Export download management |
| `useScriptPdfDownloads` | Script PDF download operations |
| `usePlayerScriptExport` | Player script PDF export with progress tracking and abort handling |
| `useFileUpload` | File upload handling |

### UI & Interaction

| Hook | Purpose |
|------|---------|
| `useSelection` | Selection state |
| `useUndoStack` | Undo/redo |
| `useModalBehavior` | Modal interactions (escape key, body scroll, backdrop) |
| `useDrawerAnimation` | Drawer open/close animation lifecycle |
| `useDrawerState` | Drawer state management (pending value, apply/cancel/reset) |
| `useCharacterFiltering` | Character search with highlighting, edition, team, selected-only filters (uses `useCharacterSearch`) |
| `useContextMenu` | Context menu state |
| `useExpandablePanel` | Expandable panel state and positioning |
| `useIntersectionObserver` | Visibility detection |
| `useAutoResizeTextarea` | Textarea sizing |
| `useControlledField` | Single controlled input field state |
| `useControlledFields` | Multiple controlled input fields state |
| `useDraggableList` | Drag-and-drop list state |
| `useDraggablePosition` | Draggable element positioning (for drawers/panels) |
| `useRecentColors` | Recent color picker history |
| `useResizableSidebar` | Drag-to-resize sidebar with localStorage persistence |

### Navigation & Multi-Tab

| Hook | Purpose |
|------|---------|
| `useTabSynchronization` | Multi-tab sync |
| `useStudioNavigation` | Studio navigation |

### Assets & PWA

| Hook | Purpose |
|------|---------|
| `useBuiltInAssets` | Asset loading |
| `useAssetManager` | Asset CRUD, bulk operations, filtering |
| `useAssetPreview` | Asset value resolution to preview URL/metadata |
| `useAssetPreviewGenerator` | Live token preview generation for asset selection (debounced) |
| `useAssetSelection` | Selection mode logic for Asset Manager (built-in, user, none) |
| `useAssetOperations` | Asset CRUD: rename, download, duplicate, reclassify |
| `useFileUpload` | File upload handling |
| `usePWAInstall` | PWA installation |

### Editor

| Hook | Purpose |
|------|---------|
| `useCodeMirrorEditor` | CodeMirror 6 editor lifecycle |
| `useJsonEditor` | JSON editor state and validation |

### Fonts

| Hook | Purpose |
|------|---------|
| `useFontFiltering` | Font search and filtering |
| `useFontOperations` | Font CRUD operations |
| `useFontOptions` | Font option state management |

### Studio

| Hook | Purpose |
|------|---------|
| `useAssetEditor` | **Orchestrator**: Studio asset editing (compose sub-hooks below) |
| `useAssetEffectState` | Sub-hook: Effect values, presets, undo stack |
| `useAssetCanvasOperations` | Sub-hook: Canvas rendering, load, save operations |
| `useAssetUIState` | Sub-hook: Loading, processing, error state management |

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

// Timing constants (debounce/delays)
TIMING = {
  QR_GENERATION_DELAY: 100,
  UI_ANIMATION: 200,
  JSON_VALIDATION_DEBOUNCE: 300,
  OPTION_CHANGE_DEBOUNCE: 500,
  METADATA_DEBOUNCE: 500,
  IMAGE_LOAD_DEBOUNCE: 800,
  AUTO_SAVE_DELAY: 1000,
}

// Studio defaults
STUDIO_DEFAULTS = {
  BORDER_WIDTH: 3,
  BORDER_COLOR: '#FFFFFF',
}

// Default sample character for preview when no script is loaded
DEFAULT_SAMPLE_CHARACTER = {
  id: 'grimbound',
  name: 'Grimbound',
  team: 'fabled',
  ability: 'At the end of the first night, the storyteller dies.',
  image: '/images/favicon.svg',
  reminders: ['RIP'],
  setup: true,
  firstNight: 1,
  otherNight: 1,
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

## Directory Structure Quick Reference

```
src/
├── ts/                     # Core TypeScript modules
│   ├── canvas/             # Canvas rendering
│   ├── cache/              # Multi-tier caching
│   ├── data/               # Data loading
│   ├── export/             # Export utilities
│   ├── generation/         # Token generation
│   ├── nightOrder/         # Night order sheets
│   ├── services/           # Service layer
│   ├── studio/             # Studio features
│   ├── sync/               # GitHub sync
│   ├── types/              # Type definitions
│   ├── ui/                 # UI utilities
│   ├── utils/              # General utilities
│   ├── config.ts           # App configuration
│   ├── constants.ts        # Layout constants
│   ├── errors.ts           # Error hierarchy
│   └── themes.ts           # Theme definitions
├── components/             # React components
│   ├── Layout/             # App shell
│   ├── Modals/             # Modal dialogs
│   ├── Shared/             # Reusable components
│   ├── ViewComponents/     # View-specific
│   └── Views/              # Main views
├── contexts/               # React contexts
├── hooks/                  # Custom hooks
└── styles/                 # CSS modules
```

---

*Last updated: 2026-01-13*
