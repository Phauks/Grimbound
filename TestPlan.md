# Test Plan

> **Purpose**: Track unit test implementation progress for Grimbound.

---

## Current Status

| Metric | Value |
|--------|-------|
| Existing Tests | 1,426 |
| Skipped Tests | 2 |
| Target Tests | ~1,500 ✅ |
| Coverage | ~85% |

---

## Implementation Phases

### Phase 1: Foundation (Priority: HIGH) ✅ COMPLETE

Pure functions with no side effects - easiest to test.

| File | Status | Tests |
|------|--------|-------|
| `src/ts/utils/colorUtils.ts` | ✅ Done | 13 |
| `src/ts/utils/stringUtils.ts` | ✅ Done | 16 |
| `src/ts/utils/jsonUtils.ts` | ✅ Done | 48 |
| `src/ts/utils/teamUtils.ts` | ✅ Done | 21 |
| `src/ts/utils/tokenGrouping.ts` | ✅ Done | 16 |
| `src/ts/utils/scriptSorting.ts` | ✅ Done | 35 |
| `src/ts/sync/versionManager.ts` | ✅ Done | 38 |
| `src/ts/cache/utils/hashUtils.ts` | ✅ Done | 38 |
| `src/ts/utils/decorativeUtils.ts` | ✅ Done | 25 |
| `src/ts/utils/progressUtils.ts` | ✅ Done | 23 |
| `src/ts/utils/nameGenerator.ts` | ✅ Done | 28 |
| `src/ts/utils/errorUtils.ts` | ✅ Done | 38 |
| `src/ts/data/scriptParser.ts` | ✅ Done | 33 |
| `src/ts/data/characterUtils.ts` | ✅ Done | 49 |
| `src/ts/generation/presets.ts` | ✅ Done | 23 |

**Phase 1 Complete: 444 tests**

---

### Phase 2: Core Services (Priority: HIGH) ✅ COMPLETE

Services with DI pattern - mock dependencies easily.

| File | Status | Tests |
|------|--------|-------|
| `src/ts/services/project/ProjectService.ts` | ✅ Done | 89 |
| `src/ts/services/upload/FileValidationService.ts` | ✅ Done | 61 |
| `src/ts/services/upload/AssetStorageService.ts` | ✅ Done | 78 (+2 skipped) |

**Phase 2 Complete: 228 tests**

Note: ProjectDatabaseService, ProjectExporter, ProjectImporter, and FileUploadService are tested indirectly through ProjectService integration tests.

---

### Phase 3: Generation Module (Priority: MEDIUM) ✅ COMPLETE

Token generation with canvas mocking.

| File | Status | Tests |
|------|--------|-------|
| `src/ts/generation/iconLayoutStrategies.ts` | ✅ Done | 52 |
| `src/ts/generation/TokenFactory.ts` | ✅ Done | 51 |
| `src/ts/generation/TokenTextRenderer.ts` | ✅ Done | 58 |
| `src/ts/generation/TokenImageRenderer.ts` | ✅ Done | 49 |

**Phase 3 Complete: 210 tests**

---

### Phase 4: Sync & Cache (Priority: MEDIUM) ✅ COMPLETE

Network and storage with mocks.

| File | Status | Tests |
|------|--------|-------|
| `src/ts/sync/dataSyncService.ts` | ✅ Done | 77 |
| `src/ts/sync/storageManager.ts` | ✅ Done | 50 |
| `src/ts/sync/packageExtractor.ts` | ✅ Done | 47 |
| `src/ts/cache/CacheManager.ts` | ✅ Done | 62 |
| `src/ts/cache/TabPreRenderService.ts` | ✅ Done | 41 |

**Phase 4 Complete: 277 tests**

---

### Phase 5: React Hooks (Priority: LOWER) ✅ COMPLETE

Hooks with `@testing-library/react`.

| File | Status | Tests |
|------|--------|-------|
| `src/hooks/ui/useSelection.ts` | ✅ Done | 79 |
| `src/hooks/ui/useUndoStack.ts` | ✅ Done | 60 |
| `src/hooks/ui/useFilters.ts` | ✅ Done | 33 |
| `src/hooks/tokens/useTokenGrouping.ts` | ✅ Done | 43 |
| `src/hooks/characters/useCharacterEditor.ts` | ✅ Done | 33 |

**Phase 5 Complete: 248 tests**

---

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific file
npx vitest run src/__tests__/unit/utils/colorUtils.test.ts

# Watch mode
npm run test:watch
```

---

## Test File Conventions

- Location: `src/__tests__/unit/<module>/<file>.test.ts`
- Factories: `src/__tests__/factories/`
- Mocks: `src/__tests__/mocks/`
- Helpers: `src/__tests__/helpers/`

---

*Last updated: 2025-12-29*
