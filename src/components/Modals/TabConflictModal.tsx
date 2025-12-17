/**
 * Tab Conflict Warning Modal
 *
 * Displays a warning when the same project is being edited in multiple tabs.
 * Helps prevent data loss from concurrent modifications.
 */

import styles from '../../styles/components/modals/TabConflictModal.module.css';

interface TabConflictModalProps {
  isOpen: boolean;
  conflictingTabCount: number;
  onContinue: () => void;
  onClose: () => void;
}

export function TabConflictModal({
  isOpen,
  conflictingTabCount,
  onContinue,
  onClose,
}: TabConflictModalProps) {
  if (!isOpen) return null;

  return (
    <button
      type="button"
      className={styles.overlay}
      aria-label="Close modal"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClose();
        }
      }}
      style={{ all: 'unset', display: 'block' }}
    >
      <section
        className={styles.modal}
        aria-modal="true"
        role="dialog"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          // Prevent propagation for keyboard events as well
          e.stopPropagation();
        }}
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.icon}>⚠️</div>
          <h2>Concurrent Editing Detected</h2>
        </div>

        {/* Content */}
        <div className={styles.content}>
          <p>
            This project is currently being edited in{' '}
            <strong>
              {conflictingTabCount} other tab{conflictingTabCount !== 1 ? 's' : ''}
            </strong>
            .
          </p>

          <div className={styles.warning}>
            <h3>⚠️ Risk of Data Loss</h3>
            <p>
              Changes made in one tab may overwrite changes made in another tab. The last tab to
              save will win.
            </p>
          </div>

          <div className={styles.recommendation}>
            <h4>Recommended Action:</h4>
            <ol>
              <li>Close this tab or the other tab(s)</li>
              <li>Work in only one tab at a time</li>
              <li>Use the version history (🕒 button) to recover if needed</li>
            </ol>
          </div>

          <p className={styles.note}>
            <strong>Note:</strong> Auto-save will continue to work, but conflicts may result in lost
            changes.
          </p>
        </div>

        {/* Actions */}
        <div className={styles.actions}>
          <button type="button" className={styles.closeButton} onClick={onClose}>
            Close Other Tabs
          </button>
          <button type="button" className={styles.continueButton} onClick={onContinue}>
            Continue Anyway
          </button>
        </div>
      </section>
    </button>
  );
}
