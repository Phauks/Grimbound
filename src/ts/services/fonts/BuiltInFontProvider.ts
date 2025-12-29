/**
 * Built-In Font Provider
 *
 * Provides access to fonts bundled with the application.
 * These fonts are loaded via CSS @font-face declarations in fonts.css.
 *
 * @module services/fonts/BuiltInFontProvider
 */

import type { FontDefinition, FontWeight } from '@/ts/types/fonts.js';
import { logger } from '@/ts/utils/logger.js';
import type { IFontProvider } from './IFontServices.js';

// ============================================================================
// Constants
// ============================================================================

/**
 * Built-in fonts bundled with the application.
 * These are defined via @font-face in fonts.css and are always available.
 */
const BUILTIN_FONTS: FontDefinition[] = [
  {
    id: 'builtin-dumbledor',
    name: 'Dumbledor',
    family: 'Dumbledor',
    source: 'builtin',
    category: 'Display',
    weights: [400],
    hasItalic: false,
    status: 'loaded', // Always loaded via CSS
  },
  {
    id: 'builtin-dumbledor-thin',
    name: 'Dumbledor Thin',
    family: 'DumbledorThin',
    source: 'builtin',
    category: 'Display',
    weights: [300],
    hasItalic: false,
    status: 'loaded',
  },
  {
    id: 'builtin-dumbledor-wide',
    name: 'Dumbledor Wide',
    family: 'DumbledorWide',
    source: 'builtin',
    category: 'Display',
    weights: [400],
    hasItalic: false,
    status: 'loaded',
  },
  {
    id: 'builtin-tradegothic',
    name: 'Trade Gothic',
    family: 'TradeGothic',
    source: 'builtin',
    category: 'Sans Serif',
    weights: [400],
    hasItalic: false,
    status: 'loaded',
  },
  {
    id: 'builtin-tradegothic-bold',
    name: 'Trade Gothic Bold',
    family: 'TradeGothicBold',
    source: 'builtin',
    category: 'Sans Serif',
    weights: [700],
    hasItalic: false,
    status: 'loaded',
  },
  {
    id: 'builtin-goudy',
    name: 'Goudy Old Style',
    family: 'Goudy Old Style',
    source: 'builtin',
    category: 'Serif',
    weights: [400],
    hasItalic: false,
    status: 'loaded',
  },
  {
    id: 'builtin-lhf-unlovable',
    name: 'LHF Unlovable',
    family: 'LHF Unlovable',
    source: 'builtin',
    category: 'Script',
    weights: [400],
    hasItalic: false,
    status: 'loaded',
  },
];

/**
 * Map font family to file path for PDF embedding
 */
export const BUILTIN_FONT_PATHS: Record<string, string> = {
  Dumbledor: '/fonts/Dumbledor/Dumbledor.ttf',
  DumbledorThin: '/fonts/Dumbledor/DumbledorThin.ttf',
  DumbledorWide: '/fonts/Dumbledor/DumbledorWide.ttf',
  TradeGothic: '/fonts/TradeGothic/TradeGothic.otf',
  TradeGothicBold: '/fonts/TradeGothic/TradeGothicBold.otf',
  'Goudy Old Style': '/fonts/GoudyOldStyle/GoudyOldStyle.ttf',
  'LHF Unlovable': '/fonts/LHF_Unlovable.ttf',
};

// ============================================================================
// BuiltInFontProvider Class
// ============================================================================

/**
 * Provider for built-in fonts bundled with the application.
 *
 * These fonts are always available and loaded via CSS @font-face declarations.
 * No dynamic loading is required - the browser loads them on demand.
 */
export class BuiltInFontProvider implements IFontProvider {
  readonly source = 'builtin' as const;

  /**
   * Get all available built-in fonts
   *
   * @returns Array of built-in font definitions
   */
  async getAvailableFonts(): Promise<FontDefinition[]> {
    return [...BUILTIN_FONTS];
  }

  /**
   * Load a built-in font.
   * Built-in fonts are loaded via CSS @font-face, so this is essentially a no-op.
   * The browser will load the font file when it's first used.
   *
   * @param family - Font family name
   * @param _weights - Weights to load (ignored for built-in fonts)
   */
  async loadFont(family: string, _weights?: FontWeight[]): Promise<void> {
    const font = BUILTIN_FONTS.find((f) => f.family === family);
    if (!font) {
      logger.warn('BuiltInFontProvider', `Font not found: ${family}`);
      return;
    }

    // Optionally ensure the font is loaded by requesting it
    try {
      await document.fonts.load(`16px "${family}"`);
      logger.debug('BuiltInFontProvider', `Font ready: ${family}`);
    } catch {
      // Font may not be fully loaded yet, but that's okay
      // The browser will load it when needed
      logger.debug('BuiltInFontProvider', `Font will load on demand: ${family}`);
    }
  }

  /**
   * Check if a built-in font is loaded.
   * Built-in fonts are always considered "loaded" since they're defined in CSS.
   *
   * @param family - Font family name
   * @returns True if the font is a built-in font
   */
  isLoaded(family: string): boolean {
    return BUILTIN_FONTS.some((f) => f.family === family);
  }

  /**
   * Get the file path for a built-in font (for PDF embedding)
   *
   * @param family - Font family name
   * @returns File path or undefined if not found
   */
  getFontPath(family: string): string | undefined {
    return BUILTIN_FONT_PATHS[family];
  }

  /**
   * Get font bytes for PDF embedding
   *
   * @param family - Font family name
   * @returns ArrayBuffer of font data or null if not found
   */
  async getFontBytes(family: string): Promise<ArrayBuffer | null> {
    const path = this.getFontPath(family);
    if (!path) {
      logger.warn('BuiltInFontProvider', `No font path for: ${family}`);
      return null;
    }

    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to fetch font: ${response.status}`);
      }
      return response.arrayBuffer();
    } catch (error) {
      logger.error('BuiltInFontProvider', `Failed to load font bytes for ${family}`, error);
      return null;
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Singleton instance of BuiltInFontProvider
 */
export const builtInFontProvider = new BuiltInFontProvider();
