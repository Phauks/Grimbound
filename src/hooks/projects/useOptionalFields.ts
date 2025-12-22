/**
 * useOptionalFields Hook
 *
 * Manages optional project fields (privateNotes, difficulty, gameplay, etc.)
 * with visibility toggling, add/remove field functionality, and lookup-based access.
 *
 * Extracted from ProjectEditor for single responsibility.
 *
 * @module hooks/projects/useOptionalFields
 */

import { useCallback, useMemo, useState } from 'react';
import type { Project } from '@/ts/types/project.js';

// ============================================================================
// Types
// ============================================================================

export interface OptionalFieldConfig {
  key: string;
  label: string;
  placeholder: string;
  isInput?: boolean;
}

export interface UseOptionalFieldsResult {
  /** Get value for a field by key */
  getValue: (key: string) => string;
  /** Set value for a field by key */
  setValue: (key: string, value: string) => void;
  /** Reset all fields from project data */
  resetFromProject: (project: Project) => void;
  /** Set of currently visible field keys */
  visibleFields: Set<string>;
  /** Show a field (add to visible set) */
  addField: (key: string) => void;
  /** Hide and clear a field */
  removeField: (key: string) => void;
  /** Fields available to add (not yet visible) */
  availableFields: OptionalFieldConfig[];
  /** Whether add field dropdown is open */
  showAddDropdown: boolean;
  /** Toggle add field dropdown */
  setShowAddDropdown: (show: boolean) => void;
  /** Get trimmed values for saving to project */
  getValuesForSave: () => OptionalFieldValues;
}

export interface OptionalFieldValues {
  privateNotes?: string;
  gameplay?: string;
  difficulty?: string;
  storytellerTips?: string;
  changelog?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Optional field configuration - defines available extensible project fields */
export const OPTIONAL_FIELDS_CONFIG: OptionalFieldConfig[] = [
  {
    key: 'privateNotes',
    label: 'Private Notes',
    placeholder: 'Personal notes (not exported)...',
  },
  {
    key: 'difficulty',
    label: 'Difficulty',
    placeholder: 'e.g., Beginner, Intermediate, Expert',
    isInput: true,
  },
  {
    key: 'gameplay',
    label: 'Gameplay',
    placeholder: 'Describe the gameplay style...',
  },
  {
    key: 'storytellerTips',
    label: 'Storyteller Tips',
    placeholder: 'Tips for running this script...',
  },
  {
    key: 'changelog',
    label: 'Changelogs',
    placeholder: 'Version history and changes...',
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/** Extract fields with content from project for auto-showing */
function getFieldsWithContent(project: Project): Set<string> {
  const fields = new Set<string>();
  if (project.privateNotes) fields.add('privateNotes');
  if (project.difficulty) fields.add('difficulty');
  if (project.gameplay) fields.add('gameplay');
  if (project.storytellerTips) fields.add('storytellerTips');
  if (project.changelog) fields.add('changelog');
  return fields;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing optional field state with lookup-based getters/setters.
 *
 * Features:
 * - Dynamic field visibility (add/remove fields)
 * - Lookup-based value access by field key
 * - Auto-shows fields that have content in project
 * - Provides trimmed values for saving
 *
 * @example
 * ```tsx
 * const optionalFields = useOptionalFields();
 *
 * // Reset from project data
 * useEffect(() => {
 *   if (project) optionalFields.resetFromProject(project);
 * }, [project]);
 *
 * // Get/set values
 * const notes = optionalFields.getValue('privateNotes');
 * optionalFields.setValue('privateNotes', 'Updated notes');
 *
 * // Save to project
 * await updateProject(project.id, optionalFields.getValuesForSave());
 * ```
 */
export function useOptionalFields(): UseOptionalFieldsResult {
  const [privateNotes, setPrivateNotes] = useState('');
  const [gameplay, setGameplay] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [storytellerTips, setStorytellerTips] = useState('');
  const [changelog, setChangelog] = useState('');
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set());
  const [showAddDropdown, setShowAddDropdown] = useState(false);

  // Field value map for lookup-based access
  const fieldValues = useMemo<Record<string, string>>(
    () => ({
      privateNotes,
      difficulty,
      gameplay,
      storytellerTips,
      changelog,
    }),
    [privateNotes, difficulty, gameplay, storytellerTips, changelog]
  );

  // Field setters map (stable reference)
  const fieldSetters = useMemo<Record<string, (value: string) => void>>(
    () => ({
      privateNotes: setPrivateNotes,
      difficulty: setDifficulty,
      gameplay: setGameplay,
      storytellerTips: setStorytellerTips,
      changelog: setChangelog,
    }),
    []
  );

  const getValue = useCallback((key: string) => fieldValues[key] || '', [fieldValues]);

  const setValue = useCallback(
    (key: string, value: string) => {
      fieldSetters[key]?.(value);
    },
    [fieldSetters]
  );

  const resetFromProject = useCallback((project: Project) => {
    setPrivateNotes(project.privateNotes || '');
    setGameplay(project.gameplay || '');
    setDifficulty(project.difficulty || '');
    setStorytellerTips(project.storytellerTips || '');
    setChangelog(project.changelog || '');
    setVisibleFields(getFieldsWithContent(project));
    setShowAddDropdown(false);
  }, []);

  const addField = useCallback((key: string) => {
    setVisibleFields((prev) => new Set([...prev, key]));
    setShowAddDropdown(false);
  }, []);

  const removeField = useCallback(
    (key: string) => {
      fieldSetters[key]?.('');
      setVisibleFields((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    },
    [fieldSetters]
  );

  const availableFields = useMemo(
    () => OPTIONAL_FIELDS_CONFIG.filter((f) => !visibleFields.has(f.key)),
    [visibleFields]
  );

  const getValuesForSave = useCallback(
    (): OptionalFieldValues => ({
      privateNotes: privateNotes.trim() || undefined,
      gameplay: gameplay.trim() || undefined,
      difficulty: difficulty.trim() || undefined,
      storytellerTips: storytellerTips.trim() || undefined,
      changelog: changelog.trim() || undefined,
    }),
    [privateNotes, gameplay, difficulty, storytellerTips, changelog]
  );

  return {
    getValue,
    setValue,
    resetFromProject,
    visibleFields,
    addField,
    removeField,
    availableFields,
    showAddDropdown,
    setShowAddDropdown,
    getValuesForSave,
  };
}
