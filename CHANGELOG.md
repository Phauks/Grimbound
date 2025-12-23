# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Versioning Strategy

This project uses Semantic Versioning (MAJOR.MINOR.PATCH):
- **MAJOR** version for incompatible API changes
- **MINOR** version for new functionality in a backward-compatible manner  
- **PATCH** version for backward-compatible bug fixes and minor updates

**Current Phase:** Pre-1.0 development (0.x.x)
- Version increments with each significant commit/update
- Patch version (last digit) increments for each commit with changes

## [Unreleased]

### Changed
- **Project Rebrand**: Renamed from "Clocktower Token Generator" to "Grimbound"
  - New domain: grimbound.com (via Cloudflare Pages)
  - Updated all documentation, UI, and configuration files
  - Migrated deployment from GitHub Pages to Cloudflare Pages
  - Updated PWA manifest with new branding
- **Studio Simplification**: Replaced complex multi-layer editor with a focused asset editor
  - Removed 20+ files (~3000+ lines) of over-engineered functionality
  - New simple UI using standard ViewLayout 2-panel pattern (matching TokensView)
  - Left sidebar: collapsible sections for Load Image, Team Color, Actions, Save
  - Right panel: image preview with empty state and drag-drop support
  - Core feature: team color application (converts to grayscale then applies color overlay)
  - Team color presets: Good, Evil, Traveler, Fabled, Loric, Good Traveler, Evil Traveler
  - Custom color picker: choose any color via native color input
  - Invert button: invert all colors while preserving transparency
  - Fixed: colors now always apply from original image (no stacking issue)
  - New `useAssetEditor` hook for simple state management
  - Added Asset Manager integration: "From Assets" button opens AssetManagerModal in selection mode
  - Removed: layers, drawing tools, logo wizard, studio presets, filters, memory manager, background removal
  - Removed `StudioContext` - no longer needed with simplified architecture
  - "Edit in Studio" from TokenGrid still works via navigation helpers
- **Documentation Restructuring**: Slimmed down CLAUDE.md from 1129 lines to 161 lines
  - Moved detailed patterns to `.claude/rules/coding-patterns.md`
  - Moved utility reference tables to `.claude/rules/utility-reference.md`
  - Moved testing standards to `.claude/rules/testing-standards.md`
  - Moved ARCHITECTURE.md to `.claude/rules/architecture.md`
  - CLAUDE.md now contains only essential rules loaded every session
  - Rule files are loaded by Claude Code contextually when relevant

### Added
- **Per-Character Decoratives Panel**: Comprehensive per-character styling overrides in the Decoratives tab
  - Master toggle to enable/disable custom settings (vs global defaults)
  - Background style selector (same component as global Options panel)
  - Font settings for character name (font family, color, spacing, shadow)
  - Icon settings (scale, X/Y offset)
  - Ability text settings (enable/disable, font, color, spacing, shadow)
  - Setup overlay settings (hide toggle, style selector)
  - Accent settings (full accent configuration matching global settings)
  - Extended `DecorativeOverrides` type with all character-specific styling options
  - New `CharacterDecorativesPanel` component that reuses existing option components
- **CodeMirror 6 JSON Editor**: Replaced custom JSON syntax highlighting with CodeMirror 6
  - Full-featured JSON editor with syntax highlighting, linting, and error markers
  - Theme integration with all 6 application themes via CSS variables
  - Built-in undo/redo with keyboard shortcuts (Ctrl+Z/Y)
  - JSON validation with inline lint markers
  - New files: `codemirrorTheme.ts`, `useCodeMirrorEditor.ts`, `CodeMirrorEditor.tsx`
  - Added CodeMirror CSS variables (`--cm-json-key`, `--cm-json-string`, etc.) to each theme
- **Enhanced Version Comparison**: Complete field-by-field character comparison with inline diff highlighting
  - Word-level diff for text fields (ability, flavor, overview, tips, night reminders, etc.)
  - Added/removed indicator lists for reminders and global reminders
  - Night order changes (first night, other night) with old→new display
  - Metadata changes (team, setup, edition, image) tracking
  - Expandable character rows - click to see all field-level changes
  - Green highlighting for added text, red strikethrough for removed text
  - New `textDiff.ts` utility using LCS algorithm for accurate word-level comparison
  - Extended `projectDiff.ts` with `calculateProjectDiffDetailed()` function
- **TabPreRenderService**: Unified service for all tab hover pre-rendering (`src/ts/cache/TabPreRenderService.ts`)
  - Single API for triggering pre-render on tab hover: `tabPreRenderService.preRenderTab(tab, context)`
  - Consistent cache key generation for reliable cache hits
  - Supports characters, tokens, and script tabs
  - Night order pre-computation for instant Script tab navigation
  - Character image preloading for instant night order display
- **Character image URL caching**: Preloads and caches resolved image URLs during script pre-render
  - `getCachedCharacterImageUrl(characterId)` - Get cached resolved image URL
  - `hasCharacterImageUrl(characterId)` - Check if URL is cached
  - Used by NightOrderEntry for instant image display without loading flash
- **Hash utilities**: Shared hash functions for cache key generation (`src/ts/cache/utils/hashUtils.ts`)
  - `simpleHash()`, `hashArray()`, `hashObject()`, `combineHashes()`
  - Eliminates duplicated hash code across modules
- **Script hover pre-render context type**: Added `'script-hover'` to `PreRenderContextType`

### Changed
- **TokensView sidebar reorganization**: Improved UI organization for token generation options
  - Renamed "Additional Options" to "Advanced Options" (ability text, reminder count, setup, accents)
  - Created new "Additional Tokens" section with Variants, Meta Tokens, Bootlegger, and QR Tokens
  - New `AdditionalTokensPanel` component for additional token types
- **TabNavigation**: Refactored to use unified `tabPreRenderService` instead of separate pre-render functions
- **NightOrderContext**: Updated to use `tabPreRenderService.getCachedNightOrder()` for cache lookup
- **Cache module exports**: Added TabPreRenderService and hashUtils exports to barrel file
- **JsonEditorPanel**: Now wraps CodeMirror 6 instead of custom CSS overlay pattern
- **JsonView**: Uses CodeMirror's built-in undo/redo instead of custom useUndoStack hook
- **onChange signature**: JsonEditorPanel now receives string directly instead of ChangeEvent

### Removed
- `src/ts/ui/jsonHighlighter.ts` - Replaced by CodeMirror 6 language support
- `src/components/ViewComponents/JsonComponents/JsonHighlight.tsx` - Replaced by CodeMirror
- `src/components/Shared/Json/VirtualizedJsonHighlight.tsx` - CodeMirror handles large files natively
- `src/styles/utilities/json-highlighting.css` - Colors now integrated via CSS variables in themes

### Fixed
- **Script tab flash**: Fixed visual flash when navigating to Script tab by ensuring cache keys match between pre-render trigger and lookup
  - TabNavigation now passes `scriptMeta ? [scriptMeta, ...characters] : characters` to match ScriptView's data structure
- **Character image flash in night order**: Fixed images showing placeholder before loading by preloading and caching resolved URLs
  - NightOrderEntry now checks `tabPreRenderService.getCachedCharacterImageUrl()` before async resolution
  - Images display instantly when cached from tab hover pre-rendering

## [0.3.0] - 2025-12-05

### 🎉 Major Feature: GitHub Data Sync Integration

#### Added
- **Automatic Character Data Updates**: Syncs with official character data from GitHub releases
  - Background sync checks for updates without blocking user workflow
  - Non-blocking initialization - app loads instantly with cached data
  - Version-aware updates (only downloads when new version available)
  - ETag support for efficient conditional requests

- **Offline-First Architecture**: Works fully without internet after initial sync
  - IndexedDB storage for character data (~2-5 MB)
  - Cache API for character icons (~15-20 MB)
  - Graceful fallback when GitHub unavailable
  - Persistent cache survives page refreshes and browser restarts

- **New Sync Module (`src/ts/sync/`)**: Complete data synchronization system
  - `DataSyncService`: Main orchestrator with event system
  - `GitHubReleaseClient`: GitHub API client with rate limiting and retry logic
  - `PackageExtractor`: ZIP extraction and validation with content integrity checks
  - `StorageManager`: IndexedDB + Cache API wrapper with quota management
  - `VersionManager`: Version comparison logic (vYYYY.MM.DD-rN format)
  - `MigrationHelper`: Legacy data migration and first-time setup

- **Character Lookup Service**: Fast character validation and search
  - O(1) character ID validation via Map
  - Fuzzy search by ID or name with tiered scoring
  - Integrated with script parser for validation warnings
  - Core infrastructure for future autocomplete UI

- **Sync UI Components**:
  - `SyncStatusIndicator`: Header status indicator with color-coded states
  - `SyncDetailsModal`: Full sync dashboard with cache statistics
  - `SyncProgressBar`: Real-time download progress with size tracking
  - Settings integration: Auto-sync toggle and sync management controls

- **Event System**: Subscribe to sync events for real-time updates
  - Events: checking, downloading, extracting, success, error
  - Progress tracking with byte-level granularity
  - Error details and retry functionality

#### Changed
- **Data Loading**: Now uses synced character data when available
  - `useScriptData` hook integrated with DataSyncService
  - Fallback to legacy API if sync service not ready
  - Character images loaded from Cache API for faster rendering

- **Script Parser**: Enhanced validation against official character data
  - Validates character IDs against synced dataset
  - Provides helpful warnings for invalid IDs
  - Improved error messages with suggestions

- **Storage Architecture**: Moved from API-only to offline-first
  - First-time users: Automatic download on app load
  - Returning users: Instant load with cached data
  - Background update checks every hour (configurable)

#### Fixed
- TypeScript compilation errors in `tokenGenerator.ts`
  - Fixed boolean type coercion for `hasAbilityText`
  - Added proper fallback for missing layout properties
  - Improved type safety for layout constants
- Package extractor validation: Character count mismatch now properly detected

#### Technical
- **New Dependencies**:
  - `jszip` 3.10.1 - ZIP extraction for GitHub release packages
  - React 18 - UI framework (migrated from vanilla JS)
  - TypeScript 5.3+ - Enhanced type safety

- **Test Coverage**: 92 unit tests passing
  - Storage Manager: 19 tests
  - Version Manager: 30 tests
  - GitHub Client: 14 tests
  - Package Extractor: 19 tests
  - Data Sync Service: 10 tests

- **Performance Benchmarks**:
  - IndexedDB read latency: < 50ms
  - Full sync time: < 5s for typical release
  - App load with cache: < 1s to interactive
  - Memory usage during sync: < 50 MB

- **Browser Compatibility**:
  - Chrome/Edge: Full support
  - Firefox: Full support
  - Safari: Full support (may prompt for storage permission)

- **Storage Requirements**:
  - Total: ~25 MB maximum
  - Character data: ~2-5 MB (IndexedDB)
  - Character icons: ~15-20 MB (Cache API)

#### Documentation
- Updated README.md with comprehensive sync feature documentation
- Updated CLAUDE.md with sync module architecture and integration points
- Added E2E_TEST_CHECKLIST.md with 15 manual test scenarios
- Enhanced troubleshooting section with sync-related FAQs

#### Deferred (Non-blocking)
- Visual autocomplete dropdown in JSON editor (requires CodeMirror 6 integration)
- Hover tooltips for character IDs (requires CodeMirror 6)
- Inline validation indicators (requires CodeMirror 6)
- *Note*: Core validation logic is complete; UI enhancements can be added incrementally

### Migration Notes
- **First-Time Users**: Initial sync happens automatically on app load
- **Existing Users**: No action required; sync happens in background
- **Storage Permissions**: Safari users may see storage permission dialog (normal)
- **Internet Required**: Only for initial download and periodic updates

## [0.2.3] - 2025-12-05

### Added
- Trademark/credit token: Automatic token generation for Blood on the Clocktower attribution
  - Displays trademark text: "Blood on the Clocktower is a product of the Pandemonium Institute"
  - Generated automatically with every token set
  - Uses same styling as other character tokens
  - Filename: `botc_trademark.png`
  - Includes placeholder for future Pandemonium Institute logo (marked TBI)

## [0.1.0] - 2025-01-25

### Added
- Initial release of Blood on the Clocktower Token Generator
- Token generation from JSON scripts (custom and official BotC characters)
- Character and reminder token creation with customizable styling
- PDF export functionality at 300 DPI
- ZIP download for batch token export
- Customizable token diameters, backgrounds, fonts, and colors
- Setup flower overlay system for setup characters
- Curved text rendering for character names and reminders
- Filter and sort tokens by team, type, and reminder status
- Responsive UI with collapsible options panel
- Example scripts (Uncertain Death, Fall of Rome)
- GitHub repository link in header
- Version number display in header

### Technical
- TypeScript implementation with strict type checking
- Client-side rendering (no backend required)
- Support for CORS-restricted external images with graceful fallback
- CDN-based dependencies (jsPDF, JSZip, FileSaver.js)

[Unreleased]: https://github.com/Phauks/Clocktower_Token_Generator/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/Phauks/Clocktower_Token_Generator/compare/v0.2.3...v0.3.0
[0.2.3]: https://github.com/Phauks/Clocktower_Token_Generator/compare/v0.1.0...v0.2.3
[0.1.0]: https://github.com/Phauks/Clocktower_Token_Generator/releases/tag/v0.1.0
