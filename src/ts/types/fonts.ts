/**
 * Font System Types
 *
 * Type definitions for the hybrid font system supporting built-in fonts,
 * Google Fonts, and user-uploaded custom fonts.
 *
 * @module types/fonts
 */

// ============================================================================
// Base Types
// ============================================================================

/**
 * Source of the font
 */
export type FontSource = 'builtin' | 'google' | 'custom';

/**
 * Font format for @font-face
 */
export type FontFormat = 'truetype' | 'opentype' | 'woff' | 'woff2';

/**
 * Font weight as CSS value
 */
export type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

/**
 * Font category for UI grouping
 */
export type FontCategory =
  | 'Display' // Decorative, headers
  | 'Serif' // Traditional
  | 'Sans Serif' // Modern, clean
  | 'Script' // Handwritten
  | 'Monospace' // Fixed-width
  | 'Custom'; // User uploads

/**
 * Font loading status
 */
export type FontStatus = 'pending' | 'loading' | 'loaded' | 'error';

// ============================================================================
// Font Definitions
// ============================================================================

/**
 * Extended metadata for fonts
 */
export interface FontMetadata {
  /** Designer/foundry */
  designer?: string;

  /** License type */
  license?: 'free' | 'commercial' | 'unknown';

  /** License URL */
  licenseUrl?: string;

  /** Upload date for custom fonts */
  uploadedAt?: Date;

  /** File size in bytes */
  fileSize?: number;

  /** Original filename */
  originalFilename?: string;
}

/**
 * Core font definition used across the application
 */
export interface FontDefinition {
  /** Unique identifier */
  id: string;

  /** Display name in UI */
  name: string;

  /** CSS font-family value */
  family: string;

  /** Font source for provider routing */
  source: FontSource;

  /** UI category for grouping */
  category: FontCategory;

  /** Available weights (default: [400]) */
  weights: FontWeight[];

  /** Whether font has italic variant */
  hasItalic: boolean;

  /** Loading state */
  status: FontStatus;

  /** Preview text (optional, defaults to font name) */
  preview?: string;

  /** Metadata */
  metadata?: FontMetadata;

  /** Whether this is a variable font */
  isVariable?: boolean;

  /** Variable font axis ranges (for variable fonts) */
  variableAxes?: VariableFontAxis[];
}

/**
 * Variable font axis definition
 */
export interface VariableFontAxis {
  /** Axis tag (e.g., 'wght', 'wdth', 'slnt') */
  tag: string;

  /** Display name */
  name: string;

  /** Minimum value */
  min: number;

  /** Maximum value */
  max: number;

  /** Default value */
  default: number;
}

/**
 * Font stored in IndexedDB (custom fonts)
 */
export interface StoredFont extends FontDefinition {
  /** Font file data as ArrayBuffer */
  data: ArrayBuffer;

  /** File format */
  format: FontFormat;

  /** When the font was stored */
  storedAt: Date;
}

// ============================================================================
// Google Fonts Types
// ============================================================================

/**
 * Google Fonts API response shape
 */
export interface GoogleFontItem {
  family: string;
  variants: string[];
  subsets: string[];
  category: string;
  files: Record<string, string>;
}

/**
 * Cached Google Fonts catalog
 */
export interface GoogleFontsCatalog {
  id: 'catalog';
  fonts: GoogleFontItem[];
  fetchedAt: Date;
  version: string;
}

/**
 * Individual Google font cache metadata
 */
export interface GoogleFontCache {
  family: string;
  cachedAt: Date;
  variants: string[];
}

// ============================================================================
// UI Types
// ============================================================================

/**
 * Font option for UI selectors (backward compatible)
 */
export interface FontOption {
  /** font-family value */
  value: string;
  /** Display name */
  label: string;
  /** Category for grouping */
  category: FontCategory;
  /** Font source */
  source?: FontSource;
  /** Available weights */
  weights?: FontWeight[];
}

/**
 * Font selector filter options
 */
export interface FontFilterOptions {
  /** Filter by source */
  sources?: FontSource[];
  /** Filter by category */
  categories?: FontCategory[];
  /** Search query */
  search?: string;
  /** Show only loaded fonts */
  loadedOnly?: boolean;
}

// ============================================================================
// Provider Types
// ============================================================================

/**
 * Font change callback type
 */
export type FontChangeCallback = (fonts: FontDefinition[]) => void;

/**
 * Font loading result
 */
export interface FontLoadResult {
  success: boolean;
  family: string;
  error?: Error;
}

/**
 * Font upload result
 */
export interface FontUploadResult {
  success: boolean;
  font?: FontDefinition;
  error?: string;
}

// ============================================================================
// Context Types
// ============================================================================

/**
 * Font context value type
 */
export interface FontContextValue {
  /** All available fonts */
  fonts: FontDefinition[];

  /** Loading state */
  isLoading: boolean;

  /** Whether the registry is initialized */
  isInitialized: boolean;

  /** Load a font by family name */
  loadFont: (family: string, weights?: FontWeight[]) => Promise<void>;

  /** Upload a custom font */
  uploadFont: (file: File) => Promise<FontDefinition>;

  /** Delete a custom font */
  deleteFont: (id: string) => Promise<void>;

  /** Get fonts by source */
  getFontsBySource: (source: FontSource) => FontDefinition[];

  /** Get fonts by category */
  getFontsByCategory: (category: FontCategory) => FontDefinition[];

  /** Search fonts */
  searchFonts: (query: string) => Promise<FontDefinition[]>;

  /** Get a font definition by family */
  getFont: (family: string) => FontDefinition | undefined;

  /** Check if a font is loaded */
  isFontLoaded: (family: string) => boolean;
}
