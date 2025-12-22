import { SaveAsNewProjectButton } from '@/components/Shared/Assets/SaveAsNewProjectButton';
import { AutoSaveIndicator } from '@/components/Shared/Feedback/AutoSaveIndicator';
import styles from '@/styles/components/layout/Header.module.css';

interface AppHeaderProps {
  onSettingsClick: () => void;
  onInfoClick: () => void;
  onAnnouncementsClick: () => void;
  onSyncDetailsClick?: () => void;
  onAssetManagerClick: () => void;
  version?: string;
  currentProjectName?: string | null;
}

export function AppHeader({
  onSettingsClick,
  onInfoClick,
  onAnnouncementsClick,
  onAssetManagerClick,
  version = '0.4.0',
  currentProjectName,
}: AppHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <h1 className={styles.title}>Blood on the Clocktower Token Generator</h1>

        {/* Show project name when project exists */}
        {currentProjectName && (
          <span
            style={{
              marginLeft: '16px',
              fontSize: '14px',
              color: 'var(--text-secondary)',
              fontWeight: 500,
            }}
          >
            {currentProjectName}
          </span>
        )}

        {/* Show "Save as New" when no active project */}
        {!currentProjectName && (
          <div style={{ marginLeft: '16px' }}>
            <SaveAsNewProjectButton />
          </div>
        )}

        <div style={{ marginLeft: '16px' }}>
          <AutoSaveIndicator />
        </div>
      </div>
      <div className={styles.headerRight}>
        <button
          type="button"
          className={styles.iconButton}
          onClick={onAssetManagerClick}
          aria-label="Open Asset Manager"
          title="Asset Manager - Manage uploaded assets"
        >
          <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
            <path
              fill="currentColor"
              d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"
            />
          </svg>
        </button>
        <button
          type="button"
          className={styles.iconButton}
          onClick={onAnnouncementsClick}
          aria-label="Open announcements"
          title="Announcements"
        >
          <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
            <path
              fill="currentColor"
              d="M18 11v2h4v-2h-4zm-2 6.61c.96.71 2.21 1.65 3.2 2.39.4-.53.8-1.07 1.2-1.6-.99-.74-2.24-1.68-3.2-2.4-.4.54-.8 1.08-1.2 1.61zM20.4 5.6c-.4-.53-.8-1.07-1.2-1.6-.99.74-2.24 1.68-3.2 2.4.4.53.8 1.07 1.2 1.6.96-.72 2.21-1.65 3.2-2.4zM4 9c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v4h2v-4h1l5 3V6L8 9H4zm11.5 3c0-1.33-.58-2.53-1.5-3.35v6.69c.92-.81 1.5-2.01 1.5-3.34z"
            />
          </svg>
        </button>
        <button
          type="button"
          className={styles.iconButton}
          onClick={onInfoClick}
          aria-label="Open info"
          title="About this tool"
        >
          <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
            />
          </svg>
        </button>
        <button
          type="button"
          className={styles.iconButton}
          onClick={onSettingsClick}
          aria-label="Open settings"
          title="User interface settings"
        >
          <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
            <path
              fill="currentColor"
              d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
            />
          </svg>
        </button>
        <a
          href="https://script.bloodontheclocktower.com/"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.iconButton}
          title="Open the official Script Tool"
        >
          <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
            <path
              fill="currentColor"
              d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"
            />
          </svg>
          <span className={styles.srOnly}>Open Script Tool</span>
        </a>
        <a
          href="https://github.com/Phauks/Clocktower_Token_Generator"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.iconButton}
          aria-label="View source on GitHub"
          title="View source code on GitHub"
        >
          <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"
            />
          </svg>
          <span className={styles.version}>{version}</span>
        </a>
      </div>
    </header>
  );
}
