/**
 * Blood on the Clocktower Token Generator
 * Text Format Analyzer for Night Reminder Fields
 *
 * Detects non-standard text formats in firstNightReminder and otherNightReminder
 * fields and provides normalization to the standard format:
 * - :reminder: for reminder circles
 * - *TEXT* for bold text
 *
 * This module is designed to be extensible - add new patterns to FORMAT_PATTERNS
 * and they will automatically be detected and normalized.
 */

/**
 * Defines a format pattern to detect and normalize
 */
export interface FormatPattern {
  /** Unique identifier for this pattern */
  name: string;
  /** Regex to detect this format (use 'g' flag for global matching) */
  regex: RegExp;
  /** Replacement string (use $1, $2, etc. for capture groups) */
  replacement: string;
  /** User-friendly description of what this pattern converts */
  description: string;
}

/**
 * Represents a detected format issue in the text
 */
export interface FormatIssue {
  /** Name of the pattern that was matched */
  name: string;
  /** User-friendly description of the issue */
  description: string;
  /** The matched text that needs to be fixed */
  matchedText: string;
  /** What the text will be converted to */
  suggestedFix: string;
}

/**
 * Extensible array of format patterns to detect and normalize.
 * Add new patterns here as they are discovered.
 *
 * Order matters! More specific patterns should come before generic ones.
 * For example, specific HTML tags should come before the generic HTML stripper.
 */
export const FORMAT_PATTERNS: FormatPattern[] = [
  // Reminder circle formats - convert legacy @ symbol to :reminder:
  {
    name: 'at-symbol-reminder',
    regex: /@/g,
    replacement: ':reminder:',
    description: 'Convert @ to :reminder:',
  },
  {
    // Matches: <i class="reminder-token"></i> with various spacing and quote styles
    name: 'html-reminder-token',
    regex: /<i\s*class\s*=\s*["']reminder-token["']\s*>\s*<\/i>/gi,
    replacement: ':reminder:',
    description: 'Convert <i class="reminder-token"></i> to :reminder:',
  },
  {
    // Self-closing variant: <i class="reminder-token"/>
    name: 'html-reminder-token-self-closing',
    regex: /<i\s*class\s*=\s*["']reminder-token["']\s*\/>/gi,
    replacement: ':reminder:',
    description: 'Convert <i class="reminder-token"/> to :reminder:',
  },

  // Double asterisk emphasis **TEXT** → *TEXT* (convert legacy format)
  {
    name: 'double-asterisk-emphasis',
    regex: /\*\*([^*]+)\*\*/g,
    replacement: '*$1*',
    description: 'Convert **text** to *text*',
  },

  // Bold text formats - HTML (convert to single asterisk)
  {
    name: 'html-bold',
    regex: /<b>(.+?)<\/b>/gi,
    replacement: '*$1*',
    description: 'Convert <b>text</b> to *text*',
  },
  {
    name: 'html-strong',
    regex: /<strong>(.+?)<\/strong>/gi,
    replacement: '*$1*',
    description: 'Convert <strong>text</strong> to *text*',
  },

  // Italic text (convert to plain - not commonly used in reminders)
  {
    name: 'html-italic',
    regex: /<i>(.+?)<\/i>/gi,
    replacement: '$1',
    description: 'Remove <i>text</i> italic tags',
  },
  {
    name: 'html-emphasis',
    regex: /<em>(.+?)<\/em>/gi,
    replacement: '$1',
    description: 'Remove <em>text</em> emphasis tags',
  },

  // Generic HTML tag cleanup (should be last)
  {
    name: 'html-span',
    regex: /<span[^>]*>(.+?)<\/span>/gi,
    replacement: '$1',
    description: 'Remove <span> wrapper tags',
  },
  {
    name: 'html-other-tags',
    regex: /<\/?[a-z][a-z0-9]*[^>]*>/gi,
    replacement: '',
    description: 'Remove other HTML tags',
  },
];

/**
 * Analyzes reminder text for non-standard formats
 * @param text - The reminder text to analyze
 * @returns Array of detected format issues (empty if text is already normalized)
 */
export function analyzeReminderText(text: string): FormatIssue[] {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const issues: FormatIssue[] = [];

  for (const pattern of FORMAT_PATTERNS) {
    // Create a fresh regex to reset lastIndex
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match: RegExpExecArray | null;

    match = regex.exec(text);
    while (match !== null) {
      const matchedText = match[0];
      const suggestedFix = matchedText.replace(
        new RegExp(pattern.regex.source, pattern.regex.flags),
        pattern.replacement
      );

      // Only add if it's actually a change
      if (matchedText !== suggestedFix) {
        // Check if we already have this exact issue (avoid duplicates)
        const isDuplicate = issues.some(
          (issue) => issue.name === pattern.name && issue.matchedText === matchedText
        );

        if (!isDuplicate) {
          issues.push({
            name: pattern.name,
            description: pattern.description,
            matchedText,
            suggestedFix,
          });
        }
      }
      match = regex.exec(text);
    }
  }

  return issues;
}

/**
 * Normalizes reminder text by applying all format patterns
 * @param text - The reminder text to normalize
 * @returns Normalized text with standard format (:reminder: for circles, *text* for bold)
 */
export function normalizeReminderText(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  let normalized = text;

  for (const pattern of FORMAT_PATTERNS) {
    normalized = normalized.replace(pattern.regex, pattern.replacement);
  }

  // Clean up any extra whitespace that may have been introduced
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

/**
 * Checks if text contains any non-standard formats
 * @param text - The reminder text to check
 * @returns true if the text needs normalization
 */
export function hasFormatIssues(text: string): boolean {
  return analyzeReminderText(text).length > 0;
}

/**
 * Gets a summary of all detected issues for display
 * @param issues - Array of format issues
 * @returns Human-readable summary string
 */
export function getIssueSummary(issues: FormatIssue[]): string {
  if (issues.length === 0) {
    return '';
  }

  // Group by pattern name and get unique descriptions
  const uniqueDescriptions = [...new Set(issues.map((i) => i.description))];
  return uniqueDescriptions.join('; ');
}
