/**
 * CharacterSelectionCard Component
 *
 * A distinctive purple-tinted card for character selection in the export view.
 * Visually differentiated from download sections to emphasize its role as
 * configuration that affects all exports.
 *
 * @module components/ViewComponents/ExportComponents/CharacterSelectionCard
 */

import { type ReactNode, useState } from 'react';
import styles from '@/styles/components/export/DownloadComponents.module.css';

export interface CharacterSelectionCardProps {
  /** Number of enabled characters */
  enabledCount: number;
  /** Total number of characters */
  totalCount: number;
  /** Number of disabled/excluded characters */
  disabledCount: number;
  /** Initial expanded state */
  defaultOpen?: boolean;
  /** Content to render when expanded */
  children: ReactNode;
}

/**
 * Purple-tinted card for character selection that stands out from
 * the standard download sections. Uses collapsible header with arrow
 * matching the download section pattern.
 *
 * @example
 * ```tsx
 * <CharacterSelectionCard
 *   enabledCount={12}
 *   totalCount={15}
 *   disabledCount={3}
 *   defaultOpen={false}
 * >
 *   <CharacterListView ... />
 * </CharacterSelectionCard>
 * ```
 */
export function CharacterSelectionCard({
  enabledCount,
  totalCount,
  disabledCount,
  defaultOpen = false,
  children,
}: CharacterSelectionCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={styles.characterSelectionCard}>
      <button
        type="button"
        className={styles.characterSelectionCardHeader}
        onClick={handleToggle}
        aria-expanded={isOpen}
      >
        <span
          className={`${styles.characterSelectionCardArrow} ${isOpen ? styles.characterSelectionCardArrowOpen : ''}`}
          aria-hidden="true"
        >
          ▶
        </span>
        <span className={styles.characterSelectionCardIcon} aria-hidden="true">
          👥
        </span>
        <h3 className={styles.characterSelectionCardHeading}>Character Selection</h3>

        <div className={styles.characterSelectionCardSummary}>
          <span className={styles.characterSelectionCardCount}>
            {enabledCount} of {totalCount} included
          </span>
          {disabledCount > 0 && (
            <span className={styles.characterSelectionCardBadge}>{disabledCount} excluded</span>
          )}
        </div>
      </button>

      {isOpen && <div className={styles.characterSelectionCardContent}>{children}</div>}
    </div>
  );
}

export default CharacterSelectionCard;
