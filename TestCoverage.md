# Test Coverage Analysis

> **Generated**: 2026-01-01
> **Vitest Test Framework**

---

## Executive Summary

| Metric | Count |
|--------|-------|
| **Total Source Files (excluding index/types)** | ~140 |
| **Total Test Files** | 56 (+5 from Phase 3) |
| **Hooks (non-index)** | ~75 |
| **Hooks with Tests** | 15 |
| **Phase 1 Tests** | 108 |
| **Phase 2 Tests** | 137 |
| **Phase 3 Tests** | 198 |
| **Total Tests** | 443+ |
| **Estimated Coverage** | ~40-45% |

**Priority Areas Needing Tests:**
1. React Hooks (65+ untested)
2. Canvas/Rendering modules (0 tests)
3. Studio module (0 tests)
4. Night Order module (0 tests)
5. Background Effects (0 tests)

---

## Current Test Inventory

### ✅ Tested Modules

#### Utils (`src/ts/utils/`) - 12/28 covered

| File | Test | Status |
|------|------|--------|
| `colorUtils.ts` | `colorUtils.test.ts` | ✅ Covered |
| `stringUtils.ts` | `stringUtils.test.ts` | ✅ Covered |
| `decorativeUtils.ts` | `decorativeUtils.test.ts` | ✅ Covered |
| `nameGenerator.ts` | `nameGenerator.test.ts` | ✅ Covered |
| `teamUtils.ts` | `teamUtils.test.ts` | ✅ Covered |
| `jsonUtils.ts` | `jsonUtils.test.ts` | ✅ Covered |
| `scriptSorting.ts` | `scriptSorting.test.ts` | ✅ Covered |
| `errorUtils.ts` | `errorUtils.test.ts` | ✅ Covered |
| `progressUtils.ts` | `progressUtils.test.ts` | ✅ Covered |
| `tokenGrouping.ts` | `tokenGrouping.test.ts` | ✅ Covered |
| `abilityTextParser.ts` | `abilityTextParser.test.ts` | ✅ Covered |
| `characterImageResolver.ts` | `characterImageResolver.test.ts` | ✅ Covered |

#### Generation (`src/ts/generation/`) - 6/11 covered

| File | Test | Status |
|------|------|--------|
| `iconLayoutStrategies.ts` | `iconLayoutStrategies.test.ts` | ✅ Covered |
| `TokenFactory.ts` | `TokenFactory.test.ts` | ✅ Covered |
| `TokenImageRenderer.ts` | `TokenImageRenderer.test.ts` | ✅ Covered |
| `TokenTextRenderer.ts` | `TokenTextRenderer.test.ts` | ✅ Covered |
| `presets.ts` | `presets.test.ts` | ✅ Covered |
| `TokenGenerator.ts` | `TokenGenerator.test.ts` | ✅ Covered |
| `batchGenerator.ts` | `batchGenerator.test.ts` | ✅ Covered |

#### Sync (`src/ts/sync/`) - 5/7 covered

| File | Test | Status |
|------|------|--------|
| `dataSyncService.ts` | `dataSyncService.test.ts` | ✅ Covered |
| `packageExtractor.ts` | `packageExtractor.test.ts` | ✅ Covered |
| `storageManager.ts` | `storageManager.test.ts` | ✅ Covered |
| `versionManager.ts` | `versionManager.test.ts` | ✅ Covered |

#### Data (`src/ts/data/`) - 2/7 covered

| File | Test | Status |
|------|------|--------|
| `characterUtils.ts` | `characterUtils.test.ts` | ✅ Covered |
| `scriptParser.ts` | `scriptParser.test.ts` | ✅ Covered |

#### Cache (`src/ts/cache/`) - 7/11 covered

| File | Test | Status |
|------|------|--------|
| `CacheManager.ts` | `CacheManager.test.ts` | ✅ Covered |
| `TabPreRenderService.ts` | `TabPreRenderService.test.ts` | ✅ Covered |
| `utils/hashUtils.ts` | `hashUtils.test.ts` | ✅ Covered |
| `CacheInvalidationService.ts` | `CacheInvalidationService.test.ts` | ✅ Covered (Phase 2) |
| `policies/LRUEvictionPolicy.ts` | `LRUEvictionPolicy.test.ts` | ✅ Covered (Phase 2) |
| `strategies/CharactersPreRenderStrategy.ts` | `CharactersPreRenderStrategy.test.ts` | ✅ Covered (Phase 2) |
| `strategies/TokensPreRenderStrategy.ts` | `TokensPreRenderStrategy.test.ts` | ✅ Covered (Phase 2) |

#### Services (`src/ts/services/`) - 9/25 covered

| File | Test | Status |
|------|------|--------|
| `project/ProjectService.ts` | `ProjectService.test.ts` | ✅ Covered |
| `project/ProjectDatabaseService.ts` | `ProjectDatabaseService.snapshot.test.ts` | ✅ Covered |
| `project/ProjectExporter.ts` | `ProjectExporter.test.ts` | ✅ Covered (Phase 3) |
| `project/ProjectImporter.ts` | `ProjectImporter.test.ts` | ✅ Covered (Phase 3) |
| `upload/FileValidationService.ts` | `FileValidationService.test.ts` | ✅ Covered |
| `upload/AssetStorageService.ts` | `AssetStorageService.test.ts` | ✅ Covered |
| `upload/FileUploadService.ts` | `FileUploadService.test.ts` | ✅ Covered (Phase 3) |
| `upload/ImageProcessingService.ts` | `ImageProcessingService.test.ts` | ✅ Covered (Phase 3) |
| `fonts/FontRegistry.ts` | `FontRegistry.test.ts` | ✅ Covered (Phase 3) |

#### Export (`src/ts/export/`) - 4/6 covered

| File | Test | Status |
|------|------|--------|
| `pdfGenerator.ts` | `pdfGenerator.test.ts` | ✅ Covered |
| `zipExporter.ts` | `zipExporter.test.ts` | ✅ Covered |
| `pngExporter.ts` | `pngExporter.test.ts` | ✅ Covered |
| `completePackageExporter.ts` | `completePackageExporter.test.ts` | ✅ Covered (Phase 2) |

#### Hooks - 15/75 covered

| Hook | Test | Status |
|------|------|--------|
| `useAssetManager.ts` | `useAssetManager.test.ts` | ✅ Covered (Phase 1) |
| `useSelection.ts` | `useSelection.test.ts` | ✅ Covered |
| `useCharacterEditor.ts` | `useCharacterEditor.test.ts` | ✅ Covered |
| `useCharacterOperations.ts` | `useCharacterOperations.test.ts` | ✅ Covered (Phase 1) |
| `useProjectAutoSave.ts` | `useProjectAutoSave.test.ts` | ✅ Covered (Phase 1) |
| `useProjects.ts` | `useProjects.test.ts` | ✅ Covered (Phase 1) |
| `useTokenGrouping.ts` | `useTokenGrouping.test.ts` | ✅ Covered |
| `useTokenGenerator.ts` | `useTokenGenerator.test.ts` | ✅ Covered (Phase 1) |
| `useUndoStack.ts` | `useUndoStack.test.ts` | ✅ Covered |
| `useFilters.ts` | `useFilters.test.tsx` | ✅ Covered |
| `useAutoSavePreference.ts` | `useAutoSavePreference.test.ts` | ✅ Covered |
| `useAutoSaveDetector.ts` | `useAutoSaveDetector.test.ts` | ✅ Covered |
| `useAutoSaveTrigger.ts` | `useAutoSaveTrigger.test.ts` | ✅ Covered |
| `useAutoSaveTelemetry.ts` | `useAutoSaveTelemetry.test.ts` | ✅ Covered |
| `useTabSynchronization.ts` | `useTabSynchronization.test.ts` | ✅ Covered |

---

## ❌ Modules Needing Tests

### Priority 1: Critical Business Logic (HIGH)

#### Hooks - Token Generation & Management

| Hook | Purpose | Priority | Complexity |
|------|---------|----------|------------|
| ~~`useTokenGenerator.ts`~~ | ~~Token generation orchestration~~ | ✅ DONE | ~~High~~ |
| `useTokenDetailEditor.ts` | Token editing state | 🔴 HIGH | Medium |
| `useTokenDeletion.ts` | Token deletion with confirmation | 🔴 HIGH | Medium |
| `useTokenPreviewCache.ts` | Preview generation & cache | 🔴 HIGH | High |
| `useMissingTokenGenerator.ts` | Missing token generation | 🔴 HIGH | Medium |

#### Hooks - Character Management

| Hook | Purpose | Priority | Complexity |
|------|---------|----------|------------|
| ~~`useCharacterOperations.ts`~~ | ~~CRUD operations~~ | ✅ DONE | ~~High~~ |
| `useCharacterCRUD.ts` | Sub-hook: Add/delete/duplicate | 🔴 HIGH | Medium |
| `useCharacterMetadata.ts` | Team changes, metadata | 🔴 HIGH | Medium |
| `useCharacterImageResolver.ts` | Image URL resolution | 🔴 HIGH | Medium |
| `useCharacterDownloads.ts` | Download operations | 🟡 MEDIUM | Medium |
| `useJinxOperations.ts` | Jinx management | 🟡 MEDIUM | Medium |

#### Hooks - Project Management

| Hook | Purpose | Priority | Complexity |
|------|---------|----------|------------|
| ~~`useProjects.ts`~~ | ~~Project CRUD~~ | ✅ DONE | ~~High~~ |
| ~~`useProjectAutoSave.ts`~~ | ~~Auto-save orchestration~~ | ✅ DONE | ~~High~~ |
| `useProjectTokens.ts` | Token generation for project preview | 🔴 HIGH | Medium |
| `useOptionalFields.ts` | Optional field state | 🟡 MEDIUM | Low |
| `useHasUnsavedWork.ts` | Dirty state detection | 🟡 MEDIUM | Low |

### Priority 2: Export & Cache (HIGH)

#### Export Module

| File | Purpose | Priority | Complexity |
|------|---------|----------|------------|
| ~~`completePackageExporter.ts`~~ | ~~Full export orchestration~~ | ✅ DONE | ~~High~~ |
| `pngMetadata.ts` | PNG tEXt chunks | 🟡 MEDIUM | Medium |

#### Cache Module

| File | Purpose | Priority | Complexity |
|------|---------|----------|------------|
| ~~`CacheInvalidationService.ts`~~ | ~~Cache lifecycle~~ | ✅ DONE | ~~Medium~~ |
| ~~`policies/LRUEvictionPolicy.ts`~~ | ~~LRU eviction~~ | ✅ DONE | ~~Medium~~ |
| ~~`strategies/CharactersPreRenderStrategy.ts`~~ | ~~Character pre-render~~ | ✅ DONE | ~~High~~ |
| ~~`strategies/TokensPreRenderStrategy.ts`~~ | ~~Token pre-render~~ | ✅ DONE | ~~High~~ |
| `strategies/ProjectPreRenderStrategy.ts` | Project pre-render | 🟡 MEDIUM | Medium |
| `utils/EventEmitter.ts` | Typed events | 🟡 MEDIUM | Low |
| `utils/WorkerPool.ts` | Worker pooling | 🟡 MEDIUM | High |
| `utils/AdaptiveWorkerPool.ts` | Adaptive workers | 🟡 MEDIUM | High |
| `utils/memoryEstimator.ts` | Memory estimation | 🟢 LOW | Low |
| `utils/CacheLogger.ts` | Cache logging | 🟢 LOW | Low |
| `charactersPreRenderHelpers.ts` | Pre-render helpers | 🟡 MEDIUM | Medium |

### Priority 3: Services ✅ PHASE 3 COMPLETE

#### Upload Services

| File | Purpose | Priority | Complexity |
|------|---------|----------|------------|
| ~~`FileUploadService.ts`~~ | ~~Upload orchestration~~ | ✅ DONE | ~~High~~ |
| ~~`ImageProcessingService.ts`~~ | ~~Image processing~~ | ✅ DONE | ~~Medium~~ |
| `AssetSuggestionService.ts` | Asset suggestions | 🟡 MEDIUM | Medium |
| `AssetArchiveService.ts` | Archive operations | 🟡 MEDIUM | Medium |
| `assetResolver.ts` | Asset resolution | 🟡 MEDIUM | Medium |

#### Project Services

| File | Purpose | Priority | Complexity |
|------|---------|----------|------------|
| ~~`ProjectExporter.ts`~~ | ~~Project export~~ | ✅ DONE | ~~Medium~~ |
| ~~`ProjectImporter.ts`~~ | ~~Project import~~ | ✅ DONE | ~~Medium~~ |

#### Font Services

| File | Purpose | Priority | Complexity |
|------|---------|----------|------------|
| ~~`FontRegistry.ts`~~ | ~~Font registration~~ | ✅ DONE | ~~Medium~~ |
| `GoogleFontProvider.ts` | Google Fonts API | 🟡 MEDIUM | Medium |
| `CustomFontProvider.ts` | Custom font loading | 🟡 MEDIUM | Medium |
| `BuiltInFontProvider.ts` | Built-in fonts | 🟢 LOW | Low |
| `fontDatabase.ts` | Font storage | 🟢 LOW | Low |

### Priority 4: Canvas/Rendering (MEDIUM)

#### Canvas Module

| File | Purpose | Priority | Complexity |
|------|---------|----------|------------|
| `canvasUtils.ts` | Base operations | 🟡 MEDIUM | High |
| `textDrawing.ts` | Text rendering | 🟡 MEDIUM | High |
| `accentDrawing.ts` | Decorations | 🟡 MEDIUM | Medium |
| `bleedUtils.ts` | Print bleed | 🟡 MEDIUM | Medium |
| `gradientUtils.ts` | Gradients | 🟡 MEDIUM | Low |
| `qrGeneration.ts` | QR codes | 🟡 MEDIUM | Medium |
| `canvasPool.ts` | Canvas reuse | 🟢 LOW | Low |
| `canvasOptimizations.ts` | Performance | 🟢 LOW | Low |

#### Background Effects (0/25 covered)

| File | Purpose | Priority | Complexity |
|------|---------|----------|------------|
| `BackgroundRenderer.ts` | Main orchestrator | 🟡 MEDIUM | High |
| `noise/perlin.ts` | Perlin noise | 🟡 MEDIUM | Medium |
| `noise/fbm.ts` | Fractal noise | 🟡 MEDIUM | Medium |
| `textures/TextureStrategy.ts` | Base strategy | 🟡 MEDIUM | Low |
| `textures/MarbleTexture.ts` | Marble texture | 🟢 LOW | Low |
| `textures/CloudsTexture.ts` | Clouds texture | 🟢 LOW | Low |
| `textures/WatercolorTexture.ts` | Watercolor texture | 🟢 LOW | Low |
| `textures/PerlinTexture.ts` | Perlin texture | 🟢 LOW | Low |
| `textures/RadialFadeTexture.ts` | Radial fade | 🟢 LOW | Low |
| `textures/OrganicCellsTexture.ts` | Organic cells | 🟢 LOW | Low |
| `textures/SilkFlowTexture.ts` | Silk flow | 🟢 LOW | Low |
| `textures/ParchmentTexture.ts` | Parchment | 🟢 LOW | Low |
| `textures/LinenTexture.ts` | Linen | 🟢 LOW | Low |
| `textures/WoodGrainTexture.ts` | Wood grain | 🟢 LOW | Low |
| `textures/BrushedMetalTexture.ts` | Brushed metal | 🟢 LOW | Low |
| `effects/VignetteEffect.ts` | Vignette | 🟢 LOW | Low |
| `effects/InnerGlowEffect.ts` | Inner glow | 🟢 LOW | Low |
| `effects/VibranceEffect.ts` | Vibrance | 🟢 LOW | Low |
| `effects/BorderEffect.ts` | Border | 🟢 LOW | Low |

### Priority 5: UI/Utility Hooks (MEDIUM)

| Hook | Purpose | Priority | Complexity |
|------|---------|----------|------------|
| `useModalBehavior.ts` | Modal interactions | 🟡 MEDIUM | Low |
| `useDrawerAnimation.ts` | Drawer animation | 🟡 MEDIUM | Low |
| `useDrawerState.ts` | Drawer state | 🟡 MEDIUM | Low |
| `useContextMenu.ts` | Context menu | 🟡 MEDIUM | Low |
| `useExpandablePanel.ts` | Expandable panel | 🟡 MEDIUM | Low |
| `useIntersectionObserver.ts` | Visibility | 🟢 LOW | Low |
| `useAutoResizeTextarea.ts` | Textarea sizing | 🟢 LOW | Low |
| `useControlledField.ts` | Input state | 🟢 LOW | Low |
| `useControlledFields.ts` | Multiple inputs | 🟢 LOW | Low |
| `useDraggableList.ts` | Drag-and-drop | 🟡 MEDIUM | Medium |
| `useRecentColors.ts` | Color history | 🟢 LOW | Low |
| `useCharacterFiltering.ts` | Character search | 🟡 MEDIUM | Medium |

### Priority 6: Data/Script Hooks (MEDIUM)

| Hook | Purpose | Priority | Complexity |
|------|---------|----------|------------|
| `useScriptData.ts` | Script data loading | 🟡 MEDIUM | Medium |
| `useScriptTransformations.ts` | Script transformations | 🟡 MEDIUM | Medium |
| `useGroupedReminders.ts` | Reminder grouping | 🟡 MEDIUM | Low |
| `usePresets.ts` | Preset management | 🟡 MEDIUM | Low |

### Priority 7: Asset Hooks (MEDIUM)

| Hook | Purpose | Priority | Complexity |
|------|---------|----------|------------|
| ~~`useAssetManager.ts`~~ | ~~Asset CRUD~~ | ✅ DONE | ~~High~~ |
| `useBuiltInAssets.ts` | Asset loading | 🟡 MEDIUM | Low |
| `useFileUpload.ts` | File upload | 🟡 MEDIUM | Medium |
| `useAssetSelection.ts` | Selection mode | 🟡 MEDIUM | Low |
| `useAssetOperations.ts` | Asset operations | 🟡 MEDIUM | Medium |
| `useAssetPreview.ts` | Asset preview | 🟡 MEDIUM | Low |
| `useAssetPreviewGenerator.ts` | Preview generation | 🟡 MEDIUM | Medium |
| `useAssetSearch.ts` | Asset search | 🟡 MEDIUM | Low |

### Priority 8: Studio Module (LOW - 0/6 covered)

| File | Purpose | Priority | Complexity |
|------|---------|----------|------------|
| `canvasOperations.ts` | Canvas ops | 🟡 MEDIUM | Medium |
| `iconColorReplacer.ts` | Color replacement | 🟡 MEDIUM | Medium |
| `iconBorderRenderer.ts` | Border rendering | 🟢 LOW | Low |
| `navigationHelpers.ts` | Navigation | 🟢 LOW | Low |
| `characterPresets.ts` | Character presets | 🟢 LOW | Low |

### Priority 9: Night Order Module (LOW - 0/8 covered)

| File | Purpose | Priority | Complexity |
|------|---------|----------|------------|
| `nightOrderPdfLib.ts` | PDF generation | 🟡 MEDIUM | High |
| `nightOrderLayout.ts` | Layout calculation | 🟡 MEDIUM | Medium |
| `nightOrderUtils.ts` | Utilities | 🟡 MEDIUM | Low |
| `nightOrderSync.ts` | Sync integration | 🟢 LOW | Medium |
| `fontLoader.ts` | Font loading | 🟢 LOW | Low |
| `specialEntries.ts` | Special entries | 🟢 LOW | Low |

### Priority 10: Remaining Utils (LOW)

| File | Purpose | Priority | Complexity |
|------|---------|----------|------------|
| `logger.ts` | Structured logging | 🟢 LOW | Low |
| `imageCache.ts` | Global image cache | 🟢 LOW | Low |
| `imageUtils.ts` | Image loading | 🟡 MEDIUM | Medium |
| `textFormatAnalyzer.ts` | Text analysis | 🟢 LOW | Low |
| `compressionUtils.ts` | Compression | 🟢 LOW | Low |
| `asyncUtils.ts` | Async helpers | 🟢 LOW | Low |
| `measurementUtils.ts` | Measurement | 🟢 LOW | Low |
| `characterFiltering.ts` | Filtering | 🟢 LOW | Low |
| `projectDiff.ts` | Project diff | 🟡 MEDIUM | Medium |
| `textDiff.ts` | Text diff | 🟢 LOW | Low |
| `scriptEncoder.ts` | Script encoding | 🟢 LOW | Low |
| `storageKeys.ts` | Storage keys | 🟢 LOW | Low |
| `classNames.ts` | CSS classes | 🟢 LOW | Low |
| `searchUtils.ts` | Search utilities | 🟡 MEDIUM | Medium |
| `idUtils.ts` | ID generation | 🟢 LOW | Low |

### Priority 11: Remaining Data (LOW)

| File | Purpose | Priority | Complexity |
|------|---------|----------|------------|
| `characterLookup.ts` | O(1) validation | 🟡 MEDIUM | Low |
| `dataLoader.ts` | I/O operations | 🟡 MEDIUM | Medium |
| `exampleScripts.ts` | Predefined scripts | 🟢 LOW | Low |

### Priority 12: Remaining Sync (LOW)

| File | Purpose | Priority | Complexity |
|------|---------|----------|------------|
| `githubReleaseClient.ts` | GitHub API | 🟡 MEDIUM | Medium |

### Priority 13: Remaining Generation (LOW)

| File | Purpose | Priority | Complexity |
|------|---------|----------|------------|
| `teamVariantGenerator.ts` | Team variants | 🟢 LOW | Low |
| `QROptionsResolver.ts` | QR options | 🟢 LOW | Low |
| `ImageCacheAdapter.ts` | DI adapter | 🟢 LOW | Low |

---

## Recommended Test Implementation Order

### Phase 1: Critical Hooks ✅ COMPLETE
**Goal: Cover core user-facing functionality**

| Hook | Test File | Tests | Status |
|------|-----------|-------|--------|
| `useTokenGenerator.ts` | `useTokenGenerator.test.ts` | 17 | ✅ |
| `useCharacterOperations.ts` | `useCharacterOperations.test.ts` | 14 | ✅ |
| `useProjects.ts` | `useProjects.test.ts` | 31 | ✅ |
| `useProjectAutoSave.ts` | `useProjectAutoSave.test.ts` | 17 | ✅ |
| `useAssetManager.ts` | `useAssetManager.test.ts` | 29 | ✅ |
| **Total** | | **108** | ✅ |

### Phase 2: Export & Cache ✅ COMPLETE
**Goal: Ensure export reliability and cache correctness**

| File | Test File | Tests | Status |
|------|-----------|-------|--------|
| `CacheInvalidationService.ts` | `CacheInvalidationService.test.ts` | 36 | ✅ |
| `LRUEvictionPolicy.ts` | `LRUEvictionPolicy.test.ts` | 24 | ✅ |
| `CharactersPreRenderStrategy.ts` | `CharactersPreRenderStrategy.test.ts` | 27 | ✅ |
| `TokensPreRenderStrategy.ts` | `TokensPreRenderStrategy.test.ts` | 26 | ✅ |
| `completePackageExporter.ts` | `completePackageExporter.test.ts` | 24 | ✅ |
| **Total** | | **137** | ✅ |

### Phase 3: Services ✅ COMPLETE
**Goal: Complete service layer coverage**

| File | Test File | Tests | Status |
|------|-----------|-------|--------|
| `FileUploadService.ts` | `FileUploadService.test.ts` | 37 | ✅ |
| `ProjectExporter.ts` | `ProjectExporter.test.ts` | 34 | ✅ |
| `ProjectImporter.ts` | `ProjectImporter.test.ts` | 32 | ✅ |
| `ImageProcessingService.ts` | `ImageProcessingService.test.ts` | 38 | ✅ |
| `FontRegistry.ts` | `FontRegistry.test.ts` | 57 | ✅ |
| **Total** | | **198** | ✅ |

### Phase 4: Secondary Hooks (Weeks 5-6)
**Goal: Cover remaining important hooks**

1. Token hooks: `useTokenDetailEditor`, `useTokenDeletion`, `useTokenPreviewCache`
2. Character hooks: `useCharacterCRUD`, `useCharacterMetadata`, `useCharacterDownloads`
3. Data hooks: `useScriptData`, `useScriptTransformations`
4. Asset hooks: `useFileUpload`, `useAssetOperations`

### Phase 5: Canvas & UI (Weeks 7-8)
**Goal: Cover rendering and UI interactions**

1. `canvasUtils.ts` - Core canvas utilities
2. `textDrawing.ts` - Text rendering
3. UI hooks: `useModalBehavior`, `useDrawerState`, `useContextMenu`

### Phase 6: Studio & Night Order (Week 9)
**Goal: Complete remaining modules**

1. Studio: `canvasOperations.ts`, `iconColorReplacer.ts`
2. Night Order: `nightOrderPdfLib.ts`, `nightOrderLayout.ts`

### Phase 7: Background Effects & Utils (Week 10)
**Goal: Complete low-priority coverage**

1. `BackgroundRenderer.ts`
2. Noise utilities
3. Remaining utility files

---

## Test Pattern Guidelines

### For Hooks
```typescript
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('useHookName', () => {
  it('should initialize with default state', () => {
    const { result } = renderHook(() => useHookName());
    expect(result.current.value).toBe(defaultValue);
  });

  it('should update state on action', async () => {
    const { result } = renderHook(() => useHookName());
    await act(async () => {
      await result.current.performAction();
    });
    expect(result.current.value).toBe(newValue);
  });
});
```

### For Services (with DI)
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServiceName } from './ServiceName';

describe('ServiceName', () => {
  let service: ServiceName;
  let mockDependency: MockType;

  beforeEach(() => {
    mockDependency = { method: vi.fn() };
    service = new ServiceName({ dependency: mockDependency });
  });

  it('should call dependency method', async () => {
    await service.doSomething();
    expect(mockDependency.method).toHaveBeenCalled();
  });
});
```

### For React Components with ServiceProvider
```typescript
import { render, screen } from '@testing-library/react';
import { ServiceProvider } from '@/contexts/ServiceContext';

const renderWithProvider = (ui: React.ReactElement) => {
  return render(
    <ServiceProvider overrides={{ service: mockService }}>
      {ui}
    </ServiceProvider>
  );
};
```

---

## Coverage Goals

| Category | Current | Target | Priority |
|----------|---------|--------|----------|
| **Hooks** | ~20% | 80% | 🔴 HIGH |
| **Services** | ~36% (9/25) | 90% | 🟡 IMPROVED |
| **Generation** | ~64% | 95% | 🟡 MEDIUM |
| **Cache** | ~64% (7/11) | 90% | 🟡 IMPROVED |
| **Sync** | ~71% | 95% | 🟢 DONE |
| **Export** | ~67% (4/6) | 90% | 🟡 IMPROVED |
| **Utils** | ~43% | 80% | 🟡 MEDIUM |
| **Canvas** | 0% | 60% | 🟡 MEDIUM |
| **Studio** | 0% | 50% | 🟢 LOW |
| **Night Order** | 0% | 50% | 🟢 LOW |
| **Background Effects** | 0% | 40% | 🟢 LOW |

---

## Integration Test Gaps

### E2E Scenarios Needed
1. **Full token generation flow** - Script → Characters → Tokens → Export
2. **Project lifecycle** - Create → Edit → Auto-save → Export → Import
3. **Sync flow** - Check for updates → Download → Install → Verify
4. **Asset management** - Upload → Edit → Use in token → Export
5. **Multi-tab sync** - Changes in one tab reflected in another

### Integration Tests Needed
1. `ProjectService` + `ProjectDatabaseService` integration
2. `TokenGenerator` + `CacheManager` integration
3. `DataSyncService` + `StorageManager` + `CacheInvalidationService` integration
4. Export pipeline: tokens → PDF/ZIP/PNG

---

*Last updated: 2026-01-02 (Phase 3 Complete)*
