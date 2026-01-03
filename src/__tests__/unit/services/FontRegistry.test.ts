/**
 * Unit tests for FontRegistry
 *
 * Tests cover:
 * - Initialization from multiple providers
 * - Font retrieval (all, by source, by category)
 * - Font searching with Google API integration
 * - Font loading with provider routing
 * - Custom font upload and deletion
 * - Subscription mechanism
 * - Edge cases and error handling
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FontRegistry } from '@/ts/services/fonts/FontRegistry';
import type {
  FontRegistryDeps,
  ICustomFontProvider,
  IFontProvider,
  IGoogleFontProvider,
} from '@/ts/services/fonts/IFontServices';
import type { FontDefinition } from '@/ts/types/fonts';

// ============================================================================
// Test Helpers
// ============================================================================

const createMockFont = (overrides: Partial<FontDefinition> = {}): FontDefinition => ({
  id: 'font-1',
  name: 'Test Font',
  family: 'Test Font Family',
  source: 'builtin',
  category: 'Sans Serif',
  weights: [400, 700],
  hasItalic: false,
  status: 'pending',
  ...overrides,
});

const createMockBuiltInProvider = (fonts: FontDefinition[] = []): IFontProvider => ({
  source: 'builtin',
  getAvailableFonts: vi.fn().mockResolvedValue(fonts),
  loadFont: vi.fn().mockResolvedValue(undefined),
  isLoaded: vi.fn().mockReturnValue(false),
});

const createMockGoogleProvider = (fonts: FontDefinition[] = []): IGoogleFontProvider => ({
  source: 'google',
  getAvailableFonts: vi.fn().mockResolvedValue(fonts),
  loadFont: vi.fn().mockResolvedValue(undefined),
  isLoaded: vi.fn().mockReturnValue(false),
  searchFonts: vi.fn().mockResolvedValue([]),
  getPopularFonts: vi.fn().mockResolvedValue([]),
  refreshCatalog: vi.fn().mockResolvedValue(undefined),
  isCatalogStale: vi.fn().mockReturnValue(false),
});

const createMockCustomProvider = (fonts: FontDefinition[] = []): ICustomFontProvider => ({
  source: 'custom',
  getAvailableFonts: vi.fn().mockResolvedValue(fonts),
  loadFont: vi.fn().mockResolvedValue(undefined),
  isLoaded: vi.fn().mockReturnValue(false),
  uploadFont: vi.fn().mockResolvedValue(createMockFont({ source: 'custom' })),
  deleteFont: vi.fn().mockResolvedValue(undefined),
  updateFont: vi.fn().mockResolvedValue(createMockFont({ source: 'custom' })),
  exportFont: vi.fn().mockResolvedValue(new Blob()),
});

// ============================================================================
// Tests
// ============================================================================

describe('FontRegistry', () => {
  let registry: FontRegistry;
  let mockBuiltInProvider: IFontProvider;
  let mockGoogleProvider: IGoogleFontProvider;
  let mockCustomProvider: ICustomFontProvider;
  let deps: Partial<FontRegistryDeps>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockBuiltInProvider = createMockBuiltInProvider([
      createMockFont({ id: 'builtin-1', name: 'Arial', family: 'Arial', source: 'builtin' }),
      createMockFont({
        id: 'builtin-2',
        name: 'Georgia',
        family: 'Georgia',
        source: 'builtin',
        category: 'Serif',
      }),
    ]);

    mockGoogleProvider = createMockGoogleProvider([
      createMockFont({ id: 'google-1', name: 'Roboto', family: 'Roboto', source: 'google' }),
      createMockFont({ id: 'google-2', name: 'Open Sans', family: 'Open Sans', source: 'google' }),
    ]);

    mockCustomProvider = createMockCustomProvider([
      createMockFont({
        id: 'custom-1',
        name: 'My Font',
        family: 'My Font',
        source: 'custom',
        category: 'Custom',
      }),
    ]);

    deps = {
      builtInProvider: mockBuiltInProvider,
      googleProvider: mockGoogleProvider,
      customProvider: mockCustomProvider,
    };

    registry = new FontRegistry(deps);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------

  describe('initialize', () => {
    it('should not be initialized before calling initialize', () => {
      expect(registry.isInitialized).toBe(false);
    });

    it('should be initialized after calling initialize', async () => {
      await registry.initialize();

      expect(registry.isInitialized).toBe(true);
    });

    it('should load fonts from all providers', async () => {
      await registry.initialize();

      expect(mockBuiltInProvider.getAvailableFonts).toHaveBeenCalled();
      expect(mockGoogleProvider.getAvailableFonts).toHaveBeenCalled();
      expect(mockCustomProvider.getAvailableFonts).toHaveBeenCalled();
    });

    it('should not initialize twice', async () => {
      await registry.initialize();
      await registry.initialize();

      expect(mockBuiltInProvider.getAvailableFonts).toHaveBeenCalledTimes(1);
    });

    it('should give precedence to built-in fonts over Google fonts with same family', async () => {
      // Add Google font with same family as built-in
      vi.mocked(mockGoogleProvider.getAvailableFonts).mockResolvedValue([
        createMockFont({ id: 'google-arial', name: 'Arial', family: 'Arial', source: 'google' }),
      ]);

      await registry.initialize();
      const font = registry.getFont('Arial');

      expect(font?.source).toBe('builtin');
    });

    it('should notify subscribers on initialization', async () => {
      const callback = vi.fn();
      registry.subscribe(callback);

      await registry.initialize();

      expect(callback).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // getAllFonts
  // --------------------------------------------------------------------------

  describe('getAllFonts', () => {
    it('should return all fonts from all providers', async () => {
      const fonts = await registry.getAllFonts();

      expect(fonts.length).toBe(5); // 2 builtin + 2 google + 1 custom
    });

    it('should auto-initialize if not initialized', async () => {
      expect(registry.isInitialized).toBe(false);

      await registry.getAllFonts();

      expect(registry.isInitialized).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // getFontsBySource
  // --------------------------------------------------------------------------

  describe('getFontsBySource', () => {
    it('should return only built-in fonts when source is builtin', async () => {
      const fonts = await registry.getFontsBySource('builtin');

      expect(fonts.every((f) => f.source === 'builtin')).toBe(true);
      expect(fonts.length).toBe(2);
    });

    it('should return only Google fonts when source is google', async () => {
      const fonts = await registry.getFontsBySource('google');

      expect(fonts.every((f) => f.source === 'google')).toBe(true);
      expect(fonts.length).toBe(2);
    });

    it('should return only custom fonts when source is custom', async () => {
      const fonts = await registry.getFontsBySource('custom');

      expect(fonts.every((f) => f.source === 'custom')).toBe(true);
      expect(fonts.length).toBe(1);
    });

    it('should return empty array for source with no fonts', async () => {
      vi.mocked(mockCustomProvider.getAvailableFonts).mockResolvedValue([]);
      registry = new FontRegistry(deps);

      const fonts = await registry.getFontsBySource('custom');

      expect(fonts).toEqual([]);
    });
  });

  // --------------------------------------------------------------------------
  // getFontsByCategory
  // --------------------------------------------------------------------------

  describe('getFontsByCategory', () => {
    it('should return fonts matching the category', async () => {
      const fonts = await registry.getFontsByCategory('Sans Serif');

      expect(fonts.every((f) => f.category === 'Sans Serif')).toBe(true);
    });

    it('should return Serif fonts', async () => {
      const fonts = await registry.getFontsByCategory('Serif');

      expect(fonts.length).toBe(1);
      expect(fonts[0].name).toBe('Georgia');
    });

    it('should return Custom category fonts', async () => {
      const fonts = await registry.getFontsByCategory('Custom');

      expect(fonts.length).toBe(1);
      expect(fonts[0].source).toBe('custom');
    });
  });

  // --------------------------------------------------------------------------
  // searchFonts
  // --------------------------------------------------------------------------

  describe('searchFonts', () => {
    it('should search local fonts by name', async () => {
      const fonts = await registry.searchFonts('Arial');

      expect(fonts.some((f) => f.name === 'Arial')).toBe(true);
    });

    it('should search local fonts by family', async () => {
      const fonts = await registry.searchFonts('Georgia');

      expect(fonts.some((f) => f.family === 'Georgia')).toBe(true);
    });

    it('should be case-insensitive', async () => {
      const fonts = await registry.searchFonts('arial');

      expect(fonts.some((f) => f.name === 'Arial')).toBe(true);
    });

    it('should also search Google Fonts API', async () => {
      await registry.searchFonts('Montserrat');

      expect(mockGoogleProvider.searchFonts).toHaveBeenCalledWith('Montserrat');
    });

    it('should add new Google fonts to registry', async () => {
      const newFont = createMockFont({
        id: 'google-new',
        name: 'Montserrat',
        family: 'Montserrat',
        source: 'google',
      });
      vi.mocked(mockGoogleProvider.searchFonts).mockResolvedValue([newFont]);

      await registry.searchFonts('Montserrat');

      expect(registry.getFont('Montserrat')).toBeDefined();
    });

    it('should not add duplicate fonts from Google search', async () => {
      // Roboto already exists in the registry
      vi.mocked(mockGoogleProvider.searchFonts).mockResolvedValue([
        createMockFont({ id: 'google-roboto', name: 'Roboto', family: 'Roboto', source: 'google' }),
      ]);

      const beforeCount = (await registry.getAllFonts()).length;
      await registry.searchFonts('Roboto');
      const afterCount = (await registry.getAllFonts()).length;

      expect(afterCount).toBe(beforeCount);
    });

    it('should notify subscribers when new fonts are added from search', async () => {
      await registry.initialize();
      const callback = vi.fn();
      registry.subscribe(callback);
      callback.mockClear();

      const newFont = createMockFont({
        id: 'google-new',
        name: 'Montserrat',
        family: 'Montserrat',
        source: 'google',
      });
      vi.mocked(mockGoogleProvider.searchFonts).mockResolvedValue([newFont]);

      await registry.searchFonts('Montserrat');

      expect(callback).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // loadFont
  // --------------------------------------------------------------------------

  describe('loadFont', () => {
    it('should load built-in font using built-in provider', async () => {
      await registry.initialize();

      await registry.loadFont('Arial');

      expect(mockBuiltInProvider.loadFont).toHaveBeenCalledWith('Arial', undefined);
    });

    it('should load Google font using Google provider', async () => {
      await registry.initialize();

      await registry.loadFont('Roboto');

      expect(mockGoogleProvider.loadFont).toHaveBeenCalledWith('Roboto', undefined);
    });

    it('should load custom font using custom provider', async () => {
      await registry.initialize();

      await registry.loadFont('My Font');

      expect(mockCustomProvider.loadFont).toHaveBeenCalledWith('My Font');
    });

    it('should pass weights to provider', async () => {
      await registry.initialize();

      await registry.loadFont('Arial', [400, 700]);

      expect(mockBuiltInProvider.loadFont).toHaveBeenCalledWith('Arial', [400, 700]);
    });

    it('should throw error for unknown font', async () => {
      await registry.initialize();

      await expect(registry.loadFont('NonExistent Font')).rejects.toThrow(
        'Font not found: NonExistent Font'
      );
    });

    it('should not load already loaded font', async () => {
      await registry.initialize();
      const font = registry.getFont('Arial');
      if (font) font.status = 'loaded';

      await registry.loadFont('Arial');

      expect(mockBuiltInProvider.loadFont).not.toHaveBeenCalled();
    });

    it('should update font status to loading then loaded', async () => {
      await registry.initialize();
      const font = registry.getFont('Arial');

      await registry.loadFont('Arial');

      expect(font?.status).toBe('loaded');
    });

    it('should set status to error on load failure', async () => {
      await registry.initialize();
      vi.mocked(mockBuiltInProvider.loadFont).mockRejectedValue(new Error('Load failed'));

      await expect(registry.loadFont('Arial')).rejects.toThrow('Load failed');

      const font = registry.getFont('Arial');
      expect(font?.status).toBe('error');
    });

    it('should notify subscribers on load start and completion', async () => {
      await registry.initialize();
      const callback = vi.fn();
      registry.subscribe(callback);
      callback.mockClear();

      await registry.loadFont('Arial');

      expect(callback).toHaveBeenCalledTimes(2); // loading + loaded
    });
  });

  // --------------------------------------------------------------------------
  // isFontAvailable
  // --------------------------------------------------------------------------

  describe('isFontAvailable', () => {
    it('should return true for available font', async () => {
      await registry.initialize();

      expect(registry.isFontAvailable('Arial')).toBe(true);
    });

    it('should return false for unavailable font', async () => {
      await registry.initialize();

      expect(registry.isFontAvailable('NonExistent')).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // isFontLoaded
  // --------------------------------------------------------------------------

  describe('isFontLoaded', () => {
    it('should return false for unloaded font', async () => {
      await registry.initialize();

      expect(registry.isFontLoaded('Arial')).toBe(false);
    });

    it('should return true for loaded font', async () => {
      await registry.initialize();
      const font = registry.getFont('Arial');
      if (font) font.status = 'loaded';

      expect(registry.isFontLoaded('Arial')).toBe(true);
    });

    it('should return false for unknown font', async () => {
      await registry.initialize();

      expect(registry.isFontLoaded('NonExistent')).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // getFont
  // --------------------------------------------------------------------------

  describe('getFont', () => {
    it('should return font definition by family', async () => {
      await registry.initialize();

      const font = registry.getFont('Arial');

      expect(font).toBeDefined();
      expect(font?.name).toBe('Arial');
    });

    it('should return undefined for unknown font', async () => {
      await registry.initialize();

      const font = registry.getFont('NonExistent');

      expect(font).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // uploadCustomFont
  // --------------------------------------------------------------------------

  describe('uploadCustomFont', () => {
    it('should upload font via custom provider', async () => {
      const file = new File(['font data'], 'myfont.ttf', { type: 'font/ttf' });

      await registry.uploadCustomFont(file);

      expect(mockCustomProvider.uploadFont).toHaveBeenCalledWith(file);
    });

    it('should add uploaded font to registry', async () => {
      const uploadedFont = createMockFont({
        id: 'custom-new',
        name: 'Uploaded Font',
        family: 'Uploaded Font',
        source: 'custom',
      });
      vi.mocked(mockCustomProvider.uploadFont).mockResolvedValue(uploadedFont);

      const file = new File(['font data'], 'uploaded.ttf', { type: 'font/ttf' });
      const result = await registry.uploadCustomFont(file);

      expect(result.id).toBe('custom-new');
      expect(registry.getFont('Uploaded Font')).toBeDefined();
    });

    it('should notify subscribers after upload', async () => {
      await registry.initialize();
      const callback = vi.fn();
      registry.subscribe(callback);
      callback.mockClear();

      const file = new File(['font data'], 'myfont.ttf', { type: 'font/ttf' });
      await registry.uploadCustomFont(file);

      expect(callback).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // deleteCustomFont
  // --------------------------------------------------------------------------

  describe('deleteCustomFont', () => {
    it('should delete font via custom provider', async () => {
      await registry.initialize();

      await registry.deleteCustomFont('custom-1');

      expect(mockCustomProvider.deleteFont).toHaveBeenCalledWith('custom-1');
    });

    it('should remove font from registry', async () => {
      await registry.initialize();

      await registry.deleteCustomFont('custom-1');

      expect(registry.getFont('My Font')).toBeUndefined();
      expect(registry.isFontAvailable('My Font')).toBe(false);
    });

    it('should throw error for unknown font', async () => {
      await registry.initialize();

      await expect(registry.deleteCustomFont('unknown-id')).rejects.toThrow(
        'Font not found: unknown-id'
      );
    });

    it('should throw error for non-custom font', async () => {
      await registry.initialize();

      await expect(registry.deleteCustomFont('builtin-1')).rejects.toThrow(
        'Can only delete custom fonts'
      );
    });

    it('should notify subscribers after delete', async () => {
      await registry.initialize();
      const callback = vi.fn();
      registry.subscribe(callback);
      callback.mockClear();

      await registry.deleteCustomFont('custom-1');

      expect(callback).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // subscribe
  // --------------------------------------------------------------------------

  describe('subscribe', () => {
    it('should call subscriber immediately if initialized', async () => {
      await registry.initialize();
      const callback = vi.fn();

      registry.subscribe(callback);

      expect(callback).toHaveBeenCalledWith(expect.any(Array));
    });

    it('should not call subscriber immediately if not initialized', () => {
      const callback = vi.fn();

      registry.subscribe(callback);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should return unsubscribe function', async () => {
      await registry.initialize();
      const callback = vi.fn();

      const unsubscribe = registry.subscribe(callback);
      callback.mockClear();
      unsubscribe();

      // Trigger a change
      await registry.loadFont('Arial');

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle subscriber errors gracefully', async () => {
      // Subscribe before initialization to avoid immediate callback
      const badCallback = vi.fn().mockImplementation(() => {
        throw new Error('Subscriber error');
      });
      const goodCallback = vi.fn();

      registry.subscribe(badCallback);
      registry.subscribe(goodCallback);

      // Initialize will trigger notifySubscribers which has error handling
      await registry.initialize();

      // Load font will also notify - should not throw despite bad subscriber
      await registry.loadFont('Arial');

      // Good callback should still be called despite bad callback throwing
      expect(goodCallback).toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // getFontOptions
  // --------------------------------------------------------------------------

  describe('getFontOptions', () => {
    it('should return font options in selector format', async () => {
      const options = await registry.getFontOptions();

      expect(options.length).toBe(5);
      expect(options[0]).toHaveProperty('value');
      expect(options[0]).toHaveProperty('label');
      expect(options[0]).toHaveProperty('category');
      expect(options[0]).toHaveProperty('source');
    });

    it('should use family as value and name as label', async () => {
      const options = await registry.getFontOptions();
      const arialOption = options.find((o) => o.label === 'Arial');

      expect(arialOption?.value).toBe('Arial');
    });
  });

  // --------------------------------------------------------------------------
  // getFontOptionsGrouped
  // --------------------------------------------------------------------------

  describe('getFontOptionsGrouped', () => {
    it('should return fonts grouped by category', async () => {
      const grouped = await registry.getFontOptionsGrouped();

      expect(grouped).toBeInstanceOf(Map);
      expect(grouped.has('Sans Serif')).toBe(true);
      expect(grouped.has('Serif')).toBe(true);
      expect(grouped.has('Custom')).toBe(true);
    });

    it('should have correct fonts in each category', async () => {
      const grouped = await registry.getFontOptionsGrouped();
      const sansSerif = grouped.get('Sans Serif');

      expect(sansSerif?.some((f) => f.name === 'Arial')).toBe(true);
      expect(sansSerif?.some((f) => f.name === 'Roboto')).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Edge Cases
  // --------------------------------------------------------------------------

  describe('Edge Cases', () => {
    it('should handle empty font providers', async () => {
      const emptyDeps = {
        builtInProvider: createMockBuiltInProvider([]),
        googleProvider: createMockGoogleProvider([]),
        customProvider: createMockCustomProvider([]),
      };
      const emptyRegistry = new FontRegistry(emptyDeps);

      const fonts = await emptyRegistry.getAllFonts();

      expect(fonts).toEqual([]);
    });

    it('should handle provider initialization failure gracefully', async () => {
      vi.mocked(mockBuiltInProvider.getAvailableFonts).mockRejectedValue(
        new Error('Provider failed')
      );

      await expect(registry.initialize()).rejects.toThrow('Provider failed');
    });

    it('should work with default providers when no deps provided', () => {
      // This just ensures the constructor doesn't throw
      const defaultRegistry = new FontRegistry();
      expect(defaultRegistry).toBeDefined();
      expect(defaultRegistry.isInitialized).toBe(false);
    });
  });
});
