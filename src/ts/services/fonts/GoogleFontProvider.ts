/**
 * Google Fonts Provider
 *
 * Provides access to Google Fonts via the Google Fonts CSS2 API.
 * Fonts are loaded on-demand via dynamically injected <link> elements.
 *
 * @module services/fonts/GoogleFontProvider
 */

import { CONFIG } from '@/ts/config.js';
import type { FontCategory, FontDefinition, FontWeight, GoogleFontItem } from '@/ts/types/fonts.js';
import { logger } from '@/ts/utils/logger.js';
import { fontDb } from './fontDatabase.js';
import type { IGoogleFontProvider } from './IFontServices.js';

// ============================================================================
// Constants
// ============================================================================

/** Cache duration for the Google Fonts catalog (7 days) */
const CATALOG_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;

/**
 * Curated list of Google Fonts suitable for token generation.
 * These fonts are pre-loaded into the catalog for offline use.
 */
const CURATED_FONTS = [
  // Display fonts (Dumbledor alternatives)
  'Cinzel',
  'Cinzel Decorative',
  'UnifrakturMaguntia',
  'MedievalSharp',
  'Pirata One',
  'Almendra',
  'Almendra Display',
  'Fondamento',
  'Henny Penny',
  'Mystery Quest',
  'Jolly Lodger',
  'Creepster',

  // Serif fonts (Goudy alternatives)
  'Sorts Mill Goudy',
  'Playfair Display',
  'Cormorant Garamond',
  'Libre Baskerville',
  'EB Garamond',
  'Crimson Text',
  'Lora',
  'Merriweather',
  'Spectral',
  'Source Serif Pro',

  // Sans Serif fonts (Trade Gothic alternatives)
  'Libre Franklin',
  'Open Sans',
  'Roboto',
  'Lato',
  'Montserrat',
  'Source Sans Pro',
  'Nunito',
  'Work Sans',
  'Inter',
  'Poppins',

  // Script fonts
  'Dancing Script',
  'Great Vibes',
  'Pacifico',
  'Satisfy',
  'Tangerine',
  'Alex Brush',
  'Allura',
];

/**
 * Static font catalog with curated fonts.
 * Format matches Google Fonts API response for consistency.
 */
const STATIC_FONT_CATALOG: Partial<GoogleFontItem>[] = [
  // Display
  { family: 'Cinzel', category: 'serif', variants: ['400', '500', '600', '700', '800', '900'] },
  { family: 'Cinzel Decorative', category: 'display', variants: ['400', '700', '900'] },
  { family: 'MedievalSharp', category: 'display', variants: ['400'] },
  { family: 'Pirata One', category: 'display', variants: ['400'] },
  { family: 'Almendra', category: 'serif', variants: ['400', '700', '400italic', '700italic'] },
  { family: 'Almendra Display', category: 'display', variants: ['400'] },
  { family: 'Fondamento', category: 'handwriting', variants: ['400', '400italic'] },
  { family: 'Henny Penny', category: 'display', variants: ['400'] },
  { family: 'Mystery Quest', category: 'display', variants: ['400'] },
  { family: 'Jolly Lodger', category: 'display', variants: ['400'] },
  { family: 'Creepster', category: 'display', variants: ['400'] },
  { family: 'UnifrakturMaguntia', category: 'display', variants: ['400'] },

  // Serif
  { family: 'Sorts Mill Goudy', category: 'serif', variants: ['400', '400italic'] },
  {
    family: 'Playfair Display',
    category: 'serif',
    variants: ['400', '500', '600', '700', '800', '900'],
  },
  {
    family: 'Cormorant Garamond',
    category: 'serif',
    variants: ['300', '400', '500', '600', '700'],
  },
  { family: 'Libre Baskerville', category: 'serif', variants: ['400', '700', '400italic'] },
  { family: 'EB Garamond', category: 'serif', variants: ['400', '500', '600', '700', '800'] },
  {
    family: 'Crimson Text',
    category: 'serif',
    variants: ['400', '600', '700', '400italic', '600italic', '700italic'],
  },
  {
    family: 'Lora',
    category: 'serif',
    variants: ['400', '500', '600', '700', '400italic', '500italic', '600italic', '700italic'],
  },
  { family: 'Merriweather', category: 'serif', variants: ['300', '400', '700', '900'] },
  {
    family: 'Spectral',
    category: 'serif',
    variants: ['200', '300', '400', '500', '600', '700', '800'],
  },
  {
    family: 'Source Serif Pro',
    category: 'serif',
    variants: ['200', '300', '400', '600', '700', '900'],
  },

  // Sans Serif
  {
    family: 'Libre Franklin',
    category: 'sans-serif',
    variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  },
  {
    family: 'Open Sans',
    category: 'sans-serif',
    variants: ['300', '400', '500', '600', '700', '800'],
  },
  {
    family: 'Roboto',
    category: 'sans-serif',
    variants: ['100', '300', '400', '500', '700', '900'],
  },
  { family: 'Lato', category: 'sans-serif', variants: ['100', '300', '400', '700', '900'] },
  {
    family: 'Montserrat',
    category: 'sans-serif',
    variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  },
  {
    family: 'Source Sans Pro',
    category: 'sans-serif',
    variants: ['200', '300', '400', '600', '700', '900'],
  },
  {
    family: 'Nunito',
    category: 'sans-serif',
    variants: ['200', '300', '400', '500', '600', '700', '800', '900'],
  },
  {
    family: 'Work Sans',
    category: 'sans-serif',
    variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  },
  {
    family: 'Inter',
    category: 'sans-serif',
    variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  },
  {
    family: 'Poppins',
    category: 'sans-serif',
    variants: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  },

  // Script
  { family: 'Dancing Script', category: 'handwriting', variants: ['400', '500', '600', '700'] },
  { family: 'Great Vibes', category: 'handwriting', variants: ['400'] },
  { family: 'Pacifico', category: 'handwriting', variants: ['400'] },
  { family: 'Satisfy', category: 'handwriting', variants: ['400'] },
  { family: 'Tangerine', category: 'handwriting', variants: ['400', '700'] },
  { family: 'Alex Brush', category: 'handwriting', variants: ['400'] },
  { family: 'Allura', category: 'handwriting', variants: ['400'] },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map Google category to our FontCategory
 *
 * @param googleCategory - Category from Google Fonts API
 * @returns Mapped FontCategory
 */
function mapCategory(googleCategory: string): FontCategory {
  const mapping: Record<string, FontCategory> = {
    display: 'Display',
    serif: 'Serif',
    'sans-serif': 'Sans Serif',
    handwriting: 'Script',
    monospace: 'Monospace',
  };
  return mapping[googleCategory] ?? 'Sans Serif';
}

/**
 * Parse Google variants to weights
 *
 * @param variants - Array of variant strings from Google Fonts
 * @returns Array of parsed FontWeight values
 */
function parseWeights(variants: string[]): FontWeight[] {
  const weights: FontWeight[] = [];
  for (const variant of variants) {
    // Skip italic variants for weight extraction
    if (variant.includes('italic') && variant !== 'italic') {
      const match = variant.match(/^(\d+)/);
      if (match) {
        weights.push(Number.parseInt(match[1], 10) as FontWeight);
      }
      continue;
    }

    const match = variant.match(/^(\d+)/);
    if (match) {
      weights.push(Number.parseInt(match[1], 10) as FontWeight);
    } else if (variant === 'regular' || variant === 'italic') {
      weights.push(400);
    }
  }
  // Remove duplicates and sort
  return [...new Set(weights)].sort((a, b) => a - b);
}

/**
 * Check if variants include italic
 *
 * @param variants - Array of variant strings
 * @returns True if any variant includes italic
 */
function hasItalicVariant(variants: string[]): boolean {
  return variants.some((v) => v.includes('italic'));
}

// ============================================================================
// GoogleFontProvider Class
// ============================================================================

/**
 * Provider for Google Fonts.
 *
 * Loads fonts on-demand via the Google Fonts CSS2 API.
 * Maintains a catalog of available fonts with caching.
 */
export class GoogleFontProvider implements IGoogleFontProvider {
  readonly source = 'google' as const;

  /** Font catalog indexed by family name */
  private catalog: Map<string, FontDefinition> = new Map();

  /** Fonts that have been loaded into the document */
  private loadedFonts: Set<string> = new Set();

  /** When the catalog was last fetched */
  private catalogFetchedAt: Date | null = null;

  /** Link elements for loaded fonts (for potential cleanup) */
  private fontLinks: Map<string, HTMLLinkElement> = new Map();

  /**
   * Get all available Google fonts from the catalog
   *
   * @returns Array of font definitions
   */
  async getAvailableFonts(): Promise<FontDefinition[]> {
    await this.ensureCatalog();
    return Array.from(this.catalog.values());
  }

  /**
   * Search fonts by name
   *
   * @param query - Search query
   * @returns Matching font definitions
   */
  async searchFonts(query: string): Promise<FontDefinition[]> {
    await this.ensureCatalog();
    const lowerQuery = query.toLowerCase();
    return Array.from(this.catalog.values()).filter(
      (font) =>
        font.name.toLowerCase().includes(lowerQuery) ||
        font.family.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get popular/curated fonts
   *
   * @param limit - Maximum number of fonts to return
   * @returns Popular font definitions
   */
  async getPopularFonts(limit = 50): Promise<FontDefinition[]> {
    await this.ensureCatalog();

    // Return curated fonts first
    const curated = CURATED_FONTS.map((family) => this.catalog.get(family)).filter(
      (f): f is FontDefinition => f !== undefined
    );

    if (curated.length >= limit) {
      return curated.slice(0, limit);
    }

    // Add more fonts to fill limit
    const others = Array.from(this.catalog.values())
      .filter((f) => !CURATED_FONTS.includes(f.family))
      .slice(0, limit - curated.length);

    return [...curated, ...others];
  }

  /**
   * Load a Google font into the document
   *
   * @param family - Font family name
   * @param weights - Specific weights to load (optional, loads all if not specified)
   */
  async loadFont(family: string, weights?: FontWeight[]): Promise<void> {
    // Check if already loaded
    if (this.loadedFonts.has(family)) {
      return;
    }

    const font = this.catalog.get(family);
    if (!font) {
      throw new Error(`Google Font not found: ${family}`);
    }

    // Build weights parameter
    const weightsToLoad = weights ?? font.weights;
    const weightsParam = weightsToLoad.join(';');

    // Build Google Fonts URL (CSS2 API)
    const encodedFamily = encodeURIComponent(family);
    const url = `https://fonts.googleapis.com/css2?family=${encodedFamily}:wght@${weightsParam}&display=swap`;

    // Create and inject link element
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.crossOrigin = 'anonymous';

    // Wait for font to load
    await new Promise<void>((resolve, reject) => {
      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Failed to load font stylesheet: ${family}`));
      document.head.appendChild(link);
    });

    // Wait for the font face to be available
    try {
      await document.fonts.load(`16px "${family}"`);
    } catch {
      // Font face check failed, but stylesheet loaded - continue anyway
      logger.warn(
        'GoogleFontProvider',
        `Font face check failed for ${family}, but stylesheet loaded`
      );
    }

    // Store reference and mark as loaded
    this.fontLinks.set(family, link);
    this.loadedFonts.add(family);
    font.status = 'loaded';

    // Cache in IndexedDB
    await fontDb.markGoogleFontCached(family, weightsToLoad.map(String));

    logger.info('GoogleFontProvider', `Loaded font: ${family}`);
  }

  /**
   * Check if a font is loaded
   *
   * @param family - Font family name
   * @returns True if loaded
   */
  isLoaded(family: string): boolean {
    return this.loadedFonts.has(family);
  }

  /**
   * Refresh the font catalog from Google Fonts API or static catalog
   */
  async refreshCatalog(): Promise<void> {
    logger.info('GoogleFontProvider', 'Refreshing Google Fonts catalog');

    const apiKey = CONFIG.GOOGLE_FONTS?.API_KEY;

    // If API key is configured, fetch from Google Fonts API
    if (apiKey) {
      try {
        await this.fetchFromAPI(apiKey);
        return;
      } catch (error) {
        logger.warn(
          'GoogleFontProvider',
          'API fetch failed, falling back to static catalog',
          error
        );
      }
    }

    // Fall back to static catalog
    await this.loadStaticCatalog();

    this.catalogFetchedAt = new Date();

    // Cache in IndexedDB
    await fontDb.saveGoogleFontsCatalog({
      id: 'catalog',
      fonts: Array.from(this.catalog.values()).map((f) => ({
        family: f.family,
        variants: f.weights.map(String),
        subsets: ['latin'],
        category: f.category.toLowerCase().replace(' ', '-'),
        files: {},
      })),
      fetchedAt: this.catalogFetchedAt,
      version: '1.0',
    });
  }

  /**
   * Fetch font catalog from Google Fonts API
   */
  private async fetchFromAPI(apiKey: string): Promise<void> {
    const endpoint =
      CONFIG.GOOGLE_FONTS?.API_ENDPOINT || 'https://www.googleapis.com/webfonts/v1/webfonts';
    const url = `${endpoint}?key=${apiKey}&sort=popularity`;

    logger.info('GoogleFontProvider', 'Fetching from Google Fonts API...');

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Google Fonts API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!(data.items && Array.isArray(data.items))) {
      throw new Error('Invalid response from Google Fonts API');
    }

    logger.info('GoogleFontProvider', `Received ${data.items.length} fonts from API`);

    // Parse and store fonts
    this.catalog.clear();
    for (const item of data.items) {
      const font: FontDefinition = {
        id: `google-${item.family.toLowerCase().replace(/\s+/g, '-')}`,
        name: item.family,
        family: item.family,
        source: 'google',
        category: mapCategory(item.category),
        weights: parseWeights(item.variants || ['regular']),
        hasItalic: hasItalicVariant(item.variants || []),
        status: this.loadedFonts.has(item.family) ? 'loaded' : 'pending',
      };
      this.catalog.set(item.family, font);
    }

    this.catalogFetchedAt = new Date();

    // Cache in IndexedDB
    await fontDb.saveGoogleFontsCatalog({
      id: 'catalog',
      fonts: data.items,
      fetchedAt: this.catalogFetchedAt,
      version: String(data.items.length),
    });

    logger.info('GoogleFontProvider', `Cached ${this.catalog.size} fonts from API`);
  }

  /**
   * Check if catalog needs refresh
   *
   * @returns True if catalog is stale
   */
  isCatalogStale(): boolean {
    if (!this.catalogFetchedAt) return true;
    return Date.now() - this.catalogFetchedAt.getTime() > CATALOG_CACHE_DURATION;
  }

  /**
   * Ensure catalog is loaded
   */
  private async ensureCatalog(): Promise<void> {
    if (this.catalog.size > 0 && !this.isCatalogStale()) {
      return;
    }

    // Try to load from IndexedDB first
    const cached = await fontDb.getGoogleFontsCatalog();
    if (cached && Date.now() - cached.fetchedAt.getTime() < CATALOG_CACHE_DURATION) {
      // Check if we have an API key but only have static catalog cached
      // Static catalog has ~40 fonts, API returns 1600+
      const hasApiKey = !!CONFIG.GOOGLE_FONTS?.API_KEY;
      const isStaticCatalog = cached.fonts.length <= 50;

      if (hasApiKey && isStaticCatalog) {
        // API key is now available but we only have static catalog
        // Refresh to get full catalog from API
        logger.info(
          'GoogleFontProvider',
          'API key detected with static catalog cached, refreshing from API...'
        );
        await this.refreshCatalog();
        return;
      }

      this.loadCatalogFromCache(cached.fonts);
      this.catalogFetchedAt = cached.fetchedAt;

      // Restore loaded state for previously cached fonts
      await this.restoreLoadedState();
      return;
    }

    // Refresh catalog (tries API first, falls back to static)
    await this.refreshCatalog();
  }

  /**
   * Load catalog from cached items
   *
   * @param items - Cached font items
   */
  private loadCatalogFromCache(items: GoogleFontItem[]): void {
    this.catalog.clear();
    for (const item of items) {
      const font: FontDefinition = {
        id: `google-${item.family.toLowerCase().replace(/\s+/g, '-')}`,
        name: item.family,
        family: item.family,
        source: 'google',
        category: mapCategory(item.category),
        weights: parseWeights(item.variants),
        hasItalic: hasItalicVariant(item.variants),
        status: this.loadedFonts.has(item.family) ? 'loaded' : 'pending',
      };
      this.catalog.set(item.family, font);
    }
  }

  /**
   * Load the static curated catalog
   */
  private async loadStaticCatalog(): Promise<void> {
    this.catalog.clear();

    for (const item of STATIC_FONT_CATALOG) {
      if (!item.family) continue;

      const font: FontDefinition = {
        id: `google-${item.family.toLowerCase().replace(/\s+/g, '-')}`,
        name: item.family,
        family: item.family,
        source: 'google',
        category: mapCategory(item.category ?? 'sans-serif'),
        weights: parseWeights(item.variants ?? ['400']),
        hasItalic: hasItalicVariant(item.variants ?? []),
        status: this.loadedFonts.has(item.family) ? 'loaded' : 'pending',
      };
      this.catalog.set(item.family, font);
    }

    logger.info('GoogleFontProvider', `Loaded ${this.catalog.size} fonts from static catalog`);
  }

  /**
   * Restore loaded state from IndexedDB cache.
   * Re-injects font stylesheets for previously cached fonts.
   */
  private async restoreLoadedState(): Promise<void> {
    const cachedFonts = await fontDb.googleFontsCache.toArray();

    // Batch load cached fonts in parallel (limit to 10 concurrent)
    const batchSize = 10;
    for (let i = 0; i < cachedFonts.length; i += batchSize) {
      const batch = cachedFonts.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (cached) => {
          const font = this.catalog.get(cached.family);
          if (!font) return;

          // Check if the link element still exists in the document
          const existingLink = document.querySelector(
            `link[href*="fonts.googleapis.com"][href*="${encodeURIComponent(cached.family)}"]`
          );

          if (existingLink) {
            // Link exists, just mark as loaded
            this.loadedFonts.add(cached.family);
            font.status = 'loaded';
          } else {
            // Re-inject the stylesheet for this cached font
            try {
              await this.reinjectFontStylesheet(cached.family, cached.variants);
              this.loadedFonts.add(cached.family);
              font.status = 'loaded';
            } catch {
              // Failed to reload, remove from cache
              await fontDb.googleFontsCache.delete(cached.family);
            }
          }
        })
      );
    }

    if (cachedFonts.length > 0) {
      logger.info('GoogleFontProvider', `Restored ${this.loadedFonts.size} cached fonts`);
    }
  }

  /**
   * Re-inject font stylesheet for a previously cached font
   */
  private async reinjectFontStylesheet(family: string, variants: string[]): Promise<void> {
    // Build weights from variants
    const weights = variants
      .map((v) => {
        const match = v.match(/^(\d+)/);
        return match ? match[1] : v === 'regular' || v === 'italic' ? '400' : null;
      })
      .filter((w): w is string => w !== null);

    const weightsParam = [...new Set(weights)].join(';') || '400';
    const encodedFamily = encodeURIComponent(family);
    const url = `https://fonts.googleapis.com/css2?family=${encodedFamily}:wght@${weightsParam}&display=swap`;

    // Create and inject link element
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Failed to reload font: ${family}`));
      document.head.appendChild(link);
    });

    this.fontLinks.set(family, link);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Singleton instance of GoogleFontProvider
 */
export const googleFontProvider = new GoogleFontProvider();
