/**
 * Type declarations for vite-plugin-pwa virtual modules
 */

declare module 'virtual:pwa-register' {
  export interface RegisterSWOptions {
    /**
     * Called when the service worker is registered but waiting to activate.
     * This happens when a new version is available but the old one is still running.
     */
    onNeedRefresh?: () => void;

    /**
     * Called when the app is ready to work offline.
     * The service worker has been installed and activated.
     */
    onOfflineReady?: () => void;

    /**
     * Called when the service worker registration fails.
     */
    onRegisteredSW?: (swScriptUrl: string, registration: ServiceWorkerRegistration | undefined) => void;

    /**
     * Called when the service worker registration fails.
     */
    onRegisterError?: (error: Error) => void;

    /**
     * Immediately claim and control the page after the service worker activates.
     * @default true
     */
    immediate?: boolean;
  }

  /**
   * Registers the service worker and returns a function to update it.
   * When called, the update function will reload the page with the new service worker.
   */
  export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>;
}

declare module 'virtual:pwa-register/react' {
  import type { Dispatch, SetStateAction } from 'react';

  export interface RegisterSWOptions {
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegisteredSW?: (swScriptUrl: string, registration: ServiceWorkerRegistration | undefined) => void;
    onRegisterError?: (error: Error) => void;
    immediate?: boolean;
  }

  export function useRegisterSW(options?: RegisterSWOptions): {
    needRefresh: [boolean, Dispatch<SetStateAction<boolean>>];
    offlineReady: [boolean, Dispatch<SetStateAction<boolean>>];
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
  };
}

/**
 * BeforeInstallPrompt event for PWA install prompt
 * This event is fired when the browser determines the app can be installed
 */
interface BeforeInstallPromptEvent extends Event {
  /**
   * Returns an array of DOMString items containing the platforms on which the event was dispatched.
   */
  readonly platforms: string[];

  /**
   * Returns a Promise that resolves to a DOMString containing either "accepted" or "dismissed".
   */
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;

  /**
   * Allows a developer to show the install prompt at a time of their own choosing.
   * This method returns a Promise.
   */
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
    appinstalled: Event;
  }
}

export {};
