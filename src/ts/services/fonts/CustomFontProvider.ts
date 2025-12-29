/**
 * Custom Font Provider
 *
 * Provides access to user-uploaded custom fonts stored in IndexedDB.
 * Handles font file validation, storage, and registration with the browser.
 *
 * @module services/fonts/CustomFontProvider
 */

import { ValidationError } from '@/ts/errors.js';
import type {
  FontDefinition,
  FontFormat,
  FontMetadata,
  FontWeight,
  StoredFont,
  VariableFontAxis,
} from '@/ts/types/fonts.js';
import { logger } from '@/ts/utils/logger.js';
import { fontDb } from './fontDatabase.js';
import type { ICustomFontProvider } from './IFontServices.js';

// ============================================================================
// Constants
// ============================================================================

/** Maximum font file size (5MB) */
const MAX_FONT_SIZE = 5 * 1024 * 1024;

/** Maximum number of custom fonts */
const MAX_CUSTOM_FONTS = 10;

/** Allowed font file extensions */
const ALLOWED_EXTENSIONS = ['.ttf', '.otf', '.woff', '.woff2'];

/** MIME type to format mapping (reserved for future use) */
const _MIME_TO_FORMAT: Record<string, FontFormat> = {
  'font/ttf': 'truetype',
  'font/otf': 'opentype',
  'font/woff': 'woff',
  'font/woff2': 'woff2',
  'application/x-font-ttf': 'truetype',
  'application/x-font-otf': 'opentype',
  'application/font-woff': 'woff',
  'application/font-woff2': 'woff2',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Detect font format from file extension
 *
 * @param file - Font file
 * @returns Font format
 */
function detectFormat(file: File): FontFormat {
  const ext = file.name.toLowerCase().split('.').pop();
  const mapping: Record<string, FontFormat> = {
    ttf: 'truetype',
    otf: 'opentype',
    woff: 'woff',
    woff2: 'woff2',
  };
  return mapping[ext ?? ''] ?? 'truetype';
}

/**
 * Extract font family name from filename
 *
 * @param filename - Font filename
 * @returns Cleaned font family name
 */
function extractFontFamily(filename: string): string {
  // Remove extension and clean up
  const name = filename
    .replace(/\.(ttf|otf|woff2?)$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase to spaces
    .replace(/\s+/g, ' ')
    .trim();

  return name || 'Custom Font';
}

/**
 * Generate a unique font family name for CSS
 *
 * @param id - Font ID
 * @returns Unique font family name
 */
function generateUniqueFamilyName(id: string): string {
  // Use a prefix to avoid conflicts with system/built-in fonts
  return `Custom_${id.substring(0, 8)}`;
}

/**
 * Variable font axis tag names
 */
const AXIS_NAMES: Record<string, string> = {
  wght: 'Weight',
  wdth: 'Width',
  slnt: 'Slant',
  ital: 'Italic',
  opsz: 'Optical Size',
  GRAD: 'Grade',
  XTRA: 'X-Height',
  YTAS: 'Y-Ascender',
  YTDE: 'Y-Descender',
  YTUC: 'Uppercase Height',
  YTLC: 'Lowercase Height',
  YTFI: 'Figure Height',
  XOPQ: 'X Opaque',
  YOPQ: 'Y Opaque',
  CASL: 'Casual',
  CRSV: 'Cursive',
  FILL: 'Fill',
  MONO: 'Monospace',
  SOFT: 'Softness',
  WONK: 'Wonky',
};

/**
 * Detect if a font is a variable font by checking for fvar table
 *
 * @param data - Font file data as ArrayBuffer
 * @returns Whether the font is a variable font and its axes
 */
function detectVariableFont(data: ArrayBuffer): { isVariable: boolean; axes: VariableFontAxis[] } {
  try {
    const view = new DataView(data);

    // Check for OpenType signature (0x4F54544F = 'OTTO' for CFF, or version 1.0)
    const signature = view.getUint32(0);
    const isTrueType =
      signature === 0x00010000 || // TrueType
      signature === 0x74727565 || // 'true'
      signature === 0x4f54544f; // 'OTTO' (OpenType with CFF)

    if (!isTrueType) {
      return { isVariable: false, axes: [] };
    }

    // Get table count
    const tableCount = view.getUint16(4);

    // Search for fvar table
    let fvarOffset = 0;
    for (let i = 0; i < tableCount; i++) {
      const tableOffset = 12 + i * 16;
      const tag =
        String.fromCharCode(view.getUint8(tableOffset)) +
        String.fromCharCode(view.getUint8(tableOffset + 1)) +
        String.fromCharCode(view.getUint8(tableOffset + 2)) +
        String.fromCharCode(view.getUint8(tableOffset + 3));

      if (tag === 'fvar') {
        fvarOffset = view.getUint32(tableOffset + 8);
        break;
      }
    }

    if (fvarOffset === 0) {
      return { isVariable: false, axes: [] };
    }

    // Parse fvar table
    // Skip: majorVersion (2), minorVersion (2), axesArrayOffset (2)
    const axisCount = view.getUint16(fvarOffset + 8);
    const axisSize = view.getUint16(fvarOffset + 10);
    const axesArrayOffset = view.getUint16(fvarOffset + 4);

    const axes: VariableFontAxis[] = [];
    for (let i = 0; i < axisCount; i++) {
      const axisOffset = fvarOffset + axesArrayOffset + i * axisSize;

      const tag =
        String.fromCharCode(view.getUint8(axisOffset)) +
        String.fromCharCode(view.getUint8(axisOffset + 1)) +
        String.fromCharCode(view.getUint8(axisOffset + 2)) +
        String.fromCharCode(view.getUint8(axisOffset + 3));

      // Values are 16.16 fixed point
      const minValue = view.getInt32(axisOffset + 4) / 65536;
      const defaultValue = view.getInt32(axisOffset + 8) / 65536;
      const maxValue = view.getInt32(axisOffset + 12) / 65536;

      axes.push({
        tag,
        name: AXIS_NAMES[tag] ?? tag,
        min: minValue,
        max: maxValue,
        default: defaultValue,
      });
    }

    return { isVariable: true, axes };
  } catch {
    // If parsing fails, assume not a variable font
    return { isVariable: false, axes: [] };
  }
}

// ============================================================================
// CustomFontProvider Class
// ============================================================================

/**
 * Provider for user-uploaded custom fonts.
 *
 * Handles font file validation, storage in IndexedDB, and registration
 * with the browser's FontFace API.
 */
export class CustomFontProvider implements ICustomFontProvider {
  readonly source = 'custom' as const;

  /** Font definitions (without data) indexed by ID */
  private fonts: Map<string, FontDefinition> = new Map();

  /** Font families that have been registered with the browser */
  private registeredFonts: Set<string> = new Set();

  /** Whether initial load from database is complete */
  private initialized = false;

  /**
   * Get all available custom fonts
   *
   * @returns Array of font definitions
   */
  async getAvailableFonts(): Promise<FontDefinition[]> {
    await this.ensureInitialized();
    return Array.from(this.fonts.values());
  }

  /**
   * Load a custom font into the document
   *
   * @param family - Font family name
   * @param _weights - Weights (ignored for custom fonts - they have one weight)
   */
  async loadFont(family: string, _weights?: FontWeight[]): Promise<void> {
    if (this.registeredFonts.has(family)) {
      return;
    }

    const stored = await fontDb.getCustomFontByFamily(family);
    if (!stored) {
      throw new Error(`Custom font not found: ${family}`);
    }

    await this.registerFontFace(stored);
  }

  /**
   * Check if a font is loaded/registered
   *
   * @param family - Font family name
   * @returns True if loaded
   */
  isLoaded(family: string): boolean {
    return this.registeredFonts.has(family);
  }

  /**
   * Upload a new custom font
   *
   * @param file - Font file to upload
   * @returns Created font definition
   */
  async uploadFont(file: File): Promise<FontDefinition> {
    // Validate file
    await this.validateFile(file);

    // Check font limit
    const currentCount = await fontDb.getCustomFontCount();
    if (currentCount >= MAX_CUSTOM_FONTS) {
      throw new ValidationError(`Maximum of ${MAX_CUSTOM_FONTS} custom fonts allowed`, [
        `You have ${currentCount} fonts. Delete some to upload more.`,
      ]);
    }

    // Read file data
    const data = await file.arrayBuffer();

    // Extract font info
    const format = detectFormat(file);
    const displayName = extractFontFamily(file.name);
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const uniqueFamily = generateUniqueFamilyName(id);

    // Detect variable font properties
    const { isVariable, axes } = detectVariableFont(data);

    // Extract weight range from wght axis if available
    const wghtAxis = axes.find((a) => a.tag === 'wght');
    const weights: number[] = wghtAxis
      ? [Math.round(wghtAxis.min), Math.round(wghtAxis.default), Math.round(wghtAxis.max)].filter(
          (v, i, arr) => arr.indexOf(v) === i
        ) // unique values
      : [400];

    // Check for italic axis
    const hasItalic = axes.some((a) => a.tag === 'ital' || a.tag === 'slnt');

    // Create stored font
    const storedFont: StoredFont = {
      id,
      name: displayName,
      family: uniqueFamily,
      source: 'custom',
      category: 'Custom',
      weights,
      hasItalic,
      isVariable,
      variableAxes: isVariable ? axes : undefined,
      status: 'pending',
      data,
      format,
      storedAt: new Date(),
      metadata: {
        originalFilename: file.name,
        fileSize: file.size,
        uploadedAt: new Date(),
        license: 'unknown',
      },
    };

    // Store in database
    await fontDb.saveCustomFont(storedFont);

    // Register with browser
    await this.registerFontFace(storedFont);

    // Update local cache
    const definition = this.storedFontToDefinition(storedFont);
    this.fonts.set(id, definition);

    logger.info('CustomFontProvider', `Uploaded font: ${displayName} (${id})`);
    return definition;
  }

  /**
   * Delete a custom font
   *
   * @param id - Font ID to delete
   */
  async deleteFont(id: string): Promise<void> {
    const font = this.fonts.get(id);
    if (!font) {
      throw new Error(`Font not found: ${id}`);
    }

    // Remove from database
    await fontDb.deleteCustomFont(id);

    // Remove from local cache
    this.fonts.delete(id);
    this.registeredFonts.delete(font.family);

    // Note: Cannot truly unload from document.fonts, but it won't be used anymore
    logger.info('CustomFontProvider', `Deleted font: ${font.name} (${id})`);
  }

  /**
   * Update font metadata
   *
   * @param id - Font ID
   * @param updates - Metadata updates
   * @returns Updated font definition
   */
  async updateFont(id: string, updates: Partial<FontMetadata>): Promise<FontDefinition> {
    const stored = await fontDb.getCustomFont(id);
    if (!stored) {
      throw new Error(`Font not found: ${id}`);
    }

    // Update stored font
    const updated: StoredFont = {
      ...stored,
      metadata: { ...stored.metadata, ...updates },
    };

    // Update display name if filename changed
    if (updates.originalFilename) {
      updated.name = extractFontFamily(updates.originalFilename);
    }

    await fontDb.saveCustomFont(updated);

    // Update local cache
    const definition = this.storedFontToDefinition(updated);
    this.fonts.set(id, definition);

    return definition;
  }

  /**
   * Export font data for backup
   *
   * @param id - Font ID
   * @returns Font file as Blob
   */
  async exportFont(id: string): Promise<Blob> {
    const stored = await fontDb.getCustomFont(id);
    if (!stored) {
      throw new Error(`Font not found: ${id}`);
    }

    const mimeType = this.formatToMimeType(stored.format);
    return new Blob([stored.data], { type: mimeType });
  }

  /**
   * Get font bytes for PDF embedding
   *
   * @param id - Font ID
   * @returns ArrayBuffer or null
   */
  async getFontBytes(id: string): Promise<ArrayBuffer | null> {
    const stored = await fontDb.getCustomFont(id);
    return stored?.data ?? null;
  }

  /**
   * Get font bytes by family name
   *
   * @param family - Font family name
   * @returns ArrayBuffer or null
   */
  async getFontBytesByFamily(family: string): Promise<ArrayBuffer | null> {
    const stored = await fontDb.getCustomFontByFamily(family);
    return stored?.data ?? null;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Ensure fonts are loaded from database
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    const storedFonts = await fontDb.getAllCustomFonts();

    this.fonts.clear();
    for (const stored of storedFonts) {
      const definition = this.storedFontToDefinition(stored);
      this.fonts.set(stored.id, definition);
    }

    this.initialized = true;
    logger.debug('CustomFontProvider', `Loaded ${this.fonts.size} custom fonts from database`);
  }

  /**
   * Validate a font file before upload
   *
   * @param file - File to validate
   */
  private async validateFile(file: File): Promise<void> {
    const errors: string[] = [];

    // Check size
    if (file.size > MAX_FONT_SIZE) {
      errors.push(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB (max 5MB)`);
    }

    // Check extension
    const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      errors.push(`Invalid file type: ${ext}. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
    }

    // Check if empty
    if (file.size === 0) {
      errors.push('File is empty');
    }

    if (errors.length > 0) {
      throw new ValidationError('Invalid font file', errors);
    }
  }

  /**
   * Register a font with the browser's FontFace API
   *
   * @param font - Stored font to register
   */
  private async registerFontFace(font: StoredFont): Promise<void> {
    try {
      const fontFace = new FontFace(font.family, font.data, {
        style: 'normal',
        weight: '400',
      });

      await fontFace.load();
      document.fonts.add(fontFace);

      this.registeredFonts.add(font.family);
      font.status = 'loaded';

      // Update definition status
      const definition = this.fonts.get(font.id);
      if (definition) {
        definition.status = 'loaded';
      }

      logger.debug('CustomFontProvider', `Registered font face: ${font.family}`);
    } catch (error) {
      logger.error('CustomFontProvider', `Failed to register font: ${font.family}`, error);
      font.status = 'error';
      throw new Error(`Failed to load font: ${font.name}`);
    }
  }

  /**
   * Convert StoredFont to FontDefinition (without data)
   *
   * @param stored - Stored font
   * @returns Font definition
   */
  private storedFontToDefinition(stored: StoredFont): FontDefinition {
    return {
      id: stored.id,
      name: stored.name,
      family: stored.family,
      source: stored.source,
      category: stored.category,
      weights: stored.weights,
      hasItalic: stored.hasItalic,
      isVariable: stored.isVariable,
      variableAxes: stored.variableAxes,
      status: this.registeredFonts.has(stored.family) ? 'loaded' : 'pending',
      metadata: stored.metadata,
    };
  }

  /**
   * Convert font format to MIME type
   *
   * @param format - Font format
   * @returns MIME type
   */
  private formatToMimeType(format: FontFormat): string {
    const mapping: Record<FontFormat, string> = {
      truetype: 'font/ttf',
      opentype: 'font/otf',
      woff: 'font/woff',
      woff2: 'font/woff2',
    };
    return mapping[format];
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Singleton instance of CustomFontProvider
 */
export const customFontProvider = new CustomFontProvider();
