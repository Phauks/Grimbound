/**
 * useFilters Hook
 *
 * Manages filter state for tokens (teams, types, reminders, origin).
 * Provides toggle handlers for filter UI controls.
 *
 * @module hooks/ui/useFilters
 */

import { useCallback, useMemo } from 'react';
import { useTokenContext } from '@/contexts/TokenContext';

// Type for filter keys that have string array values
type FilterKey = 'teams' | 'tokenTypes' | 'display' | 'reminders' | 'origin';

export function useFilters() {
  const { filters, updateFilters } = useTokenContext();

  const resetFilters = useCallback(() => {
    updateFilters({
      teams: [],
      tokenTypes: [],
      display: [],
      reminders: [],
      origin: [],
    });
  }, [updateFilters]);

  /**
   * Factory function to create toggle handlers for filter arrays
   * Reduces boilerplate by generalizing the toggle pattern
   */
  const createToggleHandler = useCallback(
    <K extends FilterKey>(key: K) =>
      (value: string) => {
        const current = filters[key];
        if (current.includes(value)) {
          updateFilters({ [key]: current.filter((v) => v !== value) } as Partial<typeof filters>);
        } else {
          updateFilters({ [key]: [...current, value] } as Partial<typeof filters>);
        }
      },
    [filters, updateFilters]
  );

  // Memoize toggle handlers to maintain referential stability
  const toggleTeam = useMemo(() => createToggleHandler('teams'), [createToggleHandler]);
  const toggleTokenType = useMemo(() => createToggleHandler('tokenTypes'), [createToggleHandler]);
  const toggleDisplay = useMemo(() => createToggleHandler('display'), [createToggleHandler]);
  const toggleReminders = useMemo(() => createToggleHandler('reminders'), [createToggleHandler]);
  const toggleOrigin = useMemo(() => createToggleHandler('origin'), [createToggleHandler]);

  return {
    resetFilters,
    toggleTeam,
    toggleTokenType,
    toggleDisplay,
    toggleReminders,
    toggleOrigin,
  };
}
