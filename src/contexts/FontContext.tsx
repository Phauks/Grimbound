/**
 * Font Context
 *
 * Provides font management capabilities to React components.
 * Initializes the FontRegistry and provides access to font operations.
 *
 * @module contexts/FontContext
 */

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { fontRegistry } from '@/ts/services/fonts/index.js';
import type {
  FontCategory,
  FontContextValue,
  FontDefinition,
  FontSource,
  FontWeight,
} from '@/ts/types/fonts.js';
import { logger } from '@/ts/utils/logger.js';

// ============================================================================
// Context
// ============================================================================

const FontContext = createContext<FontContextValue | null>(null);

// ============================================================================
// Provider Props
// ============================================================================

interface FontProviderProps {
  children: ReactNode;
}

// ============================================================================
// Provider Component
// ============================================================================

/**
 * Provides font management context to the application.
 *
 * @example
 * ```tsx
 * <FontProvider>
 *   <App />
 * </FontProvider>
 * ```
 */
export function FontProvider({ children }: FontProviderProps) {
  const [fonts, setFonts] = useState<FontDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize the font registry on mount
  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        logger.info('FontContext', 'Initializing font registry...');

        // Subscribe to font changes before initialization
        const unsubscribe = fontRegistry.subscribe((updatedFonts) => {
          if (mounted) {
            setFonts(updatedFonts);
          }
        });

        // Initialize the registry
        await fontRegistry.initialize();

        if (mounted) {
          setIsInitialized(true);
          setIsLoading(false);
          logger.info('FontContext', 'Font registry initialized');
        }

        return () => {
          mounted = false;
          unsubscribe();
        };
      } catch (error) {
        logger.error('FontContext', 'Initialization failed:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

  // Load a font
  const loadFont = useCallback(async (family: string, weights?: FontWeight[]) => {
    try {
      await fontRegistry.loadFont(family, weights);
    } catch (error) {
      logger.error('FontContext', `Failed to load font: ${family}`, error);
      throw error;
    }
  }, []);

  // Upload a custom font
  const uploadFont = useCallback(async (file: File) => {
    try {
      const font = await fontRegistry.uploadCustomFont(file);
      return font;
    } catch (error) {
      logger.error('FontContext', 'Failed to upload font', error);
      throw error;
    }
  }, []);

  // Delete a custom font
  const deleteFont = useCallback(async (id: string) => {
    try {
      await fontRegistry.deleteCustomFont(id);
    } catch (error) {
      logger.error('FontContext', `Failed to delete font: ${id}`, error);
      throw error;
    }
  }, []);

  // Get fonts by source
  const getFontsBySource = useCallback(
    (source: FontSource) => fonts.filter((f) => f.source === source),
    [fonts]
  );

  // Get fonts by category
  const getFontsByCategory = useCallback(
    (category: FontCategory) => fonts.filter((f) => f.category === category),
    [fonts]
  );

  // Search fonts
  const searchFonts = useCallback(async (query: string) => fontRegistry.searchFonts(query), []);

  // Get a font by family
  const getFont = useCallback((family: string) => fonts.find((f) => f.family === family), [fonts]);

  // Check if a font is loaded
  const isFontLoaded = useCallback(
    (family: string) => {
      const font = fonts.find((f) => f.family === family);
      return font?.status === 'loaded';
    },
    [fonts]
  );

  // Context value
  const value = useMemo<FontContextValue>(
    () => ({
      fonts,
      isLoading,
      isInitialized,
      loadFont,
      uploadFont,
      deleteFont,
      getFontsBySource,
      getFontsByCategory,
      searchFonts,
      getFont,
      isFontLoaded,
    }),
    [
      fonts,
      isLoading,
      isInitialized,
      loadFont,
      uploadFont,
      deleteFont,
      getFontsBySource,
      getFontsByCategory,
      searchFonts,
      getFont,
      isFontLoaded,
    ]
  );

  return <FontContext.Provider value={value}>{children}</FontContext.Provider>;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to access font context
 *
 * @throws Error if used outside of FontProvider
 *
 * @example
 * ```tsx
 * function FontSelector() {
 *   const { fonts, loadFont } = useFonts();
 *
 *   const handleSelect = async (family: string) => {
 *     await loadFont(family);
 *     // Font is now ready to use
 *   };
 *
 *   return (
 *     <select onChange={(e) => handleSelect(e.target.value)}>
 *       {fonts.map(f => (
 *         <option key={f.id} value={f.family}>{f.name}</option>
 *       ))}
 *     </select>
 *   );
 * }
 * ```
 */
export function useFonts(): FontContextValue {
  const context = useContext(FontContext);
  if (!context) {
    throw new Error('useFonts must be used within a FontProvider');
  }
  return context;
}

/**
 * Hook to get fonts filtered by source
 *
 * @param source - Font source to filter by
 *
 * @example
 * ```tsx
 * function BuiltInFontList() {
 *   const builtInFonts = useFontsBySource('builtin');
 *   return <ul>{builtInFonts.map(f => <li key={f.id}>{f.name}</li>)}</ul>;
 * }
 * ```
 */
export function useFontsBySource(source: FontSource): FontDefinition[] {
  const { getFontsBySource } = useFonts();
  return useMemo(() => getFontsBySource(source), [getFontsBySource, source]);
}

/**
 * Hook to get fonts filtered by category
 *
 * @param category - Category to filter by
 *
 * @example
 * ```tsx
 * function DisplayFontList() {
 *   const displayFonts = useFontsByCategory('Display');
 *   return <ul>{displayFonts.map(f => <li key={f.id}>{f.name}</li>)}</ul>;
 * }
 * ```
 */
export function useFontsByCategory(category: FontCategory): FontDefinition[] {
  const { getFontsByCategory } = useFonts();
  return useMemo(() => getFontsByCategory(category), [getFontsByCategory, category]);
}

/**
 * Hook to get custom fonts only
 *
 * @example
 * ```tsx
 * function CustomFontManager() {
 *   const customFonts = useCustomFonts();
 *   const { deleteFont } = useFonts();
 *
 *   return (
 *     <ul>
 *       {customFonts.map(f => (
 *         <li key={f.id}>
 *           {f.name}
 *           <button onClick={() => deleteFont(f.id)}>Delete</button>
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
export function useCustomFonts(): FontDefinition[] {
  return useFontsBySource('custom');
}

/**
 * Hook to get built-in fonts only
 */
export function useBuiltInFonts(): FontDefinition[] {
  return useFontsBySource('builtin');
}

/**
 * Hook to get Google fonts only
 */
export function useGoogleFonts(): FontDefinition[] {
  return useFontsBySource('google');
}
