/**
 * PWA Install Hook
 *
 * Manages PWA installation state and prompt.
 *
 * @module hooks/pwa/usePWAInstall
 */

import { useCallback, useEffect, useState } from 'react';
import { logger } from '@/ts/utils/logger.js';

// Create child logger for PWA operations
const pwaLogger = logger.child('PWA');

/**
 * BeforeInstallPrompt event interface
 * This event is fired when the browser determines the app can be installed
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface PWAInstallState {
  /** Whether the app can be installed (install prompt is available) */
  canInstall: boolean;
  /** Whether the app is already installed (running in standalone mode) */
  isInstalled: boolean;
  /** Whether the install prompt is currently showing */
  isPrompting: boolean;
  /** Trigger the install prompt */
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>;
}

/**
 * Hook to manage PWA installation state and prompt
 *
 * @example
 * ```tsx
 * const { canInstall, isInstalled, promptInstall } = usePWAInstall();
 *
 * return canInstall && !isInstalled && (
 *   <button onClick={promptInstall}>Install App</button>
 * );
 * ```
 */
export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isPrompting, setIsPrompting] = useState(false);

  useEffect(() => {
    // Check if app is already installed (running in standalone mode)
    const checkInstalled = () => {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://');

      setIsInstalled(isStandalone);
    };

    checkInstalled();

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    // Capture the beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Store the event for later use
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      pwaLogger.info('App was installed successfully');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredPrompt) {
      pwaLogger.info('Install prompt not available');
      return 'unavailable';
    }

    setIsPrompting(true);

    try {
      // Show the install prompt
      await deferredPrompt.prompt();

      // Wait for the user's response
      const { outcome } = await deferredPrompt.userChoice;
      pwaLogger.info(`User ${outcome} the install prompt`);

      // Clear the deferred prompt - it can only be used once
      setDeferredPrompt(null);

      return outcome;
    } catch (error) {
      pwaLogger.error('Error showing install prompt', error);
      return 'unavailable';
    } finally {
      setIsPrompting(false);
    }
  }, [deferredPrompt]);

  return {
    canInstall: deferredPrompt !== null,
    isInstalled,
    isPrompting,
    promptInstall,
  };
}

export default usePWAInstall;
