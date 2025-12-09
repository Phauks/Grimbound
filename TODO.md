# TODO - Blood on the Clocktower Token Generator

This document tracks planned features, enhancements, and deferred work items.

---

## 🔴 High Priority

### Deferred from v0.3.0 - JSON Editor Visual Enhancements

**Context:** Core validation logic is complete and working. These are UI polish features that require CodeMirror 6 integration.

#### 1. Visual Autocomplete Dropdown
- **Status**: Deferred (requires CodeMirror 6)
- **Effort**: 1-2 days
- **Description**: As user types character IDs, show dropdown with suggestions
- **Features**:
  - Fuzzy search against cached characters
  - Display character icon, name, ID, team
  - Keyboard navigation (↑↓ arrows, Enter, Esc)
  - Debounced to 150ms for performance
- **Dependencies**:
  - Install `@codemirror/state`, `@codemirror/view`, `@codemirror/lang-json`
  - Install `@codemirror/autocomplete`
  - Create `CharacterAutocomplete` component
- **Data Source**: `CharacterLookupService` (already implemented)
- **Estimated Bundle Size**: +150-200 KB (gzipped)

#### 2. Hover Tooltips for Character IDs
- **Status**: Deferred (requires CodeMirror 6)
- **Effort**: 0.5-1 day
- **Description**: Hover over character ID to see preview tooltip
- **Features**:
  - Show character icon, name, team
  - Display ability text
  - Only show for valid character IDs
- **Dependencies**:
  - CodeMirror 6 hover extension
  - Create `CharacterHover` component
- **Data Source**: `CharacterLookupService` (already implemented)

#### 3. Inline Validation Indicators
- **Status**: Deferred (requires CodeMirror 6)
- **Effort**: 0.5 day
- **Description**: Visual indicators for valid/invalid character IDs
- **Features**:
  - Green underline for valid IDs
  - Red underline for invalid IDs
  - Integrates with existing validation logic
- **Dependencies**:
  - Install `@codemirror/lint`
  - Create lint extension using `scriptParser` validation
- **Data Source**: Existing `parseScriptData` validation

#### Implementation Plan for CodeMirror 6
```bash
# Install dependencies
npm install @codemirror/state @codemirror/view @codemirror/lang-json
npm install @codemirror/autocomplete @codemirror/lint

# Create components
src/components/ScriptInput/
├── CharacterAutocomplete.tsx    # Autocomplete extension
├── CharacterHover.tsx            # Hover tooltip extension
└── CodeMirrorEditor.tsx          # Main CodeMirror wrapper

# Create styles
src/styles/components/scriptInput/
├── CharacterAutocomplete.module.css
└── CodeMirrorEditor.module.css
```

**Acceptance Criteria:**
- [ ] Autocomplete appears within 150ms of typing
- [ ] Keyboard navigation works (↑↓, Enter, Esc)
- [ ] Hover shows correct character details
- [ ] Inline validation matches current validation logic
- [ ] No performance regression (debounced properly)
- [ ] Works with large scripts (100+ characters)

**Estimated Total Effort**: 2-3 days

---

## 🟡 Medium Priority

### Data Sync Enhancements

#### 1. Service Worker Background Sync
- **Description**: Use Service Worker API for true background updates
- **Benefits**:
  - Sync when back online after offline period
  - Better battery efficiency
  - OS-level background sync support
- **Effort**: 2-3 days
- **Dependencies**: Service Worker API, Background Sync API

#### 2. Delta Updates
- **Description**: Only download changed characters instead of full dataset
- **Benefits**:
  - Reduce bandwidth usage
  - Faster updates for minor changes
- **Effort**: 3-4 days
- **Technical**:
  - Modify GitHub package format to include delta manifests
  - Update PackageExtractor to handle incremental updates

#### 3. Multi-Source Support
- **Description**: Support custom GitHub repos for character data
- **Benefits**:
  - Allow community editions
  - Support homebrew character repositories
- **Effort**: 2-3 days
- **UI Changes**:
  - Add "Data Source" setting
  - Allow custom GitHub repo URLs

---

### Export Enhancements

#### 1. Export Integration with Sync Data
- **Description**: Include local character data in ZIP exports
- **Features**:
  - Embed version info in PDFs
  - Include character metadata in exports
  - Self-contained exports with character data
- **Effort**: 1-2 days

#### 2. Complete Package Exporter
- **Description**: Export tokens + script JSON + character data as complete package
- **Status**: Partially implemented (`completePackageExporter.ts` exists)
- **Remaining Work**:
  - UI integration
  - Testing
  - Documentation
- **Effort**: 1 day

---

### UI/UX Improvements

#### 1. Advanced Autocomplete Features
- **Description**: Context-aware suggestions and history
- **Features**:
  - Team-specific suggestions (suggest Townsfolk when in Townsfolk section)
  - Recent characters history
  - Character synonyms and aliases
- **Dependencies**: CodeMirror autocomplete (from deferred item #1)
- **Effort**: 1-2 days

#### 2. Script Templates
- **Description**: Pre-built script templates for common scenarios
- **Features**:
  - Trouble Brewing template
  - Sects & Violets template
  - Custom script builder wizard
- **Effort**: 2-3 days

#### 3. Batch Token Customization
- **Description**: Apply settings to multiple tokens at once
- **Features**:
  - Multi-select in token grid
  - Bulk edit backgrounds, fonts, etc.
  - Copy settings between tokens
- **Effort**: 2-3 days

---

## 🟢 Low Priority / Future Enhancements

### Features from README "To Be Implemented"

#### 1. Decorative Leaf Generation
- **Status**: Partially implemented (referenced in config)
- **Description**: Decorative leaf generation with probability system
- **Effort**: 1-2 days

#### 2. Official vs Custom Character Filtering
- **Description**: Filter UI to show only official or custom characters
- **Effort**: 0.5 day

#### 3. Additional Presets
- **Description**: Full Bloom and Minimal presets (partially implemented)
- **Effort**: 1 day

#### 4. Theme System Expansion
- **Description**: Light theme and high contrast theme options
- **Status**: Theme infrastructure exists (`themes.ts`)
- **Effort**: 2-3 days

#### 5. A4 Paper Size Support
- **Description**: PDF generation for A4 paper (currently Letter only)
- **Effort**: 0.5 day

#### 6. Custom DPI Configuration
- **Description**: Allow users to set custom DPI for PDF export
- **Effort**: 0.5 day

---

### Performance & Analytics

#### 1. Telemetry (Optional)
- **Description**: Track sync success/failure rates
- **Features**:
  - Monitor fallback usage
  - Measure performance metrics
  - Privacy-first (opt-in only)
- **Effort**: 3-4 days
- **Considerations**: Privacy policy, opt-in UI, GDPR compliance

#### 2. Performance Monitoring
- **Description**: Built-in performance monitoring
- **Features**:
  - Track token generation time
  - Monitor sync performance
  - Identify bottlenecks
- **Effort**: 2-3 days

---

## 🔧 Technical Debt & Refactoring

### 1. Migration to Vite 5
- **Current**: Vite 4.x
- **Target**: Vite 5.x
- **Effort**: 1 day
- **Benefits**: Better performance, newer features

### 2. React 19 Migration
- **Current**: React 18
- **Target**: React 19 (when stable)
- **Effort**: 1-2 days
- **Benefits**: New features, performance improvements

### 3. IndexedDB Schema Versioning
- **Description**: Proper schema migration system for future IndexedDB changes
- **Effort**: 1 day

### 4. Comprehensive E2E Test Suite
- **Description**: Automated E2E tests using Playwright or Cypress
- **Current**: Manual checklist only
- **Effort**: 3-5 days

---

## 📋 Documentation

### 1. API Documentation
- **Description**: Document all public APIs for contributors
- **Tools**: TypeDoc or similar
- **Effort**: 1-2 days

### 2. Architecture Decision Records (ADRs)
- **Description**: Document key architectural decisions
- **Examples**:
  - Why IndexedDB + Cache API over localStorage
  - Why CodeMirror deferred
  - Sync architecture design
- **Effort**: 1 day

### 3. Contributing Guide
- **Description**: Comprehensive guide for contributors
- **Includes**:
  - Development setup
  - Code style guide
  - PR process
  - Testing requirements
- **Effort**: 1 day

---

## 🐛 Known Issues

### None Currently Tracked
All known issues from v0.3.0 development have been resolved.

---

## 📝 Notes

### Versioning Strategy for Future Releases

- **v0.3.1**: CodeMirror autocomplete (deferred features)
- **v0.3.2**: Service Worker background sync
- **v0.4.0**: Multi-source support + export enhancements
- **v0.5.0**: Advanced UI/UX improvements
- **v1.0.0**: Full feature completion, production-hardened

### Decision Making

When prioritizing TODO items, consider:
1. **User Impact**: Will this significantly improve user experience?
2. **Effort vs. Value**: Is the ROI worth the development time?
3. **Dependencies**: Does this unlock other features?
4. **Technical Debt**: Does this reduce or increase maintenance burden?

---

**Last Updated**: 2025-12-05
**Version**: v0.3.0
