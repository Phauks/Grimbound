/**
 * useTokenGrouping Hook
 *
 * Manages token sorting and grouping logic for display.
 * Extracted from TokenGrid component to follow Single Responsibility Principle.
 */

import type { Token } from '@/ts/types/index.js';
import { groupTokensByIdentity } from '@/ts/utils/tokenGrouping.js';

export interface TokenGroup {
  token: Token;
  count: number;
  variants: Token[];
}

export interface UseTokenGroupingReturn {
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
  const characterTokens = tokens
    .filter((t) => t.type === 'character')
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

  // Filter meta tokens
  const metaTokens = tokens.filter((t) => t.type !== 'character' && t.type !== 'reminder');

  // Sort reminder tokens by parent character order, then by reminder text
  const reminderTokens = tokens
    .filter((t) => t.type === 'reminder')
    .sort((a, b) => {
      const orderA = a.order ?? 999;
      const orderB = b.order ?? 999;
      if (orderA !== orderB) return orderA - orderB;
      // If same character, sort by reminder text
      return (a.reminderText || '').localeCompare(b.reminderText || '');
    });

  // Group tokens by identity to show count badges for duplicates
  const groupedCharacterTokens = groupTokensByIdentity(characterTokens);
  const groupedReminderTokens = groupTokensByIdentity(reminderTokens);
  const groupedMetaTokens = groupTokensByIdentity(metaTokens);

  return {
    characterTokens,
    reminderTokens,
    metaTokens,
    groupedCharacterTokens,
    groupedReminderTokens,
    groupedMetaTokens,
  };
}
