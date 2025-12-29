/**
 * Font Database
 *
 * IndexedDB schema for storing custom fonts and Google Fonts catalog cache.
 * Uses Dexie.js for type-safe database operations.
 *
 * @module services/fonts/fontDatabase
 */

import Dexie, { type Table } from 'dexie';
import type { GoogleFontCache, GoogleFontsCatalog, StoredFont } from '@/ts/types/fonts.js';

// ============================================================================
// Database Class
// ============================================================================

/**
 * Font database class for managing custom fonts and Google Fonts catalog
 *
 * Schema Version 1:
 * - fonts: Stores custom uploaded fonts with ArrayBuffer data
 * - googleFontsCatalog: Stores cached Google Fonts API response
 * - googleFontsCache: Tracks individually loaded Google fonts
 */
export class FontDatabase extends Dexie {
  /** Custom fonts table */
  fonts!: Table<StoredFont, string>;

  /** Google Fonts catalog cache */
  googleFontsCatalog!: Table<GoogleFontsCatalog, string>;

  /** Individual Google font cache metadata */
  googleFontsCache!: Table<GoogleFontCache, string>;

  constructor() {
    super('grimbound-fonts');

    // Define schema version 1
    this.version(1).stores({
      // Custom fonts table
      // Primary key: id
      // Indexes: family, category, source, storedAt
      fonts: 'id, family, category, source, storedAt',

      // Google Fonts catalog cache
      // Primary key: id (always 'catalog')
      googleFontsCatalog: 'id',

      // Individual Google font cache metadata
      // Primary key: family
      // Indexes: cachedAt
      googleFontsCache: 'family, cachedAt',
    });
  }

  // ==========================================================================
  // Custom Font Operations
  // ==========================================================================

  /**
   * Get all custom fonts
   *
   * @returns Array of stored fonts
   */
  async getAllCustomFonts(): Promise<StoredFont[]> {
    return this.fonts.toArray();
  }

  /**
   * Get a custom font by ID
   *
   * @param id - Font ID
   * @returns Font or undefined
   */
  async getCustomFont(id: string): Promise<StoredFont | undefined> {
    return this.fonts.get(id);
  }

  /**
   * Get a custom font by family name
   *
   * @param family - Font family name
   * @returns Font or undefined
   */
  async getCustomFontByFamily(family: string): Promise<StoredFont | undefined> {
    return this.fonts.where('family').equals(family).first();
  }

  /**
   * Save a custom font
   *
   * @param font - Font to save
   */
  async saveCustomFont(font: StoredFont): Promise<void> {
    await this.fonts.put(font);
  }

  /**
   * Delete a custom font
   *
   * @param id - Font ID to delete
   */
  async deleteCustomFont(id: string): Promise<void> {
    await this.fonts.delete(id);
  }

  /**
   * Get custom font count
   *
   * @returns Number of custom fonts
   */
  async getCustomFontCount(): Promise<number> {
    return this.fonts.count();
  }

  /**
   * Get total size of all custom fonts
   *
   * @returns Total size in bytes
   */
  async getCustomFontsTotalSize(): Promise<number> {
    const fonts = await this.fonts.toArray();
    return fonts.reduce((total, font) => total + (font.metadata?.fileSize ?? 0), 0);
  }

  // ==========================================================================
  // Google Fonts Catalog Operations
  // ==========================================================================

  /**
   * Get the Google Fonts catalog
   *
   * @returns Cached catalog or undefined
   */
  async getGoogleFontsCatalog(): Promise<GoogleFontsCatalog | undefined> {
    return this.googleFontsCatalog.get('catalog');
  }

  /**
   * Save the Google Fonts catalog
   *
   * @param catalog - Catalog to save
   */
  async saveGoogleFontsCatalog(catalog: GoogleFontsCatalog): Promise<void> {
    await this.googleFontsCatalog.put(catalog);
  }

  /**
   * Clear the Google Fonts catalog cache
   */
  async clearGoogleFontsCatalog(): Promise<void> {
    await this.googleFontsCatalog.delete('catalog');
  }

  // ==========================================================================
  // Google Font Cache Operations
  // ==========================================================================

  /**
   * Check if a Google font is cached
   *
   * @param family - Font family name
   * @returns True if cached
   */
  async isGoogleFontCached(family: string): Promise<boolean> {
    const cached = await this.googleFontsCache.get(family);
    return cached !== undefined;
  }

  /**
   * Mark a Google font as cached
   *
   * @param family - Font family name
   * @param variants - Loaded variants
   */
  async markGoogleFontCached(family: string, variants: string[]): Promise<void> {
    await this.googleFontsCache.put({
      family,
      cachedAt: new Date(),
      variants,
    });
  }

  /**
   * Clear all Google font cache entries
   */
  async clearGoogleFontsCache(): Promise<void> {
    await this.googleFontsCache.clear();
  }

  // ==========================================================================
  // Database Utilities
  // ==========================================================================

  /**
   * Get database statistics
   *
   * @returns Statistics about stored fonts
   */
  async getStats(): Promise<{
    customFontCount: number;
    customFontsSizeMB: number;
    cachedGoogleFontsCount: number;
    hasCatalog: boolean;
  }> {
    const [customCount, customSize, googleCount, catalog] = await Promise.all([
      this.getCustomFontCount(),
      this.getCustomFontsTotalSize(),
      this.googleFontsCache.count(),
      this.getGoogleFontsCatalog(),
    ]);

    return {
      customFontCount: customCount,
      customFontsSizeMB: customSize / (1024 * 1024),
      cachedGoogleFontsCount: googleCount,
      hasCatalog: catalog !== undefined,
    };
  }

  /**
   * Clear all data from the database
   * WARNING: This is destructive and cannot be undone
   */
  async clearAll(): Promise<void> {
    await Promise.all([
      this.fonts.clear(),
      this.googleFontsCatalog.clear(),
      this.googleFontsCache.clear(),
    ]);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Singleton database instance for font storage
 */
export const fontDb = new FontDatabase();
