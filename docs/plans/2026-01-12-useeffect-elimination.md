# useEffect Elimination Plan

**Date**: 2026-01-12
**Goal**: Reduce useEffect usage from 183 to ~93 (~49% reduction)
**Status**: In Progress

---

## Overview

This plan systematically eliminates unnecessary useEffect calls following React's "You Might Not Need an Effect" guidelines.

---

## Phase 1: useState Initializers (Target: -15 effects)

Replace empty-dependency effects that read from localStorage/compute initial values with useState initializer functions.

### 1.1 useAutoSavePreference.ts
- **File**: `src/hooks/autosave/useAutoSavePreference.ts`
- **Lines**: 36-50
- **Current**: useEffect reads localStorage on mount
- **Change**: Move to useState initializer
- **Risk**: Low

### 1.2 useResizableSidebar.ts
- **File**: `src/hooks/ui/useResizableSidebar.ts`
- **Current**: useEffect reads localStorage for sidebar width
- **Change**: Move to useState initializer
- **Risk**: Low

### 1.3 useAutoSaveTelemetry.ts (if applicable)
- **File**: `src/hooks/autosave/useAutoSaveTelemetry.ts`
- **Current**: Check for localStorage initialization pattern
- **Change**: Move to useState initializer if found
- **Risk**: Low

---

## Phase 2: Parent Notification Elimination (Target: -9 effects)

Move parent callback invocations from useEffect to the event handlers that cause the state change.

### 2.1 CharactersView.tsx - onCharacterSelect
- **File**: `src/components/Views/CharactersView.tsx`
- **Lines**: 193-198
- **Current**:
  ```typescript
  useEffect(() => {
    if (onCharacterSelect && selectedCharacterUuid) {
      onCharacterSelect(selectedCharacterUuid);
    }
  }, [selectedCharacterUuid, onCharacterSelect]);
  ```
- **Change**: Call `onCharacterSelect` directly in `handleSelectCharacter`
- **Risk**: Low

### 2.2 CharactersView.tsx - External UUID sync
- **File**: `src/components/Views/CharactersView.tsx`
- **Lines**: 186-191
- **Current**: Effect syncs externalSelectedUuid to local state
- **Change**: Use externalSelectedUuid directly OR handle in parent
- **Risk**: Medium (need to verify all call sites)

---

## Phase 3: Derived State Elimination (Target: -8 effects)

Replace effects that compute derived values with direct computation during render.

### 3.1 GameplayTabContent.tsx - Setup text sync
- **File**: `src/components/ViewComponents/CharactersComponents/TokenEditor/GameplayTabContent.tsx`
- **Lines**: 498-502
- **Current**:
  ```typescript
  useEffect(() => {
    if (abilitySplit) {
      setLocalSetupText(abilitySplit.setupContent);
    }
  }, [abilitySplit]);
  ```
- **Change**: Compute `localSetupText` during render, remove state
- **Risk**: Low

### 3.2 GameplayTabContent.tsx - Auto-detect setup
- **File**: `src/components/ViewComponents/CharactersComponents/TokenEditor/GameplayTabContent.tsx`
- **Lines**: 505-513
- **Current**: Effect auto-detects setup brackets and sets state
- **Change**: Handle in onChange handler instead
- **Risk**: Medium

---

## Phase 4: Controlled Input Refactoring (Target: -20 effects)

Use `key` prop pattern to remount components instead of syncing props to local state.

### 4.1 TokenEditor key prop
- **File**: `src/components/Views/CharactersView.tsx`
- **Change**: Add `key={selectedCharacterUuid}` to TokenEditor
- **Effect**: Eliminates need for prop sync in TokenEditor children
- **Risk**: Medium (verify no side effects from remounting)

### 4.2 MetaEditor key prop
- **File**: `src/components/Views/CharactersView.tsx`
- **Change**: Add `key={scriptMeta?.id ?? 'no-meta'}` to MetaEditor
- **Effect**: Eliminates prop sync effects in MetaEditor
- **Risk**: Low

### 4.3 Remove useControlledField sync effect
- **File**: `src/hooks/ui/useControlledField.ts`
- **Lines**: 96-102
- **Current**: Effect syncs value prop to local state
- **Change**: With key pattern, this effect becomes unnecessary for most uses
- **Note**: May need to keep for components that CAN'T use key pattern
- **Risk**: High (widely used hook)

### 4.4 SettingsDrawer consolidation
- **File**: `src/components/Shared/Drawer/SettingsDrawer.tsx`
- **Current**: 6 separate effects for prop syncing
- **Change**: Use useDrawerState pattern OR key prop on drawer content
- **Risk**: Medium

### 4.5 ColorPreviewSelector consolidation
- **File**: `src/components/Shared/Selectors/ColorPreviewSelector.tsx`
- **Current**: 5 effects
- **Change**: Consolidate prop sync, use key pattern where applicable
- **Risk**: Medium

### 4.6 MetaEditor field syncing
- **File**: `src/components/ViewComponents/CharactersComponents/MetaEditor.tsx`
- **Current**: 4 effects syncing individual fields
- **Change**: With key prop, these become unnecessary
- **Risk**: Low (once key prop is added)

---

## Phase 5: Async Generation Event-Driven (Target: -10 effects)

Move async operations from effects to event handlers.

### 5.1 useTokenPreviewCache.ts - Regeneration effect
- **File**: `src/hooks/tokens/useTokenPreviewCache.ts`
- **Lines**: 186-228
- **Current**: Effect regenerates preview when character/options change
- **Change**:
  - Generate in `applyCachedTokens` (selection handler)
  - Generate in options apply handler
  - Keep effect ONLY for decoratives live preview (user is actively editing)
- **Risk**: High (core functionality)

### 5.2 CharactersView.tsx - Jinx generation
- **File**: `src/components/Views/CharactersView.tsx`
- **Lines**: 252-312
- **Current**: Effect generates jinx token when preview data changes
- **Change**: Generate in `handlePreviewJinx` handler
- **Risk**: Medium

### 5.3 CharactersView.tsx - Clear jinx on character change
- **File**: `src/components/Views/CharactersView.tsx`
- **Lines**: 315-322
- **Current**: Effect clears jinx preview when character changes
- **Change**: Clear in `handleSelectCharacter` handler
- **Risk**: Low

---

## Phase 6: Effect Consolidation (Target: -10 effects)

Combine multiple related effects into single effects.

### 6.1 UnifiedSettingsBox.tsx
- **File**: `src/components/Shared/Selectors/UnifiedSettingsBox.tsx`
- **Current**: 4 effects (prop sync, position calc, click outside, scroll)
- **Change**: Combine click outside + scroll into single subscription effect
- **Risk**: Low

### 6.2 useExpandablePanel.ts
- **File**: `src/hooks/ui/useExpandablePanel.ts`
- **Current**: 3 effects
- **Change**: Review and consolidate where possible
- **Risk**: Low

### 6.3 useAutoResizeTextarea.ts
- **File**: `src/hooks/ui/useAutoResizeTextarea.ts`
- **Current**: 3 effects
- **Change**: Consolidate resize logic
- **Risk**: Low

---

## Phase 7: CodeMirror Optimization (Target: -3 effects)

### 7.1 useCodeMirrorEditor.ts
- **File**: `src/hooks/editors/useCodeMirrorEditor.ts`
- **Current**: 5 effects
- **Change**:
  - Combine initialization + cleanup (1 effect)
  - Combine value sync + extension updates (1 effect)
  - Keep focus effect if needed (1 effect)
- **Target**: 2-3 effects
- **Risk**: Medium (third-party integration)

---

## Verification Checklist

After each phase, verify:
- [ ] `npm run build` succeeds
- [ ] `npm run test` passes
- [ ] `npx biome check src/` passes
- [ ] Manual testing of affected features

---

## Execution Order

1. Phase 1 (Quick wins - lowest risk)
2. Phase 3 (Derived state - isolated changes)
3. Phase 2 (Parent notifications - straightforward)
4. Phase 6 (Consolidation - low risk)
5. Phase 4 (Key prop pattern - medium risk, high impact)
6. Phase 5 (Event-driven - higher risk)
7. Phase 7 (CodeMirror - specialized)

---

## Progress Tracking

| Phase | Target Reduction | Actual | Status |
|-------|-----------------|--------|--------|
| 1 | -15 | -1 | Complete (most files already use initializers) |
| 2 | -9 | -2 | Complete (parent notification + jinx clear) |
| 3 | -8 | -1 | Complete (auto-detect setup moved to handler) |
| 4 | -20 | 0 | Complete (key prop improves state management, but doesn't eliminate effects) |
| 5 | -10 | -1 | Complete (jinx generation moved to event handler) |
| 6 | -10 | -5 | Complete (UnifiedSettingsBox + useExpandablePanel consolidated) |
| 7 | -3 | -1 | Complete (disabled + placeholder effects combined) |
| 8 | N/A | -3 | Complete (state-during-render pattern for prop sync) |
| 9 | N/A | -7 | Complete (additional state-during-render conversions) |
| **Total** | **-75 to -90** | **-21** | 183 → 161 (12% reduction) |

### Phase 8: State-During-Render Pattern

Refactored prop sync effects to use React's "adjusting state during render" pattern:
- **useControlledField.ts**: Replaced useEffect with render-time state comparison
- **useControlledFields.ts**: Same pattern for multi-field version
- **useExpandablePanel.ts**: Replaced prop sync effect
- **UnifiedSettingsBox.tsx**: Replaced prop sync effect

This pattern is:
- Faster (synchronous, no extra render cycle)
- The officially recommended React pattern for "reset state when prop changes"
- Cleaner code (no effect dependency array concerns)

### Phase 9: Additional State-During-Render Conversions

Extended the state-during-render pattern to more files:
- **StudioView.tsx**: `borderOptions` sync to local `borderWidth`/`borderColor`
- **EditPresetModal.tsx**: `preset` prop sync to form fields
- **GameplayTabContent.tsx**: `initialOrder` sync and `abilitySplit` sync
- **DeleteProjectModal.tsx**: `isOpen` reset to clear error state
- **useGroupedReminders.ts**: `initialReminders` sync to local state
- **CharacterSelector.tsx**: `searchTerm` change resets `highlightedIndex`

### Notes on Phase 4

The key prop pattern was found to be less impactful than expected because:
1. ~~Prop sync effects in `useControlledField` are **necessary** for controlled inputs~~ → **Refactored in Phase 8**
2. Many effects in child components handle same-entity changes (not entity switches), which key prop doesn't help with
3. The key prop is still valuable for cleaner state management on character switch

---

## Rollback Plan

Each phase should be a separate commit. If issues arise:
1. Revert the problematic commit
2. Document the issue
3. Revise approach before retrying
