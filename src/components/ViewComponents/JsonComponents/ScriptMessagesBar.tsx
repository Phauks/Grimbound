/**
 * ScriptMessagesBar Component
 *
 * Displays validation messages, warnings, and actionable recommendations
 * for JSON script content. Handles collapsible display of multiple messages.
 *
 * Extracted from JsonView for better separation of concerns.
 *
 * @module components/ViewComponents/JsonComponents/ScriptMessagesBar
 */

import { useState } from 'react';
import { InfoMessage } from '@/components/Shared/Feedback/InfoMessage';
import type { FormatIssuesSummary } from '@/hooks';
import styles from '@/styles/components/views/Views.module.css';

/** Maximum number of messages to show before "Show more" button */
const VISIBLE_MESSAGES_COUNT = 3;

export interface ScriptMessagesBarProps {
  /** Parse error message, if any */
  error: string | null;
  /** Warning messages from validation */
  warnings: string[];
  /** Number of characters in the script */
  characterCount: number;
  /** Whether the script has a _meta entry */
  hasScriptMeta: boolean;
  /** Whether character IDs contain separators that should be removed */
  hasSeparatorsInIds: boolean;
  /** Whether the script is sorted by SAO */
  isScriptSorted: boolean;
  /** Whether the JSON needs formatting */
  needsFormatting: boolean;
  /** Whether the script has condensable references */
  hasCondensableRefs: boolean;
  /** Summary of format issues in night reminders */
  formatIssuesSummary: FormatIssuesSummary | null;
  /** Handler to format JSON */
  onFormat: () => void;
  /** Handler to sort by SAO */
  onSort: () => void;
  /** Handler to condense script */
  onCondense: () => void;
  /** Handler to fix non-standard formats */
  onFixFormats: () => void;
  /** Handler to add _meta entry */
  onAddMeta: () => void;
  /** Handler to remove separators from IDs */
  onRemoveSeparators: () => void;
}

interface MessageItem {
  type: 'error' | 'warning';
  text: string;
}

/**
 * Component for displaying script validation messages and recommendations.
 *
 * Features:
 * - Shows errors and warnings with appropriate styling
 * - Displays actionable recommendations with fix buttons
 * - Collapsible message list for many warnings
 * - Consistent ordering of recommendation types
 */
export function ScriptMessagesBar({
  error,
  warnings,
  characterCount,
  hasScriptMeta,
  hasSeparatorsInIds,
  isScriptSorted,
  needsFormatting,
  hasCondensableRefs,
  formatIssuesSummary,
  onFormat,
  onSort,
  onCondense,
  onFixFormats,
  onAddMeta,
  onRemoveSeparators,
}: ScriptMessagesBarProps) {
  const [showAllMessages, setShowAllMessages] = useState(false);

  // Determine if we should show the messages bar at all
  const hasCharacters = characterCount > 0;
  const hasAnyContent =
    error ||
    warnings.length > 0 ||
    (hasCharacters && !hasScriptMeta) ||
    hasSeparatorsInIds ||
    (hasCharacters && !isScriptSorted) ||
    hasCondensableRefs ||
    formatIssuesSummary ||
    needsFormatting;

  if (!hasAnyContent) {
    return null;
  }

  // Build combined messages list for errors and warnings
  const allMessages: MessageItem[] = [
    ...(error ? [{ type: 'error' as const, text: error }] : []),
    ...warnings.map((w) => ({ type: 'warning' as const, text: w })),
  ];

  const visibleMessages = allMessages.slice(0, VISIBLE_MESSAGES_COUNT);
  const hiddenMessages = allMessages.slice(VISIBLE_MESSAGES_COUNT);
  const hasMoreMessages = hiddenMessages.length > 0;

  return (
    <div className={styles.messagesBar}>
      {/* JSON formatting recommendation */}
      {needsFormatting && !error && (
        <InfoMessage
          message="JSON can be formatted for better readability."
          buttonLabel="Format"
          onClick={onFormat}
          buttonTitle="Format JSON with proper indentation"
        />
      )}

      {/* Missing _meta recommendation */}
      {hasCharacters && !hasScriptMeta && !error && (
        <InfoMessage
          message={
            <>
              This script doesn't have a <code>_meta</code> entry. Adding one enables script name
              tokens and better organization.
            </>
          }
          buttonLabel="Add _meta"
          onClick={onAddMeta}
          buttonTitle="Add _meta entry to script"
        />
      )}

      {/* Separators in IDs recommendation */}
      {hasSeparatorsInIds && !error && (
        <InfoMessage
          message={
            <>
              Some character IDs contain underscores or hyphens. Official IDs don't use separators
              (e.g., <code>fortune_teller</code> or <code>fortune-teller</code> →{' '}
              <code>fortuneteller</code>).
            </>
          }
          buttonLabel="Remove separators"
          onClick={onRemoveSeparators}
          buttonTitle="Remove underscores and hyphens from character IDs"
        />
      )}

      {/* Script not sorted recommendation */}
      {hasCharacters && !isScriptSorted && !error && (
        <InfoMessage
          message="Script not sorted in Standard Order."
          buttonLabel="Sort"
          onClick={onSort}
          buttonTitle="Sort characters by Standard Amy Order"
        />
      )}

      {/* Condensable character references recommendation */}
      {hasCondensableRefs && !error && (
        <InfoMessage
          message="Some official characters use object format. They can be simplified to string format for cleaner JSON."
          buttonLabel="Condense Script"
          onClick={onCondense}
          buttonTitle='Convert object references like { "id": "clockmaker" } to string format "clockmaker"'
        />
      )}

      {/* Non-standard format issues in night reminders */}
      {formatIssuesSummary && !error && (
        <InfoMessage
          message={
            <>
              Some night reminders use non-standard formats (e.g.,{' '}
              <code>&lt;i class="reminder-token"&gt;</code> instead of <code>:reminder:</code>, or{' '}
              <code>**text**</code> instead of <code>*text*</code>).
            </>
          }
          buttonLabel="Fix Formats"
          onClick={onFixFormats}
          buttonTitle="Normalize HTML tags and legacy formats to :reminder: and *text*"
        />
      )}

      {/* Error and warning messages */}
      {allMessages.length > 0 && (
        <>
          <div className={styles.messagesDropdownUp}>
            {visibleMessages.map((msg, i) => (
              <div
                key={`msg-${msg.type}-${i}`}
                className={`${styles.messageItem} ${msg.type === 'error' ? styles.errorItem : styles.warningItem}`}
              >
                {msg.type === 'error' ? '\u26A0\uFE0F' : '\u2139\uFE0F'} {msg.text}
              </div>
            ))}
            {showAllMessages &&
              hiddenMessages.map((msg, i) => (
                <div
                  key={`hidden-msg-${msg.type}-${i}`}
                  className={`${styles.messageItem} ${msg.type === 'error' ? styles.errorItem : styles.warningItem}`}
                >
                  {msg.type === 'error' ? '\u26A0\uFE0F' : '\u2139\uFE0F'} {msg.text}
                </div>
              ))}
          </div>
          {hasMoreMessages && (
            <button
              type="button"
              className={styles.showMoreBtn}
              onClick={() => setShowAllMessages(!showAllMessages)}
            >
              {showAllMessages ? '\u25B2 Show less' : `\u25BC Show ${hiddenMessages.length} more`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default ScriptMessagesBar;
