/**
 * InfoMessage Component
 * Reusable component for displaying contextual info messages with action buttons.
 * Used in JsonView for script improvement suggestions (format, sort, add meta, etc.)
 */

import styles from '../../../styles/components/views/Views.module.css'

interface InfoMessageProps {
  /** The message content - supports text and React nodes like <code> */
  message: React.ReactNode
  /** Label for the action button */
  buttonLabel: string
  /** Click handler for the action button */
  onClick: () => void
  /** Optional tooltip for the action button */
  buttonTitle?: string
}

export function InfoMessage({ message, buttonLabel, onClick, buttonTitle }: InfoMessageProps) {
  return (
    <div className={`${styles.messageItem} ${styles.infoItem}`}>
      <span>💡 {message}</span>
      <button
        className={styles.addMetaBtn}
        onClick={onClick}
        title={buttonTitle}
      >
        {buttonLabel}
      </button>
    </div>
  )
}
