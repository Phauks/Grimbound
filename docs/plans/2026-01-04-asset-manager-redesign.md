# Asset Manager Redesign

**Date:** 2026-01-04
**Status:** Approved
**Version:** 1.0

---

## Overview

Comprehensive redesign of the Asset Manager to replace hard-coded `AssetType` with a flexible tag system, add folder organization, virtual scrolling for performance, and improved UX features.

---

## Goals

1. **Tags replace AssetType** - Flexible categorization with `type:*` and `team:*` system tags
2. **Folders** - User-defined folder hierarchy for organization
3. **Virtual scrolling** - Handle 1000+ assets without performance degradation
4. **Inline rename** - Double-click to edit filename
5. **Batch operations** - Multi-select tag editing
6. **Recently used** - Quick access to recently accessed assets
7. **Starred/Favorites** - Pin frequently used assets

---

## Schema Changes

### Database Version 8

**DBAsset Changes:**

```typescript
interface DBAsset {
  id: string;

  // REMOVED: type: AssetType;

  // NEW: Tags replace type
  tags: string[];           // ["type:icon", "team:townsfolk", "starred", "homebrew"]

  // NEW: Folder organization
  folder: string | null;    // null = root, "Characters/Townsfolk", etc.

  // Existing fields (unchanged)
  projectId: string | null;
  blob: Blob;
  thumbnail: Blob;
  metadata: AssetMetadata;
  linkedTo: string[];
  contentHash?: string;
  lastUsedAt?: number;
  usageCount?: number;
}
```

**New Indexes:**

```typescript
assets: 'id, *tags, folder, projectId, [folder+projectId], *linkedTo, uploadedAt, contentHash, lastUsedAt, usageCount'
```

**Migration:**

```typescript
.version(8)
  .stores({
    assets: 'id, *tags, folder, projectId, [folder+projectId], *linkedTo, uploadedAt, contentHash, lastUsedAt, usageCount',
  })
  .upgrade(async (tx) => {
    await tx.table('assets').toCollection().modify((asset) => {
      // Migrate AssetType to type:* tag
      const typeMap: Record<string, string> = {
        'character-icon': 'type:icon',
        'studio-icon': 'type:icon',
        'token-background': 'type:token-background',
        'script-background': 'type:script-background',
        'setup-overlay': 'type:setup',
        'accent': 'type:accent',
        'logo': 'type:logo',
        'studio-logo': 'type:logo',
      };
      asset.tags = [typeMap[asset.type] || 'type:icon'];
      asset.folder = null;
      delete asset.type;
    });
  });
```

---

## Tag System

### Tag Categories

| Prefix | Purpose | Cardinality | Examples |
|--------|---------|-------------|----------|
| `type:` | Asset purpose | Exactly 1 required | `type:icon`, `type:token-background` |
| `team:` | Team association | 0 or more | `team:townsfolk`, `team:demon` |
| (none) | User tags | 0 or more | `homebrew`, `scary`, `base-3` |
| `starred` | Reserved | 0 or 1 | `starred` |

### Type Tags (6 total)

| Tag | Purpose |
|-----|---------|
| `type:icon` | Character icons (uploaded or Studio-created) |
| `type:token-background` | Background for individual tokens |
| `type:script-background` | Background for script/PDF exports |
| `type:setup` | Setup symbols (+1, -1, etc.) |
| `type:accent` | Decorative accents (leaves, flourishes) |
| `type:logo` | Script logos |

### Team Tags (7 total)

| Tag |
|-----|
| `team:townsfolk` |
| `team:outsider` |
| `team:minion` |
| `team:demon` |
| `team:traveller` |
| `team:fabled` |
| `team:loric` |

### Tag Utilities

```typescript
// src/ts/services/upload/tagUtils.ts

export const isSystemTag = (tag: string): boolean =>
  tag.startsWith('type:') || tag.startsWith('team:');

export const isTypeTag = (tag: string): boolean =>
  tag.startsWith('type:');

export const isTeamTag = (tag: string): boolean =>
  tag.startsWith('team:');

export const getTypeFromTags = (tags: string[]): string | null =>
  tags.find(isTypeTag)?.replace('type:', '') ?? null;

export const getTeamsFromTags = (tags: string[]): string[] =>
  tags.filter(isTeamTag).map(t => t.replace('team:', ''));

export const isStarred = (tags: string[]): boolean =>
  tags.includes('starred');

export const getUserTags = (tags: string[]): string[] =>
  tags.filter(t => !isSystemTag(t) && t !== 'starred');

export const toggleTag = (tags: string[], tag: string): string[] =>
  tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag];
```

---

## Folder System

### Data Model

```typescript
// Stored on each asset
folder: string | null;  // null = root

// Examples:
null                        // Root level
"Characters"                // Top-level folder
"Characters/Townsfolk"      // Nested folder
"Backgrounds/Evil/Homebrew" // Deeply nested (no limit)
```

### Folder Utilities

```typescript
// src/ts/services/upload/folderUtils.ts

export interface FolderNode {
  name: string;
  path: string;
  children: FolderNode[];
  assetCount: number;
}

export function deriveFolderTree(assets: DBAsset[]): FolderNode[];
export function getAssetsInFolder(assets: DBAsset[], folder: string | null, includeSubfolders?: boolean): DBAsset[];
export function moveToFolder(assetIds: string[], targetFolder: string | null): Promise<void>;
export function renameFolder(oldPath: string, newPath: string): Promise<void>;
export function deleteFolder(path: string, moveContentsTo: string | null): Promise<void>;
export function validateFolderPath(path: string): { valid: boolean; error?: string };
```

### Path Validation

- No depth limit (infinite nesting allowed)
- Valid characters: alphanumeric, spaces, hyphens, underscores
- No leading/trailing slashes
- No empty segments
- No duplicate consecutive slashes

---

## UI Layout

### Three-Column Modal (900px × 600px)

```
┌──────────┬─────────────────────────────────────────────┬─────────────┐
│ FOLDERS  │ [🔍 Search________] [+ Upload] [⋮]          │  PREVIEW    │
│ ───────  │ ───────────────────────────────────────────  │  ────────   │
│ 📁 All   │ [★ Starred] [🕐 Recent] [type ▼] [+ Tag]   │ ┌─────────┐ │
│ 📁 Icons │ ───────────────────────────────────────────  │ │         │ │
│ 📁 BGs   │ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐  │ │  Token  │ │
│  └ Town  │ │img │ │img │ │img │ │img │ │img │ │img │  │ │ Preview │ │
│  └ Evil  │ │ ★  │ │    │ │ ★  │ │    │ │    │ │    │  │ │         │ │
│ 📁 Accent│ │nam │ │nam │ │nam │ │nam │ │nam │ │nam │  │ └─────────┘ │
│ + New    │ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘  │             │
│          │ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐  │ forest.png  │
│ ───────  │ │    │ │    │ │    │ │    │ │    │ │    │  │ 256×256     │
│ TYPE     │ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘  │ type:icon   │
│ ───────  │              (virtualized grid)            │ homebrew    │
│ ● icon   │ ───────────────────────────────────────────  │             │
│ ○ bg     │ 3 selected: [+ Tag] [− Tag] [★] [📁] [🗑]  │ [✓ Apply]   │
│ ○ setup  │                                             │ [✗ None]    │
├──────────┤                                             │             │
│ TEAM     │                                             │             │
│ ───────  │                                             │             │
│ ○ towns  │                                             │             │
│ ○ minion │                                             │             │
├──────────┤                                             │             │
│ TAGS     │                                             │             │
│ ───────  │                                             │             │
│ ○ starred│                                             │             │
│ ○ homebrew                                             │             │
└──────────┴─────────────────────────────────────────────┴─────────────┘
```

### Column Widths

| Column | Width | Contents |
|--------|-------|----------|
| Left sidebar | 120px fixed | Folders + Type + Team + Tags filters |
| Center grid | flex-1 | Virtualized asset grid |
| Right preview | 160px fixed | Live token preview + metadata + apply |

### Responsive Breakpoints

| Width | Behavior |
|-------|----------|
| ≥900px | All three columns |
| 600-899px | Hide left sidebar (toggle button), two columns |
| <600px | Preview below grid, single column |

### Spacing (Compact)

| Element | Size |
|---------|------|
| Modal padding | 8px |
| Thumbnails | 64×64px |
| Grid gap | 4px |
| Sidebar section gap | 12px |
| Batch bar height | 40px |

---

## Virtual Scrolling

### Implementation

```typescript
// src/hooks/assets/useVirtualAssetGrid.ts
import { useVirtualizer } from '@tanstack/react-virtual';

const THUMBNAIL_SIZE = 64;
const GAP = 4;
const NAME_HEIGHT = 16;
const ITEM_SIZE = THUMBNAIL_SIZE + GAP + NAME_HEIGHT;

export function useVirtualAssetGrid(
  assets: AssetWithUrl[],
  containerRef: RefObject<HTMLDivElement>
) {
  const columnCount = useMemo(() => {
    const width = containerRef.current?.clientWidth ?? 400;
    return Math.floor(width / ITEM_SIZE);
  }, [containerRef.current?.clientWidth]);

  const rowCount = Math.ceil(assets.length / columnCount);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => containerRef.current,
    estimateSize: () => ITEM_SIZE,
    overscan: 3,
  });

  return { virtualizer, columnCount, rowCount };
}
```

### Performance

| Assets | DOM Nodes (Current) | DOM Nodes (Virtual) |
|--------|---------------------|---------------------|
| 50 | 50 | ~21 |
| 200 | 200 | ~21 |
| 1000 | 1000 | ~21 |

---

## Inline Rename

### Component

```typescript
// src/components/Shared/UI/InlineEditableText.tsx

interface InlineEditableTextProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  validate?: (value: string) => string | null;
  className?: string;
}
```

### UX Flow

1. **Normal state:** Text with ellipsis overflow
2. **Double-click:** Enter edit mode, text selected
3. **Edit:** Type new name
4. **Enter/blur:** Save and exit
5. **Escape:** Cancel and revert
6. **Error:** Show inline error, stay in edit mode

### Keyboard

| Key | Action |
|-----|--------|
| `Enter` | Save and exit |
| `Escape` | Cancel and revert |
| `Tab` | Save and move to next (optional) |

---

## Batch Tag Editor

### When Selection > 0

```
┌─────────────────────────────────────────────────────────────────┐
│ 5 selected                                                      │
│ Common: type:icon, homebrew                                     │
│ Partial: starred (3/5), team:townsfolk (2/5)                   │
│ [+ Add tag ▼] [− Remove tag ▼] [★ Star all] [📁 Move] [🗑 Del] │
└─────────────────────────────────────────────────────────────────┘
```

### Tag Analysis

```typescript
// src/ts/services/upload/batchTagUtils.ts

interface TagAnalysis {
  common: string[];              // Present in ALL selected
  partial: Map<string, number>;  // Tag → count (present in some)
  all: string[];                 // Union of all tags
}

function analyzeSelectionTags(assets: DBAsset[]): TagAnalysis;
function addTagToAssets(assetIds: string[], tag: string): Promise<void>;
function removeTagFromAssets(assetIds: string[], tag: string): Promise<void>;
```

---

## Recently Used & Starred

### Recently Used

Uses existing `lastUsedAt` field - no schema change.

```typescript
const RECENT_LIMIT = 20;

function getRecentAssets(assets: DBAsset[]): DBAsset[] {
  return [...assets]
    .filter(a => a.lastUsedAt != null)
    .sort((a, b) => (b.lastUsedAt ?? 0) - (a.lastUsedAt ?? 0))
    .slice(0, RECENT_LIMIT);
}
```

### Starred

Just the `starred` tag - uses tag system.

```typescript
const toggleStar = async (assetId: string) => {
  const asset = await assetStorageService.getById(assetId);
  const newTags = asset.tags.includes('starred')
    ? asset.tags.filter(t => t !== 'starred')
    : [...asset.tags, 'starred'];
  await assetStorageService.update(assetId, { tags: newTags });
};
```

---

## New Files

### Utilities

| File | Purpose |
|------|---------|
| `src/ts/services/upload/tagUtils.ts` | Tag helpers |
| `src/ts/services/upload/folderUtils.ts` | Folder tree derivation |
| `src/ts/services/upload/batchTagUtils.ts` | Batch tag analysis |

### Hooks

| File | Purpose |
|------|---------|
| `src/hooks/assets/useVirtualAssetGrid.ts` | Virtual scrolling |
| `src/hooks/assets/useAssetFolders.ts` | Folder state management |
| `src/hooks/assets/useAssetTags.ts` | Tag filtering and management |
| `src/hooks/assets/useBatchTagEditor.ts` | Multi-select tag operations |

### Components

| File | Purpose |
|------|---------|
| `src/components/Shared/UI/InlineEditableText.tsx` | Double-click rename |
| `src/components/Shared/Assets/VirtualAssetGrid.tsx` | Virtualized grid |
| `src/components/Shared/Assets/FolderTree.tsx` | Sidebar folder nav |
| `src/components/Shared/Assets/TagFilterList.tsx` | Sidebar tag filters |
| `src/components/Shared/Assets/BatchTagBar.tsx` | Multi-select toolbar |
| `src/components/Shared/Assets/QuickFilterPills.tsx` | Starred/Recent/Type pills |

---

## Dependencies

| Package | Version | Size | Purpose |
|---------|---------|------|---------|
| `@tanstack/react-virtual` | ^3.x | ~3KB | Virtual scrolling |

---

## Migration Strategy

1. **Schema migration** - Dexie v8 handles automatically on app load
2. **Type → Tag mapping** - All existing assets get appropriate `type:*` tag
3. **Folder = null** - All existing assets start at root
4. **No data loss** - Migration is additive, removes only `type` field

---

## Breaking Changes

### Removed Types

```typescript
// REMOVED
type AssetType = 'character-icon' | 'token-background' | ...;

// Services that accepted AssetType now accept tags
interface UploadConfig {
  // OLD: assetType: AssetType;
  // NEW:
  tags: string[];  // Must include one type:* tag
}
```

### Updated Interfaces

- `DBAsset` - removed `type`, added `tags`, `folder`
- `AssetFilter` - `type` filter becomes `tags` filter
- `UploadConfig` - `assetType` becomes `tags`
- `AssetTypeConfig` - keyed by type tag value, not AssetType

---

## Testing Requirements

1. **Schema migration** - Verify v7 → v8 migration preserves all assets
2. **Tag utilities** - Unit tests for all tag helpers
3. **Folder utilities** - Unit tests for path validation, tree derivation
4. **Virtual scrolling** - Performance test with 1000+ assets
5. **Inline rename** - E2E test for double-click → edit → save flow
6. **Batch operations** - Test multi-select tag add/remove

---

*Document created: 2026-01-04*
