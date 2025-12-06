# Project Management System - Implementation Plan

> **Blood on the Clocktower Token Generator**
> **Feature:** Local Project Management with Import/Export
> **Version:** 1.0.0
> **Last Updated:** 2024-12-05

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Key Architectural Decisions](#key-architectural-decisions)
3. [Feature Requirements](#feature-requirements)
4. [Data Architecture](#data-architecture)
5. [File Format Specification](#file-format-specification)
6. [Service Layer Architecture](#service-layer-architecture)
7. [UI/UX Design](#uiux-design)
8. [Implementation Roadmap](#implementation-roadmap)
9. [Dependencies](#dependencies)
10. [Migration Strategy](#migration-strategy)

---

## Executive Summary

This document outlines the implementation plan for a **local-first project management system** that enables users to:

- Save their token generation work as discrete projects
- Switch between multiple projects seamlessly
- Share projects with others via ZIP files
- Include custom character icons in shared projects
- Auto-save work with visual feedback
- Prepare for future cloud synchronization

### Core Principles

1. **Local-First**: All data stored in IndexedDB for offline capability
2. **Universal Format**: ZIP files (`.zip`) for maximum compatibility
3. **User Control**: Selective import with conflict resolution
4. **Future-Ready**: Architecture supports cloud sync when needed
5. **Zero Lock-In**: Users can inspect and extract project files

---

## Key Architectural Decisions

### 1. File Format: ZIP-Only (`.zip`)

**Decision:** Use standard `.zip` format exclusively for all project exports.

**Rationale:**
- ✅ Universal compatibility (all platforms recognize `.zip`)
- ✅ Never filtered by email/chat/file-sharing systems
- ✅ Users can unzip and inspect contents
- ✅ Efficient compression (30-40% size reduction)
- ✅ Supports custom character icons without base64 overhead
- ✅ Extensible for future assets (backgrounds, fonts, etc.)

**Rejected Alternatives:**
- ❌ `.botc` custom extension (branding not worth compatibility issues)
- ❌ `.botc.json` hybrid (added complexity for minimal benefit)
- ❌ Pure JSON (impractical with custom icons)

### 2. Custom Character Icons Support

**Decision:** Include custom character icons as separate image files in ZIP package.

**Impact:**
- Projects can include user-uploaded character artwork
- Icons stored as WebP/PNG files in `icons/` folder
- No base64 encoding (smaller file size, better performance)
- Icons tracked per-character in project metadata

### 3. Thumbnail Selection

**Decision:** Offer 4 thumbnail options with user selection UI.

**Options:**
1. **Auto** - First character token (default)
2. **Token** - User selects specific token
3. **Script Logo** - Use script's logo image
4. **Custom** - User uploads custom thumbnail

### 4. Storage: IndexedDB with Dexie.js

**Decision:** Use Dexie.js wrapper for IndexedDB storage.

**Rationale:**
- Better API than raw IndexedDB
- Promise-based (async/await friendly)
- Excellent TypeScript support
- Built-in versioning and migrations
- Query performance optimizations

### 5. Auto-Save Strategy

**Decision:** Debounced auto-save with 2-second delay.

**Behavior:**
- Saves 2 seconds after last change
- Visual indicator shows save status
- Keeps last 10 auto-save snapshots per project
- Warning on navigation with unsaved changes

### 6. State Management: Context API

**Decision:** Use React Context (not Redux/Zustand) for project state.

**Rationale:**
- Consistent with existing codebase patterns
- Sufficient for project management scope
- Lower learning curve
- Integrates cleanly with existing TokenContext

---

## Feature Requirements

### Must-Have (v1.0)

- ✅ Create new projects from current session
- ✅ Save/load projects to/from IndexedDB
- ✅ Switch between projects with unsaved changes warning
- ✅ Export projects as `.zip` files
- ✅ Import projects from `.zip` files
- ✅ Include custom character icons in exports
- ✅ Auto-save with debouncing
- ✅ Project list view (grid/list modes)
- ✅ Search and filter projects
- ✅ Delete projects with confirmation
- ✅ Edit project metadata (name, description, tags)
- ✅ Thumbnail selection (4 options)

### Nice-to-Have (v1.1)

- ⏳ Selective import (choose what to import)
- ⏳ Duplicate project
- ⏳ Project templates
- ⏳ Bulk export (multiple projects)
- ⏳ Project statistics dashboard
- ⏳ Keyboard shortcuts

### Future (v2.0)

- 🔮 Cloud synchronization
- 🔮 Conflict resolution for cloud sync
- 🔮 Multi-device support
- 🔮 Project sharing links
- 🔮 Collaborative editing
- 🔮 Version history

---

## Data Architecture

### Project Entity

```typescript
// src/ts/types/project.ts

export interface Project {
  // Identifiers
  id: string                              // UUID v4
  name: string                            // User-friendly name
  description?: string                    // Optional description

  // Timestamps
  createdAt: number                       // Unix timestamp (ms)
  lastModifiedAt: number                  // Unix timestamp (ms)
  lastAccessedAt: number                  // Unix timestamp (ms)

  // Visual metadata
  thumbnail: ProjectThumbnail             // Thumbnail configuration
  tags?: string[]                         // User-defined tags
  color?: string                          // Hex color for card badge

  // Application state snapshot
  state: ProjectState                     // Complete app state

  // Statistics
  stats: ProjectStats                     // Computed statistics

  // Versioning
  schemaVersion: number                   // For migrations (current: 1)

  // Cloud sync (future)
  cloudSync?: CloudSyncMetadata           // Reserved for v2.0
}
```

### Project State

```typescript
export interface ProjectState {
  // Script data
  jsonInput: string                       // Raw JSON input
  characters: Character[]                 // Parsed characters
  scriptMeta: ScriptMeta | null          // Script metadata (_meta)

  // Character metadata (decorative overrides, etc.)
  characterMetadata: Record<string, CharacterMetadata>

  // Generation options
  generationOptions: GenerationOptions    // Token generation settings

  // Custom character icons
  customIcons: CustomIconMetadata[]       // User-uploaded icons

  // Filter state (optional - can reset to defaults)
  filters?: {
    teams: string[]
    tokenTypes: string[]
    display: string[]
    reminders: string[]
  }

  // Schema version
  schemaVersion: number                   // Current: 1
}
```

### Custom Icon Metadata

```typescript
export interface CustomIconMetadata {
  characterId: string                     // Character UUID
  characterName: string                   // For display
  filename: string                        // Filename in ZIP (e.g., "imp.webp")
  source: 'uploaded' | 'url' | 'official-override'

  // Storage
  dataUrl?: string                        // Base64 for in-memory (not exported)
  storedInIndexedDB: boolean             // Whether icon is in DB

  // Metadata
  fileSize?: number                       // Bytes
  mimeType?: string                       // 'image/webp', 'image/png', etc.
  lastModified?: number                   // Timestamp
}
```

### Thumbnail Configuration

```typescript
export interface ProjectThumbnail {
  type: 'auto' | 'token' | 'script-logo' | 'custom'

  // Auto-generated from first token
  auto?: {
    dataUrl: string                       // Base64 data URL
    generatedAt: number                   // Timestamp
  }

  // User-selected token thumbnail
  token?: {
    characterId: string
    characterName: string
    tokenType: 'character' | 'reminder'
    dataUrl: string
  }

  // Script logo as thumbnail
  scriptLogo?: {
    logoUrl: string                       // Original URL
    scriptName: string
    dataUrl: string                       // Cached/resized version
  }

  // Custom uploaded image
  custom?: {
    filename: string
    dataUrl: string
    uploadedAt: number
  }
}
```

### Project Statistics

```typescript
export interface ProjectStats {
  characterCount: number
  tokenCount: number                      // Generated tokens
  reminderCount: number
  customIconCount: number
  presetCount: number
  lastGeneratedAt?: number                // Last token generation
}
```

---

## File Format Specification

### ZIP Package Structure

```
project_name_1733404800000.zip
│
├── manifest.json                 # Package metadata
├── project.json                  # Project data (no embedded images)
├── thumbnail.png                 # Project thumbnail (320x180 JPEG)
│
├── icons/                        # Custom character icons
│   ├── imp.webp
│   ├── baron.webp
│   ├── scarlet_woman.webp
│   └── ...
│
└── (future)
    ├── backgrounds/              # Custom backgrounds
    ├── fonts/                    # Custom fonts
    └── presets/                  # Preset configurations
```

### manifest.json

```json
{
  "format": "blood-on-the-clocktower-project-package",
  "formatVersion": "1.0.0",
  "generator": "BotC Token Generator",
  "generatorVersion": "0.2.0",
  "generatorUrl": "https://your-app-url.com",
  "exportedAt": "2024-12-05T10:30:00.000Z",

  "files": {
    "projectData": "project.json",
    "thumbnail": "thumbnail.png",
    "customIcons": [
      "icons/imp.webp",
      "icons/baron.webp",
      "icons/scarlet_woman.webp"
    ]
  },

  "stats": {
    "totalSizeBytes": 1245678,
    "uncompressedBytes": 2456789,
    "compressionRatio": 0.51,
    "iconCount": 3,
    "characterCount": 15
  },

  "compatibility": {
    "minGeneratorVersion": "0.2.0",
    "schemaVersion": 1
  }
}
```

### project.json

```json
{
  "id": "uuid-v4-here",
  "name": "Trouble Brewing Enhanced",
  "description": "Custom TB script with hand-drawn character icons",

  "createdAt": 1733404800000,
  "lastModifiedAt": 1733404800000,
  "lastAccessedAt": 1733404800000,

  "schemaVersion": 1,

  "state": {
    "jsonInput": "[{\"id\":\"washerwoman\", ...}]",

    "characters": [
      {
        "id": "washerwoman",
        "name": "Washerwoman",
        "team": "townsfolk",
        "ability": "You start knowing that 1 of 2 players is a particular Townsfolk.",
        "image": "https://wiki.bloodontheclocktower.com/images/washerwoman.png",
        "reminders": ["Townsfolk", "Wrong"]
      }
      // ... more characters
    ],

    "scriptMeta": {
      "id": "_meta",
      "name": "Trouble Brewing Enhanced",
      "author": "John Doe",
      "logo": "https://example.com/logo.png"
    },

    "characterMetadata": {
      "imp": {
        "idLinkedToName": true,
        "customIcon": {
          "enabled": true,
          "filename": "icons/imp.webp"
        }
      }
    },

    "generationOptions": {
      "displayAbilityText": false,
      "tokenCount": true,
      "setupFlowerStyle": "setup_flower_1",
      "characterBackground": "character_background_1"
      // ... all generation options
    },

    "customIcons": [
      {
        "characterId": "imp",
        "characterName": "Imp",
        "filename": "imp.webp",
        "source": "uploaded",
        "fileSize": 45678,
        "mimeType": "image/webp"
      },
      {
        "characterId": "baron",
        "characterName": "Baron",
        "filename": "baron.webp",
        "source": "uploaded",
        "fileSize": 52341,
        "mimeType": "image/webp"
      }
    ],

    "schemaVersion": 1
  },

  "thumbnail": {
    "type": "token",
    "token": {
      "characterId": "imp",
      "characterName": "Imp",
      "tokenType": "character"
    }
  },

  "tags": ["trouble-brewing", "custom-art", "hand-drawn"],
  "color": "#8b0000",

  "stats": {
    "characterCount": 15,
    "tokenCount": 68,
    "reminderCount": 42,
    "customIconCount": 3,
    "presetCount": 0,
    "lastGeneratedAt": 1733404800000
  }
}
```

### File Naming Convention

```
Format: {project_name}_{timestamp}.zip

Examples:
- Trouble_Brewing_1733404800000.zip
- My_Custom_Script_1733404800000.zip
- Sects_and_Violets_Enhanced_1733404800000.zip

Rules:
- Replace spaces with underscores
- Remove special characters (keep alphanumeric, _, -)
- Include Unix timestamp for uniqueness
- All lowercase for consistency
```

---

## Service Layer Architecture

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    React Components                      │
│  ProjectsView, ProjectCard, ProjectSwitcher, Modals      │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────┐
│                    Custom Hooks                          │
│  useProjects, useProjectAutoSave, useProjectImport       │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────┐
│                  ProjectContext                          │
│         Global state management for projects             │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────┐
│                  Service Layer                           │
│  ProjectService, ProjectExporter, ProjectImporter        │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────┐
│                  Storage Layer                           │
│      ProjectDatabase (Dexie.js wrapper)                  │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────┴────────────────────────────────────┐
│                    IndexedDB                             │
│     Browser storage (projects, icons, snapshots)         │
└──────────────────────────────────────────────────────────┘
```

### Service Interfaces

```typescript
// src/ts/services/project/IProjectService.ts

export interface IProjectService {
  // CRUD operations
  createProject(name: string, options?: CreateProjectOptions): Promise<Project>
  getProject(id: string): Promise<Project | null>
  updateProject(id: string, updates: Partial<Project>): Promise<Project>
  deleteProject(id: string): Promise<void>
  listProjects(options?: ListProjectsOptions): Promise<Project[]>

  // Project switching
  switchToProject(projectId: string): Promise<void>
  getCurrentProject(): Project | null

  // Import/Export
  exportProject(projectId: string, options?: ExportOptions): Promise<Blob>
  importProject(file: File): Promise<Project>

  // Auto-save
  saveCurrentState(): Promise<void>
  getAutoSaveStatus(): AutoSaveStatus
}

export interface IProjectExporter {
  exportAsZip(project: Project, options: ExportOptions): Promise<Blob>
}

export interface IProjectImporter {
  importFromZip(file: File): Promise<Project>
  validateZip(file: File): Promise<ValidationResult>
  previewZip(file: File): Promise<ProjectPreview>
}

export interface IProjectDatabase {
  // Projects
  saveProject(project: Project): Promise<void>
  loadProject(id: string): Promise<Project | null>
  deleteProject(id: string): Promise<void>
  listProjects(): Promise<Project[]>

  // Custom icons
  saveIcon(characterId: string, icon: CustomIcon): Promise<void>
  loadIcon(characterId: string): Promise<CustomIcon | null>
  deleteIcon(characterId: string): Promise<void>

  // Auto-save snapshots
  saveSnapshot(projectId: string, snapshot: AutoSaveSnapshot): Promise<void>
  loadSnapshots(projectId: string, limit?: number): Promise<AutoSaveSnapshot[]>
  deleteOldSnapshots(projectId: string, keepCount: number): Promise<void>

  // Utilities
  getStorageQuota(): Promise<StorageQuota>
  clearAll(): Promise<void>
}
```

### IndexedDB Schema (Dexie.js)

```typescript
// src/ts/db/projectDb.ts

import Dexie, { Table } from 'dexie'

export interface DBProject {
  id: string
  name: string
  description?: string
  createdAt: number
  lastModifiedAt: number
  lastAccessedAt: number
  thumbnail: string                       // Stored as data URL
  tags: string[]
  color?: string
  state: string                           // JSON.stringify(ProjectState)
  stats: ProjectStats
  schemaVersion: number
}

export interface DBCustomIcon {
  characterId: string                     // Primary key
  projectId: string                       // Which project owns this
  characterName: string
  filename: string
  dataUrl: string                         // Base64 data URL
  mimeType: string
  fileSize: number
  uploadedAt: number
}

export interface DBAutoSaveSnapshot {
  id: string                              // Primary key (UUID)
  projectId: string                       // Which project
  timestamp: number
  stateSnapshot: string                   // JSON.stringify(ProjectState)
}

export class ProjectDatabase extends Dexie {
  projects!: Table<DBProject, string>
  customIcons!: Table<DBCustomIcon, string>
  autoSaveSnapshots!: Table<DBAutoSaveSnapshot, string>

  constructor() {
    super('botc-token-generator-projects')

    this.version(1).stores({
      projects: 'id, name, lastModifiedAt, lastAccessedAt, *tags',
      customIcons: 'characterId, projectId',
      autoSaveSnapshots: 'id, projectId, timestamp'
    })
  }

  async getStorageQuota(): Promise<StorageQuota> {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate()
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
        usageMB: (estimate.usage || 0) / (1024 * 1024),
        quotaMB: (estimate.quota || 0) / (1024 * 1024),
        percentUsed: estimate.quota ? (estimate.usage || 0) / estimate.quota * 100 : 0
      }
    }
    return { usage: 0, quota: 0, usageMB: 0, quotaMB: 0, percentUsed: 0 }
  }
}

export const projectDb = new ProjectDatabase()
```

---

## UI/UX Design

### Component Structure

```
src/components/
├── Projects/                     # NEW
│   ├── ProjectsView.tsx          # Main projects tab
│   ├── ProjectCard.tsx           # Individual project card
│   ├── ProjectGrid.tsx           # Grid layout
│   ├── ProjectList.tsx           # List layout
│   ├── ProjectSwitcher.tsx       # Header dropdown
│   ├── ProjectSearch.tsx         # Search/filter bar
│   ├── ThumbnailSelector.tsx     # Thumbnail selection UI
│   └── EmptyState.tsx            # Empty state illustration
│
├── Modals/                       # UPDATED
│   ├── CreateProjectModal.tsx    # NEW
│   ├── EditProjectModal.tsx      # NEW
│   ├── DeleteProjectModal.tsx    # NEW
│   ├── ImportProjectModal.tsx    # NEW
│   ├── ExportProjectModal.tsx    # NEW
│   └── UnsavedChangesModal.tsx   # NEW
│
└── Shared/                       # UPDATED
    ├── AutoSaveIndicator.tsx     # NEW
    ├── IconUploader.tsx          # NEW
    └── StorageQuotaBar.tsx       # NEW
```

### Key User Flows

#### 1. Creating First Project

```
User Flow:
1. User loads characters and generates tokens
2. Clicks "Save as Project" button
3. Modal opens with:
   - Auto-filled name: "Trouble Brewing Project"
   - Optional description field
   - Thumbnail selector (defaulted to "Auto")
   - Tags input (optional)
4. User clicks "Create Project"
5. System:
   - Generates UUID
   - Captures current state from TokenContext
   - Generates thumbnail from first token
   - Saves to IndexedDB
   - Shows success toast: "Project saved!"
   - Enables auto-save indicator
```

#### 2. Switching Projects

```
User Flow:
1. User clicks project switcher in header
2. Dropdown shows recent projects
3. User clicks different project
4. If current project has unsaved changes:
   - Modal: "Save changes to [project name]?"
   - Options: [Save & Switch] [Discard] [Cancel]
5. System loads new project:
   - Fetches from IndexedDB
   - Updates TokenContext with new state
   - Updates currentProject in ProjectContext
   - Updates UI indicators
6. User sees new project loaded
```

#### 3. Exporting Project

```
User Flow:
1. User clicks "Export" on project card (or in header)
2. Export modal opens:
   - Format: ZIP (always)
   - Options:
     ☑ Include custom icons (3)
     ☑ Include thumbnail
     ☐ Compress images
   - Estimated size: 1.2 MB
3. User clicks "Export"
4. System:
   - Creates ZIP package
   - Adds project.json
   - Adds manifest.json
   - Adds icons/ folder with images
   - Adds thumbnail.png
   - Compresses ZIP
5. Browser downloads: Trouble_Brewing_1733404800000.zip
6. Success toast: "Project exported!"
```

#### 4. Importing Shared Project

```
User Flow:
1. User drags ZIP file onto import zone (or clicks "Import")
2. System validates ZIP:
   - Checks for manifest.json
   - Checks for project.json
   - Validates format version
3. Preview modal shows:
   - Project name
   - Description
   - Character count: 15
   - Custom icons: 3 (shows thumbnails)
   - File size: 1.2 MB
4. User clicks "Import"
5. System:
   - Extracts ZIP contents
   - Loads project.json
   - Loads custom icons from icons/ folder
   - Saves to IndexedDB
   - Generates new UUID
6. Success toast: "Project imported!"
7. User sees new project in list
```

### Accessibility Requirements

- ✅ All interactive elements keyboard-navigable
- ✅ Focus visible with 2px outline
- ✅ ARIA labels for all buttons/inputs
- ✅ Screen reader announcements for status changes
- ✅ Color contrast ratio ≥ 4.5:1
- ✅ Don't rely on color alone for information
- ✅ Skip links for keyboard navigation
- ✅ Modal focus trapping
- ✅ Escape key closes modals

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)

**Goal:** Core data layer and basic CRUD

**Tasks:**
1. Create TypeScript type definitions
   - `src/ts/types/project.ts`
   - All interfaces documented above

2. Set up IndexedDB with Dexie.js
   - Install dependencies: `npm install dexie`
   - Create `src/ts/db/projectDb.ts`
   - Define schema with 3 tables

3. Implement ProjectDatabase service
   - CRUD operations for projects
   - Custom icon storage
   - Auto-save snapshot management

4. Create ProjectContext
   - Basic state management
   - Integration with TokenContext
   - Current project tracking

**Deliverables:**
- ✅ Type definitions complete
- ✅ Database layer functional
- ✅ Can create and load projects
- ✅ ProjectContext provides project state

---

### Phase 2: Export/Import (Week 2)

**Goal:** ZIP-based project sharing

**Tasks:**
1. Install ZIP library
   - `npm install jszip file-saver`
   - `npm install -D @types/jszip`

2. Implement ProjectExporter
   - Create ZIP package
   - Add project.json
   - Add manifest.json
   - Add custom icons to icons/ folder
   - Add thumbnail
   - Compression

3. Implement ProjectImporter
   - Validate ZIP structure
   - Extract project.json
   - Load custom icons
   - Save to IndexedDB

4. Create export/import UI
   - ExportProjectModal component
   - ImportProjectModal component
   - Drag-and-drop import zone
   - Progress indicators

**Deliverables:**
- ✅ Can export projects as ZIP
- ✅ Can import ZIP files
- ✅ Custom icons preserved in export/import
- ✅ Validation prevents corrupted imports

---

### Phase 3: Auto-Save System (Week 3)

**Goal:** Automatic state persistence

**Tasks:**
1. Implement auto-save hook
   - `src/hooks/useProjectAutoSave.ts`
   - 2-second debounce
   - State change detection
   - Error handling

2. Create AutoSaveIndicator component
   - Status display (saving/saved/error)
   - Last saved timestamp
   - Manual save button
   - Error recovery

3. Implement snapshot system
   - Save snapshots on auto-save
   - Keep last 10 snapshots per project
   - Cleanup old snapshots
   - Snapshot restoration (undo feature - future)

4. Unsaved changes detection
   - Track dirty state
   - Warning on navigation
   - Warning on project switch
   - UnsavedChangesModal component

**Deliverables:**
- ✅ Auto-save works reliably
- ✅ Visual feedback for save status
- ✅ Unsaved changes warnings
- ✅ Snapshot history maintained

---

### Phase 4: Project Management UI (Week 4)

**Goal:** Complete project CRUD interface

**Tasks:**
1. Create ProjectsView component
   - New tab in main navigation
   - Grid/List view toggle
   - Search and filter
   - Sort options
   - Empty state

2. Create ProjectCard component
   - Thumbnail display
   - Metadata (name, description, stats)
   - Action buttons (edit, delete, export)
   - Grid and list layouts
   - Hover states

3. Create ProjectSwitcher component
   - Dropdown in header
   - Recent projects list
   - Create new project button
   - Current project indicator

4. Create CRUD modals
   - CreateProjectModal
   - EditProjectModal
   - DeleteProjectModal (with confirmation)

**Deliverables:**
- ✅ Dedicated Projects tab
- ✅ Can view all projects
- ✅ Search and filter works
- ✅ Quick project switcher in header
- ✅ Full CRUD operations

---

### Phase 5: Custom Icons & Thumbnails (Week 5)

**Goal:** Visual customization features

**Tasks:**
1. Create IconUploader component
   - Drag-and-drop file upload
   - Image preview
   - Crop/resize functionality (optional)
   - Format validation (PNG, JPG, WebP)

2. Implement icon management
   - Upload custom character icons
   - Store in IndexedDB
   - Display in token generation
   - Remove/replace icons

3. Create ThumbnailSelector component
   - 4 thumbnail types
   - Preview for each type
   - Token selection grid
   - Custom image upload

4. Integrate with export/import
   - Include icons in ZIP exports
   - Load icons from ZIP imports
   - Icon conflict resolution

**Deliverables:**
- ✅ Users can upload custom character icons
- ✅ Icons included in project exports
- ✅ Thumbnail selection fully functional
- ✅ Icon management UI complete

---

### Phase 6: Polish & Testing (Week 6)

**Goal:** Production-ready quality

**Tasks:**
1. Performance optimization
   - Lazy load project thumbnails
   - Virtual scrolling for large lists
   - Debounce search input
   - Memoize expensive computations

2. Error handling
   - Graceful fallbacks
   - User-friendly error messages
   - Recovery mechanisms
   - Validation everywhere

3. Accessibility audit
   - Keyboard navigation testing
   - Screen reader testing
   - Color contrast verification
   - ARIA labels complete

4. Testing
   - Unit tests for services
   - Integration tests for flows
   - E2E tests for critical paths
   - Manual QA pass

**Deliverables:**
- ✅ No performance issues with 100+ projects
- ✅ Error handling comprehensive
- ✅ WCAG AA compliance verified
- ✅ Test coverage > 80%

---

### Phase 7: Migration & Documentation (Week 7)

**Goal:** Smooth transition for existing users

**Tasks:**
1. Implement localStorage migration
   - Detect existing data
   - Prompt user for migration
   - Create "Migrated Project" from current state
   - Preserve custom presets

2. Create user documentation
   - Feature overview
   - Import/export guide
   - Troubleshooting guide
   - FAQ

3. Create developer documentation
   - Architecture overview
   - API documentation
   - Extension guide (for future features)

4. Deployment preparation
   - Feature flags (gradual rollout)
   - Analytics tracking
   - Error monitoring setup

**Deliverables:**
- ✅ Existing users migrated seamlessly
- ✅ Documentation complete
- ✅ Ready for production deployment

---

## Dependencies

### New Dependencies

```json
{
  "dependencies": {
    "dexie": "^3.2.4",
    "jszip": "^3.10.1",
    "file-saver": "^2.0.5"
  },
  "devDependencies": {
    "@types/file-saver": "^2.0.7"
  }
}
```

### Dependency Rationale

**Dexie.js** (`dexie`)
- Wrapper for IndexedDB
- Promise-based API
- Excellent TypeScript support
- Built-in migration system
- ~14KB gzipped

**JSZip** (`jszip`)
- Create and read ZIP files in browser
- Standard library for ZIP manipulation
- Good browser compatibility
- ~33KB gzipped

**FileSaver.js** (`file-saver`)
- Cross-browser file download
- Handles large files efficiently
- ~2KB gzipped

---

## Migration Strategy

### From Current System to Projects

**Current State:**
- User presets stored in localStorage
- No project concept
- No saved character configurations
- No import/export capability

**Migration Plan:**

1. **Detection Phase**
   - On app startup, check for `localStorage` data
   - Check if migration flag exists
   - If data exists and not migrated → trigger migration

2. **Migration Flow**
   ```
   1. Show modal: "We've added Projects!"
   2. Explain new feature benefits
   3. Offer to create first project from current session
   4. User clicks "Create My First Project"
   5. System:
      - Captures current state
      - Creates project named "My First Project"
      - Migrates custom presets
      - Saves to IndexedDB
      - Sets migration flag
   6. Success message with tutorial prompt
   ```

3. **Backward Compatibility**
   - Keep localStorage for app settings (theme, etc.)
   - Projects stored separately in IndexedDB
   - If IndexedDB unavailable, graceful fallback to localStorage

4. **Migration Code**
   ```typescript
   // src/ts/migration/initialMigration.ts

   export async function needsMigration(): Promise<boolean> {
     const migrated = localStorage.getItem('botc_projects_migrated')
     const hasLegacyData = localStorage.getItem('customPresets')
     return !migrated && !!hasLegacyData
   }

   export async function performMigration(): Promise<void> {
     // 1. Load legacy presets
     const presetsJson = localStorage.getItem('customPresets')
     const presets = presetsJson ? JSON.parse(presetsJson) : []

     // 2. Capture current state
     const currentState = getCurrentAppState()

     // 3. Create default project
     const project = await createProject({
       name: 'My First Project',
       description: 'Migrated from previous version',
       state: currentState
     })

     // 4. Mark migration complete
     localStorage.setItem('botc_projects_migrated', 'true')

     // 5. Set as active project
     await setActiveProject(project.id)
   }
   ```

---

## Security Considerations

### Data Storage

- ✅ All data stored locally (IndexedDB)
- ✅ No sensitive data stored (no passwords, no tokens)
- ✅ User can clear all data via browser settings
- ✅ No third-party storage services

### File Imports

- ✅ Validate ZIP structure before processing
- ✅ Validate JSON schema
- ✅ Sanitize filenames
- ✅ Limit file size (warn at 10MB, block at 50MB)
- ✅ Validate image formats (prevent malicious files)
- ✅ No `eval()` or script execution from imports

### Content Security Policy

```html
<!-- Ensure CSP allows blob: and data: for images -->
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               img-src 'self' data: blob: https:;
               script-src 'self';">
```

---

## Performance Targets

### Loading Performance

- Project list initial load: **< 200ms** (100 projects)
- Project switch: **< 500ms** (includes state restoration)
- Export project: **< 2s** (50 characters + 10 icons)
- Import project: **< 3s** (50 characters + 10 icons)
- Auto-save operation: **< 200ms**

### Storage Estimates

- Small project (15 chars, no icons): ~30 KB
- Medium project (50 chars, 5 icons): ~700 KB
- Large project (100 chars, 20 icons): ~2.5 MB
- Typical user (10 projects): ~5-10 MB
- IndexedDB quota: Usually 50MB-10GB (varies by browser)

### Optimization Strategies

1. **Lazy Loading**: Load thumbnails progressively
2. **Virtual Scrolling**: For 100+ project lists
3. **Debouncing**: Search (300ms), auto-save (2s)
4. **Caching**: Keep active project in memory
5. **Compression**: ZIP compression ~30-40% reduction

---

## Testing Strategy

### Unit Tests

```typescript
// Example: ProjectService tests
describe('ProjectService', () => {
  it('should create project with valid data')
  it('should generate unique IDs')
  it('should save to database')
  it('should load from database')
  it('should update project metadata')
  it('should delete project and cleanup')
  it('should handle database errors gracefully')
})

// Example: ProjectExporter tests
describe('ProjectExporter', () => {
  it('should create valid ZIP structure')
  it('should include project.json')
  it('should include manifest.json')
  it('should include custom icons')
  it('should compress efficiently')
  it('should generate valid filenames')
})
```

### Integration Tests

- Create project → Save → Load → Verify state
- Export project → Import → Verify data integrity
- Switch projects → Verify state isolation
- Auto-save → Reload page → Verify persistence

### E2E Tests (Playwright)

```typescript
test('complete project workflow', async ({ page }) => {
  // 1. Create project
  await page.goto('/')
  await page.click('[data-testid="save-project-btn"]')
  await page.fill('[name="projectName"]', 'Test Project')
  await page.click('[data-testid="create-project-btn"]')

  // 2. Verify project created
  await expect(page.locator('.auto-save-indicator')).toContainText('Saved')

  // 3. Export project
  await page.click('[data-testid="export-project-btn"]')
  const downloadPromise = page.waitForEvent('download')
  await page.click('[data-testid="export-confirm-btn"]')
  const download = await downloadPromise

  // 4. Verify ZIP file downloaded
  expect(download.suggestedFilename()).toMatch(/Test_Project_\d+\.zip/)
})
```

---

## Future Enhancements (Post-v1.0)

### Cloud Synchronization (v2.0)

**Architecture:**
- Backend API (Node.js + PostgreSQL)
- JWT authentication
- WebSocket for real-time sync
- Conflict resolution UI
- Multi-device support

**Sync Strategy:**
- Offline-first (local changes always work)
- Background sync when online
- Last-write-wins with manual conflict resolution
- Sync only changed projects (not full sync)

### Version History (v2.1)

- Track changes over time
- Restore previous versions
- Compare versions (diff view)
- Branch/merge support

### Collaborative Editing (v3.0)

- Share project with others
- Real-time collaboration
- Per-character permissions
- Comment system

### Templates & Marketplace (v3.1)

- Official script templates
- Community-shared templates
- Rating and review system
- One-click import

---

## Glossary

**Project** - A saved collection of characters, settings, and generated tokens

**Custom Icon** - User-uploaded image to replace default character artwork

**Auto-Save** - Automatic persistence of changes without manual save action

**Snapshot** - Point-in-time backup of project state for recovery

**IndexedDB** - Browser database for local storage (larger capacity than localStorage)

**Dexie.js** - JavaScript library wrapper for IndexedDB

**JSZip** - JavaScript library for creating/reading ZIP files

**Manifest** - Metadata file describing contents of ZIP package

**Migration** - Process of converting old data format to new format

**Debouncing** - Delaying function execution until after a pause in calls

---

## Approval & Sign-Off

**Architecture Design:** ✅ Approved
**Data Model:** ✅ Approved
**File Format:** ✅ Approved (ZIP-only)
**UI/UX Mockups:** ⏳ Pending review
**Implementation Timeline:** ⏳ Pending approval

**Ready to Begin Implementation:** 🟡 Awaiting final review

---

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2024-12-05 | 1.0.0 | Initial implementation plan created |
| | | Decision: ZIP-only format |
| | | Decision: Custom icon support |
| | | Decision: 4 thumbnail options |
| | | Architecture finalized |

---

## Contact & Questions

For questions or clarifications about this implementation plan:

- Review the [CLAUDE.md](./CLAUDE.md) file for codebase architecture
- Check existing implementations in `src/ts/` for patterns
- Reference [QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md) for setup

---

**Last Updated:** 2024-12-05
**Document Version:** 1.0.0
**Status:** Ready for Implementation
