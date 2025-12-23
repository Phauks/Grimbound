import { ErrorBoundary, ViewErrorFallback } from '@/components/Shared';
import styles from '@/styles/components/views/Views.module.css';

export function TownSquareView() {
  return (
    <ErrorBoundary
      fallbackRender={({ error, resetErrorBoundary }) => (
        <ViewErrorFallback view="Town Square" error={error} onRetry={resetErrorBoundary} />
      )}
    >
      <div className={styles.townSquareView}>
        <div className={styles.scriptViewPlaceholder}>
          <div className={styles.placeholderIcon}>🏘️</div>
          <h2>Town Square</h2>
          <p>Coming Soon</p>
          <p className={styles.placeholderDescription}>
            Share and discover Blood on the Clocktower projects, scripts, and custom assets with the
            community. Download presets, manage shared collections, and collaborate on content
            creation.
          </p>
        </div>
      </div>
    </ErrorBoundary>
  );
}
