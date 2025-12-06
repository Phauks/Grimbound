import { useEffect, useState, useMemo } from 'react'
import type { Token } from '../../ts/types/index.js'
import { groupTokensByIdentity } from '../../ts/utils/tokenGrouping'
import styles from '../../styles/components/tokenDetail/TokenPreview.module.css'

interface TokenPreviewProps {
  characterToken: Token
  reminderTokens: Token[]
  onReminderClick: (token: Token) => void
}

const REMINDERS_PER_PAGE = 3

// Helper to convert canvas to data URL with caching
const canvasToDataUrl = (canvas: HTMLCanvasElement | undefined): string | null => {
  if (!canvas) return null
  return canvas.toDataURL('image/png')
}

export function TokenPreview({ characterToken, reminderTokens, onReminderClick }: TokenPreviewProps) {
  const [selectedReminder, setSelectedReminder] = useState<Token | null>(null)
  const [startIndex, setStartIndex] = useState(0)

  // Convert canvases to data URLs for high-quality img rendering
  const characterImageUrl = useMemo(() => canvasToDataUrl(characterToken.canvas), [characterToken.canvas])
  const selectedReminderImageUrl = useMemo(() => canvasToDataUrl(selectedReminder?.canvas), [selectedReminder?.canvas])

  // Group reminder tokens to show count badges for duplicates
  const groupedReminders = useMemo(() => groupTokensByIdentity(reminderTokens), [reminderTokens])

  // Calculate visible reminders based on pagination (using grouped reminders)
  const visibleReminders = groupedReminders.slice(startIndex, startIndex + REMINDERS_PER_PAGE)
  const canGoLeft = startIndex > 0
  const canGoRight = startIndex + REMINDERS_PER_PAGE < groupedReminders.length

  // Reset pagination when character changes
  useEffect(() => {
    setStartIndex(0)
  }, [characterToken])
  
  // Reset selected reminder when character changes
  useEffect(() => {
    setSelectedReminder(null)
  }, [characterToken])
  
  const handleReminderClick = (reminder: Token) => {
    // Toggle: deselect if already selected, otherwise select
    if (selectedReminder?.filename === reminder.filename) {
      setSelectedReminder(null)
    } else {
      setSelectedReminder(reminder)
    }
  }
  
  const handleCloseReminder = () => {
    setSelectedReminder(null)
  }

  return (
    <div className={styles.previewArea}>
      {/* Character token or selected reminder - in same location */}
      <div className={styles.preview}>
        {selectedReminder && selectedReminderImageUrl ? (
          <>
            <img
              src={selectedReminderImageUrl}
              alt={selectedReminder.reminderText || selectedReminder.filename}
              className={styles.canvasLarge}
              title={selectedReminder.reminderText || selectedReminder.filename}
            />
            <button
              type="button"
              className={styles.closeBtn}
              onClick={handleCloseReminder}
              aria-label="Close reminder preview"
            >
              ×
            </button>
          </>
        ) : characterImageUrl ? (
          <img
            src={characterImageUrl}
            alt={characterToken.name}
            className={styles.canvasLarge}
            title={characterToken.filename}
          />
        ) : null}
      </div>

      {/* Reminder tokens gallery below - always show */}
      <div className={styles.reminders}>
        <h4>Reminder Tokens</h4>
        <div className={styles.galleryContainer}>
          <button
            type="button"
            className={`${styles.galleryArrow} ${canGoLeft ? styles.hasMore : ''}`}
            onClick={() => setStartIndex(Math.max(0, startIndex - 1))}
            disabled={!canGoLeft}
            aria-label="Show previous reminder"
          >
            ‹
          </button>
          <div className={styles.gallery}>
            {visibleReminders.length > 0 ? (
              visibleReminders.map(({ token: reminder, count }) => {
                const reminderImageUrl = canvasToDataUrl(reminder.canvas)
                return (
                  <div
                    key={reminder.filename}
                    className={`${styles.reminderItem} ${selectedReminder?.filename === reminder.filename ? styles.selected : ''}`}
                    onClick={() => handleReminderClick(reminder)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleReminderClick(reminder)
                      }
                    }}
                    title={reminder.reminderText || reminder.filename}
                  >
                    <div className={styles.reminderCanvasContainer}>
                      {count > 1 && <span className={styles.countBadge}>{count}</span>}
                      {reminderImageUrl && (
                        <img
                          src={reminderImageUrl}
                          alt={reminder.reminderText || reminder.filename}
                          className={styles.reminderImage}
                          width="120"
                          height="120"
                        />
                      )}
                    </div>
                    <span className={styles.reminderText}>{reminder.reminderText || reminder.filename}</span>
                  </div>
                )
              })
            ) : (
              <div className={styles.empty}>
                <span className={styles.emptyText}>No reminder tokens</span>
              </div>
            )}
          </div>
          <button
            type="button"
            className={`${styles.galleryArrow} ${canGoRight ? styles.hasMore : ''}`}
            onClick={() => setStartIndex(startIndex + 1)}
            disabled={!canGoRight}
            aria-label="Show next reminder"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  )
}
