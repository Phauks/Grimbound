# File Upload Module Implementation Plan

> Reference document for implementing the unified file upload and asset management system.  
> Created: December 9, 2025

---

## Overview

A centralized file upload module using **Blob storage** internally for efficiency, with automatic bundling of all linked assets (global + project-scoped) on export for self-sustaining shared projects. A global asset library enables cross-project reuse while maintaining portable exports.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER INPUT SOURCES                                │
├─────────────────┬─────────────────┬─────────────────┬───────────────────────┤
│   Drag & Drop   │   File Picker   │ Clipboard Paste │    URL Download       │
└────────┬────────┴────────┬────────┴────────┬────────┴───────────┬───────────┘
         └─────────────────┴─────────────────┴────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          useFileUpload Hook                                 │
│  config: { assetType, projectId?, onProgress?, onComplete? }               │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FileUploadService                                   │
│  validate() → process() → generateThumbnail() → save()                     │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     IndexedDB 'assets' Table                                │
│  { id, type, projectId, blob, thumbnail, metadata, linkedTo[] }            │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Asset Types

| Type | Usage | Validation |
|------|-------|------------|
| `character-icon` | Token center image | Square, 200-1024px, PNG/JPG/WebP |
| `token-background` | Behind character on token | Square, 540px+, PNG (transparent) |
| `script-background` | PDF/export backdrop | Any aspect, 1920px+, JPG/PNG |
| `setup-flower` | Setup token flower decoration | Square, 540px+, PNG (transparent) |
| `leaf` | Token decoration leaves | ~100x50px, PNG (transparent) |
| `logo` | Project branding | Any, max 2MB, PNG/SVG |

---

## Implementation Phases

### Phase 1: Core Services ✅ COMPLETE
- [x] `src/services/upload/types.ts` - Type definitions
- [x] `src/services/upload/constants.ts` - Per-type validation limits
- [x] `src/services/upload/FileValidationService.ts` - MIME detection, validation
- [x] `src/services/upload/ImageProcessingService.ts` - Resize, convert, thumbnail
- [x] `src/services/upload/AssetStorageService.ts` - IndexedDB CRUD
- [x] `src/services/upload/FileUploadService.ts` - Orchestration
- [x] `src/services/upload/index.ts` - Public exports

### Phase 2: Database Schema ✅ COMPLETE
- [x] Update `src/ts/db/projectDb.ts` - Add 'assets' table (version 2)
- [x] Add migration for new schema

### Phase 3: React Hooks ✅ COMPLETE
- [x] `src/hooks/useFileUpload.ts` - Drag-drop, paste, progress
- [x] `src/hooks/useAssetManager.ts` - List, filter, CRUD operations

### Phase 4: UI Components ✅ COMPLETE
- [x] `src/components/Shared/FileDropzone.tsx` - Reusable dropzone
- [x] `src/styles/components/shared/FileDropzone.module.css` - Dropzone styles
- [x] `src/components/Shared/AssetThumbnail.tsx` - Grid item component
- [x] `src/styles/components/shared/AssetThumbnail.module.css` - Thumbnail styles
- [x] `src/components/Modals/AssetManagerModal.tsx` - Full asset browser
- [x] `src/styles/components/modals/AssetManagerModal.module.css` - Modal styles

### Phase 5: Integration & Refactoring ✅ COMPLETE
- [x] Refactor `IconUploader.tsx` to use new system
- [x] Replace `IconManagementModal.tsx` with `AssetManagerModal`
- [x] Update `ProjectExporter.ts` to bundle linked global assets
- [x] Update `ProjectImporter.ts` to restore assets as project-scoped

### Phase 6: Cleanup ✅ COMPLETE
- [x] Remove deprecated `customIcons` table usage
- [x] Remove old `IconManagementModal.tsx` (deleted - replaced by AssetManagerModal)
- [x] Remove old `IconManagementModal.module.css` (deleted)
- [x] Update component exports in index files

---

## Implementation Status: ✅ COMPLETE

All phases have been implemented. The unified file upload and asset management system is now fully integrated.

---

## Key Decisions

### Storage: Blob (not Base64)
- **Why**: ~33% smaller storage, native browser support, efficient streaming
- **Conversion**: Use `URL.createObjectURL(blob)` for display, convert to dataURL only when needed for canvas

### Hybrid Asset Scoping
- **Global assets**: `projectId: null` - reusable across projects
- **Project assets**: `projectId: "uuid"` - scoped to one project
- **Export behavior**: Bundle ALL linked assets (global + project) for self-sustaining ZIP
- **Import behavior**: Restore all assets as project-scoped (user can "Make Global" manually)

### Orphan Cleanup Strategy
- **Review mode**: Show orphaned assets in Asset Manager for manual decision
- **Bulk delete**: Option to delete all orphans at once
- **Project delete**: Prompt to clean up project-scoped assets

---

## Database Schema

```typescript
// Version 2 schema addition
assets: 'id, type, projectId, uploadedAt, *linkedTo'

interface DBAsset {
  id: string;                    // UUID
  type: AssetType;               // 'character-icon' | 'token-background' | ...
  projectId: string | null;      // null = global library
  blob: Blob;                    // Primary image data
  thumbnail: Blob;               // 128x128 preview
  metadata: {
    filename: string;
    mimeType: string;
    size: number;                // bytes
    width: number;
    height: number;
    uploadedAt: number;          // timestamp
    editedAt?: number;           // for future icon editor
    sourceType: 'upload' | 'paste' | 'url' | 'editor';
  };
  linkedTo: string[];            // Character IDs using this asset
}
```

---

## File Structure

```
src/
├── services/
│   └── upload/
│       ├── index.ts                    ✅ Created
│       ├── types.ts                    ✅ Created
│       ├── constants.ts                ✅ Created
│       ├── FileValidationService.ts    ✅ Created
│       ├── ImageProcessingService.ts   ✅ Created
│       ├── AssetStorageService.ts      ✅ Created
│       └── FileUploadService.ts        ✅ Created
│
├── hooks/
│   ├── useFileUpload.ts                ✅ Created
│   └── useAssetManager.ts              ✅ Created
│
├── components/
│   ├── Shared/
│   │   ├── FileDropzone.tsx            ✅ Created
│   │   ├── AssetThumbnail.tsx          ✅ Created
│   │   └── IconUploader.tsx            ✅ Refactored
│   └── Modals/
│       └── AssetManagerModal.tsx       ✅ Created
│
├── styles/
│   └── components/
│       ├── shared/
│       │   ├── FileDropzone.module.css     ✅ Created
│       │   └── AssetThumbnail.module.css   ✅ Created
│       └── modals/
│           └── AssetManagerModal.module.css ✅ Created
│
└── ts/
    └── db/
        └── projectDb.ts                ✅ Updated (v2 schema with assets table)
```

---

## API Reference

### FileUploadService

```typescript
class FileUploadService {
  async upload(
    files: File | File[],
    config: UploadConfig
  ): Promise<UploadResult[]>;
  
  async uploadFromClipboard(
    event: ClipboardEvent,
    config: UploadConfig
  ): Promise<UploadResult | null>;
  
  async uploadFromUrl(
    url: string,
    config: UploadConfig
  ): Promise<UploadResult>;
}
```

### AssetStorageService

```typescript
class AssetStorageService {
  async save(asset: Omit<DBAsset, 'id'>): Promise<string>;
  async getById(id: string): Promise<DBAsset | undefined>;
  async getByType(type: AssetType): Promise<DBAsset[]>;
  async getByProject(projectId: string | null): Promise<DBAsset[]>;
  async getGlobal(): Promise<DBAsset[]>;
  async getOrphaned(): Promise<DBAsset[]>;
  async delete(id: string): Promise<void>;
  async bulkDelete(ids: string[]): Promise<void>;
  async linkToCharacter(assetId: string, characterId: string): Promise<void>;
  async unlinkFromCharacter(assetId: string, characterId: string): Promise<void>;
  async promoteToGlobal(id: string): Promise<void>;
  async moveToProject(id: string, projectId: string): Promise<void>;
  async getAssetUrl(id: string): Promise<string>; // createObjectURL
}
```

### useFileUpload Hook

```typescript
function useFileUpload(config: UseFileUploadConfig): {
  // State
  isUploading: boolean;
  progress: number; // 0-100
  error: string | null;
  
  // Handlers
  handleDrop: (e: DragEvent) => void;
  handlePaste: (e: ClipboardEvent) => void;
  handleFileSelect: (files: FileList) => void;
  
  // Drag state (for UI feedback)
  isDragOver: boolean;
  dragHandlers: {
    onDragEnter: (e: DragEvent) => void;
    onDragLeave: (e: DragEvent) => void;
    onDragOver: (e: DragEvent) => void;
    onDrop: (e: DragEvent) => void;
  };
  
  // Actions
  abort: () => void;
  reset: () => void;
}
```

### useAssetManager Hook

```typescript
function useAssetManager(options?: AssetManagerOptions): {
  // State
  assets: DBAsset[];
  isLoading: boolean;
  error: string | null;
  
  // Filters
  filter: AssetFilter;
  setFilter: (filter: Partial<AssetFilter>) => void;
  
  // Selection
  selectedIds: Set<string>;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  
  // Actions
  deleteSelected: () => Promise<void>;
  promoteToGlobal: (id: string) => Promise<void>;
  moveToProject: (id: string, projectId: string) => Promise<void>;
  getOrphaned: () => Promise<DBAsset[]>;
  cleanupOrphans: () => Promise<number>;
  
  // Refresh
  refresh: () => Promise<void>;
}
```

---

## Migration Notes

### From customIcons to assets

The old `customIcons` table stored:
```typescript
{
  id: string;
  characterId: string;
  projectId: string;
  characterName: string;
  filename: string;
  dataUrl: string;      // Base64 - DEPRECATED
  mimeType: string;
  fileSize: number;
  uploadedAt: number;
}
```

No migration needed per user request - clean slate approach.

---

## Testing Checklist

- [ ] Upload single file via file picker
- [ ] Upload multiple files via file picker
- [ ] Upload via drag-and-drop
- [ ] Upload via clipboard paste (Ctrl+V)
- [ ] Validation error handling (wrong type, too large)
- [ ] Progress indicator for large files
- [ ] Thumbnail generation
- [ ] Asset Manager: view all assets
- [ ] Asset Manager: filter by type
- [ ] Asset Manager: filter by scope (global/project)
- [ ] Asset Manager: delete single asset
- [ ] Asset Manager: bulk delete
- [ ] Asset Manager: promote to global
- [ ] Asset Manager: move to project
- [ ] Asset Manager: orphan detection
- [ ] Asset Manager: orphan cleanup
- [ ] Project export: bundles all linked assets
- [ ] Project import: restores assets as project-scoped
- [ ] Token generation: uses new asset system
