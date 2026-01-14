# Grimbound - Architecture Documentation

> **Purpose**: System architecture, design decisions, and technical implementation details.

**Last Updated**: 2026-01-13
**Version**: v0.6.0

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Application Layers](#application-layers)
4. [Data Flow](#data-flow)
5. [State Management](#state-management)
6. [Storage & Caching](#storage--caching)
7. [Security & Performance](#security--performance)
8. [Architecture Decision Records](#architecture-decision-records)
9. [Codebase Quality](#codebase-quality)

> **Cross-references**: For detailed patterns see `coding-patterns.md`. For module APIs see `utility-reference.md`.

---

## System Overview

Grimbound is a client-side web application that generates printable tokens for the Blood on the Clocktower board game.

**Key Features:**
- Offline-first architecture with GitHub data synchronization
- Canvas-based rendering for high-quality token generation
- Multi-format export (PDF, PNG, ZIP)
- Project management with auto-save and versioning

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface                           │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │Projects │ │ Script  │ │ Tokens  │ │ Studio  │ │ Export  │  │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘  │
│       └───────────┴───────────┴───────────┴───────────┘        │
├─────────────────────────────────────────────────────────────────┤
│  React Contexts: Token, Project, DataSync, Theme, Service      │
├─────────────────────────────────────────────────────────────────┤
│  Custom Hooks (60+): useTokenGenerator, useProjectAutoSave...  │
├─────────────────────────────────────────────────────────────────┤
│  Core Services: Generation │ Sync │ Export │ Cache             │
├─────────────────────────────────────────────────────────────────┤
│  Storage: IndexedDB (Dexie) │ Cache API │ localStorage         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| Framework | React 19.x | UI components |
| Language | TypeScript 5.7.x | Type safety |
| Build | Vite 7.3.x | Development & bundling |
| Styling | CSS Modules | Scoped styles |
| Database | Dexie 4.x | IndexedDB wrapper |
| PDF | jsPDF 2.5.x | PDF generation |
| ZIP | JSZip 3.10.x | ZIP creation |
| DnD | @dnd-kit 6.x | Drag and drop |
| Testing | Vitest | Unit testing |
| Linting | Biome | Lint & format |

---

## Application Layers

### Layer 1: Views
Main views in `src/components/Views/`: Projects, Script, Characters, Tokens, Studio, TownSquare, Json, Versions

### Layer 2: Shared Components
Organized in `src/components/Shared/`: Assets, Controls, Drawer, Feedback, Form, Json, ModalBase, Options, Selectors, UI

### Layer 3: React Contexts
Global state providers: `TokenContext`, `ProjectContext`, `DataSyncContext`, `ThemeContext`, `ServiceContext`

### Layer 4: Custom Hooks
60+ hooks encapsulating business logic. See `utility-reference.md` for complete list.

### Layer 5: Core Services
TypeScript modules in `src/ts/`: generation, sync, export, cache, canvas, data, services. See `utility-reference.md` for module details.

---

## Data Flow

### Token Generation Flow

```
┌──────────────┐     ┌───────────────┐     ┌────────────────┐
│ Script JSON  │────▶│ Parse & Valid │────▶│ Character List │
└──────────────┘     └───────────────┘     └───────┬────────┘
                                                    │
                                                    ▼
┌──────────────┐     ┌───────────────┐     ┌────────────────┐
│ Token Canvas │◀────│TokenGenerator │◀────│ Merge Options  │
└──────┬───────┘     └───────────────┘     └────────────────┘
       │
       ▼
┌──────────────┐     ┌───────────────┐
│ Export (PDF) │────▶│  User Download │
│ Export (ZIP) │     └───────────────┘
└──────────────┘
```

### Data Sync Flow

```
┌───────────┐     ┌──────────────────┐     ┌─────────────┐
│ App Load  │────▶│ StorageManager   │────▶│ Load Cached │
└───────────┘     └──────────────────┘     └──────┬──────┘
                                                   │
                         ┌─────────────────────────┘
                         ▼
                  ┌──────────────────┐
                  │ DataSyncService  │
                  │ checkForUpdates()│
                  └────────┬─────────┘
                           │ (background)
                           ▼
                  ┌──────────────────┐
                  │ GitHub Release   │
                  │ Client (ETag)    │
                  └────────┬─────────┘
                           │ if newer
                           ▼
                  ┌──────────────────┐     ┌─────────────┐
                  │ PackageExtractor │────▶│ Store in    │
                  │ extract & valid  │     │ IndexedDB + │
                  └──────────────────┘     │ Cache API   │
                                           └─────────────┘
```

---

## State Management

### Context Hierarchy

```
<ThemeProvider>
  <ServiceProvider>
    <DataSyncProvider>
      <ProjectProvider>
        <TokenProvider>
          <App />
```

### State Categories

| Category | Storage | Scope | Examples |
|----------|---------|-------|----------|
| UI State | React State | Component | Modal open, selection |
| Session State | React Context | App-wide | Current project, tokens |
| User Preferences | localStorage | Persistent | Theme, auto-save |
| Project Data | IndexedDB | Persistent | Projects, versions |
| Character Data | IndexedDB + Cache | Persistent | Characters, images |

---

## Storage & Caching

### Storage Architecture

| Storage | Purpose | Quota |
|---------|---------|-------|
| IndexedDB (Dexie) | Projects, characters, sync metadata | 2-5 MB |
| Cache API | Character icons, binary assets | 15-20 MB (LRU) |
| localStorage | User preferences only | < 100 KB |

### Multi-tier Cache

```
┌─────────────────────────────────────────┐
│     L1: In-Memory (globalImageCache)    │
│     - HTMLImageElement instances        │
│     - LRU eviction at 100 items         │
└───────────────────┬─────────────────────┘
                    │ miss
                    ▼
┌─────────────────────────────────────────┐
│     L2: Cache API (character-icons)     │
│     - Binary blob storage               │
│     - Persistent across sessions        │
└───────────────────┬─────────────────────┘
                    │ miss
                    ▼
┌─────────────────────────────────────────┐
│     L3: Network (GitHub/External)       │
│     - CORS proxy for external images    │
│     - Response cached to L2             │
└─────────────────────────────────────────┘
```

### Cache Services

- **CacheManager**: Facade for pre-rendering with strategy pattern
- **TabPreRenderService**: Unified tab hover pre-rendering
- **CacheInvalidationService**: Lifecycle management and event subscription

---

## Security & Performance

### Security

| Area | Approach |
|------|----------|
| CORS | `applyCorsProxy()` for external images; `loadImage()` auto-handles |
| Input Validation | `parseScriptData()` validates JSON; `characterLookupService.isValid()` |
| Storage | No sensitive data in localStorage; no credentials stored |
| GitHub API | Unauthenticated requests (rate limited) |

### Performance Optimizations

| Area | Technique |
|------|-----------|
| Canvas | Pooling (`canvasPool`), text measurement caching (`measureTextCached`) |
| React | React Compiler for automatic memoization (see `coding-patterns.md`) |
| Bundle | Dynamic imports for jsPDF, JSZip; code splitting by route |
| Rendering | Batch token generation; virtualization for large lists |

---

## Architecture Decision Records

### Summary Table

| ADR | Decision | Rationale |
|-----|----------|-----------|
| 001 | IndexedDB + Cache API over localStorage | localStorage 5MB limit; IndexedDB for structured data, Cache API for binary |
| 002 | Strategy Pattern for Icon Layout | Open/Closed principle; testable; maintainable |
| 003 | Deferred CodeMirror Integration | Bundle size (+150KB gzipped); core functionality priority |
| 004 | React Context over Redux/Zustand | Simpler model; no deps; sufficient for complexity |
| 005 | Singleton Services | Shared resources need single instances; replaceable via DI |
| 006 | Modular Background Effects | Single responsibility; extensible via `TextureFactory.register()` |
| 007 | Constructor Injection with Defaults | Zero breaking changes; full testability; SOLID compliance |
| 008 | Unified Tab Pre-Render Service | Single API; consistent cache keys; appropriate caching per tab |
| 009 | SSOT Character Image Resolution | Pre-resolve URLs in `batchGenerator`; unified resolution path |
| 010 | Hybrid-Only PDF Export | Faster; reduces complexity; single code path |
| 011 | Reusable Script Component Architecture | Shared infrastructure in `src/ts/scriptPdf/`; consistent approach |
| 012 | Player Script Character Ordering | @dnd-kit for drag-and-drop; stored in script meta |
| 013 | Unified PDF Settings Drawer | Tabbed interface; shared settings; consistent UX |
| 014 | Reuse BackgroundStyle for Script PDF | Proven system; 11+ textures; rich presets |
| 015 | React Compiler for Auto Memoization | Eliminates ~1000 lines boilerplate; optimal decisions |

### ADR Details

<details>
<summary>ADR-006: Modular Background Effects</summary>

**Context**: Background effects was a single 1181-line file.

**Structure**:
```
backgroundEffects/
├── BackgroundRenderer.ts    # Orchestrator (~250 lines)
├── noise/                   # Reusable noise utilities
├── textures/               # Strategy pattern (11 files)
└── effects/                # Visual effect strategies
```

**Trade-offs**: More files (mitigated by barrel exports)
</details>

<details>
<summary>ADR-007: Constructor Injection Pattern</summary>

See `coding-patterns.md` → Pattern 4: Dependency Injection for full implementation details.

**Services Refactored**: ProjectService, ProjectExporter, FileUploadService, DataSyncService, TokenGenerator

**Interface Files**: `IProjectService.ts`, `IUploadServices.ts`, `ISyncServices.ts`
</details>

<details>
<summary>ADR-008: Tab Pre-Render Service</summary>

**Problem**: Scattered pre-render logic with inconsistent cache keys.

**Solution**: `TabPreRenderService` facade unifying all tab hover pre-rendering.

**Routing**:
- `characters` → CacheManager strategy (heavy canvas ops)
- `tokens` → Module-level cache (data URL encoding)
- `script` → Module-level cache (night order computation)
</details>

<details>
<summary>ADR-009: SSOT Character Image Resolution</summary>

**Problem**: Token generation bypassed SSOT (`resolveCharacterImageUrl`).

**Solution**: Pre-resolve all URLs at `generateAllTokens()` entry point.

```typescript
interface BatchContext {
  resolvedImageUrls: Map<string, string>;  // characterId:variantIndex → URL
}
```
</details>

<details>
<summary>ADR-015: React Compiler</summary>

**Migration**:
1. Install `babel-plugin-react-compiler`
2. Remove `useCallback`, `useMemo`, `React.memo` wrappers
3. Convert `forwardRef` to ref-as-prop pattern

**Exception**: Keep `useCallback`/`useMemo` when value is in `useEffect` deps (see `coding-patterns.md`).
</details>

---

## Future Considerations

| Improvement | Purpose |
|-------------|---------|
| Web Workers | Non-blocking token generation |
| Service Worker | True offline support |
| Delta Updates | Incremental data sync |
| WASM | Performance-critical canvas ops |

| Scalability Concern | Solution |
|---------------------|----------|
| Large scripts (100+ chars) | Virtual scrolling |
| Many tokens (500+) | Progressive loading |
| Concurrent tabs | BroadcastChannel |
| Mobile devices | Responsive redesign |

---

## Codebase Quality

### Strengths

1. Well-organized module structure with barrel exports
2. Comprehensive error hierarchy with contextual information
3. Environment-aware logging (auto-filters in production)
4. Strategy pattern for extensible layouts
5. Strong TypeScript with strict mode
6. Separation of concerns across modules
7. Extensive test coverage for sync module (92 tests)
8. Constants/config separated from logic
9. Custom hooks extract complex logic
10. SSOT for character image resolution

### Technical Debt

1. Inconsistent DI - not all classes accept injected dependencies
2. Test coverage gaps - many hooks and components lack unit tests
3. Missing E2E test suite
4. Missing tests for TokenImageRenderer and TokenTextRenderer

### Clever Solutions

| Solution | Location | Why Notable |
|----------|----------|-------------|
| Icon Layout Strategies | `iconLayoutStrategies.ts` | Clean strategy pattern |
| Character Lookup | `characterLookup.ts` | O(1) validation via Map |
| Multi-tier caching | `src/ts/cache/` | Policies + strategies |
| Canvas pooling | `canvasPool.ts` | Reuse for performance |
| TabPreRenderService | `TabPreRenderService.ts` | Facade with consistent cache keys |

---

*Update this document when making significant architectural changes. See ROADMAP.md for planned changes.*
