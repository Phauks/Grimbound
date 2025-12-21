# Clocktower Token Generator - Development Roadmap

> **Purpose**: This document tracks the development trajectory, planned features, and prioritized improvements for the Clocktower Token Generator.

**Last Updated**: 2025-12-18
**Current Version**: v0.3.6

---

## Version Strategy

| Version | Focus | Status |
|---------|-------|--------|
| v0.3.x | GitHub Data Sync, Stability | **Current** |
| v0.4.x | JSON Editor Enhancements | Planned |
| v0.5.x | Advanced Export & Multi-source | Planned |
| v0.6.x | UI/UX Improvements | Planned |
| v1.0.0 | Production Release | Future |

---

## Current Release: v0.3.x

### v0.3.6 (Current)
- Completed Dependency Injection migration across all hooks and components
- ServiceContext now provides all core services via React Context
- Added `projectDatabaseService` and `fileValidationService` to DI system
- Improved testability through injectable services

### v0.3.5
- Documentation overhaul
- UI/UX Pro Max integration
- Studio features and background removal
- Project management improvements

### Completed in v0.3.0
- GitHub Data Sync with offline-first architecture
- IndexedDB + Cache API storage
- Character Lookup Service with O(1) validation
- Sync UI components (indicator, modal, progress)
- 92 unit tests for sync module

---

## Upcoming: v0.4.x - JSON Editor Enhancements

### v0.4.0 - CodeMirror 6 Integration

**Status**: Planned
**Dependencies**: `@codemirror/state`, `@codemirror/view`, `@codemirror/lang-json`, `@codemirror/autocomplete`, `@codemirror/lint`
**Estimated Bundle Impact**: +150-200 KB (gzipped)

#### Features

| Feature | Priority | Description |
|---------|----------|-------------|
| Visual Autocomplete | High | Dropdown with character suggestions as user types |
| Hover Tooltips | High | Character preview on ID hover |
| Inline Validation | Medium | Green/red underlines for valid/invalid IDs |
| Syntax Highlighting | Medium | JSON-aware highlighting |
| Keyboard Navigation | High | Arrow keys, Enter, Esc support |

#### Technical Implementation
```
src/components/ScriptInput/
├── CharacterAutocomplete.tsx    # Autocomplete extension
├── CharacterHover.tsx           # Hover tooltip extension
├── CodeMirrorEditor.tsx         # Main CodeMirror wrapper
└── InlineValidation.tsx         # Lint extension

src/styles/components/scriptInput/
├── CharacterAutocomplete.module.css
└── CodeMirrorEditor.module.css
```

#### Acceptance Criteria
- [ ] Autocomplete appears within 150ms of typing
- [ ] Keyboard navigation (arrow keys, Enter, Esc)
- [ ] Hover shows character icon, name, team, ability
- [ ] Inline validation matches current parsing logic
- [ ] No performance regression on large scripts (100+ characters)

---

## Planned: v0.5.x - Advanced Export & Multi-source

### v0.5.0 - Export Enhancements

| Feature | Priority | Description |
|---------|----------|-------------|
| Complete Package Export | High | Tokens + JSON + character data bundle |
| Version Embedding | Medium | Include data version in PDF metadata |
| A4 Paper Support | Low | PDF generation for A4 (currently Letter only) |
| Custom DPI | Low | User-configurable DPI for exports |

### v0.5.1 - Multi-source Support

| Feature | Priority | Description |
|---------|----------|-------------|
| Custom GitHub Repos | Medium | Support community character repositories |
| Homebrew Characters | Medium | Import from custom sources |
| Data Source Selection | Medium | UI to switch between sources |

---

## Planned: v0.6.x - UI/UX Improvements

### v0.6.0 - Theme System

| Feature | Priority | Description |
|---------|----------|-------------|
| Light Theme | Medium | Full light mode support |
| High Contrast | Low | Accessibility theme |
| Theme Persistence | Medium | Remember user preference |
| System Theme Detection | Low | Auto-detect OS preference |

### v0.6.1 - Advanced Features

| Feature | Priority | Description |
|---------|----------|-------------|
| Script Templates | Medium | Pre-built templates (TB, S&V, BMR) |
| Batch Customization | Low | Multi-select and bulk edit tokens |
| Advanced Autocomplete | Low | Team-aware suggestions, history |

---

## Future: v1.0.0 - Production Release

### Requirements for 1.0

- [ ] All critical features implemented
- [ ] Comprehensive E2E test suite
- [ ] Full test coverage (>80%)
- [ ] Performance optimized
- [ ] Accessibility compliance (WCAG 2.1 AA)
- [ ] Complete documentation
- [ ] Production-hardened error handling
- [ ] Security audit passed

### Features for 1.0

| Category | Features |
|----------|----------|
| **Core** | All token types, full export options |
| **Data** | Offline-first, multi-source, auto-updates |
| **UI** | Themes, accessibility, responsive |
| **Quality** | E2E tests, monitoring, error tracking |

---

## Technical Debt Priorities

### High Priority (Address in next release)

| Item | Impact | Effort |
|------|--------|--------|
| Migrate `console.*` to logger | Code quality | Low |
| Extract magic numbers to constants | Maintainability | Medium |
| Add tests for custom hooks | Reliability | High |

### Medium Priority (Address in v0.5.x)

| Item | Impact | Effort |
|------|--------|--------|
| ~~Complete DI across services~~ | Testability | ✅ Done in v0.3.6 |
| Decompose TokenGenerator.ts | Maintainability | High |
| ErrorHandler use logger | Consistency | Low |

### Low Priority (Address in v0.6.x+)

| Item | Impact | Effort |
|------|--------|--------|
| Add component tests | Coverage | High |
| Performance profiling | User experience | Medium |

---

## Infrastructure Improvements

### Testing

| Item | Status | Notes |
|------|--------|-------|
| Unit tests (sync module) | Done | 92 tests |
| Unit tests (hooks) | Planned | v0.4.x |
| Unit tests (components) | Planned | v0.5.x |
| E2E tests (Playwright) | Planned | v0.6.x |
| Visual regression tests | Future | v1.0.0 |

### CI/CD

| Item | Status | Notes |
|------|--------|-------|
| Build verification | Done | Node 18.x, 20.x |
| Type checking | Done | Strict mode |
| Linting (Biome) | Done | Format + lint |
| Security audit | Done | Weekly |
| Coverage reporting | Planned | v0.4.x |
| Performance benchmarks | Planned | v0.6.x |

### Documentation

| Document | Status | Last Updated |
|----------|--------|--------------|
| CLAUDE.md | Restructured | 2025-12-20 |
| ROADMAP.md | Updated | 2025-12-18 |
| .claude/rules/* | Created | 2025-12-20 |
| DI_MIGRATION.md | Completed | 2025-12-18 |
| CONTRIBUTING.md | Needs Update | 2025-12-10 |
| README.md | Good | 2025-12-10 |
| CHANGELOG.md | Needs Update | 2025-12-05 |

---

## Feature Request Tracking

### Requested Features (Community)

| Feature | Votes | Status | Target |
|---------|-------|--------|--------|
| Custom fonts upload | - | Backlog | TBD |
| Token templates | - | Backlog | v0.6.x |
| Batch operations | - | Backlog | v0.6.x |
| Mobile support | - | Backlog | v1.0.0 |

### Internal Priorities

| Feature | Priority | Rationale |
|---------|----------|-----------|
| CodeMirror integration | High | Most requested UX improvement |
| Multi-source support | Medium | Community editions demand |
| Theme system | Medium | Accessibility requirement |
| E2E testing | High | Quality assurance |

---

## Decision Log

### Recent Decisions

| Date | Decision | Rationale |
|------|----------|-----------|
| 2025-12-18 | Complete DI migration | All hooks and components now use ServiceContext for testability |
| 2025-12 | Defer CodeMirror to v0.4.x | Bundle size concerns, core sync priority |
| 2025-12 | IndexedDB + Cache API | Better offline support than localStorage |
| 2025-12 | Strategy pattern for icons | Clean extensibility for token types |
| 2025-12 | React 19 | Latest stable with improved performance |

### Pending Decisions

| Decision | Options | Deadline |
|----------|---------|----------|
| E2E framework | Playwright vs Cypress | v0.6.x |
| Bundle splitting | Manual vs automatic | v0.5.x |
| State management | Context vs Zustand | v0.5.x |

---

## Release Process

### Pre-release Checklist

1. [ ] All tests passing
2. [ ] Coverage meets threshold
3. [ ] Documentation updated
4. [ ] CHANGELOG.md updated
5. [ ] Version bumped in package.json
6. [ ] E2E checklist completed
7. [ ] Security audit passed

### Post-release Tasks

1. [ ] Tag release in GitHub
2. [ ] Create GitHub release with notes
3. [ ] Deploy to GitHub Pages
4. [ ] Announce in community channels

---

## How to Contribute to Roadmap

1. **Feature Requests**: Open GitHub issue with `feature-request` template
2. **Bug Reports**: Open GitHub issue with `bug-report` template
3. **Technical Improvements**: Propose in PR description
4. **Priority Changes**: Discuss in GitHub Discussions

---

*This roadmap is a living document. Claude should update it when completing features or when priorities change based on user feedback.*
