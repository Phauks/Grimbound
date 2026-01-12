/**
 * SearchHighlight Component
 *
 * Renders text with search term highlighting.
 * Uses semantic <mark> element for accessibility.
 *
 * @module components/Shared/UI/SearchHighlight
 */

import styles from '@/styles/components/shared/SearchHighlight.module.css';
import { cn } from '@/ts/utils/classNames.js';
import type { SearchMatch } from '@/ts/utils/searchUtils.js';

// ============================================================================
// Types
// ============================================================================

export interface SearchHighlightProps {
  /** Match data from getSearchMatch() */
  match: SearchMatch;
  /** Additional CSS class */
  className?: string;
  /** Highlight style variant */
  variant?: 'default' | 'subtle' | 'strong';
}

// ============================================================================
// Component
// ============================================================================

/**
 * Renders text with search term highlighting.
 *
 * @example
 * import { getSearchMatch } from '@/ts/utils/searchUtils';
 *
 * const match = getSearchMatch(character.name, searchTerms);
 * <SearchHighlight match={match} />
 *
 * // Or with variant
 * <SearchHighlight match={match} variant="subtle" />
 */
export function SearchHighlight({ match, className, variant = 'default' }: SearchHighlightProps) {
  // If no matches or no text, just render plain text
  if (!match.isMatch || match.matches.length === 0) {
    return <span className={className}>{match.text}</span>;
  }

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  // Sort matches by start position (should already be sorted from mergeRanges)
  const sortedMatches = [...match.matches].sort((a, b) => a[0] - b[0]);

  for (let i = 0; i < sortedMatches.length; i++) {
    const [start, end] = sortedMatches[i];

    // Clamp to valid range
    const clampedStart = Math.max(0, Math.min(start, match.text.length));
    const clampedEnd = Math.max(0, Math.min(end, match.text.length));

    if (clampedStart >= clampedEnd) continue;

    // Add text before match
    if (clampedStart > lastIndex) {
      parts.push(<span key={`text-${i}`}>{match.text.slice(lastIndex, clampedStart)}</span>);
    }

    // Add highlighted match
    parts.push(
      <mark key={`match-${i}`} className={cn(styles.highlight, styles[variant])}>
        {match.text.slice(clampedStart, clampedEnd)}
      </mark>
    );

    lastIndex = clampedEnd;
  }

  // Add remaining text after last match
  if (lastIndex < match.text.length) {
    parts.push(<span key="text-end">{match.text.slice(lastIndex)}</span>);
  }

  return <span className={className}>{parts}</span>;
}
