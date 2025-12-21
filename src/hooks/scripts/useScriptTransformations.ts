/**
 * useScriptTransformations Hook
 *
 * Handles script JSON analysis and transformation operations including:
 * - Format detection and fixing
 * - SAO sorting
 * - Script condensing
 * - Night reminder format normalization
 *
 * Extracted from JsonView for better separation of concerns and testability.
 *
 * @module hooks/scripts/useScriptTransformations
 */

import { useCallback, useMemo } from 'react';
import { useTokenContext } from '@/contexts/TokenContext';
import { useScriptData } from './useScriptData.js';
import {
  analyzeReminderText,
  condenseScript,
  hasCondensableReferences,
  isScriptJsonSortedBySAO,
  logger,
  normalizeReminderText,
  sortScriptJsonBySAO,
} from '@/ts/utils/index.js';
import type { Character } from '@/ts/types/index.js';

export interface FormatIssue {
  characterName: string;
  field: 'firstNightReminder' | 'otherNightReminder';
  issues: ReturnType<typeof analyzeReminderText>;
}

export interface FormatIssuesSummary {
  issuesFound: FormatIssue[];
  uniqueIssueTypes: string[];
  totalCharactersAffected: number;
  totalIssues: number;
}

export interface ScriptAnalysis {
  /** Whether the script is sorted by Standard Amy Order */
  isScriptSorted: boolean;
  /** Whether the JSON needs formatting (minified or poorly indented) */
  needsFormatting: boolean;
  /** Whether the script has condensable character references */
  hasCondensableRefs: boolean;
  /** Summary of non-standard format issues in night reminders */
  formatIssuesSummary: FormatIssuesSummary | null;
}

export interface ScriptTransformationHandlers {
  /** Format JSON with proper indentation */
  handleFormat: () => Promise<void>;
  /** Sort script by Standard Amy Order */
  handleSort: () => Promise<void>;
  /** Condense object references to string format */
  handleCondenseScript: () => Promise<void>;
  /** Fix non-standard formats in night reminders */
  handleFixFormats: () => Promise<void>;
}

export interface UseScriptTransformationsResult extends ScriptAnalysis, ScriptTransformationHandlers {
  /** Trigger force regeneration after transformations */
  triggerRegenerate: () => void;
}

/**
 * Analyze characters for non-standard format issues in night reminder fields
 */
function analyzeFormatIssues(characters: Character[]): FormatIssuesSummary | null {
  const issuesFound: FormatIssue[] = [];

  for (const char of characters) {
    if (char.firstNightReminder) {
      const issues = analyzeReminderText(char.firstNightReminder);
      if (issues.length > 0) {
        issuesFound.push({ characterName: char.name, field: 'firstNightReminder', issues });
      }
    }
    if (char.otherNightReminder) {
      const issues = analyzeReminderText(char.otherNightReminder);
      if (issues.length > 0) {
        issuesFound.push({ characterName: char.name, field: 'otherNightReminder', issues });
      }
    }
  }

  if (issuesFound.length === 0) return null;

  // Get unique issue types across all characters
  const uniqueIssueTypes = [
    ...new Set(issuesFound.flatMap((f) => f.issues.map((i) => i.description))),
  ];
  const totalCharactersAffected = new Set(issuesFound.map((f) => f.characterName)).size;

  return {
    issuesFound,
    uniqueIssueTypes,
    totalCharactersAffected,
    totalIssues: issuesFound.length,
  };
}

/**
 * Check if JSON could be formatted (minified or not properly indented)
 */
function checkNeedsFormatting(jsonInput: string): boolean {
  if (!jsonInput.trim()) return false;
  try {
    const parsed = JSON.parse(jsonInput);
    const formatted = JSON.stringify(parsed, null, 2);
    // Compare versions - if they differ significantly, suggest formatting
    return formatted !== jsonInput && jsonInput.length > 50;
  } catch {
    return false; // Invalid JSON, can't format
  }
}

export interface UseScriptTransformationsOptions {
  /** Callback to trigger force regeneration */
  onForceRegenerate?: () => void;
}

/**
 * Hook for script analysis and transformation operations.
 *
 * @example
 * ```tsx
 * const {
 *   isScriptSorted,
 *   needsFormatting,
 *   handleFormat,
 *   handleSort,
 * } = useScriptTransformations({
 *   onForceRegenerate: () => setForceRegenerate(prev => prev + 1),
 * });
 *
 * return (
 *   <>
 *     {!isScriptSorted && <button onClick={handleSort}>Sort</button>}
 *     {needsFormatting && <button onClick={handleFormat}>Format</button>}
 *   </>
 * );
 * ```
 */
export function useScriptTransformations(
  options: UseScriptTransformationsOptions = {}
): UseScriptTransformationsResult {
  const { onForceRegenerate } = options;

  const { jsonInput, characters, setError, officialData } = useTokenContext();
  const { updateScript } = useScriptData();

  // Trigger regeneration helper
  const triggerRegenerate = useCallback(() => {
    onForceRegenerate?.();
  }, [onForceRegenerate]);

  // Memoized analysis: check if script is sorted by SAO
  const isScriptSorted = useMemo(() => {
    if (!jsonInput.trim() || characters.length === 0) return true;
    return isScriptJsonSortedBySAO(jsonInput, { officialData }) ?? true;
  }, [jsonInput, characters.length, officialData]);

  // Memoized analysis: check if JSON needs formatting
  const needsFormatting = useMemo(() => {
    if (characters.length === 0) return false;
    return checkNeedsFormatting(jsonInput);
  }, [jsonInput, characters.length]);

  // Memoized analysis: check for condensable character references
  const hasCondensableRefs = useMemo(() => {
    if (!jsonInput.trim() || characters.length === 0 || !officialData.length) return false;
    return hasCondensableReferences(jsonInput, officialData);
  }, [jsonInput, characters.length, officialData]);

  // Memoized analysis: check for non-standard format issues in night reminders
  const formatIssuesSummary = useMemo(() => {
    if (!jsonInput.trim() || characters.length === 0) return null;
    return analyzeFormatIssues(characters);
  }, [jsonInput, characters]);

  // Handler: Format JSON
  const handleFormat = useCallback(async () => {
    try {
      const parsed = JSON.parse(jsonInput);
      const formatted = JSON.stringify(parsed, null, 2);
      await updateScript(formatted, 'format');
    } catch {
      setError('Cannot format: Invalid JSON');
    }
  }, [jsonInput, updateScript, setError]);

  // Handler: Sort by SAO
  const handleSort = useCallback(async () => {
    try {
      const sorted = sortScriptJsonBySAO(jsonInput, { officialData });
      await updateScript(sorted, 'sort');
      triggerRegenerate();
    } catch {
      setError('Cannot sort: Invalid JSON');
    }
  }, [jsonInput, updateScript, setError, officialData, triggerRegenerate]);

  // Handler: Condense script references
  const handleCondenseScript = useCallback(async () => {
    try {
      const condensed = condenseScript(jsonInput, officialData);
      await updateScript(condensed, 'condense');
      triggerRegenerate();
    } catch {
      setError('Cannot condense: Invalid JSON');
    }
  }, [jsonInput, updateScript, setError, officialData, triggerRegenerate]);

  // Handler: Fix non-standard formats in night reminders
  const handleFixFormats = useCallback(async () => {
    try {
      const parsed = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) {
        setError('Cannot fix formats: JSON must be an array');
        return;
      }

      let modified = false;
      const updated = parsed.map((entry: Record<string, unknown>) => {
        if (typeof entry !== 'object' || entry === null) return entry;
        if ((entry as { id?: string }).id === '_meta') return entry;

        const newEntry = { ...entry };

        if (
          typeof newEntry.firstNightReminder === 'string' &&
          analyzeReminderText(newEntry.firstNightReminder).length > 0
        ) {
          newEntry.firstNightReminder = normalizeReminderText(newEntry.firstNightReminder);
          modified = true;
        }

        if (
          typeof newEntry.otherNightReminder === 'string' &&
          analyzeReminderText(newEntry.otherNightReminder).length > 0
        ) {
          newEntry.otherNightReminder = normalizeReminderText(newEntry.otherNightReminder);
          modified = true;
        }

        return newEntry;
      });

      if (modified) {
        const fixedJson = JSON.stringify(updated, null, 2);
        await updateScript(fixedJson, 'fix-formats');
        triggerRegenerate();
      }
    } catch {
      setError('Cannot fix formats: Invalid JSON');
    }
  }, [jsonInput, updateScript, setError, triggerRegenerate]);

  return {
    // Analysis results
    isScriptSorted,
    needsFormatting,
    hasCondensableRefs,
    formatIssuesSummary,
    // Transformation handlers
    handleFormat,
    handleSort,
    handleCondenseScript,
    handleFixFormats,
    // Utility
    triggerRegenerate,
  };
}

export default useScriptTransformations;
