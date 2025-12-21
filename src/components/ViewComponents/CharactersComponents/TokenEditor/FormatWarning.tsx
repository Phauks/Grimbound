/**
 * FormatWarning Component
 *
 * Displays format warnings for night reminder text with a fix button.
 *
 * @module components/CharactersComponents/TokenEditor/FormatWarning
 */

import { memo } from 'react';
import type { FormatIssue } from '@/ts/utils/textFormatAnalyzer';
import styles from '@/styles/components/characterEditor/TokenEditor.module.css';

interface FormatWarningProps {
  /** List of format issues detected */
  issues: FormatIssue[];
  /** Whether the fix button is disabled */
  disabled: boolean;
  /** Handler for fix button click */
  onFix: () => void;
}

/**
 * Displays a warning banner with format issues and a fix button.
 * Only renders if there are issues to display.
 */
export const FormatWarning = memo(function FormatWarning({
  issues,
  disabled,
  onFix,
}: FormatWarningProps) {
  if (issues.length === 0) return null;

  // Deduplicate issue descriptions
  const uniqueDescriptions = [...new Set(issues.map((i) => i.description))];

  return (
    <div className={styles.formatWarning}>
      <span className={styles.warningIcon}>⚠️</span>
      <div className={styles.warningContent}>
        <span className={styles.warningTitle}>Non-standard format detected:</span>
        <ul className={styles.warningList}>
          {uniqueDescriptions.map((desc) => (
            <li key={`format-issue-${desc}`}>{desc}</li>
          ))}
        </ul>
      </div>
      <button
        type="button"
        onClick={onFix}
        className={styles.fixButton}
        disabled={disabled}
      >
        Fix Format
      </button>
    </div>
  );
});

export default FormatWarning;
