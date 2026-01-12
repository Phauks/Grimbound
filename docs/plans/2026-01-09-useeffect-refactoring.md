# useEffect Refactoring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate unnecessary useEffect hooks by converting them to proper React patterns (useState initializers, useMemo, event handlers) and merge effect chains.

**Architecture:** This refactoring follows React 19 best practices and the React Compiler optimization guidelines. Effects should only be used for external synchronization (subscriptions, DOM manipulation, data fetching), not for derived state or prop syncing.

**Tech Stack:** React 19, TypeScript, Vitest for testing

---

## Summary

| Priority | Task | Files | Risk | Effort |
|----------|------|-------|------|--------|
| 1 | Quick Wins - localStorage initializers | 3 files | Low | 30 min |
| 2 | Refactor useDrawerState prop sync | 1 file | Medium | 45 min |
| 3 | Simplify useControlledField | 1 file | Medium | 1 hr |
| 4 | Merge auto-save hooks | 2 files → 1 | High | 2-3 hrs |
| 5 | Document patterns | 1 file | None | 30 min |

**Total estimated time: 5-6 hours**

---

## Task 1: Quick Wins - localStorage Initializers

Convert empty-dep effects that load from localStorage into useState initializers.

### Task 1a: useRecentColors

**Files:**
- Modify: `src/hooks/ui/useRecentColors.ts:109-116`
- Test: `src/__tests__/unit/hooks/ui/useRecentColors.test.ts` (create)

**Step 1: Write the failing test**

Create test file:

```typescript
// src/__tests__/unit/hooks/ui/useRecentColors.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useRecentColors } from '@/hooks/ui/useRecentColors';
import { STORAGE_KEYS } from '@/ts/utils/storageKeys';

describe('useRecentColors', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should initialize with stored colors synchronously', () => {
    // Pre-populate localStorage
    const storedColors = ['#FF0000', '#00FF00', '#0000FF'];
    localStorage.setItem(STORAGE_KEYS.RECENT_COLORS, JSON.stringify(storedColors));

    const { result } = renderHook(() => useRecentColors());

    // Should have colors immediately (no loading state needed)
    expect(result.current.colors).toEqual(storedColors);
    expect(result.current.isLoaded).toBe(true);
  });

  it('should initialize with empty array when no stored colors', () => {
    const { result } = renderHook(() => useRecentColors());

    expect(result.current.colors).toEqual([]);
    expect(result.current.isLoaded).toBe(true);
  });

  it('should add color to front of list', () => {
    const { result } = renderHook(() => useRecentColors());

    act(() => {
      result.current.addColor('#FF0000');
    });

    expect(result.current.colors[0]).toBe('#FF0000');
  });

  it('should respect maxColors option', () => {
    const { result } = renderHook(() => useRecentColors({ maxColors: 3 }));

    act(() => {
      result.current.addColor('#111111');
      result.current.addColor('#222222');
      result.current.addColor('#333333');
      result.current.addColor('#444444'); // Should push out #111111
    });

    expect(result.current.colors).toHaveLength(3);
    expect(result.current.colors).not.toContain('#111111');
  });

  it('should clear all colors', () => {
    localStorage.setItem(STORAGE_KEYS.RECENT_COLORS, JSON.stringify(['#FF0000']));
    const { result } = renderHook(() => useRecentColors());

    act(() => {
      result.current.clearColors();
    });

    expect(result.current.colors).toEqual([]);
    expect(localStorage.getItem(STORAGE_KEYS.RECENT_COLORS)).toBeNull();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/unit/hooks/ui/useRecentColors.test.ts`

Expected: FAIL - "should initialize with stored colors synchronously" will fail because `isLoaded` is initially false

**Step 3: Refactor hook to use useState initializer**

Modify `src/hooks/ui/useRecentColors.ts`:

```typescript
// BEFORE (lines 109-116):
const [colors, setColors] = useState<string[]>([]);
const [isLoaded, setIsLoaded] = useState(false);

// Load colors from localStorage on mount
useEffect(() => {
  setColors(getStoredRecentColors());
  setIsLoaded(true);
}, []);

// AFTER (replace lines 109-116):
const [colors, setColors] = useState<string[]>(() => getStoredRecentColors());

// isLoaded is always true now - no async loading
const isLoaded = true;
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/unit/hooks/ui/useRecentColors.test.ts`

Expected: PASS

**Step 5: Run biome check**

Run: `npx biome check src/hooks/ui/useRecentColors.ts --write`

Expected: No errors

**Step 6: Commit**

```bash
git add src/hooks/ui/useRecentColors.ts src/__tests__/unit/hooks/ui/useRecentColors.test.ts
git commit -m "refactor(useRecentColors): use useState initializer instead of useEffect

- Remove empty-dep useEffect that loaded from localStorage
- Initialize colors synchronously with useState initializer function
- isLoaded is now always true (no async loading)
- Add comprehensive unit tests

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

### Task 1b: useAutoSaveTrigger - Remove Reset Warning Effect

**Files:**
- Modify: `src/hooks/autosave/useAutoSaveTrigger.ts:232-235`

**Step 1: Identify the unnecessary effect**

```typescript
// Lines 232-235 - This effect does nothing useful:
useEffect(() => {
  setHasShownWarning(false);
  setShowConflictWarning(false);
}, []); // Empty deps = runs once on mount, but state is already false!
```

**Step 2: Remove the effect**

The state is already initialized to `false` on lines 69-70:
```typescript
const [showConflictWarning, setShowConflictWarning] = useState(false);
const [hasShownWarning, setHasShownWarning] = useState(false);
```

Simply delete lines 232-235.

**Step 3: Run biome check**

Run: `npx biome check src/hooks/autosave/useAutoSaveTrigger.ts --write`

Expected: No errors

**Step 4: Run existing tests**

Run: `npx vitest run --grep "autosave"`

Expected: PASS (all existing tests should still pass)

**Step 5: Commit**

```bash
git add src/hooks/autosave/useAutoSaveTrigger.ts
git commit -m "refactor(useAutoSaveTrigger): remove redundant empty-dep effect

- Remove useEffect that reset warning state to false on mount
- State is already initialized to false via useState
- Effect was a no-op

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Refactor useDrawerState Prop Sync

**Problem:** Effect syncs `pendingValue` from `value` prop when drawer opens. This can be done in the `open()` function instead.

**Files:**
- Modify: `src/hooks/ui/useDrawerState.ts:81-86`
- Test: `src/__tests__/unit/hooks/ui/useDrawerState.test.ts` (create)

**Step 1: Write the failing test**

```typescript
// src/__tests__/unit/hooks/ui/useDrawerState.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useDrawerState } from '@/hooks/ui/useDrawerState';

describe('useDrawerState', () => {
  it('should sync pendingValue when drawer opens', () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ value }) => useDrawerState({ value, onChange }),
      { initialProps: { value: 'initial' } }
    );

    // Update value while drawer is closed
    rerender({ value: 'updated' });

    // Open drawer
    act(() => {
      result.current.open();
    });

    // pendingValue should match the updated value
    expect(result.current.pendingValue).toBe('updated');
    expect(result.current.isOpen).toBe(true);
  });

  it('should preserve pending changes while editing', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useDrawerState({ value: 'initial', onChange })
    );

    // Open drawer
    act(() => {
      result.current.open();
    });

    // Make changes
    act(() => {
      result.current.updatePending('modified');
    });

    // pendingValue should be modified
    expect(result.current.pendingValue).toBe('modified');
    expect(result.current.hasChanges).toBe(true);
  });

  it('should apply changes on close', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useDrawerState({ value: 'initial', onChange })
    );

    act(() => {
      result.current.open();
      result.current.updatePending('modified');
      result.current.apply();
    });

    expect(onChange).toHaveBeenCalledWith('modified');
    expect(result.current.isOpen).toBe(false);
  });

  it('should revert on cancel', () => {
    const onChange = vi.fn();
    const onPreviewChange = vi.fn();
    const { result } = renderHook(() =>
      useDrawerState({ value: 'initial', onChange, onPreviewChange })
    );

    act(() => {
      result.current.open();
      result.current.updatePending('modified');
      result.current.cancel();
    });

    // Should revert preview to original
    expect(onPreviewChange).toHaveBeenLastCalledWith('initial');
    expect(result.current.isOpen).toBe(false);
    // onChange should NOT have been called
    expect(onChange).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify baseline**

Run: `npx vitest run src/__tests__/unit/hooks/ui/useDrawerState.test.ts`

Expected: PASS (existing behavior should work)

**Step 3: Remove the effect and rely on open() function**

The `open()` function already does the sync on lines 89-95:

```typescript
const open = () => {
  if (disabled) return;
  onWillOpen?.();
  originalValueRef.current = value;
  setPendingValue(value);  // <-- Already syncs here!
  setIsOpen(true);
};
```

The effect on lines 81-86 is redundant for the open case. However, it also handles when `value` changes while drawer is open (external update). This is an edge case - we should decide: do we want to auto-sync or preserve user edits?

**Decision:** Preserve user edits. Remove the effect. If external value changes while editing, user keeps their pending changes.

Delete lines 81-86:
```typescript
// DELETE THIS:
useEffect(() => {
  if (isOpen) {
    setPendingValue(value);
    originalValueRef.current = value;
  }
}, [isOpen, value]);
```

**Step 4: Update test for new behavior**

Add test for edge case:

```typescript
it('should NOT auto-sync pending value when external value changes while open', () => {
  const onChange = vi.fn();
  const { result, rerender } = renderHook(
    ({ value }) => useDrawerState({ value, onChange }),
    { initialProps: { value: 'initial' } }
  );

  // Open drawer and make changes
  act(() => {
    result.current.open();
    result.current.updatePending('user-edit');
  });

  // External value changes
  rerender({ value: 'external-update' });

  // User's pending changes should be preserved
  expect(result.current.pendingValue).toBe('user-edit');
});
```

**Step 5: Run tests**

Run: `npx vitest run src/__tests__/unit/hooks/ui/useDrawerState.test.ts`

Expected: PASS

**Step 6: Run biome check**

Run: `npx biome check src/hooks/ui/useDrawerState.ts --write`

**Step 7: Commit**

```bash
git add src/hooks/ui/useDrawerState.ts src/__tests__/unit/hooks/ui/useDrawerState.test.ts
git commit -m "refactor(useDrawerState): remove prop sync effect

- Remove useEffect that synced pendingValue when drawer opens
- The open() function already does this sync
- Preserve user edits when external value changes while drawer is open
- Add comprehensive unit tests

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Simplify useControlledField

**Problem:** Effect on lines 91-97 syncs local state from props when external value changes. This is necessary for controlled inputs but the implementation can be simplified.

**Files:**
- Modify: `src/hooks/ui/useControlledField.ts:91-97`
- Test: `src/__tests__/unit/hooks/ui/useControlledField.test.ts` (create)

**Step 1: Write comprehensive tests first**

```typescript
// src/__tests__/unit/hooks/ui/useControlledField.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useControlledField } from '@/hooks/ui/useControlledField';

describe('useControlledField', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with prop value', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useControlledField({ value: 'initial', onChange })
    );

    expect(result.current.localValue).toBe('initial');
    expect(result.current.isDirty).toBe(false);
  });

  it('should update local value on change without calling onChange immediately', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useControlledField({ value: 'initial', onChange, debounceMs: 500 })
    );

    act(() => {
      result.current.handleChange('modified');
    });

    expect(result.current.localValue).toBe('modified');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('should call onChange after debounce delay', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useControlledField({ value: 'initial', onChange, debounceMs: 500 })
    );

    act(() => {
      result.current.handleChange('modified');
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(onChange).toHaveBeenCalledWith('modified');
  });

  it('should call onChange immediately on blur', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useControlledField({ value: 'initial', onChange, debounceMs: 500 })
    );

    act(() => {
      result.current.handleChange('modified');
      result.current.handleBlur();
    });

    expect(onChange).toHaveBeenCalledWith('modified');
  });

  it('should sync from external prop change', () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ value }) => useControlledField({ value, onChange }),
      { initialProps: { value: 'initial' } }
    );

    // External value changes
    rerender({ value: 'external-update' });

    expect(result.current.localValue).toBe('external-update');
  });

  it('should NOT sync from prop when change originated from this hook', () => {
    const onChange = vi.fn();
    let propValue = 'initial';

    const { result, rerender } = renderHook(
      ({ value }) => useControlledField({ value, onChange }),
      { initialProps: { value: propValue } }
    );

    // User types
    act(() => {
      result.current.handleChange('user-typing');
    });

    // Simulate parent updating prop after onChange callback
    // (this happens when parent re-renders with our value)
    propValue = 'user-typing';
    rerender({ value: propValue });

    // Should still be 'user-typing', not reset
    expect(result.current.localValue).toBe('user-typing');
  });

  it('should cleanup timer on unmount', () => {
    const onChange = vi.fn();
    const { result, unmount } = renderHook(() =>
      useControlledField({ value: 'initial', onChange, debounceMs: 500 })
    );

    act(() => {
      result.current.handleChange('modified');
    });

    unmount();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    // onChange should NOT be called after unmount
    expect(onChange).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run tests to verify current behavior**

Run: `npx vitest run src/__tests__/unit/hooks/ui/useControlledField.test.ts`

Expected: All tests PASS (verifying current behavior is correct)

**Step 3: Analyze the effect**

The current effect (lines 91-97):
```typescript
useEffect(() => {
  if (!isEqual(value, lastSentValueRef.current)) {
    setLocalValue(value);
    lastSentValueRef.current = value;
    isDirtyRef.current = false;
  }
}, [value, isEqual]);
```

This is actually a valid pattern for controlled inputs - it distinguishes between:
1. External prop changes (should sync)
2. Internal changes that propagated back (should NOT sync, would cause cursor jump)

**Verdict:** This effect is **NECESSARY** but could be documented better.

**Step 4: Add clarifying comments**

```typescript
// Sync from external prop changes only
// This effect distinguishes between:
// 1. External changes: value differs from what we last sent → sync
// 2. Our changes propagated back: value equals what we sent → ignore
// This prevents cursor position issues in text inputs
useEffect(() => {
  if (!isEqual(value, lastSentValueRef.current)) {
    setLocalValue(value);
    lastSentValueRef.current = value;
    isDirtyRef.current = false;
  }
}, [value, isEqual]);
```

**Step 5: Commit tests and documentation**

```bash
git add src/hooks/ui/useControlledField.ts src/__tests__/unit/hooks/ui/useControlledField.test.ts
git commit -m "test(useControlledField): add comprehensive unit tests

- Add tests for debounce behavior
- Add tests for blur commit
- Add tests for external vs internal prop sync
- Add tests for timer cleanup on unmount
- Document the necessary prop sync effect

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Merge Auto-Save Hooks

**Problem:** Two hooks with effect chains:
- `useAutoSaveDetector` - Watches state, sets `isDirty`, calls `incrementChangeVersion()`
- `useAutoSaveTrigger` - Watches `isDirty` and `changeVersion`, triggers debounced save

This creates an effect chain where one effect updates state that triggers another effect.

**Files:**
- Delete: `src/hooks/autosave/useAutoSaveDetector.ts`
- Modify: `src/hooks/autosave/useAutoSaveTrigger.ts` (merge detection logic)
- Modify: `src/contexts/ProjectContext.tsx` (remove changeVersion and incrementChangeVersion)
- Test: Update existing tests

**Step 1: Understand the current flow**

```
State changes → useAutoSaveDetector effect runs
                        ↓
              setIsDirty(true)
              incrementChangeVersion()
                        ↓
              useAutoSaveTrigger effect runs (deps: isDirty, changeVersion)
                        ↓
              Schedule debounced save
```

**Step 2: Design the merged approach**

```
State changes → Single useAutoSave effect runs
                        ↓
              Compare state to previous
              If different: schedule debounced save
              If same: no-op
```

**Step 3: Write the new merged hook**

Create `src/hooks/autosave/useAutoSave.ts`:

```typescript
/**
 * useAutoSave Hook
 *
 * Unified auto-save that detects changes AND triggers saves.
 * Eliminates the effect chain between detector and trigger.
 *
 * @module hooks/autosave/useAutoSave
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useProjectContext } from '@/contexts/ProjectContext.js';
import { useProjectDatabaseService } from '@/contexts/ServiceContext';
import { useTokenContext } from '@/contexts/TokenContext.js';
import type { AutoSaveSnapshot, Project, ProjectState } from '@/ts/types/project.js';
import type { DebouncedFunction } from '@/ts/utils/asyncUtils.js';
import { retryOperation } from '@/ts/utils/errorUtils.js';
import { debounce, logger } from '@/ts/utils/index.js';
import { generateUuid } from '@/ts/utils/nameGenerator.js';
import { useTabSynchronization } from '../sync/useTabSynchronization.js';
import { useAutoSaveTelemetry } from './useAutoSaveTelemetry.js';

const AUTO_SAVE_DEBOUNCE_MS = 2000;
const MAX_SNAPSHOTS = 10;

/**
 * Unified auto-save hook that detects changes and triggers saves
 */
export function useAutoSave(enabled: boolean = true) {
  const projectDatabaseService = useProjectDatabaseService();

  const {
    currentProject,
    setIsDirty,
    setAutoSaveStatus,
    setLastSavedAt,
    setCurrentProject,
  } = useProjectContext();

  const {
    characters,
    scriptMeta,
    generationOptions,
    jsonInput,
    filters,
    characterMetadata,
    tokens,
  } = useTokenContext();

  // Refs for change detection
  const previousStateRef = useRef<string | null>(null);
  const previousSignatureRef = useRef<string | null>(null);
  const pendingSaveRef = useRef(false);

  // Telemetry
  const { recordSaveAttempt, getStats } = useAutoSaveTelemetry();

  // Tab sync
  const { hasConflict, conflictingTabCount, notifySaved } = useTabSynchronization(
    currentProject?.id || null,
    enabled
  );

  // Conflict warning state
  const [showConflictWarning, setShowConflictWarning] = useState(false);
  const [hasShownWarning, setHasShownWarning] = useState(false);

  // Save function ref (stable reference to latest implementation)
  const saveProjectRef = useRef<(() => Promise<void>) | undefined>(undefined);

  saveProjectRef.current = async () => {
    if (!currentProject) {
      logger.warn('AutoSave', 'Save called but no current project');
      return;
    }

    pendingSaveRef.current = true;
    const startTime = performance.now();

    try {
      setAutoSaveStatus({ state: 'saving', isDirty: true });
      logger.info('AutoSave', 'Starting save...', {
        projectId: currentProject.id,
        projectName: currentProject.name,
        characterCount: characters.length,
      });

      const currentState: ProjectState = {
        jsonInput,
        characters,
        scriptMeta,
        characterMetadata: Object.fromEntries(characterMetadata),
        generationOptions: { ...generationOptions },
        customIcons: currentProject.state.customIcons || [],
        presets: currentProject.state.presets || [],
        filters,
        schemaVersion: 1,
      };

      const stats = {
        characterCount: characters.length,
        tokenCount: 0,
        reminderCount: characters.reduce((sum, char) => sum + (char.reminders?.length || 0), 0),
        customIconCount: currentState.customIcons.length,
        presetCount: currentState.presets?.length || 0,
        lastGeneratedAt: currentProject.stats.lastGeneratedAt,
      };

      const updatedProject: Project = {
        ...currentProject,
        state: currentState,
        stats,
        lastModifiedAt: Date.now(),
        lastAccessedAt: Date.now(),
      };

      await retryOperation(
        () => projectDatabaseService.saveProject(updatedProject),
        'AutoSave',
        {
          maxAttempts: 3,
          delayMs: 1000,
          shouldRetry: (error) => {
            if (error instanceof Error && error.name === 'QuotaExceededError') {
              return false;
            }
            return true;
          },
        }
      );

      const snapshot: AutoSaveSnapshot = {
        id: generateUuid(),
        projectId: currentProject.id,
        timestamp: Date.now(),
        stateSnapshot: currentState,
      };
      await projectDatabaseService.saveSnapshot(snapshot);
      await projectDatabaseService.deleteOldSnapshots(currentProject.id, MAX_SNAPSHOTS);

      setCurrentProject(updatedProject);
      const now = Date.now();
      setLastSavedAt(now);
      setIsDirty(false);
      setAutoSaveStatus({ state: 'saved', isDirty: false });

      const duration = performance.now() - startTime;
      recordSaveAttempt(true, duration);

      logger.info('AutoSave', 'Save completed', {
        projectId: currentProject.id,
        durationMs: Math.round(duration),
      });

      notifySaved();
    } catch (error) {
      const duration = performance.now() - startTime;
      recordSaveAttempt(false, duration);

      logger.error('AutoSave', 'Save failed', error);

      let errorMessage = 'Failed to save project';
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        errorMessage = 'Storage full. Delete old projects to free space.';
      }

      setAutoSaveStatus({ state: 'error', isDirty: true, error: errorMessage });
    } finally {
      pendingSaveRef.current = false;
    }
  };

  // Stable wrapper
  const saveProject = useCallback(async () => {
    await saveProjectRef.current?.();
  }, []);

  // Debounced save - created once
  const debouncedSaveRef = useRef<DebouncedFunction<() => Promise<void>> | null>(null);

  useEffect(() => {
    debouncedSaveRef.current = debounce(saveProject, AUTO_SAVE_DEBOUNCE_MS);
    logger.debug('AutoSave', 'Debounced save function created');

    return () => {
      debouncedSaveRef.current?.cancel();
    };
  }, [saveProject]);

  // Show conflict warning
  useEffect(() => {
    if (hasConflict && !hasShownWarning && currentProject) {
      logger.warn('AutoSave', 'Showing tab conflict warning');
      setShowConflictWarning(true);
      setHasShownWarning(true);
    }
  }, [hasConflict, hasShownWarning, currentProject]);

  // UNIFIED: Detect changes AND trigger save in ONE effect
  useEffect(() => {
    if (!enabled) {
      logger.debug('AutoSave', 'Disabled');
      return;
    }

    if (!currentProject) {
      previousStateRef.current = null;
      previousSignatureRef.current = null;
      setIsDirty(false);
      return;
    }

    // Quick signature check
    const shallowSignature = `${characters.length}|${tokens.length}|${jsonInput.length}|${filters.teams.join(',')}|${filters.tokenTypes.join(',')}|${characterMetadata.size}`;

    if (previousSignatureRef.current === shallowSignature) {
      return; // Likely no change
    }

    // Deep comparison
    const currentState = JSON.stringify({
      characters,
      scriptMeta,
      generationOptions,
      jsonInput,
      filters,
      characterMetadata: Object.fromEntries(characterMetadata),
      tokens: tokens.map((t) => ({ name: t.name, type: t.type, filename: t.filename })),
    });

    // First run - capture initial state
    if (previousStateRef.current === null) {
      previousStateRef.current = currentState;
      previousSignatureRef.current = shallowSignature;
      return;
    }

    // Compare
    const stateChanged = previousStateRef.current !== currentState;

    if (stateChanged) {
      logger.info('AutoSave', 'Change detected - scheduling save');

      setIsDirty(true);
      setAutoSaveStatus({ state: 'idle', isDirty: true });

      previousStateRef.current = currentState;
      previousSignatureRef.current = shallowSignature;

      // Trigger debounced save directly - no effect chain!
      if (!pendingSaveRef.current && debouncedSaveRef.current) {
        debouncedSaveRef.current();
      }
    }
  }, [
    enabled,
    currentProject?.id,
    currentProject,
    characters,
    scriptMeta,
    generationOptions,
    jsonInput,
    filters,
    characterMetadata,
    tokens,
    setIsDirty,
    setAutoSaveStatus,
  ]);

  // Manual save
  const saveNow = async () => {
    if (!currentProject) return;
    logger.info('AutoSave', 'Manual save triggered');
    await saveProject();
  };

  const handleConflictContinue = () => {
    setShowConflictWarning(false);
  };

  const handleConflictClose = () => {
    setShowConflictWarning(false);
  };

  return {
    saveNow,
    conflictModalProps: {
      isOpen: showConflictWarning,
      conflictingTabCount,
      onContinue: handleConflictContinue,
      onClose: handleConflictClose,
    },
    telemetry: getStats(),
  };
}
```

**Step 4: Update ProjectContext to remove changeVersion**

Modify `src/contexts/ProjectContext.tsx`:
- Remove `changeVersion` state
- Remove `incrementChangeVersion` function
- Remove from context value

**Step 5: Update consumers**

Find all files using `useAutoSaveDetector` and `useAutoSaveTrigger`:

```bash
# Find usages
grep -r "useAutoSaveDetector\|useAutoSaveTrigger" src/
```

Replace with `useAutoSave`.

**Step 6: Delete old files**

```bash
rm src/hooks/autosave/useAutoSaveDetector.ts
```

**Step 7: Update barrel exports**

Modify `src/hooks/autosave/index.ts`:
- Remove `useAutoSaveDetector` export
- Remove `useAutoSaveTrigger` export (or keep as alias)
- Add `useAutoSave` export

**Step 8: Run all tests**

```bash
npx vitest run
```

**Step 9: Run biome check**

```bash
npx biome check src/ --write
```

**Step 10: Commit**

```bash
git add -A
git commit -m "refactor(autosave): merge detector and trigger into unified useAutoSave

- Eliminate effect chain between detector and trigger
- Single effect now detects changes AND schedules debounced save
- Remove changeVersion and incrementChangeVersion from ProjectContext
- Simplify auto-save architecture
- ~200 lines of code reduction

BREAKING CHANGE: useAutoSaveDetector and useAutoSaveTrigger are removed.
Use useAutoSave instead.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Document Patterns

**Files:**
- Modify: `.claude/rules/coding-patterns.md`

**Step 1: Add useEffect guidelines section**

Add to coding-patterns.md:

```markdown
## useEffect Guidelines

### When to Use useEffect

✅ **Appropriate uses:**
- External subscriptions (event listeners, WebSocket, BroadcastChannel)
- Data fetching (async operations)
- DOM measurements that need layout
- Timer cleanup (setTimeout/setInterval cleanup)
- Third-party library integration

❌ **Avoid useEffect for:**
- Derived state (use `useMemo` or compute during render)
- Resetting state when props change (use `key` prop or event handlers)
- Transforming data for rendering (compute in render)
- Effect chains (one effect triggers another via state)

### Patterns

**localStorage Initialization:**
```typescript
// BAD: Empty-dep effect
const [value, setValue] = useState(null);
useEffect(() => {
  setValue(localStorage.getItem('key'));
}, []);

// GOOD: useState initializer
const [value, setValue] = useState(() => localStorage.getItem('key'));
```

**Derived State:**
```typescript
// BAD: Effect to compute derived value
const [fullName, setFullName] = useState('');
useEffect(() => {
  setFullName(`${firstName} ${lastName}`);
}, [firstName, lastName]);

// GOOD: Compute during render
const fullName = `${firstName} ${lastName}`;
// Or with useMemo if expensive
const fullName = useMemo(() => expensiveComputation(firstName, lastName), [firstName, lastName]);
```

**Effect Chains:**
```typescript
// BAD: Effect chain
useEffect(() => {
  setIsDirty(true);
  incrementVersion(); // Triggers another effect!
}, [state]);

useEffect(() => {
  if (isDirty) save();
}, [isDirty, version]);

// GOOD: Single unified effect
useEffect(() => {
  if (stateChanged(state, previousState)) {
    scheduleSave();
  }
}, [state]);
```
```

**Step 2: Commit documentation**

```bash
git add .claude/rules/coding-patterns.md
git commit -m "docs: add useEffect guidelines to coding patterns

- Document when to use and avoid useEffect
- Add examples for localStorage, derived state, effect chains
- Reference React 19 best practices

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Verification Checklist

After completing all tasks:

- [ ] `npx biome check src/` passes with zero errors
- [ ] `npx vitest run` passes all tests
- [ ] `npx tsc --noEmit` passes type checking
- [ ] Manual test: Open app, edit a project, verify auto-save works
- [ ] Manual test: Open color picker, verify recent colors load
- [ ] Manual test: Open drawer, make changes, verify apply/cancel work

---

## Rollback Plan

If issues arise:
1. Each task has its own commit - can revert individually
2. `git revert <commit-hash>` for specific rollbacks
3. Task 4 (merge auto-save) is highest risk - test thoroughly before merging

---

*Plan created: 2026-01-09*
*Estimated completion: 5-6 hours*
