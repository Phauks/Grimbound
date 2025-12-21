# Hooks Refactoring Roadmap

> **Purpose**: Track the reorganization of `src/hooks/` from a flat structure to domain-based subdirectories.
> **Status**: ✅ Complete
> **Started**: 2024-12-19
> **Completed**: 2024-12-20

---

## Overview

Reorganized 47 hooks (10,180 lines) from a flat folder into 13 domain-based subdirectories for better scalability and maintainability.

---

## Phase 1: Create Subdirectory Structure ✅

### 1.1 Token Hooks (7 files, ~1,600 lines) ✅
- [x] Create `src/hooks/tokens/` directory
- [x] Move `useTokenGenerator.ts`
- [x] Move `useTokenGrouping.ts`
- [x] Move `useTokenPreviewCache.ts`
- [x] Move `useTokenDeletion.ts`
- [x] Move `useTokenDetailEditor.ts`
- [x] Move `useTokenEditorLocalState.ts`
- [x] Move `useMissingTokenGenerator.ts`
- [x] Create `src/hooks/tokens/index.ts` barrel export

### 1.2 Character Hooks (5 files, ~1,250 lines) ✅
- [x] Create `src/hooks/characters/` directory
- [x] Move `useCharacterEditor.ts`
- [x] Move `useCharacterOperations.ts`
- [x] Move `useCharacterDownloads.ts`
- [x] Move `useCharacterImageResolver.ts`
- [x] Move `useBackgroundImageUrl.ts`
- [x] Create `src/hooks/characters/index.ts` barrel export

### 1.3 Auto-Save Hooks (5 files, ~900 lines) ✅
- [x] Create `src/hooks/autosave/` directory
- [x] Move `useProjectAutoSave.ts`
- [x] Move `useAutoSaveDetector.ts`
- [x] Move `useAutoSaveTrigger.ts`
- [x] Move `useAutoSavePreference.ts`
- [x] Move `useAutoSaveTelemetry.ts`
- [x] Create `src/hooks/autosave/index.ts` barrel export

### 1.4 Cache Hooks (4 files, ~1,050 lines) ✅
- [x] Create `src/hooks/cache/` directory
- [x] Move `useCacheManager.ts`
- [x] Move `usePreRenderCache.ts`
- [x] Move `useCacheStats.ts`
- [x] Move `useProjectCacheWarming.ts`
- [x] Create `src/hooks/cache/index.ts` barrel export

### 1.5 Export Hooks (2 files, ~400 lines) ✅
- [x] Create `src/hooks/export/` directory
- [x] Move `useExport.ts`
- [x] Move `useScriptPdfDownloads.ts`
- [x] Create `src/hooks/export/index.ts` barrel export

### 1.6 Project Hooks (1 file, ~370 lines) ✅
- [x] Create `src/hooks/projects/` directory
- [x] Move `useProjects.ts`
- [x] Create `src/hooks/projects/index.ts` barrel export

### 1.7 Script Hooks (3 files, ~900 lines) ✅
- [x] Create `src/hooks/scripts/` directory
- [x] Move `useScriptData.ts`
- [x] Move `useScriptTransformations.ts`
- [x] Move `useGroupedReminders.ts`
- [x] Create `src/hooks/scripts/index.ts` barrel export

### 1.8 Asset Hooks (3 files, ~880 lines) ✅
- [x] Create `src/hooks/assets/` directory
- [x] Move `useAssetManager.ts`
- [x] Move `useBuiltInAssets.ts`
- [x] Move `useFileUpload.ts`
- [x] Create `src/hooks/assets/index.ts` barrel export

### 1.9 Editor Hooks (3 files, ~930 lines) ✅
- [x] Create `src/hooks/editors/` directory
- [x] Move `useJsonEditor.ts`
- [x] Move `useCodeMirrorEditor.ts`
- [x] Move `usePresets.ts`
- [x] Create `src/hooks/editors/index.ts` barrel export

### 1.10 UI Hooks (10 files, ~1,400 lines) ✅
- [x] Create `src/hooks/ui/` directory
- [x] Move `useSelection.ts`
- [x] Move `useUndoStack.ts`
- [x] Move `useModalBehavior.ts`
- [x] Move `useContextMenu.ts`
- [x] Move `useExpandablePanel.ts`
- [x] Move `useDraggableList.ts`
- [x] Move `useFilters.ts`
- [x] Move `useAutoResizeTextarea.ts`
- [x] Move `useIntersectionObserver.ts`
- [x] Create `src/hooks/ui/index.ts` barrel export

### 1.11 Sync Hooks (3 files, ~650 lines) ✅
- [x] Create `src/hooks/sync/` directory
- [x] Move `useTabSynchronization.ts`
- [x] Move `useHasUnsavedWork.ts`
- [x] Move `useStorageQuota.ts`
- [x] Create `src/hooks/sync/index.ts` barrel export

### 1.12 PWA Hooks (1 file, ~130 lines) ✅
- [x] Create `src/hooks/pwa/` directory
- [x] Move `usePWAInstall.ts`
- [x] Create `src/hooks/pwa/index.ts` barrel export

### 1.13 Studio Hooks (1 file, ~140 lines) ✅
- [x] Create `src/hooks/studio/` directory
- [x] Move `useStudioNavigation.ts`
- [x] Create `src/hooks/studio/index.ts` barrel export

---

## Phase 2: Update Main Barrel Export ✅

- [x] Rewrite `src/hooks/index.ts` to re-export from all subdirectories
- [x] Verify all existing exports are preserved (non-breaking)

---

## Phase 3: Code-Level Refactoring ✅

### 3.1 Extract Character Creation Logic ✅
- [x] Extract shared `createAndAddCharacter` helper function
- [x] Extract `updateJsonWithNewCharacter` helper function
- [x] Refactor `useCharacterOperations.ts` to use extracted helpers
- [x] Reduced ~80 lines of duplicated code

---

## Phase 4: Update Internal Imports ✅

- [x] Update cross-hook imports to use relative paths within subdirectories
- [x] Fixed `useAssetManager` → import `useSelection` from `../ui/useSelection.js`
- [x] Fixed `useAutoSaveTrigger` → import `useTabSynchronization` from `../sync/useTabSynchronization.js`

---

## Phase 5: Update External Imports ✅

- [x] Update 46 component files to import from `@/hooks` barrel
- [x] Consolidated multiple hook imports into single import statements
- [x] Added missing type exports to main barrel (`CustomPreset`, `GroupedReminder`, etc.)

---

## Phase 6: Verification ✅

- [x] Run TypeScript build to verify no type errors - PASSED
- [x] Deleted 47 old hook files from root directory
- [x] Verified clean directory structure

---

## Final Directory Structure

```
src/hooks/
├── index.ts              # Main barrel export (re-exports from all subdirectories)
├── tokens/               # 7 hooks - Token generation, grouping, deletion
│   ├── index.ts
│   ├── useTokenGenerator.ts
│   ├── useTokenGrouping.ts
│   ├── useTokenPreviewCache.ts
│   ├── useTokenDeletion.ts
│   ├── useTokenDetailEditor.ts
│   ├── useTokenEditorLocalState.ts
│   └── useMissingTokenGenerator.ts
├── characters/           # 5 hooks - Character editing, operations, downloads
│   ├── index.ts
│   ├── useCharacterEditor.ts
│   ├── useCharacterOperations.ts
│   ├── useCharacterDownloads.ts
│   ├── useCharacterImageResolver.ts
│   └── useBackgroundImageUrl.ts
├── autosave/             # 5 hooks - Auto-save orchestration
│   ├── index.ts
│   ├── useProjectAutoSave.ts
│   ├── useAutoSaveDetector.ts
│   ├── useAutoSaveTrigger.ts
│   ├── useAutoSavePreference.ts
│   └── useAutoSaveTelemetry.ts
├── cache/                # 4 hooks - Cache management
│   ├── index.ts
│   ├── useCacheManager.ts
│   ├── useCacheStats.ts
│   ├── usePreRenderCache.ts
│   └── useProjectCacheWarming.ts
├── export/               # 2 hooks - Export operations
│   ├── index.ts
│   ├── useExport.ts
│   └── useScriptPdfDownloads.ts
├── scripts/              # 3 hooks - Script data and transformations
│   ├── index.ts
│   ├── useScriptData.ts
│   ├── useScriptTransformations.ts
│   └── useGroupedReminders.ts
├── assets/               # 3 hooks - Asset management
│   ├── index.ts
│   ├── useAssetManager.ts
│   ├── useBuiltInAssets.ts
│   └── useFileUpload.ts
├── editors/              # 3 hooks - Editor functionality
│   ├── index.ts
│   ├── useJsonEditor.ts
│   ├── useCodeMirrorEditor.ts
│   └── usePresets.ts
├── ui/                   # 9 hooks - UI interactions
│   ├── index.ts
│   ├── useSelection.ts
│   ├── useUndoStack.ts
│   ├── useModalBehavior.ts
│   ├── useContextMenu.ts
│   ├── useExpandablePanel.ts
│   ├── useDraggableList.ts
│   ├── useFilters.ts
│   ├── useAutoResizeTextarea.ts
│   └── useIntersectionObserver.ts
├── sync/                 # 3 hooks - Data synchronization
│   ├── index.ts
│   ├── useTabSynchronization.ts
│   ├── useHasUnsavedWork.ts
│   └── useStorageQuota.ts
├── pwa/                  # 1 hook - PWA installation
│   ├── index.ts
│   └── usePWAInstall.ts
├── studio/               # 1 hook - Studio navigation
│   ├── index.ts
│   └── useStudioNavigation.ts
└── projects/             # 1 hook - Project CRUD
    ├── index.ts
    └── useProjects.ts
```

---

## Progress Log

| Date | Action | Status |
|------|--------|--------|
| 2024-12-19 | Created roadmap | Complete |
| 2024-12-19 | Created all 13 subdirectories | Complete |
| 2024-12-19 | Moved all 47 hooks to subdirectories | Complete |
| 2024-12-19 | Created barrel exports for all subdirectories | Complete |
| 2024-12-19 | Updated main barrel export | Complete |
| 2024-12-19 | Extracted character creation helpers | Complete |
| 2024-12-20 | Deleted old hook files | Complete |
| 2024-12-20 | Updated 46 component import paths | Complete |
| 2024-12-20 | Fixed internal hook imports | Complete |
| 2024-12-20 | TypeScript build verified - PASSED | Complete |

---

## Benefits Achieved

1. **Scalability**: Easy to add new hooks to appropriate domain directories
2. **Discoverability**: Hooks organized by feature domain
3. **Maintainability**: Related hooks grouped together
4. **Import Simplicity**: `@/hooks` barrel still works for all consumers
5. **Code Quality**: Extracted duplicate code in `useCharacterOperations`
