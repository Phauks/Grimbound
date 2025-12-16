import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ThemeProvider } from './contexts/ThemeContext'
import { DataSyncProvider } from './contexts/DataSyncContext'
import { registerSW } from 'virtual:pwa-register'
import './styles/index.css'

// Register service worker for PWA functionality
// Using autoUpdate mode - the app will automatically update when a new version is available
const updateSW = registerSW({
  onNeedRefresh() {
    // A new version is available - the service worker will update automatically
    // Log for debugging, but don't interrupt the user
    console.log('[PWA] New content available, will update on next reload');
  },
  onOfflineReady() {
    console.log('[PWA] App is ready to work offline');
  },
  onRegisteredSW(swUrl, registration) {
    console.log('[PWA] Service worker registered:', swUrl);

    // Check for updates periodically (every hour)
    if (registration) {
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);
    }
  },
  onRegisterError(error) {
    console.error('[PWA] Service worker registration failed:', error);
  }
});

// Export updateSW for manual update triggering if needed
(window as { updateSW?: typeof updateSW }).updateSW = updateSW;

const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <DataSyncProvider>
        <App />
      </DataSyncProvider>
    </ThemeProvider>
  </React.StrictMode>
)
