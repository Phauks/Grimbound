/**
 * Font Services Interfaces
 *
 * Defines the contracts for font providers and the font registry.
 * These interfaces enable dependency injection and testing.
 *
 * @module services/fonts/IFontServices
 */

import type {
  FontCategory,
  FontChangeCallback,
  FontDefinition,
  FontMetadata,
  FontSource,
  FontWeight,
} from '@/ts/types/fonts.js';

// ============================================================================
// Base Font Provider Interface
// ============================================================================

/**
 * Font provider interface - implemented by each font source
 */
export interface IFontProvider {
  /** Provider identifier */
  readonly source: FontSource;

  /** Get all available fonts from this provider */
  getAvailableFonts(): Promise<FontDefinition[]>;

  /** Load a specific font into the document */
  loadFont(family: string, weights?: FontWeight[]): Promise<void>;

  /** Check if a font is loaded */
  isLoaded(family: string): boolean;

  /** Unload a font (if supported) */
  unloadFont?(family: string): Promise<void>;
}

// ============================================================================
// Specialized Provider Interfaces
// ============================================================================

/**
 * Custom font provider extends base with upload/delete
 */
export interface ICustomFontProvider extends IFontProvider {
  /** Upload a new font file */
  uploadFont(file: File): Promise<FontDefinition>;

  /** Delete a custom font */
  deleteFont(id: string): Promise<void>;

  /** Update font metadata */
  updateFont(id: string, updates: Partial<FontMetadata>): Promise<FontDefinition>;

  /** Export font data (for backup) */
  exportFont(id: string): Promise<Blob>;
}

/**
 * Google Fonts provider extends base with catalog
 */
export interface IGoogleFontProvider extends IFontProvider {
  /** Search fonts by name */
  searchFonts(query: string): Promise<FontDefinition[]>;

  /** Get popular fonts */
  getPopularFonts(limit?: number): Promise<FontDefinition[]>;

  /** Refresh catalog from API */
  refreshCatalog(): Promise<void>;

  /** Check if catalog needs refresh */
  isCatalogStale(): boolean;
}

// ============================================================================
// Font Registry Interface
// ============================================================================

/**
 * Font registry - unified facade for all font operations
 */
export interface IFontRegistry {
  /** Get all fonts from all sources */
  getAllFonts(): Promise<FontDefinition[]>;

  /** Get fonts by source */
  getFontsBySource(source: FontSource): Promise<FontDefinition[]>;

  /** Get fonts by category */
  getFontsByCategory(category: FontCategory): Promise<FontDefinition[]>;

  /** Search fonts across all sources */
  searchFonts(query: string): Promise<FontDefinition[]>;

  /** Load a font (auto-routes to correct provider) */
  loadFont(family: string, weights?: FontWeight[]): Promise<void>;

  /** Check if font is available */
  isFontAvailable(family: string): boolean;

  /** Check if a font is loaded */
  isFontLoaded(family: string): boolean;

  /** Get font definition by family */
  getFont(family: string): FontDefinition | undefined;

  /** Upload custom font */
  uploadCustomFont(file: File): Promise<FontDefinition>;

  /** Delete custom font */
  deleteCustomFont(id: string): Promise<void>;

  /** Subscribe to font changes */
  subscribe(callback: FontChangeCallback): () => void;

  /** Initialize registry (load all sources) */
  initialize(): Promise<void>;

  /** Check if registry is initialized */
  readonly isInitialized: boolean;
}

// ============================================================================
// Dependency Injection Types
// ============================================================================

/**
 * Dependencies for FontRegistry
 */
export interface FontRegistryDeps {
  builtInProvider: IFontProvider;
  googleProvider: IGoogleFontProvider;
  customProvider: ICustomFontProvider;
}
