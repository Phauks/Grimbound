/**
 * Font Services Module
 *
 * Provides a unified API for managing fonts from multiple sources:
 * - Built-in fonts bundled with the application
 * - Google Fonts loaded on-demand
 * - Custom user-uploaded fonts stored in IndexedDB
 *
 * @module services/fonts
 *
 * @example
 * ```typescript
 * import { fontRegistry } from '@/ts/services/fonts/index.js';
 *
 * // Initialize the registry
 * await fontRegistry.initialize();
 *
 * // Get all fonts
 * const fonts = await fontRegistry.getAllFonts();
 *
 * // Load a specific font
 * await fontRegistry.loadFont('Cinzel');
 *
 * // Upload a custom font
 * const customFont = await fontRegistry.uploadCustomFont(fontFile);
 * ```
 */

// Providers
export {
  BUILTIN_FONT_PATHS,
  BuiltInFontProvider,
  builtInFontProvider,
} from './BuiltInFontProvider.js';
export { CustomFontProvider, customFontProvider } from './CustomFontProvider.js';
// Registry (main entry point)
export { FontRegistry, fontRegistry } from './FontRegistry.js';
// Database
export { FontDatabase, fontDb } from './fontDatabase.js';
export { GoogleFontProvider, googleFontProvider } from './GoogleFontProvider.js';
// Interfaces
export type {
  FontRegistryDeps,
  ICustomFontProvider,
  IFontProvider,
  IFontRegistry,
  IGoogleFontProvider,
} from './IFontServices.js';
