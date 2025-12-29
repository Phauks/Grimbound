/**
 * Search Utilities
 *
 * Modular search system with fuzzy matching, special character support,
 * multi-term AND logic, and highlighting.
 *
 * @module ts/utils/searchUtils
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Search configuration for an entity type
 */
export interface SearchConfig<T> {
  /** Extract searchable text fields from entity */
  fields: (item: T) => (string | undefined)[];
  /** Extract display name for identification (optional) */
  getName?: (item: T) => string;
}

/**
 * Parsed search query with normalized terms
 */
export interface SearchQuery {
  /** Individual search terms after splitting on whitespace */
  terms: string[];
  /** Whether the query contains special characters like * */
  hasSpecialChar: boolean;
  /** Whether the query is empty/whitespace only */
  isEmpty: boolean;
  /** Original query string */
  original: string;
}

/**
 * Match result for a single text field, used for highlighting
 */
export interface SearchMatch {
  /** Original text being searched */
  text: string;
  /** Array of [start, end] indices for matched regions */
  matches: [number, number][];
  /** Whether any match was found */
  isMatch: boolean;
  /** Match score (0-1, higher is better) */
  score: number;
}

/**
 * Search result for an item with all match details
 */
export interface SearchResult<T> {
  /** The matched item */
  item: T;
  /** Match details for each field */
  fieldMatches: Map<string, SearchMatch>;
  /** Overall match score */
  totalScore: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Special characters that should be matched literally in search */
const SPECIAL_CHARS = /[*+?[\]]/;

/** Default fuzzy matching threshold (max edit distance) */
const DEFAULT_FUZZY_THRESHOLD = 2;

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Calculate Levenshtein edit distance between two strings.
 * Used for fuzzy matching with typo tolerance.
 *
 * @param a - First string
 * @param b - Second string
 * @returns Edit distance (number of changes needed to transform a into b)
 */
export function levenshteinDistance(a: string, b: string): number {
  // Early exits for empty strings
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Use two rows instead of full matrix for O(n) space
  let previousRow = Array.from({ length: b.length + 1 }, (_, i) => i);
  let currentRow = new Array<number>(b.length + 1);

  for (let i = 0; i < a.length; i++) {
    currentRow[0] = i + 1;

    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      currentRow[j + 1] = Math.min(
        currentRow[j] + 1, // insertion
        previousRow[j + 1] + 1, // deletion
        previousRow[j] + cost // substitution
      );
    }

    // Swap rows
    [previousRow, currentRow] = [currentRow, previousRow];
  }

  return previousRow[b.length];
}

/**
 * Normalize text for search comparison.
 * - Converts to lowercase
 * - Collapses whitespace
 * - Normalizes dashes/hyphens
 * - Preserves special characters (*, +, etc.)
 *
 * @param text - Text to normalize
 * @returns Normalized text
 */
export function normalizeSearchText(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ').replace(/[-–—]/g, '-');
}

/**
 * Parse a search query into normalized terms.
 *
 * @example
 * parseSearchQuery('night demon')   // { terms: ['night', 'demon'], isEmpty: false }
 * parseSearchQuery('Each Night*')   // { terms: ['each', 'night*'], hasSpecialChar: true }
 * parseSearchQuery('')              // { terms: [], isEmpty: true }
 */
export function parseSearchQuery(query: string): SearchQuery {
  const normalized = normalizeSearchText(query);

  if (!normalized) {
    return {
      terms: [],
      hasSpecialChar: false,
      isEmpty: true,
      original: query,
    };
  }

  const terms = normalized.split(/\s+/).filter((term) => term.length > 0);
  const hasSpecialChar = SPECIAL_CHARS.test(normalized);

  return {
    terms,
    hasSpecialChar,
    isEmpty: terms.length === 0,
    original: query,
  };
}

/**
 * Check if a term matches text with fuzzy matching support.
 *
 * Features:
 * - Case insensitive
 * - 1-2 character tolerance via Levenshtein distance
 * - Space/dash agnostic ('saint-john' matches 'saint john')
 * - Special char support ('night*' matches 'Each Night*')
 *
 * @param text - Text to search in
 * @param term - Search term
 * @param fuzzyThreshold - Max edit distance for fuzzy match (default: 2)
 * @returns Whether the term matches the text
 */
export function matchesTerm(
  text: string,
  term: string,
  fuzzyThreshold = DEFAULT_FUZZY_THRESHOLD
): boolean {
  const normalizedText = normalizeSearchText(text);
  const normalizedTerm = normalizeSearchText(term);

  if (!normalizedTerm) return true; // Empty term matches everything

  // Direct substring match (fastest path)
  if (normalizedText.includes(normalizedTerm)) {
    return true;
  }

  // Space/dash agnostic match
  // 'saint john' should match 'saint-john'
  const textWithoutSpaces = normalizedText.replace(/[\s-]/g, '');
  const termWithoutSpaces = normalizedTerm.replace(/[\s-]/g, '');

  if (textWithoutSpaces.includes(termWithoutSpaces)) {
    return true;
  }

  // Special character exact match
  // If term contains *, +, etc., require exact substring
  if (SPECIAL_CHARS.test(normalizedTerm)) {
    return normalizedText.includes(normalizedTerm);
  }

  // Fuzzy word matching
  // Split text into words and check each for fuzzy match
  const words = normalizedText.split(/[\s-]+/);

  for (const word of words) {
    // Skip very short words for fuzzy matching
    if (word.length < 3 || normalizedTerm.length < 3) {
      continue;
    }

    const distance = levenshteinDistance(word, normalizedTerm);

    // Allow more distance for longer words
    const maxAllowed = Math.min(
      fuzzyThreshold,
      Math.floor(Math.min(word.length, normalizedTerm.length) / 3)
    );

    if (distance <= maxAllowed) {
      return true;
    }
  }

  // Check if term is prefix of any word (for partial typing, e.g., "vill" finds "villain")
  // Only check if the search term is reasonably short (partial typing scenario)
  if (normalizedTerm.length >= 3 && normalizedTerm.length <= 6) {
    for (const word of words) {
      if (word.length >= normalizedTerm.length && word.startsWith(normalizedTerm)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Find match positions in text for highlighting.
 *
 * @param text - Original text
 * @param terms - Search terms to highlight
 * @returns Array of [start, end] indices for matches
 */
export function findMatchPositions(text: string, terms: string[]): [number, number][] {
  if (!text || terms.length === 0) {
    return [];
  }

  const positions: [number, number][] = [];
  const lowerText = text.toLowerCase();

  for (const term of terms) {
    const lowerTerm = term.toLowerCase();

    // Find all occurrences of this term
    let searchStart = 0;
    while (searchStart < lowerText.length) {
      const index = lowerText.indexOf(lowerTerm, searchStart);
      if (index === -1) break;

      positions.push([index, index + lowerTerm.length]);
      searchStart = index + 1; // Allow overlapping for edge cases
    }
  }

  // Merge overlapping ranges
  return mergeRanges(positions);
}

/**
 * Merge overlapping or adjacent ranges.
 *
 * @param ranges - Array of [start, end] tuples
 * @returns Merged ranges
 */
export function mergeRanges(ranges: [number, number][]): [number, number][] {
  if (ranges.length === 0) return [];

  // Sort by start position
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    if (current[0] <= last[1]) {
      // Overlapping or adjacent - extend the range
      last[1] = Math.max(last[1], current[1]);
    } else {
      merged.push(current);
    }
  }

  return merged;
}

/**
 * Get search match result for a single text field.
 *
 * @example
 * getSearchMatch('Each Night*', ['night'])
 * // { text: 'Each Night*', matches: [[5, 10]], isMatch: true, score: 0.9 }
 */
export function getSearchMatch(text: string, terms: string[]): SearchMatch {
  if (!text || terms.length === 0) {
    return {
      text: text ?? '',
      matches: [],
      isMatch: terms.length === 0,
      score: terms.length > 0 ? 0 : 1,
    };
  }

  const matches = findMatchPositions(text, terms);
  const isMatch = matches.length > 0;

  // Calculate score based on match quality
  let score = 0;
  if (isMatch) {
    // More matches = higher score
    const coverageRatio =
      matches.reduce((sum, [start, end]) => sum + (end - start), 0) / text.length;
    score = Math.min(1, 0.5 + coverageRatio * 0.5);
  }

  return { text, matches, isMatch, score };
}

/**
 * Check if all terms match at least one field.
 * Implements AND logic for multi-term queries.
 *
 * @param fields - Array of text fields to search
 * @param terms - Search terms (all must match)
 * @param fuzzyThreshold - Max edit distance for fuzzy match
 * @returns Whether all terms match
 */
export function matchesAllTerms(
  fields: (string | undefined)[],
  terms: string[],
  fuzzyThreshold = DEFAULT_FUZZY_THRESHOLD
): boolean {
  if (terms.length === 0) return true;

  // Concatenate all fields for matching
  const combined = fields.filter((f): f is string => Boolean(f)).join(' ');

  // Each term must match somewhere in the combined text
  return terms.every((term) => matchesTerm(combined, term, fuzzyThreshold));
}

/**
 * Generic search filter for any entity type.
 * Filters items where all search terms match at least one field.
 *
 * @example
 * const filtered = searchFilter(characters, 'night demon', {
 *   fields: (char) => [char.name, char.ability, ...(char.reminders ?? [])]
 * });
 */
export function searchFilter<T>(items: T[], query: string, config: SearchConfig<T>): T[] {
  const parsed = parseSearchQuery(query);

  if (parsed.isEmpty) {
    return items;
  }

  return items.filter((item) => {
    const fields = config.fields(item);
    return matchesAllTerms(fields, parsed.terms);
  });
}

/**
 * Search with full result details including match positions.
 * Use this when you need highlighting information.
 *
 * @example
 * const results = searchWithDetails(characters, 'night', {
 *   fields: (char) => [char.name, char.ability]
 * });
 * // results[0].fieldMatches.get('name')?.matches // [[5, 10]]
 */
export function searchWithDetails<T>(
  items: T[],
  query: string,
  config: SearchConfig<T>,
  fieldNames?: string[]
): SearchResult<T>[] {
  const parsed = parseSearchQuery(query);

  if (parsed.isEmpty) {
    return items.map((item) => ({
      item,
      fieldMatches: new Map(),
      totalScore: 1,
    }));
  }

  const results: SearchResult<T>[] = [];

  for (const item of items) {
    const fields = config.fields(item);
    const names = fieldNames ?? fields.map((_, i) => `field${i}`);

    // Check if item matches all terms
    if (!matchesAllTerms(fields, parsed.terms)) {
      continue;
    }

    // Build field match map
    const fieldMatches = new Map<string, SearchMatch>();
    let totalScore = 0;

    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      if (!field) continue;

      const match = getSearchMatch(field, parsed.terms);
      if (match.isMatch) {
        fieldMatches.set(names[i], match);
        totalScore += match.score;
      }
    }

    results.push({
      item,
      fieldMatches,
      totalScore: totalScore / Math.max(1, fieldMatches.size),
    });
  }

  // Sort by score descending
  return results.sort((a, b) => b.totalScore - a.totalScore);
}
