import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import {
  DEFAULT_THEME_ID,
  getTheme,
  isValidThemeId,
  type ThemeId,
  UI_THEMES,
  type UITheme,
} from '../ts/themes';
import { getStorageItem, logger, STORAGE_KEYS, setStorageItem } from '../ts/utils/index.js';

export interface CustomTheme extends UITheme {
  isCustom: true;
}

interface ThemeContextValue {
  /** Current active theme ID */
  currentThemeId: string;
  /** Current active theme object */
  currentTheme: UITheme;
  /** Set the active theme by ID */
  setTheme: (themeId: string) => void;
  /** All available built-in themes */
  builtInThemes: Record<ThemeId, UITheme>;
  /** User-created custom themes */
  customThemes: CustomTheme[];
  /** Add a new custom theme (for future use) */
  addCustomTheme: (theme: Omit<CustomTheme, 'isCustom'>) => void;
  /** Update an existing custom theme (for future use) */
  updateCustomTheme: (
    themeId: string,
    updates: Partial<Omit<CustomTheme, 'id' | 'isCustom'>>
  ) => void;
  /** Remove a custom theme (for future use) */
  removeCustomTheme: (themeId: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Apply theme CSS variables to the document root
 */
function applyThemeVariables(theme: UITheme): void {
  const root = document.documentElement;

  // Apply each CSS variable from the theme
  Object.entries(theme.variables).forEach(([property, value]) => {
    root.style.setProperty(property, value);
  });

  // Set data attribute for potential CSS-based styling
  root.setAttribute('data-theme', theme.id);
}

/**
 * Load saved theme ID from localStorage
 */
function loadSavedThemeId(): string {
  const saved = getStorageItem(STORAGE_KEYS.THEME);
  if (saved && (isValidThemeId(saved) || saved.startsWith('custom_'))) {
    return saved;
  }
  return DEFAULT_THEME_ID;
}

/**
 * Load custom themes from localStorage
 */
function loadCustomThemes(): CustomTheme[] {
  try {
    const saved = getStorageItem(STORAGE_KEYS.CUSTOM_THEMES);
    if (saved) {
      return JSON.parse(saved) as CustomTheme[];
    }
  } catch {
    // Invalid JSON
  }
  return [];
}

/**
 * Save custom themes to localStorage
 */
function saveCustomThemes(themes: CustomTheme[]): void {
  setStorageItem(STORAGE_KEYS.CUSTOM_THEMES, JSON.stringify(themes));
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [currentThemeId, setCurrentThemeId] = useState<string>(loadSavedThemeId);
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>(loadCustomThemes);

  // Get the current theme object
  const currentTheme =
    customThemes.find((t) => t.id === currentThemeId) || getTheme(currentThemeId);

  // Apply theme on mount and when theme changes
  useEffect(() => {
    applyThemeVariables(currentTheme);
  }, [currentTheme]);

  // Save theme preference when it changes
  useEffect(() => {
    setStorageItem(STORAGE_KEYS.THEME, currentThemeId);
  }, [currentThemeId]);

  const setTheme = useCallback(
    (themeId: string) => {
      // Validate the theme exists (either built-in or custom)
      const isBuiltIn = isValidThemeId(themeId);
      const isCustom = customThemes.some((t) => t.id === themeId);

      if (isBuiltIn || isCustom) {
        setCurrentThemeId(themeId);
      } else {
        logger.warn('ThemeContext', `Theme "${themeId}" not found, falling back to default`);
        setCurrentThemeId(DEFAULT_THEME_ID);
      }
    },
    [customThemes]
  );

  const addCustomTheme = useCallback((theme: Omit<CustomTheme, 'isCustom'>) => {
    const newTheme: CustomTheme = {
      ...theme,
      isCustom: true,
    };
    setCustomThemes((prev) => {
      const updated = [...prev, newTheme];
      saveCustomThemes(updated);
      return updated;
    });
  }, []);

  const updateCustomTheme = useCallback(
    (themeId: string, updates: Partial<Omit<CustomTheme, 'id' | 'isCustom'>>) => {
      setCustomThemes((prev) => {
        const updated = prev.map((theme) =>
          theme.id === themeId ? { ...theme, ...updates } : theme
        );
        saveCustomThemes(updated);
        return updated;
      });
    },
    []
  );

  const removeCustomTheme = useCallback(
    (themeId: string) => {
      setCustomThemes((prev) => {
        const updated = prev.filter((theme) => theme.id !== themeId);
        saveCustomThemes(updated);
        return updated;
      });

      // If removing the active theme, switch to default
      if (currentThemeId === themeId) {
        setCurrentThemeId(DEFAULT_THEME_ID);
      }
    },
    [currentThemeId]
  );

  const value: ThemeContextValue = {
    currentThemeId,
    currentTheme,
    setTheme,
    builtInThemes: UI_THEMES,
    customThemes,
    addCustomTheme,
    updateCustomTheme,
    removeCustomTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to access theme context
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
