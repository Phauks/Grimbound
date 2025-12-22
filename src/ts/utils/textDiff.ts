/**
 * Text Diff Utility
 *
 * Provides word-level text diffing for comparing character fields
 * across project versions. Uses Longest Common Subsequence (LCS)
 * algorithm for accurate word-level diff highlighting.
 */

// ==========================================================================
// Types
// ==========================================================================

/** A single segment in a diff result */
export interface DiffSegment {
  type: 'added' | 'removed' | 'unchanged';
  text: string;
}

/** Result of comparing two text strings */
export interface TextDiffResult {
  segments: DiffSegment[];
  hasChanges: boolean;
}

/** Result of comparing two arrays */
export interface ArrayDiffResult<T> {
  added: T[];
  removed: T[];
  unchanged: T[];
  hasChanges: boolean;
}

// ==========================================================================
// Text Diffing
// ==========================================================================

/**
 * Compare two text strings at word level
 *
 * @param oldText - Previous version of text
 * @param newText - New version of text
 * @returns Diff result with segments marked as added/removed/unchanged
 */
export function diffText(oldText: string | undefined, newText: string | undefined): TextDiffResult {
  const oldStr = oldText ?? '';
  const newStr = newText ?? '';

  // Quick equality check
  if (oldStr === newStr) {
    return {
      segments: oldStr ? [{ type: 'unchanged', text: oldStr }] : [],
      hasChanges: false,
    };
  }

  // Tokenize into words (preserving whitespace in output)
  const oldWords = tokenize(oldStr);
  const newWords = tokenize(newStr);

  // Find LCS (longest common subsequence)
  const lcs = findLCS(oldWords, newWords);

  // Build diff segments using LCS
  const segments = buildDiffSegments(oldWords, newWords, lcs);

  return {
    segments,
    hasChanges: true,
  };
}

/**
 * Tokenize text into words, preserving word boundaries
 */
function tokenize(text: string): string[] {
  // Split on word boundaries but keep the words
  // This regex matches sequences of word characters or non-word characters
  return text.match(/\S+|\s+/g) || [];
}

/**
 * Find the Longest Common Subsequence of two arrays
 * Returns array of indices pairs [oldIndex, newIndex]
 */
function findLCS(oldArr: string[], newArr: string[]): Array<[number, number]> {
  const m = oldArr.length;
  const n = newArr.length;

  // Build LCS length table
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldArr[i - 1] === newArr[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find the actual LCS indices
  const result: Array<[number, number]> = [];
  let i = m;
  let j = n;

  while (i > 0 && j > 0) {
    if (oldArr[i - 1] === newArr[j - 1]) {
      result.unshift([i - 1, j - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return result;
}

/**
 * Build diff segments from old/new arrays and LCS
 */
function buildDiffSegments(
  oldWords: string[],
  newWords: string[],
  lcs: Array<[number, number]>
): DiffSegment[] {
  const segments: DiffSegment[] = [];

  let oldIdx = 0;
  let newIdx = 0;
  let lcsIdx = 0;

  while (oldIdx < oldWords.length || newIdx < newWords.length) {
    const lcsItem = lcs[lcsIdx];

    // Check if current positions match LCS
    if (lcsItem && oldIdx === lcsItem[0] && newIdx === lcsItem[1]) {
      // This word is unchanged
      addSegment(segments, 'unchanged', oldWords[oldIdx]);
      oldIdx++;
      newIdx++;
      lcsIdx++;
    } else {
      // Handle removed words (in old but not in LCS at this position)
      while (oldIdx < oldWords.length && (!lcsItem || oldIdx < lcsItem[0])) {
        addSegment(segments, 'removed', oldWords[oldIdx]);
        oldIdx++;
      }

      // Handle added words (in new but not in LCS at this position)
      while (newIdx < newWords.length && (!lcsItem || newIdx < lcsItem[1])) {
        addSegment(segments, 'added', newWords[newIdx]);
        newIdx++;
      }
    }
  }

  return mergeSegments(segments);
}

/**
 * Add a segment, potentially merging with the last one if same type
 */
function addSegment(segments: DiffSegment[], type: DiffSegment['type'], text: string): void {
  segments.push({ type, text });
}

/**
 * Merge adjacent segments of the same type for cleaner output
 */
function mergeSegments(segments: DiffSegment[]): DiffSegment[] {
  if (segments.length === 0) return [];

  const merged: DiffSegment[] = [];
  let current = { ...segments[0] };

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.type === current.type) {
      current.text += seg.text;
    } else {
      merged.push(current);
      current = { ...seg };
    }
  }
  merged.push(current);

  return merged;
}

// ==========================================================================
// Array Diffing
// ==========================================================================

/**
 * Compare two arrays and return added/removed/unchanged items
 *
 * @param oldArr - Previous version of array
 * @param newArr - New version of array
 * @returns Diff result with items categorized
 */
export function diffArrays<T>(
  oldArr: T[] | undefined,
  newArr: T[] | undefined
): ArrayDiffResult<T> {
  const old = oldArr ?? [];
  const current = newArr ?? [];

  // Convert to sets for O(1) lookup (using JSON.stringify for complex objects)
  const serialize = (item: T): string => (typeof item === 'string' ? item : JSON.stringify(item));

  const oldSet = new Map(old.map((item) => [serialize(item), item]));
  const newSet = new Map(current.map((item) => [serialize(item), item]));

  const added: T[] = [];
  const removed: T[] = [];
  const unchanged: T[] = [];

  // Find removed and unchanged
  for (const [key, item] of oldSet) {
    if (newSet.has(key)) {
      unchanged.push(item);
    } else {
      removed.push(item);
    }
  }

  // Find added
  for (const [key, item] of newSet) {
    if (!oldSet.has(key)) {
      added.push(item);
    }
  }

  return {
    added,
    removed,
    unchanged,
    hasChanges: added.length > 0 || removed.length > 0,
  };
}

// ==========================================================================
// Value Comparison
// ==========================================================================

/**
 * Check if two values are different
 * Handles primitives, arrays, and objects
 *
 * @param oldVal - Previous value
 * @param newVal - New value
 * @returns True if values are different
 */
export function valuesAreDifferent(oldVal: unknown, newVal: unknown): boolean {
  // Handle undefined/null
  if (oldVal === undefined && newVal === undefined) return false;
  if (oldVal === null && newVal === null) return false;
  if (oldVal === undefined || oldVal === null) return newVal !== undefined && newVal !== null;
  if (newVal === undefined || newVal === null) return true;

  // Handle primitives
  if (typeof oldVal !== typeof newVal) return true;
  if (typeof oldVal !== 'object') return oldVal !== newVal;

  // Handle arrays and objects via JSON comparison
  try {
    return JSON.stringify(oldVal) !== JSON.stringify(newVal);
  } catch {
    return true; // If serialization fails, assume different
  }
}

/**
 * Format a value for display in diff view
 *
 * @param value - Value to format
 * @returns Human-readable string representation
 */
export function formatValueForDisplay(value: unknown): string {
  if (value === undefined || value === null) return '(none)';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value || '(empty)';
  if (Array.isArray(value)) {
    if (value.length === 0) return '(none)';
    return value.join(', ');
  }
  return JSON.stringify(value);
}
