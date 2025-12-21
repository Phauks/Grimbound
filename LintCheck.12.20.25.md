# Lint Check Report - December 20, 2025

**Repository:** Clocktower Token Generator
**Tool:** Biome 2.3.9
**Files Checked:** 496

---

## Summary

| Metric | Standard Config | Strict Config |
|--------|-----------------|---------------|
| Errors | 12 | 86 |
| Warnings | 123 | 199 |
| Complexity Violations | 0 (disabled) | 100 |

---

## Critical Refactoring Needed (Highest Complexity)

These functions have **excessive cognitive complexity** (max allowed: 15):

| File | Line | Complexity | Priority |
|------|------|------------|----------|
| `ProjectEditor.tsx` | 46 | **63** | Critical |
| `CharacterListView.tsx` | 271 | **51** | Critical |
| `batchGenerator.ts` | 71 | **51** | Critical |
| `AssetPreviewSelector.tsx` | 145 | **48** | Critical |
| `nightOrderSync.ts` | 123 | **46** | Critical |
| `TokenGenerator.ts` | 384 | **44** | Critical |
| `OfficialCharacterDrawer.tsx` | 221 | **42** | Critical |
| `iconBorderRenderer.ts` | 202, 304 | **39** | High |
| `QRCodeSettingsSelector.tsx` | 330 | **36** | High |
| `scriptParser.ts` | 129 | **34** | High |
| `FileValidationService.ts` | 28 | **33** | High |
| `CharacterDecorativesPanel.tsx` | 71 | **30** | High |
| `GameplayTabContent.tsx` | 50 | **30** | High |
| `TabPreRenderService.ts` | 460 | **30** | High |
| `pdfGenerator.ts` | 270 | **29** | Medium |
| `DownloadsDrawer.tsx` | 75 | **28** | Medium |
| `CharacterTab.tsx` | 19 | **28** | Medium |
| `AssetManagerModal.tsx` | 416 | **28** | Medium |
| `ProjectHistoryModal.tsx` | 37 | **27** | Medium |

---

## Code Quality Issues (Current Warnings)

| Rule | Count | Impact | Auto-fixable |
|------|-------|--------|--------------|
| `noUnusedVariables` | 27 | Dead code | Yes |
| `noExplicitAny` | 22 | Type safety | No |
| `useKeyWithClickEvents` | 22 | Accessibility | No |
| `useExhaustiveDependencies` | 17 | React hooks bugs | No |
| `noUnusedPrivateClassMembers` | 12 | Dead code | Yes |
| `useOptionalChain` | 8 | Code simplification | Yes |
| `noStaticElementInteractions` | 8 | Accessibility | No |
| `useImportType` | 3 | Bundle optimization | Yes |
| `noUnusedFunctionParameters` | 2 | Dead code | Yes |

---

## Files Most Needing Attention

**Top 10 files by issue count:**

1. **`StudioView.tsx`** - 12 warnings (unused vars, a11y, deps)
2. **`useCodeMirrorEditor.ts`** - 10 warnings (unused private members, deps)
3. **`ProjectEditor.tsx`** - 8 warnings + complexity 63
4. **`TokenGenerator.ts`** - 5 warnings + complexity 44
5. **`useExportDownloads.ts`** - 5 warnings
6. **`SpecialItemsEditor.tsx`** - 5 warnings
7. **`GameplayTabContent.tsx`** - 5 warnings + complexity 30
8. **`JsonTabContent.tsx`** - 4 warnings
9. **`ExportView.tsx`** - 4 warnings
10. **`AppShell.tsx`** - 3 unused handlers

---

## Hidden Issues (Rules Currently Disabled in biome.json)

| Rule | Violations When Enabled | Reason Disabled |
|------|------------------------|-----------------|
| `noExcessiveCognitiveComplexity` | 100 | Legacy code complexity |
| `noConsole` | 16 | Should use `logger` |
| `noNonNullAssertion` | Unknown | TypeScript strictness |
| `noSvgWithoutTitle` | 8 | Accessibility |
| `noControlCharactersInRegex` | 19 | Intentional regex patterns |

---

## Refactoring Priority Tiers

### Tier 1 - Break Apart Immediately (Complexity > 40)

| File | Function/Component | Complexity | Suggested Action |
|------|-------------------|------------|------------------|
| `ProjectEditor.tsx:46` | Main component | 63 | Extract sub-components, use composition |
| `CharacterListView.tsx:271` | Render function | 51 | Split into smaller render functions |
| `batchGenerator.ts:71` | `generateAllTokens` | 51 | Decompose into pipeline stages |
| `AssetPreviewSelector.tsx:145` | Main component | 48 | Extract conditional logic to hooks |
| `nightOrderSync.ts:123` | Sync function | 46 | Use state machine pattern |
| `TokenGenerator.ts:384` | Token generation | 44 | Already uses Strategy - extend it |
| `OfficialCharacterDrawer.tsx:221` | Drawer component | 42 | Extract to custom hooks |

### Tier 2 - Important (Complexity 30-40)

- `iconBorderRenderer.ts:202,304` - Complex rendering logic
- `QRCodeSettingsSelector.tsx:330` - Too many UI conditionals
- `scriptParser.ts:129` - Complex parsing logic
- `FileValidationService.ts:28` - Validation complexity
- `CharacterDecorativesPanel.tsx:71` - UI complexity
- `GameplayTabContent.tsx:50` - Form complexity
- `TabPreRenderService.ts:460` - Cache logic

### Tier 3 - Clean Up Unused Code

**Unused Variables (27 total):**
- `AppShell.tsx`: `handleNavigateToCharacters`, `handleNavigateToProjects`, `handleCreateProject`
- `StudioView.tsx`: Multiple unused state variables and handlers
- Various components with unused imports/variables

**Unused Private Class Members (12 total):**
- `useCodeMirrorEditor.ts`: Unused editor methods
- Various service classes

**Unused Function Parameters (2 total):**
- Callback functions with unused event parameters

---

## Parsing Errors

The following CSS files have parsing issues:
- `src/styles/components/shared/CodeMirrorEditor.module.css`
- `src/styles/components/views/ExportDownloads.module.css`

---

## Recommendations

1. **Enable `noExcessiveCognitiveComplexity`** with threshold 25 initially, reduce to 15 over time
2. **Enable `noConsole`** and migrate remaining `console.*` calls to `logger`
3. **Run `biome check --write`** to auto-fix:
   - Import organization
   - Optional chaining
   - Import type annotations
4. **Prioritize Tier 1 refactoring** for most complex files
5. **Add pre-commit hook** to prevent new complexity violations

---

## Commands Used

```bash
# Standard lint check
npx biome check ./src

# Lint summary
npx biome lint ./src --reporter=summary

# Strict check (with complexity enabled)
npx biome lint ./src --config-path=biome-strict.json

# TypeScript check
npx tsc --noEmit
```

---

*Generated: December 20, 2025*
