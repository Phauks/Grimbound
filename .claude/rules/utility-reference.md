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
| `jsonUtils.ts` | JSON operations | `formatJson()`, `validateJson()`, `deepClone()` |
| `colorUtils.ts` | Color manipulation | `hexToRgb()`, `parseHexColor()`, `rgbToHsl()`, `hslToRgb()`, `interpolateColors()` |
| `classNames.ts` | CSS classes | `cn()` (classnames utility) |
| `progressUtils.ts` | Progress tracking | `createProgressState()`, `updateProgress()` |
| `tokenGrouping.ts` | Token organization | `groupTokensByTeam()`, `sortTokens()` |
| `scriptSorting.ts` | Script sorting | `sortCharactersByTeam()` |
| `storageKeys.ts` | localStorage keys | Constants for storage key names |
| `nameGenerator.ts` | Unique names | `generateUniqueName()` |

---

## Canvas Module (`src/ts/canvas/`)

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

---

## Background Effects Submodule (`src/ts/canvas/backgroundEffects/`)

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

---

## Cache Module (`src/ts/cache/`)

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

---

## Generation Module (`src/ts/generation/`)

| Module | Purpose | Key Exports |
|--------|---------|-------------|
| `TokenGenerator.ts` | Main generator | `TokenGenerator`, token generation methods |
| `TokenImageRenderer.ts` | Image rendering | `TokenImageRenderer`, `IImageCache` interface |
| `TokenTextRenderer.ts` | Text rendering | `TokenTextRenderer` |
| `batchGenerator.ts` | Batch operations | `generateAllTokens()`, `generateTokenBatch()` |
| `presets.ts` | Preset configs | `PRESETS`, `getPreset()`, `applyPreset()` |
| `iconLayoutStrategies.ts` | Strategy pattern | `IconLayoutStrategy`, `IconLayoutStrategyFactory` |
| `ImageCacheAdapter.ts` | DI adapter | `ImageCacheAdapter` |

---

## Data Module (`src/ts/data/`)

| Module | Purpose | Key Exports |
|--------|---------|-------------|
| `dataLoader.ts` | I/O operations | `loadJson()`, `loadCharacters()` |
| `scriptParser.ts` | JSON parsing | `parseScriptData()`, `validateScript()` |
| `characterUtils.ts` | Character utilities | `getCharacterById()`, `mergeCharacters()` |
| `characterLookup.ts` | O(1) validation | `characterLookupService.isValid()` |
| `exampleScripts.ts` | Predefined scripts | `EXAMPLE_SCRIPTS` |

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
| `useProjectCacheWarming` | Project-specific warming |

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

### Character Management

| Hook | Purpose |
|------|---------|
| `useCharacterImageResolver` | Image URL resolution |
| `useCharacterEditor` | Edited character state, dirty tracking, debounced save |
| `useCharacterOperations` | Add/delete/duplicate character, change team |
| `useCharacterDownloads` | Character download operations, DownloadsContext registration |
| `useTokenPreviewCache` | Preview generation, hover pre-rendering, cache management |

### Data & Scripts

| Hook | Purpose |
|------|---------|
| `useScriptData` | Script data loading |
| `usePresets` | Preset management |
| `useFilters` | Filter state management |

### Export & Download

| Hook | Purpose |
|------|---------|
| `useExport` | Export operations |
| `useFileUpload` | File upload handling |

### UI & Interaction

| Hook | Purpose |
|------|---------|
| `useSelection` | Selection state |
| `useUndoStack` | Undo/redo |
| `useModalBehavior` | Modal interactions |
| `useContextMenu` | Context menu state |
| `useExpandablePanel` | Panel expansion |
| `useIntersectionObserver` | Visibility detection |
| `useAutoResizeTextarea` | Textarea sizing |

### Navigation & Multi-Tab

| Hook | Purpose |
|------|---------|
| `useTabSynchronization` | Multi-tab sync |
| `useStudioNavigation` | Studio navigation |

### Assets & PWA

| Hook | Purpose |
|------|---------|
| `useBuiltInAssets` | Asset loading |
| `useAssetManager` | Asset CRUD |
| `usePWAInstall` | PWA installation |

### Editor

| Hook | Purpose |
|------|---------|
| `useCodeMirrorEditor` | CodeMirror 6 editor lifecycle |

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

*Last updated: 2025-12-20*
