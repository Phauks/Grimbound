# Blood on the Clocktower Token Generator - Project Management System
## Implementation Plan

**Document Version:** 1.0  
**Last Updated:** 2024-12-05  
**Status:** Ready for Implementation Review

---

## Executive Summary

Complete architecture for a **local-first project management system** enabling users to:
- Save/load token generation projects locally
- Switch between multiple projects
- Export as shareable ZIP files (with custom character icons)
- Import shared projects from friends
- Auto-save work to prevent data loss
- Future cloud synchronization (architecture ready)

### Core Principles
- **User Control**: Data stored locally by default
- **Simplicity**: Single ZIP format, no export complexity
- **Shareability**: `.zip` extension (universal compatibility)
- **Modularity**: Designed to grow with features
- **Offline-First**: Full offline functionality

---

## File Format Decision: ZIP ONLY

### Why ZIP?
- Opens on any OS without special software
- Never blocked by email/chat systems
- Supports nested folders (for custom icons)
- Built-in compression (30-40% reduction)
- Inspectable content
- Future-proof architecture

### Package Structure
```
project_name_1733404800000.zip
├── manifest.json          
├── project.json           
├── thumbnail.png          
└── icons/                 
    ├── imp.webp
    ├── baron.webp
    └── spy.webp
```

---

## Implementation Roadmap (7 Weeks)

| Week | Focus | Deliverable |
|------|-------|-------------|
| 1 | Foundation | Types, DB schema, CRUD operations |
| 2 | Export/Import | ZIP creation/parsing with icons |
| 3 | Auto-Save | 2s debounce + recovery |
| 4 | Project UI | List, cards, switcher |
| 5 | Icons/Thumbnails | 4 selection modes |
| 6 | Modals | Create, export, import workflows |
| 7 | Polish | Migration, shortcuts, accessibility, docs |

---

## Technology Stack

- **Storage**: IndexedDB (Dexie.js wrapper)
- **State**: React Context (extended TokenContext)
- **Files**: ZIP archives via jszip
- **Download**: file-saver library

---

## Dependencies

```bash
npm install dexie jszip file-saver
npm install -D @types/jszip @types/file-saver
```

---

## Data Architecture

### Project Entity
- ID, name, description
- Timestamps (created, modified, accessed)
- Thumbnail (4 modes: auto, token, logo, custom)
- State (characters, script meta, generation options)
- Custom icons map
- Stats (counts, file size)
- Cloud sync metadata (future)

### IndexedDB Tables
- **projects**: Full project data
- **projectSummaries**: Fast list rendering
- **customIcons**: Icon metadata + base64
- **autoSaveSnapshots**: Recovery (keep 10)
- **appSettings**: Global config

---

## Service Layer

### ProjectService
Full CRUD: create, read, update, delete, list, search, filter

### ProjectExporter
ZIP creation with compression, manifest, project data, icons, thumbnail

### ProjectImporter
ZIP parsing, validation, icon extraction, format detection

### ThumbnailService
4-mode thumbnail generation (320x180 PNG): auto, token, logo, custom

---

## UI Components

**Management**: ProjectsView, ProjectCard, ProjectSwitcher, ListHeader, ActionBar

**Modals**: CreateProjectModal, ExportProjectModal, ImportProjectModal, ConflictResolver

**Elements**: ThumbnailSelector, AutoSaveIndicator, DropZone

---

## Performance Targets

- Load list (50 projects): < 200ms
- Switch projects: < 500ms
- Export (50 chars + 10 icons): < 2s
- Import (50 chars + 10 icons): < 3s
- Auto-save debounce: 2s
- Search: < 300ms

---

## Success Criteria

✅ Phase 1: Types, schema, CRUD, snapshots
✅ Phase 2: ZIP export/import functional
✅ Phase 3: Auto-save with recovery
✅ Phase 4: Project management UI
✅ Phase 5: Custom icons + thumbnails
✅ Phase 6: All modals & workflows
✅ Phase 7: Migration, shortcuts, accessibility (WCAG AA), docs

---

## Key Decisions

| Decision | Why |
|----------|-----|
| ZIP only | Universal, no vendor lock-in |
| IndexedDB | Fast, offline, generous quota |
| React Context | Already using TokenContext |
| 2s debounce | Balances UX and performance |
| Dexie.js | Simplifies IndexedDB queries |
| 4 thumbnails | Flexibility without complexity |

---

## Future Enhancements

- Cloud sync (post-MVP, architecture ready)
- Schema versioning (for future features)
- Encryption (optional)
- Collaborative editing (optional)

---

**Status**: ✅ Ready for Implementation

**Next**: Week 1 - Foundation Phase

*Last Updated: 2024-12-05 | Version: 1.0*
