/**
 * Font Registry
 *
 * Unified facade for all font operations. Coordinates between built-in,
 * Google, and custom font providers to present a single API for font management.
 *
 * @module services/fonts/FontRegistry
 */

import type {
  FontCategory,
  FontChangeCallback,
  FontDefinition,
  FontSource,
  FontWeight,
} from '@/ts/types/fonts.js';
import { logger } from '@/ts/utils/logger.js';
import { builtInFontProvider } from './BuiltInFontProvider.js';
import { customFontProvider } from './CustomFontProvider.js';
import { googleFontProvider } from './GoogleFontProvider.js';
import type { FontRegistryDeps, IFontRegistry } from './IFontServices.js';

// ============================================================================
// FontRegistry Class
// ============================================================================

/**
 * Unified font registry that coordinates all font providers.
 *
 * Provides a single API for:
 * - Listing all available fonts from all sources
 * - Loading fonts on demand
 * - Uploading custom fonts
 * - Searching and filtering fonts
 * - Subscribing to font changes
 */
export class FontRegistry implements IFontRegistry {
  /** All fonts indexed by ID */
  private fonts: Map<string, FontDefinition> = new Map();

  /** Font family to ID mapping for quick lookup */
  private familyToId: Map<string, string> = new Map();

  /** Subscribers to font changes */
  private subscribers: Set<FontChangeCallback> = new Set();

  /** Whether the registry has been initialized */
  private _isInitialized = false;

  /** Font providers */
  private readonly builtInProvider;
  private readonly googleProvider;
  private readonly customProvider;

  /**
   * Create a new FontRegistry
   *
   * @param deps - Optional dependency injection for testing
   */
  constructor(deps: Partial<FontRegistryDeps> = {}) {
    this.builtInProvider = deps.builtInProvider ?? builtInFontProvider;
    this.googleProvider = deps.googleProvider ?? googleFontProvider;
    this.customProvider = deps.customProvider ?? customFontProvider;
  }

  /**
   * Check if the registry is initialized
   */
  get isInitialized(): boolean {
    return this._isInitialized;
  }

  /**
   * Initialize the registry by loading fonts from all providers
   */
  async initialize(): Promise<void> {
    if (this._isInitialized) return;

    logger.info('FontRegistry', 'Initializing font registry...');
    const startTime = performance.now();

    // Load fonts from all providers in parallel
    const [builtIn, google, custom] = await Promise.all([
      this.builtInProvider.getAvailableFonts(),
      this.googleProvider.getAvailableFonts(),
      this.customProvider.getAvailableFonts(),
    ]);

    // Merge into registry (built-in first, then custom, then Google)
    // This ensures built-in fonts take precedence if there are conflicts
    for (const font of [...builtIn, ...custom, ...google]) {
      // Skip if we already have a font with this family (built-in takes precedence)
      if (this.familyToId.has(font.family)) {
        continue;
      }
      this.fonts.set(font.id, font);
      this.familyToId.set(font.family, font.id);
    }

    this._isInitialized = true;
    const elapsed = performance.now() - startTime;
    logger.info(
      'FontRegistry',
      `Initialized with ${this.fonts.size} fonts in ${elapsed.toFixed(0)}ms`
    );

    this.notifySubscribers();
  }

  /**
   * Get all fonts from all sources
   *
   * @returns Array of all font definitions
   */
  async getAllFonts(): Promise<FontDefinition[]> {
    await this.ensureInitialized();
    return Array.from(this.fonts.values());
  }

  /**
   * Get fonts by source
   *
   * @param source - Font source to filter by
   * @returns Fonts from that source
   */
  async getFontsBySource(source: FontSource): Promise<FontDefinition[]> {
    await this.ensureInitialized();
    return Array.from(this.fonts.values()).filter((f) => f.source === source);
  }

  /**
   * Get fonts by category
   *
   * @param category - Category to filter by
   * @returns Fonts in that category
   */
  async getFontsByCategory(category: FontCategory): Promise<FontDefinition[]> {
    await this.ensureInitialized();
    return Array.from(this.fonts.values()).filter((f) => f.category === category);
  }

  /**
   * Search fonts across all sources
   *
   * @param query - Search query
   * @returns Matching fonts
   */
  async searchFonts(query: string): Promise<FontDefinition[]> {
    await this.ensureInitialized();

    const lowerQuery = query.toLowerCase();

    // First search local fonts
    const localMatches = Array.from(this.fonts.values()).filter(
      (f) =>
        f.name.toLowerCase().includes(lowerQuery) || f.family.toLowerCase().includes(lowerQuery)
    );

    // Also search Google for fonts not yet in registry
    const googleResults = await this.googleProvider.searchFonts(query);
    const newGoogleFonts = googleResults.filter((g) => !this.familyToId.has(g.family));

    // Add new fonts to registry
    for (const font of newGoogleFonts) {
      this.fonts.set(font.id, font);
      this.familyToId.set(font.family, font.id);
    }

    // Notify if we added new fonts
    if (newGoogleFonts.length > 0) {
      this.notifySubscribers();
    }

    return [...localMatches, ...newGoogleFonts];
  }

  /**
   * Load a font into the document
   *
   * @param family - Font family to load
   * @param weights - Specific weights to load (optional)
   */
  async loadFont(family: string, weights?: FontWeight[]): Promise<void> {
    const id = this.familyToId.get(family);
    const font = id ? this.fonts.get(id) : undefined;

    if (!font) {
      throw new Error(`Font not found: ${family}`);
    }

    if (font.status === 'loaded') {
      return;
    }

    font.status = 'loading';
    this.notifySubscribers();

    try {
      switch (font.source) {
        case 'builtin':
          await this.builtInProvider.loadFont(family, weights);
          break;
        case 'google':
          await this.googleProvider.loadFont(family, weights);
          break;
        case 'custom':
          await this.customProvider.loadFont(family);
          break;
        default:
          throw new Error(`Unknown font source: ${font.source}`);
      }

      font.status = 'loaded';
    } catch (error) {
      font.status = 'error';
      throw error;
    } finally {
      this.notifySubscribers();
    }
  }

  /**
   * Check if a font is available in the registry
   *
   * @param family - Font family to check
   * @returns True if available
   */
  isFontAvailable(family: string): boolean {
    return this.familyToId.has(family);
  }

  /**
   * Check if a font is loaded/ready to use
   *
   * @param family - Font family to check
   * @returns True if loaded
   */
  isFontLoaded(family: string): boolean {
    const id = this.familyToId.get(family);
    const font = id ? this.fonts.get(id) : undefined;
    return font?.status === 'loaded';
  }

  /**
   * Get a font definition by family
   *
   * @param family - Font family name
   * @returns Font definition or undefined
   */
  getFont(family: string): FontDefinition | undefined {
    const id = this.familyToId.get(family);
    return id ? this.fonts.get(id) : undefined;
  }

  /**
   * Upload a custom font
   *
   * @param file - Font file to upload
   * @returns Created font definition
   */
  async uploadCustomFont(file: File): Promise<FontDefinition> {
    const font = await this.customProvider.uploadFont(file);

    // Add to registry
    this.fonts.set(font.id, font);
    this.familyToId.set(font.family, font.id);

    this.notifySubscribers();
    return font;
  }

  /**
   * Delete a custom font
   *
   * @param id - Font ID to delete
   */
  async deleteCustomFont(id: string): Promise<void> {
    const font = this.fonts.get(id);
    if (!font) {
      throw new Error(`Font not found: ${id}`);
    }

    if (font.source !== 'custom') {
      throw new Error('Can only delete custom fonts');
    }

    await this.customProvider.deleteFont(id);

    // Remove from registry
    this.familyToId.delete(font.family);
    this.fonts.delete(id);

    this.notifySubscribers();
  }

  /**
   * Subscribe to font changes
   *
   * @param callback - Callback to invoke when fonts change
   * @returns Unsubscribe function
   */
  subscribe(callback: FontChangeCallback): () => void {
    this.subscribers.add(callback);

    // Immediately notify with current fonts
    if (this._isInitialized) {
      callback(Array.from(this.fonts.values()));
    }

    return () => this.subscribers.delete(callback);
  }

  /**
   * Get font options for UI selectors (backward compatible format)
   *
   * @returns Array of font options
   */
  async getFontOptions(): Promise<
    Array<{ value: string; label: string; category: FontCategory; source: FontSource }>
  > {
    await this.ensureInitialized();
    return Array.from(this.fonts.values()).map((font) => ({
      value: font.family,
      label: font.name,
      category: font.category,
      source: font.source,
    }));
  }

  /**
   * Get font options grouped by category
   *
   * @returns Map of category to font options
   */
  async getFontOptionsGrouped(): Promise<Map<FontCategory, FontDefinition[]>> {
    await this.ensureInitialized();

    const grouped = new Map<FontCategory, FontDefinition[]>();
    for (const font of this.fonts.values()) {
      const list = grouped.get(font.category) ?? [];
      list.push(font);
      grouped.set(font.category, list);
    }

    return grouped;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Ensure the registry is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this._isInitialized) {
      await this.initialize();
    }
  }

  /**
   * Notify all subscribers of font changes
   */
  private notifySubscribers(): void {
    const fonts = Array.from(this.fonts.values());
    for (const callback of this.subscribers) {
      try {
        callback(fonts);
      } catch (error) {
        logger.error('FontRegistry', 'Error in subscriber callback', error);
      }
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Singleton instance of FontRegistry
 */
export const fontRegistry = new FontRegistry();
