/**
 * useFilters Hook
 *
 * Manages filter state for tokens (teams, types, reminders, origin).
 * Provides toggle handlers for filter UI controls.
 *
 * @module hooks/ui/useFilters
 */

import { useTokenContext } from '@/contexts/TokenContext';

// Type for filter keys that have string array values
type FilterKey = 'teams' | 'tokenTypes' | 'display' | 'reminders' | 'origin';

export function useFilters() {
  const { filters, updateFilters } = useTokenContext();

  const resetFilters = () => {
    updateFilters({
      teams: [],
      tokenTypes: [],
      display: [],
      reminders: [],
      origin: [],
    });
  };

  /**
   * Factory function to create toggle handlers for filter arrays
   * Reduces boilerplate by generalizing the toggle pattern
   */
  const createToggleHandler =
    <K extends FilterKey>(key: K) =>
    (value: string) => {
      const current = filters[key];
      if (current.includes(value)) {
        updateFilters({
          [key]: current.filter((v) => v !== value),
        } as Partial<typeof filters>);
      } else {
        updateFilters({ [key]: [...current, value] } as Partial<typeof filters>);
      }
    };

  // Create toggle handlers
  const toggleTeam = createToggleHandler('teams');
  const toggleTokenType = createToggleHandler('tokenTypes');
  const toggleDisplay = createToggleHandler('display');
  const toggleReminders = createToggleHandler('reminders');
  const toggleOrigin = createToggleHandler('origin');

  return {
    resetFilters,
    toggleTeam,
    toggleTokenType,
    toggleDisplay,
    toggleReminders,
    toggleOrigin,
  };
}
