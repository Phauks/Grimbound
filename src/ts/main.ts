/**
 * Blood on the Clocktower Token Generator
 * Main Entry Point - Application initialization
 */

import UIController from './ui.js';
import { checkFontsLoaded } from './utils.js';

/**
 * Main application class
 */
class TokenGeneratorApp {
    private ui: UIController | null;
    private fontsLoaded: boolean;

    constructor() {
        this.ui = null;
        this.fontsLoaded = false;
    }

    /**
     * Initialize the application
     */
    async init(): Promise<void> {
        console.log('Blood on the Clocktower Token Generator starting...');

        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            await new Promise<void>(resolve => {
                document.addEventListener('DOMContentLoaded', () => resolve());
            });
        }

        // Display version number
        await this.displayVersion();

        // Load custom fonts
        await this.loadFonts();

        // Initialize UI controller
        this.ui = new UIController();
        await this.ui.initialize();

        console.log('Application initialized successfully');
    }

    /**
     * Load and display version number from version.json
     */
    private async displayVersion(): Promise<void> {
        const versionElement = document.getElementById('versionNumber');
        if (!versionElement) return;

        try {
            const response = await fetch('./version.json');
            if (response.ok) {
                const versionData = await response.json();
                if (versionData.version) {
                    versionElement.textContent = `v${versionData.version}`;
                }
            }
        } catch (error) {
            console.warn('Failed to load version from version.json:', error);
        }
    }

    /**
     * Load custom fonts
     */
    private async loadFonts(): Promise<void> {
        const fontFamilies = [
            'Dumbledor',
            'DumbledorThin',
            'DumbledorWide',
            'TradeGothic',
            'TradeGothicBold'
        ];

        // Wait for fonts to be loaded
        if (document.fonts) {
            try {
                await document.fonts.ready;
                this.fontsLoaded = await checkFontsLoaded(fontFamilies);

                if (!this.fontsLoaded) {
                    console.warn('Some custom fonts may not have loaded properly');
                } else {
                    console.log('Custom fonts loaded successfully');
                }
            } catch (error) {
                console.warn('Font loading check failed:', error);
            }
        } else {
            // Fallback: wait a bit for fonts to load
            await new Promise<void>(resolve => setTimeout(resolve, 500));
            console.log('Font loading (fallback mode)');
        }
    }
}

// Create and initialize the application
const app = new TokenGeneratorApp();
app.init().catch(error => {
    console.error('Application initialization failed:', error);
});

// Export for debugging
window.TokenGeneratorApp = app;
