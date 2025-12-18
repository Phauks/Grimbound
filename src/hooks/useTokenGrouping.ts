/**
 * useTokenGrouping Hook
 *
 * Manages token sorting and grouping logic for display.
 * Extracted from TokenGrid component to follow Single Responsibility Principle.
 */

import { useMemo } from 'react';
import type { Token } from '@/ts/types/index.js';
import { groupTokensByIdentity } from '@/ts/utils/tokenGrouping.js';

interface TokenGroup {
  token: Token;
  count: number;
  variants: Token[];
}

interface UseTokenGroupingReturn {
  /** Sorted character tokens */
  characterTokens: Token[];
  /** Sorted reminder tokens */
  reminderTokens: Token[];
  /** Meta tokens (script-name, almanac, pandemonium, bootlegger) */
  metaTokens: Token[];
  /** Grouped character tokens with counts */
  groupedCharacterTokens: TokenGroup[];
  /** Grouped reminder tokens with counts */
  groupedReminderTokens: TokenGroup[];
  /** Grouped meta tokens with counts */
  groupedMetaTokens: TokenGroup[];
}

/**
 * Hook for sorting and grouping tokens for display
 *
 * Handles:
 * - Filtering tokens by type
 * - Sorting by original order
 * - Grouping duplicates with count badges
 *
 * @param tokens - Array of tokens to group
 * @returns Sorted and grouped token collections
 *
 * @example
 * ```tsx
 * const grouped = useTokenGrouping(filteredTokens);
 *
 * // Render character tokens
 * {grouped.groupedCharacterTokens.map((group) => (
 *   <TokenCard
 *     key={group.token.filename}
 *     token={group.token}
 *     count={group.count}
 *     variants={group.variants}
 *   />
 * ))}
 * ```
 */
export function useTokenGrouping(tokens: Token[]): UseTokenGroupingReturn {
  // Sort character tokens by their original order from JSON
  const characterTokens = useMemo(() => {
    const chars = tokens.filter((t) => t.type === 'character');
    return [...chars].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }, [tokens]);

  // Filter meta tokens
  const metaTokens = useMemo(() => {
    return tokens.filter((t) => t.type !== 'character' && t.type !== 'reminder');
  }, [tokens]);

  // Sort reminder tokens by parent character order, then by reminder text
  const reminderTokens = useMemo(() => {
    const reminders = tokens.filter((t) => t.type === 'reminder');

    return [...reminders].sort((a, b) => {
      const orderA = a.order ?? 999;
      const orderB = b.order ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      // If same character, sort by reminder text
      return (a.reminderText || '').localeCompare(b.reminderText || '');
    });
  }, [tokens]);

  // Group tokens by identity to show count badges for duplicates
  const groupedCharacterTokens = useMemo(
    () => groupTokensByIdentity(characterTokens),
    [characterTokens]
  );

  const groupedReminderTokens = useMemo(
    () => groupTokensByIdentity(reminderTokens),
    [reminderTokens]
  );

  const groupedMetaTokens = useMemo(() => groupTokensByIdentity(metaTokens), [metaTokens]);

  return {
    characterTokens,
    reminderTokens,
    metaTokens,
    groupedCharacterTokens,
    groupedReminderTokens,
    groupedMetaTokens,
  };
}

export default useTokenGrouping;
