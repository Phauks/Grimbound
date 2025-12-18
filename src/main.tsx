import { registerSW } from 'virtual:pwa-register';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { DataSyncProvider } from './contexts/DataSyncContext';
import { ServiceProvider } from './contexts/ServiceContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { logger } from './ts/utils/logger.js';
import './styles/index.css';

// Create child logger for PWA operations
const pwaLogger = logger.child('PWA');

// Register service worker for PWA functionality
// Using autoUpdate mode - the app will automatically update when a new version is available
const updateSW = registerSW({
  onNeedRefresh() {
    // A new version is available - the service worker will update automatically
    // Log for debugging, but don't interrupt the user
    pwaLogger.info('New content available, will update on next reload');
  },
  onOfflineReady() {
    pwaLogger.info('App is ready to work offline');
  },
  onRegisteredSW(swUrl, registration) {
    pwaLogger.info('Service worker registered:', swUrl);

    // Check for updates periodically (every hour)
    if (registration) {
      setInterval(
        () => {
          registration.update();
        },
        60 * 60 * 1000
      );
    }
  },
  onRegisterError(error) {
    pwaLogger.error('Service worker registration failed:', error);
  },
});

// Export updateSW for manual update triggering if needed
(window as { updateSW?: typeof updateSW }).updateSW = updateSW;

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <ServiceProvider>
        <DataSyncProvider>
          <App />
        </DataSyncProvider>
      </ServiceProvider>
    </ThemeProvider>
  </React.StrictMode>
);
