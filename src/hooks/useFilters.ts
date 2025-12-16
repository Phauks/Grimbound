import { useCallback, useEffect, useMemo } from 'react';
import { useTokenContext } from '../contexts/TokenContext';

// Type for filter keys that have string array values
type FilterKey = 'teams' | 'tokenTypes' | 'display' | 'reminders' | 'origin';

export function useFilters() {
  const { tokens, filters, updateFilters, setFilteredTokens } = useTokenContext();

  const applyFilters = useCallback(() => {
    let result = [...tokens];

    // Filter by teams (multi-select)
    if (filters.teams.length > 0) {
      result = result.filter((token) => filters.teams.includes(token.team || ''));
    }

    // Filter by token types (multi-select)
    if (filters.tokenTypes.length > 0) {
      result = result.filter((token) => {
        if (filters.tokenTypes.includes('meta')) {
          // Meta includes script-name, almanac, pandemonium tokens
          if (token.type !== 'character' && token.type !== 'reminder') {
            return true;
          }
        }
        return filters.tokenTypes.includes(token.type);
      });
    }

    // Filter by display (official vs custom) - multi-select
    // Note: This would need to be determined by comparing with officialData
    // For now, we'll skip this filter as it requires more context

    // Filter by reminders (multi-select)
    if (filters.reminders.length > 0) {
      result = result.filter((token) => {
        if (filters.reminders.includes('has') && token.hasReminders) return true;
        if (filters.reminders.includes('none') && !token.hasReminders) return true;
        return false;
      });
    }

    // Filter by origin (official vs custom)
    if (filters.origin.length > 0) {
      result = result.filter((token) => {
        const isOfficial = token.isOfficial === true;
        if (filters.origin.includes('official') && isOfficial) return true;
        if (filters.origin.includes('custom') && !isOfficial) return true;
        return false;
      });
    }

    setFilteredTokens(result);
  }, [tokens, filters, setFilteredTokens]);

  // Apply filters whenever tokens or filters change
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

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
    <K extends FilterKey>(key: K) => {
      return (value: string) => {
        const current = filters[key];
        if (current.includes(value)) {
          updateFilters({ [key]: current.filter((v) => v !== value) } as Partial<typeof filters>);
        } else {
          updateFilters({ [key]: [...current, value] } as Partial<typeof filters>);
        }
      };
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
    applyFilters,
    resetFilters,
    toggleTeam,
    toggleTokenType,
    toggleDisplay,
    toggleReminders,
    toggleOrigin,
  };
}
