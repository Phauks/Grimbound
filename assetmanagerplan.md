# Asset Manager Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace hard-coded AssetType with flexible tag system, add folder organization, virtual scrolling, inline rename, batch operations, and starred/recent features.

**Architecture:** Tag-based categorization using `type:*` and `team:*` prefixes for system tags, with user-defined tags and folder paths. Virtual scrolling via @tanstack/react-virtual. Three-column compact modal layout.

**Tech Stack:** React 19, TypeScript, Dexie (IndexedDB), @tanstack/react-virtual, CSS Modules

---

## Progress Summary

| Phase | Status | Tasks |
|-------|--------|-------|
| Phase 1: Foundation | ✅ COMPLETE | Tasks 1-5 |
| Phase 2: Service Layer | ✅ COMPLETE | Tasks 6-9 |
| Phase 3: Hooks | ✅ COMPLETE | Tasks 10-14 |
| Phase 4: UI Components | ✅ COMPLETE | Task 15 |
| Phase 5: Modal Rebuild | 🔄 IN PROGRESS | Tasks 16-22 |
| Phase 6: Integration | ✅ COMPLETE | Tasks 23-26 |

---

## Phase 1: Foundation (Schema & Utilities) ✅ COMPLETE

### Task 1: Install @tanstack/react-virtual ✅ DONE

### Task 2: Create Tag Utilities ✅ DONE
- Created `src/ts/services/upload/tagUtils.ts`
- Created `src/__tests__/unit/services/tagUtils.test.ts` (21 tests passing)

### Task 3: Create Folder Utilities ✅ DONE
- Created `src/ts/services/upload/folderUtils.ts`
- Created `src/__tests__/unit/services/folderUtils.test.ts`

### Task 4: Create Batch Tag Utilities ✅ DONE
- Created `src/ts/services/upload/batchTagUtils.ts`
- Created `src/__tests__/unit/services/batchTagUtils.test.ts`

### Task 5: Update Database Schema to Version 8 ✅ DONE
- Updated `src/ts/db/projectDb.ts` with schema v8
- Updated `src/ts/services/upload/types.ts` with tags/folder fields

---

## Phase 2: Service Layer Updates ✅ COMPLETE

### Task 6: Update AssetStorageService ✅ DONE
- Updated `src/ts/services/upload/AssetStorageService.ts`
- Updated `src/ts/services/upload/IUploadServices.ts`

### Task 7: Update constants.ts for Tag-Based Config ✅ DONE
- Updated `src/ts/services/upload/constants.ts`
- Added `TAG_TYPE_ICONS`, `TAG_TYPE_LABELS_PLURAL`

### Task 8: Update FileUploadService and FileValidationService ✅ DONE
- Updated `src/ts/services/upload/FileUploadService.ts`
- Updated `src/ts/services/upload/FileValidationService.ts`

### Task 9: Update barrel export ✅ DONE
- Updated `src/ts/services/upload/index.ts`

---

## Phase 3: Hooks ✅ COMPLETE

### Task 10: Create useVirtualAssetGrid Hook ✅ DONE
- Created `src/hooks/assets/useVirtualAssetGrid.ts`

### Task 11: Create useAssetFolders Hook ✅ DONE
- Created `src/hooks/assets/useAssetFolders.ts`

### Task 12: Create useAssetTags Hook ✅ DONE
- Created `src/hooks/assets/useAssetTags.ts`

### Task 13: Create useBatchTagEditor Hook ✅ DONE
- Created `src/hooks/assets/useBatchTagEditor.ts`

### Task 14: Update hooks barrel export ✅ DONE
- Updated `src/hooks/assets/index.ts`

---

## Phase 4: UI Components ✅ COMPLETE

### Task 15: Create InlineEditableText Component ✅ DONE
- Created `src/components/Shared/UI/InlineEditableText.tsx`
- Created `src/styles/components/shared/InlineEditableText.module.css`
- Tests passing (23 tests)

---

## Phase 5: Asset Manager Modal Rebuild 🔄 IN PROGRESS

This phase rebuilds the AssetManagerModal with a three-column layout.

### Target Layout

```
┌──────────────┬─────────────────────────────────────┬─────────────┐
│   FOLDERS    │  [Search___] [Type ▼] [+ Upload]    │   PREVIEW   │
│   ────────   │  ─────────────────────────────────  │   ───────   │
│ 📁 All       │  [★ Starred] [🕐 Recent]            │  ┌───────┐  │
│ 📁 Root      │  ─────────────────────────────────  │  │       │  │
│ 📁 Icons     │  ┌────┐ ┌────┐ ┌────┐ ┌────┐       │  │ Token │  │
│   └ Town     │  │ ★  │ │    │ │ ★  │ │    │       │  │Preview│  │
│   └ Evil     │  │img │ │img │ │img │ │img │       │  │       │  │
│ 📁 Accents   │  │nam │ │nam │ │nam │ │nam │       │  └───────┘  │
│ + New Folder │  └────┘ └────┘ └────┘ └────┘       │             │
│              │  ┌────┐ ┌────┐ ┌────┐ ┌────┐       │  filename   │
│ ─────────    │  │    │ │    │ │    │ │    │       │  256×256    │
│ QUICK FILTER │  └────┘ └────┘ └────┘ └────┘       │  type:icon  │
│ [Icons    6] │                                     │             │
│ [Accents  3] │  ───────────────────────────────── │  [Apply]    │
│ [BGs      2] │  [Batch: ★ Star] [🗑 Delete] [📁]  │  [Cancel]   │
└──────────────┴─────────────────────────────────────┴─────────────┘
```

### Task 16: Create FolderSidebar Component

**Files:**
- Create: `src/components/Shared/Assets/FolderSidebar.tsx`
- Create: `src/styles/components/shared/FolderSidebar.module.css`

**Features:**
- Folder tree with expand/collapse
- Root folder (null) option
- "All" option to show all folders
- "New Folder" button
- Inline rename on folders
- Asset counts per folder

---

### Task 17: Create VirtualAssetGrid Component

**Files:**
- Create: `src/components/Shared/Assets/VirtualAssetGrid.tsx`
- Create: `src/styles/components/shared/VirtualAssetGrid.module.css`

**Features:**
- Virtual scrolling using @tanstack/react-virtual
- Responsive column count based on container width
- 64×64 compact thumbnails with name below
- Star indicator overlay
- Selection state (checkbox or highlight)
- Keyboard navigation (arrow keys, Enter to select)

---

### Task 18: Create QuickFilterBar Component

**Files:**
- Create: `src/components/Shared/Assets/QuickFilterBar.tsx`
- Create: `src/styles/components/shared/QuickFilterBar.module.css`

**Features:**
- Starred toggle pill
- Recent toggle pill
- Type filter dropdown (Icons, Backgrounds, etc.)
- Search input
- Clear filters button

---

### Task 19: Create BatchOperationsBar Component

**Files:**
- Create: `src/components/Shared/Assets/BatchOperationsBar.tsx`
- Create: `src/styles/components/shared/BatchOperationsBar.module.css`

**Features:**
- Shows when 2+ assets selected
- Star/Unstar all button
- Move to folder dropdown
- Add tag input
- Delete all button
- Selection count display

---

### Task 20: Create AssetPreviewPanel Component

**Files:**
- Create: `src/components/Shared/Assets/AssetPreviewPanel.tsx`
- Create: `src/styles/components/shared/AssetPreviewPanel.module.css`

**Features:**
- Full-size preview of selected asset
- Token preview (character token with asset)
- Metadata display (filename, dimensions, size, type, tags)
- Edit tags section
- Apply/Cancel buttons (in selection mode)

---

### Task 21: Update AssetThumbnail for Compact Mode

**Files:**
- Modify: `src/components/Shared/Assets/AssetThumbnail.tsx`
- Modify: `src/styles/components/shared/AssetThumbnail.module.css`

**Changes:**
- Add `size="compact"` variant (64×64)
- Add star indicator overlay
- Use InlineEditableText for filename
- Show folder path badge
- Simpler context menu

---

### Task 22: Rebuild AssetManagerModal with Three-Column Layout

**Files:**
- Modify: `src/components/Modals/AssetManagerModal.tsx`
- Modify: `src/styles/components/modals/AssetManagerModal.module.css`

**Changes:**
- Three-column CSS Grid layout
- Left: FolderSidebar + QuickFilters
- Center: QuickFilterBar + VirtualAssetGrid + BatchOperationsBar
- Right: AssetPreviewPanel
- Integrate all new hooks (useAssetFolders, useAssetTags, useVirtualAssetGrid)
- Remove old tab-based navigation
- Responsive: hide sidebar on narrow screens

---

## Phase 6: Integration & Testing ✅ COMPLETE

### Task 23: Update useAssetManager hook ✅ DONE
- Already using tags-based filtering

### Task 24: Update all callers of AssetType ✅ DONE
- Updated `StudioView.tsx` - `"character-icon"` → `"icon"`
- Updated `GameplayTabContent.tsx` - `"character-icon"` → `"icon"`
- Updated `DecorativesSettingsSelector.tsx` - `"setup-overlay"` → `"setup"`
- Updated `AssetPreviewSelector.tsx` - use `TypeTagValue`
- Updated `useAssetPreview.ts` - use `TypeTagValue`

### Task 25: Run biome check ✅ DONE
- All files pass

### Task 26: Run tests ✅ DONE
- tagUtils: 21 tests passing
- InlineEditableText: 23 tests passing

### Task 27: Manual testing checklist
- [ ] Upload new asset with type selection
- [ ] Create folder
- [ ] Move asset to folder
- [ ] Rename folder
- [ ] Add/remove tags
- [ ] Star/unstar assets
- [ ] Multi-select and batch tag
- [ ] Search assets
- [ ] Filter by type, team, user tags
- [ ] Virtual scrolling with 100+ assets
- [ ] Inline rename (double-click)
- [ ] Recent and starred quick filters
- [ ] Apply asset in selection mode
- [ ] Preview panel shows token preview

---

## Files Created/Modified

### New Files
- `src/ts/services/upload/tagUtils.ts` ✅
- `src/ts/services/upload/folderUtils.ts` ✅
- `src/ts/services/upload/batchTagUtils.ts` ✅
- `src/hooks/assets/useVirtualAssetGrid.ts` ✅
- `src/hooks/assets/useAssetFolders.ts` ✅
- `src/hooks/assets/useAssetTags.ts` ✅
- `src/hooks/assets/useBatchTagEditor.ts` ✅
- `src/components/Shared/UI/InlineEditableText.tsx` ✅
- `src/components/Shared/Assets/FolderSidebar.tsx` 🔄
- `src/components/Shared/Assets/VirtualAssetGrid.tsx` 🔄
- `src/components/Shared/Assets/QuickFilterBar.tsx` 🔄
- `src/components/Shared/Assets/BatchOperationsBar.tsx` 🔄
- `src/components/Shared/Assets/AssetPreviewPanel.tsx` 🔄

### Modified Files
- `src/ts/db/projectDb.ts` ✅
- `src/ts/services/upload/types.ts` ✅
- `src/ts/services/upload/constants.ts` ✅
- `src/ts/services/upload/AssetStorageService.ts` ✅
- `src/ts/services/upload/FileUploadService.ts` ✅
- `src/ts/services/upload/FileValidationService.ts` ✅
- `src/components/Modals/AssetManagerModal.tsx` 🔄
- `src/components/Shared/Assets/AssetThumbnail.tsx` ✅

---

*Plan updated: 2026-01-05*
