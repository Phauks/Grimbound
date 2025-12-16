import { useEffect, useRef, useState } from 'react';
import styles from '../../../styles/components/characterEditor/ActionButtons.module.css';

interface ActionButtonsProps {
  isLoading: boolean;
  hasReminderTokens?: boolean;
  downloadProgress?: { current: number; total: number } | null;
  onDownloadAll: () => void;
  onDownloadCharacter: () => void;
  onDownloadReminders: () => void;
  onDownloadJson: () => void;
}

export function ActionButtons({
  isLoading,
  hasReminderTokens = true,
  downloadProgress,
  onDownloadAll,
  onDownloadCharacter,
  onDownloadReminders,
  onDownloadJson,
}: ActionButtonsProps) {
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Calculate progress percentage from downloadProgress prop
  const progressPercent =
    downloadProgress && downloadProgress.total > 0
      ? Math.round((downloadProgress.current / downloadProgress.total) * 100)
      : 0;
  const isDownloading = downloadProgress !== null && downloadProgress !== undefined;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDownloadMenu(false);
      }
    };

    if (showDownloadMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDownloadMenu]);

  return (
    <div className={styles.actions}>
      <div className={styles.downloadDropdown} ref={dropdownRef}>
        <div className={styles.downloadButtonGroup}>
          <button
            type="button"
            className={`${styles.downloadMainBtn} ${isDownloading ? styles.downloading : ''}`}
            onClick={onDownloadAll}
            disabled={isLoading}
            title="Download character token, reminder tokens, and JSON as ZIP"
            style={
              isDownloading
                ? ({ '--progress': `${progressPercent}%` } as React.CSSProperties)
                : undefined
            }
          >
            <span className={styles.downloadProgress} />
            <span className={styles.icon}>📥</span>
            {isDownloading ? `${progressPercent}%` : 'Download All'}
          </button>
          <button
            type="button"
            className={`${styles.downloadCaretBtn} ${isDownloading ? styles.downloading : ''}`}
            onClick={() => setShowDownloadMenu(!showDownloadMenu)}
            disabled={isLoading}
            title="More download options"
            aria-label="More download options"
            aria-expanded={showDownloadMenu}
          >
            <span className={styles.caretIcon}>▼</span>
          </button>
        </div>
        {showDownloadMenu && (
          <div className={styles.downloadMenu}>
            <button
              type="button"
              className={styles.downloadMenuItem}
              onClick={() => {
                onDownloadCharacter();
                setShowDownloadMenu(false);
              }}
            >
              Character Token Only
            </button>
            <button
              type="button"
              className={styles.downloadMenuItem}
              onClick={() => {
                onDownloadReminders();
                setShowDownloadMenu(false);
              }}
              disabled={!hasReminderTokens}
              title={!hasReminderTokens ? 'No reminder tokens to download' : undefined}
            >
              Reminder Tokens Only
            </button>
            <button
              type="button"
              className={styles.downloadMenuItem}
              onClick={() => {
                onDownloadJson();
                setShowDownloadMenu(false);
              }}
            >
              Character JSON Only
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
